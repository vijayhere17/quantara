import { Wallet } from 'lucide-react';
import { SummaryStatCard } from './SummaryStatCard';
import type { DashboardBoot } from '../../types';

type WalletSummaryCardProps = {
  wallet: DashboardBoot['wallet'];
};

export function WalletSummaryCard({ wallet }: WalletSummaryCardProps) {
  return (
    <SummaryStatCard
      title="Wallet Balance"
      icon={Wallet}
      iconClassName="bg-gradient-to-br from-[#1c8dff] to-[#4361ff]"
      stats={[
        { label: 'Earning Wallet', value: wallet.earningWallet },
        { label: 'Potential Wallet', value: wallet.potentialWallet },
      ]}
    />
  );
}
