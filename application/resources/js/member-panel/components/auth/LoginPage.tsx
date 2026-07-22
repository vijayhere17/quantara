import { Wallet } from 'lucide-react';
import { useState } from 'react';
import { Card } from '../ui/Card';
import { GradientButton } from '../ui/GradientButton';
import { Logo } from '../ui/Logo';
import { connectQuantaraWallet, notifyError } from '../../lib/walletConnect';
import type { AuthBoot } from '../../types';

type LoginPageProps = {
  data: AuthBoot;
};

/**
 * Wallet-only login (same flow as original Blade page):
 * Connect Wallet → fill address → Login
 * No email / password fields.
 */
export function LoginPage({ data }: LoginPageProps) {
  const [wallet, setWallet] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const handleConnect = async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      const address = await connectQuantaraWallet();
      setWallet(address);
    } catch (error) {
      console.error('Wallet connection failed:', error);
      const err = error as { code?: number; message?: string };
      if (err?.code === 4001) {
        notifyError('Connection request was rejected in MetaMask');
      } else {
        const message = err?.message || 'Wallet connection failed';
        if (!message.toLowerCase().includes('install metamask')) {
          notifyError(message);
        }
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleLogin = () => {
    if (loggingIn) return;
    const address =
      wallet || (document.getElementById('userwallet') as HTMLInputElement | null)?.value || '';

    if (!address) {
      notifyError('Please connect wallet!');
      return;
    }

    // Keep #userwallet in sync for legacy processlogin()
    const el = document.getElementById('userwallet') as HTMLInputElement | null;
    if (el && !el.value) el.value = address;

    if (typeof window.processlogin === 'function') {
      setLoggingIn(true);
      try {
        window.processlogin();
      } finally {
        window.setTimeout(() => setLoggingIn(false), 1200);
      }
      return;
    }

    setLoggingIn(true);
    const token =
      data.csrfToken ||
      (document.getElementById('token') as HTMLInputElement | null)?.value ||
      '';
    const base =
      data.baseUrl?.replace(/\/$/, '') ||
      (document.getElementById('basePath') as HTMLInputElement | null)?.value ||
      '';

    const body = new URLSearchParams();
    body.set('_token', token);
    body.set('wallet', address);

    void fetch(`${base}/submit-sign-in`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'X-CSRF-TOKEN': token,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body,
    })
      .then(async (res) => {
        const result = (await res.json()) as { success?: boolean; error?: string };
        if (result.success) {
          window.location.href = `${base}/dashboard`;
        } else {
          notifyError(result.error || 'Login failed');
        }
      })
      .catch(() => notifyError('Login failed'))
      .finally(() => setLoggingIn(false));
  };

  const connected = Boolean(wallet);

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
          <input
            id="userwallet"
            name="userwallet"
            type="text"
            readOnly
            value={wallet}
            onChange={() => undefined}
            placeholder="Connect wallet address"
            className="w-full rounded-xl border border-white/[0.09] bg-[#0a0d16] px-4 py-3.5 text-sm text-white outline-none transition-all duration-300 placeholder:text-q-muted/80 focus:border-q-cyan/50 focus:shadow-[0_0_0_3px_rgba(0,212,255,0.14)]"
          />
        </label>

        {!connected ? (
          <button
            type="button"
            className="btn-connect inline-flex w-full items-center justify-center gap-2 rounded-full bg-q-gradient-br px-5 py-3.5 text-sm font-bold text-[#041018] shadow-btn-glow transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void handleConnect()}
            disabled={connecting}
          >
            <Wallet className="h-4 w-4" />
            {connecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
        ) : (
          <button
            type="button"
            className="btn-submit inline-flex w-full items-center justify-center gap-2 rounded-full bg-q-gradient-br px-5 py-3.5 text-sm font-bold text-[#041018] shadow-btn-glow transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleLogin}
            disabled={loggingIn}
          >
            <Wallet className="h-4 w-4" />
            {loggingIn ? 'Signing in…' : 'Login'}
          </button>
        )}
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
