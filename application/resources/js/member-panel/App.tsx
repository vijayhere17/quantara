import { MemberLayout } from './components/layout/MemberLayout';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { mockDashboardData } from './data/mock';
import type { DashboardBoot } from './types';

function resolveBoot(): DashboardBoot {
  return window.__QUANTARA_DASHBOARD__ ?? mockDashboardData;
}

export default function App() {
  const data = resolveBoot();

  return (
    <MemberLayout data={data}>
      <DashboardPage data={data} />
    </MemberLayout>
  );
}
