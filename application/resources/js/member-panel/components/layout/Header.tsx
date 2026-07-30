import { LogOut, Menu, Wallet } from 'lucide-react';
import { Logo } from '../ui/Logo';
import type { MemberShellData } from '../../types';

type HeaderProps = {
  data: MemberShellData;
  onToggleSidebar: () => void;
};

export function Header({ data, onToggleSidebar }: HeaderProps) {
  const walletAddress = data.user.obscuredAddress || data.user.username;

  const handleConnect = () => {
    if (typeof window.connectwallet === 'function') {
      void window.connectwallet();
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0b10]/90 backdrop-blur-md">
      <div className="flex h-header items-center justify-between gap-3 px-3 sm:px-5 lg:px-6">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-q-soft transition-colors hover:border-white/[0.14] hover:text-white lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Logo
          href={data.links.dashboard}
          size="sm"
          className="hidden lg:flex"
          imgClassName="max-h-8 max-w-[140px]"
        />

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 lg:justify-end">
          <div className="hidden min-w-0 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 sm:flex">
            <Wallet className="h-4 w-4 shrink-0 text-q-cyan" />
            <span className="truncate font-mono text-xs font-medium text-white">{walletAddress}</span>
          </div>

          <button
            type="button"
            onClick={handleConnect}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-q-cyan/30 bg-q-cyan/10 px-3 text-xs font-semibold text-q-cyan transition-colors hover:bg-q-cyan/15 sm:h-10 sm:px-4 sm:text-sm"
          >
            <Wallet className="h-4 w-4" />
            <span className="hidden xs:inline">Connect</span>
          </button>

          <a
            href={data.links.signOut}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-q-muted transition-colors hover:text-rose-300 sm:h-10 sm:w-10"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
