import { MemberLayout } from './components/layout/MemberLayout';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { ProfilePage } from './components/profile/ProfilePage';
import { MyReferralsPage } from './components/network/MyReferralsPage';
import { DownlineReportPage } from './components/network/DownlineReportPage';
import { InvestNowPage } from './components/investments/InvestNowPage';
import { MyInvestmentsPage } from './components/investments/MyInvestmentsPage';
import { EarningWalletPage } from './components/investments/EarningWalletPage';
import { IncentiveReportPage } from './components/earnings/IncentiveReportPage';
import { CreateTicketPage } from './components/support/CreateTicketPage';
import {
  mockCreateTicketData,
  mockDashboardData,
  mockDownlineReportData,
  mockEarningWalletData,
  mockIncentiveReportData,
  mockInvestNowData,
  mockMyInvestmentsData,
  mockMyReferralsData,
  mockProfileData,
} from './data/mock';
import type {
  DashboardBoot,
  DownlineReportBoot,
  EarningWalletBoot,
  IncentiveReportBoot,
  InvestNowBoot,
  MemberBoot,
  MyInvestmentsBoot,
  MyReferralsBoot,
  ProfileBoot,
  SupportTicketBoot,
} from './types';

function resolveBoot(): MemberBoot {
  if (window.__QUANTARA_BOOT__) return window.__QUANTARA_BOOT__;
  if (window.__QUANTARA_PROFILE__) return window.__QUANTARA_PROFILE__;
  if (window.__QUANTARA_DASHBOARD__) {
    return { ...window.__QUANTARA_DASHBOARD__, page: 'dashboard' };
  }

  const path = decodeURIComponent(window.location.pathname.replace(/\/+$/, ''));
  if (path.endsWith('/update-profile')) return mockProfileData;
  if (path.endsWith('/my-referral')) return mockMyReferralsData;
  if (path.includes('/downline-report')) return mockDownlineReportData;
  if (path.endsWith('/buy-robo')) return mockInvestNowData;
  if (path.endsWith('/bot-request')) return mockMyInvestmentsData;
  if (path.endsWith('/earning-wallet')) return mockEarningWalletData;
  if (path.endsWith('/create-ticket')) return mockCreateTicketData;
  if (path.includes('/earning/')) {
    const title = path.split('/').pop() || 'ROI History';
    return {
      ...mockIncentiveReportData,
      reportTitle: title,
      currentPath: path,
    };
  }

  return mockDashboardData;
}

function renderPage(data: MemberBoot) {
  switch (data.page) {
    case 'profile':
      return <ProfilePage data={data as ProfileBoot} />;
    case 'my-referrals':
      return <MyReferralsPage data={data as MyReferralsBoot} />;
    case 'downline-report':
      return <DownlineReportPage data={data as DownlineReportBoot} />;
    case 'invest-now':
      return <InvestNowPage data={data as InvestNowBoot} />;
    case 'my-investments':
      return <MyInvestmentsPage data={data as MyInvestmentsBoot} />;
    case 'earning-wallet':
      return <EarningWalletPage data={data as EarningWalletBoot} />;
    case 'incentive-report':
      return <IncentiveReportPage data={data as IncentiveReportBoot} />;
    case 'create-ticket':
      return <CreateTicketPage data={data as SupportTicketBoot} />;
    case 'dashboard':
    default:
      return <DashboardPage data={data as DashboardBoot} />;
  }
}

export default function App() {
  const data = resolveBoot();

  return <MemberLayout data={data}>{renderPage(data)}</MemberLayout>;
}
