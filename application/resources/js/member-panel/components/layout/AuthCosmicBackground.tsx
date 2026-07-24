import { useEffect, useRef, type CSSProperties } from 'react';

/**
 * Cosmic / starfield auth backdrop with glowing planetary horizon arc.
 * Pointer-reactive aurora kept subtle so the mockup composition stays clear.
 */
export function AuthCosmicBackground() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.35 });
  const currentRef = useRef({ x: 0.5, y: 0.35 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const onMove = (event: PointerEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      pointerRef.current = {
        x: event.clientX / w,
        y: event.clientY / h,
      };
    };

    const tick = () => {
      const root = rootRef.current;
      if (root) {
        const cur = currentRef.current;
        const target = pointerRef.current;
        cur.x += (target.x - cur.x) * 0.05;
        cur.y += (target.y - cur.y) * 0.05;
        root.style.setProperty('--q-aurora-x', `${((cur.x - 0.5) * 36).toFixed(2)}px`);
        root.style.setProperty('--q-aurora-y', `${((cur.y - 0.5) * 24).toFixed(2)}px`);
        root.style.setProperty('--q-aurora-px', `${(cur.x * 100).toFixed(2)}%`);
        root.style.setProperty('--q-aurora-py', `${(cur.y * 100).toFixed(2)}%`);
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
      style={
        {
          '--q-aurora-x': '0px',
          '--q-aurora-y': '0px',
          '--q-aurora-px': '50%',
          '--q-aurora-py': '35%',
        } as CSSProperties
      }
    >
      <div className="absolute inset-0 bg-[#050b18]" />

      {/* Soft nebula washes */}
      <div className="q-aurora-follow absolute inset-0 will-change-transform">
        <div className="absolute -left-[10%] top-[-15%] h-[48vmax] w-[48vmax] rounded-full bg-[#6D5EF9]/20 blur-[120px]" />
        <div className="absolute -right-[8%] top-[5%] h-[42vmax] w-[42vmax] rounded-full bg-[#00B5FF]/16 blur-[110px]" />
        <div className="absolute bottom-[-10%] left-[25%] h-[40vmax] w-[40vmax] rounded-full bg-[#38D9FF]/12 blur-[130px]" />
      </div>

      {/* Starfield */}
      <div className="auth-starfield absolute inset-0 opacity-80" />

      {/* Planetary horizon glow (mockup arc) */}
      <div className="absolute inset-x-0 bottom-0 h-[42%] overflow-hidden">
        <div className="absolute left-1/2 top-[18%] h-[140%] w-[160%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,181,255,0.35)_0%,rgba(109,94,249,0.12)_28%,transparent_58%)] blur-[2px]" />
        <div className="absolute left-1/2 top-[22%] h-[2px] w-[120%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#38D9FF]/70 to-transparent shadow-[0_0_24px_rgba(56,217,255,0.65)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#050b18] via-[#050b18]/70 to-transparent" />
      </div>

      <div className="q-aurora-spotlight absolute inset-0 opacity-50" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,11,24,0.15)_0%,rgba(5,11,24,0.35)_55%,rgba(5,11,24,0.55)_100%)]" />
    </div>
  );
}
