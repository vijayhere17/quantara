import { JsonRpcSigner, formatUnits } from 'ethers';
import { apiUrl } from '../../lib/apiBase';
import { ensureTokenApproval } from './approval';
import { getCoreContract, getTokenContract } from './contract';
import { loadBlockchainConfig } from './config';
import { sendWithGasEstimate, waitForTx } from './gas';
import { mapWalletError } from './wallet';

export type PackageActivationOnChainResult = {
  approveTxHash: string;
  packageTxHash: string;
  wallet: string;
  packageAmount: number;
  tokenAmount: string;
  blockNumber: number;
  packageCycle: number;
};

/**
 * Existing-member package upgrade (NO register):
 * 1) getNextEligiblePackage — must match selected amount
 * 2) ALWAYS approve(core, tokenAmount) via MetaMask → mined hash
 * 3) activatePackage(amount) → mined hash
 */
export async function activatePackageOnChain(
  signer: JsonRpcSigner,
  packageAmount: number,
  onStatus?: (message: string) => void,
): Promise<PackageActivationOnChainResult> {
  try {
    const wallet = await signer.getAddress();

    const cfg = await loadBlockchainConfig();
    if (!cfg.core || !cfg.token) {
      throw new Error('Blockchain is not configured. Please contact support.');
    }

    const core = await getCoreContract(signer);
    const token = await getTokenContract(signer);

    const onChainUser = await core.users(wallet);
    if (!onChainUser.isActive) {
      throw new Error('Wallet is not registered on-chain. Please complete registration first.');
    }

    onStatus?.('Checking eligible package…');
    const [expectedPackage, expectedCycle] = await core.getNextEligiblePackage(wallet);
    if (Number(expectedPackage) !== packageAmount) {
      throw new Error(
        `Invalid package selection. Next eligible package is $${Number(expectedPackage)}.`,
      );
    }

    const packageCycle = Number(expectedCycle);

    onStatus?.('Preparing package payment…');
    const tokenAmount: bigint = await core.getPackageBTCBAmount(BigInt(packageAmount));
    if (tokenAmount <= 0n) {
      throw new Error('Unable to calculate package payment.');
    }
    const tokenAmountStr = tokenAmount.toString();

    const balance: bigint = await token.balanceOf(wallet);
    if (balance < tokenAmount) {
      const decimals = Number(await token.decimals().catch(() => 18));
      const symbol = String(await token.symbol().catch(() => 'TOKEN'));
      throw new Error(
        `Insufficient package balance. Need ${formatUnits(tokenAmount, decimals)} ${symbol}.`,
      );
    }

    const approved = await ensureTokenApproval(signer, tokenAmount, onStatus);
    const approveTxHash = approved.approveTxHash;

    const packageTx = await sendWithGasEstimate(
      core,
      'activatePackage',
      [BigInt(packageAmount)],
      onStatus,
    );
    const packageReceipt = await waitForTx(packageTx, onStatus, 'activation');
    const packageTxHash = String(packageTx.hash);
    const blockNumber = Number(packageReceipt.blockNumber ?? 0);

    const activated = await core.users(wallet);
    if (Number(activated.packageAmount) !== packageAmount) {
      throw new Error('Activation failed.');
    }

    return {
      approveTxHash,
      packageTxHash,
      wallet,
      packageAmount,
      tokenAmount: tokenAmountStr,
      blockNumber,
      packageCycle,
    };
  } catch (error) {
    throw Object.assign(new Error(mapWalletError(error)), { cause: error });
  }
}

export async function completePackageActivationWithLaravel(payload: {
  baseUrl: string;
  package_amount: number;
  package_tx_hash: string;
  approve_tx_hash: string;
  wallet: string;
  token_amount?: string;
}) {
  if (!payload.approve_tx_hash || !/^0x[a-fA-F0-9]{64}$/.test(payload.approve_tx_hash)) {
    throw new Error('Approval transaction hash is required.');
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };

  try {
    const token = localStorage.getItem('quantara_auth_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore
  }

  const res = await fetch(apiUrl('/api/packages/activate', payload.baseUrl), {
    method: 'POST',
    headers,
    credentials: 'same-origin',
    body: JSON.stringify({
      package_amount: payload.package_amount,
      package_tx_hash: payload.package_tx_hash,
      approve_tx_hash: payload.approve_tx_hash,
      wallet: payload.wallet,
      token_amount: payload.token_amount || null,
    }),
  });

  if (res.status === 419) {
    throw new Error('Session expired. Please refresh and try again.');
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error('Please sign in again to complete package activation.');
  }

  let json: {
    success?: boolean;
    error?: string;
    message?: string;
    redirect?: string;
    dashboard?: Record<string, unknown>;
    user?: Record<string, unknown>;
  };

  try {
    json = await res.json();
  } catch {
    throw new Error('Package activation failed. Please try again.');
  }

  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Package activation failed. Please try again.');
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
