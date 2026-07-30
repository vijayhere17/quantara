/**
 * Official Quantara plan income types (aligned with BlockchainIncomeIndexer / IncomeManager).
 * Order matches member earnings navigation.
 */
export const PLAN_INCOME_TYPES = [
  'ROI Reward',
  'Contribution Reward',
  'Booster Reward',
  'Rank Reward',
  'Same Rank Reward',
  'Community Builder',
] as const;

export type PlanIncomeType = (typeof PLAN_INCOME_TYPES)[number];

export function filterPlanIncomes<T extends { label: string }>(rewards: T[]): T[] {
  return PLAN_INCOME_TYPES.map((label) => {
    const found = rewards.find((r) => r.label === label);
    return found ?? ({ label, value: '0.00000' } as T);
  });
}

export function formatIncomeAmount(value: string | number | null | undefined, decimals = 5): string {
  if (value === null || value === undefined || value === '') {
    return (0).toFixed(decimals);
  }
  const n = Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(n)) return '0.00000';
  return n.toFixed(decimals);
}

/** Shorter currency display for dashboard summary cards */
export function formatDashboardCurrency(value: string | number | null | undefined): string {
  return `$${formatIncomeAmount(value, 4)}`;
}

export function incomeSharePercent(
  value: string | number | null | undefined,
  total: string | number | null | undefined,
): number {
  const amount = Number(String(value ?? 0).replace(/,/g, ''));
  const sum = Number(String(total ?? 0).replace(/,/g, ''));
  if (!Number.isFinite(amount) || !Number.isFinite(sum) || sum <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((amount / sum) * 1000) / 10);
}
