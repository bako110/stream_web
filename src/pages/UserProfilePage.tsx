import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { encodeId, decodeId } from '../utils/slugId';
import {
  MapPin, Globe, Phone, Calendar, UserPlus, UserCheck,
  MessageCircle, Play, Eye, Heart, Grid3x3, FileText,
  Info, ShieldOff, Shield,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { UserPublicProfile, Reel, Event, Concert, PaginatedResponse } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useApi, usePaginatedApi } from '../hooks/useApi';
import { useAuthStore } from '../store/authStore';
import { useWs } from '../context/WebSocketContext';
import { Avatar, VerifiedBadge } from '../components/ui/Avatar';
import { Spinner, PageLoader } from '../components/ui/Spinner';
import { HoverVideoPreview } from '../components/ui/HoverVideoPreview';

type Tab = 'publications' | 'reels' | 'about';

const ROLE_LABEL: Record<string, string> = {
  artist: 'Artiste',
  admin:  'Admin',
  user:   'Membre',
};
const ROLE_COLOR: Record<string, string> = {
  artist: '#7B3FF2',
  admin:  '#7B3FF2',
  user:   '#7B3FF2',
};

// ── Stat block ────────────────────────────────────────────────────────────────
function Stat({ value, label, onClick }: { value: number; label: string; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className="flex items-baseline gap-1.5 group">
      <span className="text-base font-black transition-colors" style={{ color: 'var(--text-primary)' }}>
        {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
      </span>
      <span className="text-sm transition-colors" style={{ color: 'var(--text-tertiary)' }}
        onMouseEnter={e => { if (onClick) e.currentTarget.style.color = 'var(--text-secondary)'; }}
        onMouseLeave={e => { if (onClick) e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
        {label}
      </span>
    </Tag>
  );
}

// ── Publications grid ─────────────────────────────────────────────────────────
function PublicationsTab({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { data: eventsData,   loading: evL } = useApi<any>(
    () => apiClient.get<any>(`${Endpoints.events.byUser(userId)}?limit=20`), [userId],
  );
  const { data: concertsData, loading: coL } = useApi<any>(
    () => apiClient.get<any>(`${Endpoints.concerts.byUser(userId)}?limit=20`), [userId],
  );
  const { data: postsData,    loading: poL } = useApi<any>(
    () => apiClient.get<any>(`${Endpoints.posts.byUser(userId)}?limit=20`), [userId],
  );

  const events:   any[] = eventsData?.items   ?? (Array.isArray(eventsData)   ? eventsData   : []);
  const concerts: any[] = concertsData?.items ?? (Array.isArray(concertsData) ? concertsData : []);
  const posts:    any[] = postsData?.items    ?? (Array.isArray(postsData)    ? postsData    : []);

  const items = [
    ...events.map(e  => ({ ...e,  _kind: 'event'   as const })),
    ...concerts.map(c => ({ ...c, _kind: 'concert' as const })),
    ...posts.map(p   => ({ ...p,  _kind: 'post'    as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (evL || coL || poL) {
    return (
      <div className="grid grid-cols-3 gap-1 p-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-lg animate-pulse" style={{ aspectRatio: '3/4', background: 'var(--bg-tertiary)' }} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20" style={{ color: 'var(--text-tertiary)' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
          <Grid3x3 size={26} strokeWidth={1.5} />
        </div>
        <p className="text-sm font-medium">Aucune publication</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 p-1">
      {items.map(item => {
        const isEvent   = item._kind === 'event';
        const isConcert = item._kind === 'concert';
        const isPost    = item._kind === 'post';

        const label = isEvent ? 'Événement' : isConcert ? 'Concert' : 'Post';
        const img   = item.thumbnail_url ?? item.banner_url ?? item.image_url;
        const title = item.title ?? item.body;

        const handleClick = () => {
          if (isEvent)   navigate(`/events/${encodeId(item.id)}`);
          if (isConcert) navigate(`/concerts/${encodeId(item.id)}`);
          if (isPost)    navigate(`/posts/${encodeId(item.id)}`);
        };

        return (
          <button key={`${item._kind}-${item.id}`}
            onClick={handleClick}
            className="relative overflow-hidden group text-left"
            style={{ aspectRatio: '3/4', borderRadius: 10, background: 'var(--bg-tertiary)' }}>
            {img ? (
              <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-3"
                style={{ background: 'linear-gradient(160deg,#7B3FF2 0%,#5B2EC4 100%)' }}>
                <p className="text-white text-xs font-medium leading-snug text-center line-clamp-5">
                  {title || (isPost ? 'Publication' : label)}
                </p>
              </div>
            )}

            {/* Badge type — coin haut-gauche */}
            <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
              {isPost ? <FileText size={9} /> : isEvent ? <Calendar size={9} /> : <Heart size={9} />}
              {label}
            </div>

            {/* Titre en bas — visible en permanence, pas seulement au survol */}
            {img && title && (
              <div className="absolute inset-x-0 bottom-0 px-2 py-1.5"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)' }}>
                <p className="text-white text-[11px] font-semibold line-clamp-2 leading-tight">{title}</p>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Reels grid ────────────────────────────────────────────────────────────────
function fmtCount(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function ReelsTab({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { items: reels, loading } = usePaginatedApi<Reel>(
    (p) => apiClient.get<PaginatedResponse<Reel>>(`${Endpoints.users.userReels(userId)}?page=${p}&limit=18`), [userId],
  );

  if (loading && reels.length === 0) {
    return (
      <div className="grid grid-cols-3 gap-1 p-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-lg animate-pulse" style={{ aspectRatio: '9/16', background: 'var(--bg-tertiary)' }} />
        ))}
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20" style={{ color: 'var(--text-tertiary)' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
          <Play size={26} strokeWidth={1.5} />
        </div>
        <p className="text-sm font-medium">Aucun reel publié</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 p-1">
      {reels.map(reel => (
        <HoverVideoPreview key={reel.id}
          src={reel.hls_url} poster={reel.thumbnail_url}
          className="relative overflow-hidden"
          style={{ aspectRatio: '9/16', borderRadius: 10, background: 'var(--bg-tertiary)' }}>
          <button
            onClick={() => navigate(`/reels?user=${encodeId(userId)}&id=${encodeId(reel.id)}`)}
            className="absolute inset-0 w-full h-full text-left">
            {!reel.thumbnail_url && !reel.hls_url && (
              <div className="w-full h-full flex items-center justify-center">
                <Play size={22} style={{ color: 'var(--text-tertiary)' }} />
              </div>
            )}
            {/* Overlay stats — visible en permanence (pas seulement au survol) */}
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 px-2 py-1.5"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)' }}>
              <Play size={11} color="#fff" fill="#fff" />
              <span className="text-white text-[11px] font-semibold">{fmtCount(reel.view_count)}</span>
            </div>
          </button>
        </HoverVideoPreview>
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
          <VerifiedBadge size={18} />
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
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>{profile.bio}</p>
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
  const { id: slug }  = useParams<{ id: string }>();
  const id             = decodeId(slug!);
  const navigate       = useNavigate();
  const { user: me }   = useAuthStore();
  const { liveUserIds, liveIdByUserId } = useWs();
  const [tab,            setTab]            = useState<Tab>('publications');
  const [followed,       setFollowed]       = useState<boolean | null>(null);
  const [blocked,        setBlocked]        = useState<boolean | null>(null);
  const [followersDelta, setFollowersDelta] = useState(0);

  const { data: profile, loading } = useApi<UserPublicProfile>(
    () => apiClient.get<UserPublicProfile>(Endpoints.users.publicProfile(id!)), [id],
  );

  // Réinitialise les états locaux quand on change d'utilisateur
  const prevId = useRef(id);
  if (prevId.current !== id) {
    prevId.current = id;
    setFollowed(null);
    setBlocked(null);
    setFollowersDelta(0);
  }

  if (loading) return <PageLoader />;
  if (!profile) return <div className="p-6 text-sm" style={{ color: 'var(--text-secondary)' }}>Profil introuvable.</div>;

  const isMe       = me?.id === id;
  const isFollowed = followed !== null ? followed : profile.is_followed;
  const isBlocked  = blocked  !== null ? blocked  : false;

  async function toggleFollow() {
    if (isBlocked) return;
    const wasFollowed = isFollowed;
    setFollowed(!wasFollowed);
    setFollowersDelta(d => d + (wasFollowed ? -1 : 1));
    try {
      if (wasFollowed) await apiClient.delete(Endpoints.users.follow(id!));
      else             await apiClient.post(Endpoints.users.follow(id!));
    } catch {
      setFollowed(wasFollowed);
      setFollowersDelta(d => d + (wasFollowed ? 1 : -1));
    }
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
    <div className="w-full mx-auto pb-10">

      {/* ── Banner ── */}
      <div className="relative h-48 overflow-hidden">
        {profile.banner_url ? (
          <img src={profile.banner_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: 'linear-gradient(160deg,#7B3FF2 0%,#5B2EC4 55%,#3B1E80 100%)' }}>
            <div className="w-full h-full opacity-30" style={{
              backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.25) 0%, transparent 45%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.15) 0%, transparent 40%)',
            }} />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 45%)' }} />
      </div>

      {/* ── Avatar + actions ── */}
      <div className="px-5">
        <div className="flex items-end justify-between -mt-14 mb-4 relative z-10">
          <div
            className="rounded-full"
            style={{
              boxShadow: '0 0 0 4px var(--bg)', background: 'var(--bg)',
              cursor: liveIdByUserId.has(profile.id) ? 'pointer' : undefined,
            }}
            onClick={() => {
              const liveId = liveIdByUserId.get(profile.id);
              if (liveId) navigate(`/lives/${encodeId(liveId)}`);
            }}
          >
            <Avatar
              src={profile.avatar_url}
              name={name}
              size="xl"
              verified={profile.is_verified}
              isLive={profile.is_live || liveUserIds.has(profile.id)}
            />
          </div>

          {!isMe && (
            <div className="flex items-center gap-2 mb-1">
              {/* Follow */}
              <button onClick={toggleFollow}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all"
                style={isFollowed
                  ? { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
                  : { background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', color: '#fff', border: 'none', boxShadow: '0 4px 14px rgba(123,63,242,0.35)' }}>
                {isFollowed ? <><UserCheck size={15} /> Suivi</> : <><UserPlus size={15} /> Suivre</>}
              </button>

              {/* Message — masqué si l'utilisateur n'accepte pas les messages */}
              {profile.privacy_allow_messages !== false ? (
                <button onClick={() => navigate(`/messages/${encodeId(id)}`)}
                  className="flex items-center justify-center w-10 h-10 rounded-full transition-all"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                  <MessageCircle size={17} />
                </button>
              ) : (
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-full"
                  title="Cet utilisateur n'accepte pas les messages privés"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-disabled)', border: '1px solid var(--border)', opacity: 0.4, cursor: 'not-allowed' }}>
                  <MessageCircle size={17} />
                </div>
              )}

              {/* Block */}
              <button onClick={toggleBlock}
                className="flex items-center justify-center w-10 h-10 rounded-full transition-all"
                style={{
                  background: isBlocked ? 'rgba(123,63,242,0.1)' : 'var(--bg-secondary)',
                  color:      isBlocked ? '#7B3FF2' : 'var(--text-tertiary)',
                  border:     `1px solid ${isBlocked ? 'rgba(123,63,242,0.3)' : 'var(--border)'}`,
                }}
                title={isBlocked ? 'Débloquer' : 'Bloquer'}>
                {isBlocked ? <Shield size={16} /> : <ShieldOff size={16} />}
              </button>
            </div>
          )}

          {isMe && (
            <button onClick={() => navigate('/settings')}
              className="mb-1 px-4 py-2 rounded-full text-sm font-bold transition-all"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
              Modifier le profil
            </button>
          )}
        </div>

        {/* ── Infos ── */}
        <div className="space-y-2.5 mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{name}</h1>
            {profile.is_verified && <VerifiedBadge size={18} />}
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

          {/* Stats — inline sous le nom, style Instagram */}
          <div className="flex items-center gap-4">
            <Stat value={(profile.followers_count ?? 0) + followersDelta}  label="Abonnés"      />
            <Stat value={profile.following_count ?? 0}  label="Abonnements"  />
            <Stat value={profile.publications_count ?? 0} label="Publications" />
          </div>

          {profile.bio && (
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{profile.bio}</p>
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
      </div>

      {/* ── Tabs ── */}
      <div className="flex px-5 gap-1.5 mb-1 sticky top-0 z-10 py-2"
        style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-full transition-all"
            style={tab === t.id
              ? { background: 'var(--primary)', color: '#fff' }
              : { background: 'transparent', color: 'var(--text-tertiary)' }}>
            {t.icon}
            {t.label}
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
