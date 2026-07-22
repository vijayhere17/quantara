import { useState, type ReactNode } from 'react';
import type { DashboardBoot } from '../../types';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

type MemberLayoutProps = {
  data: DashboardBoot;
  children: ReactNode;
};

export function MemberLayout({ data, children }: MemberLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="member-panel-root min-h-screen overflow-x-hidden bg-q-bg text-white">
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(circle at 12% 18%, rgba(0,212,255,0.07), transparent 26%), radial-gradient(circle at 88% 8%, rgba(139,92,246,0.10), transparent 24%), radial-gradient(circle at 50% 100%, rgba(59,130,246,0.06), transparent 36%)',
        }}
      />

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
