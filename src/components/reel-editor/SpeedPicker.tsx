import { SPEEDS } from './types';

interface Props {
  speed: number;
  onChange: (speed: number) => void;
}

export function SpeedPicker({ speed, onChange }: Props) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        {SPEEDS.map(sp => {
          const active = sp.v === speed;
          return (
            <button
              key={sp.v}
              onClick={() => onChange(sp.v)}
              className="px-3.5 py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: active ? 'var(--primary)' : 'var(--bg-secondary)',
                color: active ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
              }}
            >
              {sp.label}
            </button>
          );
        })}
      </div>
      {speed !== 1 && (
        <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
          {speed < 1 ? 'Ralenti' : 'Rapide'}
        </p>
      )}
    </div>
  );
}
