import { useState } from 'react';
import { Network } from 'lucide-react';
import type { UseWalletState } from '../../hooks/useWallet';
import { ensureCorrectChain, resolveInjectedProvider } from '../../services/blockchain/wallet';
import { loadBlockchainConfig } from '../../services/blockchain/config';

function fmt(value: string, maxFrac = 6): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (n === 0) return '0';
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

type NetworkWalletStatusProps = {
  wallet: UseWalletState;
};

/**
 * Live network + BNB + BEP-20 balances from the connected wallet session.
 */
export function NetworkWalletStatus({ wallet }: NetworkWalletStatusProps) {
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const expected = wallet.expectedChainId;
  const mismatch =
    expected != null && wallet.chainId != null && expected !== wallet.chainId;

  const onSwitch = async () => {
    setSwitchError(null);
    setSwitching(true);
    try {
      const injected = resolveInjectedProvider();
      if (!injected) throw new Error('Wallet not found');
      const cfg = await loadBlockchainConfig();
      await ensureCorrectChain(injected, cfg.chainId);
      await wallet.refreshBalances();
    } catch (err) {
      setSwitchError(err instanceof Error ? err.message : 'Network switch failed');
    } finally {
      setSwitching(false);
    }
  };

  if (!wallet.walletInstalled) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-q-muted">
        Install MetaMask, Trust Wallet, or open this app in a WalletConnect-compatible browser.
      </div>
    );
  }

  if (!wallet.isConnected) {
    return null;
  }

  const nativeSymbol =
    wallet.chainId === 97 ? 'tBNB' : wallet.chainId === 31337 ? 'ETH' : 'BNB';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
        <Network className="h-4 w-4 text-q-cyan" />
        Connected Network
        <span className="font-mono text-xs text-q-muted">{wallet.networkName}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="text-xs text-q-muted">
          {nativeSymbol} Balance
          <div className="font-mono text-sm text-white">
            {wallet.balances ? fmt(wallet.balances.nativeFormatted) : '—'}
          </div>
        </div>
        <div className="text-xs text-q-muted">
          {wallet.balances?.tokenSymbol || 'BEP20'} Balance
          <div className="font-mono text-sm text-white">
            {wallet.balances ? fmt(wallet.balances.tokenFormatted) : '—'}
          </div>
        </div>
      </div>
      {mismatch ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-amber-300">Wrong network. Switch to continue.</p>
          <button
            type="button"
            onClick={() => void onSwitch()}
            disabled={switching}
            className="rounded-lg bg-q-cyan/20 px-3 py-1.5 text-xs font-medium text-q-cyan hover:bg-q-cyan/30 disabled:opacity-60"
          >
            {switching ? 'Switching…' : 'Switch network'}
          </button>
        </div>
      ) : null}
      {switchError ? <p className="mt-2 text-xs text-red-300">{switchError}</p> : null}
    </div>
  );
}
