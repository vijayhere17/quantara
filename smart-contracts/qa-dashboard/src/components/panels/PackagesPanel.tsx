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
  forceCompletePackage,
  getSignerFor,
  loadUserRow,
  useContracts,
  useTxRunner,
  walletFromIndex,
} from "@/hooks/useContracts";
import { PACKAGE_LADDER } from "@/lib/constants";
import { fmtToken, fmtUsd } from "@/lib/format";
import { shortAddr } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";

type TreasurySnippet = {
  roi: string;
  charity: string;
  reserve: string;
  working: string;
};

export function PackagesPanel() {
  const contracts = useContracts();
  const { run } = useTxRunner();
  const selectedUser = useDashboardStore((s) => s.selectedUser);
  const users = useDashboardStore((s) => s.users);
  const busy = useDashboardStore((s) => s.busy);
  const tick = useDashboardStore((s) => s.refreshTick);
  const addLog = useDashboardStore((s) => s.addLog);

  const [nextPkg, setNextPkg] = useState<number | null>(null);
  const [nextCycle, setNextCycle] = useState<number | null>(null);
  const [currentPkg, setCurrentPkg] = useState(0);
  const [lastHash, setLastHash] = useState<string>("");
  const [treasury, setTreasury] = useState<TreasurySnippet | null>(null);

  const tracked = users.find(
    (u) => u.address.toLowerCase() === selectedUser?.toLowerCase(),
  );

  const refreshTreasury = useCallback(async () => {
    if (!contracts) return;
    const [roi, charity, reserve, working] = await Promise.all([
      contracts.treasury.interdependentFundBalance(),
      contracts.treasury.charityFundBalance(),
      contracts.treasury.reserveFundBalance(),
      contracts.treasury.workingFundBalance(),
    ]);
    setTreasury({
      roi: fmtToken(roi),
      charity: fmtToken(charity),
      reserve: fmtToken(reserve),
      working: fmtToken(working),
    });
  }, [contracts]);

  const refreshUser = useCallback(async () => {
    if (!contracts || !selectedUser) {
      setNextPkg(null);
      setNextCycle(null);
      setCurrentPkg(0);
      return;
    }
    try {
      const row = await loadUserRow(contracts, selectedUser);
      setCurrentPkg(row.packageAmount);
      setNextPkg(row.nextPackage);
      setNextCycle(row.nextCycle);
    } catch {
      /* */
    }
  }, [contracts, selectedUser, tick]);

  useEffect(() => {
    void refreshUser();
    void refreshTreasury();
  }, [refreshUser, refreshTreasury]);

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
    const result = await run(
      label || `Activate ${fmtUsd(amount)}`,
      async (c) => {
        const signer = await signerForSelected(c);
        const out = await activatePackage(c, signer, amount);
        setLastHash(out.hash);
        await refreshTreasury();
        return out;
      },
    );
    void result;
  };

  const doForceComplete = async () => {
    if (!selectedUser) {
      addLog("warn", "Select a user first");
      return;
    }
    await run(`Force complete ${shortAddr(selectedUser)}`, async (c) => {
      await forceCompletePackage(c, selectedUser);
      await refreshTreasury();
      return { result: true };
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Packages</h2>
        <p className="text-xs text-muted">
          Ladder {PACKAGE_LADDER.join(" → ")} · two cycles then next · after
          $10k C2 unlimited $10k
        </p>
      </div>

      {!selectedUser ? (
        <Card>
          <CardContent className="pt-4 text-sm text-muted">
            Select a user from the Users tab to manage packages.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Selected" value={shortAddr(selectedUser, 4)} />
            <StatCard
              label="Current package"
              value={currentPkg ? fmtUsd(currentPkg) : "—"}
            />
            <StatCard
              label="Next eligible"
              value={
                nextPkg != null
                  ? `${fmtUsd(nextPkg)}${nextCycle != null ? ` · C${nextCycle}` : ""}`
                  : "—"
              }
              tone="accent"
            />
            <StatCard
              label="Last tx"
              value={lastHash ? shortAddr(lastHash, 6) : "—"}
              hint={lastHash || undefined}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Activate / Top-up</CardTitle>
              <CardDescription>
                Mint + approve + activatePackage for each ladder step
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {PACKAGE_LADDER.map((amt) => (
                <Button
                  key={amt}
                  size="sm"
                  disabled={busy || !contracts}
                  variant={nextPkg === amt ? "default" : "secondary"}
                  onClick={() => void doActivate(amt)}
                >
                  {fmtUsd(amt)}
                  {nextPkg === amt ? (
                    <Badge tone="ok" className="ml-1">
                      next
                    </Badge>
                  ) : null}
                </Button>
              ))}
              <Button
                size="sm"
                variant="outline"
                disabled={busy || !contracts}
                onClick={() => void doActivate(10000, "Unlimited $10000")}
              >
                Unlimited $10000
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={busy || !contracts}
                onClick={() => void doForceComplete()}
              >
                Force Complete Package
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Treasury snippet</CardTitle>
              <CardDescription>Refreshed after each tx</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="ROI pool" value={treasury?.roi ?? "—"} />
                <StatCard label="Charity" value={treasury?.charity ?? "—"} />
                <StatCard label="Reserve" value={treasury?.reserve ?? "—"} />
                <StatCard label="Working" value={treasury?.working ?? "—"} />
              </div>
              {lastHash ? (
                <p className="mt-3 text-xs font-mono text-muted break-all">
                  Hash: {lastHash}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
