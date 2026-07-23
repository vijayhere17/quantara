import { useCallback, useEffect, useState } from 'react';
import type { BrowserProvider, JsonRpcSigner } from 'ethers';
import {
  createBrowserProvider,
  hasInjectedWallet,
  mapWalletError,
  resolveInjectedProvider,
  tryReconnectBrowserProvider,
} from '../services/blockchain/wallet';
import { getWalletBalances, type WalletBalances } from '../services/blockchain/balances';
import { describeNetwork } from '../services/blockchain/explorer';
import { loadBlockchainConfig } from '../services/blockchain/config';

export type UseWalletState = {
  connect: () => Promise<string>;
  disconnect: () => void;
  walletAddress: string;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  chainId: number | null;
  networkName: string;
  expectedChainId: number | null;
  balances: WalletBalances | null;
  refreshBalances: () => Promise<void>;
  isConnected: boolean;
  isConnecting: boolean;
  walletInstalled: boolean;
  error: string | null;
  clearError: () => void;
};

/**
 * Reusable wallet hook — MetaMask / Trust / injected EIP-1193 providers.
 * Auto-reconnects when the origin was previously authorized.
 */
export function useWallet(): UseWalletState {
  const [walletAddress, setWalletAddress] = useState('');
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [expectedChainId, setExpectedChainId] = useState<number | null>(null);
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletInstalled, setWalletInstalled] = useState(false);

  useEffect(() => {
    setWalletInstalled(hasInjectedWallet());
    void loadBlockchainConfig()
      .then((cfg) => setExpectedChainId(cfg.chainId))
      .catch(() => setExpectedChainId(null));
  }, []);

  const refreshBalances = useCallback(async () => {
    if (!provider || !walletAddress) {
      setBalances(null);
      return;
    }
    try {
      const next = await getWalletBalances(provider, walletAddress);
      setBalances(next);
    } catch {
      setBalances(null);
    }
  }, [provider, walletAddress]);

  const disconnect = useCallback(() => {
    setWalletAddress('');
    setProvider(null);
    setSigner(null);
    setChainId(null);
    setBalances(null);
    window.is_connected = false;
    window.setQuantaraWalletConnected?.(false);
  }, []);

  const applySession = useCallback(
    (result: {
      provider: BrowserProvider;
      signer: JsonRpcSigner;
      address: string;
      chainId: number;
    }) => {
      setProvider(result.provider);
      setSigner(result.signer);
      setWalletAddress(result.address);
      setChainId(result.chainId);
      setWalletInstalled(true);
    },
    [],
  );

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const result = await createBrowserProvider();
      applySession(result);
      try {
        setBalances(await getWalletBalances(result.provider, result.address));
      } catch {
        setBalances(null);
      }
      return result.address;
    } catch (err) {
      const message = mapWalletError(err);
      setError(message);
      throw Object.assign(new Error(message), { cause: err });
    } finally {
      setIsConnecting(false);
    }
  }, [applySession]);

  // Silent reconnect on mount
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const session = await tryReconnectBrowserProvider();
        if (cancelled || !session) return;
        applySession(session);
        try {
          setBalances(await getWalletBalances(session.provider, session.address));
        } catch {
          /* ignore */
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  useEffect(() => {
    void refreshBalances();
  }, [refreshBalances]);

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
    networkName: describeNetwork(chainId),
    expectedChainId,
    balances,
    refreshBalances,
    isConnected: Boolean(walletAddress),
    isConnecting,
    walletInstalled,
    error,
    clearError: () => setError(null),
  };
}
