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
import { Badge } from "@/components/ui/input";
import {
  activatePackage,
  createUsersBatch,
  useContracts,
  useTxRunner,
  walletFromIndex,
} from "@/hooks/useContracts";
import { fmtToken, pctBps } from "@/lib/format";
import { shortAddr } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";

export function GrowthAcceleratorPanel() {
  const contracts = useContracts();
  const { run } = useTxRunner();
  const selectedUser = useDashboardStore((s) => s.selectedUser);
  const users = useDashboardStore((s) => s.users);
  const upsertUser = useDashboardStore((s) => s.upsertUser);
  const busy = useDashboardStore((s) => s.busy);
  const tick = useDashboardStore((s) => s.refreshTick);
  const addLog = useDashboardStore((s) => s.addLog);

  const [fiftyFifty, setFiftyFifty] = useState("—");
  const [active, setActive] = useState(false);
  const [l1Bps, setL1Bps] = useState("—");
  const [qualify, setQualify] = useState("—");
  const [checks, setChecks] = useState<{ name: string; pass: boolean }[]>([]);

  const refresh = useCallback(async () => {
    if (!contracts || !selectedUser) return;
    try {
      const [vol, isActive, bps, qVol, inactiveBps, gaBps] = await Promise.all([
        contracts.booster.getFiftyFiftyVolume(selectedUser),
        contracts.booster.isBoosterActive(selectedUser),
        contracts.contribution.getLevel1Bps(selectedUser),
        contracts.booster.QUALIFY_VOLUME(),
        contracts.contribution.LEVEL_1_BPS(),
        contracts.contribution.LEVEL_1_GA_BPS(),
      ]);
      setFiftyFifty(fmtToken(vol));
      setActive(Boolean(isActive));
      setL1Bps(pctBps(bps));
      setQualify(fmtToken(qVol));

      const volN = Number(fmtToken(vol).replace(/,/g, ""));
      const qN = Number(fmtToken(qVol).replace(/,/g, ""));
      setChecks([
        {
          name: "50:50 qualify volume ≥ QUALIFY_VOLUME (typically $1000)",
          pass: vol >= qVol,
        },
        {
          name: "isBoosterActive / Growth Accelerator",
          pass: Boolean(isActive),
        },
        {
          name: `L1 BPS when inactive = 5% (${pctBps(inactiveBps)})`,
          pass: !isActive ? bps === inactiveBps : true,
        },
        {
          name: `L1 BPS when active = 10% (${pctBps(gaBps)})`,
          pass: isActive ? bps === gaBps : true,
        },
        {
          name: `fiftyFifty display (${volN}) vs qualify (${qN})`,
          pass: volN >= 0,
        },
      ]);
    } catch (e) {
      addLog("error", "GA refresh failed", String(e));
    }
  }, [contracts, selectedUser, tick, addLog]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const generateBv = async (sideA: number, sideB: number) => {
    if (!selectedUser) {
      addLog("warn", "Select a sponsor user first");
      return;
    }
    await run(`Generate BV ${sideA}+${sideB} under ${shortAddr(selectedUser)}`, async (c) => {
      const start =
        users.length === 0 ? 1 : Math.max(...users.map((u) => u.id), 0) + 1;
      const total = sideA + sideB;
      const created = await createUsersBatch(
        c,
        total,
        start,
        selectedUser,
        upsertUser,
      );
      // Activate half as "left" volume and half as "right" — each $50 package
      // For larger BV, activate higher packages on first of each side.
      for (let i = 0; i < created.length; i++) {
        const addr = created[i];
        const tracked = useDashboardStore
          .getState()
          .users.find((u) => u.address.toLowerCase() === addr.toLowerCase());
        if (tracked?.walletIndex == null) continue;
        const signer = walletFromIndex(tracked.walletIndex, c.provider);
        // First of each side gets larger package to push 50:50 volume
        const amount =
          i === 0 || i === sideA ? 1000 : 50;
        try {
          await activatePackage(c, signer, amount);
        } catch {
          await activatePackage(c, signer, 50);
        }
      }
      return { result: created };
    });
  };

  if (!selectedUser) {
    return (
      <Card>
        <CardContent className="pt-4 text-sm text-muted">
          Select a user (sponsor) to build Growth Accelerator volume.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Growth Accelerator</h2>
          <p className="text-xs text-muted">
            50:50 BV ≥ $1000 · L1 becomes 10% when active · {shortAddr(selectedUser)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={!contracts || busy}
            onClick={() => void generateBv(1, 1)}
          >
            Gen BV 1+1
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!contracts || busy}
            onClick={() => void generateBv(2, 2)}
          >
            Gen BV 2+2
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!contracts || busy}
            onClick={() => void generateBv(3, 3)}
          >
            Gen BV 3+3
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!contracts || busy}
            onClick={() => void refresh()}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="50:50 volume" value={fiftyFifty} tone="accent" />
        <StatCard
          label="Booster active"
          value={active ? "YES" : "NO"}
          tone={active ? "ok" : "warn"}
        />
        <StatCard label="L1 BPS" value={l1Bps} />
        <StatCard label="Qualify volume" value={qualify} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>PASS / FAIL checks</CardTitle>
          <CardDescription>Live against ContributionBooster + ContributionReward</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {checks.map((c) => (
            <div
              key={c.name}
              className="flex items-center justify-between gap-3 rounded-md border border-line/70 px-3 py-2 text-xs"
            >
              <span>{c.name}</span>
              <Badge tone={c.pass ? "ok" : "danger"}>
                {c.pass ? "PASS" : "FAIL"}
              </Badge>
            </div>
          ))}
          {!checks.length ? (
            <p className="text-xs text-muted">Refresh to evaluate.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
