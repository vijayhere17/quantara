import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type StatCardVariant = 'emerald' | 'amber' | 'cyan' | 'purple';

type DashboardStatCardProps = {
  variant: StatCardVariant;
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  footer?: ReactNode;
  href?: string;
  headerRight?: ReactNode;
  className?: string;
};

const variantClass: Record<StatCardVariant, string> = {
  emerald: 'q-stat-card q-stat-card--emerald',
  amber: 'q-stat-card q-stat-card--amber',
  cyan: 'q-stat-card q-stat-card--cyan',
  purple: 'q-stat-card q-stat-card--purple',
};

const iconClass: Record<StatCardVariant, string> = {
  emerald: 'q-stat-icon q-stat-icon--emerald',
  amber: 'q-stat-icon q-stat-icon--amber',
  cyan: 'q-stat-icon q-stat-icon--cyan',
  purple: 'q-stat-icon q-stat-icon--purple',
};

export function DashboardStatCard({
  variant,
  icon: Icon,
  label,
  value,
  footer,
  href,
  headerRight,
  className = '',
}: DashboardStatCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className={iconClass[variant]}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        {headerRight}
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-q-muted">
        {label}
      </p>
      <div className="mt-1 text-base font-bold leading-tight text-white sm:text-lg">{value}</div>
      {footer ? <div className="mt-2">{footer}</div> : null}
      <span className="q-stat-flare" aria-hidden />
    </>
  );

  const cls = `${variantClass[variant]} q-dash-stat-card q-dash-stat-card--${variant} block p-4 transition-all duration-300 ${className}`;

  if (href) {
    return (
      <a href={href} className={`${cls} transition-transform hover:scale-[1.01]`}>
        {body}
      </a>
    );
  }

  return <div className={cls}>{body}</div>;
}
