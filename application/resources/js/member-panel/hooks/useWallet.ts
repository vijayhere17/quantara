import { useCallback, useEffect, useState } from 'react';
import type { BrowserProvider, JsonRpcSigner } from 'ethers';
import {
  createBrowserProvider,
  hasInjectedWallet,
  mapWalletError,
  resolveInjectedProvider,
  type EthereumProvider,
} from '../services/blockchain/wallet';

export type UseWalletState = {
  connect: () => Promise<string>;
  disconnect: () => void;
  walletAddress: string;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  walletInstalled: boolean;
  error: string | null;
  clearError: () => void;
};

/**
 * Reusable wallet hook — MetaMask / injected providers.
 * Extends legacy connectQuantaraWallet behavior without removing it.
 */
export function useWallet(): UseWalletState {
  const [walletAddress, setWalletAddress] = useState('');
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletInstalled, setWalletInstalled] = useState(false);

  useEffect(() => {
    setWalletInstalled(hasInjectedWallet());
  }, []);

  const disconnect = useCallback(() => {
    setWalletAddress('');
    setProvider(null);
    setSigner(null);
    setChainId(null);
    window.is_connected = false;
    window.setQuantaraWalletConnected?.(false);
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const result = await createBrowserProvider();
      setProvider(result.provider);
      setSigner(result.signer);
      setWalletAddress(result.address);
      setChainId(result.chainId);
      setWalletInstalled(true);
      return result.address;
    } catch (err) {
      const message = mapWalletError(err);
      setError(message);
      throw Object.assign(new Error(message), { cause: err });
    } finally {
      setIsConnecting(false);
    }
  }, []);

  useEffect(() => {
    const injected = resolveInjectedProvider();
    if (!injected?.on) return;

    const onAccounts = (...args: unknown[]) => {
      const accounts = (args[0] as string[]) || [];
      if (!accounts.length) {
        disconnect();
        return;
      }
      setWalletAddress(accounts[0]);
    };

    const onChain = (...args: unknown[]) => {
      const hex = String(args[0] ?? '');
      setChainId(hex ? Number.parseInt(hex, 16) : null);
    };

    const onDisconnect = () => disconnect();

    injected.on('accountsChanged', onAccounts);
    injected.on('chainChanged', onChain);
    injected.on('disconnect', onDisconnect);

    return () => {
      injected.removeListener?.('accountsChanged', onAccounts);
      injected.removeListener?.('chainChanged', onChain);
      injected.removeListener?.('disconnect', onDisconnect);
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    walletAddress,
    provider,
    signer,
    chainId,
    isConnected: Boolean(walletAddress),
    isConnecting,
    walletInstalled,
    error,
    clearError: () => setError(null),
  };
}
