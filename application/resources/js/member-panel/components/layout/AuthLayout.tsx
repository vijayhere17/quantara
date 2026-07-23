import type { ReactNode } from 'react';
import { AuroraBackground } from './AuroraBackground';
import { AuthSideSlider } from './AuthSideSlider';

type AuthLayoutProps = {
  children: ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="member-panel-root relative min-h-screen overflow-x-hidden bg-transparent text-white">
      <AuroraBackground />
      <div className="relative z-10 flex min-h-screen">
        <AuthSideSlider />
        <div className="flex min-h-screen flex-1 flex-col">
          <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
            <div className="w-full animate-fade-in">{children}</div>
          </main>
          <footer className="px-4 py-5 text-center text-xs text-q-muted">
            Copyright © {new Date().getFullYear()} Quantara. All Rights Reserved
          </footer>
        </div>
      </div>
    </div>
  );
}
