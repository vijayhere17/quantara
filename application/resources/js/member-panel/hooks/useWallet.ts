import { useCallback, useEffect, useRef, useState } from 'react';
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
import { clearBlockchainConfigCache, loadBlockchainConfig } from '../services/blockchain/config';

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

  /** Ignore stale balance responses after account/chain switches. */
  const balanceRequestId = useRef(0);

  useEffect(() => {
    setWalletInstalled(hasInjectedWallet());
    void loadBlockchainConfig()
      .then((cfg) => setExpectedChainId(cfg.chainId))
      .catch(() => setExpectedChainId(null));
  }, []);

  const loadBalancesFor = useCallback(
    async (nextProvider: BrowserProvider, address: string) => {
      const requestId = ++balanceRequestId.current;
      try {
        const next = await getWalletBalances(nextProvider, address);
        if (requestId !== balanceRequestId.current) return;
        setBalances(next);
      } catch {
        if (requestId !== balanceRequestId.current) return;
        // Keep prior balances if a refresh fails — never wipe a good ETH read
        // because a later token call threw.
      }
    },
    [],
  );

  const refreshBalances = useCallback(async () => {
    if (!provider || !walletAddress) {
      // Do not clear balances here — avoids racing disconnect/reconnect frames.
      return;
    }
    await loadBalancesFor(provider, walletAddress);
  }, [loadBalancesFor, provider, walletAddress]);

  const disconnect = useCallback(() => {
    balanceRequestId.current += 1;
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
      await loadBalancesFor(result.provider, result.address);
      return result.address;
    } catch (err) {
      const message = mapWalletError(err);
      setError(message);
      throw Object.assign(new Error(message), { cause: err });
    } finally {
      setIsConnecting(false);
    }
  }, [applySession, loadBalancesFor]);

  // Silent reconnect on mount
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const session = await tryReconnectBrowserProvider();
        if (cancelled || !session) return;
        applySession(session);
        await loadBalancesFor(session.provider, session.address);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applySession, loadBalancesFor]);

  // Keep balances in sync when provider/address settle after applySession.
  useEffect(() => {
    if (!provider || !walletAddress) return;
    void loadBalancesFor(provider, walletAddress);
  }, [loadBalancesFor, provider, walletAddress]);

  useEffect(() => {
    const injected = resolveInjectedProvider();
    if (!injected?.on) return;

    const onAccounts = (...args: unknown[]) => {
      const accounts = (args[0] as string[]) || [];
      if (!accounts.length) {
        disconnect();
        return;
      }

      // Show the new address immediately, then rebuild session + balances.
      setWalletAddress(accounts[0]);
      setBalances(null);

      void (async () => {
        try {
          const session = await createBrowserProvider();
          applySession(session);
          await loadBalancesFor(session.provider, session.address);
        } catch {
          // Address is already updated; clear signer so txs cannot use a stale account.
          setSigner(null);
        }
      })();
    };

    const onChain = (...args: unknown[]) => {
      const hex = String(args[0] ?? '');
      setChainId(hex ? Number.parseInt(hex, 16) : null);
      clearBlockchainConfigCache();
      setBalances(null);

      void (async () => {
        try {
          const session = await tryReconnectBrowserProvider();
          if (!session) return;
          applySession(session);
          await loadBalancesFor(session.provider, session.address);
        } catch {
          /* ignore */
        }
      })();
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
  }, [applySession, disconnect, loadBalancesFor]);

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
