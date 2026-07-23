import {
  BSC_CHAIN_ID,
  getNetworkParams,
  loadBlockchainConfig,
} from '../services/blockchain/config';

declare global {
  interface Window {
    ethereum?: EthereumProvider;
    Web3?: new (provider: unknown) => {
      utils: { toHex: (value: number) => string; fromWei?: (value: string, unit: string) => string };
      eth?: unknown;
    };
    web3?: unknown;
    is_connected?: boolean;
    setQuantaraWalletConnected?: (connected: boolean) => void;
    processlogin?: () => void;
    processregister?: () => void;
    erroralert?: (message: string) => void;
    successalert?: (message: string) => void;
  }
}

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
  isTrust?: boolean;
  isTrustWallet?: boolean;
  providers?: EthereumProvider[];
};

function markConnected(connected: boolean) {
  window.is_connected = connected;
  if (typeof window.setQuantaraWalletConnected === 'function') {
    window.setQuantaraWalletConnected(connected);
  }
}

function setWalletInput(address: string) {
  const el = document.getElementById('userwallet') as HTMLInputElement | null;
  if (!el) return;
  const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  if (proto?.set) {
    proto.set.call(el, address);
  } else {
    el.value = address;
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function resolveEthereum(): EthereumProvider | undefined {
  const eth = window.ethereum;
  if (!eth) return undefined;
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

/**
 * Switch to the chain configured by Laravel (BSC mainnet / testnet / Hardhat).
 * Best-effort — never undoes a successful account connect.
 */
async function ensureConfiguredNetwork(ethereum: EthereumProvider) {
  let targetChainId = BSC_CHAIN_ID;
  try {
    const cfg = await loadBlockchainConfig();
    targetChainId = cfg.chainId || BSC_CHAIN_ID;
  } catch {
    // Fall back to BSC mainnet when config is unavailable
  }

  const params = getNetworkParams(targetChainId);
  const web3Factory = window.Web3;
  const chainIdHex = web3Factory
    ? new web3Factory(ethereum).utils.toHex(params.chainId)
    : params.chainIdHex;

  const chainParams = {
    chainId: chainIdHex,
    chainName: params.chainName,
    rpcUrls: params.rpcUrls,
    nativeCurrency: params.nativeCurrency,
    blockExplorerUrls: params.blockExplorerUrls.length ? params.blockExplorerUrls : undefined,
  };

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
  } catch (switchError) {
    const err = switchError as { code?: number };
    if (err?.code === 4902) {
      try {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [chainParams],
        });
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
      } catch (addError) {
        console.error('Failed to add/switch network:', addError);
      }
    } else {
      console.error('Failed to switch network:', switchError);
    }
  }
}

/**
 * Connect MetaMask / Trust Wallet / any injected EIP-1193 provider
 * (including WalletConnect in-app browsers that inject window.ethereum).
 */
export async function connectQuantaraWallet(): Promise<string> {
  const ethereum = resolveEthereum();
  if (!ethereum) {
    const message = 'Please install MetaMask, Trust Wallet, or another BEP-20 wallet';
    notifyError(message);
    markConnected(false);
    throw new Error(message);
  }

  let accounts: string[];
  try {
    accounts = (await ethereum.request({
      method: 'eth_requestAccounts',
    })) as string[];
  } catch (error) {
    const err = error as { code?: number; message?: string };
    if (err?.code === 4001) {
      throw Object.assign(new Error('Connection request was rejected in your wallet'), {
        code: 4001,
      });
    }
    throw error;
  }

  if (!accounts?.[0]) {
    throw new Error('No wallet account returned');
  }

  if (window.Web3) {
    window.web3 = new window.Web3(ethereum);
  }

  const address = accounts[0];

  setWalletInput(address);
  markConnected(true);

  await ensureConfiguredNetwork(ethereum);

  return address;
}

export function notifyError(message: string) {
  const text = String(message || 'Something went wrong.').trim();
  if (typeof window.erroralert === 'function') {
    window.erroralert(text);
  } else {
    window.alert(text);
  }
}

export function notifySuccess(message: string) {
  const text = String(message || 'Success.').trim();
  if (typeof window.successalert === 'function') {
    window.successalert(text);
  } else {
    window.alert(text);
  }
}
