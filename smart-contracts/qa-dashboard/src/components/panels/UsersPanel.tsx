import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/input";
import { DistributionPanel } from "@/components/DistributionPanel";
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
import {
  buildActivationDistribution,
  snapshotFunds,
} from "@/lib/distribution";
import { RANK_NAMES } from "@/lib/constants";
import { fmtUsd } from "@/lib/format";
import { cn, shortAddr } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";
import { toast } from "sonner";

const BATCHES = [1, 10, 50] as const;

function statusLabel(row?: UserRow) {
  if (!row) return "Loading…";
  if (row.loadError) return "Error";
  if (!row.registered) return "Wallet only";
  if (row.packageAmount > 0) return "Active";
  return "Registered";
}

function statusTone(row?: UserRow): "default" | "ok" | "warn" | "accent" | "danger" {
  if (!row) return "default";
  if (row.loadError) return "danger";
  if (!row.registered) return "warn";
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
  const lastDistribution = useDashboardStore((s) => s.lastDistribution);
  const setLastDistribution = useDashboardStore((s) => s.setLastDistribution);
  const resetKeepRoot = useDashboardStore((s) => s.resetKeepRoot);

  const [rows, setRows] = useState<Record<string, UserRow>>({});
  const [loadingRows, setLoadingRows] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [bulkMsg, setBulkMsg] = useState("");

  const refreshRows = useCallback(async () => {
    if (!contracts) return;
    setLoadingRows(true);
    setGlobalError("");
    try {
      const next: Record<string, UserRow> = {};
      for (const u of users) {
        const row = await loadUserRow(contracts, u.address);
        next[u.address.toLowerCase()] = row;
        if (row.loadError) setGlobalError(row.loadError);
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
      if (created.length) setSelectedUser(created[created.length - 1]);
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
      if (out.already) addLog("warn", "Already registered on-chain", address);
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
      const before = await snapshotFunds(c);
      const out = await activatePackage(c, signer, amount);
      const dist = await buildActivationDistribution(
        c,
        address,
        amount,
        before,
      );
      setLastDistribution(dist);
      setDetailsUser(address);
      return out;
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
      const before = await snapshotFunds(c);
      const out = await activatePackage(c, signer, amount);
      setLastDistribution(
        await buildActivationDistribution(c, address, amount, before),
      );
      setDetailsUser(address);
      return out;
    });
  };

  const onActivateAll = async () => {
    if (!contracts) return;
    const root = contracts.addresses.RootUser?.toLowerCase() || "";
    const targets = users.filter((u) => u.address.toLowerCase() !== root);
    if (!targets.length) {
      toast.message("Create users first");
      return;
    }
    setBulkMsg("");
    await run(`Activate All (${targets.length})`, async (c) => {
      let ok = 0;
      let skipped = 0;
      let lastAddr = "";
      for (const u of targets) {
        try {
          const signer = await signerFor(c, u.address, u.walletIndex);
          let row = await loadUserRow(c, u.address);
          if (!row.registered) {
            const sponsor = resolveSponsor(u.address) || c.addresses.RootUser;
            if (sponsor.toLowerCase() === u.address.toLowerCase()) {
              skipped += 1;
              continue;
            }
            await registerUser(c, signer, sponsor);
            row = await loadUserRow(c, u.address);
          }
          // Skip if already on an incomplete package (use Upgrade path)
          if (row.packageAmount > 0 && !row.packageCompleted) {
            skipped += 1;
            continue;
          }
          const amount = row.nextPackage || 50;
          if (!amount) {
            skipped += 1;
            continue;
          }
          const before = await snapshotFunds(c);
          await activatePackage(c, signer, amount);
          const dist = await buildActivationDistribution(
            c,
            u.address,
            amount,
            before,
          );
          setLastDistribution(dist);
          lastAddr = u.address;
          ok += 1;
        } catch (e) {
          addLog(
            "warn",
            `Activate All skipped ${shortAddr(u.address)}`,
            e instanceof Error ? e.message : String(e),
          );
          skipped += 1;
        }
      }
      if (lastAddr) {
        setSelectedUser(lastAddr);
        setDetailsUser(lastAddr);
      }
      const msg = `Activated ${ok} · skipped ${skipped}`;
      setBulkMsg(msg);
      addLog("ok", "Activate All finished", msg);
      return { result: { ok, skipped } };
    });
  };

  const onResetKeepRoot = () => {
    const root = contracts?.addresses.RootUser;
    if (!root) {
      toast.error("Root address not loaded — connect first");
      return;
    }
    if (
      !window.confirm(
        "Reset dashboard: delete all tracked users except Root, clear last distribution / logs / txs?\n\nOn-chain balances stay until you redeploy (Developer → Reset → hardhat_reset + qa:dashboard:setup).",
      )
    ) {
      return;
    }
    const removed = resetKeepRoot(root);
    setRows({});
    setBulkMsg("");
    setGlobalError("");
    addLog("warn", "Reset keep Root", `Removed ${removed} tracked user(s)`);
    toast.success(`Reset done — Root only (removed ${removed})`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Users</h2>
          <p className="text-xs text-muted max-w-2xl">
            Simple flow: <span className="text-accent">Create</span> →{" "}
            <span className="text-accent">Activate All</span> (or Activate one
            by one) → see <span className="text-accent">From → To</span>{" "}
            distribution + 70/30 recycling. Sponsor defaults to selected user or
            Root.
          </p>
          <p className="text-xs text-muted mt-1">
            Default sponsor: {shortAddr(resolveSponsor()) || "Root"} ·{" "}
            {loadingRows ? "Loading…" : `${users.length} tracked`}
            {bulkMsg ? ` · ${bulkMsg}` : ""}
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
            disabled={!contracts || busy || users.length < 2}
            onClick={() => void onActivateAll()}
            title="Register if needed, then activate next package for every non-Root user"
          >
            Activate All
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={onResetKeepRoot}
            title="Clear all tracked users except Root"
          >
            Reset (keep Root)
          </Button>
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

      {globalError ? (
        <Card className="border-danger/50">
          <CardContent className="pt-4 text-sm text-danger">{globalError}</CardContent>
        </Card>
      ) : null}

      <Card className="border-line/80">
        <CardContent className="pt-4 text-[11px] text-muted leading-relaxed">
          <strong className="text-ink">Reset income to zero on-chain:</strong>{" "}
          Reset (keep Root) clears the dashboard list. To wipe contract
          balances/income too → stop Hardhat →{" "}
          <code className="text-accent">npx hardhat node</code> →{" "}
          <code className="text-accent">npm run qa:dashboard:setup</code> →
          refresh this page.
        </CardContent>
      </Card>

      <DistributionPanel dist={lastDistribution} />

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
                <th className="py-2 pr-2">GV / Max leg</th>
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
                        ? row?.sponsor &&
                          row.sponsor !==
                            "0x0000000000000000000000000000000000000000"
                          ? shortAddr(row.sponsor)
                          : "Root / none"
                        : shortAddr(u.sponsor || resolveSponsor(u.address))}
                    </td>
                    <td className="py-2 pr-2">
                      {!row
                        ? "…"
                        : registered
                          ? hasPackage
                            ? fmtUsd(row.packageAmount)
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
                      ) : registered ? (
                        <>
                          <div>0 / 2</div>
                          <div className="text-muted">
                            Next {fmtUsd(row?.nextPackage ?? 50)} C
                            {row?.nextCycle ?? 1}
                          </div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {row ? (
                        <div>
                          <div>{RANK_NAMES[row.rank] ?? row.rank}</div>
                          {row.forcedRank ? (
                            <Badge tone="warn">QA forced</Badge>
                          ) : row.rank >= 1 ? (
                            <span className="text-[10px] text-ok">earned</span>
                          ) : null}
                        </div>
                      ) : (
                        "…"
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {row ? row.directCount : "…"}
                    </td>
                    <td className="py-2 pr-2 font-mono text-[11px]">
                      {row
                        ? `${row.groupVolumeNum} / ${row.maxLegVolume}`
                        : "…"}
                      {row && row.rank < 1 ? (
                        <div className="text-[10px] text-muted">
                          need 500 / 250
                        </div>
                      ) : null}
                    </td>
                    <td className="py-2 pr-2 font-mono">
                      {row ? row.totalEarned : "…"}
                    </td>
                    <td className="py-2 pr-2 font-mono">
                      {row ? row.tokenBalance : "…"}
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
                        {!isRoot ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={
                              busy ||
                              !contracts ||
                              (registered &&
                                hasPackage &&
                                !row?.packageCompleted)
                            }
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
