import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { X, Eye, EyeOff, Sparkles, Slash, Mail } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { accountsService } from '../../services/accountsService';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { googleOAuthPopup } from '../../utils/googleOAuth';
import { getApiErrorDetail, extractApiErrorMessage } from '../../utils/apiError';

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

interface BlockedInfo { reason?: string; contact?: string; }

/** Modal de connexion dediee a l'ajout d'un compte supplementaire — portage
 * fidele de AddAccountScreen.tsx (mobile), qui est un wrapper fin de
 * LoginScreen complet (meme formulaire, Google, mot de passe oublie, ecran
 * "Compte bloque"), pas une version reduite. Seuls onNeedsVerification et
 * onGoRegister sont simplifies en message plutot qu'un vrai flux (meme choix
 * que mobile : pas d'ecran OTP/inscription dans ce contexte modal).
 *
 * IMPORTANT : login()/loginWithQR() remplacent immediatement la session
 * ACTIVE en memoire (useAuthStore) des l'appel, avant meme la confirmation
 * d'ajout ci-dessous — si l'utilisateur ferme ce modal entre les deux, le
 * compte precedent resterait remplace sans avoir ete sauvegarde dans la
 * liste. addCurrentSessionAsAccount() doit donc TOUJOURS s'executer juste
 * apres un login reussi, et la fermeture est bloquee pendant le chargement. */
export function AddAccountModal({ onClose, onAdded }: Props) {
  const { login } = useAuthStore();
  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [showPwd,    setShowPwd]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [gLoading,   setGLoading]   = useState(false);
  const [error,      setError]      = useState('');
  const [blockedInfo, setBlockedInfo] = useState<BlockedInfo | null>(null);

  function handleClose() {
    if (loading || gLoading) return;
    onClose();
  }

  function handleLoginError(err: any) {
    const detail = getApiErrorDetail(err) as any;
    if (detail && typeof detail === 'object' && detail.code === 'account_blocked') {
      setBlockedInfo({ reason: detail.reason, contact: detail.contact ?? 'support@gofolyx.com' });
      return;
    }
    if (detail && typeof detail === 'object' && detail.code === 'account_deactivated') {
      setError('Ce compte est désactivé. Réactive-le depuis la page de connexion principale.');
      return;
    }
    if (detail && typeof detail === 'object' && detail.code === 'account_unverified') {
      setError('Ce compte doit d\'abord être vérifié depuis la page de connexion principale.');
      return;
    }
    setError(extractApiErrorMessage(err, 'Connexion impossible. Vérifie tes identifiants.'));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setBlockedInfo(null);
    try {
      await login({ identifier: identifier.trim(), password });
      accountsService.addCurrentSessionAsAccount();
      onAdded();
    } catch (err: any) {
      handleLoginError(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGLoading(true);
    setError('');
    setBlockedInfo(null);
    try {
      const googleToken = await googleOAuthPopup();
      const res = await apiClient.post<any>(Endpoints.auth.oauthGoogle, { provider: 'google', access_token: googleToken });
      const token = res.data;
      if (token?.access_token) {
        await useAuthStore.getState().loginWithQR(token.access_token, token.refresh_token);
        accountsService.addCurrentSessionAsAccount();
        onAdded();
      }
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      if (!msg.includes('closed') && !msg.includes('cancelled') && !msg.includes('cancel')) {
        handleLoginError(e);
      }
    } finally {
      setGLoading(false);
    }
  }

  const busy = loading || gLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={handleClose}>
      <div className="w-full max-w-sm rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Ajouter un compte</h2>
          <button onClick={handleClose} disabled={busy} className="p-1.5 rounded-lg transition-colors disabled:opacity-40" style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <X size={18} />
          </button>
        </div>

        {blockedInfo ? (
          <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <Slash size={22} style={{ color: '#EF4444', margin: '0 auto 8px' }} />
            <p className="text-sm font-bold mb-1.5" style={{ color: '#EF4444' }}>Compte bloqué</p>
            {blockedInfo.reason && (
              <p className="text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>Raison : {blockedInfo.reason}</p>
            )}
            <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
              Ce compte a été bloqué par un administrateur.<br />Contacte le support pour en savoir plus.
            </p>
            <a href={`mailto:${blockedInfo.contact}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
              <Mail size={13} /> Contacter le support
            </a>
            <button onClick={() => setBlockedInfo(null)} className="block mx-auto mt-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Retour
            </button>
          </div>
        ) : (
          <>
            {/* Google */}
            <button onClick={handleGoogle} disabled={busy}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl mb-4 transition-all font-semibold text-sm disabled:opacity-50"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {gLoading ? 'Connexion…' : 'Continuer avec Google'}
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>ou avec identifiant</span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
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
                  disabled={busy}
                  className="input w-full"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Mot de passe</label>
                  <Link to="/auth/forgot-password" onClick={handleClose} className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    disabled={busy}
                    className="input w-full pr-11"
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={busy || !identifier.trim() || !password}
                className="btn-primary w-full gap-2 disabled:opacity-50">
                {loading ? 'Connexion…' : <><Sparkles size={16} /> Ajouter ce compte</>}
              </button>
            </form>

            <p className="text-xs text-center mt-4" style={{ color: 'var(--text-tertiary)' }}>
              Le compte doit déjà exister. Crée-le depuis la{' '}
              <Link to="/auth/register" onClick={handleClose} className="font-semibold" style={{ color: 'var(--primary)' }}>
                page de connexion principale
              </Link>{' '}si besoin.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
