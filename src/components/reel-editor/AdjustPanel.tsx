import type { VideoAdjust } from './types';

interface Props {
  adjust: VideoAdjust;
  onChange: (adjust: VideoAdjust) => void;
}

const SLIDERS: { key: keyof VideoAdjust; label: string }[] = [
  { key: 'brightness', label: 'Luminosité' },
  { key: 'contrast', label: 'Contraste' },
  { key: 'saturation', label: 'Saturation' },
  { key: 'temperature', label: 'Température' },
];

export function AdjustPanel({ adjust, onChange }: Props) {
  return (
    <div className="px-4 py-3 space-y-4">
      {SLIDERS.map(({ key, label }) => {
        const value = adjust[key];
        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{value.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.01}
              value={value}
              onChange={e => onChange({ ...adjust, [key]: Number(e.target.value) })}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: 'var(--primary)' }}
            />
          </div>
        );
      })}
    </div>
  );
}
