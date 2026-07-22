import { Users } from 'lucide-react';
import { SummaryStatCard } from './SummaryStatCard';
import type { DashboardBoot } from '../../types';

type DirectTeamCardProps = {
  team: DashboardBoot['directTeam'];
};

export function DirectTeamCard({ team }: DirectTeamCardProps) {
  return (
    <SummaryStatCard
      title="Direct Team"
      icon={Users}
      iconClassName="bg-gradient-to-br from-[#4f7cff] to-[#7b61ff]"
      layout="triple"
      stats={[
        { label: 'Total', value: team.total },
        { label: 'Active', value: team.active },
        { label: 'Inactive', value: team.inactive },
      ]}
    />
  );
}
