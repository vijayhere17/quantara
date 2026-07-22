import { Copy, Link2 } from 'lucide-react';
import { useState } from 'react';
import type { DashboardBoot } from '../../types';

type ReferralCardProps = {
  referral: DashboardBoot['referral'];
};

export function ReferralCard({ referral }: ReferralCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referral.copyUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      const input = document.createElement('input');
      input.value = referral.copyUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="relative flex min-h-[78px] w-full max-w-[420px] items-center gap-3 rounded-[18px] border border-[rgba(90,165,255,0.18)] bg-white/[0.05] p-3 backdrop-blur-md sm:gap-4 sm:p-3.5">
      <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-q-cyan/15 text-q-cyan">
        <Link2 className="h-[18px] w-[18px]" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-q-muted">
          Referral Link
        </p>
        <p className="truncate text-sm font-medium text-white">{referral.displayUrl}</p>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="flex h-[54px] w-[62px] shrink-0 items-center justify-center rounded-2xl bg-q-gradient-br text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q-cyan/50"
        aria-label="Copy referral link"
      >
        <Copy className="h-5 w-5" />
      </button>

      {copied && (
        <span className="absolute -bottom-8 right-0 rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white shadow-lg">
          Copied!
        </span>
      )}
    </div>
  );
}
