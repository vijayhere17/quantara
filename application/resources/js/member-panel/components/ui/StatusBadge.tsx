type StatusBadgeProps = {
  status: 'active' | 'inactive' | 'pending' | string;
  className?: string;
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  const tone =
    normalized === 'active' || normalized === 'verified'
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-400/20'
      : normalized === 'inactive' || normalized === 'unverified'
        ? 'bg-rose-500/15 text-rose-300 border-rose-400/20'
        : 'bg-amber-400/15 text-amber-300 border-amber-400/20';

  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tone} ${className}`}
    >
      {label}
    </span>
  );
}
