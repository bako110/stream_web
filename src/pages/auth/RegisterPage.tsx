import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sparkles, ShieldCheck, Zap, Globe } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { Images } from '../../components/assets';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { googleOAuthPopup } from '../../utils/googleOAuth';

const PERKS = [
  { icon: Zap,         label: 'Accès instantané au contenu',     color: '#7B3FF2' },
  { icon: Globe,       label: 'Communauté internationale',        color: '#7B3FF2' },
  { icon: ShieldCheck, label: 'Compte sécurisé et privé',         color: '#7B3FF2' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register: signup, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const { isDark } = useThemeStore();
  const [form, setForm]       = useState({ first_name: '', last_name: '', email: '', username: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [gLoading, setGLoading] = useState(false);
  const [formError, setFormError] = useState('');

  async function handleGoogle() {
    setGLoading(true);
    try {
      const googleToken = await googleOAuthPopup();
      const res = await apiClient.post<any>(Endpoints.auth.oauthGoogle, { provider: 'google', access_token: googleToken });
      const token = res.data;
      if (token?.access_token) {
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

  useEffect(() => {
    if (isAuthenticated) navigate('/feed', { replace: true });
  }, [isAuthenticated, navigate]);

  function field(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    setFormError('');
    if (form.first_name.trim().length < 2) return setFormError('Le prénom doit faire au moins 2 caractères');
    if (form.last_name.trim().length < 2)  return setFormError('Le nom doit faire au moins 2 caractères');
    if (!form.email.trim())                return setFormError('L\'email est requis');
    if (form.password.length < 8)          return setFormError('Le mot de passe doit faire au moins 8 caractères');
    if (form.username.trim() && form.username.trim().length < 3) return setFormError('Le nom d\'utilisateur doit faire au moins 3 caractères');
    try {
      await signup(form);
      navigate('/feed', { replace: true });
    } catch { /* error shown via store */ }
  }

  const inp = (name: string) => ({
    boxShadow:   focused === name ? '0 0 0 3px rgba(123,63,242,0.18)' : 'none',
    borderColor: focused === name ? 'var(--primary)' : 'var(--border)',
  });

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] relative overflow-hidden p-10"
        style={{ background: 'linear-gradient(145deg,#0d0118 0%,#1a0533 40%,#2d0f5e 70%,#1a0533 100%)' }}>

        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-80px] right-[-80px] w-72 h-72 rounded-full"
            style={{ background: 'radial-gradient(circle,#7B3FF2,transparent 70%)', opacity: 0.3 }} />
          <div className="absolute bottom-[-60px] left-[-60px] w-64 h-64 rounded-full"
            style={{ background: 'radial-gradient(circle,#7B3FF2,transparent 70%)', opacity: 0.25 }} />
          <div className="absolute inset-0 hero-grid opacity-20" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <img src={isDark ? Images.logoDark : Images.logoLight} alt="GoFolyX" className="h-10 w-auto" />
        </div>

        {/* Center */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-black text-white leading-tight mb-3">
              Rejoignez<br />
              <span style={{ background: 'linear-gradient(90deg,#A78BFA,#F472B6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                la communauté
              </span>
            </h1>
            <p className="text-white/60 text-base leading-relaxed">
              Des milliers de passionnés vous attendent. Créez votre compte en moins d'une minute.
            </p>
          </div>

          <div className="space-y-4">
            {PERKS.map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${color}25`, border: `1px solid ${color}40` }}>
                  <Icon size={15} style={{ color }} />
                </div>
                <span className="text-white/75 text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>

          {/* Sahelys card */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold mb-2">Développé par</p>
            <p className="text-white font-black text-base">Sahelys</p>
            <p className="text-white/50 text-xs mt-0.5">Intégrateur de solutions informatiques</p>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/30 text-xs">© 2026 Sahelys · Tous droits réservés</p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative overflow-y-auto">

        <div className="absolute inset-0 pointer-events-none overflow-hidden lg:hidden">
          <div className="absolute -top-32 -right-32 w-72 h-72 rounded-full"
            style={{ background: 'radial-gradient(circle,#7B3FF2,transparent 70%)', opacity: isDark ? 0.13 : 0.05 }} />
        </div>

        <div className="relative w-full max-w-md py-8">

          {/* Mobile logo */}
          <div className="flex justify-center mb-6 lg:hidden">
            <img src={isDark ? Images.logoDark : Images.logoLight} alt="GoFolyX" className="h-9 w-auto" />
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>Créer un compte ✨</h2>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Rejoignez GoFolyX gratuitement</p>
          </div>

          {/* Google */}
          <button onClick={handleGoogle} disabled={gLoading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl mb-5 transition-all font-semibold text-sm disabled:opacity-60"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            {gLoading ? (
              <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {gLoading ? 'Connexion…' : 'S\'inscrire avec Google'}
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>ou avec email</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          {(error || formError) && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
              {formError || error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Prénom</label>
                <input className="input" type="text" placeholder="Jean"
                  value={form.first_name} onChange={field('first_name')} required
                  onFocus={() => setFocused('fn')} onBlur={() => setFocused(null)} style={inp('fn')} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nom</label>
                <input className="input" type="text" placeholder="Dupont"
                  value={form.last_name} onChange={field('last_name')} required
                  onFocus={() => setFocused('ln')} onBlur={() => setFocused(null)} style={inp('ln')} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input className="input" type="email" placeholder="jean@exemple.com"
                value={form.email} onChange={field('email')} required
                onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} style={inp('email')} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Nom d'utilisateur <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optionnel)</span>
              </label>
              <input className="input" type="text" placeholder="jean_dupont"
                value={form.username} onChange={field('username')}
                onFocus={() => setFocused('un')} onBlur={() => setFocused(null)} style={inp('un')} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Mot de passe</label>
              <div className="relative">
                <input className="input pr-11" type={showPwd ? 'text' : 'password'} placeholder="Min. 8 caractères"
                  value={form.password} onChange={field('password')} required minLength={8}
                  onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)} style={inp('pw')} />
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
                  {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-white"
                    style={{ animation: `blink 1s ease-in-out ${i*0.15}s infinite` }} />)}
                </span>
              ) : <Sparkles size={16} />}
              {isLoading ? 'Création…' : 'Créer mon compte'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>
            Déjà un compte ?{' '}
            <Link to="/auth/login" className="font-semibold" style={{ color: 'var(--primary)' }}>
              Se connecter
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
