import { useState } from 'react';
import { LinkPreviewCard } from './LinkPreviewCard';

const URL_REGEX = /(https?:\/\/[^\s<>"']+)/g;

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

interface Props {
  text: string;
  limit?: number;
  className?: string;
  style?: React.CSSProperties;
  showLinkPreview?: boolean;
}

export function RichText({ text, limit = 280, className = '', style, showLinkPreview = true }: Props) {
  const [expanded, setExpanded] = useState(false);

  const isLong = text.length > limit;
  const displayed = isLong && !expanded ? text.slice(0, limit).trimEnd() + '…' : text;

  // Extraire toutes les URLs du texte complet pour la preview (1re seulement)
  const allUrls = text.match(URL_REGEX) ?? [];
  const firstUrl = allUrls[0] ?? null;

  function renderSegments(str: string) {
    const parts = str.split(URL_REGEX);
    return parts.map((part, i) => {
      if (URL_REGEX.test(part)) {
        URL_REGEX.lastIndex = 0;
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="underline font-medium"
            style={{ color: 'var(--primary)' }}
          >
            {getDomain(part)}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }

  return (
    <div>
      <p
        className={`text-sm leading-relaxed ${className} ${isLong ? 'cursor-pointer select-none' : ''}`}
        style={style}
        onClick={e => { e.stopPropagation(); if (isLong) setExpanded(v => !v); }}
      >
        {renderSegments(displayed)}
        {isLong && !expanded && (
          <span className="font-semibold ml-1" style={{ color: 'var(--primary)' }}>
            Voir plus
          </span>
        )}
      </p>
      {isLong && expanded && (
        <button
          onClick={e => { e.stopPropagation(); setExpanded(false); }}
          className="text-xs font-semibold mt-1 transition-opacity hover:opacity-70"
          style={{ color: 'var(--primary)' }}
        >
          Voir moins ↑
        </button>
      )}
      {showLinkPreview && firstUrl && (
        <LinkPreviewCard url={firstUrl} />
      )}
    </div>
  );
}
