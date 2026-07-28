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
}) {
  if (!dist) return null;
  return (
    <Card className="border-accent/40">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Where the money went
          <Badge tone="accent">{fmtUsd(dist.packageUsd)}</Badge>
          <Badge>BTC ≈ ${dist.btcPrice.toLocaleString()}</Badge>
          <span className="text-xs font-normal text-muted">
            {shortAddr(dist.user, 4)} · {new Date(dist.at).toLocaleTimeString()}
          </span>
        </CardTitle>
        <p className="text-xs text-muted mt-1">{dist.summary}</p>
        <p className="text-[11px] text-muted mt-1">
          Paid: <span className="font-mono text-ink">{dist.tokenPaid.label}</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {dist.lines.map((line) => (
          <div
            key={line.label}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-xs",
              line.ok ? "border-ok/40 bg-ok/5" : "border-warn/40 bg-warn/5",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-medium text-ink">{line.label}</div>
                {line.pct ? (
                  <Badge className="mt-1" tone="accent">
                    {line.pct}
                  </Badge>
                ) : null}
              </div>
              <div className="text-right">
                <div className="font-mono text-sm text-ink">{line.amount.token} BTCB</div>
                <div className="font-mono text-accent">{line.amount.usd}</div>
                {line.net ? (
                  <div className="mt-1 text-[11px] text-muted">
                    Net after recycle:{" "}
                    <span className="text-ok">
                      {line.net.token} BTCB · {line.net.usd}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
            <p className="mt-1.5 text-muted leading-relaxed">{line.detail}</p>
            <Badge className="mt-1.5" tone={line.ok ? "ok" : "warn"}>
              {line.ok ? "PASS" : "CHECK"}
            </Badge>
          </div>
        ))}
        <div className="rounded-md border border-line bg-surface px-3 py-2 text-[11px] text-muted leading-relaxed">
          <strong className="text-ink">Direct Income:</strong> L1 5% (or 10% with
          Growth Accelerator), L2 3%, L3 2% of package — shown in{" "}
          <strong className="text-ink">BTCB and $</strong>. Wallet receives ~70%
          after recycling (25% ROI / 3% Reserve / 2% Community).
        </div>
      </CardContent>
    </Card>
  );
}
