import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Heart, MessageCircle, Share2,
  Volume2, VolumeX, Play, X, Send, Bookmark, ArrowLeft,
} from 'lucide-react';
import type { Reel, Comment } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useApi } from '../hooks/useApi';
import { API_BASE_URL } from '../utils/constants';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { useAuthStore } from '../store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─────────────────────────────────────────────────────────────
// Comments panel (slide-up sheet)
// ─────────────────────────────────────────────────────────────
function CommentsPanel({ reelId, count, onClose }: {
  reelId: string; count: number; onClose: () => void;
}) {
  const { user }        = useAuthStore();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, loading, refetch } = useApi<Comment[]>(
    () => apiClient.get<Comment[]>(`${Endpoints.social.comments}?reel_id=${reelId}&limit=50`),
    [reelId],
  );
  const comments = data ?? [];

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    try {
      await apiClient.post(Endpoints.social.comments, { reel_id: reelId, body: text.trim() });
      setText('');
      refetch();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    } finally { setSending(false); }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 z-20" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />

      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 z-30 flex flex-col"
        style={{
          height: '72%',
          background: 'var(--bg)',
          borderRadius: '1.25rem 1.25rem 0 0',
          animation: 'reveal-up 0.28s cubic-bezier(.16,1,.3,1) both',
        }}>

        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-9 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
            Commentaires {count > 0 ? `· ${count}` : ''}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-xl transition-all"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => { (e.currentTarget.style.background = 'var(--bg-secondary)'); }}
            onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); }}>
            <X size={17} />
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : comments.length === 0 ? (
            <div className="text-center py-14">
              <MessageCircle size={32} className="mx-auto mb-2" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Aucun commentaire</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Soyez le premier !</p>
            </div>
          ) : comments.map(c => {
            const name = c.author?.display_name ?? c.author?.username ?? 'Utilisateur';
            return (
              <div key={c.id} className="flex gap-3">
                <Avatar src={c.author?.avatar_url} name={name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="inline-block max-w-full px-3.5 py-2.5 rounded-2xl rounded-tl-sm"
                    style={{ background: 'var(--bg-secondary)' }}>
                    <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--primary)' }}>{name}</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{c.body}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 px-1">
                    <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      {formatDistanceToNow(new Date(c.created_at), { locale: fr, addSuffix: true })}
                    </span>
                    <button className="text-[11px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                      J'aime · {c.like_count}
                    </button>
                    <button className="text-[11px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                      Répondre
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3"
          style={{ borderTop: '1px solid var(--border)' }}>
          <Avatar src={user?.avatar_url} name={user?.display_name ?? user?.username ?? ''} size="sm" />
          <div className="flex-1 flex items-center gap-2 px-3.5 py-2 rounded-full"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ajouter un commentaire…"
              className="flex-1 text-sm bg-transparent focus:outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background:  text.trim() ? 'linear-gradient(135deg,#7B3FF2,#E0389A)' : 'var(--bg-secondary)',
              color:       text.trim() ? '#fff' : 'var(--text-tertiary)',
              boxShadow:   text.trim() ? '0 4px 12px rgba(123,63,242,0.4)' : 'none',
            }}>
            {sending ? <Spinner size="sm" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </>
  );
}


// ─────────────────────────────────────────────────────────────
// Double-tap heart burst
// ─────────────────────────────────────────────────────────────
function HeartBurst({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <Heart
        size={88}
        fill="#E0389A"
        stroke="none"
        style={{
          filter: 'drop-shadow(0 0 24px #E0389Acc)',
          animation: 'scale-in 0.15s cubic-bezier(.16,1,.3,1) both',
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Single reel player
// ─────────────────────────────────────────────────────────────
function ReelPlayer({ reel, active, globalMuted, onUnmute }: {
  reel: Reel; active: boolean;
  globalMuted: boolean; onUnmute: () => void;
}) {
  const { user: me }  = useAuthStore();
  const videoRef      = useRef<HTMLVideoElement>(null);
  const tapTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing,          setPlaying]         = useState(false);
  const [progress,         setProgress]        = useState(0);
  const [liked,            setLiked]           = useState(reel.user_reaction === 'like');
  const [likeCount,        setLikeCount]       = useState(reel.like_count ?? 0);
  const [showHeart,        setShowHeart]       = useState(false);
  const [showComments,     setShowComments]    = useState(false);
  const [saved,            setSaved]           = useState(false);
  const [followed,         setFollowed]        = useState(false);
  const [followLoading,    setFollowLoading]   = useState(false);
  const [captionExpanded,  setCaptionExpanded] = useState(false);

  const authorId   = reel.author?.id;
  const authorName = reel.author?.display_name ?? reel.author?.username ?? 'Artiste';
  const caption    = reel.caption ?? '';
  const isMine     = me?.id === authorId;

  // Sync mute
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = globalMuted;
  }, [globalMuted]);

  // Play / pause on active
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      v.currentTime = 0;
      v.muted = globalMuted;
      v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      v.pause();
      v.currentTime = 0;
      setPlaying(false);
      setProgress(0);
    }
  }, [active]); // eslint-disable-line

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else          { v.pause(); setPlaying(false); }
  }

  function handleTap() {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
      if (!liked) {
        setLiked(true); setLikeCount(c => c + 1);
        apiClient.post(Endpoints.social.toggleReaction, { reel_id: reel.id, reaction_type: 'like' }).catch(() => {});
      }
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 750);
    } else {
      tapTimer.current = setTimeout(() => { tapTimer.current = null; togglePlay(); }, 230);
    }
  }

  function handleTimeUpdate() {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  }

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    if (liked) { setLiked(false); setLikeCount(c => Math.max(0, c - 1)); }
    else       { setLiked(true);  setLikeCount(c => c + 1); }
    apiClient.post(Endpoints.social.toggleReaction, { reel_id: reel.id, reaction_type: 'like' }).catch(() => {});
  }

  async function handleFollow(e: React.MouseEvent) {
    e.stopPropagation();
    if (!authorId || isMine || followLoading) return;
    setFollowLoading(true);
    try {
      await apiClient.post(Endpoints.users.follow(authorId));
      setFollowed(v => !v);
    } catch { /* ignore */ } finally { setFollowLoading(false); }
  }

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/reels?id=${reel.id}`;
    if (navigator.share) {
      navigator.share({ title: caption || 'Reel FoliX', url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  }

  function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">

      {/* ── Video ── */}
      <div className="absolute inset-0 flex items-center justify-center bg-black" onClick={handleTap}>
        {reel.video_url ? (
          <video
            ref={videoRef}
            src={reel.video_url}
            className="w-full h-full object-contain"
            loop playsInline
            poster={reel.thumbnail_url ?? undefined}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => apiClient.post(Endpoints.reels.view(reel.id)).catch(() => {})}
          />
        ) : (
          <img src={reel.thumbnail_url ?? ''} className="w-full h-full object-contain" alt={caption} />
        )}
      </div>

      {/* ── Double-tap heart ── */}
      <HeartBurst show={showHeart} />

      {/* ── Paused overlay ── */}
      {!playing && !showComments && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="rounded-full p-5"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', border: '2px solid rgba(255,255,255,0.2)' }}>
            <Play size={36} fill="white" stroke="none" />
          </div>
        </div>
      )}

      {/* ── Gradients ── */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.0) 40%, rgba(0,0,0,0.25) 100%)' }} />

      {/* ── Progress bar ── */}
      <div className="absolute top-0 inset-x-0 h-[3px] z-20" style={{ background: 'rgba(255,255,255,0.12)' }}>
        <div className="h-full transition-[width] duration-200 linear"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#7B3FF2,#E0389A)' }} />
      </div>

      {/* ── Top controls ── */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button onClick={e => { e.stopPropagation(); onUnmute(); }}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
          {globalMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>

      {/* ── Bottom layout ── */}
      <div className="absolute bottom-0 inset-x-0 z-10 flex items-end gap-3 px-4 pb-8">

        {/* ── Left: author + caption ── */}
        <div className="flex-1 min-w-0 space-y-3">

          {/* Author */}
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden"
                style={{ border: '2px solid rgba(255,255,255,0.5)' }}>
                {reel.author?.avatar_url
                  ? <img src={reel.author.avatar_url} alt={authorName} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
                      {authorName[0]?.toUpperCase()}
                    </div>
                }
              </div>
              {/* Verified dot */}
              {reel.author?.is_verified && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
                  <span className="text-white text-[9px] font-black">✓</span>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-white font-bold text-sm leading-tight truncate"
                style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>{authorName}</p>
              {reel.author?.username && (
                <p className="text-white/55 text-xs leading-tight">@{reel.author.username}</p>
              )}
            </div>

            {/* Follow button */}
            {!isMine && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className="shrink-0 text-xs font-bold px-4 py-1.5 rounded-full transition-all"
                style={followed
                  ? { background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(255,255,255,0.3)' }
                  : { background: 'linear-gradient(135deg,#7B3FF2,#E0389A)', color: '#fff', border: 'none', boxShadow: '0 2px 12px rgba(123,63,242,0.5)' }
                }>
                {followLoading ? '…' : followed ? 'Suivi ✓' : '+ Suivre'}
              </button>
            )}
          </div>

          {/* Caption */}
          {caption && (
            <div>
              <p className={`text-white text-sm leading-relaxed ${captionExpanded ? '' : 'line-clamp-2'}`}
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                {caption}
              </p>
              {caption.length > 90 && (
                <button onClick={e => { e.stopPropagation(); setCaptionExpanded(v => !v); }}
                  className="text-white/50 text-xs mt-0.5 font-medium">
                  {captionExpanded ? 'Réduire' : 'Voir plus'}
                </button>
              )}
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {reel.ref_content_id && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-white"
                style={{ background: 'rgba(123,63,242,0.6)', border: '1px solid rgba(123,63,242,0.8)' }}>
                🎬 Film
              </span>
            )}
            {reel.ref_concert_id && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-white"
                style={{ background: 'rgba(224,56,154,0.6)', border: '1px solid rgba(224,56,154,0.8)' }}>
                🎵 Concert
              </span>
            )}
          </div>
        </div>

        {/* ── Right: action column ── */}
        <div className="shrink-0 flex flex-col items-center gap-5 pb-1">

          {/* Vinyl disc */}
          <div className="w-10 h-10 rounded-full overflow-hidden"
            style={{
              border: '2px solid rgba(255,255,255,0.4)',
              animation: playing ? 'spin-slow 5s linear infinite' : 'none',
              boxShadow: playing ? '0 0 18px rgba(123,63,242,0.7)' : 'none',
            }}>
            {reel.author?.avatar_url
              ? <img src={reel.author.avatar_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }} />
            }
          </div>

          {/* Like */}
          <button onClick={handleLike} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
              style={{
                background: liked ? 'rgba(224,56,154,0.25)' : 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(12px)',
                border: `1.5px solid ${liked ? '#E0389A' : 'rgba(255,255,255,0.2)'}`,
                color: liked ? '#E0389A' : '#fff',
                boxShadow: liked ? '0 0 16px rgba(224,56,154,0.5)' : 'none',
              }}>
              <Heart size={20} fill={liked ? 'currentColor' : 'none'} />
            </div>
            {likeCount > 0 && (
              <span className="text-[11px] font-semibold text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                {fmt(likeCount)}
              </span>
            )}
          </button>

          {/* Comment */}
          <button onClick={e => { e.stopPropagation(); setShowComments(true); }} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(255,255,255,0.2)', color: '#fff' }}>
              <MessageCircle size={20} />
            </div>
            {(reel.comment_count ?? 0) > 0 && (
              <span className="text-[11px] font-semibold text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                {fmt(reel.comment_count ?? 0)}
              </span>
            )}
          </button>

          {/* Save */}
          <button onClick={e => { e.stopPropagation(); setSaved(v => !v); }} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
              style={{
                background: saved ? 'rgba(255,122,47,0.25)' : 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(12px)',
                border: `1.5px solid ${saved ? '#FF7A2F' : 'rgba(255,255,255,0.2)'}`,
                color: saved ? '#FF7A2F' : '#fff',
              }}>
              <Bookmark size={20} fill={saved ? 'currentColor' : 'none'} />
            </div>
          </button>

          {/* Share */}
          <button onClick={handleShare} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(255,255,255,0.2)', color: '#fff' }}>
              <Share2 size={20} />
            </div>
            {(reel.share_count ?? 0) > 0 && (
              <span className="text-[11px] font-semibold text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                {fmt(reel.share_count ?? 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Comments panel ── */}
      {showComments && (
        <CommentsPanel reelId={reel.id} count={reel.comment_count} onClose={() => setShowComments(false)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page shell
// ─────────────────────────────────────────────────────────────
function toArray<T>(raw: unknown): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.items))   return obj.items   as T[];
  if (Array.isArray(obj.results)) return obj.results as T[];
  if (Array.isArray(obj.data))    return obj.data    as T[];
  return [];
}

export default function ReelsPage() {
  const [searchParams]                = useSearchParams();
  const navigate                      = useNavigate();
  const targetId                      = searchParams.get('id');
  const [reels,       setReels]       = useState<Reel[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [globalMuted, setGlobalMuted] = useState(true);
  const containerRef                  = useRef<HTMLDivElement>(null);

  // Fetch reels — put target reel first if ?id= is set
  const fetchReels = useCallback(() => {
    setLoading(true);
    setError(null);
    const headers: Record<string, string> = { Accept: 'application/json' };
    // Get auth token from localStorage
    try {
      const raw = localStorage.getItem('folix_access_token');
      if (raw) headers.Authorization = `Bearer ${raw}`;
    } catch { /* ignore */ }

    fetch(`${API_BASE_URL}/api/v1/reels?limit=30`, { headers })
      .then(r => r.json())
      .then((json: unknown) => {
        let list = toArray<Reel>(json);
        if (targetId) {
          // Move target reel to position 0
          const idx = list.findIndex(r => r.id === targetId);
          if (idx > 0) {
            const [target] = list.splice(idx, 1);
            list = [target, ...list];
          } else if (idx === -1) {
            // Not in list — fetch individually and prepend
            fetch(`${API_BASE_URL}/api/v1/reels/${targetId}`, { headers })
              .then(r => r.json())
              .then((r: unknown) => {
                const single = (r as any)?.data ?? r;
                if (single?.id) setReels(prev => [single as Reel, ...prev]);
              })
              .catch(() => {});
          }
        }
        setReels(list);
        setLoading(false);
      })
      .catch(() => { setError('Impossible de charger les reels'); setLoading(false); });
  }, [targetId]);

  useEffect(() => { fetchReels(); }, [fetchReels]);

  // Scroll to first item (index 0) when reels load — it's already the target
  useEffect(() => {
    if (reels.length > 0 && containerRef.current) {
      containerRef.current.scrollTop = 0;
      setActiveIndex(0);
    }
  }, [reels.length]);

  // IntersectionObserver — détecte le reel visible à >60% et le rend actif
  useEffect(() => {
    if (reels.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            setActiveIndex(idx);
          }
        });
      },
      { threshold: 0.6 },
    );
    const items = document.querySelectorAll('[data-reel-item]');
    items.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [reels]);

  const shell = (content: React.ReactNode) => (
    <div className="fixed inset-0 bg-black" style={{ zIndex: 0 }}>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-30 w-9 h-9 rounded-full flex items-center justify-center transition-all"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
        <ArrowLeft size={18} />
      </button>
      {content}
    </div>
  );

  if (loading && reels.length === 0) {
    return shell(
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-2xl rotate-12"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)', animation: 'spin-slow 3s linear infinite' }} />
            <div className="absolute inset-1 rounded-xl flex items-center justify-center bg-black">
              <span className="text-base font-black gradient-text">FX</span>
            </div>
          </div>
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-white"
                style={{ animation: `blink 1.2s ${i * 0.2}s infinite` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!loading && (error || reels.length === 0)) {
    return shell(
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center px-6">
          <Play size={48} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <p className="text-white font-semibold">{error ? 'Impossible de charger les reels' : 'Aucun reel disponible'}</p>
          <p className="text-sm mt-1 mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {error ? 'Vérifiez votre connexion et réessayez.' : 'Revenez bientôt !'}
          </p>
          {error && (
            <button onClick={fetchReels}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
              Réessayer
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden" style={{ zIndex: 0 }}>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-30 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
        <ArrowLeft size={18} />
      </button>

      {/* Scroll container — 100% of viewport */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollbarWidth: 'none' }}>
        {reels.map((reel, i) => (
          <div
            key={reel.id}
            data-reel-item
            data-index={i}
            className="w-full snap-start snap-always shrink-0"
            style={{ height: '100dvh' }}>
            <ReelPlayer
              reel={reel}
              active={i === activeIndex}
              globalMuted={globalMuted}
              onUnmute={() => setGlobalMuted(v => !v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
