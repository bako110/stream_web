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
) {
  const [items,   setItems]   = useState<T[]>([]);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const ref = useRef(fetcher);
  ref.current = fetcher;

  const load = useCallback((p: number, replace = false) => {
    setLoading(true);
    ref.current(p)
      .then(r => {
        const raw = r.data;

        let list: T[] = [];
        let totalPages = 1;

        if (Array.isArray(raw)) {
          list = raw;
        } else if (raw && typeof raw === 'object') {
          const obj = raw as PaginatedResult<T>;
          list       = obj.items ?? obj.results ?? obj.data ?? [];
          totalPages = obj.pages ?? obj.total_pages ?? 1;
        }

        setItems(prev => replace ? list : [...prev, ...list]);
        setPage(p);
        setPages(totalPages);
        setLoading(false);
      })
      .catch(e => { setError(e instanceof Error ? e.message : 'Erreur'); setLoading(false); });
  }, []);

  useEffect(() => {
    // Vide immédiatement les items du profil précédent
    setItems([]);
    setPage(1);
    setPages(1);
    load(1, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    items,
    page,
    pages,
    loading,
    error,
    loadMore: () => { if (page < pages) load(page + 1); },
    refetch:  () => load(1, true),
  };
}
