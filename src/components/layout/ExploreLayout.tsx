import { Link, NavLink, Outlet } from 'react-router-dom';
import { Sun, Moon, LogIn } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { GateLogo } from '../ui/GateLogo';
import './explore.css';

// ── Catégories — Reels retiré : cette section ne montre plus le format court,
// qui reste accessible depuis /reels une fois connecté. ──
const NAV_LINKS = [
  { to: '/explore/films',    label: 'Films'      },
  { to: '/explore/series',   label: 'Séries'     },
  { to: '/explore/live',     label: 'Live'       },
  { to: '/explore/concerts', label: 'Concerts'   },
  { to: '/explore/events',   label: 'Événements' },
];

// ── Header — identité propre, différente de la landing et de l'ancien
// header : pas de nav horizontale classique, une bande compacte (logo +
// actions) au-dessus d'une rangée de catégories en pilules scrollables. ──
export function ExploreLayout() {
  const { isAuthenticated } = useAuthStore();
  const { isDark, toggle }  = useThemeStore();

  return (
    <div className="explore-v3">
      <header className="xp-header">
        <div className="xp-container xp-header-top">
          <Link to="/" className="xp-header-brand">
            <GateLogo size={30} />
            <span className="xp-display text-base">Gofolyx</span>
          </Link>

          <div className="xp-header-actions">
            <button onClick={toggle} className="inline-flex items-center justify-center xp-icon-btn" title={isDark ? 'Mode clair' : 'Mode sombre'}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {isAuthenticated ? (
              <Link to="/feed" className="xp-btn xp-btn-solid" style={{ padding: '0.6rem 1.1rem', fontSize: '0.8rem' }}>
                Mon espace
              </Link>
            ) : (
              <>
                <Link to="/auth/login" className="!hidden sm:!inline-flex xp-icon-btn items-center justify-center" title="Connexion">
                  <LogIn size={16} />
                </Link>
                <Link to="/auth/register" className="xp-btn xp-btn-solid" style={{ padding: '0.6rem 1.1rem', fontSize: '0.8rem' }}>
                  S'inscrire
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="xp-container">
          <nav className="xp-tabs">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `xp-tab${isActive ? ' is-active' : ''}`}>
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="xp-footer">
        <div className="xp-container">
          <div className="xp-footer-row">
            <div className="flex items-center gap-2.5">
              <GateLogo size={28} />
              <span className="xp-display text-sm">Gofolyx</span>
            </div>
            <nav className="xp-footer-links">
              <Link to="/">Accueil</Link>
              {NAV_LINKS.map(({ to, label }) => <Link key={to} to={to}>{label}</Link>)}
              {!isAuthenticated && <Link to="/auth/register" style={{ color: 'var(--xp-accent)', fontWeight: 700 }}>S'inscrire</Link>}
            </nav>
          </div>
          <div className="xp-footer-bottom">
            <p>© 2026 Gofolyx. Tous droits réservés.</p>
            <div className="flex gap-4">
              <Link to="/politique-confidentialite">Confidentialité</Link>
              <Link to="/cgu">Conditions</Link>
              <Link to="/cookies">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
