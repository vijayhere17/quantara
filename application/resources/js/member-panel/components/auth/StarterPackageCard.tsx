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
      initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35 }}
      className={[
        'relative overflow-hidden rounded-2xl border px-4 py-4 text-center sm:px-5',
        selected
          ? 'border-[#00B5FF]/40 bg-gradient-to-b from-[#0c1a33]/95 to-[#08101f]/95 shadow-[0_0_0_1px_rgba(0,181,255,0.12),0_12px_40px_rgba(0,181,255,0.14)]'
          : 'border-white/10 bg-white/[0.03]',
      ].join(' ')}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#6D5EF9]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-8 h-24 w-24 rounded-full bg-[#00B5FF]/20 blur-3xl" />

      <div className="relative z-10">
        <div className="mx-auto mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-300/40 bg-amber-400/15 text-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.35)]">
          <Star className="h-4 w-4 fill-current" aria-hidden />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#A8B8D0]">Starter Package</p>
        <p className="font-display mt-1 text-4xl font-bold tracking-tight text-white">$50</p>
        <span className="mt-2 inline-flex rounded-full bg-gradient-to-r from-[#6D5EF9] to-[#9B6CFF] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_0_16px_rgba(109,94,249,0.45)]">
          4X Maximum Income
        </span>

        <ul className="mt-3.5 grid grid-cols-1 gap-1.5 text-left sm:grid-cols-2">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-center gap-2 text-xs text-white/90">
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#00B5FF]/15 text-[#38D9FF]">
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
