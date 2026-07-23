import { Contract, ContractTransactionResponse } from 'ethers';
import { mapWalletError } from './wallet';

export type GasStatusFn = (message: string) => void;

/**
 * Estimate gas with a buffer, then send. Maps common failures to friendly messages.
 */
export async function sendWithGasEstimate(
  contract: Contract,
  method: string,
  args: unknown[] = [],
  onStatus?: GasStatusFn,
): Promise<ContractTransactionResponse> {
  try {
    const fn = contract.getFunction(method);
    onStatus?.('Estimating gas…');
    let gasLimit: bigint | undefined;
    try {
      const estimate: bigint = await fn.estimateGas(...args);
      gasLimit = (estimate * 120n) / 100n;
    } catch (estimateErr) {
      // Still attempt send — some wallets re-estimate; surface estimate errors if send fails
      const mapped = mapWalletError(estimateErr);
      if (
        mapped.includes('Insufficient') ||
        mapped.includes('rejected') ||
        mapped.includes('Wrong blockchain')
      ) {
        throw Object.assign(new Error(mapped), { cause: estimateErr });
      }
    }

    onStatus?.('Confirm in your wallet…');
    const tx: ContractTransactionResponse = gasLimit
      ? await fn(...args, { gasLimit })
      : await fn(...args);
    return tx;
  } catch (error) {
    throw Object.assign(new Error(mapWalletError(error)), { cause: error });
  }
}

export async function waitForTx(
  tx: ContractTransactionResponse,
  onStatus?: GasStatusFn,
  label = 'transaction',
) {
  onStatus?.(`Waiting for ${label} confirmation…`);
  try {
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new Error(`${label} failed.`);
    }
    return receipt;
  } catch (error) {
    const err = error as { code?: string; message?: string };
    const lower = String(err?.message || '').toLowerCase();
    if (lower.includes('timeout') || lower.includes('timed out')) {
      throw new Error('RPC timeout while waiting for confirmation. Check the explorer and try again.');
    }
    if (lower.includes('already known') || lower.includes('nonce too low')) {
      throw new Error('Pending or replacement transaction detected. Wait for it to confirm.');
    }
    if (lower.includes('replacement')) {
      throw new Error('Replacement transaction in progress. Wait for confirmation.');
    }
    throw Object.assign(new Error(mapWalletError(error)), { cause: error });
  }
}
