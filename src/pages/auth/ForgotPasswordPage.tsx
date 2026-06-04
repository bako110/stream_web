import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, KeyRound, Mail } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { useThemeStore } from '../../store/themeStore';
import { Images } from '../../components/assets';

export default function ForgotPasswordPage() {
  const { isDark } = useThemeStore();
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');
  const [focused, setFocused] = useState(false);

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
    <div className="min-h-screen flex overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Left panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] relative overflow-hidden p-10"
        style={{ background: 'linear-gradient(145deg,#0d0118 0%,#1a0533 40%,#2d0f5e 70%,#1a0533 100%)' }}>

        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-80px] left-[-80px] w-72 h-72 rounded-full"
            style={{ background: 'radial-gradient(circle,#7B3FF2,transparent 70%)', opacity: 0.35 }} />
          <div className="absolute bottom-[-60px] right-[-60px] w-64 h-64 rounded-full"
            style={{ background: 'radial-gradient(circle,#E0389A,transparent 70%)', opacity: 0.25 }} />
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
              Pas de panique ! Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>
          </div>

          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {['Vérifiez vos spams si vous ne recevez pas l\'email', 'Le lien expire après 24 heures', 'Vous pouvez renvoyer un nouveau lien à tout moment'].map((tip, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#A78BFA' }} />
                <p className="text-white/50 text-xs">{tip}</p>
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
            style={{ background: 'radial-gradient(circle,#7B3FF2,transparent 70%)', opacity: isDark ? 0.14 : 0.05 }} />
        </div>

        <div className="relative w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <img src={isDark ? Images.logoDark : Images.logoLight} alt="GoFolyX" className="h-9 w-auto" />
          </div>

          <Link to="/auth/login"
            className="inline-flex items-center gap-2 text-sm font-medium mb-8 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
            <ArrowLeft size={15} /> Retour à la connexion
          </Link>

          {sent ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(54,217,160,0.12)', border: '1px solid rgba(54,217,160,0.3)' }}>
                <CheckCircle size={32} style={{ color: '#36D9A0' }} />
              </div>
              <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>Email envoyé !</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                Un lien de réinitialisation a été envoyé à <strong>{email}</strong>.<br />
                Vérifiez votre boîte mail (et vos spams).
              </p>
              <button onClick={() => setSent(false)}
                className="text-sm font-semibold transition-colors" style={{ color: 'var(--primary)' }}>
                Renvoyer un email
              </button>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>Mot de passe oublié ?</h2>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  Entrez votre email pour recevoir un lien de réinitialisation.
                </p>
              </div>

              {error && (
                <div className="mb-5 px-4 py-3 rounded-xl text-sm"
                  style={{ background: 'rgba(240,54,90,0.1)', border: '1px solid rgba(240,54,90,0.3)', color: '#F0365A' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Adresse email
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: 'var(--text-tertiary)' }} />
                    <input type="email" placeholder="jean@exemple.com" value={email}
                      onChange={e => setEmail(e.target.value)} required
                      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                      className="input pl-10"
                      style={{
                        boxShadow:   focused ? '0 0 0 3px rgba(123,63,242,0.18)' : 'none',
                        borderColor: focused ? 'var(--primary)' : 'var(--border)',
                      }} />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full gap-2"
                  style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
                  {loading ? (
                    <span className="inline-flex gap-1">
                      {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-white"
                        style={{ animation: `blink 1s ease-in-out ${i*0.15}s infinite` }} />)}
                    </span>
                  ) : <Mail size={15} />}
                  {loading ? 'Envoi en cours…' : 'Envoyer le lien'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
