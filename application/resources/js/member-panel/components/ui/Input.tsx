import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function Input({ label, hint, className = '', id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="block w-full" htmlFor={inputId}>
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-q-cyan">
        {label}
      </span>
      <input
        id={inputId}
        className={[
          'w-full rounded-xl border border-white/[0.09] bg-[#0a0d16] px-4 py-3.5 text-sm text-white outline-none transition-all duration-300',
          'placeholder:text-q-muted/80',
          'hover:border-q-cyan/25',
          'focus:border-q-cyan/50 focus:shadow-[0_0_0_3px_rgba(0,212,255,0.14)]',
          'disabled:cursor-not-allowed disabled:opacity-70 read-only:cursor-default',
          className,
        ].join(' ')}
        {...props}
      />
      {hint ? <span className="mt-1.5 block text-xs text-q-muted">{hint}</span> : null}
    </label>
  );
}
