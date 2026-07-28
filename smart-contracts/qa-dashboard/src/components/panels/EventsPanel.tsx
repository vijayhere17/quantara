import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Badge } from "@/components/ui/input";
import { useContracts } from "@/hooks/useContracts";
import { shortAddr } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";
import type { Contract } from "ethers";

type EventRow = {
  id: string;
  contract: string;
  name: string;
  args: string;
  hash: string;
  block: number;
};

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

function summarizeArgs(args: unknown): string {
  try {
    if (args == null) return "";
    if (typeof args !== "object") return String(args);
    const obj = args as Record<string, unknown> & { length?: number };
    const parts: string[] = [];
    // ethers Result is array-like with named keys
    const len = typeof obj.length === "number" ? obj.length : 0;
    for (let i = 0; i < len; i++) {
      const v = (obj as unknown as unknown[])[i];
      if (typeof v === "bigint") parts.push(v.toString());
      else if (typeof v === "string") parts.push(shortAddr(v, 3));
      else parts.push(String(v));
    }
    if (!parts.length) {
      for (const [k, v] of Object.entries(obj)) {
        if (/^\d+$/.test(k) || k === "length") continue;
        if (typeof v === "bigint") parts.push(`${k}=${v}`);
        else if (typeof v === "string" && v.startsWith("0x"))
          parts.push(`${k}=${shortAddr(v, 3)}`);
        else parts.push(`${k}=${String(v)}`);
      }
    }
    return parts.slice(0, 6).join(", ");
  } catch {
    return "";
  }
}

export function EventsPanel() {
  const contracts = useContracts();
  const tick = useDashboardStore((s) => s.refreshTick);
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [addrFilter, setAddrFilter] = useState("");
  const [contractFilter, setContractFilter] = useState<"all" | ContractKey>("all");

  const load = useCallback(async () => {
    if (!contracts) return;
    setLoading(true);
    try {
      const latest = await contracts.provider.getBlockNumber();
      const from = Math.max(0, latest - 5000);
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
        const c = map[key];
        try {
          const logs = await c.queryFilter("*", from, latest);
          for (const log of logs) {
            const ev = log as {
              eventName?: string;
              fragment?: { name?: string };
              args?: unknown;
              transactionHash: string;
              blockNumber: number;
              index?: number;
            };
            const name = ev.eventName || ev.fragment?.name || "Event";
            collected.push({
              id: `${ev.transactionHash}-${ev.index ?? collected.length}-${key}`,
              contract: key,
              name,
              args: summarizeArgs(ev.args),
              hash: ev.transactionHash,
              block: ev.blockNumber,
            });
          }
        } catch {
          /* some contracts may fail wildcard filter */
        }
      }

      collected.sort((a, b) => b.block - a.block);
      setRows(collected.slice(0, 300));
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Events</h2>
          <p className="text-xs text-muted">
            queryFilter from block max(0, latest−5000)
            {loading ? " · loading…" : ` · ${filtered.length} shown`}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-muted">
            Address / search
            <Input
              className="mt-1 w-52"
              placeholder="0x… or event name"
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
          <Button size="sm" disabled={!contracts || loading} onClick={() => void load()}>
            Query
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent logs</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
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
                  <td className="py-2 pr-2 font-mono">{shortAddr(r.hash, 5)}</td>
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
