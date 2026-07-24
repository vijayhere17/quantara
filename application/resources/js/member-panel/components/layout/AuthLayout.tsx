import type { ReactNode } from 'react';
import { AuthCosmicBackground } from './AuthCosmicBackground';
import { AuthSideSlider } from './AuthSideSlider';

type AuthLayoutProps = {
  children: ReactNode;
};

/**
 * Split-screen auth shell matching the Quantara Web3 onboarding mockup.
 * Desktop: left hero + right glass card. Mobile: form-only (logo in card).
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="member-panel-root relative min-h-screen overflow-x-hidden bg-[#050b18] text-white xl:h-screen xl:overflow-hidden">
      <AuthCosmicBackground />
      <div className="relative z-10 flex min-h-screen min-w-0 flex-col xl:h-full xl:flex-row xl:overflow-hidden">
        <AuthSideSlider />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:h-full xl:overflow-hidden">
          <main className="flex min-h-0 min-w-0 flex-1 items-stretch justify-center px-4 py-5 sm:px-6 sm:py-6 xl:items-center xl:overflow-hidden xl:px-8 xl:py-4">
            <div className="flex w-full min-w-0 max-w-[440px] flex-1 flex-col justify-center xl:max-h-full xl:max-w-[420px] 2xl:max-w-[460px]">
              {children}
            </div>
          </main>
          <footer className="shrink-0 px-4 py-2 text-center text-[10px] leading-none text-white/35 xl:py-2">
            Copyright © {new Date().getFullYear()} Quantara. All Rights Reserved
          </footer>
        </div>
      </div>
    </div>
  );
}
