import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { commitReelSession } from '../hooks/useReelWatchStats';
import { GuestPreview } from '../components/ui/GuestPreview';
import { renderTextWithLinks } from '../components/ui/RichText';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useConfirm } from '../components/ui/Dialog';
import { encodeId, decodeId } from '../utils/slugId';
import {
  Heart, MessageCircle, Share2,
  Volume2, VolumeX, Play, X, Send, Bookmark, ArrowLeft,
  Gift, Zap, ExternalLink, Eye, Search, User, Film,
  Calendar, Music, MoreVertical, Edit3, Trash2, TrendingUp,
  ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Repeat2, GitMerge, Link2, Flag,
  MessageSquareOff, MessageSquare, BarChart2,
} from 'lucide-react';
import Hls from 'hls.js';
import { FilterOverlay, ReelTextLayers, ReelStickerLayers, ReelDrawLayers, ReelVideoAdjust } from '../utils/reelFilters.tsx';
import type { Reel, Comment } from '../types';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { toProxiedUrl } from '../utils/constants';
import { Avatar, VerifiedBadge } from '../components/ui/Avatar';
import { Spinner, PageLoader } from '../components/ui/Spinner';
import { HeartRain, LikeNamesFeed } from '../components/ui/HeartRain';
import { HoverVideoPreview } from '../components/ui/HoverVideoPreview';
import { useAuthStore } from '../store/authStore';
import { useWs } from '../context/WebSocketContext';
import { AiAnalysisStatusModal } from '../components/ui/AiAnalysisStatusModal';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getApiErrorDetail } from '../utils/apiError';

// ── Gift picker modal ─────────────────────────────────────────────────────────
interface GiftType { id: string; name: string; emoji: string; gogold_cost: number; }

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
      apiClient.get<{ gogold_balance: number }>(Endpoints.wallet.balance),
    ]).then(([g, w]) => {
      setGifts(Array.isArray(g.data) ? g.data : []);
      setBalance((w.data as any)?.gogold_balance ?? 0);
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
      setBalance(b => b - selected.gogold_cost);
      setFlyEmoji(selected.emoji);
      setSent(true);
      setTimeout(onClose, 1800);
    } catch (e: any) {
      toast.error(e?.message ?? 'Impossible d\'envoyer le cadeau');
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
              <span>🪙</span> {balance.toLocaleString()} GoGold
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* gift grid */}
        {loading ? (
          <PageLoader />
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
                    <span className="text-xs font-bold" style={{ color: '#FFD700' }}>{g.gogold_cost} 🪙</span>
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
            disabled={!selected || sending || sent || balance < (selected?.gogold_cost ?? 0)}
            className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2"
            style={{
              background: (!selected || sending || sent || balance < (selected?.gogold_cost ?? 0))
                ? 'var(--bg-secondary)'
                : 'linear-gradient(135deg,#FFD700,#FF8C00)',
              color: (!selected || sending || sent || balance < (selected?.gogold_cost ?? 0))
                ? 'var(--text-tertiary)'
                : '#fff',
              boxShadow: (selected && !sending && !sent && balance >= (selected?.gogold_cost ?? 0))
                ? '0 4px 18px rgba(255,215,0,0.4)'
                : 'none',
            }}>
            {sending ? <Spinner size="sm" /> : sent ? (
              <><span>{flyEmoji}</span> Cadeau envoyé !</>
            ) : selected ? (
              <><Gift size={15} /> Envoyer {selected.emoji} · {selected.gogold_cost} GoGold</>
            ) : (
              <><Gift size={15} /> Choisir un cadeau</>
            )}
          </button>
          {selected && balance < selected.gogold_cost && (
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
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string; authorId?: string } | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [localLikes, setLocalLikes] = useState<Record<string, number>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading]   = useState(true);

  // Fils de réponses — chargés à la demande (dépliage) par commentaire racine,
  // pas systématiquement : list_comments ne retourne que les commentaires sans
  // parent, GET /comments/{id}/replies est le seul moyen de récupérer le reste.
  const [openReplies,    setOpenReplies]    = useState<Set<string>>(new Set());
  const [replies,        setReplies]        = useState<Record<string, Comment[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Set<string>>(new Set());

  function toggleReplies(commentId: string) {
    setOpenReplies(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) { next.delete(commentId); return next; }
      next.add(commentId);
      if (!replies[commentId]) {
        setLoadingReplies(l => new Set(l).add(commentId));
        apiClient.get<Comment[]>(Endpoints.social.commentReplies(commentId))
          .then(r => setReplies(prev2 => ({ ...prev2, [commentId]: Array.isArray(r.data) ? r.data : [] })))
          .catch(() => setReplies(prev2 => ({ ...prev2, [commentId]: [] })))
          .finally(() => setLoadingReplies(l => { const n = new Set(l); n.delete(commentId); return n; }));
      }
      return next;
    });
  }

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

  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [editBody,   setEditBody]   = useState('');
  const [editSaving, setEditSaving] = useState(false);

  async function deleteComment(id: string, parentId?: string) {
    try {
      await apiClient.delete(`${Endpoints.social.comments}/${id}`);
      if (parentId) {
        setReplies(prev => ({ ...prev, [parentId]: (prev[parentId] ?? []).filter(c => c.id !== id) }));
        setComments(prev => prev.map(c => c.id === parentId ? { ...c, reply_count: Math.max(0, (c.reply_count ?? 1) - 1) } : c));
      } else {
        setComments(prev => prev.filter(c => c.id !== id));
      }
    } catch {}
  }

  async function saveEdit(id: string, parentId?: string) {
    if (!editBody.trim() || editSaving) return;
    setEditSaving(true);
    try {
      await apiClient.put(`${Endpoints.social.comments}/${id}`, { body: editBody.trim() });
      if (parentId) {
        setReplies(prev => ({ ...prev, [parentId]: (prev[parentId] ?? []).map(c => c.id === id ? { ...c, body: editBody.trim() } : c) }));
      } else {
        setComments(prev => prev.map(c => c.id === id ? { ...c, body: editBody.trim() } : c));
      }
      setEditingId(null);
    } catch {}
    finally { setEditSaving(false); }
  }

  function handleReply(c: Comment) {
    const name = c.author?.display_name ?? c.author?.username ?? 'Utilisateur';
    setReplyTo({ id: c.id, name, authorId: c.author?.id });
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    const parentId = replyTo?.id ?? null;
    try {
      await apiClient.post(Endpoints.social.comments, {
        reel_id: reelId,
        body: text.trim(),
        ...(parentId ? { parent_id: parentId } : {}),
      });
      setText('');
      setReplyTo(null);
      if (parentId) {
        // Réponse : le commentaire racine n'est pas ré-affiché par load() (qui ne
        // retourne que les commentaires sans parent) — on rafraîchit juste son
        // fil de réponses, en s'assurant qu'il reste déplié pour montrer le résultat.
        apiClient.get<Comment[]>(Endpoints.social.commentReplies(parentId))
          .then(r => setReplies(prev => ({ ...prev, [parentId]: Array.isArray(r.data) ? r.data : [] })))
          .catch(() => {});
        setOpenReplies(prev => new Set(prev).add(parentId));
        setComments(prev => prev.map(c => c.id === parentId ? { ...c, reply_count: (c.reply_count ?? 0) + 1 } : c));
      } else {
        load();
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
      }
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
          <PageLoader />
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
                  <div className="flex items-center gap-1 shrink-0">
                    {user?.id === c.author?.id && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                        <button onClick={() => { setEditingId(c.id); setEditBody(c.body); }}
                          className="p-1 rounded-lg" style={{ color: 'var(--text-tertiary)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                          <Edit3 size={12} />
                        </button>
                        <button onClick={() => deleteComment(c.id)}
                          className="p-1 rounded-lg" style={{ color: 'var(--text-tertiary)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                    <button onClick={() => toggleLike(c)}
                      className="flex items-center gap-1 transition-colors"
                      style={{ color: isLiked ? '#7B3FF2' : 'var(--text-tertiary)' }}>
                      <Heart size={12} fill={isLiked ? 'currentColor' : 'none'} />
                      <span className="text-[10px] font-medium">{(localLikes[c.id] ?? c.like_count) || ''}</span>
                    </button>
                  </div>
                </div>
                {editingId === c.id ? (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <input autoFocus value={editBody} onChange={e => setEditBody(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(c.id); } if (e.key === 'Escape') setEditingId(null); }}
                      className="text-sm px-3 py-2 rounded-xl w-full outline-none"
                      style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--primary)', color: 'var(--text-primary)' }} />
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(c.id)} disabled={editSaving}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                        style={{ background: 'var(--primary)', color: '#fff', opacity: editSaving ? 0.6 : 1 }}>
                        {editSaving ? '…' : 'Enregistrer'}
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                        style={{ color: 'var(--text-tertiary)' }}>Annuler</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm mt-0.5 leading-relaxed whitespace-pre-line break-words" style={{ color: 'var(--text-primary)' }}>{c.body}</p>
                )}
                {editingId !== c.id && (
                  <div className="flex items-center gap-3 mt-1">
                    <button onClick={() => handleReply(c)}
                      className="text-[11px] font-semibold transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                      Répondre
                    </button>
                    {(c.reply_count ?? 0) > 0 && (
                      <button onClick={() => toggleReplies(c.id)}
                        className="flex items-center gap-1 text-[11px] font-semibold transition-colors"
                        style={{ color: 'var(--primary)' }}>
                        {openReplies.has(c.id) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {openReplies.has(c.id) ? 'Masquer' : `Voir les ${c.reply_count} réponse${c.reply_count! > 1 ? 's' : ''}`}
                      </button>
                    )}
                  </div>
                )}

                {/* Fil de réponses — indenté, chargé à la demande */}
                {openReplies.has(c.id) && (
                  <div className="mt-3 space-y-3 pl-3" style={{ borderLeft: '2px solid var(--border)' }}>
                    {loadingReplies.has(c.id) ? (
                      <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        <Spinner size="sm" /> Chargement…
                      </div>
                    ) : (replies[c.id] ?? []).map(rc => {
                      const rname = rc.author?.display_name ?? rc.author?.username ?? 'Utilisateur';
                      return (
                        <div key={rc.id} className="flex gap-2 group">
                          <Avatar src={rc.author?.avatar_url} name={rname} size="xs" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <span className="text-xs font-bold mr-2" style={{ color: 'var(--primary)' }}>{rname}</span>
                                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                                  {formatDistanceToNow(new Date(rc.created_at), { locale: fr, addSuffix: true })}
                                </span>
                              </div>
                              {user?.id === rc.author?.id && editingId !== rc.id && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 shrink-0">
                                  <button onClick={() => { setEditingId(rc.id); setEditBody(rc.body); }}
                                    className="p-1 rounded-lg" style={{ color: 'var(--text-tertiary)' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                                    <Edit3 size={11} />
                                  </button>
                                  <button onClick={() => deleteComment(rc.id, c.id)}
                                    className="p-1 rounded-lg" style={{ color: 'var(--text-tertiary)' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              )}
                            </div>
                            {editingId === rc.id ? (
                              <div className="flex flex-col gap-1.5 mt-1">
                                <input autoFocus value={editBody} onChange={e => setEditBody(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(rc.id, c.id); } if (e.key === 'Escape') setEditingId(null); }}
                                  className="text-sm px-3 py-2 rounded-xl w-full outline-none"
                                  style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--primary)', color: 'var(--text-primary)' }} />
                                <div className="flex gap-2">
                                  <button onClick={() => saveEdit(rc.id, c.id)} disabled={editSaving}
                                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                                    style={{ background: 'var(--primary)', color: '#fff', opacity: editSaving ? 0.6 : 1 }}>
                                    {editSaving ? '…' : 'Enregistrer'}
                                  </button>
                                  <button onClick={() => setEditingId(null)}
                                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                                    style={{ color: 'var(--text-tertiary)' }}>Annuler</button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm mt-0.5 leading-relaxed whitespace-pre-line break-words" style={{ color: 'var(--text-primary)' }}>{rc.body}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
            Répondre à{' '}
            {replyTo.authorId ? (
              <button onClick={() => navigate(`/user/${encodeId(replyTo.authorId!)}`)}
                className="font-bold hover:underline">
                @{replyTo.name}
              </button>
            ) : (
              <span className="font-bold">@{replyTo.name}</span>
            )}
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
            background:  text.trim() ? 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' : 'var(--bg-secondary)',
            color:       text.trim() ? '#fff' : 'var(--text-tertiary)',
            boxShadow:   text.trim() ? '0 4px 12px rgba(123,63,242,0.4)' : 'none',
          }}>
          {sending ? <Spinner size="sm" /> : <Send size={13} />}
        </button>
      </div>
    </div>
  );
}

// ── Panneau droit : onglets Commentaires / Tu pourrais aimer (style TikTok desktop) ──
function RightPanelTabs({ reelId, commentCount, suggestions, onSuggestionClick, onLoadMore, loadingMore }: {
  reelId: string; commentCount: number; suggestions: Reel[]; onSuggestionClick: (targetReelId: string) => void;
  onLoadMore?: () => void; loadingMore?: boolean;
}) {
  const [tab, setTab] = useState<'comments' | 'suggestions'>('comments');

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => setTab('comments')}
          className="flex-1 py-3 text-sm font-bold relative transition-colors"
          style={{ color: tab === 'comments' ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
          Commentaires
          {tab === 'comments' && (
            <div className="absolute bottom-0 left-1/3 right-1/3 h-0.5 rounded-full" style={{ background: 'var(--primary)' }} />
          )}
        </button>
        <button onClick={() => setTab('suggestions')}
          className="flex-1 py-3 text-sm font-bold relative transition-colors"
          style={{ color: tab === 'suggestions' ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
          Tu pourrais aimer
          {tab === 'suggestions' && (
            <div className="absolute bottom-0 left-1/3 right-1/3 h-0.5 rounded-full" style={{ background: 'var(--primary)' }} />
          )}
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {tab === 'comments' ? (
          <CommentsSidebar reelId={reelId} count={commentCount} />
        ) : (
          <div className="h-full overflow-y-auto p-3"
            onScroll={e => {
              const el = e.currentTarget;
              if (el.scrollTop + el.clientHeight >= el.scrollHeight - 300) onLoadMore?.();
            }}>
            {suggestions.length === 0 ? (
              <p className="text-sm text-center py-10" style={{ color: 'var(--text-tertiary)' }}>
                Pas d'autres suggestions pour l'instant
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {suggestions.map(r => (
                  <HoverVideoPreview key={r.id}
                    src={r.hls_url} poster={r.thumbnail_url}
                    className="relative overflow-hidden transition-transform hover:scale-[1.02]"
                    style={{ aspectRatio: '2/3.6', borderRadius: 12, background: 'var(--bg-secondary)' }}>
                    <button onClick={() => onSuggestionClick(r.id)} className="absolute inset-0 w-full h-full text-left">
                      {!r.thumbnail_url && !r.hls_url && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play size={24} style={{ color: 'var(--text-tertiary)' }} />
                        </div>
                      )}
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%)' }} />
                      <p className="absolute bottom-1.5 left-2 right-2 text-white text-xs font-semibold truncate">
                        {r.author?.display_name ?? r.author?.username ?? 'Artiste'}
                      </p>
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 text-white text-[10px] font-bold"
                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                        <Heart size={10} fill="#fff" /> {r.like_count ?? 0}
                      </div>
                    </button>
                  </HoverVideoPreview>
                ))}
              </div>
            )}
            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 rounded-full animate-spin"
                  style={{ border: '2px solid var(--border)', borderTopColor: 'var(--text-primary)' }} />
              </div>
            )}
          </div>
        )}
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
      <Heart size={88} fill="#7B3FF2" stroke="none"
        style={{ filter: 'drop-shadow(0 0 24px #7B3FF2cc)', animation: 'scale-in 0.15s cubic-bezier(.16,1,.3,1) both' }} />
    </div>
  );
}

// HeartRain / LikeNamesFeed — extraits dans components/ui/HeartRain.tsx (partagés avec StoryPage)

// ── Single reel player ────────────────────────────────────────────────────────
const MAX_RETRIES   = 3;
const STALL_TIMEOUT = 8000; // 8s identique mobile

function ReelPlayer({ reel, active, globalMuted, onUnmute, onAutoplayFallbackMuted, onCommentOpen, onMoreOpen, onRatioChange }: {
  reel: Reel; active: boolean; globalMuted: boolean; onUnmute: () => void; onCommentOpen: () => void; onMoreOpen: () => void;
  onRatioChange?: (ratio: number | null) => void;
  /** Le navigateur a bloqué l'autoplay avec son — informe le parent pour synchroniser l'icône volume. */
  onAutoplayFallbackMuted?: () => void;
}) {
  const navigate      = useNavigate();
  const { user: me }  = useAuthStore();
  const videoRef      = useRef<HTMLVideoElement>(null);
  const hlsRef        = useRef<Hls | null>(null);
  const tapTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount    = useRef(0);
  const startTimeRef     = useRef<number>(0);
  const viewSentRef      = useRef(false);
  const sessionStartRef  = useRef<number>(0);
  const likeInFlight  = useRef(false);
  const audioRef      = useRef<HTMLAudioElement | null>(null);
  const musicTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // true juste après une pause volontaire (clic) — ignore le prochain événement
  // "playing" du navigateur s'il survient malgré tout (resync HLS interne),
  // pour ne pas annuler la pause demandée par l'utilisateur.
  const userPausedRef = useRef(false);

  const hasMusic = !!(reel.music_url);

  const authorId   = reel.author?.id;
  const authorName = reel.author?.display_name ?? reel.author?.username ?? 'Artiste';
  const isMine     = me?.id === authorId;
  const { liveUserIds } = useWs();
  const authorIsLive = !!(reel.author?.is_live || (authorId && liveUserIds.has(authorId)));

  const [playing,         setPlaying]        = useState(false);
  const [buffering,       setBuffering]       = useState(false);
  const [videoError,      setVideoError]      = useState(false);
  // Ratio réel (width/height), détecté dès que la vidéo charge ses métadonnées
  // (le backend ne stocke pas les dimensions des reels). null = pas encore connu.
  const [ratio, setRatio] = useState<number | null>(null);
  const [progress,        setProgress]       = useState(0);
  const [scrubbing,       setScrubbing]      = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const wasPlayingBeforeScrub = useRef(false);
  const [liked,           setLiked]          = useState(reel.user_reaction === 'like');
  const [likeCount,       setLikeCount]      = useState(reel.like_count ?? 0);
  const [commentCount,    setCommentCount]   = useState(reel.comment_count ?? 0);
  const [shareCount,      setShareCount]     = useState(reel.share_count ?? 0);
  const [viewCount,       setViewCount]      = useState(reel.view_count ?? 0);
  const [repostCount,     setRepostCount]    = useState(reel.repost_count ?? 0);
  const [remixCount,      setRemixCount]     = useState(reel.remix_count ?? 0);
  const [cableCount,      setCableCount]     = useState(reel.cable_count ?? 0);
  const [commentsDisabled,setCommentsDisabled] = useState(reel.comments_disabled ?? false);
  const [showAiModal,     setShowAiModal]     = useState(false);
  const [showHeart,       setShowHeart]      = useState(false);
  const [heartPos,        setHeartPos]       = useState({ x: 0, y: 0 });
  const [skipAnim,        setSkipAnim]       = useState<{ side: 'left'|'right'; label: string } | null>(null);
  const [favId,           setFavId]          = useState<string | null>(null);
  const [savingFav,       setSavingFav]      = useState(false);
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
    setRepostCount(reel.repost_count ?? 0);
    setRemixCount(reel.remix_count ?? 0);
    setCableCount(reel.cable_count ?? 0);
    setCommentsDisabled(reel.comments_disabled ?? false);
    viewSentRef.current = false;
    retryCount.current = 0;
    setVideoError(false);
    // Reset à null en attendant la détection du nouveau reel — évite d'hériter
    // du ratio de l'ancien reel pendant le chargement du nouveau.
    setRatio(null);
    followFetched.current = false;
    if (authorId) setFollowed(_followCache.get(String(authorId)) ?? false);
  }, [reel.id]); // eslint-disable-line

  // Fait remonter le ratio au parent (pour dimensionner la colonne du player)
  useEffect(() => { onRatioChange?.(active ? ratio : null); }, [active, ratio]); // eslint-disable-line

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
          setRefInfo({ label: r.data?.title ?? 'Événement', kind: 'Événement', thumbnail: r.data?.thumbnail_url ?? null, color: '#7B3FF2', url: `/events/${encodeId(reel.ref_event_id)}` });
        } else if (reel.ref_content_id) {
          const r = await apiClient.get<any>(Endpoints.content.filmById(reel.ref_content_id));
          setRefInfo({ label: r.data?.title ?? 'Film', kind: 'Film', thumbnail: r.data?.thumbnail_url ?? null, color: '#7B3FF2', url: `/films/${encodeId(reel.ref_content_id)}` });
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

  // Retourne les secondes de la session courante SANS remettre à zéro
  function currentSessionSeconds(): number {
    if (!sessionStartRef.current) return 0;
    return Math.round((Date.now() - sessionStartRef.current) / 1000);
  }

  // Commit la session courante dans localStorage (record + cumul) puis remet à zéro
  function commitSession() {
    const seconds = currentSessionSeconds();
    sessionStartRef.current = 0;
    if (seconds >= 1) commitReelSession(reel.id, seconds);
  }

  // Suivi de vue — 10% regardé, 1x par reel
  function sendView() {
    if (viewSentRef.current) return;
    const v = videoRef.current;
    const elapsed = startTimeRef.current
      ? (Date.now() - startTimeRef.current) / 1000
      : 0;
    const duration = v?.duration ?? 30;
    const watchRatio = Math.min(elapsed / Math.min(duration, 30), 1.0);
    if (watchRatio >= 0.1) {
      viewSentRef.current = true;
      setViewCount(c => c + 1);
      // Lit les secondes AVANT que commitSession les remette à zéro
      const watchSeconds = currentSessionSeconds();
      apiClient.post(Endpoints.reels.view(reel.id), {
        watch_ratio: watchRatio,
        watch_seconds: watchSeconds,
      }).catch(() => {});
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

    // Détecter le ratio réel (portrait, paysage ou autre) dès les métadonnées —
    // ne recalcule que si pas déjà connu via reel.video_width/height (évite un resize visible).
    const onMeta = () => {
      if (v.videoWidth && v.videoHeight) {
        setRatio(prev => prev ?? v.videoWidth / v.videoHeight);
      }
    };
    v.addEventListener('loadedmetadata', onMeta);

    const playWhenReady = () => {
      if (!active) return;
      v.currentTime = 0;
      v.muted = globalMuted;
      userPausedRef.current = false;
      v.play().then(() => { setPlaying(true); startTimeRef.current = Date.now(); }).catch(() => {
        // Autoplay avec son bloqué par le navigateur — retombe en muet pour
        // que la video joue quand meme plutot que de rester en pause.
        if (!v.muted) {
          v.muted = true;
          onAutoplayFallbackMuted?.();
          v.play().then(() => { setPlaying(true); startTimeRef.current = Date.now(); }).catch(() => setPlaying(false));
        } else {
          setPlaying(false);
        }
      });
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
      sendView();    // lit sessionStartRef AVANT commitSession
      commitSession();
      v.pause(); v.currentTime = 0;
      setPlaying(false); setProgress(0);
      clearStall();
    } else if (v.readyState >= 3) {
      v.muted = hasMusic ? true : globalMuted;
      v.currentTime = 0;
      userPausedRef.current = false;
      v.play().then(() => {
        setPlaying(true);
        startTimeRef.current = Date.now();
        sessionStartRef.current = Date.now();
      }).catch(() => {
        // Autoplay avec son bloqué — retombe en muet pour que la video joue quand meme.
        if (!v.muted) {
          v.muted = true;
          onAutoplayFallbackMuted?.();
          v.play().then(() => {
            setPlaying(true);
            startTimeRef.current = Date.now();
            sessionStartRef.current = Date.now();
          }).catch(() => setPlaying(false));
        } else {
          setPlaying(false);
        }
      });
    }
  }, [active]); // eslint-disable-line

  // Mute sync — si musique séparée, vidéo toujours muette
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = hasMusic ? true : globalMuted;
  }, [globalMuted, hasMusic]);

  // Lecture musique séparée — démarre/arrête avec active
  useEffect(() => {
    if (!hasMusic || !reel.music_url) return;

    const stopMusic = () => {
      if (musicTimerRef.current) { clearTimeout(musicTimerRef.current); musicTimerRef.current = null; }
      const a = audioRef.current;
      if (a) { a.pause(); a.src = ''; }
    };

    if (!active) { stopMusic(); return; }

    const a = new Audio(reel.music_url);
    audioRef.current = a;
    const startSec = reel.music_start_sec ?? 0;
    const endSec   = reel.music_end_sec   ?? 0;
    const clipDur  = endSec > startSec ? endSec - startSec : 0;
    a.currentTime  = startSec;

    a.play().catch(() => {});

    if (clipDur > 0) {
      musicTimerRef.current = setTimeout(() => {
        stopMusic();
      }, clipDur * 1000);
    }

    return () => stopMusic();
  }, [active, reel.music_url, reel.music_start_sec, reel.music_end_sec, hasMusic]); // eslint-disable-line

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      userPausedRef.current = false;
      v.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      userPausedRef.current = true;
      v.pause();
      setPlaying(false);
    }
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

  // ── Scrub — glisser/cliquer sur la barre de progression pour avancer/reculer ──
  function ratioFromClientX(clientX: number): number {
    const el = progressBarRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  function seekToRatio(ratio: number) {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    v.currentTime = ratio * v.duration;
    setProgress(ratio * 100);
  }

  function handleScrubStart(e: React.PointerEvent) {
    e.stopPropagation();
    const v = videoRef.current;
    wasPlayingBeforeScrub.current = !!v && !v.paused;
    userPausedRef.current = true; // pause temporaire du scrub, pas une pause utilisateur définitive
    v?.pause();
    setScrubbing(true);
    seekToRatio(ratioFromClientX(e.clientX));
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handleScrubMove(e: React.PointerEvent) {
    if (!scrubbing) return;
    e.stopPropagation();
    seekToRatio(ratioFromClientX(e.clientX));
  }

  function handleScrubEnd(e: React.PointerEvent) {
    e.stopPropagation();
    setScrubbing(false);
    if (wasPlayingBeforeScrub.current) {
      userPausedRef.current = false;
      videoRef.current?.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      userPausedRef.current = true;
    }
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

  const saved = !!favId;

  async function handleSaveFav(e: React.MouseEvent) {
    e.stopPropagation();
    if (savingFav) return;
    setSavingFav(true);
    try {
      if (favId) {
        await apiClient.delete(Endpoints.favorites.remove(favId));
        setFavId(null);
      } else {
        const res = await apiClient.post<{ id: string }>(Endpoints.favorites.add, { target_type: 'reel', target_id: reel.id });
        setFavId((res.data as any)?.id ?? (res.data as any)?.favorite?.id ?? null);
      }
    } catch { /* ignore */ }
    finally { setSavingFav(false); }
  }

  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/reels?id=${encodeId(reel.id)}`;
    const shareTitle = caption ? `${caption} — ${authorName} sur GoFolyX` : `${authorName} sur GoFolyX`;
    try {
      // Joint le thumbnail comme fichier — WhatsApp/Messenger/etc affichent alors
      // l'image du reel directement dans la fenêtre de partage native (pas juste le lien).
      let shared = false;
      if (navigator.share && reel.thumbnail_url && navigator.canShare) {
        try {
          const res  = await fetch(reel.thumbnail_url);
          const blob = await res.blob();
          const file = new File([blob], 'reel.jpg', { type: blob.type || 'image/jpeg' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ title: shareTitle, text: url, files: [file] });
            shared = true;
          }
        } catch { /* fallback ci-dessous */ }
      }
      if (!shared) {
        if (navigator.share) await navigator.share({ title: shareTitle, url });
        else await navigator.clipboard.writeText(url);
      }
      apiClient.post(Endpoints.social.share, { reel_id: reel.id, platform: 'external' }).catch(() => {});
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
      <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden">
        {/* Fond flou — comble les bandes vides quel que soit le ratio de la
            vidéo (portrait non 9:16 compris) dans le cadre du player, comme
            le blur de fond mobile. Toujours contain : ne jamais rogner. */}
        {videoSrc && (
          <img src={reel.thumbnail_url ?? undefined} aria-hidden className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'blur(40px) brightness(0.5)', transform: 'scale(1.15)' }} />
        )}
        {videoSrc ? (
          <video ref={videoRef}
            className="relative w-full h-full object-contain"
            playsInline poster={reel.thumbnail_url ?? undefined}
            onTimeUpdate={() => {
              const v = videoRef.current;
              if (v?.duration) setProgress((v.currentTime / v.duration) * 100);
            }}
            onWaiting={() => { setBuffering(true); armStall(); }}
            onPlaying={() => {
              setBuffering(false); clearStall();
              // Le navigateur peut réémettre "playing" après un pause() manuel
              // (resync interne HLS) — ne pas annuler une pause volontaire.
              if (userPausedRef.current) {
                videoRef.current?.pause();
                return;
              }
              setPlaying(true);
              if (!sessionStartRef.current) sessionStartRef.current = Date.now();
            }}
            onEnded={() => {
              sendView();    // lit sessionStartRef AVANT commitSession
              commitSession();
              // Rejouer (loop manuel pour tracker les vues correctement)
              const v = videoRef.current;
              if (v) {
                v.currentTime = 0;
                userPausedRef.current = false;
                v.play().catch(() => {});
                viewSentRef.current = false;
                startTimeRef.current = Date.now();
                sessionStartRef.current = Date.now();
              }
            }}
            onError={() => doRetry()}
          />
        ) : (
          <img src={reel.thumbnail_url ?? ''} className="w-full h-full object-contain" alt={caption} />
        )}
        {/* Filtre couleur (zIndex 2-3) */}
        <FilterOverlay filterName={reel.filter_name} />
        {/* Text layers (zIndex 4) */}
        <ReelTextLayers json={reel.text_layers} />
        {/* Sticker layers (zIndex 5) */}
        <ReelStickerLayers json={reel.sticker_layers} />
        {/* Draw layers (zIndex 6) */}
        <ReelDrawLayers json={reel.draw_layers} />
        {/* Video adjust overlays (zIndex 7) */}
        <ReelVideoAdjust json={reel.video_adjust} />
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

      {/* Pluie de cœurs + avatars des derniers likers — contenu très aimé (≥1000 likes) */}
      <HeartRain active={active} likeCount={likeCount} contentId={reel.id} />
      <LikeNamesFeed active={active} likeCount={likeCount} contentId={reel.id} kind="reel" />

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

      {/* Progress bar — cliquable/glissable pour avancer ou reculer dans la vidéo.
          Hauteur de capture fixe (pas de transition dessus) pour ne jamais
          déborder sur la zone de tap centrale (pause/like) juste en dessous. */}
      <div
        ref={progressBarRef}
        className="absolute top-0 inset-x-0 z-20 cursor-pointer"
        style={{ height: 18 }}
        onPointerDown={handleScrubStart}
        onPointerMove={handleScrubMove}
        onPointerUp={handleScrubEnd}
        onPointerCancel={handleScrubEnd}
      >
        <div className="absolute left-0 right-0 rounded-full overflow-visible"
          style={{ top: 7, height: scrubbing ? 5 : 3, background: 'rgba(255,255,255,0.12)', transition: 'height 120ms' }}>
          <div className="h-full rounded-full"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#7B3FF2,#5B2EC4)', transition: scrubbing ? 'none' : 'width 200ms' }} />
          {scrubbing && (
            <div className="absolute top-1/2 rounded-full"
              style={{
                left: `${progress}%`, width: 13, height: 13,
                transform: 'translate(-50%, -50%)',
                background: '#fff', boxShadow: '0 0 0 4px rgba(123,63,242,0.35)',
              }} />
          )}
        </div>
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

          {/* Bande musicale — identique mobile */}
          {reel.music_name && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl mb-1"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', maxWidth: '85%' }}>
              <Music size={11} className="shrink-0" style={{ color: '#a78bfa', animation: playing ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />
              <p className="text-white text-[10px] font-medium truncate" style={{ maxWidth: 160 }}>{reel.music_name}</p>
            </div>
          )}

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

          {/* Attribution remix/repost (source_reel) */}
          {reel.source_reel && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl mb-1"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', maxWidth: '85%' }}>
              {reel.remix_type === 'remix'
                ? <GitMerge size={11} className="text-purple-400 shrink-0" />
                : <Repeat2 size={11} className="text-purple-400 shrink-0" />
              }
              {reel.source_reel.thumbnail_url && (
                <img src={reel.source_reel.thumbnail_url} alt="" className="w-6 h-6 rounded-md object-cover shrink-0" />
              )}
              <p className="text-white/70 text-[10px] truncate">
                {reel.remix_type === 'remix' ? 'Remix de' : 'Repost de'}{' '}
                <span className="font-semibold text-white/90">
                  {reel.source_reel.author?.display_name ?? reel.source_reel.author?.username ?? 'Artiste'}
                </span>
              </p>
            </div>
          )}

          {/* Author row */}
          <div className="flex items-center gap-2">
            {/* Avatar cliquable → profil (identique mobile) */}
            <button onClick={goToProfile} className="relative shrink-0">
              <Avatar src={reel.author?.avatar_url} name={authorName} size="sm"
                verified={reel.author?.is_verified} isLive={authorIsLive}
                style={{ animation: playing ? 'spin-slow 5s linear infinite' : 'none' }} />
            </button>
            {/* Nom cliquable → profil */}
            <button onClick={goToProfile} className="min-w-0 flex-1 text-left">
              <p className="text-white font-bold text-xs sm:text-sm leading-tight truncate"
                style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>{authorName}</p>
              {reel.author?.username && (
                <p className="text-white/55 text-[10px] sm:text-xs leading-none">@{reel.author.username}</p>
              )}
              {/* Badge visible uniquement par le createur, jamais par les autres
                  spectateurs (cf. ai_analysis_status : "pending" tant que
                  ai.analyze_reel n'a pas termine, cote ai_service) — le reel
                  reste normalement visible/publie pendant ce temps, ce n'est
                  qu'un indicateur discret, pas un etat bloquant. */}
              {isMine && reel.ai_analysis_status === 'pending' && (
                <span
                  onClick={e => { e.stopPropagation(); setShowAiModal(true); }}
                  className="flex items-center gap-1.5 text-white/70 text-[10px] mt-0.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-white/40 border-t-white/85 animate-spin" />
                  Vérification en cours…
                </span>
              )}
            </button>
            {!isMine && (
              <button onClick={handleFollow} disabled={followLoading}
                className="shrink-0 text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full transition-all"
                style={followed
                  ? { background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(255,255,255,0.3)' }
                  : { background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', color: '#fff', boxShadow: '0 2px 12px rgba(123,63,242,0.5)' }
                }>
                {followLoading ? '…' : followed ? 'Suivi' : '+ Suivre'}
              </button>
            )}
          </div>

          {/* Caption */}
          {caption && (
            <div>
              <p className={`text-white text-xs sm:text-sm leading-snug whitespace-pre-line ${captionExpanded ? '' : 'line-clamp-2'}`}
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                {renderTextWithLinks(caption, 'underline font-semibold', { color: '#fff' })}
              </p>
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
        <div className="shrink-0 flex flex-col items-center gap-4 sm:gap-5 pb-1">

          {/* Volume — identique mobile : en haut de la colonne */}
          <button onClick={e => { e.stopPropagation(); onUnmute(); }} className="flex flex-col items-center gap-0.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(255,255,255,0.2)', color: '#fff' }}>
              {globalMuted ? <VolumeX size={21} /> : <Volume2 size={21} />}
            </div>
          </button>

          {/* Like */}
          <button onClick={handleLike} className="flex flex-col items-center gap-0.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all"
              style={{
                background: liked ? 'rgba(123,63,242,0.25)' : 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(12px)',
                border: `1.5px solid ${liked ? '#7B3FF2' : 'rgba(255,255,255,0.2)'}`,
                color: liked ? '#7B3FF2' : '#fff',
                boxShadow: liked ? '0 0 14px rgba(123,63,242,0.5)' : 'none',
              }}>
              <Heart size={21} fill={liked ? 'currentColor' : '#fff'} />
            </div>
            {likeCount > 0 && <span className="text-[10px] font-semibold text-white">{fmt(likeCount)}</span>}
          </button>

          {/* Commentaires */}
          <button onClick={e => { e.stopPropagation(); onCommentOpen(); }} className="flex flex-col items-center gap-0.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(255,255,255,0.2)', color: '#fff' }}>
              <MessageCircle size={21} fill="#fff" />
            </div>
            {commentCount > 0 && <span className="text-[10px] font-semibold text-white">{fmt(commentCount)}</span>}
          </button>

          {/* Partage */}
          <button onClick={handleShare} className="flex flex-col items-center gap-0.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(255,255,255,0.2)', color: '#fff' }}>
              <Share2 size={21} fill="#fff" />
            </div>
            {shareCount > 0 && <span className="text-[10px] font-semibold text-white">{fmt(shareCount)}</span>}
          </button>

          {/* Vues (identique mobile) */}
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(255,255,255,0.2)', color: '#fff' }}>
              <Eye size={21} fill="#fff" />
            </div>
            {viewCount > 0 && <span className="text-[10px] font-semibold text-white">{fmt(viewCount)}</span>}
          </div>

          {/* Sauvegarder */}
          <button onClick={handleSaveFav} disabled={savingFav} className="flex flex-col items-center gap-0.5" style={{ opacity: savingFav ? 0.6 : 1 }}>
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all"
              style={{
                background: saved ? 'rgba(123,63,242,0.25)' : 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(12px)',
                border: `1.5px solid ${saved ? '#7B3FF2' : 'rgba(255,255,255,0.2)'}`,
                color: saved ? '#7B3FF2' : '#fff',
              }}>
              <Bookmark size={21} fill={saved ? 'currentColor' : '#fff'} />
            </div>
          </button>

          {/* Plus d'options "..." */}
          <button onClick={e => { e.stopPropagation(); onMoreOpen(); }} className="flex flex-col items-center gap-0.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(255,255,255,0.2)', color: '#fff' }}>
              <MoreVertical size={21} />
            </div>
          </button>

          {/* Cadeau */}
          {!isMine && (
            <button onClick={e => { e.stopPropagation(); setShowGiftPicker(true); }} className="flex flex-col items-center gap-0.5">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: 'rgba(255,215,0,0.18)', backdropFilter: 'blur(12px)',
                  border: '1.5px solid rgba(255,215,0,0.5)', color: '#FFD700',
                  boxShadow: '0 0 10px rgba(255,215,0,0.3)',
                }}>
                <Gift size={21} />
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

      <AiAnalysisStatusModal
        open={showAiModal}
        onClose={() => setShowAiModal(false)}
        contentType="reel"
        contentId={reel.id}
        initialStatus={reel.ai_analysis_status}
      />
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
    <div className="relative w-full h-full overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>

      {/* Fond flou — comble les bandes vides sans jamais rogner le visuel, comme les reels. */}
      {(ad.creative_url || ad.thumbnail_url) && (
        <img src={ad.thumbnail_url ?? ad.creative_url!} aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'blur(40px) brightness(0.5)', transform: 'scale(1.15)' }} />
      )}

      {/* Visuel : VIDEO (HLS/MP4) identique mobile */}
      {isVideo && ad.creative_url ? (
        <video ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain"
          playsInline muted={globalMuted} loop
          poster={ad.thumbnail_url ?? undefined} />
      ) : (ad.creative_url || ad.thumbnail_url) ? (
        /* IMAGE fallback */
        <img src={ad.creative_url ?? ad.thumbnail_url!} alt={ad.title}
          className="absolute inset-0 w-full h-full object-contain" />
      ) : null /* Gradient seul */}

      {/* Gradient sombre bas (identique mobile : transparent → noir 0.55 → noir 0.92) */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 35%, transparent 70%)'
      }} />

      {/* Badge sponsorisé */}
      <div className="absolute top-12 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[11px] font-bold"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
        <Zap size={10} style={{ color: '#7B3FF2' }} /> Sponsorisé
      </div>

      {/* CTA style TikTok : pastille compacte flottante, fixe en bas, pulsation douce */}
      <div className="absolute bottom-12 left-4 right-20 z-20 flex items-center gap-2.5 px-3 py-2 rounded-full"
        style={{
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.15)',
          animation: 'ad-cta-pulse 2.2s ease-in-out infinite',
        }}>
        <p className="text-white font-bold text-sm leading-tight truncate flex-1 min-w-0">{ad.title}</p>
        {ad.cta_url && (
          <button onClick={handleClick}
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full font-black text-xs"
            style={{ background: 'white', color: '#7B3FF2' }}>
            <ExternalLink size={12} />
            {ad.cta_text ?? 'En savoir plus'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Mini card avec preview vidéo au survol ────────────────────────────────────
function HoverVideoCard({ r, onOpen, onMenu, fmt }: {
  r: Reel;
  onOpen: () => void;
  onMenu: (e: React.MouseEvent) => void;
  fmt: (n: number) => string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef   = useRef<Hls | null>(null);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !r.hls_url) return;
    if (!hovering) {
      v.pause();
      hlsRef.current?.destroy();
      hlsRef.current = null;
      v.removeAttribute('src');
      v.load();
      return;
    }
    const src = toProxiedUrl(r.hls_url);
    if (Hls.isSupported()) {
      const hls = new Hls({ autoStartLoad: true, maxBufferLength: 10 });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(v);
      hls.once(Hls.Events.MANIFEST_PARSED, () => { v.muted = true; v.play().catch(() => {}); });
    } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = src; v.muted = true; v.play().catch(() => {});
    }
    return () => {
      hlsRef.current?.destroy(); hlsRef.current = null;
      v.pause(); v.removeAttribute('src'); v.load();
    };
  }, [hovering, r.hls_url]); // eslint-disable-line

  return (
    <div className="flex flex-col"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}>

      <div className="relative w-full overflow-hidden rounded-md" style={{ aspectRatio: '9/16' }}>

        {/* Thumbnail (toujours visible, remplacée par la vidéo au hover) */}
        {r.thumbnail_url
          ? <img src={r.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: hovering ? 0 : 1, transition: 'opacity 0.2s' }} />
          : <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#1A1A1A' }}>
              <Film size={18} style={{ color: 'rgba(255,255,255,0.15)' }} />
            </div>
        }

        {/* Vidéo — chargée seulement au hover */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline muted loop
          style={{ opacity: hovering ? 1 : 0, transition: 'opacity 0.2s' }}
        />

        {/* Zone cliquable */}
        <button className="absolute inset-0 w-full h-full z-10" onClick={onOpen} />

        {/* Bouton menu */}
        <button onClick={onMenu}
          className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded z-20"
          style={{ background: 'rgba(0,0,0,0.55)' }}>
          <MoreVertical size={10} className="text-white" />
        </button>

        {r.comments_disabled && (
          <div className="absolute top-1 left-1 w-5 h-5 flex items-center justify-center rounded pointer-events-none z-20"
            style={{ background: 'rgba(0,0,0,0.55)' }}>
            <MessageSquareOff size={9} className="text-white/70" />
          </div>
        )}
      </div>

      {/* Stats sous la card */}
      <div className="flex items-center justify-between px-0.5 pt-1 pb-0.5">
        <span className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
          <Play size={9} style={{ color: 'var(--text-tertiary)' }} />{fmt(r.view_count ?? 0)}
        </span>
        <span className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
          <Heart size={9} style={{ color: 'var(--text-tertiary)' }} />{fmt(r.like_count ?? 0)}
        </span>
        <span className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
          <MessageCircle size={9} style={{ color: 'var(--text-tertiary)' }} />{fmt(r.comment_count ?? 0)}
        </span>
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
  // Figé au premier montage — le scroll met à jour l'URL en continu (pour survivre à un F5),
  // mais ça ne doit jamais re-déclencher fetchReels ni retrier la liste à chaque reel visionné.
  const targetIdRef = useRef<string | null>(
    searchParams.get('id') ? (() => { try { return decodeId(searchParams.get('id')!); } catch { return searchParams.get('id'); } })() : null,
  );
  const targetId = targetIdRef.current;

  // Mode "reels d'un utilisateur" — ?user=xxx (depuis le profil). Figé au montage comme targetId :
  // une navigation vers un autre profil démonte le composant (changement de route source), donc
  // pas besoin de réagir à un changement en cours de vie.
  const userModeRef = useRef<string | null>(
    searchParams.get('user') ? (() => { try { return decodeId(searchParams.get('user')!); } catch { return searchParams.get('user'); } })() : null,
  );
  const userMode = userModeRef.current;

  const { user: me }                    = useAuthStore();
  const { confirm, ConfirmDialog }      = useConfirm();

  // Guest (non connecté) — charge uniquement le reel ciblé par l'URL pour l'aperçu
  const [guestReel, setGuestReel] = useState<Reel | null>(null);
  useEffect(() => {
    if (me || !targetId) return;
    apiClient.get<Reel>(Endpoints.reels.byId(targetId))
      .then(r => setGuestReel(r.data))
      .catch(() => {});
  }, [me, targetId]);

  const [reels,         setReels]       = useState<Reel[]>([]);
  const [myReels,       setMyReels]     = useState<Reel[]>([]);
  // Rotation des ads par slot — chaque emplacement pub (index 0, 1, 2…) charge sa
  // propre ad indépendamment, avec exclusion des dernières servies (identique mobile).
  const [adSlots,       setAdSlots]     = useState<Map<number, ReelAd>>(new Map());
  const adSlotsRef        = useRef(adSlots);
  adSlotsRef.current = adSlots;
  const loadingAdSlotsRef = useRef<Set<number>>(new Set());
  const servedAdIdsRef    = useRef<Set<string>>(new Set());
  const [tab,           setTab]         = useState<'feed'|'mine'>('feed');
  const [loading,       setLoading]     = useState(true);
  // Ratio (width/height) du reel actif — pilote la largeur de la colonne player sur
  // desktop : élargie pour un contenu paysage (16:9), étroite pour un portrait (9:16).
  const [activeRatio,   setActiveRatio] = useState<number | null>(null);
  const [loadingMore,   setLoadingMore] = useState(false);
  const [hasMore,       setHasMore]     = useState(true);
  const [error,         setError]       = useState<string | null>(null);
  const [activeIndex,   setActiveIndex] = useState(0);
  // Verrou pendant un saut programmatique (jumpToReel) — l'IntersectionObserver
  // peut capturer un état transitoire pendant le scroll instantané (plusieurs
  // éléments partiellement visibles au même frame) et réécrire activeIndex sur
  // le mauvais index, laissant deux ReelPlayer "active" en même temps (double son,
  // ou le reel visé qui semble ne jamais s'afficher). Le verrou fait ignorer
  // l'observer le temps que le scroll se stabilise.
  const isJumpingRef = useRef(false);
  const [globalMuted,   setGlobalMuted] = useState(false);
  const [sidebarOpen,   setSidebarOpen] = useState(true);
  const [drawerOpen,    setDrawerOpen]  = useState(false);
  // Recherche
  const [searchOpen,    setSearchOpen]  = useState(false);
  const [searchQuery,   setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Reel[]>([]);
  const [searching,     setSearching]   = useState(false);
  const searchInputRef                  = useRef<HTMLInputElement>(null);
  // Tendances affichées par défaut à l'ouverture (avant frappe) + pagination
  // infinie sur scroll, symétrique à ReelsScreen.tsx côté mobile.
  const [trendingReels,   setTrendingReels]   = useState<Reel[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [trendingHasMore, setTrendingHasMore] = useState(true);
  const [searchHasMore,   setSearchHasMore]   = useState(true);
  const [loadingMoreSearch, setLoadingMoreSearch] = useState(false);
  const trendingPageRef = useRef(1);
  const searchPageRef   = useRef(1);
  const SEARCH_PAGE_LIMIT = 20;
  const SEARCH_AD_INTERVAL = 4;
  // Pubs de la grille recherche (placement="search") — Map slot -> ad, séparée
  // de adSlots (feed principal, placement="reels").
  const [searchAdSlots, setSearchAdSlots] = useState<Map<number, ReelAd>>(new Map());
  // Ref stable (pas le state directement) — sinon loadSearchAdForSlot capture une
  // closure obsolète de searchAdSlots : le tout premier appel dans openSearch()
  // (juste après setSearchAdSlots(new Map())) lisait encore l'ancien Map de la
  // session de recherche précédente dans la même passe synchrone, avant que React
  // ne re-render, ce qui faisait échouer silencieusement le chargement du slot 0
  // via le guard `searchAdSlots.has(slotIdx)` — jamais aucune pub visible.
  const searchAdSlotsRef = useRef(searchAdSlots);
  searchAdSlotsRef.current = searchAdSlots;
  const loadingSearchAdSlotsRef = useRef<Set<number>>(new Set());
  const servedSearchAdIdsRef    = useRef<Set<string>>(new Set());
  const [fullscreenSearchAd, setFullscreenSearchAd] = useState<ReelAd | null>(null);

  const loadSearchAdForSlot = useCallback((slotIdx: number, allowRepeat = false) => {
    if (loadingSearchAdSlotsRef.current.has(slotIdx) || searchAdSlotsRef.current.has(slotIdx)) return;
    loadingSearchAdSlotsRef.current.add(slotIdx);
    const recentExcluded = allowRepeat ? [] : Array.from(servedSearchAdIdsRef.current).slice(-20);
    const excludeIds = recentExcluded.join(',');
    const qs = excludeIds ? `&exclude_ids=${encodeURIComponent(excludeIds)}` : '';
    apiClient.get<ReelAd | null>(`${Endpoints.ads.feedNext('search')}${qs}`)
      .then(r => {
        loadingSearchAdSlotsRef.current.delete(slotIdx);
        if (!r.data?.id) {
          if (excludeIds) loadSearchAdForSlot(slotIdx, true);
          return;
        }
        servedSearchAdIdsRef.current.add(r.data.id);
        setSearchAdSlots(prev => new Map(prev).set(slotIdx, r.data as ReelAd));
      })
      .catch(() => { loadingSearchAdSlotsRef.current.delete(slotIdx); });
  }, []);
  const searchTimer                     = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Menu 3 points (mes reels — grille)
  const [menuReel,      setMenuReel]    = useState<Reel | null>(null);
  const [editReel,      setEditReel]    = useState<Reel | null>(null);
  const [editCaption,   setEditCaption] = useState('');
  const [editSaving,    setEditSaving]  = useState(false);
  // Bottom sheet "..." (feed — non-owner et owner)
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  // Compteurs optimistes pour le reel actif (repost/remix/cable)
  const [activeRepostCount, setActiveRepostCount] = useState(0);
  const [activeRemixCount,  setActiveRemixCount]  = useState(0);
  const [activeCableCount,  setActiveCableCount]  = useState(0);
  const [activeCommentsDisabled, setActiveCommentsDisabled] = useState(false);
  // Actions en cours
  const [reposting,     setReposting]   = useState(false);
  const [cabling,       setCabling]     = useState(false);
  const [togglingComments, setTogglingComments] = useState(false);
  // Preview inline (mes reels)
  const [previewReel,   setPreviewReel] = useState<Reel | null>(null);

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

    // Mode profil : GET /reels/user/{id} — liste complète d'un coup, pas de pagination
    // côté backend, donc hasMore reste false (loadMore n'a pas de sens dans ce mode).
    if (userMode) {
      apiClient.get<any>(Endpoints.reels.byUser(userMode))
        .then(res => {
          let list = toArray<Reel>(res.data);
          setHasMore(false);
          hasMoreRef.current = false;
          if (targetId) {
            const idx = list.findIndex(r => r.id === targetId);
            if (idx > 0) {
              const [target] = list.splice(idx, 1);
              list = [target, ...list];
            }
          }
          setReels(list);
          setLoading(false);
        })
        .catch(() => { setError('Impossible de charger les reels'); setLoading(false); });
      return;
    }

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
  }, [targetId, userMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (userMode) return;
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

  // Charge une ad pour un slot donné — exclut les dernières servies dans la session
  // pour éviter de répéter toujours la même, retombe sans exclusion si le stock de
  // campagnes actives est épuisé (mieux vaut revoir une pub que ne plus jamais en voir).
  const loadAdForSlot = useCallback((slotIdx: number, allowRepeat = false) => {
    if (loadingAdSlotsRef.current.has(slotIdx) || adSlotsRef.current.has(slotIdx)) return;
    loadingAdSlotsRef.current.add(slotIdx);
    const recentExcluded = allowRepeat ? [] : Array.from(servedAdIdsRef.current).slice(-20);
    const excludeIds = recentExcluded.join(',');
    const qs = excludeIds ? `&exclude_ids=${encodeURIComponent(excludeIds)}` : '';
    apiClient.get<ReelAd | null>(`${Endpoints.ads.feedNext('reels')}${qs}`)
      .then(r => {
        loadingAdSlotsRef.current.delete(slotIdx);
        if (!r.data?.id) {
          if (excludeIds) loadAdForSlot(slotIdx, true);
          return;
        }
        servedAdIdsRef.current.add(r.data.id);
        setAdSlots(prev => new Map(prev).set(slotIdx, r.data as ReelAd));
      })
      .catch(() => { loadingAdSlotsRef.current.delete(slotIdx); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!me) return;
    fetchReels();
    if (userMode) return; // mode profil : pas de pub, pas besoin de "mes reels"
    loadAdForSlot(0);
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

    // Tendances affichées par défaut avant toute frappe (persistent pendant la
    // frappe tant qu'aucun vrai résultat n'est arrivé, cf. gridData plus bas).
    trendingPageRef.current = 1;
    setTrendingHasMore(true);
    setSearchHasMore(true);
    // Reset synchrone de la ref en plus du state — sinon loadSearchAdForSlot(0)
    // ci-dessous lit encore l'ancien Map (React n'a pas encore re-rendu entre
    // les deux appels dans ce même handler).
    searchAdSlotsRef.current = new Map();
    setSearchAdSlots(new Map());
    loadingSearchAdSlotsRef.current.clear();
    setLoadingTrending(true);
    apiClient.get<any>(`${Endpoints.search.trendingReels}?page=1&limit=${SEARCH_PAGE_LIMIT}`)
      .then(r => {
        const data = r.data;
        const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        const more  = Array.isArray(data) ? items.length >= SEARCH_PAGE_LIMIT : (data?.has_more ?? items.length >= SEARCH_PAGE_LIMIT);
        setTrendingReels(items);
        setTrendingHasMore(more);
      })
      .catch(() => { setTrendingReels([]); setTrendingHasMore(false); })
      .finally(() => setLoadingTrending(false));

    // Première pub visible dès l'ouverture, sans attendre le moindre scroll.
    loadSearchAdForSlot(0);
  }, [loadSearchAdForSlot]);
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }, []);
  // Terme le plus récemment demandé — évite qu'une réponse en retard (frappe rapide,
  // plusieurs requêtes en vol en même temps) écrase les résultats d'une recherche plus récente.
  const searchReqRef = useRef('');
  const runSearch = useCallback((q: string) => {
    const term = q.trim();
    searchReqRef.current = term;
    searchPageRef.current = 1;
    if (!term) { setSearchResults([]); setSearchHasMore(true); setSearching(false); return; }
    setSearching(true);
    apiClient.get<any>(`${Endpoints.reels.feed}?search=${encodeURIComponent(term)}&page=1&limit=${SEARCH_PAGE_LIMIT}`)
      .then(r => {
        if (searchReqRef.current !== term) return;
        const data = r.data;
        const items = toArray<Reel>(data);
        setSearchResults(items);
        setSearchHasMore(data?.has_more ?? items.length >= SEARCH_PAGE_LIMIT);
      })
      .catch(() => { if (searchReqRef.current === term) { setSearchResults([]); setSearchHasMore(false); } })
      .finally(() => { if (searchReqRef.current === term) setSearching(false); });
  }, []);

  // Pagination — grille recherche (tendances ou résultats texte selon le contexte
  // actuel), appelée au scroll du dropdown (onScroll, équivalent web du
  // onEndReached mobile).
  const loadMoreSearchGrid = useCallback(() => {
    if (loadingMoreSearch) return;
    const term = searchQuery.trim();
    if (term) {
      if (!searchHasMore || searching) return;
      setLoadingMoreSearch(true);
      const nextPage = searchPageRef.current + 1;
      apiClient.get<any>(`${Endpoints.reels.feed}?search=${encodeURIComponent(term)}&page=${nextPage}&limit=${SEARCH_PAGE_LIMIT}`)
        .then(r => {
          if (searchReqRef.current !== term) return;
          searchPageRef.current = nextPage;
          const data = r.data;
          const items = toArray<Reel>(data);
          setSearchResults(prev => {
            const ids = new Set(prev.map(x => x.id));
            const merged = [...prev, ...items.filter(x => !ids.has(x.id))];
            const totalSlots = Math.floor(merged.length / SEARCH_AD_INTERVAL);
            for (let s = 0; s < totalSlots; s++) loadSearchAdForSlot(s);
            return merged;
          });
          setSearchHasMore(data?.has_more ?? items.length >= SEARCH_PAGE_LIMIT);
        })
        .catch(() => setSearchHasMore(false))
        .finally(() => setLoadingMoreSearch(false));
    } else {
      if (!trendingHasMore || loadingTrending) return;
      setLoadingMoreSearch(true);
      const nextPage = trendingPageRef.current + 1;
      apiClient.get<any>(`${Endpoints.search.trendingReels}?page=${nextPage}&limit=${SEARCH_PAGE_LIMIT}`)
        .then(r => {
          const data = r.data;
          const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
          const more  = Array.isArray(data) ? items.length >= SEARCH_PAGE_LIMIT : (data?.has_more ?? items.length >= SEARCH_PAGE_LIMIT);
          trendingPageRef.current = nextPage;
          setTrendingReels(prev => {
            const ids = new Set(prev.map((x: any) => x.id));
            const merged = [...prev, ...items.filter((x: any) => !ids.has(x.id))];
            const totalSlots = Math.floor(merged.length / SEARCH_AD_INTERVAL);
            for (let s = 0; s < totalSlots; s++) loadSearchAdForSlot(s);
            return merged;
          });
          setTrendingHasMore(more);
        })
        .catch(() => setTrendingHasMore(false))
        .finally(() => setLoadingMoreSearch(false));
    }
  }, [loadingMoreSearch, searchQuery, searchHasMore, searching, trendingHasMore, loadingTrending, loadSearchAdForSlot]);
  const onSearchChange = useCallback((v: string) => {
    setSearchQuery(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => runSearch(v), 400);
  }, [runSearch]);
  // Place un reel donné en tête de liste et scrolle jusqu'à lui — réutilisé par la
  // recherche ET par la navigation directe (clic sur un reel depuis le Feed).
  const jumpToReel = useCallback((r: Reel) => {
    // Verrouille l'IntersectionObserver pendant le saut — sinon il peut capturer
    // un état transitoire (scroll pas encore stabilisé, ancien ET nouveau reel
    // partiellement visibles) et réécrire activeIndex sur le mauvais index,
    // laissant deux ReelPlayer actifs en même temps (double son, reel visé qui
    // semble ne jamais s'afficher).
    isJumpingRef.current = true;

    // S'il existe déjà dans la liste, le déplace en tête au lieu de la laisser
    // inchangée (sinon le scroll vers 0 pointe vers le mauvais reel).
    setReels(prev => {
      const rest = prev.filter(x => x.id !== r.id);
      return [r, ...rest];
    });
    setActiveIndex(0);
    // Attend que React commite le DOM avec le nouveau reel avant de scroller —
    // un setTimeout seul peut s'exécuter avant le repaint et scroller sur l'ancien DOM.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (containerRef.current) containerRef.current.scrollTop = 0;
        // Relâche le verrou après que le scroll instantané ait eu le temps de se
        // stabiliser (l'observer utilise threshold: 0.6, un frame supplémentaire
        // suffit une fois le scrollTop appliqué).
        setTimeout(() => { isJumpingRef.current = false; }, 150);
      });
    });
  }, []);

  // Les reels tendance/résultats de recherche n'ont pas toujours tous les champs
  // nécessaires à la lecture (hls_url notamment, cf. get_trending_reels côté
  // backend) — on refetch l'objet complet avant de jouer, comme côté mobile,
  // pour ne jamais lancer une lecture avec un flux vidéo manquant.
  const pickSearchResult = useCallback(async (r: Reel) => {
    closeSearch();
    if (r.hls_url) { jumpToReel(r); return; }
    try {
      const full = await apiClient.get<Reel>(Endpoints.reels.byId(r.id));
      jumpToReel(full.data ?? r);
    } catch {
      jumpToReel(r);
    }
  }, [closeSearch, jumpToReel]);

  // Détecte un changement de ?id= dans l'URL SANS démontage du composant — cas
  // fréquent : on reste sur /reels (le scroll met l'URL à jour en continu via
  // navigate replace) et on clique un nouveau reel depuis le Feed. React Router
  // ne remonte pas ReelsPage pour un simple changement de query string, donc
  // sans cet effet le clic depuis le Feed n'avait aucun effet visible.
  const lastHandledIdParam = useRef(searchParams.get('id'));
  useEffect(() => {
    const idParam = searchParams.get('id');
    if (!idParam || idParam === lastHandledIdParam.current) return;
    lastHandledIdParam.current = idParam;

    let wanted: string;
    try { wanted = decodeId(idParam); } catch { wanted = idParam; }

    // Le scroll lui-même réécrit l'URL en continu (persistance F5) — si le reel visé
    // est déjà celui actif, l'URL vient de refléter le scroll naturel, pas un clic
    // externe : ne pas re-scroller, ça casserait le défilement en cours.
    if (reels[activeIndex]?.id === wanted) return;

    const existing = reels.find(r => r.id === wanted);
    if (existing) {
      jumpToReel(existing);
    } else {
      apiClient.get<any>(Endpoints.reels.byId(wanted))
        .then(r => { if (r.data?.id) jumpToReel(r.data as Reel); })
        .catch(() => {});
    }
  }, [searchParams, reels, activeIndex, jumpToReel]);

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
      const res = await apiClient.patch<Reel>(Endpoints.reels.byId(editReel.id), { caption: editCaption.trim() });
      const updated = { ...editReel, ...(res.data ?? {}), caption: editCaption.trim() };
      setMyReels(prev => prev.map(r => r.id === editReel.id ? updated : r));
      setReels(prev => prev.map(r => r.id === editReel.id ? updated : r));
      setEditReel(null);
    } catch { /* silencieux */ }
    setEditSaving(false);
  }, [editReel, editCaption]);
  const handleDeleteReel = useCallback(async (r: Reel) => {
    setMenuReel(null);
    const ok = await confirm({ title: 'Supprimer ce reel ?', danger: true, confirmLabel: 'Supprimer' });
    if (!ok) return;
    try {
      await apiClient.delete(Endpoints.reels.delete(r.id));
      setMyReels(prev => prev.filter(x => x.id !== r.id));
      setReels(prev => prev.filter(x => x.id !== r.id));
    } catch { /* silencieux */ }
  }, [confirm]);

  // ── Repost ──
  const handleRepost = useCallback(async () => {
    const cur = reels[activeIndex] ?? null;
    if (!cur || reposting) return;
    setReposting(true);
    setMoreSheetOpen(false);
    try {
      await apiClient.post(Endpoints.reels.repost(cur.id));
      setActiveRepostCount(c => c + 1);
      setReels(prev => prev.map(r => r.id === cur.id ? { ...r, repost_count: (r.repost_count ?? 0) + 1 } : r));
    } catch (e: any) {
      const msg = getApiErrorDetail(e) ?? e?.message ?? 'Impossible de republier';
      toast.error(msg);
    } finally { setReposting(false); }
  }, [reels, activeIndex, reposting]); // eslint-disable-line

  // ── Cable ──
  const handleCable = useCallback(async () => {
    const cur = reels[activeIndex] ?? null;
    if (!cur || cabling) return;
    const authorName = cur.author?.display_name ?? cur.author?.username ?? 'cet utilisateur';
    const ok = await confirm({ title: `Envoyer une invitation Cable à ${authorName} ?`, danger: false });
    if (!ok) return;
    setCabling(true);
    setMoreSheetOpen(false);
    try {
      await apiClient.post(Endpoints.cable.sendInvite(cur.id), { receiver_id: cur.author?.id });
      setActiveCableCount(c => c + 1);
      setReels(prev => prev.map(r => r.id === cur.id ? { ...r, cable_count: (r.cable_count ?? 0) + 1 } : r));
      toast.success(`Invitation envoyée ! ${authorName} a reçu ton invitation Cable.`);
    } catch (e: any) {
      const msg = getApiErrorDetail(e) ?? e?.message ?? 'Impossible d\'envoyer l\'invitation';
      toast.error(msg);
    } finally { setCabling(false); }
  }, [reels, activeIndex, cabling, confirm]); // eslint-disable-line

  // ── Toggle comments (owner) ──
  const handleToggleComments = useCallback(async () => {
    const cur = reels[activeIndex] ?? null;
    if (!cur || togglingComments) return;
    setTogglingComments(true);
    setMoreSheetOpen(false);
    const newState = !activeCommentsDisabled;
    setActiveCommentsDisabled(newState);
    setReels(prev => prev.map(r => r.id === cur.id ? { ...r, comments_disabled: newState } : r));
    try {
      await apiClient.patch(Endpoints.reels.toggleComments(cur.id));
    } catch {
      setActiveCommentsDisabled(!newState);
      setReels(prev => prev.map(r => r.id === cur.id ? { ...r, comments_disabled: !newState } : r));
    } finally { setTogglingComments(false); }
  }, [reels, activeIndex, activeCommentsDisabled, togglingComments]); // eslint-disable-line

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
          if (isJumpingRef.current) return;
          const idx = Number((e.target as HTMLElement).dataset.index);
          setActiveIndex(idx);
          savedIndexRef.current = idx;
          // Sauvegarder position (module-level, survit à une navigation interne)
          const reelId = reels[idx]?.id ?? '';
          _reelPosition = { idx, reelId };
          // Reflète le reel actif dans l'URL — seul moyen de le retrouver après un F5
          // (le module-level state ci-dessus est perdu au rechargement de page).
          if (reelId) {
            const nextUrl = `/reels?id=${encodeId(reelId)}`;
            if (window.location.pathname + window.location.search !== nextUrl) {
              navigate(nextUrl, { replace: true });
            }
          }
          // Charger plus quand on approche des 3 derniers (identique mobile)
          if (idx >= reels.length - 3) loadMore();
        }
      }),
      { threshold: 0.6 },
    );
    document.querySelectorAll('[data-reel-item]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [reels, loadMore]);

  // Injection pub toutes les 5 reels — chaque slot a sa propre ad, rechargée
  // indépendamment (rotation, pas la même pub partout comme avant).
  const AD_INTERVAL = 5;
  const feedWithAds = useMemo(() => {
    if (userMode) return reels.map(r => ({ _isAd: false as const, reel: r }));
    const result: ({ _isAd: false; reel: Reel } | { _isAd: true; ad: ReelAd; id: string; slotIdx: number })[] = [];
    reels.forEach((r, i) => {
      result.push({ _isAd: false, reel: r });
      if ((i + 1) % AD_INTERVAL === 0) {
        const slotIdx = Math.floor((i + 1) / AD_INTERVAL) - 1;
        const ad = adSlots.get(slotIdx);
        if (ad) result.push({ _isAd: true, ad, id: `ad-${ad.id}-${i}`, slotIdx });
      }
    });
    return result;
  }, [reels, adSlots, userMode]);

  // Précharge le slot pub suivant dès que le dernier slot rempli est visible
  useEffect(() => {
    if (userMode) return;
    const filledSlots = adSlots.size;
    const slotsNeeded = Math.floor(reels.length / AD_INTERVAL);
    if (slotsNeeded > filledSlots) loadAdForSlot(filledSlots);
  }, [reels.length, adSlots, userMode, loadAdForSlot]);

  const activeReel = reels[activeIndex] ?? null;

  // Fermer le drawer mobile et le more sheet quand on change de reel
  useEffect(() => {
    setDrawerOpen(false);
    setMoreSheetOpen(false);
    const r = reels[activeIndex];
    if (r) {
      setActiveRepostCount(r.repost_count ?? 0);
      setActiveRemixCount(r.remix_count ?? 0);
      setActiveCableCount(r.cable_count ?? 0);
      setActiveCommentsDisabled(r.comments_disabled ?? false);
    }
  }, [activeIndex]); // eslint-disable-line

  // ── Guest (non connecté) — thumbnail du reel ciblé chargé en arrière-plan ──
  if (!me) {
    return (
      <GuestPreview
        type="reel"
        thumbnail={guestReel?.thumbnail_url ?? null}
        videoUrl={guestReel?.hls_url ?? null}
        body={guestReel?.caption ?? null}
        author={guestReel?.author ?? null}
        date={guestReel?.created_at ?? null}
        likeCount={guestReel?.like_count}
        commentCount={guestReel?.comment_count}
        viewCount={guestReel?.view_count}
      />
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading && reels.length === 0) {
    return <PageLoader dark />;
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
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
              Réessayer
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Vue Mes Reels ─────────────────────────────────────────────────────────────
  const fmtMine = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n);

  if (tab === 'mine') {
    const totalViews = myReels.reduce((s, r) => s + (r.view_count ?? 0), 0);
    const totalLikes = myReels.reduce((s, r) => s + (r.like_count ?? 0), 0);

    return (
      <div className="fixed inset-0 flex flex-col" style={{ zIndex: 0, background: 'var(--bg)' }}>

        {/* Header */}
        <div className="shrink-0" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => setTab('feed')} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-black text-base leading-tight" style={{ color: 'var(--text-primary)' }}>Mes Reels</h1>
              {myReels.length > 0 && (
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {myReels.length} reel{myReels.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <button onClick={() => navigate('/create/reel')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 4px 14px rgba(123,63,242,0.35)' }}>
              <span className="font-black text-base leading-none">+</span> Créer
            </button>
          </div>

          {/* Stats bar */}
          {myReels.length > 0 && (
            <div className="flex items-center px-4 pb-3 gap-6">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(123,63,242,0.1)' }}>
                  <Eye size={12} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <p className="text-sm font-black leading-tight" style={{ color: 'var(--text-primary)' }}>{fmtMine(totalViews)}</p>
                  <p className="text-[10px] leading-none" style={{ color: 'var(--text-tertiary)' }}>vues</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(123,63,242,0.1)' }}>
                  <Heart size={12} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <p className="text-sm font-black leading-tight" style={{ color: 'var(--text-primary)' }}>{fmtMine(totalLikes)}</p>
                  <p className="text-[10px] leading-none" style={{ color: 'var(--text-tertiary)' }}>likes</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(123,63,242,0.1)' }}>
                  <Film size={12} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <p className="text-sm font-black leading-tight" style={{ color: 'var(--text-primary)' }}>{myReels.length}</p>
                  <p className="text-[10px] leading-none" style={{ color: 'var(--text-tertiary)' }}>reels</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contenu */}
        {myReels.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-8">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: 'rgba(123,63,242,0.08)', border: '1px solid rgba(123,63,242,0.15)' }}>
              <Film size={36} style={{ color: 'rgba(123,63,242,0.5)' }} />
            </div>
            <div className="space-y-1">
              <p className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>Aucun reel pour l'instant</p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                Partage tes premiers moments en video avec ta communaute
              </p>
            </div>
            <button onClick={() => navigate('/create/reel')}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 6px 20px rgba(123,63,242,0.4)' }}>
              <span className="font-black text-base leading-none">+</span> Creer mon premier reel
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            <div className="grid gap-1 p-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 160px))' }}>
              {myReels.map(r => (
                <HoverVideoCard
                  key={r.id}
                  r={r}
                  fmt={fmtMine}
                  onOpen={() => setPreviewReel(r)}
                  onMenu={e => { e.stopPropagation(); setMenuReel(r); }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Bottom sheet menu 3 points */}
        {menuReel && (
          <div className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setMenuReel(null)}>
            <div className="w-full max-w-lg rounded-t-3xl overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              onClick={e => e.stopPropagation()}>

              {/* Handle */}
              <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-3" style={{ background: 'var(--border)' }} />

              {/* Preview miniature */}
              <div className="flex items-center gap-3 px-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="w-14 rounded-xl overflow-hidden shrink-0" style={{ aspectRatio: '9/16' }}>
                  {menuReel.thumbnail_url
                    ? <img src={menuReel.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center" style={{ background: '#1A1A1A' }}>
                        <Film size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />
                      </div>
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {menuReel.caption?.trim() || 'Sans description'}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] flex items-center gap-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      <Eye size={10} />{fmtMine(menuReel.view_count ?? 0)} vues
                    </span>
                    <span className="text-[11px] flex items-center gap-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      <Heart size={10} />{fmtMine(menuReel.like_count ?? 0)} likes
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="py-2">
                <button onClick={() => { setMenuReel(null); setPreviewReel(menuReel); }}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-left transition-all"
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)' }}>
                    <Play size={18} />
                  </div>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Lire ce reel</span>
                </button>

                <button onClick={() => handleOpenEdit(menuReel)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-left transition-all"
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                    <Edit3 size={18} />
                  </div>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Modifier la description</span>
                </button>

                <button onClick={async () => {
                    setMenuReel(null);
                    try {
                      await apiClient.patch(Endpoints.reels.toggleComments(menuReel.id));
                      setMyReels(prev => prev.map(r => r.id === menuReel.id ? { ...r, comments_disabled: !r.comments_disabled } : r));
                    } catch { toast.error('Erreur lors du changement'); }
                  }}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-left transition-all"
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                    {menuReel.comments_disabled
                      ? <MessageSquare size={18} />
                      : <MessageSquareOff size={18} />
                    }
                  </div>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {menuReel.comments_disabled ? 'Activer les commentaires' : 'Desactiver les commentaires'}
                  </span>
                </button>

                <div style={{ height: 1, background: 'var(--border)', margin: '4px 20px' }} />

                <button onClick={() => handleDeleteReel(menuReel)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-left transition-all"
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                    <Trash2 size={18} />
                  </div>
                  <span className="font-semibold text-sm" style={{ color: '#ef4444' }}>Supprimer le reel</span>
                </button>

                <button onClick={() => setMenuReel(null)}
                  className="w-full py-4 font-bold text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal édition caption */}
        {editReel && (
          <div className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setEditReel(null)}>
            <div className="w-full max-w-lg rounded-t-3xl p-5 space-y-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 rounded-full mx-auto mb-1" style={{ background: 'var(--border)' }} />
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
                  style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
                  {editSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Overlay player inline — s'ouvre sans quitter la page */}
        {previewReel && (() => {
          const videoSrc = toProxiedUrl(previewReel.hls_url ?? '');
          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}
              onClick={() => setPreviewReel(null)}>
              <div className="relative flex items-center justify-center"
                style={{ maxHeight: '90dvh', maxWidth: '420px', width: '100%', aspectRatio: '9/16' }}
                onClick={e => e.stopPropagation()}>

                {/* Bouton fermer */}
                <button onClick={() => setPreviewReel(null)}
                  className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <X size={16} color="#fff" />
                </button>

                {/* Player réutilisé */}
                <div className="w-full h-full rounded-2xl overflow-hidden">
                  <ReelPlayer
                    reel={previewReel}
                    active={true}
                    globalMuted={globalMuted}
                    onUnmute={() => setGlobalMuted(v => !v)}
                    onAutoplayFallbackMuted={() => setGlobalMuted(true)}
                    onCommentOpen={() => {}}
                    onMoreOpen={() => {}}
                  />
                </div>

                {/* Caption sous le player */}
                {previewReel.caption && (
                  <div className="absolute -bottom-10 inset-x-0 text-center">
                    <p className="text-white/70 text-xs truncate px-4">{previewReel.caption}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {ConfirmDialog}
      </div>
    );
  }

  // ── Main layout ─────────────────────────────────────────────────────────────
  const suggestions = reels.slice(activeIndex + 1);

  return (
    <div className="h-full overflow-hidden flex" style={{ zIndex: 0, background: 'var(--bg)' }}>

      {/* ── Zone player : pleine largeur mobile, colonne centrée sur desktop qui s'élargit
          pour un contenu paysage (16:9) au lieu de le rétrécir dans un cadre 9:16 ──
          La variable CSS n'est appliquée qu'à partir de md: (voir classe ci-dessous),
          donc sans effet sur le layout plein écran mobile. */}
      <div className="relative h-full flex-1 min-w-0 flex items-center justify-center">
        <div className="relative h-full w-full bg-black md:my-4 md:rounded-2xl md:overflow-hidden md:[max-width:var(--reel-col-w)]"
          style={{
            ['--reel-col-w' as string]: activeRatio != null && activeRatio >= 1
              ? `min(calc((100dvh - 32px) * ${activeRatio}), calc(100% - 32px))`
              : '600px',
          }}>

          {/* Header flottant (identique mobile) */}
          <div className="absolute top-3 inset-x-0 z-40 flex items-center justify-between px-3 pointer-events-none">
            <button onClick={() => navigate(-1)} className="pointer-events-auto w-9 h-9 rounded-full flex items-center justify-center md:hidden"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
              <ArrowLeft size={18} />
            </button>
            {!searchOpen && (
              <p className="text-white font-black text-base md:hidden" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>
                {userMode ? (reels[0]?.author?.display_name ?? reels[0]?.author?.username ?? 'Reels') : 'Reels'}
              </p>
            )}

            {/* Barre de recherche + "Mes reels" — masqués en mode reels d'un profil */}
            {!userMode && (searchOpen ? (
              <div className="flex-1 flex items-center gap-2 pointer-events-auto"
                style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 999, padding: '6px 10px' }}>
                <Search size={14} className="text-white/50 shrink-0" />
                <input ref={searchInputRef} value={searchQuery} onChange={e => onSearchChange(e.target.value)}
                  placeholder="Rechercher des reels, auteurs…"
                  className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/40"
                  onKeyDown={e => { if (e.key === 'Enter') runSearch(searchQuery); if (e.key === 'Escape') closeSearch(); }} />
                <button onClick={closeSearch} className="shrink-0 text-white/70">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pointer-events-auto ml-auto">
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
            ))}
          </div>

          {/* Scroll vertical snap */}
          <div ref={containerRef}
            className="w-full h-full overflow-y-scroll snap-y snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {feedWithAds.map((item, i) => (
              <div key={item._isAd ? item.id : item.reel.id} data-reel-item data-index={i}
                data-reel-id={item._isAd ? undefined : item.reel.id}
                className="w-full snap-start snap-always shrink-0 h-full">
                {item._isAd ? (
                  <ReelAdSlide ad={item.ad} active={i === activeIndex} globalMuted={globalMuted} />
                ) : (
                  <ReelPlayer
                    reel={item.reel}
                    active={i === activeIndex}
                    globalMuted={globalMuted}
                    onUnmute={() => setGlobalMuted(v => !v)}
                    onAutoplayFallbackMuted={() => setGlobalMuted(true)}
                    onCommentOpen={() => setDrawerOpen(true)}
                    onMoreOpen={() => setMoreSheetOpen(true)}
                    onRatioChange={setActiveRatio}
                  />
                )}
              </div>
            ))}
            {loadingMore && (
              <div className="w-full snap-start snap-always shrink-0 h-full flex items-center justify-center bg-black">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-9 h-9 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  <p className="text-white/50 text-xs font-medium">Chargement…</p>
                </div>
              </div>
            )}
          </div>

          {/* Overlay recherche plein écran (fixed, couvre toute la fenêtre — pas juste
              le cadre du player) : sans ça, sur desktop le dropdown était borné à la
              largeur/hauteur étroite du player (max ~460px), impossible à faire défiler
              correctement. Tendances par défaut, grille avec pubs mélangées, pagination
              infinie sur scroll. */}
          {searchOpen && (() => {
            const hasRealResults = searchResults.length > 0;
            const showTrending = !hasRealResults && !searchQuery.trim() && trendingReels.length > 0;
            const gridData: Reel[] | null = hasRealResults ? searchResults : showTrending ? trendingReels : null;
            const adSlotMap = searchAdSlots;

            return (
              <div className="fixed inset-0 z-[250] flex flex-col" style={{ background: 'rgba(10,10,10,0.98)' }}>
                {/* Barre de recherche — dupliquée ici en plein écran (le header flottant
                    reste dédié au player en dessous, masqué visuellement par cet overlay).
                    Largeur limitée + centrée, cohérente avec la grille en dessous. */}
                <div className="shrink-0 flex items-center gap-2 p-3 pt-4 max-w-3xl w-full mx-auto">
                  <button onClick={closeSearch} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
                    <ArrowLeft size={18} />
                  </button>
                  <div className="flex-1 flex items-center gap-2"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 999, padding: '8px 12px' }}>
                    <Search size={14} className="text-white/50 shrink-0" />
                    <input ref={searchInputRef} value={searchQuery} onChange={e => onSearchChange(e.target.value)}
                      placeholder="Rechercher des reels, auteurs…"
                      className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/40"
                      onKeyDown={e => { if (e.key === 'Enter') runSearch(searchQuery); if (e.key === 'Escape') closeSearch(); }} />
                    {searchQuery.length > 0 && (
                      <button onClick={() => onSearchChange('')} className="shrink-0 text-white/70">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className="flex-1 overflow-y-auto min-h-0"
                  onScroll={e => {
                    const el = e.currentTarget;
                    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 300) loadMoreSearchGrid();
                  }}
                >
                  {searching && !showTrending ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16">
                      <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      <p className="text-white/60 text-sm">Recherche…</p>
                    </div>
                  ) : gridData ? (
                    <>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1 p-2 max-w-3xl mx-auto">
                        {(() => {
                          const cells: React.ReactNode[] = [];
                          let adSlotCounter = 0;
                          gridData.forEach((r, i) => {
                            cells.push(
                              <button key={r.id} onClick={() => pickSearchResult(r)}
                                className="relative rounded-lg overflow-hidden" style={{ aspectRatio: '9/16' }}>
                                {r.thumbnail_url
                                  ? <img src={r.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                  : <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                                      <Film size={20} className="text-white/20" />
                                    </div>
                                }
                                <div className="absolute inset-0 flex flex-col justify-end p-1.5"
                                  style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.8) 0%,transparent 50%)' }}>
                                  {r.author?.avatar_url && (
                                    <img src={r.author.avatar_url} alt="" className="w-5 h-5 rounded-full mb-1 border border-white/30" />
                                  )}
                                  <p className="text-white text-[9px] font-bold truncate">
                                    {r.author?.display_name ?? r.author?.username ?? ''}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-0.5 text-white/70 text-[8px]">
                                    <span className="flex items-center gap-0.5"><Eye size={7} />{r.view_count ?? 0}</span>
                                    <span className="flex items-center gap-0.5"><Heart size={7} />{r.like_count ?? 0}</span>
                                  </div>
                                </div>
                              </button>
                            );
                            if ((i + 1) % SEARCH_AD_INTERVAL === 0) {
                              const slot = adSlotCounter++;
                              const ad = adSlotMap.get(slot);
                              if (ad) {
                                cells.push(
                                  <button key={`ad-${slot}`} onClick={() => setFullscreenSearchAd(ad)}
                                    className="relative overflow-hidden" style={{ aspectRatio: '9/16' }}>
                                    {ad.thumbnail_url || ad.creative_url
                                      ? <img src={ad.thumbnail_url ?? ad.creative_url!} alt="" className="w-full h-full object-cover" />
                                      : <div className="w-full h-full flex items-center justify-center" style={{ background: '#2A2340' }}>
                                          <Zap size={22} className="text-white/35" />
                                        </div>
                                    }
                                    <div className="absolute inset-0 flex flex-col justify-end p-1.5"
                                      style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.85) 0%,transparent 55%)' }}>
                                      <span className="self-start px-1.5 py-0.5 rounded text-[8px] font-bold text-white mb-1"
                                        style={{ background: 'rgba(224,56,154,0.85)' }}>Sponsorisé</span>
                                      <p className="text-white text-[9px] font-bold truncate">{ad.title}</p>
                                    </div>
                                  </button>
                                );
                              }
                            }
                          });
                          return cells;
                        })()}
                      </div>
                      {loadingMoreSearch && (
                        <div className="flex items-center justify-center py-4">
                          <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                        </div>
                      )}
                    </>
                  ) : searchQuery.trim() ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center px-6">
                      <Search size={28} className="text-white/20" />
                      <p className="text-white text-sm font-bold">Aucun résultat</p>
                      <p className="text-white/50 text-xs">Essaie un autre mot-clé</p>
                    </div>
                  ) : loadingTrending ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16">
                      <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center px-6">
                      <TrendingUp size={28} className="text-white/20" />
                      <p className="text-white text-sm font-bold">Découvre des reels</p>
                      <p className="text-white/50 text-xs">Tape un mot-clé ou un nom d'auteur</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Pub vidéo de la grille recherche ouverte en plein écran avec son —
            réutilise ReelAdSlide (même composant que le feed principal). */}
        {fullscreenSearchAd && (
          <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center">
            <button onClick={() => setFullscreenSearchAd(null)}
              className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.12)' }}>
              <X size={20} color="#fff" />
            </button>
            <div className="relative w-full h-full flex items-center justify-center" style={{ maxWidth: 480 }}>
              <ReelAdSlide ad={fullscreenSearchAd} active globalMuted={false} />
            </div>
          </div>
        )}

        {/* Toggle sidebar — desktop seulement */}
        <button
          onClick={() => setSidebarOpen(v => !v)}
          className="absolute top-1/2 -translate-y-1/2 right-0 z-30 w-6 h-14 rounded-l-xl items-center justify-center transition-all hidden md:flex"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
          {sidebarOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* ── Panneau droit : commentaires + suggestions — desktop uniquement ── */}
      {sidebarOpen && activeReel && (
        <div className="hidden md:flex flex-col shrink-0 h-full"
          style={{ width: 600, borderLeft: '1px solid var(--border)', background: 'var(--bg)' }}>

          {/* Onglets Commentaires / Tu pourrais aimer */}
          <RightPanelTabs
            reelId={activeReel.id}
            commentCount={activeReel.comment_count ?? 0}
            suggestions={suggestions}
            onSuggestionClick={targetReelId => {
              const target = document.querySelector(`[data-reel-id="${targetReelId}"]`);
              target?.scrollIntoView({ behavior: 'smooth' });
            }}
            onLoadMore={loadMore}
            loadingMore={loadingMore}
          />
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
                      style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
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

      {/* ── Bottom sheet "..." (feed) ── */}
      {moreSheetOpen && activeReel && (() => {
        const isMine = me?.id === activeReel.author?.id;
        const authorName = activeReel.author?.display_name ?? activeReel.author?.username ?? 'Artiste';
        const fmt = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}k` : String(n);
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
            onClick={() => setMoreSheetOpen(false)}>
            <div className="w-full max-w-lg rounded-t-3xl overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              onClick={e => e.stopPropagation()}>

              {/* Handle */}
              <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1" style={{ background: 'var(--border)' }} />

              {/* Header auteur */}
              <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0" style={{ border: '2px solid var(--border)' }}>
                  {activeReel.author?.avatar_url
                    ? <img src={activeReel.author.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
                        {authorName[0]?.toUpperCase()}
                      </div>
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{authorName}</p>
                  {activeReel.caption && (
                    <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{activeReel.caption}</p>
                  )}
                </div>
                <button onClick={() => setMoreSheetOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                  <X size={14} />
                </button>
              </div>

              {/* Stats bar */}
              <div className="flex items-center justify-around px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                {[
                  { icon: GitMerge, label: 'Remix',   value: activeRemixCount },
                  { icon: Repeat2,  label: 'Reposts', value: activeRepostCount },
                  { icon: Link2,    label: 'Cables',  value: activeCableCount },
                  { icon: Share2,   label: 'Partages',value: activeReel.share_count ?? 0 },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-1">
                      <Icon size={12} style={{ color: 'var(--primary)' }} />
                      <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{fmt(value)}</span>
                    </div>
                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="py-2 pb-6">
                {!isMine ? (
                  <>
                    {/* Republier */}
                    <button onClick={handleRepost} disabled={reposting}
                      className="w-full flex items-center gap-4 px-5 py-3.5 transition-all disabled:opacity-50 text-left"
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)' }}>
                        <Repeat2 size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                          Republier {reposting && <span style={{ color: 'var(--text-tertiary)' }}>…</span>}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Partage ce reel sur ton profil avec attribution</p>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)' }}>
                        {fmt(activeRepostCount)}
                      </span>
                    </button>

                    {/* Remixer */}
                    <button onClick={() => { setMoreSheetOpen(false); navigate(`/create/reel?sourceReelId=${activeReel.id}`); }}
                      className="w-full flex items-center gap-4 px-5 py-3.5 transition-all text-left"
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)' }}>
                        <GitMerge size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Remixer</p>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Crée ta propre version de ce reel</p>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)' }}>
                        {fmt(activeRemixCount)}
                      </span>
                    </button>

                    {/* Cable */}
                    <button onClick={handleCable} disabled={cabling}
                      className="w-full flex items-center gap-4 px-5 py-3.5 transition-all disabled:opacity-50 text-left"
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)' }}>
                        <Link2 size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                          Cable {cabling && <span style={{ color: 'var(--text-tertiary)' }}>…</span>}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Invite ce créateur à collaborer avec toi</p>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)' }}>
                        {fmt(activeCableCount)}
                      </span>
                    </button>

                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 20px' }} />

                    {/* Voir le profil */}
                    <button onClick={() => { setMoreSheetOpen(false); if (activeReel.author?.id) navigate(`/user/${encodeId(activeReel.author.id)}`); }}
                      className="w-full flex items-center gap-4 px-5 py-3.5 transition-all text-left"
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                        <User size={18} />
                      </div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Voir le profil</p>
                    </button>

                    {/* Signaler */}
                    <button onClick={() => { setMoreSheetOpen(false); toast.success('Signalement envoyé. Merci !'); }}
                      className="w-full flex items-center gap-4 px-5 py-3.5 transition-all text-left"
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                        <Flag size={18} />
                      </div>
                      <p className="font-semibold text-sm" style={{ color: '#ef4444' }}>Signaler</p>
                    </button>
                  </>
                ) : (
                  /* Owner actions */
                  <>
                    {/* Modifier la description */}
                    <button onClick={() => { setMoreSheetOpen(false); setEditReel(activeReel); setEditCaption(activeReel.caption ?? ''); }}
                      className="w-full flex items-center gap-4 px-5 py-3.5 transition-all text-left"
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                        <Edit3 size={18} />
                      </div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Modifier la description</p>
                    </button>

                    {/* Toggle commentaires */}
                    <button onClick={handleToggleComments} disabled={togglingComments}
                      className="w-full flex items-center gap-4 px-5 py-3.5 transition-all disabled:opacity-50 text-left"
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                        {activeCommentsDisabled ? <MessageSquare size={18} /> : <MessageSquareOff size={18} />}
                      </div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {activeCommentsDisabled ? 'Activer les commentaires' : 'Désactiver les commentaires'}
                      </p>
                    </button>

                    {/* Stats */}
                    <button onClick={() => { setMoreSheetOpen(false); navigate(`/reels/stats/${encodeId(activeReel.id)}`); }}
                      className="w-full flex items-center gap-4 px-5 py-3.5 transition-all text-left"
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                        <BarChart2 size={18} />
                      </div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Stats du reel</p>
                    </button>

                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 20px' }} />

                    {/* Supprimer */}
                    <button onClick={() => { setMoreSheetOpen(false); handleDeleteReel(activeReel); }}
                      className="w-full flex items-center gap-4 px-5 py-3.5 transition-all text-left"
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                        <Trash2 size={18} />
                      </div>
                      <p className="font-semibold text-sm" style={{ color: '#ef4444' }}>Supprimer le reel</p>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {ConfirmDialog}
    </div>
  );
}
