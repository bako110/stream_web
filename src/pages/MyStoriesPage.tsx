/**
 * MyStoriesPage — « Mon statut » : liste de toutes mes stories actives
 * avec nombre de vues, temps écoulé, et actions (voir vues / supprimer).
 * Équivalent web de MyStoriesScreen (mobile).
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Camera, Plus, MoreVertical, Eye, Trash2, X } from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { encodeId } from '../utils/slugId';
import { PageLoader } from '../components/ui/Spinner';
import { useConfirm } from '../components/ui/Dialog';
import type { Story } from '../types';

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return 'À l\'instant';
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ── Ligne story ─────────────────────────────────────────────────────────────

function StoryRow({ story, onOpen, onMenu }: { story: Story; onOpen: () => void; onMenu: () => void }) {
  const isText = story.media_type === 'text';
  const bg = story.background_color ?? '#7B3FF2';
  const thumb = story.thumbnail_url ?? story.media_url;

  return (
    <div className="flex items-center gap-3.5 px-4 py-3 cursor-pointer transition-all"
      onClick={onOpen}
      style={{ borderBottom: '1px solid var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      {/* Thumbnail */}
      <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
        style={!thumb && isText ? { background: `linear-gradient(135deg, ${bg}, ${bg}CC)` } : { background: 'var(--bg-tertiary)' }}>
        {isText ? (
          <span className="text-white text-[9px] font-semibold text-center px-1 line-clamp-2">{story.caption ?? ''}</span>
        ) : thumb ? (
          <img src={thumb} className="w-full h-full object-cover" alt="" />
        ) : (
          <Camera size={20} style={{ color: 'var(--text-tertiary)' }} />
        )}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {story.view_count} {story.view_count === 1 ? 'vue' : 'vues'}
          </span>
          {story.view_count > 0 && <Eye size={13} style={{ color: '#22C55E' }} />}
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(story.created_at)}</p>
      </div>

      {/* Menu */}
      <button onClick={e => { e.stopPropagation(); onMenu(); }}
        className="p-2 rounded-lg shrink-0 transition-all"
        style={{ color: 'var(--text-tertiary)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <MoreVertical size={18} />
      </button>
    </div>
  );
}

// ── Menu contextuel ───────────────────────────────────────────────────────────

function ActionMenu({ onClose, onViewers, onDelete }: { onClose: () => void; onViewers: () => void; onDelete: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
        <div className="w-full sm:max-w-sm sm:mx-4 rounded-t-2xl sm:rounded-2xl overflow-hidden pointer-events-auto"
          style={{ background: 'var(--surface)' }}>
          <button onClick={onViewers}
            className="w-full flex items-center gap-3.5 px-5 py-4 text-left transition-all"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Eye size={18} /> <span className="text-sm font-medium">Voir les vues</span>
          </button>
          <div style={{ height: 1, background: 'var(--border)' }} />
          <button onClick={onDelete}
            className="w-full flex items-center gap-3.5 px-5 py-4 text-left transition-all"
            style={{ color: '#EF4444' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Trash2 size={18} /> <span className="text-sm font-medium">Supprimer</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ── Modal viewers ─────────────────────────────────────────────────────────────

function ViewersModal({ storyId, onClose }: { storyId: string; onClose: () => void }) {
  const [viewers, setViewers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<any>(Endpoints.stories.viewers(storyId))
      .then(r => setViewers(Array.isArray(r.data) ? r.data : (r.data as any)?.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storyId]);

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
        <div className="w-full sm:max-w-sm sm:mx-4 rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[70vh] flex flex-col pointer-events-auto"
          style={{ background: 'var(--surface)' }}>
          <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Vues ({viewers.length})</p>
            <button onClick={onClose} style={{ color: 'var(--text-tertiary)' }}><X size={18} /></button>
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="py-10 flex justify-center"><PageLoader /></div>
            ) : viewers.length === 0 ? (
              <p className="text-sm text-center py-10" style={{ color: 'var(--text-tertiary)' }}>Pas encore de vue</p>
            ) : viewers.map((v: any) => (
              <div key={v.id ?? v.user_id} className="flex items-center gap-3 px-5 py-3">
                {v.avatar_url
                  ? <img src={v.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" />
                  : <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm"
                      style={{ background: 'var(--primary)' }}>
                      {(v.display_name ?? v.username ?? '?')[0]?.toUpperCase()}
                    </div>
                }
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {v.display_name ?? v.username ?? 'Utilisateur'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyStoriesPage() {
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirm();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuStory, setMenuStory] = useState<Story | null>(null);
  const [viewersStory, setViewersStory] = useState<Story | null>(null);

  const load = useCallback(() => {
    apiClient.get<Story[]>(Endpoints.stories.me)
      .then(r => setStories(Array.isArray(r.data) ? r.data : (r.data as any)?.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openStory = useCallback((story: Story) => {
    const idx = stories.findIndex(s => s.id === story.id);
    const myUserId = story.user_id;
    navigate(`/stories?userId=${encodeId(myUserId)}&storyIndex=${idx >= 0 ? idx : 0}`);
  }, [stories, navigate]);

  async function handleDelete(story: Story) {
    setMenuStory(null);
    const ok = await confirm({
      title: 'Supprimer ce statut ?',
      message: 'Il sera définitivement supprimé.',
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await apiClient.delete(Endpoints.stories.delete(story.id));
      setStories(prev => prev.filter(s => s.id !== story.id));
    } catch {
      toast.error('Impossible de supprimer ce statut.');
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate(-1)} style={{ color: 'var(--text-primary)' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Mon statut</h1>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto relative">
        {loading ? (
          <PageLoader />
        ) : stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 px-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
              <Camera size={32} color="#fff" />
            </div>
            <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Aucun statut publié</p>
            <p className="text-sm text-center" style={{ color: 'var(--text-tertiary)' }}>
              Vos statuts apparaissent ici pendant 24h après publication.
            </p>
          </div>
        ) : (
          <>
            {stories.map(story => (
              <StoryRow key={story.id} story={story}
                onOpen={() => openStory(story)}
                onMenu={() => setMenuStory(story)} />
            ))}
            <div className="flex items-start gap-2 m-4 p-3.5 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                Vos mises à jour de statut sont{' '}
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>chiffrées de bout en bout</span>
                {'. Elles disparaissent au bout de 24 heures.'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Bouton flottant ajouter */}
      <button onClick={() => navigate('/stories/create')}
        className="fixed bottom-7 right-6 w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-105"
        style={{ background: 'var(--primary)', boxShadow: '0 4px 20px rgba(123,63,242,0.45)' }}>
        <Plus size={26} color="#fff" />
      </button>

      {menuStory && (
        <ActionMenu
          onClose={() => setMenuStory(null)}
          onViewers={() => { setViewersStory(menuStory); setMenuStory(null); }}
          onDelete={() => handleDelete(menuStory)}
        />
      )}

      {viewersStory && (
        <ViewersModal storyId={viewersStory.id} onClose={() => setViewersStory(null)} />
      )}

      {ConfirmDialog}
    </div>
  );
}
