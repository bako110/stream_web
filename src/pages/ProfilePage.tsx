import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Camera, Edit3, MapPin, Globe, Calendar, Play, Eye, Grid3x3 } from 'lucide-react';
import type { User, Reel, PaginatedResponse } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { usePaginatedApi } from '../hooks/useApi';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

  function setField(k: string) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));
  }

  async function save() {
    setSaving(true); setError('');
    try {
      const res = await apiClient.patch<User>(Endpoints.users.updateMe, form);
      updateUser(res.data);
      onSaved(); onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title="Modifier le profil" size="lg">
      <div className="space-y-4">
        {error && (
          <div className="px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(240,54,90,0.08)', border: '1px solid rgba(240,54,90,0.25)', color: '#F0365A' }}>
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Prénom</label>
            <input className="input" value={form.first_name} onChange={setField('first_name')} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nom</label>
            <input className="input" value={form.last_name} onChange={setField('last_name')} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nom d'affichage</label>
          <input className="input" value={form.display_name} onChange={setField('display_name')} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nom d'utilisateur</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-tertiary)' }}>@</span>
            <input className="input pl-7" value={form.username} onChange={setField('username')} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Bio</label>
          <textarea className="input resize-none" rows={3} value={form.bio} onChange={setField('bio')} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Localisation</label>
          <input className="input" value={form.location} onChange={setField('location')} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Site web</label>
          <input className="input" type="url" placeholder="https://" value={form.website} onChange={setField('website')} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function ProfilePage() {
  const { user, fetchMe } = useAuthStore();
  const [editOpen, setEditOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { items: reels, loading: reelsLoading } = usePaginatedApi<Reel>(
    (p) => user
      ? apiClient.get<PaginatedResponse<Reel>>(`${Endpoints.users.userReels(user.id)}?page=${p}&limit=18`)
      : Promise.reject(),
    [user?.id],
  );

  async function uploadAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await apiClient.upload<{ url: string }>(Endpoints.upload.images('avatars'), fd);
    await apiClient.patch(Endpoints.users.updateMe, { avatar_url: res.data.url });
    await fetchMe();
  }

  if (!user) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const displayName = user.display_name ?? (`${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.username);

  const stats = [
    { label: 'Reels', value: reels.length, icon: <Grid3x3 size={14} /> },
  ];

  return (
    <div className="max-w-3xl mx-auto">

      {/* Banner */}
      <div className="relative h-44 overflow-hidden" style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A,#FF7A2F)' }}>
        {user.banner_url && (
          <img src={user.banner_url} className="w-full h-full object-cover" alt="" />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.3))' }} />
      </div>

      {/* Header */}
      <div className="px-6 pb-6" style={{ background: 'var(--bg)' }}>
        <div className="flex items-end justify-between -mt-14 mb-5">
          <div className="relative">
            <div className="rounded-full p-1" style={{ background: 'var(--bg)' }}>
              <Avatar
                src={user.avatar_url}
                name={displayName ?? ''}
                size="xl"
                verified={user.is_verified}
              />
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="absolute bottom-1 right-1 p-1.5 rounded-full transition-all"
              style={{ background: 'var(--surface)', border: '2px solid var(--bg)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
              <Camera size={13} />
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
          </div>

          <button onClick={() => setEditOpen(true)}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all mt-2"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <Edit3 size={14} /> Modifier le profil
          </button>
        </div>

        {/* Name & username */}
        <div className="space-y-1 mb-4">
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{displayName}</h1>
          {user.username && (
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>@{user.username}</p>
          )}
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{user.bio}</p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap gap-4 text-sm mb-5" style={{ color: 'var(--text-tertiary)' }}>
          {user.location && (
            <span className="flex items-center gap-1.5"><MapPin size={13} />{user.location}</span>
          )}
          {user.website && (
            <a href={user.website} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 transition-colors"
              style={{ color: 'var(--primary)' }}>
              <Globe size={13} />{user.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          {user.created_at && (
            <span className="flex items-center gap-1.5">
              <Calendar size={13} />
              Membre depuis {format(new Date(user.created_at), 'MMM yyyy', { locale: fr })}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-6">
          {stats.map(({ label, value, icon }) => (
            <div key={label} className="text-center">
              <p className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{value.toLocaleString()}</p>
              <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                {icon} {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--border)' }} />

      {/* Reels grid */}
      <div className="px-6 py-5">
        <div className="flex items-center gap-2 mb-4">
          <Grid3x3 size={16} style={{ color: 'var(--primary)' }} />
          <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Reels</h2>
        </div>

        {reelsLoading && reels.length === 0 ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : reels.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: 'var(--bg-secondary)' }}>
              <Play size={22} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Aucun reel</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Vos reels apparaîtront ici.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {reels.map(reel => (
              <div key={reel.id}
                className="relative overflow-hidden cursor-pointer group"
                style={{ aspectRatio: '1/1', background: 'var(--bg-tertiary)' }}>
                {reel.thumbnail_url ? (
                  <img src={reel.thumbnail_url} alt=""
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play size={20} style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                  style={{ background: 'rgba(0,0,0,0.5)' }}>
                  <div className="flex items-center gap-1.5 text-white text-sm font-semibold">
                    <Eye size={14} />
                    {(reel.view_count ?? 0).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editOpen && (
        <EditProfileModal
          user={user}
          onClose={() => setEditOpen(false)}
          onSaved={() => fetchMe()}
        />
      )}
    </div>
  );
}
