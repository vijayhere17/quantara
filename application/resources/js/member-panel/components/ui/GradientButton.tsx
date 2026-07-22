import type { ButtonHTMLAttributes, ReactNode } from 'react';

type GradientButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  href?: string;
  fullWidth?: boolean;
};

export function GradientButton({
  children,
  href,
  fullWidth = false,
  className = '',
  type = 'button',
  ...props
}: GradientButtonProps) {
  const classes = [
    'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white',
    'bg-q-gradient-br shadow-btn-glow transition-all duration-300 ease-out',
    'hover:-translate-y-0.5 hover:brightness-110 hover:shadow-glow-cyan',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-q-bg',
    'active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60',
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
