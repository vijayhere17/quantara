import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dualFromContracts, type DualAmount } from "@/lib/money";
import type { Contracts } from "@/lib/contracts";
import { useEffect, useState } from "react";

/**
 * Simple visual of the 70/30 recycling rule matching the business diagram.
 */
export function RecyclingFlow({
  exampleUsd = 100,
  contracts,
  grossWei,
}: {
  exampleUsd?: number;
  contracts?: Contracts | null;
  /** If provided, compute real BTCB+$ split from this gross wei */
  grossWei?: bigint;
}) {
  const [dual, setDual] = useState<{
    gross: DualAmount;
    user: DualAmount;
    recycled: DualAmount;
    roi: DualAmount;
    reserve: DualAmount;
    community: DualAmount;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!contracts) {
        // Static $ example when no contracts
        const g = exampleUsd;
        setDual({
          gross: fake(g),
          user: fake(g * 0.7),
          recycled: fake(g * 0.3),
          roi: fake(g * 0.25),
          reserve: fake(g * 0.03),
          community: fake(g * 0.02),
        });
        return;
      }
      try {
        const grossWeiResolved: bigint =
          grossWei ??
          (await contracts.core.getPackageBTCBAmount(BigInt(exampleUsd)));
        const p = await contracts.treasury.previewRecycling(grossWeiResolved);
        const userPayout = BigInt(p.userPayout ?? p[0]);
        const toRoi = BigInt(p.toRoiPool ?? p[1]);
        const toReserve = BigInt(p.toReserve ?? p[2]);
        const toCommunity = BigInt(p.toCommunity ?? p[3]);
        const recycled = toRoi + toReserve + toCommunity;
        if (cancelled) return;
        setDual({
          gross: await dualFromContracts(contracts, grossWeiResolved),
          user: await dualFromContracts(contracts, userPayout),
          recycled: await dualFromContracts(contracts, recycled),
          roi: await dualFromContracts(contracts, toRoi),
          reserve: await dualFromContracts(contracts, toReserve),
          community: await dualFromContracts(contracts, toCommunity),
        });
      } catch {
        const g = exampleUsd;
        if (!cancelled) {
          setDual({
            gross: fake(g),
            user: fake(g * 0.7),
            recycled: fake(g * 0.3),
            roi: fake(g * 0.25),
            reserve: fake(g * 0.03),
            community: fake(g * 0.02),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contracts, exampleUsd, grossWei]);

  if (!dual) {
    return (
      <Card>
        <CardContent className="pt-4 text-xs text-muted">Loading recycle flow…</CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-line">
      <CardHeader>
        <CardTitle>Income recycling — where it goes</CardTitle>
        <p className="text-xs text-muted mt-1">
          Every income (Self ROI · Rank · Direct · etc.) splits the same way
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <FlowBox
          title="User earns income"
          value={dual.gross.label}
          tone="default"
        />
        <Arrow />
        <div className="grid gap-2 sm:grid-cols-2">
          <FlowBox
            title="70% → User wallet"
            value={dual.user.label}
            tone="ok"
          />
          <FlowBox
            title="30% → Recycled"
            value={dual.recycled.label}
            tone="warn"
          />
        </div>
        <Arrow />
        <p className="text-muted text-center">Recycled 30% splits into</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <FlowBox
            title="25% → ROI Pool"
            value={dual.roi.label}
            detail="Grows future daily Self ROI"
            tone="accent"
          />
          <FlowBox
            title="3% → Reserve"
            value={dual.reserve.label}
            tone="default"
          />
          <FlowBox
            title="2% → Community Builder"
            value={dual.community.label}
            tone="default"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function fake(usd: number): DualAmount {
  return {
    wei: 0n,
    token: "—",
    usd: `$${usd.toFixed(2)}`,
    usdNumber: usd,
    label: `$${usd.toFixed(2)}`,
  };
}

function Arrow() {
  return <div className="text-center text-muted text-lg leading-none">↓</div>;
}

function FlowBox({
  title,
  value,
  detail,
  tone,
}: {
  title: string;
  value: string;
  detail?: string;
  tone: "default" | "ok" | "warn" | "accent";
}) {
  const border =
    tone === "ok"
      ? "border-ok/50 bg-ok/10"
      : tone === "warn"
        ? "border-warn/50 bg-warn/10"
        : tone === "accent"
          ? "border-accent/50 bg-accent/10"
          : "border-line bg-surface";
  return (
    <div className={`rounded-lg border px-3 py-2 ${border}`}>
      <div className="font-medium text-ink">{title}</div>
      <div className="mt-1 font-mono text-sm text-ink">{value}</div>
      {detail ? <div className="mt-0.5 text-[11px] text-muted">{detail}</div> : null}
    </div>
  );
}
