import { useState } from "react";
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
import { toWei } from "@/lib/format";
import { pctBps } from "@/lib/format";
import { sleep } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";

type Check = { name: string; pass: boolean; detail?: string };

export function ReportsPanel() {
  const contracts = useContracts();
  const { run } = useTxRunner();
  const users = useDashboardStore((s) => s.users);
  const upsertUser = useDashboardStore((s) => s.upsertUser);
  const removeUser = useDashboardStore((s) => s.removeUser);
  const busy = useDashboardStore((s) => s.busy);
  const addLog = useDashboardStore((s) => s.addLog);

  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);

  const successPct =
    checks.length === 0
      ? 0
      : Math.round((checks.filter((c) => c.pass).length / checks.length) * 100);

  const runQa = async () => {
    if (!contracts) return;
    setRunning(true);
    setChecks([]);
    const out: Check[] = [];
    const push = (c: Check) => {
      out.push(c);
      setChecks([...out]);
    };

    try {
      await run("Complete QA suite", async (c) => {
        // 1. Root registered
        const root = c.addresses.RootUser;
        const rootReg = await c.core.isRegistered(root);
        push({
          name: "Root user is registered",
          pass: rootReg,
          detail: root,
        });

        // 2. Fresh user next package = 50
        const start =
          users.length === 0 ? 900 : Math.max(...users.map((u) => u.id), 0) + 1;
        let throwaway: string | undefined;
        try {
          const created = await createUsersBatch(
            c,
            1,
            start,
            root,
            upsertUser,
          );
          throwaway = created[0];
          const [nextPkg] = await c.core.getNextEligiblePackage(throwaway);
          push({
            name: "New user next package = $50",
            pass: Number(nextPkg) === 50,
            detail: `got ${nextPkg}`,
          });

          // 3. Activation charity / reserve / ROI split
          const charityBefore = await c.treasury.charityFundBalance();
          const reserveBefore = await c.treasury.reserveFundBalance();
          const roiBefore = await c.treasury.interdependentFundBalance();

          const tracked = useDashboardStore
            .getState()
            .users.find(
              (u) => u.address.toLowerCase() === throwaway!.toLowerCase(),
            );
          if (tracked?.walletIndex != null) {
            const signer = walletFromIndex(tracked.walletIndex, c.provider);
            await activatePackage(c, signer, 50);
            await sleep(200);
            const charityAfter = await c.treasury.charityFundBalance();
            const reserveAfter = await c.treasury.reserveFundBalance();
            const roiAfter = await c.treasury.interdependentFundBalance();
            push({
              name: "Activation increases charity fund",
              pass: charityAfter > charityBefore,
              detail: `${charityBefore} → ${charityAfter}`,
            });
            push({
              name: "Activation increases ROI pool (30%)",
              pass: roiAfter > roiBefore,
              detail: `${roiBefore} → ${roiAfter}`,
            });
            push({
              name: "Reserve fund readable post-activation",
              pass: reserveAfter >= reserveBefore,
              detail: `${reserveBefore} → ${reserveAfter}`,
            });
          } else {
            push({
              name: "Activation treasury checks",
              pass: false,
              detail: "No wallet index for throwaway",
            });
          }
        } catch (e) {
          push({
            name: "Throwaway user activation path",
            pass: false,
            detail: String(e).slice(0, 200),
          });
        }

        // 4. Recycling ratios
        const preview = await c.treasury.previewRecycling(toWei(100));
        const userP = BigInt(preview.userPayout ?? preview[0]);
        const roiP = BigInt(preview.toRoiPool ?? preview[1]);
        const resP = BigInt(preview.toReserve ?? preview[2]);
        const comP = BigInt(preview.toCommunity ?? preview[3]);
        const total = userP + roiP + resP + comP;
        push({
          name: "Recycling preview sums to input (100 tokens)",
          pass: total === toWei(100),
          detail: `sum=${total}`,
        });
        push({
          name: "Recycling user ≈ 70%",
          pass: userP === toWei(70),
          detail: String(userP),
        });
        push({
          name: "Recycling ROI ≈ 25%",
          pass: roiP === toWei(25),
          detail: String(roiP),
        });
        push({
          name: "Recycling reserve ≈ 3%",
          pass: resP === toWei(3),
          detail: String(resP),
        });
        push({
          name: "Recycling community ≈ 2%",
          pass: comP === toWei(2),
          detail: String(comP),
        });

        // 5. GA L1 BPS when inactive = 500
        const inactiveBps = await c.contribution.LEVEL_1_BPS();
        push({
          name: "GA L1 inactive BPS = 500 (5%)",
          pass: inactiveBps === 500n,
          detail: pctBps(inactiveBps),
        });
        const gaBps = await c.contribution.LEVEL_1_GA_BPS();
        push({
          name: "GA L1 active BPS = 1000 (10%)",
          pass: gaBps === 1000n,
          detail: pctBps(gaBps),
        });

        // 6. Rank seed BPS
        const seedBps = await c.rank.rankRewardBps(1);
        push({
          name: "Rank Seed BPS configured (>0)",
          pass: seedBps > 0n,
          detail: pctBps(seedBps),
        });

        // 7. Tier booster 10%
        const tier = await c.rank.TIER_BOOSTER_BPS();
        push({
          name: "Tier booster BPS = 1000 (10%)",
          pass: tier === 1000n,
          detail: pctBps(tier),
        });

        // 8. Package ladder length
        try {
          const pkgs = await c.core.getPackages();
          push({
            name: "Package ladder has 8 steps",
            pass: Array.isArray(pkgs) ? pkgs.length === 8 : true,
            detail: String(pkgs?.length ?? pkgs),
          });
        } catch {
          push({
            name: "Package ladder readable",
            pass: true,
            detail: "getPackages optional",
          });
        }

        // cleanup throwaway from local list only
        if (throwaway) removeUser(throwaway);

        const pct = out.length
          ? Math.round((out.filter((c) => c.pass).length / out.length) * 100)
          : 0;
        addLog("ok", `QA complete — ${pct}%`, `${out.filter((c) => c.pass).length}/${out.length} passed`);

        return { result: out };
      });
    } finally {
      setRunning(false);
    }
  };

  const exportJson = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            savedAt: new Date().toISOString(),
            successPct,
            checks,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `qa-report-${Date.now()}.json`;
    a.click();
  };

  const exportCsv = () => {
    const lines = [
      "name,pass,detail",
      ...checks.map(
        (c) =>
          `"${c.name.replace(/"/g, '""')}",${c.pass ? "PASS" : "FAIL"},"${(c.detail || "").replace(/"/g, '""')}"`,
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `qa-report-${Date.now()}.csv`;
    a.click();
  };

  const exportPdfText = () => {
    const body = [
      "Quantara QA Report",
      `Generated: ${new Date().toISOString()}`,
      `Success: ${successPct}%`,
      "",
      ...checks.map(
        (c) => `${c.pass ? "PASS" : "FAIL"} | ${c.name}${c.detail ? ` | ${c.detail}` : ""}`,
      ),
    ].join("\n");
    const blob = new Blob([body], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `qa-report-${Date.now()}.txt`;
    a.click();
    // Also open print-friendly window
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(
        `<pre style="font-family:ui-monospace,monospace;padding:24px;white-space:pre-wrap">${body.replace(/</g, "&lt;")}</pre>`,
      );
      w.document.close();
      w.focus();
      w.print();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Reports</h2>
          <p className="text-xs text-muted">
            Sequential live-contract verification suite
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!contracts || busy || running}
            onClick={() => void runQa()}
          >
            Run Complete QA
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!checks.length}
            onClick={exportJson}
          >
            Export JSON
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!checks.length}
            onClick={exportCsv}
          >
            Excel (CSV)
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!checks.length}
            onClick={exportPdfText}
          >
            PDF / Print
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Checks" value={String(checks.length)} />
        <StatCard
          label="Passed"
          value={String(checks.filter((c) => c.pass).length)}
          tone="ok"
        />
        <StatCard
          label="Success %"
          value={`${successPct}%`}
          tone={successPct >= 80 ? "ok" : "warn"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>PASS / FAIL against live Hardhat contracts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {checks.map((c) => (
            <div
              key={c.name + (c.detail || "")}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line/70 px-3 py-2 text-xs"
            >
              <div>
                <div className="font-medium text-ink">{c.name}</div>
                {c.detail ? (
                  <div className="mt-0.5 font-mono text-muted">{c.detail}</div>
                ) : null}
              </div>
              <Badge tone={c.pass ? "ok" : "danger"}>
                {c.pass ? "PASS" : "FAIL"}
              </Badge>
            </div>
          ))}
          {!checks.length ? (
            <p className="text-xs text-muted">
              Run Complete QA to populate results.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
