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
      className="relative overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-r from-[#3a1528] via-[#2a1222] to-[#1f1018] p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)] sm:p-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/30">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 pr-8">
          <p className="text-sm font-medium leading-snug text-white">
            You are close to capping! Top up with the next package to maximize your income.
          </p>
          <p className="mt-1 text-[11px] text-rose-200/70">{threshold}% of earning cap reached</p>
          <a
            href={upgradeHref}
            className="mt-2.5 inline-flex rounded-full border border-rose-300/40 bg-rose-500/10 px-3.5 py-1.5 text-xs font-semibold text-rose-100 transition-colors hover:bg-rose-500/20"
          >
            Top Up Now
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
          className="absolute right-3 top-3 rounded-lg p-1 text-rose-200/60 transition-colors hover:bg-white/5 hover:text-white"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
