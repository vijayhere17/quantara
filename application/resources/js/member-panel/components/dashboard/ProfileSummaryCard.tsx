import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import type { DashboardBoot } from '../../types';

type ProfileSummaryCardProps = {
  user: DashboardBoot['user'];
  rankLabel: string;
};

export function ProfileSummaryCard({ user, rankLabel }: ProfileSummaryCardProps) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3.5">
        <div className="relative">
          <img
            src={user.avatar}
            alt={user.displayName}
            className="h-14 w-14 rounded-full border-2 border-q-cyan/45 object-cover shadow-[0_0_16px_rgba(0,212,255,0.25)]"
          />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-white">{user.displayName}</h3>
          <p className="truncate text-sm text-q-muted">{user.obscuredAddress}</p>
        </div>
      </div>

      <ul className="space-y-0 divide-y divide-white/[0.06]">
        <li className="flex items-center justify-between gap-3 py-3.5 first:pt-0">
          <span className="text-sm text-q-muted">Email</span>
          <span className="truncate text-sm font-medium text-white">{user.email || '—'}</span>
        </li>
        <li className="flex items-center justify-between gap-3 py-3.5">
          <span className="text-sm text-q-muted">Current Rank</span>
          <Badge tone="teal">{rankLabel === 'Q0' ? 'Not Ranked Yet' : rankLabel}</Badge>
        </li>
        <li className="flex items-center justify-between gap-3 py-3.5 last:pb-0">
          <span className="text-sm text-q-muted">Current Package</span>
          <span className="text-sm font-medium text-white">{user.packageName || 'Not Active'}</span>
        </li>
      </ul>
    </Card>
  );
}
