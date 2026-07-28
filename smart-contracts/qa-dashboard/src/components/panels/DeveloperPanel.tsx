import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatCard,
} from "@/components/ui/card";
import { Badge, Input, Select } from "@/components/ui/input";
import {
  increaseTime,
  useContracts,
  useTxRunner,
} from "@/hooks/useContracts";
import { CHAIN_ID, RPC_URL } from "@/lib/constants";
import { fmtTs } from "@/lib/format";
import { cn, shortAddr } from "@/lib/utils";
import {
  useDashboardStore,
  type LogLevel,
  type SessionSnapshot,
} from "@/store/dashboardStore";
import type { Contract } from "ethers";

type DevTab =
  | "events"
  | "txs"
  | "logs"
  | "addresses"
  | "timetravel"
  | "reset"
  | "session";

const DEV_TABS: { id: DevTab; label: string }[] = [
  { id: "events", label: "Events" },
  { id: "txs", label: "Transactions" },
  { id: "logs", label: "Logs" },
  { id: "addresses", label: "Addresses" },
  { id: "timetravel", label: "Time Travel" },
  { id: "reset", label: "Reset" },
  { id: "session", label: "Session" },
];

const CONTRACT_KEYS = [
  "core",
  "treasury",
  "income",
  "roi",
  "contribution",
  "rank",
  "community",
] as const;

type ContractKey = (typeof CONTRACT_KEYS)[number];

type EventRow = {
  id: string;
  contract: string;
  name: string;
  args: string;
  hash: string;
  block: number;
};

const LEVEL_CLS: Record<LogLevel, string> = {
  info: "text-muted border-l-muted",
  ok: "text-ok border-l-ok",
  warn: "text-warn border-l-warn",
  error: "text-danger border-l-danger",
};

const SNAPSHOT_KEY = "quantara-evm-snapshot";

function summarizeArgs(args: unknown): string {
  try {
    if (args == null) return "";
    if (typeof args !== "object") return String(args);
    const obj = args as Record<string, unknown> & { length?: number };
    const parts: string[] = [];
    const len = typeof obj.length === "number" ? obj.length : 0;
    for (let i = 0; i < len; i++) {
      const v = (obj as unknown as unknown[])[i];
      if (typeof v === "bigint") parts.push(v.toString());
      else if (typeof v === "string") parts.push(shortAddr(v, 3));
      else parts.push(String(v));
    }
    return parts.slice(0, 6).join(", ");
  } catch {
    return "";
  }
}

export function DeveloperPanel() {
  const [tab, setTab] = useState<DevTab>("events");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Developer</h2>
        <p className="text-xs text-muted">
          Technical tools · events, txs, logs, RPC, time travel, reset
        </p>
      </div>
      <div className="flex flex-wrap gap-1">
        {DEV_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition",
              tab === t.id
                ? "bg-accent text-surface"
                : "text-muted hover:bg-surface-3 hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "events" ? <EventsSection /> : null}
      {tab === "txs" ? <TxsSection /> : null}
      {tab === "logs" ? <LogsSection /> : null}
      {tab === "addresses" ? <AddressesSection /> : null}
      {tab === "timetravel" ? <TimeTravelSection /> : null}
      {tab === "reset" ? <ResetSection /> : null}
      {tab === "session" ? <SessionSection /> : null}
    </div>
  );
}

function EventsSection() {
  const contracts = useContracts();
  const tick = useDashboardStore((s) => s.refreshTick);
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [addrFilter, setAddrFilter] = useState("");
  const [contractFilter, setContractFilter] = useState<"all" | ContractKey>(
    "all",
  );

  const load = useCallback(async () => {
    if (!contracts) return;
    setLoading(true);
    try {
      const latest = await contracts.provider.getBlockNumber();
      const from = Math.max(0, latest - 2000);
      const map: Record<ContractKey, Contract> = {
        core: contracts.core,
        treasury: contracts.treasury,
        income: contracts.income,
        roi: contracts.roi,
        contribution: contracts.contribution,
        rank: contracts.rank,
        community: contracts.community,
      };
      const keys =
        contractFilter === "all" ? [...CONTRACT_KEYS] : [contractFilter];
      const collected: EventRow[] = [];
      for (const key of keys) {
        try {
          const logs = await map[key].queryFilter("*", from, latest);
          for (const log of logs) {
            const ev = log as {
              eventName?: string;
              fragment?: { name?: string };
              args?: unknown;
              transactionHash: string;
              blockNumber: number;
              index?: number;
            };
            collected.push({
              id: `${ev.transactionHash}-${ev.index ?? collected.length}-${key}`,
              contract: key,
              name: ev.eventName || ev.fragment?.name || "Event",
              args: summarizeArgs(ev.args),
              hash: ev.transactionHash,
              block: ev.blockNumber,
            });
          }
        } catch {
          /* */
        }
      }
      collected.sort((a, b) => b.block - a.block);
      setRows(collected.slice(0, 200));
    } finally {
      setLoading(false);
    }
  }, [contracts, contractFilter, tick]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = addrFilter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.hash.toLowerCase().includes(q) ||
        r.args.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q),
    );
  }, [rows, addrFilter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted">
          Search
          <Input
            className="mt-1 w-52"
            placeholder="0x… or event"
            value={addrFilter}
            onChange={(e) => setAddrFilter(e.target.value)}
          />
        </label>
        <label className="text-xs text-muted">
          Contract
          <Select
            className="mt-1 w-40"
            value={contractFilter}
            onChange={(e) =>
              setContractFilter(e.target.value as "all" | ContractKey)
            }
          >
            <option value="all">All</option>
            {CONTRACT_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>
        </label>
        <Button
          size="sm"
          disabled={!contracts || loading}
          onClick={() => void load()}
        >
          Query
        </Button>
        <span className="text-xs text-muted">
          {loading ? "loading…" : `${filtered.length} shown`}
        </span>
      </div>
      <Card>
        <CardContent className="overflow-x-auto pt-4">
          <table className="w-full min-w-[800px] text-left text-xs">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="py-2 pr-2">Contract</th>
                <th className="py-2 pr-2">Event</th>
                <th className="py-2 pr-2">Args</th>
                <th className="py-2 pr-2">Tx</th>
                <th className="py-2">Block</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-line/50">
                  <td className="py-2 pr-2">
                    <Badge tone="accent">{r.contract}</Badge>
                  </td>
                  <td className="py-2 pr-2 font-medium">{r.name}</td>
                  <td className="py-2 pr-2 font-mono text-muted max-w-[320px] truncate">
                    {r.args || "—"}
                  </td>
                  <td className="py-2 pr-2 font-mono">
                    {shortAddr(r.hash, 5)}
                  </td>
                  <td className="py-2 font-mono">{r.block}</td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">
                    No events in range
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

function TxsSection() {
  const txs = useDashboardStore((s) => s.txs);
  const clearTxs = useDashboardStore((s) => s.clearTxs);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Session txs ({txs.length})</CardTitle>
        <Button size="sm" variant="secondary" onClick={() => clearTxs()}>
          Clear
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="py-2 pr-2">Hash</th>
              <th className="py-2 pr-2">Method</th>
              <th className="py-2 pr-2">Gas</th>
              <th className="py-2 pr-2">Status</th>
              <th className="py-2 pr-2">Time</th>
              <th className="py-2">Error</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((tx) => (
              <tr key={tx.id} className="border-b border-line/50 align-top">
                <td className="py-2 pr-2 font-mono">
                  {tx.hash ? shortAddr(tx.hash, 6) : "—"}
                </td>
                <td className="py-2 pr-2">{tx.method}</td>
                <td className="py-2 pr-2 font-mono">{tx.gasUsed ?? "—"}</td>
                <td className="py-2 pr-2">
                  <Badge
                    tone={
                      tx.status === "success"
                        ? "ok"
                        : tx.status === "failed"
                          ? "danger"
                          : "warn"
                    }
                  >
                    {tx.status}
                  </Badge>
                </td>
                <td className="py-2 pr-2 text-muted">
                  {new Date(tx.timestamp).toLocaleString()}
                </td>
                <td className="py-2 text-danger max-w-[280px] truncate">
                  {tx.error ?? ""}
                </td>
              </tr>
            ))}
            {!txs.length ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted">
                  No transactions yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function LogsSection() {
  const logs = useDashboardStore((s) => s.logs);
  const clearLogs = useDashboardStore((s) => s.clearLogs);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Logs ({logs.length})</CardTitle>
        <Button size="sm" variant="secondary" onClick={() => clearLogs()}>
          Clear
        </Button>
      </CardHeader>
      <CardContent className="max-h-[70vh] space-y-1 overflow-y-auto font-mono text-xs">
        {logs.map((l) => (
          <div
            key={l.id}
            className={cn(
              "border-l-2 bg-surface/60 px-3 py-2 rounded-r-md",
              LEVEL_CLS[l.level],
            )}
          >
            <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wider opacity-80">
              <span>{l.level}</span>
              <span>{new Date(l.at).toLocaleTimeString()}</span>
            </div>
            <div className="mt-0.5 text-ink">{l.message}</div>
            {l.detail ? (
              <div className="mt-1 break-all text-muted">{l.detail}</div>
            ) : null}
          </div>
        ))}
        {!logs.length ? (
          <p className="py-8 text-center text-muted">No logs yet</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AddressesSection() {
  const contracts = useContracts();
  const selectedUser = useDashboardStore((s) => s.selectedUser);
  const tick = useDashboardStore((s) => s.refreshTick);
  const [rawUser, setRawUser] = useState("—");
  const [chainId, setChainId] = useState(String(CHAIN_ID));

  useEffect(() => {
    if (!contracts) return;
    let cancelled = false;
    (async () => {
      try {
        const net = await contracts.provider.getNetwork();
        if (!cancelled) setChainId(String(net.chainId));
        if (selectedUser) {
          const u = await contracts.core.users(selectedUser);
          if (!cancelled) {
            setRawUser(
              JSON.stringify(
                {
                  wallet: u.wallet ?? u[0],
                  sponsor: u.sponsor ?? u[1],
                  packageAmount: String(u.packageAmount ?? u[2]),
                  packageIndex: String(u.packageIndex ?? u[3]),
                  packageCycle: String(u.packageCycle ?? u[4]),
                  joinedAt: String(u.joinedAt ?? u[5]),
                  isActive: Boolean(u.isActive ?? u[6]),
                  packageCompleted: Boolean(u.packageCompleted ?? u[7]),
                },
                null,
                2,
              ),
            );
          }
        } else if (!cancelled) {
          setRawUser("No selected user");
        }
      } catch (e) {
        if (!cancelled) setRawUser(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contracts, selectedUser, tick]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="RPC" value={RPC_URL} />
        <StatCard label="Chain ID" value={chainId} tone="accent" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Contract addresses</CardTitle>
        </CardHeader>
        <CardContent>
          {contracts ? (
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              {Object.entries(contracts.addresses).map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between gap-2 rounded-md border border-line/60 px-2 py-1.5"
                >
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-mono text-ink break-all text-right">
                    {typeof v === "string" && v.startsWith("0x")
                      ? shortAddr(v, 6)
                      : String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-xs text-muted">Not connected</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            Selected user raw{" "}
            {selectedUser ? shortAddr(selectedUser, 6) : "(none)"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-80 overflow-auto rounded-md border border-line bg-surface p-3 text-[11px] font-mono text-muted">
            {rawUser}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

function TimeTravelSection() {
  const contracts = useContracts();
  const { run } = useTxRunner();
  const busy = useDashboardStore((s) => s.busy);
  const tick = useDashboardStore((s) => s.refreshTick);
  const bumpRefresh = useDashboardStore((s) => s.bumpRefresh);
  const [timestamp, setTimestamp] = useState("—");
  const [blockNumber, setBlockNumber] = useState("—");

  const refresh = useCallback(async () => {
    if (!contracts) return;
    const block = await contracts.provider.getBlock("latest");
    setBlockNumber(String(block?.number ?? "—"));
    setTimestamp(block?.timestamp ? fmtTs(block.timestamp) : "—");
  }, [contracts, tick]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const jump = async (days: number) => {
    await run(`Time +${days}d`, async (c) => {
      await increaseTime(c.provider, days * 24 * 60 * 60);
      bumpRefresh();
      await refresh();
      return { result: true };
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Block" value={blockNumber} tone="accent" />
        <StatCard label="Timestamp" value={timestamp} />
      </div>
      <div className="flex flex-wrap gap-2">
        {[1, 7, 30].map((d) => (
          <Button
            key={d}
            disabled={!contracts || busy}
            onClick={() => void jump(d)}
          >
            +{d} day{d > 1 ? "s" : ""}
          </Button>
        ))}
        <Button
          variant="secondary"
          disabled={!contracts || busy}
          onClick={() => void refresh()}
        >
          Refresh clock
        </Button>
      </div>
    </div>
  );
}

function ResetSection() {
  const contracts = useContracts();
  const { run } = useTxRunner();
  const resetLocal = useDashboardStore((s) => s.resetLocal);
  const resetKeepRoot = useDashboardStore((s) => s.resetKeepRoot);
  const setLastDistribution = useDashboardStore((s) => s.setLastDistribution);
  const addLog = useDashboardStore((s) => s.addLog);
  const busy = useDashboardStore((s) => s.busy);

  const onResetLocal = () => {
    if (!window.confirm("Reset local dashboard state (users, logs, txs)?"))
      return;
    resetLocal();
    addLog("warn", "Local dashboard reset");
  };

  const onResetKeepRoot = () => {
    const root = contracts?.addresses.RootUser;
    if (!root) {
      window.alert("Connect first — Root address unknown");
      return;
    }
    if (
      !window.confirm(
        "Delete all tracked users except Root and clear distribution/logs/txs?",
      )
    )
      return;
    const n = resetKeepRoot(root);
    setLastDistribution(undefined);
    addLog("warn", "Reset keep Root", `Removed ${n} user(s)`);
  };

  const onHardhatReset = async () => {
    if (
      !window.confirm(
        "Call hardhat_reset? Node state may wipe — redeploy required.",
      )
    )
      return;
    await run("hardhat_reset", async (c) => {
      await c.provider.send("hardhat_reset", []);
      addLog("warn", "hardhat_reset succeeded — redeploy contracts");
      return { result: true };
    });
  };

  const onSnapshot = async () => {
    await run("evm_snapshot", async (c) => {
      const id = await c.provider.send("evm_snapshot", []);
      sessionStorage.setItem(SNAPSHOT_KEY, String(id));
      addLog("ok", "Snapshot saved", String(id));
      return { result: id };
    });
  };

  const onRevert = async () => {
    const id = sessionStorage.getItem(SNAPSHOT_KEY);
    if (!id) {
      window.alert("No snapshot id — take a snapshot first.");
      return;
    }
    if (!window.confirm(`Revert to snapshot ${id}?`)) return;
    await run("evm_revert", async (c) => {
      await c.provider.send("evm_revert", [id]);
      sessionStorage.removeItem(SNAPSHOT_KEY);
      try {
        const fresh = await c.provider.send("evm_snapshot", []);
        sessionStorage.setItem(SNAPSHOT_KEY, String(fresh));
      } catch {
        /* */
      }
      addLog("warn", "Chain reverted", id);
      return { result: true };
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted max-w-2xl leading-relaxed">
        <strong className="text-ink">Reset (keep Root)</strong> clears the QA
        user list. To zero on-chain income/pools: hardhat_reset (or restart
        node) → <code className="text-accent">npm run qa:dashboard:setup</code>.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="danger" disabled={busy} onClick={onResetKeepRoot}>
          Reset (keep Root)
        </Button>
        <Button variant="danger" disabled={busy} onClick={onResetLocal}>
          Reset local (all)
        </Button>
        <Button
          disabled={!contracts || busy}
          onClick={() => void onSnapshot()}
        >
          Take snapshot
        </Button>
        <Button
          variant="secondary"
          disabled={!contracts || busy}
          onClick={() => void onRevert()}
        >
          evm_revert
        </Button>
        <Button
          variant="danger"
          disabled={!contracts || busy}
          onClick={() => void onHardhatReset()}
        >
          hardhat_reset
        </Button>
      </div>
    </div>
  );
}

function SessionSection() {
  const exportSession = useDashboardStore((s) => s.exportSession);
  const importSession = useDashboardStore((s) => s.importSession);
  const addLog = useDashboardStore((s) => s.addLog);
  const fileRef = useRef<HTMLInputElement>(null);

  const onExport = () => {
    const snap = exportSession();
    const blob = new Blob([JSON.stringify(snap, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `qa-session-${Date.now()}.json`;
    a.click();
    addLog("ok", "Session exported");
  };

  const onImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as SessionSnapshot;
      importSession(data);
      addLog("ok", "Session imported", `${data.users?.length ?? 0} users`);
    } catch (e) {
      addLog("error", "Import failed", String(e));
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" onClick={onExport}>
        Export session JSON
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => fileRef.current?.click()}
      >
        Import session JSON
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onImportFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
