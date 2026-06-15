import { useState } from 'react';
import { LinkPreviewCard } from './LinkPreviewCard';

// Pas de flag `g` ici — on l'utilise uniquement via split/match avec new RegExp
const URL_PATTERN = /https?:\/\/[^\s<>"']+/;
const URL_SPLIT   = /(https?:\/\/[^\s<>"']+)/;

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

function isUrl(str: string): boolean {
  return URL_PATTERN.test(str);
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

  // 1re URL du texte complet (pour la preview OG)
  const firstUrl = text.match(URL_SPLIT)?.[1] ?? null;

  function renderSegments(str: string) {
    return str.split(URL_SPLIT).map((part, i) =>
      isUrl(part) ? (
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
      ) : (
        <span key={i}>{part}</span>
      )
    );
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
