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
import { Input } from "@/components/ui/input";
import { useContracts } from "@/hooks/useContracts";
import { fmtToken, toWei } from "@/lib/format";
import { useDashboardStore } from "@/store/dashboardStore";

const FLOW = [
  { pct: "70%", label: "User payout", key: "user" as const, tone: "ok" as const },
  { pct: "25%", label: "ROI pool", key: "roi" as const, tone: "accent" as const },
  { pct: "3%", label: "Reserve", key: "reserve" as const, tone: "default" as const },
  { pct: "2%", label: "Community", key: "community" as const, tone: "warn" as const },
];

export function RecyclingPanel() {
  const contracts = useContracts();
  const tick = useDashboardStore((s) => s.refreshTick);

  const [amount, setAmount] = useState("100");
  const [preview, setPreview] = useState({
    user: "—",
    roi: "—",
    reserve: "—",
    community: "—",
  });
  const [totals, setTotals] = useState({
    recycled: "—",
    toRoi: "—",
    toReserve: "—",
    toCommunity: "—",
  });
  const [bps, setBps] = useState({
    user: "—",
    roi: "—",
    reserve: "—",
    community: "—",
  });

  const refresh = useCallback(async () => {
    if (!contracts) return;
    try {
      const [
        userBps,
        roiBps,
        reserveBps,
        communityBps,
        recycled,
        toRoi,
        toReserve,
        toCommunity,
      ] = await Promise.all([
        contracts.treasury.RECYCLE_USER_BPS(),
        contracts.treasury.RECYCLE_ROI_BPS(),
        contracts.treasury.RESERVE_BPS(),
        contracts.treasury.COMMUNITY_BPS(),
        contracts.treasury.totalIncomeRecycled(),
        contracts.treasury.totalRecycledToRoi(),
        contracts.treasury.totalRecycledToReserve(),
        contracts.treasury.totalRecycledToCommunity(),
      ]);
      setBps({
        user: `${Number(userBps) / 100}%`,
        roi: `${Number(roiBps) / 100}%`,
        reserve: `${Number(reserveBps) / 100}%`,
        community: `${Number(communityBps) / 100}%`,
      });
      setTotals({
        recycled: fmtToken(recycled),
        toRoi: fmtToken(toRoi),
        toReserve: fmtToken(toReserve),
        toCommunity: fmtToken(toCommunity),
      });

      const p = await contracts.treasury.previewRecycling(toWei(amount || "0"));
      setPreview({
        user: fmtToken(p.userPayout ?? p[0]),
        roi: fmtToken(p.toRoiPool ?? p[1]),
        reserve: fmtToken(p.toReserve ?? p[2]),
        community: fmtToken(p.toCommunity ?? p[3]),
      });
    } catch {
      /* */
    }
  }, [contracts, amount, tick]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Recycling</h2>
          <p className="text-xs text-muted">
            Cap surplus → 70% user · 25% ROI · 3% reserve · 2% community
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => void refresh()}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visual flow</CardTitle>
          <CardDescription>On-chain BPS constants</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            {FLOW.map((f, i) => (
              <div key={f.key} className="flex flex-1 items-center gap-2">
                <div className="flex-1 rounded-lg border border-line bg-surface px-3 py-4 text-center">
                  <div className="text-2xl font-semibold text-accent">{f.pct}</div>
                  <div className="mt-1 text-xs text-muted">{f.label}</div>
                  <div className="mt-2 font-mono text-sm text-ink">
                    {bps[f.key]}
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted">
                    preview {preview[f.key]}
                  </div>
                </div>
                {i < FLOW.length - 1 ? (
                  <span className="hidden text-muted sm:inline">→</span>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>previewRecycling</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted">
            Amount (token)
            <Input
              className="mt-1 w-40"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <Button size="sm" onClick={() => void refresh()}>
            Preview
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total recycled" value={totals.recycled} tone="accent" />
        <StatCard label="To ROI" value={totals.toRoi} />
        <StatCard label="To reserve" value={totals.toReserve} />
        <StatCard label="To community" value={totals.toCommunity} />
      </div>
    </div>
  );
}
