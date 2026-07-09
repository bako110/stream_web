import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { encodeId } from '../../utils/slugId';
import { Play, Heart, MessageCircle, Eye, Film } from 'lucide-react';
import { publicClient } from '../../api/client';
import { Endpoints } from '../../api/endpoints';
import { MediaPlaceholder } from '../../components/ui/MediaPlaceholder';
import { Spinner } from '../../components/ui/Spinner';
import type { Reel } from '../../types';

const PAGE_SIZE = 24;

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.ex-rise:not(.visible)');
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' },
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  });
}

export default function ExploreReelsPage() {
  const navigate = useNavigate();
  const [reels,      setReels]      = useState<Reel[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(true);
  const pageRef        = useRef(1);
  const loadingMoreRef = useRef(false);
  const sentinelRef     = useRef<HTMLDivElement | null>(null);

  useScrollReveal();

  useEffect(() => {
    publicClient.get<any>(`${Endpoints.reels.feed}?page=1&limit=${PAGE_SIZE}`)
      .then(res => {
        const raw = res.data;
        setReels(Array.isArray(raw) ? raw : (raw?.items ?? []));
        setHasMore(Array.isArray(raw) ? raw.length >= PAGE_SIZE : !!raw?.has_more);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const res = await publicClient.get<any>(`${Endpoints.reels.feed}?page=${nextPage}&limit=${PAGE_SIZE}`);
      const raw = res.data;
      const items: Reel[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
      if (items.length === 0) { setHasMore(false); return; }
      setReels(prev => {
        const seen = new Set(prev.map(r => r.id));
        return [...prev, ...items.filter(r => !seen.has(r.id))];
      });
      pageRef.current = nextPage;
      setHasMore(Array.isArray(raw) ? items.length >= PAGE_SIZE : !!raw?.has_more);
    } catch { /* silencieux */ }
    finally { loadingMoreRef.current = false; setLoadingMore(false); }
  }, [hasMore]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '800px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [loadMore]);

  return (
    <div className="max-w-6xl mx-auto px-5 py-16">
      <div className="mb-10 ex-rise">
        <div className="ex-rule mb-4"><span className="ex-eyebrow shrink-0" style={{ color: 'var(--ex-violet)' }}>Format court</span></div>
        <h1 className="ex-display text-5xl md:text-6xl mb-2" style={{ color: 'var(--ex-text)' }}>Reels</h1>
        <p className="text-base" style={{ color: 'var(--ex-text-2)' }}>Découvre les créateurs de la plateforme en quelques secondes</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ aspectRatio: '9/16', background: 'var(--ex-surface)' }} />
          ))}
        </div>
      ) : reels.length === 0 ? (
        <div className="text-center py-24" style={{ color: 'var(--ex-text-3)' }}>Aucun reel disponible</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {reels.map((reel, i) => (
              <div key={reel.id} className="ex-rise" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
                <ReelTile reel={reel} onClick={() => navigate(`/explore/reels/${encodeId(reel.id)}`)} />
              </div>
            ))}
          </div>

          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-10">
              {loadingMore && <Spinner size="md" />}
            </div>
          )}
          {!hasMore && (
            <p className="text-center text-xs py-10" style={{ color: 'var(--ex-text-3)' }}>Tu as tout vu</p>
          )}
        </>
      )}

      <div className="mt-8 rounded-3xl px-8 py-14 text-center relative overflow-hidden ex-rise" style={{ background: 'var(--ex-ink)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(circle at 15% 20%, rgba(166,124,247,0.18), transparent 55%), radial-gradient(circle at 85% 80%, rgba(123,63,242,0.26), transparent 55%)',
        }} />
        <div className="relative z-10">
          <Film size={28} className="mx-auto mb-4" style={{ color: 'var(--ex-amber)' }} />
          <h2 className="ex-display text-3xl md:text-4xl text-white mb-3">Crée et partage tes propres reels</h2>
          <p className="mb-8 max-w-md mx-auto" style={{ color: 'rgba(245,243,250,0.7)' }}>
            Rejoins la communauté et exprime-toi en vidéo.
          </p>
          <button onClick={() => navigate('/auth/register')}
            className="inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-full text-base transition-transform hover:scale-105"
            style={{ background: 'var(--ex-amber)', color: 'var(--ex-ink)' }}>
            Commencer à créer
          </button>
        </div>
      </div>
    </div>
  );
}

function ReelTile({ reel, onClick }: { reel: Reel; onClick: () => void }) {
  const [thumbErr, setThumbErr] = useState(false);
  const hasPoster = reel.thumbnail_url && !thumbErr;

  return (
    <div className="ex-tile group relative rounded-2xl overflow-hidden cursor-pointer"
      style={{ aspectRatio: '9/16', background: 'var(--ex-surface)', boxShadow: '0 10px 26px rgba(0,0,0,0.14)' }}
      onClick={onClick}>
      {hasPoster ? (
        <img src={reel.thumbnail_url!} alt={reel.caption ?? 'Reel'}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setThumbErr(true)} />
      ) : (
        <div className="absolute inset-0"><MediaPlaceholder title={reel.caption} icon={<Play size={30} color="#fff" />} /></div>
      )}

      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'linear-gradient(to top, rgba(10,8,18,0.8), transparent 55%)' }} />

      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'var(--ex-amber)' }}>
          <Play size={16} color="#fff" fill="#fff" style={{ marginLeft: 1 }} />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-center gap-3 text-white text-xs font-medium">
          <span className="flex items-center gap-1"><Heart size={12} />{reel.like_count}</span>
          <span className="flex items-center gap-1"><MessageCircle size={12} />{reel.comment_count}</span>
          <span className="flex items-center gap-1"><Eye size={12} />{reel.view_count}</span>
        </div>
      </div>
    </div>
  );
}
