import type {
  DashboardBoot,
  DownlineReportBoot,
  EarningWalletBoot,
  IncentiveReportBoot,
  InvestNowBoot,
  MyInvestmentsBoot,
  MyReferralsBoot,
  ProfileBoot,
  SupportTicketBoot,
} from '../types';

const sharedLinks = {
  dashboard: '/dashboard',
  profile: '/update-profile',
  referrals: '/my-referral',
  teamNetwork: '/downline-report/A',
  investNow: '/buy-robo',
  myInvestments: '/bot-request',
  wallet: '/earning-wallet',
  roiHistory: '/earning/1/ROI History',
  contributionReward: '/earning/2/Contribution Reward',
  boosterReward: '/earning/3/Booster Reward',
  rankReward: '/earning/4/Rank Reward',
  support: '/create-ticket',
  signOut: '/sign-out',
  secureAccount: '/secure-account',
  resetPassword: '/change-password',
};

const sharedUser = {
  firstName: 'Explorer',
  lastName: '',
  displayName: 'Explorer',
  username: '0x68de9d14010385f840ea9f65b132a4fd91d8480f',
  obscuredAddress: '0x68de...480f',
  email: null as string | null,
  avatar: '/assets/images/user/avatar-1.jpg',
  packageName: null as string | null,
  packageAmount: null as string | number | null,
  packageRoi: null as string | number | null,
};

const sharedWallet = {
  chainBalance: '0.00000000 BNB',
  earningWallet: '0.0000',
  potentialWallet: '0.0000',
};

export const mockDashboardData: DashboardBoot = {
  page: 'dashboard',
  baseUrl: '/',
  assetsUrl: '/assets',
  csrfToken: '',
  currentPath: '/dashboard',
  user: sharedUser,
  referral: {
    displayUrl: 'https://quantara.app/invite/0x68de...480f',
    copyUrl: 'https://quantara.app/sign-up?ref=0x68de9d14010385f840ea9f65b132a4fd91d8480f',
  },
  wallet: sharedWallet,
  income: {
    total: '0.0000',
    today: '0.0000',
  },
  directTeam: {
    total: 0,
    active: 0,
    inactive: 0,
  },
  totalTeam: {
    total: 0,
    active: 0,
    inactive: 0,
  },
  rewards: [
    { label: 'ROI Reward', value: '0' },
    { label: 'Contribution Reward', value: '0' },
    { label: 'Booster Reward', value: '0' },
    { label: 'Rank Reward', value: '0' },
    { label: 'Same Rank Reward', value: '0' },
    { label: 'Community Builder', value: '0' },
  ],
  roi: {
    progress: 0,
    earned: '0.0000',
    remaining: '0.0000',
  },
  rank: {
    current: 'Q0',
    next: 'Sales Manager',
    progress: 0,
    teamVolume: '0',
    required: '0',
  },
  packages: [
    { amount: 50, label: '$50' },
    { amount: 100, label: '$100' },
    { amount: 300, label: '$300' },
    { amount: 500, label: '$500' },
  ],
  selectedPackage: null,
  blockNumber: '42,318,904',
  links: sharedLinks,
};

export const mockProfileData: ProfileBoot = {
  page: 'profile',
  baseUrl: '/',
  assetsUrl: '/assets',
  csrfToken: '',
  currentPath: '/update-profile',
  user: sharedUser,
  wallet: sharedWallet,
  links: sharedLinks,
  profile: {
    firstName: '',
    lastName: '',
    email: '',
    username: '0x68de9d14010385f840ea9f65b132a4fd91d8480f',
    referralCode: '0x68de...480f',
    referralLink: 'https://quantara.app/sign-up?ref=0x68de9d14010385f840ea9f65b132a4fd91d8480f',
    rank: 'Not Ranked Yet',
    nextRank: 'Sales Manager',
    packageName: 'Not Active',
    packageAmount: null,
    packageStatus: 'Inactive',
    kycStatus: 'unverified',
    twoFactorEnabled: false,
    connectedWallet: '0x68de9d14010385f840ea9f65b132a4fd91d8480f',
    joinedAt: '—',
  },
};

export const mockMyReferralsData: MyReferralsBoot = {
  page: 'my-referrals',
  baseUrl: '/',
  assetsUrl: '/assets',
  csrfToken: '',
  currentPath: '/my-referral',
  user: sharedUser,
  wallet: sharedWallet,
  links: sharedLinks,
  referrals: [],
};

export const mockDownlineReportData: DownlineReportBoot = {
  page: 'downline-report',
  baseUrl: '/',
  assetsUrl: '/assets',
  csrfToken: '',
  currentPath: '/downline-report/A',
  user: sharedUser,
  wallet: sharedWallet,
  links: sharedLinks,
  downlines: [],
};

export const mockInvestNowData: InvestNowBoot = {
  page: 'invest-now',
  baseUrl: '/',
  assetsUrl: '/assets',
  csrfToken: '',
  currentPath: '/buy-robo',
  user: sharedUser,
  wallet: sharedWallet,
  links: sharedLinks,
  btcRate: 62000,
  packages: [
    { amount: 50, label: '$50', multiplier: '4X Max', buys: 1, maxBuys: 2, locked: false },
    { amount: 100, label: '$100', multiplier: '4X Max', buys: 0, maxBuys: 2, locked: false },
    { amount: 300, label: '$300', multiplier: '4X Max', buys: 0, maxBuys: 2, locked: false },
    { amount: 500, label: '$500', multiplier: '4X Max', buys: 0, maxBuys: 2, locked: true },
    { amount: 1000, label: '$1000', multiplier: '4X Max', buys: 0, maxBuys: 2, locked: true },
    { amount: 3000, label: '$3000', multiplier: '4X Max', buys: 0, maxBuys: 2, locked: true },
    { amount: 5000, label: '$5000', multiplier: '4X Max', buys: 0, maxBuys: 2, locked: true },
    {
      amount: 10000,
      label: '$10000',
      multiplier: '4X Max',
      buys: 0,
      maxBuys: 2,
      locked: true,
      unlimited: true,
    },
  ],
  activePackage: {
    label: '$50',
    cycle: '1 of 2',
    status: 'Active',
  },
  info: {
    expectedRoi: 'Daily ROI per plan rules',
    roiCap: '3X Maximum',
    workingCap: '4X Maximum',
    treasuryAllocation: 'Protocol treasury share',
  },
  nextPackageProgress: 50,
};

export const mockMyInvestmentsData: MyInvestmentsBoot = {
  page: 'my-investments',
  baseUrl: '/',
  assetsUrl: '/assets',
  csrfToken: '',
  currentPath: '/bot-request',
  user: sharedUser,
  wallet: sharedWallet,
  links: sharedLinks,
  summary: {
    totalInvested: '0.0000',
    activeInvestment: '0.0000',
    completedPackages: 0,
    roiEarned: '0.0000',
  },
  investments: [],
};

export const mockEarningWalletData: EarningWalletBoot = {
  page: 'earning-wallet',
  baseUrl: '/',
  assetsUrl: '/assets',
  csrfToken: '',
  currentPath: '/earning-wallet',
  user: sharedUser,
  wallet: sharedWallet,
  links: sharedLinks,
  summary: {
    totalCredit: '0.0000',
    totalDebit: '0.0000',
    availableBalance: '0.0000',
  },
  transactions: [],
};

export const mockIncentiveReportData: IncentiveReportBoot = {
  page: 'incentive-report',
  baseUrl: '/',
  assetsUrl: '/assets',
  csrfToken: '',
  currentPath: '/earning/1/ROI%20History',
  user: sharedUser,
  wallet: sharedWallet,
  links: sharedLinks,
  reportTitle: 'ROI History',
  logType: 1,
  records: [],
};

export const mockCreateTicketData: SupportTicketBoot = {
  page: 'create-ticket',
  baseUrl: '/',
  assetsUrl: '/assets',
  csrfToken: '',
  currentPath: '/create-ticket',
  user: sharedUser,
  wallet: sharedWallet,
  links: sharedLinks,
};
