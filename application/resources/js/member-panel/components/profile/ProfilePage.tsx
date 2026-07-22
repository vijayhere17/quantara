import {
  BadgeCheck,
  Copy,
  Link2,
  Package,
  Shield,
  Trophy,
  UserRound,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../ui/Badge';
import { GradientButton } from '../ui/GradientButton';
import { PageHeader } from '../ui/PageHeader';
import { ProfileInfoCard } from './ProfileInfoCard';
import { ProfileUpdateCard } from './ProfileUpdateCard';
import type { ProfileBoot } from '../../types';

type ProfilePageProps = {
  data: ProfileBoot;
};

const kycTone = {
  verified: 'teal' as const,
  pending: 'purple' as const,
  unverified: 'muted' as const,
};

const kycLabel = {
  verified: 'Verified',
  pending: 'Pending',
  unverified: 'Not Submitted',
};

export function ProfilePage({ data }: ProfilePageProps) {
  const [copied, setCopied] = useState(false);
  const p = data.profile;

  const copyReferral = async () => {
    try {
      await navigator.clipboard.writeText(p.referralLink);
    } catch {
      const input = document.createElement('input');
      input.value = p.referralLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 sm:gap-6">
      <PageHeader
        title="Update My Profile"
        crumbs={[
          { label: 'Dashboard', href: data.links.dashboard },
          { label: 'My Account' },
          { label: 'Update My Profile' },
        ]}
      />

      {/* Figma primary form */}
      <div className="mx-auto w-full max-w-[720px]">
        <ProfileUpdateCard data={data} />
      </div>

      {/* Supporting profile information — same Quantara card language */}
      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2">
        <ProfileInfoCard
          title="Wallet Information"
          subtitle="On-chain wallet overview"
          icon={<Wallet className="h-5 w-5" />}
          rows={[
            { label: 'Address', value: p.connectedWallet || data.user.obscuredAddress },
            { label: 'Chain Balance', value: data.wallet.chainBalance },
            { label: 'Earning Wallet', value: data.wallet.earningWallet },
            { label: 'Potential Wallet', value: data.wallet.potentialWallet },
          ]}
        />

        <ProfileInfoCard
          title="User Information"
          subtitle="Account identity"
          icon={<UserRound className="h-5 w-5" />}
          rows={[
            { label: 'Display Name', value: data.user.displayName || '—' },
            { label: 'Username', value: p.username },
            { label: 'Joined', value: p.joinedAt },
            {
              label: 'Status',
              value: <Badge tone="teal">Active Member</Badge>,
            },
          ]}
        />

        <ProfileInfoCard
          title="Personal Details"
          subtitle="Name on file"
          icon={<UserRound className="h-5 w-5" />}
          rows={[
            { label: 'First Name', value: p.firstName || '—' },
            { label: 'Last Name', value: p.lastName || '—' },
          ]}
        />

        <ProfileInfoCard
          title="Contact Information"
          subtitle="Reachability"
          icon={<Link2 className="h-5 w-5" />}
          rows={[{ label: 'Email', value: p.email || '—' }]}
        />

        <ProfileInfoCard
          title="Referral Information"
          subtitle="Invite & grow your network"
          icon={<Link2 className="h-5 w-5" />}
          action={
            <button
              type="button"
              onClick={copyReferral}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-q-cyan/25 bg-q-cyan/10 px-3 text-xs font-semibold text-q-cyan transition hover:bg-q-cyan/20"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? 'Copied' : 'Copy'}
            </button>
          }
          rows={[
            { label: 'Referral Code', value: p.referralCode },
            { label: 'Referral Link', value: p.referralLink },
          ]}
        />

        <ProfileInfoCard
          title="Rank Information"
          subtitle="Progression status"
          icon={<Trophy className="h-5 w-5" />}
          rows={[
            {
              label: 'Current Rank',
              value: <Badge tone="teal">{p.rank || 'Not Ranked Yet'}</Badge>,
            },
            { label: 'Next Rank', value: p.nextRank || '—' },
          ]}
        />

        <ProfileInfoCard
          title="Package Information"
          subtitle="Active investment plan"
          icon={<Package className="h-5 w-5" />}
          rows={[
            { label: 'Package', value: p.packageName },
            { label: 'Amount', value: p.packageAmount ?? '—' },
            {
              label: 'Status',
              value: <Badge tone="cyan">{p.packageStatus}</Badge>,
            },
          ]}
        />

        <ProfileInfoCard
          title="KYC Status"
          subtitle="Identity verification placeholder"
          icon={<BadgeCheck className="h-5 w-5" />}
          rows={[
            {
              label: 'Status',
              value: <Badge tone={kycTone[p.kycStatus]}>{kycLabel[p.kycStatus]}</Badge>,
            },
            { label: 'Documents', value: 'Placeholder — not connected' },
          ]}
        />

        <ProfileInfoCard
          title="Security Settings"
          subtitle="Protect your account"
          icon={<Shield className="h-5 w-5" />}
          rows={[
            {
              label: '2FA',
              value: (
                <Badge tone={p.twoFactorEnabled ? 'teal' : 'muted'}>
                  {p.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              ),
            },
            {
              label: 'Password',
              value: data.links.resetPassword ? (
                <a href={data.links.resetPassword} className="text-q-cyan hover:text-white">
                  Update Password
                </a>
              ) : (
                '—'
              ),
            },
            {
              label: 'Authenticator',
              value: data.links.secureAccount ? (
                <a href={data.links.secureAccount} className="text-q-cyan hover:text-white">
                  Secure Account
                </a>
              ) : (
                '—'
              ),
            },
          ]}
        />

        <div className="lg:col-span-2">
          <ProfileInfoCard
            title="Connected Wallet"
            subtitle="Wallet linked to this account"
            icon={<Wallet className="h-5 w-5" />}
            rows={[
              { label: 'Connected Address', value: p.connectedWallet || data.user.username },
              {
                label: 'Connection',
                value: <Badge tone="cyan">Session Ready</Badge>,
              },
            ]}
            action={
              <GradientButton
                className="!px-4 !py-2.5 !text-xs"
                onClick={() => {
                  if (typeof window.connectwallet === 'function') void window.connectwallet();
                }}
              >
                <Wallet className="h-3.5 w-3.5" />
                Connect
              </GradientButton>
            }
          />
        </div>
      </div>
    </div>
  );
}
