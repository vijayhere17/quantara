import {
  BrowserProvider,
  Contract,
  JsonRpcSigner,
  formatEther,
  formatUnits,
  type Provider,
} from 'ethers';
import { loadBlockchainConfig } from './config';

export type WalletBalances = {
  address: string;
  chainId: number;
  /** Native coin (BNB / tBNB / ETH) wei */
  nativeWei: bigint;
  nativeFormatted: string;
  /** True when native balance was read successfully */
  nativeLoaded: boolean;
  /** BEP-20 payment token */
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenWei: bigint;
  tokenFormatted: string;
  /** True when token balanceOf decoded successfully */
  tokenLoaded: boolean;
  /** Optional reason token balance could not be loaded */
  tokenError?: string | null;
};

const ERC20_META_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

function emptyTokenFields(tokenAddress = ''): Pick<
  WalletBalances,
  | 'tokenAddress'
  | 'tokenSymbol'
  | 'tokenDecimals'
  | 'tokenWei'
  | 'tokenFormatted'
  | 'tokenLoaded'
  | 'tokenError'
> {
  return {
    tokenAddress,
    tokenSymbol: 'BTCB',
    tokenDecimals: 18,
    tokenWei: 0n,
    tokenFormatted: '0',
    tokenLoaded: false,
    tokenError: null,
  };
}

async function readNativeBalance(
  provider: Provider,
  address: string,
): Promise<{ wei: bigint; chainId: number }> {
  const network = await provider.getNetwork();
  const wei = await provider.getBalance(address);
  return { wei, chainId: Number(network.chainId) };
}

/**
 * Read BEP-20 balance independently. Never throws — returns tokenLoaded=false on failure.
 */
async function readTokenBalance(
  provider: Provider,
  address: string,
  tokenAddress: string,
): Promise<
  Pick<
    WalletBalances,
    | 'tokenAddress'
    | 'tokenSymbol'
    | 'tokenDecimals'
    | 'tokenWei'
    | 'tokenFormatted'
    | 'tokenLoaded'
    | 'tokenError'
  >
> {
  if (!tokenAddress) {
    return {
      ...emptyTokenFields(''),
      tokenError: 'TOKEN_CONTRACT is not configured.',
    };
  }

  try {
    const code = await provider.getCode(tokenAddress);
    if (!code || code === '0x') {
      return {
        ...emptyTokenFields(tokenAddress),
        tokenError: `TOKEN_CONTRACT at ${tokenAddress} has no bytecode.`,
      };
    }

    const token = new Contract(tokenAddress, ERC20_META_ABI, provider);

    // balanceOf is required; decimals/symbol failures must not block the balance.
    const tokenWei = (await token.balanceOf(address)) as bigint;

    const decimalsRaw = await token.decimals().catch(() => 18);
    const symbolRaw = await token.symbol().catch(() => 'BTCB');
    const tokenDecimals = Number(decimalsRaw);
    const tokenSymbol = String(symbolRaw || 'BTCB');

    return {
      tokenAddress,
      tokenSymbol,
      tokenDecimals,
      tokenWei,
      tokenFormatted: formatUnits(tokenWei, tokenDecimals),
      tokenLoaded: true,
      tokenError: null,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to read token balance.';
    return {
      ...emptyTokenFields(tokenAddress),
      tokenError: message,
    };
  }
}

/**
 * Read native + BEP-20 balances for a wallet on the current provider network.
 *
 * Native and token reads are independent:
 * - A failed token call must NOT discard a successful ETH/BNB balance.
 * - A missing TOKEN_CONTRACT still returns native balance.
 */
export async function getWalletBalances(
  provider: BrowserProvider | Provider,
  address: string,
): Promise<WalletBalances> {
  let nativeWei = 0n;
  let chainId = 0;
  let nativeLoaded = false;

  try {
    const native = await readNativeBalance(provider, address);
    nativeWei = native.wei;
    chainId = native.chainId;
    nativeLoaded = true;
  } catch {
    // Try to at least recover chainId; native stays unloaded.
    try {
      chainId = Number((await provider.getNetwork()).chainId);
    } catch {
      chainId = 0;
    }
  }

  let tokenAddress = '';
  try {
    const cfg = await loadBlockchainConfig();
    tokenAddress = cfg.token || '';
  } catch {
    tokenAddress = '';
  }

  const token = await readTokenBalance(provider, address, tokenAddress);

  // Prefer reporting whatever we have. Only throw when BOTH sides failed.
  if (!nativeLoaded && !token.tokenLoaded) {
    throw new Error('Unable to load wallet balances.');
  }

  return {
    address,
    chainId,
    nativeWei,
    nativeFormatted: formatEther(nativeWei),
    nativeLoaded,
    ...token,
  };
}

/** Convenience: balances via signer */
export async function getSignerBalances(signer: JsonRpcSigner): Promise<WalletBalances> {
  const address = await signer.getAddress();
  const provider = signer.provider;
  if (!provider) {
    throw new Error('Wallet provider is unavailable');
  }
  return getWalletBalances(provider, address);
}
