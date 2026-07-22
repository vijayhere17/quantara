import {
  ChevronDown,
  Headset,
  LogOut,
  Menu,
  UserRound,
  Wallet,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { MemberShellData } from '../../types';
import { Logo } from '../ui/Logo';

type HeaderProps = {
  data: MemberShellData;
  onToggleSidebar: () => void;
};

const menuItemClass =
  'group flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium text-q-soft transition-all duration-200 hover:translate-x-0.5 hover:bg-q-cyan/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q-cyan/50';

const menuIconClass =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] text-q-cyan transition-colors duration-200 group-hover:border-q-cyan/30 group-hover:bg-q-cyan/15';

export function Header({ data, onToggleSidebar }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuRendered, setMenuRendered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Keep mounted briefly on close so exit animation can play
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
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0b14]/80 backdrop-blur-xl">
      <div className="grid h-header grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:px-6">
        {/* Left — hamburger */}
        <div className="flex items-center justify-start">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-q-soft transition-all duration-300 hover:border-q-cyan/30 hover:bg-q-cyan/10 hover:text-q-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q-cyan/50 sm:h-11 sm:w-11"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Center — logo */}
        <div className="flex min-w-0 items-center justify-center px-1">
          <Logo
            href={data.links.dashboard}
            size="sm"
            imgClassName="max-h-8 max-w-[140px] sm:max-h-9 sm:max-w-[180px]"
          />
        </div>

        {/* Right — wallet + connect + avatar */}
        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 md:flex">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-q-muted">
                Wallet Balance
              </p>
              <p className="main_balance text-xs font-semibold leading-tight text-white sm:text-sm">
                {data.wallet.chainBalance}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConnect}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-q-gradient-br px-3 text-xs font-bold text-[#041018] shadow-btn-glow transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q-cyan/60 sm:h-10 sm:gap-2 sm:px-4 sm:text-sm"
          >
            <Wallet className="h-4 w-4 shrink-0" />
            <span className="hidden min-[380px]:inline">Connect</span>
          </button>

          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] py-1 pl-1 pr-2 transition-all duration-300 hover:border-q-cyan/25 hover:bg-q-cyan/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q-cyan/50 sm:h-10 sm:gap-2.5 sm:pr-2.5"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-controls={menuId}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-q-cyan/50 bg-[#1a1d2e] text-sm shadow-[0_0_12px_rgba(0,212,255,0.25)] sm:h-8 sm:w-8">
                <img
                  src={data.user.avatar}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.textContent = '🟡';
                  }}
                />
              </span>
              <span className="hidden max-w-[110px] truncate text-sm font-medium text-white xl:inline">
                {data.user.obscuredAddress}
              </span>
              <ChevronDown
                className={`hidden h-4 w-4 shrink-0 text-q-muted transition-transform duration-300 min-[380px]:inline ${
                  menuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {menuRendered ? (
              <div
                id={menuId}
                role="menu"
                aria-hidden={!menuOpen}
                className={[
                  'absolute right-0 z-50 mt-2.5 w-[min(320px,calc(100vw-1.25rem))] origin-top-right overflow-hidden rounded-3xl border border-[rgba(0,212,255,0.15)] p-2 shadow-[0_24px_64px_rgba(0,0,0,0.55),0_0_0_1px_rgba(0,212,255,0.08),0_0_40px_rgba(0,212,255,0.08)] backdrop-blur-2xl',
                  menuOpen ? 'animate-dropdown-in' : 'animate-dropdown-out pointer-events-none',
                ].join(' ')}
                style={{
                  background: 'linear-gradient(180deg, rgba(23,34,53,0.96) 0%, rgba(16,24,38,0.98) 100%)',
                }}
              >
                {/* Profile header card */}
                <div className="relative mb-2 overflow-hidden rounded-2xl border border-q-cyan/20 bg-gradient-to-br from-q-cyan/15 via-[#1a2740]/80 to-[#121a2b]/90 p-4">
                  <div
                    className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-q-cyan/20 blur-2xl"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-purple-500/20 blur-2xl"
                    aria-hidden
                  />

                  <div className="relative z-10 flex items-center gap-3.5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-q-cyan/35 bg-[#0d1422] shadow-[0_0_20px_rgba(0,212,255,0.25)]">
                      <img
                        src={data.user.avatar}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.textContent = '🟡';
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold tracking-tight text-white">
                        {data.user.displayName}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-xs text-q-muted">
                        {data.user.obscuredAddress}
                      </p>
                      <p className="main_balance mt-2 text-sm font-bold text-q-cyan">
                        {data.wallet.chainBalance}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-0.5 px-0.5 pb-0.5">
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
                    Wallet
                  </a>
                  <a href={data.links.support} role="menuitem" className={menuItemClass}>
                    <span className={menuIconClass}>
                      <Headset className="h-4 w-4" />
                    </span>
                    Support
                  </a>

                  <div className="my-1.5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                  <a
                    href={data.links.signOut}
                    role="menuitem"
                    className="group flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium text-rose-300/90 transition-all duration-200 hover:translate-x-0.5 hover:bg-rose-500/10 hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-500/10 text-rose-300 transition-colors duration-200 group-hover:border-rose-400/35 group-hover:bg-rose-500/15">
                      <LogOut className="h-4 w-4" />
                    </span>
                    Logout
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
