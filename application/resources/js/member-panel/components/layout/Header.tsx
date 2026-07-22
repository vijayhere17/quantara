import { ChevronDown, Menu, Wallet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { MemberShellData } from '../../types';
import { Logo } from '../ui/Logo';

type HeaderProps = {
  data: MemberShellData;
  onToggleSidebar: () => void;
};

export function Header({ data, onToggleSidebar }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleConnect = () => {
    if (typeof window.connectwallet === 'function') {
      void window.connectwallet();
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0a0b14]/80 backdrop-blur-xl">
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
        <div className="flex items-center justify-end gap-1.5 sm:gap-2.5">
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
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-q-gradient-br px-2.5 text-xs font-bold text-[#041018] shadow-btn-glow transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q-cyan/60 sm:h-10 sm:gap-2 sm:px-4 sm:text-sm"
          >
            <Wallet className="h-4 w-4 shrink-0" />
            <span className="hidden min-[380px]:inline">Connect</span>
          </button>

          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] py-1 pl-1 pr-1.5 transition-all duration-300 hover:border-q-cyan/25 hover:bg-q-cyan/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q-cyan/50 sm:h-10 sm:gap-2 sm:pr-2.5"
              aria-expanded={menuOpen}
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

            {menuOpen && (
              <div className="absolute right-0 mt-3 w-[min(260px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121522]/98 p-3 shadow-card backdrop-blur-xl animate-fade-in">
                <div className="mb-2 flex items-center gap-3 px-2 py-2">
                  <img src={data.user.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{data.user.displayName}</p>
                    <p className="truncate text-xs text-q-muted">{data.user.obscuredAddress}</p>
                  </div>
                </div>
                <div className="my-2 h-px bg-white/[0.06]" />
                <a
                  href={data.links.profile}
                  className="flex items-center rounded-xl px-3 py-2.5 text-sm text-q-soft transition hover:bg-q-cyan/10 hover:text-white"
                >
                  My Profile
                </a>
                <a
                  href={data.links.wallet}
                  className="flex items-center rounded-xl px-3 py-2.5 text-sm text-q-soft transition hover:bg-q-cyan/10 hover:text-white"
                >
                  Wallet
                </a>
                <a
                  href={data.links.support}
                  className="flex items-center rounded-xl px-3 py-2.5 text-sm text-q-soft transition hover:bg-q-cyan/10 hover:text-white"
                >
                  Support
                </a>
                <div className="my-2 h-px bg-white/[0.06]" />
                <a
                  href={data.links.signOut}
                  className="flex items-center rounded-xl px-3 py-2.5 text-sm text-rose-300 transition hover:bg-rose-500/10"
                >
                  Logout
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
