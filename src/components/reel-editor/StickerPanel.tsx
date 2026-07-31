import { useState } from 'react';
import { STICKER_SETS } from './types';

interface Props {
  onPick: (emoji: string) => void;
}

export function StickerPanel({ onPick }: Props) {
  const [set, setSet] = useState(0);

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-3 overflow-x-auto">
        {STICKER_SETS.map((_, i) => (
          <button
            key={i}
            onClick={() => setSet(i)}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm"
            style={{
              background: set === i ? 'rgba(123,63,242,0.15)' : 'var(--bg-secondary)',
              border: `1px solid ${set === i ? 'var(--primary)' : 'var(--border)'}`,
            }}
          >
            {STICKER_SETS[i][0]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-2">
        {STICKER_SETS[set].map((emoji, i) => (
          <button
            key={i}
            onClick={() => onPick(emoji)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-transform hover:scale-110"
            style={{ background: 'var(--bg-secondary)' }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
