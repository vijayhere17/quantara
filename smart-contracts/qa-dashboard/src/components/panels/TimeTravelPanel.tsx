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
import { increaseTime, useContracts, useTxRunner } from "@/hooks/useContracts";
import { IS_LOCAL } from "@/lib/constants";
import { fmtTs } from "@/lib/format";
import { useDashboardStore } from "@/store/dashboardStore";

const JUMPS = [
  { label: "+1 day", days: 1 },
  { label: "+7 days", days: 7 },
  { label: "+30 days", days: 30 },
  { label: "+90 days", days: 90 },
  { label: "+180 days", days: 180 },
] as const;

export function TimeTravelPanel() {
  const contracts = useContracts();
  const { run } = useTxRunner();
  const busy = useDashboardStore((s) => s.busy);
  const tick = useDashboardStore((s) => s.refreshTick);
  const bumpRefresh = useDashboardStore((s) => s.bumpRefresh);

  const [timestamp, setTimestamp] = useState<string>("—");
  const [blockNumber, setBlockNumber] = useState<string>("—");

  const refresh = useCallback(async () => {
    if (!contracts) return;
    const block = await contracts.provider.getBlock("latest");
    setBlockNumber(String(block?.number ?? "—"));
    setTimestamp(block?.timestamp ? fmtTs(block.timestamp) : "—");
  }, [contracts, tick]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const jump = async (days: number) => {
    await run(`Time +${days}d`, async (c) => {
      await increaseTime(c.provider, days * 24 * 60 * 60);
      bumpRefresh();
      await refresh();
      return { result: true };
    });
  };

  if (!IS_LOCAL) {
    return (
      <div className="space-y-3 rounded-xl border border-line/80 bg-surface-2/50 p-4">
        <h2 className="text-base font-semibold">Time Travel</h2>
        <p className="text-sm text-muted">
          Disabled on BSC Testnet — real chain time cannot be fast-forwarded.
          Wait for natural block time for ROI / daily windows, or use Hardhat
          local for simulator jumps.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard label="Block" value={blockNumber} tone="accent" />
          <StatCard label="Timestamp" value={timestamp} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Time Travel</h2>
        <p className="text-xs text-muted">
          Hardhat evm_increaseTime + mine · then refresh
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Block" value={blockNumber} tone="accent" />
        <StatCard label="Timestamp" value={timestamp} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Jump forward</CardTitle>
          <CardDescription>Useful for ROI accrual and round windows</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {JUMPS.map((j) => (
            <Button
              key={j.days}
              disabled={!contracts || busy}
              onClick={() => void jump(j.days)}
            >
              {j.label}
            </Button>
          ))}
          <Button
            variant="secondary"
            disabled={!contracts || busy}
            onClick={() => void refresh()}
          >
            Refresh clock
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
