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

    // Prefer legacy processlogin (same endpoint / token handling)
    if (typeof window.processlogin === 'function') {
      setLoggingIn(true);
      try {
        window.processlogin();
      } finally {
        window.setTimeout(() => setLoggingIn(false), 1200);
      }
      return;
    }

    // Fallback — same API as legacy processlogin
    setLoggingIn(true);
    const token =
      data.csrfToken ||
      (document.getElementById('token') as HTMLInputElement | null)?.value ||
      '';
    const base =
      data.baseUrl?.replace(/\/$/, '') ||
      (document.getElementById('basePath') as HTMLInputElement | null)?.value ||
      '';

    void fetch(`${base}/submit-sign-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-CSRF-TOKEN': token,
      },
      body: JSON.stringify({ _token: token, wallet: address }),
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
          <GradientButton
            type="button"
            fullWidth
            className="btn-connect !rounded-full !py-3.5 !font-bold !text-[#041018]"
            onClick={() => void handleConnect()}
            disabled={connecting}
          >
            <Wallet className="h-4 w-4" />
            {connecting ? 'Connecting…' : 'Connect Wallet'}
          </GradientButton>
        ) : (
          <GradientButton
            type="button"
            fullWidth
            className="btn-submit !rounded-full !py-3.5 !font-bold !text-[#041018]"
            onClick={handleLogin}
            disabled={loggingIn}
          >
            <Wallet className="h-4 w-4" />
            {loggingIn ? 'Signing in…' : 'Login'}
          </GradientButton>
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
