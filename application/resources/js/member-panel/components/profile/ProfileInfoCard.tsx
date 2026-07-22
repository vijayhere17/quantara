type InfoRow = {
  label: string;
  value: React.ReactNode;
};

type ProfileInfoCardProps = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  rows: InfoRow[];
  action?: React.ReactNode;
  className?: string;
};

export function ProfileInfoCard({
  title,
  subtitle,
  icon,
  rows,
  action,
  className = '',
}: ProfileInfoCardProps) {
  return (
    <div className={`q-card h-full p-5 sm:p-6 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {icon ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-q-cyan/10 text-q-cyan">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-white sm:text-lg">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-q-muted">{subtitle}</p> : null}
          </div>
        </div>
        {action}
      </div>

      <ul className="divide-y divide-white/[0.06]">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <span className="shrink-0 text-sm text-q-muted">{row.label}</span>
            <span className="min-w-0 break-all text-right text-sm font-medium text-white">
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
