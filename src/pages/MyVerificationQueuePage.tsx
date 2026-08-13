import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../components/ui/Dialog';
import { ShieldCheck, Clock, AlertTriangle, Trash2, Edit3 } from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Spinner, PageLoader } from '../components/ui/Spinner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

type QueueContentType = 'reel' | 'post' | 'event' | 'concert';
type AiStatus = 'pending' | 'limited' | 'removed';

interface QueueItem {
  content_type: QueueContentType;
  content_id: string;
  title: string;
  thumbnail_url: string | null;
  created_at: string | null;
  ai_status: AiStatus;
  reason: string | null;
  details: string | null;
}

// Repris tel quel du mapping de ReportModal.tsx pour rester coherent avec
// le libelle deja affiche a l'utilisateur quand il signale un contenu.
const REASON_LABEL: Record<string, string> = {
  spam:           'Spam',
  inappropriate:  'Contenu inapproprié',
  violence:       'Violence',
  harassment:     'Harcèlement',
  misinformation: 'Désinformation',
  other:          'Autre',
};

const TYPE_LABEL: Record<QueueContentType, string> = {
  reel: 'Reel', post: 'Publication', event: 'Événement', concert: 'Concert',
};

// Reel n'a pas de page d'edition web dediee (seulement caption/filtres visuels
// editables inline sur mobile) -- bouton Modifier masque pour ce type.
const EDIT_PATH: Partial<Record<QueueContentType, string>> = {
  post: '/create/post', event: '/create/event', concert: '/create/concert',
};

const DELETE_ENDPOINT: Record<QueueContentType, (id: string) => string> = {
  reel: Endpoints.reels.delete, post: Endpoints.posts.byId,
  event: Endpoints.events.byId, concert: Endpoints.concerts.byId,
};

function QueueCard({ item, onDelete }: { item: QueueItem; onDelete: (id: string) => void }) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const editPath = EDIT_PATH[item.content_type];

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({ title: 'Supprimer ce contenu ?', message: 'Cette action est définitive et irréversible.', danger: true, confirmLabel: 'Supprimer définitivement' });
    if (!ok) return;
    setDeleting(true);
    try {
      await apiClient.delete(DELETE_ENDPOINT[item.content_type](item.content_id));
      onDelete(item.content_id);
      toast.success('Contenu supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
      setDeleting(false);
    }
  }, [item, onDelete, confirm]);

  const statusColor = item.ai_status === 'pending' ? '#9290AE' : item.ai_status === 'limited' ? '#F59E0B' : '#EF4444';
  const statusLabel = item.ai_status === 'pending'
    ? 'Vérification en cours…'
    : item.ai_status === 'limited'
      ? 'Diffusion limitée — en revue'
      : 'Retiré automatiquement';

  return (
    <div className="overflow-hidden" style={{ borderRadius: '1.25rem', border: '1px solid var(--border)', background: 'var(--surface)', borderLeft: `3px solid ${statusColor}` }}>
      {/* Miniature — uniquement si une vraie image existe. Un contenu
          texte-only (ex: post sans photo) n'affiche pas de zone 16/9 vide,
          le badge type/statut passe dans l'en-tête du corps à la place. */}
      {item.thumbnail_url && (
        <div className="relative overflow-hidden" style={{ aspectRatio: '16/9', background: 'var(--bg-tertiary)' }}>
          <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
          <span className="absolute top-3 left-3 text-[11px] font-bold px-2.5 py-1 rounded-full text-white" style={{ background: statusColor }}>
            {TYPE_LABEL[item.content_type]}
          </span>
        </div>
      )}

      <div className="p-4 space-y-3">
        {!item.thumbnail_url && (
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${statusColor}15` }}>
              <ShieldCheck size={18} style={{ color: statusColor }} />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white" style={{ background: statusColor }}>
              {TYPE_LABEL[item.content_type]}
            </span>
          </div>
        )}

        <p className="font-bold text-sm leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>{item.title}</p>

        <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: statusColor }}>
          {item.ai_status === 'pending' ? <Clock size={13} /> : <AlertTriangle size={13} />}
          {statusLabel}
        </div>

        {item.reason && (
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Raison : {REASON_LABEL[item.reason] ?? item.reason}
          </p>
        )}

        {item.created_at && (
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            {format(new Date(item.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
            {deleting ? <Spinner size="sm" /> : <Trash2 size={13} />}
            Supprimer
          </button>
          {editPath && (
            <button onClick={() => navigate(`${editPath}?edit=${item.content_id}`)}
              className="ml-auto flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
              style={{ background: `${statusColor}18`, color: statusColor }}>
              <Edit3 size={12} /> Modifier
            </button>
          )}
        </div>
      </div>
      {ConfirmDialog}
    </div>
  );
}

export default function MyVerificationQueuePage() {
  const [items, setItems]     = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiClient.get<QueueItem[]>(Endpoints.reports.me)
      .then(r => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = (id: string) => setItems(prev => prev.filter(i => i.content_id !== id));

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.12)' }}>
          <ShieldCheck size={20} style={{ color: '#F59E0B' }} />
        </div>
        <div>
          <h1 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Vérifications</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {items.length} contenu{items.length !== 1 ? 's' : ''} en attente ou signalé{items.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? <PageLoader /> : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
              <ShieldCheck size={28} style={{ color: '#10B981' }} />
            </div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Tout est en ordre</p>
            <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
              Aucun de vos contenus n'est en attente de vérification ou signalé.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => (
              <QueueCard key={`${item.content_type}-${item.content_id}`} item={item} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
