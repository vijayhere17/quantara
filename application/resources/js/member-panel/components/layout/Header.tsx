import {
  Bell,
  ChevronDown,
  CircleUserRound,
  Headset,
  LogOut,
  Menu,
  UserRound,
  Wallet,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Logo } from '../ui/Logo';
import type { MemberShellData } from '../../types';

type HeaderProps = {
  data: MemberShellData;
  onToggleSidebar: () => void;
};

const menuItemClass =
  'group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-q-soft transition-colors hover:bg-q-cyan/10 hover:text-white';

const menuIconClass =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-q-cyan';

export function Header({ data, onToggleSidebar }: HeaderProps) {
  const walletAddress = data.user.obscuredAddress || data.user.username;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuRendered, setMenuRendered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (menuOpen) {
      setMenuRendered(true);
      return;
    }
    if (!menuRendered) return;
    const timer = window.setTimeout(() => setMenuRendered(false), 180);
    return () => window.clearTimeout(timer);
  }, [menuOpen, menuRendered]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const handleConnect = () => {
    if (typeof window.connectwallet === 'function') {
      void window.connectwallet();
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0b14]/85 backdrop-blur-xl">
      <div className="grid h-header grid-cols-[44px_1fr_auto] items-center gap-2 px-3 sm:px-5 lg:px-6">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-q-soft transition-colors hover:bg-white/[0.05] hover:text-white lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden lg:block" aria-hidden />

        <div className="flex justify-center">
          <Logo
            href={data.links.dashboard}
            size="lg"
            imgClassName="max-h-11 max-w-[min(220px,52vw)] sm:max-h-12"
          />
        </div>

        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          <a
            href={data.links.investNow}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-q-soft transition-colors hover:bg-white/[0.05] hover:text-q-cyan"
            aria-label="Notifications"
            title="Upgrade package"
          >
            <Bell className="h-5 w-5" />
          </a>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] py-1 pl-1 pr-2 transition-colors hover:border-q-cyan/30 hover:bg-q-cyan/5 sm:gap-2 sm:pr-2.5"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-controls={menuId}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-q-gradient-br p-[1.5px]">
                <span className="flex h-full w-full items-center justify-center rounded-full bg-[#12182a] text-q-cyan">
                  <CircleUserRound className="h-4 w-4" strokeWidth={1.75} />
                </span>
              </span>
              <span className="hidden max-w-[96px] truncate font-mono text-xs font-medium text-white sm:inline">
                {walletAddress}
              </span>
              <ChevronDown
                className={`hidden h-4 w-4 shrink-0 text-q-muted sm:inline ${menuOpen ? 'rotate-180' : ''} transition-transform`}
              />
            </button>

            {menuRendered ? (
              <div
                id={menuId}
                role="menu"
                aria-hidden={!menuOpen}
                className={[
                  'absolute right-0 z-50 mt-2 w-[min(300px,calc(100vw-1.5rem))] origin-top-right overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12151f]/95 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl',
                  menuOpen ? 'animate-dropdown-in' : 'animate-dropdown-out pointer-events-none',
                ].join(' ')}
              >
                <div className="mb-2 rounded-xl border border-q-cyan/20 bg-gradient-to-br from-q-cyan/10 to-purple-500/10 p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-q-muted">
                    My Wallet
                  </p>
                  <p className="mt-1 truncate font-mono text-sm font-semibold text-white">
                    {walletAddress}
                  </p>
                  <button
                    type="button"
                    onClick={handleConnect}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-q-cyan/30 bg-q-cyan/10 px-2.5 py-1 text-[11px] font-semibold text-q-cyan hover:bg-q-cyan/15"
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    Connect wallet
                  </button>
                </div>

                <div className="space-y-0.5">
                  <a href={data.links.profile} role="menuitem" className={menuItemClass}>
                    <span className={menuIconClass}>
                      <UserRound className="h-4 w-4" />
                    </span>
                    My Profile
                  </a>
                  <a href={data.links.wallet} role="menuitem" className={menuItemClass}>
                    <span className={menuIconClass}>
                      <Wallet className="h-4 w-4" />
                    </span>
                    Earning Wallet
                  </a>
                  <a href={data.links.support} role="menuitem" className={menuItemClass}>
                    <span className={menuIconClass}>
                      <Headset className="h-4 w-4" />
                    </span>
                    Support
                  </a>
                  <div className="my-1 h-px bg-white/[0.06]" />
                  <a
                    href={data.links.signOut}
                    role="menuitem"
                    className="group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-rose-300/90 hover:bg-rose-500/10"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-400/20 bg-rose-500/10 text-rose-300">
                      <LogOut className="h-4 w-4" />
                    </span>
                    Sign Out
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
