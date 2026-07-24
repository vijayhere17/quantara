import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function Input({ label, hint, className = '', id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="block w-full" htmlFor={inputId}>
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#38D9FF]">
        {label}
      </span>
      <input
        id={inputId}
        className={[
          'h-12 w-full rounded-2xl border border-white/[0.1] bg-[#071326]/90 px-4 text-sm text-white outline-none transition-all duration-300 [@media(min-height:900px)]:h-14',
          'placeholder:text-q-muted/80',
          'hover:border-[#00B5FF]/30',
          'focus:border-[#00B5FF]/55 focus:shadow-[0_0_0_3px_rgba(0,181,255,0.16)]',
          'disabled:cursor-not-allowed disabled:opacity-70 read-only:cursor-default',
          className,
        ].join(' ')}
        {...props}
      />
      {hint ? <span className="mt-1 block text-xs text-q-muted">{hint}</span> : null}
    </label>
  );
}
