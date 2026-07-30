import type { CapMeter } from '../../types';

type SemiCircleMeterProps = {
  title: string;
  subtitle: string;
  meter: CapMeter;
  accent?: 'cyan' | 'violet';
};

export function SemiCircleMeter({
  title,
  subtitle,
  meter,
  accent = 'cyan',
}: SemiCircleMeterProps) {
  const pct = Math.min(100, Math.max(0, meter.progress));
  const stroke = accent === 'cyan' ? '#00B5FF' : '#8B7CFF';
  const track = 'rgba(255,255,255,0.08)';

  // Semi-circle arc: center bottom, radius 72
  const r = 72;
  const cx = 90;
  const cy = 88;
  const startX = cx - r;
  const startY = cy;
  const endX = cx + r;
  const endY = cy;
  const arcPath = `M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}`;
  const circumference = Math.PI * r;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="q-glass-card flex h-full flex-col p-4 sm:p-5">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-[11px] text-q-muted">{subtitle}</p>
        </div>
        {meter.isCapped ? (
          <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
            Capped
          </span>
        ) : null}
      </div>

      <div className="relative mx-auto mt-1 w-full max-w-[180px]">
        <svg viewBox="0 0 180 100" className="h-auto w-full" aria-hidden>
          <path d={arcPath} fill="none" stroke={track} strokeWidth="10" strokeLinecap="round" />
          <path
            d={arcPath}
            fill="none"
            stroke={stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <p className="text-2xl font-bold tabular-nums text-white">{pct}%</p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-3 text-center">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-q-muted">Earned</dt>
          <dd className="mt-0.5 text-xs font-semibold tabular-nums text-white">{meter.earned}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-q-muted">Remaining</dt>
          <dd className="mt-0.5 text-xs font-semibold tabular-nums text-white">{meter.remaining}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-q-muted">Cap</dt>
          <dd className="mt-0.5 text-xs font-semibold tabular-nums text-q-soft">{meter.cap}</dd>
        </div>
      </dl>
    </div>
  );
}
