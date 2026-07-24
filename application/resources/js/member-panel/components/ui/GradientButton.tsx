import {
  useRef,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';

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
  onClick,
  ...props
}: GradientButtonProps) {
  const ref = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);

  const classes = [
    'q-btn-ripple relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl px-5 py-3.5 text-sm font-semibold text-white',
    'bg-gradient-to-r from-[#00D2FF] via-[#00B5FF] to-[#9B6CFF] shadow-[0_12px_28px_rgba(0,181,255,0.32)] transition-all duration-300 ease-out',
    'hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_16px_36px_rgba(0,181,255,0.4)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B5FF]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071326]',
    'active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0',
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const spawnRipple = (event: MouseEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'q-ripple-ink';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    el.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 650);
  };

  if (href) {
    return (
      <a
        href={href}
        className={classes}
        ref={ref as RefObject<HTMLAnchorElement>}
        onClick={(e) => spawnRipple(e)}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      ref={ref as RefObject<HTMLButtonElement>}
      onClick={(e) => {
        spawnRipple(e);
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
}
