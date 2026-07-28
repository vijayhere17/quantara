import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, FlowStep } from "@/components/ui/modal";
import { Badge } from "@/components/ui/input";
import {
  loadUserRow,
  useContracts,
  type UserRow,
} from "@/hooks/useContracts";
import { PACKAGE_LADDER, RANK_NAMES } from "@/lib/constants";
import { fmtToken, fmtUsd } from "@/lib/format";
import { shortAddr } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";
import { DistributionPanel } from "@/components/DistributionPanel";

type IncomeBreakdown = {
  roiEarned: string;
  contributionEarned: string;
  boosterEarned: string;
  rankEarned: string;
  sameRankEarned: string;
  communityEarned: string;
  totalEarned: string;
  principal: string;
};

type RecyclePreview = {
  userPayout: string;
  toRoiPool: string;
  toReserve: string;
  toCommunity: string;
  gross: string;
};

function packageStepTone(
  amount: number,
  cycle: 1 | 2,
  row: UserRow | null,
): "ok" | "default" | "muted" {
  if (!row || !row.registered || row.packageAmount <= 0) {
    return amount === 50 && cycle === 1 ? "default" : "muted";
  }
  const curAmt = row.packageAmount;
  const curCycle = row.packageCycle || 1;
  const idx = PACKAGE_LADDER.indexOf(amount as (typeof PACKAGE_LADDER)[number]);
  const curIdx = PACKAGE_LADDER.indexOf(
    curAmt as (typeof PACKAGE_LADDER)[number],
  );

  if (curIdx < 0) return "muted";
  if (idx < curIdx) return "ok";
  if (idx > curIdx) return "muted";
  // same package
  if (cycle < curCycle) return "ok";
  if (cycle === curCycle) {
    if (row.packageCompleted && cycle === 2) return "ok";
    return "default";
  }
  // cycle > curCycle on same package
  if (row.packageCompleted && cycle === 2 && curCycle === 1) return "default";
  return "muted";
}

export function UserDetailsModal() {
  const detailsUser = useDashboardStore((s) => s.detailsUser);
  const setDetailsUser = useDashboardStore((s) => s.setDetailsUser);
  const users = useDashboardStore((s) => s.users);
  const txs = useDashboardStore((s) => s.txs);
  const tick = useDashboardStore((s) => s.refreshTick);
  const lastDistribution = useDashboardStore((s) => s.lastDistribution);
  const contracts = useContracts();

  const [row, setRow] = useState<UserRow | null>(null);
  const [income, setIncome] = useState<IncomeBreakdown | null>(null);
  const [recycle, setRecycle] = useState<RecyclePreview | null>(null);
  const [loading, setLoading] = useState(false);

  const tracked = users.find(
    (u) => u.address.toLowerCase() === detailsUser?.toLowerCase(),
  );

  const load = useCallback(async () => {
    if (!contracts || !detailsUser) {
      setRow(null);
      setIncome(null);
      setRecycle(null);
      return;
    }
    setLoading(true);
    try {
      const r = await loadUserRow(contracts, detailsUser);
      setRow(r);

      let breakdown: IncomeBreakdown | null = null;
      if (r.registered) {
        try {
          const inc = await contracts.income.incomes(detailsUser);
          breakdown = {
            principal: fmtToken(inc.principal ?? inc[0]),
            roiEarned: fmtToken(inc.roiEarned ?? inc[1]),
            contributionEarned: fmtToken(inc.contributionEarned ?? inc[2]),
            boosterEarned: fmtToken(inc.boosterEarned ?? inc[3]),
            rankEarned: fmtToken(inc.rankEarned ?? inc[4]),
            sameRankEarned: fmtToken(inc.sameRankEarned ?? inc[5]),
            communityEarned: fmtToken(inc.communityEarned ?? inc[6]),
            totalEarned: fmtToken(inc.totalEarned ?? inc[7]),
          };
          setIncome(breakdown);
        } catch {
          setIncome(null);
        }
      } else {
        setIncome(null);
      }

      try {
        const sampleUsd = r.packageAmount > 0 ? r.packageAmount : 50;
        const amt = await contracts.core.getPackageBTCBAmount(BigInt(sampleUsd));
        const p = await contracts.treasury.previewRecycling(amt);
        setRecycle({
          gross: fmtToken(amt),
          userPayout: fmtToken(p.userPayout ?? p[0]),
          toRoiPool: fmtToken(p.toRoiPool ?? p[1]),
          toReserve: fmtToken(p.toReserve ?? p[2]),
          toCommunity: fmtToken(p.toCommunity ?? p[3]),
        });
      } catch {
        setRecycle(null);
      }
    } catch (e) {
      setRow({
        address: detailsUser,
        registered: false,
        sponsor: "",
        packageAmount: 0,
        packageCycle: 0,
        joinedAt: 0,
        isActive: false,
        packageCompleted: false,
        rank: 0,
        directCount: 0,
        groupVolume: "0",
        personalVolume: "0",
        roiEarned: "0",
        workingEarned: "0",
        totalEarned: "0",
        tokenBalance: "0",
        pendingRoi: "0",
        nextPackage: 50,
        nextCycle: 1,
        gaActive: false,
        communityPoints: 0,
        maxLegVolume: 0,
        groupVolumeNum: 0,
        seedQualified: false,
        forcedRank: false,
        loadError:
          e instanceof Error
            ? e.message
            : "Failed to load user — redeploy/sync and refresh",
      });
    } finally {
      setLoading(false);
    }
  }, [contracts, detailsUser, tick]);

  useEffect(() => {
    void load();
  }, [load]);

  const children = useMemo(() => {
    if (!detailsUser || !row) return [];
    const key = detailsUser.toLowerCase();
    return users.filter((u) => {
      if (u.address.toLowerCase() === key) return false;
      const sp = (u.sponsor || "").toLowerCase();
      return sp === key;
    });
  }, [users, detailsUser, row]);

  const relatedTxs = useMemo(() => {
    if (!detailsUser) return [];
    const short = shortAddr(detailsUser, 3).toLowerCase();
    const full = detailsUser.toLowerCase();
    return txs
      .filter((tx) => {
        const m = tx.method.toLowerCase();
        return (
          m.includes(short) ||
          m.includes(full.slice(0, 10)) ||
          (tx.from || "").toLowerCase() === full ||
          (tx.to || "").toLowerCase() === full ||
          (tx.params || "").toLowerCase().includes(full)
        );
      })
      .slice(0, 40);
  }, [txs, detailsUser]);

  const onClose = () => setDetailsUser(undefined);

  const label =
    tracked?.label ||
    (tracked ? `User ${tracked.id}` : detailsUser ? shortAddr(detailsUser) : "");

  return (
    <Modal
      open={Boolean(detailsUser)}
      title={label}
      subtitle={detailsUser ? shortAddr(detailsUser, 6) : undefined}
      onClose={onClose}
      wide
    >
      {loading && !row ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : !row ? (
        <p className="text-sm text-muted">No user selected.</p>
      ) : (
        <div className="space-y-6">
          {row.loadError ? (
            <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
              {row.loadError}
            </p>
          ) : null}

          {lastDistribution &&
          lastDistribution.user.toLowerCase() === row.address.toLowerCase() ? (
            <DistributionPanel dist={lastDistribution} showRecycling={false} />
          ) : null}

          {/* User Information */}
          <section>
            <h3 className="text-sm font-semibold text-ink mb-2">
              User Information
            </h3>
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <InfoRow label="Status" value={row.registered ? (row.packageAmount > 0 ? "Active" : "Registered") : "Wallet only"} />
              <InfoRow label="Wallet" value={shortAddr(row.address, 6)} mono />
              <InfoRow
                label="Sponsor"
                value={
                  row.sponsor &&
                  row.sponsor !== "0x0000000000000000000000000000000000000000"
                    ? shortAddr(row.sponsor, 4)
                    : row.registered
                      ? "Root / none"
                      : "—"
                }
                mono
              />
              <InfoRow
                label="Package"
                value={
                  row.packageAmount > 0 ? fmtUsd(row.packageAmount) : "None"
                }
              />
              <InfoRow
                label="Progress"
                value={
                  row.packageAmount > 0
                    ? `${row.packageCycle} / 2${row.packageCompleted ? " complete" : ""}`
                    : "—"
                }
              />
              <InfoRow
                label="Next"
                value={`${fmtUsd(row.nextPackage)} C${row.nextCycle}`}
              />
              <InfoRow
                label="Rank"
                value={
                  row.forcedRank
                    ? `${RANK_NAMES[row.rank] ?? row.rank} (QA forced — not earned)`
                    : `${RANK_NAMES[row.rank] ?? row.rank}${row.seedQualified ? " · earned" : ""}`
                }
              />
              <InfoRow label="BV (personal)" value={row.personalVolume} mono />
              <InfoRow
                label="GV / Max leg"
                value={`${row.groupVolume} / ${row.maxLegVolume}`}
                mono
              />
              <InfoRow label="Directs" value={String(row.directCount)} />
              <InfoRow
                label="Seed rules"
                value={
                  row.seedQualified
                    ? "OK (2 directs · max leg ≥250 · GV ≥500)"
                    : `Need: directs ${row.directCount}/2 · maxLeg ${row.maxLegVolume}/250 · GV ${row.groupVolumeNum}/500`
                }
              />
              <InfoRow
                label="GA"
                value={row.gaActive ? "Active (L1 10%)" : "Inactive (L1 5%)"}
              />
            </dl>
          </section>

          {/* Package Progress */}
          <section>
            <h3 className="text-sm font-semibold text-ink mb-2">
              Package Progress
            </h3>
            <div className="flex flex-col">
              {PACKAGE_LADDER.flatMap((amt, i) => {
                const steps = ([1, 2] as const).map((cycle) => {
                  const tone = packageStepTone(amt, cycle, row);
                  const last =
                    amt === PACKAGE_LADDER[PACKAGE_LADDER.length - 1] &&
                    cycle === 2;
                  return (
                    <FlowStep
                      key={`${amt}-C${cycle}`}
                      label={`${fmtUsd(amt)} · C${cycle}`}
                      detail={
                        tone === "ok"
                          ? "Completed"
                          : tone === "default"
                            ? "Current"
                            : "Locked"
                      }
                      tone={tone}
                      last={last}
                    />
                  );
                });
                return i === 0 ? steps : steps;
              })}
            </div>
          </section>

          {/* Income Breakdown */}
          <section>
            <h3 className="text-sm font-semibold text-ink mb-2">
              Income Breakdown
            </h3>
            <ul className="grid gap-1.5 text-xs sm:grid-cols-2 mb-4">
              <IncomeLine label="Self ROI" value={income?.roiEarned ?? "0"} />
              <IncomeLine
                label="Contribution"
                value={income?.contributionEarned ?? "0"}
              />
              <IncomeLine label="Rank" value={income?.rankEarned ?? "0"} />
              <IncomeLine
                label="SameRank"
                value={income?.sameRankEarned ?? "0"}
              />
              <IncomeLine
                label="Community"
                value={income?.communityEarned ?? "0"}
              />
              <IncomeLine
                label="Booster"
                value={income?.boosterEarned ?? "0"}
              />
            </ul>
            <p className="text-[11px] text-muted mb-2">
              Recycling flow (sample gross {recycle?.gross ?? "100"})
            </p>
            <div className="flex flex-col">
              <FlowStep
                label={`Gross ${recycle?.gross ?? "—"}`}
                detail="Income before recycle split"
              />
              <FlowStep
                label="70% User / 30% Recycled"
                detail={`User ${recycle?.userPayout ?? "—"}`}
                tone="ok"
              />
              <FlowStep
                label="25% ROI / 3% Reserve / 2% Community"
                detail={`ROI ${recycle?.toRoiPool ?? "—"} · Reserve ${recycle?.toReserve ?? "—"} · Community ${recycle?.toCommunity ?? "—"}`}
                tone="default"
              />
              <FlowStep
                label={`Net to user ${recycle?.userPayout ?? "—"}`}
                detail="After 30% recycle"
                tone="ok"
                last
              />
            </div>
          </section>

          {/* Direct Income */}
          <section>
            <h3 className="text-sm font-semibold text-ink mb-2">
              Direct Income
            </h3>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge tone={row.gaActive ? "accent" : "default"}>
                L1 {row.gaActive ? "10%" : "5%"}
                {row.gaActive ? " (GA)" : ""}
              </Badge>
              <Badge>L2 3%</Badge>
              <Badge>L3 2%</Badge>
            </div>
            <p className="mt-2 text-[11px] text-muted">
              When Growth Accelerator is active, L1 doubles from 5% to 10%.
            </p>
          </section>

          {/* Referral children */}
          <section>
            <h3 className="text-sm font-semibold text-ink mb-2">
              Referral ({children.length})
            </h3>
            {children.length ? (
              <ul className="space-y-1 text-xs">
                {children.map((c) => (
                  <li
                    key={c.address}
                    className="flex justify-between gap-2 rounded-md border border-line/60 px-2 py-1.5"
                  >
                    <span>{c.label || `User ${c.id}`}</span>
                    <span className="font-mono text-muted">
                      {shortAddr(c.address, 4)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted">
                No tracked downline with this sponsor.
              </p>
            )}
          </section>

          {/* Transaction History */}
          <section>
            <h3 className="text-sm font-semibold text-ink mb-2">
              Transaction History
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted border-b border-line">
                  <tr>
                    <th className="py-2 pr-2">Date</th>
                    <th className="py-2 pr-2">Action</th>
                    <th className="py-2 pr-2">Hash</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedTxs.map((tx) => (
                    <tr key={tx.id} className="border-b border-line/50">
                      <td className="py-2 pr-2 text-muted">
                        {new Date(tx.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2 pr-2">{tx.method}</td>
                      <td className="py-2 pr-2 font-mono">
                        {tx.hash ? shortAddr(tx.hash, 5) : "—"}
                      </td>
                      <td className="py-2">
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
                    </tr>
                  ))}
                  {!relatedTxs.length ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted">
                        No related session transactions
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </Modal>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2 rounded-md border border-line/60 px-2 py-1.5">
      <dt className="text-muted">{label}</dt>
      <dd className={mono ? "font-mono text-ink" : "text-ink"}>{value}</dd>
    </div>
  );
}

function IncomeLine({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex justify-between gap-2 rounded-md border border-line/60 px-2 py-1.5">
      <span className="text-muted">{label}</span>
      <span className="font-mono text-ink">{value}</span>
    </li>
  );
}
