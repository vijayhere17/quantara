import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StatCard,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/input";
import { useContracts } from "@/hooks/useContracts";
import { fmtToken, toWei } from "@/lib/format";
import { cn, shortAddr } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";

type IncomeTab =
  | "self"
  | "direct"
  | "contribution"
  | "rank"
  | "ga"
  | "tier"
  | "community"
  | "total";

const TABS: { id: IncomeTab; label: string; methods: string[] }[] = [
  { id: "self", label: "Self ROI", methods: ["Claim ROI", "claimRoi", "ROI"] },
  {
    id: "direct",
    label: "Direct",
    methods: ["contribution", "Direct", "Activate", "register"],
  },
  {
    id: "contribution",
    label: "Contribution",
    methods: ["contribution", "Contribution", "Activate"],
  },
  { id: "rank", label: "Rank", methods: ["Rank", "updateRank", "setRank"] },
  {
    id: "ga",
    label: "GA",
    methods: ["GA", "Booster", "Growth", "Activate"],
  },
  {
    id: "tier",
    label: "Tier/SameRank",
    methods: ["Tier", "SameRank", "sameRank", "setRank"],
  },
  {
    id: "community",
    label: "Community",
    methods: ["Community", "claimCommunity", "Round"],
  },
  { id: "total", label: "Total", methods: [] },
];

type IncomeMap = {
  principal: string;
  roiEarned: string;
  contributionEarned: string;
  boosterEarned: string;
  rankEarned: string;
  sameRankEarned: string;
  communityEarned: string;
  totalEarned: string;
};

type RecyclePreview = {
  userPayout: string;
  toRoiPool: string;
  toReserve: string;
  toCommunity: string;
};

export function IncomePanel() {
  const contracts = useContracts();
  const selectedUser = useDashboardStore((s) => s.selectedUser);
  const txs = useDashboardStore((s) => s.txs);
  const tick = useDashboardStore((s) => s.refreshTick);

  const [tab, setTab] = useState<IncomeTab>("self");
  const [income, setIncome] = useState<IncomeMap | null>(null);
  const [previewAmt, setPreviewAmt] = useState("100");
  const [recycle, setRecycle] = useState<RecyclePreview | null>(null);

  const load = useCallback(async () => {
    if (!contracts || !selectedUser) {
      setIncome(null);
      return;
    }
    try {
      const inc = await contracts.income.incomes(selectedUser);
      setIncome({
        principal: fmtToken(inc.principal ?? inc[0]),
        roiEarned: fmtToken(inc.roiEarned ?? inc[1]),
        contributionEarned: fmtToken(inc.contributionEarned ?? inc[2]),
        boosterEarned: fmtToken(inc.boosterEarned ?? inc[3]),
        rankEarned: fmtToken(inc.rankEarned ?? inc[4]),
        sameRankEarned: fmtToken(inc.sameRankEarned ?? inc[5]),
        communityEarned: fmtToken(inc.communityEarned ?? inc[6]),
        totalEarned: fmtToken(inc.totalEarned ?? inc[7]),
      });
    } catch {
      setIncome(null);
    }
  }, [contracts, selectedUser, tick]);

  const loadRecycle = useCallback(async () => {
    if (!contracts) return;
    try {
      const amt = toWei(previewAmt || "0");
      const p = await contracts.treasury.previewRecycling(amt);
      setRecycle({
        userPayout: fmtToken(p.userPayout ?? p[0]),
        toRoiPool: fmtToken(p.toRoiPool ?? p[1]),
        toReserve: fmtToken(p.toReserve ?? p[2]),
        toCommunity: fmtToken(p.toCommunity ?? p[3]),
      });
    } catch {
      setRecycle(null);
    }
  }, [contracts, previewAmt]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadRecycle();
  }, [loadRecycle]);

  const fieldForTab = (t: IncomeTab): { label: string; value: string }[] => {
    if (!income) return [];
    switch (t) {
      case "self":
        return [
          { label: "Principal", value: income.principal },
          { label: "Self ROI earned", value: income.roiEarned },
        ];
      case "direct":
      case "contribution":
        return [
          { label: "Contribution / Direct earned", value: income.contributionEarned },
        ];
      case "rank":
        return [{ label: "Rank earned", value: income.rankEarned }];
      case "ga":
        return [{ label: "GA / Booster earned", value: income.boosterEarned }];
      case "tier":
        return [{ label: "Same-rank / Tier earned", value: income.sameRankEarned }];
      case "community":
        return [{ label: "Community earned", value: income.communityEarned }];
      case "total":
        return [
          { label: "ROI", value: income.roiEarned },
          { label: "Contribution", value: income.contributionEarned },
          { label: "Booster", value: income.boosterEarned },
          { label: "Rank", value: income.rankEarned },
          { label: "Same rank", value: income.sameRankEarned },
          { label: "Community", value: income.communityEarned },
          { label: "Total earned", value: income.totalEarned },
        ];
    }
  };

  const activeTab = TABS.find((t) => t.id === tab)!;
  const filteredTxs = useMemo(() => {
    if (tab === "total") return txs.slice(0, 20);
    const keys = activeTab.methods.map((m) => m.toLowerCase());
    return txs
      .filter((tx) =>
        keys.some((k) => tx.method.toLowerCase().includes(k)),
      )
      .slice(0, 20);
  }, [txs, tab, activeTab]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Income</h2>
        <p className="text-xs text-muted">
          Mapping for {selectedUser ? shortAddr(selectedUser) : "no user selected"}
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition",
              tab === t.id
                ? "bg-accent text-surface"
                : "text-muted hover:bg-surface-3 hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!selectedUser ? (
        <Card>
          <CardContent className="pt-4 text-sm text-muted">
            Select a user to inspect income fields.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fieldForTab(tab).map((f) => (
            <StatCard key={f.label} label={f.label} value={f.value} />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recycling preview</CardTitle>
          <CardDescription>
            treasury.previewRecycling — 70% user / 25% ROI / 3% reserve / 2%
            community
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-muted">
              Amount (token units)
              <input
                className="mt-1 flex h-9 w-40 rounded-md border border-line bg-surface px-3 text-sm"
                value={previewAmt}
                onChange={(e) => setPreviewAmt(e.target.value)}
              />
            </label>
            <Button size="sm" variant="secondary" onClick={() => void loadRecycle()}>
              Preview
            </Button>
          </div>
          {recycle ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="User 70%" value={recycle.userPayout} tone="ok" />
              <StatCard label="ROI 25%" value={recycle.toRoiPool} tone="accent" />
              <StatCard label="Reserve 3%" value={recycle.toReserve} />
              <StatCard label="Community 2%" value={recycle.toCommunity} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Related transactions</CardTitle>
          <CardDescription>
            Filtered by method keywords for {activeTab.label}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted border-b border-line">
              <tr>
                <th className="py-2 pr-2">Method</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 pr-2">Hash</th>
                <th className="py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredTxs.map((tx) => (
                <tr key={tx.id} className="border-b border-line/50">
                  <td className="py-2 pr-2">{tx.method}</td>
                  <td className="py-2 pr-2">
                    <Badge
                      tone={
                        tx.status === "success"
                          ? "ok"
                          : tx.status === "failed"
                            ? "danger"
                            : "warn"
                      }
                    >
                      {tx.status}
                    </Badge>
                  </td>
                  <td className="py-2 pr-2 font-mono">
                    {tx.hash ? shortAddr(tx.hash, 6) : "—"}
                  </td>
                  <td className="py-2 text-muted">
                    {new Date(tx.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
              {!filteredTxs.length ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted">
                    No matching txs yet
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
