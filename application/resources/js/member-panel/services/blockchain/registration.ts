import { JsonRpcSigner, formatUnits } from 'ethers';
import { apiUrl } from '../../lib/apiBase';
import { ensureTokenApproval, findPriorApprovalTx } from './approval';
import { getCoreContract, getTokenContract } from './contract';
import { loadBlockchainConfig } from './config';
import { assertSponsorActiveOnChain, findPriorRegistrationTxs } from './events';
import { sendWithGasEstimate, waitForTx } from './gas';
import { mapWalletError } from './wallet';

export type RegistrationOnChainResult = {
  registerTxHash: string;
  approveTxHash: string;
  packageTxHash: string;
  wallet: string;
  sponsor: string;
  packageAmount: number;
  tokenAmount: string;
  blockNumber: number;
  packageCycle: number;
  resumed: boolean;
};

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function isTxHash(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

/**
 * Production MetaMask registration lifecycle (blockchain is source of truth):
 * 1) register(sponsor) → wait mined → verify
 * 2) ALWAYS approve(core, tokenAmount) → wait mined → store approve hash
 * 3) activatePackage(50) → wait mined → verify
 * 4) Laravel saves only after all hashes are real + verified
 */
export async function registerOnChain(
  signer: JsonRpcSigner,
  sponsorAddress: string,
  packageAmount: number,
  onStatus?: (message: string) => void,
): Promise<RegistrationOnChainResult> {
  try {
    const wallet = await signer.getAddress();
    let sponsor = sponsorAddress?.trim() || '0x0000000000000000000000000000000000000000';
    if (!isAddress(sponsor)) {
      throw new Error('Sponsor not found.');
    }
    if (sponsor.toLowerCase() === wallet.toLowerCase()) {
      throw new Error('Cannot sponsor yourself.');
    }

    if (packageAmount !== 50) {
      throw new Error('New members must activate the $50 package first.');
    }

    const cfg = await loadBlockchainConfig();
    if (!cfg.core || !cfg.token) {
      throw new Error('Blockchain is not configured. Please contact support.');
    }

    const core = await getCoreContract(signer);
    const token = await getTokenContract(signer);

    await assertSponsorActiveOnChain(core, sponsor);

    let registerTxHash = '';
    let approveTxHash = '';
    let packageTxHash = '';
    let blockNumber = 0;
    let packageCycle = 1;
    let tokenAmountStr = '';
    let resumed = false;

    const onChainUser = await core.users(wallet);
    const alreadyRegistered = Boolean(onChainUser.isActive);
    const alreadyPackaged = Number(onChainUser.packageAmount) > 0;

    if (alreadyRegistered) {
      resumed = true;
      const onChainSponsor = String(onChainUser.sponsor || '').toLowerCase();
      if (onChainSponsor && onChainSponsor !== sponsor.toLowerCase()) {
        throw new Error('This wallet is already registered under a different sponsor.');
      }

      onStatus?.('Resuming registration…');
      const prior = await findPriorRegistrationTxs(signer, wallet);
      if (!prior.registerTxHash || !isTxHash(prior.registerTxHash)) {
        throw new Error('Registration is incomplete. Please contact support.');
      }
      registerTxHash = prior.registerTxHash;
      if (prior.sponsor && prior.sponsor !== sponsor.toLowerCase()) {
        throw new Error('Sponsor does not match on-chain registration.');
      }

      if (alreadyPackaged) {
        if (!prior.packageTxHash || !isTxHash(prior.packageTxHash)) {
          throw new Error('Activation is incomplete. Please contact support.');
        }
        if (prior.packageAmount !== null && prior.packageAmount !== packageAmount) {
          throw new Error('Package amount does not match on-chain activation.');
        }
        packageTxHash = prior.packageTxHash;
        packageCycle = prior.packageCycle ?? Number(onChainUser.packageCycle) ?? 1;
        const tokenAmount: bigint = await core.getPackageBTCBAmount(BigInt(packageAmount));
        tokenAmountStr = tokenAmount.toString();
        const receipt = await signer.provider!.getTransactionReceipt(packageTxHash);
        blockNumber = Number(receipt?.blockNumber ?? 0);

        // Never leave approve_tx_hash NULL — recover prior Approval or force a new one
        const priorApprove = await findPriorApprovalTx(signer, wallet);
        if (priorApprove && isTxHash(priorApprove)) {
          approveTxHash = priorApprove;
        } else {
          const approved = await ensureTokenApproval(signer, tokenAmount, onStatus);
          approveTxHash = approved.approveTxHash;
        }

        return {
          registerTxHash,
          approveTxHash,
          packageTxHash,
          wallet,
          sponsor,
          packageAmount,
          tokenAmount: tokenAmountStr,
          blockNumber,
          packageCycle,
          resumed: true,
        };
      }
    } else {
      const registerTx = await sendWithGasEstimate(core, 'register', [sponsor], onStatus);
      const registerReceipt = await waitForTx(registerTx, onStatus, 'registration');
      registerTxHash = String(registerTx.hash);
      if (!isTxHash(registerTxHash)) {
        throw new Error('Invalid registration transaction hash.');
      }
      blockNumber = Number(registerReceipt.blockNumber ?? 0);

      const confirmed = await core.users(wallet);
      if (!confirmed.isActive) {
        throw new Error('Registration failed.');
      }
    }

    onStatus?.('Preparing package payment…');
    const [expectedPackage, expectedCycle] = await core.getNextEligiblePackage(wallet);
    if (Number(expectedPackage) !== packageAmount) {
      throw new Error('Invalid package selection.');
    }
    packageCycle = Number(expectedCycle);

    const tokenAmount: bigint = await core.getPackageBTCBAmount(BigInt(packageAmount));
    if (tokenAmount <= 0n) {
      throw new Error('Unable to calculate package payment.');
    }
    tokenAmountStr = tokenAmount.toString();

    const balance: bigint = await token.balanceOf(wallet);
    if (balance < tokenAmount) {
      const decimals = Number(await token.decimals().catch(() => 18));
      const symbol = String(await token.symbol().catch(() => 'TOKEN'));
      throw new Error(
        `Insufficient package balance. Need ${formatUnits(tokenAmount, decimals)} ${symbol}.`,
      );
    }

    // ALWAYS wallet approval → mined → real approve_tx_hash
    const approved = await ensureTokenApproval(signer, tokenAmount, onStatus);
    approveTxHash = approved.approveTxHash;

    const packageTx = await sendWithGasEstimate(
      core,
      'activatePackage',
      [BigInt(packageAmount)],
      onStatus,
    );
    const packageReceipt = await waitForTx(packageTx, onStatus, 'activation');
    packageTxHash = String(packageTx.hash);
    if (!isTxHash(packageTxHash)) {
      throw new Error('Invalid activation transaction hash.');
    }
    blockNumber = Number(packageReceipt.blockNumber ?? blockNumber);

    const activated = await core.users(wallet);
    if (Number(activated.packageAmount) !== packageAmount) {
      throw new Error('Activation failed.');
    }

    if (!isTxHash(registerTxHash) || !isTxHash(approveTxHash) || !isTxHash(packageTxHash)) {
      throw new Error('Missing blockchain transaction hash.');
    }

    return {
      registerTxHash,
      approveTxHash,
      packageTxHash,
      wallet,
      sponsor,
      packageAmount,
      tokenAmount: tokenAmountStr,
      blockNumber,
      packageCycle,
      resumed,
    };
  } catch (error) {
    throw Object.assign(new Error(mapWalletError(error)), { cause: error });
  }
}

export async function completeRegistrationWithLaravel(payload: {
  baseUrl: string;
  csrfToken: string;
  firstname?: string;
  lastname?: string;
  username?: string;
  email: string;
  password: string;
  wallet: string;
  sponsor_id: string;
  tx_hash: string;
  package_amount: number;
  package_tx_hash: string;
  approve_tx_hash: string;
  token_amount?: string;
  leg?: string;
}) {
  if (!payload.approve_tx_hash || !/^0x[a-fA-F0-9]{64}$/.test(payload.approve_tx_hash)) {
    throw new Error('Approval transaction hash is required.');
  }

  // Laravel creates the user only after register + approve + package txs verify on-chain.
  const res = await fetch(apiUrl('/api/auth/register', payload.baseUrl), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      firstname: payload.firstname || '',
      lastname: payload.lastname || '',
      username: payload.username || undefined,
      email: payload.email,
      password: payload.password,
      wallet: payload.wallet,
      sponsor_id: payload.sponsor_id,
      tx_hash: payload.tx_hash,
      package_amount: payload.package_amount,
      package_tx_hash: payload.package_tx_hash,
      approve_tx_hash: payload.approve_tx_hash,
      token_amount: payload.token_amount || null,
      leg: payload.leg || 'L',
    }),
  });

  if (res.status === 419) {
    throw new Error('Session expired. Please refresh and try again.');
  }

  let json: {
    success?: boolean;
    error?: string;
    redirect?: string;
    token?: string;
    user?: Record<string, unknown>;
    dashboard?: Record<string, unknown>;
  };

  try {
    json = await res.json();
  } catch {
    throw new Error('Registration failed. Please try again.');
  }

  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Registration failed. Please try again.');
  }

  if (json.token) {
    try {
      localStorage.setItem('quantara_auth_token', json.token);
    } catch {
      // ignore
    }
  }

  if (json.dashboard) {
    try {
      sessionStorage.setItem('quantara_dashboard_sync', JSON.stringify(json.dashboard));
    } catch {
      // ignore
    }
  }

  return json;
}
