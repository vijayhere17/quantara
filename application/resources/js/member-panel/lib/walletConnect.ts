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
  }
}

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
  providers?: EthereumProvider[];
};

const BSC_CHAIN_ID = 56;

function markConnected(connected: boolean) {
  window.is_connected = connected;
  if (typeof window.setQuantaraWalletConnected === 'function') {
    window.setQuantaraWalletConnected(connected);
  }
}

function setWalletInput(address: string) {
  const el = document.getElementById('userwallet') as HTMLInputElement | null;
  if (!el) return;
  // Prefer native value setter so React controlled inputs also update when needed
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
    return eth.providers.find((p) => p.isMetaMask) || eth.providers[0] || eth;
  }
  return eth;
}

async function ensureBscNetwork(ethereum: EthereumProvider) {
  const web3Factory = window.Web3;
  const chainIdHex = web3Factory
    ? new web3Factory(ethereum).utils.toHex(BSC_CHAIN_ID)
    : `0x${BSC_CHAIN_ID.toString(16)}`;

  const chainParams = {
    chainId: chainIdHex,
    chainName: 'BNB Smart Chain',
    rpcUrls: ['https://bsc-dataseed.binance.org/'],
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    blockExplorerUrls: ['https://bscscan.com/'],
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
        console.error('Failed to add/switch BSC network:', addError);
      }
    } else {
      // Don't abort connect — original login also continued after switch errors
      console.error('Failed to switch network:', switchError);
    }
  }
}

/**
 * Same flow as legacy sign-in.0.4.js:
 * 1) request accounts
 * 2) fill wallet + mark connected
 * 3) best-effort switch to BSC (non-blocking)
 */
export async function connectQuantaraWallet(): Promise<string> {
  const ethereum = resolveEthereum();
  if (!ethereum) {
    const message = 'Please install MetaMask or another Web3 wallet';
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
      throw Object.assign(new Error('Connection request was rejected in MetaMask'), { code: 4001 });
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

  // Match legacy order: set wallet + connected BEFORE network switch
  setWalletInput(address);
  markConnected(true);

  // Best-effort BSC switch — never undo a successful account connect
  await ensureBscNetwork(ethereum);

  return address;
}

export function notifyError(message: string) {
  if (typeof window.erroralert === 'function') {
    window.erroralert(message);
  } else {
    window.alert(message);
  }
}
