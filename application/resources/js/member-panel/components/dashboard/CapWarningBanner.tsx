import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type CapWarningBannerProps = {
  show: boolean;
  threshold: number;
  upgradeHref: string;
  walletKey: string;
};

export function CapWarningBanner({
  show,
  threshold,
  upgradeHref,
  walletKey,
}: CapWarningBannerProps) {
  const storageKey = `quantara-cap-banner-${walletKey}`;
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!show) {
      setDismissed(true);
      return;
    }
    try {
      setDismissed(sessionStorage.getItem(storageKey) === '1');
    } catch {
      setDismissed(false);
    }
  }, [show, storageKey]);

  if (!show || dismissed) return null;

  return (
    <div
      role="status"
      className="q-glass-card flex items-start gap-3 border-amber-400/25 bg-amber-500/[0.06] p-3.5 sm:p-4"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-300">
        <AlertTriangle className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-white">
          You are close to your earning cap ({threshold}% reached). Upgrade to the next package to
          continue maximizing your income.
        </p>
        <a
          href={upgradeHref}
          className="mt-2 inline-flex text-xs font-semibold text-q-cyan hover:underline"
        >
          Upgrade package →
        </a>
      </div>
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          try {
            sessionStorage.setItem(storageKey, '1');
          } catch {
            /* ignore */
          }
        }}
        className="shrink-0 rounded-lg p-1.5 text-q-muted transition-colors hover:bg-white/[0.06] hover:text-white"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
