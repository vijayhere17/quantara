import { BrowserProvider, Contract, JsonRpcSigner, formatEther, formatUnits } from 'ethers';
import { getTokenContract } from './contract';
import { loadBlockchainConfig } from './config';

export type WalletBalances = {
  address: string;
  chainId: number;
  /** Native coin (BNB / tBNB / ETH) wei */
  nativeWei: bigint;
  nativeFormatted: string;
  /** BEP-20 payment token */
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenWei: bigint;
  tokenFormatted: string;
};

const ERC20_META_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

/**
 * Read native + BEP-20 balances for a wallet on the current provider network.
 */
export async function getWalletBalances(
  provider: BrowserProvider,
  address: string,
): Promise<WalletBalances> {
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  const nativeWei = await provider.getBalance(address);

  const cfg = await loadBlockchainConfig();
  const tokenAddress = cfg.token;
  if (!tokenAddress) {
    throw new Error('TOKEN_CONTRACT is not configured.');
  }

  const token = new Contract(tokenAddress, ERC20_META_ABI, provider);
  const [tokenWei, decimalsRaw, symbol] = await Promise.all([
    token.balanceOf(address) as Promise<bigint>,
    token.decimals().catch(() => 18) as Promise<number | bigint>,
    token.symbol().catch(() => 'TOKEN') as Promise<string>,
  ]);

  const tokenDecimals = Number(decimalsRaw);

  return {
    address,
    chainId,
    nativeWei,
    nativeFormatted: formatEther(nativeWei),
    tokenAddress,
    tokenSymbol: symbol || 'TOKEN',
    tokenDecimals,
    tokenWei,
    tokenFormatted: formatUnits(tokenWei, tokenDecimals),
  };
}

/** Convenience: balances via signer */
export async function getSignerBalances(signer: JsonRpcSigner): Promise<WalletBalances> {
  const address = await signer.getAddress();
  const provider = signer.provider;
  if (!provider || !(provider instanceof BrowserProvider)) {
    // JsonRpcProvider also works via getBalance/Contract
    const network = await provider!.getNetwork();
    const nativeWei = await provider!.getBalance(address);
    const token = await getTokenContract(signer);
    const tokenWei: bigint = await token.balanceOf(address);
    const tokenDecimals = Number(await token.decimals().catch(() => 18));
    const tokenSymbol = String(await token.symbol().catch(() => 'TOKEN'));
    const cfg = await loadBlockchainConfig();
    return {
      address,
      chainId: Number(network.chainId),
      nativeWei,
      nativeFormatted: formatEther(nativeWei),
      tokenAddress: cfg.token,
      tokenSymbol,
      tokenDecimals,
      tokenWei,
      tokenFormatted: formatUnits(tokenWei, tokenDecimals),
    };
  }
  return getWalletBalances(provider, address);
}
