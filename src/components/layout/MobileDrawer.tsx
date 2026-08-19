import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Play, Film, Radio, Video, Zap, Award, Users, MoreHorizontal, X, ChevronRight, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../ui/Avatar';
import { accountsService } from '../../services/accountsService';
import type { StoredAccount } from '../../services/accountsService';
import { AccountSwitcherMenu } from './AccountSwitcherMenu';

const MAIN_SECTION = {
  label: 'Découvrir',
  items: [
    { to: '/feed',    label: 'Accueil',       icon: Home,   color: '#7B3FF2' },
    { to: '/communities', label: 'Communautés', icon: Users, color: '#7B3FF2' },
    { to: '/reels',   label: 'Reels',         icon: Play,   color: '#7B3FF2' },
    { to: '/films',   label: 'Films',         icon: Film,   color: '#7B3FF2' },
    { to: '/series',  label: 'Séries',        icon: Film,   color: '#9B65F5' },
    { to: '/live',    label: 'Live concerts', icon: Radio,  color: '#7B3FF2' },
    { to: '/lives',   label: 'Lives',         icon: Video,  color: '#7B3FF2' },
    { to: '/battles', label: '1 vs 1',        icon: Zap,    color: '#9B65F5' },
    { to: '/tournaments', label: 'Tournois',  icon: Award,  color: '#FFD700' },
  ],
};

interface Props { onClose: () => void }

export function MobileDrawer({ onClose }: Props) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  // Menu de bascule de compte — pas de dropdown flottant sur mobile (pattern
  // desktop, cf. AccountSwitcherDropdown.tsx), la liste s'affiche directement
  // inline dans le drawer, sous le bouton "Changer".
  const [showAccounts, setShowAccounts] = useState(false);
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);

  function toggleAccounts() {
    if (!showAccounts) setAccounts(accountsService.listAccounts());
    setShowAccounts(v => !v);
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
        {user && (
          <button onClick={toggleAccounts} title="Changer de compte"
            className="flex items-center gap-0.5 px-2 py-1.5 rounded-xl shrink-0 text-xs font-semibold"
            style={{ color: 'var(--text-tertiary)', background: showAccounts ? 'var(--bg-secondary)' : 'transparent' }}>
            Changer
            <ChevronDown size={12} style={{ transform: showAccounts ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
        )}
        <button onClick={onClose} className="p-1.5 rounded-xl shrink-0"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <X size={18} />
        </button>
      </div>

      {/* ── Liste des comptes — repliée par défaut, affichée inline (pas de
          dropdown flottant) sous le bouton "Changer". ── */}
      {showAccounts && (
        <div className="shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <AccountSwitcherMenu accounts={accounts} onClose={() => { setShowAccounts(false); onClose(); }} />
        </div>
      )}

      {/* ── Découvrir ── */}
      <div className="flex-1 overflow-y-auto py-2">
        <p className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest"
          style={{ color: 'var(--text-tertiary)' }}>
          {MAIN_SECTION.label}
        </p>
        {MAIN_SECTION.items.map(({ to, label, icon: Icon, color }) => (
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
      </div>

      {/* ── Footer — bouton Plus ── */}
      <div className="shrink-0 px-2 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <button onClick={() => { onClose(); navigate('/more'); }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl w-full text-left transition-all"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            <MoreHorizontal size={16} />
          </div>
          <span className="text-sm">Plus</span>
        </button>
      </div>
    </div>
  );
}
