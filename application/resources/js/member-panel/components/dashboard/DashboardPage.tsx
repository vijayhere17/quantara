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
import {
  formatEcologyRank,
  nextEcologyRank,
} from '../../lib/ecologyRanks';
import {
  filterPlanIncomes,
  formatDashboardCurrency,
  incomeSharePercent,
  type PlanIncomeType,
} from '../../lib/planIncomes';
import { PageContainer } from '../ui/PageContainer';
import { CapWarningBanner } from './CapWarningBanner';
import { DashboardStatCard, type StatCardVariant } from './DashboardStatCard';
import { IncomeOverviewCard } from './IncomeOverviewCard';
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
  const rankLabel = formatEcologyRank(data.rank.current);
  const nextRankLabel = data.rank.next
    ? formatEcologyRank(data.rank.next)
    : nextEcologyRank(data.rank.current);
  const planIncomes = filterPlanIncomes(data.rewards);

  return (
    <PageContainer className="gap-3.5 sm:gap-4" maxWidth="narrow">
      <CapWarningBanner
        show={data.capWarning?.show ?? false}
        threshold={data.capWarning?.threshold ?? 80}
        upgradeHref={data.links.investNow}
        walletKey={data.user.username || 'member'}
      />

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
            <span className="tabular-nums">{formatDashboardCurrency(data.income.total)}</span>
          }
          footer={
            <p className="text-[11px] text-q-muted">
              Today{' '}
              <span className="font-semibold text-emerald-400">
                +{formatDashboardCurrency(data.income.today)}
              </span>
            </p>
          }
        />

        <DashboardStatCard
          variant="amber"
          icon={Award}
          label="My Rank"
          value={
            <span className="text-base sm:text-lg">{rankLabel}</span>
          }
          footer={
            nextRankLabel && rankLabel !== 'Genesis' ? (
              <p className="text-[11px] text-q-muted">
                Next:{' '}
                <span className="font-semibold text-amber-300">{nextRankLabel}</span>
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
          value={
            <span className="line-clamp-2 text-base leading-snug sm:text-lg">
              {data.packagePair?.current?.label ?? '—'}
            </span>
          }
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
          {planIncomes.map((reward, index) => {
            const label = reward.label as PlanIncomeType;
            const meta = incomeMeta[label];
            return (
              <IncomeOverviewCard
                key={reward.label}
                label={meta.short}
                value={reward.value}
                sharePct={incomeSharePercent(reward.value, data.income.total)}
                icon={meta.icon}
                variant={meta.variant}
                animationDelay={index * 70}
              />
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
