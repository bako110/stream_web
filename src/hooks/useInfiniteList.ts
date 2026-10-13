import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Liste paginée à scroll infini : charge la page suivante quand la sentinelle
 * (`sentinelRef`, à placer en fin de liste) devient visible — dans la fenêtre comme
 * dans un conteneur scrollable. Accepte les réponses tableau ou { items | data | results }.
 */
export function useInfiniteList<T>(
  fetchPage: (page: number, limit: number) => Promise<{ data: any }>,
  deps: unknown[],
  limit = 20,
) {
  const [items,   setItems]   = useState<T[]>([]);
  const [page,    setPage]    = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);   // chargement de la 1re page
  const [loadingMore, setLoadingMore] = useState(false);
  const busy = useRef(false);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const gen = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadNext = useCallback((nextPage: number) => {
    if (busy.current) return;
    busy.current = true;
    const myGen = gen.current;
    if (nextPage > 1) setLoadingMore(true);
    fetchRef.current(nextPage, limit)
      .then(res => {
        if (myGen !== gen.current) return;
        const raw = res.data;
        const list: T[] = Array.isArray(raw) ? raw : raw?.items ?? raw?.data ?? raw?.results ?? [];
        setItems(prev => {
          const seen = new Set(prev.map((x: any) => x?.id));
          return [...prev, ...list.filter((x: any) => x?.id == null || !seen.has(x.id))];
        });
        setHasMore(list.length >= limit);
        setPage(nextPage);
      })
      .catch(() => { if (myGen === gen.current) setHasMore(false); })
      .finally(() => {
        if (myGen !== gen.current) return;
        busy.current = false;
        setLoading(false);
        setLoadingMore(false);
      });
  }, [limit]);

  // Réinitialise et recharge la 1re page quand les dépendances changent (autre profil...)
  useEffect(() => {
    gen.current++;
    busy.current = false;
    setItems([]); setPage(0); setHasMore(true); setLoading(true); setLoadingMore(false);
    loadNext(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || loading || !hasMore) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadNext(page + 1); },
      { rootMargin: '300px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [loading, hasMore, page, items.length, loadNext]);

  return { items, loading, loadingMore, hasMore, sentinelRef };
}
