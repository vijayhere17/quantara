import type { TextareaHTMLAttributes } from 'react';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

export function Textarea({ label, className = '', id, ...props }: TextareaProps) {
  const inputId = id ?? props.name;

  return (
    <label className="block w-full" htmlFor={inputId}>
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-q-cyan">
        {label}
      </span>
      <textarea
        id={inputId}
        className={[
          'min-h-[140px] w-full resize-y rounded-xl border border-white/[0.09] bg-[#0a0d16] px-4 py-3.5 text-sm text-white outline-none transition-all duration-300',
          'placeholder:text-q-muted/80',
          'hover:border-q-cyan/25',
          'focus:border-q-cyan/50 focus:shadow-[0_0_0_3px_rgba(0,212,255,0.14)]',
          'disabled:cursor-not-allowed disabled:opacity-70',
          className,
        ].join(' ')}
        {...props}
      />
    </label>
  );
}
