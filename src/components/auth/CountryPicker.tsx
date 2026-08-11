import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { COUNTRIES, searchCountries, type Country } from '../../data/countries';

interface Props {
  value:    Country;
  onChange: (c: Country) => void;
  focused?: boolean;
}

/** Sélecteur d'indicatif pays — liste complète (195 pays) avec recherche par
 *  nom ou indicatif, utilisé par LoginPage et RegisterPage. */
export function CountryPicker({ value, onChange, focused }: Props) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const rootRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const results = searchCountries(query);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="flex items-center gap-1.5 h-full px-3 rounded-xl text-sm font-semibold transition-all"
        style={{
          background: 'var(--bg-secondary)',
          border: `1px solid ${focused ? 'var(--primary)' : 'var(--border)'}`,
          color: 'var(--text-primary)',
          minWidth: 90,
        }}>
        <span className="text-base">{value.flag}</span>
        <span>{value.dial}</span>
        <ChevronDown size={12} style={{ color: 'var(--text-tertiary)' }} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden shadow-xl flex flex-col"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', width: 260, maxHeight: 320 }}
          onClick={e => e.stopPropagation()}>

          <div className="p-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Rechercher un pays…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full text-sm pl-8 pr-2 py-1.5 rounded-lg outline-none"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div className="overflow-y-auto">
            {results.length === 0 ? (
              <p className="px-3 py-4 text-sm text-center" style={{ color: 'var(--text-tertiary)' }}>
                Aucun pays trouvé
              </p>
            ) : (
              results.map(c => (
                <button key={c.code} type="button"
                  onClick={() => { onChange(c); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-all"
                  style={{
                    background: c.code === value.code ? 'rgba(123,63,242,0.1)' : 'transparent',
                    color: c.code === value.code ? 'var(--primary)' : 'var(--text-primary)',
                  }}
                  onMouseEnter={e => { if (c.code !== value.code) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                  onMouseLeave={e => { if (c.code !== value.code) e.currentTarget.style.background = 'transparent'; }}>
                  <span className="text-base">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>{c.dial}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { COUNTRIES };
export type { Country };
