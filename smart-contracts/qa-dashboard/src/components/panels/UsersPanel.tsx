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

  /** Sponsor for a new/target user — never self. */
  const resolveSponsor = (forAddress?: string) => {
    const root = contracts?.addresses.RootUser || "";
    if (
      selectedUser &&
      (!forAddress || selectedUser.toLowerCase() !== forAddress.toLowerCase())
    ) {
      // Prefer selected only if they are already registered on-chain
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

  const onActivate50 = async (address: string, walletIndex?: number) => {
    setSelectedUser(address);
    await run(`Activate $50 ${shortAddr(address)}`, async (c) => {
      const signer = await signerFor(c, address, walletIndex);
      const registered = await c.core.isRegistered(address);
      if (!registered) {
        const sponsor = resolveSponsor(address) || c.addresses.RootUser;
        await registerUser(c, signer, sponsor);
      }
      return activatePackage(c, signer, 50);
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

  const onDelete = (address: string) => {
    removeUser(address);
    addLog("warn", "Removed user from local list", address);
  };

  const onResetUser = (address: string) => {
    removeUser(address);
    addLog(
      "warn",
      "Reset user (local only)",
      `${address} — on-chain state unchanged; redeploy to clear chain`,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Users</h2>
          <p className="text-xs text-muted max-w-xl">
            Flow: <span className="text-accent">Create</span> (wallet only) →{" "}
            <span className="text-accent">Register</span> (sponsor = Root unless
            another registered user is selected) →{" "}
            <span className="text-accent">Activate $50</span> → check Packages /
            Overview.
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
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead className="text-muted border-b border-line">
              <tr>
                <th className="py-2 pr-2">ID</th>
                <th className="py-2 pr-2">Wallet</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 pr-2">Sponsor</th>
                <th className="py-2 pr-2">Package</th>
                <th className="py-2 pr-2">Next</th>
                <th className="py-2 pr-2">Rank</th>
                <th className="py-2 pr-2">Directs</th>
                <th className="py-2 pr-2">Self ROI</th>
                <th className="py-2 pr-2">Balance</th>
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
                      {u.label || isRoot ? (
                        <Badge className="ml-1" tone="accent">
                          {u.label || "Root"}
                        </Badge>
                      ) : null}
                    </td>
                    <td className="py-2 pr-2">
                      {!row ? (
                        <Badge>—</Badge>
                      ) : registered ? (
                        <Badge tone="ok">Registered</Badge>
                      ) : (
                        <Badge tone="warn">Wallet only</Badge>
                      )}
                    </td>
                    <td className="py-2 pr-2 font-mono">
                      {registered
                        ? shortAddr(row?.sponsor || u.sponsor)
                        : shortAddr(u.sponsor || resolveSponsor(u.address))}
                    </td>
                    <td className="py-2 pr-2">
                      {registered
                        ? hasPackage
                          ? `${fmtUsd(row!.packageAmount)} C${row!.packageCycle}${
                              row!.packageCompleted ? " ✓" : ""
                            }`
                          : "None"
                        : "—"}
                    </td>
                    <td className="py-2 pr-2 font-mono">
                      {registered
                        ? `${fmtUsd(row!.nextPackage)} C${row!.nextCycle}`
                        : "—"}
                    </td>
                    <td className="py-2 pr-2">
                      {RANK_NAMES[row?.rank ?? 0] ?? "—"}
                    </td>
                    <td className="py-2 pr-2">{row?.directCount ?? "—"}</td>
                    <td className="py-2 pr-2 font-mono">{row?.roiEarned ?? "—"}</td>
                    <td className="py-2 pr-2 font-mono">
                      {row?.tokenBalance ?? "—"}
                    </td>
                    <td className="py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={
                            busy || !contracts || registered || isRoot
                          }
                          title={
                            registered
                              ? "Already registered"
                              : "Register under Root (or selected sponsor)"
                          }
                          onClick={() =>
                            void onRegister(u.address, u.walletIndex)
                          }
                        >
                          Register
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={
                            busy ||
                            !contracts ||
                            (registered &&
                              row != null &&
                              row.nextPackage !== 50)
                          }
                          title="Register if needed, then activate $50 C1"
                          onClick={() =>
                            void onActivate50(u.address, u.walletIndex)
                          }
                        >
                          Activate $50
                        </Button>
                        <Button
                          size="sm"
                          disabled={busy || !contracts || !registered}
                          title="Force-complete current package and activate next"
                          onClick={() =>
                            void onUpgrade(u.address, u.walletIndex)
                          }
                        >
                          Upgrade
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isRoot}
                          onClick={() => onDelete(u.address)}
                        >
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={isRoot}
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
