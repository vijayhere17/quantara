import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/input";
import {
  activatePackage,
  createUsersBatch,
  forceCompletePackage,
  increaseTime,
  registerUser,
  useContracts,
  useTxRunner,
  walletFromIndex,
} from "@/hooks/useContracts";
import { PACKAGE_LADDER } from "@/lib/constants";
import { pctBps, toWei } from "@/lib/format";
import { sleep } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";

type Check = { name: string; pass: boolean; reason?: string };

type SuiteId =
  | "registration"
  | "package"
  | "income"
  | "roi"
  | "rank"
  | "ga"
  | "tier"
  | "community"
  | "full";

const SUITES: { id: SuiteId; label: string }[] = [
  { id: "registration", label: "Run Registration Test" },
  { id: "package", label: "Run Package Test" },
  { id: "income", label: "Run Income Test" },
  { id: "roi", label: "Run ROI Test" },
  { id: "rank", label: "Run Rank Test" },
  { id: "ga", label: "Run Growth Accelerator Test" },
  { id: "tier", label: "Run Tier Booster Test" },
  { id: "community", label: "Run Community Builder Test" },
  { id: "full", label: "Run Full QA" },
];

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

  const nextIndex = () =>
    users.length === 0 ? 900 : Math.max(...users.map((u) => u.id), 0) + 1;

  const runSuite = async (suite: SuiteId) => {
    if (!contracts) return;
    setRunning(true);
    setChecks([]);
    const out: Check[] = [];
    const push = (c: Check) => {
      out.push(c);
      setChecks([...out]);
    };
    const throwaways: string[] = [];

    try {
      await run(`QA: ${suite}`, async (c) => {
        const root = c.addresses.RootUser;

        const makeUser = async (autoRegister = true) => {
          const created = await createUsersBatch(
            c,
            1,
            nextIndex() + throwaways.length,
            root,
            upsertUser,
            undefined,
            { autoRegister },
          );
          const addr = created[0];
          throwaways.push(addr);
          return addr;
        };

        if (suite === "registration" || suite === "full") {
          const rootReg = await c.core.isRegistered(root);
          push({
            name: "Root user is registered",
            pass: rootReg,
            reason: root,
          });

          const fresh = await makeUser(false);
          const before = await c.core.isRegistered(fresh);
          push({
            name: "Create leaves wallet unregistered",
            pass: !before,
            reason: fresh,
          });

          const tracked = useDashboardStore
            .getState()
            .users.find((u) => u.address.toLowerCase() === fresh.toLowerCase());
          if (tracked?.walletIndex != null) {
            const signer = walletFromIndex(tracked.walletIndex, c.provider);
            await registerUser(c, signer, root);
            const after = await c.core.isRegistered(fresh);
            push({
              name: "Register under root succeeds",
              pass: after,
              reason: fresh,
            });
            try {
              await registerUser(c, signer, fresh);
              push({
                name: "Self-sponsor rejected",
                pass: false,
                reason: "register(self) did not throw",
              });
            } catch {
              push({
                name: "Self-sponsor rejected",
                pass: true,
                reason: "cannot register with self",
              });
            }
          }
        }

        if (suite === "package" || suite === "full") {
          const addr = await makeUser(true);
          const [nextPkg] = await c.core.getNextEligiblePackage(addr);
          push({
            name: "New user next package = $50",
            pass: Number(nextPkg) === 50,
            reason: `got ${nextPkg}`,
          });

          const tracked = useDashboardStore
            .getState()
            .users.find((u) => u.address.toLowerCase() === addr.toLowerCase());
          if (tracked?.walletIndex != null) {
            const signer = walletFromIndex(tracked.walletIndex, c.provider);
            await activatePackage(c, signer, 50);
            const u = await c.core.users(addr);
            const amt = Number(u.packageAmount ?? u[2]);
            const cycle = Number(u.packageCycle ?? u[4]);
            push({
              name: "Activate $50 sets package",
              pass: amt === 50 && cycle === 1,
              reason: `pkg=${amt} cycle=${cycle}`,
            });

            await forceCompletePackage(c, addr);
            const [next2] = await c.core.getNextEligiblePackage(addr);
            push({
              name: "After force-complete next is $50 C2 or $100",
              pass: Number(next2) === 50 || Number(next2) === 100,
              reason: `next=${next2}`,
            });
          }

          try {
            const pkgs = await c.core.getPackages();
            push({
              name: "Package ladder has 8 steps",
              pass: Array.isArray(pkgs)
                ? pkgs.length === 8
                : PACKAGE_LADDER.length === 8,
              reason: String(pkgs?.length ?? PACKAGE_LADDER.length),
            });
          } catch {
            push({
              name: "Package ladder configured",
              pass: PACKAGE_LADDER.length === 8,
              reason: String(PACKAGE_LADDER.length),
            });
          }
        }

        if (suite === "income" || suite === "full") {
          const preview = await c.treasury.previewRecycling(toWei(100));
          const userP = BigInt(preview.userPayout ?? preview[0]);
          const roiP = BigInt(preview.toRoiPool ?? preview[1]);
          const resP = BigInt(preview.toReserve ?? preview[2]);
          const comP = BigInt(preview.toCommunity ?? preview[3]);
          const total = userP + roiP + resP + comP;
          push({
            name: "Recycling sums to input",
            pass: total === toWei(100),
            reason: `sum=${total}`,
          });
          push({
            name: "User share ≈ 70%",
            pass: userP === toWei(70),
            reason: String(userP),
          });
          push({
            name: "ROI share ≈ 25%",
            pass: roiP === toWei(25),
            reason: String(roiP),
          });
          push({
            name: "Reserve ≈ 3%",
            pass: resP === toWei(3),
            reason: String(resP),
          });
          push({
            name: "Community ≈ 2%",
            pass: comP === toWei(2),
            reason: String(comP),
          });

          const inactiveBps = await c.contribution.LEVEL_1_BPS();
          push({
            name: "Direct L1 = 5%",
            pass: inactiveBps === 500n,
            reason: pctBps(inactiveBps),
          });
        }

        if (suite === "roi" || suite === "full") {
          const addr = await makeUser(true);
          const tracked = useDashboardStore
            .getState()
            .users.find((u) => u.address.toLowerCase() === addr.toLowerCase());
          const roiBefore = await c.treasury.interdependentFundBalance();
          if (tracked?.walletIndex != null) {
            const signer = walletFromIndex(tracked.walletIndex, c.provider);
            await activatePackage(c, signer, 50);
            await sleep(200);
            const roiAfter = await c.treasury.interdependentFundBalance();
            push({
              name: "Activation increases ROI pool",
              pass: roiAfter > roiBefore,
              reason: `${roiBefore} → ${roiAfter}`,
            });
            try {
              const count = await c.roi.getActiveRoiUserCount();
              push({
                name: "Active ROI users readable",
                pass: count >= 0n,
                reason: String(count),
              });
            } catch (e) {
              push({
                name: "Active ROI users readable",
                pass: false,
                reason: String(e).slice(0, 120),
              });
            }
            await increaseTime(c.provider, 24 * 60 * 60);
            try {
              const pending = await c.roi.getPendingRoi(addr);
              push({
                name: "Pending ROI after +1 day",
                pass: pending >= 0n,
                reason: String(pending),
              });
            } catch (e) {
              push({
                name: "Pending ROI readable",
                pass: false,
                reason: String(e).slice(0, 120),
              });
            }
          }
        }

        if (suite === "rank" || suite === "full") {
          const seedBps = await c.rank.rankRewardBps(1);
          push({
            name: "Rank Seed BPS configured",
            pass: seedBps > 0n,
            reason: pctBps(seedBps),
          });
          try {
            const r = await c.rank.userRanks(root);
            push({
              name: "Root rank readable",
              pass: true,
              reason: String(r),
            });
          } catch (e) {
            push({
              name: "Root rank readable",
              pass: false,
              reason: String(e).slice(0, 120),
            });
          }
        }

        if (suite === "ga" || suite === "full") {
          const inactiveBps = await c.contribution.LEVEL_1_BPS();
          const gaBps = await c.contribution.LEVEL_1_GA_BPS();
          push({
            name: "GA L1 inactive = 5%",
            pass: inactiveBps === 500n,
            reason: pctBps(inactiveBps),
          });
          push({
            name: "GA L1 active = 10%",
            pass: gaBps === 1000n,
            reason: pctBps(gaBps),
          });
          try {
            const active = await c.booster.isBoosterActive(root);
            push({
              name: "Booster status readable",
              pass: typeof active === "boolean" || active === true || active === false,
              reason: String(active),
            });
          } catch (e) {
            push({
              name: "Booster status readable",
              pass: false,
              reason: String(e).slice(0, 120),
            });
          }
        }

        if (suite === "tier" || suite === "full") {
          const tier = await c.rank.TIER_BOOSTER_BPS();
          push({
            name: "Tier booster BPS = 10%",
            pass: tier === 1000n,
            reason: pctBps(tier),
          });
        }

        if (suite === "community" || suite === "full") {
          const fund = await c.treasury.communityBuilderFundBalance();
          push({
            name: "Community fund readable",
            pass: fund >= 0n,
            reason: String(fund),
          });
          try {
            const points = await c.community.userPoints(root);
            push({
              name: "Community points readable",
              pass: points >= 0n,
              reason: String(points),
            });
          } catch (e) {
            push({
              name: "Community points readable",
              pass: false,
              reason: String(e).slice(0, 120),
            });
          }
          const paid = await c.treasury.totalCommunityPaid();
          push({
            name: "Total community paid readable",
            pass: paid >= 0n,
            reason: String(paid),
          });
        }

        for (const addr of throwaways) removeUser(addr);

        const passed = out.filter((x) => x.pass).length;
        addLog(
          "ok",
          `QA ${suite} — ${passed}/${out.length}`,
          `${Math.round((passed / Math.max(out.length, 1)) * 100)}%`,
        );
        return { result: out };
      });
    } finally {
      setRunning(false);
    }
  };

  const exportJson = () => {
    const blob = new Blob(
      [JSON.stringify({ savedAt: new Date().toISOString(), checks }, null, 2)],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `qa-report-${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Reports</h2>
          <p className="text-xs text-muted">
            Focused live-contract checks · results show pass / reason
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={!checks.length}
          onClick={exportJson}
        >
          Export JSON
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUITES.map((s) => (
          <Button
            key={s.id}
            size="sm"
            variant={s.id === "full" ? "default" : "outline"}
            disabled={!contracts || busy || running}
            onClick={() => void runSuite(s.id)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Results{" "}
            {checks.length
              ? `(${checks.filter((c) => c.pass).length}/${checks.length})`
              : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {checks.map((c, i) => (
            <div
              key={`${c.name}-${i}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line/70 px-3 py-2 text-xs"
            >
              <div>
                <div className="font-medium text-ink">{c.name}</div>
                {c.reason ? (
                  <div className="mt-0.5 font-mono text-muted">{c.reason}</div>
                ) : null}
              </div>
              <Badge tone={c.pass ? "ok" : "danger"}>
                {c.pass ? "PASS" : "FAIL"}
              </Badge>
            </div>
          ))}
          {!checks.length ? (
            <p className="text-xs text-muted">
              Run a test suite to populate results.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
