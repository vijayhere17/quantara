import { Check, Star } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

const PERKS = [
  'Daily ROI',
  'Referral Rewards',
  '4X Income Cap',
  'Smart Contract Protected',
] as const;

type StarterPackageCardProps = {
  selected?: boolean;
};

export function StarterPackageCard({ selected = true }: StarterPackageCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35 }}
      className={[
        'relative overflow-hidden rounded-2xl border px-4 py-3.5 sm:px-5 sm:py-4',
        selected
          ? 'border-[#00B5FF]/45 bg-gradient-to-b from-[#0c1a33] to-[#08101f] shadow-[0_0_0_1px_rgba(0,181,255,0.15),0_12px_36px_rgba(0,181,255,0.16)]'
          : 'border-white/10 bg-white/[0.03]',
      ].join(' ')}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#6D5EF9]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-8 h-24 w-24 rounded-full bg-[#00B5FF]/20 blur-3xl" />

      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#00B5FF]/30 bg-[#00B5FF]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#38D9FF]">
            <Star className="h-3 w-3 fill-current" aria-hidden />
            Starter Package
          </div>
          <p className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">$50</p>
        </div>

        <p className="mt-1.5 text-xs font-semibold text-[#38D9FF]">4X Maximum Income · Powered by BTCB</p>

        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-center gap-1.5 text-xs text-white/90">
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                <Check className="h-2.5 w-2.5" aria-hidden />
              </span>
              {perk}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
