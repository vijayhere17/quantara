import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import type { DashboardBoot } from '../../types';

type RewardSummaryProps = {
  rewards: DashboardBoot['rewards'];
};

export function RewardSummary({ rewards }: RewardSummaryProps) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">Reward Summary</h3>
        <Badge tone="cyan">{rewards.length} Rewards</Badge>
      </div>

      <ul className="divide-y divide-white/[0.06]">
        {rewards.map((reward) => (
          <li key={reward.label} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <span className="text-sm text-q-muted">{reward.label}</span>
            <span className="text-sm font-semibold text-white">{reward.value}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
