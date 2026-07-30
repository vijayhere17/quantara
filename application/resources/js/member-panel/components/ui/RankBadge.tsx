import { Badge } from './Badge';
import { formatEcologyRank, ecologyRankRewardPct } from '../../lib/ecologyRanks';

type RankBadgeProps = {
  rank: string;
  className?: string;
  showReward?: boolean;
};

export function RankBadge({ rank, className = '', showReward = false }: RankBadgeProps) {
  const label = formatEcologyRank(rank);
  const pct = ecologyRankRewardPct(rank);

  return (
    <Badge tone="teal" className={className}>
      {label}
      {showReward && pct > 0 ? ` · ${pct}%` : ''}
    </Badge>
  );
}
