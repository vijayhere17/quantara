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

export function formatIncomeAmount(value: string | number, decimals = 5): string {
  const n = Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(n)) return String(value);
  return n.toFixed(decimals);
}
