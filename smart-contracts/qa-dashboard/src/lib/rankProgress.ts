import type { Contracts } from "@/lib/contracts";
import { RANK_NAMES } from "@/lib/constants";

export type RankNeed = {
  label: string;
  current: string;
  required: string;
  ok: boolean;
};

export type LegInfo = {
  address: string;
  volume: number;
};

export type RankProgress = {
  rank: number;
  rankName: string;
  /** True if on-chain Seed checks pass */
  seedQualified: boolean;
  /** Rank ≥ Seed but Seed checks fail → QA setRank override */
  forcedRank: boolean;
  directs: number;
  groupVolume: number;
  personalVolume: number;
  maxLegVolume: number;
  legs: LegInfo[];
  /** Requirements for next natural rank (or Seed if none) */
  nextRankId: number;
  nextRankName: string;
  needs: RankNeed[];
  rewardPct: string;
};

const REWARD_PCT: Record<number, string> = {
  1: "10%",
  2: "15%",
  3: "20%",
  4: "25%",
  5: "30%",
  6: "35%",
  7: "40%",
  8: "45%",
};

function need(
  label: string,
  current: number | string,
  required: number | string,
  ok: boolean,
): RankNeed {
  return {
    label,
    current: String(current),
    required: String(required),
    ok,
  };
}

/** Seed / Sprout / Sapling needs for display (matches RankReward.sol). */
export function buildNeeds(
  rank: number,
  directs: number,
  gv: number,
  maxLeg: number,
  legs: LegInfo[],
): { nextRankId: number; needs: RankNeed[] } {
  if (rank < 1) {
    return {
      nextRankId: 1,
      needs: [
        need("Directs", directs, 2, directs >= 2),
        need("Strongest leg", maxLeg, 250, maxLeg >= 250),
        need("Group volume", gv, 500, gv >= 500),
        need("Other legs (GV − max)", Math.max(0, gv - maxLeg), 250, gv - maxLeg >= 250),
      ],
    };
  }
  if (rank < 2) {
    const leg2000 = legs.filter((l) => l.volume >= 2000).length;
    const leg1000 = legs.filter((l) => l.volume >= 1000 && l.volume < 2000).length;
    return {
      nextRankId: 2,
      needs: [
        need("Directs", directs, 3, directs >= 3),
        need("Group volume", gv, 5000, gv >= 5000),
        need("Legs ≥2000", leg2000, 2, leg2000 >= 2),
        need("Legs ≥1000 (incl. 2000)", leg2000 + leg1000, 3, leg2000 + leg1000 >= 3),
      ],
    };
  }
  if (rank < 3) {
    return {
      nextRankId: 3,
      needs: [
        need("Directs", directs, 4, directs >= 4),
        need("Group volume", gv, 20000, gv >= 20000),
        need("Legs 10k/5k/3k/2k", "check legs", "4 legs", false),
      ],
    };
  }
  // Higher ranks: show summary only
  return {
    nextRankId: Math.min(rank + 1, 8),
    needs: [
      need(
        "Next rank",
        RANK_NAMES[rank] ?? "—",
        RANK_NAMES[Math.min(rank + 1, 8)] ?? "—",
        false,
      ),
      need("Path", "directs of prior rank OR leg spread", "see business card", false),
    ],
  };
}

export async function loadRankProgress(
  c: Contracts,
  user: string,
): Promise<RankProgress> {
  const rank = Number(await c.rank.userRanks(user).catch(() => 0n));
  const directs = Number(await c.rank.directCount(user).catch(() => 0n));
  const groupVolume = Number(await c.rank.groupVolume(user).catch(() => 0n));
  const personalVolume = Number(
    await c.rank.personalVolume(user).catch(() => 0n),
  );
  const maxLegVolume = Number(await c.rank.maxLegVolume(user).catch(() => 0n));
  const seedQualified = Boolean(
    await c.rank.checkSeedQualification(user).catch(() => false),
  );

  const legs: LegInfo[] = [];
  try {
    for (let i = 0; i < directs; i++) {
      const d = String(await c.rank.directUsers(user, i));
      const vol = Number(await c.rank.legVolume(user, d).catch(() => 0n));
      legs.push({ address: d, volume: vol });
    }
  } catch {
    /* */
  }
  legs.sort((a, b) => b.volume - a.volume);

  const forcedRank = rank >= 1 && !seedQualified;
  const { nextRankId, needs } = buildNeeds(
    rank,
    directs,
    groupVolume,
    maxLegVolume,
    legs,
  );

  return {
    rank,
    rankName: RANK_NAMES[rank] ?? "None",
    seedQualified,
    forcedRank,
    directs,
    groupVolume,
    personalVolume,
    maxLegVolume,
    legs,
    nextRankId,
    nextRankName: RANK_NAMES[nextRankId] ?? "—",
    needs,
    rewardPct: REWARD_PCT[rank] ?? "0%",
  };
}
