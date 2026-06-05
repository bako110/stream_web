import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Users, FileText, CalendarDays, ShieldCheck, ChevronRight, AlertCircle } from 'lucide-react';
import { apiClient } from '../../api';
import { Spinner } from '../../components/ui/Spinner';

type MonetizationStatus = 'none' | 'pending' | 'approved' | 'rejected';

interface MonetizationStatusResponse {
  status: MonetizationStatus;
  rejection_reason?: string;
}

const CONDITIONS = [
  { icon: <Users size={15} />,        label: '100 abonnés minimum',            color: '#7B3FF2' },
  { icon: <FileText size={15} />,     label: '5 contenus publiés',             color: '#7B3FF2' },
  { icon: <CalendarDays size={15} />, label: 'Compte actif depuis 30 jours',   color: '#7B3FF2' },
  { icon: <ShieldCheck size={15} />,  label: 'Respect des CGU et politiques',  color: '#22C55E' },
];

export default function WalletMonetisationPage() {
  const navigate = useNavigate();
  const [status,  setStatus]  = useState<MonetizationStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<MonetizationStatusResponse>('/api/v1/wallet/monetization/status')
      .then(r => setStatus(r.data))
      .catch(() => setStatus({ status: 'none' }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="max-w-2xl mx-auto p-6 flex justify-center py-20"><Spinner /></div>
  );

  const s = status?.status ?? 'none';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/wallet')}
          className="p-2.5 rounded-xl transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <ArrowLeft size={17} />
        </button>
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Monétisation</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Gagnez des revenus grâce à votre contenu</p>
        </div>
      </div>

      {/* ── APPROVED ────────────────────────────────────────────────────── */}
      {s === 'approved' && (
        <div className="space-y-4">
          <div className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 10px 32px rgba(123,63,242,0.3)' }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 80% 10%, rgba(255,255,255,0.12), transparent 55%)' }} />
            <p className="text-xs text-white/70 font-medium uppercase tracking-wider mb-1">Statut</p>
            <p className="text-2xl font-black text-white mb-1">Compte monetise</p>
            <p className="text-sm text-white/70">Votre compte est approuve pour la monetisation.</p>
          </div>

          <button
            onClick={() => navigate('/wallet/creator')}
            className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(123,63,242,0.12)', color: 'var(--primary)' }}>
              <ChevronRight size={20} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Dashboard createur</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Statistiques, gains et contenu performant</p>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>
      )}

      {/* ── PENDING ─────────────────────────────────────────────────────── */}
      {s === 'pending' && (
        <div className="rounded-2xl p-6 flex flex-col items-center gap-4 text-center"
          style={{ background: 'var(--surface)', border: '1px solid rgba(123,63,242,0.3)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(123,63,242,0.12)' }}>
            <Clock size={28} style={{ color: '#7B3FF2' }} />
          </div>
          <div>
            <p className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Demande en cours d'examen</p>
            <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Notre equipe examine votre profil. Vous serez notifie des que la decision sera prise.
            </p>
          </div>
          <div className="px-4 py-2 rounded-full"
            style={{ background: 'rgba(123,63,242,0.1)', border: '1px solid rgba(123,63,242,0.25)' }}>
            <p className="text-xs font-black" style={{ color: '#7B3FF2' }}>2 a 5 jours ouvres</p>
          </div>
        </div>
      )}

      {/* ── NONE / REJECTED ─────────────────────────────────────────────── */}
      {(s === 'none' || s === 'rejected') && (
        <div className="space-y-4">

          {/* Rejection reason */}
          {s === 'rejected' && status?.rejection_reason && (
            <div className="rounded-xl px-4 py-3.5 flex items-start gap-3"
              style={{ background: 'rgba(123,63,242,0.08)', border: '1px solid rgba(123,63,242,0.25)' }}>
              <AlertCircle size={16} style={{ color: '#7B3FF2', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p className="text-xs font-black mb-0.5" style={{ color: '#7B3FF2' }}>Demande refusee</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {status.rejection_reason}
                </p>
              </div>
            </div>
          )}

          {/* Conditions card */}
          <div className="rounded-2xl p-5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-black uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>
              Conditions requises
            </p>
            <div className="space-y-3">
              {CONDITIONS.map(c => (
                <div key={c.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${c.color}18`, color: c.color }}>
                    {c.icon}
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{c.label}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => navigate('/wallet/monetisation/request')}
            className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 transition-all"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 8px 24px rgba(123,63,242,0.3)' }}>
            Faire une demande
          </button>

          {s === 'rejected' && (
            <p className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
              Vous pouvez soumettre une nouvelle demande apres avoir corrige les points signales.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
