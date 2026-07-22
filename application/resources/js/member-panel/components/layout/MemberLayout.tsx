import { useState, type ReactNode } from 'react';
import type { MemberShellData } from '../../types';
import { AuroraBackground } from './AuroraBackground';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

type MemberLayoutProps = {
  data: MemberShellData;
  children: ReactNode;
};

export function MemberLayout({ data, children }: MemberLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="member-panel-root relative min-h-screen overflow-x-hidden bg-transparent text-white">
      <AuroraBackground />

      <Sidebar data={data} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative z-10 min-h-screen lg:pl-sidebar">
        <Header data={data} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="animate-fade-in px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">{children}</main>
        <footer className="border-t border-white/[0.05] px-4 py-5 text-center text-xs text-q-muted sm:px-6 lg:px-7">
          Copyright © {new Date().getFullYear()} Quantara. All Rights Reserved
        </footer>
      </div>
    </div>
  );
}
