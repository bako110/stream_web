import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Heart, ThumbsDown, MessageCircle, Share2,
  Volume2, VolumeX, Play, X, Send,
  MoreHorizontal, Bookmark,
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
// Floating action button (right sidebar)
// ─────────────────────────────────────────────────────────────
function ActionBtn({ icon, label, active = false, color = '#E0389A', onClick }: {
  icon: React.ReactNode; label?: string | number;
  active?: boolean; color?: string; onClick?: () => void;
}) {
  const [pop, setPop] = useState(false);

  function handleClick() {
    setPop(true);
    setTimeout(() => setPop(false), 280);
    onClick?.();
  }

  return (
    <button
      onClick={handleClick}
      className="flex flex-col items-center gap-1 select-none"
      style={{ transition: 'transform 0.22s cubic-bezier(.16,1,.3,1)', transform: pop ? 'scale(1.38)' : 'scale(1)' }}>
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{
          background:  active ? `${color}22` : 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border:      `1.5px solid ${active ? color : 'rgba(255,255,255,0.18)'}`,
          color:       active ? color : '#fff',
          boxShadow:   active ? `0 0 18px ${color}55` : 'none',
        }}>
        {icon}
      </div>
      {label !== undefined && label !== 0 && (
        <span className="text-[11px] font-semibold text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
          {typeof label === 'number' && label > 999 ? `${(label / 1000).toFixed(1)}k` : label}
        </span>
      )}
    </button>
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing,      setPlaying]     = useState(false);
  const [progress,     setProgress]    = useState(0);
  const [liked,        setLiked]       = useState(reel.user_reaction === 'like');
  const [disliked,     setDisliked]    = useState(reel.user_reaction === 'dislike');
  const [likeCount,    setLikeCount]   = useState(reel.like_count ?? 0);
  const [showHeart,    setShowHeart]   = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [saved,        setSaved]       = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);

  // Sync mute state with global
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = globalMuted;
  }, [globalMuted]);

  // Play/pause when active changes
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      v.currentTime = 0;
      v.muted = globalMuted;
      const p = v.play();
      if (p) p.then(() => setPlaying(true)).catch(() => setPlaying(false));
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
      // Double tap → like
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

  async function handleLike() {
    if (liked) { setLiked(false); setLikeCount(c => Math.max(0, c - 1)); }
    else       { setLiked(true);  setDisliked(false); setLikeCount(c => c + 1); }
    apiClient.post(Endpoints.social.toggleReaction, { reel_id: reel.id, reaction_type: 'like' }).catch(() => {});
  }

  async function handleDislike() {
    if (disliked) { setDisliked(false); }
    else          { setDisliked(true); if (liked) { setLiked(false); setLikeCount(c => Math.max(0, c - 1)); } }
    apiClient.post(Endpoints.social.toggleReaction, { reel_id: reel.id, reaction_type: 'dislike' }).catch(() => {});
  }

  const authorName = reel.author?.display_name ?? reel.author?.username ?? 'Artiste';
  const caption    = reel.caption ?? '';

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">

      {/* ── Media ── */}
      <div className="absolute inset-0" onClick={handleTap}>
        {reel.video_url ? (
          <video
            ref={videoRef}
            src={reel.video_url}
            className="w-full h-full object-cover"
            loop playsInline
            poster={reel.thumbnail_url ?? undefined}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => apiClient.post(Endpoints.reels.view(reel.id)).catch(() => {})}
          />
        ) : (
          <img src={reel.thumbnail_url ?? ''} className="w-full h-full object-cover" alt={caption} />
        )}
      </div>

      {/* ── Double-tap heart ── */}
      <HeartBurst show={showHeart} />

      {/* ── Paused icon ── */}
      {!playing && !showComments && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="rounded-full p-5"
            style={{ background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(8px)', border: '2px solid rgba(255,255,255,0.25)' }}>
            <Play size={38} fill="white" stroke="none" />
          </div>
        </div>
      )}

      {/* ── Gradient overlays ── */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.15) 100%)' }} />

      {/* ── Progress bar ── */}
      <div className="absolute top-0 left-0 right-0 h-0.5 z-10" style={{ background: 'rgba(255,255,255,0.15)' }}>
        <div className="h-full" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#7B3FF2,#E0389A)', transition: 'width 0.2s linear' }} />
      </div>

      {/* ── Top row: mute + more ── */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={() => { onUnmute(); }}
          className="p-2.5 rounded-full transition-all"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }}>
          {globalMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
        <button
          className="p-2.5 rounded-full"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }}>
          <MoreHorizontal size={17} />
        </button>
      </div>

      {/* ── Bottom bar ── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-end gap-3 px-4 pb-6 pt-20">

        {/* Left: author + caption */}
        <div className="flex-1 min-w-0 space-y-2.5">

          {/* Author row */}
          <div className="flex items-center gap-2.5">
            <div className="shrink-0">
              <Avatar src={reel.author?.avatar_url} name={authorName} size="sm" verified={reel.author?.is_verified} />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-tight drop-shadow">{authorName}</p>
              {reel.author?.username && (
                <p className="text-white/60 text-xs leading-tight">@{reel.author.username}</p>
              )}
            </div>
            <button
              className="shrink-0 text-xs font-bold px-3 py-1 rounded-full transition-all"
              style={{ border: '1.5px solid rgba(255,255,255,0.7)', color: 'white', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(4px)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}>
              Suivre
            </button>
          </div>

          {/* Caption */}
          {caption && (
            <div>
              <p className={`text-white text-sm leading-relaxed drop-shadow ${captionExpanded ? '' : 'line-clamp-2'}`}>
                {caption}
              </p>
              {caption.length > 80 && (
                <button onClick={() => setCaptionExpanded(v => !v)}
                  className="text-white/60 text-xs mt-0.5">
                  {captionExpanded ? 'Voir moins' : 'Voir plus'}
                </button>
              )}
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {reel.ref_content_id && (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium text-white"
                style={{ background: 'rgba(123,63,242,0.55)', backdropFilter: 'blur(6px)', border: '1px solid rgba(123,63,242,0.7)' }}>
                🎬 Film lié
              </span>
            )}
            {reel.ref_concert_id && (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium text-white"
                style={{ background: 'rgba(224,56,154,0.55)', backdropFilter: 'blur(6px)', border: '1px solid rgba(224,56,154,0.7)' }}>
                🎵 Concert
              </span>
            )}
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="shrink-0 flex flex-col items-center gap-3 pb-1">

          {/* Vinyl disc (spinning) */}
          {reel.author?.avatar_url && (
            <div
              className="w-11 h-11 rounded-full overflow-hidden mb-1"
              style={{
                border: '2px solid rgba(255,255,255,0.3)',
                animation: playing ? 'spin-slow 4s linear infinite' : 'none',
                boxShadow: playing ? '0 0 16px rgba(123,63,242,0.6)' : 'none',
              }}>
              <img src={reel.author.avatar_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          <ActionBtn icon={<Heart size={22} fill={liked ? 'currentColor' : 'none'} />}
            label={likeCount} active={liked} color="#E0389A" onClick={handleLike} />

          <ActionBtn icon={<ThumbsDown size={22} fill={disliked ? 'currentColor' : 'none'} />}
            active={disliked} color="#7B3FF2" onClick={handleDislike} />

          <ActionBtn icon={<MessageCircle size={22} />} label={reel.comment_count}
            onClick={() => setShowComments(true)} />

          <ActionBtn icon={<Bookmark size={22} fill={saved ? 'currentColor' : 'none'} />}
            active={saved} color="#FF7A2F" onClick={() => setSaved(v => !v)} />

          <ActionBtn icon={<Share2 size={22} />}
            label={reel.share_count > 0 ? reel.share_count : undefined} />
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
  const [reels,       setReels]       = useState<Reel[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [globalMuted, setGlobalMuted] = useState(false);

  // Fetch reels
  const fetchReels = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE_URL}/api/v1/reels`, { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then((json: unknown) => { setReels(toArray<Reel>(json)); setLoading(false); })
      .catch(() => { setError('Impossible de charger les reels'); setLoading(false); });
  }, []);

  useEffect(() => { fetchReels(); }, [fetchReels]);

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

  // Loading screen
  if (loading && reels.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: '#000' }}>
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
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: '#000' }}>
        <div className="text-center px-6">
          <Play size={48} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <p className="text-white font-semibold">{error ? 'Impossible de charger les reels' : 'Aucun reel disponible'}</p>
          <p className="text-sm mt-1 mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {error ? 'Vérifiez votre connexion et réessayez.' : 'Revenez bientôt !'}
          </p>
          {error && (
            <button
              onClick={fetchReels}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)', boxShadow: '0 4px 16px rgba(123,63,242,0.4)' }}>
              Réessayer
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full overflow-y-scroll snap-y snap-mandatory"
      style={{ scrollbarWidth: 'none', background: '#000' }}>

      {reels.map((reel, i) => (
        <div
          key={reel.id}
          data-reel-item
          data-index={i}
          className="w-full h-full snap-start snap-always shrink-0">
          <ReelPlayer
            reel={reel}
            active={i === activeIndex}
            globalMuted={globalMuted}
            onUnmute={() => setGlobalMuted(v => !v)}
          />
        </div>
      ))}
    </div>
  );
}
