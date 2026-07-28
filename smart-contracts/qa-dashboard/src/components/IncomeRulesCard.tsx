import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/input";
import { useContracts } from "@/hooks/useContracts";
import { loadRankProgress } from "@/lib/rankProgress";
import { RANK_NAMES } from "@/lib/constants";
import { pctBps } from "@/lib/format";
import { fmtToken } from "@/lib/format";
import { useDashboardStore } from "@/store/dashboardStore";

const RANK_PCT: Record<number, string> = {
  1: "10%",
  2: "15%",
  3: "20%",
  4: "25%",
  5: "30%",
  6: "35%",
  7: "40%",
  8: "45%",
};

export function IncomeRulesCard({ userAddress }: { userAddress: string }) {
  const contracts = useContracts();
  const tick = useDashboardStore((s) => s.refreshTick);
  const users = useDashboardStore((s) => s.users);

  const [gaActive, setGaActive] = useState(false);
  const [fiftyFifty, setFiftyFifty] = useState("—");
  const [l1Bps, setL1Bps] = useState("—");
  const [rankName, setRankName] = useState("None");
  const [rankPct, setRankPct] = useState("0%");
  const [directRank, setDirectRank] = useState<string>("—");
  const [diffNote, setDiffNote] = useState("—");
  const [tierNote, setTierNote] = useState("—");

  const refresh = useCallback(async () => {
    if (!contracts || !userAddress) return;
    try {
      const [ff, active, bps, progress] = await Promise.all([
        contracts.booster.getFiftyFiftyVolume(userAddress),
        contracts.booster.isBoosterActive(userAddress),
        contracts.contribution.getLevel1Bps(userAddress),
        loadRankProgress(contracts, userAddress),
      ]);
      setFiftyFifty(fmtToken(ff));
      setGaActive(Boolean(active));
      setL1Bps(pctBps(bps));
      setRankName(progress.rankName);
      setRankPct(progress.rewardPct);

      const tracked = users.find(
        (u) => u.address.toLowerCase() === userAddress.toLowerCase(),
      );
      let firstDirect = "";
      try {
        const n = await contracts.rank.directCount(userAddress);
        if (Number(n) > 0) {
          firstDirect = String(await contracts.rank.directUsers(userAddress, 0));
        }
      } catch {
        /* */
      }

      if (firstDirect) {
        const dRank = Number(await contracts.rank.userRanks(firstDirect));
        setDirectRank(RANK_NAMES[dRank] ?? String(dRank));
        const uPct = progress.rank;
        const dPct = dRank;
        if (uPct > 0 && dPct > 0 && uPct === dPct) {
          setTierNote("Same rank → you earn 10% of direct's Self ROI (Tier Booster)");
          setDiffNote("Same rank → no rank gap; Tier Booster applies instead");
        } else if (uPct > dPct && dPct > 0) {
          const gap =
            Number(RANK_PCT[uPct]?.replace("%", "") ?? 0) -
            Number(RANK_PCT[dPct]?.replace("%", "") ?? 0);
          setDiffNote(
            `You ${RANK_PCT[uPct]} − direct ${RANK_PCT[dPct]} = ${gap}% on their Self ROI`,
          );
          setTierNote("Ranks differ → no Tier Booster");
        } else if (uPct > 0 && dPct === 0) {
          setDiffNote(`Direct unranked → you get full ${progress.rewardPct} on their Self ROI`);
          setTierNote("Direct not ranked → no Tier Booster");
        } else {
          setDiffNote("Earn rank on Self ROI when downline claims");
          setTierNote("Need same rank on direct for Tier Booster");
        }
      } else {
        setDirectRank("—");
        setDiffNote("Add a direct to test rank gap / Tier Booster");
        setTierNote("—");
      }
    } catch {
      /* */
    }
  }, [contracts, userAddress, users, tick]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <Card className="border-line/80">
      <CardHeader>
        <CardTitle>Income rules (live for selected user)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-line bg-surface p-3 space-y-1">
            <div className="font-medium text-ink">Growth Accelerator</div>
            <p className="text-muted leading-relaxed">
              Within <strong className="text-ink">30 days of join</strong>, hit{" "}
              <strong className="text-ink">$1000 or $3000</strong> team BV (50:50 legs)
              → <strong className="text-ink">L1 Direct 10%</strong> for next 30 days
              (replaces 5%).
            </p>
            <div className="flex flex-wrap gap-1 pt-1">
              <Badge tone={gaActive ? "ok" : "default"}>
                {gaActive ? "GA active" : "GA off"}
              </Badge>
              <Badge>L1 {l1Bps}</Badge>
              <Badge>50:50 {fiftyFifty}</Badge>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-surface p-3 space-y-1">
            <div className="font-medium text-ink">Rank / Team ROI (difference)</div>
            <p className="text-muted leading-relaxed">
              When a downline <strong className="text-ink">claims Self ROI</strong>,
              you get only the <strong className="text-ink">rank % gap</strong> (not full
              rank % if they already have a rank).
            </p>
            <StatCard
              label={`You: ${rankName} ${rankPct} · Direct: ${directRank}`}
              value={diffNote}
            />
          </div>

          <div className="rounded-lg border border-line bg-surface p-3 space-y-1">
            <div className="font-medium text-ink">Tier Booster</div>
            <p className="text-muted leading-relaxed">
              If you and your <strong className="text-ink">direct</strong> have the{" "}
              <strong className="text-ink">same rank</strong>, you get{" "}
              <strong className="text-ink">10%</strong> of their Self ROI (not rank gap).
            </p>
            <p className="text-ink pt-1">{tierNote}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
