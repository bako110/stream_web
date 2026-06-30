import { useState } from 'react';
import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileDrawer } from './MobileDrawer';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';
import { CreateFAB } from './CreateFAB';

export function AppLayout({ children }: { children?: ReactNode } = {}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed,  setSidebarCollapsed]  = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Desktop sidebar ── */}
      <div className="hidden lg:flex shrink-0 transition-all duration-300">
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapseToggle={() => setSidebarCollapsed(v => !v)}
        />
      </div>

      {/* ── Mobile sidebar drawer ── */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-10 w-72 animate-reveal-left" style={{ animationDuration: '0.22s' }}>
            <MobileDrawer onClose={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />

        {/* pb-[60px] on mobile to clear the bottom nav */}
        <main className="flex-1 min-h-0 overflow-y-auto pb-[60px] lg:pb-0">
          {children ?? <Outlet />}
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <BottomNav />

      {/* ── FAB création ── */}
      <CreateFAB />
    </div>
  );
}
