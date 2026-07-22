import type { LucideIcon } from 'lucide-react';
import { Card } from '../ui/Card';

type StatPair = {
  label: string;
  value: string | number;
};

type SummaryStatCardProps = {
  title: string;
  icon: LucideIcon;
  iconClassName: string;
  stats: StatPair[];
  layout?: 'split' | 'triple';
};

export function SummaryStatCard({
  title,
  icon: Icon,
  iconClassName,
  stats,
  layout = 'split',
}: SummaryStatCardProps) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <div
          className={`inline-flex h-12 w-12 items-center justify-center rounded-[14px] text-white shadow-[0_10px_25px_rgba(53,163,255,0.18)] ${iconClassName}`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
      </div>

      <div className="rounded-2xl border border-white/[0.05] bg-white/[0.04] p-4">
        {layout === 'triple' ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-xl font-bold leading-none text-white sm:text-[1.55rem]">{stat.value}</p>
                <p className="mt-1.5 text-xs text-q-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, index) => (
              <div key={stat.label} className={index === 1 ? 'text-right' : ''}>
                <p className="text-xl font-bold leading-none text-white sm:text-[1.55rem]">{stat.value}</p>
                <p className="mt-1.5 text-xs text-q-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
