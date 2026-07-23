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

  // Bridge legacy globals used by existing jQuery scripts
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
  const err = error as { code?: number | string; message?: string; shortMessage?: string; reason?: string };
  if (err?.code === 4001 || err?.code === 'ACTION_REJECTED') {
    return 'You rejected the MetaMask request.';
  }
  if (err?.code === 'WALLET_NOT_INSTALLED') {
    return 'MetaMask is not installed.';
  }
  if (err?.code === 4902) {
    return 'Please add BNB Smart Chain in MetaMask.';
  }
  return err?.shortMessage || err?.reason || err?.message || 'Wallet request failed.';
}
