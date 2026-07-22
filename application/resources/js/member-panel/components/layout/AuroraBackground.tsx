import { useEffect, useRef, type CSSProperties } from 'react';

type AuroraBackgroundProps = {
  className?: string;
};

export function AuroraBackground({ className = '' }: AuroraBackgroundProps) {
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
        cur.x += (target.x - cur.x) * 0.06;
        cur.y += (target.y - cur.y) * 0.06;

        const ox = (cur.x - 0.5) * 48;
        const oy = (cur.y - 0.5) * 36;

        root.style.setProperty('--q-aurora-x', `${ox.toFixed(2)}px`);
        root.style.setProperty('--q-aurora-y', `${oy.toFixed(2)}px`);
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
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`}
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
      <div className="absolute inset-0 bg-[#0b1020]" />

      <div className="q-aurora-follow absolute inset-0 will-change-transform">
        <div className="q-aurora-blob q-aurora-blob-a absolute -left-[12%] -top-[18%] h-[52vmax] w-[52vmax] rounded-full bg-[#00d9ff]/[0.18] blur-[110px]" />
        <div className="q-aurora-blob q-aurora-blob-b absolute -right-[10%] top-[-8%] h-[46vmax] w-[46vmax] rounded-full bg-[#7c3aed]/[0.2] blur-[120px]" />
        <div className="q-aurora-blob q-aurora-blob-c absolute bottom-[-18%] left-[18%] h-[50vmax] w-[50vmax] rounded-full bg-[#3b82f6]/[0.16] blur-[130px]" />
        <div className="q-aurora-blob q-aurora-blob-d absolute bottom-[8%] right-[12%] h-[36vmax] w-[36vmax] rounded-full bg-[#6366f1]/[0.14] blur-[100px]" />
      </div>

      <div className="q-aurora-spotlight absolute inset-0 opacity-70" />

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,16,32,0.2)_0%,rgba(11,16,32,0.5)_55%,rgba(11,16,32,0.82)_100%)]" />
    </div>
  );
}
