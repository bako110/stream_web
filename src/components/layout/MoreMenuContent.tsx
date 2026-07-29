import { NavLink, useNavigate } from 'react-router-dom';
import { useConfirm } from '../ui/Dialog';
import {
  Radio, Users, MessageCircle, Bell, Activity, UserPlus,
  Music2, Calendar, CalendarDays, Heart, Clock,
  Wallet, TrendingUp, HelpCircle, Settings, LogOut,
  Sun, Moon, Download, BarChart2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { Avatar } from '../ui/Avatar';

const APK_URL     = 'https://gofolyx.com/uploads/apk/gofolyx-1.0.0.4.apk';
const APK_VERSION = '1.0.0.4';

export const MORE_SECTIONS = [
  {
    label: 'SOCIAL',
    items: [
      { to: '/communities',    label: 'Communautés',   desc: 'Rejoins et anime des communautés',         icon: Users,         color: '#7B3FF2' },
      { to: '/messages',       label: 'Messages',      desc: 'Tes conversations privées',                 icon: MessageCircle, color: '#7B3FF2' },
      { to: '/notifications',  label: 'Notifications', desc: 'Toute ton activité récente',                icon: Bell,          color: '#7B3FF2' },
      { to: '/activity',       label: 'Activité',      desc: 'Likes, commentaires et abonnements',        icon: Activity,      color: '#7B3FF2' },
      { to: '/following',      label: 'Abonnements',   desc: 'Les comptes que tu suis',                   icon: UserPlus,      color: '#7B3FF2' },
    ],
  },
  {
    label: 'MES CONTENUS',
    items: [
      { to: '/my-concerts',      label: 'Mes Concerts',   desc: 'Gère les concerts que tu organises',        icon: Music2,       color: '#7B3FF2' },
      { to: '/my-events',        label: 'Mes Événements', desc: 'Gère les événements que tu organises',      icon: Calendar,     color: '#7B3FF2' },
      { to: '/planning',         label: 'Mon Planning',   desc: 'Ton calendrier de sorties et lives',        icon: CalendarDays,  color: '#7B3FF2' },
      { to: '/wallet/analytics', label: 'Statistiques',   desc: 'Vues, portée et performance de tes contenus', icon: BarChart2,  color: '#E85DAD' },
      { to: '/favorites',        label: 'Favoris',        desc: 'Films, séries et contenus enregistrés',     icon: Heart,         color: '#EF4444' },
      { to: '/watch-history',    label: 'Historique',     desc: 'Ce que tu as regardé récemment',            icon: Clock,         color: '#06B6D4' },
    ],
  },
  {
    label: 'FINANCE',
    items: [
      { to: '/wallet',           label: 'Portefeuille', desc: 'Ton solde GoGold et tes transactions',       icon: Wallet,     color: '#22C55E' },
      { to: '/wallet/referral',  label: 'Parrainage',   desc: 'Invite tes amis et gagne des récompenses',   icon: UserPlus,   color: '#10B981' },
      { to: '/trending',         label: 'Tendances',    desc: 'Ce qui buzz en ce moment sur GoFoliX',       icon: TrendingUp,  color: '#7B3FF2' },
    ],
  },
];

// Ligne réutilisable — icône + label + description
function MoreRow({ to, label, desc, icon: Icon, color, onClick, danger, onNavigate }: {
  to?: string; label: string; desc?: string; icon: any; color: string; onClick?: () => void; danger?: boolean; onNavigate?: () => void;
}) {
  const content = (isActive?: boolean) => (
    <>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}15`, color }}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-sm font-semibold truncate" style={{ color: isActive ? color : 'var(--text-primary)' }}>{label}</p>
        {desc && <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{desc}</p>}
      </div>
    </>
  );
  const baseClass = 'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150 w-full';
  if (to) {
    return (
      <NavLink to={to} onClick={onNavigate}
        className={baseClass}
        style={({ isActive }) => ({ background: isActive ? `${color}10` : 'transparent' })}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${color}10`; }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; if (!el.getAttribute('aria-current')) el.style.background = 'transparent'; }}>
        {({ isActive }) => content(isActive)}
      </NavLink>
    );
  }
  return (
    <button onClick={onClick} className={baseClass}
      onMouseEnter={e => { (e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.08)' : `${color}10`); }}
      onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); }}>
      {content()}
    </button>
  );
}

interface Props {
  /** Appelé après un clic sur un lien de navigation ou déconnexion — ferme le panneau/modal appelant. */
  onNavigate?: () => void;
}

/** Contenu partagé du menu "Plus" — réutilisé par le panneau desktop (Sidebar) et la page plein écran mobile (MorePage). */
export function MoreMenuContent({ onNavigate }: Props) {
  const { user, logout } = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirm();

  async function handleLogout() {
    const ok = await confirm({
      title: 'Se déconnecter ?',
      message: 'Tu seras redirigé vers la page d\'accueil.',
      confirmLabel: 'Déconnexion',
      danger: true,
    });
    if (!ok) return;
    try { await logout(); } catch {}
    navigate('/', { replace: true });
  }

  return (
    <>
      {/* Profil */}
      {user && (
        <div className="mb-3">
          <NavLink to="/profile" onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors duration-150"
            style={{ background: 'rgba(123,63,242,0.06)' }}
            onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(123,63,242,0.12)'); }}
            onMouseLeave={e => { (e.currentTarget.style.background = 'rgba(123,63,242,0.06)'); }}>
            <Avatar src={user.avatar_url} name={user.display_name ?? user.username ?? user.first_name} size="md" verified={user.is_verified} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {user.display_name ?? user.username ?? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()}
              </p>
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Voir ton profil public</p>
            </div>
          </NavLink>
        </div>
      )}

      {/* Go Live */}
      <div className="mb-3">
        <MoreRow to="/go-live" label="Go Live" desc="Démarre un live en direct" icon={Radio} color="#EF4444" onNavigate={onNavigate} />
      </div>

      {/* Sections Social / Mes contenus / Finance */}
      {MORE_SECTIONS.map(section => (
        <div key={section.label} className="mb-3">
          <p className="px-3 pb-1 text-[10px] font-black tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
            {section.label}
          </p>
          <div className="space-y-0.5">
            {section.items.map(item => (
              <MoreRow key={item.to} to={item.to} label={item.label} desc={item.desc} icon={item.icon} color={item.color} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}

      {/* Paramètres */}
      <div className="mb-3">
        <p className="px-3 pb-1 text-[10px] font-black tracking-widest" style={{ color: 'var(--text-tertiary)' }}>PARAMÈTRES</p>
        <div className="space-y-0.5">
          <MoreRow to="/settings" label="Paramètres" desc="Compte, confidentialité et sécurité" icon={Settings} color="#7B3FF2" onNavigate={onNavigate} />
          <MoreRow to="/support" label="Aide & Support" desc="Contacte-nous ou consulte la FAQ" icon={HelpCircle} color="#06B6D4" onNavigate={onNavigate} />
          <MoreRow
            label={isDark ? 'Mode clair' : 'Mode sombre'}
            desc={isDark ? 'Passer à un affichage clair' : 'Passer à un affichage sombre'}
            icon={isDark ? Sun : Moon} color="#F59E0B" onClick={toggle} />
          {APK_URL && (
            <MoreRow
              label="Télécharger l'app"
              desc={APK_VERSION ? `Version ${APK_VERSION} · Android APK` : 'Application Android'}
              icon={Download} color="#22C55E"
              onClick={() => { const a = document.createElement('a'); a.href = APK_URL; a.download = ''; a.click(); }} />
          )}
        </div>
      </div>

      {/* Déconnexion */}
      <MoreRow label="Déconnexion" desc="Se déconnecter de ce compte" icon={LogOut} color="#EF4444" danger
        onClick={() => { onNavigate?.(); handleLogout(); }} />

      {ConfirmDialog}
    </>
  );
}
