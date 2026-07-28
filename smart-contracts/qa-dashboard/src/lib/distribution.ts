import { fmtToken, fmtUsd } from "@/lib/format";
import type { Contracts } from "@/lib/contracts";
import { shortAddr } from "@/lib/utils";

export type FundSnapshot = {
  roiPool: bigint;
  charity: bigint;
  reserve: bigint;
  community: bigint;
  working: bigint;
};

export type DistributionLine = {
  label: string;
  detail: string;
  amount: string;
  ok: boolean;
};

export type ActivationDistribution = {
  at: number;
  user: string;
  sponsor: string;
  packageUsd: number;
  tokenPaid: string;
  lines: DistributionLine[];
  summary: string;
};

export async function snapshotFunds(c: Contracts): Promise<FundSnapshot> {
  const [roiPool, charity, reserve, community, working] = await Promise.all([
    c.treasury.interdependentFundBalance(),
    c.treasury.charityFundBalance(),
    c.treasury.reserveFundBalance(),
    c.treasury.communityBuilderFundBalance(),
    c.treasury.workingFundBalance(),
  ]);
  return { roiPool, charity, reserve, community, working };
}

async function contributionEarned(c: Contracts, addr: string): Promise<bigint> {
  try {
    const inc = await c.income.incomes(addr);
    return BigInt(inc.contributionEarned ?? inc[2] ?? 0);
  } catch {
    return 0n;
  }
}

async function levelIncome(
  c: Contracts,
  addr: string,
  level: number,
): Promise<bigint> {
  try {
    return BigInt(await c.contribution.levelIncome(addr, level));
  } catch {
    return 0n;
  }
}

/**
 * Capture fund + upline contribution deltas around an activation so QA can
 * visually verify 30% ROI / charity / L1–L3 without reading events.
 */
export async function buildActivationDistribution(
  c: Contracts,
  user: string,
  packageUsd: number,
  before: FundSnapshot,
): Promise<ActivationDistribution> {
  const after = await snapshotFunds(c);
  const tokenPaid = await c.core.getPackageBTCBAmount(BigInt(packageUsd));

  const expectedRoi = (tokenPaid * 30n) / 100n;
  const workingSide = tokenPaid - expectedRoi;
  const expectedCharity = (workingSide * 5n) / 100n;

  const deltaRoi = after.roiPool - before.roiPool;
  const deltaCharity = after.charity - before.charity;
  const deltaWorking = after.working - before.working;

  const userRow = await c.core.users(user);
  const sponsor = String(userRow.sponsor ?? userRow[1] ?? "");

  const lines: DistributionLine[] = [
    {
      label: "Package payment",
      detail: `User paid ${fmtUsd(packageUsd)} in tokens`,
      amount: fmtToken(tokenPaid),
      ok: true,
    },
    {
      label: "30% → ROI Pool",
      detail: `Expected ${fmtToken(expectedRoi)} · Pool Δ ${fmtToken(deltaRoi)}`,
      amount: fmtToken(deltaRoi),
      ok: deltaRoi === expectedRoi || approxEq(deltaRoi, expectedRoi),
    },
    {
      label: "Charity (5% of working side)",
      detail: `Expected ${fmtToken(expectedCharity)} · Charity Δ ${fmtToken(deltaCharity)}`,
      amount: fmtToken(deltaCharity),
      ok: approxEq(deltaCharity, expectedCharity),
    },
    {
      label: "Working fund Δ",
      detail: "Remainder of working side after charity / payouts",
      amount: fmtToken(deltaWorking),
      ok: true,
    },
  ];

  // Walk L1–L3 sponsors for contribution income
  let cursor = sponsor;
  for (let level = 1; level <= 3; level++) {
    if (!cursor || cursor === "0x0000000000000000000000000000000000000000") break;
    const bps = level === 1 ? await safeL1Bps(c, cursor) : level === 2 ? 300n : 200n;
    const expected = (tokenPaid * bps) / 10000n;
    const levelTotal = await levelIncome(c, cursor, level);
    const gross = await contributionEarned(c, cursor);
    let recycleNet = 0n;
    try {
      const p = await c.treasury.previewRecycling(expected);
      recycleNet = BigInt(p.userPayout ?? p[0] ?? 0);
    } catch {
      recycleNet = (expected * 70n) / 100n;
    }
    lines.push({
      label: `Direct / Contribution L${level} → ${shortAddr(cursor, 4)}`,
      detail: `${Number(bps) / 100}% of package · Gross ${fmtToken(expected)} · Net ~70% ${fmtToken(recycleNet)} · Sponsor contribution total ${fmtToken(gross)} · L${level} bucket ${fmtToken(levelTotal)}`,
      amount: fmtToken(expected),
      ok: expected === 0n || levelTotal >= expected || gross >= expected,
    });
    try {
      const s = await c.core.users(cursor);
      cursor = String(s.sponsor ?? s[1] ?? "");
    } catch {
      break;
    }
  }

  const fail = lines.filter((l) => !l.ok).length;
  return {
    at: Date.now(),
    user,
    sponsor,
    packageUsd,
    tokenPaid: fmtToken(tokenPaid),
    lines,
    summary:
      fail === 0
        ? `Activation $${packageUsd} distribution looks correct`
        : `Activation $${packageUsd}: ${fail} check(s) need review`,
  };
}

async function safeL1Bps(c: Contracts, sponsor: string): Promise<bigint> {
  try {
    return BigInt(await c.contribution.getLevel1Bps(sponsor));
  } catch {
    return 500n;
  }
}

function approxEq(a: bigint, b: bigint, tolBps = 1n): boolean {
  if (a === b) return true;
  const diff = a > b ? a - b : b - a;
  const base = b > 0n ? b : a;
  if (base === 0n) return diff === 0n;
  return (diff * 10000n) / base <= tolBps;
}
