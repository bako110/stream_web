import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { encodeId } from '../utils/slugId';
import {
  Music, MapPin, Clock, Users, Play, Calendar,
  Flame, ChevronRight, UserPlus, UserCheck, Sparkles, Radio,
  Heart, MessageCircle, Share2, Bookmark, Film, RefreshCw,
  X, Send, Check, Plus, ChevronLeft, Eye, Trash2, Edit3, Copy,
  Image as ImageIcon, Video, Type, MoreHorizontal, Lock,
  Megaphone, ExternalLink, Zap } from 'lucide-react';
import Hls from 'hls.js';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { uploadVideoHls } from '../api/uploadVideo';
import { toProxiedUrl } from '../utils/constants';
import { SoundPickerSheet, SoundBar } from '../components/ui/SoundPickerSheet';
import type { Sound } from '../types';
import type { Concert, Event, Post, Reel, StoryGroup, Community } from '../types';
import { Avatar, VerifiedBadge } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { ExpandableText } from '../components/ui/ExpandableText';
import { RichText } from '../components/ui/RichText';
import { FriendsWhoLiked } from '../components/ui/FriendsWhoLiked';
import { MediaPlaceholder, paletteBySeed as placeholderPalette } from '../components/ui/MediaPlaceholder';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';



// ── Story Viewer ──────────────────────────────────────────────────────────────
function StoryViewer({
  groups, initialIndex, initialStoryIndex = 0, currentUserId, onClose, onReload }: {
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
    } catch { toast.error('Erreur lors de la suppression'); }
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
      style={{ background: 'rgba(0,0,0,0.95)' }}
      onClick={onClose}>
      {/* Conteneur portrait 9:16 centré — comme Instagram */}
      <div className="relative flex-shrink-0"
        style={{
          height: '100dvh',
          width: 'calc(100dvh * 9 / 16)',
          maxWidth: '100vw',
          background: '#000',
          overflow: 'hidden' }}
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
            <video src={story.media_url} className="w-full h-full object-cover" autoPlay loop={false} playsInline />
          ) : story.media_url ? (
            <img src={story.media_url} alt="" className="w-full h-full object-cover" />
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
                  style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
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
  onReload }: {
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
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
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
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
            <Plus size={18} />
            Ajouter une nouvelle story
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Story bubble (gère onError sur thumb + avatar overlay) ───────────────────
function StoryBubble({ group, onClick }: { group: StoryGroup; onClick: () => void }) {
  const u              = group.user;
  const firstStory     = group.stories[0];
  const rawThumb       = firstStory?.thumbnail_url ?? firstStory?.media_url ?? null;
  const [thumbErr,  setThumbErr]  = useState(false);
  const [avatarErr, setAvatarErr] = useState(false);
  const thumb    = rawThumb && !thumbErr ? rawThumb : null;
  const name     = (u.display_name ?? u.username ?? '').split(' ')[0];

  const inner = thumb ? (
    <div className="w-10 h-10 rounded-full overflow-hidden">
      <img src={thumb} alt={name} className="w-full h-full object-cover"
        onError={() => setThumbErr(true)} />
    </div>
  ) : (
    <AvatarWithFallback src={u.avatar_url} name={u.display_name ?? u.username ?? ''} verified={u.is_verified} />
  );

  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-1.5 shrink-0 transition-transform hover:scale-105"
      style={{ width: 58 }}>
      <div className="relative">
        {group.has_unseen ? (
          <div className="rounded-full p-[2.5px]"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
            <div className="rounded-full p-[2px]" style={{ background: 'var(--surface)' }}>
              {inner}
            </div>
          </div>
        ) : (
          <div className="rounded-full p-[2px]" style={{ border: '2px solid var(--border)', opacity: 0.7 }}>
            {inner}
          </div>
        )}
        {/* Avatar overlay si thumbnail */}
        {thumb && (
          <div className="absolute -bottom-0.5 -left-0.5 w-[18px] h-[18px] rounded-full overflow-hidden"
            style={{ border: '1.5px solid var(--surface)' }}>
            {u.avatar_url && !avatarErr
              ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover"
                  onError={() => setAvatarErr(true)} />
              : <div className="w-full h-full flex items-center justify-center text-white font-black text-[6px]"
                  style={{ background: placeholderPalette(u.display_name ?? u.username ?? 'x')[1] }}>
                  {(u.display_name ?? u.username ?? '?')[0].toUpperCase()}
                </div>
            }
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
}

// Avatar avec fallback onError → initiales colorées
function AvatarWithFallback({ src, name, verified }: { src?: string | null; name: string; verified?: boolean }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return (
      <div className="w-10 h-10 rounded-full overflow-hidden relative">
        <img src={src} alt={name} className="w-full h-full object-cover" onError={() => setErr(true)} />
        {verified && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full flex items-center justify-center"
            style={{ background: 'var(--primary)', border: '1.5px solid var(--surface)' }}>
            <svg width="7" height="7" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        )}
      </div>
    );
  }
  const [c0, c1] = placeholderPalette(name);
  const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  return (
    <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-black text-white text-sm relative"
      style={{ background: `linear-gradient(135deg,${c0},${c1})` }}>
      {initials}
      {verified && (
        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full flex items-center justify-center"
          style={{ background: 'var(--primary)', border: '1.5px solid var(--surface)' }}>
          <svg width="7" height="7" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      )}
    </div>
  );
}

// ── Story cards (portrait WhatsApp style) ────────────────────────────────────
function MyStoryCard({ user, myGroup, onClick, onAdd }: { user: any; myGroup: StoryGroup | undefined; onClick: () => void; onAdd: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const firstStory  = myGroup?.stories[0];
  const bgUrl       = firstStory?.thumbnail_url ?? firstStory?.media_url ?? null;
  const hasBg       = bgUrl && !imgErr;
  const name        = (user?.display_name ?? user?.username ?? 'Moi').split(' ')[0];

  return (
    <button onClick={onClick}
      className="relative shrink-0 rounded-2xl overflow-hidden transition-transform hover:scale-[1.03] active:scale-95 flex flex-col"
      style={{ width: 100, height: 160, background: 'var(--bg-tertiary)' }}>
      {hasBg
        ? <img src={bgUrl!} className="absolute inset-0 w-full h-full object-cover" alt=""
            onError={() => setImgErr(true)} />
        : <div className="absolute inset-0">
            <MediaPlaceholder title={user?.display_name ?? user?.username ?? 'story'} />
          </div>
      }
      {/* Gradient bottom */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 35%, transparent 100%)' }} />
      {/* Avatar + bouton + */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2">
        <div className="relative">
          {myGroup ? (
            <div className="rounded-full p-[2px]"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
              <div className="rounded-full p-[1.5px]" style={{ background: 'var(--surface)' }}>
                <Avatar src={user?.avatar_url} name={user?.display_name ?? user?.username ?? ''} size="sm" />
              </div>
            </div>
          ) : (
            <Avatar src={user?.avatar_url} name={user?.display_name ?? user?.username ?? ''} size="sm" />
          )}
          <div
            onClick={myGroup ? (e => { e.stopPropagation(); onAdd(); }) : undefined}
            role={myGroup ? 'button' : undefined}
            title={myGroup ? 'Ajouter une story' : undefined}
            className={clsx(
              'absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center',
              myGroup && 'transition-transform hover:scale-110',
            )}
            style={{ background: 'var(--primary)', width: 18, height: 18, border: '2px solid var(--surface)' }}>
            <Plus size={9} className="text-white" />
          </div>
        </div>
      </div>
      {/* Nom */}
      <span className="absolute bottom-2 left-0 right-0 text-center text-[10px] font-bold text-white px-1 truncate">
        {myGroup ? name : 'Ajouter'}
      </span>
    </button>
  );
}

function StoryCard({ group, onClick }: { group: StoryGroup; onClick: () => void }) {
  const u          = group.user;
  const firstStory = group.stories[0];
  const rawBg      = firstStory?.thumbnail_url ?? firstStory?.media_url ?? null;
  const [bgErr,  setBgErr]  = useState(false);
  const [avErr,  setAvErr]  = useState(false);
  const hasBg   = rawBg && !bgErr;
  const name    = (u.display_name ?? u.username ?? '').split(' ')[0];

  return (
    <button onClick={onClick}
      className="relative shrink-0 rounded-2xl overflow-hidden transition-transform hover:scale-[1.03] active:scale-95"
      style={{ width: 100, height: 160, background: 'var(--bg-tertiary)' }}>
      {/* Background — photo de la story */}
      {hasBg
        ? <img src={rawBg!} className="absolute inset-0 w-full h-full object-cover" alt=""
            onError={() => setBgErr(true)} />
        : <div className="absolute inset-0">
            <MediaPlaceholder title={u.display_name ?? u.username} />
          </div>
      }
      {/* Gradient */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 35%, rgba(0,0,0,0.2) 100%)' }} />
      {/* Anneau avatar en haut */}
      <div className="absolute top-2.5 left-2.5">
        <div className="rounded-full p-[2px]"
          style={{ background: group.has_unseen ? 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' : 'rgba(255,255,255,0.4)' }}>
          <div className="rounded-full p-[1.5px]" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <div className="w-8 h-8 rounded-full overflow-hidden">
              {u.avatar_url && !avErr
                ? <img src={u.avatar_url} alt={name} className="w-full h-full object-cover"
                    onError={() => setAvErr(true)} />
                : <div className="w-full h-full flex items-center justify-center font-black text-white text-sm"
                    style={{ background: placeholderPalette(u.display_name ?? u.username ?? 'x')[1] }}>
                    {(u.display_name ?? u.username ?? '?')[0].toUpperCase()}
                  </div>
              }
            </div>
          </div>
        </div>
        {group.stories.length > 1 && (
          <div className="absolute -top-1 -right-1 rounded-full flex items-center justify-center text-white font-black"
            style={{ background: 'var(--primary)', minWidth: 14, height: 14, fontSize: 8, paddingInline: 2, border: '1.5px solid var(--surface)' }}>
            {group.stories.length}
          </div>
        )}
      </div>
      {/* Nom en bas */}
      <span className="absolute bottom-2 left-0 right-0 text-center text-[10px] font-bold text-white px-1 truncate drop-shadow">
        {name}
      </span>
    </button>
  );
}

// ── Stories bar ───────────────────────────────────────────────────────────────
function StoriesBar() {
  const { user }               = useAuthStore();
  const navigate               = useNavigate();
  const [groups,   setGroups]  = useState<StoryGroup[]>([]);
  const [loading,  setLoading] = useState(true);

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
            <button onClick={() => navigate('/stories/create')}
              className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 58 }}>
              <div className="relative">
                <Avatar src={user?.avatar_url} name={user?.display_name ?? user?.username ?? ''} size="sm" />
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
      </>
    );
  }

  return (
    <>
      <div className="rounded-2xl overflow-hidden animate-reveal-up"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex gap-2.5 px-3 py-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>

          {/* Ma story / ajouter — navigue vers page dédiée */}
          <MyStoryCard
            user={user}
            myGroup={myGroup}
            onClick={() => myGroup
              ? navigate('/my-stories')
              : navigate('/stories/create')
            }
            onAdd={() => navigate('/stories/create')}
          />

          {/* Autres stories — navigue vers page dédiée */}
          {otherGroups.map((group) => (
            <StoryCard key={group.user.id} group={group}
              onClick={() => navigate(`/stories?userId=${encodeId(group.user.id)}&index=${allGroups.indexOf(group)}`)} />
          ))}

          {/* Skeletons */}
          {loading && [0,1,2,3].map(i => (
            <div key={i} className="shrink-0 rounded-2xl overflow-hidden animate-pulse"
              style={{ width: 100, height: 160, background: 'var(--bg-tertiary)' }} />
          ))}
        </div>
      </div>

    </>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface FeedAd {
  id: string;
  title: string;
  description?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  creative_url?: string | null;
  thumbnail_url?: string | null;
  format: string;
  advertiser_name?: string | null;
  advertiser_avatar?: string | null;
}

type FeedItem =
  | { kind: 'concert';      id: string; data: Concert }
  | { kind: 'event';        id: string; data: Event }
  | { kind: 'post';         id: string; data: Post }
  | { kind: 'reel';         id: string; data: Reel }
  | { kind: 'reel_row';     id: string; data: Reel[] }
  | { kind: 'suggestions';  id: string; data: null }
  | { kind: 'communities';  id: string; data: Community[] }
  | { kind: 'ad';           id: string; data: FeedAd };

const EVENT_COLORS: Record<string, string> = {
  concert: '#7B3FF2', birthday: '#7B3FF2', festival: '#7B3FF2',
  conference: '#7B3FF2', sport: '#7B3FF2', theater: '#9B65F5',
  exhibition: '#7B3FF2', other: '#9290AE' };

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
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user?.id) return;
    apiClient.get<any>(`${Endpoints.users.following(user.id)}?limit=500`)
      .then(res => {
        const list: any[] = Array.isArray(res.data) ? res.data : res.data?.items ?? res.data?.data ?? [];
        setFollowedIds(new Set(list.map((u: any) => String(u.id))));
      })
      .catch(() => {});
  }, [user?.id]);

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
  concert:    { label: 'Concert',     bg: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', color: '#fff' },
  event:      { label: 'Événement',   bg: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', color: '#fff' },
  post:       { label: 'Post',        bg: 'rgba(123,63,242,0.12)',                   color: 'var(--primary)' },
  reel:       { label: 'Reel',        bg: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', color: '#fff' } };

function AuthorRow({
  author, authorId, publishedAt, isFollowed, onAuthorClick, onFollowClick, kind }: {
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
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{name}</span>
            {author?.is_verified && <VerifiedBadge size={13} />}
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
  open, onClose, targetKind, targetId, initialCount: _initialCount, onCountChange }: {
  open: boolean;
  onClose: () => void;
  targetKind: 'event' | 'concert' | 'post' | 'reel';
  targetId: string;
  initialCount: number;
  onCountChange: (n: number) => void;
}) {
  const { user } = useAuthStore();
  const [comments,   setComments]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [body,       setBody]       = useState('');
  const [sending,    setSending]    = useState(false);
  const [likedIds,   setLikedIds]   = useState<Set<string>>(new Set());
  const [localLikes, setLocalLikes] = useState<Record<string, number>>({});
  const inputRef  = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);

  const qParam = targetKind === 'post'    ? `post_id=${targetId}`
               : targetKind === 'reel'    ? `reel_id=${targetId}`
               : targetKind === 'concert' ? `concert_id=${targetId}`
               :                            `event_id=${targetId}`;

  useEffect(() => {
    if (!open) return;
    setComments([]);
    setLikedIds(new Set());
    setLocalLikes({});
    setLoading(true);
    apiClient.get<any>(`${Endpoints.social.comments}?${qParam}&limit=50`)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        setComments(list);
        setLikedIds(new Set(list.filter((c: any) => c.user_reaction === 'like').map((c: any) => c.id)));
      })
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

  function toggleLike(c: any) {
    const isLiked = likedIds.has(c.id);
    setLikedIds(prev => { const n = new Set(prev); isLiked ? n.delete(c.id) : n.add(c.id); return n; });
    setLocalLikes(prev => ({ ...prev, [c.id]: (prev[c.id] ?? c.like_count ?? 0) + (isLiked ? -1 : 1) }));
    apiClient.post(Endpoints.social.toggleReaction, { comment_id: c.id, reaction_type: 'like' }).catch(() => {
      setLikedIds(prev => { const n = new Set(prev); isLiked ? n.add(c.id) : n.delete(c.id); return n; });
      setLocalLikes(prev => ({ ...prev, [c.id]: (prev[c.id] ?? c.like_count ?? 0) + (isLiked ? 1 : -1) }));
    });
  }

  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editBody,    setEditBody]    = useState('');
  const [editSaving,  setEditSaving]  = useState(false);

  async function deleteComment(id: string) {
    try {
      await apiClient.delete(`${Endpoints.social.comments}/${id}`);
      setComments(prev => prev.filter(c => c.id !== id));
      onCountChange(Math.max(0, comments.length - 1));
    } catch {}
  }

  async function saveEdit(id: string) {
    if (!editBody.trim() || editSaving) return;
    setEditSaving(true);
    try {
      await apiClient.put(`${Endpoints.social.comments}/${id}`, { body: editBody.trim() });
      setComments(prev => prev.map(c => c.id === id ? { ...c, body: editBody.trim() } : c));
      setEditingId(null);
    } catch {}
    finally { setEditSaving(false); }
  }

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
              <div key={c.id} className="flex gap-3 items-start group">
                <Avatar
                  src={c.author?.avatar_url}
                  name={c.author?.display_name ?? c.author?.username ?? '?'}
                  size="sm"
                  verified={c.author?.is_verified}
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  {editingId === c.id ? (
                    <div className="flex flex-col gap-1.5">
                      <input
                        autoFocus
                        value={editBody}
                        onChange={e => setEditBody(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(c.id); } if (e.key === 'Escape') setEditingId(null); }}
                        className="text-sm px-3.5 py-2.5 rounded-2xl rounded-tl-sm w-full outline-none"
                        style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--primary)', color: 'var(--text-primary)' }}
                      />
                      <div className="flex gap-2 ml-1">
                        <button onClick={() => saveEdit(c.id)} disabled={editSaving}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
                          style={{ background: 'var(--primary)', color: '#fff', opacity: editSaving ? 0.6 : 1 }}>
                          {editSaving ? '…' : 'Enregistrer'}
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                          style={{ color: 'var(--text-tertiary)' }}>
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <div className="inline-block rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-full"
                        style={{ background: 'var(--bg-secondary)' }}>
                        <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                          {c.author?.display_name ?? c.author?.username ?? 'Utilisateur'}
                        </p>
                        <p className="text-sm leading-relaxed break-words" style={{ color: 'var(--text-primary)' }}>
                          {c.body}
                        </p>
                      </div>
                      {user?.id === c.author?.id && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 mt-1">
                          <button onClick={() => { setEditingId(c.id); setEditBody(c.body); }}
                            className="p-1 rounded-lg"
                            style={{ color: 'var(--text-tertiary)' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => deleteComment(c.id)}
                            className="p-1 rounded-lg"
                            style={{ color: 'var(--text-tertiary)' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-1 ml-1">
                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      {timeAgo(c.created_at)}
                    </p>
                    <button onClick={() => toggleLike(c)}
                      className="flex items-center gap-1 transition-colors"
                      style={{ color: likedIds.has(c.id) ? 'var(--primary)' : 'var(--text-tertiary)' }}>
                      <Heart size={11} fill={likedIds.has(c.id) ? 'currentColor' : 'none'} />
                      {(localLikes[c.id] ?? c.like_count ?? 0) > 0 && (
                        <span className="text-[10px] font-medium">{localLikes[c.id] ?? c.like_count}</span>
                      )}
                    </button>
                  </div>
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
              color: 'var(--text-primary)' }}
            onFocus={e => (e.target.style.border = '1px solid var(--primary)')}
            onBlur={e  => (e.target.style.border = '1px solid transparent')}
          />
          <button type="submit" disabled={!body.trim() || sending}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all"
            style={{
              background: body.trim() ? 'var(--primary)' : 'var(--bg-secondary)',
              color: body.trim() ? '#fff' : 'var(--text-tertiary)' }}>
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
function SharePreviewModal({ url, title, desc, image, onClose }: {
  url: string; title: string; desc?: string; image?: string; onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => { setCopied(false); onClose(); }, 1500);
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, url });
      onClose();
    } catch { /* annulé */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden animate-reveal-up"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}>

        {/* Preview card */}
        <div className="rounded-xl m-3 overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {image && (
            <img src={image} alt={title}
              className="w-full object-cover"
              style={{ maxHeight: '220px', objectPosition: 'top' }} />
          )}
          <div className="p-3" style={{ background: 'var(--bg-secondary)' }}>
            <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{title}</p>
            {desc && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>{desc}</p>}
            <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--primary)' }}>gofolyx.com</p>
          </div>
        </div>

        {/* URL */}
        <div className="mx-3 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <p className="text-xs truncate flex-1" style={{ color: 'var(--text-secondary)' }}>{url}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-3 pt-0">
          <button onClick={copyLink}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
            style={{ background: copied ? 'rgba(34,197,94,0.15)' : 'var(--bg-secondary)', color: copied ? '#22C55E' : 'var(--text-primary)', border: '1px solid var(--border)' }}>
            {copied ? <><Check size={15} /> Copié !</> : <><Copy size={15} /> Copier le lien</>}
          </button>
          {typeof navigator.share === 'function' && (
            <button onClick={nativeShare}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white"
              style={{ background: 'var(--primary)' }}>
              <Share2 size={15} /> Partager
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBar({
  id, kind, initialLiked, initialLikeCount, initialCommentCount = 0,
  commentCountOverride, shareCount = 0,
  titleForShare, imageForShare, descForShare, onOpenComments }: {
  id: string;
  kind: 'event' | 'concert' | 'post' | 'reel';
  initialLiked: boolean;
  initialLikeCount: number;
  initialCommentCount?: number;
  commentCountOverride?: number;
  shareCount?: number;
  titleForShare?: string;
  imageForShare?: string;
  descForShare?: string;
  onOpenComments: (id: string, kind: 'event' | 'concert' | 'post' | 'reel', count: number) => void;
}) {
  const [liked,      setLiked]      = useState(initialLiked);
  const [likeCount,  setLikeCount]  = useState(initialLikeCount);
  const commentCount = commentCountOverride ?? initialCommentCount ?? 0;
  const [favId,      setFavId]      = useState<string | null>(null);
  const [savingFav,  setSavingFav]  = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [showSharePreview, setShowSharePreview] = useState(false);
  const inFlight = useRef(false);

  const saved = !!favId;

  async function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    if (savingFav) return;
    setSavingFav(true);
    try {
      if (favId) {
        await apiClient.delete(Endpoints.favorites.remove(favId));
        setFavId(null);
      } else {
        const res = await apiClient.post<{ id: string }>(Endpoints.favorites.add, { target_type: kind, target_id: id });
        setFavId((res.data as any)?.id ?? (res.data as any)?.favorite?.id ?? null);
      }
    } catch {
      /* ignore */
    } finally {
      setSavingFav(false);
    }
  }

  // Resync si les données de la card changent (refresh feed, navigation)
  useEffect(() => { setLiked(initialLiked); },    [initialLiked]);
  useEffect(() => { setLikeCount(initialLikeCount); }, [initialLikeCount]);

  async function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    if (inFlight.current) return;
    inFlight.current = true;
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
          reaction_type: 'like' });
      }
    } catch {
      setLiked(was);
      setLikeCount(n => n + (was ? 1 : -1));
    } finally {
      inFlight.current = false;
    }
  }

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    setShowSharePreview(true);
    // Record share in backend
    apiClient.post(Endpoints.social.share, {
      ...(kind === 'event'   ? { event_id: id }   :
          kind === 'concert' ? { concert_id: id } :
          kind === 'reel'    ? { reel_id: id }    :
                               { post_id: id }),
      platform: 'external' }).catch(() => {});
  }

  return (
    <>
      <div className="flex items-center gap-1 px-2 py-2" style={{ borderTop: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}>
        {/* Like */}
        <button onClick={handleLike}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{ color: liked ? '#7B3FF2' : 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Heart size={15} fill={liked ? '#7B3FF2' : 'none'} strokeWidth={liked ? 0 : 2} />
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
        <button onClick={handleSave} disabled={savingFav}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ml-auto"
          style={{ color: saved ? 'var(--primary)' : 'var(--text-secondary)', opacity: savingFav ? 0.6 : 1 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Bookmark size={15} fill={saved ? 'var(--primary)' : 'none'} />
        </button>
      </div>

      {/* Share toast — local */}
      {shareToast && <ShareToast onDone={() => setShareToast(false)} />}

      {/* Share preview modal */}
      {showSharePreview && (() => {
        const path = kind === 'concert' ? 'concerts' : kind === 'event' ? 'events' : kind === 'post' ? 'posts' : 'reels';
        const url  = kind === 'reel'
          ? `${window.location.origin}/reels?id=${encodeId(id)}`
          : `${window.location.origin}/${path}/${encodeId(id)}`;
        return (
          <SharePreviewModal
            url={url}
            title={titleForShare ?? 'GoFolyX'}
            desc={descForShare}
            image={imageForShare}
            onClose={() => setShowSharePreview(false)}
          />
        );
      })()}
    </>
  );
}

// ── Native Ad Card ────────────────────────────────────────────────────────────
function FeedAdCard({ ad }: { ad: FeedAd }) {
  const impressionSent = useRef(false);
  const videoRef       = useRef<HTMLVideoElement>(null);
  const hlsRef         = useRef<Hls | null>(null);

  const isVideo = ad.format === 'video' || !!(ad.creative_url && (
    ad.creative_url.includes('.m3u8') ||
    ad.creative_url.includes('/hls/') ||
    ad.creative_url.toLowerCase().includes('.mp4')
  ));

  useEffect(() => {
    if (!impressionSent.current) {
      impressionSent.current = true;
      apiClient.post(Endpoints.ads.impression(ad.id)).catch(() => {});
    }
  }, [ad.id]);

  const setupVideo = useCallback((v: HTMLVideoElement | null) => {
    (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = v;
    if (!v || !isVideo || !ad.creative_url) return;
    const src = toProxiedUrl(ad.creative_url);
    if (Hls.isSupported()) {
      const hls = new Hls({ autoStartLoad: true, maxBufferLength: 30 });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { v.play().catch(() => {}); });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) { hls.destroy(); }
      });
    } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = src;
      v.play().catch(() => {});
    } else {
      v.src = src;
      v.play().catch(() => {});
    }
  }, [ad.creative_url, isVideo]); // eslint-disable-line

  function handleClick() {
    if (!ad.cta_url) return;
    apiClient.post(Endpoints.ads.click(ad.id)).catch(() => {});
    window.open(ad.cta_url, '_blank', 'noopener,noreferrer');
  }

  const hasCreative = !!ad.thumbnail_url || !!ad.creative_url;
  const advertiserInitial = (ad.advertiser_name ?? ad.title).charAt(0).toUpperCase();
  const ctaDomain = (() => {
    try { return ad.cta_url ? new URL(ad.cta_url).hostname.replace(/^www\./, '') : null; }
    catch { return null; }
  })();

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

      {/* ── En-tête style Facebook ── */}
      <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
        {/* Avatar annonceur */}
        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
          style={{ background: 'rgba(123,63,242,0.1)', border: '1px solid var(--border)' }}>
          {ad.advertiser_avatar ? (
            <img src={ad.advertiser_avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-black" style={{ color: 'var(--primary)' }}>{advertiserInitial}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
            {ad.advertiser_name ?? ad.title}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
              Sponsorisé ·
            </span>
            <Zap size={9} style={{ color: 'var(--text-tertiary)' }} />
          </div>
        </div>
      </div>

      {/* ── Titre + description (comme un post Facebook) ── */}
      {(ad.title || ad.description) && (
        <div className="px-3 pb-2">
          {ad.advertiser_name && (
            <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{ad.title}</p>
          )}
          {ad.description && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{ad.description}</p>
          )}
        </div>
      )}

      {/* ── Visuel bord-à-bord ── */}
      {hasCreative && (
        <div className="overflow-hidden" style={{ aspectRatio: '1.91/1' }}>
          {isVideo && ad.creative_url ? (
            <video
              ref={setupVideo}
              className="w-full h-full object-cover"
              playsInline muted autoPlay loop
              poster={ad.thumbnail_url ?? undefined}
            />
          ) : (
            <img
              src={ad.thumbnail_url ?? ad.creative_url!}
              alt={ad.title}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}

      {/* ── Bande CTA Facebook-style (sous l'image, fond légèrement distinct) ── */}
      {ad.cta_url && (
        <div className="flex items-center justify-between px-3 py-2.5 gap-3"
          style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
          <div className="min-w-0">
            {ctaDomain && (
              <p className="text-[10px] uppercase tracking-wide font-semibold truncate"
                style={{ color: 'var(--text-tertiary)' }}>{ctaDomain}</p>
            )}
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-secondary)' }}>
              {ad.cta_text ?? 'En savoir plus'}
            </p>
          </div>
          <button onClick={handleClick}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
            style={{ background: 'var(--primary)', color: '#fff' }}>
            {ad.cta_text ?? 'En savoir plus'} <ExternalLink size={11} />
          </button>
        </div>
      )}
    </div>
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
      onClick={() => navigate(`/concerts/${encodeId(concert.id)}`)}
      className="relative overflow-hidden rounded-2xl cursor-pointer group animate-reveal-up"
      style={{ aspectRatio: '21/9' }}
    >
      {concert.thumbnail_url ? (
        <img src={concert.thumbnail_url} alt={concert.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
      ) : (
        <div className="absolute inset-0">
          <MediaPlaceholder title={concert.title} icon={<Music size={80} color="#fff" />} />
        </div>
      )}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 100%)' }} />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }} />

      <div className="absolute top-4 left-4 right-4 flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full text-white tracking-wide"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 0 24px rgba(123,63,242,0.6)' }}>
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
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 6px 24px rgba(123,63,242,0.55)' }}>
            <Play size={14} fill="white" />Regarder maintenant
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Concert card ──────────────────────────────────────────────────────────────
type OpenCommentsFn = (id: string, kind: 'event'|'concert'|'post'|'reel', count: number) => void;

function ConcertCard({ concert, delay = 0, followedIds, onFollow, onOpenComments, commentCountOverride }: {
  concert: Concert; delay?: number;
  followedIds: Set<string>; onFollow: (id: string, e: React.MouseEvent) => void;
  onOpenComments: OpenCommentsFn; commentCountOverride?: number;
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
        onAuthorClick={e => { e.stopPropagation(); if (authorId) navigate(`/user/${encodeId(authorId)}`); }}
        onFollowClick={e => authorId && onFollow(authorId, e)}
        kind="concert"
      />

      <div onClick={() => navigate(`/concerts/${encodeId(concert.id)}`)}
        className="relative overflow-hidden cursor-pointer group"
        style={{ aspectRatio: '16/9' }}>
        {concert.thumbnail_url ? (
          <img src={concert.thumbnail_url} alt={concert.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <MediaPlaceholder title={concert.title} icon={<Music size={36} color="#fff" />} />
        )}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          {isLive && (
            <span className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full text-white"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 0 10px rgba(123,63,242,0.5)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </span>
          )}
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white"
            style={{ background: concert.access_type === 'free' ? 'rgba(34,197,94,0.8)' : 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
            {concert.access_type === 'free' ? 'Gratuit' : concert.access_type === 'ticket' ? `${concert.ticket_price ?? '?'}€` : 'Abo'}
          </span>
        </div>
      </div>

      <div onClick={() => navigate(`/concerts/${encodeId(concert.id)}`)} className="px-3 pt-2.5 pb-1 cursor-pointer space-y-1">
        <p className="font-bold text-sm leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>{concert.title}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {concert.genre && <span>{concert.genre}</span>}
          {!isLive && concert.scheduled_at && (
            <span className="flex items-center gap-1"><Clock size={11} />{format(new Date(concert.scheduled_at), 'd MMM · HH:mm', { locale: fr })}</span>
          )}
          {concert.venue_city && <span className="flex items-center gap-1"><MapPin size={11} />{concert.venue_city}</span>}
        </div>
      </div>

      <FriendsWhoLiked entityId={concert.id} kind="concert" totalLikes={concert.like_count ?? 0} />
      <ActionBar
        id={concert.id} kind="concert"
        initialLiked={concert.user_reaction === 'like'}
        initialLikeCount={concert.like_count ?? 0}
        initialCommentCount={concert.comment_count ?? 0}
        commentCountOverride={commentCountOverride}
        titleForShare={concert.title}
        imageForShare={concert.thumbnail_url ?? undefined}
        descForShare={concert.description?.slice(0, 120) ?? concert.genre ?? undefined}
        onOpenComments={onOpenComments}
      />
    </div>
  );
}

// ── Event card ────────────────────────────────────────────────────────────────
function EventCard({ event, delay = 0, followedIds, onFollow, onOpenComments, commentCountOverride }: {
  event: Event; delay?: number;
  followedIds: Set<string>; onFollow: (id: string, e: React.MouseEvent) => void;
  onOpenComments: OpenCommentsFn; commentCountOverride?: number;
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
        onAuthorClick={e => { e.stopPropagation(); if (authorId) navigate(`/user/${encodeId(authorId)}`); }}
        onFollowClick={e => authorId && onFollow(authorId, e)}
        kind="event"
      />

      <div onClick={() => navigate(`/events/${encodeId(event.id)}`)}
        className="relative overflow-hidden cursor-pointer group"
        style={{ aspectRatio: '16/9' }}>
        {event.thumbnail_url ? (
          <img src={event.thumbnail_url} alt={event.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <MediaPlaceholder title={event.title} icon={<Calendar size={36} color="#fff" />} />
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

      <div onClick={() => navigate(`/events/${encodeId(event.id)}`)} className="px-3 pt-2.5 pb-1 cursor-pointer space-y-1">
        <p className="font-bold text-sm leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>{event.title}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {event.venue_city && <span className="flex items-center gap-1"><MapPin size={11} />{event.venue_city}{event.venue_country ? `, ${event.venue_country}` : ''}</span>}
          {event.starts_at && <span><Clock size={11} className="inline mr-1" />{format(new Date(event.starts_at), 'd MMM · HH:mm', { locale: fr })}</span>}
          {event.access_type === 'free' && <span className="font-semibold" style={{ color: '#7B3FF2' }}>Gratuit</span>}
          {event.access_type === 'ticket' && event.ticket_price && <span className="font-semibold" style={{ color: color }}>{event.ticket_price}€</span>}
        </div>
      </div>

      <FriendsWhoLiked entityId={event.id} kind="event" totalLikes={event.like_count ?? 0} />
      <ActionBar
        id={event.id} kind="event"
        initialLiked={event.user_reaction === 'like'}
        initialLikeCount={event.like_count ?? 0}
        initialCommentCount={event.comment_count ?? 0}
        commentCountOverride={commentCountOverride}
        titleForShare={event.title}
        imageForShare={event.thumbnail_url ?? event.banner_url ?? undefined}
        descForShare={event.description?.slice(0, 120) ?? undefined}
        onOpenComments={onOpenComments}
      />
    </div>
  );
}

// ── Post video player ─────────────────────────────────────────────────────────
function PostVideoPlayer({ src, thumbnail, onClick }: { src: string; thumbnail?: string; onClick: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const proxied  = toProxiedUrl(src);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !proxied) return;
    let hls: import('hls.js').default | null = null;
    import('hls.js').then(({ default: Hls }) => {
      if (src.includes('.m3u8') && Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(proxied);
        hls.attachMedia(v);
      } else {
        v.src = proxied;
      }
    });
    return () => { hls?.destroy(); };
  }, [proxied]);

  useEffect(() => {
    const el = wrapRef.current;
    const v  = videoRef.current;
    if (!el || !v) return;
    const obs = new IntersectionObserver(
      ([e]) => { e.isIntersecting ? v.play().catch(() => {}) : v.pause(); },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="relative overflow-hidden cursor-pointer" style={{ background: '#000', maxHeight: 500 }} onClick={onClick}>
      <video
        ref={videoRef}
        poster={thumbnail}
        muted
        loop
        playsInline
        className="w-full object-contain"
        style={{ maxHeight: 500 }}
      />
    </div>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────
function PostCard({ post, delay = 0, followedIds, onFollow, onOpenComments, commentCountOverride }: {
  post: Post; delay?: number;
  followedIds: Set<string>; onFollow: (id: string, e: React.MouseEvent) => void;
  onOpenComments: OpenCommentsFn; commentCountOverride?: number;
}) {
  const navigate   = useNavigate();
  const authorId   = post.author?.id;
  const isFollowed = authorId ? followedIds.has(authorId) : false;
  const body = post.body ?? '';

  return (
    <div className="rounded-2xl overflow-hidden animate-reveal-up flex flex-col"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', animationDelay: `${delay}s` }}>

      <AuthorRow
        author={post.author ?? undefined}
        authorId={authorId}
        publishedAt={post.created_at}
        isFollowed={isFollowed}
        onAuthorClick={e => { e.stopPropagation(); if (authorId) navigate(`/user/${encodeId(authorId)}`); }}
        onFollowClick={e => authorId && onFollow(authorId, e)}
        kind="post"
      />

      {/* Body */}
      {body && (
        <div className="px-3 pt-1 pb-2 cursor-pointer" onClick={() => navigate(`/posts/${encodeId(post.id)}`)}>
          <RichText text={body} limit={280} style={{ color: 'var(--text-primary)' }} />
          {post.feeling && (
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)' }}>
              {post.feeling}
            </span>
          )}
        </div>
      )}

      {/* Vidéo */}
      {(post.hls_url || post.video_url) && !post.image_url && (
        <PostVideoPlayer
          src={post.hls_url ?? post.video_url!}
          thumbnail={post.thumbnail_url ?? undefined}
          onClick={() => navigate(`/posts/${encodeId(post.id)}`)}
        />
      )}

      {/* Image */}
      {post.image_url && !post.video_url && (
        <div onClick={() => navigate(`/posts/${encodeId(post.id)}`)}
          className="relative overflow-hidden cursor-pointer group">
          <img src={post.image_url} alt="" className="w-full object-contain transition-transform duration-500 group-hover:scale-105" style={{ maxHeight: '600px' }} />
        </div>
      )}

      <FriendsWhoLiked entityId={post.id} kind="post" totalLikes={post.like_count ?? 0} />
      <ActionBar
        id={post.id} kind="post"
        initialLiked={post.user_reaction === 'like'}
        initialLikeCount={post.like_count ?? 0}
        initialCommentCount={post.comment_count ?? 0}
        commentCountOverride={commentCountOverride}
        shareCount={post.share_count ?? 0}
        titleForShare={post.body?.slice(0, 60)}
        imageForShare={post.image_url ?? undefined}
        descForShare={post.body?.slice(0, 120) ?? undefined}
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
  const videoSrc  = toProxiedUrl(reel.hls_url ?? '');

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoSrc) return;
    let hlsInstance: import('hls.js').default | null = null;
    import('hls.js').then(({ default: Hls }) => {
      if (Hls.isSupported()) {
        hlsInstance = new Hls({ autoStartLoad: true });
        hlsInstance.loadSource(videoSrc);
        hlsInstance.attachMedia(v);
      } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
        v.src = videoSrc;
      }
    });
    return () => { hlsInstance?.destroy(); };
  }, [videoSrc]);

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
      onClick={() => navigate(`/reels?id=${encodeId(reel.id)}`)}>

      {/* Video autoplay muted — pointer-events-none so clicks go to the wrapper */}
      {videoSrc ? (
        <video
          ref={videoRef}
          poster={reel.thumbnail_url ?? undefined}
          muted
          loop
          playsInline
          className="w-full h-full object-contain pointer-events-none"
        />
      ) : reel.thumbnail_url ? (
        <img src={reel.thumbnail_url} alt="" className="w-full h-full object-contain pointer-events-none" />
      ) : (
        <MediaPlaceholder title={reel.caption} icon={<Play size={36} color="#fff" />} className="pointer-events-none" />
      )}

      {/* Gradient overlay bottom */}
      <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)' }} />

      {/* Reel badge */}
      <div className="absolute top-2.5 left-2.5">
        <span className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full text-white"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
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

// ── Reel row — horizontal scroll strip of up to 5 reel thumbnails ────────────
function ReelRowCard({ reels }: { reels: Reel[] }) {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Film size={13} style={{ color: '#7B3FF2' }} />
          <p className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>Reels</p>
        </div>
        <button onClick={() => navigate('/reels')}
          className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
          Voir tout
        </button>
      </div>
      <div className="flex gap-3 px-4 pb-4 pt-3 overflow-x-auto" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {reels.map(reel => (
          <button
            key={reel.id}
            onClick={() => navigate(`/reels?id=${encodeId(reel.id)}`)}
            className="relative shrink-0 rounded-2xl overflow-hidden transition-transform hover:scale-[1.03] active:scale-95"
            style={{ width: 'clamp(120px, 26vw, 180px)', aspectRatio: '9/16', background: '#000' }}>
            {reel.thumbnail_url ? (
              <img src={reel.thumbnail_url} alt={reel.caption ?? ''} className="w-full h-full object-cover" />
            ) : (
              <MediaPlaceholder title={reel.caption} icon={<Play size={24} color="#fff" />} />
            )}
            {/* Gradient haut — badge reel */}
            <div className="absolute inset-x-0 top-0 h-14 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)' }} />
            {/* Gradient bas */}
            <div className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }} />
            {/* Badge Reel */}
            <span className="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full text-white"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
              <Film size={9} /> Reel
            </span>
            {/* Caption */}
            {reel.caption && (
              <span className="absolute bottom-6 inset-x-2 text-[10px] text-white/80 font-medium line-clamp-2 text-left leading-snug">
                {reel.caption}
              </span>
            )}
            {/* Vues */}
            {(reel.view_count ?? 0) > 0 && (
              <span className="absolute bottom-2 left-2 flex items-center gap-0.5 text-[10px] text-white/70 font-semibold">
                <Play size={8} fill="white" className="opacity-70" /> {fmtCount(reel.view_count)}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Suggestions inline block ──────────────────────────────────────────────────
function SuggestionCard({ u, followed, onFollow, onNavigate }: {
  u: any; followed: boolean; onFollow: () => void; onNavigate: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const showImg = u.avatar_url && !imgError;

  return (
    <div
      className="flex flex-col shrink-0 rounded-2xl overflow-hidden transition-all cursor-pointer"
      style={{ width: 160, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      onClick={onNavigate}>

      <div className="relative w-full overflow-hidden" style={{ height: 200, background: 'var(--bg-tertiary)' }}>
        {showImg
          ? <img src={u.avatar_url} alt=""
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setImgError(true)} />
          : <div className="absolute inset-0"><MediaPlaceholder title={u.display_name ?? u.username} /></div>
        }
        {u.is_verified && (
          <span className="absolute top-2 right-2 z-10">
            <VerifiedBadge size={18} />
          </span>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-16 z-10"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)' }} />
        <div className="absolute bottom-2 left-0 right-0 px-2 text-center z-10">
          <p className="text-xs font-bold leading-tight line-clamp-2 text-white drop-shadow">
            {u.display_name ?? u.username}
          </p>
          {u.username && (
            <p className="text-[9px] opacity-70 truncate text-white">@{u.username}</p>
          )}
        </div>
      </div>

      <button
        className="text-xs font-bold py-2.5 w-full transition-all"
        style={followed
          ? { background: 'var(--surface)', color: 'var(--text-secondary)' }
          : { background: 'rgba(123,63,242,0.15)', color: 'var(--primary)' }}
        onMouseEnter={e => { e.stopPropagation(); if (!followed) { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; } }}
        onMouseLeave={e => { e.stopPropagation(); if (!followed) { e.currentTarget.style.background = 'rgba(123,63,242,0.15)'; e.currentTarget.style.color = 'var(--primary)'; } }}
        onClick={e => { e.stopPropagation(); onFollow(); }}>
        {followed ? 'Suivi' : 'Suivre'}
      </button>
    </div>
  );
}

function SuggestionsInline({ users, loading }: { users: any[]; loading: boolean }) {
  const navigate = useNavigate();
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

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
        <button onClick={() => navigate('/following')}
          className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
          Voir plus →
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="sm" /></div>
      ) : (
        <div className="flex gap-3 px-4 py-4 overflow-x-auto scrollbar-none">
          {users.map((u: any) => (
            <SuggestionCard key={u.id} u={u}
              followed={followedIds.has(u.id)}
              onFollow={() => follow(u.id)}
              onNavigate={() => navigate(`/user/${encodeId(u.id)}`)} />
          ))}
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
          <Calendar size={13} style={{ color: '#7B3FF2' }} />
          <p className="font-black text-xs" style={{ color: 'var(--text-primary)' }}>À venir</p>
        </div>
        <button onClick={() => navigate('/events')} className="text-[11px] font-semibold" style={{ color: 'var(--primary)' }}>Voir tout</button>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {events.map((e: any) => {
          const color = EVENT_COLORS[e.event_type ?? 'other'] ?? EVENT_COLORS.other;
          return (
            <div key={e.id}
              onClick={() => navigate(`/events/${encodeId(e.id)}`)}
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
          <Flame size={13} style={{ color: '#7B3FF2' }} />
          <p className="font-black text-xs" style={{ color: 'var(--text-primary)' }}>Tendances</p>
        </div>
        <button onClick={() => navigate('/concerts')} className="text-[11px] font-semibold" style={{ color: 'var(--primary)' }}>Voir tout</button>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {concerts.map((c: any, i: number) => (
          <div key={c.id}
            onClick={() => navigate(`/concerts/${encodeId(c.id)}`)}
            className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all"
            onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
            <span className="text-sm font-black w-4 shrink-0" style={{ color: i < 3 ? 'var(--primary)' : 'var(--text-tertiary)' }}>
              {i + 1}
            </span>
            {c.thumbnail_url
              ? <img src={c.thumbnail_url} alt={c.title} className="w-8 h-8 rounded-lg object-cover shrink-0" />
              : <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}><Music size={12} className="text-white" /></div>}
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
  ['#7B3FF2','#5B2EC4'],['#7B3FF2','#7B3FF2'],['#10B981','#7B3FF2'],
  ['#7B3FF2','#EF4444'],['#7B3FF2','#7B3FF2'],['#14B8A6','#7B3FF2'],
];
function commGradient(name: string): [string, string] {
  return COMM_GRADIENTS[(name.charCodeAt(0) || 0) % COMM_GRADIENTS.length] as [string, string];
}
function fmtCommCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function CommunityCard({ c, isJoined, isJoining, onJoin, onClick }: {
  c: Community;
  isJoined: boolean;
  isJoining: boolean;
  onJoin: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  const [bannerErr, setBannerErr] = useState(false);
  const count = c.members_count ?? c.member_count ?? 0;
  const [g1, g2] = commGradient(c.name);
  const showBanner = c.banner_url && !bannerErr;

  return (
    <div
      className="flex flex-col shrink-0 rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02]"
      style={{
        width: 160,
        scrollSnapAlign: 'start',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      onClick={onClick}>

      {/* Image zone */}
      <div className="relative w-full overflow-hidden" style={{ height: 200, background: 'var(--bg-tertiary)' }}>
        {showBanner
          ? <img src={c.banner_url!} className="absolute inset-0 w-full h-full object-cover"
              alt="" onError={() => setBannerErr(true)} />
          : <div className="absolute inset-0"><MediaPlaceholder title={c.name} /></div>
        }
        {/* Membres badge */}
        <span className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full z-10"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
          <Users size={8} /> {fmtCommCount(count)}
        </span>
        {/* Gradient footer */}
        <div className="absolute bottom-0 left-0 right-0 h-20 z-10"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }} />
        {/* Avatar communauté */}
        <div className="absolute bottom-9 left-2 z-20">
          <CommAvatar c={c} g1={g1} g2={g2} />
        </div>
        {/* Nom + description */}
        <div className="absolute bottom-2 left-0 right-0 px-2 z-20">
          <p className="text-xs font-bold leading-tight line-clamp-1 text-white drop-shadow">{c.name}</p>
          {c.description && (
            <p className="text-[9px] opacity-60 line-clamp-1 text-white mt-0.5">{c.description}</p>
          )}
        </div>
      </div>

      {/* Bouton rejoindre */}
      <button
        className="text-xs font-bold py-2.5 w-full flex items-center justify-center gap-1 transition-all disabled:opacity-60"
        style={isJoined
          ? { background: 'var(--surface)', color: 'var(--text-secondary)' }
          : { background: `linear-gradient(90deg,${g1},${g2})`, color: '#fff' }}
        disabled={isJoining || isJoined}
        onClick={onJoin}>
        {isJoining
          ? <Spinner size="sm" />
          : isJoined
            ? <><Check size={10} /> Rejoint</>
            : <><UserPlus size={10} /> Rejoindre</>}
      </button>
    </div>
  );
}

function CommAvatar({ c, g1, g2 }: { c: Community; g1: string; g2: string }) {
  const [err, setErr] = useState(false);
  if (c.avatar_url && !err) {
    return (
      <img src={c.avatar_url} alt="" onError={() => setErr(true)}
        className="w-7 h-7 rounded-lg object-cover"
        style={{ border: '2px solid rgba(0,0,0,0.5)' }} />
    );
  }
  return (
    <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white text-xs"
      style={{ background: `linear-gradient(135deg,${g1},${g2})`, border: '2px solid rgba(0,0,0,0.5)' }}>
      {c.name[0]?.toUpperCase()}
    </div>
  );
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

      <div ref={scrollRef} className="flex gap-3 px-4 py-4 overflow-x-auto scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}>
        {communities.map(c => (
          <CommunityCard key={c.id} c={c}
            isJoined={joined.has(c.id)}
            isJoining={joining.has(c.id)}
            onJoin={e => handleJoin(e, c.id)}
            onClick={() => navigate(`/communities/${encodeId(c.id)}`)} />
        ))}
      </div>
    </div>
  );
}

// ── Suggestions sidebar ───────────────────────────────────────────────────────
function SuggestionsPanel() {
  const navigate = useNavigate();
  const [users,      setUsers]      = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiClient.get<any>(`${Endpoints.users.suggestions}?limit=5`)
      .then(res => setUsers(toArray(res.data)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function follow(userId: string) {
    if (followingIds.has(userId)) return;
    setFollowingIds(s => new Set(s).add(userId));
    try {
      await apiClient.post(`/api/v1/users/${userId}/follow`);
      setFollowedIds(s => new Set(s).add(userId));
    } catch { /* silencieux */ }
    finally { setFollowingIds(s => { const n = new Set(s); n.delete(userId); return n; }); }
  }

  async function unfollow(userId: string) {
    if (followingIds.has(userId)) return;
    setFollowingIds(s => new Set(s).add(userId));
    try {
      await apiClient.delete(`/api/v1/users/${userId}/follow`);
      setFollowedIds(s => { const n = new Set(s); n.delete(userId); return n; });
    } catch { /* silencieux */ }
    finally { setFollowingIds(s => { const n = new Set(s); n.delete(userId); return n; }); }
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3.5"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Sparkles size={14} style={{ color: 'var(--primary)' }} />
          <p className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>Suggestions</p>
        </div>
        <button onClick={() => navigate('/discover/people')}
          className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
          Voir plus →
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="sm" /></div>
      ) : users.length === 0 ? (
        <p className="text-center py-8 text-xs" style={{ color: 'var(--text-tertiary)' }}>Aucune suggestion</p>
      ) : (
        <>
          {users.map((u: any, i: number) => {
            const isFollowed  = followedIds.has(u.id);
            const isFollowing = followingIds.has(u.id);
            return (
            <div key={u.id}
              className="flex items-center gap-3 px-4 py-2.5 transition-all"
              style={{ borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <button onClick={() => navigate(`/user/${encodeId(u.id)}`)} className="shrink-0">
                <Avatar src={u.avatar_url} name={u.display_name ?? u.username} size="sm" verified={u.is_verified} />
              </button>
              <button onClick={() => navigate(`/user/${encodeId(u.id)}`)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {u.display_name ?? u.username}
                  </p>
                  {u.is_verified && <VerifiedBadge size={14} />}
                </div>
                {u.username && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>@{u.username}</p>}
              </button>
              <button
                onClick={() => isFollowed ? unfollow(u.id) : follow(u.id)}
                disabled={isFollowing}
                className="shrink-0 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition-all"
                style={isFollowed
                  ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                  : { background: 'rgba(123,63,242,0.1)', color: 'var(--primary)', border: '1px solid rgba(123,63,242,0.2)' }}
                onMouseEnter={e => { if (!isFollowed) { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; } }}
                onMouseLeave={e => { if (!isFollowed) { e.currentTarget.style.background = 'rgba(123,63,242,0.1)'; e.currentTarget.style.color = 'var(--primary)'; } }}>
                {isFollowing ? <Spinner size="sm" /> : isFollowed ? 'Abonné' : <><UserPlus size={11} /> Suivre</>}
              </button>
            </div>
            );
          })}
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button onClick={() => navigate('/discover/people')}
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

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3.5"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Users size={14} style={{ color: 'var(--primary)' }} />
          <p className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>Communautés</p>
        </div>
        <button onClick={() => navigate('/discover/communities')}
          className="text-xs font-bold" style={{ color: 'var(--primary)' }}>Voir tout</button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="sm" /></div>
      ) : communities.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 px-4">
          <p className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
            Aucune communauté pour l'instant
          </p>
          <button onClick={() => navigate('/discover/communities')}
            className="text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
            style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)' }}>
            Explorer les communautés
          </button>
        </div>
      ) : (
        <>
          {communities.map((c, i) => {
            const [g1, g2] = commGradient(c.name);
            const count    = c.members_count ?? c.member_count ?? 0;
            return (
              <button key={c.id}
                onClick={() => navigate(`/communities/${encodeId(c.id)}`)}
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
                {c.is_private && <Lock size={11} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
              </button>
            );
          })}
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button onClick={() => navigate('/discover/communities')}
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
  const [commentTarget,   setCommentTarget]   = useState<{ id: string; kind: 'event'|'concert'|'post'|'reel'; count: number } | null>(null);
  const [commentCounts,   setCommentCounts]   = useState<Record<string, number>>({});
  const [feedAd,          setFeedAd]          = useState<FeedAd | null>(null);

  // Suggestions fetched once — shared across all SuggestionsInline instances
  const [suggestUsers,   setSuggestUsers]   = useState<any[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(true);
  useEffect(() => {
    apiClient.get<any>(`${Endpoints.users.suggestions}?limit=6`)
      .then(res => setSuggestUsers(toArray(res.data)))
      .catch(() => {})
      .finally(() => setSuggestLoading(false));
  }, []);

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
        const [feedRes, reelsRes, postsRes, commRes, adRes] = await Promise.all([
          apiClient.get<any>(`${Endpoints.search.feed}?page=1&limit=40`).catch(() => null),
          apiClient.get<any>(`${Endpoints.reels.feed}?page=1&limit=20`).catch(() => null),
          apiClient.get<any>(`${Endpoints.posts.feed}?page=1&limit=20`).catch(() => null),
          apiClient.get<any>(`${Endpoints.communities.discover}?limit=8`).catch(() => null),
          apiClient.get<any>(Endpoints.ads.feedNext('feed')).catch(() => null),
        ]);
        if (adRes?.data) setFeedAd(adRes.data);

        // /search/feed: events + concerts only (exclude reels — they have their own feed)
        const feedRaw: any[] = feedRes ? toArray<any>(feedRes.data) : [];
        const feedItems: FeedItem[] = feedRaw
          .filter((d: any) => d.id && (d.kind === 'event' || d.kind === 'concert'))
          .map((d: any) => ({ kind: d.kind as 'event' | 'concert', id: String(d.id), data: d }));

        // /reels: flat array or { items: [...] }
        const reelsRaw: any[] = reelsRes ? toArray<any>(reelsRes.data) : [];
        const reelItems: FeedItem[] = reelsRaw
          .filter((d: any) => d.id)
          .map((d: any) => ({ kind: 'reel' as const, id: String(d.id), data: d as Reel }));

        // /posts/feed: flat array
        const postsRaw: any[] = postsRes ? toArray<any>(postsRes.data) : [];
        const postItems: FeedItem[] = postsRaw
          .filter((d: any) => d.id)
          .map((d: any) => ({ kind: 'post' as const, id: String(d.id), data: d }));

        // Communities for inline injection
        const commRaw: Community[] = commRes
          ? (Array.isArray(commRes.data) ? commRes.data : commRes.data?.items ?? commRes.data?.data ?? [])
          : [];
        const commData = [...commRaw].sort(() => Math.random() - 0.5);

        // Merge non-reel items, deduplicate by composite key
        const seen = new Set<string>();
        const merged = [...feedItems, ...postItems].filter(item => {
          const key = `${item.kind}-${item.id}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        // Also deduplicate reels
        const mergedReels = reelItems.filter(item => {
          const key = `reel-${item.id}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        // Fisher-Yates shuffle on non-reel items
        for (let i = merged.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [merged[i], merged[j]] = [merged[j], merged[i]];
        }

        // Group reels into rows of 5
        const REELS_PER_ROW = 5;
        const reelRows: FeedItem[] = [];
        for (let r = 0; r < mergedReels.length; r += REELS_PER_ROW) {
          const chunk = mergedReels.slice(r, r + REELS_PER_ROW).map(ri => ri.data as Reel);
          reelRows.push({ kind: 'reel_row', id: `__reel_row__${r}`, data: chunk });
        }

        // Deterministic injection — same pattern as mobile
        const REEL_ROW_EVERY = 5;
        const SUGGEST_EVERY  = 8;
        const COMM_EVERY     = 12;

        let reelRowIdx    = 0;
        let suggestCount  = 0;
        let commCount     = 0;
        const result: FeedItem[] = [];

        const AD_EVERY = 8; // identique mobile
        let adCount = 0;

        merged.forEach((item, i) => {
          result.push(item);

          // reel_row: first at i===2, then every 5
          if (reelRowIdx < reelRows.length && (i === 2 || (i > 2 && (i - 2) % REEL_ROW_EVERY === 0))) {
            result.push(reelRows[reelRowIdx++]);
          }
          // suggestions: first at i===4, then every 8
          if (i === 4 || (i > 4 && (i - 4) % SUGGEST_EVERY === 0)) {
            result.push({ kind: 'suggestions', id: `__suggestions__${++suggestCount}`, data: null });
          }
          // communities: first at i===9, then every 12
          if (commData.length > 0 && (i === 9 || (i > 9 && (i - 9) % COMM_EVERY === 0))) {
            result.push({ kind: 'communities', id: `__communities__${++commCount}`, data: commData });
          }
          // ad: toutes les 8 cartes (placement=feed, identique mobile)
          if (adRes?.data && i > 0 && i % AD_EVERY === 0) {
            result.push({ kind: 'ad', id: `__ad__${++adCount}`, data: adRes.data });
          }
        });

        // Append remaining reel_rows at end
        while (reelRowIdx < reelRows.length) {
          result.push(reelRows[reelRowIdx++]);
        }

        setItems(result);
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
    <div className="px-2 sm:px-4 py-6 max-w-[1400px] mx-auto">
      <div className="flex gap-4 items-start">

        {/* ── Left panel (lg+) ── */}
        <div className="w-56 shrink-0 hidden lg:flex flex-col gap-4 sticky top-4">
          <UpcomingEventsPanel />
          <TrendingPanel />
        </div>

        {/* ── Feed column ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Greeting */}
          <div className="flex items-start justify-between animate-reveal-up">
            <div>
              <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
                {(() => { const h = new Date().getHours(); return h < 12 ? 'Bonjour,' : h < 18 ? 'Bon après-midi,' : 'Bonsoir,'; })()}{' '}
                <span className="gradient-text">
                  {user?.display_name ?? user?.first_name ?? user?.username}
                </span>
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                {items.filter(i => i.kind !== 'suggestions' && i.kind !== 'communities' && i.kind !== 'reel_row').length > 0
                  ? `${items.filter(i => i.kind !== 'suggestions' && i.kind !== 'communities' && i.kind !== 'reel_row').length} éléments dans ton fil`
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
                    style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 0 14px rgba(123,63,242,0.5)' }}>
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
                  boxShadow:  tab === t ? '0 4px 16px rgba(123,63,242,0.35)' : 'none' }}>
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
                style={{ background: 'linear-gradient(135deg,rgba(123,63,242,0.12),rgba(123,63,242,0.08))', border: '1px solid rgba(123,63,242,0.15)' }}>
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
                  return <div key={item.id} className="lg:hidden"><SuggestionsInline users={suggestUsers} loading={suggestLoading} /></div>;
                }
                if (item.kind === 'communities') {
                  return <div key={item.id} className="lg:hidden"><CommunitiesInline communities={item.data} /></div>;
                }
                if (item.kind === 'reel_row') {
                  return <ReelRowCard key={item.id} reels={item.data} />;
                }
                if (item.kind === 'concert') {
                  return <ConcertCard key={`concert-${item.id}`} concert={item.data} delay={Math.min(i, 8) * 0.04} followedIds={followedIds} onFollow={toggleFollow} onOpenComments={openComments} commentCountOverride={commentCounts[item.id]} />;
                }
                if (item.kind === 'event') {
                  return <EventCard key={`event-${item.id}`} event={item.data} delay={Math.min(i, 8) * 0.04} followedIds={followedIds} onFollow={toggleFollow} onOpenComments={openComments} commentCountOverride={commentCounts[item.id]} />;
                }
                if (item.kind === 'post') {
                  return <PostCard key={`post-${item.id}`} post={item.data} delay={Math.min(i, 8) * 0.04} followedIds={followedIds} onFollow={toggleFollow} onOpenComments={openComments} commentCountOverride={commentCounts[item.id]} />;
                }
                if (item.kind === 'reel') {
                  return <ReelCard key={`reel-${item.id}`} reel={item.data} delay={Math.min(i, 8) * 0.04} />;
                }
                if (item.kind === 'ad') {
                  return <FeedAdCard key={item.id} ad={item.data} />;
                }
                return null;
              })}
            </div>
          )}
        </div>

        {/* ── Right sidebar (lg+) ── */}
        <div className="w-60 shrink-0 hidden lg:flex flex-col gap-4 sticky top-4"
          style={{ height: 'calc(100vh - 2rem)', overflowY: 'auto', scrollbarWidth: 'none' }}>
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
        onCountChange={n => {
          setCommentTarget(prev => prev ? { ...prev, count: n } : null);
          if (commentTarget) setCommentCounts(prev => ({ ...prev, [commentTarget.id]: n }));
        }}
      />
    </div>
  );
}
