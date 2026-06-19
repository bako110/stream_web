import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Music, X, Play, Pause, Upload, ChevronRight, Flame, User, Clock } from 'lucide-react';
import type { Sound } from '../../types';
import { Endpoints } from '../../api/endpoints';
import { apiClient } from '../../api';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (sound: Sound | null) => void;
  selected?: Sound | null;
}

type Tab = 'popular' | 'search' | 'my';

function fmtDur(sec: number | null): string {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function SoundRow({
  sound,
  isSelected,
  isPlaying,
  onPlay,
  onSelect,
}: {
  sound: Sound;
  isSelected: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onSelect: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer"
      style={{
        background: isSelected ? 'rgba(123,63,242,0.08)' : 'transparent',
        borderBottom: '1px solid var(--border)',
      }}
      onClick={onSelect}
    >
      {/* Cover / Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
        style={{ background: 'var(--bg-secondary)' }}
      >
        {sound.cover_url ? (
          <img src={sound.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Music size={18} style={{ color: 'var(--primary)' }} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {sound.title}
        </p>
        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
          {sound.artist_name ?? 'Inconnu'}{sound.usage_count > 0 ? ` · ${sound.usage_count} utilisations` : ''}
        </p>
      </div>

      {/* Duration */}
      {sound.duration_seconds && (
        <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>
          {fmtDur(sound.duration_seconds)}
        </span>
      )}

      {/* Play preview */}
      <button
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all"
        style={{ background: isPlaying ? 'var(--primary)' : 'var(--bg-secondary)' }}
        onClick={e => { e.stopPropagation(); onPlay(); }}
      >
        {isPlaying
          ? <Pause size={13} className="text-white" />
          : <Play size={13} style={{ color: 'var(--text-secondary)' }} />
        }
      </button>

      {/* Select indicator */}
      {isSelected && (
        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'var(--primary)' }}>
          <ChevronRight size={11} className="text-white" />
        </div>
      )}
    </div>
  );
}

export function SoundPickerSheet({ open, onClose, onSelect, selected }: Props) {
  const [tab, setTab] = useState<Tab>('popular');
  const [query, setQuery] = useState('');
  const [popular, setPopular] = useState<Sound[]>([]);
  const [searchResults, setSearchResults] = useState<Sound[]>([]);
  const [mySounds, setMySounds] = useState<Sound[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingMy, setLoadingMy] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load popular on open
  useEffect(() => {
    if (!open) return;
    setLoadingPopular(true);
    apiClient.get<Sound[]>(Endpoints.sounds.popular)
      .then(r => setPopular(r.data ?? []))
      .catch(() => setPopular([]))
      .finally(() => setLoadingPopular(false));
  }, [open]);

  // Load my sounds when tab changes
  useEffect(() => {
    if (!open || tab !== 'my') return;
    setLoadingMy(true);
    apiClient.get<Sound[]>(Endpoints.sounds.my)
      .then(r => setMySounds(r.data ?? []))
      .catch(() => setMySounds([]))
      .finally(() => setLoadingMy(false));
  }, [open, tab]);

  // Debounced search
  useEffect(() => {
    if (tab !== 'search') return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim()) { setSearchResults([]); return; }
    setLoadingSearch(true);
    searchTimer.current = setTimeout(() => {
      apiClient.get<Sound[]>(`${Endpoints.sounds.list}?q=${encodeURIComponent(query.trim())}`)
        .then(r => setSearchResults(r.data ?? []))
        .catch(() => setSearchResults([]))
        .finally(() => setLoadingSearch(false));
    }, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query, tab]);

  const stopAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingId(null);
  }, []);

  const togglePlay = useCallback((sound: Sound) => {
    if (playingId === sound.id) {
      stopAudio();
      return;
    }
    stopAudio();
    const audio = new Audio(sound.file_url);
    audioRef.current = audio;
    audio.play().catch(() => {});
    audio.onended = () => setPlayingId(null);
    setPlayingId(sound.id);
  }, [playingId, stopAudio]);

  // Stop on close
  useEffect(() => {
    if (!open) stopAudio();
  }, [open, stopAudio]);

  function handleSelect(sound: Sound) {
    stopAudio();
    onSelect(sound);
    onClose();
    // Increment usage in background
    apiClient.post(Endpoints.sounds.use(sound.id)).catch(() => {});
  }

  function handleRemove() {
    stopAudio();
    onSelect(null);
    onClose();
  }

  const tabs: { key: Tab; label: string; Icon: typeof Flame }[] = [
    { key: 'popular', label: 'Populaires', Icon: Flame },
    { key: 'search',  label: 'Rechercher', Icon: Search },
    { key: 'my',      label: 'Mes sons',   Icon: User },
  ];

  const activeList =
    tab === 'popular' ? popular :
    tab === 'search'  ? searchResults :
    mySounds;

  const isLoading =
    tab === 'popular' ? loadingPopular :
    tab === 'search'  ? loadingSearch :
    loadingMy;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[900]"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[901] mx-auto w-full sm:max-w-sm pointer-events-none"
        style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)' }}
      >
        <div
          className="pointer-events-auto rounded-t-2xl overflow-hidden flex flex-col"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            maxHeight: '80vh',
            animation: 'slideUpSheet 0.28s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 shrink-0">
            <span className="font-black text-base" style={{ color: 'var(--text-primary)' }}>
              Ajouter un son
            </span>
            <button onClick={onClose} style={{ color: 'var(--text-tertiary)' }}>
              <X size={18} />
            </button>
          </div>

          {/* Selected sound bar */}
          {selected && (
            <div
              className="mx-4 mb-2 px-3 py-2 rounded-xl flex items-center gap-2 shrink-0"
              style={{ background: 'rgba(123,63,242,0.1)', border: '1px solid rgba(123,63,242,0.25)' }}
            >
              <Music size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--primary)' }}>
                  {selected.title}
                </p>
                {selected.artist_name && (
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {selected.artist_name}
                  </p>
                )}
              </div>
              <button
                className="text-xs font-bold shrink-0 px-2 py-0.5 rounded-lg"
                style={{ color: '#EF4444', background: 'rgba(239,68,68,0.1)' }}
                onClick={handleRemove}
              >
                Retirer
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
            {tabs.map(({ key, label, Icon }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-colors"
                  style={{
                    color: active ? 'var(--primary)' : 'var(--text-secondary)',
                    borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
                  }}
                  onClick={() => setTab(key)}
                >
                  <Icon size={13} />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Search input (only for search tab) */}
          {tab === 'search' && (
            <div className="px-4 py-2 shrink-0">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              >
                <Search size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                <input
                  className="flex-1 text-sm bg-transparent outline-none"
                  style={{ color: 'var(--text-primary)' }}
                  placeholder="Titre, artiste..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  autoFocus
                />
                {query && (
                  <button onClick={() => setQuery('')} style={{ color: 'var(--text-tertiary)' }}>
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }} />
              </div>
            ) : activeList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Music size={32} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  {tab === 'search' && !query.trim()
                    ? 'Tapez pour rechercher'
                    : tab === 'my'
                    ? 'Aucun son uploadé'
                    : 'Aucun son disponible'}
                </p>
              </div>
            ) : (
              activeList.map(sound => (
                <SoundRow
                  key={sound.id}
                  sound={sound}
                  isSelected={selected?.id === sound.id}
                  isPlaying={playingId === sound.id}
                  onPlay={() => togglePlay(sound)}
                  onSelect={() => handleSelect(sound)}
                />
              ))
            )}
          </div>

          {/* Upload button for "my" tab */}
          {tab === 'my' && (
            <div className="px-4 py-3 border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
              <UploadSoundButton onUploaded={newSound => {
                setMySounds(prev => [newSound, ...prev]);
                handleSelect(newSound);
              }} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}


// ── Inline upload component ───────────────────────────────────────────────
function UploadSoundButton({ onUploaded }: { onUploaded: (s: Sound) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. Upload the file
      const form = new FormData();
      form.append('file', file);
      const uploadRes = await apiClient.upload<{ url: string }>(
        '/api/v1/upload/audio?folder=sounds',
        form,
      );
      const fileUrl = (uploadRes.data as any)?.url ?? (uploadRes.data as any)?.uploaded?.[0]?.url;

      // 2. Register the sound
      const name = file.name.replace(/\.[^.]+$/, '');
      const soundRes = await apiClient.post<Sound>(Endpoints.sounds.create, {
        title: name,
        file_url: fileUrl,
        is_original: true,
      });
      onUploaded(soundRes.data);
    } catch {
      // silent — user sees nothing changes
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFile}
      />
      <button
        className="w-full h-11 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all"
        style={{
          background: uploading ? 'var(--bg-secondary)' : 'rgba(123,63,242,0.1)',
          border: '1px dashed rgba(123,63,242,0.4)',
          color: 'var(--primary)',
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <div className="w-4 h-4 border-2 rounded-full animate-spin"
              style={{ borderColor: 'rgba(123,63,242,0.3)', borderTopColor: 'var(--primary)' }} />
            Envoi en cours...
          </>
        ) : (
          <>
            <Upload size={15} />
            Importer un fichier audio
          </>
        )}
      </button>
    </>
  );
}


// ── SoundBar — barre compacte affichant le son sélectionné ───────────────
export function SoundBar({
  sound,
  onOpen,
  onRemove,
}: {
  sound: Sound | null;
  onOpen: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all"
      style={{
        background: sound ? 'rgba(123,63,242,0.08)' : 'var(--bg-secondary)',
        border: `1px solid ${sound ? 'rgba(123,63,242,0.25)' : 'var(--border)'}`,
      }}
      onClick={onOpen}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: sound ? 'rgba(123,63,242,0.15)' : 'var(--bg-secondary)' }}
      >
        <Music size={14} style={{ color: sound ? 'var(--primary)' : 'var(--text-tertiary)' }} />
      </div>
      <div className="flex-1 min-w-0">
        {sound ? (
          <>
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--primary)' }}>
              {sound.title}
            </p>
            {sound.artist_name && (
              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                {sound.artist_name}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Ajouter un son
          </p>
        )}
      </div>
      {sound ? (
        <button
          className="shrink-0 p-1 rounded-lg"
          style={{ color: 'var(--text-tertiary)' }}
          onClick={e => { e.stopPropagation(); onRemove(); }}
        >
          <X size={13} />
        </button>
      ) : (
        <ChevronRight size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
      )}
    </div>
  );
}


// ── SoundBadge — badge animé pendant la lecture reel/story ───────────────
export function SoundBadge({ sound }: { sound: Pick<Sound, 'title' | 'artist_name'> }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
      style={{
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <MusicNote />
      <span className="text-xs font-semibold text-white truncate max-w-[140px]">
        {sound.title}{sound.artist_name ? ` — ${sound.artist_name}` : ''}
      </span>
    </div>
  );
}

function MusicNote() {
  return (
    <div style={{ animation: 'musicSpin 3s linear infinite' }}>
      <Music size={11} className="text-white" />
      <style>{`@keyframes musicSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
