type Crumb = {
  label: string;
  href?: string;
};

type PageHeaderProps = {
  title: string;
  crumbs: Crumb[];
  actions?: React.ReactNode;
};

export function PageHeader({ title, crumbs, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1;
              return (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                  {index > 0 ? <span className="text-q-muted/70">/</span> : null}
                  {crumb.href && !isLast ? (
                    <a
                      href={crumb.href}
                      className="font-medium text-q-cyan transition-colors hover:text-white"
                    >
                      {crumb.label}
                    </a>
                  ) : (
                    <span className={isLast ? 'text-q-muted' : 'text-q-cyan'}>{crumb.label}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
