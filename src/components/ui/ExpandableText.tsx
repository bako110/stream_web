import { useState } from 'react';

interface Props {
  text: string;
  /** Nombre de caractères avant troncature (défaut 280) */
  limit?: number;
  /** Classes CSS supplémentaires sur le <p> */
  className?: string;
  style?: React.CSSProperties;
  /** Préserve les sauts de ligne */
  preWrap?: boolean;
}

/**
 * Affiche un texte avec bouton "Voir plus / Voir moins"
 * si le texte dépasse `limit` caractères.
 */
export function ExpandableText({ text, limit = 280, className = '', style, preWrap = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > limit;
  const displayed = isLong && !expanded ? text.slice(0, limit).trimEnd() + '…' : text;

  return (
    <div>
      <p
        className={`text-sm leading-relaxed ${className}`}
        style={{ ...(preWrap ? { whiteSpace: 'pre-wrap' } : {}), ...style }}
      >
        {displayed}
      </p>
      {isLong && (
        <button
          onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
          className="text-xs font-semibold mt-1.5 transition-opacity hover:opacity-70"
          style={{ color: 'var(--primary)' }}
        >
          {expanded ? 'Voir moins ↑' : 'Voir plus ↓'}
        </button>
      )}
    </div>
  );
}
