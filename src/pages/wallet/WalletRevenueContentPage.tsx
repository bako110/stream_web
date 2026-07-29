import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Video, Loader2 } from 'lucide-react';
import { Spinner } from '../../components/ui/Spinner';
import { revenueService } from '../../api/revenueService';
import type { RevenueContentItem } from '../../api/revenueService';

const PAGE_LIMIT = 20;

function fmtEur(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: n >= 100 ? 0 : 2 });
}

export default function WalletRevenueContentPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<RevenueContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLoading(true);
    pageRef.current = 1;
    revenueService.getByContent(1, PAGE_LIMIT)
      .then(res => { setItems(res.items); setHasMore(res.items.length >= PAGE_LIMIT); })
      .catch(() => setHasMore(false))
      .finally(() => setLoading(false));
  }, []);

  const loadMore = useCallback(() => {
    setLoadingMore(prev => {
      if (prev) return prev;
      return true;
    });
  }, []);

  useEffect(() => {
    if (!loadingMore) return;
    if (!hasMore || loading) { setLoadingMore(false); return; }
    const nextPage = pageRef.current + 1;
    revenueService.getByContent(nextPage, PAGE_LIMIT)
      .then(res => {
        pageRef.current = nextPage;
        setItems(prev => [...prev, ...res.items]);
        setHasMore(res.items.length >= PAGE_LIMIT);
      })
      .catch(() => setHasMore(false))
      .finally(() => setLoadingMore(false));
  }, [loadingMore, hasMore, loading]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(entries => { if (entries[0].isIntersecting) loadMore(); }, { rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, items.length]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2.5 rounded-xl transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <ArrowLeft size={17} />
        </button>
        <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Revenus par reel</h1>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-20"><Spinner /></div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Video size={32} style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Aucun revenu rattaché à un reel pour l'instant
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl px-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {items.map((item, i) => (
              <div key={item.content_id} className="flex items-center gap-3 py-3"
                style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                {item.thumbnail_url ? (
                  <img src={item.thumbnail_url} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--bg)' }}>
                    <Video size={18} style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{item.title ?? 'Reel'}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {item.transaction_count} opération{item.transaction_count > 1 ? 's' : ''} · {item.gogold.toLocaleString('fr-FR')} GoGold
                  </p>
                </div>
                <p className="text-sm font-black flex-shrink-0" style={{ color: 'var(--text-primary)' }}>{fmtEur(item.eur)}</p>
              </div>
            ))}
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
