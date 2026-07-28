import { StatCard } from "@/components/ui/card";
import { useOverviewStats } from "@/hooks/useContracts";

const METRICS: { key: string; label: string; tone?: "default" | "ok" | "warn" | "accent"; hint?: string }[] = [
  { key: "totalUsers", label: "Tracked Users", tone: "accent" },
  { key: "activated", label: "Activated", tone: "ok" },
  { key: "packages", label: "With Package" },
  { key: "activeRoi", label: "Active ROI Users", tone: "ok" },
  { key: "activeGa", label: "Active GA", tone: "accent" },
  { key: "roiPool", label: "ROI Pool", hint: "Interdependent fund" },
  { key: "dailyBudget", label: "Daily ROI Budget" },
  { key: "reserve", label: "Reserve Fund" },
  { key: "charity", label: "Charity Fund" },
  { key: "community", label: "Community Fund" },
  { key: "working", label: "Working Fund" },
  { key: "treasury", label: "Treasury Total", tone: "accent" },
  { key: "totalSelfRoi", label: "Total Self ROI Paid", tone: "ok" },
  { key: "totalWorking", label: "Total Working Paid" },
  { key: "totalContribution", label: "Contribution (tracked)" },
  { key: "totalRank", label: "Rank Income (tracked)" },
  { key: "totalCommunityPaid", label: "Community Paid" },
];

export function OverviewPanel() {
  const { stats, loading } = useOverviewStats();

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink">Overview</h2>
          <p className="text-xs text-muted">
            Live treasury and tracked-user metrics from Hardhat.
          </p>
        </div>
        {loading ? (
          <span className="text-xs text-muted animate-pulse">Refreshing…</span>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {METRICS.map((m) => (
          <StatCard
            key={m.key}
            label={m.label}
            value={stats[m.key] ?? "—"}
            hint={m.hint}
            tone={m.tone}
          />
        ))}
      </div>
    </div>
  );
}
