import { useState, Fragment } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Play, Film, MessageCircle, Plus, FileText, Calendar, Music2 } from 'lucide-react';
import { emitTabReselect } from '../../utils/tabReselect';

const tabs = [
  { to: '/feed',     icon: Home,          label: 'Accueil'  },
  { to: '/reels',    icon: Play,          label: 'Reels'    },
  { to: '/films',    icon: Film,          label: 'Films'    },
  { to: '/messages', icon: MessageCircle, label: 'Messages' },
];

// Même 4 actions que CreateFAB.tsx (desktop), en navigation directe — pas de
// modal local ici, /create/post est aussi une vraie page routée.
const CREATE_OPTIONS = [
  { icon: Film,     label: 'Reel',      route: '/create/reel'    },
  { icon: FileText, label: 'Post',      route: '/create/post'    },
  { icon: Music2,   label: 'Concert',   route: '/create/concert' },
  { icon: Calendar, label: 'Événement', route: '/create/event'   },
];

// Bouton Créer central — même pattern que AppTabBar.tsx (mobile natif) :
// intégré à la barre (pas un FAB flottant séparé), dépasse légèrement au-dessus,
// menu déroulant vertical centré au-dessus du bouton.
function CreateNavButton() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex-1 h-full flex items-center justify-center">
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-[52px] left-1/2 -translate-x-1/2 z-50 rounded-2xl overflow-hidden animate-scale-in"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', minWidth: 150 }}>
            {CREATE_OPTIONS.map((opt, i) => (
              <button key={opt.label} onClick={() => { setOpen(false); navigate(opt.route); }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-left whitespace-nowrap"
                style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <opt.icon size={16} style={{ color: 'var(--text-secondary)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{opt.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <button onClick={() => setOpen(v => !v)}
        className="w-[46px] h-[46px] rounded-full flex items-center justify-center transition-transform"
        style={{
          marginTop: -16,
          background: 'var(--bg)',
          border: `1.5px solid ${open ? 'var(--text-primary)' : 'var(--border)'}`,
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
        }}>
        <Plus size={20} style={{ color: 'var(--text-primary)' }} />
      </button>
    </div>
  );
}

export function BottomNav() {
  const { pathname } = useLocation();

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
      {tabs.map(({ to, icon: Icon, label }, index) => {
        const isOnThisTab = to === '/feed' ? pathname === to : pathname.startsWith(to);
        return (
        <Fragment key={to}>
          <NavLink
            to={to}
            end={to === '/feed'}
            onClick={e => {
              // Retap sur l'onglet déjà actif — pas de nouvelle entrée d'historique,
              // on notifie plutôt la page pour qu'elle scrolle en haut + se rafraîchisse
              // (équivalent web du popToTabRoot mobile, cf. utils/tabReselect.ts).
              if (isOnThisTab) {
                e.preventDefault();
                emitTabReselect(to);
              }
            }}
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
          {/* Bouton Créer — entre Reels (index 1) et Films (index 2), même
              position relative que AppTabBar.tsx mobile natif (2 tabs de
              chaque côté). */}
          {index === 1 && <CreateNavButton />}
        </Fragment>
        );
      })}
    </nav>
  );
}
