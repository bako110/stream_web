import { NavLink, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Home, Play, Film, Radio, Calendar, Music2, Users, MessageCircle,
  Bell, Search, Settings, LogOut, Sun, Moon, Activity, Video,
  ChevronLeft, ChevronRight, CalendarDays, HelpCircle,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { Avatar } from '../ui/Avatar';
import { Images } from '../assets';

const mainLinks = [
  { to: '/feed',        label: 'Accueil',         icon: Home,    color: '#7B3FF2' },
  { to: '/reels',       label: 'Reels',           icon: Play,    color: '#E0389A' },
  { to: '/films',       label: 'Films',           icon: Film,    color: '#3B82F6' },
  { to: '/series',      label: 'Séries',          icon: Film,    color: '#9B65F5' },
  { to: '/concerts',    label: 'Concerts',        icon: Music2,  color: '#FF7A2F' },
  { to: '/events',      label: 'Événements',      icon: Calendar,color: '#F59E0B' },
  { to: '/live',        label: 'Live concerts',   icon: Radio,   color: '#F0365A' },
  { to: '/lives',       label: 'Lives',           icon: Video,   color: '#E0389A' },
];

const myContentLinks = [
  { to: '/my-concerts', label: 'Mes Concerts',    icon: Music2,  color: '#FF7A2F' },
  { to: '/my-events',   label: 'Mes Événements',  icon: Calendar,color: '#F59E0B' },
];

const secondaryLinks = [
  { to: '/communities',    label: 'Communautés',   icon: Users,         color: '#36D9A0' },
  { to: '/messages',       label: 'Messages',      icon: MessageCircle, color: '#3B82F6' },
  { to: '/notifications',  label: 'Notifications', icon: Bell,          color: '#E0389A' },
  { to: '/search',         label: 'Recherche',     icon: Search,        color: '#F59E0B' },
  { to: '/activity',       label: 'Activité',      icon: Activity,      color: '#36D9A0' },
  { to: '/planning',       label: 'Mon planning',  icon: CalendarDays,  color: '#7B3FF2' },
  { to: '/support',        label: 'Aide & Support',icon: HelpCircle,    color: '#3B82F6' },
];

interface Props { collapsed?: boolean; onClose?: () => void; onCollapseToggle?: () => void; }

export function Sidebar({ collapsed, onClose, onCollapseToggle }: Props) {
  const { user, logout } = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const navigate = useNavigate();

  async function handleLogout() {
    try { await logout(); } catch { /* clears state regardless */ }
    navigate('/', { replace: true });
  }

  return (
    <aside
      className={clsx('flex flex-col h-full transition-all duration-300 shrink-0', collapsed ? 'w-[68px]' : 'w-[240px]')}
      style={{ background: 'var(--bg)', borderRight: '1px solid var(--border)' }}
    >
      {/* ── Logo ── */}
      <div className={clsx('flex items-center h-14 shrink-0 transition-all', collapsed ? 'px-3 justify-center' : 'px-4 justify-between')}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <img src={isDark ? Images.logoDark : Images.logoLight} alt="FoliX" className="h-8 w-auto" />
          </div>
        )}
        {collapsed && (
          <img src={isDark ? Images.logoDark : Images.logoLight} alt="FoliX" className="h-8 w-auto" />
        )}
        {onCollapseToggle && (
          <button onClick={onCollapseToggle}
            className={clsx('p-1.5 rounded-lg transition-all', collapsed && 'hidden')}
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => { (e.currentTarget.style.background = 'var(--bg-secondary)'); (e.currentTarget.style.color = 'var(--text-primary)'); }}
            onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.color = 'var(--text-tertiary)'); }}>
            <ChevronLeft size={16} />
          </button>
        )}
        {collapsed && onCollapseToggle && (
          <button onClick={onCollapseToggle}
            className="absolute -right-3 top-[18px] w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-tertiary)' }}
            onMouseEnter={e => { (e.currentTarget.style.borderColor = 'var(--primary)'); (e.currentTarget.style.color = 'var(--primary)'); }}
            onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--border)'); (e.currentTarget.style.color = 'var(--text-tertiary)'); }}>
            <ChevronRight size={12} />
          </button>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {mainLinks.map(({ to, label, icon: Icon, color }) => (
          <NavLink key={to} to={to} end={to === '/feed'} onClick={onClose}
            title={collapsed ? label : undefined}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-150 cursor-pointer group relative',
              isActive ? 'font-semibold' : 'font-normal',
            )}
            style={({ isActive }) => ({
              background:   isActive ? `${color}18` : 'transparent',
              color:        isActive ? color : 'var(--text-secondary)',
            })}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLAnchorElement;
              if (!el.classList.contains('active')) {
                el.style.background = 'var(--bg-secondary)';
                el.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLAnchorElement;
              if (!el.classList.contains('active')) {
                el.style.background = 'transparent';
                el.style.color = 'var(--text-secondary)';
              }
            }}>
            {({ isActive }) => (
              <>
                <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150',
                  isActive ? 'scale-100' : 'scale-90 group-hover:scale-100')}
                  style={{ background: isActive ? `${color}20` : 'transparent' }}>
                  <Icon size={17} />
                </div>
                {!collapsed && <span className="text-sm truncate">{label}</span>}
                {isActive && !collapsed && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: color }} />
                )}
              </>
            )}
          </NavLink>
        ))}

        <div className="mx-2 my-2" style={{ height: '1px', background: 'var(--border)' }} />

        {/* ── Mes contenus ── */}
        {!collapsed && (
          <p className="px-3 pt-1 pb-0.5 text-[9px] font-bold tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
            MES CONTENUS
          </p>
        )}
        {myContentLinks.map(({ to, label, icon: Icon, color }) => (
          <NavLink key={to} to={to} onClick={onClose}
            title={collapsed ? label : undefined}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-150 cursor-pointer group',
              isActive ? 'font-semibold' : 'font-normal',
            )}
            style={({ isActive }) => ({
              background: isActive ? `${color}18` : 'transparent',
              color:      isActive ? color : 'var(--text-secondary)',
            })}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLAnchorElement;
              if (!el.classList.contains('active')) {
                el.style.background = 'var(--bg-secondary)';
                el.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLAnchorElement;
              if (!el.classList.contains('active')) {
                el.style.background = 'transparent';
                el.style.color = 'var(--text-secondary)';
              }
            }}>
            {({ isActive }) => (
              <>
                <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150',
                  isActive ? 'scale-100' : 'scale-90 group-hover:scale-100')}
                  style={{ background: isActive ? `${color}20` : 'transparent' }}>
                  <Icon size={17} />
                </div>
                {!collapsed && <span className="text-sm truncate">{label}</span>}
                {isActive && !collapsed && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                )}
              </>
            )}
          </NavLink>
        ))}

        <div className="mx-2 my-2" style={{ height: '1px', background: 'var(--border)' }} />

        {secondaryLinks.map(({ to, label, icon: Icon, color }) => (
          <NavLink key={to} to={to} onClick={onClose}
            title={collapsed ? label : undefined}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-150 cursor-pointer group',
              isActive ? 'font-semibold' : 'font-normal',
            )}
            style={({ isActive }) => ({
              background: isActive ? `${color}18` : 'transparent',
              color:      isActive ? color : 'var(--text-secondary)',
            })}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLAnchorElement;
              if (!el.classList.contains('active')) {
                el.style.background = 'var(--bg-secondary)';
                el.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLAnchorElement;
              if (!el.classList.contains('active')) {
                el.style.background = 'transparent';
                el.style.color = 'var(--text-secondary)';
              }
            }}>
            {({ isActive }) => (
              <>
                <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150',
                  isActive ? 'scale-100' : 'scale-90 group-hover:scale-100')}
                  style={{ background: isActive ? `${color}20` : 'transparent' }}>
                  <Icon size={17} />
                </div>
                {!collapsed && <span className="text-sm truncate">{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="px-2 pb-3 pt-2 space-y-0.5 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>

        {/* Theme */}
        <button onClick={toggle} title={collapsed ? (isDark ? 'Mode clair' : 'Mode sombre') : undefined}
          className="flex items-center gap-3 px-2.5 py-2 rounded-xl w-full transition-all duration-150 group"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { (e.currentTarget.style.background = 'var(--bg-secondary)'); (e.currentTarget.style.color = 'var(--text-primary)'); }}
          onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); (e.currentTarget.style.color = 'var(--text-secondary)'); }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:rotate-12"
            style={{ background: 'var(--bg-tertiary)' }}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </div>
          {!collapsed && <span className="text-sm">{isDark ? 'Mode clair' : 'Mode sombre'}</span>}
        </button>

        {/* Settings */}
        <NavLink to="/settings" title={collapsed ? 'Paramètres' : undefined}
          className={({ isActive }) => clsx(
            'flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-150 group',
            isActive ? 'font-semibold' : '',
          )}
          style={({ isActive }) => ({
            background: isActive ? 'rgba(123,63,242,0.1)' : 'transparent',
            color:      isActive ? 'var(--primary)' : 'var(--text-secondary)',
          })}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLAnchorElement;
            if (!el.classList.contains('active')) {
              el.style.background = 'var(--bg-secondary)';
              el.style.color = 'var(--text-primary)';
            }
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLAnchorElement;
            if (!el.classList.contains('active')) {
              el.style.background = 'transparent';
              el.style.color = 'var(--text-secondary)';
            }
          }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--bg-tertiary)' }}>
            <Settings size={16} />
          </div>
          {!collapsed && <span className="text-sm">Paramètres</span>}
        </NavLink>

        {/* Profile */}
        {user && (
          <NavLink to="/profile" title={collapsed ? (user.display_name ?? user.username ?? undefined) : undefined}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-150',
              isActive ? 'font-semibold' : '',
            )}
            style={({ isActive }) => ({
              background: isActive ? 'rgba(123,63,242,0.1)' : 'transparent',
              color:      isActive ? 'var(--primary)' : 'var(--text-secondary)',
            })}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLAnchorElement;
              if (!el.classList.contains('active')) {
                el.style.background = 'var(--bg-secondary)';
                el.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLAnchorElement;
              if (!el.classList.contains('active')) {
                el.style.background = 'transparent';
                el.style.color = 'var(--text-secondary)';
              }
            }}>
            <Avatar
              src={user.avatar_url}
              name={user.display_name ?? user.username ?? user.first_name}
              size="xs"
              verified={user.is_verified}
              className="shrink-0"
            />
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

        {/* Logout */}
        <button onClick={handleLogout} title={collapsed ? 'Déconnexion' : undefined}
          className="flex items-center gap-3 px-2.5 py-2 rounded-xl w-full transition-all duration-150 group"
          style={{ color: '#F0365A' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(240,54,90,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:translate-x-0.5"
            style={{ background: 'rgba(240,54,90,0.08)' }}>
            <LogOut size={16} />
          </div>
          {!collapsed && <span className="text-sm font-semibold">Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
