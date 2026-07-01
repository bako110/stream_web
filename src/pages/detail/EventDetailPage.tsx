import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { encodeId, decodeId } from '../../utils/slugId';
import {
  Calendar, MapPin, Globe, Users, Ticket, Heart, MessageCircle,
  Share2, UserPlus, UserCheck, Clock, ArrowLeft, ExternalLink, Send, X,
  ZoomIn, Edit3, Bell, BellOff, SmilePlus, Trash2, Bookmark,
} from 'lucide-react';
import type { Event } from '../../types';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { GuestPreview } from '../../components/ui/GuestPreview';
import { useApi } from '../../hooks/useApi';
import { Avatar, VerifiedBadge } from '../../components/ui/Avatar';
import { Spinner, PageLoader } from '../../components/ui/Spinner';
import { RichText } from '../../components/ui/RichText';
import { TicketPaymentModal, type TicketTier } from '../../components/ui/TicketPaymentModal';
import { Lightbox } from '../../components/ui/Lightbox';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPE_LABELS: Record<string, string> = {
  concert: 'Concert', birthday: 'Anniversaire', festival: 'Festival',
  conference: 'Conférence', sport: 'Sport', theater: 'Théâtre',
  exhibition: 'Exposition', other: 'Autre',
};
const TYPE_COLORS: Record<string, string> = {
  concert: '#7B3FF2', festival: '#7B3FF2', sport: '#7B3FF2',
  conference: '#7B3FF2', theater: '#7B3FF2', exhibition: '#06B6D4',
  birthday: '#7B3FF2', other: '#6B7280',
};


const QUICK_EMOJIS = ['❤️', '🔥', '👏', '😂', '😍', '🎉'];

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
}

function CommentsModal({ targetId, onClose }: { targetId: string; onClose: () => void }) {
  const { user: me } = useAuthStore();
  const [comments, setComments]   = useState<any[]>([]);
  const [input,    setInput]      = useState('');
  const [sending,  setSending]    = useState(false);
  const [loading,  setLoading]    = useState(true);
  const [visible,  setVisible]    = useState(false);
  const [liked,    setLiked]      = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    setLoading(true);
    apiClient.get<any>(`${Endpoints.social.comments}?event_id=${targetId}&limit=50`)
      .then(res => {
        const raw = res.data;
        const list: any[] = Array.isArray(raw) ? raw : raw?.items ?? raw?.data ?? raw?.comments ?? [];
        setComments(list);
        const counts: Record<string, number> = {};
        list.forEach(c => { counts[c.id] = c.likes_count ?? 0; });
        setLikeCounts(counts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    setTimeout(() => inputRef.current?.focus(), 350);
  }, [targetId]);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  async function submit(text?: string) {
    const body = (text ?? input).trim();
    if (!body || sending) return;
    setInput('');
    setSending(true);
    try {
      const res = await apiClient.post<any>(Endpoints.social.comments, { event_id: targetId, body });
      const newComment = res.data;
      setComments(prev => [...prev, newComment]);
      setLikeCounts(prev => ({ ...prev, [newComment.id]: 0 }));
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 50);
    } catch { setInput(body); }
    finally { setSending(false); }
  }

  function toggleLike(id: string) {
    setLiked(prev => ({ ...prev, [id]: !prev[id] }));
    setLikeCounts(prev => ({ ...prev, [id]: (prev[id] ?? 0) + (liked[id] ? -1 : 1) }));
  }

  async function deleteComment(id: string) {
    setDeletingId(id);
    try {
      await apiClient.delete(`${Endpoints.social.comments}/${id}`);
      setComments(prev => prev.filter(c => c.id !== id));
    } catch {}
    finally { setDeletingId(null); }
  }

  const sheetStyle: React.CSSProperties = {
    background: 'var(--surface)',
    borderRadius: '1.5rem 1.5rem 0 0',
    maxHeight: '85vh',
    maxWidth: '600px',
    marginLeft: 'auto',
    marginRight: 'auto',
    boxShadow: '0 -24px 80px rgba(0,0,0,0.4)',
    transform: visible ? 'translateY(0)' : 'translateY(100%)',
    transition: 'transform 0.28s cubic-bezier(0.32,0.72,0,1)',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(6px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.28s ease',
        }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50" style={sheetStyle}>

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 cursor-pointer shrink-0" onClick={handleClose}>
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <MessageCircle size={18} style={{ color: 'var(--primary)' }} />
            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
              Commentaires
            </h3>
            {!loading && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'var(--primary)1a', color: 'var(--primary)' }}>
                {comments.length}
              </span>
            )}
          </div>
          <button onClick={handleClose}
            className="p-2 rounded-xl transition-all"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <X size={18} />
          </button>
        </div>

        {/* Comment list */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 min-h-0"
          style={{ scrollbarWidth: 'thin' }}>
          {loading ? (
            <div className="flex flex-col gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-full shrink-0" style={{ background: 'var(--bg-secondary)' }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 rounded-full w-1/3" style={{ background: 'var(--bg-secondary)' }} />
                    <div className="h-3 rounded-full w-2/3" style={{ background: 'var(--bg-secondary)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'var(--bg-secondary)' }}>
                <MessageCircle size={28} style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-tertiary)' }}>
                Aucun commentaire
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)', opacity: 0.6 }}>
                Soyez le premier à réagir !
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((c, i) => {
                const isOwn = me?.id === (c.author?.id ?? c.user_id);
                const likeCount = likeCounts[c.id] ?? 0;
                return (
                  <div key={c.id ?? i}
                    className="flex gap-3 group"
                    style={{ animation: `fadeSlideUp 0.2s ease both`, animationDelay: `${Math.min(i * 30, 200)}ms` }}>
                    <Avatar src={c.author?.avatar_url} name={c.author?.display_name ?? c.author?.username ?? '?'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="rounded-2xl px-3.5 py-2.5 inline-block max-w-full"
                        style={{ background: 'var(--bg-secondary)' }}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                            {c.author?.display_name ?? c.author?.username ?? 'Utilisateur'}
                          </span>
                          {c.author?.is_verified && <VerifiedBadge size={12} />}
                          {c.created_at && (
                            <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                              {timeAgo(c.created_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {c.body ?? c.content}
                        </p>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-3 mt-1.5 px-1">
                        <button
                          onClick={() => toggleLike(c.id)}
                          className="flex items-center gap-1 text-xs transition-all"
                          style={{ color: liked[c.id] ? '#f43f5e' : 'var(--text-tertiary)' }}>
                          <Heart size={13} fill={liked[c.id] ? '#f43f5e' : 'none'} />
                          {likeCount > 0 && <span>{likeCount}</span>}
                        </button>
                        <button
                          onClick={() => setInput(`@${c.author?.username ?? c.author?.display_name ?? ''} `)}
                          className="text-xs transition-all"
                          style={{ color: 'var(--text-tertiary)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                          Répondre
                        </button>
                        {isOwn && (
                          <button
                            onClick={() => deleteComment(c.id)}
                            disabled={deletingId === c.id}
                            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg"
                            style={{ color: 'var(--error, #ef4444)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick emoji bar */}
        <div className="px-4 pt-2 flex gap-2 shrink-0">
          {QUICK_EMOJIS.map(e => (
            <button key={e}
              onClick={() => submit(e)}
              className="text-lg rounded-xl px-2 py-1 transition-all hover:scale-110 active:scale-95"
              style={{ background: 'var(--bg-secondary)' }}>
              {e}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 py-3 flex gap-3 items-end"
          style={{
            borderTop: '1px solid var(--border)',
            marginTop: 8,
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          }}>
          <Avatar src={me?.avatar_url} name={me?.display_name ?? me?.username ?? '?'} size="sm" />
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="Écrire un commentaire…"
              rows={1}
              className="w-full text-sm resize-none rounded-2xl px-4 py-2.5 pr-10 outline-none"
              style={{
                background: 'var(--bg-secondary)',
                border: '1.5px solid var(--border)',
                color: 'var(--text-primary)',
                lineHeight: '1.5',
                maxHeight: 120,
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
            <button
              onClick={() => submit()}
              disabled={!input.trim() || sending}
              className="absolute right-2.5 bottom-2.5 p-1.5 rounded-xl transition-all disabled:opacity-30"
              style={{
                background: input.trim() ? 'var(--primary)' : 'transparent',
                color: input.trim() ? '#fff' : 'var(--primary)',
              }}>
              {sending ? <Spinner size="sm" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

/* ── Shared tokens ─────────────────────────────────────────────────────────── */
const CARD: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 };
const ICON_BOX = (bg: string): React.CSSProperties => ({
  width: 32, height: 32, borderRadius: 10, background: bg,
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
});

/* ── Mini event card ─────────────────────────────────────────────────────────── */
function MiniEventCard({ ev }: { ev: Event }) {
  const navigate = useNavigate();
  const color = TYPE_COLORS[ev.event_type] ?? '#7B3FF2';
  const thumb = ev.thumbnail_url ?? ev.banner_url;
  return (
    <button onClick={() => navigate(`/events/${encodeId(ev.id)}`)}
      className="flex gap-3 p-3 rounded-xl w-full text-left transition-colors hover:bg-[var(--bg-secondary)]">
      <div className="shrink-0 rounded-xl overflow-hidden"
        style={{ width: 56, height: 56, background: `${color}18` }}>
        {thumb
          ? <img src={thumb} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center">
              <Calendar size={18} style={{ color }} />
            </div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug line-clamp-2"
          style={{ color: 'var(--text-primary)' }}>{ev.title}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {format(new Date(ev.starts_at), 'd MMM yyyy', { locale: fr })}
        </p>
        {ev.access_type === 'free' && (
          <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
            Gratuit
          </span>
        )}
      </div>
    </button>
  );
}

export default function EventDetailPage() {
  const { id: slug }  = useParams<{ id: string }>();
  const id             = decodeId(slug!);
  const navigate       = useNavigate();
  const { user: me } = useAuthStore();

  const { data: event, loading } = useApi<Event>(
    () => apiClient.get<Event>(Endpoints.events.byId(id!)), [id]
  );

  const [liked,        setLiked]        = useState(false);
  const [likeCount,    setLikeCount]    = useState(0);
  const [shareCount,   setShareCount]   = useState(0);
  const [favId,        setFavId]        = useState<string | null>(null);
  const [savingFav,    setSavingFav]    = useState(false);
  const [isOwner,      setIsOwner]      = useState(false);
  const [following,    setFollowing]    = useState(false);
  const [reminder,     setReminder]     = useState(false);
  const [remindLoading,setRemindLoading]= useState(false);
  const [showComments, setShowComments] = useState(false);
  const [shareOk,      setShareOk]      = useState(false);
  const [lightbox,     setLightbox]     = useState<number | null>(null);
  const [paySheet,     setPaySheet]     = useState(false);
  const [selectedTier, setSelectedTier] = useState<TicketTier['key']>('simple');
  const [otherEvents,  setOtherEvents]  = useState<Event[]>([]);

  // Charge les reactions et l'etat follow au montage — meme pattern que le mobile
  useEffect(() => {
    if (!id) return;
    setLiked(false);
    setLikeCount(0);
    setFollowing(false);
    setIsOwner(false);

    apiClient.get<any>(`${Endpoints.social.reactionCounts}?event_id=${id}`)
      .then(r => setLikeCount(r.data?.likes ?? r.data?.like ?? 0))
      .catch(() => {});

    apiClient.get<any>(`${Endpoints.social.myReaction}?event_id=${id}`)
      .then(r => setLiked(r.data?.reaction_type === 'like'))
      .catch(() => {});

    setShareCount(0);
    apiClient.get<any>(`${Endpoints.social.shareCounts}?event_id=${id}`)
      .then(r => setShareCount(r.data?.shares ?? 0))
      .catch(() => {});
  }, [id]);

  // Detecte si l'utilisateur est l'organisateur + etat rappel
  useEffect(() => {
    if (!event || !me) return;
    const owner = event.organizer?.id === me.id;
    setIsOwner(owner);
    if (event.organizer?.id && !owner) {
      apiClient.get<any>(Endpoints.users.publicProfile(event.organizer.id))
        .then(r => setFollowing(r.data?.is_followed ?? false))
        .catch(() => {});
    }
    if (!owner && id) {
      apiClient.get<any>(Endpoints.events.remind(id))
        .then(r => setReminder(r.data?.active === true))
        .catch(() => {});
    }
  }, [event, me, id]);

  // Charger autres événements de l'organisateur
  useEffect(() => {
    if (!event?.organizer?.id) return;
    apiClient.get<any>(Endpoints.events.byUser(event.organizer.id))
      .then(res => {
        const raw = res.data;
        const all = Array.isArray(raw) ? raw : raw?.items ?? raw?.data ?? [];
        setOtherEvents(all.filter((e: Event) => e.id !== id).slice(0, 5));
      })
      .catch(() => {});
  }, [event?.organizer?.id, id]);

  async function handleSaveFav() {
    if (savingFav || !event) return;
    setSavingFav(true);
    try {
      if (favId) {
        await apiClient.delete(Endpoints.favorites.remove(favId));
        setFavId(null);
      } else {
        const res = await apiClient.post<{ id: string }>(Endpoints.favorites.add, { target_type: 'event', target_id: event.id });
        setFavId((res.data as any)?.id ?? (res.data as any)?.favorite?.id ?? null);
      }
    } catch {}
    finally { setSavingFav(false); }
  }

  const toggleLike = useCallback(async () => {
    // Lit l'etat courant via le setter fonctionnel pour eviter la closure stale
    let prevLiked = false;
    setLiked(v => { prevLiked = v; return !v; });
    setLikeCount(v => prevLiked ? Math.max(0, v - 1) : v + 1);
    try {
      await apiClient.post(Endpoints.social.toggleReaction, {
        event_id: id, reaction_type: 'like',
      });
    } catch {
      // Revert
      setLiked(prevLiked);
      setLikeCount(v => prevLiked ? v + 1 : Math.max(0, v - 1));
    }
  }, [id]);

  const toggleFollow = useCallback(async () => {
    if (!event?.organizer?.id) return;
    setFollowing(v => !v);
    try {
      await apiClient.post(Endpoints.users.follow(event.organizer.id));
    } catch { setFollowing(v => !v); }
  }, [event?.organizer?.id]);

  const toggleReminder = useCallback(async () => {
    if (!id || remindLoading) return;
    setRemindLoading(true);
    try {
      const r = await apiClient.post<any>(Endpoints.events.remind(id));
      setReminder(r.data?.active === true);
      import('react-hot-toast').then(({ default: toast }) => {
        toast.success(r.data?.active ? 'Rappel activé !' : 'Rappel désactivé');
      });
    } catch { }
    finally { setRemindLoading(false); }
  }, [id, remindLoading]);

  const share = useCallback(async () => {
    const url = `${window.location.origin}/events/${encodeId(id!)}`;
    try {
      if (navigator.share) await navigator.share({ title: event?.title, url });
      else await navigator.clipboard.writeText(url);
      setShareOk(true);
      setTimeout(() => setShareOk(false), 2000);
      setShareCount(c => c + 1);
      apiClient.post(Endpoints.social.share, { platform: 'external', event_id: id })
        .catch(() => setShareCount(c => Math.max(0, c - 1)));
    } catch { /* ignore */ }
  }, [event?.title, id]);


  if (loading) return <PageLoader />;
  if (!event)  return <div className="p-6" style={{ color: 'var(--text-secondary)' }}>Événement introuvable.</div>;

  if (!me) {
    const minPrice = [event.ticket_price, event.ticket_price_vip, event.ticket_price_vvip]
      .filter((p): p is number => p != null && p > 0)
      .sort((a, b) => a - b)[0] ?? null;
    return (
      <GuestPreview
        type="event"
        thumbnail={event.thumbnail_url ?? event.banner_url ?? null}
        title={event.title}
        body={(event as any).description}
        author={(event as any).organizer ?? (event as any).author}
        date={event.starts_at}
        location={(event as any).location ?? (event as any).venue}
        attendees={(event as any).attendees_count ?? (event as any).going_count}
        ticketPrice={minPrice}
        likeCount={event.like_count}
        commentCount={event.comment_count}
      />
    );
  }

  const ev    = event;
  const color = TYPE_COLORS[ev.event_type] ?? '#7B3FF2';
  const label = TYPE_LABELS[ev.event_type] ?? ev.event_type;

  const allTiers = ([
    { key: 'simple' as const, label: 'Simple', color: '#7B3FF2', price: ev.ticket_price ?? 0,       sub: 'Accès standard' },
    { key: 'vip'    as const, label: 'VIP',    color: '#7B3FF2', price: ev.ticket_price_vip ?? 0,   sub: 'Accès prioritaire' },
    { key: 'vvip'   as const, label: 'VVIP',   color: '#7B3FF2', price: ev.ticket_price_vvip ?? 0,  sub: 'Expérience premium' },
    { key: 'vvvip'  as const, label: 'VVVIP',  color: '#EF4444', price: ev.ticket_price_vvvip ?? 0, sub: 'All-inclusive' },
  ] as TicketTier[]).filter(t => t.price > 0);
  const tierColor = allTiers.find(t => t.key === selectedTier)?.color ?? '#7B3FF2';
  const safeTiers = allTiers.length > 0
    ? allTiers
    : [{ key: 'simple' as const, label: 'Simple', color: '#7B3FF2', price: ev.ticket_price ?? 0, sub: 'Accès standard' }];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Bouton retour (même design que les autres pages) ── */}
        <button onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 mb-6 text-sm font-semibold transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
          <ArrowLeft size={16} /> Retour
        </button>

        {/* ── Banner ── */}
        <div className="relative rounded-2xl overflow-hidden mb-6"
          style={{ aspectRatio: '21/8', minHeight: 160, background: 'var(--bg-secondary)' }}>
          {ev.banner_url || ev.thumbnail_url
            ? <img src={ev.banner_url ?? ev.thumbnail_url ?? ''} className="w-full h-full object-cover cursor-zoom-in" alt={ev.title}
                onClick={() => setLightbox(ev.gallery_urls?.length ? ev.gallery_urls.length : 0)} />
            : <div className="w-full h-full flex items-center justify-center">
                <Calendar size={48} style={{ color, opacity: 0.3 }} />
              </div>}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 55%)' }} />
          <span className="absolute top-4 left-4 text-xs font-bold px-3 py-1.5 rounded-full text-white"
            style={{ background: color }}>
            {label}
          </span>
          {ev.access_type === 'free' && (
            <span className="absolute top-4 right-4 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
              Gratuit
            </span>
          )}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
            <h1 className="text-2xl font-black text-white leading-tight"
              style={{ textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>
              {ev.title}
            </h1>
            <p className="text-sm mt-1 flex items-center gap-1.5"
              style={{ color: 'rgba(255,255,255,0.7)' }}>
              <Clock size={12} />
              {format(new Date(ev.starts_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
            </p>
          </div>
        </div>

        {/* ── Grid 2 colonnes ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6 items-start">

          {/* ═══ Colonne gauche ═══ */}
          <div className="flex flex-col gap-4">

            {/* Barre d'actions */}
            <div style={{ ...CARD, padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {/* Like */}
              <button onClick={toggleLike}
                className="flex items-center justify-center gap-1.5 w-10 h-10 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-xl text-sm font-semibold transition-colors"
                style={{
                  background: liked ? 'rgba(240,62,62,0.1)' : 'var(--bg-secondary)',
                  color: liked ? '#f03e3e' : 'var(--text-secondary)',
                  border: `1px solid ${liked ? 'rgba(240,62,62,0.3)' : 'var(--border)'}`,
                }}>
                <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
                {likeCount > 0 && <span>{likeCount}</span>}
                <span className="hidden sm:inline">J'aime</span>
              </button>
              {/* Commenter */}
              <button onClick={() => setShowComments(v => !v)}
                className="flex items-center justify-center gap-1.5 w-10 h-10 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-xl text-sm font-semibold transition-colors"
                style={{
                  background: showComments ? 'rgba(123,63,242,0.1)' : 'var(--bg-secondary)',
                  color: showComments ? 'var(--primary)' : 'var(--text-secondary)',
                  border: `1px solid ${showComments ? 'rgba(123,63,242,0.3)' : 'var(--border)'}`,
                }}>
                <MessageCircle size={15} />
                {event.comment_count > 0 && <span>{event.comment_count}</span>}
                <span className="hidden sm:inline">Commenter</span>
              </button>
              {/* Partager */}
              <button onClick={share}
                className="flex items-center justify-center gap-1.5 w-10 h-10 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-xl text-sm font-semibold transition-colors"
                style={{
                  background: shareOk ? 'rgba(34,197,94,0.1)' : 'var(--bg-secondary)',
                  color: shareOk ? '#22c55e' : 'var(--text-secondary)',
                  border: `1px solid ${shareOk ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                }}>
                <Share2 size={15} />
                {shareCount > 0 && <span>{shareCount}</span>}
                <span className="hidden sm:inline">{shareOk ? 'Copié !' : 'Partager'}</span>
              </button>
              {/* Favoris */}
              <button onClick={handleSaveFav} disabled={savingFav}
                className="flex items-center justify-center gap-1.5 w-10 h-10 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-xl text-sm font-semibold transition-colors"
                style={{
                  background: favId ? 'rgba(123,63,242,0.1)' : 'var(--bg-secondary)',
                  color: favId ? 'var(--primary)' : 'var(--text-secondary)',
                  border: `1px solid ${favId ? 'rgba(123,63,242,0.3)' : 'var(--border)'}`,
                  opacity: savingFav ? 0.6 : 1,
                }}>
                <Bookmark size={15} fill={favId ? 'currentColor' : 'none'} />
                <span className="hidden sm:inline">{favId ? 'Sauvegardé' : 'Sauvegarder'}</span>
              </button>
              {/* Rappel */}
              {!isOwner && (
                <button onClick={toggleReminder} disabled={remindLoading}
                  className="flex items-center justify-center gap-1.5 w-10 h-10 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-xl text-sm font-semibold transition-colors"
                  style={{
                    background: reminder ? 'rgba(123,63,242,0.1)' : 'var(--bg-secondary)',
                    color: reminder ? 'var(--primary)' : 'var(--text-secondary)',
                    border: `1px solid ${reminder ? 'rgba(123,63,242,0.3)' : 'var(--border)'}`,
                  }}>
                  {remindLoading ? <Spinner size="sm" /> : reminder ? <BellOff size={15} /> : <Bell size={15} />}
                  <span className="hidden sm:inline">{reminder ? 'Rappel actif' : 'Me rappeler'}</span>
                </button>
              )}
              {/* Boutons owner à droite */}
              {isOwner ? (
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => navigate(`/events/${slug}/attendees`)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--bg-secondary)', color: '#10B981', border: '1px solid var(--border)' }}>
                    <Users size={14} /> Inscrits
                  </button>
                  <button onClick={() => navigate(`/events/${slug}/edit`)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--primary)', border: '1px solid var(--border)' }}>
                    <Edit3 size={14} /> Modifier
                  </button>
                </div>
              ) : ev.organizer && (
                <button onClick={toggleFollow}
                  className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
                  style={{
                    background: following ? 'rgba(123,63,242,0.1)' : 'var(--primary)',
                    color: following ? 'var(--primary)' : '#fff',
                    border: `1px solid ${following ? 'rgba(123,63,242,0.3)' : 'transparent'}`,
                  }}>
                  {following ? <UserCheck size={14} /> : <UserPlus size={14} />}
                  {following ? 'Suivi' : 'Suivre'}
                </button>
              )}
            </div>

            {/* Informations */}
            <div style={{ ...CARD, padding: 20 }}>
              <p className="font-bold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>Informations</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Date */}
                <div className="flex items-start gap-3">
                  <div style={ICON_BOX(`${color}18`)}>
                    <Calendar size={14} style={{ color }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {format(new Date(ev.starts_at), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                    {ev.ends_at && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                        Jusqu'à {format(new Date(ev.ends_at), 'HH:mm')}
                      </p>
                    )}
                  </div>
                </div>
                {/* Lieu */}
                {ev.is_online ? (
                  <div className="flex items-center gap-3">
                    <div style={ICON_BOX('rgba(34,197,94,0.1)')}>
                      <Globe size={14} style={{ color: '#22c55e' }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>En ligne</p>
                      {ev.online_url && (
                        <a href={ev.online_url} target="_blank" rel="noreferrer"
                          className="text-xs flex items-center gap-1 mt-0.5"
                          style={{ color: 'var(--primary)' }}>
                          Rejoindre <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                ) : (ev.venue_city || ev.venue_name) && (
                  <div className="flex items-start gap-3">
                    <div style={ICON_BOX('rgba(239,68,68,0.1)')}>
                      <MapPin size={14} style={{ color: '#ef4444' }} />
                    </div>
                    <div>
                      {ev.venue_name && (
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ev.venue_name}</p>
                      )}
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {[ev.venue_address, ev.venue_city, ev.venue_country].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                )}
                {/* Participants */}
                {ev.max_attendees != null && (
                  <div className="flex items-center gap-3">
                    <div style={ICON_BOX('rgba(123,63,242,0.1)')}>
                      <Users size={14} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {ev.current_attendees ?? 0}
                        </span> / {ev.max_attendees} participants
                      </p>
                      <div className="mt-1.5 rounded-full overflow-hidden" style={{ height: 4, background: 'var(--bg-secondary)' }}>
                        <div className="h-full rounded-full"
                          style={{ width: `${Math.min(100, ((ev.current_attendees ?? 0) / ev.max_attendees) * 100)}%`, background: color }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {ev.description && (
              <div style={{ ...CARD, padding: 20 }}>
                <p className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>À propos</p>
                <RichText text={ev.description} limit={400}
                  style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }} />
              </div>
            )}

            {/* Galerie */}
            {ev.gallery_urls && ev.gallery_urls.length > 0 && (
              <div style={{ ...CARD, padding: 20 }}>
                <p className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Galerie</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {ev.gallery_urls.map((url, i) => (
                    <button key={i} onClick={() => setLightbox((ev.banner_url || ev.thumbnail_url) ? i + 1 : i)}
                      className="relative group rounded-xl overflow-hidden"
                      style={{ aspectRatio: '1', background: 'var(--bg-secondary)' }}>
                      <img src={url} className="w-full h-full object-cover" alt=""
                        style={{ transition: 'transform 0.3s' }}
                        onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                        onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')} />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(0,0,0,0.35)' }}>
                        <ZoomIn size={20} color="#fff" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ═══ Colonne droite ═══ */}
          <div className="flex flex-col gap-4">

            {/* Card organisateur */}
            {ev.organizer && (
              <div style={{ ...CARD, padding: 20, textAlign: 'center' }}>
                <button onClick={() => ev.organizer?.id && navigate(`/user/${encodeId(ev.organizer.id)}`)}
                  className="flex flex-col items-center gap-3 w-full">
                  <Avatar src={ev.organizer.avatar_url}
                    name={ev.organizer.display_name ?? ev.organizer.username ?? '?'}
                    size="xl" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide mb-0.5"
                      style={{ color: 'var(--text-tertiary)' }}>Organisé par</p>
                    <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {ev.organizer.display_name ?? ev.organizer.username}
                    </p>
                  </div>
                </button>
                <button onClick={() => ev.organizer?.id && navigate(`/user/${encodeId(ev.organizer.id)}`)}
                  className="w-full mt-4 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'var(--primary)' }}>
                  Voir le profil
                </button>
              </div>
            )}

            {/* CTA billet */}
            {ev.status === 'published' && (
              <div style={{ ...CARD, padding: 20 }}>
                <div className="mb-4">
                  <p className="text-xs font-medium uppercase tracking-wide mb-1"
                    style={{ color: 'var(--text-tertiary)' }}>Accès</p>
                  <p className="font-black text-xl" style={{ color: 'var(--text-primary)' }}>
                    {ev.access_type === 'free'   ? 'Gratuit'
                    : ev.access_type === 'ticket' ? `À partir de ${ev.ticket_price ?? '?'} €`
                    : 'Sur invitation'}
                  </p>
                </div>
                {ev.access_type === 'ticket' && allTiers.length > 1 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {allTiers.map(tier => (
                      <button key={tier.key} onClick={() => setSelectedTier(tier.key)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{
                          background: selectedTier === tier.key ? `${tier.color}18` : 'var(--bg-secondary)',
                          border: `1.5px solid ${selectedTier === tier.key ? tier.color : 'var(--border)'}`,
                          color: selectedTier === tier.key ? tier.color : 'var(--text-secondary)',
                        }}>
                        {tier.label} · {tier.price} €
                      </button>
                    ))}
                  </div>
                )}
                {ev.access_type === 'ticket' && (
                  <button onClick={() => setPaySheet(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white"
                    style={{ background: tierColor }}>
                    <Ticket size={14} /> Acheter un billet
                  </button>
                )}
                {ev.access_type === 'free' && (
                  <p className="text-center text-sm font-semibold py-1" style={{ color: '#22c55e' }}>
                    Entrée libre
                  </p>
                )}
              </div>
            )}

            {/* Autres événements */}
            {otherEvents.length > 0 && (
              <div style={{ ...CARD, overflow: 'hidden' }}>
                <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
                  <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                    Autres événements
                  </p>
                </div>
                <div className="p-2">
                  {otherEvents.map(e => <MiniEventCard key={e.id} ev={e} />)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showComments && <CommentsModal targetId={id!} onClose={() => setShowComments(false)} />}
      {lightbox !== null && (() => {
        const bannerUrl = ev.banner_url ?? ev.thumbnail_url;
        const allImgs = [
          ...(bannerUrl ? [bannerUrl] : []),
          ...(ev.gallery_urls ?? []),
        ];
        return allImgs.length > 0
          ? <Lightbox urls={allImgs} index={Math.min(lightbox, allImgs.length - 1)} onClose={() => setLightbox(null)} />
          : null;
      })()}

      <TicketPaymentModal
        open={paySheet} onClose={() => setPaySheet(false)} onSuccess={() => setPaySheet(false)}
        itemId={ev.id} title={ev.title} thumbnail={ev.thumbnail_url}
        kind="event" accessType={ev.access_type as any}
        tiers={safeTiers} selectedTierKey={selectedTier}
        onBuy={tierKey => apiClient.post(Endpoints.events.buyTicket(ev.id), tierKey ? { tier: tierKey } : undefined).then(r => r.data)}
      />
    </div>
  );
}
