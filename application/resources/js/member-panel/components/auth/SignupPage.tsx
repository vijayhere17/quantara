import {
  Check,
  ChevronLeft,
  ChevronRight,
  Package,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PackageCard, isPackageSelectable } from '../investments/PackageCard';
import { Card } from '../ui/Card';
import { GradientButton } from '../ui/GradientButton';
import { Input } from '../ui/Input';
import { Logo } from '../ui/Logo';
import { RegistrationSuccessPage } from './RegistrationSuccessPage';
import { InstallWalletModal } from './InstallWalletModal';
import { DemoFaucetButton } from './DemoFaucetButton';
import { useWallet } from '../../hooks/useWallet';
import { apiUrl } from '../../lib/apiBase';
import { notifyError } from '../../lib/walletConnect';
import {
  completeRegistrationWithLaravel,
  registerOnChain,
} from '../../services/blockchain/registration';
import { loadBlockchainConfig } from '../../services/blockchain/config';
import { createBrowserProvider } from '../../services/blockchain/wallet';
import type { AuthBoot, RegistrationSuccessPayload } from '../../types';

type SignupPageProps = {
  data: AuthBoot;
};

const STEPS = [
  { id: 'referral', label: 'Referral' },
  { id: 'info', label: 'Info' },
  { id: 'package', label: 'Package' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'payment', label: 'Payment' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

/**
 * Real Web3 registration:
 * form → connect wallet → BTCPlanCore.register(sponsor)
 * → approve + activatePackage(amount) → Laravel verifies txs → create user → login
 */
export function SignupPage({ data }: SignupPageProps) {
  const packages = data.packages ?? [];
  const unlockedAmount = packages.find((p) => !p.locked)?.amount ?? 50;
  const wallet = useWallet();

  const [step, setStep] = useState<StepId>('referral');
  const [sponsorId, setSponsorId] = useState(data.referralCode ?? '');
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorWallet, setSponsorWallet] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(unlockedAmount);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successPayload, setSuccessPayload] = useState<RegistrationSuccessPayload | null>(null);
  const [showDemoFaucet, setShowDemoFaucet] = useState(false);

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  useEffect(() => {
    if (data.referralCode) setSponsorId(data.referralCode);
  }, [data.referralCode]);

  useEffect(() => {
    let cancelled = false;
    void loadBlockchainConfig(data.baseUrl)
      .then((cfg) => {
        if (!cancelled) setShowDemoFaucet(Boolean(cfg.demoFaucet));
      })
      .catch(() => {
        if (!cancelled) setShowDemoFaucet(false);
      });
    return () => {
      cancelled = true;
    };
  }, [data.baseUrl]);

  useEffect(() => {
    if (!sponsorId.trim()) {
      setSponsorName('');
      setSponsorWallet('');
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
          } else {
            setSponsorName('');
            setSponsorWallet('');
          }
        })
        .catch(() => {
          setSponsorName('');
          setSponsorWallet('');
        });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [sponsorId, data.baseUrl, data.csrfToken]);

  const selectedPackage = useMemo(
    () => packages.find((p) => p.amount === selectedAmount) ?? packages[0],
    [packages, selectedAmount],
  );

  const goNext = () => setStep(STEPS[Math.min(stepIndex + 1, STEPS.length - 1)].id);
  const goBack = () => setStep(STEPS[Math.max(stepIndex - 1, 0)].id);

  const handleRegister = async () => {
    if (busy) return;
    if (!terms) {
      notifyError('Please accept Quantara terms of services.');
      return;
    }
    if (!sponsorId.trim()) {
      notifyError('Please enter a sponsor id.');
      return;
    }
    if (!sponsorWallet || !/^0x[a-fA-F0-9]{40}$/.test(sponsorWallet)) {
      notifyError('Sponsor must be verified before on-chain registration.');
      return;
    }
    if (!email.trim() || password.length < 6) {
      notifyError('Email and password (min 6 chars) are required.');
      return;
    }
    if (!wallet.walletInstalled) {
      setShowInstall(true);
      return;
    }

    setBusy(true);
    setStatus('Connecting wallet…');
    try {
      const session = await createBrowserProvider();

      // Contract requires register(sponsor address) — never pass the referral username raw
      setStatus('Submitting on-chain registration…');
      const onChain = await registerOnChain(
        session.signer,
        sponsorWallet,
        selectedAmount,
        setStatus,
      );

      setStatus('Verifying blockchain transactions with Quantara…');
      const laravel = await completeRegistrationWithLaravel({
        baseUrl: data.baseUrl,
        csrfToken: data.csrfToken,
        firstname: firstName,
        lastname: lastName,
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

      setSuccessPayload({
        memberId: String(laravel.user?.username || onChain.wallet),
        walletAddress: onChain.wallet,
        sponsorId: sponsorId.trim(),
        packageLabel: selectedPackage?.label || `$${selectedAmount}`,
        transactionHash: onChain.registerTxHash,
        registrationDate: new Date().toLocaleString(),
        network: 'BNB Smart Chain',
      });
      setSuccess(true);

      // Auto-open dashboard with synchronized session
      window.setTimeout(() => {
        window.location.href = laravel.redirect || apiUrl('/dashboard', data.baseUrl);
      }, 1200);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Registration failed';
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
      setBusy(false);
    }
  };

  if (success) {
    return <RegistrationSuccessPage data={data} details={successPayload} />;
  }

  return (
    <>
      <InstallWalletModal open={showInstall} onClose={() => setShowInstall(false)} />

      <Card
        hover={false}
        className="mx-auto w-full max-w-[760px] border-q-cyan/25 p-5 shadow-[0_0_0_1px_rgba(0,217,255,0.10),0_0_48px_rgba(124,58,237,0.12)] sm:p-8"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo href={data.links.home} size="lg" imgClassName="max-w-[200px]" />
          <h1 className="mt-5 text-2xl font-bold text-white">Create your account</h1>
        </div>

        <ol className="mb-7 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {STEPS.map((s, index) => {
            const active = index === stepIndex;
            const done = index < stepIndex;
            return (
              <li key={s.id} className="flex items-center gap-2">
                <span
                  className={[
                    'inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-xs font-bold transition',
                    active
                      ? 'border-q-cyan/50 bg-q-cyan/15 text-q-cyan'
                      : done
                        ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300'
                        : 'border-white/10 bg-white/[0.03] text-q-muted',
                  ].join(' ')}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className={`hidden text-xs font-semibold sm:inline ${active ? 'text-white' : 'text-q-muted'}`}>
                  {s.label}
                </span>
                {index < STEPS.length - 1 ? (
                  <ChevronRight className="hidden h-3.5 w-3.5 text-q-muted/50 sm:inline" />
                ) : null}
              </li>
            );
          })}
        </ol>

        {step === 'referral' ? (
          <section className="space-y-5 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-q-cyan/15 text-q-cyan">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Referral ID</h2>
                <p className="text-sm text-q-muted">Enter your sponsor ID.</p>
              </div>
            </div>
            <Input
              label="Sponsor / Referral ID"
              name="sponsor_display"
              value={sponsorId}
              onChange={(e) => setSponsorId(e.target.value)}
              placeholder="Sponsor wallet address"
            />
            {sponsorName && sponsorWallet ? (
              <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                Sponsor verified: <span className="font-semibold">{sponsorName}</span>
                <span className="mt-1 block font-mono text-[11px] text-emerald-200/70">{sponsorWallet}</span>
              </p>
            ) : null}
            <GradientButton
              type="button"
              fullWidth
              className="!rounded-full !py-3.5 !font-bold !text-[#041018]"
              disabled={!sponsorId.trim() || !sponsorName || !sponsorWallet}
              onClick={goNext}
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </GradientButton>
          </section>
        ) : null}

        {step === 'info' ? (
          <section className="space-y-5 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-q-cyan/15 text-q-cyan">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">User Information</h2>
                <p className="text-sm text-q-muted">Used for login after registration.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="First Name" name="firstname" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
              <Input label="Last Name" name="lastname" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
            </div>
            <Input label="Email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@wallet.io" />
            <Input label="Password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" />
            <GradientButton
              type="button"
              fullWidth
              className="!rounded-full !py-3.5 !font-bold !text-[#041018]"
              disabled={!email.trim() || password.length < 6}
              onClick={goNext}
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </GradientButton>
            <button type="button" onClick={goBack} className="inline-flex w-full items-center justify-center gap-1 text-sm text-q-muted hover:text-white">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          </section>
        ) : null}

        {step === 'package' ? (
          <section className="space-y-5 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-q-cyan/15 text-q-cyan">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Choose Package</h2>
                <p className="text-sm text-q-muted">Starter package for new members.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {packages.map((pkg) => (
                <PackageCard
                  key={pkg.amount}
                  pkg={pkg}
                  selected={selectedAmount === pkg.amount && isPackageSelectable(pkg)}
                  onSelect={() => {
                    if (isPackageSelectable(pkg)) setSelectedAmount(pkg.amount);
                  }}
                />
              ))}
            </div>
            <GradientButton type="button" fullWidth className="!rounded-full !py-3.5 !font-bold !text-[#041018]" onClick={goNext}>
              Continue with {selectedPackage?.label || '$50'}
              <ChevronRight className="h-4 w-4" />
            </GradientButton>
            <button type="button" onClick={goBack} className="inline-flex w-full items-center justify-center gap-1 text-sm text-q-muted hover:text-white">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          </section>
        ) : null}

        {step === 'wallet' ? (
          <section className="space-y-5 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-q-cyan/15 text-q-cyan">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Wallet Connect</h2>
                <p className="text-sm text-q-muted">Connect MetaMask to continue.</p>
              </div>
            </div>
            <div className="rounded-2xl border border-q-cyan/20 bg-q-cyan/5 px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-q-cyan">Connected Wallet</p>
              <p className="mt-1 break-all text-sm text-white">
                {wallet.walletAddress || 'No wallet connected yet'}
              </p>
            </div>
            {!wallet.isConnected ? (
              <GradientButton
                type="button"
                fullWidth
                className="!rounded-full !py-3.5 !font-bold !text-[#041018]"
                disabled={wallet.isConnecting}
                onClick={() => {
                  if (!wallet.walletInstalled) {
                    setShowInstall(true);
                    return;
                  }
                  void wallet.connect().catch((err) => notifyError(err.message));
                }}
              >
                <Wallet className="h-4 w-4" />
                {wallet.isConnecting ? 'Connecting…' : 'Connect Wallet'}
              </GradientButton>
            ) : (
              <GradientButton type="button" fullWidth className="!rounded-full !py-3.5 !font-bold !text-[#041018]" onClick={goNext}>
                Continue
                <ChevronRight className="h-4 w-4" />
              </GradientButton>
            )}
            <button type="button" onClick={goBack} className="inline-flex w-full items-center justify-center gap-1 text-sm text-q-muted hover:text-white">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          </section>
        ) : null}

        {step === 'payment' ? (
          <section className="space-y-5 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-q-cyan/15 text-q-cyan">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Payment & Register</h2>
                <p className="text-sm text-q-muted">
                  Confirm each MetaMask prompt to finish registration.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#0a0d16]/80 px-4 py-3 text-sm">
              <div className="flex justify-between gap-3 border-b border-white/[0.06] py-2.5">
                <span className="text-q-muted">Package</span>
                <span className="font-semibold text-white">{selectedPackage?.label || '$50'}</span>
              </div>
              <div className="flex justify-between gap-3 border-b border-white/[0.06] py-2.5">
                <span className="text-q-muted">Sponsor</span>
                <span className="max-w-[60%] truncate font-semibold text-white">{sponsorId || '—'}</span>
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <span className="text-q-muted">Wallet</span>
                <span className="max-w-[60%] truncate font-semibold text-white">{wallet.walletAddress || '—'}</span>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-q-soft">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-white/20 bg-[#0a0d16] text-q-cyan"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
              />
              <span>I agree to the Terms &amp; Conditions.</span>
            </label>

            {status ? (
              <p className="rounded-xl border border-q-cyan/20 bg-q-cyan/10 px-4 py-3 text-sm text-q-cyan">{status}</p>
            ) : null}

            {showDemoFaucet ? (
              <DemoFaucetButton walletAddress={wallet.walletAddress || undefined} />
            ) : null}

            <GradientButton
              type="button"
              fullWidth
              className="!rounded-full !py-3.5 !font-bold !text-[#041018]"
              disabled={busy || !terms || !wallet.isConnected}
              onClick={() => void handleRegister()}
            >
              {busy ? 'Processing…' : 'Register'}
            </GradientButton>

            <button type="button" onClick={goBack} className="inline-flex w-full items-center justify-center gap-1 text-sm text-q-muted hover:text-white">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          </section>
        ) : null}

        <p className="mt-6 text-center text-sm text-q-muted">
          Already have an account?{' '}
          <a href={data.links.signIn} className="font-semibold text-q-cyan hover:text-white">
            Sign In
          </a>
        </p>
      </Card>
    </>
  );
}
