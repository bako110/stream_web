import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Play, Shield, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import toast from 'react-hot-toast';

interface PlaybackPrefs {
  autoplay: boolean;
  hd_streaming: boolean;
  record_live_enabled: boolean;
}

const DEFAULT_PREFS: PlaybackPrefs = { autoplay: true, hd_streaming: false, record_live_enabled: false };

export default function SettingsPlaybackPage() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<PlaybackPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState<keyof PlaybackPrefs | null>(null);

  useEffect(() => {
    apiClient.get<PlaybackPrefs>(Endpoints.users.playback)
      .then(r => setPrefs({ ...DEFAULT_PREFS, ...r.data }))
      .catch(() => {/* garde les valeurs par défaut */});
  }, []);

  const toggle = useCallback(async (field: keyof PlaybackPrefs) => {
    if (saving) return;
    const updated = { ...prefs, [field]: !prefs[field] };
    setPrefs(updated);
    setSaving(field);
    try {
      await apiClient.put(Endpoints.users.playback, updated);
    } catch {
      setPrefs(prefs);
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
      sub: 'Lance automatiquement la vidéo suivante',
    },
    {
      key: 'hd_streaming',
      icon: <Shield size={16} />,
      label: 'Streaming HD',
      sub: 'Utilise plus de données mobiles',
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
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${prefs[row.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
