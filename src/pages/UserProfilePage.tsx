import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin, Globe, Phone, Calendar, UserPlus, UserCheck,
  UserX, MessageCircle, Play, Eye, Heart, Grid3x3,
  Info, BadgeCheck, ShieldOff, Shield,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { UserPublicProfile, Reel, Event, Concert, PaginatedResponse } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useApi, usePaginatedApi } from '../hooks/useApi';
import { useAuthStore } from '../store/authStore';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';

type Tab = 'publications' | 'reels' | 'about';

const ROLE_LABEL: Record<string, string> = {
  artist: 'Artiste',
  admin:  'Admin',
  user:   'Membre',
};
const ROLE_COLOR: Record<string, string> = {
  artist: '#E0389A',
  admin:  '#F0365A',
  user:   '#7B3FF2',
};

// ── Stat block ────────────────────────────────────────────────────────────────
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-1">
      <span className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
        {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
      </span>
      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
    </div>
  );
}

// ── Publications grid ─────────────────────────────────────────────────────────
function PublicationsTab({ userId }: { userId: string }) {
  const { data: eventsData, loading: eventsLoading } = useApi<any>(
    () => apiClient.get<any>(`${Endpoints.events.list}?organizer_id=${userId}&limit=20&status=published`), [userId],
  );
  const { data: concertsData, loading: concertsLoading } = useApi<any>(
    () => apiClient.get<any>(`${Endpoints.concerts.list}?artist_id=${userId}&limit=20&status=published`), [userId],
  );

  const events: Event[]   = eventsData?.items ?? eventsData ?? [];
  const concerts: Concert[] = concertsData?.items ?? concertsData ?? [];

  const items = [
    ...events.map(e => ({ ...e, _kind: 'event' as const })),
    ...concerts.map(c => ({ ...c, _kind: 'concert' as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (eventsLoading || concertsLoading) {
    return <div className="flex justify-center py-16"><Spinner /></div>;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16" style={{ color: 'var(--text-tertiary)' }}>
        <Grid3x3 size={32} strokeWidth={1.2} />
        <p className="text-sm">Aucune publication</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
      {items.map(item => {
        const img = item.thumbnail_url ?? item.banner_url;
        const isEvent = item._kind === 'event';
        const color = isEvent ? '#F59E0B' : '#FF7A2F';
        const date  = isEvent
          ? (item as Event).starts_at
          : (item as Concert).scheduled_at;
        return (
          <div key={item.id} className="flex gap-3 p-3 rounded-2xl transition-all cursor-pointer"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = color + '50')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <div className="w-16 h-16 rounded-xl shrink-0 overflow-hidden"
              style={{ background: 'var(--bg-secondary)' }}>
              {img
                ? <img src={img} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"
                    style={{ background: color + '20' }}>
                    {isEvent ? <Calendar size={20} color={color} /> : <Heart size={20} color={color} />}
                  </div>
              }
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: color + '20', color }}>
                {isEvent ? 'Événement' : 'Concert'}
              </span>
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
              {item.description && (
                <p className="text-xs line-clamp-1" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
              )}
              {date && (
                <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                  <Calendar size={11} />
                  {format(new Date(date), 'd MMM yyyy', { locale: fr })}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Reels grid ────────────────────────────────────────────────────────────────
function ReelsTab({ userId }: { userId: string }) {
  const { items: reels, loading } = usePaginatedApi<Reel>(
    (p) => apiClient.get<PaginatedResponse<Reel>>(`${Endpoints.users.userReels(userId)}?page=${p}&limit=18`), [userId],
  );

  if (loading && reels.length === 0) {
    return <div className="flex justify-center py-16"><Spinner /></div>;
  }

  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16" style={{ color: 'var(--text-tertiary)' }}>
        <Play size={32} strokeWidth={1.2} />
        <p className="text-sm">Aucun reel publié</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-0.5 p-1">
      {reels.map(reel => (
        <div key={reel.id} className="relative overflow-hidden cursor-pointer group"
          style={{ aspectRatio: '9/16', maxHeight: 200 }}>
          {reel.thumbnail_url
            ? <img src={reel.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            : <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
                <Play size={20} style={{ color: 'var(--text-tertiary)' }} />
              </div>
          }
          <div className="absolute inset-0 flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }}>
            <span className="flex items-center gap-1 text-white text-xs font-semibold">
              <Eye size={12} />{reel.view_count >= 1000 ? `${(reel.view_count / 1000).toFixed(1)}k` : reel.view_count}
            </span>
          </div>
          <div className="absolute top-1.5 right-1.5">
            <Play size={12} color="#fff" fill="#fff" className="opacity-60" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── About tab ─────────────────────────────────────────────────────────────────
function AboutTab({ profile }: { profile: UserPublicProfile }) {
  const rows: { icon: React.ReactNode; label: string; value: string; href?: string }[] = [];

  if (profile.location)   rows.push({ icon: <MapPin size={15} />,      label: 'Habite à',      value: profile.location });
  if (profile.website)    rows.push({ icon: <Globe size={15} />,       label: 'Site web',      value: profile.website.replace(/^https?:\/\//, ''), href: profile.website });
  if ((profile as any).phone) rows.push({ icon: <Phone size={15} />,   label: 'Téléphone',     value: (profile as any).phone });
  if (profile.created_at) rows.push({ icon: <Calendar size={15} />,    label: 'Membre depuis', value: format(new Date(profile.created_at), 'MMMM yyyy', { locale: fr }) });

  return (
    <div className="p-4 space-y-3">
      {/* Role badge */}
      <div className="flex items-center gap-2 p-3 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: ROLE_COLOR[profile.role ?? 'user'] + '20' }}>
          <BadgeCheck size={18} color={ROLE_COLOR[profile.role ?? 'user']} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {ROLE_LABEL[profile.role ?? 'user']}
          </p>
          {profile.is_verified && (
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Compte vérifié</p>
          )}
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <div className="p-3 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{profile.bio}</p>
        </div>
      )}

      {/* Details */}
      {rows.length > 0 && (
        <div className="rounded-2xl divide-y overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderColor: 'var(--border)' }}>
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <span style={{ color: 'var(--text-tertiary)' }}>{r.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{r.label}</p>
                {r.href
                  ? <a href={r.href} target="_blank" rel="noreferrer"
                      className="text-sm font-medium truncate block hover:underline"
                      style={{ color: 'var(--primary)' }}>{r.value}</a>
                  : <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.value}</p>
                }
              </div>
            </div>
          ))}
        </div>
      )}

      {rows.length === 0 && !profile.bio && (
        <div className="flex flex-col items-center gap-2 py-10" style={{ color: 'var(--text-tertiary)' }}>
          <Info size={28} strokeWidth={1.2} />
          <p className="text-sm">Aucune info disponible</p>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UserProfilePage() {
  const { id }       = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const { user: me } = useAuthStore();
  const [tab,        setTab]        = useState<Tab>('publications');
  const [followed,   setFollowed]   = useState<boolean | null>(null);
  const [blocked,    setBlocked]    = useState<boolean | null>(null);

  const { data: profile, loading } = useApi<UserPublicProfile>(
    () => apiClient.get<UserPublicProfile>(Endpoints.users.publicProfile(id!)), [id],
  );

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!profile) return <div className="p-6 text-sm" style={{ color: 'var(--text-secondary)' }}>Profil introuvable.</div>;

  const isMe       = me?.id === id;
  const isFollowed = followed !== null ? followed : profile.is_followed;
  const isBlocked  = blocked  !== null ? blocked  : false;

  async function toggleFollow() {
    if (isBlocked) return;
    setFollowed(!isFollowed);
    try {
      if (isFollowed) await apiClient.delete(Endpoints.users.follow(id!));
      else            await apiClient.post(Endpoints.users.follow(id!));
    } catch { setFollowed(isFollowed); }
  }

  async function toggleBlock() {
    setBlocked(!isBlocked);
    try {
      if (isBlocked) await apiClient.delete(Endpoints.users.block(id!));
      else           await apiClient.post(Endpoints.users.block(id!));
    } catch { setBlocked(isBlocked); }
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'publications', label: 'Publications', icon: <Grid3x3 size={15} /> },
    { id: 'reels',        label: 'Reels',        icon: <Play size={15} />    },
    { id: 'about',        label: 'À propos',     icon: <Info size={15} />    },
  ];

  const name = profile.display_name ?? profile.username ?? 'Utilisateur';

  return (
    <div className="max-w-2xl mx-auto pb-10">

      {/* ── Banner ── */}
      <div className="relative h-44 overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A,#FF7A2F)' }}>
        {profile.banner_url && (
          <img src={profile.banner_url} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.15)' }} />
      </div>

      {/* ── Avatar + actions ── */}
      <div className="px-5">
        <div className="flex items-end justify-between -mt-12 mb-4 relative z-10">
          <div className="ring-4 rounded-full" style={{ ringColor: 'var(--bg)' }}>
            <Avatar
              src={profile.avatar_url}
              name={name}
              size="xl"
              verified={profile.is_verified}
              className="ring-4 ring-offset-0"
              style={{ boxShadow: '0 0 0 4px var(--bg)' } as any}
            />
          </div>

          {!isMe && (
            <div className="flex items-center gap-2 mt-2">
              {/* Follow */}
              <button onClick={toggleFollow}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={isFollowed
                  ? { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
                  : { background: 'linear-gradient(135deg,#7B3FF2,#E0389A)', color: '#fff', border: 'none' }}>
                {isFollowed ? <><UserCheck size={15} /> Suivi</> : <><UserPlus size={15} /> Suivre</>}
              </button>

              {/* Message */}
              <button onClick={() => navigate('/messages', { state: { userId: id, userName: name } })}
                className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <MessageCircle size={17} />
              </button>

              {/* Block */}
              <button onClick={toggleBlock}
                className="flex items-center justify-center w-9 h-9 rounded-xl transition-all"
                style={{
                  background: isBlocked ? 'rgba(240,54,90,0.1)' : 'var(--bg-secondary)',
                  color:      isBlocked ? '#F0365A' : 'var(--text-tertiary)',
                  border:     `1px solid ${isBlocked ? 'rgba(240,54,90,0.3)' : 'var(--border)'}`,
                }}
                title={isBlocked ? 'Débloquer' : 'Bloquer'}>
                {isBlocked ? <Shield size={16} /> : <ShieldOff size={16} />}
              </button>
            </div>
          )}

          {isMe && (
            <button onClick={() => navigate('/settings')}
              className="mt-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
              Modifier le profil
            </button>
          )}
        </div>

        {/* ── Infos ── */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{name}</h1>
            {profile.is_verified && <BadgeCheck size={18} color="#7B3FF2" />}
            {profile.role && profile.role !== 'user' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: ROLE_COLOR[profile.role] + '20', color: ROLE_COLOR[profile.role] }}>
                {ROLE_LABEL[profile.role]}
              </span>
            )}
          </div>
          {profile.username && (
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>@{profile.username}</p>
          )}
          {profile.bio && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{profile.bio}</p>
          )}

          {/* Quick meta */}
          <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {profile.location && (
              <span className="flex items-center gap-1"><MapPin size={12} />{profile.location}</span>
            )}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 hover:underline" style={{ color: 'var(--primary)' }}>
                <Globe size={12} />{profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            {profile.created_at && (
              <span className="flex items-center gap-1">
                <Calendar size={12} />Membre {formatDistanceToNow(new Date(profile.created_at), { locale: fr, addSuffix: true })}
              </span>
            )}
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="flex rounded-2xl p-4 mb-5 divide-x"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', divideColor: 'var(--border)' }}>
          <Stat value={profile.followers_count ?? 0}  label="Abonnés"      />
          <Stat value={profile.following_count ?? 0}  label="Abonnements"  />
          <Stat value={(profile as any).posts_count ?? (profile as any).publications_count ?? 0} label="Publications" />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex px-5 gap-1 mb-1" style={{ borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-3 text-sm font-semibold transition-all relative"
            style={{ color: tab === t.id ? 'var(--primary)' : 'var(--text-tertiary)' }}>
            {t.icon}
            {t.label}
            {tab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: 'var(--primary)' }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tab === 'publications' && <PublicationsTab userId={id!} />}
      {tab === 'reels'        && <ReelsTab        userId={id!} />}
      {tab === 'about'        && <AboutTab        profile={profile} />}
    </div>
  );
}
