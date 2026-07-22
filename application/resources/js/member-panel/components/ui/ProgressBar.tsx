type ProgressBarProps = {
  value: number;
  className?: string;
  trackClassName?: string;
  fillClassName?: string;
};

export function ProgressBar({
  value,
  className = '',
  trackClassName = '',
  fillClassName = '',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={`q-progress-track ${trackClassName} ${className}`} role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div className={`q-progress-fill ${fillClassName}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}
