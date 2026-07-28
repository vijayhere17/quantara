import type { Contracts } from "@/lib/contracts";
import {
  dualFromContracts,
  getBtcUsdPrice,
  type DualAmount,
} from "@/lib/money";
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
  /** Primary display: BTCB · $ */
  amount: DualAmount;
  /** Optional secondary (e.g. net after recycle) */
  net?: DualAmount;
  ok: boolean;
  kind: "pool" | "charity" | "working" | "direct" | "payment";
  level?: number;
  to?: string;
  pct?: string;
};

export type ActivationDistribution = {
  at: number;
  user: string;
  sponsor: string;
  packageUsd: number;
  tokenPaid: DualAmount;
  btcPrice: number;
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

/**
 * After package activation — show exactly where money went in BTCB + USD.
 */
export async function buildActivationDistribution(
  c: Contracts,
  user: string,
  packageUsd: number,
  before: FundSnapshot,
): Promise<ActivationDistribution> {
  const after = await snapshotFunds(c);
  const tokenPaidWei = await c.core.getPackageBTCBAmount(BigInt(packageUsd));
  const tokenPaid = await dualFromContracts(c, tokenPaidWei);
  const btcPrice = await getBtcUsdPrice(c);

  const expectedRoi = (tokenPaidWei * 30n) / 100n;
  const workingSide = tokenPaidWei - expectedRoi;
  const expectedCharity = (workingSide * 5n) / 100n;

  const deltaRoi = after.roiPool - before.roiPool;
  const deltaCharity = after.charity - before.charity;
  const deltaWorking = after.working - before.working;

  const userRow = await c.core.users(user);
  const sponsor = String(userRow.sponsor ?? userRow[1] ?? "");

  const lines: DistributionLine[] = [
    {
      kind: "payment",
      label: "1. User pays package",
      detail: `Package ${packageUsd} USD converted at BTC ≈ $${btcPrice.toLocaleString()}`,
      amount: tokenPaid,
      ok: true,
    },
    {
      kind: "pool",
      label: "2. 30% → Global ROI Pool",
      detail: `Expected ${(await dualFromContracts(c, expectedRoi)).label} · Actual pool change`,
      amount: await dualFromContracts(c, deltaRoi),
      ok: approxEq(deltaRoi, expectedRoi),
      pct: "30%",
    },
    {
      kind: "charity",
      label: "3. Charity (5% of working 70%)",
      detail: `≈ 3.5% of package · Expected ${(await dualFromContracts(c, expectedCharity)).label}`,
      amount: await dualFromContracts(c, deltaCharity),
      ok: approxEq(deltaCharity, expectedCharity),
      pct: "3.5%",
    },
    {
      kind: "working",
      label: "4. Working fund change",
      detail: "Working side after charity and upline payouts",
      amount: await dualFromContracts(c, deltaWorking),
      ok: true,
    },
  ];

  let cursor = sponsor;
  for (let level = 1; level <= 3; level++) {
    if (!cursor || cursor === "0x0000000000000000000000000000000000000000") break;
    const bps = level === 1 ? await safeL1Bps(c, cursor) : level === 2 ? 300n : 200n;
    const expected = (tokenPaidWei * bps) / 10000n;
    const levelTotal = await levelIncome(c, cursor, level);
    const grossTotal = await contributionEarned(c, cursor);
    let netWei = (expected * 70n) / 100n;
    try {
      const p = await c.treasury.previewRecycling(expected);
      netWei = BigInt(p.userPayout ?? p[0] ?? netWei);
    } catch {
      /* */
    }
    const grossDual = await dualFromContracts(c, expected);
    const netDual = await dualFromContracts(c, netWei);
    lines.push({
      kind: "direct",
      level,
      to: cursor,
      pct: `${Number(bps) / 100}%`,
      label: `5.${level} Direct Income L${level} → ${shortAddr(cursor, 4)}`,
      detail: `${Number(bps) / 100}% of package from ${shortAddr(user, 4)}. Gross → recycle 30% → Net 70% to sponsor wallet. Sponsor contribution total ${(await dualFromContracts(c, grossTotal)).label}. L${level} bucket ${(await dualFromContracts(c, levelTotal)).label}.`,
      amount: grossDual,
      net: netDual,
      ok: expected === 0n || levelTotal >= expected || grossTotal >= expected,
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
    tokenPaid,
    btcPrice,
    lines,
    summary:
      fail === 0
        ? `$${packageUsd} activation distributed correctly (BTCB + USD)`
        : `$${packageUsd} activation: ${fail} line(s) need review`,
  };
}
