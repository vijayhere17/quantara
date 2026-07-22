import { MemberLayout } from './components/layout/MemberLayout';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { ProfilePage } from './components/profile/ProfilePage';
import { mockDashboardData, mockProfileData } from './data/mock';
import type { DashboardBoot, MemberBoot, ProfileBoot } from './types';

function resolveBoot(): MemberBoot {
  if (window.__QUANTARA_BOOT__) return window.__QUANTARA_BOOT__;
  if (window.__QUANTARA_PROFILE__) return window.__QUANTARA_PROFILE__;
  if (window.__QUANTARA_DASHBOARD__) {
    return { ...window.__QUANTARA_DASHBOARD__, page: 'dashboard' };
  }

  const path = window.location.pathname.replace(/\/+$/, '');
  if (path.endsWith('/update-profile')) {
    return mockProfileData;
  }

  return mockDashboardData;
}

export default function App() {
  const data = resolveBoot();

  return (
    <MemberLayout data={data}>
      {data.page === 'profile' ? (
        <ProfilePage data={data as ProfileBoot} />
      ) : (
        <DashboardPage data={data as DashboardBoot} />
      )}
    </MemberLayout>
  );
}
