import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StatCard,
} from "@/components/ui/card";
import {
  getSignerFor,
  increaseTime,
  useContracts,
  useTxRunner,
  walletFromIndex,
} from "@/hooks/useContracts";
import { fmtToken } from "@/lib/format";
import { shortAddr } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";
import type { Contract } from "ethers";

type PoolPoint = { t: string; pool: number; budget: number };

const FLOW_STEPS = [
  "Activation credits 30% to Interdependent (ROI) pool",
  "Daily budget = available ROI budget from treasury",
  "distributeDailyRoi / accrue pending per active principal",
  "User claims Self ROI via claimRoi()",
  "Income caps at 3× principal → package complete path",
];

export function RoiPanel() {
  const contracts = useContracts();
  const { run } = useTxRunner();
  const selectedUser = useDashboardStore((s) => s.selectedUser);
  const users = useDashboardStore((s) => s.users);
  const busy = useDashboardStore((s) => s.busy);
  const tick = useDashboardStore((s) => s.refreshTick);
  const addLog = useDashboardStore((s) => s.addLog);

  const [pool, setPool] = useState("—");
  const [budget, setBudget] = useState("—");
  const [active, setActive] = useState("—");
  const [pending, setPending] = useState("—");
  const [history, setHistory] = useState<PoolPoint[]>([]);

  const tracked = users.find(
    (u) => u.address.toLowerCase() === selectedUser?.toLowerCase(),
  );

  const refresh = useCallback(async () => {
    if (!contracts) return;
    const [roiPool, daily, count] = await Promise.all([
      contracts.treasury.interdependentFundBalance(),
      contracts.treasury.getAvailableDailyRoiBudget(),
      contracts.roi.getActiveRoiUserCount(),
    ]);
    setPool(fmtToken(roiPool));
    setBudget(fmtToken(daily));
    setActive(String(count));

    if (selectedUser) {
      try {
        const p = await contracts.roi.getPendingRoi(selectedUser);
        setPending(fmtToken(p));
      } catch {
        setPending("—");
      }
    } else {
      setPending("—");
    }

    const block = await contracts.provider.getBlock("latest");
    setHistory((h) =>
      [
        ...h,
        {
          t: block?.timestamp
            ? new Date(Number(block.timestamp) * 1000).toLocaleTimeString()
            : new Date().toLocaleTimeString(),
          pool: Number(fmtToken(roiPool).replace(/,/g, "")) || 0,
          budget: Number(fmtToken(daily).replace(/,/g, "")) || 0,
        },
      ].slice(-40),
    );
  }, [contracts, selectedUser, tick]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const claim = async () => {
    if (!selectedUser) {
      addLog("warn", "Select a user to claim ROI");
      return;
    }
    await run(`Claim ROI ${shortAddr(selectedUser)}`, async (c) => {
      const signer =
        tracked?.walletIndex != null
          ? walletFromIndex(tracked.walletIndex, c.provider)
          : await getSignerFor(c, selectedUser);
      const roi = c.roi.connect(signer) as Contract;
      const tx = await roi.claimRoi();
      const receipt = await tx.wait();
      await refresh();
      return { hash: tx.hash as string, receipt };
    });
  };

  const plusOneDayClaim = async () => {
    if (!selectedUser) {
      addLog("warn", "Select a user first");
      return;
    }
    await run(`+1 day then claim ROI`, async (c) => {
      await increaseTime(c.provider, 24 * 60 * 60);
      const signer =
        tracked?.walletIndex != null
          ? walletFromIndex(tracked.walletIndex, c.provider)
          : await getSignerFor(c, selectedUser);
      const roi = c.roi.connect(signer) as Contract;
      const tx = await roi.claimRoi();
      const receipt = await tx.wait();
      await refresh();
      return { hash: tx.hash as string, receipt };
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Self ROI</h2>
          <p className="text-xs text-muted">
            Pool, daily budget, claim · selected{" "}
            {selectedUser ? shortAddr(selectedUser) : "none"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={!contracts || busy}
            onClick={() => void refresh()}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            disabled={!contracts || busy || !selectedUser}
            onClick={() => void claim()}
          >
            Claim ROI
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!contracts || busy || !selectedUser}
            onClick={() => void plusOneDayClaim()}
          >
            +1 day → Claim
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="ROI pool" value={pool} tone="accent" />
        <StatCard label="Daily budget" value={budget} />
        <StatCard label="Active ROI users" value={active} tone="ok" />
        <StatCard label="Pending (selected)" value={pending} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ROI flow</CardTitle>
            <CardDescription>Activation → accrue → claim</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {FLOW_STEPS.map((step, i) => (
              <div
                key={step}
                className="flex gap-3 rounded-lg border border-line/70 bg-surface px-3 py-2 text-xs"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/20 text-accent font-semibold">
                  {i + 1}
                </span>
                <span className="text-ink/90 leading-relaxed">{step}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pool history</CardTitle>
            <CardDescription>Appended on each refresh</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {history.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="roiFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#243033" strokeDasharray="3 3" />
                  <XAxis dataKey="t" tick={{ fill: "#8b9a9e", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#8b9a9e", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#121a1c",
                      border: "1px solid #2a383c",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="pool"
                    stroke="#2dd4bf"
                    fill="url(#roiFill)"
                    name="Pool"
                  />
                  <Line
                    type="monotone"
                    dataKey="budget"
                    stroke="#94a3b8"
                    dot={false}
                    name="Budget"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted">
                Refresh to start history
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
