export type NavChild = {
  label: string;
  href: string;
};

export type NavItem = {
  id: string;
  label: string;
  href?: string;
  icon: string;
  children?: NavChild[];
};

export type PackageOption = {
  amount: number;
  label: string;
};

export type RewardItem = {
  label: string;
  value: string | number;
};

export type MemberLinks = {
  dashboard: string;
  profile: string;
  referrals: string;
  teamNetwork: string;
  investNow: string;
  myInvestments: string;
  wallet: string;
  roiHistory: string;
  contributionReward: string;
  boosterReward: string;
  rankReward: string;
  support: string;
  signOut: string;
  secureAccount?: string;
  resetPassword?: string;
};

export type MemberUser = {
  firstName: string;
  lastName: string;
  displayName: string;
  username: string;
  obscuredAddress: string;
  email: string | null;
  avatar: string;
  packageName: string | null;
  packageAmount: string | number | null;
  packageRoi: string | number | null;
};

export type MemberShellData = {
  page: 'dashboard' | 'profile';
  baseUrl: string;
  assetsUrl: string;
  csrfToken: string;
  currentPath: string;
  user: MemberUser;
  wallet: {
    chainBalance: string;
    earningWallet: string | number;
    potentialWallet: string | number;
  };
  links: MemberLinks;
};

export type DashboardBoot = MemberShellData & {
  page: 'dashboard';
  referral: {
    displayUrl: string;
    copyUrl: string;
  };
  income: {
    total: string | number;
    today: string | number;
  };
  directTeam: {
    total: number;
    active: number;
    inactive: number;
  };
  totalTeam: {
    total: number;
    active: number;
    inactive: number;
  };
  rewards: RewardItem[];
  roi: {
    progress: number;
    earned: string | number;
    remaining: string | number;
  };
  rank: {
    current: string;
    next: string | null;
    progress: number;
    teamVolume: string | number;
    required: string | number | null;
  };
  packages: PackageOption[];
  selectedPackage: number | null;
  blockNumber: string;
};

export type ProfileBoot = MemberShellData & {
  page: 'profile';
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    referralCode: string;
    referralLink: string;
    rank: string;
    nextRank: string | null;
    packageName: string;
    packageAmount: string | number | null;
    packageStatus: string;
    kycStatus: 'pending' | 'verified' | 'unverified';
    twoFactorEnabled: boolean;
    connectedWallet: string;
    joinedAt: string;
  };
};

export type MemberBoot = DashboardBoot | ProfileBoot;

declare global {
  interface Window {
    __QUANTARA_DASHBOARD__?: DashboardBoot;
    __QUANTARA_PROFILE__?: ProfileBoot;
    __QUANTARA_BOOT__?: MemberBoot;
    connectwallet?: () => void | Promise<void>;
  }
}

export {};
