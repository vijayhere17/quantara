import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { FlowStep } from "@/components/ui/modal";
import {
  activatePackage,
  forceCompletePackage,
  getSignerFor,
  loadUserRow,
  useContracts,
  useTxRunner,
  walletFromIndex,
} from "@/hooks/useContracts";
import { PACKAGE_LADDER } from "@/lib/constants";
import { fmtUsd } from "@/lib/format";
import { shortAddr } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";

export function PackagesPanel() {
  const contracts = useContracts();
  const { run } = useTxRunner();
  const selectedUser = useDashboardStore((s) => s.selectedUser);
  const setSelectedUser = useDashboardStore((s) => s.setSelectedUser);
  const users = useDashboardStore((s) => s.users);
  const busy = useDashboardStore((s) => s.busy);
  const tick = useDashboardStore((s) => s.refreshTick);
  const addLog = useDashboardStore((s) => s.addLog);

  const [nextPkg, setNextPkg] = useState<number | null>(null);
  const [nextCycle, setNextCycle] = useState<number | null>(null);
  const [currentPkg, setCurrentPkg] = useState(0);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [registered, setRegistered] = useState(false);

  const tracked = users.find(
    (u) => u.address.toLowerCase() === selectedUser?.toLowerCase(),
  );

  const refreshUser = useCallback(async () => {
    if (!contracts || !selectedUser) {
      setNextPkg(null);
      setNextCycle(null);
      setCurrentPkg(0);
      setCurrentCycle(0);
      setCompleted(false);
      setRegistered(false);
      return;
    }
    try {
      const row = await loadUserRow(contracts, selectedUser);
      setRegistered(row.registered);
      setCurrentPkg(row.packageAmount);
      setCurrentCycle(row.packageCycle);
      setCompleted(row.packageCompleted);
      setNextPkg(row.nextPackage);
      setNextCycle(row.nextCycle);
    } catch {
      /* */
    }
  }, [contracts, selectedUser, tick]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const signerForSelected = async (c: NonNullable<typeof contracts>) => {
    if (!selectedUser) throw new Error("No selected user");
    if (tracked?.walletIndex != null) {
      return walletFromIndex(tracked.walletIndex, c.provider);
    }
    return getSignerFor(c, selectedUser);
  };

  const doActivate = async (amount: number, label?: string) => {
    if (!selectedUser) {
      addLog("warn", "Select a user first");
      return;
    }
    await run(label || `Activate ${fmtUsd(amount)}`, async (c) => {
      const signer = await signerForSelected(c);
      return activatePackage(c, signer, amount);
    });
  };

  const doUpgrade = async () => {
    if (!selectedUser) {
      addLog("warn", "Select a user first");
      return;
    }
    await run(`Upgrade ${shortAddr(selectedUser)}`, async (c) => {
      if (currentPkg > 0 && !completed) {
        await forceCompletePackage(c, selectedUser);
      }
      const [next] = await c.core.getNextEligiblePackage(selectedUser);
      const amount = Number(next);
      if (!amount) throw new Error("No next package");
      const signer = await signerForSelected(c);
      return activatePackage(c, signer, amount);
    });
  };

  const historySteps = () => {
    if (!registered || currentPkg <= 0) {
      return (
        <p className="text-xs text-muted">No package history yet.</p>
      );
    }
    const curIdx = PACKAGE_LADDER.indexOf(
      currentPkg as (typeof PACKAGE_LADDER)[number],
    );
    return (
      <div className="flex flex-col">
        {PACKAGE_LADDER.map((amt, i) => {
          const done = curIdx >= 0 && i < curIdx;
          const current = i === curIdx;
          const last = i === PACKAGE_LADDER.length - 1;
          let detail = "Locked";
          let tone: "ok" | "default" | "muted" = "muted";
          if (done) {
            detail = "Completed (C1 + C2)";
            tone = "ok";
          } else if (current) {
            detail = `C${currentCycle} / 2${completed ? " done" : ""}`;
            tone = "default";
          }
          return (
            <FlowStep
              key={amt}
              label={fmtUsd(amt)}
              detail={detail}
              tone={tone}
              last={last}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Packages</h2>
          <p className="text-xs text-muted">
            Ladder {PACKAGE_LADDER.join(" → ")} · two cycles then next
          </p>
        </div>
        <div className="w-72">
          <label className="text-[11px] uppercase tracking-wide text-muted">
            Active user
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

      {!selectedUser ? (
        <Card>
          <CardContent className="pt-4 text-sm text-muted">
            Select a user to view package progress and activate.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <div className="text-[11px] uppercase tracking-wide text-muted">
                  Current Package
                </div>
                <div className="mt-2 text-lg font-semibold font-mono">
                  {!registered
                    ? "Not registered"
                    : currentPkg
                      ? fmtUsd(currentPkg)
                      : "None"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-[11px] uppercase tracking-wide text-muted">
                  Progress
                </div>
                <div className="mt-2 text-lg font-semibold font-mono">
                  {currentPkg ? `${currentCycle} / 2` : "—"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-[11px] uppercase tracking-wide text-muted">
                  Next Package
                </div>
                <div className="mt-2 text-lg font-semibold font-mono text-accent">
                  {nextPkg != null
                    ? `${fmtUsd(nextPkg)}${nextCycle != null ? ` · C${nextCycle}` : ""}`
                    : "—"}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>{historySteps()}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={
                  busy || !contracts || !registered || nextPkg == null
                }
                onClick={() =>
                  nextPkg != null
                    ? void doActivate(nextPkg, `Activate ${fmtUsd(nextPkg)}`)
                    : undefined
                }
              >
                Activate {nextPkg != null ? fmtUsd(nextPkg) : ""}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy || !contracts || !registered}
                onClick={() => void doUpgrade()}
              >
                Upgrade
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  busy || !contracts || !registered || nextPkg !== 10000
                }
                onClick={() => void doActivate(10000, "Top-up $10000")}
              >
                Top-up
              </Button>
            </CardContent>
          </Card>

          <p className="text-xs text-muted">
            ROI pool updated after activation — see Overview.
          </p>
        </>
      )}
    </div>
  );
}
