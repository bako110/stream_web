import { useState, useEffect, useCallback } from 'react';
import {
  Edit3, AlertTriangle, Zap, MessageCircle, Send,
} from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Spinner, PageLoader } from '../components/ui/Spinner';
import toast from 'react-hot-toast';

type FeedbackCategory = 'bug' | 'suggestion' | 'avis';
type FeedbackStatus = 'nouveau' | 'lu' | 'traite';

interface Feedback {
  id: string;
  category: FeedbackCategory;
  message: string;
  status: FeedbackStatus;
  admin_response: string | null;
  created_at: string;
}

const CATEGORIES: { value: FeedbackCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'bug',        label: 'Signaler un bug',            icon: <AlertTriangle size={18} />, color: '#EF4444' },
  { value: 'suggestion', label: 'Suggérer une amélioration',  icon: <Zap size={18} />,            color: '#F59E0B' },
  { value: 'avis',       label: 'Donner un avis général',     icon: <MessageCircle size={18} />,  color: '#7B3FF2' },
];

const STATUS_LABEL: Record<FeedbackStatus, { label: string; color: string }> = {
  nouveau: { label: 'Envoyé', color: '#6B7280' },
  lu:      { label: 'Lu',     color: '#0EA5E9' },
  traite:  { label: 'Traité', color: '#10B981' },
};

export default function FeedbackPage() {
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [message,  setMessage]  = useState('');
  const [sending,  setSending]  = useState(false);

  const [history, setHistory] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const res = await apiClient.get<Feedback[]>(Endpoints.feedback.mine);
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch { /* historique non critique */ }
  }, []);

  useEffect(() => { loadHistory().finally(() => setLoading(false)); }, [loadHistory]);

  async function handleSubmit() {
    if (!category || !message.trim() || sending) return;
    setSending(true);
    try {
      await apiClient.post(Endpoints.feedback.create, { category, message: message.trim() });
      setCategory(null);
      setMessage('');
      await loadHistory();
      toast.success('Merci ! Ton retour a bien été envoyé à notre équipe.');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Une erreur est survenue.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* Hero */}
      <div className="rounded-2xl p-6 flex flex-col items-center text-center" style={{ background: 'rgba(123,63,242,0.08)' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(123,63,242,0.15)' }}>
          <Edit3 size={28} style={{ color: 'var(--primary)' }} />
        </div>
        <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Ton avis compte</h1>
        <p className="text-sm mt-1.5 max-w-sm" style={{ color: 'var(--text-tertiary)' }}>
          Un bug à signaler ? Une idée pour améliorer Gofolyx ? Dis-nous tout.
        </p>
      </div>

      {/* Catégorie */}
      <div>
        <p className="text-xs font-black tracking-widest mb-2.5" style={{ color: 'var(--text-tertiary)' }}>TYPE DE RETOUR</p>
        <div className="space-y-2">
          {CATEGORIES.map(c => {
            const active = category === c.value;
            return (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className="w-full flex items-center gap-3 rounded-xl p-3.5 transition-colors text-left"
                style={{
                  background: active ? c.color + '12' : 'var(--surface)',
                  border: `1.5px solid ${active ? c.color : 'var(--border)'}`,
                }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.color + '18', color: c.color }}>
                  {c.icon}
                </div>
                <span className="text-sm font-semibold flex-1" style={{ color: 'var(--text-primary)' }}>{c.label}</span>
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: active ? c.color : 'var(--border)' }}>
                  {active && <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message */}
      <div>
        <p className="text-xs font-black tracking-widest mb-2.5" style={{ color: 'var(--text-tertiary)' }}>TON MESSAGE</p>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value.slice(0, 2000))}
          placeholder="Décris ton retour en quelques mots…"
          rows={5}
          className="w-full rounded-xl p-3.5 text-sm resize-none outline-none transition-colors"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
        <p className="text-xs text-right mt-1" style={{ color: 'var(--text-tertiary)' }}>{message.length}/2000</p>

        <button
          onClick={handleSubmit}
          disabled={!category || !message.trim() || sending}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white mt-3 transition-opacity disabled:opacity-40"
          style={{ background: 'var(--primary)' }}
        >
          {sending ? <Spinner size="sm" /> : <Send size={16} />}
          Envoyer
        </button>
      </div>

      {/* Historique */}
      <div>
        <p className="text-xs font-black tracking-widest mb-2.5" style={{ color: 'var(--text-tertiary)' }}>MES RETOURS ENVOYÉS</p>
        {loading ? (
          <PageLoader />
        ) : history.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Tu n'as pas encore envoyé de retour.</p>
        ) : (
          <div className="space-y-2.5">
            {history.map(f => {
              const cat = CATEGORIES.find(c => c.value === f.category);
              const st  = STATUS_LABEL[f.status];
              return (
                <div key={f.id} className="rounded-xl p-3.5 space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span style={{ color: cat?.color ?? 'var(--text-tertiary)' }}>{cat?.icon}</span>
                      <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{cat?.label ?? f.category}</span>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0" style={{ background: st.color + '18', color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.message}</p>
                  {f.admin_response && (
                    <div className="rounded-lg p-2.5 mt-1" style={{ background: 'rgba(123,63,242,0.06)', border: '1px solid rgba(123,63,242,0.2)' }}>
                      <p className="text-[11px] font-bold mb-1" style={{ color: 'var(--primary)' }}>Réponse de l'équipe</p>
                      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{f.admin_response}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
