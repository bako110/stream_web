import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { encodeId, decodeId } from '../../utils/slugId';
import { ArrowLeft, Heart, MessageCircle, Share2, Send, Bookmark, MoreHorizontal, Trash2, Play } from 'lucide-react';
import type { Post } from '../../types';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner, PageLoader } from '../../components/ui/Spinner';
import { RichText } from '../../components/ui/RichText';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ── Video HLS player ──────────────────────────────────────────────────────────
function VideoPlayer({ src, thumbnail }: { src: string; thumbnail?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = videoRef.current;
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
    <div style={{ background: '#000' }} className="w-full overflow-hidden rounded-2xl">
      <video ref={videoRef} poster={thumbnail} controls playsInline className="w-full object-contain" style={{ maxHeight: 520 }} />
    </div>
  );
}

// ── Mini post card (colonne droite) ───────────────────────────────────────────
function MiniPostCard({ post }: { post: Post }) {
  const navigate = useNavigate();
  const hasVideo = !!(post.hls_url || post.video_url);
  const thumb    = post.thumbnail_url ?? post.image_url;
  return (
    <button
      onClick={() => navigate(`/posts/${encodeId(post.id)}`)}
      className="flex gap-3 p-3 rounded-2xl w-full text-left transition-all"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
      {thumb ? (
        <div className="relative shrink-0 rounded-xl overflow-hidden" style={{ width: 64, height: 64 }}>
          <img src={thumb} alt="" className="w-full h-full object-cover" />
          {hasVideo && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
              <Play size={16} color="#fff" fill="#fff" />
            </div>
          )}
        </div>
      ) : (
        <div className="shrink-0 rounded-xl flex items-center justify-center" style={{ width: 64, height: 64, background: 'rgba(123,63,242,0.1)' }}>
          {hasVideo ? <Play size={18} style={{ color: 'var(--primary)' }} /> : <MessageCircle size={18} style={{ color: 'var(--primary)' }} />}
        </div>
      )}
      <div className="flex-1 min-w-0">
        {post.body && <p className="text-sm font-medium leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>{post.body}</p>}
        {!post.body && hasVideo && <p className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>Vidéo</p>}
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {format(new Date(post.created_at), 'd MMM yyyy', { locale: fr })}
        </p>
      </div>
    </button>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function PostDetailPage() {
  const { id: slug }  = useParams<{ id: string }>();
  const id             = decodeId(slug!);
  const navigate       = useNavigate();
  const { user: me }  = useAuthStore();

  const [post,            setPost]            = useState<Post | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(false);
  const [liked,           setLiked]           = useState(false);
  const [likes,           setLikes]           = useState(0);
  const [comments,        setComments]        = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [input,           setInput]           = useState('');
  const [sending,         setSending]         = useState(false);
  const [menuOpen,        setMenuOpen]        = useState(false);
  const [otherPosts,      setOtherPosts]      = useState<Post[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Charger le post
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

  // Charger les commentaires
  useEffect(() => {
    if (!id) return;
    setCommentsLoading(true);
    apiClient.get<any>(`${Endpoints.social.comments}?post_id=${id}&limit=50`)
      .then(res => {
        const raw = res.data;
        setComments(Array.isArray(raw) ? raw : raw?.items ?? raw?.data ?? []);
      })
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [id]);

  // Charger autres posts de l'auteur
  useEffect(() => {
    if (!post?.author?.id) return;
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
    const newLiked = !liked;
    setLiked(newLiked); setLikes(l => l + (newLiked ? 1 : -1));
    try { await apiClient.post(`${Endpoints.posts.react(id)}?reaction_type=like`); }
    catch { setLiked(!newLiked); setLikes(l => l + (newLiked ? -1 : 1)); }
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <Spinner />
    </div>
  );

  if (error || !post) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg)' }}>
      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Ce post est introuvable ou indisponible.</p>
      <button onClick={() => navigate(-1)} className="btn-secondary text-sm flex items-center gap-2">
        <ArrowLeft size={14} /> Retour
      </button>
    </div>
  );

  const author = post.author;
  const isOwn  = me?.id === post.user_id;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Back */}
        <button onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 mb-6 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ color: 'var(--text-secondary)', background: 'var(--surface)', border: '1px solid var(--border)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <ArrowLeft size={15} /> Retour
        </button>

        {/* Layout 2 colonnes */}
        <div className="grid gap-6" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)' }}>

          {/* ── Colonne gauche : détail ── */}
          <div className="flex flex-col gap-4">

            {/* Card principale */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

              {/* Header auteur */}
              <div className="flex items-center gap-3 px-5 pt-5 pb-4">
                <button onClick={() => author?.id && navigate(`/user/${encodeId(author.id)}`)}>
                  <Avatar src={author?.avatar_url} name={author?.display_name ?? author?.username ?? '?'} size="md" verified={author?.is_verified} />
                </button>
                <div className="flex-1 min-w-0">
                  <button onClick={() => author?.id && navigate(`/user/${encodeId(author.id)}`)}
                    className="text-sm font-black block truncate text-left" style={{ color: 'var(--text-primary)' }}>
                    {author?.display_name ?? author?.username ?? 'Utilisateur'}
                  </button>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {format(new Date(post.created_at), 'd MMMM yyyy · HH:mm', { locale: fr })}
                  </p>
                </div>
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full text-white shrink-0"
                  style={{ background: 'rgba(123,63,242,0.8)' }}>
                  Post
                </span>
                {isOwn && (
                  <div className="relative">
                    <button onClick={() => setMenuOpen(v => !v)}
                      className="p-2 rounded-xl transition-all"
                      style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
                      <MoreHorizontal size={16} />
                    </button>
                    {menuOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                        <div className="absolute right-0 top-10 z-20 rounded-xl overflow-hidden shadow-xl"
                          style={{ background: 'var(--surface)', border: '1px solid var(--border)', minWidth: 160 }}>
                          <button onClick={deletePost}
                            className="flex items-center gap-3 px-4 py-3 w-full text-sm font-semibold"
                            style={{ color: '#ef4444' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <Trash2 size={14} /> Supprimer
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Corps texte */}
              {post.body && (
                <div className="px-5 pb-4">
                  <RichText text={post.body} style={{ color: 'var(--text-primary)', lineHeight: 1.6, fontSize: 15, whiteSpace: 'pre-wrap' }} />
                  {post.feeling && (
                    <span className="inline-block mt-3 text-xs px-3 py-1 rounded-full font-semibold"
                      style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)' }}>
                      {post.feeling}
                    </span>
                  )}
                </div>
              )}

              {/* Vidéo */}
              {(post.hls_url || post.video_url) && !post.image_url && (
                <div className="px-5 pb-4">
                  <VideoPlayer src={post.hls_url ?? post.video_url!} thumbnail={post.thumbnail_url ?? undefined} />
                </div>
              )}

              {/* Image */}
              {post.image_url && !post.video_url && (
                <div className="overflow-hidden mx-5 mb-4 rounded-2xl">
                  <img src={post.image_url} alt="" className="w-full object-cover" style={{ maxHeight: 520 }} />
                </div>
              )}

              {/* Images multiples */}
              {post.image_urls && post.image_urls.length > 1 && (
                <div className="px-5 pb-4 grid gap-2" style={{ gridTemplateColumns: post.image_urls.length === 2 ? '1fr 1fr' : 'repeat(3,1fr)' }}>
                  {post.image_urls.map((u, i) => (
                    <div key={i} className="rounded-xl overflow-hidden aspect-square">
                      <img src={u} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* Action bar */}
              <div className="flex items-center gap-1 px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
                <button onClick={toggleLike}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{ color: liked ? '#7B3FF2' : 'var(--text-secondary)', background: liked ? 'rgba(123,63,242,0.08)' : 'transparent' }}>
                  <Heart size={16} fill={liked ? '#7B3FF2' : 'none'} />
                  {likes > 0 && <span>{likes}</span>}
                </button>
                <button onClick={() => inputRef.current?.focus()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <MessageCircle size={16} />
                  {comments.length > 0 && <span>{comments.length}</span>}
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <Share2 size={16} />
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ml-auto"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <Bookmark size={16} />
                </button>
              </div>
            </div>

            {/* Commentaires */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <h3 className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
                  Commentaires {comments.length > 0 && <span style={{ color: 'var(--text-tertiary)' }}>({comments.length})</span>}
                </h3>
              </div>

              {/* Input */}
              <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <Avatar src={me?.avatar_url} name={me?.display_name ?? me?.username ?? '?'} size="sm" />
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitComment()}
                  placeholder="Ajouter un commentaire…"
                  className="flex-1 text-sm px-4 py-2.5 rounded-xl outline-none"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
                <button onClick={submitComment} disabled={!input.trim() || sending}
                  className="p-2.5 rounded-xl transition-all disabled:opacity-40"
                  style={{ background: 'var(--primary)', color: '#fff' }}>
                  {sending ? <Spinner size="sm" /> : <Send size={14} />}
                </button>
              </div>

              {/* Liste */}
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {commentsLoading ? (
                  <div className="py-8 flex justify-center"><Spinner /></div>
                ) : comments.length === 0 ? (
                  <div className="flex flex-col items-center py-12 gap-2">
                    <MessageCircle size={28} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Aucun commentaire — soyez le premier !</p>
                  </div>
                ) : comments.map((c, i) => (
                  <div key={c.id ?? i} className="flex gap-3 px-5 py-4">
                    <button onClick={() => c.author?.id && navigate(`/user/${encodeId(c.author.id)}`)}>
                      <Avatar src={c.author?.avatar_url} name={c.author?.display_name ?? c.author?.username ?? '?'} size="sm" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--bg-secondary)' }}>
                        <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                          {c.author?.display_name ?? c.author?.username ?? 'Utilisateur'}
                        </p>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{c.body}</p>
                      </div>
                      <p className="text-[10px] mt-1 px-1" style={{ color: 'var(--text-tertiary)' }}>
                        {c.created_at ? format(new Date(c.created_at), 'd MMM · HH:mm', { locale: fr }) : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── Colonne droite : auteur + autres posts ── */}
          <div className="flex flex-col gap-4">

            {/* Card auteur */}
            {author && (
              <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <button onClick={() => author.id && navigate(`/user/${encodeId(author.id)}`)}
                  className="flex flex-col items-center gap-3 w-full text-center">
                  <Avatar src={author.avatar_url} name={author.display_name ?? author.username ?? '?'} size="xl" verified={author.is_verified} />
                  <div>
                    <p className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
                      {author.display_name ?? author.username}
                    </p>
                    {author.username && author.display_name && (
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>@{author.username}</p>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => author.id && navigate(`/user/${encodeId(author.id)}`)}
                  className="btn-primary w-full mt-4 text-sm"
                  style={{ paddingTop: '0.6rem', paddingBottom: '0.6rem' }}>
                  Voir le profil
                </button>
              </div>
            )}

            {/* Autres posts */}
            {otherPosts.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
                  <h3 className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
                    Autres publications
                  </h3>
                </div>
                <div className="p-3 flex flex-col gap-2">
                  {otherPosts.map(p => <MiniPostCard key={p.id} post={p} />)}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
