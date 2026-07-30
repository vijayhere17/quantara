/**
 * Quantara Ecology Tier ranks (on-chain RankReward enum order).
 */
export const ECOLOGY_RANKS = [
  { id: 0, name: 'None', label: 'Not Ranked', rewardPct: 0 },
  { id: 1, name: 'Seed', label: 'Seed', rewardPct: 10 },
  { id: 2, name: 'Sprout', label: 'Sprout', rewardPct: 15 },
  { id: 3, name: 'Sapling', label: 'Sapling', rewardPct: 20, capNote: '5X' },
  { id: 4, name: 'Canopy', label: 'Canopy', rewardPct: 25 },
  { id: 5, name: 'Forest', label: 'Forest', rewardPct: 30, capNote: '6X' },
  { id: 6, name: 'Biome', label: 'Biome', rewardPct: 35 },
  { id: 7, name: 'Ecosphere', label: 'Ecosphere', rewardPct: 40, capNote: '7X' },
  { id: 8, name: 'Genesis', label: 'Genesis', rewardPct: 45 },
] as const;

const LEGACY_ALIASES: Record<string, number> = {
  none: 0,
  q0: 0,
  'not ranked': 0,
  'not ranked yet': 0,
  seed: 1,
  q1: 1,
  'sales manager': 1,
  sprout: 2,
  q2: 2,
  sapling: 3,
  q3: 3,
  canopy: 4,
  q4: 4,
  forest: 5,
  q5: 5,
  biome: 6,
  q6: 6,
  ecosphere: 7,
  q7: 7,
  genesis: 8,
  q8: 8,
};

export function resolveEcologyRankId(rank: string | number | null | undefined): number {
  if (rank === null || rank === undefined || rank === '') return 0;
  if (typeof rank === 'number' && rank >= 0 && rank <= 8) return rank;
  const raw = String(rank).trim();
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    return n >= 0 && n <= 8 ? n : 0;
  }
  const key = raw.toLowerCase();
  if (key in LEGACY_ALIASES) return LEGACY_ALIASES[key];
  const byName = ECOLOGY_RANKS.find((r) => r.name.toLowerCase() === key);
  return byName?.id ?? 0;
}

export function formatEcologyRank(rank: string | number | null | undefined): string {
  const id = resolveEcologyRankId(rank);
  return ECOLOGY_RANKS[id]?.label ?? 'Not Ranked';
}

export function ecologyRankRewardPct(rank: string | number | null | undefined): number {
  const id = resolveEcologyRankId(rank);
  return ECOLOGY_RANKS[id]?.rewardPct ?? 0;
}

export function nextEcologyRank(rank: string | number | null | undefined): string | null {
  const id = resolveEcologyRankId(rank);
  if (id >= 8) return null;
  return ECOLOGY_RANKS[id + 1]?.label ?? null;
}
