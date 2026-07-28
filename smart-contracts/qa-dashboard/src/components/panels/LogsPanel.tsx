import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useDashboardStore, type LogLevel } from "@/store/dashboardStore";

const LEVEL_CLS: Record<LogLevel, string> = {
  info: "text-muted border-l-muted",
  ok: "text-ok border-l-ok",
  warn: "text-warn border-l-warn",
  error: "text-danger border-l-danger",
};

export function LogsPanel() {
  const logs = useDashboardStore((s) => s.logs);
  const clearLogs = useDashboardStore((s) => s.clearLogs);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Logs</h2>
          <p className="text-xs text-muted">{logs.length} entries (newest first)</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => clearLogs()}>
          Clear
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
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
    </div>
  );
}
