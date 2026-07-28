import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatCard,
} from "@/components/ui/card";
import { Badge, Select } from "@/components/ui/input";
import { DistributionPanel } from "@/components/DistributionPanel";
import { RecyclingFlow } from "@/components/RecyclingFlow";
import {
  claimSelfRoi,
  getSignerFor,
  increaseTime,
  loadUserRow,
  useContracts,
  useTxRunner,
  walletFromIndex,
} from "@/hooks/useContracts";
import { dualFromContracts, type DualAmount } from "@/lib/money";
import {
  findClaimableDownline,
  loadIncomeLedger,
  type IncomeEntry,
} from "@/lib/incomeLedger";
import { loadRankProgress, type RankProgress } from "@/lib/rankProgress";
import { snapshotFunds } from "@/lib/distribution";
import { RANK_NAMES } from "@/lib/constants";
import { shortAddr } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";
import { toast } from "sonner";

type IncomeTab = "direct" | "self" | "rank" | "all";

type Bucket = {
  key: string;
  label: string;
  dual: DualAmount;
};

type CompanyFunds = {
  roi: DualAmount;
  working: DualAmount;
  charity: DualAmount;
  reserve: DualAmount;
  community: DualAmount;
};

function ledgerFilter(tab: IncomeTab, e: IncomeEntry): boolean {
  if (tab === "all") return true;
  const t = e.type.toLowerCase();
  if (tab === "direct") return t.includes("direct") || t.includes("contribution");
  if (tab === "self")
    return t.includes("self roi") || t.startsWith("self ");
  if (tab === "rank")
    return (
      t.includes("rank") ||
      t.includes("team") ||
      t.includes("tier") ||
      t.includes("same")
    );
  return true;
}

export function IncomePanel() {
  const contracts = useContracts();
  const { run } = useTxRunner();
  const selectedUser = useDashboardStore((s) => s.selectedUser);
  const setSelectedUser = useDashboardStore((s) => s.setSelectedUser);
  const users = useDashboardStore((s) => s.users);
  const tick = useDashboardStore((s) => s.refreshTick);
  const busy = useDashboardStore((s) => s.busy);
  const lastDistribution = useDashboardStore((s) => s.lastDistribution);
  const setDetailsUser = useDashboardStore((s) => s.setDetailsUser);

  const [tab, setTab] = useState<IncomeTab>("direct");
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [pendingRoi, setPendingRoi] = useState<DualAmount | null>(null);
  const [netPreview, setNetPreview] = useState<DualAmount | null>(null);
  const [grossTotal, setGrossTotal] = useState<DualAmount | null>(null);
  const [levels, setLevels] = useState<
    { level: number; dual: DualAmount; pct: string }[]
  >([]);
  const [ledger, setLedger] = useState<IncomeEntry[]>([]);
  const [rankInfo, setRankInfo] = useState<RankProgress | null>(null);
  const [funds, setFunds] = useState<CompanyFunds | null>(null);
  const [teamMsg, setTeamMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQaRanks, setShowQaRanks] = useState(false);

  const tracked = users.find(
    (u) => u.address.toLowerCase() === selectedUser?.toLowerCase(),
  );

  const refresh = useCallback(async () => {
    if (!contracts) {
      setFunds(null);
      return;
    }
    try {
      const snap = await snapshotFunds(contracts);
      setFunds({
        roi: await dualFromContracts(contracts, snap.roiPool),
        working: await dualFromContracts(contracts, snap.working),
        charity: await dualFromContracts(contracts, snap.charity),
        reserve: await dualFromContracts(contracts, snap.reserve),
        community: await dualFromContracts(contracts, snap.community),
      });
    } catch {
      setFunds(null);
    }

    if (!selectedUser) {
      setBuckets([]);
      setPendingRoi(null);
      setLevels([]);
      setLedger([]);
      setRankInfo(null);
      setNetPreview(null);
      setGrossTotal(null);
      return;
    }

    setLoading(true);
    try {
      const inc = await contracts.income.incomes(selectedUser);
      const entries: { key: string; label: string; wei: bigint }[] = [
        {
          key: "contribution",
          label: "Direct",
          wei: BigInt(inc.contributionEarned ?? inc[2] ?? 0),
        },
        {
          key: "roi",
          label: "Self ROI",
          wei: BigInt(inc.roiEarned ?? inc[1] ?? 0),
        },
        {
          key: "rank",
          label: "Rank / Team ROI",
          wei: BigInt(inc.rankEarned ?? inc[4] ?? 0),
        },
        {
          key: "samerank",
          label: "Tier Booster",
          wei: BigInt(inc.sameRankEarned ?? inc[5] ?? 0),
        },
        {
          key: "community",
          label: "Community",
          wei: BigInt(inc.communityEarned ?? inc[6] ?? 0),
        },
      ];
      const next: Bucket[] = [];
      let grossWei = 0n;
      for (const e of entries) {
        grossWei += e.wei;
        next.push({
          key: e.key,
          label: e.label,
          dual: await dualFromContracts(contracts, e.wei),
        });
      }
      setBuckets(next);
      setGrossTotal(await dualFromContracts(contracts, grossWei));
      try {
        const p = await contracts.treasury.previewRecycling(grossWei);
        setNetPreview(
          await dualFromContracts(
            contracts,
            BigInt(p.userPayout ?? p[0] ?? 0),
          ),
        );
      } catch {
        setNetPreview(null);
      }

      let pending = 0n;
      try {
        pending = await contracts.roi.getPendingRoi(selectedUser);
      } catch {
        pending = 0n;
      }
      setPendingRoi(await dualFromContracts(contracts, pending));

      const lv: { level: number; dual: DualAmount; pct: string }[] = [];
      let l1Bps = 500;
      try {
        l1Bps = Number(await contracts.contribution.getLevel1Bps(selectedUser));
      } catch {
        /* */
      }
      for (const level of [1, 2, 3]) {
        let wei = 0n;
        try {
          wei = BigInt(
            await contracts.contribution.levelIncome(selectedUser, level),
          );
        } catch {
          wei = 0n;
        }
        lv.push({
          level,
          dual: await dualFromContracts(contracts, wei),
          pct:
            level === 1 ? `${l1Bps / 100}%` : level === 2 ? "3%" : "2%",
        });
      }
      setLevels(lv);

      setRankInfo(await loadRankProgress(contracts, selectedUser));
      try {
        setLedger(await loadIncomeLedger(contracts, selectedUser));
      } catch {
        setLedger([]);
      }
    } finally {
      setLoading(false);
    }
  }, [contracts, selectedUser, tick]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredLedger = useMemo(
    () => ledger.filter((e) => ledgerFilter(tab, e)),
    [ledger, tab],
  );

  const signerFor = async (c: NonNullable<typeof contracts>) => {
    if (!selectedUser) throw new Error("Select a user");
    if (tracked?.walletIndex != null) {
      return walletFromIndex(tracked.walletIndex, c.provider);
    }
    return getSignerFor(c, selectedUser);
  };

  const onPlusOneDay = async () => {
    await run("+1 Day", async (c) => {
      await increaseTime(c.provider, 86400);
      return { result: true };
    });
  };

  const onClaimRoi = async () => {
    if (!selectedUser) return;
    await run(`Claim Self ROI ${shortAddr(selectedUser)}`, async (c) => {
      const signer = await signerFor(c);
      const tx = await claimSelfRoi(c, signer);
      return { hash: tx.hash as string };
    });
  };

  const onGenerateTeamRoi = async () => {
    if (!selectedUser || !contracts) return;
    setTeamMsg("");
    await run(`Team ROI ${shortAddr(selectedUser)}`, async (c) => {
      const progress = await loadRankProgress(c, selectedUser);
      if (progress.rank < 1) {
        throw new Error(
          `Need Seed first (natural): 2 directs · max leg ≥250 · GV ≥500. Now: directs ${progress.directs}, maxLeg ${progress.maxLegVolume}, GV ${progress.groupVolume}. Or use QA Force Seed below.`,
        );
      }
      const downline = await findClaimableDownline(c, selectedUser, users);
      if (!downline) {
        throw new Error(
          "No activated downline. Create child → Activate, then retry.",
        );
      }
      const beforeInc = await c.income.incomes(selectedUser);
      const beforeRank = BigInt(beforeInc.rankEarned ?? beforeInc[4] ?? 0);
      await increaseTime(c.provider, 86400);
      const dSigner =
        downline.walletIndex != null
          ? walletFromIndex(downline.walletIndex, c.provider)
          : await getSignerFor(c, downline.address);
      const claim = await claimSelfRoi(c, dSigner);
      const afterInc = await c.income.incomes(selectedUser);
      const afterRank = BigInt(afterInc.rankEarned ?? afterInc[4] ?? 0);
      const delta = afterRank - beforeRank;
      const dual = await dualFromContracts(c, delta);
      const msg =
        delta > 0n
          ? `+${dual.label} Rank/Team ROI from ${shortAddr(downline.address, 4)} Self ROI claim`
          : `Downline claimed ROI but Rank delta 0 — check rank ≥ Seed and ROI paid.`;
      setTeamMsg(msg);
      toast.message(msg);
      return { hash: claim.hash as string, result: dual };
    });
  };

  const onUpdateRank = async () => {
    if (!selectedUser) return;
    await run(`updateRank ${shortAddr(selectedUser)}`, async (c) => {
      const tx = await c.rank.updateRank(selectedUser);
      await tx.wait();
      return { hash: tx.hash as string };
    });
  };

  const onSetRank = async (rankId: number) => {
    if (!selectedUser) return;
    await run(`QA Force ${RANK_NAMES[rankId]}`, async (c) => {
      const tx = await c.rank.setRank(selectedUser, rankId);
      await tx.wait();
      return { hash: tx.hash as string };
    });
  };

  const tabs: { id: IncomeTab; label: string }[] = [
    { id: "direct", label: "Direct" },
    { id: "self", label: "Self ROI" },
    { id: "rank", label: "Rank / Team" },
    { id: "all", label: "All" },
  ];

  const bucket = (key: string) => buckets.find((b) => b.key === key);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Income</h2>
          <p className="text-xs text-muted max-w-xl">
            Select a user → see company funds, rank progress, gross → 70% net,
            and entries for the income type you pick.
          </p>
        </div>
        <div className="w-72">
          <label className="text-[11px] uppercase tracking-wide text-muted">
            Selected user
          </label>
          <Select
            className="mt-1"
            value={selectedUser || ""}
            onChange={(e) => setSelectedUser(e.target.value || undefined)}
          >
            <option value="">Select user…</option>
            {users.map((u) => (
              <option key={u.address} value={u.address}>
                #{u.id} {shortAddr(u.address, 4)}
                {u.label ? ` (${u.label})` : ""}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Company balances */}
      <Card>
        <CardHeader>
          <CardTitle>Company balances (now)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="ROI Pool" value={funds?.roi.label ?? "—"} />
            <StatCard label="Working" value={funds?.working.label ?? "—"} tone="accent" />
            <StatCard label="Charity" value={funds?.charity.label ?? "—"} />
            <StatCard label="Reserve" value={funds?.reserve.label ?? "—"} />
            <StatCard label="Community" value={funds?.community.label ?? "—"} />
          </div>
          <p className="mt-2 text-[11px] text-muted">
            On activate: 30% → ROI pool · ~3.5% charity · rest (~66.5%) working
            (pays Direct L1–L3). Every payout then recycles 70/25/3/2.
          </p>
        </CardContent>
      </Card>

      {lastDistribution ? (
        <DistributionPanel dist={lastDistribution} showRecycling={false} />
      ) : null}

      {!selectedUser ? (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm text-muted">
              Select a user above (sponsor for Direct, or any activated user for
              Self ROI).
            </p>
            <RecyclingFlow contracts={contracts} exampleUsd={100} />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Selected user snapshot */}
          <Card className="border-accent/30">
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {tracked?.label || shortAddr(selectedUser, 4)}
                  <Badge tone={rankInfo?.forcedRank ? "warn" : "ok"}>
                    {rankInfo?.rankName ?? "…"}
                    {rankInfo?.rank ? ` · ${rankInfo.rewardPct}` : ""}
                  </Badge>
                  {rankInfo?.forcedRank ? (
                    <Badge tone="danger">QA forced — not earned</Badge>
                  ) : null}
                </CardTitle>
                <p className="mt-1 font-mono text-[11px] text-muted">
                  {shortAddr(selectedUser, 6)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => void refresh()}>
                  Refresh
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDetailsUser(selectedUser)}>
                  Details
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void onUpdateRank()}>
                  Recompute rank
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {loading ? <p className="text-muted">Loading…</p> : null}

              <div className="grid gap-2 sm:grid-cols-4">
                <StatCard
                  label="Gross earned"
                  value={grossTotal?.label ?? "—"}
                  tone="accent"
                />
                <StatCard
                  label="Net if paid now (70%)"
                  value={netPreview?.label ?? "—"}
                  tone="ok"
                  hint="After 30% recycle"
                />
                <StatCard
                  label="Pending Self ROI"
                  value={pendingRoi?.label ?? "—"}
                />
                <StatCard
                  label="Directs / GV / Max leg"
                  value={`${rankInfo?.directs ?? 0} · ${rankInfo?.groupVolume ?? 0} · ${rankInfo?.maxLegVolume ?? 0}`}
                />
              </div>

              {/* Rank progress */}
              <div className="rounded-lg border border-line bg-surface px-3 py-2">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-ink">
                    Next: {rankInfo?.nextRankName ?? "Seed"} — requirements
                  </span>
                  {rankInfo?.seedQualified ? (
                    <Badge tone="ok">Seed rules OK</Badge>
                  ) : (
                    <Badge tone="warn">Seed not earned yet</Badge>
                  )}
                </div>
                <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
                  {(rankInfo?.needs ?? []).map((n) => (
                    <div
                      key={n.label}
                      className={`rounded border px-2 py-1.5 ${
                        n.ok
                          ? "border-ok/40 bg-ok/5"
                          : "border-warn/40 bg-warn/5"
                      }`}
                    >
                      <div className="text-muted">{n.label}</div>
                      <div className="font-mono text-ink">
                        {n.current} / {n.required}{" "}
                        {n.ok ? "✓" : "✗"}
                      </div>
                    </div>
                  ))}
                </div>
                {rankInfo?.legs.length ? (
                  <div className="mt-2 text-muted">
                    Legs:{" "}
                    {rankInfo.legs
                      .slice(0, 6)
                      .map(
                        (l) =>
                          `${shortAddr(l.address, 3)}=${l.volume}`,
                      )
                      .join(" · ")}
                  </div>
                ) : (
                  <p className="mt-2 text-muted">
                    Seed needs 2 directs, strongest leg ≥250, total GV ≥500
                    (others ≥250). Two $50 packages → GV 100 — not Seed.
                  </p>
                )}
              </div>

              {/* Per-type totals */}
              <div className="grid gap-2 sm:grid-cols-5">
                {buckets.map((b) => (
                  <StatCard key={b.key} label={b.label} value={b.dual.label} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Type tabs + actions */}
          <div className="flex flex-wrap items-center gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={
                  tab === t.id
                    ? "rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-surface"
                    : "rounded-md px-3 py-1.5 text-xs text-muted hover:bg-surface-3 hover:text-ink"
                }
              >
                {t.label}
              </button>
            ))}
            <span className="mx-1 h-4 w-px bg-line" />
            {tab === "self" || tab === "rank" ? (
              <>
                <Button size="sm" disabled={busy} onClick={() => void onPlusOneDay()}>
                  +1 Day
                </Button>
                {tab === "self" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void onClaimRoi()}
                  >
                    Claim Self ROI
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void onGenerateTeamRoi()}
                  >
                    Generate Team ROI
                  </Button>
                )}
              </>
            ) : null}
            <button
              type="button"
              className="ml-auto text-[11px] text-muted underline"
              onClick={() => setShowQaRanks((v) => !v)}
            >
              {showQaRanks ? "Hide" : "QA force rank"}
            </button>
          </div>

          {showQaRanks ? (
            <Card className="border-warn/40">
              <CardContent className="pt-3 flex flex-wrap gap-2 text-xs">
                <p className="w-full text-warn">
                  Owner setRank bypasses volume rules — only for QA. Natural Seed
                  needs GV 500 + max leg 250.
                </p>
                {[1, 2, 3, 4, 5].map((id) => (
                  <Button
                    key={id}
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void onSetRank(id)}
                  >
                    Force {RANK_NAMES[id]}
                  </Button>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {teamMsg ? (
            <p className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-xs">
              {teamMsg}
            </p>
          ) : null}

          {/* Direct L1–L3 when Direct tab */}
          {tab === "direct" ? (
            <div className="grid gap-2 sm:grid-cols-4">
              <StatCard
                label="Direct total"
                value={bucket("contribution")?.dual.label ?? "—"}
                tone="accent"
              />
              {levels.map((lv) => (
                <StatCard
                  key={lv.level}
                  label={`L${lv.level} (${lv.pct})`}
                  value={lv.dual.label}
                  tone={lv.dual.wei > 0n ? "ok" : "default"}
                />
              ))}
            </div>
          ) : null}

          {tab === "self" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <StatCard label="Pending" value={pendingRoi?.label ?? "—"} tone="accent" />
              <StatCard label="Claimed Self ROI (gross)" value={bucket("roi")?.dual.label ?? "—"} tone="ok" />
            </div>
          ) : null}

          {tab === "rank" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <StatCard
                label="Rank / Team ROI (gross)"
                value={bucket("rank")?.dual.label ?? "—"}
                tone="ok"
              />
              <StatCard
                label="Tier Booster"
                value={bucket("samerank")?.dual.label ?? "—"}
              />
            </div>
          ) : null}

          {/* Filtered entries */}
          <Card>
            <CardHeader>
              <CardTitle>
                Entries — {tabs.find((t) => t.id === tab)?.label}
                <span className="ml-2 font-normal text-muted">
                  ({filteredLedger.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="text-muted border-b border-line">
                  <tr>
                    <th className="py-2 pr-2">When</th>
                    <th className="py-2 pr-2">Type</th>
                    <th className="py-2 pr-2">From</th>
                    <th className="py-2 pr-2">Gross</th>
                    <th className="py-2 pr-2">Net 70%</th>
                    <th className="py-2">Why</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedger.map((e) => (
                    <tr key={e.id} className="border-b border-line/50 align-top">
                      <td className="py-2 pr-2 text-muted whitespace-nowrap">
                        {e.at
                          ? new Date(e.at).toLocaleString()
                          : `b${e.block}`}
                      </td>
                      <td className="py-2 pr-2">
                        <Badge tone="accent">{e.type}</Badge>
                      </td>
                      <td className="py-2 pr-2 font-mono">
                        {e.from ? shortAddr(e.from, 4) : "—"}
                        {e.level ? ` L${e.level}` : ""}
                      </td>
                      <td className="py-2 pr-2 font-mono">
                        {e.gross?.label ?? "—"}
                      </td>
                      <td className="py-2 pr-2 font-mono text-ok">
                        {e.net?.label ?? "—"}
                      </td>
                      <td className="py-2 text-muted max-w-xs">{e.reason}</td>
                    </tr>
                  ))}
                  {!filteredLedger.length ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted">
                        No {tabs.find((t) => t.id === tab)?.label} entries yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <RecyclingFlow contracts={contracts} exampleUsd={100} />
        </>
      )}
    </div>
  );
}
