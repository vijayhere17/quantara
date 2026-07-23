import { Eye, EyeOff, Lock, Mail, Wallet } from 'lucide-react';
import { useRef, useState } from 'react';
import { Card } from '../ui/Card';
import { GradientButton } from '../ui/GradientButton';
import { Logo } from '../ui/Logo';
import { InstallWalletModal } from './InstallWalletModal';
import { useWallet } from '../../hooks/useWallet';
import { apiUrl } from '../../lib/apiBase';
import { notifyError, notifySuccess } from '../../lib/walletConnect';
import type { AuthBoot } from '../../types';

type LoginPageProps = {
  data: AuthBoot;
};

function obscure(address: string) {
  if (!address || address.length < 12) return address || '—';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Email + password + connected wallet must match registered wallet.
 */
export function LoginPage({ data }: LoginPageProps) {
  const wallet = useWallet();
  const submittingRef = useRef(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showInstall, setShowInstall] = useState(false);

  const handleConnect = async () => {
    if (!wallet.walletInstalled) {
      setShowInstall(true);
      return;
    }
    try {
      await wallet.connect();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : 'Wallet connection failed.');
    }
  };

  const handleLogin = async () => {
    if (submitting || submittingRef.current) return;
    if (!email.trim() || !password) {
      notifyError('Please enter email and password.');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (!wallet.walletInstalled) {
        setShowInstall(true);
        return;
      }

      const address = wallet.isConnected ? wallet.walletAddress : await wallet.connect();

      const res = await fetch(apiUrl('/api/auth/login', data.baseUrl), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          email: email.trim(),
          password,
          wallet: address,
        }),
      });

      if (res.status === 419) {
        notifyError('Session expired. Please refresh and try again.');
        return;
      }

      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        redirect?: string;
        token?: string;
        dashboard?: unknown;
      };

      if (!json.success) {
        notifyError(json.error || 'Invalid login credentials.');
        return;
      }

      if (json.token) {
        try {
          localStorage.setItem('quantara_auth_token', json.token);
        } catch {
          // ignore
        }
      }

      if (json.dashboard) {
        try {
          sessionStorage.setItem('quantara_dashboard_sync', JSON.stringify(json.dashboard));
        } catch {
          // ignore
        }
      }

      notifySuccess('Login successful.');
      window.location.href = json.redirect || apiUrl('/dashboard', data.baseUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed.';
      if (message.toLowerCase().includes('metamask is not installed')) {
        setShowInstall(true);
      } else {
        notifyError(message);
      }
    } finally {
      submittingRef.current = false;
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
          <h1 className="mt-5 text-2xl font-bold text-white">Login</h1>
        </div>

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
                placeholder="you@email.com"
                autoComplete="username"
                disabled={submitting}
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
                placeholder="Password"
                autoComplete="current-password"
                disabled={submitting}
                className="w-full rounded-xl border border-white/[0.09] bg-[#0a0d16] px-4 py-3.5 pr-20 text-sm text-white outline-none transition focus:border-q-cyan/50"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-q-muted hover:text-white"
                onClick={() => setShowPassword((v) => !v)}
                aria-label="Toggle password"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <div className="rounded-xl border border-white/[0.09] bg-[#0a0d16] px-4 py-3.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-q-cyan">Wallet</p>
            <p className="mt-1 break-all font-mono text-sm text-white">
              {wallet.isConnected ? obscure(wallet.walletAddress) : 'Not connected'}
            </p>
          </div>

          {!wallet.isConnected ? (
            <GradientButton
              type="button"
              fullWidth
              className="!rounded-full !py-3.5 !font-bold !text-[#041018]"
              disabled={submitting || wallet.isConnecting}
              onClick={() => void handleConnect()}
            >
              <Wallet className="h-4 w-4" />
              {wallet.isConnecting ? 'Connecting…' : 'Connect Wallet'}
            </GradientButton>
          ) : null}

          <GradientButton
            type="button"
            fullWidth
            className="!rounded-full !py-3.5 !font-bold !text-[#041018]"
            disabled={submitting || !wallet.isConnected}
            onClick={() => void handleLogin()}
          >
            <Lock className="h-4 w-4" />
            {submitting ? 'Signing in…' : 'Login'}
          </GradientButton>
        </div>

        <p className="mt-6 text-center text-sm text-q-muted">
          New here?{' '}
          <a href={data.links.signUp} className="font-semibold text-q-cyan hover:text-white">
            Create account
          </a>
        </p>
      </Card>
    </>
  );
}
