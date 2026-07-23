import { Wallet } from 'lucide-react';
import { useRef, useState } from 'react';
import { Card } from '../ui/Card';
import { GradientButton } from '../ui/GradientButton';
import { Logo } from '../ui/Logo';
import { InstallWalletModal } from './InstallWalletModal';
import { useWallet } from '../../hooks/useWallet';
import { apiUrl } from '../../lib/apiBase';
import { notifyError, notifySuccess } from '../../lib/walletConnect';
import { createBrowserProvider } from '../../services/blockchain/wallet';
import type { AuthBoot } from '../../types';

type LoginPageProps = {
  data: AuthBoot;
};

function obscure(address: string) {
  if (!address || address.length < 12) return address || '—';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function buildLoginMessage(wallet: string): string {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return [
    'Quantara Login',
    `Wallet: ${wallet}`,
    `Issued At: ${new Date().toISOString()}`,
    `Nonce: ${nonce}`,
  ].join('\n');
}

/**
 * Wallet-only login: Connect MetaMask → personal_sign → Laravel session.
 * No email / password.
 */
export function LoginPage({ data }: LoginPageProps) {
  const wallet = useWallet();
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');
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

    submittingRef.current = true;
    setSubmitting(true);
    setStatus('Connecting wallet…');
    try {
      if (!wallet.walletInstalled) {
        setShowInstall(true);
        return;
      }

      const session = await createBrowserProvider();
      const address = await session.signer.getAddress();

      setStatus('Confirm login signature in MetaMask…');
      const message = buildLoginMessage(address);
      const signature = await session.signer.signMessage(message);

      setStatus('Verifying wallet…');
      const res = await fetch(apiUrl('/api/auth/login', data.baseUrl), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          wallet: address,
          signature,
          message,
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
        code?: string;
      };

      if (!json.success) {
        notifyError(json.error || 'Login failed.');
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
      } else if (
        message.toLowerCase().includes('user rejected') ||
        message.toLowerCase().includes('user denied')
      ) {
        notifyError('Signature cancelled in MetaMask.');
      } else {
        notifyError(message);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
      setStatus('');
    }
  };

  return (
    <>
      <InstallWalletModal open={showInstall} onClose={() => setShowInstall(false)} />

      <Card
        hover={false}
        className="mx-auto w-full max-w-[460px] min-w-0 overflow-hidden border-q-cyan/25 p-5 shadow-[0_0_0_1px_rgba(0,217,255,0.10),0_0_48px_rgba(124,58,237,0.12)] sm:p-8"
      >
        <div className="mb-7 flex flex-col items-center text-center">
          <Logo href={data.links.home} size="lg" imgClassName="max-w-[200px]" />
          <div className="mt-5 h-px w-16 bg-gradient-to-r from-transparent via-q-cyan/50 to-transparent" />
          <h1 className="mt-5 text-2xl font-bold text-white">Login</h1>
          <p className="mt-2 max-w-[280px] text-sm text-q-muted">
            Connect your registered wallet and confirm the MetaMask signature.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/[0.09] bg-[#0a0d16] px-4 py-3.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-q-cyan">Wallet</p>
            <p className="mt-1 break-all font-mono text-sm text-white">
              {wallet.isConnected ? obscure(wallet.walletAddress) : 'Not connected'}
            </p>
          </div>

          {status ? (
            <p className="rounded-xl border border-q-cyan/20 bg-q-cyan/10 px-4 py-3 text-sm text-q-cyan">
              {status}
            </p>
          ) : null}

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
          ) : (
            <GradientButton
              type="button"
              fullWidth
              className="!rounded-full !py-3.5 !font-bold !text-[#041018]"
              disabled={submitting}
              onClick={() => void handleLogin()}
            >
              <Wallet className="h-4 w-4" />
              {submitting ? 'Signing in…' : 'Sign in with Wallet'}
            </GradientButton>
          )}
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
