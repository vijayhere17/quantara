import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import type { DashboardBoot } from '../../types';

type RoiProgressProps = {
  roi: DashboardBoot['roi'];
};

export function RoiProgress({ roi }: RoiProgressProps) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">ROI Progress</h3>
        <Badge tone="purple">3X Limit</Badge>
      </div>

      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-q-muted">
        Total ROI Progress
      </p>

      <div className="mb-4 flex items-end justify-between gap-3">
        <p className="text-3xl font-bold text-white">{roi.earned}</p>
        <p className="pb-1 text-sm font-semibold text-q-cyan">{roi.progress}%</p>
      </div>

      <ProgressBar value={roi.progress} className="mb-5" />

      <div className="rounded-2xl border border-white/[0.05] bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-q-muted">Remaining 3X</span>
          <strong className="text-sm font-semibold text-white">{roi.remaining}</strong>
        </div>
      </div>
    </Card>
  );
}
