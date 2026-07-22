import { ReferralCard } from './ReferralCard';
import type { DashboardBoot } from '../../types';

type WelcomeBannerProps = {
  data: DashboardBoot;
};

export function WelcomeBanner({ data }: WelcomeBannerProps) {
  return (
    <section className="q-card relative overflow-hidden !rounded-card-lg border-q-border p-5 sm:p-6 lg:p-7">
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-purple-500/25 blur-3xl animate-glow-breathe"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-24 top-0 h-40 w-40 rounded-full bg-q-cyan/15 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-q-teal">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-q-teal opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-q-teal" />
            </span>
            Ecosystem synced • Block {data.blockNumber}
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-[42px] lg:leading-[1.1]">
            Welcome Back,{' '}
            <span className="bg-q-name bg-clip-text text-transparent">
              {data.user.displayName || 'Explorer'}
            </span>
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-q-muted sm:text-[15px]">
            Your Quantara network is live. Track packages, rewards, and team growth from one
            command center.
          </p>
        </div>

        <div className="relative w-full shrink-0 lg:w-auto lg:max-w-[420px]">
          <ReferralCard referral={data.referral} />
        </div>
      </div>
    </section>
  );
}
