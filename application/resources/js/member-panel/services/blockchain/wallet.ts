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
    return 'You rejected the MetaMask request.';
  }
  if (err?.code === 'WALLET_NOT_INSTALLED') {
    return 'MetaMask is not installed.';
  }
  if (err?.code === 4902) {
    return 'Please add BNB Smart Chain in MetaMask.';
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
  if (lower.includes('user already registered')) return 'This wallet is already registered on-chain.';
  if (lower.includes('sponsor not registered')) return 'Sponsor is not registered on-chain yet.';
  if (lower.includes('cannot sponsor yourself')) return 'Cannot sponsor yourself.';
  if (lower.includes('invalid package sequence')) return 'Invalid package sequence. New members must activate $50 first.';
  if (lower.includes('user not registered')) return 'Register on-chain before activating a package.';
  if (lower.includes('insufficient')) return raw;
  if (lower.includes('transfer amount exceeds allowance') || lower.includes('erc20: insufficient allowance')) {
    return 'Token allowance is insufficient. Please approve BTCB spending and try again.';
  }
  if (lower.includes('transfer amount exceeds balance') || lower.includes('insufficient funds')) {
    return 'Insufficient token or BNB balance for this transaction.';
  }

  return raw || 'Wallet request failed.';
}
