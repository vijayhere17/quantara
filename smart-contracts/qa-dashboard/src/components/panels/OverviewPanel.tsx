import { useEffect, useMemo, useState } from "react";
import { StatCard } from "@/components/ui/card";
import { useContracts, useOverviewStats } from "@/hooks/useContracts";
import type { DashboardTab } from "@/lib/constants";
import { useDashboardStore } from "@/store/dashboardStore";

type CardDef = {
  key: string;
  label: string;
  tab: DashboardTab;
  tone?: "default" | "ok" | "warn" | "accent";
  hint?: string;
};

const CARDS: CardDef[] = [
  { key: "totalUsers", label: "Total Users", tab: "users", tone: "accent" },
  { key: "registered", label: "Registered Users", tab: "users", tone: "ok" },
  { key: "activated", label: "Activated Users", tab: "users", tone: "ok" },
  {
    key: "roiPool",
    label: "Current ROI Pool",
    tab: "packages",
    hint: "Interdependent fund",
  },
  { key: "charity", label: "Charity Fund", tab: "packages" },
  { key: "reserve", label: "Reserve Fund", tab: "packages" },
  {
    key: "community",
    label: "Community Builder Pool",
    tab: "income",
  },
  { key: "working", label: "Working Fund", tab: "packages" },
  {
    key: "totalSelfRoi",
    label: "Total Self ROI Paid",
    tab: "income",
    tone: "ok",
  },
  {
    key: "totalContribution",
    label: "Total Direct Income Paid",
    tab: "income",
    hint: "From tracked contribution earned",
  },
  {
    key: "totalRank",
    label: "Total Rank Income Paid",
    tab: "income",
  },
  {
    key: "totalContributionReward",
    label: "Total Contribution Reward Paid",
    tab: "income",
    hint: "Tracked contribution totals",
  },
  {
    key: "withdrawable",
    label: "Total Withdrawable",
    tab: "users",
    hint: "Treasury working fund (proxy)",
  },
  {
    key: "todayTxs",
    label: "Today's Transactions",
    tab: "developer",
    tone: "accent",
  },
];

export function OverviewPanel() {
  const { stats, loading } = useOverviewStats();
  const setTab = useDashboardStore((s) => s.setTab);
  const txs = useDashboardStore((s) => s.txs);
  const users = useDashboardStore((s) => s.users);
  const contracts = useContracts();
  const tick = useDashboardStore((s) => s.refreshTick);
  const [registered, setRegistered] = useState(0);

  useEffect(() => {
    if (!contracts) {
      setRegistered(0);
      return;
    }
    let cancelled = false;
    (async () => {
      let count = 0;
      for (const u of users) {
        try {
          if (await contracts.core.isRegistered(u.address)) count += 1;
        } catch {
          /* skip */
        }
      }
      if (!cancelled) setRegistered(count);
    })();
    return () => {
      cancelled = true;
    };
  }, [contracts, users, tick]);

  const todayTxs = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const t0 = start.getTime();
    return txs.filter((tx) => tx.timestamp >= t0).length;
  }, [txs]);

  const values: Record<string, string> = {
    ...stats,
    registered: String(registered),
    totalContributionReward: stats.totalContribution ?? "—",
    withdrawable: stats.working ?? "—",
    todayTxs: String(todayTxs),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink">Overview</h2>
          <p className="text-xs text-muted">
            Click a card to open the related test page.
          </p>
        </div>
        {loading ? (
          <span className="text-xs text-muted animate-pulse">Refreshing…</span>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {CARDS.map((m) => (
          <StatCard
            key={m.key}
            label={m.label}
            value={values[m.key] ?? "—"}
            hint={m.hint}
            tone={m.tone}
            onClick={() => setTab(m.tab)}
          />
        ))}
      </div>
    </div>
  );
}
