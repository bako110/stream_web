import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Sun, Moon, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { Images } from '../assets';
import './explore.css';

const NAV_LINKS = [
  { to: '/explore/films',    label: 'Films'      },
  { to: '/explore/series',   label: 'Séries'     },
  { to: '/explore/live',     label: 'Live'       },
  { to: '/explore/concerts', label: 'Concerts'   },
  { to: '/explore/events',   label: 'Événements' },
  { to: '/explore/reels',    label: 'Reels'      },
];

export function ExploreLayout() {
  const { isAuthenticated } = useAuthStore();
  const { isDark, toggle }  = useThemeStore();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className="explore-v2">
      {/* ── Navbar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'var(--ex-bg)' : 'transparent',
          borderBottom: scrolled ? '1px solid var(--ex-line)' : '1px solid transparent',
        }}>
        <div className="w-full mx-auto px-4 h-16 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={isDark ? Images.logoDark : Images.logoLight} alt="Gofolyx" className="h-8 w-auto" />
            <span className="ex-display text-base hidden sm:block" style={{ color: 'var(--ex-text)' }}>Gofolyx</span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5 ml-2">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to}
                className="px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200"
                style={({ isActive }) => ({
                  color: isActive ? 'var(--ex-violet)' : 'var(--ex-text-2)',
                })}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={toggle} className="p-2 rounded-full transition-colors duration-200" style={{ color: 'var(--ex-text-3)' }}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {isAuthenticated ? (
              <Link to="/feed" className="text-sm font-bold px-4 py-2 rounded-full text-white" style={{ background: 'var(--ex-violet)' }}>
                Mon espace
              </Link>
            ) : (
              <>
                <Link to="/auth/login" className="hidden sm:block text-sm font-medium px-3 py-1.5" style={{ color: 'var(--ex-text-2)' }}>
                  Connexion
                </Link>
                <Link to="/auth/register" className="text-sm font-bold px-4 py-2 rounded-full text-white" style={{ background: 'var(--ex-violet)' }}>
                  S'inscrire
                </Link>
              </>
            )}

            <button onClick={() => setMenuOpen(v => !v)} className="md:hidden p-2" style={{ color: 'var(--ex-text)' }}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--ex-bg)' }}>
          <div className="flex items-center justify-between px-4 h-16 shrink-0" style={{ borderBottom: '1px solid var(--ex-line)' }}>
            <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2">
              <img src={isDark ? Images.logoDark : Images.logoLight} alt="Gofolyx" className="h-8 w-auto" />
              <span className="ex-display text-base" style={{ color: 'var(--ex-text)' }}>Gofolyx</span>
            </Link>
            <button onClick={() => setMenuOpen(false)} style={{ color: 'var(--ex-text)' }}><X size={24} /></button>
          </div>
          <nav className="flex flex-col px-6 pt-6 gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} onClick={() => setMenuOpen(false)}
                className="py-4 text-xl ex-display transition-colors duration-200"
                style={({ isActive }) => ({ color: isActive ? 'var(--ex-violet)' : 'var(--ex-text)', borderBottom: '1px solid var(--ex-line)' })}
              >{label}</NavLink>
            ))}
          </nav>
          {!isAuthenticated && (
            <div className="px-6 pt-6 flex flex-col gap-3">
              <Link to="/auth/register" className="text-base text-center py-3 rounded-full font-bold text-white" style={{ background: 'var(--ex-violet)' }} onClick={() => setMenuOpen(false)}>
                S'inscrire
              </Link>
              <Link to="/auth/login" className="text-base text-center py-3 rounded-full font-medium" style={{ color: 'var(--ex-text)', border: '1px solid var(--ex-line)' }} onClick={() => setMenuOpen(false)}>
                Connexion
              </Link>
            </div>
          )}
        </div>
      )}

      <main className="pt-16">
        <Outlet />
      </main>

      <footer className="mt-20 pt-10 pb-8 px-4" style={{ borderTop: '1px solid var(--ex-line)' }}>
        <div className="w-full mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={isDark ? Images.logoDark : Images.logoLight} alt="Gofolyx" className="h-8 w-auto" />
            <span className="text-sm" style={{ color: 'var(--ex-text-3)' }}>© 2026 Tous droits réservés</span>
          </div>
          <nav className="flex items-center gap-5 text-sm flex-wrap justify-center">
            <Link to="/" style={{ color: 'var(--ex-text-3)' }}>Accueil</Link>
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to} style={{ color: 'var(--ex-text-3)' }}>{label}</Link>
            ))}
            <Link to="/auth/register" className="text-xs font-bold px-4 py-1.5 rounded-full text-white" style={{ background: 'var(--ex-violet)' }}>
              S'inscrire
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
