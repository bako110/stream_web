import { useState, useRef, useLayoutEffect } from 'react';
import { LinkPreviewCard } from './LinkPreviewCard';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';

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

// *gras* (style WhatsApp) : pas d'espace juste APRÈS l'étoile ouvrante ; un espace avant
// l'étoile fermante est toléré (« *SAPEC * » donne bien SAPEC en gras), le contenu est rogné. Le gras est détecté AVANT les liens : un lien peut donc se trouver à l'intérieur
// d'un passage en gras (« *retrouvez vos photos ici : https://… * »), sinon les étoiles
// restaient affichées telles quelles dès qu'une URL les séparait.
const BOLD_RE = /(\*[^\s*][^*\n]*\*)/g;

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
      ? <strong key={i} style={{ fontWeight: 800 }}>{renderLinks(part.slice(1, -1).trim(), linkClassName, linkStyle)}</strong>
      : <span key={i}>{renderLinks(part, linkClassName, linkStyle)}</span>
  );
}

interface Props {
  text: string;
  limit?: number;
  className?: string;
  style?: React.CSSProperties;
  showLinkPreview?: boolean;
  /** Si défini : texte tronqué à N lignes (au lieu de `limit` caractères) avec « Voir plus ». */
  maxLines?: number;
  /** true si le serveur a tronqué `text` dans cette réponse de liste (is_*_truncated) :
   *  « Voir plus » charge alors le texte complet via entityType/entityId au lieu
   *  d'un simple dépliage. Jamais calculé côté client. */
  isTruncated?: boolean;
  entityType?: 'post' | 'event' | 'concert' | 'reel' | 'comment';
  entityId?: string;
}

/** Texte complet avant édition : évite d'enregistrer la version tronquée d'une liste. */
export async function resolveFullText(
  text: string, isTruncated: boolean | undefined, type: 'post' | 'event' | 'concert' | 'reel' | 'comment', id: string,
): Promise<string> {
  if (!isTruncated) return text;
  try {
    const r = await apiClient.get<{ text: string | null }>(Endpoints.contentText.fullText(type, id));
    return r.data?.text ?? text;
  } catch { return text; }
}

/** Texte complet à la demande (liste → version tronquée serveur). */
export function useFullText(text: string, isTruncated?: boolean, entityType?: string, entityId?: string) {
  const [fullText, setFullText] = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const canFetch = !!(isTruncated && entityType && entityId);
  const load = async () => {
    if (!canFetch || fullText !== null || loading) return;
    setLoading(true);
    try {
      const r = await apiClient.get<{ text: string | null }>(Endpoints.contentText.fullText(entityType as any, entityId!));
      setFullText(r.data?.text ?? text);
    } catch { /* on déplie quand même la version reçue */ }
    finally { setLoading(false); }
  };
  return { shown: fullText ?? text, needsFetch: canFetch && fullText === null, loading, load };
}

export function RichText({ text: rawText, limit = 280, className = '', style, showLinkPreview = true, maxLines, isTruncated, entityType, entityId }: Props) {
  const { shown: text, needsFetch, loading, load } = useFullText(rawText, isTruncated, entityType, entityId);
  const [expanded, setExpanded] = useState(false);
  const expand = async () => { if (needsFetch) await load(); setExpanded(true); };
  const [overflowing, setOverflowing] = useState(false);
  const pRef = useRef<HTMLParagraphElement>(null);

  // Mode "N lignes" : on mesure si le texte déborde une fois clampé.
  useLayoutEffect(() => {
    if (!maxLines || expanded) return;
    const el = pRef.current;
    if (el) setOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, [maxLines, expanded, text]);

  if (maxLines) {
    const clamped = !expanded;
    return (
      <div>
        <p
          ref={pRef}
          className={`text-sm leading-relaxed whitespace-pre-line break-words ${className}`}
          style={clamped
            ? { ...style, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: maxLines, overflow: 'hidden' }
            : style}
        >
          {renderTextWithLinks(text, 'underline font-medium')}
        </p>
        {(overflowing || expanded || needsFetch) && (
          <button
            disabled={loading}
            onClick={e => { e.stopPropagation(); if (expanded) setExpanded(false); else expand(); }}
            className="text-sm font-semibold mt-1 transition-opacity hover:opacity-70"
            style={{ color: 'var(--primary)' }}
          >
            {loading ? '…' : expanded ? 'Voir moins ↑' : 'Voir plus'}
          </button>
        )}
        {showLinkPreview && text.match(URL_SPLIT)?.[0] && (
          <LinkPreviewCard url={text.match(URL_SPLIT)![0]} />
        )}
      </div>
    );
  }

  const isLong = needsFetch || text.length > limit;
  const displayed = isLong && !expanded ? text.slice(0, limit).trimEnd() + '…' : text;

  // 1re URL du texte complet (pour la preview OG)
  const firstUrl = text.match(URL_SPLIT)?.[0] ?? null;

  const renderSegments = (str: string) => renderTextWithLinks(str, 'underline font-medium');

  return (
    <div>
      <p
        className={`text-sm leading-relaxed whitespace-pre-line ${className} ${isLong ? 'cursor-pointer select-none' : ''}`}
        style={style}
        onClick={e => { e.stopPropagation(); if (!isLong) return; if (expanded) setExpanded(false); else expand(); }}
      >
        {renderSegments(displayed)}
        {isLong && !expanded && (
          <span className="font-semibold ml-1" style={{ color: 'var(--primary)' }}>
            {loading ? '…' : 'Voir plus'}
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
