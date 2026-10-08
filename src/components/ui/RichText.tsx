import { useState } from 'react';
import { LinkPreviewCard } from './LinkPreviewCard';

// Détecte les URLs avec protocole (https://...) ET les domaines nus (site.com,
// truc.net, exemple.org...) sans http(s):// devant. Pas de flag `g` sur la version
// singulière — utilisée uniquement via split/match avec new RegExp.
const COMMON_TLDS = 'com|net|org|io|co|app|dev|info|biz|fr|africa|sn|ci|ma|ly';
export const URL_PATTERN = new RegExp(
  `(?:https?:\\/\\/[^\\s<>"']+)|(?:[a-zA-Z0-9-]+\\.(?:${COMMON_TLDS})(?:\\.[a-z]{2})?(?:\\/[^\\s<>"']*)?)`,
);
export const URL_SPLIT = new RegExp(`(${URL_PATTERN.source})`, 'g');

export function isUrl(str: string): boolean {
  return new RegExp(`^(?:${URL_PATTERN.source})$`).test(str);
}

export function toHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

// Libellé d'un lien : domaine + chemin raccourci (« gofolyx.com/posts/23U8TJc5… ») plutôt que
// le seul domaine — sinon tous les liens d'un même site se ressemblent et on ne sait pas où ils mènent.
function getDomain(url: string): string {
  try {
    const u = new URL(toHref(url));
    const label = u.hostname.replace(/^www\./, '') + (u.pathname !== '/' ? u.pathname.replace(/\/$/, '') : '');
    return label.length > 38 ? label.slice(0, 37) + '…' : label;
  } catch { return url; }
}

// *gras* (style WhatsApp, même règle que le RichText mobile) : pas d'espace collé aux
// astérisques. Le gras est détecté AVANT les liens : un lien peut donc se trouver à l'intérieur
// d'un passage en gras (« *retrouvez vos photos ici : https://… * »), sinon les étoiles
// restaient affichées telles quelles dès qu'une URL les séparait.
const BOLD_RE = /(\*[^\s*][^*]*[^\s*]\*|\*[^\s*]\*)/g;

function renderLinks(str: string, linkClassName: string, linkStyle?: React.CSSProperties) {
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

/** Texte enrichi : *gras* + liens cliquables (liens possibles à l'intérieur du gras). */
export function renderTextWithLinks(str: string, linkClassName = 'underline font-medium', linkStyle?: React.CSSProperties) {
  // split avec groupe capturant : les indices impairs sont les segments *gras*
  return str.split(BOLD_RE).map((part, i) =>
    i % 2 === 1
      ? <strong key={i} style={{ fontWeight: 800 }}>{renderLinks(part.slice(1, -1), linkClassName, linkStyle)}</strong>
      : <span key={i}>{renderLinks(part, linkClassName, linkStyle)}</span>
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

  const renderSegments = (str: string) => renderTextWithLinks(str, 'underline font-medium');

  return (
    <div>
      <p
        className={`text-sm leading-relaxed whitespace-pre-line ${className} ${isLong ? 'cursor-pointer select-none' : ''}`}
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
