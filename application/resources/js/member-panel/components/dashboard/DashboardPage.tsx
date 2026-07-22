import type { DashboardBoot } from '../../types';
import { PageContainer } from '../ui/PageContainer';
import { DirectTeamCard } from './DirectTeamCard';
import { IncomeSummaryCard } from './IncomeSummaryCard';
import { PackageDetailsCard } from './PackageDetailsCard';
import { ProfileSummaryCard } from './ProfileSummaryCard';
import { RankProgress } from './RankProgress';
import { RewardSummary } from './RewardSummary';
import { RoiProgress } from './RoiProgress';
import { TotalTeamCard } from './TotalTeamCard';
import { WalletSummaryCard } from './WalletSummaryCard';
import { WelcomeBanner } from './WelcomeBanner';

type DashboardPageProps = {
  data: DashboardBoot;
};

export function DashboardPage({ data }: DashboardPageProps) {
  const rankLabel =
    data.rank.current && data.rank.current !== 'Q0' ? data.rank.current : 'Not Ranked Yet';

  return (
    <PageContainer>
      <WelcomeBanner data={data} />

      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2">
        <ProfileSummaryCard
          user={data.user}
          rankLabel={rankLabel === 'Not Ranked Yet' ? 'Q0' : data.rank.current}
        />
        <PackageDetailsCard data={data} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
        <WalletSummaryCard wallet={data.wallet} />
        <IncomeSummaryCard income={data.income} />
        <DirectTeamCard team={data.directTeam} />
        <TotalTeamCard team={data.totalTeam} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <RewardSummary rewards={data.rewards} />
        <RoiProgress roi={data.roi} />
        <RankProgress rank={data.rank} />
      </div>
    </PageContainer>
  );
}
