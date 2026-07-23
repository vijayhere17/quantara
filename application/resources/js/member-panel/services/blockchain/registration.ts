import { JsonRpcSigner, formatUnits } from 'ethers';
import { apiUrl } from '../../lib/apiBase';
import { getCoreContract, getTokenContract } from './contract';
import { loadBlockchainConfig } from './config';
import { assertSponsorActiveOnChain, findPriorRegistrationTxs } from './events';
import { mapWalletError } from './wallet';

export type RegistrationOnChainResult = {
  registerTxHash: string;
  approveTxHash: string | null;
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

/**
 * BTCPlanCore sequence:
 * 1) register(sponsor)
 * 2) approve(core, tokenAmount) when needed
 * 3) activatePackage(50) for new members
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
    let approveTxHash: string | null = null;
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
      if (!prior.registerTxHash) {
        throw new Error('Registration is incomplete. Please contact support.');
      }
      registerTxHash = prior.registerTxHash;
      if (prior.sponsor && prior.sponsor !== sponsor.toLowerCase()) {
        throw new Error('Sponsor does not match on-chain registration.');
      }

      if (alreadyPackaged) {
        if (!prior.packageTxHash) {
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

        return {
          registerTxHash,
          approveTxHash: null,
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
      onStatus?.('Confirm registration in MetaMask…');
      const registerTx = await core.register(sponsor);
      onStatus?.('Waiting for registration confirmation…');
      const registerReceipt = await registerTx.wait();
      if (!registerReceipt || registerReceipt.status !== 1) {
        throw new Error('Registration failed.');
      }
      registerTxHash = String(registerTx.hash);
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
      throw new Error(
        `Insufficient package balance. Need ${formatUnits(tokenAmount, decimals)} BTCB.`,
      );
    }

    const allowance: bigint = await token.allowance(wallet, cfg.core);
    if (allowance < tokenAmount) {
      onStatus?.('Confirm approval in MetaMask…');
      const approveTx = await token.approve(cfg.core, tokenAmount);
      onStatus?.('Waiting for approval confirmation…');
      const approveReceipt = await approveTx.wait();
      if (!approveReceipt || approveReceipt.status !== 1) {
        throw new Error('Approval cancelled.');
      }
      approveTxHash = String(approveTx.hash);

      const refreshed = await token.allowance(wallet, cfg.core);
      if (refreshed < tokenAmount) {
        throw new Error('Approval failed.');
      }
    }

    onStatus?.('Confirm package activation in MetaMask…');
    const packageTx = await core.activatePackage(BigInt(packageAmount));
    onStatus?.('Waiting for activation confirmation…');
    const packageReceipt = await packageTx.wait();
    if (!packageReceipt || packageReceipt.status !== 1) {
      throw new Error('Activation failed.');
    }
    packageTxHash = String(packageTx.hash);
    blockNumber = Number(packageReceipt.blockNumber ?? blockNumber);

    const activated = await core.users(wallet);
    if (Number(activated.packageAmount) !== packageAmount) {
      throw new Error('Activation failed.');
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
  approve_tx_hash?: string | null;
  token_amount?: string;
  leg?: string;
}) {
  // Laravel creates the user only after both register + package txs verify on-chain.
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
      approve_tx_hash: payload.approve_tx_hash || null,
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
