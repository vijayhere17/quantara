/** Shared chain + contract config for Quantara Web3 auth */

import { apiUrl, getApiBaseUrl } from '../../lib/apiBase';

export const BSC_CHAIN_ID = 56;
export const LOCAL_CHAIN_ID = 31337;

export type BlockchainPublicConfig = {
  rpc: string;
  chainId: number;
  core: string;
  token: string;
  treasury: string;
  reward?: string;
  /** Local Hardhat demo faucet — never true in production */
  demoFaucet?: boolean;
};

const FALLBACK_LOCAL: BlockchainPublicConfig = {
  rpc: 'http://127.0.0.1:8545',
  chainId: LOCAL_CHAIN_ID,
  core: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  token: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  treasury: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  reward: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
};

const FALLBACK_BSC: BlockchainPublicConfig = {
  rpc: 'https://bsc-dataseed.binance.org/',
  chainId: BSC_CHAIN_ID,
  core: '',
  token: '',
  treasury: '',
};

let cachedConfig: BlockchainPublicConfig | null = null;
let lastConfigError: string | null = null;

export function getLastBlockchainConfigError(): string | null {
  return lastConfigError;
}

export function clearBlockchainConfigCache(): void {
  cachedConfig = null;
  lastConfigError = null;
}

/**
 * Load public blockchain config from Laravel.
 * Always uses the application base URL from boot / #basePath / VITE_APP_URL
 * so subdirectory installs (e.g. APP_URL=http://localhost/btc) resolve correctly.
 */
export async function loadBlockchainConfig(baseUrl?: string): Promise<BlockchainPublicConfig> {
  if (cachedConfig?.core) return cachedConfig;

  const resolvedBase = getApiBaseUrl(baseUrl);
  const endpoint = apiUrl('/api/blockchain/config', resolvedBase);

  try {
    const res = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });

    if (!res.ok) {
      lastConfigError = `Failed to load blockchain config from ${endpoint} (HTTP ${res.status})`;
      throw new Error(lastConfigError);
    }

    const json = (await res.json()) as { success?: boolean; data?: BlockchainPublicConfig };
    if (json?.data?.core && json?.data?.token) {
      cachedConfig = json.data;
      lastConfigError = null;
      return cachedConfig;
    }

    lastConfigError =
      `Blockchain config at ${endpoint} did not include CORE_CONTRACT / TOKEN_CONTRACT. ` +
      'Check Laravel .env and /api/blockchain/config.';
  } catch (error) {
    if (!lastConfigError) {
      lastConfigError =
        error instanceof Error
          ? error.message
          : `Failed to reach blockchain config at ${endpoint}`;
    }
  }

  // Local Hardhat fallback only when API is unreachable AND boot signals local chain
  const boot = (window as unknown as { __QUANTARA_BOOT__?: { chainId?: number } }).__QUANTARA_BOOT__;
  if (boot?.chainId === LOCAL_CHAIN_ID) {
    cachedConfig = FALLBACK_LOCAL;
    return cachedConfig;
  }

  // Do NOT cache empty BSC fallback — allows retry after boot/baseUrl is available
  throw new Error(
    lastConfigError ||
      `Contract addresses are not configured. Could not load ${endpoint}. ` +
        'Ensure APP_URL matches the browser path and CORE_CONTRACT / TOKEN_CONTRACT are set.',
  );
}

export function getBscNetworkParams(chainId = BSC_CHAIN_ID) {
  if (chainId === LOCAL_CHAIN_ID) {
    return {
      chainIdHex: '0x7a69',
      chainName: 'Hardhat Local',
      rpcUrls: ['http://127.0.0.1:8545'],
      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      blockExplorerUrls: [] as string[],
    };
  }

  return {
    chainIdHex: '0x38',
    chainName: 'BNB Smart Chain',
    rpcUrls: ['https://bsc-dataseed.binance.org/'],
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    blockExplorerUrls: ['https://bscscan.com/'],
  };
}

// Keep FALLBACK_BSC referenced for potential test/mock use without caching it blindly
export { FALLBACK_BSC };
