import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { encodeId, decodeId } from '../utils/slugId';
import {
  Heart, MessageCircle, Share2,
  Volume2, VolumeX, Play, X, Send, Bookmark, ArrowLeft,
  Gift, Zap, ExternalLink, Eye, Search, User, Film,
  Calendar, Music, MoreVertical, Edit3, Trash2, TrendingUp,
  ChevronRight, ChevronLeft,
} from 'lucide-react';
import Hls from 'hls.js';
import type { Reel, Comment } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { toProxiedUrl } from '../utils/constants';
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
function CommentsSidebar({ reelId, count, onClose }: { reelId: string; count: number; onClose?: () => void }) {
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
        {onClose && (
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
            <X size={16} />
          </button>
        )}
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
      <div className="flex items-center gap-2 px-3 py-2.5 shrink-0"
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
function HeartBurst({ show, x, y }: { show: boolean; x?: number; y?: number }) {
  if (!show) return null;
  const hasPos = x !== undefined && y !== undefined && x > 0 && y > 0;
  return (
    <div className="absolute pointer-events-none z-20"
      style={hasPos
        ? { left: x - 44, top: y - 44, width: 88, height: 88 }
        : { inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Heart size={88} fill="#E0389A" stroke="none"
        style={{ filter: 'drop-shadow(0 0 24px #E0389Acc)', animation: 'scale-in 0.15s cubic-bezier(.16,1,.3,1) both' }} />
    </div>
  );
}

// ── Single reel player ────────────────────────────────────────────────────────
const MAX_RETRIES   = 3;
const STALL_TIMEOUT = 8000; // 8s identique mobile

function ReelPlayer({ reel, active, globalMuted, onUnmute, onCommentOpen }: {
  reel: Reel; active: boolean; globalMuted: boolean; onUnmute: () => void; onCommentOpen: () => void;
}) {
  const navigate      = useNavigate();
  const { user: me }  = useAuthStore();
  const videoRef      = useRef<HTMLVideoElement>(null);
  const hlsRef        = useRef<Hls | null>(null);
  const tapTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount    = useRef(0);
  const startTimeRef  = useRef<number>(0);
  const viewSentRef   = useRef(false);
  const likeInFlight  = useRef(false);

  const authorId   = reel.author?.id;
  const authorName = reel.author?.display_name ?? reel.author?.username ?? 'Artiste';
  const isMine     = me?.id === authorId;

  const [playing,         setPlaying]        = useState(false);
  const [buffering,       setBuffering]       = useState(false);
  const [videoError,      setVideoError]      = useState(false);
  const [isPortrait,      setIsPortrait]      = useState(true); // 9:16 par défaut (reels)
  const [progress,        setProgress]       = useState(0);
  const [liked,           setLiked]          = useState(reel.user_reaction === 'like');
  const [likeCount,       setLikeCount]      = useState(reel.like_count ?? 0);
  const [commentCount,    setCommentCount]   = useState(reel.comment_count ?? 0);
  const [shareCount,      setShareCount]     = useState(reel.share_count ?? 0);
  const [viewCount,       setViewCount]      = useState(reel.view_count ?? 0);
  const [showHeart,       setShowHeart]      = useState(false);
  const [heartPos,        setHeartPos]       = useState({ x: 0, y: 0 });
  const [skipAnim,        setSkipAnim]       = useState<{ side: 'left'|'right'; label: string } | null>(null);
  const [saved,           setSaved]          = useState(false);
  const [followed,        setFollowed]       = useState(() => {
    // Initialiser depuis le cache module-level si déjà chargé
    return authorId ? (_followCache.get(String(authorId)) ?? false) : false;
  });
  const [followLoading,   setFollowLoading]  = useState(false);
  const followFetched     = useRef(false);
  const [captionExpanded, setCaptionExpanded]= useState(false);
  const [showGiftPicker,  setShowGiftPicker] = useState(false);
  const [refInfo, setRefInfo] = useState<{ label: string; kind: string; thumbnail: string | null; color: string; url: string } | null>(null);

  // Resync si le reel change
  useEffect(() => {
    setLiked(reel.user_reaction === 'like');
    setLikeCount(reel.like_count ?? 0);
    setCommentCount(reel.comment_count ?? 0);
    setShareCount(reel.share_count ?? 0);
    setViewCount(reel.view_count ?? 0);
    viewSentRef.current = false;
    retryCount.current = 0;
    setVideoError(false);
    followFetched.current = false;
    // Réinitialiser depuis cache si disponible
    if (authorId) setFollowed(_followCache.get(String(authorId)) ?? false);
  }, [reel.id]); // eslint-disable-line

  // Badge référence concert/event/film (identique mobile)
  useEffect(() => {
    if (!active || (!reel.ref_concert_id && !reel.ref_event_id && !reel.ref_content_id)) {
      setRefInfo(null); return;
    }
    const load = async () => {
      try {
        if (reel.ref_concert_id) {
          const r = await apiClient.get<any>(Endpoints.concerts.byId(reel.ref_concert_id));
          setRefInfo({ label: r.data?.title ?? 'Concert', kind: 'Concert', thumbnail: r.data?.thumbnail_url ?? null, color: '#7B3FF2', url: `/concerts/${encodeId(reel.ref_concert_id)}` });
        } else if (reel.ref_event_id) {
          const r = await apiClient.get<any>(Endpoints.events.byId(reel.ref_event_id));
          setRefInfo({ label: r.data?.title ?? 'Événement', kind: 'Événement', thumbnail: r.data?.thumbnail_url ?? null, color: '#F59E0B', url: `/events/${encodeId(reel.ref_event_id)}` });
        } else if (reel.ref_content_id) {
          const r = await apiClient.get<any>(Endpoints.content.filmById(reel.ref_content_id));
          setRefInfo({ label: r.data?.title ?? 'Film', kind: 'Film', thumbnail: r.data?.thumbnail_url ?? null, color: '#3B82F6', url: `/films/${encodeId(reel.ref_content_id)}` });
        }
      } catch { setRefInfo(null); }
    };
    load();
  }, [active, reel.ref_concert_id, reel.ref_event_id, reel.ref_content_id]); // eslint-disable-line

  // Charger l'état de follow réel depuis l'API quand le reel devient actif (1x par auteur)
  useEffect(() => {
    if (!active || !authorId || isMine || followFetched.current) return;
    const cached = _followCache.get(String(authorId));
    if (cached !== undefined) { setFollowed(cached); followFetched.current = true; return; }
    followFetched.current = true;
    apiClient.get<any>(Endpoints.users.publicProfile(String(authorId)))
      .then(r => {
        const isFollowed = r.data?.is_followed ?? r.data?.user?.is_followed ?? false;
        _followCache.set(String(authorId), isFollowed);
        setFollowed(isFollowed);
      })
      .catch(() => {});
  }, [active, authorId, isMine]); // eslint-disable-line

  const caption    = reel.caption ?? '';

  // Suivi de vue — 10% regardé, 1x par reel, max 30s (identique mobile)
  function sendView() {
    if (viewSentRef.current) return;
    const v = videoRef.current;
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const duration = v?.duration ?? 30;
    const watchRatio = Math.min(elapsed / Math.min(duration, 30), 1.0);
    if (watchRatio >= 0.1) {
      viewSentRef.current = true;
      setViewCount(c => c + 1);
      apiClient.post(Endpoints.reels.view(reel.id)).catch(() => {});
    }
  }

  // Stall detection (8s buffering → retry)
  function armStall() {
    clearStall();
    stallTimer.current = setTimeout(() => doRetry(), STALL_TIMEOUT);
  }
  function clearStall() {
    if (stallTimer.current) { clearTimeout(stallTimer.current); stallTimer.current = null; }
  }

  // Retry avec backoff exponentiel (identique mobile)
  function doRetry() {
    const v = videoRef.current;
    if (!v || !reel.hls_url) return;
    if (retryCount.current >= MAX_RETRIES) { setVideoError(true); setBuffering(false); return; }
    const attempt = retryCount.current++;
    setTimeout(() => {
      const src = toProxiedUrl(reel.hls_url!);
      if (hlsRef.current) {
        hlsRef.current.loadSource(src);
      } else if (v.src) {
        v.load();
      }
      v.play().catch(() => {});
    }, Math.pow(2, attempt) * 1000);
  }

  // HLS setup
  const videoSrc = toProxiedUrl(reel.hls_url ?? '');

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoSrc) return;
    retryCount.current = 0;
    setVideoError(false);

    // Détecter orientation (portrait 9:16 vs landscape 16:9) dès les métadonnées
    const onMeta = () => {
      if (v.videoWidth && v.videoHeight) {
        setIsPortrait(v.videoHeight >= v.videoWidth);
      }
    };
    v.addEventListener('loadedmetadata', onMeta);

    const playWhenReady = () => {
      if (!active) return;
      v.currentTime = 0;
      v.muted = globalMuted;
      v.play().then(() => { setPlaying(true); startTimeRef.current = Date.now(); }).catch(() => setPlaying(false));
    };

    if (Hls.isSupported()) {
      const hls = new Hls({ autoStartLoad: true, maxBufferLength: 30, maxMaxBufferLength: 60 });
      hlsRef.current = hls;
      hls.loadSource(videoSrc);
      hls.attachMedia(v);
      hls.once(Hls.Events.MANIFEST_PARSED, playWhenReady);
      hls.on(Hls.Events.ERROR, (_e, data) => { if (data.fatal) doRetry(); });
    } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = videoSrc;
      v.addEventListener('loadedmetadata', playWhenReady, { once: true });
    }

    return () => {
      v.removeEventListener('loadedmetadata', onMeta);
      clearStall();
      hlsRef.current?.destroy();
      hlsRef.current = null;
      v.pause();
      v.removeAttribute('src');
      v.load();
      setPlaying(false);
      setProgress(0);
      setBuffering(false);
    };
  }, [videoSrc]); // eslint-disable-line

  // Active/inactive
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!active) {
      sendView();
      v.pause(); v.currentTime = 0;
      setPlaying(false); setProgress(0);
      clearStall();
    } else if (v.readyState >= 3) {
      v.muted = globalMuted; v.currentTime = 0;
      v.play().then(() => { setPlaying(true); startTimeRef.current = Date.now(); }).catch(() => setPlaying(false));
    }
  }, [active]); // eslint-disable-line

  // Mute sync
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = globalMuted;
  }, [globalMuted]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else          { v.pause(); setPlaying(false); }
  }

  // Skip ±10s avec animation (identique mobile)
  function doSkip(seconds: number) {
    const v = videoRef.current;
    if (v) { v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + seconds)); }
    const side = seconds < 0 ? 'left' : 'right';
    const label = seconds < 0 ? `◄◄ ${Math.abs(seconds)}s` : `${seconds}s ►►`;
    setSkipAnim({ side, label });
    setTimeout(() => setSkipAnim(null), 600);
  }

  // Zones de tap : gauche (skip -10), centre (like/pause), droite (skip +10)
  function handleZoneTap(zone: 'left'|'center'|'right', e: React.MouseEvent) {
    e.stopPropagation();
    if (tapTimer.current) {
      // Double-tap
      clearTimeout(tapTimer.current); tapTimer.current = null;
      if (zone === 'left')   doSkip(-10);
      else if (zone === 'right') doSkip(10);
      else {
        // Double-tap centre = like (identique mobile)
        if (!liked && !likeInFlight.current) {
          likeInFlight.current = true;
          setLiked(true); setLikeCount(c => c + 1);
          const rect = (e.target as HTMLElement).closest('[data-reel-zone]')?.getBoundingClientRect();
          if (rect) setHeartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          apiClient.post(Endpoints.social.toggleReaction, { reel_id: reel.id, reaction_type: 'like' })
            .catch(() => { setLiked(false); setLikeCount(c => Math.max(0, c - 1)); })
            .finally(() => { likeInFlight.current = false; });
        } else {
          const rect = (e.target as HTMLElement).closest('[data-reel-zone]')?.getBoundingClientRect();
          if (rect) setHeartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 750);
      }
    } else {
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null;
        if (zone === 'center') togglePlay();
        // gauche/droite single tap = rien
      }, 230);
    }
  }

  function handleTap() {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
      // Double-tap centre legacy (fallback)
      if (!liked && !likeInFlight.current) {
        likeInFlight.current = true;
        setLiked(true); setLikeCount(c => c + 1);
        apiClient.post(Endpoints.social.toggleReaction, { reel_id: reel.id, reaction_type: 'like' })
          .catch(() => { setLiked(false); setLikeCount(c => Math.max(0, c - 1)); })
          .finally(() => { likeInFlight.current = false; });
      }
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 750);
    } else {
      tapTimer.current = setTimeout(() => { tapTimer.current = null; togglePlay(); }, 230);
    }
  }

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    if (likeInFlight.current) return;
    likeInFlight.current = true;
    const was = liked;
    setLiked(!was); setLikeCount(c => c + (was ? -1 : 1));
    apiClient.post(Endpoints.social.toggleReaction, { reel_id: reel.id, reaction_type: 'like' })
      .catch(() => { setLiked(was); setLikeCount(c => c + (was ? 1 : -1)); })
      .finally(() => { likeInFlight.current = false; });
  }

  async function handleFollow(e: React.MouseEvent) {
    e.stopPropagation();
    if (!authorId || isMine || followLoading) return;
    setFollowLoading(true);
    const newState = !followed;
    try {
      if (followed) await apiClient.delete(Endpoints.users.follow(String(authorId)));
      else          await apiClient.post(Endpoints.users.follow(String(authorId)));
      setFollowed(newState);
      _followCache.set(String(authorId), newState); // mettre à jour le cache
    } catch { /* ignore */ } finally { setFollowLoading(false); }
  }

  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/reels?id=${encodeId(reel.id)}`;
    try {
      if (navigator.share) await navigator.share({ title: caption || 'Reel GoFolyX', url });
      else await navigator.clipboard.writeText(url);
      apiClient.post(Endpoints.social.share, { reel_id: reel.id, platform: 'web' }).catch(() => {});
      setShareCount(c => c + 1);
    } catch { /* ignore */ }
  }

  function goToProfile(e: React.MouseEvent) {
    e.stopPropagation();
    if (authorId) navigate(`/user/${encodeId(String(authorId))}`);
  }

  function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none" data-reel-zone>

      {/* Video */}
      <div className="absolute inset-0 flex items-center justify-center bg-black">
        {videoSrc ? (
          <video ref={videoRef}
            style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }}
            playsInline poster={reel.thumbnail_url ?? undefined}
            onTimeUpdate={() => {
              const v = videoRef.current;
              if (v?.duration) setProgress((v.currentTime / v.duration) * 100);
            }}
            onWaiting={() => { setBuffering(true); armStall(); }}
            onPlaying={() => { setBuffering(false); clearStall(); setPlaying(true); }}
            onEnded={() => {
              sendView();
              // Rejouer (loop manuel pour tracker les vues correctement)
              const v = videoRef.current;
              if (v) { v.currentTime = 0; v.play().catch(() => {}); viewSentRef.current = false; startTimeRef.current = Date.now(); }
            }}
            onError={() => doRetry()}
          />
        ) : (
          <img src={reel.thumbnail_url ?? ''} className="w-full h-full object-contain" alt={caption} />
        )}
      </div>

      {/* 3 zones de tap (gauche=skip-10, centre=pause/like, droite=skip+10) */}
      <div className="absolute inset-0 z-10 grid" style={{ gridTemplateColumns: '1fr 2fr 1fr' }}>
        <div className="h-full" onClick={e => handleZoneTap('left', e)} />
        <div className="h-full" onClick={e => handleZoneTap('center', e)} />
        <div className="h-full" onClick={e => handleZoneTap('right', e)} />
      </div>

      {/* Skip animations */}
      {skipAnim && (
        <div className={`absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none px-5 py-3 rounded-2xl text-white font-black text-base
          ${skipAnim.side === 'left' ? 'left-6' : 'right-6'}`}
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', animation: 'fadeInOut 0.6s ease-out forwards' }}>
          {skipAnim.label}
        </div>
      )}

      {/* Heart burst (double-tap like) */}
      <HeartBurst show={showHeart} x={heartPos.x} y={heartPos.y} />

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

      {/* Buffering spinner (identique mobile) */}
      {buffering && !videoError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-12 h-12 rounded-full border-[3px]"
            style={{ borderColor: 'rgba(255,255,255,0.15)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      {/* Erreur vidéo */}
      {videoError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none z-20">
          <Play size={40} className="text-white/30" />
          <p className="text-white/50 text-sm">Vidéo indisponible</p>
        </div>
      )}


      {/* Bottom: author + caption + actions
          pb adaptatif : env(safe-area-inset-bottom) gère le notch/home bar iOS/Android */}
      <div className="absolute bottom-0 inset-x-0 z-10 flex items-end gap-2 px-3 sm:px-4"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))' }}>

        {/* Left: author + caption */}
        <div className="flex-1 min-w-0 space-y-2 pb-1">

          {/* Badge référence (concert/event/film) — identique mobile */}
          {refInfo && (
            <button onClick={e => { e.stopPropagation(); navigate(refInfo.url); }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl mb-2 transition-all"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: `1px solid ${refInfo.color}40`, maxWidth: '80%' }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: refInfo.color }} />
              {refInfo.thumbnail
                ? <img src={refInfo.thumbnail} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                : <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: refInfo.color + '30' }}>
                    {refInfo.kind === 'Concert' ? <Music size={12} style={{ color: refInfo.color }} />
                      : refInfo.kind === 'Événement' ? <Calendar size={12} style={{ color: refInfo.color }} />
                      : <Film size={12} style={{ color: refInfo.color }} />}
                  </div>
              }
              <div className="min-w-0">
                <p className="text-[9px] font-bold" style={{ color: refInfo.color }}>{refInfo.kind}</p>
                <p className="text-white text-[10px] font-semibold truncate leading-tight">{refInfo.label}</p>
              </div>
              <ChevronRight size={12} className="text-white/40 shrink-0" />
            </button>
          )}

          {/* Author row */}
          <div className="flex items-center gap-2">
            {/* Avatar cliquable → profil (identique mobile) */}
            <button onClick={goToProfile} className="relative shrink-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden"
                style={{ border: '2px solid rgba(255,255,255,0.5)' }}>
                {reel.author?.avatar_url
                  ? <img src={reel.author.avatar_url} alt={authorName} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs"
                      style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
                      {authorName[0]?.toUpperCase()}
                    </div>
                }
              </div>
              {reel.author?.is_verified && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
                  <span className="text-white text-[8px] font-black">✓</span>
                </div>
              )}
            </button>
            {/* Nom cliquable → profil */}
            <button onClick={goToProfile} className="min-w-0 flex-1 text-left">
              <p className="text-white font-bold text-xs sm:text-sm leading-tight truncate"
                style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>{authorName}</p>
              {reel.author?.username && (
                <p className="text-white/55 text-[10px] sm:text-xs leading-none">@{reel.author.username}</p>
              )}
            </button>
            {!isMine && (
              <button onClick={handleFollow} disabled={followLoading}
                className="shrink-0 text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full transition-all"
                style={followed
                  ? { background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(255,255,255,0.3)' }
                  : { background: 'linear-gradient(135deg,#7B3FF2,#E0389A)', color: '#fff', boxShadow: '0 2px 12px rgba(123,63,242,0.5)' }
                }>
                {followLoading ? '…' : followed ? 'Suivi' : '+ Suivre'}
              </button>
            )}
          </div>

          {/* Caption */}
          {caption && (
            <div>
              <p className={`text-white text-xs sm:text-sm leading-snug ${captionExpanded ? '' : 'line-clamp-2'}`}
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{caption}</p>
              {caption.length > 80 && (
                <button onClick={e => { e.stopPropagation(); setCaptionExpanded(v => !v); }}
                  className="text-white/50 text-[10px] mt-0.5 font-medium">
                  {captionExpanded ? 'Réduire' : 'Voir plus'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: actions — boutons plus petits sur mobile */}
        <div className="shrink-0 flex flex-col items-center gap-3 sm:gap-4 pb-1">

          {/* Volume — identique mobile : en haut de la colonne */}
          <button onClick={e => { e.stopPropagation(); onUnmute(); }} className="flex flex-col items-center gap-0.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(255,255,255,0.2)', color: '#fff' }}>
              {globalMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </div>
          </button>

          {/* Vinyl tournant */}
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden"
            style={{
              border: '2px solid rgba(255,255,255,0.4)',
              animation: playing ? 'spin-slow 5s linear infinite' : 'none',
              boxShadow: playing ? '0 0 14px rgba(123,63,242,0.7)' : 'none',
            }}>
            {reel.author?.avatar_url
              ? <img src={reel.author.avatar_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }} />
            }
          </div>

          {/* Like */}
          <button onClick={handleLike} className="flex flex-col items-center gap-0.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all"
              style={{
                background: liked ? 'rgba(224,56,154,0.25)' : 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(12px)',
                border: `1.5px solid ${liked ? '#E0389A' : 'rgba(255,255,255,0.2)'}`,
                color: liked ? '#E0389A' : '#fff',
                boxShadow: liked ? '0 0 14px rgba(224,56,154,0.5)' : 'none',
              }}>
              <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
            </div>
            {likeCount > 0 && <span className="text-[10px] font-semibold text-white">{fmt(likeCount)}</span>}
          </button>

          {/* Commentaires */}
          <button onClick={e => { e.stopPropagation(); onCommentOpen(); }} className="flex flex-col items-center gap-0.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(255,255,255,0.2)', color: '#fff' }}>
              <MessageCircle size={17} />
            </div>
            {commentCount > 0 && <span className="text-[10px] font-semibold text-white">{fmt(commentCount)}</span>}
          </button>

          {/* Partage */}
          <button onClick={handleShare} className="flex flex-col items-center gap-0.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(255,255,255,0.2)', color: '#fff' }}>
              <Share2 size={17} />
            </div>
            {shareCount > 0 && <span className="text-[10px] font-semibold text-white">{fmt(shareCount)}</span>}
          </button>

          {/* Vues (identique mobile) */}
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(255,255,255,0.2)', color: '#fff' }}>
              <Eye size={17} />
            </div>
            {viewCount > 0 && <span className="text-[10px] font-semibold text-white">{fmt(viewCount)}</span>}
          </div>

          {/* Sauvegarder */}
          <button onClick={e => { e.stopPropagation(); setSaved(v => !v); }} className="flex flex-col items-center gap-0.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all"
              style={{
                background: saved ? 'rgba(255,122,47,0.25)' : 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(12px)',
                border: `1.5px solid ${saved ? '#FF7A2F' : 'rgba(255,255,255,0.2)'}`,
                color: saved ? '#FF7A2F' : '#fff',
              }}>
              <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
            </div>
          </button>

          {/* Cadeau */}
          {!isMine && (
            <button onClick={e => { e.stopPropagation(); setShowGiftPicker(true); }} className="flex flex-col items-center gap-0.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: 'rgba(255,215,0,0.18)', backdropFilter: 'blur(12px)',
                  border: '1.5px solid rgba(255,215,0,0.5)', color: '#FFD700',
                  boxShadow: '0 0 10px rgba(255,215,0,0.3)',
                }}>
                <Gift size={17} />
              </div>
              <span className="text-[10px] font-semibold" style={{ color: '#FFD700' }}>Cadeau</span>
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
// ── Reel Ad Slide ──────────────────────────────────────────────────────────────
interface ReelAd {
  id: string; title: string; description?: string | null;
  cta_text?: string | null; cta_url?: string | null;
  creative_url?: string | null; thumbnail_url?: string | null;
}

function ReelAdSlide({ ad, active, globalMuted }: { ad: ReelAd; active: boolean; globalMuted: boolean }) {
  const impressionSent = useRef(false);
  const videoRef       = useRef<HTMLVideoElement>(null);
  const hlsRef         = useRef<Hls | null>(null);

  // Détection vidéo (identique mobile : .m3u8, /hls/, video, .mp4)
  const isVideo = !!(ad.creative_url && (
    ad.creative_url.includes('.m3u8') ||
    ad.creative_url.includes('/hls/') ||
    ad.creative_url.toLowerCase().includes('video') ||
    ad.creative_url.toLowerCase().includes('.mp4')
  ));

  // Impression tracking (1x quand active)
  useEffect(() => {
    if (active && !impressionSent.current) {
      impressionSent.current = true;
      apiClient.post(Endpoints.ads.impression(ad.id)).catch(() => {});
    }
  }, [active, ad.id]);

  // Setup HLS pour vidéo (identique mobile : loop=true, muted sync)
  useEffect(() => {
    if (!isVideo || !ad.creative_url) return;
    const v = videoRef.current;
    if (!v) return;
    const src = toProxiedUrl(ad.creative_url);

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(v);
      hls.once(Hls.Events.MANIFEST_PARSED, () => {
        v.muted = globalMuted; v.loop = true;
        if (active) v.play().catch(() => {});
      });
    } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = src; v.loop = true; v.muted = globalMuted;
      if (active) v.play().catch(() => {});
    } else {
      // MP4 direct
      v.src = src; v.loop = true; v.muted = globalMuted;
      if (active) v.play().catch(() => {});
    }

    return () => {
      hlsRef.current?.destroy(); hlsRef.current = null;
      v.pause(); v.removeAttribute('src'); v.load();
    };
  }, [ad.creative_url, isVideo]); // eslint-disable-line

  // Play/Pause selon active (identique mobile)
  useEffect(() => {
    if (!isVideo) return;
    const v = videoRef.current;
    if (!v) return;
    if (active) v.play().catch(() => {});
    else v.pause();
  }, [active, isVideo]);

  // Mute sync (identique mobile)
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = globalMuted;
  }, [globalMuted]);

  function handleClick() {
    apiClient.post(Endpoints.ads.click(ad.id)).catch(() => {});
    if (ad.cta_url) window.open(ad.cta_url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="relative w-full overflow-hidden"
      style={{ height: '100dvh', background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>

      {/* Fond : VIDEO (HLS/MP4) identique mobile */}
      {isVideo && ad.creative_url ? (
        <video ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline muted={globalMuted} loop
          poster={ad.thumbnail_url ?? undefined} />
      ) : (ad.creative_url || ad.thumbnail_url) ? (
        /* IMAGE fallback */
        <img src={ad.creative_url ?? ad.thumbnail_url!} alt={ad.title}
          className="absolute inset-0 w-full h-full object-cover" />
      ) : null /* Gradient seul */}

      {/* Gradient sombre bas (identique mobile : transparent → noir 0.55 → noir 0.92) */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 35%, transparent 70%)'
      }} />

      {/* Badge sponsorisé */}
      <div className="absolute top-12 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[11px] font-bold"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
        <Zap size={10} style={{ color: '#F59E0B' }} /> Sponsorisé
      </div>

      {/* Contenu bas */}
      <div className="absolute bottom-12 left-4 right-20 z-20">
        <p className="text-white font-black text-lg leading-tight mb-1 line-clamp-2">{ad.title}</p>
        {ad.description && (
          <p className="text-white/70 text-sm mb-4 line-clamp-2">{ad.description}</p>
        )}
        {ad.cta_url && (
          <button onClick={handleClick}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm"
            style={{ background: 'white', color: '#7B3FF2' }}>
            <ExternalLink size={13} />
            {ad.cta_text ?? 'En savoir plus'}
          </button>
        )}
      </div>
    </div>
  );
}

function toArray<T>(raw: unknown): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.items))   return obj.items   as T[];
  if (Array.isArray(obj.results)) return obj.results as T[];
  if (Array.isArray(obj.data))    return obj.data    as T[];
  return [];
}

// ── Module-level state ──
let _reelPosition: { idx: number; reelId: string } | null = null;
// Cache des états de follow par userId — évite les appels API répétés
const _followCache = new Map<string, boolean>();

// ── Page shell ────────────────────────────────────────────────────────────────
export default function ReelsPage() {
  const [searchParams]                  = useSearchParams();
  const navigate                        = useNavigate();
  const targetId                        = searchParams.get('id') ? (() => { try { return decodeId(searchParams.get('id')!); } catch { return searchParams.get('id'); } })() : null;

  const { user: me }                    = useAuthStore();

  const [reels,         setReels]       = useState<Reel[]>([]);
  const [myReels,       setMyReels]     = useState<Reel[]>([]);
  const [reelAd,        setReelAd]      = useState<ReelAd | null>(null);
  const [tab,           setTab]         = useState<'feed'|'mine'>('feed');
  const [loading,       setLoading]     = useState(true);
  const [loadingMore,   setLoadingMore] = useState(false);
  const [hasMore,       setHasMore]     = useState(true);
  const [error,         setError]       = useState<string | null>(null);
  const [activeIndex,   setActiveIndex] = useState(0);
  const [globalMuted,   setGlobalMuted] = useState(true);
  const [sidebarOpen,   setSidebarOpen] = useState(true);
  const [drawerOpen,    setDrawerOpen]  = useState(false);
  // Recherche
  const [searchOpen,    setSearchOpen]  = useState(false);
  const [searchQuery,   setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Reel[]>([]);
  const [searching,     setSearching]   = useState(false);
  const searchInputRef                  = useRef<HTMLInputElement>(null);
  const searchTimer                     = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Menu 3 points (mes reels)
  const [menuReel,      setMenuReel]    = useState<Reel | null>(null);
  const [editReel,      setEditReel]    = useState<Reel | null>(null);
  const [editCaption,   setEditCaption] = useState('');
  const [editSaving,    setEditSaving]  = useState(false);

  const containerRef                    = useRef<HTMLDivElement>(null);
  const pageRef                         = useRef(1);
  const loadingMoreRef                  = useRef(false);
  const hasMoreRef                      = useRef(true);
  const savedIndexRef                   = useRef(0);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);

  const fetchReels = useCallback(() => {
    setLoading(true);
    setError(null);
    pageRef.current = 1;
    loadingMoreRef.current = false;

    apiClient.get<any>(`${Endpoints.reels.feed}?limit=15&page=1`)
      .then(res => {
        let list = toArray<Reel>(res.data);
        const more = (res.data as any)?.has_more ?? list.length >= 15;
        setHasMore(more);
        hasMoreRef.current = more;
        if (targetId) {
          const idx = list.findIndex(r => r.id === targetId);
          if (idx > 0) {
            const [target] = list.splice(idx, 1);
            list = [target, ...list];
          } else if (idx === -1) {
            apiClient.get<any>(`${Endpoints.reels.byId(targetId)}`)
              .then(r => {
                const single = r.data;
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

    apiClient.get<any>(`${Endpoints.reels.feed}?limit=15&page=${nextPage}`)
      .then(res => {
        const newItems = toArray<Reel>(res.data);
        const more = (res.data as any)?.has_more ?? newItems.length >= 15;
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

  useEffect(() => {
    fetchReels();
    apiClient.get<ReelAd>(Endpoints.ads.feedNext('reels'))
      .then(r => { if (r.data?.id) setReelAd(r.data); })
      .catch(() => {});
    // Charger mes reels en parallèle
    if (me?.id) {
      apiClient.get<any>(Endpoints.reels.byUser(String(me.id)))
        .then(r => setMyReels(toArray<Reel>(r.data)))
        .catch(() => {});
    }
  }, [fetchReels, me?.id]); // eslint-disable-line

  // ── Recherche ──
  const openSearch = useCallback(() => {
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }, []);
  const runSearch = useCallback((q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    apiClient.get<any>(`${Endpoints.reels.feed}?search=${encodeURIComponent(q.trim())}&limit=20`)
      .then(r => setSearchResults(toArray<Reel>(r.data)))
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, []);
  const onSearchChange = useCallback((v: string) => {
    setSearchQuery(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => runSearch(v), 400);
  }, [runSearch]);
  const pickSearchResult = useCallback((r: Reel) => {
    closeSearch();
    // Injecter en tête si pas déjà présent
    setReels(prev => {
      if (prev.find(x => x.id === r.id)) return prev;
      return [r, ...prev];
    });
    setActiveIndex(0);
    setTimeout(() => { if (containerRef.current) containerRef.current.scrollTop = 0; }, 80);
  }, [closeSearch]);

  // ── Menu 3 points ──
  const handleOpenEdit = useCallback((r: Reel) => {
    setMenuReel(null);
    setEditReel(r);
    setEditCaption(r.caption ?? '');
  }, []);
  const handleSaveEdit = useCallback(async () => {
    if (!editReel) return;
    setEditSaving(true);
    try {
      await apiClient.patch(Endpoints.reels.byId(editReel.id), { caption: editCaption.trim() });
      setMyReels(prev => prev.map(r => r.id === editReel.id ? { ...r, caption: editCaption.trim() } : r));
      setEditReel(null);
    } catch { /* silencieux */ }
    setEditSaving(false);
  }, [editReel, editCaption]);
  const handleDeleteReel = useCallback(async (r: Reel) => {
    setMenuReel(null);
    if (!confirm(`Supprimer ce reel ?`)) return;
    try {
      await apiClient.delete(Endpoints.reels.delete(r.id));
      setMyReels(prev => prev.filter(x => x.id !== r.id));
      setReels(prev => prev.filter(x => x.id !== r.id));
    } catch { /* silencieux */ }
  }, []);

  // Restaurer position uniquement lors d'une navigation interne (pas au F5)
  // _reelPosition est null après F5 (module rechargé) → index 0
  useEffect(() => {
    if (reels.length === 0) return;
    if (targetId) return;

    const pos = _reelPosition; // null si F5, valide si navigation
    if (!pos) return;

    const foundIdx = reels.findIndex(r => r.id === pos!.reelId);
    const restoreIdx = foundIdx >= 0 ? foundIdx : Math.min(pos.idx, reels.length - 1);
    if (restoreIdx <= 0) return;

    // Scroll 80ms après rendu (identique mobile)
    requestAnimationFrame(() => {
      setTimeout(() => {
        const container = containerRef.current;
        if (!container) return;
        container.scrollTop = restoreIdx * container.clientHeight;
        setActiveIndex(restoreIdx);
        savedIndexRef.current = restoreIdx;
      }, 80);
    });
  }, [reels.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (reels.length === 0) return;
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          const idx = Number((e.target as HTMLElement).dataset.index);
          setActiveIndex(idx);
          savedIndexRef.current = idx;
          // Sauvegarder position (module-level + sessionStorage pour F5)
          const reelId = reels[idx]?.id ?? '';
          _reelPosition = { idx, reelId };
          // Charger plus quand on approche des 3 derniers (identique mobile)
          if (idx >= reels.length - 3) loadMore();
        }
      }),
      { threshold: 0.6 },
    );
    document.querySelectorAll('[data-reel-item]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [reels, loadMore]);

  // Injection pub toutes les 5 reels (identique mobile)
  const feedWithAds = useMemo(() => {
    const AD_INTERVAL = 5;
    if (!reelAd) return reels.map(r => ({ _isAd: false as const, reel: r }));
    const result: ({ _isAd: false; reel: Reel } | { _isAd: true; ad: ReelAd; id: string })[] = [];
    reels.forEach((r, i) => {
      result.push({ _isAd: false, reel: r });
      if ((i + 1) % AD_INTERVAL === 0) {
        result.push({ _isAd: true, ad: reelAd, id: `ad-${reelAd.id}-${i}` });
      }
    });
    return result;
  }, [reels, reelAd]);

  const activeReel = reels[activeIndex] ?? null;

  // Fermer le drawer mobile quand on change de reel — doit être avant tout return conditionnel
  useEffect(() => { setDrawerOpen(false); }, [activeIndex]);

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

  // ── Vue Mes Reels ─────────────────────────────────────────────────────────────
  if (tab === 'mine') {
    return (
      <div className="fixed inset-0 flex flex-col bg-black" style={{ zIndex: 0 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
          <button onClick={() => setTab('feed')} className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.2)' }}>
            <ArrowLeft size={18} className="text-white" />
          </button>
          <h1 className="text-white font-black text-base">Mes Reels</h1>
          <button onClick={() => navigate('/create/reel')} className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.2)' }}>
            <span className="text-white font-black text-xl leading-none">+</span>
          </button>
        </div>

        {myReels.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
            <Film size={48} style={{ color: 'rgba(255,255,255,0.3)' }} />
            <p className="text-white font-bold text-lg">Aucun reel</p>
            <button onClick={() => navigate('/create/reel')}
              className="px-6 py-3 rounded-xl text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
              Créer mon premier reel
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-0.5 p-0.5">
              {myReels.map(r => (
                <div key={r.id} className="relative" style={{ aspectRatio: '9/16' }}>
                  {r.thumbnail_url
                    ? <img src={r.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                        <Film size={28} className="text-white/20" />
                      </div>
                  }
                  {/* Overlay stats */}
                  <div className="absolute inset-0 flex flex-col justify-end p-2"
                    style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 50%)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white text-[10px]">
                        <span className="flex items-center gap-0.5"><Play size={9} fill="white" />{r.view_count ?? 0}</span>
                        <span className="flex items-center gap-0.5"><Heart size={9} fill="white" />{r.like_count ?? 0}</span>
                      </div>
                      <button onClick={() => setMenuReel(r)}
                        className="w-6 h-6 flex items-center justify-center rounded-full"
                        style={{ background: 'rgba(0,0,0,0.5)' }}>
                        <MoreVertical size={12} className="text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal menu 3 points */}
        {menuReel && (
          <div className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setMenuReel(null)}>
            <div className="w-full max-w-lg rounded-t-2xl overflow-hidden mb-0"
              style={{ background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
              <button onClick={() => handleOpenEdit(menuReel)}
                className="w-full flex items-center gap-3 px-6 py-4 text-left transition-all"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <Edit3 size={18} style={{ color: 'var(--text-primary)' }} />
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Modifier la description</span>
              </button>
              <div style={{ height: 1, background: 'var(--border)' }} />
              <button onClick={() => handleDeleteReel(menuReel)}
                className="w-full flex items-center gap-3 px-6 py-4 text-left transition-all"
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(224,56,154,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <Trash2 size={18} style={{ color: '#E0389A' }} />
                <span className="font-semibold" style={{ color: '#E0389A' }}>Supprimer le reel</span>
              </button>
              <button onClick={() => setMenuReel(null)}
                className="w-full py-4 font-bold text-sm" style={{ color: 'var(--text-tertiary)' }}>
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Modal édition caption */}
        {editReel && (
          <div className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setEditReel(null)}>
            <div className="w-full max-w-lg rounded-t-2xl p-5 space-y-4"
              style={{ background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
              <h2 className="font-black text-base" style={{ color: 'var(--text-primary)' }}>Modifier la description</h2>
              <textarea value={editCaption} onChange={e => setEditCaption(e.target.value)} maxLength={300} rows={4}
                placeholder="Description…"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <p className="text-xs text-right" style={{ color: 'var(--text-tertiary)' }}>{editCaption.length}/300</p>
              <div className="flex gap-3">
                <button onClick={() => setEditReel(null)} className="flex-1 py-3 rounded-xl font-bold text-sm"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Annuler</button>
                <button onClick={handleSaveEdit} disabled={editSaving}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
                  {editSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Main layout ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black overflow-hidden flex" style={{ zIndex: 0 }}>

      {/* ── Zone player : 100% mobile, réduite sur desktop si sidebar ouverte ── */}
      <div className="relative h-full flex-1 min-w-0">

        {/* Header flottant (identique mobile) */}
        <div className="absolute top-3 inset-x-0 z-40 flex items-center justify-between px-3 pointer-events-none">
          <button onClick={() => navigate(-1)} className="pointer-events-auto w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
            <ArrowLeft size={18} />
          </button>
          <p className="text-white font-black text-base" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>Reels</p>
          <div className="flex items-center gap-2 pointer-events-auto">
            <button onClick={openSearch} className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
              <Search size={16} />
            </button>
            <button onClick={() => setTab('mine')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold"
              style={{ background: 'rgba(123,63,242,0.3)', border: '1px solid rgba(123,63,242,0.6)', backdropFilter: 'blur(8px)' }}>
              <User size={12} /> Mes reels
            </button>
          </div>
        </div>

        {/* Scroll vertical snap */}
        <div ref={containerRef}
          className="w-full h-full overflow-y-scroll snap-y snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {feedWithAds.map((item, i) => (
            <div key={item._isAd ? item.id : item.reel.id} data-reel-item data-index={i}
              className="w-full snap-start snap-always shrink-0"
              style={{ height: '100dvh' }}>
              {item._isAd ? (
                <ReelAdSlide ad={item.ad} active={i === activeIndex} globalMuted={globalMuted} />
              ) : (
                <ReelPlayer
                  reel={item.reel}
                  active={i === activeIndex}
                  globalMuted={globalMuted}
                  onUnmute={() => setGlobalMuted(v => !v)}
                  onCommentOpen={() => setDrawerOpen(true)}
                />
              )}
            </div>
          ))}
          {loadingMore && (
            <div className="w-full snap-start snap-always shrink-0 flex items-center justify-center bg-black"
              style={{ height: '100dvh' }}>
              <div className="flex flex-col items-center gap-3">
                <div className="w-9 h-9 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                <p className="text-white/50 text-xs font-medium">Chargement…</p>
              </div>
            </div>
          )}
        </div>

        {/* Toggle sidebar — desktop seulement */}
        <button
          onClick={() => setSidebarOpen(v => !v)}
          className="absolute top-1/2 -translate-y-1/2 right-0 z-30 w-6 h-14 rounded-l-xl items-center justify-center transition-all hidden md:flex"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
          {sidebarOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* ── Sidebar commentaires — desktop uniquement ── */}
      {sidebarOpen && activeReel && (
        <div className="hidden md:flex flex-col shrink-0 h-full"
          style={{ width: 380, borderLeft: '1px solid var(--border)', background: 'var(--bg)' }}>
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
            <div className="flex items-center gap-3 shrink-0">
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <Heart size={12} /> {activeReel.like_count ?? 0}
              </span>
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <MessageCircle size={12} /> {activeReel.comment_count ?? 0}
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <CommentsSidebar reelId={activeReel.id} count={activeReel.comment_count ?? 0} />
          </div>
        </div>
      )}

      {/* ── Drawer commentaires — mobile uniquement ── */}
      {activeReel && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 transition-opacity duration-300"
            style={{
              background: 'rgba(0,0,0,0.6)',
              pointerEvents: drawerOpen ? 'auto' : 'none',
              opacity: drawerOpen ? 1 : 0,
            }}
            onClick={() => setDrawerOpen(false)}
          />

          {/* Panel drawer */}
          <div
            className="md:hidden fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl overflow-hidden"
            style={{
              height: '72dvh',
              background: 'var(--bg)',
              borderTop: '1px solid var(--border)',
              transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
              transform: drawerOpen ? 'translateY(0)' : 'translateY(100%)',
            }}>

            {/* Handle */}
            <div className="flex justify-center pt-2.5 pb-1 shrink-0">
              <div className="w-8 h-1 rounded-full" style={{ background: 'var(--border)' }} />
            </div>

            {/* Mini info auteur */}
            <div className="flex items-center gap-2 px-4 pb-2 shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="w-6 h-6 rounded-full overflow-hidden shrink-0"
                style={{ border: '1.5px solid var(--border)' }}>
                {activeReel.author?.avatar_url
                  ? <img src={activeReel.author.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-white text-[9px] font-bold"
                      style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
                      {(activeReel.author?.display_name ?? activeReel.author?.username ?? 'A')[0].toUpperCase()}
                    </div>
                }
              </div>
              <p className="text-xs font-bold truncate flex-1" style={{ color: 'var(--text-primary)' }}>
                {activeReel.author?.display_name ?? activeReel.author?.username ?? 'Artiste'}
              </p>
              <span className="flex items-center gap-1 text-[10px] shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                <Heart size={10} /> {activeReel.like_count ?? 0}
              </span>
            </div>

            <div className="flex-1 min-h-0">
              <CommentsSidebar
                reelId={activeReel.id}
                count={activeReel.comment_count ?? 0}
                onClose={() => setDrawerOpen(false)}
              />
            </div>
          </div>
        </>
      )}

      {/* ── Overlay recherche (identique mobile) ── */}
      {searchOpen && (
        <div className="absolute inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(12px)' }}>
          {/* Barre de recherche */}
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 shrink-0">
            <button onClick={closeSearch} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <Search size={14} className="text-white/40 shrink-0" />
              <input ref={searchInputRef} value={searchQuery} onChange={e => onSearchChange(e.target.value)}
                placeholder="Rechercher des reels, auteurs…"
                className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/35"
                onKeyDown={e => e.key === 'Enter' && runSearch(searchQuery)} />
              {searchQuery && (
                <button onClick={() => onSearchChange('')}><X size={14} className="text-white/50" /></button>
              )}
            </div>
          </div>

          {/* Résultats */}
          <div className="flex-1 overflow-y-auto">
            {searching ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                <p className="text-white/60 text-sm">Recherche…</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-2 gap-0.5 p-0.5">
                {searchResults.map(r => (
                  <button key={r.id} onClick={() => pickSearchResult(r)}
                    className="relative" style={{ aspectRatio: '9/16' }}>
                    {r.thumbnail_url
                      ? <img src={r.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                          <Film size={28} className="text-white/20" />
                        </div>
                    }
                    <div className="absolute inset-0 flex flex-col justify-end p-2"
                      style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.8) 0%,transparent 50%)' }}>
                      {r.author?.avatar_url && (
                        <img src={r.author.avatar_url} alt="" className="w-6 h-6 rounded-full mb-1 border border-white/30" />
                      )}
                      <p className="text-white text-[10px] font-bold truncate">
                        {r.author?.display_name ?? r.author?.username ?? ''}
                      </p>
                      {r.caption && <p className="text-white/60 text-[9px] truncate">{r.caption}</p>}
                      <div className="flex items-center gap-2 mt-1 text-white/70 text-[9px]">
                        <span className="flex items-center gap-0.5"><Eye size={8} />{r.view_count ?? 0}</span>
                        <span className="flex items-center gap-0.5"><Heart size={8} />{r.like_count ?? 0}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                <Search size={40} className="text-white/20" />
                <p className="text-white font-bold">Aucun résultat</p>
                <p className="text-white/50 text-sm">Essaie un autre mot-clé</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                <TrendingUp size={40} className="text-white/20" />
                <p className="text-white font-bold">Découvre des reels</p>
                <p className="text-white/50 text-sm">Tape un mot-clé ou un nom d'auteur</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
