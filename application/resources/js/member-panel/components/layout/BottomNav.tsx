import {
  ChevronRight,
  LayoutDashboard,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import type { MemberShellData } from '../../types';

type BottomNavProps = {
  data: MemberShellData;
  currentPath: string;
};

const items = (links: MemberShellData['links']) => [
  { label: 'Dashboard', href: links.dashboard, icon: LayoutDashboard, match: '/dashboard' },
  { label: 'Team', href: links.downlineRanks, icon: Users, match: '/downline-ranks' },
  { label: 'Income', href: links.roiHistory, icon: TrendingUp, match: '/earning/' },
  { label: 'Wallet', href: links.wallet, icon: Wallet, match: '/earning-wallet' },
  { label: 'Profile', href: links.profile, icon: UserRound, match: '/update-profile' },
];

function isActive(path: string, match: string) {
  const current = path.replace(/\/+$/, '') || '/';
  if (match === '/dashboard') return current === '/dashboard' || current.endsWith('/dashboard');
  return current.includes(match);
}

export function BottomNav({ data, currentPath }: BottomNavProps) {
  const nav = items(data.links);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-[#0c0e18]/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between">
        {nav.map((item) => {
          const active = isActive(currentPath, item.match);
          const Icon = item.icon;
          return (
            <li key={item.label} className="flex-1">
              <a
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] font-medium transition-colors ${
                  active ? 'text-q-cyan' : 'text-q-muted hover:text-q-soft'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-q-cyan' : ''}`} strokeWidth={active ? 2.25 : 1.75} />
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function BottomNavSpacer() {
  return <div className="h-[72px] lg:hidden" aria-hidden />;
}
