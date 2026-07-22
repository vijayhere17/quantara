import type { ReactNode } from 'react';
import { Card } from './Card';

type SuccessCardProps = {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function SuccessCard({
  icon,
  title,
  subtitle,
  children,
  actions,
  className = '',
}: SuccessCardProps) {
  return (
    <Card
      hover={false}
      className={`relative mx-auto w-full max-w-[640px] overflow-hidden border-emerald-400/25 p-6 shadow-[0_0_0_1px_rgba(52,211,153,0.12),0_0_48px_rgba(52,211,153,0.10)] sm:p-8 ${className}`}
    >
      <div
        className="pointer-events-none absolute -left-12 top-0 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-10 bottom-0 h-36 w-36 rounded-full bg-q-cyan/10 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        {icon ? <div className="mb-5 animate-fade-in">{icon}</div> : null}
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-md text-sm text-q-muted">{subtitle}</p> : null}
        {children ? <div className="mt-7 w-full text-left">{children}</div> : null}
        {actions ? <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">{actions}</div> : null}
      </div>
    </Card>
  );
}
