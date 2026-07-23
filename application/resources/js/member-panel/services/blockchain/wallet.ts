import { BrowserProvider, JsonRpcSigner, Eip1193Provider } from 'ethers';
import { BSC_CHAIN_ID, getBscNetworkParams, loadBlockchainConfig } from './config';

export type EthereumProvider = Eip1193Provider & {
  isMetaMask?: boolean;
  providers?: EthereumProvider[];
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

export function resolveInjectedProvider(): EthereumProvider | null {
  const eth = window.ethereum as EthereumProvider | undefined;
  if (!eth) return null;
  if (Array.isArray(eth.providers) && eth.providers.length > 0) {
    return eth.providers.find((p) => p.isMetaMask) || eth.providers[0] || eth;
  }
  return eth;
}

export function hasInjectedWallet(): boolean {
  return Boolean(resolveInjectedProvider());
}

export async function ensureCorrectChain(provider: EthereumProvider, chainId = BSC_CHAIN_ID) {
  const cfg = await loadBlockchainConfig();
  const target = cfg.chainId || chainId;
  const params = getBscNetworkParams(target);
  const current = await provider.request({ method: 'eth_chainId' });
  if (typeof current === 'string' && current.toLowerCase() === params.chainIdHex.toLowerCase()) {
    return;
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
            blockExplorerUrls: params.blockExplorerUrls,
          },
        ],
      });
      return;
    }
    throw error;
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
    throw Object.assign(new Error('WALLET_NOT_INSTALLED'), { code: 'WALLET_NOT_INSTALLED' });
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

  window.is_connected = true;
  window.setQuantaraWalletConnected?.(true);
  const el = document.getElementById('userwallet') as HTMLInputElement | null;
  if (el) {
    el.value = address;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

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
    return 'MetaMask is not installed.';
  }
  if (err?.code === 4902) {
    return 'Wrong blockchain network.';
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
  if (lower.includes('insufficient') && lower.includes('balance')) {
    return 'Insufficient package balance.';
  }
  if (lower.includes('transfer amount exceeds balance') || lower.includes('insufficient funds')) {
    return 'Insufficient package balance.';
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
