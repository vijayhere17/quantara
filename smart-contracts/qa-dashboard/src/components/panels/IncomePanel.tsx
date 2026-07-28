import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StatCard,
} from "@/components/ui/card";
import { Badge, Select } from "@/components/ui/input";
import { DistributionPanel } from "@/components/DistributionPanel";
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
import { RANK_NAMES } from "@/lib/constants";
import { shortAddr } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";
import { toast } from "sonner";

type IncomeTab = "direct" | "self" | "rank" | "team" | "other";

type Bucket = {
  key: string;
  label: string;
  dual: DualAmount;
  note?: string;
};

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
  const [rank, setRank] = useState(0);
  const [l1Bps, setL1Bps] = useState(500);
  const [levels, setLevels] = useState<
    { level: number; dual: DualAmount; pct: string }[]
  >([]);
  const [ledger, setLedger] = useState<IncomeEntry[]>([]);
  const [teamMsg, setTeamMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const tracked = users.find(
    (u) => u.address.toLowerCase() === selectedUser?.toLowerCase(),
  );

  const refresh = useCallback(async () => {
    if (!contracts || !selectedUser) {
      setBuckets([]);
      setPendingRoi(null);
      setLevels([]);
      setLedger([]);
      return;
    }
    setLoading(true);
    try {
      const inc = await contracts.income.incomes(selectedUser);
      const entries: { key: string; label: string; wei: bigint; note?: string }[] =
        [
          {
            key: "roi",
            label: "Self ROI (gross tracked)",
            wei: BigInt(inc.roiEarned ?? inc[1] ?? 0),
            note: "Claimed Self ROI before recycle accounting",
          },
          {
            key: "contribution",
            label: "Direct / Contribution (gross)",
            wei: BigInt(inc.contributionEarned ?? inc[2] ?? 0),
            note: "L1–L3 from downline activations",
          },
          {
            key: "rank",
            label: "Rank Income (gross)",
            wei: BigInt(inc.rankEarned ?? inc[4] ?? 0),
            note: "Differential % when downline claims Self ROI",
          },
          {
            key: "samerank",
            label: "Tier Booster / Same Rank (gross)",
            wei: BigInt(inc.sameRankEarned ?? inc[5] ?? 0),
            note: "10% of direct’s Self ROI when same rank",
          },
          {
            key: "community",
            label: "Community Builder (gross)",
            wei: BigInt(inc.communityEarned ?? inc[6] ?? 0),
          },
          {
            key: "booster",
            label: "Other booster (gross)",
            wei: BigInt(inc.boosterEarned ?? inc[3] ?? 0),
          },
        ];
      const next: Bucket[] = [];
      for (const e of entries) {
        next.push({
          key: e.key,
          label: e.label,
          dual: await dualFromContracts(contracts, e.wei),
          note: e.note,
        });
      }
      setBuckets(next);

      let pending = 0n;
      try {
        pending = await contracts.roi.getPendingRoi(selectedUser);
      } catch {
        pending = 0n;
      }
      setPendingRoi(await dualFromContracts(contracts, pending));

      const r = await loadUserRow(contracts, selectedUser);
      setRank(r.rank);
      try {
        setL1Bps(Number(await contracts.contribution.getLevel1Bps(selectedUser)));
      } catch {
        setL1Bps(500);
      }

      const lv: { level: number; dual: DualAmount; pct: string }[] = [];
      for (const level of [1, 2, 3]) {
        let wei = 0n;
        try {
          wei = BigInt(
            await contracts.contribution.levelIncome(selectedUser, level),
          );
        } catch {
          wei = 0n;
        }
        const pct = level === 1 ? `${l1Bps / 100}%` : level === 2 ? "3%" : "2%";
        lv.push({
          level,
          dual: await dualFromContracts(contracts, wei),
          pct: level === 1 ? `${Number(await contracts.contribution.getLevel1Bps(selectedUser).catch(() => 500n)) / 100}%` : pct,
        });
      }
      // fix L1 pct display
      try {
        const bps = Number(await contracts.contribution.getLevel1Bps(selectedUser));
        lv[0].pct = `${bps / 100}%`;
      } catch {
        /* */
      }
      setLevels(lv);

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

  const signerFor = async (c: NonNullable<typeof contracts>) => {
    if (!selectedUser) throw new Error("Select a user");
    if (tracked?.walletIndex != null) {
      return walletFromIndex(tracked.walletIndex, c.provider);
    }
    return getSignerFor(c, selectedUser);
  };

  const onPlusOneDay = async () => {
    await run("+1 Day (time travel)", async (c) => {
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
    await run(`Generate Team ROI for ${shortAddr(selectedUser)}`, async (c) => {
      const row = await loadUserRow(c, selectedUser);
      if (row.rank < 1) {
        const tx = await c.rank.setRank(selectedUser, 1);
        await tx.wait();
        setTeamMsg("Set rank to Seed automatically.");
      }
      const downline = await findClaimableDownline(c, selectedUser, users);
      if (!downline) {
        throw new Error(
          "No activated downline found under this user. Create a child → Register → Activate first.",
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
          ? `Team ROI PASS: Rank Income +${dual.label} from downline ${shortAddr(downline.address, 4)} claiming Self ROI`
          : `Downline ${shortAddr(downline.address, 4)} claimed ROI, but Rank Income delta is 0 — check Seed+ rank on upline and that ROI was payable.`;
      setTeamMsg(msg);
      toast.message(msg);
      return { hash: claim.hash as string, result: dual };
    });
  };

  const onSetRank = async (rankId: number) => {
    if (!selectedUser) return;
    await run(`Set Rank ${RANK_NAMES[rankId]}`, async (c) => {
      const tx = await c.rank.setRank(selectedUser, rankId);
      await tx.wait();
      return { hash: tx.hash as string };
    });
  };

  const tabs: { id: IncomeTab; label: string }[] = [
    { id: "direct", label: "Direct Income" },
    { id: "self", label: "Self ROI" },
    { id: "team", label: "Team ROI path" },
    { id: "rank", label: "Rank Income" },
    { id: "other", label: "All buckets" },
  ];

  const bucket = (key: string) => buckets.find((b) => b.key === key);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Income</h2>
          <p className="text-xs text-muted max-w-2xl">
            See <strong className="text-ink">From → To</strong> for the last
            activation, plus the 70/30 recycle rule. Pick a user to inspect
            Direct / Self ROI / Team ROI / Rank buckets (BTCB + USD).
          </p>
        </div>
        <div className="w-72">
          <label className="text-[11px] uppercase tracking-wide text-muted">
            Inspect user
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

      <DistributionPanel dist={lastDistribution} />

      {!selectedUser ? (
        <Card>
          <CardContent className="pt-4 text-sm text-muted">
            Select a user (usually the <strong>sponsor</strong> to see Direct
            Income after a downline activates).
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-1">
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
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => void refresh()}>
              Refresh
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDetailsUser(selectedUser)}
            >
              View Details
            </Button>
          </div>

          {loading ? (
            <p className="text-xs text-muted">Loading income…</p>
          ) : null}

          {tab === "direct" ? (
            <div className="space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle>How to test Direct Income</CardTitle>
                  <CardDescription>
                    L1 {l1Bps / 100}% · L2 3% · L3 2% of downline package (BTCB + $)
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted space-y-2 leading-relaxed">
                  <ol className="list-decimal pl-4 space-y-1 text-ink">
                    <li>Select / create <strong>Sponsor</strong> (this user).</li>
                    <li>Create a child under sponsor → Register → Activate $50.</li>
                    <li>Keep sponsor selected here — L1 bucket should rise.</li>
                    <li>
                      After activation, the green distribution card shows Direct
                      L1/L2/L3 in <strong>BTCB and $</strong> with net after 70/30 recycle.
                    </li>
                  </ol>
                </CardContent>
              </Card>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Contribution total"
                  value={bucket("contribution")?.dual.token ?? "0"}
                  hint={bucket("contribution")?.dual.usd}
                  tone="accent"
                />
                {levels.map((lv) => (
                  <StatCard
                    key={lv.level}
                    label={`L${lv.level} bucket (${lv.pct})`}
                    value={`${lv.dual.token} BTCB`}
                    hint={lv.dual.usd}
                    tone={lv.dual.wei > 0n ? "ok" : "default"}
                  />
                ))}
              </div>
              <Card>
                <CardContent className="pt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-muted border-b border-line">
                      <tr>
                        <th className="py-2 pr-2">Level</th>
                        <th className="py-2 pr-2">%</th>
                        <th className="py-2 pr-2">BTCB (gross bucket)</th>
                        <th className="py-2">USD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {levels.map((lv) => (
                        <tr key={lv.level} className="border-b border-line/50">
                          <td className="py-2 pr-2">L{lv.level}</td>
                          <td className="py-2 pr-2">{lv.pct}</td>
                          <td className="py-2 pr-2 font-mono">{lv.dual.token}</td>
                          <td className="py-2 font-mono text-accent">{lv.dual.usd}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {tab === "self" ? (
            <div className="space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle>How to test Self ROI</CardTitle>
                  <CardDescription>
                    Daily ROI from the global pool (max ~1%/day), stops at 3× principal
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs space-y-3">
                  <ol className="list-decimal pl-4 space-y-1 text-ink">
                    <li>User must have an active package (Activate first).</li>
                    <li>Click <strong>+1 Day</strong> then <strong>Claim Self ROI</strong>.</li>
                    <li>
                      Pending and claimed amounts show in BTCB + $. Net wallet credit
                      is ~70% after recycling.
                    </li>
                  </ol>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={busy} onClick={() => void onPlusOneDay()}>
                      +1 Day
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void onClaimRoi()}
                    >
                      Claim Self ROI
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard
                  label="Pending Self ROI"
                  value={pendingRoi ? `${pendingRoi.token} BTCB` : "0"}
                  hint={pendingRoi?.usd}
                  tone="accent"
                />
                <StatCard
                  label="Self ROI earned (gross)"
                  value={bucket("roi") ? `${bucket("roi")!.dual.token} BTCB` : "0"}
                  hint={bucket("roi")?.dual.usd}
                  tone="ok"
                />
              </div>
            </div>
          ) : null}

          {tab === "team" ? (
            <div className="space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle>Team ROI (= Rank Income)</CardTitle>
                  <CardDescription>
                    Root at Seed is not enough by itself. Team ROI pays only when a
                    downline <strong>claims Self ROI</strong>. Then Seed earns 10%
                    of that ROI (differential), shown as Rank Income.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-ink space-y-3 leading-relaxed">
                  <p className="text-muted">
                    Your tree already has downlines. Use the button below to
                    auto: ensure Seed rank → +1 day on a downline → Claim their
                    Self ROI → refresh Rank Income on this user.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={busy || !selectedUser}
                      onClick={() => void onGenerateTeamRoi()}
                    >
                      Generate Team ROI now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void onSetRank(1)}
                    >
                      Ensure Seed rank
                    </Button>
                  </div>
                  {teamMsg ? (
                    <p className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-ink">
                      {teamMsg}
                    </p>
                  ) : (
                    <p className="text-muted">
                      Current rank:{" "}
                      <Badge tone="accent">{RANK_NAMES[rank] ?? "None"}</Badge>
                      {rank < 1
                        ? " — set Seed first or click Generate (auto-sets Seed)."
                        : " — ready. Click Generate Team ROI now."}
                    </p>
                  )}
                </CardContent>
              </Card>
              <StatCard
                label="Rank Income on this user (Team ROI total)"
                value={bucket("rank") ? `${bucket("rank")!.dual.token} BTCB` : "0"}
                hint={bucket("rank")?.dual.usd}
                tone={
                  bucket("rank") && bucket("rank")!.dual.wei > 0n ? "ok" : "warn"
                }
              />
            </div>
          ) : null}

          {tab === "rank" ? (
            <div className="space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle>How to test Rank Income</CardTitle>
                  <CardDescription>
                    Differential rank % of downline Self ROI (Seed 10% … Genesis 45%)
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs space-y-3">
                  <ol className="list-decimal pl-4 space-y-1 text-ink">
                    <li>Select the <strong>upline</strong> who should earn rank income.</li>
                    <li>Force a rank (QA): Seed / Sprout / …</li>
                    <li>
                      Select a <strong>direct/downline</strong> with active package →
                      +1 Day → Claim Self ROI.
                    </li>
                    <li>
                      Return to upline — Rank Income (BTCB + $) increases by
                      differential BPS × ROI amount, then ~70% net after recycle.
                    </li>
                  </ol>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((id) => (
                      <Button
                        key={id}
                        size="sm"
                        variant="outline"
                        disabled={busy || !selectedUser}
                        onClick={() => void onSetRank(id)}
                      >
                        Set {RANK_NAMES[id]}
                      </Button>
                    ))}
                  </div>
                  <p className="text-muted">
                    Current rank:{" "}
                    <Badge tone="ok">{RANK_NAMES[rank] ?? "None"}</Badge>
                  </p>
                </CardContent>
              </Card>
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard
                  label="Rank Income"
                  value={bucket("rank") ? `${bucket("rank")!.dual.token} BTCB` : "0"}
                  hint={bucket("rank")?.dual.usd}
                />
                <StatCard
                  label="Tier Booster (same rank)"
                  value={
                    bucket("samerank")
                      ? `${bucket("samerank")!.dual.token} BTCB`
                      : "0"
                  }
                  hint={bucket("samerank")?.dual.usd}
                />
              </div>
            </div>
          ) : null}

          {tab === "other" ? (
            <Card>
              <CardHeader>
                <CardTitle>All income buckets (BTCB · USD)</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-muted border-b border-line">
                    <tr>
                      <th className="py-2 pr-2">Type</th>
                      <th className="py-2 pr-2">BTCB</th>
                      <th className="py-2 pr-2">USD</th>
                      <th className="py-2">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buckets.map((b) => (
                      <tr key={b.key} className="border-b border-line/50">
                        <td className="py-2 pr-2">{b.label}</td>
                        <td className="py-2 pr-2 font-mono">{b.dual.token}</td>
                        <td className="py-2 pr-2 font-mono text-accent">
                          {b.dual.usd}
                        </td>
                        <td className="py-2 text-muted">{b.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : null}

          {/* Source ledger — always visible when a user is selected */}
          <Card>
            <CardHeader>
              <CardTitle>Income entries — where it came from</CardTitle>
              <CardDescription>
                Each row shows type, from whom, BTCB + $, and why it was paid
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="text-muted border-b border-line">
                  <tr>
                    <th className="py-2 pr-2">When</th>
                    <th className="py-2 pr-2">Type</th>
                    <th className="py-2 pr-2">From</th>
                    <th className="py-2 pr-2">Gross BTCB</th>
                    <th className="py-2 pr-2">Gross $</th>
                    <th className="py-2 pr-2">Net BTCB</th>
                    <th className="py-2 pr-2">Net $</th>
                    <th className="py-2">Why</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((e) => (
                    <tr key={e.id} className="border-b border-line/50 align-top">
                      <td className="py-2 pr-2 text-muted whitespace-nowrap">
                        {e.at
                          ? new Date(e.at).toLocaleString()
                          : `block ${e.block}`}
                      </td>
                      <td className="py-2 pr-2">
                        <Badge
                          tone={
                            e.type.includes("Rank")
                              ? "accent"
                              : e.type.includes("Direct")
                                ? "ok"
                                : "default"
                          }
                        >
                          {e.type}
                        </Badge>
                      </td>
                      <td className="py-2 pr-2 font-mono">
                        {e.from ? shortAddr(e.from, 4) : "—"}
                        {e.level ? ` · L${e.level}` : ""}
                      </td>
                      <td className="py-2 pr-2 font-mono">
                        {e.gross?.token ?? "—"}
                      </td>
                      <td className="py-2 pr-2 font-mono text-accent">
                        {e.gross?.usd ?? "—"}
                      </td>
                      <td className="py-2 pr-2 font-mono">{e.net?.token ?? "—"}</td>
                      <td className="py-2 pr-2 font-mono text-accent">
                        {e.net?.usd ?? "—"}
                      </td>
                      <td className="py-2 text-muted max-w-xs">{e.reason}</td>
                    </tr>
                  ))}
                  {!ledger.length ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted">
                        No income events yet for this user. Activate a downline
                        (Direct) or click <strong>Generate Team ROI now</strong>{" "}
                        (Rank / Team ROI).
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
