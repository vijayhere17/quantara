import { Droplets } from 'lucide-react';
import { useEffect, useState } from 'react';
import { claimDemoBTCB, isDemoFaucetEnabled } from '../../services/blockchain/faucet';
import { notifyError } from '../../lib/walletConnect';

type DemoFaucetButtonProps = {
  walletAddress?: string;
  onFunded?: (balance: string) => void;
};

/**
 * Local Hardhat-only faucet control. Hidden unless chainId === 31337.
 */
export function DemoFaucetButton({ walletAddress, onFunded }: DemoFaucetButtonProps) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastBalance, setLastBalance] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void isDemoFaucetEnabled().then((ok) => {
      if (!cancelled) setEnabled(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!enabled) return null;

  const handleClaim = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await claimDemoBTCB('1000');
      setLastBalance(result.balance);
      onFunded?.(result.balance);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Demo faucet failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300">
        Local demo faucet
      </p>
      <p className="mt-1 text-xs text-amber-100/80">
        Hardhat only — mint 1000 MockBTCB to{' '}
        <span className="font-mono">
          {walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : 'your wallet'}
        </span>
        . Not available in production.
      </p>
      <button
        type="button"
        onClick={() => void handleClaim()}
        disabled={busy}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300/30 bg-amber-400/20 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/30 disabled:opacity-60"
      >
        <Droplets className="h-4 w-4" />
        {busy ? 'Minting Demo BTCB…' : 'Get Demo BTCB'}
      </button>
      {lastBalance ? (
        <p className="mt-2 text-center font-mono text-xs text-emerald-300">
          Balance: {lastBalance} BTCB
        </p>
      ) : null}
    </div>
  );
}
