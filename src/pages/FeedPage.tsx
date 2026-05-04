import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Music, MapPin, Clock, Users, Play, Calendar,
  Flame, ChevronRight, UserPlus, UserCheck, Sparkles, Radio,
  Heart, MessageCircle, Share2, Bookmark, Film, RefreshCw,
  X, Send, Check,
} from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import type { Concert, Event, Post, Reel } from '../types';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ── Types ─────────────────────────────────────────────────────────────────────
type FeedItem =
  | { kind: 'concert';     id: string; data: Concert }
  | { kind: 'event';       id: string; data: Event }
  | { kind: 'post';        id: string; data: Post }
  | { kind: 'reel';        id: string; data: Reel }
  | { kind: 'suggestions'; id: string; data: null };

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
function AuthorRow({
  author, authorId, publishedAt, isFollowed, onAuthorClick, onFollowClick,
}: {
  author: { display_name?: string | null; username?: string | null; avatar_url?: string | null; is_verified?: boolean } | undefined;
  authorId: string | undefined;
  publishedAt?: string | null;
  isFollowed: boolean;
  onAuthorClick: (e: React.MouseEvent) => void;
  onFollowClick: (e: React.MouseEvent) => void;
}) {
  if (!author && !authorId) return null;
  const name = author?.display_name ?? author?.username ?? 'Auteur';
  return (
    <div className="flex items-center gap-2 px-3 pt-3 pb-1">
      <button onClick={onAuthorClick} className="flex items-center gap-2 min-w-0 flex-1">
        <Avatar src={author?.avatar_url} name={name} size="xs" verified={author?.is_verified} />
        <div className="min-w-0">
          <span className="text-xs font-semibold truncate block" style={{ color: 'var(--text-primary)' }}>{name}</span>
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
  const [commentCount] = useState(initialCommentCount);
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
      <div className="flex items-center gap-1 px-2 py-2" style={{ borderTop: '1px solid var(--border)' }}>
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
function ReelCard({ reel, delay = 0, followedIds, onFollow, onOpenComments }: {
  reel: Reel; delay?: number;
  followedIds: Set<string>; onFollow: (id: string, e: React.MouseEvent) => void;
  onOpenComments: OpenCommentsFn;
}) {
  const navigate   = useNavigate();
  const authorId   = reel.author?.id;
  const isFollowed = authorId ? followedIds.has(authorId) : false;

  return (
    <div className="rounded-2xl overflow-hidden animate-reveal-up flex flex-col"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', animationDelay: `${delay}s` }}>

      <AuthorRow
        author={reel.author}
        authorId={authorId}
        publishedAt={reel.created_at}
        isFollowed={isFollowed}
        onAuthorClick={e => { e.stopPropagation(); if (authorId) navigate(`/user/${authorId}`); }}
        onFollowClick={e => authorId && onFollow(authorId, e)}
      />

      {/* Thumbnail 9/16 → displayed as 16/9 banner with overlay */}
      <div onClick={() => navigate(`/reels?id=${reel.id}`)}
        className="relative overflow-hidden cursor-pointer group"
        style={{ aspectRatio: '16/9', background: '#000' }}>
        {reel.thumbnail_url ? (
          <img src={reel.thumbnail_url} alt={reel.caption ?? 'Reel'}
            className="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#0f0f1a,#1a0533,#2d1052)' }}>
            <Play size={40} className="text-white opacity-40" />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <Play size={24} fill="white" className="text-white ml-1" />
          </div>
        </div>
        {/* Reel badge */}
        <div className="absolute top-2.5 left-2.5">
          <span className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full text-white"
            style={{ background: 'linear-gradient(135deg,#E0389A,#7B3FF2)', backdropFilter: 'blur(4px)' }}>
            <Film size={10} /> Reel
          </span>
        </div>
        {/* View count */}
        {reel.view_count > 0 && (
          <div className="absolute bottom-2.5 right-2.5">
            <span className="flex items-center gap-1 text-[10px] text-white font-semibold px-2 py-1 rounded-full"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
              <Play size={9} fill="white" /> {fmtCount(reel.view_count)}
            </span>
          </div>
        )}
      </div>

      {reel.caption && (
        <div className="px-3 pt-2.5 pb-1 cursor-pointer" onClick={() => navigate(`/reels?id=${reel.id}`)}>
          <p className="text-sm line-clamp-2" style={{ color: 'var(--text-primary)' }}>{reel.caption}</p>
        </div>
      )}

      <ActionBar
        id={reel.id} kind="reel"
        initialLiked={reel.user_reaction === 'like'}
        initialLikeCount={reel.like_count ?? 0}
        initialCommentCount={reel.comment_count ?? 0}
        shareCount={reel.share_count ?? 0}
        titleForShare={reel.caption ?? 'Reel'}
        onOpenComments={onOpenComments}
      />
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
        const [feedRes, reelsRes, postsRes] = await Promise.all([
          apiClient.get<any>(`${Endpoints.search.feed}?page=1&limit=40`).catch(() => null),
          apiClient.get<any>(`${Endpoints.reels.feed}?page=1&limit=20`).catch(() => null),
          apiClient.get<any>(`${Endpoints.posts.feed}?page=1&limit=20`).catch(() => null),
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
      <div className="max-w-5xl mx-auto flex gap-6 items-start">

        {/* ── Feed column ── */}
        <div className="flex-1 min-w-0 max-w-xl mx-auto xl:mx-0 space-y-5">

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
                  return <ReelCard key={`reel-${item.id}`} reel={item.data} delay={Math.min(i, 8) * 0.04} followedIds={followedIds} onFollow={toggleFollow} onOpenComments={openComments} />;
                }
                return null;
              })}
            </div>
          )}
        </div>

        {/* ── Sidebar (xl+) ── */}
        <div className="w-64 shrink-0 hidden xl:block">
          <SuggestionsPanel />
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
