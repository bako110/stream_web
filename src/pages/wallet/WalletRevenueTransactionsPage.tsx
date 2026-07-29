import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Receipt, Loader2 } from 'lucide-react';
import { Spinner } from '../../components/ui/Spinner';
import { revenueService, SOURCE_FILTERS } from '../../api/revenueService';
import type { RevenueTransaction } from '../../api/revenueService';

const PAGE_LIMIT = 30;

function fmtEur(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: n >= 100 ? 0 : 2 });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function WalletRevenueTransactionsPage() {
  const navigate = useNavigate();

  const [source, setSource] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<RevenueTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLoading(true);
    pageRef.current = 1;
    revenueService.getTransactions(source, 1, PAGE_LIMIT)
      .then(res => { setItems(res.items); setHasMore(res.items.length >= PAGE_LIMIT); })
      .catch(() => setHasMore(false))
      .finally(() => setLoading(false));
  }, [source]);

  const loadMore = useCallback(() => {
    setLoadingMore(prev => { if (prev) return prev; return true; });
  }, []);

  useEffect(() => {
    if (!loadingMore) return;
    if (!hasMore || loading) { setLoadingMore(false); return; }
    const nextPage = pageRef.current + 1;
    revenueService.getTransactions(source, nextPage, PAGE_LIMIT)
      .then(res => {
        pageRef.current = nextPage;
        setItems(prev => [...prev, ...res.items]);
        setHasMore(res.items.length >= PAGE_LIMIT);
      })
      .catch(() => setHasMore(false))
      .finally(() => setLoadingMore(false));
  }, [loadingMore, hasMore, loading, source]);

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
        <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Historique des revenus</h1>
      </div>

      {/* Filtre par source */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <button onClick={() => setSource(undefined)}
          className="px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition-all"
          style={{
            background: !source ? 'var(--primary)' : 'var(--surface)',
            border: `1px solid ${!source ? 'var(--primary)' : 'var(--border)'}`,
            color: !source ? '#fff' : 'var(--text-secondary)',
          }}>
          Toutes
        </button>
        {SOURCE_FILTERS.map(f => {
          const active = source === f.key;
          return (
            <button key={f.key} onClick={() => setSource(f.key)}
              className="px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition-all"
              style={{
                background: active ? 'var(--primary)' : 'var(--surface)',
                border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                color: active ? '#fff' : 'var(--text-secondary)',
              }}>
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-20"><Spinner /></div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Receipt size={32} style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Aucune transaction pour l'instant</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl px-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {items.map((tx, i) => (
              <div key={tx.id} className="flex items-center gap-3 py-3"
                style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{tx.label}</p>
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                    {tx.description || tx.public_id} · {fmtDate(tx.created_at)}
                  </p>
                </div>
                <p className="text-sm font-black flex-shrink-0" style={{ color: '#22C55E' }}>+{fmtEur(tx.eur_amount)}</p>
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
