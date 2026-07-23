import { ChevronRight, Rocket, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Card } from '../ui/Card';
import { GradientButton } from '../ui/GradientButton';
import { Input } from '../ui/Input';
import { PageContainer } from '../ui/PageContainer';
import { PageHeader } from '../ui/PageHeader';
import { ProgressBar } from '../ui/ProgressBar';
import { SectionTitle } from '../ui/SectionTitle';
import { InstallWalletModal } from '../auth/InstallWalletModal';
import { isPackageSelectable, isUnlimitedPackage, PackageCard } from './PackageCard';
import { useWallet } from '../../hooks/useWallet';
import { NetworkWalletStatus } from '../wallet/NetworkWalletStatus';
import { notifyError, notifySuccess } from '../../lib/walletConnect';
import { loadBlockchainConfig } from '../../services/blockchain/config';
import {
  activatePackageOnChain,
  completePackageActivationWithLaravel,
} from '../../services/blockchain/upgrade';
import { createBrowserProvider } from '../../services/blockchain/wallet';
import type { InvestNowBoot } from '../../types';

type InvestNowPageProps = {
  data: InvestNowBoot;
};

type DemoFaucetProps = {
  walletAddress?: string;
};

export function InvestNowPage({ data }: InvestNowPageProps) {
  const wallet = useWallet();
  const defaultSelected =
    data.packages.find((pkg) => isPackageSelectable(pkg))?.amount ??
    data.packages[0]?.amount ??
    100;

  const [selectedAmount, setSelectedAmount] = useState<number>(defaultSelected);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [showDemoFaucet, setShowDemoFaucet] = useState(false);
  const [DemoFaucetButton, setDemoFaucetButton] = useState<ComponentType<DemoFaucetProps> | null>(
    null,
  );

  const selected = useMemo(
    () => data.packages.find((pkg) => pkg.amount === selectedAmount) ?? data.packages[0],
    [data.packages, selectedAmount],
  );

  const canActivate = selected ? isPackageSelectable(selected) : false;

  const payable = useMemo(() => {
    const rate = data.btcRate || 62000;
    return (selected.amount / rate).toFixed(8);
  }, [data.btcRate, selected.amount]);

  const nextProgress = data.nextPackageProgress ?? 50;

  useEffect(() => {
    let cancelled = false;
    void loadBlockchainConfig(data.baseUrl)
      .then(async (cfg) => {
        if (cancelled || !cfg.demoFaucet) return;
        const mod = await import('../auth/DemoFaucetButton');
        if (cancelled) return;
        setDemoFaucetButton(() => mod.DemoFaucetButton);
        setShowDemoFaucet(true);
      })
      .catch(() => {
        // Demo faucet is optional — ignore config failures here
      });
    return () => {
      cancelled = true;
    };
  }, [data.baseUrl]);

  const handleActivate = async () => {
    if (busy) return;
    if (!selected || !canActivate) {
      notifyError(
        selected && isUnlimitedPackage(selected)
          ? 'Unable to activate this package.'
          : 'This package is locked or already fully purchased.',
      );
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

      const onChain = await activatePackageOnChain(
        session.signer,
        selected.amount,
        setStatus,
      );

      setStatus('Verifying activation with Quantara…');
      const laravel = await completePackageActivationWithLaravel({
        baseUrl: data.baseUrl,
        package_amount: onChain.packageAmount,
        package_tx_hash: onChain.packageTxHash,
        approve_tx_hash: onChain.approveTxHash,
        wallet: onChain.wallet,
        token_amount: onChain.tokenAmount,
      });

      setStatus('Package activated successfully.');
      notifySuccess(laravel.message || 'Package activated successfully.');

      window.setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Package activation failed';
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

  return (
    <PageContainer maxWidth="narrow">
      <InstallWalletModal open={showInstall} onClose={() => setShowInstall(false)} />

      <PageHeader
        title="BTC Plan Activation"
        subtitle="Activate your investment package securely through our smart contracts on BNB Smart Chain."
        crumbs={[
          { label: 'Dashboard', href: data.links.dashboard },
          { label: 'BTC Plan Activation' },
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

        <div className="relative z-10">
          <h2 className="mb-5 text-xl font-bold text-white">Select Your Package</h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
            {data.packages.map((pkg, index) => (
              <div key={pkg.amount} className="relative">
                <PackageCard
                  pkg={pkg}
                  selected={selectedAmount === pkg.amount}
                  onSelect={() => {
                    if (isPackageSelectable(pkg)) setSelectedAmount(pkg.amount);
                  }}
                />
                {index < data.packages.length - 1 && (index + 1) % 4 !== 0 ? (
                  <ChevronRight className="absolute -right-2.5 top-1/2 z-20 hidden h-4 w-4 -translate-y-1/2 text-q-muted/70 lg:block lg:-right-3" />
                ) : null}
              </div>
            ))}
          </div>

          <p className="mt-4 text-center text-xs text-q-muted sm:text-sm">
            You must purchase each package 2 times before unlocking the next package. The $10000
            package is unlimited.
          </p>

          <div className="mt-8 space-y-5">
            <Input
              label="Investment Amount ($)"
              name="investment_amount"
              value={String(selected.amount)}
              readOnly
            />

            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5">
              <span className="text-sm text-q-muted">Payable (BEP-20)</span>
              <span className="text-sm font-bold text-q-cyan sm:text-base">{payable}</span>
            </div>

            <div className="rounded-2xl border border-q-cyan/20 bg-q-cyan/5 px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-q-cyan">
                Connected Wallet
              </p>
              <p className="mt-1 break-all text-sm text-white">
                {wallet.walletAddress || 'Connect a BEP-20 wallet to activate'}
              </p>
            </div>

            <NetworkWalletStatus wallet={wallet} />

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

            {showDemoFaucet && DemoFaucetButton ? (
              <DemoFaucetButton walletAddress={wallet.walletAddress || undefined} />
            ) : null}

            {status ? (
              <p className="rounded-xl border border-q-cyan/20 bg-q-cyan/10 px-4 py-3 text-sm text-q-cyan">
                {status}
              </p>
            ) : null}

            <GradientButton
              fullWidth
              className="!py-3.5 !text-base !font-bold !text-[#041018]"
              disabled={busy || !canActivate || !wallet.isConnected}
              onClick={() => void handleActivate()}
            >
              <Rocket className="h-4 w-4" />
              {busy ? 'Processing…' : 'Activate Package'}
            </GradientButton>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Card hover className="p-5">
          <SectionTitle title="Current Active Package" />
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-q-muted">Package</span>
              <span className="font-semibold text-white">{data.activePackage.label}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-q-muted">Cycle</span>
              <span className="font-semibold text-white">{data.activePackage.cycle}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-q-muted">Status</span>
              <span className="font-semibold text-q-cyan">{data.activePackage.status}</span>
            </div>
          </div>
        </Card>

        <Card hover className="p-5">
          <SectionTitle title="ROI Information" />
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-q-muted">Expected ROI</span>
              <span className="font-semibold text-white">{data.info.expectedRoi}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-q-muted">ROI Cap</span>
              <span className="font-semibold text-white">{data.info.roiCap}</span>
            </div>
          </div>
        </Card>

        <Card hover className="p-5">
          <SectionTitle title="Working Cap Information" />
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-q-muted">Working Cap</span>
              <span className="font-semibold text-white">{data.info.workingCap}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-q-muted">Treasury Allocation</span>
              <span className="font-semibold text-white">{data.info.treasuryAllocation}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card hover={false} className="p-5 sm:p-6">
        <SectionTitle title="Next Package Progress" subtitle="Unlock progress toward the next tier" />
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-q-muted">Progress</span>
            <span className="font-semibold text-q-cyan">{nextProgress}%</span>
          </div>
          <ProgressBar value={nextProgress} />
        </div>
      </Card>

      <Card hover={false} className="border-amber-400/20 bg-amber-400/[0.04] p-5 sm:p-6">
        <SectionTitle title="Investment Warning" />
        <p className="mt-3 text-sm leading-relaxed text-q-soft">
          Package activation is irreversible once confirmed on-chain. Verify your selected amount and
          wallet network (BNB Smart Chain) before activating. You will confirm real MetaMask
          transactions — no simulated hashes are used.
        </p>
      </Card>
    </PageContainer>
  );
}
