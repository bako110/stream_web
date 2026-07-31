import { Trash2, Eraser } from 'lucide-react';
import { DRAW_COLORS, DRAW_WIDTHS } from './types';

interface Props {
  color: string;
  width: number;
  hasDrawings: boolean;
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
  onUndo: () => void;
  onClear: () => void;
}

export function DrawPanel({ color, width, hasDrawings, onColorChange, onWidthChange, onUndo, onClear }: Props) {
  return (
    <div className="px-4 py-3 space-y-4">
      <div>
        <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>Couleur</p>
        <div className="flex items-center gap-2 flex-wrap">
          {DRAW_COLORS.map(c => (
            <button
              key={c}
              onClick={() => onColorChange(c)}
              className="w-7 h-7 rounded-full shrink-0"
              style={{ background: c, border: color === c ? '2px solid var(--primary)' : '2px solid var(--border)' }}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>Épaisseur</p>
        <div className="flex items-center gap-2">
          {DRAW_WIDTHS.map(w => (
            <button
              key={w}
              onClick={() => onWidthChange(w)}
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: width === w ? 'rgba(123,63,242,0.15)' : 'var(--bg-secondary)',
                border: `1px solid ${width === w ? 'var(--primary)' : 'var(--border)'}`,
              }}
            >
              <div className="rounded-full" style={{ width: Math.min(w, 16), height: Math.min(w, 16), background: color }} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          disabled={!hasDrawings}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
        >
          <Eraser size={14} /> Dernier trait
        </button>
        <button
          onClick={onClear}
          disabled={!hasDrawings}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
        >
          <Trash2 size={14} /> Tout effacer
        </button>
      </div>
    </div>
  );
}
