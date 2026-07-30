import type { LucideIcon } from 'lucide-react';
import { formatIncomeAmount } from '../../lib/planIncomes';
import type { StatCardVariant } from './DashboardStatCard';

type IncomeOverviewCardProps = {
  label: string;
  value: string | number;
  sharePct: number;
  icon: LucideIcon;
  variant: StatCardVariant;
  animationDelay?: number;
};

export function IncomeOverviewCard({
  label,
  value,
  sharePct,
  icon: Icon,
  variant,
  animationDelay = 0,
}: IncomeOverviewCardProps) {
  const barWidth = sharePct > 0 ? Math.max(sharePct, 6) : 0;

  return (
    <div
      className={`q-income-card q-income-card--${variant} q-stat-card q-stat-card--${variant} flex flex-col gap-2.5 p-3.5`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex items-center gap-2.5">
        <span className={`q-stat-icon q-stat-icon--${variant} shrink-0`}>
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-q-muted">
          {label}
        </p>
      </div>

      <p className="text-[15px] font-bold leading-none tabular-nums text-white sm:text-base">
        ${formatIncomeAmount(value)}
      </p>

      <div className={`q-income-bar q-income-bar--${variant}`} aria-hidden>
        <span
          className={`q-income-bar__fill q-income-bar__fill--${variant}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      <span className="q-stat-flare" aria-hidden />
    </div>
  );
}
