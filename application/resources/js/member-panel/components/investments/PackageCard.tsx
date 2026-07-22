import { CheckCircle2, Circle, Lock } from 'lucide-react';

export type InvestPackageState = 'completed' | 'available' | 'selected' | 'locked';

export type InvestPackage = {
  amount: number;
  label: string;
  multiplier: string;
  buys: number;
  maxBuys: number;
  unlimited?: boolean;
  locked: boolean;
};

type PackageCardProps = {
  pkg: InvestPackage;
  selected: boolean;
  onSelect: () => void;
};

export function PackageCard({ pkg, selected, onSelect }: PackageCardProps) {
  const completed = !pkg.locked && pkg.buys >= 1 && pkg.buys < pkg.maxBuys;
  const fullyDone = !pkg.locked && pkg.buys >= pkg.maxBuys;
  const locked = pkg.locked;
  const disabled = locked;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={[
        'relative flex min-h-[118px] w-full flex-col items-center justify-center rounded-2xl border px-3 py-4 text-center transition-all duration-300',
        selected
          ? 'border-q-cyan/60 bg-q-cyan/10 text-q-cyan shadow-[0_0_0_1px_rgba(0,217,255,0.35),0_12px_30px_rgba(0,217,255,0.18)]'
          : locked
            ? 'cursor-not-allowed border-white/[0.06] bg-white/[0.02] text-q-muted opacity-55'
            : 'border-white/[0.08] bg-white/[0.03] text-white hover:-translate-y-0.5 hover:border-q-cyan/30 hover:bg-q-cyan/5',
      ].join(' ')}
    >
      {pkg.unlimited ? (
        <span className="absolute -top-2 right-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
          Unlimited
        </span>
      ) : null}

      <p className={`text-xl font-extrabold ${selected ? 'text-q-cyan' : locked ? 'text-q-muted' : 'text-white'}`}>
        {pkg.label}
      </p>
      <p className="mt-1 text-[11px] font-medium text-q-muted">{pkg.multiplier}</p>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold">
        {locked ? (
          <>
            <Lock className="h-3.5 w-3.5" />
            <span>Locked</span>
          </>
        ) : fullyDone || completed ? (
          <>
            <CheckCircle2 className={`h-3.5 w-3.5 ${completed || fullyDone ? 'text-emerald-400' : ''}`} />
            <span className={completed || fullyDone ? 'text-emerald-300' : ''}>
              Buy {pkg.buys} of {pkg.maxBuys}
            </span>
          </>
        ) : (
          <>
            <Circle className="h-3.5 w-3.5 text-q-muted" />
            <span className="text-q-muted">
              Buy {pkg.buys} of {pkg.maxBuys}
            </span>
          </>
        )}
      </div>
    </button>
  );
}
