import { PageLoader } from '../../components/ui/Spinner';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { encodeId, decodeId } from '../../utils/slugId';
import { ArrowLeft, Heart, MessageCircle, Share2, Send, X, Bookmark, MoreHorizontal, Trash2 } from 'lucide-react';
import type { Post } from '../../types';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';
import { RichText } from '../../components/ui/RichText';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PostDetailPage() {
  const { id: slug } = useParams<{ id: string }>();
  const id            = decodeId(slug!);
  const navigate   = useNavigate();
  const { user: me } = useAuthStore();

  const [post,    setPost]    = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [liked,   setLiked]   = useState(false);
  const [likes,   setLikes]   = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [input,   setInput]   = useState('');
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
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

  async function toggleLike() {
    if (!id) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikes(l => l + (newLiked ? 1 : -1));
    try {
      await apiClient.post(`${Endpoints.posts.react(id)}?reaction_type=like`);
    } catch {
      setLiked(!newLiked);
      setLikes(l => l + (newLiked ? -1 : 1));
    }
  }

  async function submitComment() {
    if (!input.trim() || sending || !id) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      const res = await apiClient.post<any>(Endpoints.social.comments, { post_id: id, body: text });
      setComments(prev => [...prev, res.data]);
    } catch { setInput(text); }
    finally { setSending(false); }
  }

  async function deletePost() {
    if (!id) return;
    setMenuOpen(false);
    try {
      await apiClient.delete(Endpoints.posts.byId(id));
      navigate(-1);
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Spinner />
      </div>
    );
  }

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg)' }}>
      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Ce post est introuvable ou indisponible.</p>
      <button onClick={() => navigate(-1)} className="btn-secondary text-sm flex items-center gap-2">
        <ArrowLeft size={14} /> Retour
      </button>
    </div>
  );

  if (!post) return null;

  const author = post.author;
  const isOwn  = me?.id === post.user_id;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Back button */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-5 px-3 py-2 rounded-xl transition-all text-sm font-semibold"
          style={{ color: 'var(--text-secondary)', background: 'var(--surface)', border: '1px solid var(--border)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <ArrowLeft size={16} /> Retour
        </button>

        {/* Card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <button onClick={() => author?.id && navigate(`/user/${encodeId(author.id)}`)} className="shrink-0">
              <Avatar src={author?.avatar_url} name={author?.display_name ?? author?.username ?? '?'} size="md" verified={author?.is_verified} />
            </button>
            <div className="flex-1 min-w-0">
              <button onClick={() => author?.id && navigate(`/user/${encodeId(author.id)}`)}
                className="text-sm font-bold truncate block text-left" style={{ color: 'var(--text-primary)' }}>
                {author?.display_name ?? author?.username ?? 'Utilisateur'}
              </button>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {format(new Date(post.created_at), 'd MMM yyyy · HH:mm', { locale: fr })}
              </p>
            </div>
            {/* Type badge */}
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full text-white"
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
                    <div className="absolute right-0 top-9 z-20 rounded-xl overflow-hidden shadow-xl"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', minWidth: 160 }}>
                      <button onClick={deletePost}
                        className="flex items-center gap-3 px-4 py-3 w-full text-sm font-semibold transition-all"
                        style={{ color: '#7B3FF2' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(123,63,242,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <Trash2 size={14} /> Supprimer
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Body */}
          {post.body && (
            <div className="px-4 pb-3">
              <RichText text={post.body} limit={400} style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }} />
              {post.feeling && (
                <span className="inline-block mt-2 text-xs px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)' }}>
                  {post.feeling}
                </span>
              )}
            </div>
          )}

          {/* Image */}
          {post.image_url && (
            <div className="overflow-hidden" style={{ maxHeight: 480 }}>
              <img src={post.image_url} alt="" className="w-full object-cover" />
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-1 px-3 py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
            <button onClick={toggleLike}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ color: liked ? '#7B3FF2' : 'var(--text-secondary)', background: liked ? 'rgba(123,63,242,0.08)' : 'transparent' }}>
              <Heart size={16} fill={liked ? '#7B3FF2' : 'none'} /> {likes > 0 && <span>{likes}</span>}
            </button>
            <button onClick={() => inputRef.current?.focus()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <MessageCircle size={16} /> {comments.length > 0 && <span>{comments.length}</span>}
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

        {/* Comments */}
        <div className="mt-4 rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
              Commentaires {comments.length > 0 && <span style={{ color: 'var(--text-tertiary)' }}>({comments.length})</span>}
            </h3>
          </div>

          {/* Comment input */}
          <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <Avatar src={me?.avatar_url} name={me?.display_name ?? me?.username ?? '?'} size="sm" />
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitComment()}
              placeholder="Ajouter un commentaire…"
              className="flex-1 text-sm px-3 py-2 rounded-xl outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <button onClick={submitComment} disabled={!input.trim() || sending}
              className="p-2 rounded-xl transition-all disabled:opacity-40"
              style={{ background: 'var(--primary)', color: '#fff' }}>
              {sending ? <Spinner size="sm" /> : <Send size={14} />}
            </button>
          </div>

          {/* Comment list */}
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {commentsLoading ? (
              <PageLoader />
            ) : comments.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <MessageCircle size={28} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Aucun commentaire — soyez le premier !</p>
              </div>
            ) : comments.map((c, i) => (
              <div key={c.id ?? i} className="flex gap-3 px-4 py-3">
                <button onClick={() => c.author?.id && navigate(`/user/${encodeId(c.author.id)}`)}>
                  <Avatar src={c.author?.avatar_url} name={c.author?.display_name ?? c.author?.username ?? '?'} size="sm" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="rounded-2xl px-3.5 py-2.5" style={{ background: 'var(--bg-secondary)' }}>
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
    </div>
  );
}
