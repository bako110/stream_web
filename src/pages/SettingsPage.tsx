import { useEffect, useCallback, useState } from 'react';
import {
  Shield, Palette, Bell, Play, Film, Info, AlertTriangle,
  ChevronRight, DollarSign, Star, LogOut, User,
  MapPin, Calendar, Edit2, Sun, Moon, Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { Avatar } from '../components/ui/Avatar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const PLAN_LABELS: Record<string, string> = { free: 'Gratuit', basic: 'Basic', premium: 'Premium', family: 'Family' };
const PLAN_COLORS: Record<string, string> = { free: '#9390AB', basic: '#3B82F6', premium: '#7B3FF2', family: '#E0389A' };

type VerifStatus = 'none' | 'pending' | 'approved' | 'rejected';

function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <div className="rounded-full flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: '#1D9BF0' }}>
      <Check size={size * 0.6} color="#fff" />
    </div>
  );
}

function Row({ icon, label, value, onClick, danger, badge, right, last }: {
  icon: React.ReactNode; label: string; value?: string;
  onClick?: () => void; danger?: boolean; badge?: React.ReactNode;
  right?: React.ReactNode; last?: boolean;
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? e => e.key === 'Enter' && onClick() : undefined}
      className={`flex items-center gap-3 px-4 py-3.5 transition-all ${onClick ? 'cursor-pointer' : ''}`}
      style={{ borderBottom: last ? 'none' : '1px solid var(--border)' }}
      onMouseEnter={e => onClick && (e.currentTarget.style.background = 'var(--bg-secondary)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.background = 'transparent')}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: danger ? 'rgba(239,68,68,0.1)' : 'rgba(123,63,242,0.1)' }}>
        <span style={{ color: danger ? '#EF4444' : 'var(--primary)' }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: danger ? '#EF4444' : 'var(--text-primary)' }}>{label}</span>
          {badge}
        </div>
        {value && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{value}</p>}
      </div>
      {right ?? (onClick ? <ChevronRight size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} /> : null)}
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const { isDark } = useThemeStore();
  const navigate = useNavigate();

  const [subscription, setSubscription] = useState<any>(null);
  const [unreadCount,  setUnreadCount]  = useState(0);

  const loadData = useCallback(async () => {
    const [sub, notif] = await Promise.allSettled([
      apiClient.get<any>(Endpoints.subscriptions.me),
      apiClient.get<any>(Endpoints.notifications.unreadCount),
    ]);
    if (sub.status === 'fulfilled')   setSubscription(sub.value.data);
    if (notif.status === 'fulfilled') setUnreadCount(notif.value.data?.count ?? 0);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const planKey   = subscription?.plan ?? 'free';
  const planLabel = PLAN_LABELS[planKey] ?? planKey;
  const planColor = PLAN_COLORS[planKey] ?? 'var(--primary)';

  const verifStatus = (user?.verification_status ?? 'none') as VerifStatus;
  const verifSub: Record<VerifStatus, string> = {
    none:     'Obtenir le badge bleu GoFolix',
    pending:  "Demande en cours d'examen",
    approved: 'Compte vérifié',
    rejected: 'Demande refusée — réessayer',
  };

  const memberSince = user ? format(new Date(user.created_at), 'MMMM yyyy', { locale: fr }) : '';

  const sections = [
    {
      key: 'wallet',
      icon: <DollarSign size={17} />, label: 'Wallet & Monétisation', color: '#FFD700',
      onClick: () => navigate('/wallet'),
    },
    {
      key: 'abonnement',
      icon: <Star size={17} />, label: 'Abonnement', color: planColor,
      sub: planLabel,
      right: (
        <span className="text-xs font-black px-2.5 py-1 rounded-full shrink-0"
          style={{ background: `${planColor}20`, color: planColor, border: `1px solid ${planColor}40` }}>
          {planLabel}
        </span>
      ),
      onClick: () => navigate('/subscriptions'),
    },
    {
      key: 'verification',
      icon: <Shield size={17} />, label: 'Vérification GoFolix', color: '#1D9BF0',
      sub: verifSub[verifStatus],
      badge: user?.is_verified ? <VerifiedBadge size={15} /> : undefined,
      onClick: () => navigate('/settings/verification'),
    },
    {
      key: 'apparence',
      icon: <Palette size={17} />, label: 'Apparence', color: '#F59E0B',
      right: (
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{isDark ? 'Sombre' : 'Clair'}</span>
          {isDark ? <Moon size={14} style={{ color: 'var(--text-tertiary)' }} /> : <Sun size={14} style={{ color: 'var(--text-tertiary)' }} />}
          <ChevronRight size={15} style={{ color: 'var(--text-tertiary)' }} />
        </div>
      ),
      onClick: () => navigate('/settings/appearance'),
    },
    {
      key: 'notifications',
      icon: <Bell size={17} />, label: 'Notifications', color: '#3B82F6',
      sub: unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : undefined,
      onClick: () => navigate('/settings/notifications'),
    },
    {
      key: 'lecture',
      icon: <Play size={17} />, label: 'Lecture', color: '#10B981',
      onClick: () => navigate('/settings/playback'),
    },
    {
      key: 'compte',
      icon: <User size={17} />, label: 'Compte', color: '#7B3FF2',
      onClick: () => navigate('/settings/account'),
    },
    {
      key: 'contenu',
      icon: <Film size={17} />, label: 'Contenu', color: '#E0389A',
      onClick: () => navigate('/settings/content'),
    },
    {
      key: 'apropos',
      icon: <Info size={17} />, label: 'À propos', color: '#6366F1',
      onClick: () => navigate('/settings/about'),
    },
    {
      key: 'danger',
      icon: <AlertTriangle size={17} />, label: 'Zone dangereuse', color: '#EF4444',
      danger: true,
      onClick: () => navigate('/settings/danger'),
    },
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Paramètres</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Gérez votre compte et vos préférences</p>
      </div>

      {/* Carte profil */}
      <button onClick={() => navigate('/profile')}
        className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
        <Avatar src={user?.avatar_url} name={user?.display_name ?? user?.username ?? '?'} size="lg" verified={user?.is_verified} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-black text-base truncate" style={{ color: 'var(--text-primary)' }}>
              {user?.display_name ?? user?.username ?? 'Utilisateur'}
            </p>
            {user?.is_verified && <VerifiedBadge size={16} />}
          </div>
          <p className="text-sm truncate" style={{ color: 'var(--text-tertiary)' }}>{user?.email}</p>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {user?.location && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                <MapPin size={10} /> {user.location}
              </span>
            )}
            {memberSince && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                <Calendar size={10} /> Membre depuis {memberSince}
              </span>
            )}
          </div>
        </div>
        <Edit2 size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
      </button>

      {/* Liste des sections */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {sections.map((sec, i) => (
          <Row
            key={sec.key}
            icon={<span style={{ color: sec.color }}>{sec.icon}</span>}
            label={sec.label}
            value={sec.sub}
            badge={sec.badge}
            danger={sec.danger}
            onClick={sec.onClick}
            right={sec.right}
            last={i === sections.length - 1}
          />
        ))}
      </div>

      {/* Déconnexion */}
      <button onClick={() => logout()}
        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-black text-sm transition-all"
        style={{ color: '#EF4444', border: '1.5px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.04)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.04)')}>
        <LogOut size={17} /> Se déconnecter
      </button>
    </div>
  );
}
