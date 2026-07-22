import { NavLink } from 'react-router-dom';
import { Home, Play, Film, MessageCircle } from 'lucide-react';

const tabs = [
  { to: '/feed',     icon: Home,          label: 'Accueil'  },
  { to: '/reels',    icon: Play,          label: 'Reels'    },
  { to: '/films',    icon: Film,          label: 'Films'    },
  { to: '/messages', icon: MessageCircle, label: 'Messages' },
];

export function BottomNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around px-2"
      style={{
        height: '60px',
        background: 'var(--glass-strong-bg)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderTop: '1px solid var(--border)',
      }}
    >
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/feed'}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all"
          style={({ isActive }) => ({
            color: isActive ? 'var(--primary)' : 'var(--text-tertiary)',
          })}
        >
          {({ isActive }) => (
            <>
              <div
                className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200"
                style={{ background: isActive ? 'rgba(123,63,242,0.12)' : 'transparent' }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
