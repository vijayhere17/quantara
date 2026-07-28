import { useEffect, useState } from "react";
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
    label: "ROI Pool",
    tab: "packages",
    hint: "30% of activations",
  },
  { key: "working", label: "Working Fund", tab: "packages", hint: "~66.5% pays Direct" },
  { key: "charity", label: "Charity Fund", tab: "packages" },
  { key: "reserve", label: "Reserve Fund", tab: "packages" },
  {
    key: "community",
    label: "Community Builder",
    tab: "income",
  },
  {
    key: "totalSelfRoi",
    label: "Self ROI Paid",
    tab: "income",
    tone: "ok",
  },
  {
    key: "totalContribution",
    label: "Direct Income Paid",
    tab: "income",
  },
  {
    key: "totalRank",
    label: "Rank Income Paid",
    tab: "income",
  },
];

export function OverviewPanel() {
  const { stats, loading } = useOverviewStats();
  const setTab = useDashboardStore((s) => s.setTab);
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

  const values: Record<string, string> = {
    ...stats,
    registered: String(registered),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink">Overview</h2>
          <p className="text-xs text-muted">
            Company funds + paid totals. Click a card to open the related page.
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
