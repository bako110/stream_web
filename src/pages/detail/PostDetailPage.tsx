import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { encodeId, decodeId } from '../../utils/slugId';
import { ArrowLeft, Heart, MessageCircle, Share2, Send, Bookmark, MoreHorizontal, Trash2, Edit3, Play, X, ChevronDown, Users } from 'lucide-react';
import { GuestPreview } from '../../components/ui/GuestPreview';
import { DetailBackHeader } from '../../components/ui/DetailBackHeader';
import { useSmartBack } from '../../hooks/useSmartBack';
import type { Post } from '../../types';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Avatar, VerifiedBadge } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';
import { RichText } from '../../components/ui/RichText';
import { Lightbox } from '../../components/ui/Lightbox';
import { AiAnalysisStatusModal } from '../../components/ui/AiAnalysisStatusModal';
import { ShareModal } from '../../components/ui/ShareModal';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/* ── HLS video player ──────────────────────────────────────────────────────── */
function VideoPlayer({ src, thumbnail }: { src: string; thumbnail?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || !src) return;
    let hls: import('hls.js').default | null = null;
    import('hls.js').then(({ default: Hls }) => {
      if (src.includes('.m3u8') && Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(v);
      } else {
        v.src = src;
      }
    });
    return () => { hls?.destroy(); };
  }, [src]);
  return (
    <div className="w-full rounded-2xl overflow-hidden bg-black">
      <video ref={ref} poster={thumbnail} controls playsInline
        className="w-full object-contain" style={{ maxHeight: 480 }} />
    </div>
  );
}

/* ── Mini post card ─────────────────────────────────────────────────────────── */
function MiniPostCard({ post }: { post: Post }) {
  const navigate = useNavigate();
  const hasVideo = !!(post.hls_url || post.video_url);
  const thumb    = post.thumbnail_url ?? post.image_url;
  return (
    <button
      onClick={() => navigate(`/posts/${encodeId(post.id)}`)}
      className="flex gap-3 p-3 rounded-xl w-full text-left transition-colors hover:bg-[var(--bg-secondary)]">
      {/* Thumbnail */}
      <div className="relative shrink-0 rounded-lg overflow-hidden bg-[var(--bg-secondary)]"
        style={{ width: 56, height: 56 }}>
        {thumb
          ? <img src={thumb} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center">
              {hasVideo
                ? <Play size={18} style={{ color: 'var(--primary)' }} />
                : <MessageCircle size={16} style={{ color: 'var(--text-tertiary)' }} />}
            </div>}
        {hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Play size={14} color="#fff" fill="#fff" />
          </div>
        )}
      </div>
      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug line-clamp-2"
          style={{ color: 'var(--text-primary)' }}>
          {post.body || (hasVideo ? 'Vidéo' : 'Publication')}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {format(new Date(post.created_at), 'd MMM yyyy', { locale: fr })}
        </p>
      </div>
    </button>
  );
}

/* ── Comments bottom sheet (mobile) ─────────────────────────────────────────── */
function CommentsSheet({
  comments, me, input, setInput, sending, onSubmit, onClose, inputRef, onDelete, onEdit, onToggleLike, likedIds, localLikes,
}: {
  comments: any[]; me: any; input: string; setInput: (v: string) => void;
  sending: boolean; onSubmit: () => void; onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDelete: (id: string) => void;
  onEdit: (id: string, body: string) => void;
  onToggleLike: (c: any) => void;
  likedIds: Set<string>;
  localLikes: Record<string, number>;
}) {
  const navigate = useNavigate();
  const [visible,     setVisible]     = useState(false);
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editBody,    setEditBody]    = useState('');
  const [editSaving,  setEditSaving]  = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  async function saveEdit(id: string) {
    if (!editBody.trim() || editSaving) return;
    setEditSaving(true);
    try { await onEdit(id, editBody.trim()); setEditingId(null); }
    finally { setEditSaving(false); }
  }

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  function handleClose() { setVisible(false); setTimeout(onClose, 280); }

  return (
    <>
      <div className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          opacity: visible ? 1 : 0, transition: 'opacity 0.28s ease' }}
        onClick={handleClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{
          background: 'var(--surface)', borderRadius: '1.25rem 1.25rem 0 0',
          maxHeight: '85vh', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.35)',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.28s cubic-bezier(0.32,0.72,0,1)',
        }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 cursor-pointer shrink-0" onClick={handleClose}>
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <MessageCircle size={16} style={{ color: 'var(--primary)' }} />
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              Commentaires
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
              {comments.length}
            </span>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-xl"
            style={{ color: 'var(--text-tertiary)' }}>
            <X size={16} />
          </button>
        </div>
        {/* Liste */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 min-h-0"
          style={{ scrollbarWidth: 'thin' }}>
          {comments.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <MessageCircle size={28} style={{ color: 'var(--text-tertiary)', opacity: 0.3 }} />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Aucun commentaire</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((c, i) => (
                <div key={c.id ?? i} className="flex gap-3 group">
                  <button onClick={() => c.author?.id && navigate(`/user/${encodeId(c.author.id)}`)}>
                    <Avatar src={c.author?.avatar_url}
                      name={c.author?.display_name ?? c.author?.username ?? '?'} size="sm" />
                  </button>
                  <div className="flex-1 min-w-0">
                    {editingId === c.id ? (
                      <div className="flex flex-col gap-1.5">
                        <input autoFocus value={editBody} onChange={e => setEditBody(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(c.id); } if (e.key === 'Escape') setEditingId(null); }}
                          className="text-sm px-3.5 py-2.5 rounded-2xl w-full outline-none"
                          style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--primary)', color: 'var(--text-primary)' }} />
                        <div className="flex gap-2 ml-1">
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
                      <div className="flex items-start gap-2">
                        <div className="flex-1 rounded-2xl px-3.5 py-2.5"
                          style={{ background: 'var(--bg-secondary)' }}>
                          <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                            {c.author?.display_name ?? c.author?.username ?? 'Utilisateur'}
                          </p>
                          <p className="text-sm leading-relaxed whitespace-pre-line break-words" style={{ color: 'var(--text-secondary)' }}>
                            {c.body}
                          </p>
                        </div>
                        {me?.id === c.author?.id && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 mt-1 shrink-0">
                            <button onClick={() => { setEditingId(c.id); setEditBody(c.body); }}
                              className="p-1 rounded-lg" style={{ color: 'var(--text-tertiary)' }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                              <Edit3 size={13} />
                            </button>
                            <button onClick={() => onDelete(c.id)}
                              className="p-1 rounded-lg" style={{ color: 'var(--text-tertiary)' }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1 px-1">
                      <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        {c.created_at ? format(new Date(c.created_at), "d MMM 'à' HH:mm", { locale: fr }) : ''}
                      </p>
                      <button onClick={() => onToggleLike(c)}
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
              ))}
            </div>
          )}
        </div>
        {/* Input */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-3"
          style={{ borderTop: '1px solid var(--border)',
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <Avatar src={me?.avatar_url} name={me?.display_name ?? me?.username ?? '?'} size="sm" />
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onSubmit()}
            placeholder="Écrire un commentaire…"
            className="flex-1 text-sm px-4 py-2.5 rounded-xl outline-none"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
          <button onClick={onSubmit} disabled={!input.trim() || sending}
            className="p-2 rounded-xl transition-all disabled:opacity-40 shrink-0"
            style={{ background: 'var(--primary)', color: '#fff' }}>
            {sending ? <Spinner size="sm" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────────── */
export default function PostDetailPage() {
  const { id: slug } = useParams<{ id: string }>();
  const id           = decodeId(slug!);
  const navigate     = useNavigate();
  const goBack       = useSmartBack('/feed');
  const { user: me } = useAuthStore();

  const [post,            setPost]            = useState<Post | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(false);
  const [liked,           setLiked]           = useState(false);
  const [likes,           setLikes]           = useState(0);
  const [favId,           setFavId]           = useState<string | null>(null);
  const [savingFav,       setSavingFav]       = useState(false);
  const [showShare,       setShowShare]       = useState(false);
  const [comments,        setComments]        = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [input,           setInput]           = useState('');
  const [sending,         setSending]         = useState(false);
  const [menuOpen,        setMenuOpen]        = useState(false);
  const [otherPosts,      setOtherPosts]      = useState<Post[]>([]);
  const [lightbox,           setLightbox]           = useState<number | null>(null);
  const [showCommentsSheet,  setShowCommentsSheet]  = useState(false);
  const [editingCommentId,   setEditingCommentId]   = useState<string | null>(null);
  const [editCommentBody,    setEditCommentBody]    = useState('');
  const [editCommentSaving,  setEditCommentSaving]  = useState(false);
  const [commentLikedIds,    setCommentLikedIds]    = useState<Set<string>>(new Set());
  const [commentLocalLikes,  setCommentLocalLikes]  = useState<Record<string, number>>({});
  const [showAiModal,        setShowAiModal]        = useState(false);
  const inputRef    = useRef<HTMLInputElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);
  const PREVIEW_COUNT = 3;

  useEffect(() => {
    if (!id) return;
    setLoading(true); setError(false);
    apiClient.get<Post>(Endpoints.posts.byId(id))
      .then(res => {
        setPost(res.data);
        setLiked(res.data.user_reaction === 'like');
        setLikes(res.data.like_count ?? 0);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !me) return;
    setCommentsLoading(true);
    apiClient.get<any>(`${Endpoints.social.comments}?post_id=${id}&limit=50`)
      .then(res => {
        const raw = res.data;
        const list = Array.isArray(raw) ? raw : raw?.items ?? raw?.data ?? [];
        setComments(list);
        setCommentLikedIds(new Set(list.filter((c: any) => c.user_reaction === 'like').map((c: any) => c.id)));
      })
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [id, me]);

  useEffect(() => {
    if (!post?.author?.id || !me) return;
    apiClient.get<any>(Endpoints.posts.byUser(post.author.id))
      .then(res => {
        const raw = res.data;
        const all = Array.isArray(raw) ? raw : raw?.items ?? raw?.data ?? [];
        setOtherPosts(all.filter((p: Post) => p.id !== id).slice(0, 5));
      })
      .catch(() => {});
  }, [post?.author?.id, id]);

  async function toggleLike() {
    if (!id) return;
    const next = !liked;
    setLiked(next); setLikes(l => l + (next ? 1 : -1));
    try { await apiClient.post(`${Endpoints.posts.react(id)}?reaction_type=like`); }
    catch { setLiked(!next); setLikes(l => l + (next ? -1 : 1)); }
  }

  function toggleCommentLike(c: any) {
    const isLiked = commentLikedIds.has(c.id);
    setCommentLikedIds(prev => { const n = new Set(prev); isLiked ? n.delete(c.id) : n.add(c.id); return n; });
    setCommentLocalLikes(prev => ({ ...prev, [c.id]: (prev[c.id] ?? c.like_count ?? 0) + (isLiked ? -1 : 1) }));
    apiClient.post(Endpoints.social.toggleReaction, { comment_id: c.id, reaction_type: 'like' }).catch(() => {
      setCommentLikedIds(prev => { const n = new Set(prev); isLiked ? n.add(c.id) : n.delete(c.id); return n; });
      setCommentLocalLikes(prev => ({ ...prev, [c.id]: (prev[c.id] ?? c.like_count ?? 0) + (isLiked ? 1 : -1) }));
    });
  }

  async function handleSaveFav() {
    if (savingFav || !post) return;
    setSavingFav(true);
    try {
      if (favId) {
        await apiClient.delete(Endpoints.favorites.remove(favId));
        setFavId(null);
      } else {
        const res = await apiClient.post<{ id: string }>(Endpoints.favorites.add, { target_type: 'post', target_id: post.id });
        setFavId((res.data as any)?.id ?? (res.data as any)?.favorite?.id ?? null);
      }
    } catch {}
    finally { setSavingFav(false); }
  }

  async function deleteComment(commentId: string) {
    try {
      await apiClient.delete(`${Endpoints.social.comments}/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch {}
  }

  async function updateComment(commentId: string, body: string) {
    await apiClient.put(`${Endpoints.social.comments}/${commentId}`, { body });
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, body } : c));
  }

  async function submitComment() {
    if (!input.trim() || sending || !id) return;
    const text = input.trim(); setInput(''); setSending(true);
    try {
      const res = await apiClient.post<any>(Endpoints.social.comments, { post_id: id, body: text });
      setComments(prev => [...prev, res.data]);
    } catch { setInput(text); }
    finally { setSending(false); }
  }

  async function deletePost() {
    if (!id) return; setMenuOpen(false);
    try { await apiClient.delete(Endpoints.posts.byId(id)); navigate(-1); } catch {}
  }

  function startEditPost() {
    if (!id) return;
    setMenuOpen(false);
    navigate(`/create/post?edit=${id}`);
  }

  /* ── Loading / Error states ── */
  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Spinner />
    </div>
  );
  if (error || !post) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
        Ce post est introuvable ou indisponible.
      </p>
      <DetailBackHeader onBack={goBack} />
    </div>
  );

  const author = post.author;
  const isOwn  = me?.id === post.user_id;
  const hasVideo = !!(post.hls_url || post.video_url);
  const thumb    = post.thumbnail_url ?? post.image_url ?? post.image_urls?.[0];

  /* ── Vue guest (non connecté) ── */
  if (!me) {
    return (
      <GuestPreview
        type={hasVideo ? 'reel' : 'post'}
        thumbnail={thumb}
        thumbnails={hasVideo ? undefined : post.image_urls}
        body={post.body}
        author={author}
        date={post.created_at}
        likeCount={post.like_count}
        commentCount={post.comment_count}
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="w-full mx-auto px-4 py-8">

        <DetailBackHeader onBack={goBack} />

        {/* Grid 2 colonnes : gauche 3/5, droite 2/5 */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6 items-start">

          {/* ══ Colonne gauche ══════════════════════════════════════════════════ */}
          <div className="flex flex-col gap-4">

            {/* Card post principale */}
            <div className="rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4">
                <button onClick={() => author?.id && navigate(`/user/${encodeId(author.id)}`)}>
                  <Avatar src={author?.avatar_url}
                    name={author?.display_name ?? author?.username ?? '?'}
                    size="md" verified={author?.is_verified} />
                </button>
                <div className="flex-1 min-w-0">
                  <button onClick={() => author?.id && navigate(`/user/${encodeId(author.id)}`)}
                    className="flex items-center gap-1.5 font-bold text-sm text-left hover:underline"
                    style={{ color: 'var(--text-primary)' }}>
                    <span className="truncate">{author?.display_name ?? author?.username ?? 'Utilisateur'}</span>
                    {author?.is_verified && <VerifiedBadge size={14} />}
                  </button>
                  <p className="flex items-center gap-1 text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {format(new Date(post.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                    {post.is_private && <Users size={11} aria-label="Amis uniquement" />}
                  </p>
                  {isOwn && post.ai_analysis_status === 'pending' && (
                    <button onClick={() => setShowAiModal(true)} className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full border-2 animate-spin"
                        style={{ borderColor: 'var(--text-tertiary)', borderTopColor: 'transparent' }} />
                      <span className="text-[10px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>Vérification en cours…</span>
                    </button>
                  )}
                </div>

                {/* Badge type */}
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white shrink-0"
                  style={{ background: 'var(--primary)' }}>
                  Post
                </span>

                {/* Menu owner */}
                {isOwn && (
                  <div className="relative shrink-0">
                    <button onClick={() => setMenuOpen(v => !v)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <MoreHorizontal size={16} />
                    </button>
                    {menuOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                        <div className="absolute right-0 top-9 z-20 rounded-xl shadow-xl min-w-[140px]"
                          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                          <button onClick={startEditPost}
                            className="flex items-center gap-2 px-4 py-3 w-full text-sm font-medium transition-colors"
                            style={{ color: 'var(--text-primary)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <Edit3 size={14} /> Modifier
                          </button>
                          <button onClick={deletePost}
                            className="flex items-center gap-2 px-4 py-3 w-full text-sm font-medium transition-colors"
                            style={{ color: '#ef4444' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <Trash2 size={14} /> Supprimer
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Contenu texte */}
              {post.body && (
                <div className="px-5 pb-4">
                  <RichText text={post.body}
                    style={{ color: 'var(--text-primary)', lineHeight: 1.7, fontSize: 15 }} />
                  {post.feeling && (
                    <span className="inline-block mt-3 text-xs px-3 py-1 rounded-full font-semibold"
                      style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)' }}>
                      {post.feeling}
                    </span>
                  )}
                </div>
              )}

              {/* Vidéo */}
              {(post.hls_url || post.video_url) && (
                <div className="px-5 pb-4">
                  <VideoPlayer src={post.hls_url ?? post.video_url!}
                    thumbnail={post.thumbnail_url ?? undefined} />
                </div>
              )}

              {/* Image unique */}
              {!post.video_url && !post.hls_url && post.image_url && !post.image_urls?.length && (
                <button className="mx-5 mb-4 rounded-xl overflow-hidden cursor-zoom-in block w-[calc(100%-2.5rem)]"
                  onClick={() => setLightbox(0)}>
                  <img src={post.image_url} alt="" className="w-full object-cover"
                    style={{ maxHeight: 480 }} />
                </button>
              )}

              {/* Images multiples */}
              {post.image_urls && post.image_urls.length > 1 && (
                <div className="px-5 pb-4"
                  style={{ display: 'grid', gap: 6,
                    gridTemplateColumns: post.image_urls.length === 2 ? '1fr 1fr' : 'repeat(3,1fr)' }}>
                  {post.image_urls.map((u, i) => (
                    <button key={i} className="rounded-xl overflow-hidden cursor-zoom-in"
                      style={{ aspectRatio: '1' }} onClick={() => setLightbox(i)}>
                      <img src={u} alt="" className="w-full h-full object-cover transition-transform hover:scale-105" />
                    </button>
                  ))}
                </div>
              )}

              {/* Action bar */}
              <div className="flex items-center gap-0.5 px-4 py-3"
                style={{ borderTop: '1px solid var(--border)' }}>
                {/* Like */}
                <button onClick={toggleLike}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{ color: liked ? 'var(--primary)' : 'var(--text-secondary)',
                    background: liked ? 'rgba(123,63,242,0.08)' : 'transparent' }}>
                  <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
                  {likes > 0 && <span>{likes}</span>}
                </button>
                {/* Commenter */}
                <button onClick={() => inputRef.current?.focus()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <MessageCircle size={16} />
                  {comments.length > 0 && <span>{comments.length}</span>}
                </button>
                {/* Partager */}
                <button onClick={() => setShowShare(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <Share2 size={16} />
                </button>
                {/* Sauvegarder */}
                <button onClick={handleSaveFav} disabled={savingFav}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ml-auto"
                  style={{ color: favId ? 'var(--primary)' : 'var(--text-secondary)', opacity: savingFav ? 0.6 : 1 }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <Bookmark size={16} fill={favId ? 'var(--primary)' : 'none'} />
                </button>
              </div>
            </div>

            {/* Section commentaires */}
            <div className="rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

              {/* Titre */}
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Commentaires
                  {comments.length > 0 && (
                    <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                      {comments.length}
                    </span>
                  )}
                </h3>
                {/* Sur mobile: bouton pour ouvrir le sheet */}
                {comments.length > PREVIEW_COUNT && (
                  <button onClick={() => setShowCommentsSheet(true)}
                    className="lg:hidden flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--primary)' }}>
                    Voir tout <ChevronDown size={12} />
                  </button>
                )}
              </div>

              {/* Input — desktop toujours visible, mobile toujours visible */}
              <div className="flex items-center gap-3 px-5 py-3.5"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <Avatar src={me?.avatar_url}
                  name={me?.display_name ?? me?.username ?? '?'} size="sm" />
                <input ref={inputRef} value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitComment()}
                  placeholder="Écrire un commentaire…"
                  className="flex-1 text-sm px-4 py-2.5 rounded-xl outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                <button onClick={submitComment} disabled={!input.trim() || sending}
                  className="p-2 rounded-xl transition-all disabled:opacity-40 shrink-0"
                  style={{ background: 'var(--primary)', color: '#fff' }}>
                  {sending ? <Spinner size="sm" /> : <Send size={14} />}
                </button>
              </div>

              {/* Liste commentaires */}
              {commentsLoading ? (
                <div className="py-10 flex justify-center"><Spinner /></div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center py-12 gap-3">
                  <MessageCircle size={32} style={{ color: 'var(--text-tertiary)', opacity: 0.3 }} />
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    Aucun commentaire — soyez le premier !
                  </p>
                </div>
              ) : (
                <div>
                  {/* Mobile: aperçu 3 commentaires seulement */}
                  {comments.slice(0, PREVIEW_COUNT).map((c, i) => (
                    <div key={c.id ?? i} className="flex gap-3 px-5 py-4 group"
                      style={{ borderBottom: '1px solid var(--border)' }}>
                      <button onClick={() => c.author?.id && navigate(`/user/${encodeId(c.author.id)}`)}>
                        <Avatar src={c.author?.avatar_url}
                          name={c.author?.display_name ?? c.author?.username ?? '?'} size="sm" />
                      </button>
                      <div className="flex-1 min-w-0">
                        {editingCommentId === c.id ? (
                          <div className="flex flex-col gap-1.5">
                            <input autoFocus value={editCommentBody} onChange={e => setEditCommentBody(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (async () => { if (editCommentBody.trim() && !editCommentSaving) { setEditCommentSaving(true); try { await updateComment(c.id, editCommentBody.trim()); setEditingCommentId(null); } finally { setEditCommentSaving(false); } } })(); } if (e.key === 'Escape') setEditingCommentId(null); }}
                              className="text-sm px-4 py-3 rounded-2xl w-full outline-none"
                              style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--primary)', color: 'var(--text-primary)' }} />
                            <div className="flex gap-2 ml-1">
                              <button onClick={async () => { if (editCommentBody.trim() && !editCommentSaving) { setEditCommentSaving(true); try { await updateComment(c.id, editCommentBody.trim()); setEditingCommentId(null); } finally { setEditCommentSaving(false); } } }}
                                disabled={editCommentSaving} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                                style={{ background: 'var(--primary)', color: '#fff', opacity: editCommentSaving ? 0.6 : 1 }}>
                                {editCommentSaving ? '…' : 'Enregistrer'}
                              </button>
                              <button onClick={() => setEditingCommentId(null)}
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                                style={{ color: 'var(--text-tertiary)' }}>Annuler</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <div className="flex-1 rounded-2xl px-4 py-3" style={{ background: 'var(--bg-secondary)' }}>
                              <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                                {c.author?.display_name ?? c.author?.username ?? 'Utilisateur'}
                              </p>
                              <p className="text-sm leading-relaxed whitespace-pre-line break-words" style={{ color: 'var(--text-secondary)' }}>
                                {c.body}
                              </p>
                            </div>
                            {me?.id === c.author?.id && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 mt-1 shrink-0">
                                <button onClick={() => { setEditingCommentId(c.id); setEditCommentBody(c.body); }}
                                  className="p-1 rounded-lg" style={{ color: 'var(--text-tertiary)' }}
                                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                                  <Edit3 size={13} />
                                </button>
                                <button onClick={() => deleteComment(c.id)}
                                  className="p-1 rounded-lg" style={{ color: 'var(--text-tertiary)' }}
                                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 px-1">
                          <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                            {c.created_at ? format(new Date(c.created_at), "d MMM 'à' HH:mm", { locale: fr }) : ''}
                          </p>
                          <button onClick={() => toggleCommentLike(c)}
                            className="flex items-center gap-1 transition-colors"
                            style={{ color: commentLikedIds.has(c.id) ? 'var(--primary)' : 'var(--text-tertiary)' }}>
                            <Heart size={11} fill={commentLikedIds.has(c.id) ? 'currentColor' : 'none'} />
                            {(commentLocalLikes[c.id] ?? c.like_count ?? 0) > 0 && (
                              <span className="text-[10px] font-medium">{commentLocalLikes[c.id] ?? c.like_count}</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Desktop: affiche le reste inline. Mobile: bouton "Voir les X restants" */}
                  {comments.length > PREVIEW_COUNT && (
                    <>
                      {/* Desktop uniquement — les commentaires restants */}
                      <div className="hidden lg:block">
                        {comments.slice(PREVIEW_COUNT).map((c, i) => (
                          <div key={c.id ?? i} className="flex gap-3 px-5 py-4 group"
                            style={{ borderBottom: i < comments.length - PREVIEW_COUNT - 1 ? '1px solid var(--border)' : 'none' }}>
                            <button onClick={() => c.author?.id && navigate(`/user/${encodeId(c.author.id)}`)}>
                              <Avatar src={c.author?.avatar_url}
                                name={c.author?.display_name ?? c.author?.username ?? '?'} size="sm" />
                            </button>
                            <div className="flex-1 min-w-0">
                              {editingCommentId === c.id ? (
                                <div className="flex flex-col gap-1.5">
                                  <input autoFocus value={editCommentBody} onChange={e => setEditCommentBody(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (async () => { if (editCommentBody.trim() && !editCommentSaving) { setEditCommentSaving(true); try { await updateComment(c.id, editCommentBody.trim()); setEditingCommentId(null); } finally { setEditCommentSaving(false); } } })(); } if (e.key === 'Escape') setEditingCommentId(null); }}
                                    className="text-sm px-4 py-3 rounded-2xl w-full outline-none"
                                    style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--primary)', color: 'var(--text-primary)' }} />
                                  <div className="flex gap-2 ml-1">
                                    <button onClick={async () => { if (editCommentBody.trim() && !editCommentSaving) { setEditCommentSaving(true); try { await updateComment(c.id, editCommentBody.trim()); setEditingCommentId(null); } finally { setEditCommentSaving(false); } } }}
                                      disabled={editCommentSaving} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                                      style={{ background: 'var(--primary)', color: '#fff', opacity: editCommentSaving ? 0.6 : 1 }}>
                                      {editCommentSaving ? '…' : 'Enregistrer'}
                                    </button>
                                    <button onClick={() => setEditingCommentId(null)}
                                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                                      style={{ color: 'var(--text-tertiary)' }}>Annuler</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-2">
                                  <div className="flex-1 rounded-2xl px-4 py-3" style={{ background: 'var(--bg-secondary)' }}>
                                    <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                                      {c.author?.display_name ?? c.author?.username ?? 'Utilisateur'}
                                    </p>
                                    <p className="text-sm leading-relaxed whitespace-pre-line break-words" style={{ color: 'var(--text-secondary)' }}>
                                      {c.body}
                                    </p>
                                  </div>
                                  {me?.id === c.author?.id && (
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 mt-1 shrink-0">
                                      <button onClick={() => { setEditingCommentId(c.id); setEditCommentBody(c.body); }}
                                        className="p-1 rounded-lg" style={{ color: 'var(--text-tertiary)' }}
                                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                                        <Edit3 size={13} />
                                      </button>
                                      <button onClick={() => deleteComment(c.id)}
                                        className="p-1 rounded-lg" style={{ color: 'var(--text-tertiary)' }}
                                        onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center gap-3 mt-1.5 px-1">
                                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                                  {c.created_at ? format(new Date(c.created_at), "d MMM 'à' HH:mm", { locale: fr }) : ''}
                                </p>
                                <button onClick={() => toggleCommentLike(c)}
                                  className="flex items-center gap-1 transition-colors"
                                  style={{ color: commentLikedIds.has(c.id) ? 'var(--primary)' : 'var(--text-tertiary)' }}>
                                  <Heart size={11} fill={commentLikedIds.has(c.id) ? 'currentColor' : 'none'} />
                                  {(commentLocalLikes[c.id] ?? c.like_count ?? 0) > 0 && (
                                    <span className="text-[10px] font-medium">{commentLocalLikes[c.id] ?? c.like_count}</span>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Mobile uniquement — bouton voir tout */}
                      <button onClick={() => setShowCommentsSheet(true)}
                        className="lg:hidden w-full flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors"
                        style={{ color: 'var(--primary)', borderTop: '1px solid var(--border)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <MessageCircle size={15} />
                        Voir les {comments.length - PREVIEW_COUNT} autres commentaires
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ══ Colonne droite ══════════════════════════════════════════════════ */}
          <div className="flex flex-col gap-4">

            {/* Card auteur */}
            {author && (
              <div className="rounded-2xl p-5 text-center"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <button onClick={() => author.id && navigate(`/user/${encodeId(author.id)}`)}
                  className="flex flex-col items-center gap-3 w-full">
                  <Avatar src={author.avatar_url}
                    name={author.display_name ?? author.username ?? '?'}
                    size="xl" verified={author.is_verified} />
                  <div>
                    <div className="flex items-center justify-center gap-1.5">
                      <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {author.display_name ?? author.username}
                      </p>
                      {author.is_verified && <VerifiedBadge size={14} />}
                    </div>
                    {author.username && author.display_name && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                        @{author.username}
                      </p>
                    )}
                  </div>
                </button>
                <button onClick={() => author.id && navigate(`/user/${encodeId(author.id)}`)}
                  className="btn-primary w-full text-sm mt-4"
                  style={{ paddingTop: '0.55rem', paddingBottom: '0.55rem' }}>
                  Voir le profil
                </button>
              </div>
            )}

            {/* Autres publications */}
            {otherPosts.length > 0 && (
              <div className="rounded-2xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
                  <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                    Autres publications
                  </p>
                </div>
                <div className="p-2">
                  {otherPosts.map(p => <MiniPostCard key={p.id} post={p} />)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCommentsSheet && (
        <CommentsSheet
          comments={comments}
          me={me}
          input={input}
          setInput={setInput}
          sending={sending}
          onSubmit={submitComment}
          onClose={() => setShowCommentsSheet(false)}
          inputRef={sheetInputRef}
          onDelete={deleteComment}
          onEdit={updateComment}
          onToggleLike={toggleCommentLike}
          likedIds={commentLikedIds}
          localLikes={commentLocalLikes}
        />
      )}

      {lightbox !== null && (
        <Lightbox
          urls={post.image_urls?.length ? post.image_urls : [post.image_url!]}
          index={lightbox}
          onClose={() => setLightbox(null)}
        />
      )}

      <AiAnalysisStatusModal
        open={showAiModal}
        onClose={() => setShowAiModal(false)}
        contentType="post"
        contentId={post.id}
        initialStatus={post.ai_analysis_status}
      />

      {showShare && (
        <ShareModal
          open
          onClose={() => setShowShare(false)}
          url={`${window.location.origin}/posts/${encodeId(post.id)}`}
          title={author?.display_name ?? author?.username ?? 'GoFolyX'}
          desc={post.body ?? undefined}
          image={post.image_url ?? post.image_urls?.[0]}
          targetType="post"
          targetId={post.id}
        />
      )}
    </div>
  );
}
