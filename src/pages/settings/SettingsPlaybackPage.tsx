import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Play, Shield, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import toast from 'react-hot-toast';
import { setPlaybackPrefs } from '../../hooks/usePlaybackPrefs';

interface PlaybackPrefs {
  autoplay: boolean;
  hd_streaming: boolean;
  record_live_enabled: boolean;
  /** Réglage mobile, non éditable ici — conservé pour que le PUT ne le réinitialise pas. */
  reels_show_interface?: boolean;
  /** Stocké côté backend dans /users/me/app-preferences (pas /playback). */
  feed_autoplay_reels: boolean;
}

// Le PUT /app-preferences écrase TOUTES ses colonnes avec ce qui est envoyé :
// on garde donc l'écran de démarrage lu depuis l'API et on le renvoie tel quel.
const DEFAULT_PREFS: PlaybackPrefs = { autoplay: true, hd_streaming: false, record_live_enabled: false, reels_show_interface: true, feed_autoplay_reels: false };

export default function SettingsPlaybackPage() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<PlaybackPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState<keyof PlaybackPrefs | null>(null);
  const [startScreen, setStartScreen] = useState('feed');

  useEffect(() => {
    apiClient.get<Omit<PlaybackPrefs, 'feed_autoplay_reels'>>(Endpoints.users.playback)
      .then(r => setPrefs(p => ({ ...p, ...r.data })))
      .catch(() => {/* garde les valeurs par défaut */});
    apiClient.get<{ preferred_start_screen: string; feed_autoplay_reels: boolean }>(Endpoints.users.appPreferences)
      .then(r => {
        setStartScreen(r.data.preferred_start_screen || 'feed');
        setPrefs(p => ({ ...p, feed_autoplay_reels: !!r.data.feed_autoplay_reels }));
      })
      .catch(() => {});
  }, []);

  const toggle = useCallback(async (field: keyof PlaybackPrefs) => {
    if (saving) return;
    const updated = { ...prefs, [field]: !prefs[field] };
    setPrefs(updated);
    setSaving(field);
    // Répercussion immédiate sur les lecteurs (fil, reels, films) sans rechargement.
    if (field === 'autoplay' || field === 'feed_autoplay_reels' || field === 'hd_streaming') setPlaybackPrefs({ [field]: updated[field] });
    try {
      if (field === 'feed_autoplay_reels') {
        await apiClient.put(Endpoints.users.appPreferences, {
          preferred_start_screen: startScreen, feed_autoplay_reels: updated.feed_autoplay_reels,
        });
      } else {
        const { feed_autoplay_reels: _omit, ...playback } = updated;
        await apiClient.put(Endpoints.users.playback, playback);
      }
    } catch {
      setPrefs(prefs);
      if (field === 'autoplay' || field === 'feed_autoplay_reels' || field === 'hd_streaming') setPlaybackPrefs({ [field]: prefs[field] });
      toast.error('Impossible de sauvegarder la préférence.');
    } finally {
      setSaving(null);
    }
  }, [prefs, saving]);

  const rows: { key: keyof PlaybackPrefs; icon: React.ReactNode; label: string; sub: string }[] = [
    {
      key: 'autoplay',
      icon: <Play size={16} />,
      label: 'Lecture automatique',
      sub: 'Lance automatiquement les vidéos (posts, films, séries, reels)',
    },
    {
      key: 'feed_autoplay_reels',
      icon: <Video size={16} />,
      label: 'Aperçu des reels dans le fil',
      sub: 'Joue en muet les reels croisés au fil du défilement',
    },
    {
      key: 'hd_streaming',
      icon: <Shield size={16} />,
      label: 'Streaming HD',
      sub: 'Qualité maximale (plus de données). Désactivé : limité à 720p',
    },
    {
      key: 'record_live_enabled',
      icon: <Video size={16} />,
      label: 'Enregistrer mes lives',
      sub: 'Sauvegarde une vidéo complète (vidéo + chat) de tes lives, battles et concerts',
    },
  ];

  return (
    <div className="w-full mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/settings')}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <ArrowLeft size={16} style={{ color: 'var(--text-primary)' }} />
        </button>
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Lecture</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Qualité et comportement vidéo</p>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {rows.map((row, i) => (
          <div key={row.key} className="flex items-center gap-3 px-4 py-4"
            style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(123,63,242,0.1)' }}>
              <span style={{ color: 'var(--primary)' }}>{row.icon}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{row.label}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{row.sub}</p>
            </div>
            <button onClick={() => toggle(row.key)} disabled={!!saving}
              className="relative rounded-full transition-colors shrink-0 disabled:opacity-50"
              style={{ background: prefs[row.key] ? 'var(--primary)' : 'var(--border)', height: 22, width: 40 }}>
              <span className={`absolute top-0.5 left-0 w-4 h-4 bg-white rounded-full shadow transition-transform ${prefs[row.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
