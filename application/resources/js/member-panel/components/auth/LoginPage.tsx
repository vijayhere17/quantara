import { Eye, EyeOff, Lock, Mail, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { GradientButton } from '../ui/GradientButton';
import { Input } from '../ui/Input';
import { Logo } from '../ui/Logo';
import type { AuthBoot } from '../../types';

type LoginPageProps = {
  data: AuthBoot;
};

export function LoginPage({ data }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [wallet, setWallet] = useState('');

  useEffect(() => {
    const el = document.getElementById('userwallet') as HTMLInputElement | null;
    if (!el) return;

    const sync = () => setWallet(el.value || '');
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

  const connected = Boolean(wallet);

  return (
    <Card
      hover={false}
      className="mx-auto w-full max-w-[460px] border-q-cyan/25 p-6 shadow-[0_0_0_1px_rgba(0,217,255,0.10),0_0_48px_rgba(124,58,237,0.12)] sm:p-8"
    >
      <div className="mb-7 flex flex-col items-center text-center">
        <Logo href={data.links.home} size="lg" imgClassName="max-w-[200px]" />
        <h1 className="mt-5 text-2xl font-bold text-white">Welcome back</h1>
        <p className="mt-1.5 text-sm text-q-muted">Sign in to your Quantara member panel</p>
      </div>

      {/* Hidden bridge field for legacy wallet login JS */}
      <input type="hidden" id="userwallet" name="userwallet" defaultValue="" readOnly />

      <div className="space-y-4">
        <div className="rounded-2xl border border-q-cyan/20 bg-q-cyan/5 px-4 py-3.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-q-cyan">
            Wallet Connect
          </p>
          <p className="mt-1 truncate text-sm text-white">
            {connected ? wallet : 'Connect your BNB Smart Chain wallet'}
          </p>
        </div>

        {!connected ? (
          <GradientButton type="button" fullWidth className="btn-connect !rounded-full !py-3.5 !font-bold !text-[#041018]">
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </GradientButton>
        ) : (
          <GradientButton type="button" fullWidth className="btn-submit !rounded-full !py-3.5 !font-bold !text-[#041018]">
            <Wallet className="h-4 w-4" />
            Sign In with Wallet
          </GradientButton>
        )}

        <div className="relative py-2 text-center">
          <span className="relative z-10 bg-transparent px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-q-muted">
            or email (coming soon)
          </span>
          <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/[0.08]" />
        </div>

        <div className="relative opacity-70">
          <Input
            label="Email"
            name="email_login"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@wallet.io"
            disabled
            autoComplete="username"
          />
          <Mail className="pointer-events-none absolute right-3 top-[42px] h-4 w-4 text-q-muted" />
        </div>

        <div className="relative opacity-70">
          <Input
            label="Password"
            name="password_login"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled
            autoComplete="current-password"
          />
          <button
            type="button"
            className="absolute right-3 top-[38px] text-q-muted transition hover:text-q-cyan"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-q-soft">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-[#0a0d16] text-q-cyan focus:ring-q-cyan/40"
            />
            Remember me
          </label>
          <a
            href={data.links.forgotPassword}
            className="inline-flex items-center gap-1 text-sm font-medium text-q-cyan transition hover:text-white"
          >
            <Lock className="h-3.5 w-3.5" />
            Forgot Password
          </a>
        </div>

        <GradientButton
          type="button"
          fullWidth
          disabled
          className="!mt-2 !rounded-full !py-3.5 !font-bold !text-[#041018]"
          title="Email login coming soon"
        >
          Sign In
        </GradientButton>
      </div>

      <p className="mt-6 text-center text-sm text-q-muted">
        Don&apos;t have an account?{' '}
        <a href={data.links.signUp} className="font-semibold text-q-cyan hover:text-white">
          Create Account
        </a>
      </p>
    </Card>
  );
}
