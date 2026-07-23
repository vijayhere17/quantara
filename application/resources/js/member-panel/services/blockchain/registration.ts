import { JsonRpcSigner, formatUnits } from 'ethers';
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
 * Exact BTCPlanCore sequence (verified from BTCPlanCore.sol + testFlow.ts):
 *
 * 1) register(sponsor)            — gas only; requires sponsor.isActive (or address(0))
 * 2) approve(core, tokenAmount)   — REQUIRED; activatePackage uses btcbToken.safeTransferFrom
 * 3) activatePackage(amount)      — new users must use 50 (getNextEligiblePackage)
 *
 * Do NOT reverse this order. activatePackage reverts if the user is not registered.
 * If register already succeeded but Laravel never persisted the user, this resumes
 * from the current on-chain state and recovers prior tx hashes via event logs.
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
      throw new Error(
        'Sponsor wallet address is required for on-chain registration. Resolve the sponsor id first.',
      );
    }
    if (sponsor.toLowerCase() === wallet.toLowerCase()) {
      throw new Error('Cannot sponsor yourself');
    }

    // Contract rule: new users must start at package 50 cycle 1
    if (packageAmount !== 50) {
      throw new Error('New members must activate the $50 package first');
    }

    const cfg = await loadBlockchainConfig();
    if (!cfg.core || !cfg.token) {
      throw new Error('Contract addresses are not configured (CORE_CONTRACT / TOKEN_CONTRACT)');
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
        throw new Error(
          'This wallet is already registered on-chain under a different sponsor.',
        );
      }

      onStatus?.('Wallet already registered on-chain — recovering prior transactions…');
      const prior = await findPriorRegistrationTxs(signer, wallet);
      if (!prior.registerTxHash) {
        throw new Error(
          'Wallet is registered on-chain but the registration transaction could not be found. Contact support.',
        );
      }
      registerTxHash = prior.registerTxHash;
      if (prior.sponsor && prior.sponsor !== sponsor.toLowerCase()) {
        throw new Error('On-chain sponsor does not match the referral wallet.');
      }

      if (alreadyPackaged) {
        if (!prior.packageTxHash) {
          throw new Error(
            'Package is already active on-chain but the package transaction could not be found. Contact support.',
          );
        }
        if (prior.packageAmount !== null && prior.packageAmount !== packageAmount) {
          throw new Error(
            `On-chain package is $${prior.packageAmount}, expected $${packageAmount}.`,
          );
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
      // ---------- Step 1: register(sponsor) ----------
      onStatus?.('Step 1/3 — Confirm registration in MetaMask…');
      const registerTx = await core.register(sponsor);
      onStatus?.('Waiting for registration confirmation…');
      const registerReceipt = await registerTx.wait();
      if (!registerReceipt || registerReceipt.status !== 1) {
        throw new Error('Registration transaction failed on-chain');
      }
      registerTxHash = String(registerTx.hash);
      blockNumber = Number(registerReceipt.blockNumber ?? 0);

      const confirmed = await core.users(wallet);
      if (!confirmed.isActive) {
        throw new Error('On-chain registration did not activate your wallet');
      }
    }

    // ---------- Step 2: ERC-20 approve (required for safeTransferFrom) ----------
    onStatus?.('Calculating package payment amount…');
    const [expectedPackage, expectedCycle] = await core.getNextEligiblePackage(wallet);
    if (Number(expectedPackage) !== packageAmount) {
      throw new Error(`Invalid package sequence. Expected $${expectedPackage.toString()}`);
    }
    packageCycle = Number(expectedCycle);

    const tokenAmount: bigint = await core.getPackageBTCBAmount(BigInt(packageAmount));
    if (tokenAmount <= 0n) {
      throw new Error('Invalid BTCB package amount from price feed');
    }
    tokenAmountStr = tokenAmount.toString();

    const balance: bigint = await token.balanceOf(wallet);
    if (balance < tokenAmount) {
      const symbol = await token.symbol().catch(() => 'BTCB');
      const decimals = Number(await token.decimals().catch(() => 18));
      throw new Error(
        `Insufficient ${symbol} balance. Need ${formatUnits(tokenAmount, decimals)}, have ${formatUnits(balance, decimals)}.`,
      );
    }

    const allowance: bigint = await token.allowance(wallet, cfg.core);
    if (allowance < tokenAmount) {
      onStatus?.(
        resumed
          ? 'Approve BTCB spending for Quantara Core in MetaMask…'
          : 'Step 2/3 — Approve BTCB spending for Quantara Core in MetaMask…',
      );
      const approveTx = await token.approve(cfg.core, tokenAmount);
      onStatus?.('Waiting for approval confirmation…');
      const approveReceipt = await approveTx.wait();
      if (!approveReceipt || approveReceipt.status !== 1) {
        throw new Error('Token approval failed on-chain');
      }
      approveTxHash = String(approveTx.hash);

      const refreshed = await token.allowance(wallet, cfg.core);
      if (refreshed < tokenAmount) {
        throw new Error('Allowance still insufficient after approval');
      }
    } else {
      onStatus?.(
        resumed
          ? 'Existing BTCB allowance is sufficient…'
          : 'Step 2/3 — Existing BTCB allowance is sufficient…',
      );
    }

    // ---------- Step 3: activatePackage(amount) ----------
    onStatus?.(
      resumed
        ? 'Confirm package payment in MetaMask…'
        : 'Step 3/3 — Confirm package payment in MetaMask…',
    );
    const packageTx = await core.activatePackage(BigInt(packageAmount));
    onStatus?.('Waiting for package activation confirmation…');
    const packageReceipt = await packageTx.wait();
    if (!packageReceipt || packageReceipt.status !== 1) {
      throw new Error('Package activation failed on-chain');
    }
    packageTxHash = String(packageTx.hash);
    blockNumber = Number(packageReceipt.blockNumber ?? blockNumber);

    const activated = await core.users(wallet);
    if (Number(activated.packageAmount) !== packageAmount) {
      throw new Error('On-chain package amount did not update after activation');
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
  firstname: string;
  lastname: string;
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
  const res = await fetch(`${payload.baseUrl.replace(/\/$/, '')}/api/auth/register`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': payload.csrfToken,
      'X-Requested-With': 'XMLHttpRequest',
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      firstname: payload.firstname,
      lastname: payload.lastname,
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
    throw new Error('Registration server returned an invalid response');
  }

  if (!res.ok || !json.success) {
    throw new Error(json.error || `Registration failed (HTTP ${res.status})`);
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
