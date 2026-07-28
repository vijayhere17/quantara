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
import { useContracts, useTxRunner } from "@/hooks/useContracts";
import { RANK_NAMES } from "@/lib/constants";
import { fmtToken, pctBps } from "@/lib/format";
import { shortAddr } from "@/lib/utils";
import { useDashboardStore } from "@/store/dashboardStore";

export function RankPanel() {
  const contracts = useContracts();
  const { run } = useTxRunner();
  const selectedUser = useDashboardStore((s) => s.selectedUser);
  const busy = useDashboardStore((s) => s.busy);
  const tick = useDashboardStore((s) => s.refreshTick);
  const addLog = useDashboardStore((s) => s.addLog);

  const [rank, setRank] = useState(0);
  const [bps, setBps] = useState("—");
  const [nextRank, setNextRank] = useState(1);
  const [nextBps, setNextBps] = useState("—");
  const [directs, setDirects] = useState("—");
  const [pv, setPv] = useState("—");
  const [gv, setGv] = useState("—");
  const [setTo, setSetTo] = useState(1);
  const [note, setNote] = useState("");

  const refresh = useCallback(async () => {
    if (!contracts || !selectedUser) return;
    try {
      const r = Number(await contracts.rank.userRanks(selectedUser));
      setRank(r);
      const nb = r < 8 ? r + 1 : 8;
      setNextRank(nb);
      const [curBps, nxtBps, d, personal, group] = await Promise.all([
        contracts.rank.rankRewardBps(r),
        contracts.rank.rankRewardBps(nb),
        contracts.rank.directCount(selectedUser),
        contracts.rank.personalVolume(selectedUser),
        contracts.rank.groupVolume(selectedUser),
      ]);
      setBps(pctBps(curBps));
      setNextBps(pctBps(nxtBps));
      setDirects(String(d));
      setPv(fmtToken(personal));
      setGv(fmtToken(group));
    } catch (e) {
      addLog("error", "Rank refresh failed", String(e));
    }
  }, [contracts, selectedUser, tick, addLog]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onUpdateRank = async () => {
    if (!selectedUser) return;
    await run(`updateRank ${shortAddr(selectedUser)}`, async (c) => {
      const tx = await c.rank.updateRank(selectedUser);
      const receipt = await tx.wait();
      setNote(
        `updateRank @ ${new Date().toLocaleString()} — on-chain history is not retained; only current rank is authoritative.`,
      );
      return { hash: tx.hash as string, receipt };
    });
  };

  const onSetRank = async () => {
    if (!selectedUser) return;
    await run(`setRank ${shortAddr(selectedUser)} → ${RANK_NAMES[setTo]}`, async (c) => {
      const tx = await c.rank.setRank(selectedUser, setTo);
      const receipt = await tx.wait();
      setNote(
        `Owner setRank to ${RANK_NAMES[setTo]} @ ${new Date().toLocaleString()}. QA override — not a natural qualification event.`,
      );
      return { hash: tx.hash as string, receipt };
    });
  };

  if (!selectedUser) {
    return (
      <Card>
        <CardContent className="pt-4 text-sm text-muted">
          Select a user to inspect rank state.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Rank</h2>
          <p className="text-xs text-muted">{shortAddr(selectedUser)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={!contracts || busy}
            onClick={() => void onUpdateRank()}
          >
            updateRank
          </Button>
          <Select
            className="w-36"
            value={String(setTo)}
            onChange={(e) => setSetTo(Number(e.target.value))}
          >
            {RANK_NAMES.map((n, i) =>
              i === 0 ? null : (
                <option key={n} value={i}>
                  {n}
                </option>
              ),
            )}
          </Select>
          <Button
            size="sm"
            variant="secondary"
            disabled={!contracts || busy}
            onClick={() => void onSetRank()}
          >
            setRank (owner)
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
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Current rank"
          value={RANK_NAMES[rank] ?? rank}
          tone="accent"
        />
        <StatCard label="Current BPS" value={bps} />
        <StatCard
          label="Next rank"
          value={`${RANK_NAMES[nextRank] ?? nextRank} · ${nextBps}`}
        />
        <StatCard label="Directs" value={directs} />
        <StatCard label="Personal volume" value={pv} />
        <StatCard label="Group volume" value={gv} tone="ok" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History note</CardTitle>
          <CardDescription>
            Rank changes are not persisted as an event log in this dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted leading-relaxed">
          {note ||
            "No local rank actions yet this session. Use updateRank to recompute from volumes, or setRank as owner for QA overrides."}
        </CardContent>
      </Card>
    </div>
  );
}
