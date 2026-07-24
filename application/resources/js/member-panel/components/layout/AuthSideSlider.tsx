import { motion, useReducedMotion } from 'framer-motion';
import {
  BarChart3,
  Coins,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Logo } from '../ui/Logo';

const FEATURES = [
  { icon: ShieldCheck, title: 'Smart Contract', subtitle: 'Secured' },
  { icon: Coins, title: 'Daily ROI', subtitle: 'Returns' },
  { icon: Users, title: 'Referral', subtitle: 'Rewards' },
  { icon: BarChart3, title: 'Rank & Booster', subtitle: 'Unlock' },
] as const;

function HeroOrb() {
  return (
    <div className="relative mx-auto flex h-[140px] w-[140px] items-center justify-center [@media(max-height:800px)]:h-[110px] [@media(max-height:800px)]:w-[110px] 2xl:h-[160px] 2xl:w-[160px]">
      <div className="absolute inset-0 rounded-full bg-[#00B5FF]/15 blur-2xl" />
      <div className="absolute inset-4 rounded-full border border-[#38D9FF]/25 shadow-[0_0_40px_rgba(0,181,255,0.25)]" />
      <div className="absolute inset-8 rounded-full border border-[#6D5EF9]/30" />
      <svg viewBox="0 0 96 96" className="relative z-10 h-[58%] w-[58%]" aria-hidden>
        <defs>
          <linearGradient id="orb-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38D9FF" />
            <stop offset="100%" stopColor="#6D5EF9" />
          </linearGradient>
        </defs>
        <circle cx="48" cy="48" r="28" fill="url(#orb-fill)" opacity="0.95" />
        <circle cx="48" cy="48" r="36" stroke="#38D9FF" strokeOpacity="0.35" fill="none" />
        <path d="M36 48h24M48 36v24" stroke="#050b18" strokeWidth="4" strokeLinecap="round" />
      </svg>
      {/* Floating accent dots */}
      <span className="absolute left-2 top-6 h-2 w-2 rounded-full bg-[#38D9FF] shadow-[0_0_10px_#38D9FF]" />
      <span className="absolute bottom-8 right-3 h-1.5 w-1.5 rounded-full bg-[#6D5EF9] shadow-[0_0_10px_#6D5EF9]" />
      <span className="absolute right-8 top-3 h-1.5 w-1.5 rounded-full bg-[#F0B90B]/90" />
    </div>
  );
}

function BnbIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
      <path
        fill="#F0B90B"
        d="M11.98 3.2 14.7 5.9l-1.6 1.6-1.12-1.12-1.12 1.12L9.26 5.9l2.72-2.7Zm-5.4 5.4 2.7-2.7 1.6 1.6-1.6 1.6-2.7-1.5Zm10.8 0-2.7 1.5-1.6-1.6 1.6-1.6 2.7 2.7ZM6.58 12l2.7 2.7-2.7 2.7L3.88 12l2.7-2.7Zm5.4 0 2.7 2.7-2.7 2.7-2.7-2.7 2.7-2.7Zm5.4 0 2.7 2.7-2.7 2.7-2.7-2.7 2.7-2.7ZM9.26 18.1l1.6-1.6 1.12 1.12 1.12-1.12 1.6 1.6-2.72 2.7-2.72-2.7Z"
      />
    </svg>
  );
}

function MetaMaskIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
      <path fill="#E2761B" d="M20.5 3.5 13.2 8.9l1.4-3.3 5.9-2.1Z" />
      <path fill="#E4761B" d="m3.5 3.5 7.2 5.5-1.3-3.4-5.9-2.1Zm14.2 12.4-1.9 2.9 4.1 1.1.1-4-2.3 0Zm-14.1 0 .1 4 4.1-1.1-1.9-2.9-2.3 0Z" />
      <path fill="#F6851B" d="m8.1 10.4-1 2.5 3.6.1-.1-3.9-2.5 1.3Zm7.8 0-2.5-1.4-.1 4 3.6-.1-1-2.5ZM8.4 18.8l2.2-1.1-1.9-1.5-.3 2.6Zm5 0 2.2-1.1.3-2.6-1.9 1.5 2.2-.1-2.8Z" />
    </svg>
  );
}

/**
 * Desktop left hero for login/signup — matches Quantara Web3 mockup.
 * Hidden below xl; mobile uses logo inside the form card instead.
 */
export function AuthSideSlider() {
  const reduceMotion = useReducedMotion();

  return (
    <aside className="relative hidden h-screen w-[min(48%,560px)] shrink-0 overflow-hidden xl:flex xl:flex-col">
      <div className="relative z-10 flex h-full flex-col justify-center gap-5 px-9 py-7 2xl:gap-6 2xl:px-12">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="flex items-center gap-3">
            <Logo size="sm" imgClassName="h-9" />
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.28em] text-white">Quantara</p>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#7EB6D9]">
                Building Wealth on Blockchain
              </p>
            </div>
          </div>

          <h2 className="font-display mt-6 max-w-[15ch] text-[2rem] font-bold leading-[1.12] tracking-tight text-white [@media(max-height:800px)]:mt-4 [@media(max-height:800px)]:text-[1.7rem] 2xl:text-[2.35rem]">
            Build Your{' '}
            <span className="bg-gradient-to-r from-[#38D9FF] via-[#00B5FF] to-[#9B6CFF] bg-clip-text text-transparent">
              Digital Wealth
            </span>
          </h2>
          <p className="mt-2.5 max-w-[34ch] text-sm leading-relaxed text-[#A8B8D0]">
            Secure. Transparent. Decentralized. Built on{' '}
            <span className="font-semibold text-[#38D9FF]">BNB Smart Chain</span>.
          </p>
        </motion.div>

        <motion.div
          className="[@media(max-height:720px)]:hidden"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.06 }}
        >
          <HeroOrb />
        </motion.div>

        <div className="grid grid-cols-2 gap-2.5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 + i * 0.04 }}
                className="rounded-2xl border border-[#00B5FF]/20 bg-[#0a1628]/70 px-3 py-2.5 shadow-[0_0_20px_rgba(0,181,255,0.08)] backdrop-blur-md"
              >
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#38D9FF]/25 bg-[#00B5FF]/10 text-[#38D9FF]">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white">{f.title}</p>
                    <p className="text-[10px] text-[#8FA3C0]">{f.subtitle}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-white/85 backdrop-blur-md">
            <BnbIcon />
            Powered by BNB Smart Chain
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-white/85 backdrop-blur-md">
            <MetaMaskIcon />
            MetaMask Compatible
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-white/85 backdrop-blur-md">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
            100% Decentralized
          </span>
        </div>
      </div>
    </aside>
  );
}
