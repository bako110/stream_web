import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sparkles, Play, Music2, Calendar, Film, Radio, QrCode, Smartphone, Mail, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { Images } from '../../components/assets';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { googleOAuthPopup } from '../../utils/googleOAuth';
import QRLoginPanel from '../../components/auth/QRLoginPanel';

declare global { interface Window { google?: any; } }

type LoginMethod = 'email' | 'phone';

// Pays les plus courants d'abord, puis le reste
const COUNTRIES = [
  { code: 'SN', dial: '+221', flag: '🇸🇳', name: 'Sénégal' },
  { code: 'CI', dial: '+225', flag: '🇨🇮', name: "Côte d'Ivoire" },
  { code: 'ML', dial: '+223', flag: '🇲🇱', name: 'Mali' },
  { code: 'BF', dial: '+226', flag: '🇧🇫', name: 'Burkina Faso' },
  { code: 'GN', dial: '+224', flag: '🇬🇳', name: 'Guinée' },
  { code: 'CM', dial: '+237', flag: '🇨🇲', name: 'Cameroun' },
  { code: 'FR', dial: '+33',  flag: '🇫🇷', name: 'France' },
  { code: 'BE', dial: '+32',  flag: '🇧🇪', name: 'Belgique' },
  { code: 'MA', dial: '+212', flag: '🇲🇦', name: 'Maroc' },
  { code: 'DZ', dial: '+213', flag: '🇩🇿', name: 'Algérie' },
  { code: 'TN', dial: '+216', flag: '🇹🇳', name: 'Tunisie' },
  { code: 'US', dial: '+1',   flag: '🇺🇸', name: 'États-Unis' },
  { code: 'GB', dial: '+44',  flag: '🇬🇧', name: 'Royaume-Uni' },
  { code: 'NG', dial: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: 'GH', dial: '+233', flag: '🇬🇭', name: 'Ghana' },
];

const FEATURES = [
  { icon: Play,      label: 'Reels & Vidéos',     color: '#7B3FF2' },
  { icon: Music2,    label: 'Concerts en direct',  color: '#7B3FF2' },
  { icon: Calendar,  label: 'Événements',           color: '#7B3FF2' },
  { icon: Film,      label: 'Films & Séries',       color: '#7B3FF2' },
  { icon: Radio,     label: 'Live streaming',       color: '#7B3FF2' },
];

export default function LoginPage() {
  const navigate   = useNavigate();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const { isDark } = useThemeStore();

  const [method,      setMethod]      = useState<LoginMethod>('email');
  const [identifier,  setIdentifier]  = useState('');
  const [country,     setCountry]     = useState(COUNTRIES[0]);
  const [showCountry, setShowCountry] = useState(false);
  const [password,    setPassword]    = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [focused,     setFocused]     = useState<string | null>(null);
  const [gLoading,    setGLoading]    = useState(false);
  const [showQR,      setShowQR]      = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/feed', { replace: true });
  }, [isAuthenticated, navigate]);

  // Fermer le dropdown pays en cliquant dehors
  useEffect(() => {
    if (!showCountry) return;
    const close = () => setShowCountry(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [showCountry]);

  function switchMethod() {
    setMethod(m => m === 'email' ? 'phone' : 'email');
    setIdentifier('');
    clearError();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    try {
      const id = method === 'email' ? identifier.trim() : `${country.dial}${identifier.trim()}`;
      await login({ identifier: id, password });
      navigate('/feed', { replace: true });
    } catch { /* error shown via store */ }
  }

  async function handleGoogle() {
    setGLoading(true);
    try {
      const googleToken = await googleOAuthPopup();
      const res = await apiClient.post<any>(Endpoints.auth.oauthGoogle, { provider: 'google', access_token: googleToken });
      const token = res.data;
      if (token?.access_token) {
        // Réutilise loginWithQR — même logique : setAuthToken + saveTokens + fetchMe
        await useAuthStore.getState().loginWithQR(token.access_token, token.refresh_token);
        navigate('/feed', { replace: true });
      }
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      if (!msg.includes('closed') && !msg.includes('cancelled') && !msg.includes('cancel')) {
        import('react-hot-toast').then(({ default: toast }) =>
          toast.error((e?.response?.data?.detail ?? msg) || 'Connexion Google impossible')
        );
      }
    } finally {
      setGLoading(false);
    }
  }

  const inpStyle = (name: string) => ({
    boxShadow:   focused === name ? '0 0 0 3px rgba(123,63,242,0.18)' : 'none',
    borderColor: focused === name ? 'var(--primary)' : 'var(--border)',
  });

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Left panel */}
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
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-black text-white leading-tight mb-3">
              Votre univers<br />
              <span style={{ background: 'linear-gradient(90deg,#A78BFA,#F472B6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                culturel digital
              </span>
            </h1>
            <p className="text-white/60 text-base leading-relaxed">
              Concerts, événements, films, reels — tout ce qui vous passionne en un seul endroit.
            </p>
          </div>
          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${color}25`, border: `1px solid ${color}40` }}>
                  <Icon size={15} style={{ color }} />
                </div>
                <span className="text-white/75 text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10">
          <p className="text-white/30 text-xs">© 2026 GoFolyX · Tous droits réservés</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative overflow-y-auto">
        <div className="absolute inset-0 pointer-events-none overflow-hidden lg:hidden">
          <div className="absolute -top-32 -left-32 w-72 h-72 rounded-full"
            style={{ background: 'radial-gradient(circle,#7B3FF2,transparent 70%)', opacity: isDark ? 0.15 : 0.06 }} />
          <div className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full"
            style={{ background: 'radial-gradient(circle,#7B3FF2,transparent 70%)', opacity: isDark ? 0.12 : 0.05 }} />
        </div>

        <div className="relative w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <img src={isDark ? Images.logoDark : Images.logoLight} alt="GoFolyX" className="h-9 w-auto" />
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>Bon retour 👋</h2>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Connectez-vous à votre compte GoFolyX</p>
          </div>

          {/* Google */}
          <button onClick={handleGoogle} disabled={gLoading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl mb-4 transition-all font-semibold text-sm"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {gLoading ? 'Connexion…' : 'Continuer avec Google'}
          </button>

          {/* QR toggle */}
          <button type="button" onClick={() => { setShowQR(v => !v); clearError(); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl mb-5 text-sm font-medium transition-all"
            style={{
              background: showQR ? 'rgba(123,63,242,0.10)' : 'var(--surface)',
              border: `1px solid ${showQR ? 'rgba(123,63,242,0.5)' : 'var(--border)'}`,
              color: showQR ? 'var(--primary)' : 'var(--text-secondary)',
            }}>
            <QrCode size={16} />
            {showQR ? 'Connexion par mot de passe' : 'Connexion par QR code'}
          </button>

          {showQR && (
            <div className="mb-5 flex flex-col items-center py-4 rounded-2xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <QRLoginPanel />
            </div>
          )}

          {!showQR && (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>ou avec identifiant</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl text-sm"
                  style={{ background: 'rgba(123,63,242,0.1)', border: '1px solid rgba(123,63,242,0.3)', color: '#7B3FF2' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Champ identifiant */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {method === 'email' ? 'Email ou nom d\'utilisateur' : 'Numéro de téléphone'}
                    </label>
                    {/* Toggle pill */}
                    <button type="button" onClick={switchMethod}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all"
                      style={{ background: 'rgba(123,63,242,0.12)', border: '1px solid rgba(123,63,242,0.35)', color: 'var(--primary)' }}>
                      {method === 'email'
                        ? <><Smartphone size={11} /> Téléphone</>
                        : <><Mail size={11} /> Email</>}
                    </button>
                  </div>

                  {method === 'email' ? (
                    <input
                      type="text"
                      placeholder="email@exemple.com ou @username"
                      value={identifier}
                      onChange={e => { setIdentifier(e.target.value); clearError(); }}
                      onFocus={() => setFocused('id')}
                      onBlur={() => setFocused(null)}
                      required
                      autoComplete="username"
                      className="input"
                      style={inpStyle('id')}
                    />
                  ) : (
                    <div className="flex gap-2">
                      {/* Sélecteur pays */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setShowCountry(v => !v); }}
                          className="flex items-center gap-1.5 h-full px-3 rounded-xl text-sm font-semibold transition-all"
                          style={{
                            background: 'var(--bg-secondary)',
                            border: `1px solid ${focused === 'phone' ? 'var(--primary)' : 'var(--border)'}`,
                            color: 'var(--text-primary)',
                            minWidth: 90,
                          }}>
                          <span className="text-base">{country.flag}</span>
                          <span>{country.dial}</span>
                          <ChevronDown size={12} style={{ color: 'var(--text-tertiary)' }} />
                        </button>

                        {showCountry && (
                          <div className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden shadow-xl"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', width: 220, maxHeight: 260, overflowY: 'auto' }}
                            onClick={e => e.stopPropagation()}>
                            {COUNTRIES.map(c => (
                              <button key={c.code} type="button"
                                onClick={() => { setCountry(c); setShowCountry(false); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-all"
                                style={{
                                  background: c.code === country.code ? 'rgba(123,63,242,0.1)' : 'transparent',
                                  color: c.code === country.code ? 'var(--primary)' : 'var(--text-primary)',
                                }}
                                onMouseEnter={e => { if (c.code !== country.code) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                                onMouseLeave={e => { if (c.code !== country.code) e.currentTarget.style.background = 'transparent'; }}>
                                <span className="text-base">{c.flag}</span>
                                <span className="flex-1 truncate">{c.name}</span>
                                <span className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>{c.dial}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Numéro */}
                      <input
                        type="tel"
                        placeholder="77 000 00 00"
                        value={identifier}
                        onChange={e => { setIdentifier(e.target.value.replace(/\D/g, '')); clearError(); }}
                        onFocus={() => setFocused('phone')}
                        onBlur={() => setFocused(null)}
                        required
                        autoComplete="tel"
                        className="input flex-1"
                        style={inpStyle('phone')}
                      />
                    </div>
                  )}
                </div>

                {/* Mot de passe */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Mot de passe</label>
                    <Link to="/auth/forgot-password" className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
                      Mot de passe oublié ?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => { setPassword(e.target.value); clearError(); }}
                      onFocus={() => setFocused('pwd')}
                      onBlur={() => setFocused(null)}
                      required
                      autoComplete="current-password"
                      className="input pr-11"
                      style={inpStyle('pwd')}
                    />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="btn-primary w-full gap-2 mt-1"
                  style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
                  {isLoading ? (
                    <span className="inline-flex gap-1">
                      {[0, 1, 2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-white"
                          style={{ animation: `blink 1s ease-in-out ${i * 0.15}s infinite` }} />
                      ))}
                    </span>
                  ) : <Sparkles size={16} />}
                  {isLoading ? 'Connexion…' : 'Se connecter'}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>
            Pas encore de compte ?{' '}
            <Link to="/auth/register" className="font-semibold" style={{ color: 'var(--primary)' }}>
              S'inscrire gratuitement
            </Link>
          </p>

          <p className="text-center mt-4 text-sm">
            <Link to="/explore/films" className="hover:underline" style={{ color: 'var(--text-tertiary)' }}>
              ← Continuer sans compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
