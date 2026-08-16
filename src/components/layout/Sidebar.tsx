import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { Home, Play, Film, Radio, Video, ChevronLeft, Zap, Award, MoreHorizontal, X } from 'lucide-react';
import { RoundLogo } from '../ui/RoundLogo';
import { MoreMenuContent } from './MoreMenuContent';
import { emitTabReselect } from '../../utils/tabReselect';

// Section principale — toujours visible dans la nav
const MAIN_SECTION = {
  label: 'DÉCOUVRIR',
  items: [
    { to: '/feed',    label: 'Accueil',       desc: 'Ton fil d\'actualité',              icon: Home,   color: '#7B3FF2', end: true },
    { to: '/reels',   label: 'Reels',         desc: 'Vidéos courtes à la une',           icon: Play,   color: '#7B3FF2' },
    { to: '/films',   label: 'Films',         desc: 'Le catalogue de films',             icon: Film,   color: '#7B3FF2' },
    { to: '/series',  label: 'Séries',        desc: 'Le catalogue de séries',            icon: Film,   color: '#9B65F5' },
    { to: '/live',    label: 'Live concerts', desc: 'Concerts diffusés en direct',       icon: Radio,  color: '#7B3FF2' },
    { to: '/lives',   label: 'Lives',         desc: 'Diffusions en direct des créateurs',icon: Video,  color: '#7B3FF2' },
    { to: '/battles', label: '1 vs 1',        desc: 'Défis en direct entre créateurs',   icon: Zap,    color: '#9B65F5' },
    { to: '/tournaments', label: 'Tournois',  desc: 'Compétitions et classements',       icon: Award,  color: '#FFD700' },
  ],
};

interface Props { collapsed?: boolean; onClose?: () => void; onCollapseToggle?: () => void; }

export function Sidebar({ collapsed, onClose, onCollapseToggle }: Props) {
  const [showMore, setShowMore] = useState(false);
  const { pathname } = useLocation();

  // Helper — un lien de nav réutilisable
  function NavItem({ to, label, desc, icon: Icon, color, end }: { to: string; label: string; desc?: string; icon: any; color: string; end?: boolean }) {
    const isOnThisTab = end ? pathname === to : pathname.startsWith(to);
    return (
      <NavLink
        to={to} end={end}
        onClick={e => {
          // Retap sur l'onglet déjà actif — équivalent web du popToTabRoot mobile
          // (cf. utils/tabReselect.ts) : pas de nouvelle entrée d'historique, on
          // notifie la page pour qu'elle scrolle en haut + se rafraîchisse.
          if (isOnThisTab) {
            e.preventDefault();
            emitTabReselect(to);
            return;
          }
          onClose?.();
        }}
        title={collapsed ? label : undefined}
        className={({ isActive }) => clsx(
          'flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-150 cursor-pointer group relative',
          isActive ? 'font-semibold' : 'font-normal',
        )}
        style={({ isActive }) => ({
          background: isActive ? `${color}18` : 'transparent',
          color:      isActive ? color : 'var(--text-secondary)',
        })}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLAnchorElement;
          if (!el.getAttribute('aria-current')) {
            el.style.background = 'var(--bg-secondary)';
            el.style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLAnchorElement;
          if (!el.getAttribute('aria-current')) {
            el.style.background = 'transparent';
            el.style.color = 'var(--text-secondary)';
          }
        }}
      >
        {({ isActive }) => (
          <>
            <div className={clsx(
              'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150',
              isActive ? 'scale-100' : 'scale-90 group-hover:scale-100',
            )}
              style={{ background: isActive ? `${color}20` : 'transparent', color }}>
              <Icon size={22} />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <span className="text-sm truncate block">{label}</span>
                {desc && (
                  <span className="text-[11px] truncate block mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {desc}
                  </span>
                )}
              </div>
            )}
            {isActive && !collapsed && (
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
            )}
          </>
        )}
      </NavLink>
    );
  }

  return (
    <>
    <aside
      className={clsx('relative flex flex-col h-full transition-all duration-300 shrink-0', collapsed ? 'w-[68px]' : 'w-[220px]')}
      style={{ background: 'var(--bg)', borderRight: '1px solid var(--border)' }}
    >
      {/* ── Logo + collapse toggle ── */}
      <div className={clsx('flex items-center h-14 shrink-0 transition-all', collapsed ? 'px-2 justify-center' : 'px-4 justify-between')}>
        {collapsed ? (
          onCollapseToggle
            ? <button onClick={onCollapseToggle} title="Déplier le menu"><RoundLogo size={30} /></button>
            : <RoundLogo size={30} />
        ) : (
          <>
            <RoundLogo size={32} />
            {onCollapseToggle && (
              <button onClick={onCollapseToggle}
                className="p-1.5 rounded-lg transition-all shrink-0"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={e => { (e.currentTarget.style.background = 'var(--bg-secondary)'); (e.currentTarget.style.color = 'var(--text-primary)'); }}
                onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.color = 'var(--text-tertiary)'); }}>
                <ChevronLeft size={16} />
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Nav — uniquement la section Découvrir ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        <div>
          {!collapsed && (
            <p className="px-3 pt-2 pb-0.5 text-[9px] font-black tracking-widest"
              style={{ color: 'var(--text-tertiary)' }}>
              {MAIN_SECTION.label}
            </p>
          )}
          <div className="space-y-0.5">
            {MAIN_SECTION.items.map(item => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>
        </div>
      </nav>

      {/* ── Footer — juste le bouton Plus ── */}
      <div className="px-2 pb-3 pt-2 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        <button onClick={() => setShowMore(true)} title={collapsed ? 'Plus' : undefined}
          className="flex items-center gap-3 px-2.5 py-2 rounded-xl w-full transition-all duration-150"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { (e.currentTarget.style.background = 'var(--bg-secondary)'); (e.currentTarget.style.color = 'var(--text-primary)'); }}
          onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.color = 'var(--text-secondary)'); }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
            <MoreHorizontal size={16} />
          </div>
          {!collapsed && <span className="text-sm">Plus</span>}
        </button>
      </div>
    </aside>

    {/* ── Panneau "Plus" — occupe la zone de contenu, juste à droite de la sidebar ── */}
    {showMore && (
      <div className="fixed inset-y-0 right-0 z-[70] flex"
        style={{ left: collapsed ? 68 : 220 }}
        onClick={() => setShowMore(false)}>
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.35)' }} />
        <div className="relative w-full max-w-md h-full flex flex-col overflow-hidden animate-reveal-left"
          style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)', animationDuration: '0.2s' }}
          onClick={e => e.stopPropagation()}>

          <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>Plus</p>
            <button onClick={() => setShowMore(false)} className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            <MoreMenuContent onNavigate={() => setShowMore(false)} />
          </div>
        </div>
      </div>
    )}
    </>
  );
}
