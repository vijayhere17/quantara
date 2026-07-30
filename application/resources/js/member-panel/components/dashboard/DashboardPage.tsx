import {
  Award,
  ChevronRight,
  CircleDollarSign,
  Crown,
  Gift,
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
import {
  filterPlanIncomes,
  formatIncomeAmount,
  type PlanIncomeType,
} from '../../lib/planIncomes';
import { PageContainer } from '../ui/PageContainer';
import { CapWarningBanner } from './CapWarningBanner';
import { DashboardStatCard, type StatCardVariant } from './DashboardStatCard';
import { SemiCircleMeter } from './SemiCircleMeter';

type DashboardPageProps = {
  data: DashboardBoot;
};

type IncomeMeta = {
  short: string;
  icon: LucideIcon;
  variant: StatCardVariant;
};

const incomeMeta: Record<PlanIncomeType, IncomeMeta> = {
  'ROI Reward': { short: 'Self ROI', icon: TrendingUp, variant: 'cyan' },
  'Contribution Reward': { short: 'Direct Reward', icon: HandCoins, variant: 'emerald' },
  'Booster Reward': { short: 'Booster', icon: Zap, variant: 'purple' },
  'Rank Reward': { short: 'Rank Income', icon: Crown, variant: 'amber' },
  'Same Rank Reward': { short: 'Tier Booster', icon: Users, variant: 'purple' },
  'Community Builder': { short: 'Community', icon: Sparkles, variant: 'cyan' },
};

export function DashboardPage({ data }: DashboardPageProps) {
  const walletAddress = data.user.obscuredAddress || data.user.username;
  const rankLabel =
    data.rank.current && data.rank.current !== 'Q0' ? data.rank.current : 'Not Ranked';
  const planIncomes = filterPlanIncomes(data.rewards);

  return (
    <PageContainer className="gap-3.5 sm:gap-4" maxWidth="narrow">
      <CapWarningBanner
        show={data.capWarning?.show ?? false}
        threshold={data.capWarning?.threshold ?? 80}
        upgradeHref={data.links.investNow}
        walletKey={data.user.username || 'member'}
      />

      {/* Wallet identity */}
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

      {/* My Wallet */}
      <section className="q-wallet-card relative overflow-hidden rounded-2xl p-4 sm:p-5">
        <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-q-cyan/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-purple-500/20 blur-3xl" aria-hidden />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-q-cyan" />
              <span className="text-xs font-semibold uppercase tracking-wider text-q-cyan">My Wallet</span>
            </div>
            <p className="mt-2 truncate font-mono text-lg font-bold tracking-tight text-white sm:text-xl">
              {walletAddress}
            </p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-q-cyan">
            <Wallet className="h-5 w-5" />
          </span>
        </div>
      </section>

      {/* Total Income + My Rank */}
      <section className="grid grid-cols-2 gap-3">
        <DashboardStatCard
          variant="emerald"
          icon={CircleDollarSign}
          label="Total Income"
          value={
            <span className="tabular-nums">{formatIncomeAmount(data.income.total)}</span>
          }
          footer={
            <p className="text-[11px] text-q-muted">
              Today{' '}
              <span className="font-semibold text-emerald-400">
                +{formatIncomeAmount(data.income.today)}
              </span>
            </p>
          }
        />

        <DashboardStatCard
          variant="amber"
          icon={Award}
          label="My Rank"
          value={rankLabel}
          footer={
            data.rank.next ? (
              <p className="text-[11px] text-q-muted">
                Next:{' '}
                <span className="font-semibold text-amber-300">{data.rank.next}</span>
              </p>
            ) : null
          }
        />
      </section>

      {/* Current + Last Package */}
      <section className="grid grid-cols-2 gap-3">
        <DashboardStatCard
          variant="cyan"
          icon={Gift}
          label="Current Package"
          href={data.links.investNow}
          headerRight={
            <ChevronRight className="h-4 w-4 text-q-muted" />
          }
          value={data.packagePair?.current?.label ?? '—'}
          footer={
            <>
              {data.packagePair?.current?.amount ? (
                <p className="text-xs font-semibold text-q-cyan tabular-nums">
                  ${data.packagePair.current.amount}
                </p>
              ) : null}
              <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Active
              </p>
            </>
          }
        />

        <DashboardStatCard
          variant="purple"
          icon={Layers}
          label="Last Package"
          headerRight={<ChevronRight className="h-4 w-4 text-q-muted" />}
          value={data.packagePair?.previous?.label ?? '—'}
          footer={
            data.packagePair?.previous?.amount ? (
              <p className="text-xs text-q-soft tabular-nums">${data.packagePair.previous.amount}</p>
            ) : (
              <p className="text-[11px] text-q-muted">No previous cycle</p>
            )
          }
        />
      </section>

      {/* Income overview — plan incomes only */}
      <section>
        <h2 className="mb-2.5 px-0.5 text-sm font-semibold text-white">Income Overview</h2>
        <div className="grid grid-cols-2 gap-3">
          {planIncomes.map((reward) => {
            const label = reward.label as PlanIncomeType;
            const meta = incomeMeta[label];
            const Icon = meta.icon;
            return (
              <div
                key={reward.label}
                className={`q-stat-card q-stat-card--${meta.variant} flex items-center gap-3 p-3.5`}
              >
                <span className={`q-stat-icon q-stat-icon--${meta.variant}`}>
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-q-muted">
                    {meta.short}
                  </p>
                  <p className="truncate text-base font-bold tabular-nums text-white">
                    {formatIncomeAmount(reward.value)}
                  </p>
                </div>
                <span className="q-stat-flare" aria-hidden />
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
