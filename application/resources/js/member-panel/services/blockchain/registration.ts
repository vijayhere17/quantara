import { JsonRpcSigner } from 'ethers';
import { getCoreContract, getTokenContract } from './contract';
import { loadBlockchainConfig } from './config';
import { mapWalletError } from './wallet';

export type RegistrationOnChainResult = {
  registerTxHash: string;
  packageTxHash: string;
  wallet: string;
  sponsor: string;
  packageAmount: number;
  blockNumber: number;
};

/**
 * On-chain registration matching BTCPlanCore.sol:
 * 1) register(sponsor) — free (gas only)
 * 2) approve(core, tokenAmount) + activatePackage(amount) — BTCB payment
 */
export async function registerOnChain(
  signer: JsonRpcSigner,
  sponsorAddress: string,
  packageAmount: number,
  onStatus?: (message: string) => void,
): Promise<RegistrationOnChainResult> {
  try {
    const wallet = await signer.getAddress();
    const sponsor = sponsorAddress || '0x0000000000000000000000000000000000000000';
    const cfg = await loadBlockchainConfig();

    const core = await getCoreContract(signer);
    const token = await getTokenContract(signer);

    onStatus?.('Submitting registration transaction…');
    const registerTx = await core.register(sponsor);
    onStatus?.('Waiting for registration confirmation…');
    const registerReceipt = await registerTx.wait();
    if (!registerReceipt || registerReceipt.status !== 1) {
      throw new Error('Registration transaction failed on-chain');
    }

    onStatus?.('Preparing package payment…');
    const tokenAmount: bigint = await core.getPackageBTCBAmount(BigInt(packageAmount));
    const allowance: bigint = await token.allowance(wallet, cfg.core);
    if (allowance < tokenAmount) {
      onStatus?.('Approve BTCB spending in MetaMask…');
      const approveTx = await token.approve(cfg.core, tokenAmount);
      await approveTx.wait();
    }

    onStatus?.('Confirm package payment in MetaMask…');
    const packageTx = await core.activatePackage(BigInt(packageAmount));
    onStatus?.('Waiting for package confirmation…');
    const packageReceipt = await packageTx.wait();
    if (!packageReceipt || packageReceipt.status !== 1) {
      throw new Error('Package activation failed on-chain');
    }

    return {
      registerTxHash: String(registerTx.hash),
      packageTxHash: String(packageTx.hash),
      wallet,
      sponsor,
      packageAmount,
      blockNumber: Number(packageReceipt.blockNumber ?? registerReceipt.blockNumber ?? 0),
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
      leg: payload.leg || 'L',
    }),
  });

  const json = (await res.json()) as {
    success?: boolean;
    error?: string;
    redirect?: string;
    token?: string;
    user?: Record<string, unknown>;
  };

  if (!json.success) {
    throw new Error(json.error || 'Laravel registration failed');
  }

  if (json.token) {
    try {
      localStorage.setItem('quantara_auth_token', json.token);
    } catch {
      // ignore
    }
  }

  return json;
}
