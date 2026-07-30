import type { CapMeter } from '../../types';

type SemiCircleMeterProps = {
  title: string;
  multiplierLabel: string;
  meter: CapMeter;
  accent?: 'green' | 'blue';
};

export function SemiCircleMeter({
  title,
  multiplierLabel,
  meter,
  accent = 'green',
}: SemiCircleMeterProps) {
  const pct = Math.min(100, Math.max(0, meter.progress));
  const maxMult = multiplierLabel.includes('3') ? 3 : 4;
  const multDisplay = ((pct / 100) * maxMult).toFixed(2);

  const stroke = accent === 'green' ? '#34d399' : '#38bdf8';
  const strokeGlow = accent === 'green' ? 'rgba(52,211,153,0.35)' : 'rgba(56,189,248,0.35)';
  const track = 'rgba(255,255,255,0.1)';

  const r = 56;
  const cx = 70;
  const cy = 68;
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const circumference = Math.PI * r;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="q-dash-card p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative w-[140px] shrink-0">
          <svg viewBox="0 0 140 80" className="h-auto w-full" aria-hidden>
            <defs>
              <filter id={`glow-${accent}`}>
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path d={arcPath} fill="none" stroke={track} strokeWidth="9" strokeLinecap="round" />
            <path
              d={arcPath}
              fill="none"
              stroke={stroke}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              filter={`url(#glow-${accent})`}
              className="transition-all duration-700 ease-out"
              style={{ filter: `drop-shadow(0 0 6px ${strokeGlow})` }}
            />
          </svg>
          <div className="absolute inset-x-0 bottom-1 text-center">
            <p className="text-lg font-bold tabular-nums text-white">
              {multDisplay}{' '}
              <span className="text-xs font-medium text-q-muted">of {maxMult}X</span>
            </p>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-q-muted">Progress</span>
            <span className="text-sm font-bold tabular-nums text-white">{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-700 ${accent === 'green' ? 'bg-emerald-400' : 'bg-sky-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs tabular-nums text-q-soft">
            <span className="font-semibold text-white">{meter.earned}</span>
            <span className="text-q-muted"> / </span>
            {meter.cap}
          </p>
          <p className="text-[11px] text-q-muted">
            Remaining: <span className="font-medium text-q-soft">{meter.remaining}</span>
          </p>
          {meter.isCapped ? (
            <span className="inline-block rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-200">
              Cap reached
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
