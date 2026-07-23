import { useEffect, useRef, useState } from 'react';
import { Wallet } from 'lucide-react';
import { Card } from '../ui/Card';
import { GradientButton } from '../ui/GradientButton';
import { Input } from '../ui/Input';
import { Logo } from '../ui/Logo';
import { InstallWalletModal } from './InstallWalletModal';
import { useWallet } from '../../hooks/useWallet';
import { apiUrl } from '../../lib/apiBase';
import { notifyError, notifySuccess } from '../../lib/walletConnect';
import {
  completeRegistrationWithLaravel,
  registerOnChain,
} from '../../services/blockchain/registration';
import { createBrowserProvider } from '../../services/blockchain/wallet';
import type { AuthBoot } from '../../types';

type SignupPageProps = {
  data: AuthBoot;
};

const STARTER_PACKAGE = 50;

function obscure(address: string) {
  if (!address || address.length < 12) return address || '—';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Production signup — single form, one Register click.
 * On-chain: register → approve → activatePackage($50) → Laravel verify → session login.
 */
export function SignupPage({ data }: SignupPageProps) {
  const wallet = useWallet();
  const submittingRef = useRef(false);

  const [sponsorId, setSponsorId] = useState(data.referralCode ?? '');
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorWallet, setSponsorWallet] = useState('');
  const [sponsorError, setSponsorError] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [packageAmount] = useState(STARTER_PACKAGE);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    if (data.referralCode) setSponsorId(data.referralCode);
  }, [data.referralCode]);

  useEffect(() => {
    if (!sponsorId.trim()) {
      setSponsorName('');
      setSponsorWallet('');
      setSponsorError('');
      return;
    }

    const timer = window.setTimeout(() => {
      const body = new URLSearchParams();
      body.set('_token', data.csrfToken);
      body.set('sponsor_id', sponsorId.trim());

      void fetch(apiUrl('/check-sponsor-id', data.baseUrl), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'X-CSRF-TOKEN': data.csrfToken,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        credentials: 'same-origin',
        body,
      })
        .then(async (res) => {
          const json = (await res.json()) as {
            success?: boolean;
            name?: string;
            wallet?: string;
            error?: string;
          };
          if (json.success && json.wallet) {
            setSponsorName(json.name || 'Verified');
            setSponsorWallet(json.wallet);
            setSponsorError('');
          } else {
            setSponsorName('');
            setSponsorWallet('');
            setSponsorError('Sponsor not found.');
          }
        })
        .catch(() => {
          setSponsorName('');
          setSponsorWallet('');
          setSponsorError('Sponsor not found.');
        });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [sponsorId, data.baseUrl, data.csrfToken]);

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

  const validate = (): string | null => {
    if (!sponsorId.trim()) return 'Please enter a sponsor.';
    if (!sponsorWallet) return 'Sponsor not found.';
    if (!fullName.trim()) return 'Please enter your full name.';
    if (!username.trim()) return 'Please enter a username.';
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(username.trim())) {
      return 'Username must be 3–32 letters, numbers, or underscores.';
    }
    if (!email.trim()) return 'Please enter your email.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    if (!wallet.isConnected || !wallet.walletAddress) return 'Please connect your wallet.';
    return null;
  };

  const handleRegister = async () => {
    if (busy || submittingRef.current) return;

    const validationError = validate();
    if (validationError) {
      notifyError(validationError);
      return;
    }

    if (!wallet.walletInstalled) {
      setShowInstall(true);
      return;
    }

    submittingRef.current = true;
    setBusy(true);
    setStatus('Connecting wallet…');

    try {
      const session = await createBrowserProvider();
      const nameParts = fullName.trim().split(/\s+/);
      const firstname = nameParts[0] || '';
      const lastname = nameParts.slice(1).join(' ') || '';

      const onChain = await registerOnChain(
        session.signer,
        sponsorWallet,
        packageAmount,
        setStatus,
      );

      setStatus('Creating your account…');
      const laravel = await completeRegistrationWithLaravel({
        baseUrl: data.baseUrl,
        csrfToken: data.csrfToken,
        firstname,
        lastname,
        username: username.trim(),
        email: email.trim(),
        password,
        wallet: onChain.wallet,
        sponsor_id: sponsorId.trim(),
        tx_hash: onChain.registerTxHash,
        package_amount: onChain.packageAmount,
        package_tx_hash: onChain.packageTxHash,
        approve_tx_hash: onChain.approveTxHash,
        token_amount: onChain.tokenAmount,
      });

      notifySuccess('Registration successful.');
      window.location.href = laravel.redirect || apiUrl('/dashboard', data.baseUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed.';
      if (
        message.toLowerCase().includes('metamask is not installed') ||
        message.includes('WALLET_NOT_INSTALLED')
      ) {
        setShowInstall(true);
      } else {
        notifyError(message);
      }
      setStatus('');
    } finally {
      submittingRef.current = false;
      setBusy(false);
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
          <h1 className="mt-5 text-2xl font-bold text-white">Create account</h1>
        </div>

        <div className="space-y-4">
          <Input
            label="Sponsor"
            name="sponsor_id"
            value={sponsorId}
            onChange={(e) => setSponsorId(e.target.value)}
            placeholder="Sponsor ID or wallet"
            autoComplete="off"
            disabled={busy}
          />
          {sponsorName && sponsorWallet ? (
            <p className="text-xs text-emerald-400">Sponsor verified · {sponsorName}</p>
          ) : null}
          {sponsorError && sponsorId.trim() ? (
            <p className="text-xs text-rose-400">{sponsorError}</p>
          ) : null}

          <Input
            label="Full Name"
            name="full_name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            autoComplete="name"
            disabled={busy}
          />

          <Input
            label="Username"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            autoComplete="username"
            disabled={busy}
          />

          <Input
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            autoComplete="email"
            disabled={busy}
          />

          <Input
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 6 characters"
            autoComplete="new-password"
            disabled={busy}
          />

          <Input
            label="Confirm Password"
            name="password_confirmation"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            autoComplete="new-password"
            disabled={busy}
          />

          <label className="block w-full">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-q-cyan">
              Package
            </span>
            <div className="rounded-xl border border-q-cyan/40 bg-q-cyan/10 px-4 py-3.5 text-sm font-semibold text-white">
              ${packageAmount} Starter
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
              disabled={busy || wallet.isConnecting}
              onClick={() => void handleConnect()}
            >
              <Wallet className="h-4 w-4" />
              {wallet.isConnecting ? 'Connecting…' : 'Connect Wallet'}
            </GradientButton>
          ) : null}

          {status ? (
            <p className="rounded-xl border border-q-cyan/20 bg-q-cyan/10 px-4 py-3 text-center text-sm text-q-cyan">
              {status}
            </p>
          ) : null}

          <GradientButton
            type="button"
            fullWidth
            className="!rounded-full !py-3.5 !font-bold !text-[#041018]"
            disabled={busy || !wallet.isConnected}
            onClick={() => void handleRegister()}
          >
            {busy ? 'Registering…' : 'Register'}
          </GradientButton>
        </div>

        <p className="mt-6 text-center text-sm text-q-muted">
          Already have an account?{' '}
          <a href={data.links.signIn} className="font-semibold text-q-cyan hover:text-white">
            Login
          </a>
        </p>
      </Card>
    </>
  );
}
