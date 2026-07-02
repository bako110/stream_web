import { useState } from 'react';
import { LinkPreviewCard } from './LinkPreviewCard';

// Détecte les URLs avec protocole (https://...) ET les domaines nus (site.com,
// truc.net, exemple.org...) sans http(s):// devant. Pas de flag `g` sur la version
// singulière — utilisée uniquement via split/match avec new RegExp.
const COMMON_TLDS = 'com|net|org|io|co|app|dev|info|biz|fr|africa|sn|ci|ma|ly';
const URL_PATTERN = new RegExp(
  `(?:https?:\\/\\/[^\\s<>"']+)|(?:[a-zA-Z0-9-]+\\.(?:${COMMON_TLDS})(?:\\.[a-z]{2})?(?:\\/[^\\s<>"']*)?)`,
);
const URL_SPLIT = new RegExp(`(${URL_PATTERN.source})`, 'g');

function isUrl(str: string): boolean {
  return new RegExp(`^(?:${URL_PATTERN.source})$`).test(str);
}

function toHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function getDomain(url: string): string {
  try { return new URL(toHref(url)).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

/** Rend un texte brut en segments avec liens cliquables — réutilisable hors RichText
 *  pour les zones à style personnalisé (ex: caption de reel sur fond vidéo). */
export function renderTextWithLinks(str: string, linkClassName = 'underline font-medium', linkStyle?: React.CSSProperties) {
  return str.split(URL_SPLIT).map((part, i) =>
    isUrl(part) ? (
      <a key={i} href={toHref(part)} target="_blank" rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className={linkClassName} style={linkStyle ?? { color: 'var(--primary)' }}>
        {getDomain(part)}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
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
  const firstUrl = text.match(URL_SPLIT)?.[0] ?? null;

  function renderSegments(str: string) {
    return str.split(URL_SPLIT).map((part, i) =>
      isUrl(part) ? (
        <a
          key={i}
          href={toHref(part)}
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
        <LinkPreviewCard url={toHref(firstUrl)} />
      )}
    </div>
  );
}
