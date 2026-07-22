import {
  ChevronRight,
  Cpu,
  Headset,
  LayoutDashboard,
  LogOut,
  Settings,
  TrendingUp,
  Wallet,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { MemberShellData, NavItem } from '../../types';

type SidebarProps = {
  data: MemberShellData;
  open: boolean;
  onClose: () => void;
};

const iconMap: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  account: Settings,
  network: Users,
  investments: Cpu,
  wallet: Wallet,
  earnings: TrendingUp,
  support: Headset,
  signout: LogOut,
};

function buildNav(links: MemberShellData['links']): NavItem[] {
  return [
    { id: 'dashboard', label: 'Dashboard', href: links.dashboard, icon: 'dashboard' },
    {
      id: 'account',
      label: 'Account',
      icon: 'account',
      children: [{ label: 'Profile', href: links.profile }],
    },
    {
      id: 'network',
      label: 'Network',
      icon: 'network',
      children: [
        { label: 'My Referrals', href: links.referrals },
        { label: 'Team Network', href: links.teamNetwork },
      ],
    },
    {
      id: 'investments',
      label: 'Investments',
      icon: 'investments',
      children: [
        { label: 'Invest Now', href: links.investNow },
        { label: 'My Investments', href: links.myInvestments },
      ],
    },
    { id: 'wallet', label: 'Wallet', href: links.wallet, icon: 'wallet' },
    {
      id: 'earnings',
      label: 'Earnings',
      icon: 'earnings',
      children: [
        { label: 'ROI History', href: links.roiHistory },
        { label: 'Contribution Reward', href: links.contributionReward },
        { label: 'Booster Reward', href: links.boosterReward },
        { label: 'Rank Reward', href: links.rankReward },
      ],
    },
  ];
}

function normalizePath(path: string) {
  return path.replace(/\/+$/, '') || '/';
}

export function Sidebar({ data, open, onClose }: SidebarProps) {
  const navItems = useMemo(() => buildNav(data.links), [data.links]);
  const current = normalizePath(data.currentPath);

  const initiallyOpen = useMemo(() => {
    const openIds: string[] = [];
    navItems.forEach((item) => {
      if (item.children?.some((child) => normalizePath(child.href) === current)) {
        openIds.push(item.id);
      }
    });
    return openIds;
  }, [navItems, current]);

  const [expanded, setExpanded] = useState<string[]>(initiallyOpen);

  const toggle = (id: string) => {
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const isActive = (href?: string) => href != null && normalizePath(href) === current;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-sidebar flex-col border-r border-white/[0.06] bg-q-sidebar transition-transform duration-300 ease-out lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[88px] items-center border-b border-white/[0.05] px-6">
          <a href={data.links.dashboard} className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-q-cyan to-q-blue text-lg font-bold text-white shadow-glow-cyan">
              Q
            </span>
            <span className="text-[17px] font-bold tracking-[0.18em] text-white">QUANTARA</span>
          </a>
        </div>

        <div className="q-sidebar-scroll flex-1 overflow-y-auto px-3 pb-8 pt-5">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-q-cyan">
            Main Menu
          </p>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = iconMap[item.icon] ?? LayoutDashboard;
              const hasChildren = Boolean(item.children?.length);
              const childActive = item.children?.some((c) => isActive(c.href));
              const active = isActive(item.href) || Boolean(childActive);
              const isOpen = expanded.includes(item.id);

              if (!hasChildren) {
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    onClick={onClose}
                    className={`group relative flex min-h-[48px] items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition-all duration-300 ${
                      active
                        ? 'bg-q-cyan/10 text-white'
                        : 'text-q-soft hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <span
                      className={`absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-q-cyan transition-all duration-300 ${
                        active ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                      }`}
                    />
                    <Icon className={`h-[18px] w-[18px] ${active ? 'text-q-cyan' : 'text-q-muted group-hover:text-q-cyan'}`} />
                    <span>{item.label}</span>
                  </a>
                );
              }

              return (
                <div key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    className={`group relative flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm font-medium transition-all duration-300 ${
                      active
                        ? 'bg-q-cyan/10 text-white'
                        : 'text-q-soft hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <span
                      className={`absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-q-cyan transition-all duration-300 ${
                        active ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                      }`}
                    />
                    <Icon className={`h-[18px] w-[18px] ${active ? 'text-q-cyan' : 'text-q-muted group-hover:text-q-cyan'}`} />
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight
                      className={`h-4 w-4 text-q-muted transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}
                    />
                  </button>

                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      isOpen ? 'mt-1 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <ul className="ml-4 space-y-1 border-l border-q-cyan/20 py-1 pl-3">
                        {item.children?.map((child) => {
                          const childIsActive = isActive(child.href);
                          return (
                            <li key={child.href}>
                              <a
                                href={child.href}
                                onClick={onClose}
                                className={`block rounded-xl px-3 py-2.5 text-[13px] transition-all duration-300 ${
                                  childIsActive
                                    ? 'bg-q-cyan/10 text-q-cyan'
                                    : 'text-q-soft hover:translate-x-1 hover:bg-white/[0.03] hover:text-white'
                                }`}
                              >
                                {child.label}
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>

          <p className="mb-3 mt-8 px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-q-cyan">
            Others
          </p>

          <div className="space-y-1.5">
            <a
              href={data.links.support}
              onClick={onClose}
              className="group relative flex min-h-[48px] items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-q-soft transition-all duration-300 hover:bg-white/[0.04] hover:text-white"
            >
              <Headset className="h-[18px] w-[18px] text-q-muted group-hover:text-q-cyan" />
              <span>Support</span>
            </a>
            <a
              href={data.links.signOut}
              onClick={onClose}
              className="group relative flex min-h-[48px] items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-q-soft transition-all duration-300 hover:bg-rose-500/10 hover:text-rose-300"
            >
              <LogOut className="h-[18px] w-[18px] text-q-muted group-hover:text-rose-300" />
              <span>Sign Out</span>
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
