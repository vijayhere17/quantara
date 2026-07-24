import type { ReactNode } from 'react';
import { AuroraBackground } from './AuroraBackground';
import { AuthSideSlider } from './AuthSideSlider';

type AuthLayoutProps = {
  children: ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="member-panel-root relative min-h-screen overflow-x-hidden bg-[#071326] text-white">
      <AuroraBackground />
      <div className="relative z-10 flex min-h-screen min-w-0 flex-col xl:flex-row">
        <AuthSideSlider compact />
        <AuthSideSlider />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <main className="flex min-w-0 flex-1 items-stretch justify-center px-3 py-6 sm:px-6 sm:py-10 xl:items-center xl:py-12">
            <div className="flex w-full min-w-0 max-w-[560px] flex-1 flex-col justify-center xl:max-w-[520px] 2xl:max-w-[560px]">
              {children}
            </div>
          </main>
          <footer className="px-4 py-4 text-center text-xs text-q-muted xl:py-5">
            Copyright © {new Date().getFullYear()} Quantara. All Rights Reserved
          </footer>
        </div>
      </div>
    </div>
  );
}
