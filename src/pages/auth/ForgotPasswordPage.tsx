import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await apiClient.post(Endpoints.auth.forgotPassword, { email });
      setSent(true);
    } catch (err: any) {
      setError(err.message ?? 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text">FoliX</h1>
        </div>

        <div className="card p-6">
          <Link to="/auth/login" className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4">
            <ArrowLeft size={16} /> Retour
          </Link>

          {sent ? (
            <div className="text-center py-4">
              <CheckCircle className="text-brand-green mx-auto mb-3" size={40} />
              <h2 className="font-semibold text-[var(--text-primary)] mb-2">Email envoyé !</h2>
              <p className="text-sm text-[var(--text-secondary)]">Vérifiez votre boîte mail pour réinitialiser votre mot de passe.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="font-semibold text-[var(--text-primary)] mb-1">Mot de passe oublié</h2>
                <p className="text-sm text-[var(--text-secondary)]">Entrez votre email pour recevoir un lien de réinitialisation.</p>
              </div>

              {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>}

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Email</label>
                <input className="input" type="email" placeholder="jean@exemple.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Envoi...' : 'Envoyer le lien'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
