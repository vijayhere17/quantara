import { Badge } from './Badge';

type RankBadgeProps = {
  rank: string;
  className?: string;
};

export function RankBadge({ rank, className = '' }: RankBadgeProps) {
  const label = !rank || rank === 'Q0' ? 'Not Ranked Yet' : rank;
  return (
    <Badge tone="teal" className={className}>
      {label}
    </Badge>
  );
}
