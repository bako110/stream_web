import { NavLink, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Home, Play, Film, Radio, Music2, Video,
  Users, MessageCircle, Bell, Search, Activity, UserPlus,
  Calendar, CalendarDays, Heart, Clock,
  Wallet, TrendingUp, HelpCircle, Settings, LogOut,
  Sun, Moon, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { Avatar } from '../ui/Avatar';
import { Images } from '../assets';

const SECTIONS = [
  {
    label: 'DÉCOUVRIR',
    items: [
      { to: '/feed',    label: 'Accueil',       icon: Home,   color: '#7B3FF2', end: true },
      { to: '/reels',   label: 'Reels',         icon: Play,   color: '#E0389A' },
      { to: '/films',   label: 'Films',         icon: Film,   color: '#3B82F6' },
      { to: '/series',  label: 'Séries',        icon: Film,   color: '#9B65F5' },
      { to: '/live',    label: 'Live concerts', icon: Radio,  color: '#F0365A' },
      { to: '/lives',   label: 'Lives',         icon: Video,  color: '#E0389A' },
    ],
  },
  {
    label: 'SOCIAL',
    items: [
      { to: '/communities',    label: 'Communautés',   icon: Users,         color: '#36D9A0' },
      { to: '/messages',       label: 'Messages',      icon: MessageCircle, color: '#3B82F6' },
      { to: '/notifications',  label: 'Notifications', icon: Bell,          color: '#E0389A' },
      { to: '/search',         label: 'Recherche',     icon: Search,        color: '#F59E0B' },
      { to: '/activity',       label: 'Activité',      icon: Activity,      color: '#36D9A0' },
      { to: '/following',      label: 'Abonnements',   icon: UserPlus,      color: '#6366F1' },
    ],
  },
  {
    label: 'MES CONTENUS',
    items: [
      { to: '/my-concerts',   label: 'Mes Concerts',   icon: Music2,       color: '#FF7A2F' },
      { to: '/my-events',     label: 'Mes Événements', icon: Calendar,     color: '#F59E0B' },
      { to: '/planning',      label: 'Mon Planning',   icon: CalendarDays,  color: '#7B3FF2' },
      { to: '/favorites',     label: 'Favoris',        icon: Heart,         color: '#EF4444' },
      { to: '/watch-history', label: 'Historique',     icon: Clock,         color: '#06B6D4' },
    ],
  },
  {
    label: 'FINANCE',
    items: [
      { to: '/wallet',           label: 'Portefeuille', icon: Wallet,     color: '#22C55E' },
      { to: '/wallet/referral',  label: 'Parrainage',   icon: UserPlus,   color: '#10B981' },
      { to: '/trending',         label: 'Tendances',    icon: TrendingUp,  color: '#8B5CF6' },
    ],
  },
];

interface Props { collapsed?: boolean; onClose?: () => void; onCollapseToggle?: () => void; }

export function Sidebar({ collapsed, onClose, onCollapseToggle }: Props) {
  const { user, logout } = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const navigate = useNavigate();

  async function handleLogout() {
    try { await logout(); } catch {}
    navigate('/', { replace: true });
  }

  // Helper — un lien de nav réutilisable
  function NavItem({ to, label, icon: Icon, color, end }: { to: string; label: string; icon: any; color: string; end?: boolean }) {
    return (
      <NavLink
        to={to} end={end} onClick={onClose}
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
              'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150',
              isActive ? 'scale-100' : 'scale-90 group-hover:scale-100',
            )}
              style={{ background: isActive ? `${color}20` : 'transparent', color }}>
              <Icon size={17} />
            </div>
            {!collapsed && <span className="text-sm truncate flex-1">{label}</span>}
            {isActive && !collapsed && (
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
            )}
          </>
        )}
      </NavLink>
    );
  }

  return (
    <aside
      className={clsx('relative flex flex-col h-full transition-all duration-300 shrink-0', collapsed ? 'w-[68px]' : 'w-[220px]')}
      style={{ background: 'var(--bg)', borderRight: '1px solid var(--border)' }}
    >
      {/* ── Logo + collapse toggle ── */}
      <div className={clsx('flex items-center h-14 shrink-0 transition-all', collapsed ? 'px-2 justify-center' : 'px-4 justify-between')}>
        {!collapsed && (
          <img src={isDark ? Images.logoDark : Images.logoLight} alt="GoFoliX" className="h-8 w-auto" />
        )}
        {onCollapseToggle && (
          <button onClick={onCollapseToggle}
            className="p-1.5 rounded-lg transition-all shrink-0"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => { (e.currentTarget.style.background = 'var(--bg-secondary)'); (e.currentTarget.style.color = 'var(--text-primary)'); }}
            onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.color = 'var(--text-tertiary)'); }}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* ── Nav avec sections ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {SECTIONS.map((section, si) => (
          <div key={section.label} className={si > 0 ? 'mt-1' : ''}>
            {/* Label section — caché si collapsed */}
            {!collapsed && (
              <p className="px-3 pt-2 pb-0.5 text-[9px] font-black tracking-widest"
                style={{ color: 'var(--text-tertiary)' }}>
                {section.label}
              </p>
            )}
            {collapsed && si > 0 && (
              <div className="mx-2 my-2" style={{ height: '1px', background: 'var(--border)' }} />
            )}
            <div className="space-y-0.5">
              {section.items.map(item => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="px-2 pb-3 pt-2 space-y-0.5 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>

        {/* Thème */}
        <button onClick={toggle} title={collapsed ? (isDark ? 'Mode clair' : 'Mode sombre') : undefined}
          className="flex items-center gap-3 px-2.5 py-2 rounded-xl w-full transition-all duration-150 group"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { (e.currentTarget.style.background = 'var(--bg-secondary)'); (e.currentTarget.style.color = 'var(--text-primary)'); }}
          onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.color = 'var(--text-secondary)'); }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:rotate-12"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </div>
          {!collapsed && <span className="text-sm">{isDark ? 'Mode clair' : 'Mode sombre'}</span>}
        </button>

        {/* Aide */}
        <NavLink to="/support" onClick={onClose} title={collapsed ? 'Aide' : undefined}
          className="flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-150"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
            <HelpCircle size={16} />
          </div>
          {!collapsed && <span className="text-sm">Aide & Support</span>}
        </NavLink>

        {/* Paramètres */}
        <NavLink to="/settings" onClick={onClose} title={collapsed ? 'Paramètres' : undefined}
          className={({ isActive }) => clsx('flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-150', isActive ? 'font-semibold' : '')}
          style={({ isActive }) => ({ background: isActive ? 'rgba(123,63,242,0.1)' : 'transparent', color: isActive ? 'var(--primary)' : 'var(--text-secondary)' })}
          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; if (!el.getAttribute('aria-current')) { el.style.background = 'var(--bg-secondary)'; } }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; if (!el.getAttribute('aria-current')) { el.style.background = 'transparent'; } }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
            <Settings size={16} />
          </div>
          {!collapsed && <span className="text-sm">Paramètres</span>}
        </NavLink>

        {/* Profil */}
        {user && (
          <NavLink to="/profile" onClick={onClose} title={collapsed ? (user.display_name ?? user.username ?? undefined) : undefined}
            className={({ isActive }) => clsx('flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-150', isActive ? 'font-semibold' : '')}
            style={({ isActive }) => ({ background: isActive ? 'rgba(123,63,242,0.1)' : 'transparent', color: isActive ? 'var(--primary)' : 'var(--text-secondary)' })}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; if (!el.getAttribute('aria-current')) { el.style.background = 'var(--bg-secondary)'; } }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; if (!el.getAttribute('aria-current')) { el.style.background = 'transparent'; } }}>
            <Avatar src={user.avatar_url} name={user.display_name ?? user.username ?? user.first_name} size="xs" verified={user.is_verified} className="shrink-0" />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {user.display_name ?? user.username ?? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()}
                </p>
                <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>@{user.username}</p>
              </div>
            )}
          </NavLink>
        )}

        {/* Déconnexion */}
        <button onClick={handleLogout} title={collapsed ? 'Déconnexion' : undefined}
          className="flex items-center gap-3 px-2.5 py-2 rounded-xl w-full transition-all duration-150 group"
          style={{ color: '#F0365A' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(240,54,90,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:translate-x-0.5"
            style={{ background: 'rgba(240,54,90,0.08)', color: '#F0365A' }}>
            <LogOut size={16} />
          </div>
          {!collapsed && <span className="text-sm font-semibold">Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
