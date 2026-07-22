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

export type MemberPage =
  | 'dashboard'
  | 'profile'
  | 'my-referrals'
  | 'downline-report'
  | 'invest-now'
  | 'my-investments'
  | 'earning-wallet'
  | 'incentive-report'
  | 'create-ticket'
  | 'login'
  | 'signup'
  | 'registration-success';

export type RegistrationSuccessPayload = {
  memberId: string;
  walletAddress: string;
  sponsorId: string;
  packageLabel: string;
  transactionHash: string;
  registrationDate: string;
  network: string;
};

export type AuthLinks = {
  home: string;
  signIn: string;
  signUp: string;
  forgotPassword: string;
  dashboard?: string;
};

export type MemberShellData = {
  page: MemberPage;
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

export type ReferralRow = {
  username: string;
  activationOn: string;
  totalTopup: string | number;
  status: 'active' | 'inactive';
  registeredDate: string;
};

export type DownlineRow = {
  level: number;
  userDetails: string;
  activationOn: string;
  totalTopup: string | number;
  status: 'active' | 'inactive';
  registeredDate: string;
  referralDetails: string;
};

export type MyReferralsBoot = MemberShellData & {
  page: 'my-referrals';
  referrals: ReferralRow[];
};

export type DownlineReportBoot = MemberShellData & {
  page: 'downline-report';
  downlines: DownlineRow[];
};

export type InvestPackageBoot = {
  amount: number;
  label: string;
  multiplier: string;
  buys: number;
  maxBuys: number;
  unlimited?: boolean;
  locked: boolean;
};

export type AuthBoot = {
  page: 'login' | 'signup' | 'registration-success';
  baseUrl: string;
  assetsUrl: string;
  csrfToken: string;
  currentPath: string;
  referralCode?: string;
  links: AuthLinks;
  packages?: InvestPackageBoot[];
  successDefaults?: Partial<RegistrationSuccessPayload>;
};

export type InvestNowBoot = MemberShellData & {
  page: 'invest-now';
  btcRate: number;
  packages: InvestPackageBoot[];
  activePackage: {
    label: string;
    cycle: string;
    status: string;
  };
  info: {
    expectedRoi: string;
    roiCap: string;
    workingCap: string;
    treasuryAllocation: string;
  };
  nextPackageProgress: number;
};

export type InvestmentRow = {
  request: string;
  amount: string | number;
  btcPlan: string;
  txnHash: string;
  maturity: string;
  status: 'active' | 'completed' | 'expired' | 'pending';
};

export type MyInvestmentsBoot = MemberShellData & {
  page: 'my-investments';
  summary: {
    totalInvested: string | number;
    activeInvestment: string | number;
    completedPackages: string | number;
    roiEarned: string | number;
  };
  investments: InvestmentRow[];
};

export type WalletTxnRow = {
  description: string;
  amount: string | number;
  txnType: string;
  txnDate: string;
  hash?: string;
  status?: string;
  wallet?: string;
};

export type EarningWalletBoot = MemberShellData & {
  page: 'earning-wallet';
  summary: {
    totalCredit: string | number;
    totalDebit: string | number;
    availableBalance: string | number;
    roiWallet?: string | number;
    workingWallet?: string | number;
    communityWallet?: string | number;
    totalEarnings?: string | number;
  };
  transactions: WalletTxnRow[];
};

export type IncentiveReportBoot = MemberShellData & {
  page: 'incentive-report';
  reportTitle: string;
  logType: string | number;
  records: WalletTxnRow[];
};

export type SupportTicketBoot = MemberShellData & {
  page: 'create-ticket';
};

export type MemberBoot =
  | DashboardBoot
  | ProfileBoot
  | MyReferralsBoot
  | DownlineReportBoot
  | InvestNowBoot
  | MyInvestmentsBoot
  | EarningWalletBoot
  | IncentiveReportBoot
  | SupportTicketBoot
  | AuthBoot;

declare global {
  interface Window {
    __QUANTARA_DASHBOARD__?: DashboardBoot;
    __QUANTARA_PROFILE__?: ProfileBoot;
    __QUANTARA_BOOT__?: MemberBoot;
    __QUANTARA_SHOW_SUCCESS__?: (payload?: RegistrationSuccessPayload) => void;
    __QUANTARA_LAST_WALLET__?: string;
    __QUANTARA_LAST_SPONSOR__?: string;
    connectwallet?: () => void | Promise<void>;
  }
}

export {};
