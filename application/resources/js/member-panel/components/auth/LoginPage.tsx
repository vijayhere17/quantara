import { Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { GradientButton } from '../ui/GradientButton';
import { Logo } from '../ui/Logo';
import type { AuthBoot } from '../../types';

type LoginPageProps = {
  data: AuthBoot;
};

export function LoginPage({ data }: LoginPageProps) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const el = document.getElementById('userwallet') as HTMLInputElement | null;
    if (!el) return;

    const sync = () => setConnected(Boolean(el.value));
    sync();
    el.addEventListener('input', sync);
    el.addEventListener('change', sync);
    const timer = window.setInterval(sync, 400);
    return () => {
      el.removeEventListener('input', sync);
      el.removeEventListener('change', sync);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <Card
      hover={false}
      className="mx-auto w-full max-w-[460px] border-q-cyan/25 p-6 shadow-[0_0_0_1px_rgba(0,217,255,0.10),0_0_48px_rgba(124,58,237,0.12)] sm:p-8"
    >
      <div className="mb-7 flex flex-col items-center text-center">
        <Logo href={data.links.home} size="lg" imgClassName="max-w-[200px]" />
        <div className="mt-5 h-px w-16 bg-gradient-to-r from-transparent via-q-cyan/50 to-transparent" />
        <h1 className="mt-5 text-2xl font-bold text-white">Login your account</h1>
        <p className="mt-1.5 text-sm text-q-muted">Connect your wallet to access Quantara</p>
      </div>

      <div className="space-y-4">
        <label className="block w-full" htmlFor="userwallet">
          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-q-cyan">
            Wallet Address
          </span>
          {/* Uncontrolled so legacy jQuery $("#userwallet").val(...) can write freely */}
          <input
            id="userwallet"
            name="userwallet"
            type="text"
            readOnly
            defaultValue=""
            placeholder="Connect wallet address"
            className="w-full rounded-xl border border-white/[0.09] bg-[#0a0d16] px-4 py-3.5 text-sm text-white outline-none transition-all duration-300 placeholder:text-q-muted/80 focus:border-q-cyan/50 focus:shadow-[0_0_0_3px_rgba(0,212,255,0.14)]"
          />
        </label>

        {/* Both buttons stay mounted — legacy scripts hide/show them */}
        <GradientButton
          type="button"
          fullWidth
          className="btn-connect !rounded-full !py-3.5 !font-bold !text-[#041018]"
          style={connected ? { display: 'none' } : undefined}
        >
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </GradientButton>

        <GradientButton
          type="button"
          fullWidth
          className="btn-submit !rounded-full !py-3.5 !font-bold !text-[#041018]"
          style={connected ? undefined : { display: 'none' }}
        >
          <Wallet className="h-4 w-4" />
          Login
        </GradientButton>
      </div>

      <p className="mt-6 flex items-center justify-between gap-3 text-sm text-q-muted">
        <span>Don&apos;t have an Account?</span>
        <a href={data.links.signUp} className="font-semibold text-q-cyan transition hover:text-white">
          Create Account
        </a>
      </p>
    </Card>
  );
}
