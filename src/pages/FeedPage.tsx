import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Music, MapPin, Clock, Users, Play, Calendar,
  Flame, ChevronRight, UserPlus, UserCheck, Sparkles, Radio,
  Heart, MessageCircle, Share2, Bookmark, Film, RefreshCw,
  X, Send, Check, Plus, ChevronLeft, Eye, Trash2, Edit3,
  Image as ImageIcon, Video, Type, MoreHorizontal, Lock,
} from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import type { Concert, Event, Post, Reel, StoryGroup, Community } from '../types';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ── Story Creator ─────────────────────────────────────────────────────────────
const TEXT_COLORS = ['#7B3FF2','#E0389A','#F0365A','#FF7A2F','#36D9A0','#3B82F6','#F59E0B','#1a0533','#000000','#ffffff'];

function StoryCreator({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [mode,      setMode]      = useState<'pick'|'text'|'image'|'video'|'preview'>('pick');
  const [bgColor,   setBgColor]   = useState(TEXT_COLORS[0]);
  const [caption,   setCaption]   = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image'|'video'>('image');
  const [uploading, setUploading] = useState(false);
  const [success,   setSuccess]   = useState(false);
  const fileRef  = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const MODES = [
    { key: 'text'  as const, icon: <Type size={22} />,       label: 'Texte',   sub: 'Message sur fond coloré',    grad: 'linear-gradient(135deg,#7B3FF2,#9B65F5)' },
    { key: 'image' as const, icon: <ImageIcon size={22} />,  label: 'Photo',   sub: 'Depuis votre galerie',       grad: 'linear-gradient(135deg,#1565C0,#2196F3)' },
    { key: 'video' as const, icon: <Video size={22} />,      label: 'Vidéo',   sub: 'Clip jusqu\'à 30 secondes',  grad: 'linear-gradient(135deg,#AD1457,#E91E63)' },
  ];

  function pickFile(type: 'image'|'video') {
    setMediaType(type);
    if (fileRef.current) {
      fileRef.current.accept = type === 'image' ? 'image/*' : 'video/*';
      fileRef.current.click();
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setMediaFile(f);
    setMediaPreview(URL.createObjectURL(f));
    setMode('preview');
    e.target.value = '';
  }

  async function publish() {
    setUploading(true);
    try {
      let media_url: string | undefined;
      let thumbnail_url: string | undefined;
      let duration_sec = 5;
      let background_color: string | undefined;
      let final_media_type: string = 'text';

      if (mode === 'text' || (mode === 'preview' && !mediaFile)) {
        final_media_type = 'text';
        background_color = bgColor;
        duration_sec = 5;
      } else if (mediaFile) {
        final_media_type = mediaType;
        const fd = new FormData();
        fd.append('file', mediaFile);
        if (mediaType === 'image') {
          const res = await apiClient.upload<any>(Endpoints.upload.images('stories'), fd);
          const uploaded = (res.data as any)?.uploaded?.[0] ?? res.data;
          media_url = uploaded?.url ?? uploaded;
          thumbnail_url = media_url;
        } else {
          const res = await apiClient.upload<any>(Endpoints.upload.video('stories'), fd);
          const d = res.data as any;
          media_url = d?.url ?? d;
          thumbnail_url = d?.thumbnail_url;
          duration_sec = d?.duration ? Math.min(Math.ceil(d.duration), 30) : 10;
        }
      }

      await apiClient.post(Endpoints.stories.create, {
        media_url,
        media_type: final_media_type,
        thumbnail_url,
        caption: caption.trim() || undefined,
        duration_sec,
        background_color,
      });

      setSuccess(true);
      setTimeout(() => { onCreated(); onClose(); }, 2000);
    } catch (e: any) {
      alert(e?.message ?? 'Erreur lors de la publication');
    } finally { setUploading(false); }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}>
      <div
        className="relative w-full sm:w-[420px] flex flex-col overflow-hidden"
        style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}>

        <input ref={fileRef} type="file" className="hidden" onChange={onFileChange} />

        {success ? (
          /* ── Succès ── */
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
              <Check size={28} className="text-white" />
            </div>
            <p className="font-black text-xl" style={{ color: 'var(--text-primary)' }}>Story publiée !</p>
            <p className="text-sm text-center" style={{ color: 'var(--text-tertiary)' }}>Visible par tous vos abonnés pendant 24h</p>
          </div>
        ) : mode === 'pick' ? (
          /* ── Choix du type ── */
          <>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <p className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>Nouvelle story</p>
              <button onClick={onClose} className="p-2 rounded-xl" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-2 px-4 pb-6">
              {MODES.map(m => (
                <button key={m.key}
                  onClick={() => { if (m.key === 'text') setMode('text'); else pickFile(m.key === 'image' ? 'image' : 'video'); }}
                  className="flex items-center gap-4 p-4 rounded-2xl transition-all text-left"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white"
                    style={{ background: m.grad }}>{m.icon}</div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{m.label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{m.sub}</p>
                  </div>
                  <ChevronRight size={16} className="ml-auto shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                </button>
              ))}
              <p className="text-xs text-center pt-2" style={{ color: 'var(--text-tertiary)' }}>
                Les stories disparaissent automatiquement après 24h
              </p>
            </div>
          </>
        ) : mode === 'text' ? (
          /* ── Éditeur texte ── */
          <>
            <div className="flex items-center gap-3 px-4 pt-4 pb-3">
              <button onClick={() => setMode('pick')} className="p-2 rounded-xl" style={{ color: 'var(--text-secondary)' }}>
                <ChevronLeft size={18} />
              </button>
              <p className="font-black text-sm flex-1" style={{ color: 'var(--text-primary)' }}>Story texte</p>
            </div>
            {/* Aperçu */}
            <div className="mx-4 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ height: 240, background: bgColor }}>
              {caption ? (
                <p className="text-white font-black text-xl text-center px-6 leading-snug">{caption}</p>
              ) : (
                <p className="text-white/40 text-sm">Votre texte apparaît ici</p>
              )}
            </div>
            {/* Palette couleurs */}
            <div className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {TEXT_COLORS.map(c => (
                <button key={c} onClick={() => setBgColor(c)}
                  className="rounded-full shrink-0 transition-transform"
                  style={{ width: 28, height: 28, background: c, border: bgColor === c ? '3px solid var(--text-primary)' : '2px solid var(--border)', transform: bgColor === c ? 'scale(1.2)' : 'scale(1)' }} />
              ))}
            </div>
            {/* Input caption */}
            <div className="px-4 pb-2">
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Écrivez votre message..."
                maxLength={300}
                rows={3}
                className="w-full rounded-xl text-sm resize-none outline-none px-4 py-3"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
            <div className="px-4 pb-5">
              <button onClick={publish} disabled={!caption.trim() || uploading}
                className="w-full py-3 rounded-xl font-black text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
                {uploading ? <Spinner size="sm" /> : <><Send size={14} /> Publier</>}
              </button>
            </div>
          </>
        ) : (
          /* ── Aperçu media ── */
          <>
            <div className="relative w-full rounded-t-[20px] overflow-hidden bg-black"
              style={{ height: 380 }}>
              {mediaType === 'image' && mediaPreview && (
                <img src={mediaPreview} className="w-full h-full object-contain" alt="" />
              )}
              {mediaType === 'video' && mediaPreview && (
                <video ref={videoRef} src={mediaPreview} className="w-full h-full object-contain" autoPlay muted loop playsInline />
              )}
              <div className="absolute top-3 left-3">
                <button onClick={() => { setMode('pick'); setMediaFile(null); setMediaPreview(null); }}
                  className="p-2 rounded-full" style={{ background: 'rgba(0,0,0,0.5)' }}>
                  <X size={16} className="text-white" />
                </button>
              </div>
            </div>
            {/* Caption */}
            <div className="px-4 py-3">
              <input
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Ajouter une légende..."
                maxLength={200}
                className="w-full rounded-xl text-sm outline-none px-4 py-2.5"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
            <div className="px-4 pb-5">
              <button onClick={publish} disabled={uploading}
                className="w-full py-3 rounded-xl font-black text-white flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
                {uploading ? <Spinner size="sm" /> : <><Send size={14} /> Publier</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Story Viewer ──────────────────────────────────────────────────────────────
function StoryViewer({
  groups, initialIndex, initialStoryIndex = 0, currentUserId, onClose, onReload,
}: {
  groups: StoryGroup[];
  initialIndex: number;
  initialStoryIndex?: number;
  currentUserId?: string;
  onClose: () => void;
  onReload: () => void;
}) {
  const [groupIdx,   setGroupIdx]   = useState(initialIndex);
  const [storyIdx,   setStoryIdx]   = useState(initialStoryIndex);
  const [progress,   setProgress]   = useState(0);
  const [paused,     setPaused]     = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [editMode,   setEditMode]   = useState(false);
  const [editText,   setEditText]   = useState('');
  const [viewers,    setViewers]    = useState<any[]>([]);
  const [viewersOpen,setViewersOpen]= useState(false);
  const [viewersLoading, setViewersLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const group  = groups[groupIdx];
  const story  = group?.stories[storyIdx];
  const dur    = (story?.duration_sec ?? 5) * 1000;
  const isOwn  = !!currentUserId && (story as any)?.user_id === currentUserId;
  const totalInGroup = group?.stories.length ?? 0;

  // Mark viewed
  useEffect(() => {
    if (!story) return;
    apiClient.post(Endpoints.stories.view(story.id)).catch(() => {});
  }, [story?.id]);

  // Progress bar
  useEffect(() => {
    setProgress(0);
    if (paused || menuOpen || editMode || !story) return;
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const pct = Math.min(((Date.now() - start) / dur) * 100, 100);
      setProgress(pct);
      if (pct >= 100) goNext();
    }, 50);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [groupIdx, storyIdx, paused, menuOpen, editMode, dur]);

  function goNext() {
    if (storyIdx < totalInGroup - 1) { setStoryIdx(s => s + 1); }
    else if (groupIdx < groups.length - 1) { setGroupIdx(g => g + 1); setStoryIdx(0); }
    else { onClose(); }
  }
  function goPrev() {
    if (storyIdx > 0) { setStoryIdx(s => s - 1); }
    else if (groupIdx > 0) { setGroupIdx(g => g - 1); setStoryIdx(0); }
  }

  async function openViewers() {
    setPaused(true); setViewersOpen(true); setViewersLoading(true);
    try {
      const vRes = await apiClient.get<any>(Endpoints.stories.viewers(story!.id));
      const raw = vRes.data;
      setViewers(Array.isArray(raw) ? raw : raw?.items ?? []);
    } catch { setViewers([]); }
    setViewersLoading(false);
  }

  async function deleteStory() {
    if (!story) return;
    setMenuOpen(false);
    try {
      await apiClient.delete(Endpoints.stories.delete(story.id));
      onReload();
      if (totalInGroup > 1) setStoryIdx(storyIdx < totalInGroup - 1 ? storyIdx : storyIdx - 1);
      else onClose();
    } catch { alert('Erreur lors de la suppression'); }
  }

  async function saveEdit() {
    if (!story) return;
    try { await apiClient.patch(`/api/v1/stories/${story.id}`, { caption: editText.trim() || null }); }
    catch { /* silencieux */ }
    setEditMode(false); setPaused(false);
  }

  if (!group || !story) return null;
  const author = group.user;

  const timeAgo = (() => {
    const d = (Date.now() - new Date(story.created_at).getTime()) / 1000;
    if (d < 60) return 'À l\'instant';
    if (d < 3600) return `${Math.floor(d / 60)} min`;
    return `${Math.floor(d / 3600)} h`;
  })();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}>
      <div className="relative"
        style={{ width: 'min(100vw, 420px)', height: 'min(100dvh, 750px)', borderRadius: 16, overflow: 'hidden', background: '#000' }}
        onClick={e => e.stopPropagation()}>

        {/* ── Progress bars ── */}
        <div className="absolute top-0 inset-x-0 z-30 flex gap-1 px-2 pt-2">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.3)' }}>
              <div className="h-full rounded-full"
                style={{ background: '#fff', width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%', transition: 'none' }} />
            </div>
          ))}
        </div>

        {/* ── Header ── */}
        <div className="absolute top-6 inset-x-0 z-30 flex items-center gap-2.5 px-3">
          <div className="rounded-full p-[2px]" style={{ border: '2px solid rgba(255,255,255,0.6)' }}>
            <Avatar src={author.avatar_url} name={author.display_name ?? author.username ?? ''} size="sm" verified={author.is_verified} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-bold truncate">{author.display_name ?? author.username}</p>
            <p className="text-white/60 text-[10px]">{timeAgo}</p>
          </div>
          {isOwn && (
            <button onClick={() => { setPaused(true); setMenuOpen(true); }}
              className="p-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.35)' }}>
              <MoreHorizontal size={16} className="text-white" />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <X size={15} className="text-white" />
          </button>
        </div>

        {/* ── Media ── */}
        <div className="absolute inset-0"
          onMouseDown={() => setPaused(true)} onMouseUp={() => setPaused(false)}
          onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)}>
          {story.media_type === 'video' && story.media_url ? (
            <video src={story.media_url} className="w-full h-full object-contain" autoPlay loop={false} playsInline />
          ) : story.media_url ? (
            <img src={story.media_url} alt="" className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: story.background_color ?? '#7B3FF2' }}>
              {story.caption && (
                <p className="text-white font-black text-2xl text-center px-8 leading-snug">{story.caption}</p>
              )}
            </div>
          )}
        </div>

        {/* Gradients */}
        <div className="absolute inset-x-0 top-0 h-40 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)' }} />
        <div className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }} />

        {/* Caption (media stories) */}
        {story.caption && story.media_url && (
          <div className="absolute bottom-16 inset-x-0 px-4 z-10">
            <div className="inline-block rounded-2xl px-4 py-2.5" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <p className="text-white text-sm leading-relaxed">{story.caption}</p>
            </div>
          </div>
        )}

        {/* Vue count — own story */}
        {isOwn && (
          <button onClick={openViewers}
            className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.5)' }}>
            <Eye size={13} className="text-white" />
            <span className="text-white text-xs font-bold">{(story as any).view_count ?? 0} vue{((story as any).view_count ?? 0) !== 1 ? 's' : ''}</span>
          </button>
        )}

        {/* Tap zones */}
        <button className="absolute left-0 top-0 w-1/3 h-full z-10 opacity-0" onClick={goPrev} />
        <button className="absolute right-0 top-0 w-1/3 h-full z-10 opacity-0" onClick={goNext} />

        {/* Group arrows */}
        {groupIdx > 0 && (
          <button className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.2)' }}
            onClick={() => { setGroupIdx(g => g - 1); setStoryIdx(0); }}>
            <ChevronLeft size={16} className="text-white" />
          </button>
        )}
        {groupIdx < groups.length - 1 && (
          <button className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.2)' }}
            onClick={() => { setGroupIdx(g => g + 1); setStoryIdx(0); }}>
            <ChevronRight size={16} className="text-white" />
          </button>
        )}

        {/* ── Menu (own story) ── */}
        {menuOpen && (
          <div className="absolute inset-0 z-40" style={{ background: 'rgba(0,0,0,0.55)' }}
            onClick={() => { setMenuOpen(false); setPaused(false); }}>
            <div className="absolute bottom-0 inset-x-0 rounded-t-2xl overflow-hidden"
              style={{ background: '#12121E' }}
              onClick={e => e.stopPropagation()}>
              <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-3" style={{ background: 'rgba(255,255,255,0.2)' }} />
              <button onClick={() => { setMenuOpen(false); setEditText(story.caption ?? ''); setEditMode(true); }}
                className="w-full flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(123,63,242,0.15)' }}>
                  <Edit3 size={16} style={{ color: '#7B3FF2' }} />
                </div>
                <span className="text-white font-medium text-sm">Modifier la légende</span>
                <ChevronRight size={15} className="ml-auto text-white/30" />
              </button>
              <button onClick={deleteStory}
                className="w-full flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,68,68,0.15)' }}>
                  <Trash2 size={16} style={{ color: '#ff4444' }} />
                </div>
                <span className="font-medium text-sm" style={{ color: '#ff4444' }}>Supprimer la story</span>
                <ChevronRight size={15} className="ml-auto" style={{ color: 'rgba(255,68,68,0.3)' }} />
              </button>
              <button onClick={() => { setMenuOpen(false); setPaused(false); }}
                className="w-full py-4 text-sm font-medium text-center"
                style={{ color: 'rgba(255,255,255,0.5)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* ── Edit caption ── */}
        {editMode && (
          <div className="absolute inset-0 z-40 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="w-full rounded-t-2xl p-5" style={{ background: '#12121E' }}>
              <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.2)' }} />
              <p className="text-white font-bold mb-3">Modifier la légende</p>
              <textarea value={editText} onChange={e => setEditText(e.target.value)}
                className="w-full rounded-xl text-sm resize-none outline-none px-4 py-3 text-white"
                style={{ background: 'rgba(255,255,255,0.07)', minHeight: 80, border: '1px solid rgba(255,255,255,0.1)' }}
                rows={3} maxLength={300} autoFocus />
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setEditMode(false); setPaused(false); }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                  Annuler
                </button>
                <button onClick={saveEdit}
                  className="flex-1 py-3 rounded-xl text-sm font-black text-white"
                  style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Viewers panel ── */}
        {viewersOpen && (
          <div className="absolute inset-0 z-40" style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => { setViewersOpen(false); setPaused(false); }}>
            <div className="absolute bottom-0 inset-x-0 rounded-t-2xl overflow-hidden"
              style={{ background: '#12121E', maxHeight: '65%' }}
              onClick={e => e.stopPropagation()}>
              <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-2" style={{ background: 'rgba(255,255,255,0.2)' }} />
              <div className="flex items-center gap-2 px-5 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <Eye size={15} style={{ color: '#7B3FF2' }} />
                <p className="text-white font-black">{viewers.length} vue{viewers.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 280 }}>
                {viewersLoading ? (
                  <div className="flex justify-center py-8"><Spinner size="sm" /></div>
                ) : viewers.length === 0 ? (
                  <div className="flex flex-col items-center py-10 gap-2 opacity-40">
                    <Eye size={32} className="text-white" />
                    <p className="text-white text-sm">Aucune vue pour l'instant</p>
                  </div>
                ) : viewers.map((v: any) => (
                  <div key={v.id} className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Avatar src={v.avatar_url} name={v.display_name ?? v.username ?? '?'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{v.display_name ?? v.username}</p>
                      <p className="text-white/40 text-xs">@{v.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── My Stories Page (WhatsApp style) ─────────────────────────────────────────
function MyStoriesPage({
  myGroup,
  user,
  onClose,
  onViewStory,
  onNewStory,
  onReload,
}: {
  myGroup: StoryGroup | undefined;
  user: any;
  onClose: () => void;
  onViewStory: (storyIdx: number) => void;
  onNewStory: () => void;
  onReload: () => void;
}) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const stories = myGroup?.stories ?? [];

  function timeLeft(createdAt: string, _durationSec: number) {
    const expiry = new Date(createdAt).getTime() + 24 * 3600 * 1000;
    const diff   = expiry - Date.now();
    if (diff <= 0) return 'Expirée';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 0) return `Expire dans ${h}h ${m}min`;
    return `Expire dans ${m}min`;
  }

  async function deleteStory(id: string) {
    setDeleting(id);
    try {
      await apiClient.delete(Endpoints.stories.delete(id));
      onReload();
    } catch { /* ignore */ }
    setDeleting(null);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(14px)' }}
      onClick={onClose}>
      <div
        className="relative w-full sm:w-[440px] flex flex-col overflow-hidden"
        style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', maxHeight: '88dvh' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="rounded-full p-[2.5px] shrink-0"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
            <div className="rounded-full p-[2px]" style={{ background: 'var(--surface)' }}>
              <Avatar src={user?.avatar_url} name={user?.display_name ?? user?.username ?? ''} size="md" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-base" style={{ color: 'var(--text-primary)' }}>
              {user?.display_name ?? user?.username}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {stories.length} story{stories.length !== 1 ? 's' : ''} active{stories.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Stories list */}
        <div className="flex-1 overflow-y-auto">
          {stories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-50">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'var(--bg-secondary)' }}>
                <Plus size={28} style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
                Aucune story active
              </p>
            </div>
          ) : (
            <div className="py-2">
              {stories.map((story, idx) => (
                <div key={story.id}
                  className="flex items-center gap-3 px-4 py-3 transition-all"
                  style={{ borderBottom: '1px solid var(--border)' }}>

                  {/* Thumbnail */}
                  <button onClick={() => onViewStory(idx)}
                    className="relative shrink-0 rounded-2xl overflow-hidden"
                    style={{ width: 60, height: 80, background: story.background_color ?? '#1a0533' }}>
                    {story.media_type === 'video' && story.thumbnail_url ? (
                      <img src={story.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : story.media_url ? (
                      <img src={story.media_url} alt="" className="w-full h-full object-cover" />
                    ) : story.caption ? (
                      <div className="w-full h-full flex items-center justify-center p-1">
                        <p className="text-white font-black text-[9px] text-center leading-snug line-clamp-3">
                          {story.caption}
                        </p>
                      </div>
                    ) : null}
                    {story.media_type === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.3)' }}>
                        <Play size={14} className="text-white" fill="white" />
                      </div>
                    )}
                  </button>

                  {/* Info */}
                  <button onClick={() => onViewStory(idx)} className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                      {story.caption || (story.media_type === 'video' ? 'Vidéo' : story.media_type === 'image' ? 'Photo' : 'Story texte')}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Eye size={12} style={{ color: 'var(--primary)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                        {(story as any).view_count ?? 0} vue{((story as any).view_count ?? 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {timeLeft(story.created_at, story.duration_sec ?? 5)}
                    </p>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteStory(story.id)}
                    disabled={deleting === story.id}
                    className="p-2 rounded-xl transition-all"
                    style={{ color: deleting === story.id ? 'var(--text-tertiary)' : '#ff4444', background: 'rgba(255,68,68,0.08)' }}>
                    {deleting === story.id ? <Spinner size="sm" /> : <Trash2 size={16} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onNewStory}
            className="w-full py-3.5 rounded-2xl font-black text-white flex items-center justify-center gap-2.5 transition-opacity"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
            <Plus size={18} />
            Ajouter une nouvelle story
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stories bar ───────────────────────────────────────────────────────────────
function StoriesBar() {
  const { user }     = useAuthStore();
  const [groups,     setGroups]     = useState<StoryGroup[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [viewer,          setViewer]          = useState<number | null>(null);
  const [initialStoryIdx, setInitialStoryIdx] = useState(0);
  const [creator,         setCreator]         = useState(false);
  const [myStories,       setMyStories]       = useState(false);

  function load() {
    apiClient.get<StoryGroup[]>(Endpoints.stories.feed)
      .then(res => {
        const raw = res.data;
        setGroups(Array.isArray(raw) ? raw : (raw as any)?.items ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const myGroup     = groups.find(g => g.user.id === user?.id);
  const otherGroups = groups.filter(g => g.user.id !== user?.id);
  const allGroups   = myGroup ? [myGroup, ...otherGroups] : groups;

  if (!loading && allGroups.length === 0) {
    return (
      <>
        <div className="rounded-2xl overflow-hidden animate-reveal-up"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex gap-3 px-3 py-3">
            <button onClick={() => setCreator(true)}
              className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 58 }}>
              <div className="relative">
                <div className="rounded-full p-[2px]" style={{ border: '2px dashed var(--border)' }}>
                  <Avatar src={user?.avatar_url} name={user?.display_name ?? user?.username ?? ''} size="sm" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--primary)', width: 18, height: 18, border: '2px solid var(--surface)' }}>
                  <Plus size={9} className="text-white" />
                </div>
              </div>
              <span className="text-[10px] font-semibold text-center w-full truncate" style={{ color: 'var(--text-secondary)' }}>
                Ajouter
              </span>
            </button>
          </div>
        </div>
        {creator && <StoryCreator onClose={() => setCreator(false)} onCreated={() => { setCreator(false); load(); }} />}
      </>
    );
  }

  return (
    <>
      <div className="rounded-2xl overflow-hidden animate-reveal-up"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex gap-3 px-3 py-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>

          {/* Mon story / add */}
          <button
            onClick={() => myGroup ? setMyStories(true) : setCreator(true)}
            className="flex flex-col items-center gap-1.5 shrink-0 transition-transform hover:scale-105"
            style={{ width: 58 }}>
            <div className="relative">
              {myGroup ? (
                <div className="rounded-full p-[2.5px]"
                  style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
                  <div className="rounded-full p-[2px]" style={{ background: 'var(--surface)' }}>
                    <Avatar src={user?.avatar_url} name={user?.display_name ?? user?.username ?? ''} size="sm" />
                  </div>
                </div>
              ) : (
                <div className="rounded-full p-[2px]" style={{ border: '2px dashed var(--border)' }}>
                  <Avatar src={user?.avatar_url} name={user?.display_name ?? user?.username ?? ''} size="sm" />
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center"
                style={{ background: 'var(--primary)', width: 18, height: 18, border: '2px solid var(--surface)' }}>
                <Plus size={9} className="text-white" />
              </div>
            </div>
            <span className="text-[10px] font-semibold text-center w-full truncate"
              style={{ color: 'var(--text-secondary)' }}>
              {myGroup ? 'Ma story' : 'Ajouter'}
            </span>
          </button>

          {(otherGroups.length > 0 || loading) && (
            <div className="w-px self-stretch my-1 shrink-0" style={{ background: 'var(--border)' }} />
          )}

          {/* Autres stories */}
          {otherGroups.map((group) => {
            const idx        = allGroups.indexOf(group);
            const u          = group.user;
            const name       = (u.display_name ?? u.username ?? '').split(' ')[0];
            const firstStory = group.stories[0];
            const thumb      = firstStory?.thumbnail_url ?? firstStory?.media_url ?? null;
            return (
              <button key={u.id} onClick={() => setViewer(idx)}
                className="flex flex-col items-center gap-1.5 shrink-0 transition-transform hover:scale-105"
                style={{ width: 58 }}>
                <div className="relative">
                  {group.has_unseen ? (
                    <div className="rounded-full p-[2.5px]"
                      style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
                      <div className="rounded-full p-[2px]" style={{ background: 'var(--surface)' }}>
                        {thumb ? (
                          <div className="w-10 h-10 rounded-full overflow-hidden">
                            <img src={thumb} alt={name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <Avatar src={u.avatar_url} name={u.display_name ?? u.username ?? ''} size="sm" verified={u.is_verified} />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-full p-[2px]" style={{ border: '2px solid var(--border)', opacity: 0.7 }}>
                      {thumb ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden">
                          <img src={thumb} alt={name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <Avatar src={u.avatar_url} name={u.display_name ?? u.username ?? ''} size="sm" verified={u.is_verified} />
                      )}
                    </div>
                  )}
                  {/* Avatar overlay en bas à gauche si thumbnail présent */}
                  {thumb && u.avatar_url && (
                    <div className="absolute -bottom-0.5 -left-0.5 w-[18px] h-[18px] rounded-full overflow-hidden"
                      style={{ border: '1.5px solid var(--surface)' }}>
                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {group.stories.length > 1 && (
                    <div className="absolute -top-0.5 -right-0.5 rounded-full flex items-center justify-center text-white font-black"
                      style={{ background: 'var(--primary)', minWidth: 15, height: 15, fontSize: 8, paddingInline: 3, border: '1.5px solid var(--surface)' }}>
                      {group.stories.length}
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-semibold text-center w-full truncate"
                  style={{ color: group.has_unseen ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {name}
                </span>
              </button>
            );
          })}

          {/* Skeletons */}
          {loading && [0,1,2,3].map(i => (
            <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 animate-pulse" style={{ width: 58 }}>
              <div className="w-10 h-10 rounded-full" style={{ background: 'var(--bg-tertiary)' }} />
              <div className="w-8 h-2 rounded-full" style={{ background: 'var(--bg-secondary)' }} />
            </div>
          ))}
        </div>
      </div>

      {viewer !== null && allGroups.length > 0 && (
        <StoryViewer
          groups={allGroups}
          initialIndex={viewer}
          initialStoryIndex={initialStoryIdx}
          currentUserId={user?.id}
          onClose={() => { setViewer(null); setInitialStoryIdx(0); load(); }}
          onReload={load}
        />
      )}

      {myStories && (
        <MyStoriesPage
          myGroup={myGroup}
          user={user}
          onClose={() => setMyStories(false)}
          onViewStory={(idx) => {
            setInitialStoryIdx(idx);
            setMyStories(false);
            if (myGroup) setViewer(allGroups.indexOf(myGroup));
          }}
          onNewStory={() => { setMyStories(false); setCreator(true); }}
          onReload={() => { load(); }}
        />
      )}

      {creator && (
        <StoryCreator onClose={() => setCreator(false)} onCreated={() => { setCreator(false); load(); }} />
      )}
    </>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
type FeedItem =
  | { kind: 'concert';      id: string; data: Concert }
  | { kind: 'event';        id: string; data: Event }
  | { kind: 'post';         id: string; data: Post }
  | { kind: 'reel';         id: string; data: Reel }
  | { kind: 'suggestions';  id: string; data: null }
  | { kind: 'communities';  id: string; data: Community[] };

const EVENT_COLORS: Record<string, string> = {
  concert: '#7B3FF2', birthday: '#E0389A', festival: '#FF7A2F',
  conference: '#36D9A0', sport: '#3B82F6', theater: '#9B65F5',
  exhibition: '#F59E0B', other: '#9290AE',
};

function toArray<T>(raw: unknown): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.items))   return obj.items   as T[];
  if (Array.isArray(obj.results)) return obj.results as T[];
  if (Array.isArray(obj.data))    return obj.data    as T[];
  return [];
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return 'À l\'instant';
  if (diff < 3600)  return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return `${Math.floor(diff / 86400)} j`;
}

function fmtCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ── Follow hook ───────────────────────────────────────────────────────────────
function useFollow() {
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const was = followedIds.has(id);
    setFollowedIds(prev => { const s = new Set(prev); was ? s.delete(id) : s.add(id); return s; });
    try {
      if (was) await apiClient.delete(Endpoints.users.follow(id));
      else     await apiClient.post(Endpoints.users.follow(id));
    } catch {
      setFollowedIds(prev => { const s = new Set(prev); was ? s.add(id) : s.delete(id); return s; });
    }
  }, [followedIds]);

  return { followedIds, toggle };
}

// ── Author row ────────────────────────────────────────────────────────────────
const KIND_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  concert:    { label: 'Concert',     bg: 'linear-gradient(135deg,#7B3FF2,#E0389A)', color: '#fff' },
  event:      { label: 'Événement',   bg: 'linear-gradient(135deg,#FF7A2F,#F59E0B)', color: '#fff' },
  post:       { label: 'Post',        bg: 'rgba(123,63,242,0.12)',                   color: 'var(--primary)' },
  reel:       { label: 'Reel',        bg: 'linear-gradient(135deg,#F0365A,#E0389A)', color: '#fff' },
};

function AuthorRow({
  author, authorId, publishedAt, isFollowed, onAuthorClick, onFollowClick, kind,
}: {
  author: { display_name?: string | null; username?: string | null; avatar_url?: string | null; is_verified?: boolean } | undefined;
  authorId: string | undefined;
  publishedAt?: string | null;
  isFollowed: boolean;
  onAuthorClick: (e: React.MouseEvent) => void;
  onFollowClick: (e: React.MouseEvent) => void;
  kind?: string;
}) {
  if (!author && !authorId) return null;
  const name  = author?.display_name ?? author?.username ?? 'Auteur';
  const badge = kind ? KIND_BADGE[kind] : undefined;
  return (
    <div className="flex items-center gap-2 px-3 pt-3 pb-1">
      <button onClick={onAuthorClick} className="flex items-center gap-2 min-w-0 flex-1">
        <Avatar src={author?.avatar_url} name={name} size="xs" verified={author?.is_verified} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{name}</span>
            {badge && (
              <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: badge.bg, color: badge.color }}>
                {badge.label}
              </span>
            )}
          </div>
          {publishedAt && (
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(publishedAt)}</span>
          )}
        </div>
      </button>
      <button onClick={onFollowClick}
        className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0 transition-all"
        style={isFollowed
          ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
          : { background: 'rgba(123,63,242,0.1)', color: 'var(--primary)', border: '1px solid rgba(123,63,242,0.25)' }}
        onMouseEnter={e => { if (!isFollowed) { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; } }}
        onMouseLeave={e => { if (!isFollowed) { e.currentTarget.style.background = 'rgba(123,63,242,0.1)'; e.currentTarget.style.color = 'var(--primary)'; } }}>
        {isFollowed ? <><UserCheck size={11} /> Suivi</> : <><UserPlus size={11} /> Suivre</>}
      </button>
    </div>
  );
}

// ── Comments sheet (style mobile — monte depuis le bas) ───────────────────────
function CommentsModal({
  open, onClose, targetKind, targetId, initialCount: _initialCount, onCountChange,
}: {
  open: boolean;
  onClose: () => void;
  targetKind: 'event' | 'concert' | 'post' | 'reel';
  targetId: string;
  initialCount: number;
  onCountChange: (n: number) => void;
}) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [body,     setBody]     = useState('');
  const [sending,  setSending]  = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);

  const qParam = targetKind === 'post'    ? `post_id=${targetId}`
               : targetKind === 'reel'    ? `reel_id=${targetId}`
               : targetKind === 'concert' ? `concert_id=${targetId}`
               :                            `event_id=${targetId}`;

  useEffect(() => {
    if (!open) return;
    setComments([]);
    setLoading(true);
    apiClient.get<any>(`${Endpoints.social.comments}?${qParam}&limit=50`)
      .then(res => setComments(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [open, targetId]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    const payload: Record<string, string> = { body: body.trim() };
    if (targetKind === 'post')    payload.post_id    = targetId;
    if (targetKind === 'reel')    payload.reel_id    = targetId;
    if (targetKind === 'concert') payload.concert_id = targetId;
    if (targetKind === 'event')   payload.event_id   = targetId;
    try {
      const res = await apiClient.post<any>(Endpoints.social.comments, payload);
      setComments(prev => [...prev, res.data]);
      onCountChange(comments.length + 1);
      setBody('');
      setTimeout(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, 50);
    } catch { /* silencieux */ }
    finally { setSending(false); }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', animation: 'fadeIn 0.2s ease-out' }}
        onClick={onClose}
      />

      {/* Sheet — monte depuis le bas, max 75vh, centré horizontalement sur desktop */}
      <div
        className="fixed z-50 left-0 right-0 bottom-0 flex flex-col"
        style={{
          maxHeight: '75vh',
          animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)',
          background: 'var(--surface)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.35)',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          /* centré sur grand écran */
          marginLeft: 'auto',
          marginRight: 'auto',
          maxWidth: '600px',
          /* full width sur mobile, limité sur desktop */
        }}
      >
        {/* Poignée */}
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="font-black text-base" style={{ color: 'var(--text-primary)' }}>
            Commentaires
            {comments.length > 0 && (
              <span className="ml-2 text-sm font-normal" style={{ color: 'var(--text-tertiary)' }}>
                {fmtCount(comments.length)}
              </span>
            )}
          </p>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}>
            <X size={16} />
          </button>
        </div>

        {/* Liste commentaires */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-5" style={{ minHeight: 0 }}>
          {loading ? (
            <div className="flex justify-center py-10"><Spinner size="sm" /></div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2">
              <MessageCircle size={28} style={{ color: 'var(--text-tertiary)', opacity: 0.35 }} />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Aucun commentaire. Sois le premier !</p>
            </div>
          ) : (
            comments.map((c: any) => (
              <div key={c.id} className="flex gap-3 items-start">
                <Avatar
                  src={c.author?.avatar_url}
                  name={c.author?.display_name ?? c.author?.username ?? '?'}
                  size="sm"
                  verified={c.author?.is_verified}
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  {/* Bulle style mobile */}
                  <div className="inline-block rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-full"
                    style={{ background: 'var(--bg-secondary)' }}>
                    <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                      {c.author?.display_name ?? c.author?.username ?? 'Utilisateur'}
                    </p>
                    <p className="text-sm leading-relaxed break-words" style={{ color: 'var(--text-primary)' }}>
                      {c.body}
                    </p>
                  </div>
                  <p className="text-[11px] mt-1 ml-1" style={{ color: 'var(--text-tertiary)' }}>
                    {timeAgo(c.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <form onSubmit={submit}
          className="flex items-center gap-3 px-4 py-3 shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}>
          {user && (
            <Avatar src={user.avatar_url} name={user.display_name ?? user.username ?? ''} size="sm" className="shrink-0" />
          )}
          <input
            ref={inputRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Écrire un commentaire…"
            className="flex-1 text-sm rounded-full px-4 py-2.5 outline-none transition-all"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid transparent',
              color: 'var(--text-primary)',
            }}
            onFocus={e => (e.target.style.border = '1px solid var(--primary)')}
            onBlur={e  => (e.target.style.border = '1px solid transparent')}
          />
          <button type="submit" disabled={!body.trim() || sending}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all"
            style={{
              background: body.trim() ? 'var(--primary)' : 'var(--bg-secondary)',
              color: body.trim() ? '#fff' : 'var(--text-tertiary)',
            }}>
            {sending ? <Spinner size="sm" /> : <Send size={15} />}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
      `}</style>
    </>
  );
}

// ── Share toast ───────────────────────────────────────────────────────────────
function ShareToast({ onDone }: { onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, []);
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-white shadow-lg"
      style={{ background: 'rgba(30,30,40,0.92)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <Check size={14} /><span>Lien copié !</span>
    </div>
  );
}

// ── Action bar — per-card state ───────────────────────────────────────────────
function ActionBar({
  id, kind, initialLiked, initialLikeCount, initialCommentCount = 0, shareCount = 0,
  titleForShare, onOpenComments,
}: {
  id: string;
  kind: 'event' | 'concert' | 'post' | 'reel';
  initialLiked: boolean;
  initialLikeCount: number;
  initialCommentCount?: number;
  shareCount?: number;
  titleForShare?: string;
  onOpenComments: (id: string, kind: 'event' | 'concert' | 'post' | 'reel', count: number) => void;
}) {
  const [liked,        setLiked]        = useState(initialLiked);
  const [likeCount,    setLikeCount]    = useState(initialLikeCount);
  const [commentCount] = useState(initialCommentCount ?? 0);
  const [saved,        setSaved]        = useState(false);
  const [shareToast,   setShareToast]   = useState(false);

  async function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    const was = liked;
    setLiked(!was);
    setLikeCount(n => n + (was ? -1 : 1));
    try {
      if (kind === 'post') {
        await apiClient.post(`${Endpoints.posts.react(id)}?reaction_type=like`);
      } else {
        await apiClient.post(Endpoints.social.toggleReaction, {
          ...(kind === 'event'   ? { event_id: id }   :
              kind === 'concert' ? { concert_id: id } :
                                   { reel_id: id }),
          reaction_type: 'like',
        });
      }
    } catch {
      setLiked(was);
      setLikeCount(n => n + (was ? 1 : -1));
    }
  }

  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const path = kind === 'concert' ? 'concerts' : kind === 'event' ? 'events' : kind === 'post' ? 'posts' : 'reels';
    const url  = `${window.location.origin}/${path}/${id}`;

    if (navigator.share) {
      navigator.share({ title: titleForShare ?? '', url });
    } else {
      await navigator.clipboard.writeText(url);
      setShareToast(true);
    }
    // Record share in backend
    try {
      await apiClient.post(Endpoints.social.share, {
        ...(kind === 'event'   ? { event_id: id }   :
            kind === 'concert' ? { concert_id: id } :
            kind === 'reel'    ? { reel_id: id }    :
                                 { post_id: id }),
        platform: 'link',
      });
    } catch { /* silencieux */ }
  }

  return (
    <>
      <div className="flex items-center gap-1 px-2 py-2" style={{ borderTop: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}>
        {/* Like */}
        <button onClick={handleLike}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{ color: liked ? '#E0389A' : 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Heart size={15} fill={liked ? '#E0389A' : 'none'} strokeWidth={liked ? 0 : 2} />
          {likeCount > 0 && <span>{fmtCount(likeCount)}</span>}
        </button>

        {/* Comment */}
        <button onClick={e => { e.stopPropagation(); onOpenComments(id, kind, commentCount); }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <MessageCircle size={15} />
          {commentCount > 0 && <span>{fmtCount(commentCount)}</span>}
        </button>

        {/* Share */}
        <button onClick={handleShare}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Share2 size={15} />
          {(shareCount ?? 0) > 0 && <span>{fmtCount(shareCount!)}</span>}
        </button>

        {/* Save */}
        <button onClick={e => { e.stopPropagation(); setSaved(v => !v); }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ml-auto"
          style={{ color: saved ? 'var(--primary)' : 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Bookmark size={15} fill={saved ? 'var(--primary)' : 'none'} />
        </button>
      </div>

      {/* Share toast — local */}
      {shareToast && <ShareToast onDone={() => setShareToast(false)} />}
    </>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3 p-4">
        <div className="w-9 h-9 rounded-full shrink-0" style={{ background: 'var(--bg-tertiary)' }} />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 rounded-full w-1/3" style={{ background: 'var(--bg-tertiary)' }} />
          <div className="h-2.5 rounded-full w-1/4" style={{ background: 'var(--bg-secondary)' }} />
        </div>
      </div>
      <div style={{ aspectRatio: '16/9', background: 'var(--bg-tertiary)' }} />
      <div className="p-3 space-y-2">
        <div className="h-3.5 rounded-full w-3/4" style={{ background: 'var(--bg-tertiary)' }} />
        <div className="h-2.5 rounded-full w-1/2" style={{ background: 'var(--bg-secondary)' }} />
      </div>
    </div>
  );
}

// ── Hero LIVE ─────────────────────────────────────────────────────────────────
function LiveHero({ concert }: { concert: Concert }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/concerts/${concert.id}`)}
      className="relative overflow-hidden rounded-2xl cursor-pointer group animate-reveal-up"
      style={{ aspectRatio: '21/9' }}
    >
      {concert.thumbnail_url ? (
        <img src={concert.thumbnail_url} alt={concert.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
      ) : (
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg,#1a0533 0%,#7B3FF2 50%,#E0389A 100%)' }}>
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <Music size={120} className="text-white" />
          </div>
        </div>
      )}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)' }} />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: 'linear-gradient(135deg, rgba(123,63,242,0.2), rgba(224,56,154,0.1))' }} />

      <div className="absolute top-4 left-4 right-4 flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full text-white tracking-wide"
          style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A)', boxShadow: '0 0 24px rgba(240,54,90,0.6)' }}>
          <Radio size={11} strokeWidth={3} />EN DIRECT
        </span>
        {(concert.current_viewers ?? 0) > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-white font-semibold px-2.5 py-1.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <Users size={11} />{(concert.current_viewers ?? 0).toLocaleString()}
          </span>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5">
        {concert.genre && (
          <span className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full mb-2 uppercase tracking-wider"
            style={{ background: 'rgba(123,63,242,0.6)', color: '#E8D5FF', backdropFilter: 'blur(4px)' }}>
            {concert.genre}
          </span>
        )}
        <h2 className="text-white font-black text-xl sm:text-2xl leading-tight drop-shadow-lg">{concert.title}</h2>
        <div className="flex items-center gap-3 mt-2">
          <Avatar src={concert.artist?.avatar_url} name={concert.artist?.display_name ?? concert.artist?.username ?? ''} size="xs" />
          <span className="text-white/80 text-sm font-medium">{concert.artist?.display_name ?? concert.artist?.username}</span>
          {concert.venue_city && (
            <span className="flex items-center gap-1 text-white/60 text-xs"><MapPin size={10} />{concert.venue_city}</span>
          )}
        </div>
        <div className="mt-3">
          <button onClick={e => e.stopPropagation()}
            className="flex items-center gap-2 text-sm font-black px-5 py-2.5 rounded-xl text-white transition-all active:scale-95 hover:scale-105"
            style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A)', boxShadow: '0 6px 24px rgba(240,54,90,0.55)' }}>
            <Play size={14} fill="white" />Regarder maintenant
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Concert card ──────────────────────────────────────────────────────────────
type OpenCommentsFn = (id: string, kind: 'event'|'concert'|'post'|'reel', count: number) => void;

function ConcertCard({ concert, delay = 0, followedIds, onFollow, onOpenComments }: {
  concert: Concert; delay?: number;
  followedIds: Set<string>; onFollow: (id: string, e: React.MouseEvent) => void;
  onOpenComments: OpenCommentsFn;
}) {
  const navigate   = useNavigate();
  const isLive     = concert.status === 'live';
  const authorId   = concert.artist?.id;
  const isFollowed = authorId ? followedIds.has(authorId) : false;

  return (
    <div className="rounded-2xl overflow-hidden animate-reveal-up flex flex-col"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', animationDelay: `${delay}s` }}>

      <AuthorRow
        author={concert.artist}
        authorId={authorId}
        publishedAt={concert.created_at}
        isFollowed={isFollowed}
        onAuthorClick={e => { e.stopPropagation(); if (authorId) navigate(`/user/${authorId}`); }}
        onFollowClick={e => authorId && onFollow(authorId, e)}
        kind="concert"
      />

      <div onClick={() => navigate(`/concerts/${concert.id}`)}
        className="relative overflow-hidden cursor-pointer group"
        style={{ aspectRatio: '16/9' }}>
        {concert.thumbnail_url ? (
          <img src={concert.thumbnail_url} alt={concert.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#1a0533,#7B3FF2,#E0389A)' }}>
            <Music size={40} className="text-white opacity-40" />
          </div>
        )}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          {isLive && (
            <span className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full text-white"
              style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A)', boxShadow: '0 0 10px rgba(240,54,90,0.5)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </span>
          )}
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white"
            style={{ background: concert.access_type === 'free' ? 'rgba(34,197,94,0.8)' : 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
            {concert.access_type === 'free' ? 'Gratuit' : concert.access_type === 'ticket' ? `${concert.ticket_price ?? '?'}€` : 'Abo'}
          </span>
        </div>
      </div>

      <div onClick={() => navigate(`/concerts/${concert.id}`)} className="px-3 pt-2.5 pb-1 cursor-pointer space-y-1">
        <p className="font-bold text-sm leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>{concert.title}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {concert.genre && <span>{concert.genre}</span>}
          {!isLive && concert.scheduled_at && (
            <span className="flex items-center gap-1"><Clock size={11} />{format(new Date(concert.scheduled_at), 'd MMM · HH:mm', { locale: fr })}</span>
          )}
          {concert.venue_city && <span className="flex items-center gap-1"><MapPin size={11} />{concert.venue_city}</span>}
        </div>
      </div>

      <ActionBar
        id={concert.id} kind="concert"
        initialLiked={false} initialLikeCount={0}
        titleForShare={concert.title}
        onOpenComments={onOpenComments}
      />
    </div>
  );
}

// ── Event card ────────────────────────────────────────────────────────────────
function EventCard({ event, delay = 0, followedIds, onFollow, onOpenComments }: {
  event: Event; delay?: number;
  followedIds: Set<string>; onFollow: (id: string, e: React.MouseEvent) => void;
  onOpenComments: OpenCommentsFn;
}) {
  const navigate   = useNavigate();
  const color      = EVENT_COLORS[event.event_type ?? 'other'] ?? EVENT_COLORS.other;
  const authorId   = event.organizer?.id;
  const isFollowed = authorId ? followedIds.has(authorId) : false;

  return (
    <div className="rounded-2xl overflow-hidden animate-reveal-up flex flex-col"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', animationDelay: `${delay}s` }}>

      <AuthorRow
        author={event.organizer}
        authorId={authorId}
        publishedAt={event.created_at}
        isFollowed={isFollowed}
        onAuthorClick={e => { e.stopPropagation(); if (authorId) navigate(`/user/${authorId}`); }}
        onFollowClick={e => authorId && onFollow(authorId, e)}
        kind="event"
      />

      <div onClick={() => navigate(`/events/${event.id}`)}
        className="relative overflow-hidden cursor-pointer group"
        style={{ aspectRatio: '16/9' }}>
        {event.thumbnail_url ? (
          <img src={event.thumbnail_url} alt={event.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg,${color}CC,${color}55)` }}>
            <Calendar size={40} className="text-white opacity-40" />
          </div>
        )}
        <div className="absolute top-2.5 left-2.5">
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full text-white capitalize"
            style={{ background: `${color}CC`, backdropFilter: 'blur(4px)' }}>
            {event.event_type ?? 'Événement'}
          </span>
        </div>
        {event.starts_at && (
          <div className="absolute top-2.5 right-2.5">
            <div className="flex flex-col items-center w-10 h-10 rounded-xl text-white font-black justify-center"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <span className="text-sm leading-none">{format(new Date(event.starts_at), 'd')}</span>
              <span className="text-[9px] uppercase opacity-70">{format(new Date(event.starts_at), 'MMM', { locale: fr })}</span>
            </div>
          </div>
        )}
      </div>

      <div onClick={() => navigate(`/events/${event.id}`)} className="px-3 pt-2.5 pb-1 cursor-pointer space-y-1">
        <p className="font-bold text-sm leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>{event.title}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {event.venue_city && <span className="flex items-center gap-1"><MapPin size={11} />{event.venue_city}{event.venue_country ? `, ${event.venue_country}` : ''}</span>}
          {event.starts_at && <span><Clock size={11} className="inline mr-1" />{format(new Date(event.starts_at), 'd MMM · HH:mm', { locale: fr })}</span>}
          {event.access_type === 'free' && <span className="font-semibold" style={{ color: '#36D9A0' }}>Gratuit</span>}
          {event.access_type === 'ticket' && event.ticket_price && <span className="font-semibold" style={{ color: color }}>{event.ticket_price}€</span>}
        </div>
      </div>

      <ActionBar
        id={event.id} kind="event"
        initialLiked={false} initialLikeCount={0}
        titleForShare={event.title}
        onOpenComments={onOpenComments}
      />
    </div>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────
function PostCard({ post, delay = 0, followedIds, onFollow, onOpenComments }: {
  post: Post; delay?: number;
  followedIds: Set<string>; onFollow: (id: string, e: React.MouseEvent) => void;
  onOpenComments: OpenCommentsFn;
}) {
  const navigate   = useNavigate();
  const authorId   = post.author?.id;
  const isFollowed = authorId ? followedIds.has(authorId) : false;
  const [expanded, setExpanded] = useState(false);
  const body = post.body ?? '';
  const isLong = body.length > 200;

  return (
    <div className="rounded-2xl overflow-hidden animate-reveal-up flex flex-col"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', animationDelay: `${delay}s` }}>

      <AuthorRow
        author={post.author ?? undefined}
        authorId={authorId}
        publishedAt={post.created_at}
        isFollowed={isFollowed}
        onAuthorClick={e => { e.stopPropagation(); if (authorId) navigate(`/user/${authorId}`); }}
        onFollowClick={e => authorId && onFollow(authorId, e)}
        kind="post"
      />

      {/* Body */}
      {body && (
        <div className="px-3 pt-1 pb-2 cursor-pointer" onClick={() => navigate(`/posts/${post.id}`)}>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            {isLong && !expanded ? body.slice(0, 200) + '…' : body}
          </p>
          {isLong && (
            <button
              onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
              className="text-xs font-semibold mt-1"
              style={{ color: 'var(--primary)' }}>
              {expanded ? 'Voir moins' : 'Voir plus'}
            </button>
          )}
          {post.feeling && (
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)' }}>
              {post.feeling}
            </span>
          )}
        </div>
      )}

      {/* Image */}
      {post.image_url && (
        <div onClick={() => navigate(`/posts/${post.id}`)}
          className="relative overflow-hidden cursor-pointer group"
          style={{ aspectRatio: '16/9' }}>
          <img src={post.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        </div>
      )}

      <ActionBar
        id={post.id} kind="post"
        initialLiked={post.user_reaction === 'like'}
        initialLikeCount={post.like_count ?? 0}
        initialCommentCount={post.comment_count ?? 0}
        shareCount={post.share_count ?? 0}
        titleForShare={post.body?.slice(0, 60)}
        onOpenComments={onOpenComments}
      />
    </div>
  );
}

// ── Reel card (inline preview) ────────────────────────────────────────────────
function ReelCard({ reel, delay = 0 }: {
  reel: Reel; delay?: number;
}) {
  const navigate  = useNavigate();
  const videoRef  = useRef<HTMLVideoElement>(null);
  const cardRef   = useRef<HTMLDivElement>(null);

  // Autoplay when visible, pause when out of view
  useEffect(() => {
    const el = cardRef.current;
    const video = videoRef.current;
    if (!el || !video) return;
    const obs = new IntersectionObserver(
      ([entry]) => { entry.isIntersecting ? video.play().catch(() => {}) : video.pause(); },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={cardRef} className="rounded-2xl overflow-hidden animate-reveal-up"
      style={{ background: '#000', border: '1px solid var(--border)', animationDelay: `${delay}s`, aspectRatio: '9/16', maxHeight: 480, position: 'relative', cursor: 'pointer' }}
      onClick={() => navigate(`/reels?id=${reel.id}`)}>

      {/* Video autoplay muted — pointer-events-none so clicks go to the wrapper */}
      {reel.video_url ? (
        <video
          ref={videoRef}
          src={reel.video_url}
          poster={reel.thumbnail_url ?? undefined}
          muted
          loop
          playsInline
          className="w-full h-full object-contain pointer-events-none"
        />
      ) : reel.thumbnail_url ? (
        <img src={reel.thumbnail_url} alt="" className="w-full h-full object-contain pointer-events-none" />
      ) : (
        <div className="w-full h-full flex items-center justify-center pointer-events-none"
          style={{ background: 'linear-gradient(135deg,#0f0f1a,#1a0533,#2d1052)' }}>
          <Play size={40} className="text-white opacity-40" />
        </div>
      )}

      {/* Gradient overlay bottom */}
      <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)' }} />

      {/* Reel badge */}
      <div className="absolute top-2.5 left-2.5">
        <span className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full text-white"
          style={{ background: 'linear-gradient(135deg,#E0389A,#7B3FF2)' }}>
          <Film size={10} /> Reel
        </span>
      </div>

      {/* Caption + view count bottom */}
      <div className="absolute bottom-0 inset-x-0 px-3 pb-3">
        {reel.caption && (
          <p className="text-xs text-white font-medium line-clamp-2 mb-1">{reel.caption}</p>
        )}
        {reel.view_count > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-white/70 font-semibold">
            <Play size={9} fill="white" className="opacity-70" /> {fmtCount(reel.view_count)}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Suggestions inline block ──────────────────────────────────────────────────
function SuggestionsInline() {
  const navigate = useNavigate();
  const [users,   setUsers]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiClient.get<any>(`${Endpoints.users.suggestions}?limit=6`)
      .then(res => setUsers(toArray(res.data)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function follow(id: string) {
    const was = followedIds.has(id);
    setFollowedIds(prev => { const s = new Set(prev); was ? s.delete(id) : s.add(id); return s; });
    try {
      if (was) await apiClient.delete(Endpoints.users.follow(id));
      else     await apiClient.post(Endpoints.users.follow(id));
    } catch {
      setFollowedIds(prev => { const s = new Set(prev); was ? s.add(id) : s.delete(id); return s; });
    }
  }

  if (!loading && users.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3.5"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Sparkles size={14} style={{ color: 'var(--primary)' }} />
          <p className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>Personnes à suivre</p>
        </div>
        <button onClick={() => navigate('/search')}
          className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
          Voir plus →
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Spinner size="sm" /></div>
      ) : (
        <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-none">
          {users.map((u: any) => {
            const followed = followedIds.has(u.id);
            return (
              <div key={u.id} className="flex flex-col items-center gap-2 shrink-0 w-20">
                <button onClick={() => navigate(`/user/${u.id}`)}>
                  <Avatar src={u.avatar_url} name={u.display_name ?? u.username} size="md" verified={u.is_verified} />
                </button>
                <p className="text-[11px] font-semibold text-center truncate w-full"
                  style={{ color: 'var(--text-primary)' }}>
                  {u.display_name ?? u.username}
                </p>
                <button onClick={() => follow(u.id)}
                  className="text-[11px] font-bold px-3 py-1 rounded-lg w-full transition-all"
                  style={followed
                    ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                    : { background: 'rgba(123,63,242,0.1)', color: 'var(--primary)', border: '1px solid rgba(123,63,242,0.25)' }}>
                  {followed ? 'Suivi' : 'Suivre'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Upcoming events panel ─────────────────────────────────────────────────────
function UpcomingEventsPanel() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get<any>(`${Endpoints.events.list}?limit=4&status=published`)
      .then(res => setEvents(toArray<any>(res.data).slice(0, 4)))
      .catch(() => {});
  }, []);

  if (events.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Calendar size={13} style={{ color: '#F59E0B' }} />
          <p className="font-black text-xs" style={{ color: 'var(--text-primary)' }}>À venir</p>
        </div>
        <button onClick={() => navigate('/events')} className="text-[11px] font-semibold" style={{ color: 'var(--primary)' }}>Voir tout</button>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {events.map((e: any) => {
          const color = EVENT_COLORS[e.event_type ?? 'other'] ?? EVENT_COLORS.other;
          return (
            <div key={e.id}
              onClick={() => navigate(`/events/${e.id}`)}
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all"
              onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--bg-secondary)')}
              onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
              <div className="w-8 h-8 rounded-lg flex flex-col items-center justify-center shrink-0 font-black text-white"
                style={{ background: `${color}CC` }}>
                {e.starts_at && <>
                  <span className="text-[11px] leading-none">{format(new Date(e.starts_at), 'd')}</span>
                  <span className="text-[8px] uppercase opacity-80">{format(new Date(e.starts_at), 'MMM', { locale: fr })}</span>
                </>}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate leading-snug" style={{ color: 'var(--text-primary)' }}>{e.title}</p>
                {e.venue_city && <p className="text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}><MapPin size={8} className="inline mr-0.5" />{e.venue_city}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Trending panel ────────────────────────────────────────────────────────────
function TrendingPanel() {
  const navigate = useNavigate();
  const [concerts, setConcerts] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get<any>(`${Endpoints.concerts.list}?limit=4&status=published`)
      .then(res => setConcerts(toArray<any>(res.data).slice(0, 4)))
      .catch(() => {});
  }, []);

  if (concerts.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Flame size={13} style={{ color: '#F0365A' }} />
          <p className="font-black text-xs" style={{ color: 'var(--text-primary)' }}>Tendances</p>
        </div>
        <button onClick={() => navigate('/concerts')} className="text-[11px] font-semibold" style={{ color: 'var(--primary)' }}>Voir tout</button>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {concerts.map((c: any, i: number) => (
          <div key={c.id}
            onClick={() => navigate(`/concerts/${c.id}`)}
            className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all"
            onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
            <span className="text-sm font-black w-4 shrink-0" style={{ color: i < 3 ? 'var(--primary)' : 'var(--text-tertiary)' }}>
              {i + 1}
            </span>
            {c.thumbnail_url
              ? <img src={c.thumbnail_url} alt={c.title} className="w-8 h-8 rounded-lg object-cover shrink-0" />
              : <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}><Music size={12} className="text-white" /></div>}
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate leading-snug" style={{ color: 'var(--text-primary)' }}>{c.title}</p>
              {c.genre && <p className="text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}>{c.genre}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CommunitiesInline ─────────────────────────────────────────────────────────
const COMM_GRADIENTS = [
  ['#7B3FF2','#E0389A'],['#0EA5E9','#6366F1'],['#10B981','#0EA5E9'],
  ['#F59E0B','#EF4444'],['#EC4899','#8B5CF6'],['#14B8A6','#3B82F6'],
];
function commGradient(name: string): [string, string] {
  return COMM_GRADIENTS[(name.charCodeAt(0) || 0) % COMM_GRADIENTS.length] as [string, string];
}
function fmtCommCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function CommunitiesInline({ communities }: { communities: Community[] }) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [joining, setJoining] = useState<Set<string>>(new Set());
  const [joined,  setJoined]  = useState<Set<string>>(new Set());

  async function handleJoin(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setJoining(prev => new Set([...prev, id]));
    try {
      await apiClient.post(Endpoints.communities.join(id));
      setJoined(prev => new Set([...prev, id]));
    } catch { }
    finally { setJoining(prev => { const n = new Set(prev); n.delete(id); return n; }); }
  }

  function scrollBy(dir: number) {
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' });
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3.5"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Users size={14} style={{ color: 'var(--primary)' }} />
          <p className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>Communautés</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => scrollBy(-1)}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <ChevronLeft size={14} />
          </button>
          <button onClick={() => scrollBy(1)}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <ChevronRight size={14} />
          </button>
          <button onClick={() => navigate('/communities')}
            className="text-xs font-bold ml-1" style={{ color: 'var(--primary)' }}>
            Voir tout
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex gap-3 p-4 overflow-x-auto scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}>
        {communities.map(c => {
          const [g1, g2] = commGradient(c.name);
          const count    = c.members_count ?? c.member_count ?? 0;
          const isJoined = joined.has(c.id);
          const isJoining = joining.has(c.id);
          return (
            <div key={c.id}
              className="flex flex-col rounded-2xl overflow-hidden cursor-pointer shrink-0 transition-transform hover:scale-[1.02]"
              style={{ width: 160, scrollSnapAlign: 'start', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              onClick={() => navigate(`/communities/${c.id}`)}>
              {/* Bannière */}
              <div className="relative" style={{ height: 72 }}>
                {c.banner_url
                  ? <img src={c.banner_url} className="w-full h-full object-cover" alt="" />
                  : <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }} />
                }
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
                <span className="absolute bottom-1.5 right-2 text-[9px] font-bold text-white flex items-center gap-0.5">
                  <Users size={8} /> {fmtCommCount(count)}
                </span>
              </div>
              {/* Avatar flottant */}
              <div className="relative px-2.5 pb-2.5" style={{ marginTop: -14 }}>
                {c.avatar_url
                  ? <img src={c.avatar_url} className="w-7 h-7 rounded-lg object-cover"
                      style={{ border: '2px solid var(--bg-secondary)' }} alt="" />
                  : <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white text-xs"
                      style={{ background: `linear-gradient(135deg, ${g1}, ${g2})`, border: '2px solid var(--bg-secondary)' }}>
                      {c.name[0]?.toUpperCase()}
                    </div>
                }
                <p className="font-bold text-xs mt-1.5 truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                {c.description && (
                  <p className="text-[10px] mt-0.5 line-clamp-2 leading-tight" style={{ color: 'var(--text-tertiary)' }}>
                    {c.description}
                  </p>
                )}
                <button
                  onClick={e => handleJoin(e, c.id)}
                  disabled={isJoining || isJoined}
                  className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all disabled:opacity-60"
                  style={{ background: isJoined ? '#22c55e' : `linear-gradient(90deg, ${g1}, ${g2})` }}>
                  {isJoining ? <Spinner size="sm" /> : isJoined ? <><Check size={10} /> Rejoint</> : <><UserPlus size={10} /> Rejoindre</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Suggestions sidebar ───────────────────────────────────────────────────────
function SuggestionsPanel() {
  const navigate = useNavigate();
  const [users,   setUsers]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<any>(`${Endpoints.users.suggestions}?limit=5`)
      .then(res => setUsers(toArray(res.data)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-2xl overflow-hidden sticky top-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 px-4 py-3.5"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <Sparkles size={14} style={{ color: 'var(--primary)' }} />
        <p className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>Suggestions</p>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="sm" /></div>
      ) : users.length === 0 ? (
        <p className="text-center py-8 text-xs" style={{ color: 'var(--text-tertiary)' }}>Aucune suggestion</p>
      ) : (
        <>
          {users.map((u: any, i: number) => (
            <div key={u.id}
              className="flex items-center gap-3 px-4 py-2.5 transition-all cursor-pointer"
              style={{ borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <button onClick={() => navigate(`/user/${u.id}`)} className="shrink-0">
                <Avatar src={u.avatar_url} name={u.display_name ?? u.username} size="sm" verified={u.is_verified} />
              </button>
              <button onClick={() => navigate(`/user/${u.id}`)} className="min-w-0 flex-1 text-left">
                <p className="text-sm font-semibold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {u.display_name ?? u.username}
                </p>
                {u.username && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>@{u.username}</p>}
              </button>
              <button
                className="shrink-0 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition-all"
                style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)', border: '1px solid rgba(123,63,242,0.2)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(123,63,242,0.1)'; e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = 'rgba(123,63,242,0.2)'; }}>
                <UserPlus size={11} /> Suivre
              </button>
            </div>
          ))}
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button onClick={() => navigate('/search')}
              className="text-xs font-bold w-full text-center py-1.5 rounded-xl transition-all"
              style={{ color: 'var(--primary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(123,63,242,0.07)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              Voir plus →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Communities sidebar panel ─────────────────────────────────────────────────
function CommunitiesSidePanel() {
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    apiClient.get<any>(`${Endpoints.communities.discover}?limit=10`)
      .then(res => {
        const raw: Community[] = Array.isArray(res.data) ? res.data : res.data?.items ?? res.data?.data ?? [];
        setCommunities([...raw].sort(() => Math.random() - 0.5).slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && communities.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden sticky top-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3.5"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Users size={14} style={{ color: 'var(--primary)' }} />
          <p className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>Communautés</p>
        </div>
        <button onClick={() => navigate('/communities')}
          className="text-xs font-bold" style={{ color: 'var(--primary)' }}>Voir tout</button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="sm" /></div>
      ) : (
        <>
          {communities.map((c, i) => {
            const [g1, g2] = commGradient(c.name);
            const count    = c.members_count ?? c.member_count ?? 0;
            return (
              <button key={c.id}
                onClick={() => navigate(`/communities/${c.id}`)}
                className="w-full flex items-center gap-3 px-4 py-2.5 transition-all text-left"
                style={{ borderBottom: i < communities.length - 1 ? '1px solid var(--border)' : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                {c.avatar_url
                  ? <img src={c.avatar_url} className="w-9 h-9 rounded-xl object-cover shrink-0" alt="" />
                  : <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0"
                      style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
                      {c.name[0]?.toUpperCase()}
                    </div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {fmtCommCount(count)} membres
                  </p>
                </div>
                {c.is_private && <Lock size={11} style={{ color: 'var(--text-tertiary)', shrink: 0 }} />}
              </button>
            );
          })}
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button onClick={() => navigate('/communities')}
              className="text-xs font-bold w-full text-center py-1.5 rounded-xl transition-all"
              style={{ color: 'var(--primary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(123,63,242,0.07)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              Voir toutes les communautés →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHead({ icon, title, onMore }: {
  icon: React.ReactNode; title: string; onMore?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <span style={{ color: 'var(--primary)' }}>{icon}</span>
        <h2 className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      </div>
      {onMore && (
        <button onClick={onMore}
          className="flex items-center gap-1 text-sm font-semibold transition-all"
          style={{ color: 'var(--primary)' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          Voir tout <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const { user }   = useAuthStore();
  const navigate   = useNavigate();
  const [tab, setTab]       = useState<'all' | 'concerts' | 'events'>('all');
  const [items, setItems]   = useState<FeedItem[]>([]);
  const [live,  setLive]    = useState<Concert[]>([]);
  const [loading, setLoading]  = useState(true);
  const { followedIds, toggle: toggleFollow } = useFollow();
  const [commentTarget, setCommentTarget] = useState<{ id: string; kind: 'event'|'concert'|'post'|'reel'; count: number } | null>(null);

  function openComments(id: string, kind: 'event'|'concert'|'post'|'reel', count: number) {
    setCommentTarget({ id, kind, count });
  }
  async function loadFeed(filter: typeof tab) {
    setLoading(true);
    try {
      if (filter === 'all') {
        // Parallel load — apiClient.get returns { data, status }
        // /search/feed → { items: [{kind, ...fields}], total, page, limit }
        // /reels       → flat array  OR  { items: [...] }
        // /posts/feed  → flat array
        const [feedRes, reelsRes, postsRes, commRes] = await Promise.all([
          apiClient.get<any>(`${Endpoints.search.feed}?page=1&limit=40`).catch(() => null),
          apiClient.get<any>(`${Endpoints.reels.feed}?page=1&limit=20`).catch(() => null),
          apiClient.get<any>(`${Endpoints.posts.feed}?page=1&limit=20`).catch(() => null),
          apiClient.get<any>(`${Endpoints.communities.discover}?limit=8`).catch(() => null),
        ]);

        // /search/feed: { items: [{kind, id, ...fields}] }
        const feedRaw: any[] = feedRes ? toArray<any>(feedRes.data) : [];
        const feedItems: FeedItem[] = feedRaw
          .filter((d: any) => d.id && (d.kind === 'event' || d.kind === 'concert' || d.kind === 'reel'))
          .map((d: any) => ({ kind: d.kind as 'event' | 'concert' | 'reel', id: String(d.id), data: d }));

        // /reels: flat array or { items: [...] }
        const reelsRaw: any[] = reelsRes ? toArray<any>(reelsRes.data) : [];
        const reelItems: FeedItem[] = reelsRaw
          .filter((d: any) => d.id)
          .map((d: any) => ({ kind: 'reel' as const, id: String(d.id), data: d }));

        // /posts/feed: flat array
        const postsRaw: any[] = postsRes ? toArray<any>(postsRes.data) : [];
        const postItems: FeedItem[] = postsRaw
          .filter((d: any) => d.id)
          .map((d: any) => ({ kind: 'post' as const, id: String(d.id), data: d }));

        // Merge all, deduplicate by composite key
        const seen = new Set<string>();
        const deduped = [...feedItems, ...reelItems, ...postItems].filter(item => {
          const key = `${item.kind}-${item.id}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        // Fisher-Yates shuffle — truly random order every time
        for (let i = deduped.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [deduped[i], deduped[j]] = [deduped[j], deduped[i]];
        }

        // Inject suggestions block at random position 5–15
        if (deduped.length > 0) {
          const pos = Math.min(Math.floor(Math.random() * 11) + 5, deduped.length);
          deduped.splice(pos, 0, { kind: 'suggestions', id: '__suggestions__', data: null });
        }

        // Inject communities block at random position 10–20
        const commRaw: Community[] = commRes ? (Array.isArray(commRes.data) ? commRes.data : commRes.data?.items ?? commRes.data?.data ?? []) : [];
        if (commRaw.length > 0) {
          // Shuffle communities for random order each time
          const shuffled = [...commRaw].sort(() => Math.random() - 0.5);
          const cpos = Math.min(Math.floor(Math.random() * 11) + 10, deduped.length);
          deduped.splice(cpos, 0, { kind: 'communities', id: '__communities__', data: shuffled });
        }

        setItems(deduped);
      } else {
        // Filter-specific — sorted by date, no shuffle
        const results: FeedItem[] = [];
        if (filter === 'concerts') {
          const res = await apiClient.get<any>(`${Endpoints.concerts.list}?limit=30&status=published`).catch(() => null);
          if (res) toArray<Concert>(res.data).forEach(c => results.push({ kind: 'concert', id: c.id, data: c }));
        }
        if (filter === 'events') {
          const res = await apiClient.get<any>(`${Endpoints.events.list}?limit=30&status=published`).catch(() => null);
          if (res) toArray<Event>(res.data).forEach(e => results.push({ kind: 'event', id: e.id, data: e }));
        }
        results.sort((a, b) =>
          new Date((b.data as any).created_at ?? 0).getTime() -
          new Date((a.data as any).created_at ?? 0).getTime(),
        );
        setItems(results);
      }
    } catch { /* silencieux */ }
    finally { setLoading(false); }
  }

  // Load live concerts once
  useEffect(() => {
    apiClient.get<any>(Endpoints.concerts.live)
      .then(res => setLive(toArray<Concert>(res.data)))
      .catch(() => {});
  }, []);

  // Reload when tab changes
  useEffect(() => { loadFeed(tab); }, [tab]);

  function handleRefresh() { loadFeed(tab); }

  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="max-w-6xl mx-auto flex gap-5 items-start">

        {/* ── Left panel (xl+) ── */}
        <div className="w-56 shrink-0 hidden xl:flex flex-col gap-4 sticky top-4">
          <UpcomingEventsPanel />
          <TrendingPanel />
        </div>

        {/* ── Feed column ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Greeting */}
          <div className="flex items-start justify-between animate-reveal-up">
            <div>
              <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
                Bonjour,{' '}
                <span className="gradient-text">
                  {user?.display_name ?? user?.first_name ?? user?.username}
                </span>{' '}👋
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                {items.filter(i => i.kind !== 'suggestions').length > 0
                  ? `${items.filter(i => i.kind !== 'suggestions').length} éléments dans ton fil`
                  : 'Concerts, événements, reels et posts mélangés'}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 rounded-xl transition-all mt-1 shrink-0"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              title="Mélanger à nouveau">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* ── Stories ── */}
          <StoriesBar />

          {/* ── LIVE HERO ── */}
          {live.length > 0 && (
            <section className="space-y-3 animate-reveal-up delay-100">
              <SectionHead
                icon={
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-2.5 py-1 rounded-full text-white"
                    style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A)', boxShadow: '0 0 14px rgba(240,54,90,0.5)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />LIVE
                  </span>
                }
                title="En direct"
                onMore={() => navigate('/concerts')}
              />
              {live.slice(0, 1).map(c => <LiveHero key={c.id} concert={c} />)}
            </section>
          )}

          {/* ── Tabs ── */}
          <div className="flex items-center gap-2 animate-reveal-up delay-200">
            {(['all', 'concerts', 'events'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="text-sm font-bold px-4 py-2 rounded-xl transition-all"
                style={{
                  background: tab === t ? 'var(--primary)' : 'var(--surface)',
                  color:      tab === t ? '#fff' : 'var(--text-secondary)',
                  border:     `1px solid ${tab === t ? 'var(--primary)' : 'var(--border)'}`,
                  boxShadow:  tab === t ? '0 4px 16px rgba(123,63,242,0.35)' : 'none',
                }}>
                {t === 'all' ? 'Tout' : t === 'concerts' ? 'Concerts' : 'Événements'}
              </button>
            ))}
          </div>

          {/* ── Feed ── */}
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl p-12 text-center animate-scale-in"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg,rgba(123,63,242,0.12),rgba(224,56,154,0.08))', border: '1px solid rgba(123,63,242,0.15)' }}>
                <Flame size={28} style={{ color: 'var(--primary)' }} />
              </div>
              <p className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>Rien ici pour l'instant</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Revenez bientôt !</p>
              <button onClick={() => navigate('/search')} className="btn-primary mt-5 text-sm px-6">Explorer</button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 animate-reveal-up delay-300">
              {items.map((item, i) => {
                if (item.kind === 'suggestions') {
                  return <SuggestionsInline key="__suggestions__" />;
                }
                if (item.kind === 'communities') {
                  return <CommunitiesInline key="__communities__" communities={item.data} />;
                }
                if (item.kind === 'concert') {
                  return <ConcertCard key={`concert-${item.id}`} concert={item.data} delay={Math.min(i, 8) * 0.04} followedIds={followedIds} onFollow={toggleFollow} onOpenComments={openComments} />;
                }
                if (item.kind === 'event') {
                  return <EventCard key={`event-${item.id}`} event={item.data} delay={Math.min(i, 8) * 0.04} followedIds={followedIds} onFollow={toggleFollow} onOpenComments={openComments} />;
                }
                if (item.kind === 'post') {
                  return <PostCard key={`post-${item.id}`} post={item.data} delay={Math.min(i, 8) * 0.04} followedIds={followedIds} onFollow={toggleFollow} onOpenComments={openComments} />;
                }
                if (item.kind === 'reel') {
                  return <ReelCard key={`reel-${item.id}`} reel={item.data} delay={Math.min(i, 8) * 0.04} />;
                }
                return null;
              })}
            </div>
          )}
        </div>

        {/* ── Sidebar (xl+) ── */}
        <div className="w-64 shrink-0 hidden xl:block space-y-4">
          <SuggestionsPanel />
          <CommunitiesSidePanel />
        </div>

      </div>

      {/* ── Single global comments sheet ── */}
      <CommentsModal
        open={!!commentTarget}
        onClose={() => setCommentTarget(null)}
        targetKind={commentTarget?.kind ?? 'event'}
        targetId={commentTarget?.id ?? ''}
        initialCount={commentTarget?.count ?? 0}
        onCountChange={n => setCommentTarget(prev => prev ? { ...prev, count: n } : null)}
      />
    </div>
  );
}
