import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BarChart2, Loader2 } from 'lucide-react';
import { Spinner } from '../../components/ui/Spinner';
import { analyticsService } from '../../api/analyticsService';
import type { AnalyticsPeriod, AnalyticsContentType, ContentStatItem } from '../../api/analyticsService';
import { ContentStatsList } from '../../components/analytics/ContentStatsList';

const PAGE_LIMIT = 30;

export default function ContentAnalyticsListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const period = (searchParams.get('period') as AnalyticsPeriod | null) ?? 'month';
  const contentType = (searchParams.get('type') as AnalyticsContentType | null) ?? undefined;

  const [items, setItems] = useState<ContentStatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadPage = useCallback((page: number) =>
    analyticsService.listContent({ contentType, period, sort: 'views', page, limit: PAGE_LIMIT }),
  [contentType, period]);

  useEffect(() => {
    setLoading(true);
    pageRef.current = 1;
    loadPage(1)
      .then(res => {
        setItems(res.items);
        setHasMore(res.items.length >= PAGE_LIMIT);
      })
      .catch(() => setHasMore(false))
      .finally(() => setLoading(false));
  }, [loadPage]);

  const loadMore = useCallback(() => {
    setLoadingMore(prevLoading => {
      if (prevLoading) return prevLoading;
      return true;
    });
  }, []);

  useEffect(() => {
    if (!loadingMore) return;
    if (!hasMore || loading) { setLoadingMore(false); return; }
    const nextPage = pageRef.current + 1;
    loadPage(nextPage)
      .then(res => {
        pageRef.current = nextPage;
        setItems(prev => [...prev, ...res.items]);
        setHasMore(res.items.length >= PAGE_LIMIT);
      })
      .catch(() => setHasMore(false))
      .finally(() => setLoadingMore(false));
  }, [loadingMore, hasMore, loading, loadPage]);

  // Scroll infini via IntersectionObserver sur une sentinelle en bas de liste
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, items.length]);

  const goToDetail = (item: ContentStatItem) => {
    navigate(`/wallet/analytics/content/${item.content_type}/${item.content_id}`);
  };

  return (
    <div className="w-full mx-auto px-4 py-6 space-y-5">

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-xl transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <ArrowLeft size={17} />
        </button>
        <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Tous mes contenus</h1>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-20"><Spinner /></div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <BarChart2 size={32} style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Aucun contenu publié pour l'instant
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl px-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <ContentStatsList items={items} onItemClick={goToDetail} />
          </div>

          <div ref={sentinelRef} className="flex justify-center py-2">
            {loadingMore && <Loader2 size={20} className="animate-spin" style={{ color: 'var(--primary)' }} />}
          </div>
        </>
      )}

      <div className="h-4" />
    </div>
  );
}
