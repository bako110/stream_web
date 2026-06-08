import { PageLoader } from '../../components/ui/Spinner';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { encodeId, decodeId } from '../utils/slugId';
import { ArrowLeft, Eye, Clock } from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface StoryViewer {
  id: string;
  user_id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  viewed_at: string;
}

export default function StoryViewersPage() {
  const { id: slug } = useParams<{ id: string }>();
  const id            = decodeId(slug!);
  const navigate      = useNavigate();
  const [viewers,  setViewers]  = useState<StoryViewer[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiClient.get<any>(Endpoints.stories.viewers(id))
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : r.data?.items ?? r.data?.data ?? [];
        setViewers(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl transition-all"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Vues de la story</h1>
          {!loading && (
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {viewers.length} vue{viewers.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Stat banner */}
      {!loading && (
        <div className="mx-4 mt-4 p-4 rounded-2xl flex items-center gap-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(123,63,242,0.12)' }}>
            <Eye size={22} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{viewers.length}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              personne{viewers.length !== 1 ? 's' : ''} ont vu cette story
            </p>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="flex-1 overflow-y-auto mt-4">
        {loading ? (
          <PageLoader />
        ) : viewers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-50">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-secondary)' }}>
              <Eye size={28} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-tertiary)' }}>
              Aucune vue pour l'instant
            </p>
          </div>
        ) : (
          <div className="px-4 space-y-1">
            {viewers.map(viewer => (
              <button key={viewer.id}
                onClick={() => navigate(`/user/${encodeId(viewer.user_id)}`)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all text-left"
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <Avatar
                  src={viewer.avatar_url}
                  name={viewer.display_name ?? viewer.username ?? '?'}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {viewer.display_name ?? viewer.username ?? 'Utilisateur'}
                  </p>
                  {viewer.username && (
                    <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                      @{viewer.username}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                  <Clock size={12} />
                  <span className="text-xs">
                    {formatDistanceToNow(new Date(viewer.viewed_at), { locale: fr, addSuffix: true })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
