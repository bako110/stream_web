/**
 * StoryPage — viewer de stories plein écran dédié.
 * Route : /stories?userId=xxx&index=0
 * Charge les groupes de stories et affiche le viewer.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { decodeId } from '../utils/slugId';
import {
  X, ChevronLeft, ChevronRight, Eye, MoreHorizontal,
  Edit3, Trash2, Zap, ExternalLink,
} from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { useAuthStore } from '../store/authStore';
import type { StoryGroup } from '../types';

interface StoryAd {
  id: string; title: string; description?: string | null;
  cta_text?: string | null; cta_url?: string | null;
  creative_url?: string | null; thumbnail_url?: string | null;
}

export default function StoryPage() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const { user }      = useAuthStore();

  const targetUserId  = params.get('userId') ? decodeId(params.get('userId')!) : null;
  const initialIndex  = parseInt(params.get('index') ?? '0', 10);

  const [groups,   setGroups]   = useState<StoryGroup[]>([]);
  const [storyAd,  setStoryAd]  = useState<StoryAd | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get<StoryGroup[]>(Endpoints.stories.feed),
      apiClient.get<StoryAd>(Endpoints.ads.feedNext('stories')).catch(() => null),
    ]).then(([storiesRes, adRes]) => {
      const raw = Array.isArray(storiesRes.data) ? storiesRes.data : (storiesRes.data as any)?.items ?? [];
      setGroups(raw);
      if (adRes?.data?.id) setStoryAd(adRes.data);
    })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const startIndex = (() => {
    if (!targetUserId || groups.length === 0) return initialIndex;
    const idx = groups.findIndex(g => g.user.id === targetUserId);
    return idx >= 0 ? idx : initialIndex;
  })();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (groups.length === 0) {
    navigate(-1);
    return null;
  }

  return (
    <StoryViewer
      groups={groups}
      initialIndex={startIndex}
      currentUserId={user?.id}
      storyAd={storyAd}
      onClose={() => navigate(-1)}
      onReload={() => {
        apiClient.get<StoryGroup[]>(Endpoints.stories.feed)
          .then(r => setGroups(Array.isArray(r.data) ? r.data : (r.data as any)?.items ?? []))
          .catch(() => {});
      }}
    />
  );
}

// ── StoryViewer ───────────────────────────────────────────────────────────────

function StoryViewer({
  groups, initialIndex, currentUserId, storyAd, onClose, onReload,
}: {
  groups: StoryGroup[];
  initialIndex: number;
  currentUserId?: string;
  storyAd?: StoryAd | null;
  onClose: () => void;
  onReload: () => void;
}) {
  const [groupIdx,     setGroupIdx]     = useState(initialIndex);
  const [storyIdx,     setStoryIdx]     = useState(0);
  const [progress,     setProgress]     = useState(0);
  const [paused,       setPaused]       = useState(false);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [editMode,     setEditMode]     = useState(false);
  const [editText,     setEditText]     = useState('');
  const [viewers,      setViewers]      = useState<any[]>([]);
  const [viewersOpen,    setViewersOpen]    = useState(false);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [showAd,       setShowAd]       = useState(false);
  const [adProgress,   setAdProgress]   = useState(0);
  const nextGroupRef   = useRef(0);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const adTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adProgressRef  = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft')  goPrev();
      if (e.key === 'Escape')     onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [groupIdx, storyIdx]);

  const goNext = useCallback(() => {
    if (storyIdx < totalInGroup - 1) {
      setStoryIdx(s => s + 1);
    } else if (groupIdx < groups.length - 1) {
      const nextGroup = groupIdx + 1;
      // Afficher l'ad entre groupes (5 secondes, identique mobile)
      if (storyAd) {
        nextGroupRef.current = nextGroup;
        setPaused(true);
        setShowAd(true);
        setAdProgress(0);
        apiClient.post(Endpoints.ads.impression(storyAd.id)).catch(() => {});
        // Progress bar 5s
        const start = Date.now();
        if (adProgressRef.current) clearInterval(adProgressRef.current);
        adProgressRef.current = setInterval(() => {
          const pct = Math.min(((Date.now() - start) / 5000) * 100, 100);
          setAdProgress(pct);
        }, 50);
        if (adTimerRef.current) clearTimeout(adTimerRef.current);
        adTimerRef.current = setTimeout(() => {
          if (adProgressRef.current) clearInterval(adProgressRef.current);
          setShowAd(false);
          setPaused(false);
          setGroupIdx(nextGroupRef.current);
          setStoryIdx(0);
        }, 5000);
      } else {
        setGroupIdx(nextGroup);
        setStoryIdx(0);
      }
    } else {
      onClose();
    }
  }, [storyIdx, totalInGroup, groupIdx, groups.length, storyAd, onClose]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) { setStoryIdx(s => s - 1); }
    else if (groupIdx > 0) { setGroupIdx(g => g - 1); setStoryIdx(0); }
  }, [storyIdx, groupIdx]);

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
    setEditMode(false); setPaused(false); onReload();
  }

  // Affichage de la pub entre groupes
  if (showAd && storyAd) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <div className="relative w-full max-w-[500px] bg-black" style={{ height: '100dvh' }}>
          {/* Progress bar ad */}
          <div className="absolute top-0 inset-x-0 z-30 px-3 pt-3">
            <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.3)' }}>
              <div className="h-full rounded-full bg-white transition-none" style={{ width: `${adProgress}%` }} />
            </div>
          </div>
          {/* Badge sponsorisé */}
          <div className="absolute top-8 left-4 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[11px] font-black"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>
            <Zap size={10} /> SPONSORISÉ
          </div>
          {/* Fond créatif */}
          {storyAd.thumbnail_url || storyAd.creative_url ? (
            <img src={storyAd.thumbnail_url ?? storyAd.creative_url!} alt={storyAd.title}
              className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }} />
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.8) 0%,transparent 50%)' }} />
          {/* Bouton skip */}
          <button onClick={() => {
            if (adTimerRef.current) clearTimeout(adTimerRef.current);
            if (adProgressRef.current) clearInterval(adProgressRef.current);
            setShowAd(false); setPaused(false);
            setGroupIdx(nextGroupRef.current); setStoryIdx(0);
          }}
            className="absolute top-8 right-4 z-30 text-white text-xs font-bold px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.15)' }}>
            Ignorer
          </button>
          {/* Contenu */}
          <div className="absolute bottom-12 left-4 right-4 z-30">
            <p className="text-white font-black text-xl mb-1">{storyAd.title}</p>
            {storyAd.description && <p className="text-white/70 text-sm mb-4">{storyAd.description}</p>}
            {storyAd.cta_url && (
              <button onClick={() => {
                apiClient.post(Endpoints.ads.click(storyAd.id)).catch(() => {});
                window.open(storyAd.cta_url!, '_blank', 'noopener,noreferrer');
              }}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-bold text-sm"
                style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
                {storyAd.cta_text ?? 'En savoir plus'} <ExternalLink size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
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
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">

      {/* Zone cliquable pour fermer (côtés) */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Container centré style story Instagram — max 500px */}
      <div
        className="relative z-10 w-full max-w-[500px] bg-black"
        style={{ height: '100dvh', maxHeight: '100dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress bars */}
        <div className="absolute top-0 inset-x-0 z-30 flex gap-1 px-3 pt-3">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.3)' }}>
              <div className="h-full rounded-full transition-none"
                style={{ background: '#fff', width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%' }} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-7 inset-x-0 z-30 flex items-center gap-3 px-4">
          <div className="rounded-full p-[2px]" style={{ border: '2px solid rgba(255,255,255,0.7)' }}>
            <Avatar src={author.avatar_url} name={author.display_name ?? author.username ?? ''} size="sm" verified={author.is_verified} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-bold truncate">{author.display_name ?? author.username}</p>
            <p className="text-white/60 text-xs">{timeAgo}</p>
          </div>
          {isOwn && (
            <button onClick={() => { setPaused(true); setMenuOpen(true); }}
              className="p-2 rounded-full" style={{ background: 'rgba(0,0,0,0.35)' }}>
              <MoreHorizontal size={18} className="text-white" />
            </button>
          )}
          <button onClick={onClose}
            className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* Media */}
        <div className="absolute inset-0"
          onMouseDown={() => setPaused(true)} onMouseUp={() => setPaused(false)}
          onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)}>
          {story.media_type === 'video' && story.media_url ? (
            <video
              key={story.id}
              src={story.media_url}
              className="w-full h-full object-cover"
              autoPlay loop={false} playsInline muted={false}
            />
          ) : story.media_url ? (
            <img key={story.id} src={story.media_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center px-8"
              style={{ background: story.background_color ?? 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
              {story.caption && (
                <p className="text-white font-black text-3xl text-center leading-snug">{story.caption}</p>
              )}
            </div>
          )}
        </div>

        {/* Gradients */}
        <div className="absolute inset-x-0 top-0 h-36 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }} />
        <div className="absolute inset-x-0 bottom-0 h-36 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }} />

        {/* Caption */}
        {story.caption && story.media_url && (
          <div className="absolute bottom-16 inset-x-0 px-5 z-10">
            <div className="inline-block rounded-2xl px-4 py-2.5" style={{ background: 'rgba(0,0,0,0.55)' }}>
              <p className="text-white text-sm leading-relaxed">{story.caption}</p>
            </div>
          </div>
        )}

        {/* Vue count */}
        {isOwn && (
          <button onClick={openViewers}
            className="absolute bottom-5 left-5 z-20 flex items-center gap-1.5 px-3 py-2 rounded-full"
            style={{ background: 'rgba(0,0,0,0.55)' }}>
            <Eye size={14} className="text-white" />
            <span className="text-white text-xs font-bold">{(story as any).view_count ?? 0} vue{((story as any).view_count ?? 0) !== 1 ? 's' : ''}</span>
          </button>
        )}

        {/* Tap zones */}
        <button className="absolute left-0 top-0 w-1/3 h-full z-10 opacity-0" onClick={goPrev} />
        <button className="absolute right-0 top-0 w-1/3 h-full z-10 opacity-0" onClick={goNext} />

        {/* Flèches groupes */}
        {groupIdx > 0 && (
          <button
            className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.18)' }}
            onClick={() => { setGroupIdx(g => g - 1); setStoryIdx(0); }}>
            <ChevronLeft size={18} className="text-white" />
          </button>
        )}
        {groupIdx < groups.length - 1 && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.18)' }}
            onClick={() => { setGroupIdx(g => g + 1); setStoryIdx(0); }}>
            <ChevronRight size={18} className="text-white" />
          </button>
        )}

        {/* Menu */}
        {menuOpen && (
          <div className="absolute inset-0 z-40" style={{ background: 'rgba(0,0,0,0.6)' }}
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

        {/* Edit caption */}
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

        {/* Viewers */}
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
