/** Shared chain + contract config for Quantara Web3 auth */

export const BSC_CHAIN_ID = 56;
export const LOCAL_CHAIN_ID = 31337;

export type BlockchainPublicConfig = {
  rpc: string;
  chainId: number;
  core: string;
  token: string;
  treasury: string;
  reward?: string;
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

export async function loadBlockchainConfig(baseUrl = ''): Promise<BlockchainPublicConfig> {
  if (cachedConfig) return cachedConfig;

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/blockchain/config`, {
      headers: { Accept: 'application/json' },
    });
    const json = (await res.json()) as { success?: boolean; data?: BlockchainPublicConfig };
    if (json?.data?.core) {
      cachedConfig = json.data;
      return cachedConfig;
    }
  } catch {
    // fall through
  }

  const boot = (window as unknown as { __QUANTARA_BOOT__?: { chainId?: number } }).__QUANTARA_BOOT__;
  cachedConfig = boot?.chainId === LOCAL_CHAIN_ID ? FALLBACK_LOCAL : FALLBACK_BSC;
  return cachedConfig;
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
