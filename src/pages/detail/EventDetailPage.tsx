import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { encodeId, decodeId } from '../../utils/slugId';
import {
  Calendar, MapPin, Globe, Users, Ticket, Heart, MessageCircle,
  Share2, UserPlus, UserCheck, Clock, ArrowLeft, ExternalLink, Send, X,
  ChevronLeft, ChevronRight, ZoomIn, Edit3, Bell, BellOff,
} from 'lucide-react';
import type { Event } from '../../types';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner, PageLoader } from '../../components/ui/Spinner';
import { ExpandableText } from '../../components/ui/ExpandableText';
import { TicketPaymentModal, type TicketTier } from '../../components/ui/TicketPaymentModal';
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

function LightboxModal({ urls, index, onClose }: { urls: string[]; index: number; onClose: () => void }) {
  const [current, setCurrent] = useState(index);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowRight') setCurrent(c => (c + 1) % urls.length);
      if (e.key === 'ArrowLeft')  setCurrent(c => (c - 1 + urls.length) % urls.length);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [urls.length, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>

      {/* Close */}
      <button className="absolute top-4 right-4 p-2 rounded-full z-10 transition-all"
        style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
        onClick={onClose}>
        <X size={20} />
      </button>

      {/* Counter */}
      {urls.length > 1 && (
        <span className="absolute top-4 left-1/2 -translate-x-1/2 text-sm font-semibold px-3 py-1 rounded-full"
          style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}>
          {current + 1} / {urls.length}
        </span>
      )}

      {/* Prev */}
      {urls.length > 1 && (
        <button className="absolute left-3 p-2 rounded-full transition-all z-10"
          style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
          onClick={e => { e.stopPropagation(); setCurrent(c => (c - 1 + urls.length) % urls.length); }}>
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Image */}
      <img
        src={urls[current]}
        alt=""
        className="max-w-[90vw] max-h-[85vh] rounded-2xl object-contain shadow-2xl"
        onClick={e => e.stopPropagation()}
      />

      {/* Next */}
      {urls.length > 1 && (
        <button className="absolute right-3 p-2 rounded-full transition-all z-10"
          style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
          onClick={e => { e.stopPropagation(); setCurrent(c => (c + 1) % urls.length); }}>
          <ChevronRight size={24} />
        </button>
      )}

      {/* Thumbnails strip */}
      {urls.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2"
          onClick={e => e.stopPropagation()}>
          {urls.map((u, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className="w-12 h-12 rounded-xl overflow-hidden transition-all shrink-0"
              style={{
                border: `2px solid ${i === current ? '#fff' : 'transparent'}`,
                opacity: i === current ? 1 : 0.5,
              }}>
              <img src={u} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentsModal({ targetId, onClose }: { targetId: string; onClose: () => void }) {
  const { user: me } = useAuthStore();
  const [comments, setComments] = useState<any[]>([]);
  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    apiClient.get<any>(`${Endpoints.social.comments}?event_id=${targetId}&limit=50`)
      .then(res => {
        const raw = res.data;
        setComments(Array.isArray(raw) ? raw : raw?.items ?? raw?.data ?? raw?.comments ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [targetId]);

  async function submit() {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      const res = await apiClient.post<any>(Endpoints.social.comments, { event_id: targetId, body: text });
      setComments(prev => [...prev, res.data]);
    } catch { setInput(text); }
    finally { setSending(false); }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          borderRadius: '1.5rem 1.5rem 0 0',
          maxHeight: '80vh',
          boxShadow: '0 -16px 64px rgba(0,0,0,0.3)',
        }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Commentaires</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl transition-all"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <X size={18} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {loading ? (
            <PageLoader />
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 opacity-50">
              <MessageCircle size={28} style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Aucun commentaire — soyez le premier !</p>
            </div>
          ) : comments.map((c, i) => (
            <div key={c.id ?? i} className="flex gap-3">
              <Avatar src={c.author?.avatar_url} name={c.author?.display_name ?? c.author?.username ?? '?'} size="sm" />
              <div className="flex-1 rounded-2xl px-3.5 py-2.5" style={{ background: 'var(--bg-secondary)' }}>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                  {c.author?.display_name ?? c.author?.username ?? 'Utilisateur'}
                </p>
                <p className="text-sm mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {c.body ?? c.content}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 py-3 flex gap-2 items-center"
          style={{ borderTop: '1px solid var(--border)', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <Avatar src={me?.avatar_url} name={me?.display_name ?? me?.username ?? '?'} size="sm" />
          <div className="flex-1 relative">
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="Écrire un commentaire…"
              className="input text-sm w-full pr-10" />
            <button onClick={submit} disabled={!input.trim() || sending}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all disabled:opacity-30"
              style={{ color: 'var(--primary)' }}>
              {sending ? <Spinner size="sm" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function EventDetailPage() {
  const { id: slug }  = useParams<{ id: string }>();
  const id             = decodeId(slug!);
  const navigate       = useNavigate();
  const { user: me }   = useAuthStore();

  const { data: event, loading } = useApi<Event>(
    () => apiClient.get<Event>(Endpoints.events.byId(id!)), [id]
  );

  const [liked,        setLiked]        = useState(false);
  const [likeCount,    setLikeCount]    = useState(0);
  const [isOwner,      setIsOwner]      = useState(false);
  const [following,    setFollowing]    = useState(false);
  const [reminder,     setReminder]     = useState(false);
  const [remindLoading,setRemindLoading]= useState(false);
  const [showComments, setShowComments] = useState(false);
  const [shareOk,      setShareOk]      = useState(false);
  const [lightbox,     setLightbox]     = useState<number | null>(null);
  const [paySheet,     setPaySheet]     = useState(false);
  const [selectedTier, setSelectedTier] = useState<TicketTier['key']>('simple');

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
  }, [id]);

  // Detecte si l'utilisateur est l'organisateur + etat rappel
  useEffect(() => {
    if (!event || !me) return;
    const owner = event.organizer?.id === me.id;
    setIsOwner(owner);
    // Verifie si l'utilisateur suit deja l'organisateur
    if (event.organizer?.id && !owner) {
      apiClient.get<any>(Endpoints.users.publicProfile(event.organizer.id))
        .then(r => setFollowing(r.data?.is_followed ?? false))
        .catch(() => {});
    }
    // Charge l'etat rappel (seulement si non-organisateur)
    if (!owner && id) {
      apiClient.get<any>(Endpoints.events.remind(id))
        .then(r => setReminder(r.data?.active === true))
        .catch(() => {});
    }
  }, [event, me, id]);

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
    } catch { /* ignore */ }
  }, [event?.title, id]);


  if (loading) return <PageLoader />;
  if (!event)  return <div className="p-6" style={{ color: 'var(--text-secondary)' }}>Événement introuvable.</div>;

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
    <div className="max-w-3xl mx-auto pb-16">
      {/* Back */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 px-4 py-4 text-sm transition-all"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={ev2 => (ev2.currentTarget.style.color = 'var(--primary)')}
        onMouseLeave={ev2 => (ev2.currentTarget.style.color = 'var(--text-secondary)')}>
        <ArrowLeft size={16} /> Retour
      </button>

      {/* Hero */}
      <div className="relative overflow-hidden mx-4 rounded-2xl" style={{ aspectRatio: '16/9', background: 'var(--bg-tertiary)' }}>
        {ev.banner_url || ev.thumbnail_url
          ? <img src={ev.banner_url ?? ev.thumbnail_url ?? ''} className="w-full h-full object-cover" alt={ev.title} />
          : <div className="w-full h-full flex items-center justify-center">
              <Calendar size={56} style={{ color, opacity: 0.4 }} />
            </div>
        }
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />

        {/* Badges */}
        <span className="absolute top-4 left-4 text-xs font-bold px-3 py-1.5 rounded-full text-white"
          style={{ background: color }}>
          {label}
        </span>
        {ev.access_type === 'free' && (
          <span className="absolute top-4 right-4 text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(34,197,94,0.25)', color: '#22c55e', border: '1px solid #22c55e40' }}>
            Gratuit
          </span>
        )}

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h1 className="text-2xl font-black text-white leading-tight" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
            {ev.title}
          </h1>
          <div className="flex items-center gap-2 mt-2 text-white/70 text-sm">
            <Clock size={12} />
            {format(new Date(ev.starts_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <button onClick={toggleLike}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: liked ? 'rgba(240,62,62,0.12)' : 'var(--bg-secondary)',
            color: liked ? '#f03e3e' : 'var(--text-secondary)',
            border: `1px solid ${liked ? '#f03e3e40' : 'var(--border)'}`,
          }}>
          <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
          {likeCount > 0 && <span>{likeCount}</span>}
          <span className="hidden sm:inline">J'aime</span>
        </button>

        <button onClick={() => setShowComments(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: showComments ? 'rgba(123,63,242,0.12)' : 'var(--bg-secondary)',
            color: showComments ? 'var(--primary)' : 'var(--text-secondary)',
            border: `1px solid ${showComments ? 'rgba(123,63,242,0.3)' : 'var(--border)'}`,
          }}>
          <MessageCircle size={16} />
          <span className="hidden sm:inline">Commenter</span>
        </button>

        <button onClick={share}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: shareOk ? 'rgba(34,197,94,0.12)' : 'var(--bg-secondary)',
            color: shareOk ? '#22c55e' : 'var(--text-secondary)',
            border: `1px solid ${shareOk ? '#22c55e40' : 'var(--border)'}`,
          }}>
          <Share2 size={16} />
          <span className="hidden sm:inline">{shareOk ? 'Copié !' : 'Partager'}</span>
        </button>

        {/* Rappel — masqué si organisateur */}
        {!isOwner && (
          <button onClick={toggleReminder} disabled={remindLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: reminder ? 'rgba(123,63,242,0.12)' : 'var(--bg-secondary)',
              color: reminder ? '#7B3FF2' : 'var(--text-secondary)',
              border: `1px solid ${reminder ? '#7B3FF240' : 'var(--border)'}`,
            }}>
            {remindLoading ? <Spinner size="sm" /> : reminder ? <BellOff size={16} /> : <Bell size={16} />}
            <span className="hidden sm:inline">{reminder ? 'Rappel actif' : 'Me rappeler'}</span>
          </button>
        )}

        {isOwner ? (
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => navigate(`/events/${slug}/attendees`)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--bg-secondary)', color: '#10B981', border: '1px solid var(--border)' }}>
              <Users size={15} /> Inscrits
            </button>
            <button onClick={() => navigate(`/events/${slug}/edit`)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--bg-secondary)', color: 'var(--primary)', border: '1px solid var(--border)' }}>
              <Edit3 size={15} /> Modifier
            </button>
          </div>
        ) : ev.organizer && (
          <button onClick={toggleFollow}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: following ? 'rgba(123,63,242,0.12)' : 'var(--primary)',
              color: following ? 'var(--primary)' : '#fff',
              border: `1px solid ${following ? 'rgba(123,63,242,0.3)' : 'transparent'}`,
            }}>
            {following ? <UserCheck size={15} /> : <UserPlus size={15} />}
            {following ? 'Suivi' : 'Suivre'}
          </button>
        )}
      </div>

      <div className="px-4 pt-5 space-y-6">
        {/* Organizer */}
        {ev.organizer && (
          <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'var(--bg-secondary)' }}>
            <Avatar src={ev.organizer.avatar_url} name={ev.organizer.display_name ?? ev.organizer.username} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Organisé par</p>
              <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                {ev.organizer.display_name ?? ev.organizer.username}
              </p>
            </div>
          </div>
        )}

        {/* Infos */}
        <div className="space-y-3">
          <div className="flex items-start gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
              <Calendar size={15} style={{ color }} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {format(new Date(ev.starts_at), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
              {ev.ends_at && <p className="text-xs mt-0.5">Jusqu'à {format(new Date(ev.ends_at), 'HH:mm')}</p>}
            </div>
          </div>

          {ev.is_online ? (
            <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(34,197,94,0.12)' }}>
                <Globe size={15} style={{ color: '#22c55e' }} />
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>En ligne</p>
                {ev.online_url && (
                  <a href={ev.online_url} target="_blank" rel="noreferrer"
                    className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--primary)' }}>
                    Rejoindre <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          ) : (ev.venue_city || ev.venue_name) && (
            <div className="flex items-start gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.12)' }}>
                <MapPin size={15} style={{ color: '#ef4444' }} />
              </div>
              <div>
                {ev.venue_name && <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{ev.venue_name}</p>}
                <p className="text-xs mt-0.5">
                  {[ev.venue_address, ev.venue_city, ev.venue_country].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          )}

          {ev.max_attendees != null && (
            <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(123,63,242,0.12)' }}>
                <Users size={15} style={{ color: '#7B3FF2' }} />
              </div>
              <div className="flex-1">
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {ev.current_attendees ?? 0} / {ev.max_attendees} participants
                </p>
                <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((ev.current_attendees ?? 0) / ev.max_attendees) * 100)}%`, background: color }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {ev.description && (
          <div>
            <h3 className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>À propos</h3>
            <ExpandableText text={ev.description} limit={300} style={{ color: 'var(--text-secondary)' }} />
          </div>
        )}

        {/* Gallery */}
        {ev.gallery_urls && ev.gallery_urls.length > 0 && (
          <div>
            <h3 className="font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Galerie</h3>
            <div className="grid grid-cols-3 gap-2">
              {ev.gallery_urls.map((url, i) => (
                <button key={i} onClick={() => setLightbox(i)}
                  className="relative group aspect-square rounded-xl overflow-hidden"
                  style={{ background: 'var(--bg-tertiary)' }}>
                  <img src={url} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" alt="" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(0,0,0,0.35)' }}>
                    <ZoomIn size={22} color="#fff" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        {ev.status === 'published' && (
          <div className="p-4 rounded-2xl space-y-3"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Accès</p>
                <p className="font-black text-xl" style={{ color: 'var(--text-primary)' }}>
                  {ev.access_type === 'free'
                    ? 'Gratuit'
                    : ev.access_type === 'ticket'
                      ? `À partir de ${ev.ticket_price ?? '?'}€`
                      : 'Sur invitation'}
                </p>
              </div>
              {ev.access_type === 'free' && (
                <span className="text-sm font-bold px-4 py-2 rounded-xl"
                  style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                  Entrée libre
                </span>
              )}
            </div>

            {/* Sélecteur tiers rapide */}
            {ev.access_type === 'ticket' && allTiers.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {allTiers.map(tier => (
                  <button key={tier.key} onClick={() => setSelectedTier(tier.key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: selectedTier === tier.key ? tier.color + '18' : 'var(--bg-secondary)',
                      border:     `1.5px solid ${selectedTier === tier.key ? tier.color : 'var(--border)'}`,
                      color:      selectedTier === tier.key ? tier.color : 'var(--text-secondary)',
                    }}>
                    {tier.label} — {tier.price}€
                  </button>
                ))}
              </div>
            )}

            {ev.access_type === 'ticket' && (
              <button onClick={() => setPaySheet(true)}
                className="w-full py-3.5 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95"
                style={{ background: `linear-gradient(135deg,${tierColor},${tierColor}BB)` }}>
                <Ticket size={15} /> Acheter un billet
              </button>
            )}
          </div>
        )}
      </div>

      {showComments && <CommentsModal targetId={id!} onClose={() => setShowComments(false)} />}
      {lightbox !== null && ev.gallery_urls && (
        <LightboxModal urls={ev.gallery_urls} index={lightbox} onClose={() => setLightbox(null)} />
      )}

      <TicketPaymentModal
        open={paySheet}
        onClose={() => setPaySheet(false)}
        onSuccess={() => setPaySheet(false)}
        itemId={ev.id}
        title={ev.title}
        thumbnail={ev.thumbnail_url}
        kind="event"
        accessType={ev.access_type as any}
        tiers={safeTiers}
        selectedTierKey={selectedTier}
        onBuy={(tierKey) => apiClient.post(Endpoints.events.buyTicket(ev.id), tierKey ? { tier: tierKey } : undefined).then(r => r.data)}
      />
    </div>
  );
}
