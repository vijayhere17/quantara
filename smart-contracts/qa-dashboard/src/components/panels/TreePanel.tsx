import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import {
  createUsersBatch,
  loadUserRows,
  useContracts,
  useTxRunner,
  type UserRow,
} from "@/hooks/useContracts";
import { RANK_NAMES } from "@/lib/constants";
import { fmtUsd } from "@/lib/format";
import { cn, shortAddr } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";

type TreeNode = {
  address: string;
  id: number;
  label: string;
  children: TreeNode[];
  row?: UserRow;
};

export function TreePanel() {
  const contracts = useContracts();
  const users = useDashboardStore((s) => s.users);
  const selectedUser = useDashboardStore((s) => s.selectedUser);
  const setSelectedUser = useDashboardStore((s) => s.setSelectedUser);
  const upsertUser = useDashboardStore((s) => s.upsertUser);
  const busy = useDashboardStore((s) => s.busy);
  const tick = useDashboardStore((s) => s.refreshTick);
  const { run } = useTxRunner();

  const [depth, setDepth] = useState(2);
  const [directs, setDirects] = useState(2);
  const [rows, setRows] = useState<Record<string, UserRow>>({});
  const [focus, setFocus] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    if (!contracts || !users.length) {
      setRows({});
      return;
    }
    const next = await loadUserRows(
      contracts,
      users.map((u) => u.address),
    );
    setRows(next);
  }, [contracts, users, tick]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (selectedUser) setFocus(selectedUser);
  }, [selectedUser]);

  const tree = useMemo(() => {
    if (!users.length) return [] as TreeNode[];

    const byAddr = new Map(
      users.map((u) => [u.address.toLowerCase(), u] as const),
    );
    const children = new Map<string, string[]>();

    for (const u of users) {
      const row = rows[u.address.toLowerCase()];
      const sponsor = (row?.sponsor || u.sponsor || "").toLowerCase();
      if (!sponsor || sponsor === u.address.toLowerCase()) continue;
      if (!byAddr.has(sponsor)) continue;
      const list = children.get(sponsor) || [];
      list.push(u.address.toLowerCase());
      children.set(sponsor, list);
    }

    const visited = new Set<string>();
    const build = (addr: string): TreeNode | null => {
      if (visited.has(addr) || !byAddr.has(addr)) return null;
      visited.add(addr);
      const u = byAddr.get(addr)!;
      const kids = (children.get(addr) || [])
        .map(build)
        .filter(Boolean) as TreeNode[];
      return {
        address: u.address,
        id: u.id,
        label: u.label || `User ${u.id}`,
        children: kids,
        row: rows[addr],
      };
    };

    const rootKey = (
      selectedUser ||
      contracts?.addresses.RootUser ||
      users[0]?.address ||
      ""
    ).toLowerCase();

    const roots: TreeNode[] = [];
    if (byAddr.has(rootKey)) {
      const n = build(rootKey);
      if (n) roots.push(n);
    }

    for (const u of users) {
      const a = u.address.toLowerCase();
      if (visited.has(a)) continue;
      const n = build(a);
      if (n) roots.push(n);
    }

    return roots;
  }, [users, rows, selectedUser, contracts]);

  const focusRow = focus ? rows[focus.toLowerCase()] : undefined;
  const focusTracked = users.find(
    (u) => u.address.toLowerCase() === focus?.toLowerCase(),
  );
  const focusChildren = useMemo(() => {
    if (!focus) return 0;
    const key = focus.toLowerCase();
    return users.filter((u) => {
      const row = rows[u.address.toLowerCase()];
      const sp = (row?.sponsor || u.sponsor || "").toLowerCase();
      return sp === key;
    }).length;
  }, [focus, users, rows]);

  const onAutoBuild = async () => {
    await run(`Auto build tree d=${depth}×${directs}`, async (c) => {
      const root = selectedUser || c.addresses.RootUser;
      let start =
        users.length === 0 ? 1 : Math.max(...users.map((u) => u.id), 0) + 1;
      let parents = [root];

      for (let d = 0; d < depth; d++) {
        const nextParents: string[] = [];
        for (const parent of parents) {
          const created = await createUsersBatch(
            c,
            directs,
            start,
            parent,
            upsertUser,
            undefined,
            { autoRegister: true },
          );
          start += directs;
          nextParents.push(...created);
        }
        parents = nextParents;
      }
      return { result: true };
    });
  };

  const renderNode = (node: TreeNode, depthIdx: number) => {
    const selected = focus?.toLowerCase() === node.address.toLowerCase();
    return (
      <div key={node.address} className="mt-1">
        <button
          type="button"
          onClick={() => {
            setFocus(node.address);
            setSelectedUser(node.address);
          }}
          className={cn(
            "w-full text-left rounded-md border px-2 py-1.5 text-xs transition",
            selected
              ? "border-accent bg-accent/10 text-ink"
              : "border-line/60 hover:bg-surface-3 text-ink",
          )}
          style={{ marginLeft: depthIdx * 16 }}
        >
          <span className="font-medium">{node.label}</span>
          <span className="ml-2 font-mono text-muted">
            {shortAddr(node.address, 3)}
          </span>
          {node.row?.packageAmount ? (
            <span className="ml-2 text-muted">
              {fmtUsd(node.row.packageAmount)}
            </span>
          ) : null}
        </button>
        {node.children.map((c) => renderNode(c, depthIdx + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div>
          <h2 className="text-base font-semibold">Referral Tree</h2>
          <p className="text-xs text-muted">
            Structure from tracked sponsor links · click a node for details
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-muted">
            Depth
            <Select
              className="mt-1 w-20"
              value={String(depth)}
              onChange={(e) => setDepth(Number(e.target.value))}
            >
              {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-xs text-muted">
            Directs
            <Select
              className="mt-1 w-20"
              value={String(directs)}
              onChange={(e) => setDirects(Number(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </label>
          <Button
            size="sm"
            disabled={!contracts || busy}
            onClick={() => void onAutoBuild()}
          >
            Auto Build Tree
          </Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardHeader>
            <CardTitle>Tree</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[560px] overflow-y-auto">
            {tree.length ? (
              tree.map((n) => renderNode(n, 0))
            ) : (
              <p className="text-xs text-muted py-6 text-center">
                No tracked users yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Node</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {focus && focusTracked ? (
              <>
                <Row
                  label="User"
                  value={focusTracked.label || `User ${focusTracked.id}`}
                />
                <Row label="Wallet" value={shortAddr(focus, 5)} mono />
                <Row
                  label="Sponsor"
                  value={
                    focusRow?.sponsor
                      ? shortAddr(focusRow.sponsor, 4)
                      : shortAddr(focusTracked.sponsor, 4)
                  }
                  mono
                />
                <Row label="Children" value={String(focusChildren)} />
                <Row
                  label="Rank"
                  value={RANK_NAMES[focusRow?.rank ?? 0] ?? "—"}
                />
                <Row
                  label="Package"
                  value={
                    focusRow?.packageAmount
                      ? fmtUsd(focusRow.packageAmount)
                      : "None"
                  }
                />
                <Row
                  label="BV"
                  value={focusRow?.personalVolume ?? "—"}
                  mono
                />
                <Row
                  label="Income"
                  value={focusRow?.totalEarned ?? "—"}
                  mono
                />
              </>
            ) : (
              <p className="text-muted">Click a node to inspect.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2 border-b border-line/40 py-1.5">
      <span className="text-muted">{label}</span>
      <span className={mono ? "font-mono text-ink" : "text-ink"}>{value}</span>
    </div>
  );
}
