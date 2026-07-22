type SectionTitleProps = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export function SectionTitle({ title, subtitle, icon, action, className = '' }: SectionTitleProps) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-q-cyan/10 text-q-cyan">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white sm:text-lg">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-q-muted">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}
