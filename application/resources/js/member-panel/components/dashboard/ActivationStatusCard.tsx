import { CheckCircle2, Link2, Package } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import type { DashboardBoot } from '../../types';

type ActivationStatusCardProps = {
  registration?: DashboardBoot['registration'];
  walletAddress?: string;
};

function shortHash(value?: string | null) {
  if (!value) return '—';
  if (value.length < 14) return value;
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

export function ActivationStatusCard({ registration, walletAddress }: ActivationStatusCardProps) {
  const status = registration?.status || 'pending';
  const active = status === 'completed' || Boolean(registration?.packageTxHash);
  const explorerBase =
    registration?.chainId === 97
      ? 'https://testnet.bscscan.com'
      : registration?.chainId === 56 || !registration?.chainId
        ? 'https://bscscan.com'
        : null;

  const rows: Array<{ label: string; value: string; href?: string | null }> = [
    {
      label: 'Wallet',
      value: walletAddress ? shortHash(walletAddress) : shortHash(null),
    },
    {
      label: 'Package',
      value: registration?.packageId ? `$${registration.packageId}` : '—',
    },
    {
      label: 'Wallet status',
      value: registration?.walletStatus || 'unverified',
    },
    {
      label: 'Register tx',
      value: shortHash(registration?.transactionHash),
      href:
        explorerBase && registration?.transactionHash
          ? `${explorerBase}/tx/${registration.transactionHash}`
          : null,
    },
    {
      label: 'Approve tx',
      value: shortHash(registration?.approveTxHash),
      href:
        explorerBase && registration?.approveTxHash
          ? `${explorerBase}/tx/${registration.approveTxHash}`
          : null,
    },
    {
      label: 'Package tx',
      value: shortHash(registration?.packageTxHash),
      href:
        explorerBase && registration?.packageTxHash
          ? `${explorerBase}/tx/${registration.packageTxHash}`
          : null,
    },
    {
      label: 'Block',
      value: registration?.blockNumber ? String(registration.blockNumber) : '—',
    },
  ];

  return (
    <Card className="flex flex-col p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-br from-emerald-500/30 to-q-cyan/30 text-emerald-300">
            {active ? <CheckCircle2 className="h-5 w-5" /> : <Package className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Activation Status</h3>
            <p className="text-xs text-q-muted">Synced from on-chain registration</p>
          </div>
        </div>
        <Badge tone={active ? 'cyan' : 'muted'}>{active ? 'Active' : 'Pending'}</Badge>
      </div>

      <ul className="space-y-0 divide-y divide-white/[0.06]">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 py-3">
            <span className="text-sm text-q-muted">{row.label}</span>
            {row.href ? (
              <a
                href={row.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-xs text-q-cyan hover:underline"
              >
                {row.value}
                <Link2 className="h-3.5 w-3.5" />
              </a>
            ) : (
              <span className="font-mono text-xs text-white sm:text-sm">{row.value}</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
