import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/input";
import { shortAddr } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";

export function TransactionsPanel() {
  const txs = useDashboardStore((s) => s.txs);
  const clearTxs = useDashboardStore((s) => s.clearTxs);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Transactions</h2>
          <p className="text-xs text-muted">{txs.length} recorded this session</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => clearTxs()}>
          Clear
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session txs</CardTitle>
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
    </div>
  );
}
