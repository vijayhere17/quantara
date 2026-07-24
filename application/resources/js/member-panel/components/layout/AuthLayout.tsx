import type { ReactNode } from 'react';
import { AuroraBackground } from './AuroraBackground';
import { AuthSideSlider } from './AuthSideSlider';

type AuthLayoutProps = {
  children: ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="member-panel-root relative min-h-screen overflow-x-hidden bg-[#071326] text-white xl:h-screen xl:overflow-hidden">
      <AuroraBackground />
      <div className="relative z-10 flex min-h-screen min-w-0 flex-col xl:h-full xl:flex-row xl:overflow-hidden">
        <AuthSideSlider compact />
        <AuthSideSlider />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:h-full xl:overflow-hidden">
          <main className="flex min-h-0 min-w-0 flex-1 items-stretch justify-center px-3 py-4 sm:px-5 sm:py-5 xl:items-center xl:overflow-hidden xl:px-6 xl:py-3 2xl:py-5">
            <div className="flex w-full min-w-0 max-w-[520px] flex-1 flex-col justify-center xl:max-h-full xl:max-w-[480px] 2xl:max-w-[520px]">
              {children}
            </div>
          </main>
          <footer className="shrink-0 px-4 py-2 text-center text-[10px] leading-none text-q-muted xl:py-2.5">
            Copyright © {new Date().getFullYear()} Quantara. All Rights Reserved
          </footer>
        </div>
      </div>
    </div>
  );
}
