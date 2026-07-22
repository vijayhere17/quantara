import type { ReactNode } from 'react';

type PageContainerProps = {
  children: ReactNode;
  className?: string;
  maxWidth?: 'default' | 'wide' | 'narrow';
};

const maxWidthMap = {
  default: 'max-w-[1440px]',
  wide: 'max-w-[1600px]',
  narrow: 'max-w-[1100px]',
};

export function PageContainer({
  children,
  className = '',
  maxWidth = 'default',
}: PageContainerProps) {
  return (
    <div className={`mx-auto flex w-full ${maxWidthMap[maxWidth]} flex-col gap-5 sm:gap-6 ${className}`}>
      {children}
    </div>
  );
}
