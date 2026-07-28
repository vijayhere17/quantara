import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StatCard,
} from "@/components/ui/card";
import { useContracts } from "@/hooks/useContracts";
import { CHAIN_ID, RPC_URL } from "@/lib/constants";
import { shortAddr } from "@/lib/utils";
import { useDashboardStore, type SessionSnapshot } from "@/store/dashboardStore";

export function DevPanel() {
  const contracts = useContracts();
  const selectedUser = useDashboardStore((s) => s.selectedUser);
  const txs = useDashboardStore((s) => s.txs);
  const exportSession = useDashboardStore((s) => s.exportSession);
  const importSession = useDashboardStore((s) => s.importSession);
  const addLog = useDashboardStore((s) => s.addLog);
  const tick = useDashboardStore((s) => s.refreshTick);
  const fileRef = useRef<HTMLInputElement>(null);

  const [rawUser, setRawUser] = useState<string>("—");
  const [symbol, setSymbol] = useState("—");
  const [decimals, setDecimals] = useState("—");
  const [chainId, setChainId] = useState(String(CHAIN_ID));

  const refresh = useCallback(async () => {
    if (!contracts) return;
    try {
      const net = await contracts.provider.getNetwork();
      setChainId(String(net.chainId));
      const [sym, dec] = await Promise.all([
        contracts.token.symbol(),
        contracts.token.decimals(),
      ]);
      setSymbol(String(sym));
      setDecimals(String(dec));
      if (selectedUser) {
        const u = await contracts.core.users(selectedUser);
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
      } else {
        setRawUser("No selected user");
      }
    } catch (e) {
      setRawUser(String(e));
    }
  }, [contracts, selectedUser, tick]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const lastGas = txs.find((t) => t.gasUsed)?.gasUsed ?? "—";

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Developer</h2>
          <p className="text-xs text-muted">Addresses, RPC, raw tuples, session I/O</p>
        </div>
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
          <Button size="sm" variant="ghost" onClick={() => void refresh()}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="RPC" value={RPC_URL} />
        <StatCard label="Chain ID" value={chainId} tone="accent" />
        <StatCard label="Token" value={`${symbol} / ${decimals}d`} />
        <StatCard label="Last tx gas" value={lastGas} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deployed addresses</CardTitle>
          <CardDescription>From deployed-addresses.json</CardDescription>
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
          <CardTitle>Selected user raw users()</CardTitle>
          <CardDescription>
            {selectedUser ? shortAddr(selectedUser, 6) : "None selected"}
          </CardDescription>
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
