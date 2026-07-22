declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isMetaMask?: boolean;
    };
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
  el.value = address;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

async function ensureBscNetwork(ethereum: NonNullable<Window['ethereum']>) {
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
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [chainParams],
      });
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } else {
      throw switchError;
    }
  }
}

export async function connectQuantaraWallet(): Promise<string> {
  const ethereum = window.ethereum;
  if (!ethereum) {
    const message = 'Please install MetaMask or another Web3 wallet';
    if (typeof window.erroralert === 'function') {
      window.erroralert(message);
    } else {
      window.alert(message);
    }
    markConnected(false);
    throw new Error(message);
  }

  const accounts = (await ethereum.request({
    method: 'eth_requestAccounts',
  })) as string[];

  if (!accounts?.[0]) {
    throw new Error('No wallet account returned');
  }

  if (window.Web3) {
    window.web3 = new window.Web3(ethereum);
  }

  await ensureBscNetwork(ethereum);

  const address = accounts[0];
  setWalletInput(address);
  markConnected(true);
  return address;
}

export function notifyError(message: string) {
  if (typeof window.erroralert === 'function') {
    window.erroralert(message);
  } else {
    window.alert(message);
  }
}
