import {
  BSC_CHAIN_ID,
  BSC_TESTNET_CHAIN_ID,
  getExplorerBaseUrl,
  getNetworkName,
  loadBlockchainConfig,
} from './config';

/**
 * Centralized BscScan / explorer URL helpers.
 * Mainnet: https://bscscan.com/tx/
 * Testnet: https://testnet.bscscan.com/tx/
 */

export function explorerBaseForChain(chainId?: number | null): string {
  if (chainId == null) return getExplorerBaseUrl(BSC_CHAIN_ID);
  return getExplorerBaseUrl(chainId);
}

export function getExplorerTxUrl(txHash: string, chainId?: number | null): string | null {
  const base = explorerBaseForChain(chainId);
  if (!base || !txHash) return null;
  const hash = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
  return `${base}/tx/${hash}`;
}

export function getExplorerAddressUrl(address: string, chainId?: number | null): string | null {
  const base = explorerBaseForChain(chainId);
  if (!base || !address) return null;
  return `${base}/address/${address}`;
}

export async function getConfiguredExplorerTxUrl(txHash: string): Promise<string | null> {
  try {
    const cfg = await loadBlockchainConfig();
    const base = cfg.explorer || explorerBaseForChain(cfg.chainId);
    if (!base || !txHash) return null;
    const hash = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
    return `${base}/tx/${hash}`;
  } catch {
    return getExplorerTxUrl(txHash, BSC_CHAIN_ID);
  }
}

export function describeNetwork(chainId?: number | null): string {
  if (chainId == null) return 'Unknown network';
  return getNetworkName(chainId);
}

export function isBscNetwork(chainId?: number | null): boolean {
  return chainId === BSC_CHAIN_ID || chainId === BSC_TESTNET_CHAIN_ID;
}
