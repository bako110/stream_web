import { useState, useRef, useCallback, useEffect } from 'react';
import { encodeId } from '../utils/slugId';
import type { ChangeEvent } from 'react';
import {
  Camera, Edit3, MapPin, Globe, Calendar, Play, Eye,
  Grid3x3, Info, BadgeCheck, Heart, ImagePlus, Users, FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { User, Reel, Event, Concert, PaginatedResponse } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { useApi, usePaginatedApi } from '../hooks/useApi';
import { Avatar } from '../components/ui/Avatar';
import { Spinner, PageLoader } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';

type Tab = 'reels' | 'publications' | 'about';

// ── Stats ─────────────────────────────────────────────────────────────────────
function Stat({ value, label, onClick }: { value: number; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 flex-1 transition-opacity"
      style={{ cursor: onClick ? 'pointer' : 'default', opacity: 1 }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.opacity = '0.7'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>
      <span className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
        {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
      </span>
      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
    </button>
  );
}

// ── Edit Profile Modal ────────────────────────────────────────────────────────
function EditProfileModal({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: () => void }) {
  const { updateUser } = useAuthStore();
  const [form, setForm] = useState({
    first_name:   user.first_name   ?? '',
    last_name:    user.last_name    ?? '',
    username:     user.username     ?? '',
    display_name: user.display_name ?? '',
    bio:          user.bio          ?? '',
    location:     user.location     ?? '',
    website:      user.website      ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  function field(k: string) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));
  }

  async function save() {
    setSaving(true); setError('');
    try {
      const res = await apiClient.patch<User>(Endpoints.users.updateMe, form);
      updateUser(res.data);
      onSaved(); onClose();
    } catch { setError('Impossible de sauvegarder. Réessayez.'); }
    finally { setSaving(false); }
  }

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all";
  const inputStyle = { background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' };

  return (
    <Modal open onClose={onClose} title="Modifier le profil" size="lg">
      <div className="space-y-4">
        {error && (
          <div className="px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(123,63,242,0.08)', border: '1px solid rgba(123,63,242,0.25)', color: '#7B3FF2' }}>
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Prénom</label>
            <input className={inputCls} style={inputStyle} value={form.first_name} onChange={field('first_name')} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nom</label>
            <input className={inputCls} style={inputStyle} value={form.last_name} onChange={field('last_name')} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nom d'affichage</label>
          <input className={inputCls} style={inputStyle} value={form.display_name} onChange={field('display_name')} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nom d'utilisateur</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-tertiary)' }}>@</span>
            <input className={inputCls + ' pl-7'} style={inputStyle} value={form.username} onChange={field('username')} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Bio</label>
          <textarea className={inputCls + ' resize-none'} style={inputStyle} rows={3} maxLength={300}
            value={form.bio} onChange={field('bio')} />
          <p className="text-right text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>{form.bio.length}/300</p>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Localisation</label>
          <input className={inputCls} style={inputStyle} value={form.location} onChange={field('location')} placeholder="Paris, France" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Site web</label>
          <input className={inputCls} style={inputStyle} type="url" placeholder="https://" value={form.website} onChange={field('website')} />
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            Annuler
          </button>
          <button onClick={save} disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
            {saving ? <><Spinner size="sm" />Enregistrement…</> : 'Enregistrer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Followers/Following modal ─────────────────────────────────────────────────
function FollowListModal({ userId, type, onClose }: {
  userId: string; type: 'followers' | 'following'; onClose: () => void;
}) {
  const navigate = useNavigate();
  const endpoint = type === 'followers' ? Endpoints.users.followers(userId) : Endpoints.users.following(userId);
  const { data, loading } = useApi<any[]>(() => apiClient.get<any[]>(`${endpoint}?limit=50`), [userId, type]);
  const items = data ?? [];

  return (
    <Modal open onClose={onClose} title={type === 'followers' ? 'Abonnés' : 'Abonnements'} size="md">
      {loading ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10" style={{ color: 'var(--text-tertiary)' }}>
          <Users size={32} strokeWidth={1.2} />
          <p className="text-sm">Aucun résultat</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {items.map((u: any) => {
            const name = u.display_name ?? u.username ?? 'Utilisateur';
            return (
              <button key={u.id}
                onClick={() => { onClose(); navigate(`/user/${encodeId(u.id)}`); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                style={{ background: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <Avatar src={u.avatar_url} name={name} size="sm" verified={u.is_verified} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
                  {u.username && <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>@{u.username}</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// ── Publications tab ──────────────────────────────────────────────────────────
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

  if (evL || coL || poL) return <PageLoader />;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16" style={{ color: 'var(--text-tertiary)' }}>
        <Grid3x3 size={32} strokeWidth={1.2} />
        <p className="text-sm">Aucune publication</p>
        <p className="text-xs mt-0.5">Vos posts, événements et concerts apparaîtront ici.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {items.map(item => {
        const isEvent   = item._kind === 'event';
        const isConcert = item._kind === 'concert';
        const isPost    = item._kind === 'post';
        const color     = isEvent ? '#7B3FF2' : isConcert ? '#7B3FF2' : '#7B3FF2';
        const label     = isEvent ? 'Événement' : isConcert ? 'Concert' : 'Post';
        const img       = item.thumbnail_url ?? item.banner_url ?? item.image_url;
        const date      = isEvent ? item.starts_at : isConcert ? item.scheduled_at : item.created_at;

        return (
          <div key={`${item._kind}-${item.id}`}
            className="flex gap-3 p-3 rounded-2xl cursor-pointer transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onClick={() => navigate(isEvent ? `/events/${encodeId(item.id)}` : isConcert ? `/concerts/${encodeId(item.id)}` : `/posts/${encodeId(item.id)}`)}
            onMouseEnter={e => (e.currentTarget.style.borderColor = color + '60')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <div className="w-14 h-14 rounded-xl shrink-0 overflow-hidden flex items-center justify-center"
              style={{ background: img ? undefined : color + '15' }}>
              {img
                ? <img src={img} alt="" className="w-full h-full object-cover" />
                : isPost
                  ? <FileText size={20} color={color} />
                  : isEvent
                    ? <Calendar size={20} color={color} />
                    : <Heart size={20} color={color} />
              }
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: color + '18', color }}>
                {label}
              </span>
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {isPost ? (item.body?.slice(0, 80) ?? '') : item.title}
              </p>
              {!isPost && item.description && (
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

// ── Reels tab ─────────────────────────────────────────────────────────────────
function ReelsTab({ userId }: { userId: string }) {
  const { items: reels, loading } = usePaginatedApi<Reel>(
    (p) => apiClient.get<PaginatedResponse<Reel>>(`${Endpoints.users.userReels(userId)}?page=${p}&limit=18`),
    [userId],
  );

  if (loading && reels.length === 0) return <PageLoader />;

  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16" style={{ color: 'var(--text-tertiary)' }}>
        <Play size={32} strokeWidth={1.2} />
        <p className="text-sm">Aucun reel publié</p>
        <p className="text-xs mt-0.5">Publiez votre premier reel !</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-0.5 p-1">
      {reels.map(reel => (
        <div key={reel.id}
          className="relative overflow-hidden cursor-pointer group"
          style={{ aspectRatio: '9/16', maxHeight: 200, background: 'var(--bg-tertiary)' }}>
          {reel.thumbnail_url
            ? <img src={reel.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            : <div className="w-full h-full flex items-center justify-center">
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
function AboutTab({ user }: { user: User }) {
  const ROLE_LABEL: Record<string, string> = { artist: 'Artiste', admin: 'Admin', user: 'Membre' };
  const ROLE_COLOR: Record<string, string> = { artist: '#7B3FF2', admin: '#7B3FF2', user: '#7B3FF2' };
  const color = ROLE_COLOR[user.role] ?? '#7B3FF2';

  return (
    <div className="p-4 space-y-3">
      {/* Role */}
      <div className="flex items-center gap-3 p-3.5 rounded-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: color + '20' }}>
          <BadgeCheck size={18} color={color} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ROLE_LABEL[user.role] ?? 'Membre'}</p>
          {user.is_verified && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Compte vérifié</p>}
        </div>
      </div>

      {/* Bio */}
      {user.bio && (
        <div className="p-3.5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{user.bio}</p>
        </div>
      )}

      {/* Details */}
      {[
        user.location  && { icon: <MapPin size={15}/>,    label: 'Habite à',      value: user.location,                                      href: undefined },
        user.website   && { icon: <Globe size={15}/>,     label: 'Site web',      value: user.website.replace(/^https?:\/\//, ''),            href: user.website },
        user.created_at && { icon: <Calendar size={15}/>, label: 'Membre depuis', value: format(new Date(user.created_at), 'MMMM yyyy', { locale: fr }), href: undefined },
      ].filter(Boolean).map((r: any, i, arr) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
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

      {!user.bio && !user.location && !user.website && (
        <div className="flex flex-col items-center gap-2 py-10" style={{ color: 'var(--text-tertiary)' }}>
          <Info size={28} strokeWidth={1.2} />
          <p className="text-sm">Aucune info disponible</p>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, fetchMe } = useAuthStore();
  const navigate          = useNavigate();
  const [tab,             setTab]             = useState<Tab>('reels');
  const [editOpen,        setEditOpen]        = useState(false);
  const [followModal,     setFollowModal]     = useState<'followers' | 'following' | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [socialCounts,    setSocialCounts]    = useState({ followers: 0, following: 0, publications: 0 });
  const [refreshKey,      setRefreshKey]      = useState(0);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Recharge à chaque mount (équivalent useFocusEffect mobile)
  const loadCounts = useCallback(async () => {
    if (!user) return;
    try {
      await fetchMe(); // données fraîches du user connecté
      const res = await apiClient.get<any>(Endpoints.users.publicProfile(user.id));
      setSocialCounts({
        followers:    res.data?.followers_count  ?? 0,
        following:    res.data?.following_count  ?? 0,
        publications: res.data?.posts_count ?? res.data?.publications_count ?? 0,
      });
    } catch { /* silencieux */ }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // S'exécute à chaque montage du composant (navigation vers /profile)
  useEffect(() => {
    loadCounts();
    setRefreshKey(k => k + 1); // force remontage des tabs pour recharger les données
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaved = useCallback(async () => {
    await loadCounts();
  }, [loadCounts]);

  async function uploadAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiClient.upload<{ url: string }>(Endpoints.upload.images('avatars'), fd);
      await apiClient.patch(Endpoints.users.updateMe, { avatar_url: res.data.url });
      await fetchMe();
    } finally { setUploadingAvatar(false); e.target.value = ''; }
  }

  async function uploadBanner(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingBanner(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiClient.upload<{ url: string }>(Endpoints.upload.images('banners'), fd);
      await apiClient.patch(Endpoints.users.updateMe, { banner_url: res.data.url });
      await fetchMe();
    } finally { setUploadingBanner(false); e.target.value = ''; }
  }

  if (!user) return <PageLoader />;

  const fullName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
  const displayName = user.display_name ?? (fullName || (user.username ?? 'Utilisateur'));

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'reels',        label: 'Reels',        icon: <Play size={15} />      },
    { id: 'publications', label: 'Publications',  icon: <Grid3x3 size={15} />  },
    { id: 'about',        label: 'À propos',      icon: <Info size={15} />     },
  ];

  return (
    <div className="max-w-3xl mx-auto pb-10">

      {/* ── Banner ── */}
      <div className="relative h-44 overflow-hidden group"
        style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
        {user.banner_url && (
          <img src={user.banner_url} className="w-full h-full object-cover" alt="" />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.3))' }} />
        {/* Banner edit button */}
        <button
          onClick={() => bannerInputRef.current?.click()}
          disabled={uploadingBanner}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-all"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
          {uploadingBanner ? <Spinner size="sm" /> : <><ImagePlus size={13} /> Modifier</>}
        </button>
        <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={uploadBanner} />
      </div>

      {/* ── Header ── */}
      <div className="px-5 pb-2" style={{ background: 'var(--bg)' }}>
        <div className="flex items-end justify-between -mt-12 mb-4 relative z-10">
          {/* Avatar */}
          <div className="relative">
            <div className="rounded-full p-1" style={{ background: 'var(--bg)' }}>
              <Avatar src={user.avatar_url} name={displayName} size="xl" verified={user.is_verified} />
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-1 right-1 p-1.5 rounded-full transition-all"
              style={{ background: 'var(--surface)', border: '2px solid var(--bg)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
              {uploadingAvatar ? <Spinner size="sm" /> : <Camera size={13} />}
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2">
            <button onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <Edit3 size={14} /> Modifier le profil
            </button>
          </div>
        </div>

        {/* Name + badge */}
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{displayName}</h1>
          {user.is_verified && <BadgeCheck size={18} color="#7B3FF2" />}
          {user.role && user.role !== 'user' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: user.role === 'artist' ? 'rgba(123,63,242,0.12)' : 'rgba(123,63,242,0.12)',
                       color: user.role === 'artist' ? '#7B3FF2' : '#7B3FF2' }}>
              {user.role === 'artist' ? 'Artiste' : 'Admin'}
            </span>
          )}
        </div>
        {user.username && (
          <p className="text-sm mb-2" style={{ color: 'var(--text-tertiary)' }}>@{user.username}</p>
        )}
        {user.bio && (
          <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{user.bio}</p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap gap-3 text-xs mb-5" style={{ color: 'var(--text-tertiary)' }}>
          {user.location && (
            <span className="flex items-center gap-1"><MapPin size={12} />{user.location}</span>
          )}
          {user.website && (
            <a href={user.website} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 hover:underline" style={{ color: 'var(--primary)' }}>
              <Globe size={12} />{user.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          {user.created_at && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              Membre depuis {format(new Date(user.created_at), 'MMM yyyy', { locale: fr })}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex rounded-2xl p-4 mb-5 divide-x"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Stat value={socialCounts.followers}    label="Abonnés"      onClick={() => setFollowModal('followers')} />
          <Stat value={socialCounts.following}    label="Abonnements"  onClick={() => setFollowModal('following')} />
          <Stat value={socialCounts.publications} label="Publications" />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex px-5 gap-1 mb-1" style={{ borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-3 text-sm font-semibold transition-all relative"
            style={{ color: tab === t.id ? 'var(--primary)' : 'var(--text-tertiary)' }}>
            {t.icon}{t.label}
            {tab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: 'var(--primary)' }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tab === 'reels'        && <ReelsTab        key={`reels-${refreshKey}`}        userId={user.id} />}
      {tab === 'publications' && <PublicationsTab key={`pubs-${refreshKey}`}         userId={user.id} />}
      {tab === 'about'        && <AboutTab        user={user} />}

      {/* Modals */}
      {editOpen && (
        <EditProfileModal user={user} onClose={() => setEditOpen(false)} onSaved={handleSaved} />
      )}
      {followModal && user && (
        <FollowListModal userId={user.id} type={followModal} onClose={() => setFollowModal(null)} />
      )}
    </div>
  );
}
