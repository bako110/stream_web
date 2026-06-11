import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, Play, Film, Radio, Music2, Video,
  Users, MessageCircle, Bell, Search, Activity,
  Calendar, CalendarDays, Heart, Clock, UserPlus,
  Wallet, TrendingUp, HelpCircle, Settings, LogOut,
  Sun, Moon, X, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { Avatar } from '../ui/Avatar';
import { Images } from '../assets';

interface Section {
  label: string;
  items: { to: string; label: string; icon: React.ElementType; color: string }[];
}

const SECTIONS: Section[] = [
  {
    label: 'Découvrir',
    items: [
      { to: '/feed',    label: 'Accueil',        icon: Home,   color: '#7B3FF2' },
      { to: '/reels',   label: 'Reels',          icon: Play,   color: '#7B3FF2' },
      { to: '/films',   label: 'Films',          icon: Film,   color: '#7B3FF2' },
      { to: '/series',  label: 'Séries',         icon: Film,   color: '#9B65F5' },
      { to: '/live',    label: 'Live concerts',  icon: Radio,  color: '#7B3FF2' },
      { to: '/lives',   label: 'Lives',          icon: Video,  color: '#7B3FF2' },
    ],
  },
  {
    label: 'Social',
    items: [
      { to: '/communities',   label: 'Communautés',   icon: Users,         color: '#7B3FF2' },
      { to: '/messages',      label: 'Messages',      icon: MessageCircle, color: '#7B3FF2' },
      { to: '/notifications', label: 'Notifications', icon: Bell,          color: '#7B3FF2' },
      { to: '/search',        label: 'Recherche',     icon: Search,        color: '#7B3FF2' },
      { to: '/activity',      label: 'Activité',      icon: Activity,      color: '#7B3FF2' },
      { to: '/following',     label: 'Abonnements',   icon: UserPlus,      color: '#7B3FF2' },
    ],
  },
  {
    label: 'Mes contenus',
    items: [
      { to: '/my-concerts', label: 'Mes Concerts',    icon: Music2,       color: '#7B3FF2' },
      { to: '/my-events',   label: 'Mes Événements',  icon: Calendar,     color: '#7B3FF2' },
      { to: '/planning',    label: 'Mon Planning',    icon: CalendarDays,  color: '#7B3FF2' },
      { to: '/favorites',   label: 'Favoris',         icon: Heart,         color: '#EF4444' },
      { to: '/watch-history',label: 'Historique',     icon: Clock,         color: '#06B6D4' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/wallet',          label: 'Portefeuille', icon: Wallet,     color: '#22C55E' },
      { to: '/wallet/referral', label: 'Parrainage',   icon: UserPlus,   color: '#10B981' },
      { to: '/trending',        label: 'Tendances',    icon: TrendingUp,  color: '#7B3FF2' },
    ],
  },
];

interface Props { onClose: () => void }

export function MobileDrawer({ onClose }: Props) {
  const { user, logout } = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const navigate = useNavigate();

  async function handleLogout() {
    try { await logout(); } catch {}
    onClose();
    navigate('/', { replace: true });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Header profil ── */}
      <div className="flex items-center gap-3 px-4 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>
        {user && (
          <button onClick={() => { onClose(); navigate('/profile'); }}
            className="flex items-center gap-3 flex-1 min-w-0 text-left">
            <Avatar
              src={user.avatar_url}
              name={user.display_name ?? user.username ?? user.first_name}
              size="sm"
              verified={user.is_verified}
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {user.display_name ?? user.username ?? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>@{user.username}</p>
            </div>
            <ChevronRight size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          </button>
        )}
        <button onClick={onClose} className="p-1.5 rounded-xl shrink-0"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <X size={18} />
        </button>
      </div>

      {/* ── Sections scrollables ── */}
      <div className="flex-1 overflow-y-auto py-2">
        {SECTIONS.map(section => (
          <div key={section.label} className="mb-1">
            {/* Label de section */}
            <p className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest"
              style={{ color: 'var(--text-tertiary)' }}>
              {section.label}
            </p>
            {section.items.map(({ to, label, icon: Icon, color }) => (
              <NavLink key={to} to={to} onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 transition-all ${isActive ? 'font-semibold' : 'font-normal'}`
                }
                style={({ isActive }) => ({
                  background: isActive ? `${color}12` : 'transparent',
                  color:      isActive ? color : 'var(--text-secondary)',
                })}>
                {({ isActive }) => (
                  <>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: isActive ? `${color}20` : 'var(--bg-secondary)', color }}>
                      <Icon size={16} />
                    </div>
                    <span className="text-sm flex-1">{label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                    )}
                  </>
                )}
              </NavLink>
            ))}
            <div className="mx-4 mt-1" style={{ height: '1px', background: 'var(--border)' }} />
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 px-2 py-3 space-y-0.5" style={{ borderTop: '1px solid var(--border)' }}>
        {/* Thème */}
        <button onClick={toggle}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl w-full text-left transition-all"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </div>
          <span className="text-sm">{isDark ? 'Mode clair' : 'Mode sombre'}</span>
        </button>

        {/* Paramètres */}
        <NavLink to="/settings" onClick={onClose}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            <Settings size={16} />
          </div>
          <span className="text-sm">Paramètres</span>
        </NavLink>

        {/* Aide */}
        <NavLink to="/support" onClick={onClose}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            <HelpCircle size={16} />
          </div>
          <span className="text-sm">Aide & Support</span>
        </NavLink>

        {/* Déconnexion */}
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl w-full text-left transition-all"
          style={{ color: '#EF4444' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>
            <LogOut size={16} />
          </div>
          <span className="text-sm font-semibold">Déconnexion</span>
        </button>
      </div>
    </div>
  );
}
