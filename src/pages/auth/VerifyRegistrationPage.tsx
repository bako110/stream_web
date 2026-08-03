import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent, type ClipboardEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, MailCheck, CheckCircle } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { RoundLogo } from '../../components/ui/RoundLogo';
import { getSafeRedirect } from '../../utils/safeRedirect';
import { extractApiErrorMessage } from '../../utils/apiError';

const accent = '#7B3FF2';
const RESEND_DELAY = 60;

export default function VerifyRegistrationPage() {
  const { isDark } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore(s => s.login);

  const state = location.state as { userId?: string; identifier?: string; password?: string } | null;
  const redirectTo = getSafeRedirect(new URLSearchParams(location.search).get('redirect'));

  const [code,        setCode]        = useState(['', '', '', '', '', '']);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [focused,     setFocused]     = useState('');
  const [resendTimer, setResendTimer] = useState(RESEND_DELAY);
  const [done,        setDone]        = useState(false);

  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Pas de userId en state (accès direct à l'URL, refresh de page...) — rien à
    // vérifier ici, retour à l'inscription.
    if (!state?.userId) navigate('/auth/register', { replace: true });
  }, [state, navigate]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setResendTimer(t => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function handleCodeChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...code];
    next[index] = value.slice(-1);
    setCode(next);
    setError('');
    if (value && index < 5) codeRefs.current[index + 1]?.focus();
  }

  function handleCodeKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  }

  function handleCodePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...code];
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setCode(next);
    codeRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    const otp = code.join('');
    if (otp.length < 6 || !state?.userId) { setError('Entrez les 6 chiffres du code.'); return; }
    setLoading(true); setError('');
    try {
      await apiClient.post(Endpoints.auth.verifyRegistration, { user_id: state.userId, code: otp });
      setDone(true);
      // Connexion automatique si on a l'identifiant/mot de passe (venant de RegisterPage)
      if (state.identifier && state.password) {
        try {
          await login({ identifier: state.identifier, password: state.password });
          navigate(redirectTo, { replace: true });
        } catch { /* le bouton "Se connecter" reste disponible en secours */ }
      }
    } catch (err: any) {
      setError(extractApiErrorMessage(err, 'Code invalide ou expiré.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendTimer > 0 || !state?.userId) return;
    setLoading(true); setError('');
    try {
      await apiClient.post(Endpoints.auth.resendVerificationCode, { user_id: state.userId });
      setCode(['', '', '', '', '', '']);
      setResendTimer(RESEND_DELAY);
      timerRef.current = setInterval(() => {
        setResendTimer(t => {
          if (t <= 1) { clearInterval(timerRef.current!); return 0; }
          return t - 1;
        });
      }, 1000);
      setTimeout(() => codeRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(extractApiErrorMessage(err, 'Erreur lors du renvoi du code.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Left panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] relative overflow-hidden p-10"
        style={{ background: 'linear-gradient(145deg,#0d0118 0%,#1a0533 40%,#2d0f5e 70%,#1a0533 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-80px] left-[-80px] w-72 h-72 rounded-full"
            style={{ background: 'radial-gradient(circle,#7B3FF2,transparent 70%)', opacity: 0.35 }} />
          <div className="absolute bottom-[-60px] right-[-60px] w-64 h-64 rounded-full"
            style={{ background: 'radial-gradient(circle,#7B3FF2,transparent 70%)', opacity: 0.25 }} />
          <div className="absolute inset-0 hero-grid opacity-20" />
        </div>

        <div className="relative z-10">
          <RoundLogo size={44} />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(123,63,242,0.2)', border: '1px solid rgba(123,63,242,0.35)' }}>
            <MailCheck size={28} style={{ color: '#A78BFA' }} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white leading-tight mb-3">
              Plus qu'une étape<br />
              <span style={{ background: 'linear-gradient(90deg,#A78BFA,#F472B6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                pour finaliser
              </span>
            </h1>
            <p className="text-white/60 text-sm leading-relaxed">
              Confirmez votre compte avec le code que nous venons de vous envoyer.
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/30 text-xs">© 2026 GoFolyX</p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden lg:hidden">
          <div className="absolute -top-32 -left-32 w-72 h-72 rounded-full"
            style={{ background: `radial-gradient(circle,${accent},transparent 70%)`, opacity: isDark ? 0.14 : 0.05 }} />
        </div>

        <div className="relative w-full max-w-md">

          <div className="flex justify-center mb-8 lg:hidden">
            <RoundLogo size={52} />
          </div>

          {!done && (
            <Link to="/auth/login"
              className="inline-flex items-center gap-2 text-sm font-medium mb-8 transition-colors"
              style={{ color: 'var(--text-secondary)' }}>
              <ArrowLeft size={15} />
              Retour à la connexion
            </Link>
          )}

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
              {error}
            </div>
          )}

          {!done ? (
            <>
              <div className="mb-7">
                <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>Vérifiez votre compte</h2>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  Un code à 6 chiffres a été envoyé par email ou SMS. Il expire après 15 minutes.
                </p>
              </div>
              <form onSubmit={handleVerify} className="space-y-6">
                <div className="flex gap-3 justify-center">
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { codeRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleCodeChange(i, e.target.value)}
                      onKeyDown={e => handleCodeKeyDown(i, e)}
                      onPaste={handleCodePaste}
                      onFocus={() => setFocused(`code${i}`)}
                      onBlur={() => setFocused('')}
                      autoFocus={i === 0}
                      className="w-12 h-14 text-center text-xl font-black rounded-xl border outline-none transition-all"
                      style={{
                        background:  'var(--bg-secondary)',
                        borderColor: focused === `code${i}` ? accent : digit ? accent + '80' : 'var(--border)',
                        color:       'var(--text-primary)',
                        boxShadow:   focused === `code${i}` ? '0 0 0 3px rgba(123,63,242,0.18)' : 'none',
                      }}
                    />
                  ))}
                </div>
                <button type="submit" disabled={code.join('').length < 6 || loading} className="btn-primary w-full"
                  style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', opacity: (code.join('').length < 6 || loading) ? 0.5 : 1 }}>
                  {loading
                    ? <span className="inline-flex gap-1">{[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-white" style={{ animation: `blink 1s ease-in-out ${i*0.15}s infinite` }} />)}</span>
                    : 'Vérifier le code'}
                </button>
                <div className="text-center">
                  <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Vous n'avez pas reçu le code ? </span>
                  <button type="button" onClick={handleResend} disabled={loading || resendTimer > 0}
                    className="text-sm font-semibold" style={{ color: resendTimer > 0 ? 'var(--text-tertiary)' : accent, background: 'none', border: 'none', cursor: 'pointer' }}>
                    {resendTimer > 0 ? `Renvoyer dans ${resendTimer}s` : 'Renvoyer'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
                <CheckCircle size={38} style={{ color: '#10b981' }} />
              </div>
              <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
                Compte vérifié !
              </h2>
              <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
                Votre compte est prêt. Bienvenue sur GoFolyX.
              </p>
              <Link to="/auth/login" className="btn-primary px-8" style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
                Se connecter
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
