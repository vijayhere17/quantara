import { Check } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

export type SignupStep = {
  id: string;
  label: string;
};

type SignupStepperProps = {
  steps: readonly SignupStep[];
  currentIndex: number;
};

export function SignupStepper({ steps, currentIndex }: SignupStepperProps) {
  const reduceMotion = useReducedMotion();

  return (
    <ol className="mb-8 w-full" aria-label="Registration progress">
      <li className="flex w-full items-center">
        {steps.map((s, index) => {
          const active = index === currentIndex;
          const done = index < currentIndex;
          return (
            <div key={s.id} className="flex min-w-0 flex-1 items-center">
              <div className="flex min-w-0 flex-col items-center gap-1.5">
                <motion.span
                  layout={!reduceMotion}
                  className={[
                    'inline-flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold transition-all duration-300',
                    active
                      ? 'border-[#00B5FF]/70 bg-[#00B5FF]/20 text-[#38D9FF] shadow-[0_0_20px_rgba(0,181,255,0.45)]'
                      : done
                        ? 'border-emerald-400/50 bg-emerald-400/20 text-emerald-300'
                        : 'border-white/10 bg-white/[0.03] text-q-muted',
                  ].join(' ')}
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : index + 1}
                </motion.span>
                <span
                  className={[
                    'hidden max-w-[4.5rem] truncate text-center text-[10px] font-semibold uppercase tracking-[0.12em] sm:block',
                    active ? 'text-white' : done ? 'text-emerald-300/80' : 'text-q-muted',
                  ].join(' ')}
                >
                  {s.label}
                </span>
              </div>
              {index < steps.length - 1 ? (
                <div className="mx-1 mb-5 h-[2px] min-w-[10px] flex-1 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-[#00B5FF]"
                    initial={false}
                    animate={{ width: done ? '100%' : '0%' }}
                    transition={{ duration: reduceMotion ? 0 : 0.35 }}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </li>
    </ol>
  );
}
