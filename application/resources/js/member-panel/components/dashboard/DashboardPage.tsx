import {
  Award,
  CircleUserRound,
  Layers,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { DashboardBoot } from '../../types';
import { PageContainer } from '../ui/PageContainer';
import { RankBadge } from '../ui/RankBadge';
import { CapWarningBanner } from './CapWarningBanner';
import { SemiCircleMeter } from './SemiCircleMeter';

type DashboardPageProps = {
  data: DashboardBoot;
};

function formatReward(value: string | number) {
  const n = Number(value);
  if (Number.isFinite(n)) return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return String(value);
}

const rewardShortLabels: Record<string, string> = {
  'ROI Reward': 'Self ROI',
  'Contribution Reward': 'Direct',
  'Booster Reward': 'Booster',
  'Rank Reward': 'Rank',
  'Same Rank Reward': 'Same Rank',
  'Community Builder': 'Community',
};

export function DashboardPage({ data }: DashboardPageProps) {
  const rankLabel =
    data.rank.current && data.rank.current !== 'Q0' ? data.rank.current : 'Not Ranked';
  const walletAddress = data.user.obscuredAddress || data.user.username;

  return (
    <PageContainer className="gap-3 sm:gap-4" maxWidth="narrow">
      <CapWarningBanner
        show={data.capWarning?.show ?? false}
        threshold={data.capWarning?.threshold ?? 80}
        upgradeHref={data.links.investNow}
        walletKey={data.user.username || 'member'}
      />

      {/* Wallet identity + balance */}
      <section className="q-glass-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-q-cyan">
              <CircleUserRound className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-semibold text-white">{walletAddress}</p>
              <p className="text-[11px] text-q-muted">Connected wallet</p>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <div className="flex items-center gap-2 text-q-muted">
            <Wallet className="h-4 w-4 text-q-cyan" />
            <span className="text-xs font-medium uppercase tracking-wide">My Wallet</span>
          </div>
          <p className="main_balance mt-1 text-3xl font-bold tabular-nums tracking-tight text-white sm:text-[2rem]">
            {data.wallet.earningWallet}
          </p>
          <p className="mt-0.5 text-xs text-q-muted">Available earning balance</p>
        </div>
      </section>

      {/* Packages + Rank + Total income */}
      <section className="grid grid-cols-2 gap-3">
        <div className="q-glass-card col-span-1 p-3.5 sm:p-4">
          <div className="mb-2 flex items-center gap-2 text-q-muted">
            <Layers className="h-3.5 w-3.5 text-q-cyan" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Current Package</span>
          </div>
          <p className="text-sm font-semibold text-white">{data.packagePair?.current?.label ?? '—'}</p>
          {data.packagePair?.current?.amount ? (
            <p className="mt-0.5 text-xs tabular-nums text-q-soft">{data.packagePair.current.amount}</p>
          ) : null}
        </div>

        <div className="q-glass-card col-span-1 p-3.5 sm:p-4">
          <div className="mb-2 flex items-center gap-2 text-q-muted">
            <Layers className="h-3.5 w-3.5 text-q-muted" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Previous Package</span>
          </div>
          <p className="text-sm font-semibold text-white">{data.packagePair?.previous?.label ?? '—'}</p>
          {data.packagePair?.previous?.amount ? (
            <p className="mt-0.5 text-xs tabular-nums text-q-soft">{data.packagePair.previous.amount}</p>
          ) : null}
        </div>

        <div className="q-glass-card col-span-1 p-3.5 sm:p-4">
          <div className="mb-2 flex items-center gap-2 text-q-muted">
            <Award className="h-3.5 w-3.5 text-q-cyan" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">My Rank</span>
          </div>
          <RankBadge rank={rankLabel === 'Not Ranked' ? 'Q0' : data.rank.current} className="text-xs" />
          {data.rank.next ? (
            <p className="mt-2 text-[11px] text-q-muted">
              Next: <span className="text-q-soft">{data.rank.next}</span>
            </p>
          ) : null}
        </div>

        <div className="q-glass-card col-span-1 border-q-cyan/20 bg-q-cyan/[0.04] p-3.5 sm:p-4">
          <div className="mb-2 flex items-center gap-2 text-q-muted">
            <TrendingUp className="h-3.5 w-3.5 text-q-cyan" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Total Income</span>
          </div>
          <p className="text-xl font-bold tabular-nums text-white sm:text-2xl">{data.income.total}</p>
          <p className="mt-0.5 text-[11px] text-q-muted">Today: {data.income.today}</p>
        </div>
      </section>

      {/* Income breakdown — 2×2 on mobile */}
      <section>
        <h2 className="mb-2 px-0.5 text-xs font-semibold uppercase tracking-wide text-q-muted">
          Income breakdown
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {data.rewards.map((reward) => (
            <div key={reward.label} className="q-glass-card p-3.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-q-muted">
                {rewardShortLabels[reward.label] ?? reward.label}
              </p>
              <p className="mt-1.5 text-base font-semibold tabular-nums text-white sm:text-lg">
                {formatReward(reward.value)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Cap meters */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SemiCircleMeter
          title="ROI Progress"
          subtitle="3× cap on Self ROI"
          meter={data.roi}
          accent="cyan"
        />
        <SemiCircleMeter
          title="Working Income"
          subtitle="4× cap on working incomes"
          meter={data.working ?? data.roi}
          accent="violet"
        />
      </section>
    </PageContainer>
  );
}
