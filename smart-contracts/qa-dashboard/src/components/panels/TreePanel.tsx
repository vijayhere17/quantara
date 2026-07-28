import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  useReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import {
  activatePackage,
  createUsersBatch,
  loadUserRow,
  useContracts,
  useTxRunner,
  walletFromIndex,
} from "@/hooks/useContracts";
import { RANK_NAMES } from "@/lib/constants";
import { fmtUsd } from "@/lib/format";
import { shortAddr, sleep } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";

type TreeNodeData = {
  label: string;
  rank: string;
  pkg: string;
  bv: string;
  roi: string;
  total: string;
  address: string;
};

function TreeNode({ data }: { data: TreeNodeData }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-[11px] shadow-sm min-w-[140px]">
      <Handle type="target" position={Position.Top} className="!bg-accent" />
      <div className="font-semibold text-ink">{data.label}</div>
      <div className="text-muted font-mono">{shortAddr(data.address, 3)}</div>
      <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-muted">
        <span>Rank</span>
        <span className="text-ink">{data.rank}</span>
        <span>Pkg</span>
        <span className="text-ink">{data.pkg}</span>
        <span>BV</span>
        <span className="text-ink font-mono">{data.bv}</span>
        <span>ROI</span>
        <span className="text-ink font-mono">{data.roi}</span>
        <span>Total</span>
        <span className="text-ink font-mono">{data.total}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-accent" />
    </div>
  );
}

const nodeTypes = { tree: TreeNode };

function TreeCanvas() {
  const contracts = useContracts();
  const users = useDashboardStore((s) => s.users);
  const selectedUser = useDashboardStore((s) => s.selectedUser);
  const upsertUser = useDashboardStore((s) => s.upsertUser);
  const setSelectedUser = useDashboardStore((s) => s.setSelectedUser);
  const busy = useDashboardStore((s) => s.busy);
  const tick = useDashboardStore((s) => s.refreshTick);
  const { run } = useTxRunner();
  const { fitView } = useReactFlow();

  const [depth, setDepth] = useState(2);
  const [directs, setDirects] = useState(2);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [collapsed, setCollapsed] = useState(false);

  const buildGraph = useCallback(async () => {
    if (!contracts || !users.length) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const byAddr = new Map(users.map((u) => [u.address.toLowerCase(), u]));
    const rowCache: Record<string, Awaited<ReturnType<typeof loadUserRow>>> = {};

    await Promise.all(
      users.map(async (u) => {
        try {
          rowCache[u.address.toLowerCase()] = await loadUserRow(
            contracts,
            u.address,
          );
        } catch {
          /* */
        }
      }),
    );

    const children = new Map<string, string[]>();
    for (const u of users) {
      const row = rowCache[u.address.toLowerCase()];
      const sponsor = (row?.sponsor || u.sponsor || "").toLowerCase();
      if (!sponsor || sponsor === u.address.toLowerCase()) continue;
      if (!byAddr.has(sponsor) && sponsor !== contracts.addresses.RootUser.toLowerCase()) {
        continue;
      }
      const list = children.get(sponsor) || [];
      list.push(u.address.toLowerCase());
      children.set(sponsor, list);
    }

    const rootKey = (
      selectedUser ||
      contracts.addresses.RootUser ||
      users[0]?.address ||
      ""
    ).toLowerCase();

    const laid: Node[] = [];
    const eds: Edge[] = [];
    const visited = new Set<string>();

    const place = (
      addr: string,
      depthIdx: number,
      xSlot: number,
      span: number,
    ) => {
      if (visited.has(addr) || !byAddr.has(addr)) return;
      visited.add(addr);
      const u = byAddr.get(addr)!;
      const row = rowCache[addr];
      laid.push({
        id: addr,
        type: "tree",
        position: { x: xSlot, y: depthIdx * 160 },
        data: {
          label: u.label || `U${u.id}`,
          address: u.address,
          rank: RANK_NAMES[row?.rank ?? 0] ?? "—",
          pkg: row?.registered ? fmtUsd(row.packageAmount) : "—",
          bv: row?.groupVolume ?? "—",
          roi: row?.roiEarned ?? "—",
          total: row?.totalEarned ?? "—",
        } satisfies TreeNodeData,
      });

      if (collapsed && depthIdx > 0) return;

      const kids = children.get(addr) || [];
      if (!kids.length) return;
      const childSpan = span / Math.max(kids.length, 1);
      kids.forEach((child, i) => {
        eds.push({
          id: `${addr}-${child}`,
          source: addr,
          target: child,
          style: { stroke: "#2dd4bf" },
        });
        const cx = xSlot - span / 2 + childSpan * (i + 0.5);
        place(child, depthIdx + 1, cx, childSpan);
      });
    };

    // Include orphans as additional roots
    const roots = byAddr.has(rootKey)
      ? [rootKey]
      : users.map((u) => u.address.toLowerCase()).filter((a) => {
          const row = rowCache[a];
          const sp = (row?.sponsor || "").toLowerCase();
          return !sp || !byAddr.has(sp);
        });

    const rootSpan = Math.max(roots.length, 1) * 280;
    roots.forEach((r, i) => {
      place(r, 0, (i + 0.5) * (rootSpan / roots.length), rootSpan / roots.length);
    });

    // dangling users not visited
    let orphanX = 0;
    for (const u of users) {
      const a = u.address.toLowerCase();
      if (visited.has(a)) continue;
      place(a, 0, orphanX, 220);
      orphanX += 240;
    }

    setNodes(laid);
    setEdges(eds);
    await sleep(50);
    fitView({ padding: 0.2 });
  }, [
    contracts,
    users,
    selectedUser,
    collapsed,
    setNodes,
    setEdges,
    fitView,
    tick,
  ]);

  useEffect(() => {
    void buildGraph();
  }, [buildGraph]);

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
          );
          start += directs;
          for (const addr of created) {
            const tracked = useDashboardStore
              .getState()
              .users.find(
                (u) => u.address.toLowerCase() === addr.toLowerCase(),
              );
            if (tracked?.walletIndex != null) {
              const signer = walletFromIndex(tracked.walletIndex, c.provider);
              try {
                await activatePackage(c, signer, 50);
              } catch {
                /* optional activate */
              }
            }
            nextParents.push(addr);
          }
        }
        parents = nextParents;
      }
      return { result: true };
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div>
          <h2 className="text-base font-semibold">Referral Tree</h2>
          <p className="text-xs text-muted">
            React Flow from tracked sponsor links · root = selected or Root
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
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setCollapsed((v) => !v);
              setTimeout(() => fitView({ padding: 0.2 }), 80);
            }}
          >
            {collapsed ? "Expand" : "Collapse"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fitView({ padding: 0.2 })}
          >
            Fit
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0 h-[560px] bg-surface">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            onNodeClick={(_, n) => setSelectedUser(n.id)}
            proOptions={{ hideAttribution: true }}
            colorMode="dark"
          >
            <Background gap={18} color="#1f2a2e" />
            <Controls />
            <MiniMap
              nodeColor="#2dd4bf"
              maskColor="rgba(0,0,0,0.6)"
              className="!bg-surface-2"
            />
          </ReactFlow>
        </CardContent>
      </Card>
    </div>
  );
}

export function TreePanel() {
  return (
    <ReactFlowProvider>
      <TreeCanvas />
    </ReactFlowProvider>
  );
}
