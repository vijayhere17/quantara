import { BrowserProvider, JsonRpcSigner, Eip1193Provider } from 'ethers';
import { BSC_CHAIN_ID, getNetworkParams, loadBlockchainConfig } from './config';

export type EthereumProvider = Eip1193Provider & {
  isMetaMask?: boolean;
  isTrust?: boolean;
  isTrustWallet?: boolean;
  providers?: EthereumProvider[];
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

/**
 * Resolve MetaMask, Trust Wallet, or any EIP-1193 injected provider
 * (including WalletConnect-in-app browsers that inject window.ethereum).
 */
export function resolveInjectedProvider(): EthereumProvider | null {
  const eth = window.ethereum as EthereumProvider | undefined;
  if (!eth) return null;
  if (Array.isArray(eth.providers) && eth.providers.length > 0) {
    return (
      eth.providers.find((p) => p.isMetaMask) ||
      eth.providers.find((p) => p.isTrust || p.isTrustWallet) ||
      eth.providers[0] ||
      eth
    );
  }
  return eth;
}

export function hasInjectedWallet(): boolean {
  return Boolean(resolveInjectedProvider());
}

export function getWalletBrand(provider?: EthereumProvider | null): string {
  const p = provider || resolveInjectedProvider();
  if (!p) return 'Web3 wallet';
  if (p.isTrust || p.isTrustWallet) return 'Trust Wallet';
  if (p.isMetaMask) return 'MetaMask';
  return 'Web3 wallet';
}

/**
 * Ensure the wallet is on the configured chain (56 / 97 / 31337).
 * Prompts switch / add-chain when mismatched.
 */
export async function ensureCorrectChain(provider: EthereumProvider, chainId = BSC_CHAIN_ID) {
  const cfg = await loadBlockchainConfig();
  const target = cfg.chainId || chainId;
  const params = getNetworkParams(target);
  const current = await provider.request({ method: 'eth_chainId' });
  if (typeof current === 'string' && current.toLowerCase() === params.chainIdHex.toLowerCase()) {
    return target;
  }

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: params.chainIdHex }],
    });
  } catch (error) {
    const err = error as { code?: number };
    if (err?.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: params.chainIdHex,
            chainName: params.chainName,
            rpcUrls: params.rpcUrls,
            nativeCurrency: params.nativeCurrency,
            blockExplorerUrls: params.blockExplorerUrls.length
              ? params.blockExplorerUrls
              : undefined,
          },
        ],
      });
      return target;
    }
    throw Object.assign(new Error('Wrong blockchain network. Please switch to ' + params.chainName), {
      cause: error,
      code: 4902,
    });
  }

  return target;
}

function markConnected(address: string) {
  window.is_connected = true;
  window.setQuantaraWalletConnected?.(true);
  const el = document.getElementById('userwallet') as HTMLInputElement | null;
  if (el) {
    el.value = address;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

export async function createBrowserProvider(): Promise<{
  injected: EthereumProvider;
  provider: BrowserProvider;
  signer: JsonRpcSigner;
  address: string;
  chainId: number;
}> {
  const injected = resolveInjectedProvider();
  if (!injected) {
    throw Object.assign(
      new Error('WALLET_NOT_INSTALLED'),
      { code: 'WALLET_NOT_INSTALLED' },
    );
  }

  const accounts = (await injected.request({ method: 'eth_requestAccounts' })) as string[];
  if (!accounts?.[0]) {
    throw new Error('No wallet account returned');
  }

  await ensureCorrectChain(injected);

  const provider = new BrowserProvider(injected);
  const signer = await provider.getSigner();
  const network = await provider.getNetwork();
  const address = await signer.getAddress();

  markConnected(address);

  return {
    injected,
    provider,
    signer,
    address,
    chainId: Number(network.chainId),
  };
}

/**
 * Silent reconnect when the wallet already authorized this origin (no popup).
 */
export async function tryReconnectBrowserProvider(): Promise<{
  injected: EthereumProvider;
  provider: BrowserProvider;
  signer: JsonRpcSigner;
  address: string;
  chainId: number;
} | null> {
  const injected = resolveInjectedProvider();
  if (!injected) return null;

  const accounts = (await injected.request({ method: 'eth_accounts' })) as string[];
  if (!accounts?.[0]) return null;

  try {
    await ensureCorrectChain(injected);
  } catch {
    // Still attach; UI can prompt switch
  }

  const provider = new BrowserProvider(injected);
  const signer = await provider.getSigner();
  const network = await provider.getNetwork();
  const address = await signer.getAddress();
  markConnected(address);

  return {
    injected,
    provider,
    signer,
    address,
    chainId: Number(network.chainId),
  };
}

export function mapWalletError(error: unknown): string {
  const err = error as {
    code?: number | string;
    message?: string;
    shortMessage?: string;
    reason?: string;
    data?: { message?: string };
    error?: { message?: string };
    info?: { error?: { message?: string } };
  };

  if (err?.code === 4001 || err?.code === 'ACTION_REJECTED') {
    return 'Transaction rejected.';
  }
  if (err?.code === 'WALLET_NOT_INSTALLED') {
    return 'Install MetaMask, Trust Wallet, or another BEP-20 wallet to continue.';
  }
  if (err?.code === 4902) {
    return 'Wrong blockchain network. Switch to BNB Smart Chain.';
  }

  const raw =
    err?.reason ||
    err?.shortMessage ||
    err?.data?.message ||
    err?.info?.error?.message ||
    err?.error?.message ||
    err?.message ||
    '';

  const lower = raw.toLowerCase();

  if (
    lower.includes('sponsor not found') ||
    lower.includes('insufficient package balance') ||
    lower.includes('approval cancelled') ||
    lower.includes('activation failed') ||
    lower.includes('registration failed') ||
    lower.includes('cannot sponsor yourself')
  ) {
    return raw;
  }

  if (lower.includes('user already registered') || lower.includes('already registered')) {
    return 'This wallet is already registered.';
  }
  if (lower.includes('sponsor not registered') || lower.includes('not registered on-chain')) {
    return 'Sponsor not found.';
  }
  if (lower.includes('cannot sponsor yourself')) return 'Cannot sponsor yourself.';
  if (lower.includes('invalid package')) return 'Invalid package selection.';
  if (lower.includes('user rejected') || lower.includes('rejected the request')) {
    return 'Transaction rejected.';
  }
  if (lower.includes('insufficient funds') && lower.includes('gas')) {
    return 'Insufficient BNB for gas fees.';
  }
  if (lower.includes('insufficient') && lower.includes('balance')) {
    return 'Insufficient package balance.';
  }
  if (lower.includes('transfer amount exceeds balance') || lower.includes('insufficient funds')) {
    return 'Insufficient package balance.';
  }
  if (lower.includes('nonce too low') || lower.includes('already known')) {
    return 'Pending or replacement transaction detected. Wait for confirmation.';
  }
  if (lower.includes('replacement transaction')) {
    return 'Replacement transaction in progress. Wait for confirmation.';
  }
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('stalled')) {
    return 'RPC timeout. Please try again.';
  }
  if (lower.includes('wrong') && lower.includes('network')) {
    return 'Wrong blockchain network.';
  }
  if (lower.includes('chain') && (lower.includes('switch') || lower.includes('mismatch'))) {
    return 'Wrong blockchain network.';
  }
  if (
    lower.includes('unrecognized-selector') ||
    lower.includes('call_exception') ||
    lower.includes('call exception') ||
    lower.includes('require(false)') ||
    lower.includes('internal json-rpc') ||
    lower.includes('rpc error') ||
    lower.includes('unknown error') ||
    lower.includes('execution reverted')
  ) {
    return 'Transaction failed. Please try again.';
  }

  const cleaned = raw
    .replace(/^error:\s*/i, '')
    .replace(/^execution reverted:\s*/i, '')
    .replace(/^call_exception:\s*/i, '')
    .trim();

  if (!cleaned || cleaned.length > 180) {
    return 'Transaction failed. Please try again.';
  }

  return cleaned;
}
