import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Select } from "@/components/ui/input";
import { useContracts } from "@/hooks/useContracts";
import { fmtToken, toWei } from "@/lib/format";
import { cn, shortAddr } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";

type IncomeTab =
  | "self"
  | "direct"
  | "contribution"
  | "rank"
  | "tier"
  | "community"
  | "leadership"
  | "samerank";

const TABS: { id: IncomeTab; label: string; methods: string[]; field?: string }[] =
  [
    { id: "self", label: "Self ROI", methods: ["Claim ROI", "claimRoi", "ROI", "Self"], field: "roiEarned" },
    {
      id: "direct",
      label: "Direct Income",
      methods: ["Direct", "Activate", "contribution"],
      field: "contributionEarned",
    },
    {
      id: "contribution",
      label: "Contribution Reward",
      methods: ["Contribution", "contribution", "Activate"],
      field: "contributionEarned",
    },
    { id: "rank", label: "Rank Income", methods: ["Rank", "updateRank", "setRank"], field: "rankEarned" },
    {
      id: "tier",
      label: "Tier Booster",
      methods: ["Tier", "Booster", "booster"],
      field: "boosterEarned",
    },
    {
      id: "community",
      label: "Community Builder",
      methods: ["Community", "claimCommunity", "Round"],
      field: "communityEarned",
    },
    {
      id: "leadership",
      label: "Leadership",
      methods: ["Leadership", "Rank", "setRank"],
      field: "rankEarned",
    },
    {
      id: "samerank",
      label: "Same Rank",
      methods: ["SameRank", "sameRank", "Tier"],
      field: "sameRankEarned",
    },
  ];

type IncomeMap = {
  roiEarned: string;
  contributionEarned: string;
  boosterEarned: string;
  rankEarned: string;
  sameRankEarned: string;
  communityEarned: string;
  raw: Record<string, bigint>;
};

export function IncomePanel() {
  const contracts = useContracts();
  const selectedUser = useDashboardStore((s) => s.selectedUser);
  const setSelectedUser = useDashboardStore((s) => s.setSelectedUser);
  const users = useDashboardStore((s) => s.users);
  const txs = useDashboardStore((s) => s.txs);
  const tick = useDashboardStore((s) => s.refreshTick);

  const [tab, setTab] = useState<IncomeTab>("self");
  const [income, setIncome] = useState<IncomeMap | null>(null);
  const [netEstimate, setNetEstimate] = useState<string>("—");

  const load = useCallback(async () => {
    if (!contracts || !selectedUser) {
      setIncome(null);
      setNetEstimate("—");
      return;
    }
    try {
      const inc = await contracts.income.incomes(selectedUser);
      const raw: Record<string, bigint> = {
        roiEarned: BigInt(inc.roiEarned ?? inc[1] ?? 0),
        contributionEarned: BigInt(inc.contributionEarned ?? inc[2] ?? 0),
        boosterEarned: BigInt(inc.boosterEarned ?? inc[3] ?? 0),
        rankEarned: BigInt(inc.rankEarned ?? inc[4] ?? 0),
        sameRankEarned: BigInt(inc.sameRankEarned ?? inc[5] ?? 0),
        communityEarned: BigInt(inc.communityEarned ?? inc[6] ?? 0),
      };
      setIncome({
        roiEarned: fmtToken(raw.roiEarned),
        contributionEarned: fmtToken(raw.contributionEarned),
        boosterEarned: fmtToken(raw.boosterEarned),
        rankEarned: fmtToken(raw.rankEarned),
        sameRankEarned: fmtToken(raw.sameRankEarned),
        communityEarned: fmtToken(raw.communityEarned),
        raw,
      });
    } catch {
      setIncome(null);
    }
  }, [contracts, selectedUser, tick]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeTab = TABS.find((t) => t.id === tab)!;

  useEffect(() => {
    if (!contracts || !income || !activeTab.field) {
      setNetEstimate("—");
      return;
    }
    const gross = income.raw[activeTab.field] ?? 0n;
    if (gross === 0n) {
      setNetEstimate("0");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const p = await contracts.treasury.previewRecycling(gross);
        if (!cancelled) setNetEstimate(fmtToken(p.userPayout ?? p[0]));
      } catch {
        // fallback 70%
        try {
          const p = await contracts.treasury.previewRecycling(toWei(100));
          const userShare = BigInt(p.userPayout ?? p[0]);
          const est = (gross * userShare) / toWei(100);
          if (!cancelled) setNetEstimate(fmtToken(est));
        } catch {
          if (!cancelled) setNetEstimate(fmtToken((gross * 70n) / 100n));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contracts, income, activeTab]);

  const filteredTxs = useMemo(() => {
    const keys = activeTab.methods.map((m) => m.toLowerCase());
    return txs
      .filter((tx) => keys.some((k) => tx.method.toLowerCase().includes(k)))
      .slice(0, 30);
  }, [txs, activeTab]);

  const grossOnChain =
    income && activeTab.field
      ? income[activeTab.field as keyof Omit<IncomeMap, "raw">]
      : "—";

  const emptyHint =
    tab === "direct" || tab === "contribution"
      ? "Activate a downline package to see Direct/Contribution rows here."
      : "No ledger events for this stream yet.";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Income</h2>
          <p className="text-xs text-muted">
            On-chain totals and session transactions by stream
          </p>
        </div>
        <div className="w-72">
          <label className="text-[11px] uppercase tracking-wide text-muted">
            User
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

      <Card>
        <CardHeader>
          <CardTitle>{activeTab.label}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {!selectedUser ? (
            <p className="text-sm text-muted">Select a user above.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="text-muted border-b border-line">
                <tr>
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2">From</th>
                  <th className="py-2 pr-2">Level</th>
                  <th className="py-2 pr-2">Gross</th>
                  <th className="py-2 pr-2">Recycled</th>
                  <th className="py-2">Net</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-line/50 bg-surface-3/30">
                  <td className="py-2 pr-2 text-muted">On-chain</td>
                  <td className="py-2 pr-2">On-chain total</td>
                  <td className="py-2 pr-2">—</td>
                  <td className="py-2 pr-2 font-mono">{grossOnChain}</td>
                  <td className="py-2 pr-2 font-mono text-muted">30%</td>
                  <td className="py-2 font-mono">{netEstimate}</td>
                </tr>
                {filteredTxs.map((tx) => (
                  <tr key={tx.id} className="border-b border-line/50">
                    <td className="py-2 pr-2 text-muted">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2 pr-2">{tx.method}</td>
                    <td className="py-2 pr-2">—</td>
                    <td className="py-2 pr-2 font-mono">—</td>
                    <td className="py-2 pr-2 font-mono">—</td>
                    <td className="py-2">
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
                  </tr>
                ))}
                {!filteredTxs.length ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted">
                      {emptyHint}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
