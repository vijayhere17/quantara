import { Network } from 'lucide-react';
import { SummaryStatCard } from './SummaryStatCard';
import type { DashboardBoot } from '../../types';

type TotalTeamCardProps = {
  team: DashboardBoot['totalTeam'];
};

export function TotalTeamCard({ team }: TotalTeamCardProps) {
  return (
    <SummaryStatCard
      title="Total Team"
      icon={Network}
      iconClassName="bg-gradient-to-br from-[#2498ff] to-[#22c1ff]"
      layout="triple"
      stats={[
        { label: 'Total', value: team.total },
        { label: 'Active', value: team.active },
        { label: 'Inactive', value: team.inactive },
      ]}
    />
  );
}
