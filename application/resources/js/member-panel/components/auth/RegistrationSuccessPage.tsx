import { Check, CheckCircle2, ChevronLeft, ChevronRight, Copy, Download, LayoutDashboard, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { GradientButton } from '../ui/GradientButton';
import { Logo } from '../ui/Logo';
import { SuccessCard } from '../ui/SuccessCard';
import type { AuthBoot, RegistrationSuccessPayload } from '../../types';

type RegistrationSuccessPageProps = {
  data: AuthBoot;
  details?: RegistrationSuccessPayload | null;
};

function DetailRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-q-muted">{label}</p>
        <p className="mt-1 break-all text-sm font-medium text-white">{value || '—'}</p>
      </div>
      {onCopy ? (
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-q-cyan/25 bg-q-cyan/10 px-2.5 text-[11px] font-semibold text-q-cyan transition hover:bg-q-cyan/20"
        >
          <Copy className="h-3 w-3" />
          Copy
        </button>
      ) : null}
    </div>
  );
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: `${(i * 37) % 100}%`,
        delay: `${(i % 10) * 0.12}s`,
        duration: `${2.4 + (i % 5) * 0.25}s`,
        color: ['#00d9ff', '#7c3aed', '#34d399', '#3b82f6', '#a78bfa'][i % 5],
        size: 4 + (i % 4),
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="q-confetti absolute top-[-12px] rounded-sm opacity-80"
          style={{
            left: p.left,
            width: p.size,
            height: p.size * 1.6,
            background: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

export function RegistrationSuccessPage({ data, details }: RegistrationSuccessPageProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [payload, setPayload] = useState<RegistrationSuccessPayload | null>(details ?? null);

  useEffect(() => {
    if (details) setPayload(details);
  }, [details]);

  useEffect(() => {
    const onSuccess = (event: Event) => {
      const custom = event as CustomEvent<RegistrationSuccessPayload>;
      setPayload(custom.detail ?? null);
    };
    window.addEventListener('quantara:registration-success', onSuccess);
    return () => window.removeEventListener('quantara:registration-success', onSuccess);
  }, []);

  const info: RegistrationSuccessPayload = {
    memberId: payload?.memberId || data.successDefaults?.memberId || '—',
    walletAddress: payload?.walletAddress || data.successDefaults?.walletAddress || '—',
    sponsorId: payload?.sponsorId || data.successDefaults?.sponsorId || '—',
    packageLabel: payload?.packageLabel || data.successDefaults?.packageLabel || '$50',
    transactionHash: payload?.transactionHash || data.successDefaults?.transactionHash || 'Pending',
    registrationDate: payload?.registrationDate || data.successDefaults?.registrationDate || new Date().toLocaleString(),
    network: payload?.network || data.successDefaults?.network || 'BNB Smart Chain',
  };

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const input = document.createElement('input');
      input.value = value;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1400);
  };

  return (
    <div className="relative">
      <Confetti />
      <div className="mb-6 flex justify-center">
        <Logo href={data.links.home} size="md" imgClassName="max-w-[180px]" />
      </div>

      <SuccessCard
        icon={
          <div className="relative flex h-20 w-20 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20" />
            <span className="relative flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/15 text-emerald-300 shadow-[0_0_40px_rgba(52,211,153,0.35)]">
              <CheckCircle2 className="h-10 w-10" />
            </span>
          </div>
        }
        title="Registration Successful"
        subtitle="Your Quantara membership is live on BNB Smart Chain."
        actions={
          <>
            <GradientButton
              type="button"
              className="!rounded-full !px-5 !py-3 !text-sm !font-bold !text-[#041018]"
              onClick={() => copy('member', info.memberId)}
            >
              {copied === 'member' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copy Member ID
            </GradientButton>
            <GradientButton
              type="button"
              className="!rounded-full !px-5 !py-3 !text-sm !font-bold !text-[#041018]"
              onClick={() => copy('wallet', info.walletAddress)}
            >
              {copied === 'wallet' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copy Wallet
            </GradientButton>
            <GradientButton
              type="button"
              className="!rounded-full !px-5 !py-3 !text-sm !font-bold !text-[#041018]"
              onClick={() => copy('txn', info.transactionHash)}
            >
              {copied === 'txn' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copy Transaction Hash
            </GradientButton>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:border-q-cyan/30 hover:bg-q-cyan/10"
              onClick={() => {
                // Placeholder — no backend receipt download.
              }}
            >
              <Download className="h-4 w-4" />
              Download Receipt
            </button>
            <GradientButton
              href={data.links.dashboard || data.links.signIn}
              className="!rounded-full !px-5 !py-3 !text-sm !font-bold !text-[#041018] sm:min-w-[200px]"
            >
              <LayoutDashboard className="h-4 w-4" />
              Go To Dashboard
            </GradientButton>
          </>
        }
      >
        <div className="rounded-2xl border border-white/[0.08] bg-[#0a0d16]/80 px-4 py-1">
          <DetailRow label="Member ID" value={info.memberId} onCopy={() => copy('member', info.memberId)} />
          <DetailRow
            label="Wallet Address"
            value={info.walletAddress}
            onCopy={() => copy('wallet', info.walletAddress)}
          />
          <DetailRow label="Sponsor ID" value={info.sponsorId} />
          <DetailRow label="Selected Package" value={info.packageLabel} />
          <DetailRow
            label="Transaction Hash"
            value={info.transactionHash}
            onCopy={() => copy('txn', info.transactionHash)}
          />
          <DetailRow label="Registration Date" value={info.registrationDate} />
          <DetailRow label="Network" value={info.network} />
        </div>

        <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-q-muted">
          <Sparkles className="h-3.5 w-3.5 text-q-cyan" />
          Login details will also be sent to your registered email when available.
        </p>

        {/* Bridge targets for legacy overlay scripts */}
        <div className="message comein sr-only" aria-hidden>
          <div className="check scaledown">✓</div>
          <p>Success</p>
          <button type="button" id="ok">
            OK
          </button>
        </div>
      </SuccessCard>

      <div className="mt-6 flex justify-center">
        <a
          href={data.links.signIn}
          className="inline-flex items-center gap-1 text-sm text-q-cyan transition hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Sign In
          <ChevronRight className="h-4 w-4 opacity-0" />
        </a>
      </div>
    </div>
  );
}
