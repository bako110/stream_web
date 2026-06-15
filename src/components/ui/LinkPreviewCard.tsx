import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { ExternalLink } from 'lucide-react';

interface Preview {
  title: string | null;
  description: string | null;
  image: string | null;
  domain: string;
  site_name: string | null;
}

const _cache = new Map<string, Preview | null>();

interface Props {
  url: string;
}

export function LinkPreviewCard({ url }: Props) {
  const [preview, setPreview] = useState<Preview | null | undefined>(
    _cache.has(url) ? _cache.get(url) : undefined,
  );
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (_cache.has(url)) {
      setPreview(_cache.get(url) ?? null);
      return;
    }
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    apiClient.get<Preview>(Endpoints.utils.linkPreview(url))
      .then(r => {
        _cache.set(url, r.data ?? null);
        setPreview(r.data ?? null);
      })
      .catch(() => {
        _cache.set(url, null);
        setPreview(null);
      });
  }, [url]);

  // Pas encore chargé — petit placeholder
  if (preview === undefined) {
    return (
      <div className="mt-2 h-16 rounded-xl animate-pulse"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }} />
    );
  }

  // Échec ou pas de données
  if (!preview) return null;

  const displayUrl = preview.domain;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="mt-2 flex rounded-xl overflow-hidden transition-opacity hover:opacity-90 block"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-secondary)', textDecoration: 'none' }}
    >
      {preview.image && (
        <div className="shrink-0 w-24 h-24 overflow-hidden">
          <img src={preview.image} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex flex-col justify-center px-3 py-2 min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-0.5"
          style={{ color: 'var(--text-tertiary)' }}>
          {displayUrl}
        </p>
        {preview.title && (
          <p className="text-sm font-bold leading-tight line-clamp-2"
            style={{ color: 'var(--text-primary)' }}>
            {preview.title}
          </p>
        )}
        {preview.description && (
          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
            {preview.description}
          </p>
        )}
        <div className="flex items-center gap-1 mt-1.5">
          <ExternalLink size={10} style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{displayUrl}</span>
        </div>
      </div>
    </a>
  );
}
