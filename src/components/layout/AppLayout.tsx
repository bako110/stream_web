import { useState } from 'react';
import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileDrawer } from './MobileDrawer';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';
import { CreateFAB } from './CreateFAB';

// Pages avec leur propre bouton flottant dédié — évite le doublon visuel avec le FAB global
const CREATE_FAB_HIDDEN_PREFIXES = ['/my-stories'];
// Pages plein écran immersives — gèrent leur propre header/scroll, la Topbar/BottomNav globale ferait doublon
const IMMERSIVE_PREFIXES = ['/reels'];

export function AppLayout({ children }: { children?: ReactNode } = {}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed,  setSidebarCollapsed]  = useState(false);
  const { pathname } = useLocation();
  const hideCreateFab = CREATE_FAB_HIDDEN_PREFIXES.some(p => pathname.startsWith(p));
  const isImmersive   = IMMERSIVE_PREFIXES.some(p => pathname.startsWith(p));

  return (
    <div className="flex overflow-hidden" style={{ background: 'var(--bg)', height: '100dvh' }}>

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
        {!isImmersive && <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />}

        {/* pb-[60px] on mobile to clear the bottom nav — pas pour les pages immersives (pas de bottom nav) */}
        <main className={clsx('flex-1 min-h-0', isImmersive ? 'overflow-hidden' : 'overflow-y-auto pb-[60px] lg:pb-0')}>
          {children ?? <Outlet />}
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      {!isImmersive && <BottomNav />}

      {/* ── FAB création ── */}
      {!hideCreateFab && <CreateFAB />}
    </div>
  );
}
