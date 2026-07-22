import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';

export interface CardMenuAction {
  icon: LucideIcon;
  label: string;
  sub?: string;
  color?: string;
  onClick: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  actions: CardMenuAction[];
}

/** Bottom sheet "..." réutilisable sur les cards (post/concert/event) — même design que le mobile. */
export function CardMoreMenu({ open, onClose, title, actions }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl sm:mb-6 overflow-hidden animate-reveal-up"
        style={{ background: 'var(--surface)', animationDuration: '0.22s' }}
        onClick={e => e.stopPropagation()}>

        <div className="w-9 h-1 rounded-full mx-auto mt-3 sm:hidden" style={{ background: 'var(--border)' }} />

        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-base font-extrabold truncate pr-3" style={{ color: 'var(--text-primary)' }}>{title ?? 'Options'}</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="px-3 pb-3 flex flex-col gap-0.5">
          {actions.map((a, i) => {
            const color = a.color ?? 'var(--text-primary)';
            return (
              <button key={i} onClick={() => { onClose(); a.onClick(); }}
                className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors duration-150 text-left w-full"
                onMouseEnter={e => { (e.currentTarget.style.background = 'var(--bg-secondary)'); }}
                onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${color}18`, color }}>
                  <a.icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate" style={{ color: a.color ?? 'var(--text-primary)' }}>{a.label}</p>
                  {a.sub && <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{a.sub}</p>}
                </div>
              </button>
            );
          })}
        </div>

        <div className="pb-3 sm:pb-4" />
      </div>
    </div>
  );
}
