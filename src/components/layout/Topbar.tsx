import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Search, Bell, Radio, Sun, Moon, X, ArrowLeft, MessageCircle, Download } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useWs } from '../../context/WebSocketContext';
import { Images } from '../assets';
import { MessagesPopover } from './MessagesPopover';
import { publicClient } from '../../api';
import { Endpoints } from '../../api/endpoints';

interface Props { onMenuClick: () => void; }

export function Topbar({ onMenuClick }: Props) {
  const { user }  = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const { unreadMessages } = useWs();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [query, setQuery]           = useState('');
  const [mobileSearch, setMobileSearch] = useState(false);
  const [mobileQuery,  setMobileQuery]  = useState('');
  const [msgPopover,   setMsgPopover]   = useState(false);
  const [apkUrl,       setApkUrl]       = useState<string | null>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    publicClient.get<{ apk_url: string | null }>(Endpoints.app.version)
      .then(({ data }) => { if (data.apk_url) setApkUrl(data.apk_url); })
      .catch(() => {});
  }, []);

  // Sync le champ desktop avec le param URL quand on est sur /search
  useEffect(() => {
    if (location.pathname === '/search') {
      const urlQ = new URLSearchParams(location.search).get('q') ?? '';
      setQuery(urlQ);
    } else {
      setQuery('');
    }
  }, [location.pathname, location.search]);

  // Ferme la recherche mobile si on quitte /search
  useEffect(() => {
    if (location.pathname !== '/search') {
      setMobileSearch(false);
      setMobileQuery('');
    }
  }, [location.pathname]);

  // Debounce desktop
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

  // Debounce mobile
  useEffect(() => {
    if (!mobileSearch) return;
    if (!mobileQuery.trim()) {
      navigate('/search', { replace: true });
      return;
    }
    const t = setTimeout(() => {
      navigate(`/search?q=${encodeURIComponent(mobileQuery.trim())}`, { replace: true });
    }, 400);
    return () => clearTimeout(t);
  }, [mobileQuery]); // eslint-disable-line

  function openMobileSearch() {
    setMobileSearch(true);
    setMobileQuery('');
    navigate('/search', { replace: false });
    setTimeout(() => mobileInputRef.current?.focus(), 80);
  }

  function closeMobileSearch() {
    setMobileSearch(false);
    setMobileQuery('');
    navigate(-1);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <>
    {/* Barre de recherche mobile fullscreen */}
    {mobileSearch && (
      <div className="lg:hidden fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--surface)' }}>
        <div className="flex items-center gap-2 px-3 h-14 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <button onClick={closeMobileSearch} className="p-2 shrink-0" style={{ color: 'var(--text-primary)' }}>
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-tertiary)' }} />
            <input
              ref={mobileInputRef}
              value={mobileQuery}
              onChange={e => setMobileQuery(e.target.value)}
              placeholder="Films, artistes, concerts…"
              className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl focus:outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            {mobileQuery && (
              <button onClick={() => setMobileQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-tertiary)' }}>
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    )}

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

      {/* Logo — visible partout (mobile + desktop) */}
      <img
        src={isDark ? Images.logoDark : Images.logoLight}
        alt="GoFolyX"
        className="h-7 w-auto cursor-pointer shrink-0"
        onClick={() => navigate('/feed')}
      />

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

        {/* Mobile search icon → ouvre barre fullscreen */}
        <button
          onClick={openMobileSearch}
          className="p-2 rounded-xl transition-all lg:hidden"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { (e.currentTarget.style.background = 'var(--bg-secondary)'); (e.currentTarget.style.color = 'var(--text-primary)'); }}
          onMouseLeave={e => { (e.currentTarget.style.background = 'transparent');         (e.currentTarget.style.color = 'var(--text-secondary)'); }}
        >
          <Search size={20} />
        </button>

        {/* Télécharger l'app — mobile uniquement, si APK disponible */}
        {apkUrl && (
          <a
            href={apkUrl}
            download
            title="Télécharger l'application Android"
            className="flex lg:hidden items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all no-underline"
            style={{ background: 'rgba(123,63,242,0.12)', color: 'var(--primary)' }}
            onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(123,63,242,0.22)'); }}
            onMouseLeave={e => { (e.currentTarget.style.background = 'rgba(123,63,242,0.12)'); }}
          >
            <Download size={15} />
            <span className="hidden sm:inline">App</span>
          </a>
        )}

        {/* Go Live */}
        <button
          onClick={() => navigate('/go-live')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
          style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)', color: '#fff', boxShadow: '0 2px 10px rgba(239,68,68,0.35)' }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 18px rgba(239,68,68,0.55)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 10px rgba(239,68,68,0.35)')}
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

        {/* Messages */}
        <button
          onClick={() => setMsgPopover(v => !v)}
          className="relative p-2 rounded-xl transition-all"
          style={{
            color: msgPopover ? 'var(--primary)' : 'var(--text-secondary)',
            background: msgPopover ? 'rgba(123,63,242,0.1)' : 'transparent',
          }}
          onMouseEnter={e => { if (!msgPopover) { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
          onMouseLeave={e => { if (!msgPopover) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
        >
          <MessageCircle size={20} />
          {unreadMessages > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full text-white text-[10px] font-bold px-1"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', lineHeight: 1 }}>
              {unreadMessages > 99 ? '99+' : unreadMessages}
            </span>
          )}
        </button>
        {msgPopover && <MessagesPopover onClose={() => setMsgPopover(false)} />}

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
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }} />
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
    </>
  );
}
