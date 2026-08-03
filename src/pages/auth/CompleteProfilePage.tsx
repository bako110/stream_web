import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Sparkles } from 'lucide-react';
import { RoundLogo } from '../../components/ui/RoundLogo';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import type { Gender, User } from '../../types';
import { getSafeRedirect } from '../../utils/safeRedirect';
import { extractApiErrorMessage } from '../../utils/apiError';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'female',            label: 'Femme' },
  { value: 'male',              label: 'Homme' },
  { value: 'other',             label: 'Autre' },
  { value: 'prefer_not_to_say', label: 'Ne pas préciser' },
];

/**
 * Écran affiché juste après une inscription Google/Facebook — ces providers
 * ne fournissent ni date de naissance ni sexe, contrairement à l'inscription
 * classique où ces champs sont obligatoires. On les complète ici avant
 * de laisser l'utilisateur accéder au reste de l'app.
 */
export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = getSafeRedirect(searchParams.get('redirect'));
  const { updateUser } = useAuthStore();

  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate(): string | null {
    if (!dateOfBirth) return 'La date de naissance est requise';
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime()) || dob > new Date()) return 'Date de naissance invalide';
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    if (age < 13) return "Tu dois avoir au moins 13 ans pour utiliser GoFolyX";
    if (!gender) return 'Le sexe est requis';
    return null;
  }

  async function handleSubmit() {
    const err = validate();
    if (err) return setError(err);
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.patch<User>(Endpoints.users.updateMe, {
        date_of_birth: dateOfBirth,
        gender,
      });
      updateUser(res.data);
      navigate(redirectTo, { replace: true });
    } catch (e: any) {
      setError(extractApiErrorMessage(e, 'Mise à jour impossible'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <RoundLogo size={52} />
        </div>

        <div className="text-center mb-7">
          <h1 className="text-2xl font-black mb-1.5" style={{ color: 'var(--text-primary)' }}>
            Encore une étape
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            Complète ton profil pour finaliser ton inscription.
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Date de naissance</label>
            <div className="relative">
              <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
              <input className="input pl-10" type="date" autoFocus
                value={dateOfBirth}
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => { setDateOfBirth(e.target.value); setError(''); }} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Sexe</label>
            <div className="grid grid-cols-2 gap-2">
              {GENDERS.map(g => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => { setGender(g.value); setError(''); }}
                  className="py-2.5 rounded-xl text-sm font-semibold transition-all text-center"
                  style={{
                    background: gender === g.value ? 'rgba(123,63,242,0.12)' : 'var(--surface)',
                    border: `1.5px solid ${gender === g.value ? 'var(--primary)' : 'var(--border)'}`,
                    color: gender === g.value ? 'var(--primary)' : 'var(--text-primary)',
                  }}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <button type="button" onClick={handleSubmit} disabled={loading} className="btn-primary w-full gap-2 mt-1"
            style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
            {loading ? (
              <span className="inline-flex gap-1">
                {[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-white"
                  style={{ animation: `blink 1s ease-in-out ${i * 0.15}s infinite` }} />)}
              </span>
            ) : <Sparkles size={16} />}
            {loading ? 'Enregistrement…' : 'Continuer'}
          </button>
        </div>
      </div>
    </div>
  );
}
