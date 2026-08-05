import {
  Award,
  ChevronRight,
  Coins,
  Copy,
  Crown,
  DollarSign,
  Gift,
  Layers,
  LineChart,
  Link2,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { DashboardBoot, RewardItem } from '../../types';
import { PageContainer } from '../ui/PageContainer';
import { getQuantaraLogoSrc } from '../ui/Logo';

type DashboardPageProps = {
  data: DashboardBoot;
};

function money(value: string | number | null | undefined, fallback = '$0.0000') {
  if (value === null || value === undefined || value === '') return fallback;
  const raw = String(value).trim();
  if (raw.startsWith('$')) return raw;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return `$${raw}`;
  return raw;
}

function findReward(rewards: RewardItem[], ...needles: string[]) {
  const hit = rewards.find((r) =>
    needles.some((n) => r.label.toLowerCase().includes(n.toLowerCase())),
  );
  return money(hit?.value ?? '0.0000');
}

function parseAmount(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Ecology Tier ladder (matches on-chain RankReward). */
const ECOLOGY_RANKS = [
  'Seed',
  'Sprout',
  'Sapling',
  'Canopy',
  'Forest',
  'Biome',
  'Ecosphere',
  'Genesis',
] as const;

function formatEcologyRank(raw: string | null | undefined): string {
  if (!raw || raw === 'Q0' || raw === 'None') return 'Not Ranked';
  const hit = ECOLOGY_RANKS.find((n) => n.toLowerCase() === raw.toLowerCase());
  if (hit) return hit;
  // Legacy MLM labels → ecology
  const legacy: Record<string, (typeof ECOLOGY_RANKS)[number]> = {
    'sales manager': 'Seed',
    'sales director': 'Sprout',
  };
  const key = raw.toLowerCase();
  for (const [needle, mapped] of Object.entries(legacy)) {
    if (key.includes(needle)) return mapped;
  }
  return raw;
}

function nextEcologyRank(current: string): string {
  if (current === 'Not Ranked') return 'Seed';
  const idx = ECOLOGY_RANKS.findIndex((n) => n === current);
  if (idx < 0) return 'Seed';
  return ECOLOGY_RANKS[Math.min(idx + 1, ECOLOGY_RANKS.length - 1)] ?? 'Genesis';
}

export function DashboardPage({ data }: DashboardPageProps) {
  const [referralCopied, setReferralCopied] = useState(false);

  const walletAddress = data.user.obscuredAddress || data.user.username || '—';
  const referralDisplay = data.referral?.displayUrl || data.referral?.copyUrl || '—';
  const referralCopy = data.referral?.copyUrl || data.referral?.displayUrl || '';

  const rankLabel = formatEcologyRank(data.rank.current);
  const nextRank = formatEcologyRank(data.rank.next) !== 'Not Ranked'
    ? formatEcologyRank(data.rank.next)
    : nextEcologyRank(rankLabel);

  const hasPackage = Boolean(data.user.packageAmount) || Boolean(data.user.packageName);
  const packageAmount = money(data.user.packageAmount ?? null, hasPackage ? '$50' : '—');
  const packageActive =
    data.registration?.status?.toLowerCase() === 'active' ||
    data.registration?.walletStatus?.toLowerCase() === 'active' ||
    hasPackage;

  const incomeTiles = useMemo(
    () => [
      {
        key: 'roi',
        label: 'Self ROI',
        value: findReward(data.rewards, 'ROI', 'Self'),
        icon: LineChart,
        accent: '#3B82F6',
        glow: 'rgba(59,130,246,0.35)',
      },
      {
        key: 'direct',
        label: 'Direct Reward',
        value: findReward(data.rewards, 'Contribution', 'Direct'),
        icon: Coins,
        accent: '#22C55E',
        glow: 'rgba(34,197,94,0.35)',
      },
      {
        key: 'booster',
        label: 'Booster',
        value: findReward(data.rewards, 'Booster'),
        icon: Zap,
        accent: '#A855F7',
        glow: 'rgba(168,85,247,0.35)',
      },
      {
        key: 'rank',
        label: 'Rank Income',
        value: findReward(data.rewards, 'Rank Reward', 'Rank Income'),
        icon: Crown,
        accent: '#EAB308',
        glow: 'rgba(234,179,8,0.35)',
      },
      {
        key: 'tier',
        label: 'Tier Booster',
        value: findReward(data.rewards, 'Same Rank', 'Tier'),
        icon: Users,
        accent: '#C084FC',
        glow: 'rgba(192,132,252,0.35)',
      },
      {
        key: 'community',
        label: 'Community',
        value: findReward(data.rewards, 'Community'),
        icon: Sparkles,
        accent: '#2DD4BF',
        glow: 'rgba(45,212,191,0.35)',
      },
    ],
    [data.rewards],
  );

  const pkgUsd = parseAmount(data.user.packageAmount) || (hasPackage ? 50 : 0);
  const roiEarned = parseAmount(data.roi.earned);
  const roiCap = pkgUsd > 0 ? pkgUsd * 3 : parseAmount(data.roi.earned) + parseAmount(data.roi.remaining);
  const roiProgress = data.roi.progress || (roiCap > 0 ? Math.min(100, (roiEarned / roiCap) * 100) : 0);
  const roiRemaining = parseAmount(data.roi.remaining) || Math.max(0, roiCap - roiEarned);

  const workingEarned =
    parseAmount(findReward(data.rewards, 'Contribution')) +
    parseAmount(findReward(data.rewards, 'Booster')) +
    parseAmount(findReward(data.rewards, 'Rank Reward')) +
    parseAmount(findReward(data.rewards, 'Same Rank')) +
    parseAmount(findReward(data.rewards, 'Community'));
  const workingCap = pkgUsd > 0 ? pkgUsd * 4 : 0;
  const workingProgress = workingCap > 0 ? Math.min(100, (workingEarned / workingCap) * 100) : 0;
  const workingRemaining = Math.max(0, workingCap - workingEarned);

  const copyReferral = async () => {
    if (!referralCopy) return;
    try {
      await navigator.clipboard.writeText(referralCopy);
      setReferralCopied(true);
      window.setTimeout(() => setReferralCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <PageContainer className="!gap-4 sm:!gap-5" maxWidth="narrow">
      {/* My Wallet — display only + floating Quantara mark */}
      <section className="dash-card relative flex items-center gap-3 overflow-hidden px-4 py-4 sm:px-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00B5FF]/15 text-[#38D9FF]">
          <Wallet className="h-5 w-5" />
        </div>
        <div className="relative z-10 min-w-0 flex-1 pr-16 sm:pr-20">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#38D9FF]">My Wallet</p>
          <p className="mt-0.5 truncate font-mono text-sm font-semibold tracking-tight text-white sm:text-base">
            {walletAddress}
          </p>
        </div>
        <img
          src={getQuantaraLogoSrc()}
          alt=""
          aria-hidden
          className="q-logo-float pointer-events-none absolute -bottom-1 -right-1 z-[1] h-[72px] w-[72px] select-none object-contain opacity-90 drop-shadow-[0_8px_20px_rgba(0,181,255,0.25)] sm:-bottom-2 sm:-right-2 sm:h-[88px] sm:w-[88px]"
          loading="eager"
          decoding="async"
        />
      </section>

      {/* Referral Link + copy */}
      <section className="dash-card flex items-center gap-3 px-4 py-4 sm:px-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00B5FF]/15 text-[#38D9FF]">
          <Link2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#38D9FF]">
            Referral Link
          </p>
          <p className="mt-0.5 truncate font-mono text-sm font-semibold tracking-tight text-white sm:text-base">
            {referralDisplay}
          </p>
          {referralCopied ? (
            <p className="mt-1 text-xs font-semibold text-emerald-400">Copied!</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void copyReferral()}
          className={[
            'flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-[#38D9FF] transition hover:bg-[#00B5FF]/10',
            referralCopied
              ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300'
              : 'border-[#00B5FF]/35',
          ].join(' ')}
          aria-label="Copy referral link"
        >
          <Copy className="h-4 w-4" />
          <span className="text-xs font-bold">{referralCopied ? 'Copied' : 'Copy'}</span>
        </button>
      </section>

      {/* Stats — 4 equal tiles */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 [grid-auto-rows:1fr]">
        <StatHero
          icon={<DollarSign className="h-5 w-5" />}
          iconClass="bg-emerald-500/15 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
          label="Total Income"
          value={money(data.income.total)}
          sub={`Today +${money(data.income.today).replace(/^\$/, '')}`}
          subClass="text-emerald-400"
        />
        <StatHero
          icon={<Award className="h-5 w-5" />}
          iconClass="bg-amber-400/15 text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.25)]"
          label="My Rank"
          value={rankLabel}
          sub={`Next: ${nextRank}`}
          subClass="text-amber-300/90"
        />
        <a
          href={data.links.investNow}
          className="dash-card group relative flex h-full min-h-[148px] flex-col px-4 py-4 sm:min-h-[160px] sm:px-5"
        >
          <ChevronRight className="absolute right-3 top-3 h-4 w-4 text-white/30 transition group-hover:text-white/70" />
          <IconBubble className="bg-[#00B5FF]/15 text-[#38D9FF]">
            <Gift className="h-5 w-5" />
          </IconBubble>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B9BB4]">
            Current Package
          </p>
          <p className="mt-1 text-xl font-bold tracking-tight text-[#38D9FF] sm:text-2xl">
            {packageAmount}
          </p>
          <span
            className={[
              'mt-auto inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
              packageActive
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-white/5 text-[#8B9BB4]',
            ].join(' ')}
          >
            <span
              className={[
                'h-1.5 w-1.5 rounded-full',
                packageActive ? 'bg-emerald-400' : 'bg-[#8B9BB4]',
              ].join(' ')}
            />
            {packageActive ? 'Active' : 'Inactive'}
          </span>
        </a>

        <a
          href={data.links.myInvestments}
          className="dash-card group relative flex h-full min-h-[148px] flex-col px-4 py-4 sm:min-h-[160px] sm:px-5"
        >
          <ChevronRight className="absolute right-3 top-3 h-4 w-4 text-white/30 transition group-hover:text-white/70" />
          <IconBubble className="bg-violet-500/15 text-violet-300">
            <Layers className="h-5 w-5" />
          </IconBubble>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B9BB4]">
            Last Package
          </p>
          <p className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">—</p>
          <p className="mt-auto text-xs text-[#8B9BB4]">No previous cycle</p>
        </a>
      </div>

      {/* Income Overview */}
      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight text-white">Income Overview</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {incomeTiles.map((tile) => (
            <div key={tile.key} className="dash-card relative overflow-hidden px-3.5 py-3.5 sm:px-4 sm:py-4">
              <IconBubble
                className="mb-2.5"
                style={{
                  background: `${tile.accent}22`,
                  color: tile.accent,
                  boxShadow: `0 0 18px ${tile.glow}`,
                }}
              >
                <tile.icon className="h-4 w-4" />
              </IconBubble>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B9BB4]">
                {tile.label}
              </p>
              <p className="mt-1 text-base font-semibold text-white sm:text-lg">{tile.value}</p>
              <div
                className="absolute inset-x-0 bottom-0 h-[3px]"
                style={{
                  background: `linear-gradient(90deg, ${tile.accent}, transparent)`,
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Caps */}
      <CapCard
        title="ROI Income (3X Cap)"
        ofLabel="3X"
        progress={roiProgress}
        earned={money(data.roi.earned)}
        cap={money(roiCap.toFixed(4))}
        remaining={money(roiRemaining.toFixed(4))}
        accent="#38D9FF"
      />
      <CapCard
        title="Working Income (4X Cap)"
        ofLabel="4X"
        progress={workingProgress}
        earned={money(workingEarned.toFixed(4))}
        cap={money(workingCap.toFixed(4))}
        remaining={money(workingRemaining.toFixed(4))}
        accent="#2DD4BF"
      />

      {/* History */}
      <a
        href={data.links.wallet}
        className="dash-card flex items-center justify-between px-4 py-4 transition hover:border-white/20 sm:px-5"
      >
        <span className="text-sm font-semibold text-white">All Transaction History</span>
        <ChevronRight className="h-4 w-4 text-white/40" />
      </a>
    </PageContainer>
  );
}

function IconBubble({
  children,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

function StatHero({
  icon,
  iconClass,
  label,
  value,
  sub,
  subClass,
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  value: string;
  sub: string;
  subClass: string;
}) {
  return (
    <div className="dash-card flex h-full min-h-[148px] flex-col px-4 py-4 sm:min-h-[160px] sm:px-5">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full ${iconClass}`}>
        {icon}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B9BB4]">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">{value}</p>
      <p className={`mt-auto pt-2 text-xs font-medium ${subClass}`}>{sub}</p>
    </div>
  );
}

function CapCard({
  title,
  ofLabel,
  progress,
  earned,
  cap,
  remaining,
  accent,
}: {
  title: string;
  ofLabel: string;
  progress: number;
  earned: string;
  cap: string;
  remaining: string;
  accent: string;
}) {
  const pct = Math.max(0, Math.min(100, progress));
  const mult = (pct / 100) * (ofLabel === '3X' ? 3 : 4);

  return (
    <section className="dash-card px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="mx-auto shrink-0 sm:mx-0">
          <SemiGauge value={pct} accent={accent} center={`${mult.toFixed(2)} of ${ofLabel}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-white sm:text-base">{title}</h3>
            <span className="shrink-0 text-xs font-semibold text-[#8B9BB4]">
              Progress {pct.toFixed(0)}%
            </span>
          </div>
          <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${accent}, ${accent}99)`,
              }}
            />
          </div>
          <p className="font-mono text-xs text-white/90 sm:text-sm">
            {earned.replace(/^\$/, '')} / {cap.replace(/^\$/, '')}
          </p>
          <p className="mt-1 text-xs text-[#8B9BB4]">Remaining: {remaining.replace(/^\$/, '')}</p>
        </div>
      </div>
    </section>
  );
}

function SemiGauge({
  value,
  accent,
  center,
}: {
  value: number;
  accent: string;
  center: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const angle = (pct / 100) * 180;

  return (
    <div className="relative h-[88px] w-[140px]">
      <div
        className="absolute inset-0 rounded-t-full"
        style={{
          background: `conic-gradient(from 180deg at 50% 100%, ${accent} 0deg ${angle}deg, rgba(255,255,255,0.08) ${angle}deg 180deg, transparent 180deg 360deg)`,
          maskImage: 'radial-gradient(farthest-side at 50% 100%, transparent calc(100% - 12px), #000 calc(100% - 11px))',
          WebkitMaskImage:
            'radial-gradient(farthest-side at 50% 100%, transparent calc(100% - 12px), #000 calc(100% - 11px))',
        }}
      />
      <div className="absolute inset-x-0 bottom-1 text-center">
        <p className="text-sm font-bold text-white">{center}</p>
      </div>
    </div>
  );
}
