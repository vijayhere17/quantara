import {
  Award,
  ChevronRight,
  CircleDollarSign,
  Crown,
  HandCoins,
  Layers,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DashboardBoot } from '../../types';
import { PageContainer } from '../ui/PageContainer';
import { CapWarningBanner } from './CapWarningBanner';
import { SemiCircleMeter } from './SemiCircleMeter';

type DashboardPageProps = {
  data: DashboardBoot;
};

function formatReward(value: string | number) {
  const n = Number(String(value).replace(/,/g, ''));
  if (Number.isFinite(n)) {
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(value);
}

type IncomeMeta = {
  short: string;
  icon: LucideIcon;
  gradient: string;
};

const incomeMeta: Record<string, IncomeMeta> = {
  'ROI Reward': {
    short: 'ROI',
    icon: TrendingUp,
    gradient: 'from-sky-500/30 to-blue-600/20 text-sky-300',
  },
  'Contribution Reward': {
    short: 'Direct',
    icon: HandCoins,
    gradient: 'from-emerald-500/30 to-teal-600/20 text-emerald-300',
  },
  'Booster Reward': {
    short: 'Booster',
    icon: Zap,
    gradient: 'from-violet-500/30 to-purple-600/20 text-violet-300',
  },
  'Rank Reward': {
    short: 'Rank',
    icon: Crown,
    gradient: 'from-amber-500/30 to-orange-600/20 text-amber-300',
  },
  'Same Rank Reward': {
    short: 'Matching',
    icon: Users,
    gradient: 'from-pink-500/30 to-rose-600/20 text-pink-300',
  },
  'Community Builder': {
    short: 'Community',
    icon: Sparkles,
    gradient: 'from-cyan-500/30 to-q-cyan/20 text-q-cyan',
  },
};

export function DashboardPage({ data }: DashboardPageProps) {
  const walletAddress = data.user.obscuredAddress || data.user.username;
  const rankLabel =
    data.rank.current && data.rank.current !== 'Q0' ? data.rank.current : 'Not Ranked';

  return (
    <PageContainer className="gap-3.5 sm:gap-4" maxWidth="narrow">
      <CapWarningBanner
        show={data.capWarning?.show ?? false}
        threshold={data.capWarning?.threshold ?? 80}
        upgradeHref={data.links.investNow}
        walletKey={data.user.username || 'member'}
      />

      {/* Wallet identity strip */}
      <section className="flex items-center gap-3 px-0.5">
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-q-gradient-br p-[2px] shadow-glow-cyan">
          <span className="flex h-full w-full items-center justify-center rounded-full bg-[#12182a] text-sm font-bold text-q-cyan">
            Q
          </span>
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0a0b14] bg-emerald-400" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-q-muted">Wallet ID</p>
          <p className="truncate font-mono text-sm font-semibold text-white">{walletAddress}</p>
        </div>
      </section>

      {/* My Wallet — address only, no balance */}
      <section className="q-wallet-card relative overflow-hidden rounded-2xl p-4 sm:p-5">
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-q-cyan/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-purple-500/20 blur-3xl"
          aria-hidden
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-q-cyan" />
              <span className="text-xs font-semibold uppercase tracking-wider text-q-cyan">
                My Wallet
              </span>
            </div>
            <p className="mt-2 truncate font-mono text-lg font-bold tracking-tight text-white sm:text-xl">
              {walletAddress}
            </p>
            <p className="mt-1 text-[11px] text-q-soft/80">Connected BSC wallet address</p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-q-cyan">
            <Wallet className="h-5 w-5" />
          </span>
        </div>
      </section>

      {/* Total Income + Rank */}
      <section className="grid grid-cols-2 gap-3">
        <div className="q-dash-card p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-600/15 text-emerald-300">
            <CircleDollarSign className="h-4 w-4" />
          </div>
          <p className="text-[11px] font-medium text-q-muted">Total Income</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-white">{data.income.total}</p>
          <p className="mt-0.5 text-[10px] text-q-muted">Today +{data.income.today}</p>
        </div>

        <div className="q-dash-card p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/25 to-orange-600/15 text-amber-300">
            <Award className="h-4 w-4" />
          </div>
          <p className="text-[11px] font-medium text-q-muted">My Rank</p>
          <p className="mt-1 text-lg font-bold text-white">{rankLabel}</p>
          {data.rank.next ? (
            <p className="mt-0.5 text-[10px] text-q-muted">Next: {data.rank.next}</p>
          ) : null}
        </div>
      </section>

      {/* Packages */}
      <section className="grid grid-cols-2 gap-3">
        <a href={data.links.investNow} className="q-dash-card group block p-4 transition-colors hover:border-q-cyan/25">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-q-muted">
              Current Package
            </span>
            <ChevronRight className="h-4 w-4 text-q-muted transition-transform group-hover:translate-x-0.5 group-hover:text-q-cyan" />
          </div>
          <p className="text-sm font-semibold text-white">{data.packagePair?.current?.label ?? '—'}</p>
          {data.packagePair?.current?.amount ? (
            <p className="mt-0.5 text-xs font-medium text-q-cyan">${data.packagePair.current.amount}</p>
          ) : null}
          <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Active
          </p>
        </a>

        <div className="q-dash-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-q-muted">
              Last Package
            </span>
            <Layers className="h-4 w-4 text-q-muted" />
          </div>
          <p className="text-sm font-semibold text-white">
            {data.packagePair?.previous?.label ?? '—'}
          </p>
          {data.packagePair?.previous?.amount ? (
            <p className="mt-0.5 text-xs text-q-soft">${data.packagePair.previous.amount}</p>
          ) : (
            <p className="mt-0.5 text-xs text-q-muted">No previous cycle</p>
          )}
        </div>
      </section>

      {/* Income overview */}
      <section>
        <h2 className="mb-2.5 px-0.5 text-sm font-semibold text-white">Income Overview</h2>
        <div className="grid grid-cols-2 gap-3">
          {data.rewards.map((reward) => {
            const meta = incomeMeta[reward.label] ?? {
              short: reward.label,
              icon: CircleDollarSign,
              gradient: 'from-q-cyan/25 to-purple-500/15 text-q-cyan',
            };
            const Icon = meta.icon;
            return (
              <div key={reward.label} className="q-dash-card flex items-center gap-3 p-3.5">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${meta.gradient}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] text-q-muted">{meta.short}</p>
                  <p className="truncate text-base font-bold tabular-nums text-white">
                    {formatReward(reward.value)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Cap meters */}
      <section className="space-y-3">
        <SemiCircleMeter
          title="ROI Income (3X Cap)"
          multiplierLabel="3X"
          meter={data.roi}
          accent="green"
        />
        <SemiCircleMeter
          title="Working Income (4X Cap)"
          multiplierLabel="4X"
          meter={data.working ?? data.roi}
          accent="blue"
        />
      </section>

      <a
        href={data.links.wallet}
        className="q-dash-card flex items-center justify-between px-4 py-3.5 text-sm font-medium text-q-soft transition-colors hover:border-q-cyan/20 hover:text-white"
      >
        All Transaction History
        <ChevronRight className="h-4 w-4 text-q-muted" />
      </a>
    </PageContainer>
  );
}
