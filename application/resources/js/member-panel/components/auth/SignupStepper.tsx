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
    <ol className="mb-4 w-full" aria-label="Registration progress">
      <li className="flex w-full items-center">
        {steps.map((s, index) => {
          const active = index === currentIndex;
          const done = index < currentIndex;
          return (
            <div key={s.id} className="flex min-w-0 flex-1 items-center">
              <div className="flex min-w-0 flex-col items-center gap-1">
                <motion.span
                  layout={!reduceMotion}
                  className={[
                    'inline-flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold transition-all duration-300',
                    active
                      ? 'border-[#00B5FF] bg-[#00B5FF] text-white shadow-[0_0_16px_rgba(0,181,255,0.55)]'
                      : done
                        ? 'border-emerald-400/50 bg-emerald-400/20 text-emerald-300'
                        : 'border-white/15 bg-transparent text-white/40',
                  ].join(' ')}
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? <Check className="h-3 w-3" aria-hidden /> : index + 1}
                </motion.span>
                <span
                  className={[
                    'hidden max-w-[4.2rem] truncate text-center text-[9px] font-semibold uppercase tracking-[0.1em] sm:block',
                    active ? 'text-white' : done ? 'text-emerald-300/80' : 'text-white/35',
                  ].join(' ')}
                >
                  {s.label}
                </span>
              </div>
              {index < steps.length - 1 ? (
                <div className="mx-1 mb-4 h-px min-w-[8px] flex-1 overflow-hidden bg-white/15">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-400 to-[#00B5FF]"
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
