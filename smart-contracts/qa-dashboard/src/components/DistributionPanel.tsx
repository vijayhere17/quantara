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
          Activation distribution
          <Badge tone="accent">{fmtUsd(dist.packageUsd)}</Badge>
          <span className="text-xs font-normal text-muted">
            {shortAddr(dist.user, 4)} · {new Date(dist.at).toLocaleTimeString()}
          </span>
        </CardTitle>
        <p className="text-xs text-muted mt-1">{dist.summary}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {dist.lines.map((line) => (
          <div
            key={line.label}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs",
              line.ok
                ? "border-ok/40 bg-ok/5"
                : "border-warn/40 bg-warn/5",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-ink">{line.label}</span>
              <span className="font-mono text-ink">{line.amount}</span>
            </div>
            <p className="mt-1 text-muted">{line.detail}</p>
            <Badge className="mt-1" tone={line.ok ? "ok" : "warn"}>
              {line.ok ? "PASS" : "CHECK"}
            </Badge>
          </div>
        ))}
        <p className="text-[11px] text-muted pt-1">
          Token paid: {dist.tokenPaid}. Direct lines show expected L1–L3 share
          to upline (5% / 3% / 2%, or 10% L1 if Growth Accelerator is active).
          Net to wallet is ~70% after income recycling.
        </p>
      </CardContent>
    </Card>
  );
}
