import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/input";
import {
  activatePackage,
  createUsersBatch,
  forceCompletePackage,
  getSignerFor,
  loadUserRow,
  registerUser,
  useContracts,
  useTxRunner,
  walletFromIndex,
  type UserRow,
} from "@/hooks/useContracts";
import { RANK_NAMES } from "@/lib/constants";
import { fmtUsd } from "@/lib/format";
import { cn, shortAddr } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";

const BATCHES = [1, 10, 50, 100, 500] as const;

export function UsersPanel() {
  const contracts = useContracts();
  const { run } = useTxRunner();
  const users = useDashboardStore((s) => s.users);
  const selectedUser = useDashboardStore((s) => s.selectedUser);
  const setSelectedUser = useDashboardStore((s) => s.setSelectedUser);
  const upsertUser = useDashboardStore((s) => s.upsertUser);
  const removeUser = useDashboardStore((s) => s.removeUser);
  const addLog = useDashboardStore((s) => s.addLog);
  const busy = useDashboardStore((s) => s.busy);
  const tick = useDashboardStore((s) => s.refreshTick);

  const [rows, setRows] = useState<Record<string, UserRow>>({});
  const [loadingRows, setLoadingRows] = useState(false);

  const refreshRows = useCallback(async () => {
    if (!contracts) return;
    setLoadingRows(true);
    try {
      const next: Record<string, UserRow> = {};
      for (const u of users) {
        try {
          next[u.address.toLowerCase()] = await loadUserRow(contracts, u.address);
        } catch {
          /* skip */
        }
      }
      setRows(next);
    } finally {
      setLoadingRows(false);
    }
  }, [contracts, users, tick]);

  useEffect(() => {
    void refreshRows();
  }, [refreshRows]);

  const nextStartIndex = () => {
    if (!users.length) return 1;
    return Math.max(...users.map((u) => u.id), 0) + 1;
  };

  const sponsorAddr = () =>
    selectedUser || contracts?.addresses.RootUser || "";

  const onCreate = async (count: number) => {
    await run(`Create ${count} user(s)`, async (c) => {
      const sponsor = selectedUser || c.addresses.RootUser;
      const created = await createUsersBatch(
        c,
        count,
        nextStartIndex(),
        sponsor,
        upsertUser,
      );
      return { result: created };
    });
  };

  const onRegister = async (address: string, walletIndex?: number) => {
    await run(`Register ${shortAddr(address)}`, async (c) => {
      const signer =
        walletIndex != null
          ? walletFromIndex(walletIndex, c.provider)
          : await getSignerFor(c, address);
      const sponsor = sponsorAddr() || c.addresses.RootUser;
      return registerUser(c, signer, sponsor);
    });
  };

  const onActivate50 = async (address: string, walletIndex?: number) => {
    await run(`Activate $50 ${shortAddr(address)}`, async (c) => {
      const signer =
        walletIndex != null
          ? walletFromIndex(walletIndex, c.provider)
          : await getSignerFor(c, address);
      return activatePackage(c, signer, 50);
    });
  };

  const onUpgrade = async (address: string, walletIndex?: number) => {
    await run(`Upgrade ${shortAddr(address)}`, async (c) => {
      await forceCompletePackage(c, address);
      const [nextPkg] = await c.core.getNextEligiblePackage(address);
      const amount = Number(nextPkg);
      const signer =
        walletIndex != null
          ? walletFromIndex(walletIndex, c.provider)
          : await getSignerFor(c, address);
      return activatePackage(c, signer, amount);
    });
  };

  const onDelete = (address: string) => {
    removeUser(address);
    addLog("warn", "Removed user from local list", address);
  };

  const onResetUser = (address: string) => {
    removeUser(address);
    addLog(
      "warn",
      "Reset user (local only)",
      `${address} — on-chain state unchanged; redeploy or evm_revert to clear chain`,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Users</h2>
          <p className="text-xs text-muted">
            Sponsor: {shortAddr(sponsorAddr()) || "Root"} ·{" "}
            {loadingRows ? "Loading rows…" : `${users.length} tracked`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {BATCHES.map((n) => (
            <Button
              key={n}
              size="sm"
              disabled={!contracts || busy}
              onClick={() => void onCreate(n)}
            >
              Create {n}
            </Button>
          ))}
          <Button
            size="sm"
            variant="secondary"
            disabled={!contracts || busy}
            onClick={() => void refreshRows()}
          >
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tracked users</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead className="text-muted border-b border-line">
              <tr>
                <th className="py-2 pr-2">ID</th>
                <th className="py-2 pr-2">Wallet</th>
                <th className="py-2 pr-2">Sponsor</th>
                <th className="py-2 pr-2">Package</th>
                <th className="py-2 pr-2">Rank</th>
                <th className="py-2 pr-2">Directs</th>
                <th className="py-2 pr-2">GV</th>
                <th className="py-2 pr-2">Self ROI</th>
                <th className="py-2 pr-2">Working</th>
                <th className="py-2 pr-2">Total</th>
                <th className="py-2 pr-2">Balance</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const row = rows[u.address.toLowerCase()];
                const selected =
                  selectedUser?.toLowerCase() === u.address.toLowerCase();
                return (
                  <tr
                    key={u.address}
                    className={cn(
                      "border-b border-line/60 hover:bg-surface-3/50 cursor-pointer",
                      selected && "bg-accent/10",
                    )}
                    onClick={() => setSelectedUser(u.address)}
                  >
                    <td className="py-2 pr-2 font-mono">{u.id}</td>
                    <td className="py-2 pr-2 font-mono">
                      {shortAddr(u.address, 3)}
                      {u.label ? (
                        <Badge className="ml-1" tone="accent">
                          {u.label}
                        </Badge>
                      ) : null}
                    </td>
                    <td className="py-2 pr-2 font-mono">
                      {shortAddr(row?.sponsor || u.sponsor)}
                    </td>
                    <td className="py-2 pr-2">
                      {row?.registered
                        ? `${fmtUsd(row.packageAmount)} C${row.packageCycle}`
                        : "—"}
                    </td>
                    <td className="py-2 pr-2">
                      {RANK_NAMES[row?.rank ?? 0] ?? row?.rank ?? "—"}
                    </td>
                    <td className="py-2 pr-2">{row?.directCount ?? "—"}</td>
                    <td className="py-2 pr-2 font-mono">{row?.groupVolume ?? "—"}</td>
                    <td className="py-2 pr-2 font-mono">{row?.roiEarned ?? "—"}</td>
                    <td className="py-2 pr-2 font-mono">
                      {row?.workingEarned ?? "—"}
                    </td>
                    <td className="py-2 pr-2 font-mono">{row?.totalEarned ?? "—"}</td>
                    <td className="py-2 pr-2 font-mono">
                      {row?.tokenBalance ?? "—"}
                    </td>
                    <td className="py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy || !contracts}
                          onClick={() =>
                            void onRegister(u.address, u.walletIndex)
                          }
                        >
                          Register
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy || !contracts}
                          onClick={() =>
                            void onActivate50(u.address, u.walletIndex)
                          }
                        >
                          Activate $50
                        </Button>
                        <Button
                          size="sm"
                          disabled={busy || !contracts}
                          onClick={() =>
                            void onUpgrade(u.address, u.walletIndex)
                          }
                        >
                          Upgrade
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDelete(u.address)}
                        >
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => onResetUser(u.address)}
                        >
                          Reset
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!users.length ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-muted">
                    No tracked users. Create a batch or connect to load Root.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
