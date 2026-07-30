import { Bell, Menu } from 'lucide-react';
import { Logo } from '../ui/Logo';
import type { MemberShellData } from '../../types';

type HeaderProps = {
  data: MemberShellData;
  onToggleSidebar: () => void;
};

export function Header({ data, onToggleSidebar }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0b14]/85 backdrop-blur-xl">
      <div className="grid h-header grid-cols-[44px_1fr_44px] items-center gap-2 px-3 sm:px-5 lg:px-6">
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
            size="sm"
            imgClassName="max-h-9 max-w-[min(180px,42vw)]"
          />
        </div>

        <a
          href={data.links.investNow}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-q-soft transition-colors hover:bg-white/[0.05] hover:text-q-cyan"
          aria-label="Notifications"
          title="Upgrade package"
        >
          <Bell className="h-5 w-5" />
        </a>
      </div>
    </header>
  );
}
