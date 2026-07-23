import { ArrowDownToLine, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card } from '../ui/Card';
import { GradientButton } from '../ui/GradientButton';
import { Input } from '../ui/Input';
import { PageContainer } from '../ui/PageContainer';
import { PageHeader } from '../ui/PageHeader';
import { SectionTitle } from '../ui/SectionTitle';
import { InstallWalletModal } from '../auth/InstallWalletModal';
import { useWallet } from '../../hooks/useWallet';
import { apiUrl } from '../../lib/apiBase';
import { notifyError, notifySuccess } from '../../lib/walletConnect';
import type { WithdrawBoot } from '../../types';

type WithdrawPageProps = {
  data: WithdrawBoot;
};

export function WithdrawPage({ data }: WithdrawPageProps) {
  const wallet = useWallet();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [showInstall, setShowInstall] = useState(false);
  const [balance, setBalance] = useState(
    () => String(data.balance ?? data.wallet.earningWallet ?? '0'),
  );

  const coinRate = data.coinRate ?? 1;
  const minAmount = data.minAmount ?? 5;
  const adminChargePercent = data.adminChargePercent ?? 0;

  const parsedAmount = Number.parseFloat(amount) || 0;
  const adminCharge = useMemo(
    () => (parsedAmount * adminChargePercent) / 100,
    [parsedAmount, adminChargePercent],
  );
  const netAmount = useMemo(
    () => Math.max(0, parsedAmount - adminCharge),
    [parsedAmount, adminCharge],
  );
  const payableCoins = useMemo(() => {
    if (!coinRate || coinRate <= 0) return '0.00000000';
    return (netAmount / coinRate).toFixed(8);
  }, [netAmount, coinRate]);

  const withdrawalWallet = wallet.walletAddress || data.walletAddress || data.user.username;

  const handleSubmit = async () => {
    if (busy) return;

    const bal = Number.parseFloat(balance) || 0;
    if (bal <= 0) {
      notifyError('Account balance is $0');
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      notifyError('Please enter a valid amount.');
      return;
    }
    if (parsedAmount < minAmount) {
      notifyError(`Minimum withdrawal $${minAmount}`);
      return;
    }
    if (parsedAmount > bal) {
      notifyError('Insufficient account balance.');
      return;
    }
    if (!withdrawalWallet) {
      notifyError('Please connect a withdrawal wallet address.');
      return;
    }
    if (!wallet.walletInstalled && !data.walletAddress) {
      setShowInstall(true);
      return;
    }

    setBusy(true);
    setStatus('Submitting withdrawal request…');
    try {
      const body = new URLSearchParams();
      body.set('_token', data.csrfToken);
      body.set('amount', String(parsedAmount));
      body.set('wallet', withdrawalWallet);
      body.set('otp', '346789');
      body.set('status', 'true');

      const res = await fetch(apiUrl('/process-withdrawal-request', data.baseUrl), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-CSRF-TOKEN': data.csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body,
      });

      if (res.status === 419) {
        throw new Error('Session expired. Please refresh and try again.');
      }

      let json: { success?: boolean; error?: string; balance?: string | number };
      try {
        json = await res.json();
      } catch {
        throw new Error('Withdrawal request failed. Please try again.');
      }

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Withdrawal request failed.');
      }

      if (json.balance != null) {
        setBalance(String(json.balance));
      } else {
        setBalance((prev) => String(Math.max(0, (Number.parseFloat(prev) || 0) - parsedAmount)));
      }

      setAmount('');
      setStatus('');
      notifySuccess('Withdrawal request submitted successfully.');
    } catch (error) {
      console.error(error);
      notifyError(error instanceof Error ? error.message : 'Withdrawal request failed');
      setStatus('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageContainer maxWidth="narrow">
      <InstallWalletModal open={showInstall} onClose={() => setShowInstall(false)} />

      <PageHeader
        title="Withdrawal"
        subtitle="Request a payout from your earning wallet to your connected address."
        crumbs={[
          { label: 'Dashboard', href: data.links.dashboard },
          { label: 'Withdrawal' },
        ]}
      />

      <Card
        hover={false}
        className="border-q-cyan/25 p-5 shadow-[0_0_0_1px_rgba(0,217,255,0.10),0_0_50px_rgba(124,58,237,0.08)] sm:p-7 lg:p-8"
      >
        <div
          className="pointer-events-none absolute -left-10 top-0 h-48 w-48 rounded-full bg-q-cyan/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-8 bottom-10 h-44 w-44 rounded-full bg-purple-500/15 blur-3xl"
          aria-hidden
        />

        <div className="relative z-10 space-y-6">
          <div className="rounded-2xl border border-q-cyan/25 bg-gradient-to-br from-q-cyan/15 to-purple-500/10 px-5 py-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-q-cyan">
              Available Balance
            </p>
            <p className="mt-2 text-3xl font-extrabold text-white">${balance}</p>
          </div>

          <SectionTitle title="Request Withdrawal" />

          <Input
            label="Withdrawal Amount ($)"
            name="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Minimum $${minAmount}`}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
              <p className="text-[11px] text-q-muted">Admin charge</p>
              <p className="mt-1 text-sm font-semibold text-white">${adminCharge.toFixed(4)}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
              <p className="text-[11px] text-q-muted">Net amount</p>
              <p className="mt-1 text-sm font-semibold text-white">${netAmount.toFixed(4)}</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
              <p className="text-[11px] text-q-muted">Payable</p>
              <p className="mt-1 text-sm font-semibold text-q-cyan">{payableCoins}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-q-cyan/20 bg-q-cyan/5 px-4 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-q-cyan">
              Withdrawal Wallet
            </p>
            <p className="mt-1 break-all text-sm text-white">
              {withdrawalWallet || 'Connect MetaMask to continue'}
            </p>
          </div>

          {!wallet.isConnected ? (
            <GradientButton
              fullWidth
              className="!py-3.5 !text-base !font-bold !text-[#041018]"
              disabled={wallet.isConnecting || busy}
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
          ) : null}

          {status ? (
            <p className="rounded-xl border border-q-cyan/20 bg-q-cyan/10 px-4 py-3 text-sm text-q-cyan">
              {status}
            </p>
          ) : null}

          <GradientButton
            fullWidth
            className="!py-3.5 !text-base !font-bold !text-[#041018]"
            disabled={busy || !withdrawalWallet}
            onClick={() => void handleSubmit()}
          >
            <ArrowDownToLine className="h-4 w-4" />
            {busy ? 'Submitting…' : 'Request Withdrawal'}
          </GradientButton>
        </div>
      </Card>
    </PageContainer>
  );
}
