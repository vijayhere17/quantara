import type { ReactNode } from 'react';
import { Logo } from './Logo';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  className?: string;
  showLogo?: boolean;
};

export function EmptyState({
  icon,
  title,
  description,
  className = '',
  showLogo = false,
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center px-4 py-14 text-center ${className}`}>
      {showLogo ? (
        <div className="mb-5 opacity-90">
          <Logo size="md" imgClassName="max-w-[140px] opacity-80" />
        </div>
      ) : icon ? (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-q-cyan/10 text-q-cyan">
          {icon}
        </div>
      ) : null}
      <p className="text-base font-semibold text-white">{title}</p>
      {description ? <p className="mt-2 max-w-md text-sm text-q-muted">{description}</p> : null}
    </div>
  );
}
