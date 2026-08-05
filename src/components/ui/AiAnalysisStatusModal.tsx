import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Clock, HelpCircle } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from './Spinner';
import { useWs, type WsPayload } from '../../context/WebSocketContext';

export type AiContentType = 'reel' | 'post' | 'event' | 'concert';
type Verdict = 'cleared' | 'limited' | 'removed' | null;

const CONTENT_LABEL: Record<AiContentType, string> = {
  reel: 'reel', post: 'publication', event: 'événement', concert: 'concert',
};

const VERDICT_FROM_TYPE: Record<string, Verdict> = {
  reel_analysis_cleared: 'cleared',
  reel_analysis_limited: 'limited',
  reel_analysis_removed: 'removed',
};

interface Props {
  open: boolean;
  contentType: AiContentType;
  contentId: string;
  initialStatus?: 'pending' | 'done' | null;
  onClose: () => void;
}

export function AiAnalysisStatusModal({ open, contentType, contentId, initialStatus, onClose }: Props) {
  const [status, setStatus]   = useState<'pending' | 'done' | null | undefined>(initialStatus);
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [loading, setLoading] = useState(false);
  const { addListener, removeListener } = useWs();

  useEffect(() => {
    if (!open) return;
    setStatus(initialStatus);
    setVerdict(null);
    if (initialStatus == null) return; // pas de media, pas d'analyse a chercher

    setLoading(true);
    apiClient.get<Array<{ notification_type: string }>>(Endpoints.notifications.byRef(contentId))
      .then(res => {
        const hit = res.data.find(n => n.notification_type in VERDICT_FROM_TYPE);
        if (hit) {
          setStatus('done');
          setVerdict(VERDICT_FROM_TYPE[hit.notification_type]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, contentId, initialStatus]);

  useEffect(() => {
    if (!open) return;
    const handler = (p: WsPayload) => {
      if (
        p.type === 'notification' &&
        p.ref_id === contentId &&
        typeof p.notification_type === 'string' &&
        p.notification_type in VERDICT_FROM_TYPE
      ) {
        setStatus('done');
        setVerdict(VERDICT_FROM_TYPE[p.notification_type]);
      }
    };
    addListener(handler);
    return () => removeListener(handler);
  }, [open, contentId, addListener, removeListener]);

  if (!open) return null;

  const label = CONTENT_LABEL[contentType];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl sm:mb-6 overflow-hidden"
        style={{ background: 'var(--surface)' }}
        onClick={e => e.stopPropagation()}>

        <div className="w-9 h-1 rounded-full mx-auto mt-3 sm:hidden" style={{ background: 'var(--border)' }} />

        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>Vérification automatique</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pb-6 flex flex-col items-center text-center gap-3">
          {loading ? (
            <Spinner size="md" />
          ) : status == null ? (
            <>
              <HelpCircle size={40} color="var(--text-tertiary)" />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Aucune analyse nécessaire
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Ce {label} ne contient pas de média à vérifier.
              </p>
            </>
          ) : status === 'pending' ? (
            <>
              <Clock size={40} color="var(--text-tertiary)" />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Analyse en cours…
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Votre {label} est vérifié automatiquement. Cette page se mettra à jour toute seule.
              </p>
            </>
          ) : verdict === 'cleared' ? (
            <>
              <CheckCircle size={40} color="#10B981" />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Tout est en ordre
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Votre {label} a été vérifié automatiquement, aucun problème détecté.
              </p>
            </>
          ) : verdict === 'limited' ? (
            <>
              <AlertCircle size={40} color="#F59E0B" />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Diffusion limitée
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Votre {label} a été signalé par notre système et est en cours de revue par un modérateur.
                Il reste visible sur votre profil mais n'apparaît pas dans les recommandations pour le moment.
              </p>
            </>
          ) : verdict === 'removed' ? (
            <>
              <AlertTriangle size={40} color="#EF4444" />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Retiré automatiquement
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Votre {label} a été retiré suite à une vérification de contenu. Vous pouvez contester cette décision depuis le support.
              </p>
            </>
          ) : (
            <>
              <CheckCircle size={40} color="#10B981" />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Analyse terminée
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
