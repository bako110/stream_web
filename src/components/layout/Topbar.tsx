import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Search, Bell, MessageCircle } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { RoundLogo } from '../ui/RoundLogo';
import { useAuthStore } from '../../store/authStore';
import { useWs } from '../../context/WebSocketContext';
import { MessagesPopover } from './MessagesPopover';
import { AccountSwitcherDropdown } from './AccountSwitcherDropdown';

interface Props { onMenuClick: () => void; }

export function Topbar({ onMenuClick }: Props) {
  const { user }  = useAuthStore();
  const { unreadMessages } = useWs();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [query, setQuery]           = useState('');
  const [msgPopover,   setMsgPopover]   = useState(false);

  // Sync le champ desktop avec le param URL quand on est sur /search
  useEffect(() => {
    if (location.pathname === '/search') {
      const urlQ = new URLSearchParams(location.search).get('q') ?? '';
      setQuery(urlQ);
    } else {
      setQuery('');
    }
  }, [location.pathname, location.search]);

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

  // Sur mobile, la loupe navigue directement vers /search — le champ + résultats
  // y sont déjà géré par SearchPage (plus d'overlay dupliqué qui masquait les résultats).
  function openMobileSearch() {
    navigate('/search');
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-1.5 sm:gap-3 pl-2 pr-3 sm:px-4 h-14 overflow-hidden"
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
        className="flex lg:hidden p-1.5 sm:p-2 rounded-xl transition-all shrink-0"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={e => { (e.currentTarget.style.background = 'var(--bg-secondary)'); (e.currentTarget.style.color = 'var(--text-primary)'); }}
        onMouseLeave={e => { (e.currentTarget.style.background = 'transparent');         (e.currentTarget.style.color = 'var(--text-secondary)'); }}
      >
        <Menu size={20} />
      </button>

      {/* Logo — visible partout (mobile + desktop) */}
      <button onClick={() => navigate('/feed')} className="shrink-0 flex items-center" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <RoundLogo size={34} />
      </button>

      {/* Spacer flexible — absorbe l'espace vide et empêche le groupe de droite de déborder sur mobile */}
      <div className="flex-1 min-w-0 lg:hidden" />

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
      <div className="flex items-center gap-0.5 sm:gap-1.5 ml-auto shrink-0">

        {/* Mobile search icon → ouvre barre fullscreen */}
        <button
          onClick={openMobileSearch}
          className="p-1.5 sm:p-2 rounded-xl transition-all lg:hidden shrink-0"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { (e.currentTarget.style.background = 'var(--bg-secondary)'); (e.currentTarget.style.color = 'var(--text-primary)'); }}
          onMouseLeave={e => { (e.currentTarget.style.background = 'transparent');         (e.currentTarget.style.color = 'var(--text-secondary)'); }}
        >
          <Search size={19} />
        </button>

        {/* Messages */}
        <button
          onClick={() => setMsgPopover(v => !v)}
          className="relative p-1.5 sm:p-2 rounded-xl transition-all shrink-0"
          style={{
            color: msgPopover ? 'var(--primary)' : 'var(--text-secondary)',
            background: msgPopover ? 'rgba(123,63,242,0.1)' : 'transparent',
          }}
          onMouseEnter={e => { if (!msgPopover) { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
          onMouseLeave={e => { if (!msgPopover) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
        >
          <MessageCircle size={19} />
          {unreadMessages > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-white text-[10px] font-bold px-1"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', lineHeight: 1 }}>
              {unreadMessages > 99 ? '99+' : unreadMessages}
            </span>
          )}
        </button>
        {msgPopover && <MessagesPopover onClose={() => setMsgPopover(false)} />}

        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-1.5 sm:p-2 rounded-xl transition-all shrink-0"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { (e.currentTarget.style.background = 'var(--bg-secondary)'); (e.currentTarget.style.color = 'var(--text-primary)'); }}
          onMouseLeave={e => { (e.currentTarget.style.background = 'transparent');         (e.currentTarget.style.color = 'var(--text-secondary)'); }}
        >
          <Bell size={19} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }} />
        </button>

        {/* Avatar — desktop (flèche → bascule rapide entre comptes) */}
        <AccountSwitcherDropdown />

        {/* Avatar — mobile only (tap → profile) */}
        {user && (
          <button
            onClick={() => navigate('/profile')}
            className="lg:hidden shrink-0 pl-1 pr-0.5"
          >
            <Avatar src={user.avatar_url} name={user.display_name ?? user.username} size="sm" verified={user.is_verified} />
          </button>
        )}
      </div>
    </header>
  );
}
