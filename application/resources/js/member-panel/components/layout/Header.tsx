import { ChevronDown, Menu, Wallet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { DashboardBoot } from '../../types';

type HeaderProps = {
  data: DashboardBoot;
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
      <div className="relative flex h-header items-center justify-between gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-q-soft transition-all duration-300 hover:border-q-cyan/30 hover:bg-q-cyan/10 hover:text-q-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q-cyan/50"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="text-sm font-bold tracking-[0.28em] text-white sm:text-base">QUANTARA</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 md:flex">
            <img
              src={`${data.assetsUrl}/images/bnb-logo.png`}
              alt="BNB"
              className="h-5 w-5 rounded-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="main_balance text-xs font-semibold text-white sm:text-sm">
              {data.wallet.chainBalance}
            </span>
          </div>

          <button
            type="button"
            onClick={handleConnect}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-r from-q-cyan to-q-blue px-3.5 text-xs font-bold text-[#041018] shadow-glow-cyan transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q-cyan/60 sm:px-4 sm:text-sm"
          >
            <Wallet className="h-4 w-4" />
            <span>Connect</span>
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] py-1.5 pl-1.5 pr-2.5 transition-all duration-300 hover:border-q-cyan/25 hover:bg-q-cyan/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q-cyan/50"
              aria-expanded={menuOpen}
            >
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-q-cyan/50 bg-[#1a1d2e] text-lg shadow-[0_0_12px_rgba(0,212,255,0.25)]">
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
              <span className="hidden text-sm font-medium text-white lg:inline">
                {data.user.obscuredAddress}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-q-muted transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-3 w-[260px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121522]/98 p-3 shadow-card backdrop-blur-xl animate-fade-in">
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
