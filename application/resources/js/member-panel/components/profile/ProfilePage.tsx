import { PageContainer } from '../ui/PageContainer';
import { PageHeader } from '../ui/PageHeader';
import { ProfileUpdateCard } from './ProfileUpdateCard';
import type { ProfileBoot } from '../../types';

type ProfilePageProps = {
  data: ProfileBoot;
};

export function ProfilePage({ data }: ProfilePageProps) {
  return (
    <PageContainer maxWidth="narrow">
      <PageHeader
        title="Update My Profile"
        crumbs={[
          { label: 'Dashboard', href: data.links.dashboard },
          { label: 'My Account' },
          { label: 'Update My Profile' },
        ]}
      />

      <div className="mx-auto w-full max-w-[720px]">
        <ProfileUpdateCard data={data} />
      </div>
    </PageContainer>
  );
}
