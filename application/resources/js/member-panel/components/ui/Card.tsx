import type { ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  className?: string;
  hover?: boolean;
};

export function Card({ children, className = '', hover = true }: CardProps) {
  return (
    <div className={`q-card h-full ${hover ? '' : 'hover:translate-y-0 hover:shadow-card'} ${className}`}>
      {children}
    </div>
  );
}
