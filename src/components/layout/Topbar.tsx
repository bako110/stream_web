import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Search, Bell, Radio, Sun, Moon } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { Images } from '../assets';

interface Props { onMenuClick: () => void; }

export function Topbar({ onMenuClick }: Props) {
  const { user }  = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [query, setQuery] = useState('');

  // Sync le champ avec le param URL quand on est sur /search
  useEffect(() => {
    if (location.pathname === '/search') {
      const urlQ = new URLSearchParams(location.search).get('q') ?? '';
      setQuery(urlQ);
    } else {
      setQuery('');
    }
  }, [location.pathname, location.search]);

  // Debounce sur toutes les pages : dès qu'on tape, on navigue vers /search
  useEffect(() => {
    if (!query.trim()) {
      if (location.pathname === '/search') navigate('/search', { replace: true });
      return;
    }
    const t = setTimeout(() => {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`, {
        replace: location.pathname === '/search',
      });
    }, 400);
    return () => clearTimeout(t);
  }, [query]); // eslint-disable-line

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 px-4 h-14"
      style={{
        background:          'var(--glass-strong-bg)',
        backdropFilter:      'blur(20px) saturate(180%)',
        WebkitBackdropFilter:'blur(20px) saturate(180%)',
        borderBottom:        '1px solid var(--border)',
      }}
    >
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="flex lg:hidden p-2 rounded-xl transition-all"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={e => { (e.currentTarget.style.background = 'var(--bg-secondary)'); (e.currentTarget.style.color = 'var(--text-primary)'); }}
        onMouseLeave={e => { (e.currentTarget.style.background = 'transparent');         (e.currentTarget.style.color = 'var(--text-secondary)'); }}
      >
        <Menu size={20} />
      </button>

      {/* Logo mobile */}
      <img src={isDark ? Images.logoDark : Images.logoLight} alt="GoFolix" className="h-7 w-auto lg:hidden" />


      {/* Desktop search bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md hidden lg:flex items-center">
        <div className="relative w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher films, artistes, reels…"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl focus:outline-none transition-all"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(123,63,242,0.12)'; }}
            onBlur={e  => { e.target.style.borderColor = 'var(--border)';  e.target.style.boxShadow = 'none'; }}
          />
        </div>
      </form>

      {/* Right actions */}
      <div className="flex items-center gap-1.5 ml-auto">

        {/* Mobile search icon → /search */}
        <button
          onClick={() => navigate('/search')}
          className="p-2 rounded-xl transition-all lg:hidden"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { (e.currentTarget.style.background = 'var(--bg-secondary)'); (e.currentTarget.style.color = 'var(--text-primary)'); }}
          onMouseLeave={e => { (e.currentTarget.style.background = 'transparent');         (e.currentTarget.style.color = 'var(--text-secondary)'); }}
        >
          <Search size={20} />
        </button>

        {/* Go Live */}
        <button
          onClick={() => navigate('/go-live')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
          style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A)', color: '#fff', boxShadow: '0 2px 10px rgba(240,54,90,0.35)' }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 18px rgba(240,54,90,0.55)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 10px rgba(240,54,90,0.35)')}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="hidden sm:inline">Go Live</span>
          <Radio size={14} className="sm:hidden" />
        </button>

        {/* Dark / Light toggle */}
        <button
          onClick={toggle}
          title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
          className="p-2 rounded-xl transition-all"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { (e.currentTarget.style.background = 'var(--bg-secondary)'); (e.currentTarget.style.color = 'var(--text-primary)'); }}
          onMouseLeave={e => { (e.currentTarget.style.background = 'transparent');         (e.currentTarget.style.color = 'var(--text-secondary)'); }}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-xl transition-all"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { (e.currentTarget.style.background = 'var(--bg-secondary)'); (e.currentTarget.style.color = 'var(--text-primary)'); }}
          onMouseLeave={e => { (e.currentTarget.style.background = 'transparent');         (e.currentTarget.style.color = 'var(--text-secondary)'); }}
        >
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A)' }} />
        </button>

        {/* Avatar — desktop */}
        {user && (
          <button
            onClick={() => navigate('/profile')}
            className="hidden lg:flex items-center gap-2 pl-1 pr-3 py-1 rounded-xl transition-all"
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Avatar src={user.avatar_url} name={user.display_name ?? user.username} size="sm" verified={user.is_verified} />
            <span className="text-sm font-medium truncate max-w-[110px]" style={{ color: 'var(--text-primary)' }}>
              {user.display_name ?? user.username ?? user.first_name}
            </span>
          </button>
        )}

        {/* Avatar — mobile only (tap → profile) */}
        {user && (
          <button
            onClick={() => navigate('/profile')}
            className="lg:hidden"
          >
            <Avatar src={user.avatar_url} name={user.display_name ?? user.username} size="sm" verified={user.is_verified} />
          </button>
        )}
      </div>
    </header>
  );
}
