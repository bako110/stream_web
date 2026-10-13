import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Maximize2, Minus, X, MessageCircle } from 'lucide-react';
import { MessagesWorkspace } from '../../pages/MessagesPage';

// Fenêtre de messagerie flottante (desktop) — reste ouverte pendant qu'on navigue
// dans l'app. Rend la même messagerie chiffrée que la page /messages, en mode intégré
// (la sélection d'une conversation ne change pas l'URL).
export function MessagesDock({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [minimized, setMinimized] = useState(false);

  // Même gestion que les notifications : Échap ferme ; sur mobile la fenêtre est plein écran,
  // donc elle se ferme quand on change de page (sinon elle masquerait la destination).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    if (window.matchMedia('(max-width: 640px)').matches) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const iconBtn = 'w-8 h-8 rounded-full flex items-center justify-center transition-colors';

  return createPortal(
    <div
      className={`msg-dock fixed z-[200] flex flex-col overflow-hidden animate-scale-in${minimized ? ' is-min' : ''}`}
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 24px rgba(11,11,16,0.14), 0 32px 80px -12px rgba(11,11,16,0.35)',
      }}
    >
      <style>{`
        .msg-dock { right: 12px; bottom: 12px; width: min(860px, calc(100vw - 24px)); height: min(640px, calc(100dvh - 96px)); border-radius: 1.75rem; transition: height .3s cubic-bezier(.16,1,.3,1); }
        .msg-dock.is-min { height: 52px; }
        @media (max-width: 640px) {
          .msg-dock, .msg-dock.is-min { inset: 0; width: auto; height: 100dvh; border-radius: 0; border: none; }
          .msg-dock-min { display: none !important; }
        }
      `}</style>
      <div className="flex items-center gap-2 pl-4 pr-2 h-[52px] shrink-0 cursor-pointer"
        style={{ background: 'var(--surface)', borderBottom: minimized ? 'none' : '1px solid var(--border)' }}
        onClick={() => minimized && setMinimized(false)}>
        <MessageCircle size={16} style={{ color: 'var(--primary)' }} />
        <p className="font-extrabold text-sm flex-1" style={{ color: 'var(--text-primary)' }}>Messages</p>
        <button className={`${iconBtn} msg-dock-min`} style={{ color: 'var(--text-tertiary)' }} aria-label={minimized ? 'Agrandir' : 'Réduire'}
          onClick={e => { e.stopPropagation(); setMinimized(v => !v); }}>
          <Minus size={16} />
        </button>
        <button className={iconBtn} style={{ color: 'var(--text-tertiary)' }} aria-label="Ouvrir en plein écran"
          onClick={e => { e.stopPropagation(); onClose(); navigate('/messages'); }}>
          <Maximize2 size={14} />
        </button>
        <button className={iconBtn} style={{ color: 'var(--text-tertiary)' }} aria-label="Fermer"
          onClick={e => { e.stopPropagation(); onClose(); }}>
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 min-h-0" style={{ display: minimized ? 'none' : 'block' }}>
        <MessagesWorkspace embedded />
      </div>
    </div>,
    document.body,
  );
}
