import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  activatePackage,
  claimSelfRoi,
  connectContracts,
  forceCompletePackage,
  fundEth,
  fundEthBatch,
  getSignerFor,
  increaseTime,
  registerUser,
  type Contracts,
  walletFromIndex,
} from "@/lib/contracts";
import { CHAIN_ID, networkLabel } from "@/lib/constants";
import { useDashboardStore, type TrackedUser } from "@/store/dashboardStore";
import { fmtToken } from "@/lib/format";
import { mapPool } from "@/lib/asyncPool";

export function useBootstrap() {
  const setContracts = useDashboardStore((s) => s.setContracts);
  const setConnecting = useDashboardStore((s) => s.setConnecting);
  const addLog = useDashboardStore((s) => s.addLog);
  const upsertUser = useDashboardStore((s) => s.upsertUser);
  const users = useDashboardStore((s) => s.users);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setConnecting(true);
      try {
        const c = await connectContracts();
        if (cancelled) return;
        setContracts(c);
        setConnecting(false);
        addLog(
          "ok",
          `Connected to ${networkLabel(CHAIN_ID)}`,
          `Core ${c.addresses.BTCPlanCore}`,
        );
        // Ensure root is tracked
        const root = c.addresses.RootUser;
        if (root && !users.some((u) => u.address.toLowerCase() === root.toLowerCase())) {
          upsertUser({
            id: 0,
            address: root,
            walletIndex: 0,
            label: "Root",
            sponsor: undefined,
            createdAt: Date.now(),
          });
        }
        toast.success(`Connected · ${networkLabel(CHAIN_ID)}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) {
          setConnecting(false, msg);
          addLog("error", "Connection failed", msg);
          toast.error(msg);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function useContracts(): Contracts | null {
  return useDashboardStore((s) => s.contracts);
}

export function useTxRunner() {
  const contracts = useContracts();
  const addLog = useDashboardStore((s) => s.addLog);
  const addTx = useDashboardStore((s) => s.addTx);
  const bumpRefresh = useDashboardStore((s) => s.bumpRefresh);
  const setBusy = useDashboardStore((s) => s.setBusy);

  const run = useCallback(
    async <T,>(
      label: string,
      fn: (c: Contracts) => Promise<{ hash?: string; receipt?: { gasUsed?: bigint }; result?: T } | T>,
    ): Promise<T | undefined> => {
      if (!contracts) {
        toast.error("Not connected");
        return undefined;
      }
      setBusy(true, label);
      addLog("info", label);
      try {
        const out = await fn(contracts);
        const wrapped =
          out && typeof out === "object" && ("hash" in (out as object) || "result" in (out as object))
            ? (out as { hash?: string; receipt?: { gasUsed?: bigint }; result?: T })
            : { result: out as T };

        if (wrapped.hash) {
          addTx({
            id: `${Date.now()}`,
            hash: wrapped.hash,
            method: label,
            status: "success",
            gasUsed: wrapped.receipt?.gasUsed?.toString(),
            timestamp: Date.now(),
          });
          addLog("ok", `${label} succeeded`, wrapped.hash);
        } else {
          addLog("ok", `${label} succeeded`);
        }
        bumpRefresh();
        toast.success(label);
        return wrapped.result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        addLog("error", `${label} failed`, msg.slice(0, 400));
        addTx({
          id: `${Date.now()}`,
          hash: "",
          method: label,
          status: "failed",
          timestamp: Date.now(),
          error: msg.slice(0, 400),
        });
        toast.error(`${label}: ${msg.slice(0, 120)}`);
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [contracts, addLog, addTx, bumpRefresh, setBusy],
  );

  return { run, contracts };
}

export type UserRow = {
  address: string;
  registered: boolean;
  sponsor: string;
  packageAmount: number;
  packageCycle: number;
  joinedAt: number;
  isActive: boolean;
  packageCompleted: boolean;
  rank: number;
  directCount: number;
  groupVolume: string;
  personalVolume: string;
  roiEarned: string;
  workingEarned: string;
  totalEarned: string;
  tokenBalance: string;
  pendingRoi: string;
  nextPackage: number;
  nextCycle: number;
  gaActive: boolean;
  communityPoints: number;
  maxLegVolume: number;
  groupVolumeNum: number;
  seedQualified: boolean;
  /** Rank ≥ Seed but Seed checks fail */
  forcedRank: boolean;
  loadError?: string;
};

async function safeCall<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function loadUserRow(
  c: Contracts,
  address: string,
): Promise<UserRow> {
  const empty: UserRow = {
    address,
    registered: false,
    sponsor: "",
    packageAmount: 0,
    packageCycle: 0,
    joinedAt: 0,
    isActive: false,
    packageCompleted: false,
    rank: 0,
    directCount: 0,
    groupVolume: "0",
    personalVolume: "0",
    roiEarned: "0",
    workingEarned: "0",
    totalEarned: "0",
    tokenBalance: "0",
    pendingRoi: "0",
    nextPackage: 50,
    nextCycle: 1,
    gaActive: false,
    communityPoints: 0,
    maxLegVolume: 0,
    groupVolumeNum: 0,
    seedQualified: false,
    forcedRank: false,
  };

  let registered = false;
  try {
    registered = Boolean(await c.core.isRegistered(address));
  } catch (e) {
    return {
      ...empty,
      loadError: `Cannot read BTCPlanCore (${e instanceof Error ? e.message : String(e)}). Run: npm run deploy && npm run qa:dashboard:sync then refresh.`,
    };
  }

  const tokenBalance = fmtToken(
    await safeCall(() => c.token.balanceOf(address), 0n),
  );

  if (!registered) {
    return { ...empty, tokenBalance };
  }

  const u = await safeCall(() => c.core.users(address), null);
  if (!u) {
    return {
      ...empty,
      registered: true,
      tokenBalance,
      loadError: "users() failed — redeploy/sync addresses",
    };
  }

  const next = await safeCall(
    () => c.core.getNextEligiblePackage(address),
    [50n, 1n] as [bigint, bigint],
  );
  const [
    income,
    rank,
    directs,
    gv,
    pv,
    maxLeg,
    seedQualified,
    pending,
    ga,
    points,
  ] = await Promise.all([
    safeCall(() => c.income.incomes(address), null),
    safeCall(() => c.rank.userRanks(address), 0n),
    safeCall(() => c.rank.directCount(address), 0n),
    safeCall(() => c.rank.groupVolume(address), 0n),
    safeCall(() => c.rank.personalVolume(address), 0n),
    safeCall(() => c.rank.maxLegVolume(address), 0n),
    safeCall(() => c.rank.checkSeedQualification(address), false),
    safeCall(() => c.roi.getPendingRoi(address), 0n),
    safeCall(() => c.booster.isBoosterActive(address), false),
    safeCall(() => c.community.userPoints(address), 0n),
  ]);

  const working = income
    ? BigInt(income.contributionEarned ?? income[2] ?? 0) +
      BigInt(income.boosterEarned ?? income[3] ?? 0) +
      BigInt(income.rankEarned ?? income[4] ?? 0) +
      BigInt(income.sameRankEarned ?? income[5] ?? 0) +
      BigInt(income.communityEarned ?? income[6] ?? 0)
    : 0n;

  // Volume is stored as USD package units (not 18-decimal wei)
  const fmtVol = (v: bigint) => Number(v).toLocaleString();
  const rankNum = Number(rank);
  const gvNum = Number(gv);
  const maxLegNum = Number(maxLeg);

  return {
    address,
    registered: true,
    sponsor: String(u.sponsor ?? u[1] ?? ""),
    packageAmount: Number(u.packageAmount ?? u[2] ?? 0),
    packageCycle: Number(u.packageCycle ?? u[4] ?? 0),
    joinedAt: Number(u.joinedAt ?? u[5] ?? 0),
    isActive: Boolean(u.isActive ?? u[6]),
    packageCompleted: Boolean(u.packageCompleted ?? u[7]),
    rank: rankNum,
    directCount: Number(directs),
    groupVolume: fmtVol(gv),
    personalVolume: fmtVol(pv),
    roiEarned: fmtToken(income?.roiEarned ?? income?.[1] ?? 0n),
    workingEarned: fmtToken(working),
    totalEarned: fmtToken(income?.totalEarned ?? income?.[7] ?? 0n),
    tokenBalance,
    pendingRoi: fmtToken(pending),
    nextPackage: Number(next[0]),
    nextCycle: Number(next[1]),
    gaActive: Boolean(ga),
    communityPoints: Number(points),
    maxLegVolume: maxLegNum,
    groupVolumeNum: gvNum,
    seedQualified: Boolean(seedQualified),
    forcedRank: rankNum >= 1 && !seedQualified,
  };
}

const USER_ROW_CONCURRENCY = 8;

/** Load many user rows in parallel (bounded concurrency). */
export async function loadUserRows(
  c: Contracts,
  addresses: string[],
): Promise<Record<string, UserRow>> {
  const pairs = await mapPool(addresses, USER_ROW_CONCURRENCY, async (addr) => {
    const row = await loadUserRow(c, addr);
    return [addr.toLowerCase(), row] as const;
  });
  return Object.fromEntries(pairs);
}

export function useOverviewStats() {
  const c = useContracts();
  const tick = useDashboardStore((s) => s.refreshTick);
  const tracked = useDashboardStore((s) => s.users);
  const [stats, setStats] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!c) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const summaries = await mapPool(tracked, USER_ROW_CONCURRENCY, async (u) => {
          const zero = {
            activated: 0,
            packages: 0,
            ga: 0,
            contribution: 0n,
            rank: 0n,
          };
          try {
            const reg = await c.core.isRegistered(u.address);
            if (!reg) return zero;
            const [user, gaActive, inc] = await Promise.all([
              c.core.users(u.address),
              c.booster.isBoosterActive(u.address),
              c.income.incomes(u.address).catch(() => null),
            ]);
            return {
              activated: user.isActive ?? user[6] ? 1 : 0,
              packages: Number(user.packageAmount ?? user[2]) > 0 ? 1 : 0,
              ga: gaActive ? 1 : 0,
              contribution: inc
                ? BigInt(inc.contributionEarned ?? inc[2] ?? 0)
                : 0n,
              rank: inc ? BigInt(inc.rankEarned ?? inc[4] ?? 0) : 0n,
            };
          } catch {
            return zero;
          }
        });
        const activated = summaries.reduce((s, x) => s + x.activated, 0);
        const packages = summaries.reduce((s, x) => s + x.packages, 0);
        const ga = summaries.reduce((s, x) => s + x.ga, 0);
        const totalContribution = summaries.reduce(
          (s, x) => s + x.contribution,
          0n,
        );
        const totalRank = summaries.reduce((s, x) => s + x.rank, 0n);

        const [
          roiPool,
          reserve,
          charity,
          community,
          working,
          totalSelf,
          totalWorking,
          totalCommunity,
          activeRoi,
        ] = await Promise.all([
          c.treasury.interdependentFundBalance(),
          c.treasury.reserveFundBalance(),
          c.treasury.charityFundBalance(),
          c.treasury.communityBuilderFundBalance(),
          c.treasury.workingFundBalance(),
          c.treasury.totalSelfRoiPaid(),
          c.treasury.totalWorkingIncomePaid(),
          c.treasury.totalCommunityPaid(),
          c.roi.getActiveRoiUserCount(),
        ]);

        if (cancelled) return;
        setStats({
          totalUsers: String(tracked.length),
          activated: String(activated),
          packages: String(packages),
          roiPool: fmtToken(roiPool),
          reserve: fmtToken(reserve),
          charity: fmtToken(charity),
          community: fmtToken(community),
          working: fmtToken(working),
          treasury: fmtToken(roiPool + reserve + charity + community + working),
          totalSelfRoi: fmtToken(totalSelf),
          totalWorking: fmtToken(totalWorking),
          totalCommunityPaid: fmtToken(totalCommunity),
          totalContribution: fmtToken(totalContribution),
          totalRank: fmtToken(totalRank),
          activeGa: String(ga),
          activeRoi: String(activeRoi),
          dailyBudget: fmtToken(await c.treasury.getAvailableDailyRoiBudget()),
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [c, tick, tracked]);

  return { stats, loading };
}

export async function createUsersBatch(
  c: Contracts,
  count: number,
  startIndex: number,
  sponsor: string,
  upsert: (u: {
    id: number;
    address: string;
    walletIndex: number;
    sponsor: string;
    createdAt: number;
  }) => void,
  onProgress?: (i: number) => void,
  options?: { autoRegister?: boolean; upsertUsers?: (users: TrackedUser[]) => void },
) {
  const autoRegister = options?.autoRegister === true;
  const batchUpsert = options?.upsertUsers;
  const now = Date.now();
  const entries: TrackedUser[] = [];

  for (let i = 0; i < count; i++) {
    const idx = startIndex + i;
    const wallet = walletFromIndex(idx, c.provider);
    entries.push({
      id: idx,
      address: wallet.address,
      walletIndex: idx,
      sponsor,
      createdAt: now,
    });
  }

  await fundEthBatch(
    c,
    entries.map((e) => e.address),
  );
  onProgress?.(Math.max(1, Math.floor(count * 0.5)));

  if (autoRegister) {
    await mapPool(entries, 8, async (entry) => {
      const wallet = walletFromIndex(entry.walletIndex!, c.provider);
      const already = await c.core.isRegistered(wallet.address);
      if (!already) {
        await registerUser(c, wallet, sponsor);
      }
    });
  }

  if (batchUpsert) {
    batchUpsert(entries);
  } else {
    for (const entry of entries) {
      upsert({
        id: entry.id,
        address: entry.address,
        walletIndex: entry.walletIndex!,
        sponsor: entry.sponsor!,
        createdAt: entry.createdAt,
      });
    }
  }

  onProgress?.(count);
  return entries.map((e) => e.address);
}

export {
  activatePackage,
  forceCompletePackage,
  fundEth,
  getSignerFor,
  increaseTime,
  registerUser,
  walletFromIndex,
  claimSelfRoi,
};
