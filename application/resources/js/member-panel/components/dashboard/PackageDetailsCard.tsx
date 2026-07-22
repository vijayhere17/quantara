import { Rocket } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { GradientButton } from '../ui/GradientButton';
import type { DashboardBoot } from '../../types';

type PackageDetailsCardProps = {
  data: DashboardBoot;
};

export function PackageDetailsCard({ data }: PackageDetailsCardProps) {
  const hasPackage = Boolean(data.user.packageName);
  const [selected, setSelected] = useState<number | null>(data.selectedPackage);

  return (
    <Card className="flex flex-col p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">Package Details</h3>
        <Badge tone="cyan">Plan Status</Badge>
      </div>

      {hasPackage ? (
        <ul className="mb-4 space-y-0 divide-y divide-white/[0.06]">
          <li className="flex items-center justify-between py-3">
            <span className="text-sm text-q-muted">Package</span>
            <span className="text-sm font-medium text-white">{data.user.packageName}</span>
          </li>
          <li className="flex items-center justify-between py-3">
            <span className="text-sm text-q-muted">Invested Amount</span>
            <span className="text-sm font-medium text-white">{data.user.packageAmount}</span>
          </li>
          <li className="flex items-center justify-between py-3">
            <span className="text-sm text-q-muted">Daily ROI</span>
            <span className="text-sm font-medium text-white">{data.user.packageRoi}%</span>
          </li>
          <li className="flex items-center justify-between py-3">
            <span className="text-sm text-q-muted">ROI Cap Rule</span>
            <span className="text-sm font-medium text-white">3X Maximum</span>
          </li>
        </ul>
      ) : (
        <>
          <p className="mb-4 text-sm text-q-muted">No active package yet.</p>
          <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {data.packages.map((pkg) => {
              const active = selected === pkg.amount;
              return (
                <button
                  key={pkg.amount}
                  type="button"
                  onClick={() => setSelected(pkg.amount)}
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-all duration-300 ${
                    active
                      ? 'border-q-cyan/50 bg-q-cyan/15 text-q-cyan shadow-[0_0_18px_rgba(0,212,255,0.18)]'
                      : 'border-white/[0.08] bg-white/[0.04] text-white hover:border-q-cyan/30 hover:bg-q-cyan/10'
                  }`}
                >
                  {pkg.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-auto">
        <GradientButton href={data.links.investNow} fullWidth>
          <Rocket className="h-4 w-4" />
          Stake Now
        </GradientButton>
      </div>
    </Card>
  );
}
