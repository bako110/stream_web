import { FILTERS } from '../../utils/reelFilters.tsx';
import type { FilterKey } from './types';

interface Props {
  filter: FilterKey;
  onChange: (filter: FilterKey) => void;
}

// FILTERS (reelFilters.tsx) n'a pas de champ catégorie — mapping local pour
// organiser le picker, aligné sur les commentaires de section du fichier source.
const CATEGORIES: { label: string; keys: FilterKey[] }[] = [
  { label: 'Base', keys: ['original'] },
  { label: 'Cinema', keys: ['vivid', 'drama', 'noir', 'fade'] },
  { label: 'Mood', keys: ['warm', 'cold', 'golden', 'rose'] },
  { label: 'Neon', keys: ['neon', 'cyber', 'acid'] },
  { label: 'Vintage', keys: ['retro', 'sepia', 'vhs', 'lomo'] },
];

export function FilterPicker({ filter, onChange }: Props) {
  return (
    <div className="px-4 py-3 space-y-4">
      {CATEGORIES.map(cat => (
        <div key={cat.label}>
          <p className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
            {cat.label}
          </p>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {cat.keys.map(key => {
              const def = FILTERS.find(f => f.key === key)!;
              const active = filter === key;
              return (
                <button
                  key={key}
                  onClick={() => onChange(key)}
                  className="shrink-0 flex flex-col items-center gap-1.5"
                >
                  <div
                    className="w-14 h-14 rounded-xl relative overflow-hidden"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: active ? '2px solid var(--primary)' : '2px solid transparent',
                    }}
                  >
                    <div className="absolute inset-0" style={{ background: def.overlay, opacity: def.opacity }} />
                    {def.overlay2 && (
                      <div className="absolute inset-0" style={{ background: def.overlay2, opacity: def.opacity2 }} />
                    )}
                  </div>
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: active ? 'var(--primary)' : 'var(--text-secondary)' }}
                  >
                    {def.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
