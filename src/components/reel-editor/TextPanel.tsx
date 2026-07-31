import { useState } from 'react';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Check } from 'lucide-react';
import { DRAW_COLORS } from './types';
import type { TextLayer } from './types';

interface Props {
  editing: TextLayer | null; // null = création d'un nouveau layer
  onConfirm: (layer: Omit<TextLayer, 'id' | 'x' | 'y'>) => void;
  onCancel: () => void;
}

const DEFAULTS: Omit<TextLayer, 'id' | 'x' | 'y'> = {
  text: '', color: '#FFFFFF', fontSize: 28, bold: false, italic: false,
  bg: false, bgColor: '#000000', align: 'center', font: 'default', outline: false,
};

// Pas de useEffect pour resynchroniser `draft` sur `editing` — le composant est
// remonté via une `key` côté parent (ReelEditor.tsx, key={editingTextId ?? 'new'})
// à chaque changement de layer édité, ce qui réinitialise naturellement le state.
export function TextPanel({ editing, onConfirm, onCancel }: Props) {
  const [draft, setDraft] = useState<Omit<TextLayer, 'id' | 'x' | 'y'>>(
    editing ? { ...editing } : { ...DEFAULTS },
  );

  const canConfirm = draft.text.trim().length > 0;

  return (
    <div className="px-4 py-3 space-y-4">
      <textarea
        value={draft.text}
        onChange={e => setDraft(d => ({ ...d, text: e.target.value }))}
        placeholder="Ajouter un texte..."
        rows={2}
        autoFocus
        className="w-full outline-none resize-none rounded-xl px-3 py-2.5 text-sm"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      />

      {/* Couleur */}
      <div>
        <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>Couleur</p>
        <div className="flex items-center gap-2 flex-wrap">
          {DRAW_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setDraft(d => ({ ...d, color: c }))}
              className="w-7 h-7 rounded-full shrink-0"
              style={{ background: c, border: draft.color === c ? '2px solid var(--primary)' : '2px solid var(--border)' }}
            />
          ))}
        </div>
      </div>

      {/* Taille */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Taille</span>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{draft.fontSize}px</span>
        </div>
        <input
          type="range" min={14} max={64} step={1}
          value={draft.fontSize}
          onChange={e => setDraft(d => ({ ...d, fontSize: Number(e.target.value) }))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: 'var(--primary)' }}
        />
      </div>

      {/* Style / alignement / fond / contour */}
      <div className="flex items-center gap-2 flex-wrap">
        <ToggleBtn active={draft.bold} onClick={() => setDraft(d => ({ ...d, bold: !d.bold }))} icon={<Bold size={14} />} />
        <ToggleBtn active={draft.italic} onClick={() => setDraft(d => ({ ...d, italic: !d.italic }))} icon={<Italic size={14} />} />
        <ToggleBtn active={draft.align === 'left'} onClick={() => setDraft(d => ({ ...d, align: 'left' }))} icon={<AlignLeft size={14} />} />
        <ToggleBtn active={draft.align === 'center'} onClick={() => setDraft(d => ({ ...d, align: 'center' }))} icon={<AlignCenter size={14} />} />
        <ToggleBtn active={draft.align === 'right'} onClick={() => setDraft(d => ({ ...d, align: 'right' }))} icon={<AlignRight size={14} />} />
        <ToggleBtn active={draft.bg} onClick={() => setDraft(d => ({ ...d, bg: !d.bg }))} label="Fond" />
        <ToggleBtn active={draft.outline} onClick={() => setDraft(d => ({ ...d, outline: !d.outline }))} label="Contour" />
      </div>

      {draft.bg && (
        <div className="flex items-center gap-2 flex-wrap">
          {DRAW_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setDraft(d => ({ ...d, bgColor: c }))}
              className="w-6 h-6 rounded-full shrink-0"
              style={{ background: c, border: draft.bgColor === c ? '2px solid var(--primary)' : '2px solid var(--border)' }}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
        >
          Annuler
        </button>
        <button
          onClick={() => canConfirm && onConfirm(draft)}
          disabled={!canConfirm}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-40"
          style={{ background: 'var(--primary)' }}
        >
          <Check size={14} /> Valider
        </button>
      </div>
    </div>
  );
}

function ToggleBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon?: React.ReactNode; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs font-bold"
      style={{
        background: active ? 'rgba(123,63,242,0.15)' : 'var(--bg-secondary)',
        color: active ? 'var(--primary)' : 'var(--text-secondary)',
        border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
      }}
    >
      {icon}{label}
    </button>
  );
}
