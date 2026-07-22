import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from './Spinner';

export type ReportContentType = 'reel' | 'event' | 'concert' | 'comment' | 'post' | 'live';
export type ReportReason = 'spam' | 'inappropriate' | 'violence' | 'harassment' | 'misinformation' | 'other';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam',           label: 'Spam' },
  { value: 'inappropriate',  label: 'Contenu inapproprié' },
  { value: 'violence',       label: 'Violence' },
  { value: 'harassment',     label: 'Harcèlement' },
  { value: 'misinformation', label: 'Désinformation' },
  { value: 'other',          label: 'Autre' },
];

interface Props {
  open: boolean;
  contentType: ReportContentType;
  contentId: string;
  onClose: () => void;
}

export function ReportModal({ open, contentType, contentId, onClose }: Props) {
  const [selected, setSelected] = useState<ReportReason | null>(null);
  const [details, setDetails]   = useState('');
  const [loading, setLoading]   = useState(false);

  if (!open) return null;

  function reset() { setSelected(null); setDetails(''); setLoading(false); }
  function handleClose() { reset(); onClose(); }

  async function handleSubmit() {
    if (!selected) return;
    setLoading(true);
    try {
      await apiClient.post(Endpoints.reports.create, {
        content_type: contentType, content_id: contentId, reason: selected, details: details.trim() || undefined,
      });
      reset();
      onClose();
      toast.success('Signalement envoyé, merci — nous allons examiner ce contenu.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={handleClose}>
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl sm:mb-6 overflow-hidden"
        style={{ background: 'var(--surface)' }}
        onClick={e => e.stopPropagation()}>

        <div className="w-9 h-1 rounded-full mx-auto mt-3 sm:hidden" style={{ background: 'var(--border)' }} />

        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>Signaler ce contenu</p>
          <button onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pb-5">
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Pourquoi signalez-vous ce contenu ?</p>

          <div className="flex flex-col gap-1 mb-3">
            {REASONS.map(r => (
              <button key={r.value} onClick={() => setSelected(r.value)}
                className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-colors text-left"
                style={{ background: selected === r.value ? 'rgba(123,63,242,0.1)' : 'transparent' }}>
                <span className="flex items-center justify-center rounded-full shrink-0"
                  style={{ width: 20, height: 20, border: `2px solid ${selected === r.value ? '#7B3FF2' : 'var(--border)'}` }}>
                  {selected === r.value && <span className="rounded-full" style={{ width: 10, height: 10, background: '#7B3FF2' }} />}
                </span>
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{r.label}</span>
              </button>
            ))}
          </div>

          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder="Détails supplémentaires (optionnel)"
            maxLength={500}
            className="input text-sm w-full min-h-[70px]"
          />

          <button onClick={handleSubmit} disabled={!selected || loading}
            className="w-full mt-4 rounded-xl py-3.5 text-sm font-bold text-white flex items-center justify-center disabled:opacity-50"
            style={{ background: selected ? '#EF4444' : 'var(--border)' }}>
            {loading ? <Spinner size="sm" /> : 'Envoyer le signalement'}
          </button>
        </div>
      </div>
    </div>
  );
}
