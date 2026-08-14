import { useState } from 'react';
import type { FormEvent } from 'react';
import { X, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { accountsService } from '../../services/accountsService';
import { getApiErrorDetail, extractApiErrorMessage } from '../../utils/apiError';

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

/** Modal de connexion simplifie (identifiant + mot de passe) dedie a
 * l'ajout d'un compte supplementaire — meme principe que AddAccountScreen.tsx
 * sur mobile (wrapper fin de LoginScreen, meme point de sortie onLoginSuccess) :
 * reutilise login(), qui pose deja les tokens dans authStore, puis enregistre
 * cette session comme nouveau compte via accountsService.
 *
 * IMPORTANT : login() remplace immediatement la session ACTIVE en memoire
 * (useAuthStore) des l'appel, avant meme la confirmation d'ajout ci-dessous —
 * si l'utilisateur ferme ce modal ou qu'une erreur survient apres un login
 * partiellement reussi, le compte precedent resterait remplace sans avoir ete
 * sauvegarde dans la liste. accountsService.addCurrentSessionAsAccount() doit
 * donc TOUJOURS s'executer juste apres un login reussi, jamais differe. */
export function AddAccountModal({ onClose, onAdded }: Props) {
  const { login } = useAuthStore();
  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [showPwd,    setShowPwd]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login({ identifier: identifier.trim(), password });
      accountsService.addCurrentSessionAsAccount();
      onAdded();
    } catch (err: any) {
      // Meme cas que AddAccountScreen.tsx (mobile) : un compte non verifie ne
      // peut pas etre ajoute depuis ce flux simplifie (pas d'ecran OTP ici) —
      // message clair au lieu d'une erreur generique, comme le toast mobile.
      const detail = getApiErrorDetail(err) as any;
      if (detail && typeof detail === 'object' && detail.code === 'account_unverified') {
        setError('Ce compte doit d\'abord être vérifié depuis la page de connexion principale.');
      } else {
        setError(extractApiErrorMessage(err, 'Connexion impossible. Vérifie tes identifiants.'));
      }
    } finally {
      setLoading(false);
    }
  }

  // Fermeture bloquee pendant le chargement : login() pose deja les tokens
  // dans authStore avant qu'on puisse les capturer via
  // addCurrentSessionAsAccount() -- fermer entre les deux remplacerait la
  // session active sans jamais l'avoir sauvegardee dans la liste de comptes.
  function handleClose() {
    if (loading) return;
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={handleClose}>
      <div className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Ajouter un compte</h2>
          <button onClick={handleClose} disabled={loading} className="p-1.5 rounded-lg transition-colors disabled:opacity-40" style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-3.5 py-2.5 rounded-xl text-sm"
            style={{ background: 'rgba(123,63,242,0.1)', border: '1px solid rgba(123,63,242,0.3)', color: '#7B3FF2' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Email, téléphone ou nom d'utilisateur
            </label>
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              required
              autoFocus
              className="input w-full"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Mot de passe</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="input w-full pr-11"
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading || !identifier.trim() || !password}
            className="btn-primary w-full gap-2 disabled:opacity-50">
            {loading ? 'Connexion…' : <><Sparkles size={16} /> Ajouter ce compte</>}
          </button>
        </form>

        <p className="text-xs text-center mt-4" style={{ color: 'var(--text-tertiary)' }}>
          Le compte doit déjà exister. Crée-le depuis la page de connexion principale si besoin.
        </p>
      </div>
    </div>
  );
}
