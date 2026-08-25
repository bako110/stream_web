import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTabReselect } from '../utils/tabReselect';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { encodeId } from '../utils/slugId';
import {
  Music, MapPin, Clock, Users, Play, Calendar,
  Flame, ChevronRight, UserPlus, UserCheck, Sparkles, Radio,
  Heart, MessageCircle, Share2, Bookmark, Film,
  X, Send, Check, Plus, ChevronLeft, Eye, Trash2, Edit3, Copy,
  Image as ImageIcon, Video, Type, MoreHorizontal, Lock,
  Megaphone, ExternalLink, Zap, EyeOff, Flag, Bell, BellOff } from 'lucide-react';
import Hls from 'hls.js';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { uploadVideoHls } from '../api/uploadVideo';
import { toProxiedUrl } from '../utils/constants';
import { formatTimeAgo } from '../utils/date';
import { ShareModal } from '../components/ui/ShareModal';
import { SoundPickerSheet, SoundBar } from '../components/ui/SoundPickerSheet';
import type { Sound } from '../types';
import type { Concert, Event, Post, Reel, StoryGroup, Community, UserPublic } from '../types';
import { Avatar, VerifiedBadge } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { useConfirm } from '../components/ui/Dialog';
import { ExpandableText } from '../components/ui/ExpandableText';
import { RichText, renderTextWithLinks } from '../components/ui/RichText';
import { FriendsWhoLiked } from '../components/ui/FriendsWhoLiked';
import { CardMoreMenu, type CardMenuAction } from '../components/ui/CardMoreMenu';
import { ReportModal, type ReportContentType } from '../components/ui/ReportModal';
import { AiAnalysisStatusModal, type AiContentType } from '../components/ui/AiAnalysisStatusModal';
import { useWs } from '../context/WebSocketContext';
import { MediaPlaceholder, paletteBySeed as placeholderPalette } from '../components/ui/MediaPlaceholder';
import { HoverVideoPreview } from '../components/ui/HoverVideoPreview';
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

  const timeAgo = formatTimeAgo(story.created_at);

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
                <p className="text-white font-black text-2xl text-center px-8 leading-snug whitespace-pre-line">
                  {renderTextWithLinks(story.caption, 'underline', { color: '#fff' })}
                </p>
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
              <p className="text-white text-sm leading-relaxed whitespace-pre-line">
                {renderTextWithLinks(story.caption, 'underline font-semibold', { color: '#fff' })}
              </p>
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
      {/* Avatar + bouton + — bordure simple (pas d'anneau dégradé, qui débordait
          de façon décentrée autour de l'avatar) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2">
        <div className="relative">
          <Avatar
            src={user?.avatar_url} name={user?.display_name ?? user?.username ?? ''} size="sm"
            style={{ border: '2px solid var(--surface)', borderRadius: '9999px' }}
          />
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
const STORIES_PAGE_SIZE = 20;

function StoriesBar() {
  const { user }               = useAuthStore();
  const navigate               = useNavigate();
  const [groups,   setGroups]  = useState<StoryGroup[]>([]);
  const [loading,  setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  function load() {
    setLoading(true);
    apiClient.get<StoryGroup[]>(`${Endpoints.stories.feed}?page=1&limit=${STORIES_PAGE_SIZE}`)
      .then(res => {
        const raw = res.data;
        const list = Array.isArray(raw) ? raw : (raw as any)?.items ?? [];
        setGroups(list);
        setPage(1);
        setHasMore(list.length === STORIES_PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    apiClient.get<StoryGroup[]>(`${Endpoints.stories.feed}?page=${nextPage}&limit=${STORIES_PAGE_SIZE}`)
      .then(res => {
        const raw = res.data;
        const list = Array.isArray(raw) ? raw : (raw as any)?.items ?? [];
        setGroups(prev => [...prev, ...list]);
        setHasMore(list.length === STORIES_PAGE_SIZE);
        setPage(nextPage);
      })
      .catch(() => setHasMore(false))
      .finally(() => setLoadingMore(false));
  }, [page, hasMore, loadingMore]);

  // Scroll infini HORIZONTAL — la barre de stories défile en x, pas en y.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading || !hasMore) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore(); },
      { root: scrollRef.current, rootMargin: '150px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [loading, hasMore, loadMore]);

  const myGroup     = groups.find(g => g.user.id === user?.id);
  const otherGroups = groups.filter(g => g.user.id !== user?.id);
  const allGroups   = myGroup ? [myGroup, ...otherGroups] : groups;

  return (
    <>
      <div className="rounded-2xl overflow-hidden animate-reveal-up"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div ref={scrollRef} className="flex gap-2.5 px-3 py-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>

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

          <div ref={sentinelRef} className="shrink-0" style={{ width: 1 }} />
          {loadingMore && (
            <div className="shrink-0 flex items-center justify-center" style={{ width: 100, height: 160 }}>
              <Spinner size="sm" />
            </div>
          )}
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
  | { kind: 'ad';           id: string; data: FeedAd | null };

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
    let cancelled = false;
    // Le serveur plafonne `limit` à 50 (422 au-delà) — on pagine côté
    // client jusqu'à une page incomplète pour récupérer tous les
    // abonnements sans dépasser cette limite.
    const PAGE_LIMIT = 50;
    (async () => {
      const ids = new Set<string>();
      let page = 1;
      for (;;) {
        let list: any[];
        try {
          const res = await apiClient.get<any>(`${Endpoints.users.following(user.id)}?page=${page}&limit=${PAGE_LIMIT}`);
          list = Array.isArray(res.data) ? res.data : res.data?.items ?? res.data?.data ?? [];
        } catch { break; }
        if (cancelled) return;
        list.forEach((u: any) => ids.add(String(u.id)));
        if (list.length < PAGE_LIMIT) break;
        page += 1;
      }
      if (!cancelled) setFollowedIds(ids);
    })();
    return () => { cancelled = true; };
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
// Pas de badge "Post" (aligné sur le mobile, PostCard.tsx : nom + date sans
// badge de type pour ce contenu — seuls concert/événement/reel en ont un,
// utile pour les distinguer visuellement dans un fil mixte).
const KIND_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  concert:    { label: 'Concert',     bg: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', color: '#fff' },
  event:      { label: 'Événement',   bg: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', color: '#fff' },
  reel:       { label: 'Reel',        bg: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', color: '#fff' } };

function AuthorRow({
  author, authorId, publishedAt, isFollowed, onAuthorClick, onFollowClick, kind, onMoreClick, showAiPending, onAiPendingClick, isPrivate }: {
  author: { display_name?: string | null; username?: string | null; avatar_url?: string | null; is_verified?: boolean; is_live?: boolean | null } | undefined;
  authorId: string | undefined;
  publishedAt?: string | null;
  isFollowed: boolean;
  onAuthorClick: (e: React.MouseEvent) => void;
  onFollowClick: (e: React.MouseEvent) => void;
  kind?: string;
  /** Ouvre le menu "..." (favoris, partage, signaler, etc.) — masqué si absent. */
  onMoreClick?: (e: React.MouseEvent) => void;
  /** Badge "vérification en cours" — visible uniquement par le propriétaire, cf. ReelsPage.tsx pour le même pattern. */
  showAiPending?: boolean;
  /** Ouvre l'écran de suivi d'analyse IA au clic sur le badge — masqué (badge non cliquable) si absent. */
  onAiPendingClick?: () => void;
  /** Post visible seulement par les abonnés — affiche une icône "Amis" à côté de la date. */
  isPrivate?: boolean;
}) {
  const { liveUserIds, liveIdByUserId } = useWs();
  const navigate = useNavigate();
  if (!author && !authorId) return null;
  const name  = author?.display_name ?? author?.username ?? 'Auteur';
  const badge = kind ? KIND_BADGE[kind] : undefined;
  const isLive = !!(author?.is_live || (authorId && liveUserIds.has(authorId)));
  // ID du live en cours de l'auteur — permet de rejoindre directement le live
  // au clic sur l'avatar/nom au lieu d'atterrir sur le profil, comme un simple
  // auteur non-live. Avant ce fix, cliquer sur quelqu'un en direct ouvrait
  // toujours son profil, sans aucun moyen de rejoindre son live depuis ce clic.
  const liveId = isLive && authorId ? liveIdByUserId.get(authorId) : undefined;
  const handleAuthorClick = (e: React.MouseEvent) => {
    if (liveId) { e.stopPropagation(); navigate(`/lives/${encodeId(liveId)}`); return; }
    onAuthorClick(e);
  };
  return (
    <div className="flex items-center gap-2 px-3 pt-3 pb-1">
      <button onClick={handleAuthorClick} className="flex items-center gap-2 min-w-0 flex-1">
        <Avatar src={author?.avatar_url} name={name} size="xs" verified={author?.is_verified} isLive={isLive} />
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
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              {formatTimeAgo(publishedAt)}
              {isPrivate && <Users size={10} style={{ color: 'var(--text-tertiary)' }} aria-label="Amis uniquement" />}
            </span>
          )}
          {showAiPending && (
            <button
              onClick={e => { e.stopPropagation(); onAiPendingClick?.(); }}
              className="flex items-center gap-1.5 mt-0.5"
              disabled={!onAiPendingClick}>
              <span className="inline-block w-2.5 h-2.5 rounded-full border-2 animate-spin"
                style={{ borderColor: 'var(--text-tertiary)', borderTopColor: 'transparent' }} />
              <span className="text-[10px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>Vérification en cours…</span>
            </button>
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
      {onMoreClick && (
        <button onClick={onMoreClick} className="p-1.5 rounded-lg shrink-0 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
          <MoreHorizontal size={16} />
        </button>
      )}
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const [body,       setBody]       = useState('');
  const [sending,    setSending]    = useState(false);
  const [likedIds,   setLikedIds]   = useState<Set<string>>(new Set());
  const [localLikes, setLocalLikes] = useState<Record<string, number>>({});
  const inputRef  = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const COMMENTS_PAGE_SIZE = 50;

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
    setPage(1);
    apiClient.get<any>(`${Endpoints.social.comments}?${qParam}&page=1&limit=${COMMENTS_PAGE_SIZE}`)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        setComments(list);
        setHasMore(list.length === COMMENTS_PAGE_SIZE);
        setLikedIds(new Set(list.filter((c: any) => c.user_reaction === 'like').map((c: any) => c.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [open, targetId]);

  // Le backend trie par created_at DESC (plus récent en premier) — "charger
  // plus" ramène donc des commentaires plus anciens, ajoutés en fin de liste.
  const loadMoreComments = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    apiClient.get<any>(`${Endpoints.social.comments}?${qParam}&page=${nextPage}&limit=${COMMENTS_PAGE_SIZE}`)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        setComments(prev => [...prev, ...list]);
        setLikedIds(prev => {
          const next = new Set(prev);
          list.filter((c: any) => c.user_reaction === 'like').forEach((c: any) => next.add(c.id));
          return next;
        });
        setHasMore(list.length === COMMENTS_PAGE_SIZE);
        setPage(nextPage);
      })
      .catch(() => setHasMore(false))
      .finally(() => setLoadingMore(false));
  }, [qParam, page, hasMore, loadingMore]);

  useEffect(() => {
    if (!open) return;
    const node = sentinelRef.current;
    if (!node || loading || !hasMore) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMoreComments(); },
      { root: listRef.current, rootMargin: '120px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [open, loading, hasMore, loadMoreComments]);

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
                        <p className="text-sm leading-relaxed break-words whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>
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
                      {formatTimeAgo(c.created_at)}
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
          <div ref={sentinelRef} />
          {loadingMore && <div className="flex justify-center py-2"><Spinner size="sm" /></div>}
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
function ActionBar({
  id, kind, initialLiked, initialLikeCount, initialCommentCount = 0,
  commentCountOverride, shareCount = 0,
  titleForShare, imageForShare, descForShare, onOpenComments, onOpenShare }: {
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
  onOpenShare: (id: string, kind: 'event' | 'concert' | 'post' | 'reel', title?: string, image?: string, desc?: string) => void;
}) {
  const [liked,      setLiked]      = useState(initialLiked);
  const [likeCount,  setLikeCount]  = useState(initialLikeCount);
  const commentCount = commentCountOverride ?? initialCommentCount ?? 0;
  const [favId,      setFavId]      = useState<string | null>(null);
  const [savingFav,  setSavingFav]  = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const inFlight = useRef(false);

  const saved = !!favId;

  async function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    if (savingFav) return;
    setSavingFav(true);
    try {
      if (favId) {
        await apiClient.delete(Endpoints.favorites.remove(kind, id));
        setFavId(null);
      } else {
        const res = await apiClient.post<{ id: string }>(Endpoints.favorites.add, {
          target_type: kind,
          target_id: id,
          target_title: titleForShare,
          target_subtitle: descForShare,
          target_thumbnail: imageForShare,
        });
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
    onOpenShare(id, kind, titleForShare, imageForShare, descForShare);
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
type OpenShareFn = (id: string, kind: 'event'|'concert'|'post'|'reel', title?: string, image?: string, desc?: string) => void;

function ConcertCard({ concert, delay = 0, followedIds, onFollow, onOpenComments, onOpenShare, commentCountOverride, onHide, openMore, openReport, openAiStatus }: {
  concert: Concert; delay?: number;
  followedIds: Set<string>; onFollow: (id: string, e: React.MouseEvent) => void;
  onOpenComments: OpenCommentsFn; onOpenShare: OpenShareFn; commentCountOverride?: number;
  onHide?: () => void;
  openMore: (title: string, actions: CardMenuAction[]) => void;
  openReport: (contentType: ReportContentType, contentId: string) => void;
  openAiStatus: (contentType: AiContentType, contentId: string, status?: 'pending' | 'done' | null) => void;
}) {
  const navigate   = useNavigate();
  const { user: me } = useAuthStore();
  const isLive     = concert.status === 'live';
  const authorId   = concert.artist?.id;
  const isFollowed = authorId ? followedIds.has(authorId) : false;
  const isOwn      = !!me && me.id === concert.artist_id;
  const [reminder, setReminder] = useState(false);

  async function toggleReminder() {
    try { await apiClient.post(Endpoints.concerts.remind(concert.id)); setReminder(v => !v); toast.success(reminder ? 'Rappel annulé.' : 'Rappel activé !'); }
    catch { toast.error("Impossible de modifier le rappel."); }
  }

  function handleMoreClick() {
    if (isOwn) return;
    openMore('Options du concert', [
      { icon: reminder ? BellOff : Bell, label: reminder ? 'Annuler le rappel' : 'Me rappeler', sub: reminder ? 'Rappel actif' : '1h avant le début', onClick: toggleReminder },
      { icon: EyeOff, label: 'Pas intéressé', sub: 'Masquer ce concert du fil', onClick: () => onHide?.() },
      { icon: Flag, label: 'Signaler', sub: 'Contenu inapproprié', color: '#EF4444', onClick: () => openReport('concert', concert.id) },
    ]);
  }

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
        showAiPending={isOwn && concert.ai_analysis_status === 'pending'}
        onAiPendingClick={isOwn ? () => openAiStatus('concert', concert.id, concert.ai_analysis_status) : undefined}
        onMoreClick={isOwn ? undefined : e => { e.stopPropagation(); handleMoreClick(); }}
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
        onOpenShare={onOpenShare}
      />
    </div>
  );
}

// ── Event card ────────────────────────────────────────────────────────────────
function EventCard({ event, delay = 0, followedIds, onFollow, onOpenComments, onOpenShare, commentCountOverride, onHide, openMore, openReport, openAiStatus }: {
  event: Event; delay?: number;
  followedIds: Set<string>; onFollow: (id: string, e: React.MouseEvent) => void;
  onOpenComments: OpenCommentsFn; onOpenShare: OpenShareFn; commentCountOverride?: number;
  onHide?: () => void;
  openMore: (title: string, actions: CardMenuAction[]) => void;
  openReport: (contentType: ReportContentType, contentId: string) => void;
  openAiStatus: (contentType: AiContentType, contentId: string, status?: 'pending' | 'done' | null) => void;
}) {
  const navigate   = useNavigate();
  const { user: me } = useAuthStore();
  const color      = EVENT_COLORS[event.event_type ?? 'other'] ?? EVENT_COLORS.other;
  const authorId   = event.organizer?.id;
  const isFollowed = authorId ? followedIds.has(authorId) : false;
  const isOwn      = !!me && me.id === event.organizer_id;
  const [reminder, setReminder] = useState(false);

  async function toggleReminder() {
    try { await apiClient.post(Endpoints.events.remind(event.id)); setReminder(v => !v); toast.success(reminder ? 'Rappel annulé.' : 'Rappel activé !'); }
    catch { toast.error("Impossible de modifier le rappel."); }
  }

  function handleMoreClick() {
    if (isOwn) return;
    openMore("Options de l'événement", [
      { icon: reminder ? BellOff : Bell, label: reminder ? 'Annuler le rappel' : 'Me rappeler', sub: reminder ? 'Rappel actif' : '1h avant le début', onClick: toggleReminder },
      { icon: EyeOff, label: 'Pas intéressé', sub: 'Masquer cet événement du fil', onClick: () => onHide?.() },
      { icon: Flag, label: 'Signaler', sub: 'Contenu inapproprié', color: '#EF4444', onClick: () => openReport('event', event.id) },
    ]);
  }

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
        showAiPending={isOwn && event.ai_analysis_status === 'pending'}
        onAiPendingClick={isOwn ? () => openAiStatus('event', event.id, event.ai_analysis_status) : undefined}
        onMoreClick={isOwn ? undefined : e => { e.stopPropagation(); handleMoreClick(); }}
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
        onOpenShare={onOpenShare}
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
function PostCard({ post, delay = 0, followedIds, onFollow, onOpenComments, onOpenShare, commentCountOverride, onHide, openMore, openReport, openAiStatus }: {
  post: Post; delay?: number;
  followedIds: Set<string>; onFollow: (id: string, e: React.MouseEvent) => void;
  onOpenComments: OpenCommentsFn; onOpenShare: OpenShareFn; commentCountOverride?: number;
  onHide?: () => void;
  openMore: (title: string, actions: CardMenuAction[]) => void;
  openReport: (contentType: ReportContentType, contentId: string) => void;
  openAiStatus: (contentType: AiContentType, contentId: string, status?: 'pending' | 'done' | null) => void;
}) {
  const navigate   = useNavigate();
  const { user: me } = useAuthStore();
  const { confirm, ConfirmDialog } = useConfirm();
  const authorId   = post.author?.id;
  const isFollowed = authorId ? followedIds.has(authorId) : false;
  const isOwn      = !!me && me.id === post.user_id;
  const body = post.body ?? '';

  async function handleDelete() {
    const ok = await confirm({ title: 'Supprimer ce post ?', message: 'Cette action est irréversible.', confirmLabel: 'Supprimer', danger: true });
    if (!ok) return;
    try { await apiClient.delete(Endpoints.posts.byId(post.id)); onHide?.(); toast.success('Post supprimé.'); }
    catch { toast.error('Impossible de supprimer ce post.'); }
  }

  function handleMoreClick() {
    const actions: CardMenuAction[] = isOwn
      ? [
          { icon: Edit3, label: 'Modifier', sub: 'Éditer le contenu', onClick: () => navigate(`/posts/${encodeId(post.id)}`) },
          { icon: Trash2, label: 'Supprimer', sub: 'Action irréversible', color: '#EF4444', onClick: handleDelete },
        ]
      : [
          { icon: EyeOff, label: 'Pas intéressé', sub: 'Masquer ce post du fil', onClick: () => onHide?.() },
          { icon: Flag, label: 'Signaler', sub: 'Contenu inapproprié', color: '#EF4444', onClick: () => openReport('post', post.id) },
        ];
    openMore('Options du post', actions);
  }

  return (
    <>
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
        isPrivate={post.is_private}
        showAiPending={isOwn && post.ai_analysis_status === 'pending'}
        onAiPendingClick={isOwn ? () => openAiStatus('post', post.id, post.ai_analysis_status) : undefined}
        onMoreClick={e => { e.stopPropagation(); handleMoreClick(); }}
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

      {/* Image — aspect-ratio fixe (même principe que ConcertCard/EventCard
          ci-dessus) plutôt qu'une hauteur en dur : s'adapte automatiquement à
          la largeur de la carte à tout breakpoint. object-cover pour qu'une
          image source très haute (portrait extrême, comme sur mobile
          PostCard.tsx) ne fasse jamais exploser la hauteur de la carte.
          Fallback sur image_urls[0] quand image_url (singulier) est vide —
          avant ce fix, un post avec plusieurs images (image_urls rempli mais
          image_url absent) n'affichait STRICTEMENT AUCUNE image dans le feed,
          seuls les détails du post (PostDetailPage.tsx) géraient image_urls. */}
      {(post.image_url || post.image_urls?.[0]) && !post.video_url && (
        <div onClick={() => navigate(`/posts/${encodeId(post.id)}`)}
          className="relative overflow-hidden cursor-pointer group"
          style={{ background: 'var(--bg-secondary)', aspectRatio: '4/3' }}>
          <img src={post.image_url ?? post.image_urls![0]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          {/* Badge "1/N" — indique qu'il y a d'autres images à voir dans le détail du post */}
          {(post.image_urls?.length ?? 0) > 1 && (
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-white text-xs font-semibold"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
              1/{post.image_urls!.length}
            </span>
          )}
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
        onOpenShare={onOpenShare}
      />
    </div>
    {ConfirmDialog}
    </>
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

// ── Upcoming events panel ─────────────────────────────────────────────────────
const UPCOMING_PAGE_SIZE = 4;

function UpcomingEventsPanel() {
  const navigate = useNavigate();
  const [events,   setEvents]   = useState<any[]>([]);
  const [page,     setPage]     = useState(1);
  const [hasMore,  setHasMore]  = useState(true);
  const [loading,  setLoading]  = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadPage = useCallback((p: number) => {
    setLoading(true);
    // upcoming_only=true — exclut les événements déjà passés côté backend (via
    // starts_at >= now dans la requête SQL), peu importe leur score de
    // pertinence (boost/follow/featured peuvent dépasser la pénalité
    // temporelle d'un événement passé).
    apiClient.get<any>(`${Endpoints.events.list}?page=${p}&limit=${UPCOMING_PAGE_SIZE}&status=published&upcoming_only=true`)
      .then(res => {
        // Le backend trie par score de pertinence (pas par date) — on retrie
        // l'ensemble cumulé à chaque page pour garder un ordre chronologique
        // cohérent à l'écran malgré la pagination par score.
        const list = toArray<any>(res.data);
        setEvents(prev => {
          const combined = p === 1 ? list : [...prev, ...list];
          return combined.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
        });
        setHasMore(list.length === UPCOMING_PAGE_SIZE);
        setPage(p);
      })
      .catch(() => setHasMore(false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadPage(1); }, [loadPage]);

  // Scroll infini via IntersectionObserver sur un sentinel — se déclenche
  // aussi bien au scroll qu'immédiatement si le premier lot ne remplit pas
  // encore le container (sinon un listener "scroll" classique ne se
  // déclenche jamais quand il n'y a physiquement rien à scroller).
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading || !hasMore) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadPage(page + 1); },
      { root: node.parentElement, rootMargin: '80px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [loading, hasMore, page, loadPage]);

  if (events.length === 0 && !loading) return null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Calendar size={13} style={{ color: '#7B3FF2' }} />
          <p className="font-black text-xs" style={{ color: 'var(--text-primary)' }}>À venir</p>
        </div>
        <button onClick={() => navigate('/events')} className="text-[11px] font-semibold" style={{ color: 'var(--primary)' }}>Voir tout</button>
      </div>
      <div className="divide-y overflow-y-auto" style={{ borderColor: 'var(--border)', maxHeight: 340, scrollbarWidth: 'thin' }}>
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
        <div ref={sentinelRef} />
        {loading && (
          <div className="flex justify-center py-3"><Spinner size="sm" /></div>
        )}
      </div>
    </div>
  );
}

// ── Trending panel ────────────────────────────────────────────────────────────
const TRENDING_PAGE_SIZE = 4;

function TrendingPanel() {
  const navigate = useNavigate();
  const [concerts, setConcerts] = useState<any[]>([]);
  const [page,     setPage]     = useState(1);
  const [hasMore,  setHasMore]  = useState(true);
  const [loading,  setLoading]  = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadPage = useCallback((p: number) => {
    setLoading(true);
    apiClient.get<any>(`${Endpoints.concerts.list}?page=${p}&limit=${TRENDING_PAGE_SIZE}&status=published`)
      .then(res => {
        const list = toArray<any>(res.data);
        setConcerts(prev => p === 1 ? list : [...prev, ...list]);
        setHasMore(list.length === TRENDING_PAGE_SIZE);
        setPage(p);
      })
      .catch(() => setHasMore(false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadPage(1); }, [loadPage]);

  // Scroll infini via IntersectionObserver sur un sentinel — se déclenche
  // aussi bien au scroll qu'immédiatement si le premier lot ne remplit pas
  // encore le container (sinon un listener "scroll" classique ne se
  // déclenche jamais quand il n'y a physiquement rien à scroller).
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading || !hasMore) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadPage(page + 1); },
      { root: node.parentElement, rootMargin: '80px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [loading, hasMore, page, loadPage]);

  if (concerts.length === 0 && !loading) return null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <Flame size={13} style={{ color: '#7B3FF2' }} />
          <p className="font-black text-xs" style={{ color: 'var(--text-primary)' }}>Tendances</p>
        </div>
        <button onClick={() => navigate('/concerts')} className="text-[11px] font-semibold" style={{ color: 'var(--primary)' }}>Voir tout</button>
      </div>
      <div className="divide-y overflow-y-auto" style={{ borderColor: 'var(--border)', maxHeight: 340, scrollbarWidth: 'thin' }}>
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
        <div ref={sentinelRef} />
        {loading && (
          <div className="flex justify-center py-3"><Spinner size="sm" /></div>
        )}
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


// ── Suggestions sidebar ───────────────────────────────────────────────────────
const SUGGESTIONS_PAGE_SIZE = 5;

function SuggestionsPanel() {
  const navigate = useNavigate();
  const [users,      setUsers]      = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,    setHasMore]    = useState(true);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    setLoadingMore(true);
    apiClient.get<any>(`${Endpoints.users.suggestions}?limit=${SUGGESTIONS_PAGE_SIZE}&offset=${users.length}`)
      .then(res => {
        const list = toArray<any>(res.data);
        setUsers(prev => [...prev, ...list]);
        setHasMore(list.length === SUGGESTIONS_PAGE_SIZE);
      })
      .catch(() => setHasMore(false))
      .finally(() => setLoadingMore(false));
  }, [users.length]);

  useEffect(() => {
    apiClient.get<any>(`${Endpoints.users.suggestions}?limit=${SUGGESTIONS_PAGE_SIZE}&offset=0`)
      .then(res => {
        const list = toArray<any>(res.data);
        setUsers(list);
        setHasMore(list.length === SUGGESTIONS_PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Scroll infini via IntersectionObserver sur un sentinel — se déclenche
  // aussi bien au scroll qu'immédiatement si le premier lot ne remplit pas
  // encore le container (sinon un listener "scroll" classique ne se
  // déclenche jamais quand il n'y a physiquement rien à scroller).
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading || !hasMore) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && !loadingMore) loadMore(); },
      { root: node.parentElement, rootMargin: '80px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [loading, hasMore, loadingMore, loadMore]);

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
        <div className="overflow-y-auto" style={{ maxHeight: 340, scrollbarWidth: 'thin' }}>
          {users.map((u: any, i: number) => {
            const isFollowed  = followedIds.has(u.id);
            const isFollowing = followingIds.has(u.id);
            return (
            <div key={u.id}
              className="flex items-center gap-2.5 px-4 py-2.5 transition-all"
              style={{ borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <button onClick={() => navigate(`/user/${encodeId(u.id)}`)} className="shrink-0">
                <Avatar src={u.avatar_url} name={u.display_name ?? u.username} size="sm" verified={u.is_verified} />
              </button>
              <button onClick={() => navigate(`/user/${encodeId(u.id)}`)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-sm font-semibold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {u.display_name ?? u.username}
                  </p>
                  {u.is_verified && <VerifiedBadge size={14} />}
                </div>
                {u.username && <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>@{u.username}</p>}
              </button>
              <button
                onClick={() => isFollowed ? unfollow(u.id) : follow(u.id)}
                disabled={isFollowing}
                className="shrink-0 flex items-center justify-center gap-1 text-[11px] font-bold rounded-xl transition-all"
                style={{
                  width: 74, height: 28,
                  ...(isFollowed
                    ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                    : { background: 'rgba(123,63,242,0.1)', color: 'var(--primary)', border: '1px solid rgba(123,63,242,0.2)' }),
                }}
                onMouseEnter={e => { if (!isFollowed) { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; } }}
                onMouseLeave={e => { if (!isFollowed) { e.currentTarget.style.background = 'rgba(123,63,242,0.1)'; e.currentTarget.style.color = 'var(--primary)'; } }}>
                {isFollowing ? <Spinner size="sm" /> : isFollowed ? 'Abonné' : <><UserPlus size={11} /> Suivre</>}
              </button>
            </div>
            );
          })}
          <div ref={sentinelRef} />
          {loadingMore && (
            <div className="flex justify-center py-3"><Spinner size="sm" /></div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Communities sidebar panel ─────────────────────────────────────────────────
const COMMUNITIES_PAGE_SIZE = 5;

function CommunitiesSidePanel() {
  const navigate = useNavigate();
  const [communities,  setCommunities]  = useState<Community[]>([]);
  const [loading,       setLoading]      = useState(true);
  const [loadingMore,   setLoadingMore]  = useState(false);
  const [page,          setPage]         = useState(1);
  const [hasMore,        setHasMore]      = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setLoadingMore(true);
    apiClient.get<any>(`${Endpoints.communities.discover}?page=${nextPage}&limit=${COMMUNITIES_PAGE_SIZE}`)
      .then(res => {
        const raw: Community[] = Array.isArray(res.data) ? res.data : res.data?.items ?? res.data?.data ?? [];
        setCommunities(prev => [...prev, ...raw]);
        setHasMore(raw.length === COMMUNITIES_PAGE_SIZE);
        setPage(nextPage);
      })
      .catch(() => setHasMore(false))
      .finally(() => setLoadingMore(false));
  }, [page]);

  useEffect(() => {
    apiClient.get<any>(`${Endpoints.communities.discover}?page=1&limit=${COMMUNITIES_PAGE_SIZE}`)
      .then(res => {
        const raw: Community[] = Array.isArray(res.data) ? res.data : res.data?.items ?? res.data?.data ?? [];
        setCommunities(raw);
        setHasMore(raw.length === COMMUNITIES_PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Scroll infini via IntersectionObserver sur un sentinel — se déclenche
  // aussi bien au scroll qu'immédiatement si le premier lot ne remplit pas
  // encore le container (sinon un listener "scroll" classique ne se
  // déclenche jamais quand il n'y a physiquement rien à scroller).
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading || !hasMore) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && !loadingMore) loadMore(); },
      { root: node.parentElement, rootMargin: '80px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [loading, loadingMore, hasMore, loadMore]);

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
        <div className="overflow-y-auto" style={{ maxHeight: 340, scrollbarWidth: 'thin' }}>
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
          <div ref={sentinelRef} />
          {loadingMore && (
            <div className="flex justify-center py-3"><Spinner size="sm" /></div>
          )}
        </div>
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
  const [tab, setTab]       = useState<'all' | 'concerts' | 'events' | 'friends'>('all');
  const [items, setItems]   = useState<FeedItem[]>([]);
  const [live,  setLive]    = useState<Concert[]>([]);
  const [loading, setLoading]  = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreFeed, setHasMoreFeed] = useState(true);
  const { followedIds, toggle: toggleFollow } = useFollow();
  const [commentTarget,   setCommentTarget]   = useState<{ id: string; kind: 'event'|'concert'|'post'|'reel'; count: number } | null>(null);
  const [commentCounts,   setCommentCounts]   = useState<Record<string, number>>({});
  // Un seul modal de partage partagé par toutes les cards — même principe que
  // commentTarget/CommentsModal ci-dessus, pour éviter qu'une instance par card
  // ne se retrouve montée en double (StrictMode + re-render du feed).
  const [shareTarget, setShareTarget] = useState<{
    id: string; kind: 'event' | 'concert' | 'post' | 'reel';
    title?: string; image?: string; desc?: string;
  } | null>(null);
  const [feedAd,          setFeedAd]          = useState<FeedAd | null>(null);

  // ── Menu "..." et signalement — un seul modal partagé par toutes les cards,
  // pas une instance par card (le feed n'est pas virtualisé côté web). ──────────
  const [moreMenu, setMoreMenu] = useState<{ title: string; actions: CardMenuAction[] } | null>(null);
  const [reportTarget, setReportTarget] = useState<{ type: ReportContentType; id: string } | null>(null);
  const [aiStatusTarget, setAiStatusTarget] = useState<{ type: AiContentType; id: string; status?: 'pending' | 'done' | null } | null>(null);
  const openMore   = useCallback((title: string, actions: CardMenuAction[]) => setMoreMenu({ title, actions }), []);
  const openReport = useCallback((type: ReportContentType, id: string) => setReportTarget({ type, id }), []);
  const openAiStatus = useCallback((type: AiContentType, id: string, status?: 'pending' | 'done' | null) => setAiStatusTarget({ type, id, status }), []);

  // ── Pagination infinie (tab "all") ──────────────────────────────────────────
  // L'entrelacement reel_row/suggestions/communities vit désormais côté
  // backend (FeedService.get_feed, rotation stricte page%3) — le frontend ne
  // fait plus que mapper la séquence reçue et injecter la pub à part.
  const seenIdsRef       = useRef<Set<string>>(new Set());
  const feedPageRef      = useRef(1);
  const feedHasMoreRef   = useRef(true);
  // Compte les pages consécutives entièrement recoupées (déjà vues) — le
  // backend re-trie par score(temps) à chaque page, donc `rawIsEmpty` seul
  // ne suffit pas : il peut renvoyer indéfiniment de petites pages non-vides
  // mais 100% déjà vues (le pool tourne sur lui-même) sans jamais se vider
  // réellement, empêchant hasMoreFeed de passer à false et le sentinel de
  // scroll infini de re-déclencher en boucle sans jamais atteindre "Vous avez
  // tout vu". Après N pages recoupées d'affilée, on considère le flux fini.
  const emptyStreakRef   = useRef(0);
  const MAX_EMPTY_STREAK = 3;
  // Taille de page harmonisée avec le mobile (searchService.getFeed) — même
  // valeur partout, page 1 comprise, pour que la pagination web/mobile se
  // comporte de façon identique et prévisible.
  const FEED_PAGE_SIZE   = 30;
  const nonReelCountRef  = useRef(0);
  const adCountRef       = useRef(0);
  const loadingMoreRef   = useRef(false);
  const sentinelRef      = useRef<HTMLDivElement | null>(null);
  // Container qui scrolle réellement le feed sur desktop (lg:overflow-y-auto,
  // colonne isolée des sidebars) — sur mobile ce même noeud n'a pas de scroll
  // propre (window scrolle), auquel cas root=ce noeud se comporte comme le
  // viewport, donc pas besoin de branche séparée par breakpoint.
  const feedScrollRef    = useRef<HTMLDivElement | null>(null);
  const seenAdIdsRef     = useRef<string[]>([]);
  // Anti-race : deux loadFeed() concurrents (StrictMode double-invoke, ou
  // changement rapide d'onglet) pouvaient tous les deux appeler setItems --
  // le dernier à résoudre gagnait indépendamment de l'ordre de démarrage,
  // écrasant un fil déjà chargé par une réponse vide/obsolète ("le contenu
  // apparaît puis disparaît"). Seul le run le plus récent a le droit d'écrire.
  const loadFeedRunRef   = useRef(0);

  function openComments(id: string, kind: 'event'|'concert'|'post'|'reel', count: number) {
    setCommentTarget({ id, kind, count });
  }
  function openShare(id: string, kind: 'event'|'concert'|'post'|'reel', title?: string, image?: string, desc?: string) {
    setShareTarget({ id, kind, title, image, desc });
  }
  async function loadFeed(filter: typeof tab) {
    const runId = ++loadFeedRunRef.current;
    setLoading(true);
    // Reset pagination state — nouveau tirage complet
    seenIdsRef.current      = new Set();
    feedPageRef.current     = 1;
    feedHasMoreRef.current  = true;
    emptyStreakRef.current  = 0;
    nonReelCountRef.current = 0;
    adCountRef.current      = 0;
    seenAdIdsRef.current    = [];
    setHasMoreFeed(true);
    try {
      if (filter === 'all') {
        // /search/feed renvoie events/concerts/posts triés par score.
        const [feedRes, adRes] = await Promise.all([
          apiClient.get<any>(`${Endpoints.search.feed}?page=1&limit=${FEED_PAGE_SIZE}`).catch(() => null),
          apiClient.get<any>(Endpoints.ads.feedNext('feed')).catch(() => null),
        ]);
        if (adRes?.data) { setFeedAd(adRes.data); seenAdIdsRef.current = [adRes.data.id]; }

        const feedRaw: any[] = feedRes ? toArray<any>(feedRes.data) : [];
        feedHasMoreRef.current = feedRaw.length >= FEED_PAGE_SIZE;

        const seen = seenIdsRef.current;
        const mapped: FeedItem[] = [];
        let nonSpecialCount = 0;
        for (const d of feedRaw) {
          if (!d || !d.id) continue;
          if (d.kind === 'event' || d.kind === 'concert' || d.kind === 'post') {
            const key = `${d.kind}-${d.id}`;
            if (seen.has(key)) continue;
            seen.add(key);
            mapped.push({ kind: d.kind, id: String(d.id), data: d });
            nonSpecialCount++;
            // Pub injectée côté client, indépendamment de la rotation backend
            // (pas demandée dans la migration reel/suggestion/communauté).
            if (adRes?.data && nonSpecialCount > 0 && nonSpecialCount % 8 === 0) {
              mapped.push({ kind: 'ad', id: `__ad__${++adCountRef.current}`, data: adRes.data });
            }
          }
        }

        nonReelCountRef.current = nonSpecialCount;
        if (runId !== loadFeedRunRef.current) return;
        setItems(mapped);
        setHasMoreFeed(feedHasMoreRef.current);
      } else if (filter === 'friends') {
        // Uniquement le contenu des comptes suivis — posts + events/concerts + reels,
        // triés chronologiquement, sans pub/suggestions/communautés (même pattern mobile).
        const [feedRes, reelsRes] = await Promise.all([
          apiClient.get<any>(`${Endpoints.search.feed}?page=1&limit=30&following_only=true`).catch(() => null),
          apiClient.get<any>(`${Endpoints.reels.feed}?limit=20&following_only=true`).catch(() => null),
        ]);
        const results: FeedItem[] = [];
        toArray<any>(feedRes?.data)
          .filter(d => d.id && (d.kind === 'event' || d.kind === 'concert' || d.kind === 'post'))
          .forEach(d => results.push({ kind: d.kind, id: String(d.id), data: d }));
        toArray<Reel>(reelsRes?.data).forEach(r => results.push({ kind: 'reel', id: String(r.id), data: r }));
        results.sort((a, b) => {
          const dateOf = (it: FeedItem) => (it.data as any).created_at ?? (it.data as any).starts_at ?? (it.data as any).scheduled_at ?? 0;
          return new Date(dateOf(b)).getTime() - new Date(dateOf(a)).getTime();
        });
        if (runId !== loadFeedRunRef.current) return;
        setItems(results);
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
        if (runId !== loadFeedRunRef.current) return;
        setItems(results);
      }
    } catch { /* silencieux */ }
    finally { setLoading(false); }
  }

  const loadMoreFeed = useCallback(async () => {
    if (tab !== 'all') return; // pagination infinie gérée uniquement sur le flux principal
    if (loadingMoreRef.current || !hasMoreFeed) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = feedPageRef.current + 1;
      const feedRes = await apiClient.get<any>(`${Endpoints.search.feed}?page=${nextPage}&limit=${FEED_PAGE_SIZE}`).catch(() => null);

      const feedRaw: any[] = feedRes ? toArray<any>(feedRes.data) : [];
      feedHasMoreRef.current = feedRaw.length >= FEED_PAGE_SIZE;
      // Le pool se retrie a chaque page (score = f(temps)) -- une page BRUTE non vide
      // peut ne contenir QUE des items deja vus sur une page precedente (recoupement),
      // sans que le catalogue soit pour autant epuise. Ne conclure a la fin du flux que
      // si le backend lui-meme ne renvoie plus rien, jamais seulement sur la dedup —
      // sinon le scroll s'arretait prematurement des la 1ere page entierement recoupee.
      const rawIsEmpty = feedRaw.length === 0;

      const seen = seenIdsRef.current;
      const appended: FeedItem[] = [];
      let freshNonSpecialCount = 0;
      for (const d of feedRaw) {
        if (!d || !d.id) continue;
        if (d.kind === 'event' || d.kind === 'concert' || d.kind === 'post') {
          const key = `${d.kind}-${d.id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          appended.push({ kind: d.kind, id: String(d.id), data: d });
          freshNonSpecialCount++;
          if (feedAd && freshNonSpecialCount > 0 && freshNonSpecialCount % 8 === 0) {
            const slotId = `__ad__${++adCountRef.current}`;
            appended.push({ kind: 'ad', id: slotId, data: null });
          }
        }
      }

      feedPageRef.current = nextPage;

      if (appended.length === 0) {
        // Page entierement recoupee (deja vue) : le flux n'est fini si le
        // backend n'a lui-meme plus rien a offrir, OU si trop de pages
        // d'affilee n'ont ramene que du deja-vu (pool qui tourne sur
        // lui-meme sans jamais se vider vraiment).
        emptyStreakRef.current += 1;
        if (rawIsEmpty || emptyStreakRef.current >= MAX_EMPTY_STREAK) setHasMoreFeed(false);
        return;
      }

      const adSlotIds = appended.filter(it => it.kind === 'ad').map(it => it.id);
      nonReelCountRef.current += freshNonSpecialCount;
      setItems(prev => [...prev, ...appended]);

      // Tire une pub distincte (non déjà vue dans ce feed) pour chaque nouveau slot,
      // comme le mobile — évite de réafficher indéfiniment la même campagne en boucle.
      for (const slotId of adSlotIds) {
        try {
          const exclude = seenAdIdsRef.current.join(',');
          const res = await apiClient.get<any>(
            `${Endpoints.ads.feedNext('feed')}${exclude ? `&exclude_ids=${exclude}` : ''}`,
          );
          if (res.data?.id) {
            seenAdIdsRef.current.push(res.data.id);
            setItems(prev => prev.map(it => it.id === slotId ? { ...it, data: res.data } : it));
          }
        } catch { /* silencieux — le slot reste vide si aucune pub dispo */ }
      }
      // Une page a ramené du contenu neuf → il peut y en avoir encore ; la vraie fin
      // est détectée au prochain appel si la page suivante ne ramène plus rien (ci-dessus).
      emptyStreakRef.current = 0;
      setHasMoreFeed(true);
    } catch { /* silencieux */ }
    finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [tab, hasMoreFeed, feedAd]);

  // Load live concerts once
  useEffect(() => {
    apiClient.get<any>(Endpoints.concerts.live)
      .then(res => setLive(toArray<Concert>(res.data)))
      .catch(() => {});
  }, []);

  // Reload when tab changes
  useEffect(() => { loadFeed(tab); }, [tab]);

  // Retap sur l'onglet "Accueil" déjà actif (Sidebar/BottomNav) — scroll en
  // haut + recharge le fil, cf. utils/tabReselect.ts.
  useTabReselect('/feed', useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadFeed(tab);
  }, [tab]));

  // Infinite scroll — sentinel observé en bas de liste. `loading` doit être
  // dans les deps : le sentinel n'est monté dans le DOM qu'une fois le
  // chargement initial terminé (items.length > 0), et loadMoreFeed ne change
  // pas forcément d'identité à ce moment-là (ses propres deps tab/hasMoreFeed/
  // feedAd ne bougent pas systématiquement) — sans ça l'effet peut tourner
  // une seule fois avec sentinelRef.current encore null et ne jamais
  // ré-observer le sentinel une fois réellement monté.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading || !hasMoreFeed) return;
    // root explicite : sur desktop (lg+), c'est feedScrollRef qui scrolle
    // réellement (lg:overflow-y-auto, colonne isolée des sidebars), PAS la
    // fenêtre. Sans root explicite, IntersectionObserver observe par défaut
    // le viewport de la fenêtre — le sentinel pouvait alors être considéré
    // "visible" dès le premier rendu (il est dans le viewport window, même
    // hors du scroll visible du container interne), déclenchant page 2
    // quasi instantanément après page 1, sans laisser le temps de scroller.
    // rootMargin quasi nul : ne déclenche qu'une fois le bas réel approché.
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMoreFeed(); },
      { root: feedScrollRef.current, rootMargin: '40px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [loading, hasMoreFeed, loadMoreFeed]);

  return (
    <div className="px-2 sm:px-4 py-2 lg:py-6 w-full mx-auto lg:h-full lg:overflow-hidden">
      {/* Sur desktop (lg+) : hauteur contrainte au viewport visible, chaque
          colonne gère son propre scroll indépendamment — les sidebars
          gauche/droite restent totalement statiques (aucun scroll, aucun
          mouvement), seule la colonne centrale défile. Sans ce découpage,
          les trois colonnes partageaient le scroll unique de <main> (le
          seul ancêtre scrollable), donc "sticky" sur les sidebars les
          gardait visibles mais ne les empêchait pas de suivre le scroll
          global de la page — impossible de les isoler du feed. */}
      <div className="flex gap-4 items-start justify-center lg:h-full lg:items-stretch">

        {/* ── Left panel (lg+) — statique, ne scrolle jamais ── */}
        <div className="w-56 shrink-0 hidden lg:flex flex-col gap-4">
          <UpcomingEventsPanel />
          <TrendingPanel />
        </div>

        {/* ── Feed column — largeur de lecture confortable, comme Facebook, pour que
             les images de post (souvent portrait) ne flottent pas dans un vide immense
             maintenant que la page occupe toute la largeur d'écran.
             lg+ : seule cette colonne scrolle, indépendamment des sidebars. ── */}
        <div ref={feedScrollRef} className="flex-1 min-w-0 max-w-2xl space-y-3 lg:space-y-5 lg:h-full lg:overflow-y-auto lg:pr-1"
          style={{ scrollbarWidth: 'thin' }}>

          {/* Greeting — desktop uniquement, superflu sur mobile */}
          <div className="hidden lg:block animate-reveal-up">
            <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
              {(() => { const h = new Date().getHours(); return h < 12 ? 'Bonjour,' : h < 18 ? 'Bon après-midi,' : 'Bonsoir,'; })()}{' '}
              <span className="gradient-text">
                {user?.display_name ?? user?.first_name ?? user?.username}
              </span>
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {items.length > 0
                ? `${items.length} éléments dans ton fil`
                : 'Concerts, événements, reels et posts mélangés'}
            </p>
          </div>

          {/* ── Tabs — au-dessus des stories, compact sur mobile (moins de
               hauteur perdue avant le contenu réel du fil). ── */}
          <div className="flex items-center gap-1.5 lg:gap-2 animate-reveal-up">
            {(['all', 'friends', 'concerts', 'events'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 lg:flex-none text-xs lg:text-sm font-bold px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-full lg:rounded-xl transition-all text-center whitespace-nowrap overflow-hidden"
                style={{
                  background: tab === t ? 'var(--primary)' : 'var(--surface)',
                  color:      tab === t ? '#fff' : 'var(--text-secondary)',
                  border:     `1px solid ${tab === t ? 'var(--primary)' : 'var(--border)'}`,
                  boxShadow:  tab === t ? '0 4px 16px rgba(123,63,242,0.35)' : 'none' }}>
                {t === 'all' ? 'Tout' : t === 'friends' ? 'Mes amis' : t === 'concerts' ? 'Concerts' : 'Événements'}
              </button>
            ))}
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

          {/* ── Feed ── */}
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
            </div>
          ) : items.length === 0 && tab === 'friends' ? (
            <div className="rounded-2xl p-12 text-center animate-scale-in"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg,rgba(123,63,242,0.12),rgba(123,63,242,0.08))', border: '1px solid rgba(123,63,242,0.15)' }}>
                <Users size={28} style={{ color: 'var(--primary)' }} />
              </div>
              <p className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>Aucun post de tes suivis</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Suis d'autres comptes pour voir leurs publications ici.</p>
              <button onClick={() => setTab('all')} className="btn-primary mt-5 text-sm px-6">Découvrir du contenu</button>
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
                if (item.kind === 'concert') {
                  return <ConcertCard key={`concert-${item.id}`} concert={item.data} delay={Math.min(i, 8) * 0.04} followedIds={followedIds} onFollow={toggleFollow} onOpenComments={openComments} onOpenShare={openShare} commentCountOverride={commentCounts[item.id]}
                    onHide={() => setItems(prev => prev.filter(x => !(x.kind === 'concert' && x.id === item.id)))}
                    openMore={openMore} openReport={openReport} openAiStatus={openAiStatus} />;
                }
                if (item.kind === 'event') {
                  return <EventCard key={`event-${item.id}`} event={item.data} delay={Math.min(i, 8) * 0.04} followedIds={followedIds} onFollow={toggleFollow} onOpenComments={openComments} onOpenShare={openShare} commentCountOverride={commentCounts[item.id]}
                    onHide={() => setItems(prev => prev.filter(x => !(x.kind === 'event' && x.id === item.id)))}
                    openMore={openMore} openReport={openReport} openAiStatus={openAiStatus} />;
                }
                if (item.kind === 'post') {
                  return <PostCard key={`post-${item.id}`} post={item.data} delay={Math.min(i, 8) * 0.04} followedIds={followedIds} onFollow={toggleFollow} onOpenComments={openComments} onOpenShare={openShare} commentCountOverride={commentCounts[item.id]}
                    onHide={() => setItems(prev => prev.filter(x => !(x.kind === 'post' && x.id === item.id)))}
                    openAiStatus={openAiStatus}
                    openMore={openMore} openReport={openReport} />;
                }
                if (item.kind === 'reel') {
                  return <ReelCard key={`reel-${item.id}`} reel={item.data} delay={Math.min(i, 8) * 0.04} />;
                }
                if (item.kind === 'ad') {
                  return item.data ? <FeedAdCard key={item.id} ad={item.data} /> : null;
                }
                return null;
              })}

              {/* ── Sentinel scroll infini ── */}
              {tab === 'all' && hasMoreFeed && (
                <div ref={sentinelRef} className="flex justify-center py-4">
                  {loadingMore && <Spinner size="sm" />}
                </div>
              )}
              {tab === 'all' && !hasMoreFeed && items.length > 0 && (
                <p className="text-center text-xs py-4" style={{ color: 'var(--text-tertiary)' }}>
                  Vous avez tout vu
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Right sidebar (lg+) — statique, ne scrolle jamais ── */}
        <div className="w-60 shrink-0 hidden lg:flex flex-col gap-4">
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

      {/* ── Single global share modal — même principe que CommentsModal ── */}
      {shareTarget && (() => {
        const path = shareTarget.kind === 'concert' ? 'concerts' : shareTarget.kind === 'event' ? 'events' : shareTarget.kind === 'post' ? 'posts' : 'reels';
        const url  = shareTarget.kind === 'reel'
          ? `${window.location.origin}/reels?id=${encodeId(shareTarget.id)}`
          : `${window.location.origin}/${path}/${encodeId(shareTarget.id)}`;
        return (
          <ShareModal
            open
            onClose={() => setShareTarget(null)}
            url={url}
            title={shareTarget.title ?? 'Gofolyx'}
            desc={shareTarget.desc}
            image={shareTarget.image}
            targetType={shareTarget.kind}
            targetId={shareTarget.id}
          />
        );
      })()}

      {/* ── Single global menu "..." et modal de signalement — partagés par toutes les cards ── */}
      <CardMoreMenu
        open={!!moreMenu}
        onClose={() => setMoreMenu(null)}
        title={moreMenu?.title}
        actions={moreMenu?.actions ?? []}
      />
      <ReportModal
        open={!!reportTarget}
        onClose={() => setReportTarget(null)}
        contentType={reportTarget?.type ?? 'post'}
        contentId={reportTarget?.id ?? ''}
      />
      <AiAnalysisStatusModal
        open={!!aiStatusTarget}
        onClose={() => setAiStatusTarget(null)}
        contentType={aiStatusTarget?.type ?? 'post'}
        contentId={aiStatusTarget?.id ?? ''}
        initialStatus={aiStatusTarget?.status}
      />
    </div>
  );
}
