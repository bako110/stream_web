import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { ExternalLink } from 'lucide-react';
import { API_BASE_URL } from '../../utils/constants';

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
  // 0 = via le proxy du backend, 1 = URL directe (si le proxy échoue), 2 = abandon
  const [imgStage, setImgStage] = useState(0);

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
      className="mt-2 block rounded-xl overflow-hidden transition-opacity hover:opacity-90"
      style={{ border: '1px solid var(--border)', background: 'var(--surface)', textDecoration: 'none' }}
    >
      {/* Image en haut (ratio Open Graph 1.91), proxifiée par le backend : les CDN
          (Facebook, Instagram…) bloquent souvent le hotlink depuis un autre site. */}
      {preview.image && imgStage < 2 && (
        <div className="w-full overflow-hidden" style={{ aspectRatio: '1.91 / 1', background: 'var(--bg-secondary)' }}>
          <img key={imgStage} src={imgStage === 0 ? `${API_BASE_URL}${Endpoints.utils.linkPreviewImage(preview.image)}` : preview.image} alt="" referrerPolicy="no-referrer"
            className="w-full h-full object-cover" loading="lazy" onError={() => setImgStage(n => n + 1)} />
        </div>
      )}
      <div className="px-3 py-2.5 min-w-0 flex flex-col gap-0.5">
        <p className="text-[10px] font-bold uppercase tracking-wider truncate" style={{ color: 'var(--text-tertiary)' }}>
          {(preview.site_name || displayUrl).replace(/^www\./i, '')}
        </p>
        {preview.title && (
          <p className="text-sm font-bold leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>
            {preview.title}
          </p>
        )}
        {preview.description && (
          <p className="text-[13px] leading-snug line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
            {preview.description}
          </p>
        )}
        <div className="flex items-center gap-1 mt-1">
          <ExternalLink size={10} style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}>{displayUrl.replace(/^www\./i, '')}</span>
        </div>
      </div>
    </a>
  );
}
