import { useState, type ReactNode } from 'react';
import type { MemberShellData } from '../../types';
import { AuroraBackground } from './AuroraBackground';
import { BottomNav, BottomNavSpacer } from './BottomNav';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

type MemberLayoutProps = {
  data: MemberShellData;
  children: ReactNode;
};

export function MemberLayout({ data, children }: MemberLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="member-panel-root relative min-h-screen overflow-x-hidden bg-[#0a0b14] text-white">
      <AuroraBackground />

      <Sidebar data={data} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative z-10 min-h-screen lg:pl-sidebar">
        <Header data={data} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="animate-fade-in px-3.5 py-4 sm:px-5 sm:py-5 lg:px-7 lg:py-6">
          {children}
          <BottomNavSpacer />
        </main>
        <BottomNav data={data} currentPath={data.currentPath} />
        <footer className="hidden border-t border-white/[0.05] px-4 py-4 text-center text-[11px] text-q-muted lg:block">
          © {new Date().getFullYear()} Quantara
        </footer>
      </div>
    </div>
  );
}
