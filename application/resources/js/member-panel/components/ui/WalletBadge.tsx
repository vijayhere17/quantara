type WalletBadgeProps = {
  balance: string;
  className?: string;
};

export function WalletBadge({ balance, className = '' }: WalletBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 ${className}`}
    >
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-q-muted">
          Wallet Balance
        </p>
        <p className="main_balance truncate text-xs font-semibold leading-tight text-white sm:text-sm">
          {balance}
        </p>
      </div>
    </div>
  );
}
