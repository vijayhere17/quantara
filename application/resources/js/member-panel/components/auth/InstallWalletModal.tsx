import { ExternalLink, Wallet } from 'lucide-react';
import { Card } from '../ui/Card';
import { GradientButton } from '../ui/GradientButton';

type InstallWalletModalProps = {
  open: boolean;
  onClose: () => void;
};

export function InstallWalletModal({ open, onClose }: InstallWalletModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <Card
        hover={false}
        className="w-full max-w-md border-q-cyan/25 p-6 shadow-[0_0_0_1px_rgba(0,217,255,0.12),0_24px_64px_rgba(0,0,0,0.55)]"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-q-cyan/15 text-q-cyan">
          <Wallet className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Install MetaMask</h2>
        <p className="mt-2 text-sm text-q-muted">
          A Web3 wallet is required to register and sign in to Quantara on BNB Smart Chain.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <GradientButton
            href="https://metamask.io/download/"
            className="!rounded-full !px-5 !py-3 !font-bold !text-[#041018]"
          >
            <ExternalLink className="h-4 w-4" />
            Install MetaMask
          </GradientButton>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:border-q-cyan/30 hover:bg-q-cyan/10"
          >
            Close
          </button>
        </div>
      </Card>
    </div>
  );
}
