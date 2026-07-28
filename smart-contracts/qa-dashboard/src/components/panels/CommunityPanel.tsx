import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StatCard,
} from "@/components/ui/card";
import {
  getSignerFor,
  useContracts,
  useTxRunner,
  walletFromIndex,
} from "@/hooks/useContracts";
import { RANK_NAMES } from "@/lib/constants";
import { fmtToken } from "@/lib/format";
import { shortAddr } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";
import type { Contract } from "ethers";

const POINTS_MAP = [
  { rank: 5, name: "Forest", points: 1 },
  { rank: 6, name: "Biome", points: 2 },
  { rank: 7, name: "Ecosphere", points: 3 },
  { rank: 8, name: "Genesis", points: 4 },
] as const;

export function CommunityPanel() {
  const contracts = useContracts();
  const { run } = useTxRunner();
  const selectedUser = useDashboardStore((s) => s.selectedUser);
  const users = useDashboardStore((s) => s.users);
  const busy = useDashboardStore((s) => s.busy);
  const tick = useDashboardStore((s) => s.refreshTick);

  const [pool, setPool] = useState("—");
  const [pending, setPending] = useState("—");
  const [points, setPoints] = useState("—");
  const [round, setRound] = useState("—");
  const [userRank, setUserRank] = useState(0);
  const [totalPoints, setTotalPoints] = useState("—");

  const tracked = users.find(
    (u) => u.address.toLowerCase() === selectedUser?.toLowerCase(),
  );

  const refresh = useCallback(async () => {
    if (!contracts) return;
    const [fund, r, tp] = await Promise.all([
      contracts.treasury.communityBuilderFundBalance(),
      contracts.community.currentRound(),
      contracts.community.totalPoints(),
    ]);
    setPool(fmtToken(fund));
    setRound(String(r));
    setTotalPoints(String(tp));

    if (selectedUser) {
      const [pts, pend, rank] = await Promise.all([
        contracts.community.userPoints(selectedUser),
        contracts.community.getPendingReward(selectedUser),
        contracts.rank.userRanks(selectedUser),
      ]);
      setPoints(String(pts));
      setPending(fmtToken(pend));
      setUserRank(Number(rank));
    } else {
      setPoints("—");
      setPending("—");
      setUserRank(0);
    }
  }, [contracts, selectedUser, tick]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const claim = async () => {
    if (!selectedUser) return;
    await run(`Claim community ${shortAddr(selectedUser)}`, async (c) => {
      const signer =
        tracked?.walletIndex != null
          ? walletFromIndex(tracked.walletIndex, c.provider)
          : await getSignerFor(c, selectedUser);
      const community = c.community.connect(signer) as Contract;
      const tx = await community.claimCommunityReward();
      const receipt = await tx.wait();
      return { hash: tx.hash as string, receipt };
    });
  };

  const startRound = async () => {
    await run("Start distribution round", async (c) => {
      const tx = await c.community.startDistributionRound();
      const receipt = await tx.wait();
      return { hash: tx.hash as string, receipt };
    });
  };

  const closeRound = async () => {
    await run("Close distribution round", async (c) => {
      const tx = await c.community.closeDistributionRound();
      const receipt = await tx.wait();
      return { hash: tx.hash as string, receipt };
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Community Builder</h2>
          <p className="text-xs text-muted">
            Points for Forest–Genesis · proportional pool claims
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={!contracts || busy}
            onClick={() => void startRound()}
          >
            Start round (owner)
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!contracts || busy}
            onClick={() => void closeRound()}
          >
            Close round (owner)
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!contracts || busy || !selectedUser}
            onClick={() => void claim()}
          >
            Claim
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!contracts || busy}
            onClick={() => void refresh()}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Community pool" value={pool} tone="accent" />
        <StatCard label="Current round" value={round} />
        <StatCard label="Total points" value={totalPoints} />
        <StatCard
          label="User points"
          value={points}
          hint={
            selectedUser
              ? `${RANK_NAMES[userRank] ?? userRank}`
              : "Select user"
          }
        />
        <StatCard label="Pending reward" value={pending} tone="ok" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Points mapping</CardTitle>
          <CardDescription>Q5–Q8 ranks → community points</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {POINTS_MAP.map((p) => (
              <div
                key={p.rank}
                className="rounded-lg border border-line/70 bg-surface px-3 py-3"
              >
                <div className="text-[11px] uppercase tracking-wider text-muted">
                  Rank {p.rank}
                </div>
                <div className="mt-1 text-sm font-semibold text-ink">{p.name}</div>
                <div className="mt-2 font-mono text-accent">{p.points} pt</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
