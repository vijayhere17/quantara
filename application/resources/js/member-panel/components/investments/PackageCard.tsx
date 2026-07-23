import { CheckCircle2, Circle, Infinity, Lock } from 'lucide-react';

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

/** $10000 tier (or explicit flag) is unlimited — never treat buy count as a hard stop. */
export function isUnlimitedPackage(pkg: Pick<InvestPackage, 'unlimited' | 'amount' | 'maxBuys'>): boolean {
  return Boolean(pkg.unlimited) || pkg.amount === 10000 || pkg.maxBuys >= 10000;
}

export function isPackageSelectable(pkg: InvestPackage): boolean {
  if (pkg.locked) return false;
  if (isUnlimitedPackage(pkg)) return true;
  return pkg.buys < pkg.maxBuys;
}

type PackageCardProps = {
  pkg: InvestPackage;
  selected: boolean;
  onSelect: () => void;
};

export function PackageCard({ pkg, selected, onSelect }: PackageCardProps) {
  const unlimited = isUnlimitedPackage(pkg);
  const locked = pkg.locked;
  const buyCapped = !unlimited && pkg.buys >= pkg.maxBuys;
  const disabled = locked || buyCapped;
  const completed = !locked && !unlimited && pkg.buys >= 1 && pkg.buys < pkg.maxBuys;
  const fullyDone = !locked && buyCapped;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={[
        'relative flex min-h-[118px] w-full flex-col items-center justify-center rounded-2xl border px-3 py-4 text-center transition-all duration-300',
        selected
          ? 'border-q-cyan/60 bg-q-cyan/10 text-q-cyan shadow-[0_0_0_1px_rgba(0,217,255,0.35),0_12px_30px_rgba(0,217,255,0.18)]'
          : disabled
            ? 'cursor-not-allowed border-white/[0.06] bg-white/[0.02] text-q-muted opacity-55'
            : 'border-white/[0.08] bg-white/[0.03] text-white hover:-translate-y-0.5 hover:border-q-cyan/30 hover:bg-q-cyan/5',
      ].join(' ')}
    >
      {unlimited ? (
        <span className="absolute -top-2 right-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
          Unlimited
        </span>
      ) : null}

      <p className={`text-xl font-extrabold ${selected ? 'text-q-cyan' : disabled ? 'text-q-muted' : 'text-white'}`}>
        {pkg.label}
      </p>
      <p className="mt-1 text-[11px] font-medium text-q-muted">{pkg.multiplier}</p>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold">
        {locked ? (
          <>
            <Lock className="h-3.5 w-3.5" />
            <span>Locked</span>
          </>
        ) : unlimited ? (
          <>
            <Infinity className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-emerald-300">Unlimited</span>
          </>
        ) : fullyDone || completed ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-emerald-300">
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
