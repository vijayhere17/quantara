import {
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  Package,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PackageCard } from '../investments/PackageCard';
import { Card } from '../ui/Card';
import { GradientButton } from '../ui/GradientButton';
import { Input } from '../ui/Input';
import { Logo } from '../ui/Logo';
import { RegistrationSuccessPage } from './RegistrationSuccessPage';
import type { AuthBoot, RegistrationSuccessPayload } from '../../types';

type SignupPageProps = {
  data: AuthBoot;
};

const STEPS = [
  { id: 'referral', label: 'Referral' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'info', label: 'Info' },
  { id: 'package', label: 'Package' },
  { id: 'payment', label: 'Payment' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

export function SignupPage({ data }: SignupPageProps) {
  const packages = data.packages ?? [];
  const unlockedAmount = packages.find((p) => !p.locked)?.amount ?? 50;

  const [step, setStep] = useState<StepId>('referral');
  const [sponsorId, setSponsorId] = useState(data.referralCode ?? '');
  const [sponsorName, setSponsorName] = useState('');
  const [wallet, setWallet] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [terms, setTerms] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(unlockedAmount);
  const [success, setSuccess] = useState(false);
  const [successPayload, setSuccessPayload] = useState<RegistrationSuccessPayload | null>(null);

  const stepIndex = STEPS.findIndex((s) => s.id === step);

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

  useEffect(() => {
    const nameEl = document.getElementById('sponsor_name');
    if (!nameEl) return;
    const sync = () => setSponsorName(nameEl.textContent?.trim() || '');
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(nameEl, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (data.referralCode) {
      syncSponsorToDom(data.referralCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.__QUANTARA_LAST_WALLET__ = wallet;
    window.__QUANTARA_LAST_SPONSOR__ = sponsorId;
  }, [wallet, sponsorId]);

  useEffect(() => {
    const onSuccess = (event: Event) => {
      const custom = event as CustomEvent<RegistrationSuccessPayload>;
      setSuccessPayload(custom.detail ?? buildPayload());
      setSuccess(true);
    };
    window.addEventListener('quantara:registration-success', onSuccess);
    return () => window.removeEventListener('quantara:registration-success', onSuccess);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sponsorId, wallet, selectedAmount, packages]);

  const buildPayload = (): RegistrationSuccessPayload => ({
    memberId: wallet || '—',
    walletAddress: wallet || '—',
    sponsorId: sponsorId || '—',
    packageLabel: packages.find((p) => p.amount === selectedAmount)?.label || '$50',
    transactionHash: 'Pending confirmation',
    registrationDate: new Date().toLocaleString(),
    network: 'BNB Smart Chain',
  });

  const selectedPackage = useMemo(
    () => packages.find((p) => p.amount === selectedAmount) ?? packages[0],
    [packages, selectedAmount],
  );

  const goNext = () => {
    const next = STEPS[Math.min(stepIndex + 1, STEPS.length - 1)];
    setStep(next.id);
  };

  const goBack = () => {
    const prev = STEPS[Math.max(stepIndex - 1, 0)];
    setStep(prev.id);
  };

  const syncSponsorToDom = (value: string) => {
    setSponsorId(value);
    const el = document.getElementById('sponsor_id') as HTMLInputElement | null;
    if (el) {
      el.value = value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  if (success) {
    return <RegistrationSuccessPage data={data} details={successPayload} />;
  }

  return (
    <Card
      hover={false}
      className="mx-auto w-full max-w-[760px] border-q-cyan/25 p-5 shadow-[0_0_0_1px_rgba(0,217,255,0.10),0_0_48px_rgba(124,58,237,0.12)] sm:p-8"
    >
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo href={data.links.home} size="lg" imgClassName="max-w-[200px]" />
        <h1 className="mt-5 text-2xl font-bold text-white">Create your account</h1>
        <p className="mt-1.5 text-sm text-q-muted">Join the Quantara ecosystem on BNB Smart Chain</p>
      </div>

      {/* Step indicator */}
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

      {/* Legacy bridge fields — keep IDs for existing signup JS */}
      <div className="sr-only" aria-hidden>
        <input type="text" name="sponsor_id" id="sponsor_id" defaultValue={data.referralCode ?? ''} readOnly />
        <div id="sponsor_name" />
        <select name="leg" id="leg" defaultValue="L">
          <option value="L">Left</option>
          <option value="R">Right</option>
        </select>
        <input type="text" name="firstname" id="firstname" value={firstName} readOnly onChange={() => undefined} />
        <input type="text" name="lastname" id="lastname" value={lastName} readOnly onChange={() => undefined} />
        <input type="text" name="email" id="email" value={email} readOnly onChange={() => undefined} />
        <input type="text" name="userwallet" id="userwallet" defaultValue="" readOnly />
        <input type="checkbox" name="terms" id="terms" checked={terms} readOnly onChange={() => undefined} />
      </div>

      {step === 'referral' ? (
        <section className="space-y-5 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-q-cyan/15 text-q-cyan">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Referral ID</h2>
              <p className="text-sm text-q-muted">Enter your sponsor wallet / member ID to continue.</p>
            </div>
          </div>
          <Input
            label="Sponsor / Referral ID"
            name="sponsor_display"
            value={sponsorId}
            onChange={(e) => syncSponsorToDom(e.target.value)}
            placeholder="Sponsor ID"
          />
          {sponsorName ? (
            <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
              Sponsor verified: <span className="font-semibold">{sponsorName}</span>
            </p>
          ) : null}
          <GradientButton
            type="button"
            fullWidth
            className="!rounded-full !py-3.5 !font-bold !text-[#041018]"
            disabled={!sponsorId.trim()}
            onClick={goNext}
          >
            Continue
            <ChevronRight className="h-4 w-4" />
          </GradientButton>
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
              <p className="text-sm text-q-muted">Connect your BNB Smart Chain wallet to register.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-q-cyan/20 bg-q-cyan/5 px-4 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-q-cyan">Connected Wallet</p>
            <p className="mt-1 break-all text-sm text-white">
              {wallet || 'No wallet connected yet'}
            </p>
          </div>
          {!wallet ? (
            <GradientButton
              type="button"
              fullWidth
              className="btn-connect !rounded-full !py-3.5 !font-bold !text-[#041018]"
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </GradientButton>
          ) : (
            <GradientButton
              type="button"
              fullWidth
              className="!rounded-full !py-3.5 !font-bold !text-[#041018]"
              onClick={goNext}
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </GradientButton>
          )}
          <button
            type="button"
            onClick={goBack}
            className="inline-flex w-full items-center justify-center gap-1 text-sm text-q-muted transition hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
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
              <p className="text-sm text-q-muted">Optional profile details for your membership.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="First Name"
              name="firstname_display"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                const el = document.getElementById('firstname') as HTMLInputElement | null;
                if (el) el.value = e.target.value;
              }}
              placeholder="First name"
            />
            <Input
              label="Last Name"
              name="lastname_display"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                const el = document.getElementById('lastname') as HTMLInputElement | null;
                if (el) el.value = e.target.value;
              }}
              placeholder="Last name"
            />
          </div>
          <Input
            label="Email"
            name="email_display"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              const el = document.getElementById('email') as HTMLInputElement | null;
              if (el) el.value = e.target.value;
            }}
            placeholder="you@wallet.io"
          />
          <GradientButton
            type="button"
            fullWidth
            className="!rounded-full !py-3.5 !font-bold !text-[#041018]"
            onClick={goNext}
          >
            Continue
            <ChevronRight className="h-4 w-4" />
          </GradientButton>
          <button
            type="button"
            onClick={goBack}
            className="inline-flex w-full items-center justify-center gap-1 text-sm text-q-muted transition hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
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
              <p className="text-sm text-q-muted">
                New members register with the starter package. Higher packages unlock later.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.amount}
                pkg={pkg}
                selected={selectedAmount === pkg.amount && !pkg.locked}
                onSelect={() => {
                  if (!pkg.locked) setSelectedAmount(pkg.amount);
                }}
              />
            ))}
          </div>

          <p className="flex items-center gap-2 text-xs text-q-muted">
            <Lock className="h-3.5 w-3.5" />
            Only the ${unlockedAmount} package is available for registration right now.
          </p>

          <GradientButton
            type="button"
            fullWidth
            className="!rounded-full !py-3.5 !font-bold !text-[#041018]"
            onClick={goNext}
          >
            Continue with {selectedPackage?.label || '$50'}
            <ChevronRight className="h-4 w-4" />
          </GradientButton>
          <button
            type="button"
            onClick={goBack}
            className="inline-flex w-full items-center justify-center gap-1 text-sm text-q-muted transition hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
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
              <p className="text-sm text-q-muted">Confirm details and complete registration with your wallet.</p>
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
              <span className="max-w-[60%] truncate font-semibold text-white">{wallet || '—'}</span>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-q-soft">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-[#0a0d16] text-q-cyan focus:ring-q-cyan/40"
              checked={terms}
              onChange={(e) => {
                setTerms(e.target.checked);
                const el = document.getElementById('terms') as HTMLInputElement | null;
                if (el) el.checked = e.target.checked;
              }}
            />
            <span>
              I agree to all the Terms &amp; Conditions of the Quantara ecosystem.
            </span>
          </label>

          <GradientButton
            type="button"
            fullWidth
            className="btn-submit !rounded-full !py-3.5 !font-bold !text-[#041018]"
            disabled={!terms || !wallet || !sponsorId}
          >
            Complete Registration
          </GradientButton>

          {/* Keep connect class available for legacy scripts if wallet drops */}
          <button type="button" className="btn-connect hidden" aria-hidden tabIndex={-1} />

          <button
            type="button"
            onClick={goBack}
            className="inline-flex w-full items-center justify-center gap-1 text-sm text-q-muted transition hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
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
  );
}
