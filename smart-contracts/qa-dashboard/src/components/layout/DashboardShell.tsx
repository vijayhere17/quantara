import type { ReactNode } from "react";
import { TABS, type DashboardTab } from "@/lib/constants";
import { useDashboardStore } from "@/store/dashboardStore";
import { Badge } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, shortAddr } from "@/lib/utils";
import { RPC_URL } from "@/lib/constants";

export function DashboardShell({
  children,
  connected,
  error,
}: {
  children: ReactNode;
  connected: boolean;
  error?: string;
}) {
  const tab = useDashboardStore((s) => s.tab);
  const setTab = useDashboardStore((s) => s.setTab);
  const mode = useDashboardStore((s) => s.mode);
  const setMode = useDashboardStore((s) => s.setMode);
  const busy = useDashboardStore((s) => s.busy);
  const busyLabel = useDashboardStore((s) => s.busyLabel);
  const selectedUser = useDashboardStore((s) => s.selectedUser);
  const contracts = useDashboardStore((s) => s.contracts);

  const visible = TABS.filter((t) => mode === "developer" || t.client);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line/80 bg-surface-2/70 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-[1600px] px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-accent">
              Quantara Internal
            </div>
            <h1 className="text-lg font-semibold tracking-tight">
              Smart Contract QA Dashboard
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={connected ? "ok" : "danger"}>
              {connected ? "Live Hardhat" : "Disconnected"}
            </Badge>
            <Badge tone="accent">{RPC_URL}</Badge>
            {contracts ? (
              <Badge>Chain {contracts.addresses.chainId}</Badge>
            ) : null}
            {selectedUser ? (
              <Badge tone="default">User {shortAddr(selectedUser, 3)}</Badge>
            ) : null}
            <div className="flex rounded-md border border-line overflow-hidden">
              <Button
                size="sm"
                variant={mode === "client" ? "default" : "ghost"}
                className="rounded-none"
                onClick={() => setMode("client")}
              >
                Client
              </Button>
              <Button
                size="sm"
                variant={mode === "developer" ? "default" : "ghost"}
                className="rounded-none"
                onClick={() => setMode("developer")}
              >
                Developer
              </Button>
            </div>
          </div>
        </div>
        <nav className="mx-auto max-w-[1600px] px-2 pb-2 flex gap-1 overflow-x-auto">
          {visible.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as DashboardTab)}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition",
                tab === t.id
                  ? "bg-accent text-surface"
                  : "text-muted hover:text-ink hover:bg-surface-3",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
        {error ? (
          <div className="mx-auto max-w-[1600px] px-4 pb-3 text-sm text-danger">
            {error}
          </div>
        ) : null}
        {busy ? (
          <div className="h-0.5 w-full bg-line overflow-hidden">
            <div className="h-full w-1/3 animate-pulse bg-accent" />
            <div className="sr-only">{busyLabel}</div>
          </div>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-4">
        {busy && busyLabel ? (
          <div className="mb-3 text-xs text-muted">Working: {busyLabel}</div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
