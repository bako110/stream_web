import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Send } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';
import { extractApiErrorMessage } from '../../utils/apiError';

const CONTENT_TYPES = [
  { id: 'music',   label: 'Musique' },
  { id: 'video',   label: 'Video / Reels' },
  { id: 'live',    label: 'Live / Concert' },
  { id: 'podcast', label: 'Podcast' },
  { id: 'gaming',  label: 'Gaming' },
  { id: 'other',   label: 'Autre' },
] as const;

type ContentTypeId = typeof CONTENT_TYPES[number]['id'];

const DESC_MIN = 30;
const DESC_MAX = 500;

export default function WalletMonetisationRequestPage() {
  const navigate = useNavigate();

  const [selectedTypes, setSelectedTypes] = useState<ContentTypeId[]>([]);
  const [description,   setDescription]   = useState('');
  const [paymentEmail,  setPaymentEmail]   = useState('');
  const [submitting,    setSubmitting]     = useState(false);
  const [success,       setSuccess]        = useState(false);
  const [errors,        setErrors]         = useState<Record<string, string>>({});

  function toggleType(id: ContentTypeId) {
    setSelectedTypes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  }

  function validate() {
    const e: Record<string, string> = {};
    if (selectedTypes.length === 0)
      e.types = 'Selectionnez au moins un type de contenu.';
    if (description.trim().length < DESC_MIN)
      e.description = `Minimum ${DESC_MIN} caracteres (${description.trim().length} saisis).`;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paymentEmail.trim()))
      e.paymentEmail = 'Adresse email invalide.';
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setSubmitting(true);
    try {
      // Le backend (MonetizationRequestIn) attend creator_type/display_name/description/
      // accepts_terms — mêmes champs que le formulaire mobile équivalent.
      await apiClient.post(Endpoints.monetization.request, {
        creator_type:  selectedTypes[0],
        display_name:  description.trim().slice(0, 60),
        description:   description.trim(),
        accepts_terms: true,
      });
      setSuccess(true);
    } catch (err: any) {
      setErrors({ submit: extractApiErrorMessage(err, 'Une erreur est survenue. Veuillez reessayer.') });
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Success state ─────────────────────────────────────────────────── */
  if (success) {
    return (
      <div className="w-full mx-auto px-4 py-6">
        <div className="flex flex-col items-center gap-5 py-20 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.4)' }}>
            <Check size={36} style={{ color: '#22C55E' }} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Demande envoyee !</p>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Notre equipe examinera votre profil sous 2 a 5 jours ouvres. Vous recevrez une notification des que la decision sera prise.
            </p>
          </div>
          <button
            onClick={() => navigate('/wallet')}
            className="px-6 py-3 rounded-2xl font-black text-sm"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            Retour au wallet
          </button>
        </div>
      </div>
    );
  }

  /* ── Form ──────────────────────────────────────────────────────────── */
  return (
    <div className="w-full mx-auto px-4 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/wallet/monetisation')}
          className="p-2.5 rounded-xl transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <ArrowLeft size={17} />
        </button>
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Demande de monetisation</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Remplissez le formulaire ci-dessous</p>
        </div>
      </div>

      {/* Content types */}
      <div>
        <label className="text-xs font-black uppercase tracking-wider mb-3 block" style={{ color: 'var(--text-tertiary)' }}>
          Types de contenu *
        </label>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map(ct => {
            const active = selectedTypes.includes(ct.id);
            return (
              <button
                key={ct.id}
                onClick={() => toggleType(ct.id)}
                className="px-3.5 py-2 rounded-full text-xs font-bold transition-all"
                style={{
                  background: active ? 'var(--primary)' : 'var(--surface)',
                  border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
                  color: active ? '#fff' : 'var(--text-secondary)',
                }}>
                {active && <Check size={10} style={{ display: 'inline', marginRight: 5 }} />}
                {ct.label}
              </button>
            );
          })}
        </div>
        {errors.types && (
          <p className="text-xs mt-1.5" style={{ color: '#7B3FF2' }}>{errors.types}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Description de votre activite *
          </label>
          <span className="text-xs" style={{ color: description.length > DESC_MAX ? '#7B3FF2' : 'var(--text-tertiary)' }}>
            {description.length}/{DESC_MAX}
          </span>
        </div>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value.slice(0, DESC_MAX))}
          placeholder="Decrivez votre activite creative, votre audience, la frequence de publication..."
          rows={5}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
          style={{ background: 'var(--surface)', border: `1px solid ${errors.description ? '#7B3FF2' : 'var(--border)'}`, color: 'var(--text-primary)' }}
        />
        {errors.description && (
          <p className="text-xs mt-1" style={{ color: '#7B3FF2' }}>{errors.description}</p>
        )}
      </div>

      {/* Payment email */}
      <div>
        <label className="text-xs font-black uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>
          Email de paiement *
        </label>
        <input
          type="email"
          value={paymentEmail}
          onChange={e => setPaymentEmail(e.target.value)}
          placeholder="email@exemple.com"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: 'var(--surface)', border: `1px solid ${errors.paymentEmail ? '#7B3FF2' : 'var(--border)'}`, color: 'var(--text-primary)' }}
        />
        {errors.paymentEmail && (
          <p className="text-xs mt-1" style={{ color: '#7B3FF2' }}>{errors.paymentEmail}</p>
        )}
      </div>

      {/* Legal note */}
      <div className="rounded-xl px-4 py-3"
        style={{ background: 'rgba(123,63,242,0.06)', border: '1px solid rgba(123,63,242,0.15)' }}>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          En soumettant ce formulaire, vous confirmez avoir lu et accepte les{' '}
          <span className="font-bold" style={{ color: 'var(--primary)' }}>Conditions Generales d'Utilisation</span>{' '}
          et la politique de monetisation de la plateforme. Vous certifiez que les informations fournies sont exactes.
        </p>
      </div>

      {/* Submit error */}
      {errors.submit && (
        <div className="rounded-xl px-4 py-3"
          style={{ background: 'rgba(123,63,242,0.08)', border: '1px solid rgba(123,63,242,0.25)' }}>
          <p className="text-xs" style={{ color: '#7B3FF2' }}>{errors.submit}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-4 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
        style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 8px 24px rgba(123,63,242,0.3)' }}>
        {submitting ? <Spinner size="sm" /> : <><Send size={15} /> Envoyer ma demande</>}
      </button>
    </div>
  );
}
