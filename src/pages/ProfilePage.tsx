import { useState, useRef, useCallback, useEffect } from 'react';
import { encodeId } from '../utils/slugId';
import type { ChangeEvent } from 'react';
import {
  Camera, Edit3, MapPin, Globe, Calendar, Play, Eye,
  Grid3x3, Info, Heart, ImagePlus, Users, FileText, Phone, Gift,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { User, Reel, Event, Concert, PaginatedResponse } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { useApi, usePaginatedApi } from '../hooks/useApi';
import { Avatar, VerifiedBadge } from '../components/ui/Avatar';
import { Spinner, PageLoader } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { HoverVideoPreview } from '../components/ui/HoverVideoPreview';

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
  const { updateUser, fetchMe } = useAuthStore();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [localUser, setLocalUser] = useState<User>(user);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [form, setForm] = useState({
    first_name:    user.first_name    ?? '',
    last_name:     user.last_name     ?? '',
    username:      user.username      ?? '',
    display_name:  user.display_name  ?? '',
    bio:           user.bio           ?? '',
    location:      user.location      ?? '',
    website:       user.website       ?? '',
    phone:         (user as any).phone         ?? '',
    date_of_birth: (user as any).date_of_birth ?? '',
    gender:        (user as any).gender        ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  function field(k: string) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));
  }

  async function handleUploadAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Prévisualisation locale immédiate
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiClient.upload<{ uploaded: { url: string }[] }>(Endpoints.upload.images('avatars'), fd);
      const url = res.data.uploaded?.[0]?.url ?? (res.data as any).url;
      await apiClient.patch<User>(Endpoints.users.updateMe, { avatar_url: url });
      await fetchMe();
      setLocalUser(u => ({ ...u, avatar_url: url }));
      setAvatarPreview(null);
      URL.revokeObjectURL(preview);
    } catch {
      setAvatarPreview(null);
      URL.revokeObjectURL(preview);
      setError('Impossible de mettre à jour la photo de profil.');
    }
    finally { setUploadingAvatar(false); e.target.value = ''; }
  }

  async function handleUploadBanner(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Prévisualisation locale immédiate
    const preview = URL.createObjectURL(file);
    setBannerPreview(preview);
    setUploadingBanner(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiClient.upload<{ uploaded: { url: string }[] }>(Endpoints.upload.images('banners'), fd);
      const url = res.data.uploaded?.[0]?.url ?? (res.data as any).url;
      await apiClient.patch<User>(Endpoints.users.updateMe, { banner_url: url });
      await fetchMe();
      setLocalUser(u => ({ ...u, banner_url: url }));
      setBannerPreview(null);
      URL.revokeObjectURL(preview);
    } catch {
      setBannerPreview(null);
      URL.revokeObjectURL(preview);
      setError('Impossible de mettre à jour la photo de couverture.');
    }
    finally { setUploadingBanner(false); e.target.value = ''; }
  }

  async function save() {
    setSaving(true); setError('');
    try {
      const payload: Record<string, any> = {};
      for (const [k, v] of Object.entries(form)) {
        if (v !== '') payload[k] = v;
      }
      const res = await apiClient.patch<User>(Endpoints.users.updateMe, payload);
      updateUser(res.data);
      onSaved(); onClose();
    } catch { setError('Impossible de sauvegarder. Réessayez.'); }
    finally { setSaving(false); }
  }

  const displayName = localUser.display_name ?? localUser.username ?? 'Utilisateur';
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

        {/* ── Photos ── */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {/* Bannière */}
          <div className="relative h-32 cursor-pointer group"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}
            onClick={() => !uploadingBanner && bannerInputRef.current?.click()}>
            {(bannerPreview ?? localUser.banner_url) && (
              <img src={bannerPreview ?? localUser.banner_url!} className="w-full h-full object-cover" alt="" />
            )}
            {/* overlay hover */}
            <div className="absolute inset-0 flex items-center justify-center transition-opacity"
              style={{ background: uploadingBanner ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)',
                       opacity: uploadingBanner ? 1 : undefined }}
              onMouseEnter={e => { if (!uploadingBanner) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.4)'; }}
              onMouseLeave={e => { if (!uploadingBanner) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0)'; }}>
              {uploadingBanner ? (
                <div className="flex flex-col items-center gap-2 text-white">
                  <Spinner size="sm" />
                  <span className="text-xs font-semibold">Téléchargement…</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={15} />
                  {(bannerPreview ?? localUser.banner_url) ? 'Changer la couverture' : 'Ajouter une couverture'}
                </div>
              )}
            </div>
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadBanner} />
          </div>

          {/* Avatar superposé comme Facebook */}
          <div className="px-4 pb-3" style={{ background: 'var(--surface)' }}>
            <div className="flex items-end justify-between -mt-10 mb-2">
              <div className="relative">
                <div className="rounded-full p-1" style={{ background: 'var(--surface)', display: 'inline-block' }}>
                  <div className="w-20 h-20 rounded-full overflow-hidden"
                    style={{ border: '3px solid var(--surface)' }}>
                    {(avatarPreview ?? localUser.avatar_url)
                      ? <img src={avatarPreview ?? localUser.avatar_url!} className="w-full h-full object-cover" alt="" />
                      : <div className="w-full h-full flex items-center justify-center text-white text-2xl font-black"
                          style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
                          {displayName[0]?.toUpperCase()}
                        </div>
                    }
                  </div>
                </div>
                <button type="button"
                  onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-1 right-1 p-1.5 rounded-full transition-all"
                  style={{ background: uploadingAvatar ? 'var(--bg-secondary)' : '#7B3FF2',
                           border: '2px solid var(--surface)', color: '#fff' }}>
                  {uploadingAvatar ? <Spinner size="sm" /> : <Camera size={12} />}
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} />
              </div>
              <p className="text-xs pb-1" style={{ color: 'var(--text-tertiary)' }}>
                Cliquez sur la bannière ou l'avatar pour les modifier
              </p>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }} />

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
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Téléphone</label>
          <div className="relative">
            <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
            <input className={inputCls + ' pl-9'} style={inputStyle} type="tel" placeholder="+33..." value={form.phone} onChange={field('phone')} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Date de naissance</label>
          <div className="relative">
            <Gift size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
            <input className={inputCls + ' pl-9'} style={inputStyle} type="date" value={form.date_of_birth} onChange={field('date_of_birth')}
              max={new Date().toISOString().split('T')[0]} min="1920-01-01" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Genre</label>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'male',              label: 'Homme'       },
              { key: 'female',            label: 'Femme'       },
              { key: 'other',             label: 'Autre'       },
              { key: 'prefer_not_to_say', label: 'Non précisé' },
            ].map(opt => (
              <button key={opt.key} type="button"
                onClick={() => setForm(f => ({ ...f, gender: f.gender === opt.key ? '' : opt.key }))}
                className="flex-1 min-w-[100px] px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={form.gender === opt.key
                  ? { background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', color: '#fff', border: '1px solid #7B3FF2' }
                  : { background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                {opt.label}
              </button>
            ))}
          </div>
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
        <p className="text-xs">Vos posts, événements et concerts apparaîtront ici.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 p-1">
      {items.map(item => {
        const isEvent   = item._kind === 'event';
        const isConcert = item._kind === 'concert';
        const isPost    = item._kind === 'post';
        const label     = isEvent ? 'Événement' : isConcert ? 'Concert' : 'Post';
        const img       = item.thumbnail_url ?? item.banner_url ?? item.image_url;
        const title     = item.title ?? item.body;

        return (
          <button key={`${item._kind}-${item.id}`}
            onClick={() => navigate(isEvent ? `/events/${encodeId(item.id)}` : isConcert ? `/concerts/${encodeId(item.id)}` : `/posts/${encodeId(item.id)}`)}
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

            <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
              {isPost ? <FileText size={9} /> : isEvent ? <Calendar size={9} /> : <Heart size={9} />}
              {label}
            </div>

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

// ── Reels tab ─────────────────────────────────────────────────────────────────
function ReelsTab({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { items: reels, loading } = usePaginatedApi<Reel>(
    (p) => apiClient.get<PaginatedResponse<Reel>>(`${Endpoints.users.userReels(userId)}?page=${p}&limit=18`),
    [userId],
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
        <p className="text-xs">Publiez votre premier reel !</p>
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
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 px-2 py-1.5"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)' }}>
              <Play size={11} color="#fff" fill="#fff" />
              <span className="text-white text-[11px] font-semibold">
                {reel.view_count >= 1000 ? `${(reel.view_count / 1000).toFixed(1)}k` : reel.view_count}
              </span>
            </div>
          </button>
        </HoverVideoPreview>
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
          <VerifiedBadge size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ROLE_LABEL[user.role] ?? 'Membre'}</p>
          {user.is_verified && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Compte vérifié</p>}
        </div>
      </div>

      {/* Bio */}
      {user.bio && (
        <div className="p-3.5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>{user.bio}</p>
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
  const location          = useLocation();
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
        publications: res.data?.publications_count ?? 0,
      });
    } catch { /* silencieux */ }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Se relance à chaque navigation vers /profile (équivalent useFocusEffect mobile)
  useEffect(() => {
    loadCounts();
    setRefreshKey(k => k + 1);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const res = await apiClient.upload<{ uploaded: { url: string }[] }>(Endpoints.upload.images('avatars'), fd);
      const url = res.data.uploaded?.[0]?.url;
      if (url) await apiClient.patch(Endpoints.users.updateMe, { avatar_url: url });
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
      const res = await apiClient.upload<{ uploaded: { url: string }[] }>(Endpoints.upload.images('banners'), fd);
      const url = res.data.uploaded?.[0]?.url;
      if (url) await apiClient.patch(Endpoints.users.updateMe, { banner_url: url });
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
          {user.is_verified && <VerifiedBadge size={18} />}
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
          <p className="text-sm leading-relaxed mb-3 whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{user.bio}</p>
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
        <EditProfileModal user={user} onClose={() => { setEditOpen(false); loadCounts(); }} onSaved={handleSaved} />
      )}
      {followModal && user && (
        <FollowListModal userId={user.id} type={followModal} onClose={() => setFollowModal(null)} />
      )}
    </div>
  );
}
