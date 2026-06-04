import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, Outlet } from 'react-router-dom';
import { Search, Sun, Moon, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { Images } from '../assets';

const NAV_LINKS = [
  { to: '/explore/films',    label: 'Films'       },
  { to: '/explore/series',   label: 'Séries'      },
  { to: '/explore/concerts', label: 'Concerts'    },
  { to: '/explore/events',   label: 'Événements'  },
  { to: '/explore/reels',    label: 'Reels'       },
];

export function ExploreLayout() {
  const { isAuthenticated }   = useAuthStore();
  const { isDark, toggle }    = useThemeStore();
  const navigate              = useNavigate();
  const [scrolled,    setScrolled]    = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim())
      navigate(`/explore/search?q=${encodeURIComponent(searchQuery.trim())}`);
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Navbar ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'glass shadow-lg' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-3">

          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0">
            <img src={isDark ? Images.logoDark : Images.logoLight} alt="GoFolix" className="h-9 w-auto" />
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-0.5 ml-2">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'font-semibold'
                      : ''
                  }`
                }
                style={({ isActive }) => ({
                  color:      isActive ? 'var(--primary)'       : 'var(--text-secondary)',
                  background: isActive ? 'var(--bg-secondary)'  : 'transparent',
                })}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Search — desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xs ml-auto">
            <div className="relative w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher…"
                className="w-full pl-8 pr-4 py-1.5 text-sm rounded-full transition-all duration-200 focus:outline-none"
                style={{
                  background:   'var(--bg-secondary)',
                  border:       '1px solid var(--border)',
                  color:        'var(--text-primary)',
                }}
                onFocus={e  => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={e   => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto md:ml-2">
            <button
              onClick={toggle}
              className="p-2 rounded-xl transition-all duration-200"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={e => { (e.currentTarget.style.background = 'var(--bg-secondary)'); (e.currentTarget.style.color = 'var(--text-primary)'); }}
              onMouseLeave={e => { (e.currentTarget.style.background = 'transparent');          (e.currentTarget.style.color = 'var(--text-tertiary)'); }}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {isAuthenticated ? (
              <Link to="/feed" className="btn-primary text-sm px-4 py-2">
                Mon espace
              </Link>
            ) : (
              <>
                <Link to="/auth/login"
                  className="hidden sm:block text-sm px-3 py-1.5 rounded-lg transition-all duration-200"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  Connexion
                </Link>
                <Link to="/auth/register" className="btn-primary text-sm px-4 py-2">
                  S'inscrire
                </Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="md:hidden p-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-80' : 'max-h-0'}`}>
          <div className="glass border-t px-4 py-3 space-y-1" style={{ borderColor: 'var(--border)' }}>
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 text-sm rounded-xl transition-all duration-200"
                style={({ isActive }) => ({
                  color:      isActive ? 'var(--primary)'      : 'var(--text-secondary)',
                  background: isActive ? 'var(--bg-secondary)' : 'transparent',
                  fontWeight: isActive ? '600' : '400',
                })}
              >
                {label}
              </NavLink>
            ))}
            <form onSubmit={handleSearch} className="pt-1">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-full pl-8 pr-4 py-2 text-sm rounded-xl focus:outline-none"
                  style={{
                    background: 'var(--bg-secondary)',
                    border:     '1px solid var(--border)',
                    color:      'var(--text-primary)',
                  }}
                />
              </div>
            </form>
            {!isAuthenticated && (
              <div className="pt-1 flex gap-2">
                <Link to="/auth/login"    className="flex-1 btn-secondary text-sm text-center py-2" onClick={() => setMenuOpen(false)}>Connexion</Link>
                <Link to="/auth/register" className="flex-1 btn-primary  text-sm text-center py-2" onClick={() => setMenuOpen(false)}>S'inscrire</Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="pt-16">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="mt-20 pt-10 pb-8 px-4" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={isDark ? Images.logoDark : Images.logoLight} alt="GoFolix" className="h-8 w-auto" />
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>© 2026 Tous droits réservés</span>
          </div>

          <nav className="flex items-center gap-5 text-sm flex-wrap justify-center">
            <Link to="/" style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
              Accueil
            </Link>
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to} style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                {label}
              </Link>
            ))}
            <Link to="/auth/register" className="btn-primary text-xs px-4 py-1.5">
              S'inscrire
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
