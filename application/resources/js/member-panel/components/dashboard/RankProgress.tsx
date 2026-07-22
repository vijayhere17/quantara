import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import type { DashboardBoot } from '../../types';

type RankProgressProps = {
  rank: DashboardBoot['rank'];
};

export function RankProgress({ rank }: RankProgressProps) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">Rank Progress</h3>
        <Badge tone="cyan">{rank.current}</Badge>
      </div>

      {rank.next ? (
        <>
          <p className="mb-4 text-sm text-q-muted">
            Next Rank: <span className="font-semibold text-white">{rank.next}</span>
          </p>

          <ProgressBar value={rank.progress} className="mb-3" />

          <div className="mb-4 flex items-center justify-between text-xs text-q-muted">
            <span>Requirement</span>
            <span className="font-semibold text-q-cyan">{rank.progress}%</span>
          </div>

          <div className="space-y-3 rounded-2xl border border-white/[0.05] bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-q-muted">Team Volume</span>
              <strong className="text-sm text-white">{rank.teamVolume}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-q-muted">Required</span>
              <strong className="text-sm text-white">{rank.required ?? '—'}</strong>
            </div>
          </div>
        </>
      ) : (
        <div className="flex h-[180px] items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/5">
          <h4 className="text-base font-semibold text-emerald-300">Highest Rank Achieved</h4>
        </div>
      )}
    </Card>
  );
}
