import { Badge } from './Badge';

type RankBadgeProps = {
  rank: string;
  className?: string;
};

export function RankBadge({ rank, className = '' }: RankBadgeProps) {
  const label = !rank || rank === 'Q0' || rank === 'None' ? 'Not Ranked' : rank;
  return (
    <Badge tone="teal" className={className}>
      {label}
    </Badge>
  );
}
