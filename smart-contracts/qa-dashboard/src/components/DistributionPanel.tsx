import { Badge } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivationDistribution } from "@/lib/distribution";
import { fmtUsd } from "@/lib/format";
import { shortAddr } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function DistributionPanel({
  dist,
}: {
  dist?: ActivationDistribution | null;
  /** @deprecated unused — recycling flowchart removed */
  showRecycling?: boolean;
}) {
  if (!dist) return null;

  return (
    <div className="space-y-3">
      <Card className="border-accent/40">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            From → To (last activation)
            <Badge tone="accent">{fmtUsd(dist.packageUsd)}</Badge>
            <Badge>BTC ≈ ${dist.btcPrice.toLocaleString()}</Badge>
            <span className="text-xs font-normal text-muted">
              payer {shortAddr(dist.user, 4)} ·{" "}
              {new Date(dist.at).toLocaleTimeString()}
            </span>
          </CardTitle>
          <p className="text-xs text-muted mt-1">{dist.summary}</p>
          <p className="text-[11px] text-muted mt-1">
            Paid:{" "}
            <span className="font-mono text-ink">{dist.tokenPaid.label}</span>
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="bg-surface text-[10px] uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">From</th>
                  <th className="px-3 py-2">To</th>
                  <th className="px-3 py-2">Gross</th>
                  <th className="px-3 py-2">Net (after 30% recycle)</th>
                  <th className="px-3 py-2">OK</th>
                </tr>
              </thead>
              <tbody>
                {dist.lines.map((line) => (
                  <tr
                    key={line.label}
                    className={cn(
                      "border-t border-line/70",
                      line.ok ? "bg-ok/5" : "bg-warn/5",
                    )}
                  >
                    <td className="px-3 py-2 text-muted">
                      {line.kind === "payment"
                        ? shortAddr(dist.user, 4)
                        : line.kind === "direct"
                          ? `Package ${fmtUsd(dist.packageUsd)}`
                          : "Package split"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-ink">{line.label}</div>
                      {line.pct ? (
                        <Badge className="mt-1" tone="accent">
                          {line.pct}
                        </Badge>
                      ) : null}
                      {line.to ? (
                        <div className="mt-0.5 font-mono text-[10px] text-muted">
                          {shortAddr(line.to, 4)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 font-mono text-ink">
                      {line.amount.label}
                    </td>
                    <td className="px-3 py-2 font-mono text-ok">
                      {line.net ? line.net.label : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={line.ok ? "ok" : "warn"}>
                        {line.ok ? "PASS" : "CHECK"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {dist.lines.map((line) =>
            line.detail ? (
              <p key={`${line.label}-d`} className="text-[11px] text-muted leading-relaxed">
                <span className="text-ink">{line.label}:</span> {line.detail}
              </p>
            ) : null,
          )}
          <div className="rounded-md border border-line bg-surface px-3 py-2 text-[11px] text-muted leading-relaxed">
            <strong className="text-ink">Activation split:</strong> 30% ROI pool ·
            charity ~3.5% · Direct L1 5%/10% · L2 3% · L3 2%. Direct wallets get
            ~70% after recycling.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
