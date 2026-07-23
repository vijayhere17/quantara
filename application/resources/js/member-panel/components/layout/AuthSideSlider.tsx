import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Sparkles, Wallet } from 'lucide-react';

const SLIDES = [
  {
    icon: Wallet,
    title: 'On-chain membership',
    body: 'Register and activate your starter package through MetaMask on BNB Smart Chain.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified sponsorship',
    body: 'Your sponsor is validated before any wallet transaction is submitted.',
  },
  {
    icon: Sparkles,
    title: 'Secure activation',
    body: 'Account creation happens only after registration and package activation confirm on-chain.',
  },
] as const;

function resolveAuthBgUrl(): string {
  try {
    const boot = window.__QUANTARA_BOOT__;
    if (boot?.assetsUrl) {
      return `${boot.assetsUrl.replace(/\/$/, '')}/images/authentication/img-auth-bg.jpg`;
    }
    const base = document.getElementById('basePath') as HTMLInputElement | null;
    if (base?.value) {
      return `${base.value.replace(/\/$/, '')}/assets/images/authentication/img-auth-bg.jpg`;
    }
  } catch {
    // ignore
  }
  return '/assets/images/authentication/img-auth-bg.jpg';
}

/**
 * Left marketing slider for auth pages (Able Pro v3–style side panel).
 * Hidden below xl; does not change the signup form layout.
 */
export function AuthSideSlider() {
  const [index, setIndex] = useState(0);
  const bgUrl = useMemo(() => resolveAuthBgUrl(), []);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, 5200);

    return () => window.clearInterval(timer);
  }, []);

  const slide = SLIDES[index];
  const Icon = slide.icon;

  return (
    <aside className="relative hidden min-h-screen w-[min(42%,520px)] shrink-0 overflow-hidden border-r border-white/[0.06] xl:flex xl:flex-col">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${bgUrl}')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#061018]/92 via-[#0b1020]/88 to-[#12081f]/90" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(0,217,255,0.22),transparent_55%),radial-gradient(ellipse_at_80%_80%,rgba(124,58,237,0.18),transparent_50%)]" />

      <div className="relative z-10 flex flex-1 flex-col justify-between px-10 py-12">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-q-cyan">Quantara</p>
          <h2 className="mt-3 max-w-[16ch] text-3xl font-bold leading-tight text-white">
            Premium Web3 registration
          </h2>
        </div>

        <div className="min-h-[168px]">
          <div
            key={slide.title}
            className="animate-fade-in rounded-2xl border border-white/[0.08] bg-black/25 p-6 backdrop-blur-sm"
          >
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-q-cyan/15 text-q-cyan">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="text-xl font-bold text-white">{slide.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-q-soft">{slide.body}</p>
          </div>

          <div className="mt-6 flex items-center gap-2" role="tablist" aria-label="Auth highlights">
            {SLIDES.map((item, i) => (
              <button
                key={item.title}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={item.title}
                onClick={() => setIndex(i)}
                className={[
                  'h-1.5 rounded-full transition-all duration-300',
                  i === index ? 'w-8 bg-q-cyan' : 'w-1.5 bg-white/25 hover:bg-white/45',
                ].join(' ')}
              />
            ))}
          </div>
        </div>

        <p className="text-xs text-q-muted">BNB Smart Chain · MetaMask required</p>
      </div>
    </aside>
  );
}
