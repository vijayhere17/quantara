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

export type DashboardBoot = {
  baseUrl: string;
  assetsUrl: string;
  csrfToken: string;
  currentPath: string;
  user: {
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
  referral: {
    displayUrl: string;
    copyUrl: string;
  };
  wallet: {
    chainBalance: string;
    earningWallet: string | number;
    potentialWallet: string | number;
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
  links: {
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
  };
};

declare global {
  interface Window {
    __QUANTARA_DASHBOARD__?: DashboardBoot;
    connectwallet?: () => void | Promise<void>;
  }
}

export {};
