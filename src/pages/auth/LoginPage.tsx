import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';

export default function LoginPage() {
  const navigate   = useNavigate();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const { isDark } = useThemeStore();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [focused, setFocused]       = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) navigate('/feed', { replace: true });
  }, [isAuthenticated, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    try {
      await login({ identifier, password });
      navigate('/feed', { replace: true });
    } catch { /* error shown via store */ }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden"
      style={{ background: 'var(--bg)' }}>

      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full animate-float-slow"
          style={{ background: 'radial-gradient(circle,#7B3FF2,transparent 70%)', opacity: isDark ? 0.18 : 0.08 }} />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full animate-float-mid"
          style={{ background: 'radial-gradient(circle,#E0389A,transparent 70%)', opacity: isDark ? 0.14 : 0.06, animationDelay: '3s' }} />
        {/* Grid */}
        <div className="absolute inset-0 hero-grid opacity-50" />
      </div>

      <div className="relative w-full max-w-md animate-scale-in">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-2xl rotate-12"
                style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }} />
              <div className="absolute inset-1 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--bg)' }}>
                <span className="text-base font-black gradient-text">FX</span>
              </div>
            </div>
            <span className="text-3xl font-black gradient-text tracking-tight">FoliX</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Bienvenue ! Connectez-vous pour continuer
          </p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8 shadow-2xl" style={{ borderRadius: '1.5rem' }}>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(240,54,90,0.1)', border: '1px solid rgba(240,54,90,0.3)', color: '#F0365A' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Identifier */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Email ou nom d'utilisateur
              </label>
              <input
                type="text"
                placeholder="email@exemple.com"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                onFocus={() => setFocused('id')}
                onBlur={() => setFocused(null)}
                required
                autoComplete="username"
                className="input"
                style={{
                  boxShadow: focused === 'id' ? '0 0 0 3px rgba(123,63,242,0.2)' : 'none',
                  borderColor: focused === 'id' ? 'var(--primary)' : 'var(--border)',
                }}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Mot de passe
                </label>
                <Link to="/auth/forgot-password"
                  className="text-xs font-medium transition-colors"
                  style={{ color: 'var(--primary)' }}>
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('pwd')}
                  onBlur={() => setFocused(null)}
                  required
                  autoComplete="current-password"
                  className="input pr-11"
                  style={{
                    boxShadow: focused === 'pwd' ? '0 0 0 3px rgba(123,63,242,0.2)' : 'none',
                    borderColor: focused === 'pwd' ? 'var(--primary)' : 'var(--border)',
                  }}
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

            {/* Submit */}
            <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2 gap-2"
              style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
              {isLoading ? (
                <>
                  <span className="inline-flex gap-1">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-white"
                        style={{ animation: `blink 1s ease-in-out ${i*0.15}s infinite` }} />
                    ))}
                  </span>
                  Connexion…
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Se connecter
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>ou</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            Pas encore de compte ?{' '}
            <Link to="/auth/register"
              className="font-semibold transition-colors"
              style={{ color: 'var(--primary)' }}>
              S'inscrire gratuitement
            </Link>
          </p>
        </div>

        {/* Back to explore */}
        <p className="text-center mt-6 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          <Link to="/explore/films"
            className="transition-colors hover:underline"
            style={{ color: 'var(--text-secondary)' }}>
            ← Continuer sans compte
          </Link>
        </p>
      </div>
    </div>
  );
}
