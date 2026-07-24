import {
  ChevronLeft,
  ChevronRight,
  Package,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { Card } from '../ui/Card';
import { GradientButton } from '../ui/GradientButton';
import { Input } from '../ui/Input';
import { Logo } from '../ui/Logo';
import { RegistrationSuccessPage } from './RegistrationSuccessPage';
import { InstallWalletModal } from './InstallWalletModal';
import { DemoFaucetButton } from './DemoFaucetButton';
import { SignupStepper } from './SignupStepper';
import { StarterPackageCard } from './StarterPackageCard';
import { NetworkWalletStatus } from '../wallet/NetworkWalletStatus';
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

/** Registration always starts with the $50 starter package. */
const STARTER_AMOUNT = 50;

/**
 * Real Web3 registration:
 * form → connect wallet → BTCPlanCore.register(sponsor)
 * → approve + activatePackage(50) → Laravel verifies txs → create user → login
 */
export function SignupPage({ data }: SignupPageProps) {
  const wallet = useWallet();
  const reduceMotion = useReducedMotion();

  const [step, setStep] = useState<StepId>('referral');
  const [sponsorId, setSponsorId] = useState(data.referralCode ?? '');
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorWallet, setSponsorWallet] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successPayload, setSuccessPayload] = useState<RegistrationSuccessPayload | null>(null);
  const [showDemoFaucet, setShowDemoFaucet] = useState(false);

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const selectedAmount = STARTER_AMOUNT;

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
        packageLabel: 'Starter Package · $50',
        transactionHash: onChain.registerTxHash,
        registrationDate: new Date().toLocaleString(),
        network: 'BNB Smart Chain',
      });
      setSuccess(true);

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

  const stepMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, x: 16 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -12 },
        transition: { duration: 0.28 },
      };

  return (
    <>
      <InstallWalletModal open={showInstall} onClose={() => setShowInstall(false)} />

      <Card
        hover={false}
        className="mx-auto !h-auto w-full min-w-0 overflow-hidden border-[#00B5FF]/25 bg-[#0a1528]/80 p-4 shadow-[0_0_0_1px_rgba(0,181,255,0.12),0_16px_48px_rgba(7,19,38,0.65)] backdrop-blur-xl sm:p-5 xl:p-4 2xl:p-6"
      >
        <div className="mb-3 flex flex-col items-center text-center xl:mb-2.5 xl:items-start xl:text-left">
          <Logo href={data.links.home} size="md" imgClassName="h-9 max-w-[150px]" className="xl:hidden" />
          <p className="mt-2.5 text-[10px] font-bold uppercase tracking-[0.28em] text-[#38D9FF] xl:mt-0">
            Create account
          </p>
          <h1 className="font-display mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
            Join Quantara
          </h1>
          <p className="mt-1 max-w-[36ch] text-xs text-[#A8B8D0] xl:hidden 2xl:mt-1.5 2xl:block 2xl:text-sm">
            Complete a few steps to register on BNB Smart Chain with MetaMask.
          </p>
        </div>

        <SignupStepper steps={STEPS} currentIndex={stepIndex} />

        <AnimatePresence mode="wait">
          {step === 'referral' ? (
            <motion.section key="referral" className="space-y-3" {...stepMotion}>
              <StepHeader
                icon={<Users className="h-4 w-4" />}
                title="Referral ID"
                subtitle="Enter your sponsor wallet or username."
              />
              <Input
                label="Sponsor / Referral ID"
                name="sponsor_display"
                value={sponsorId}
                onChange={(e) => setSponsorId(e.target.value)}
                placeholder="Sponsor wallet address"
              />
              {sponsorName && sponsorWallet ? (
                <p className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300">
                  Sponsor verified: <span className="font-semibold">{sponsorName}</span>
                  <span className="mt-0.5 block font-mono text-[10px] text-emerald-200/70">
                    {sponsorWallet}
                  </span>
                </p>
              ) : null}
              <GradientButton
                type="button"
                fullWidth
                className="!rounded-2xl !py-3 !text-sm !font-bold !text-[#041018]"
                disabled={!sponsorId.trim() || !sponsorName || !sponsorWallet}
                onClick={goNext}
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </GradientButton>
            </motion.section>
          ) : null}

          {step === 'info' ? (
            <motion.section key="info" className="space-y-2.5" {...stepMotion}>
              <StepHeader
                icon={<UserRound className="h-4 w-4" />}
                title="User Information"
                subtitle="Used for login after registration."
              />
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Input
                  label="First Name"
                  name="firstname"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
                <Input
                  label="Last Name"
                  name="lastname"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </div>
              <Input
                label="Email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@wallet.io"
              />
              <Input
                label="Password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
              <GradientButton
                type="button"
                fullWidth
                className="!rounded-2xl !py-3 !text-sm !font-bold !text-[#041018]"
                disabled={!email.trim() || password.length < 6}
                onClick={goNext}
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </GradientButton>
              <BackButton onClick={goBack} />
            </motion.section>
          ) : null}

          {step === 'package' ? (
            <motion.section key="package" className="space-y-3" {...stepMotion}>
              <StepHeader
                icon={<Package className="h-4 w-4" />}
                title="Starter Package"
                subtitle="New members begin with the $50 registration package."
              />
              <StarterPackageCard />
              <GradientButton
                type="button"
                fullWidth
                className="!rounded-2xl !py-3 !text-sm !font-bold !text-[#041018]"
                onClick={goNext}
              >
                Continue with $50
                <ChevronRight className="h-4 w-4" />
              </GradientButton>
              <BackButton onClick={goBack} />
            </motion.section>
          ) : null}

          {step === 'wallet' ? (
            <motion.section key="wallet" className="space-y-3" {...stepMotion}>
              <StepHeader
                icon={<Wallet className="h-4 w-4" />}
                title="Wallet Connect"
                subtitle="Connect MetaMask, Trust Wallet, or another BEP-20 wallet."
              />
              <div className="rounded-xl border border-[#00B5FF]/25 bg-[#00B5FF]/5 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#38D9FF]">
                  Connected Wallet
                </p>
                <p className="mt-0.5 break-all text-xs text-white sm:text-sm">
                  {wallet.walletAddress || 'No wallet connected yet'}
                </p>
              </div>
              <NetworkWalletStatus wallet={wallet} />
              {!wallet.isConnected ? (
                <GradientButton
                  type="button"
                  fullWidth
                  className="!rounded-2xl !py-3 !text-sm !font-bold !text-[#041018]"
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
                <GradientButton
                  type="button"
                  fullWidth
                  className="!rounded-2xl !py-3 !text-sm !font-bold !text-[#041018]"
                  onClick={goNext}
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </GradientButton>
              )}
              <BackButton onClick={goBack} />
            </motion.section>
          ) : null}

          {step === 'payment' ? (
            <motion.section key="payment" className="min-w-0 space-y-2.5" {...stepMotion}>
              <StepHeader
                icon={<Wallet className="h-4 w-4" />}
                title="Payment & Register"
                subtitle="Confirm each wallet prompt to finish on BNB Smart Chain."
              />

              <NetworkWalletStatus wallet={wallet} />

              <div className="min-w-0 overflow-hidden rounded-xl border border-white/[0.08] bg-[#071326]/80 px-3 py-1.5 text-xs sm:text-sm">
                <SummaryRow label="Package" value="Starter · $50" />
                <SummaryRow
                  label="Sponsor"
                  value={
                    sponsorId
                      ? `${sponsorId.slice(0, 6)}…${sponsorId.slice(-4)}`
                      : '—'
                  }
                  mono
                  title={sponsorId || undefined}
                />
                <SummaryRow
                  label="Wallet"
                  value={
                    wallet.walletAddress
                      ? `${wallet.walletAddress.slice(0, 6)}…${wallet.walletAddress.slice(-4)}`
                      : '—'
                  }
                  mono
                  title={wallet.walletAddress || undefined}
                  last
                />
              </div>

              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-xs text-q-soft sm:text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-[#0a0d16] text-[#00B5FF]"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                />
                <span className="min-w-0 break-words">I agree to the Terms &amp; Conditions.</span>
              </label>

              {status ? (
                <p className="break-words rounded-xl border border-[#00B5FF]/25 bg-[#00B5FF]/10 px-3 py-2 text-xs text-[#38D9FF]">
                  {status}
                </p>
              ) : null}

              {showDemoFaucet ? (
                <DemoFaucetButton walletAddress={wallet.walletAddress || undefined} />
              ) : null}

              <GradientButton
                type="button"
                fullWidth
                className="!rounded-2xl !py-3 !text-sm !font-bold !text-[#041018]"
                disabled={busy || !terms || !wallet.isConnected}
                onClick={() => void handleRegister()}
              >
                {busy ? 'Processing…' : 'Register'}
              </GradientButton>

              <BackButton onClick={goBack} />
            </motion.section>
          ) : null}
        </AnimatePresence>

        <p className="mt-3.5 text-center text-xs text-q-muted xl:mt-3">
          Already have an account?{' '}
          <a href={data.links.signIn} className="font-semibold text-[#38D9FF] hover:text-white">
            Sign In
          </a>
        </p>
      </Card>
    </>
  );
}

function StepHeader({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#00B5FF]/15 text-[#38D9FF]">
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-bold text-white">{title}</h2>
        <p className="text-xs text-[#A8B8D0]">{subtitle}</p>
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-full items-center justify-center gap-1 text-xs text-q-muted transition hover:text-white"
    >
      <ChevronLeft className="h-3.5 w-3.5" /> Back
    </button>
  );
}

function SummaryRow({
  label,
  value,
  mono,
  title,
  last,
}: {
  label: string;
  value: string;
  mono?: boolean;
  title?: string;
  last?: boolean;
}) {
  return (
    <div
      className={[
        'flex min-w-0 items-start justify-between gap-3 py-1.5',
        last ? '' : 'border-b border-white/[0.06]',
      ].join(' ')}
    >
      <span className="shrink-0 text-q-muted">{label}</span>
      <span
        className={[
          'min-w-0 break-all text-right font-semibold text-white',
          mono ? 'font-mono text-[11px] sm:text-xs' : '',
        ].join(' ')}
        title={title}
      >
        {value}
      </span>
    </div>
  );
}
