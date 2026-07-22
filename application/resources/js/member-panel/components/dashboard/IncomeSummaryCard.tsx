import { DollarSign } from 'lucide-react';
import { SummaryStatCard } from './SummaryStatCard';
import type { DashboardBoot } from '../../types';

type IncomeSummaryCardProps = {
  income: DashboardBoot['income'];
};

export function IncomeSummaryCard({ income }: IncomeSummaryCardProps) {
  return (
    <SummaryStatCard
      title="Income"
      icon={DollarSign}
      iconClassName="bg-gradient-to-br from-[#19b98b] to-[#2ed8a3]"
      stats={[
        { label: 'Total Income', value: income.total },
        { label: "Today's Income", value: income.today },
      ]}
    />
  );
}
