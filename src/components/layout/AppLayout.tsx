import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileDrawer } from './MobileDrawer';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';
import { CreateFAB } from './CreateFAB';
import { BattleInviteModal } from '../live/BattleInviteModal';
import { startReelsPrefetch } from '../../utils/prefetch';

// Pages avec leur propre bouton flottant dédié — évite le doublon visuel avec le FAB global
const CREATE_FAB_HIDDEN_PREFIXES = ['/my-stories', '/join/'];
// Pages plein écran immersives sur TOUS les écrans — gèrent leur propre header/scroll,
// la Topbar/BottomNav globale ferait doublon.
const IMMERSIVE_PREFIXES = ['/reels'];
// Immersives seulement sur mobile/tablette — sur desktop (lg+) la sidebar/topbar de l'app
// reste visible, le live s'affiche dans le contenu principal comme une page normale.
const IMMERSIVE_MOBILE_ONLY_PREFIXES = ['/lives/', '/live/', '/battles/', '/join/'];

export function AppLayout({ children }: { children?: ReactNode } = {}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed,  setSidebarCollapsed]  = useState(false);
  const { pathname } = useLocation();
  // Précharge la 1ère page Reels + 1ère vidéo dès l'entrée dans l'app (cf. reelsPrefetchService mobile).
  useEffect(() => { startReelsPrefetch(); }, []);
  const isImmersive         = IMMERSIVE_PREFIXES.some(p => pathname.startsWith(p));
  const isImmersiveMobile   = IMMERSIVE_MOBILE_ONLY_PREFIXES.some(p => pathname.startsWith(p));
  const hideCreateFab = isImmersive || isImmersiveMobile || CREATE_FAB_HIDDEN_PREFIXES.some(p => pathname.startsWith(p));

  return (
    <div className="flex overflow-hidden" style={{ background: 'var(--bg)', height: '100dvh' }}>

      {/* ── Desktop sidebar ── */}
      <div className="hidden lg:flex shrink-0 transition-all duration-300 p-2 pr-0">
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
          <div className="relative z-10 w-72 max-w-[calc(100%-1rem)] m-2 rounded-[2rem] overflow-hidden animate-reveal-left"
            style={{ animationDuration: '0.22s', border: '1px solid var(--border)', boxShadow: '0 8px 20px rgba(11,11,16,0.12), 0 24px 56px -8px rgba(11,11,16,0.28)' }}>
            <MobileDrawer onClose={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!isImmersive && (
          <div className={isImmersiveMobile ? 'hidden lg:block' : undefined}>
            <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />
          </div>
        )}

        {/* pb-[60px] on mobile to clear the bottom nav — pas pour les pages immersives (pas de bottom nav) */}
        <main className={clsx(
          'flex-1 min-h-0',
          (isImmersive || isImmersiveMobile) ? 'overflow-hidden lg:overflow-y-auto' : 'overflow-y-auto pb-[88px] lg:pb-0',
        )}>
          {children ?? <Outlet />}
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      {!isImmersive && !isImmersiveMobile && <BottomNav />}

      {/* ── FAB création ── */}
      {!hideCreateFab && <CreateFAB />}

      {/* ── Invitation de battle reçue — écoute globale, quel que soit l'écran affiché ── */}
      <BattleInviteModal />
    </div>
  );
}
