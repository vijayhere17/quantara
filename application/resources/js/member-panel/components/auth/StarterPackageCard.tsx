import { Check, Star } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

const PERKS = [
  'Daily ROI',
  'Referral Rewards',
  'Rank Rewards',
  'Booster Rewards',
  'Community Rewards',
  '4X Income Cap',
] as const;

type StarterPackageCardProps = {
  selected?: boolean;
};

export function StarterPackageCard({ selected = true }: StarterPackageCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={[
        'relative overflow-hidden rounded-3xl border px-5 py-6 sm:px-7 sm:py-7',
        selected
          ? 'border-[#00B5FF]/45 bg-gradient-to-b from-[#0c1a33] to-[#08101f] shadow-[0_0_0_1px_rgba(0,181,255,0.15),0_20px_60px_rgba(0,181,255,0.18)]'
          : 'border-white/10 bg-white/[0.03]',
      ].join(' ')}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#6D5EF9]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-[#00B5FF]/20 blur-3xl" />

      <div className="relative z-10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#00B5FF]/30 bg-[#00B5FF]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#38D9FF]">
          <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
          Starter Plan
        </div>

        <p className="font-display text-5xl font-bold tracking-tight text-white sm:text-6xl">$50</p>
        <p className="mt-2 text-sm font-semibold text-[#38D9FF]">4X Maximum Income</p>
        <p className="mt-1 text-sm text-[#A8B8D0]">Activate Your Journey · Powered by BTCB</p>

        <ul className="mt-6 space-y-2.5">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-center gap-2.5 text-sm text-white/90">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                <Check className="h-3 w-3" aria-hidden />
              </span>
              {perk}
            </li>
          ))}
        </ul>

        <p className="mt-6 text-xs font-medium uppercase tracking-[0.16em] text-[#8FA3C0]">
          Smart Contract Protected
        </p>
      </div>
    </motion.div>
  );
}
