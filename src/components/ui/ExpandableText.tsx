import { useState } from 'react';
import { renderTextWithLinks } from './RichText';

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
 * Affiche un texte avec bouton "Voir plus / Voir moins" si le texte dépasse
 * `limit` caractères — *gras* (style WhatsApp) et liens interprétés via
 * renderTextWithLinks, même rendu que RichText (posts) mais sans la carte
 * de preview de lien (utilisé dans des contextes compacts : messages,
 * events, communautés, canaux).
 */
export function ExpandableText({ text, limit = 280, className = '', style, preWrap = true }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > limit;
  const displayed = isLong && !expanded ? text.slice(0, limit).trimEnd() + '…' : text;

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLong) setExpanded(v => !v);
  };

  return (
    <div>
      <p
        className={`text-sm leading-relaxed ${className} ${isLong ? 'cursor-pointer select-none' : ''}`}
        style={{ ...(preWrap ? { whiteSpace: 'pre-wrap' } : {}), ...style }}
        onClick={toggle}
      >
        {renderTextWithLinks(displayed)}
        {isLong && !expanded && (
          <span className="font-semibold ml-1" style={{ color: 'var(--primary)' }}>
            Voir plus
          </span>
        )}
      </p>
      {isLong && expanded && (
        <button
          onClick={toggle}
          className="text-xs font-semibold mt-1 transition-opacity hover:opacity-70"
          style={{ color: 'var(--primary)' }}
        >
          Voir moins ↑
        </button>
      )}
    </div>
  );
}
