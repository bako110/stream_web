import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Heart, MessageCircle, Share2,
  Volume2, VolumeX, Play, X, Send, Bookmark, ArrowLeft, ChevronRight, ChevronLeft,
  Gift,
} from 'lucide-react';
import type { Reel, Comment } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { API_BASE_URL } from '../utils/constants';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { useAuthStore } from '../store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// ── Gift picker modal ─────────────────────────────────────────────────────────
interface GiftType { id: string; name: string; emoji: string; coins_cost: number; }

function GiftPickerModal({ reelId, receiverId, receiverName, onClose }: {
  reelId: string; receiverId: string; receiverName: string; onClose: () => void;
}) {
  const [gifts,    setGifts]    = useState<GiftType[]>([]);
  const [selected, setSelected] = useState<GiftType | null>(null);
  const [balance,  setBalance]  = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [flyEmoji, setFlyEmoji] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get<GiftType[]>(Endpoints.wallet.gifts),
      apiClient.get<{ coins_balance: number }>(Endpoints.wallet.balance),
    ]).then(([g, w]) => {
      setGifts(Array.isArray(g.data) ? g.data : []);
      setBalance((w.data as any)?.coins_balance ?? 0);
    }).finally(() => setLoading(false));
  }, []);

  async function handleSend() {
    if (!selected || sending) return;
    setSending(true);
    try {
      await apiClient.post(Endpoints.wallet.sendGift, {
        gift_type_id: selected.id,
        receiver_id:  receiverId,
        reel_id:      reelId,
      });
      setBalance(b => b - selected.coins_cost);
      setFlyEmoji(selected.emoji);
      setSent(true);
      setTimeout(onClose, 1800);
    } catch (e: any) {
      alert(e?.message ?? 'Impossible d\'envoyer le cadeau');
    } finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-t-3xl pb-8 relative overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

        {/* handle */}
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1" style={{ background: 'var(--border)' }} />

        {/* header */}
        <div className="flex items-center justify-between px-5 py-3">
          <div>
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Envoyer un cadeau
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Pour <span className="font-semibold" style={{ color: '#FFD700' }}>{receiverName}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(255,215,0,0.12)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.3)' }}>
              <span>🪙</span> {balance.toLocaleString()} coins
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* gift grid */}
        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : gifts.length === 0 ? (
          <p className="text-center py-10 text-sm" style={{ color: 'var(--text-tertiary)' }}>Aucun cadeau disponible</p>
        ) : (
          <div className="px-4 pb-4 overflow-x-auto">
            <div className="flex gap-3 pb-1" style={{ minWidth: 'max-content' }}>
              {gifts.map(g => {
                const isSelected = selected?.id === g.id;
                return (
                  <button key={g.id} onClick={() => setSelected(g)}
                    className="flex flex-col items-center gap-1 p-3 rounded-2xl transition-all shrink-0"
                    style={{
                      width: 88,
                      background: isSelected ? 'rgba(123,63,242,0.18)' : 'var(--bg-secondary)',
                      border: isSelected ? '2px solid #7B3FF2' : '2px solid transparent',
                      boxShadow: isSelected ? '0 0 16px rgba(123,63,242,0.35)' : 'none',
                    }}>
                    <span style={{ fontSize: 32 }}>{g.emoji}</span>
                    <span className="text-xs font-semibold text-center leading-tight" style={{ color: 'var(--text-primary)' }}>{g.name}</span>
                    <span className="text-xs font-bold" style={{ color: '#FFD700' }}>{g.coins_cost} 🪙</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* send button */}
        <div className="px-5 pt-2">
          <button
            onClick={handleSend}
            disabled={!selected || sending || sent || balance < (selected?.coins_cost ?? 0)}
            className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2"
            style={{
              background: (!selected || sending || sent || balance < (selected?.coins_cost ?? 0))
                ? 'var(--bg-secondary)'
                : 'linear-gradient(135deg,#FFD700,#FF8C00)',
              color: (!selected || sending || sent || balance < (selected?.coins_cost ?? 0))
                ? 'var(--text-tertiary)'
                : '#fff',
              boxShadow: (selected && !sending && !sent && balance >= (selected?.coins_cost ?? 0))
                ? '0 4px 18px rgba(255,215,0,0.4)'
                : 'none',
            }}>
            {sending ? <Spinner size="sm" /> : sent ? (
              <><span>{flyEmoji}</span> Cadeau envoyé !</>
            ) : selected ? (
              <><Gift size={15} /> Envoyer {selected.emoji} · {selected.coins_cost} coins</>
            ) : (
              <><Gift size={15} /> Choisir un cadeau</>
            )}
          </button>
          {selected && balance < selected.coins_cost && (
            <p className="text-xs text-center mt-2" style={{ color: '#E53E3E' }}>
              Solde insuffisant — rechargez votre wallet
            </p>
          )}
        </div>

        {/* flying emoji animation */}
        {flyEmoji && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10"
            style={{ animation: 'gift-fly 1.2s ease-out both' }}>
            <span style={{ fontSize: 72 }}>{flyEmoji}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Comments sidebar ──────────────────────────────────────────────────────────
function CommentsSidebar({ reelId, count }: { reelId: string; count: number }) {
  const { user } = useAuthStore();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [localLikes, setLocalLikes] = useState<Record<string, number>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    apiClient.get<Comment[]>(`${Endpoints.social.comments}?reel_id=${reelId}&limit=50`)
      .then(r => { setComments(Array.isArray(r.data) ? r.data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [reelId]);

  useEffect(() => { load(); }, [load]);

  function toggleLike(c: Comment) {
    const isLiked = likedIds.has(c.id);
    setLikedIds(prev => { const n = new Set(prev); isLiked ? n.delete(c.id) : n.add(c.id); return n; });
    setLocalLikes(prev => ({ ...prev, [c.id]: (prev[c.id] ?? c.like_count) + (isLiked ? -1 : 1) }));
    apiClient.post(Endpoints.social.toggleReaction, { comment_id: c.id, reaction_type: 'like' }).catch(() => {
      setLikedIds(prev => { const n = new Set(prev); isLiked ? n.add(c.id) : n.delete(c.id); return n; });
      setLocalLikes(prev => ({ ...prev, [c.id]: (prev[c.id] ?? c.like_count) + (isLiked ? 1 : -1) }));
    });
  }

  function handleReply(c: Comment) {
    const name = c.author?.display_name ?? c.author?.username ?? 'Utilisateur';
    setReplyTo({ id: c.id, name });
    setText(`@${name} `);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    try {
      await apiClient.post(Endpoints.social.comments, {
        reel_id: reelId,
        body: text.trim(),
        ...(replyTo ? { parent_id: replyTo.id } : {}),
      });
      setText('');
      setReplyTo(null);
      load();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    } finally { setSending(false); }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <MessageCircle size={16} style={{ color: 'var(--primary)' }} />
          <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            Commentaires{count > 0 ? ` · ${count}` : ''}
          </h3>
        </div>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5" style={{ scrollbarWidth: 'thin' }}>
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--bg-secondary)' }}>
              <MessageCircle size={22} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Aucun commentaire</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Soyez le premier à commenter</p>
          </div>
        ) : comments.map(c => {
          const name = c.author?.display_name ?? c.author?.username ?? 'Utilisateur';
          const isLiked = likedIds.has(c.id);
          return (
            <div key={c.id} className="flex gap-3 group">
              <Avatar src={c.author?.avatar_url} name={name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-bold mr-2" style={{ color: 'var(--primary)' }}>{name}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      {formatDistanceToNow(new Date(c.created_at), { locale: fr, addSuffix: true })}
                    </span>
                  </div>
                  <button onClick={() => toggleLike(c)}
                    className="shrink-0 flex items-center gap-1 transition-colors"
                    style={{ color: isLiked ? '#E0389A' : 'var(--text-tertiary)' }}>
                    <Heart size={12} fill={isLiked ? 'currentColor' : 'none'} />
                    <span className="text-[10px] font-medium">{(localLikes[c.id] ?? c.like_count) || ''}</span>
                  </button>
                </div>
                <p className="text-sm mt-0.5 leading-relaxed" style={{ color: 'var(--text-primary)' }}>{c.body}</p>
                <button onClick={() => handleReply(c)}
                  className="text-[11px] font-semibold mt-1 transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                  Répondre
                </button>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div className="flex items-center justify-between px-4 py-2 shrink-0"
          style={{ background: 'rgba(123,63,242,0.06)', borderTop: '1px solid var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--primary)' }}>
            Répondre à <span className="font-bold">@{replyTo.name}</span>
          </p>
          <button onClick={() => { setReplyTo(null); setText(''); }} className="p-1" style={{ color: 'var(--text-tertiary)' }}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2.5 px-4 py-3 shrink-0"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
        <Avatar src={user?.avatar_url} name={user?.display_name ?? user?.username ?? ''} size="sm" />
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <input
            ref={inputRef}
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
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all"
          style={{
            background:  text.trim() ? 'linear-gradient(135deg,#7B3FF2,#E0389A)' : 'var(--bg-secondary)',
            color:       text.trim() ? '#fff' : 'var(--text-tertiary)',
            boxShadow:   text.trim() ? '0 4px 12px rgba(123,63,242,0.4)' : 'none',
          }}>
          {sending ? <Spinner size="sm" /> : <Send size={13} />}
        </button>
      </div>
    </div>
  );
}

// ── Double-tap heart burst ────────────────────────────────────────────────────
function HeartBurst({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <Heart size={88} fill="#E0389A" stroke="none"
        style={{ filter: 'drop-shadow(0 0 24px #E0389Acc)', animation: 'scale-in 0.15s cubic-bezier(.16,1,.3,1) both' }} />
    </div>
  );
}

// ── Single reel player ────────────────────────────────────────────────────────
function ReelPlayer({ reel, active, globalMuted, onUnmute }: {
  reel: Reel; active: boolean; globalMuted: boolean; onUnmute: () => void;
}) {
  const { user: me } = useAuthStore();
  const videoRef     = useRef<HTMLVideoElement>(null);
  const tapTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing,         setPlaying]        = useState(false);
  const [progress,        setProgress]       = useState(0);
  const [liked,           setLiked]          = useState(reel.user_reaction === 'like');
  const [likeCount,       setLikeCount]      = useState(reel.like_count ?? 0);
  const [showHeart,       setShowHeart]      = useState(false);
  const [saved,           setSaved]          = useState(false);
  const [followed,        setFollowed]       = useState(false);
  const [followLoading,   setFollowLoading]  = useState(false);
  const [captionExpanded, setCaptionExpanded]= useState(false);
  const [showGiftPicker,  setShowGiftPicker] = useState(false);

  const authorId   = reel.author?.id;
  const authorName = reel.author?.display_name ?? reel.author?.username ?? 'Artiste';
  const caption    = reel.caption ?? '';
  const isMine     = me?.id === authorId;

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = globalMuted;
  }, [globalMuted]);

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
    if (navigator.share) navigator.share({ title: caption || 'Reel FoliX', url }).catch(() => {});
    else navigator.clipboard.writeText(url).catch(() => {});
  }

  function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">

      {/* Video */}
      <div className="absolute inset-0 flex items-center justify-center bg-black" onClick={handleTap}>
        {reel.video_url ? (
          <video ref={videoRef} src={reel.video_url}
            className="w-full h-full object-contain"
            loop playsInline poster={reel.thumbnail_url ?? undefined}
            onTimeUpdate={() => {
              const v = videoRef.current;
              if (v?.duration) setProgress((v.currentTime / v.duration) * 100);
            }}
            onPlay={() => apiClient.post(Endpoints.reels.view(reel.id)).catch(() => {})}
          />
        ) : (
          <img src={reel.thumbnail_url ?? ''} className="w-full h-full object-contain" alt={caption} />
        )}
      </div>

      <HeartBurst show={showHeart} />

      {/* Paused overlay */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="rounded-full p-5"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', border: '2px solid rgba(255,255,255,0.2)' }}>
            <Play size={36} fill="white" stroke="none" />
          </div>
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 40%, rgba(0,0,0,0.25) 100%)' }} />

      {/* Progress bar */}
      <div className="absolute top-0 inset-x-0 h-[3px] z-20" style={{ background: 'rgba(255,255,255,0.12)' }}>
        <div className="h-full transition-[width] duration-200"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#7B3FF2,#E0389A)' }} />
      </div>

      {/* Mute button */}
      <div className="absolute top-4 right-4 z-20">
        <button onClick={e => { e.stopPropagation(); onUnmute(); }}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
          {globalMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>

      {/* Bottom: author + caption + actions */}
      <div className="absolute bottom-0 inset-x-0 z-10 flex items-end gap-3 px-4 pb-8">

        {/* Left: author + caption */}
        <div className="flex-1 min-w-0 space-y-3">
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
                <p className="text-white/55 text-xs">@{reel.author.username}</p>
              )}
            </div>
            {!isMine && (
              <button onClick={handleFollow} disabled={followLoading}
                className="shrink-0 text-xs font-bold px-4 py-1.5 rounded-full transition-all"
                style={followed
                  ? { background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(255,255,255,0.3)' }
                  : { background: 'linear-gradient(135deg,#7B3FF2,#E0389A)', color: '#fff', boxShadow: '0 2px 12px rgba(123,63,242,0.5)' }
                }>
                {followLoading ? '…' : followed ? 'Suivi' : '+ Suivre'}
              </button>
            )}
          </div>

          {caption && (
            <div>
              <p className={`text-white text-sm leading-relaxed ${captionExpanded ? '' : 'line-clamp-2'}`}
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{caption}</p>
              {caption.length > 90 && (
                <button onClick={e => { e.stopPropagation(); setCaptionExpanded(v => !v); }}
                  className="text-white/50 text-xs mt-0.5 font-medium">
                  {captionExpanded ? 'Réduire' : 'Voir plus'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div className="shrink-0 flex flex-col items-center gap-5 pb-1">
          {/* Vinyl */}
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
            {likeCount > 0 && <span className="text-[11px] font-semibold text-white">{fmt(likeCount)}</span>}
          </button>

          {/* Comment — visible seulement sur mobile, caché sur desktop (sidebar toujours visible) */}
          <button className="flex flex-col items-center gap-1 md:hidden">
            <div className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(255,255,255,0.2)', color: '#fff' }}>
              <MessageCircle size={20} />
            </div>
            {(reel.comment_count ?? 0) > 0 && <span className="text-[11px] font-semibold text-white">{fmt(reel.comment_count ?? 0)}</span>}
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
            {(reel.share_count ?? 0) > 0 && <span className="text-[11px] font-semibold text-white">{fmt(reel.share_count ?? 0)}</span>}
          </button>

          {/* Gift */}
          {!isMine && (
            <button onClick={e => { e.stopPropagation(); setShowGiftPicker(true); }} className="flex flex-col items-center gap-1">
              <div className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: 'rgba(255,215,0,0.18)',
                  backdropFilter: 'blur(12px)',
                  border: '1.5px solid rgba(255,215,0,0.5)',
                  color: '#FFD700',
                  boxShadow: '0 0 12px rgba(255,215,0,0.3)',
                }}>
                <Gift size={20} />
              </div>
              <span className="text-[11px] font-semibold" style={{ color: '#FFD700' }}>Cadeau</span>
            </button>
          )}
        </div>
      </div>

      {/* Gift modal */}
      {showGiftPicker && authorId && (
        <GiftPickerModal
          reelId={reel.id}
          receiverId={String(authorId)}
          receiverName={authorName}
          onClose={() => setShowGiftPicker(false)}
        />
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function toArray<T>(raw: unknown): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.items))   return obj.items   as T[];
  if (Array.isArray(obj.results)) return obj.results as T[];
  if (Array.isArray(obj.data))    return obj.data    as T[];
  return [];
}

// ── Page shell ────────────────────────────────────────────────────────────────
export default function ReelsPage() {
  const [searchParams]                  = useSearchParams();
  const navigate                        = useNavigate();
  const targetId                        = searchParams.get('id');
  const [reels,         setReels]       = useState<Reel[]>([]);
  const [loading,       setLoading]     = useState(true);
  const [loadingMore,   setLoadingMore] = useState(false);
  const [hasMore,       setHasMore]     = useState(true);
  const [error,         setError]       = useState<string | null>(null);
  const [activeIndex,   setActiveIndex] = useState(0);
  const [globalMuted,   setGlobalMuted] = useState(true);
  const [sidebarOpen,   setSidebarOpen] = useState(true);
  const containerRef                    = useRef<HTMLDivElement>(null);
  const pageRef                         = useRef(1);
  const loadingMoreRef                  = useRef(false);
  const hasMoreRef                      = useRef(true);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);

  const getHeaders = () => {
    const h: Record<string, string> = { Accept: 'application/json' };
    try { const t = localStorage.getItem('folix_access_token'); if (t) h.Authorization = `Bearer ${t}`; } catch {}
    return h;
  };

  const fetchReels = useCallback(() => {
    setLoading(true);
    setError(null);
    pageRef.current = 1;
    loadingMoreRef.current = false;
    const headers = getHeaders();

    fetch(`${API_BASE_URL}/api/v1/reels?limit=15&page=1`, { headers })
      .then(r => r.json())
      .then((json: unknown) => {
        let list = toArray<Reel>(json);
        const more = (json as any)?.has_more ?? list.length >= 15;
        setHasMore(more);
        hasMoreRef.current = more;
        if (targetId) {
          const idx = list.findIndex(r => r.id === targetId);
          if (idx > 0) {
            const [target] = list.splice(idx, 1);
            list = [target, ...list];
          } else if (idx === -1) {
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
  }, [targetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    const headers = getHeaders();

    fetch(`${API_BASE_URL}/api/v1/reels?limit=15&page=${nextPage}`, { headers })
      .then(r => r.json())
      .then((json: unknown) => {
        const newItems = toArray<Reel>(json);
        const more = (json as any)?.has_more ?? newItems.length >= 15;
        setHasMore(more);
        hasMoreRef.current = more;
        setReels(prev => {
          const ids = new Set(prev.map(r => r.id));
          return [...prev, ...newItems.filter(r => !ids.has(r.id))];
        });
        pageRef.current = nextPage;
      })
      .catch(() => {})
      .finally(() => { setLoadingMore(false); loadingMoreRef.current = false; });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchReels(); }, [fetchReels]);

  useEffect(() => {
    if (reels.length > 0 && containerRef.current) {
      containerRef.current.scrollTop = 0;
      setActiveIndex(0);
    }
  }, [reels.length === 0]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (reels.length === 0) return;
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          const idx = Number((e.target as HTMLElement).dataset.index);
          setActiveIndex(idx);
          // Charger plus quand on approche des 3 derniers reels
          if (idx >= reels.length - 3) loadMore();
        }
      }),
      { threshold: 0.6 },
    );
    document.querySelectorAll('[data-reel-item]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [reels, loadMore]);

  const activeReel = reels[activeIndex] ?? null;

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading && reels.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center" style={{ zIndex: 0 }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-2xl rotate-12"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)', animation: 'spin-slow 3s linear infinite' }} />
            <div className="absolute inset-1 rounded-xl flex items-center justify-center bg-black">
              <span className="text-base font-black gradient-text">FX</span>
            </div>
          </div>
          <div className="flex gap-1.5">
            {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-white" style={{ animation: `blink 1.2s ${i * 0.2}s infinite` }} />)}
          </div>
        </div>
      </div>
    );
  }

  // ── Error / empty ───────────────────────────────────────────────────────────
  if (!loading && (error || reels.length === 0)) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center" style={{ zIndex: 0 }}>
        <button onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-30 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
          <ArrowLeft size={18} />
        </button>
        <div className="text-center px-6">
          <Play size={48} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <p className="text-white font-semibold">{error ?? 'Aucun reel disponible'}</p>
          {error && (
            <button onClick={fetchReels} className="mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
              Réessayer
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Main layout ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black flex overflow-hidden" style={{ zIndex: 0 }}>

      {/* Back button */}
      <button onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-40 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
        <ArrowLeft size={18} />
      </button>

      {/* ── LEFT: reel player ── */}
      <div
        className="relative flex-shrink-0 h-full transition-all duration-300"
        style={{ width: sidebarOpen ? 'calc(100% - 380px)' : '100%' }}>
        <div ref={containerRef}
          className="w-full h-full overflow-y-scroll snap-y snap-mandatory"
          style={{ scrollbarWidth: 'none' }}>
          {reels.map((reel, i) => (
            <div key={reel.id} data-reel-item data-index={i}
              className="w-full snap-start snap-always shrink-0"
              style={{ height: '100dvh' }}>
              <ReelPlayer reel={reel} active={i === activeIndex}
                globalMuted={globalMuted} onUnmute={() => setGlobalMuted(v => !v)} />
            </div>
          ))}
          {/* Footer loadingMore */}
          {loadingMore && (
            <div className="w-full snap-start snap-always shrink-0 flex items-center justify-center bg-black"
              style={{ height: '100dvh' }}>
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                <p className="text-white/50 text-sm font-medium">Chargement…</p>
              </div>
            </div>
          )}
        </div>

        {/* Toggle sidebar button */}
        <button
          onClick={() => setSidebarOpen(v => !v)}
          className="absolute top-1/2 -translate-y-1/2 right-0 z-30 w-6 h-14 rounded-l-xl flex items-center justify-center transition-all hidden md:flex"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
          {sidebarOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* ── RIGHT: comments sidebar ── */}
      {sidebarOpen && activeReel && (
        <div
          className="hidden md:flex flex-col flex-shrink-0 h-full"
          style={{
            width: 380,
            borderLeft: '1px solid var(--border)',
            background: 'var(--bg)',
          }}>

          {/* Reel info header */}
          <div className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0"
              style={{ border: '1.5px solid var(--border)' }}>
              {activeReel.author?.avatar_url
                ? <img src={activeReel.author.avatar_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
                    {(activeReel.author?.display_name ?? activeReel.author?.username ?? 'A')[0].toUpperCase()}
                  </div>
              }
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {activeReel.author?.display_name ?? activeReel.author?.username ?? 'Artiste'}
              </p>
              {activeReel.caption && (
                <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{activeReel.caption}</p>
              )}
            </div>
            {/* Stats */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <Heart size={12} /> {activeReel.like_count ?? 0}
              </span>
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <MessageCircle size={12} /> {activeReel.comment_count ?? 0}
              </span>
            </div>
          </div>

          {/* Comments */}
          <div className="flex-1 min-h-0">
            <CommentsSidebar reelId={activeReel.id} count={activeReel.comment_count ?? 0} />
          </div>
        </div>
      )}
    </div>
  );
}
