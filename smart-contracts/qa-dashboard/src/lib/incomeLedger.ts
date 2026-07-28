import type { Contracts } from "@/lib/contracts";
import { dualFromContracts, type DualAmount } from "@/lib/money";
import { shortAddr } from "@/lib/utils";

export type IncomeEntry = {
  id: string;
  at: number;
  block: number;
  txHash: string;
  type: string;
  /** Who received */
  to: string;
  /** Who generated it (downline / self) */
  from?: string;
  level?: number;
  gross?: DualAmount;
  net?: DualAmount;
  reason: string;
};

function tsFromBlock(
  provider: Contracts["provider"],
  blockNumber: number,
): Promise<number> {
  return provider.getBlock(blockNumber).then((b) => Number(b?.timestamp ?? 0) * 1000);
}

/**
 * Load business income entries for a user from contract events (with source).
 */
export async function loadIncomeLedger(
  c: Contracts,
  user: string,
  fromBlock = 0n,
): Promise<IncomeEntry[]> {
  const entries: IncomeEntry[] = [];
  const userLc = user.toLowerCase();

  // Contribution / Direct
  try {
    const filter = c.contribution.filters.ContributionRewardPaid(user);
    const logs = await c.contribution.queryFilter(filter, fromBlock);
    for (const log of logs) {
      const args = (log as { args?: Record<string | number, unknown> }).args;
      if (!args) continue;
      const fromUser = String(args.fromUser ?? args[1] ?? "");
      const level = Number(args.level ?? args[2] ?? 0);
      const amount = BigInt(String(args.amount ?? args[3] ?? 0));
      const dual = await dualFromContracts(c, amount);
      let net = dual;
      try {
        const p = await c.treasury.previewRecycling(amount);
        net = await dualFromContracts(c, BigInt(p.userPayout ?? p[0] ?? 0));
      } catch {
        /* */
      }
      const bn = Number(log.blockNumber);
      entries.push({
        id: `${log.transactionHash}-contrib-${level}`,
        at: await tsFromBlock(c.provider, bn),
        block: bn,
        txHash: log.transactionHash,
        type: `Direct / Contribution L${level}`,
        to: user,
        from: fromUser,
        level,
        gross: dual,
        net,
        reason: `Downline ${shortAddr(fromUser, 4)} activated a package → L${level} share to you`,
      });
    }
  } catch {
    /* */
  }

  // Rank income (Team ROI path)
  try {
    const filter = c.rank.filters.RankIncomePaid(user);
    const logs = await c.rank.queryFilter(filter, fromBlock);
    for (const log of logs) {
      const args = (log as { args?: Record<string | number, unknown> }).args;
      if (!args) continue;
      const fromUser = String(args.fromUser ?? args[1] ?? "");
      const amount = BigInt(String(args.amount ?? args[2] ?? 0));
      const dual = await dualFromContracts(c, amount);
      let net = dual;
      try {
        const p = await c.treasury.previewRecycling(amount);
        net = await dualFromContracts(c, BigInt(p.userPayout ?? p[0] ?? 0));
      } catch {
        /* */
      }
      const bn = Number(log.blockNumber);
      entries.push({
        id: `${log.transactionHash}-rank`,
        at: await tsFromBlock(c.provider, bn),
        block: bn,
        txHash: log.transactionHash,
        type: "Rank Income (Team ROI)",
        to: user,
        from: fromUser,
        gross: dual,
        net,
        reason: `Downline ${shortAddr(fromUser, 4)} claimed Self ROI → differential rank income (gap % only)`,
      });
    }
  } catch {
    /* */
  }

  // Self ROI claimed
  try {
    const filter = c.roi.filters.RoiClaimed(user);
    const logs = await c.roi.queryFilter(filter, fromBlock);
    for (const log of logs) {
      const args = (log as { args?: Record<string | number, unknown> }).args;
      if (!args) continue;
      const amount = BigInt(String(args.amount ?? args[1] ?? 0));
      const dual = await dualFromContracts(c, amount);
      const bn = Number(log.blockNumber);
      entries.push({
        id: `${log.transactionHash}-roi`,
        at: await tsFromBlock(c.provider, bn),
        block: bn,
        txHash: log.transactionHash,
        type: "Self ROI Claimed",
        to: user,
        from: user,
        gross: dual,
        reason: "You claimed daily Self ROI from the global ROI pool",
      });
    }
  } catch {
    /* */
  }

  // Recycling (shows net credit source)
  try {
    const filter = c.treasury.filters.IncomeRecycled(user);
    const logs = await c.treasury.queryFilter(filter, fromBlock);
    for (const log of logs) {
      const args = (log as { args?: Record<string | number, unknown> }).args;
      if (!args) continue;
      const gross = BigInt(String(args.grossAmount ?? args[1] ?? 0));
      const userPayout = BigInt(String(args.userPayout ?? args[2] ?? 0));
      const bn = Number(log.blockNumber);
      entries.push({
        id: `${log.transactionHash}-recycle`,
        at: await tsFromBlock(c.provider, bn),
        block: bn,
        txHash: log.transactionHash,
        type: "Income Recycled (70/30)",
        to: user,
        gross: await dualFromContracts(c, gross),
        net: await dualFromContracts(c, userPayout),
        reason: "Gross income split → 70% wallet / 25% ROI / 3% Reserve / 2% Community",
      });
    }
  } catch {
    /* */
  }

  // SelfRoiPaid net
  try {
    const filter = c.treasury.filters.SelfRoiPaid(user);
    const logs = await c.treasury.queryFilter(filter, fromBlock);
    for (const log of logs) {
      const args = (log as { args?: Record<string | number, unknown> }).args;
      if (!args) continue;
      const amount = BigInt(String(args.amount ?? args[1] ?? 0));
      const bn = Number(log.blockNumber);
      entries.push({
        id: `${log.transactionHash}-selfpay`,
        at: await tsFromBlock(c.provider, bn),
        block: bn,
        txHash: log.transactionHash,
        type: "Self ROI Net Paid",
        to: user,
        net: await dualFromContracts(c, amount),
        reason: "Net Self ROI credited to your wallet after recycling",
      });
    }
  } catch {
    /* */
  }

  // Working income net (covers contribution/rank/tier payouts)
  try {
    const filter = c.treasury.filters.WorkingIncomePaid(user);
    const logs = await c.treasury.queryFilter(filter, fromBlock);
    for (const log of logs) {
      const args = (log as { args?: Record<string | number, unknown> }).args;
      if (!args) continue;
      // skip if we already have same tx as contrib/rank recycle story — still useful as net credit
      const amount = BigInt(String(args.amount ?? args[1] ?? 0));
      const bn = Number(log.blockNumber);
      if (!entries.some((e) => e.txHash === log.transactionHash && e.type.includes("Net"))) {
        entries.push({
          id: `${log.transactionHash}-work`,
          at: await tsFromBlock(c.provider, bn),
          block: bn,
          txHash: log.transactionHash,
          type: "Working Income Net Paid",
          to: user,
          net: await dualFromContracts(c, amount),
          reason: "Net working income (Direct/Rank/Tier/Community) after recycling",
        });
      }
    }
  } catch {
    /* */
  }

  void userLc;
  return entries.sort((a, b) => b.at - a.at || b.block - a.block);
}

/**
 * Find a tracked downline of `sponsor` with an active package (for Team ROI test).
 */
export async function findClaimableDownline(
  c: Contracts,
  sponsor: string,
  tracked: { address: string; walletIndex?: number }[],
): Promise<{ address: string; walletIndex?: number } | null> {
  const sponsorLc = sponsor.toLowerCase();
  for (const u of tracked) {
    if (u.address.toLowerCase() === sponsorLc) continue;
    try {
      const registered = await c.core.isRegistered(u.address);
      if (!registered) continue;
      const row = await c.core.users(u.address);
      const sp = String(row.sponsor ?? row[1] ?? "").toLowerCase();
      // direct or deeper: walk sponsors
      let cursor = sp;
      let isDownline = false;
      for (let i = 0; i < 12 && cursor; i++) {
        if (cursor === sponsorLc) {
          isDownline = true;
          break;
        }
        if (cursor === "0x0000000000000000000000000000000000000000") break;
        const up = await c.core.users(cursor);
        cursor = String(up.sponsor ?? up[1] ?? "").toLowerCase();
      }
      if (!isDownline) continue;
      const pkg = Number(row.packageAmount ?? row[2] ?? 0);
      if (pkg <= 0) continue;
      const pending = await c.roi.getPendingRoi(u.address).catch(() => 0n);
      // even if pending is 0, caller will +1 day first
      void pending;
      return u;
    } catch {
      /* */
    }
  }
  return null;
}
