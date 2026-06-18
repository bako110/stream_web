import { useState, useRef, type FormEvent, type KeyboardEvent, type ClipboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, Mail, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { useThemeStore } from '../../store/themeStore';
import { Images } from '../../components/assets';

type Step = 'email' | 'code' | 'password' | 'done';

export default function ForgotPasswordPage() {
  const { isDark } = useThemeStore();
  const navigate    = useNavigate();

  const [step,        setStep]        = useState<Step>('email');
  const [email,       setEmail]       = useState('');
  const [code,        setCode]        = useState(['', '', '', '', '', '']);
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [focused,     setFocused]     = useState('');

  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Étape 1 : envoyer l'email ──────────────────────────────────────────────
  async function handleSendEmail(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await apiClient.post(Endpoints.auth.forgotPassword, { email });
      setStep('code');
    } catch (err: any) {
      setError(err.response?.data?.detail ?? err.message ?? 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  // ── Étape 2 : saisie du code OTP ──────────────────────────────────────────
  function handleCodeChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...code];
    next[index] = value.slice(-1);
    setCode(next);
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

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    const otp = code.join('');
    if (otp.length < 6) { setError('Entrez les 6 chiffres du code.'); return; }
    setStep('password');
    setError('');
  }

  // ── Étape 3 : nouveau mot de passe ────────────────────────────────────────
  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères.'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true); setError('');
    try {
      await apiClient.post(Endpoints.auth.resetPassword, {
        token:        code.join(''),
        new_password: password,
      });
      setStep('done');
    } catch (err: any) {
      const detail = err.response?.data?.detail ?? err.message ?? 'Erreur';
      if (detail.toLowerCase().includes('expiré') || detail.toLowerCase().includes('invalide')) {
        setError('Code invalide ou expiré. Recommencez depuis le début.');
        setStep('email');
        setCode(['', '', '', '', '', '']);
      } else {
        setError(detail);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setLoading(true); setError('');
    try {
      await apiClient.post(Endpoints.auth.forgotPassword, { email });
      setCode(['', '', '', '', '', '']);
      setTimeout(() => codeRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Erreur lors du renvoi');
    } finally {
      setLoading(false);
    }
  }

  const accent = '#7B3FF2';

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
          <img src={isDark ? Images.logoDark : Images.logoLight} alt="GoFolyX" className="h-10 w-auto" />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(123,63,242,0.2)', border: '1px solid rgba(123,63,242,0.35)' }}>
            <KeyRound size={28} style={{ color: '#A78BFA' }} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white leading-tight mb-3">
              Réinitialiser<br />
              <span style={{ background: 'linear-gradient(90deg,#A78BFA,#F472B6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                votre mot de passe
              </span>
            </h1>
            <p className="text-white/60 text-sm leading-relaxed">
              Entrez votre email et nous vous enverrons un code à 6 chiffres pour réinitialiser votre mot de passe.
            </p>
          </div>
          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {[
              'Vérifiez vos spams si vous ne recevez pas l\'email',
              'Le code expire après 15 minutes',
              'Vous pouvez renvoyer un nouveau code à tout moment',
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#A78BFA' }} />
                <p className="text-white/50 text-xs">{tip}</p>
              </div>
            ))}
          </div>

          {/* Indicateur d'étapes */}
          <div className="flex items-center gap-2">
            {(['email', 'code', 'password', 'done'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    background: step === s ? accent : ['email','code','password','done'].indexOf(step) > i ? 'rgba(123,63,242,0.5)' : 'rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}>
                  {['email','code','password','done'].indexOf(step) > i ? '✓' : i + 1}
                </div>
                {i < 3 && <div className="w-6 h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/30 text-xs">© 2026 Sahelys · Intégrateur de solutions informatiques</p>
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
            <img src={isDark ? Images.logoDark : Images.logoLight} alt="GoFolyX" className="h-9 w-auto" />
          </div>

          {step !== 'done' && (
            <button
              onClick={() => step === 'email' ? navigate('/auth/login') : step === 'code' ? setStep('email') : setStep('code')}
              className="inline-flex items-center gap-2 text-sm font-medium mb-8 transition-colors"
              style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
              <ArrowLeft size={15} />
              {step === 'email' ? 'Retour à la connexion' : 'Étape précédente'}
            </button>
          )}

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
              {error}
            </div>
          )}

          {/* ── Étape 1 : email ── */}
          {step === 'email' && (
            <>
              <div className="mb-7">
                <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>Mot de passe oublié ?</h2>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  Entrez votre email pour recevoir un code de réinitialisation.
                </p>
              </div>
              <form onSubmit={handleSendEmail} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Adresse email
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: 'var(--text-tertiary)' }} />
                    <input type="email" placeholder="jean@exemple.com" value={email}
                      onChange={e => setEmail(e.target.value)} required
                      onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
                      className="input pl-10"
                      style={{
                        boxShadow:   focused === 'email' ? '0 0 0 3px rgba(123,63,242,0.18)' : 'none',
                        borderColor: focused === 'email' ? accent : 'var(--border)',
                      }} />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full gap-2"
                  style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
                  {loading
                    ? <span className="inline-flex gap-1">{[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-white" style={{ animation: `blink 1s ease-in-out ${i*0.15}s infinite` }} />)}</span>
                    : <Mail size={15} />}
                  {loading ? 'Envoi en cours…' : 'Envoyer le code'}
                </button>
              </form>
            </>
          )}

          {/* ── Étape 2 : code OTP ── */}
          {step === 'code' && (
            <>
              <div className="mb-7">
                <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>Entrez le code</h2>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  Un code à 6 chiffres a été envoyé à <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
                </p>
              </div>
              <form onSubmit={handleVerifyCode} className="space-y-6">
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
                <button type="submit" disabled={code.join('').length < 6} className="btn-primary w-full"
                  style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', opacity: code.join('').length < 6 ? 0.5 : 1 }}>
                  Vérifier le code
                </button>
                <div className="text-center">
                  <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Vous n'avez pas reçu le code ? </span>
                  <button type="button" onClick={handleResend} disabled={loading}
                    className="text-sm font-semibold" style={{ color: accent, background: 'none', border: 'none', cursor: 'pointer' }}>
                    {loading ? 'Renvoi…' : 'Renvoyer'}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── Étape 3 : nouveau mot de passe ── */}
          {step === 'password' && (
            <>
              <div className="mb-7">
                <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>Nouveau mot de passe</h2>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  Choisissez un mot de passe sécurisé d'au moins 8 caractères.
                </p>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="8 caractères minimum"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required minLength={8}
                      onFocus={() => setFocused('pwd')} onBlur={() => setFocused('')}
                      className="input pr-10"
                      style={{
                        boxShadow:   focused === 'pwd' ? '0 0 0 3px rgba(123,63,242,0.18)' : 'none',
                        borderColor: focused === 'pwd' ? accent : 'var(--border)',
                      }} />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full transition-all" style={{
                        width: password.length < 8 ? '30%' : password.length < 12 ? '60%' : '100%',
                        background: password.length < 8 ? '#ef4444' : password.length < 12 ? '#f59e0b' : '#10b981',
                      }} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Répétez le mot de passe"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      required
                      onFocus={() => setFocused('confirm')} onBlur={() => setFocused('')}
                      className="input pr-10"
                      style={{
                        boxShadow:   focused === 'confirm' ? '0 0 0 3px rgba(123,63,242,0.18)' : 'none',
                        borderColor: confirm && password !== confirm ? '#ef4444' : focused === 'confirm' ? accent : 'var(--border)',
                      }} />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {confirm && password !== confirm && (
                    <p className="text-xs mt-1" style={{ color: '#ef4444' }}>Les mots de passe ne correspondent pas</p>
                  )}
                </div>
                <button type="submit" disabled={loading || password.length < 8 || password !== confirm}
                  className="btn-primary w-full"
                  style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem', marginTop: '0.5rem', opacity: (loading || password.length < 8 || password !== confirm) ? 0.5 : 1 }}>
                  {loading
                    ? <span className="inline-flex gap-1">{[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-white" style={{ animation: `blink 1s ease-in-out ${i*0.15}s infinite` }} />)}</span>
                    : 'Réinitialiser le mot de passe'}
                </button>
              </form>
            </>
          )}

          {/* ── Étape 4 : succès ── */}
          {step === 'done' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
                <CheckCircle size={38} style={{ color: '#10b981' }} />
              </div>
              <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
                Mot de passe réinitialisé !
              </h2>
              <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
                Votre mot de passe a été mis à jour avec succès.<br />
                Vous pouvez maintenant vous connecter.
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
