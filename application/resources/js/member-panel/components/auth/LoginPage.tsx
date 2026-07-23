import { Eye, EyeOff, Lock, Mail, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Card } from '../ui/Card';
import { Logo } from '../ui/Logo';
import { InstallWalletModal } from './InstallWalletModal';
import { useWallet } from '../../hooks/useWallet';
import { notifyError } from '../../lib/walletConnect';
import type { AuthBoot } from '../../types';

type LoginPageProps = {
  data: AuthBoot;
};

/**
 * Secure login: email + password, then connected wallet must match
 * the wallet stored during on-chain registration.
 * Legacy wallet-only login remains available via window.processlogin
 * for older accounts without email.
 */
export function LoginPage({ data }: LoginPageProps) {
  const wallet = useWallet();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [mode, setMode] = useState<'secure' | 'legacy'>('secure');

  const handleSecureLogin = async () => {
    if (submitting) return;
    if (!email.trim() || !password) {
      notifyError('Please enter email and password');
      return;
    }

    setSubmitting(true);
    try {
      if (!wallet.walletInstalled) {
        setShowInstall(true);
        return;
      }

      const address = wallet.isConnected ? wallet.walletAddress : await wallet.connect();

      const res = await fetch(`${data.baseUrl.replace(/\/$/, '')}/api/auth/login`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': data.csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          email: email.trim(),
          password,
          wallet: address,
        }),
      });

      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        code?: string;
        redirect?: string;
        token?: string;
      };

      if (!json.success) {
        notifyError(json.error || 'Login failed');
        return;
      }

      if (json.token) {
        try {
          localStorage.setItem('quantara_auth_token', json.token);
        } catch {
          // ignore
        }
      }

      window.location.href = json.redirect || `${data.baseUrl.replace(/\/$/, '')}/dashboard`;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      if (message.toLowerCase().includes('metamask is not installed')) {
        setShowInstall(true);
      } else {
        notifyError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLegacyWalletLogin = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (!wallet.walletInstalled) {
        setShowInstall(true);
        return;
      }
      const address = wallet.isConnected ? wallet.walletAddress : await wallet.connect();

      if (typeof window.processlogin === 'function') {
        const el = document.getElementById('userwallet') as HTMLInputElement | null;
        if (el) el.value = address;
        window.processlogin();
        return;
      }

      const token = data.csrfToken || '';
      const base = data.baseUrl.replace(/\/$/, '');
      const body = new URLSearchParams();
      body.set('_token', token);
      body.set('wallet', address);

      const res = await fetch(`${base}/submit-sign-in`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'X-CSRF-TOKEN': token,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        credentials: 'same-origin',
        body,
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.success) {
        window.location.href = `${base}/dashboard`;
      } else {
        notifyError(json.error || 'Login failed');
      }
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <InstallWalletModal open={showInstall} onClose={() => setShowInstall(false)} />

      <Card
        hover={false}
        className="mx-auto w-full max-w-[460px] border-q-cyan/25 p-6 shadow-[0_0_0_1px_rgba(0,217,255,0.10),0_0_48px_rgba(124,58,237,0.12)] sm:p-8"
      >
        <div className="mb-7 flex flex-col items-center text-center">
          <Logo href={data.links.home} size="lg" imgClassName="max-w-[200px]" />
          <div className="mt-5 h-px w-16 bg-gradient-to-r from-transparent via-q-cyan/50 to-transparent" />
          <h1 className="mt-5 text-2xl font-bold text-white">Login your account</h1>
          <p className="mt-1.5 text-sm text-q-muted">
            {mode === 'secure'
              ? 'Email, password, and your registered wallet'
              : 'Connect the wallet linked to your account'}
          </p>
        </div>

        <input id="userwallet" name="userwallet" type="hidden" defaultValue={wallet.walletAddress} readOnly />

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => setMode('secure')}
            className={`rounded-lg py-2 text-xs font-semibold transition ${
              mode === 'secure' ? 'bg-q-cyan/20 text-q-cyan' : 'text-q-muted hover:text-white'
            }`}
          >
            Email Login
          </button>
          <button
            type="button"
            onClick={() => setMode('legacy')}
            className={`rounded-lg py-2 text-xs font-semibold transition ${
              mode === 'legacy' ? 'bg-q-cyan/20 text-q-cyan' : 'text-q-muted hover:text-white'
            }`}
          >
            Wallet Login
          </button>
        </div>

        {mode === 'secure' ? (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-q-cyan">
                Email
              </span>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@wallet.io"
                  autoComplete="username"
                  className="w-full rounded-xl border border-white/[0.09] bg-[#0a0d16] px-4 py-3.5 pr-10 text-sm text-white outline-none transition focus:border-q-cyan/50"
                />
                <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-q-muted" />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-q-cyan">
                Password
              </span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/[0.09] bg-[#0a0d16] px-4 py-3.5 pr-10 text-sm text-white outline-none transition focus:border-q-cyan/50"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-q-muted hover:text-q-cyan"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Toggle password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {wallet.isConnected ? (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-xs text-emerald-300">
                Connected: {wallet.walletAddress}
              </div>
            ) : null}

            <button
              type="button"
              disabled={submitting || wallet.isConnecting}
              onClick={() => void handleSecureLogin()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-q-gradient-br px-5 py-3.5 text-sm font-bold text-[#041018] shadow-btn-glow transition hover:brightness-110 disabled:opacity-60"
            >
              <Lock className="h-4 w-4" />
              {submitting || wallet.isConnecting ? 'Signing in…' : 'Sign In'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-q-cyan/20 bg-q-cyan/5 px-4 py-3.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-q-cyan">Wallet</p>
              <p className="mt-1 truncate text-sm text-white">
                {wallet.isConnected ? wallet.walletAddress : 'Connect your registered wallet'}
              </p>
            </div>
            <button
              type="button"
              disabled={submitting || wallet.isConnecting}
              onClick={() => void handleLegacyWalletLogin()}
              className="btn-connect inline-flex w-full items-center justify-center gap-2 rounded-full bg-q-gradient-br px-5 py-3.5 text-sm font-bold text-[#041018] shadow-btn-glow transition hover:brightness-110 disabled:opacity-60"
            >
              <Wallet className="h-4 w-4" />
              {submitting || wallet.isConnecting ? 'Connecting…' : wallet.isConnected ? 'Login' : 'Connect Wallet'}
            </button>
          </div>
        )}

        <p className="mt-6 flex items-center justify-between gap-3 text-sm text-q-muted">
          <span>Don&apos;t have an Account?</span>
          <a href={data.links.signUp} className="font-semibold text-q-cyan transition hover:text-white">
            Create Account
          </a>
        </p>
      </Card>
    </>
  );
}
