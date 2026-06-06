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
            <img src={isDark ? Images.logoDark : Images.logoLight} alt="GoFolyX" className="h-9 w-auto" />
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

      </header>

      {/* Mobile menu — fullscreen, par-dessus tout */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex flex-col"
          style={{ background: isDark ? '#2D1B69' : 'var(--surface)' }}
        >
          {/* Header du menu */}
          <div className="flex items-center justify-between px-4 h-16 shrink-0" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'var(--border)'}` }}>
            <Link to="/" onClick={() => setMenuOpen(false)}>
              <img src={isDark ? Images.logoDark : Images.logoLight} alt="GoFolyX" className="h-9 w-auto" />
            </Link>
            <button onClick={() => setMenuOpen(false)} style={{ color: isDark ? '#ffffff' : 'var(--text-primary)' }}>
              <X size={24} />
            </button>
          </div>

          {/* Liens nav */}
          <nav className="flex flex-col px-6 pt-6 gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to}
                onClick={() => setMenuOpen(false)}
                className="py-4 text-xl font-medium transition-colors duration-200"
                style={({ isActive }) => ({
                  color:        isActive ? (isDark ? '#ffffff' : 'var(--primary)') : (isDark ? 'rgba(255,255,255,0.85)' : 'var(--text-primary)'),
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'var(--border)'}`,
                  fontWeight:   isActive ? '700' : '500',
                })}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Recherche */}
          <form onSubmit={handleSearch} className="px-6 pt-6">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'var(--text-tertiary)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher…"
                className="w-full pl-10 pr-4 py-3 text-base rounded-xl focus:outline-none"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.12)' : 'var(--bg-secondary)',
                  border:     `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'var(--border)'}`,
                  color:      isDark ? '#ffffff' : 'var(--text-primary)',
                }}
              />
            </div>
          </form>

          {/* CTA Connexion / Inscription */}
          {!isAuthenticated && (
            <div className="px-6 pt-6 flex flex-col gap-3">
              <Link to="/auth/register" className="text-base text-center py-3 rounded-xl font-semibold transition-all duration-200"
                style={{ background: isDark ? '#ffffff' : 'var(--primary)', color: isDark ? '#2D1B69' : '#ffffff' }}
                onClick={() => setMenuOpen(false)}>
                S'inscrire
              </Link>
              <Link to="/auth/login" className="text-base text-center py-3 rounded-xl font-medium transition-all duration-200"
                style={{ background: isDark ? 'rgba(255,255,255,0.15)' : 'var(--bg-secondary)', color: isDark ? '#ffffff' : 'var(--text-primary)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.25)' : 'var(--border)'}` }}
                onClick={() => setMenuOpen(false)}>
                Connexion
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Page content ── */}
      <main className="pt-16">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="mt-20 pt-10 pb-8 px-4" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={isDark ? Images.logoDark : Images.logoLight} alt="GoFolyX" className="h-8 w-auto" />
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
