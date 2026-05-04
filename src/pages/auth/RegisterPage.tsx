import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register: signup, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const { isDark } = useThemeStore();
  const [form, setForm]       = useState({ first_name: '', last_name: '', email: '', username: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) navigate('/feed', { replace: true });
  }, [isAuthenticated, navigate]);

  function field(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    try {
      await signup(form);
      navigate('/feed', { replace: true });
    } catch { /* error shown via store */ }
  }

  const inputStyle = (name: string) => ({
    boxShadow: focused === name ? '0 0 0 3px rgba(123,63,242,0.2)' : 'none',
    borderColor: focused === name ? 'var(--primary)' : 'var(--border)',
  });

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden"
      style={{ background: 'var(--bg)' }}>

      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full animate-float-mid"
          style={{ background: 'radial-gradient(circle,#E0389A,transparent 70%)', opacity: isDark ? 0.15 : 0.07 }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full animate-float-slow"
          style={{ background: 'radial-gradient(circle,#7B3FF2,transparent 70%)', opacity: isDark ? 0.15 : 0.07, animationDelay: '4s' }} />
        <div className="absolute inset-0 hero-grid opacity-50" />
      </div>

      <div className="relative w-full max-w-md animate-scale-in">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 mb-3">
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
            Créez votre compte et rejoignez la communauté
          </p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8 shadow-2xl">

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(240,54,90,0.1)', border: '1px solid rgba(240,54,90,0.3)', color: '#F0365A' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Prénom</label>
                <input className="input" type="text" placeholder="Jean"
                  value={form.first_name} onChange={field('first_name')} required
                  onFocus={() => setFocused('fn')} onBlur={() => setFocused(null)}
                  style={inputStyle('fn')} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nom</label>
                <input className="input" type="text" placeholder="Dupont"
                  value={form.last_name} onChange={field('last_name')} required
                  onFocus={() => setFocused('ln')} onBlur={() => setFocused(null)}
                  style={inputStyle('ln')} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input className="input" type="email" placeholder="jean@exemple.com"
                value={form.email} onChange={field('email')}
                onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                style={inputStyle('email')} />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nom d'utilisateur</label>
              <input className="input" type="text" placeholder="jean_dupont"
                value={form.username} onChange={field('username')}
                onFocus={() => setFocused('un')} onBlur={() => setFocused(null)}
                style={inputStyle('un')} />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Mot de passe</label>
              <div className="relative">
                <input className="input pr-11"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Min. 8 caractères"
                  value={form.password} onChange={field('password')}
                  required minLength={8}
                  onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)}
                  style={inputStyle('pw')} />
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
            <button type="submit" disabled={isLoading} className="btn-primary w-full gap-2 mt-1"
              style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
              {isLoading ? (
                <>
                  <span className="inline-flex gap-1">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-white"
                        style={{ animation: `blink 1s ease-in-out ${i*0.15}s infinite` }} />
                    ))}
                  </span>
                  Création du compte…
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Créer mon compte
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>ou</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            Déjà un compte ?{' '}
            <Link to="/auth/login" className="font-semibold" style={{ color: 'var(--primary)' }}>
              Se connecter
            </Link>
          </p>
        </div>

        <p className="text-center mt-6 text-sm">
          <Link to="/explore/films" className="transition-colors hover:underline" style={{ color: 'var(--text-secondary)' }}>
            ← Continuer sans compte
          </Link>
        </p>
      </div>
    </div>
  );
}
