import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiError } from '../api';

interface UseApiState<T> {
  data:    T | null;
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

export function useApi<T>(
  fetcher: () => Promise<{ data: T }>,
  deps: unknown[] = [],
): UseApiState<T> {
  const [data,    setData]    = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const ref = useRef(fetcher);
  ref.current = fetcher;

  const run = useCallback(() => {
    setLoading(true);
    setError(null);
    ref.current()
      .then(r  => { setData(r.data); setLoading(false); })
      .catch(e => { setError(e instanceof ApiError ? e.message : 'Erreur'); setLoading(false); });
  }, []);

  useEffect(() => {
    // Vide immédiatement les données de l'utilisateur précédent
    setData(null);
    setLoading(true);
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: run };
}

// ── Paginated ─────────────────────────────────────────────────────────────────
type PaginatedResult<T> = {
  items?: T[];
  results?: T[];
  data?: T[];
  pages?: number;
  total_pages?: number;
  total?: number;
  count?: number;
};

export function usePaginatedApi<T>(
  fetcher: (page: number) => Promise<{ data: PaginatedResult<T> | T[] }>,
  deps: unknown[] = [],
  pageSize = 20,
) {
  const [items,   setItems]   = useState<T[]>([]);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const ref = useRef(fetcher);
  ref.current = fetcher;
  const loadingRef = useRef(false);

  const load = useCallback((p: number, replace = false) => {
    loadingRef.current = true;
    setLoading(true);
    ref.current(p)
      .then(r => {
        const raw = r.data;

        let list: T[] = [];
        let totalPages = 1;

        if (Array.isArray(raw)) {
          list = raw;
          // L'API renvoie un simple tableau (pas de total) : une page pleine
          // laisse supposer qu'il y en a une autre.
          totalPages = list.length >= pageSize ? p + 1 : p;
        } else if (raw && typeof raw === 'object') {
          const obj = raw as PaginatedResult<T>;
          list       = obj.items ?? obj.results ?? obj.data ?? [];
          totalPages = obj.pages ?? obj.total_pages
            ?? (obj.total != null ? Math.max(1, Math.ceil(obj.total / pageSize)) : (list.length >= pageSize ? p + 1 : p));
        }

        setItems(prev => {
          if (replace) return list;
          const seen = new Set(prev.map((x: any) => x?.id));
          return [...prev, ...list.filter((x: any) => x?.id == null || !seen.has(x.id))];
        });
        setPage(p);
        setPages(totalPages);
        loadingRef.current = false;
        setLoading(false);
      })
      .catch(e => { setError(e instanceof Error ? e.message : 'Erreur'); loadingRef.current = false; setLoading(false); });
  }, []);

  useEffect(() => {
    // Vide immédiatement les items du profil précédent
    setItems([]);
    setPage(1);
    setPages(1);
    load(1, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const loadMore = useCallback(() => { if (!loadingRef.current && page < pages) load(page + 1); }, [page, pages, load]);

  // Chargement automatique quand la sentinelle (fin de liste) devient visible
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading || page >= pages) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '400px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [loading, page, pages, items.length, loadMore]);

  return {
    items,
    page,
    pages,
    loading,
    error,
    sentinelRef,
    loadMore,
    refetch:  () => load(1, true),
  };
}
