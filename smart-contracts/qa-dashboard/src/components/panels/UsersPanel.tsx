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

const BATCHES = [1, 10, 50] as const;

function statusLabel(row?: UserRow) {
  if (!row) return "—";
  if (!row.registered) return "Wallet only";
  if (row.packageAmount > 0) return "Active";
  return "Registered";
}

function statusTone(row?: UserRow): "default" | "ok" | "warn" | "accent" {
  if (!row || !row.registered) return "warn";
  if (row.packageAmount > 0) return "ok";
  return "accent";
}

export function UsersPanel() {
  const contracts = useContracts();
  const { run } = useTxRunner();
  const users = useDashboardStore((s) => s.users);
  const selectedUser = useDashboardStore((s) => s.selectedUser);
  const setSelectedUser = useDashboardStore((s) => s.setSelectedUser);
  const setDetailsUser = useDashboardStore((s) => s.setDetailsUser);
  const upsertUser = useDashboardStore((s) => s.upsertUser);
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

  /** Sponsor for a new/target user — never self. */
  const resolveSponsor = (forAddress?: string) => {
    const root = contracts?.addresses.RootUser || "";
    if (
      selectedUser &&
      (!forAddress || selectedUser.toLowerCase() !== forAddress.toLowerCase())
    ) {
      const sel = rows[selectedUser.toLowerCase()];
      if (sel?.registered || selectedUser.toLowerCase() === root.toLowerCase()) {
        return selectedUser;
      }
    }
    return root;
  };

  const onCreate = async (count: number) => {
    await run(`Create ${count} user(s)`, async (c) => {
      const sponsor = resolveSponsor();
      const created = await createUsersBatch(
        c,
        count,
        nextStartIndex(),
        sponsor,
        upsertUser,
        undefined,
        { autoRegister: false },
      );
      if (created.length) {
        setSelectedUser(created[created.length - 1]);
      }
      return { result: created };
    });
  };

  const signerFor = async (
    c: NonNullable<typeof contracts>,
    address: string,
    walletIndex?: number,
  ) => {
    if (walletIndex != null) return walletFromIndex(walletIndex, c.provider);
    return getSignerFor(c, address);
  };

  const onRegister = async (address: string, walletIndex?: number) => {
    setSelectedUser(address);
    await run(`Register ${shortAddr(address)}`, async (c) => {
      const signer = await signerFor(c, address, walletIndex);
      const sponsor = resolveSponsor(address) || c.addresses.RootUser;
      const out = await registerUser(c, signer, sponsor);
      if (out.already) {
        addLog("warn", "Already registered on-chain", address);
      }
      return out;
    });
  };

  const onActivate = async (address: string, walletIndex?: number) => {
    setSelectedUser(address);
    await run(`Activate ${shortAddr(address)}`, async (c) => {
      const signer = await signerFor(c, address, walletIndex);
      let row = await loadUserRow(c, address);
      if (!row.registered) {
        const sponsor = resolveSponsor(address) || c.addresses.RootUser;
        await registerUser(c, signer, sponsor);
        row = await loadUserRow(c, address);
      }
      const amount = row.nextPackage || 50;
      return activatePackage(c, signer, amount);
    });
  };

  const onUpgrade = async (address: string, walletIndex?: number) => {
    setSelectedUser(address);
    await run(`Upgrade ${shortAddr(address)}`, async (c) => {
      const row = await loadUserRow(c, address);
      if (!row.registered) throw new Error("Register first");
      if (row.packageAmount > 0 && !row.packageCompleted) {
        await forceCompletePackage(c, address);
      }
      const [nextPkg] = await c.core.getNextEligiblePackage(address);
      const amount = Number(nextPkg);
      if (!amount) throw new Error("No next package");
      const signer = await signerFor(c, address, walletIndex);
      return activatePackage(c, signer, amount);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Users</h2>
          <p className="text-xs text-muted max-w-xl">
            Testing flow:{" "}
            <span className="text-accent">1. Create</span> (wallet only) →{" "}
            <span className="text-accent">2. Register</span> (sponsor never self)
            → <span className="text-accent">3. Activate</span> package.
          </p>
          <p className="text-xs text-muted mt-1">
            Default sponsor: {shortAddr(resolveSponsor()) || "Root"} ·{" "}
            {loadingRows ? "Loading…" : `${users.length} tracked`}
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
          <table className="w-full min-w-[1200px] text-left text-xs">
            <thead className="text-muted border-b border-line">
              <tr>
                <th className="py-2 pr-2">User</th>
                <th className="py-2 pr-2">Sponsor</th>
                <th className="py-2 pr-2">Package</th>
                <th className="py-2 pr-2">Package Progress</th>
                <th className="py-2 pr-2">Rank</th>
                <th className="py-2 pr-2">Directs</th>
                <th className="py-2 pr-2">BV</th>
                <th className="py-2 pr-2">Total Income</th>
                <th className="py-2 pr-2">Withdrawable</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const row = rows[u.address.toLowerCase()];
                const selected =
                  selectedUser?.toLowerCase() === u.address.toLowerCase();
                const registered = Boolean(row?.registered);
                const hasPackage = (row?.packageAmount ?? 0) > 0;
                const isRoot =
                  u.address.toLowerCase() ===
                  contracts?.addresses.RootUser?.toLowerCase();
                const showActivate =
                  !isRoot &&
                  (!registered ||
                    row?.nextPackage === 50 ||
                    !hasPackage ||
                    (row?.packageAmount ?? 0) === 0);

                return (
                  <tr
                    key={u.address}
                    className={cn(
                      "border-b border-line/60 hover:bg-surface-3/50 cursor-pointer",
                      selected && "bg-accent/10",
                    )}
                    onClick={() => setSelectedUser(u.address)}
                  >
                    <td className="py-2 pr-2">
                      <div className="font-medium text-ink">
                        {u.label || (isRoot ? "Root" : `User ${u.id}`)}
                      </div>
                      <div className="font-mono text-muted">
                        {shortAddr(u.address, 3)}
                      </div>
                    </td>
                    <td className="py-2 pr-2 font-mono">
                      {registered
                        ? shortAddr(row?.sponsor || u.sponsor)
                        : shortAddr(u.sponsor || resolveSponsor(u.address))}
                    </td>
                    <td className="py-2 pr-2">
                      {registered
                        ? hasPackage
                          ? fmtUsd(row!.packageAmount)
                          : "None"
                        : "—"}
                    </td>
                    <td className="py-2 pr-2">
                      {registered && hasPackage ? (
                        <>
                          <div>
                            {row!.packageCycle} / 2
                            {row!.packageCompleted ? " ✓" : ""}
                          </div>
                          <div className="text-muted">
                            Next {fmtUsd(row!.nextPackage)} C{row!.nextCycle}
                          </div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {RANK_NAMES[row?.rank ?? 0] ?? "—"}
                    </td>
                    <td className="py-2 pr-2">{row?.directCount ?? "—"}</td>
                    <td className="py-2 pr-2 font-mono">
                      {row?.personalVolume ?? "—"}
                    </td>
                    <td className="py-2 pr-2 font-mono">
                      {row?.totalEarned ?? "—"}
                    </td>
                    <td className="py-2 pr-2 font-mono">
                      {row?.tokenBalance ?? "—"}
                    </td>
                    <td className="py-2 pr-2">
                      <Badge tone={statusTone(row)}>{statusLabel(row)}</Badge>
                    </td>
                    <td className="py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-1">
                        {!registered && !isRoot ? (
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
                        ) : null}
                        {showActivate ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busy || !contracts}
                            onClick={() =>
                              void onActivate(u.address, u.walletIndex)
                            }
                          >
                            Activate
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          disabled={busy || !contracts || !registered}
                          onClick={() =>
                            void onUpgrade(u.address, u.walletIndex)
                          }
                        >
                          Upgrade
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDetailsUser(u.address)}
                        >
                          View Details
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!users.length ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-muted">
                    No tracked users. Click Create 1 to start.
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
