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
import { Select } from "@/components/ui/input";
import {
  getSignerFor,
  increaseTime,
  useContracts,
  useTxRunner,
  walletFromIndex,
} from "@/hooks/useContracts";
import { RANK_NAMES } from "@/lib/constants";
import { fmtToken, pctBps } from "@/lib/format";
import { shortAddr } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";
import type { Contract } from "ethers";

export function TierBoosterPanel() {
  const contracts = useContracts();
  const { run } = useTxRunner();
  const users = useDashboardStore((s) => s.users);
  const selectedUser = useDashboardStore((s) => s.selectedUser);
  const busy = useDashboardStore((s) => s.busy);
  const tick = useDashboardStore((s) => s.refreshTick);
  const addLog = useDashboardStore((s) => s.addLog);

  const [sponsor, setSponsor] = useState("");
  const [direct, setDirect] = useState("");
  const [rankTo, setRankTo] = useState(1);
  const [tierBps, setTierBps] = useState("—");
  const [sameRankEarned, setSameRankEarned] = useState("—");
  const [directRoi, setDirectRoi] = useState("—");
  const [expected, setExpected] = useState("—");

  useEffect(() => {
    if (selectedUser && !sponsor) setSponsor(selectedUser);
  }, [selectedUser, sponsor]);

  const refresh = useCallback(async () => {
    if (!contracts) return;
    try {
      const bps = await contracts.rank.TIER_BOOSTER_BPS();
      setTierBps(pctBps(bps));
      if (sponsor) {
        const inc = await contracts.income.incomes(sponsor);
        setSameRankEarned(fmtToken(inc.sameRankEarned ?? inc[5]));
      }
      if (direct) {
        const inc = await contracts.income.incomes(direct);
        const roi = BigInt(inc.roiEarned ?? inc[1] ?? 0);
        setDirectRoi(fmtToken(roi));
        const expectedAmt = (roi * BigInt(bps)) / 10000n;
        setExpected(fmtToken(expectedAmt));
      }
    } catch (e) {
      addLog("error", "Tier refresh failed", String(e));
    }
  }, [contracts, sponsor, direct, tick, addLog]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const forceSameRank = async () => {
    if (!sponsor || !direct) {
      addLog("warn", "Pick sponsor and direct");
      return;
    }
    await run(
      `Force same rank ${RANK_NAMES[rankTo]} on sponsor+direct`,
      async (c) => {
        const tx1 = await c.rank.setRank(sponsor, rankTo);
        await tx1.wait();
        const tx2 = await c.rank.setRank(direct, rankTo);
        const receipt = await tx2.wait();
        return { hash: tx2.hash as string, receipt };
      },
    );
  };

  const generateSelfRoi = async () => {
    if (!direct) {
      addLog("warn", "Select a direct");
      return;
    }
    await run(`+1d claim Self ROI on direct ${shortAddr(direct)}`, async (c) => {
      await increaseTime(c.provider, 24 * 60 * 60);
      const tracked = users.find(
        (u) => u.address.toLowerCase() === direct.toLowerCase(),
      );
      const signer =
        tracked?.walletIndex != null
          ? walletFromIndex(tracked.walletIndex, c.provider)
          : await getSignerFor(c, direct);
      const roi = c.roi.connect(signer) as Contract;
      const tx = await roi.claimRoi();
      const receipt = await tx.wait();
      return { hash: tx.hash as string, receipt };
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Tier Booster (Same Rank)</h2>
        <p className="text-xs text-muted">
          10% of every income (Self ROI, Direct, Rank, Community, …) when sponsor
          and direct share the same rank
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select pair</CardTitle>
          <CardDescription>Sponsor receives same-rank / tier booster</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-muted">
            Sponsor
            <Select
              className="mt-1"
              value={sponsor}
              onChange={(e) => setSponsor(e.target.value)}
            >
              <option value="">—</option>
              {users.map((u) => (
                <option key={u.address} value={u.address}>
                  U{u.id} {shortAddr(u.address)}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-xs text-muted">
            Direct
            <Select
              className="mt-1"
              value={direct}
              onChange={(e) => setDirect(e.target.value)}
            >
              <option value="">—</option>
              {users.map((u) => (
                <option key={u.address} value={u.address}>
                  U{u.id} {shortAddr(u.address)}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-xs text-muted">
            Force rank
            <Select
              className="mt-1"
              value={String(rankTo)}
              onChange={(e) => setRankTo(Number(e.target.value))}
            >
              {RANK_NAMES.map((n, i) =>
                i === 0 ? null : (
                  <option key={n} value={i}>
                    {n}
                  </option>
                ),
              )}
            </Select>
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <Button
              size="sm"
              disabled={!contracts || busy}
              onClick={() => void forceSameRank()}
            >
              Force Same Rank
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!contracts || busy}
              onClick={() => void generateSelfRoi()}
            >
              Gen Self ROI (+1d claim)
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!contracts || busy}
              onClick={() => void refresh()}
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tier BPS" value={tierBps} tone="accent" />
        <StatCard label="Direct Self ROI" value={directRoi} />
        <StatCard label="Expected 10%" value={expected} tone="ok" />
        <StatCard label="sameRankEarned (sponsor)" value={sameRankEarned} />
      </div>
    </div>
  );
}
