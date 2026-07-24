import { motion, useReducedMotion } from 'framer-motion';
import {
  Coins,
  Link2,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from 'lucide-react';
import { Logo } from '../ui/Logo';

const FEATURES = [
  { icon: Coins, label: 'BEP20 Powered' },
  { icon: Zap, label: 'Daily ROI' },
  { icon: Sparkles, label: 'Referral Rewards' },
  { icon: ShieldCheck, label: 'Smart Contract Secured' },
  { icon: Wallet, label: 'Instant Wallet' },
] as const;

function NetworkIllustration() {
  return (
    <svg
      viewBox="0 0 420 280"
      className="mx-auto h-auto w-full max-w-[420px]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="q-node" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38D9FF" />
          <stop offset="100%" stopColor="#6D5EF9" />
        </linearGradient>
        <linearGradient id="q-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00B5FF" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#38D9FF" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#6D5EF9" stopOpacity="0.15" />
        </linearGradient>
        <filter id="q-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <ellipse cx="210" cy="150" rx="150" ry="88" stroke="url(#q-line)" strokeWidth="1" opacity="0.35" />
      <ellipse cx="210" cy="150" rx="95" ry="55" stroke="url(#q-line)" strokeWidth="1" opacity="0.5" />

      {[
        [210, 150],
        [110, 95],
        [310, 95],
        [80, 170],
        [340, 170],
        [160, 220],
        [260, 220],
        [210, 70],
      ].map(([x, y], i) => (
        <g key={i} filter="url(#q-glow)">
          <circle cx={x} cy={y} r={i === 0 ? 18 : 10} fill="url(#q-node)" opacity={i === 0 ? 0.95 : 0.8} />
          <circle cx={x} cy={y} r={i === 0 ? 28 : 16} stroke="#38D9FF" strokeOpacity="0.25" />
        </g>
      ))}

      <path d="M210 150 L110 95 M210 150 L310 95 M210 150 L80 170 M210 150 L340 170 M210 150 L160 220 M210 150 L260 220 M210 150 L210 70" stroke="url(#q-line)" strokeWidth="1.5" />

      <rect x="178" y="118" width="64" height="64" rx="16" fill="rgba(7,19,38,0.85)" stroke="#38D9FF" strokeOpacity="0.55" />
      <path d="M198 148h24M210 136v24" stroke="#38D9FF" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function Particles() {
  const dots = Array.from({ length: 18 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {dots.map((i) => (
        <span
          key={i}
          className="auth-particle absolute rounded-full bg-[#38D9FF]/70"
          style={{
            width: 2 + (i % 3),
            height: 2 + (i % 3),
            left: `${(i * 17) % 100}%`,
            top: `${(i * 29) % 100}%`,
            animationDelay: `${(i % 8) * 0.45}s`,
            animationDuration: `${8 + (i % 5)}s`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Full-height premium Web3 hero for auth pages.
 * Desktop: left column. Tablet/mobile: compact top band (via AuthLayout).
 */
export function AuthSideSlider({ compact = false }: { compact?: boolean }) {
  const reduceMotion = useReducedMotion();

  if (compact) {
    return (
      <aside className="relative overflow-hidden border-b border-white/[0.08] bg-[#071326] px-5 py-6 sm:px-8 xl:hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(109,94,249,0.35),transparent_55%),radial-gradient(ellipse_at_90%_80%,rgba(0,181,255,0.22),transparent_50%)]" />
        <Particles />
        <div className="relative z-10 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#38D9FF]">Quantara</span>
          </div>
          <h2 className="font-display max-w-[18ch] text-2xl font-bold leading-tight text-white sm:text-3xl">
            Build Your Digital Wealth
          </h2>
          <p className="text-sm text-[#A8B8D0]">
            Secure. Transparent. Decentralized. Built on BNB Smart Chain.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="relative hidden min-h-screen w-[min(46%,560px)] shrink-0 overflow-hidden border-r border-white/[0.06] bg-[#071326] xl:flex xl:flex-col">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_10%,rgba(109,94,249,0.45),transparent_50%),radial-gradient(ellipse_at_85%_30%,rgba(0,181,255,0.28),transparent_45%),radial-gradient(ellipse_at_50%_100%,rgba(56,217,255,0.18),transparent_55%)]" />
        <div className="absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-[#6D5EF9]/25 blur-3xl animate-glow-breathe" />
        <div className="absolute -right-16 bottom-1/4 h-64 w-64 rounded-full bg-[#00B5FF]/20 blur-3xl animate-glow-breathe [animation-delay:1.2s]" />
      </div>
      <Particles />

      <div className="relative z-10 flex flex-1 flex-col justify-between px-10 py-12 2xl:px-12">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#38D9FF]">Quantara</span>
          </div>
          <h2 className="font-display mt-8 max-w-[14ch] text-4xl font-bold leading-[1.1] tracking-tight text-white 2xl:text-5xl">
            Build Your Digital Wealth
          </h2>
          <p className="mt-4 max-w-[28ch] text-sm leading-relaxed text-[#A8B8D0] 2xl:text-base">
            Secure. Transparent. Decentralized.
            <br />
            Built on BNB Smart Chain.
          </p>
        </motion.div>

        <motion.div
          className="my-8"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-4 shadow-[0_0_60px_rgba(0,181,255,0.12)] backdrop-blur-md">
            <NetworkIllustration />
          </div>
        </motion.div>

        <div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.label}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 + i * 0.05 }}
                  className="flex items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 shadow-[0_0_24px_rgba(0,181,255,0.08)] backdrop-blur-md"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#00B5FF]/15 text-[#38D9FF]">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="text-xs font-semibold text-white/90">{f.label}</span>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-8 space-y-1.5 border-t border-white/[0.08] pt-6 text-xs text-[#8FA3C0]">
            <p className="font-semibold uppercase tracking-[0.18em] text-[#38D9FF]/80">Powered by</p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/85">
              <span className="inline-flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-[#F0B90B]" aria-hidden />
                BNB Smart Chain
              </span>
              <span className="text-white/25">·</span>
              <span>MetaMask Compatible</span>
              <span className="text-white/25">·</span>
              <span>100% Smart Contract Driven</span>
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
