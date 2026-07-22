import { useCallback, useEffect, useMemo, useState } from 'react';
import { Zap, Search, X, VideoOff, User } from 'lucide-react';
import { battlesApi, type EligibleCreator } from '../../api/battles';
import { useWs } from '../../context/WebSocketContext';
import { Spinner } from '../ui/Spinner';

const DURATIONS: { value: number; label: string }[] = [
  { value: 90,  label: '1min30' },
  { value: 180, label: '3min' },
  { value: 300, label: '5min' },
  { value: 600, label: '10min' },
];

interface Props { open: boolean; onClose: () => void; liveId: string; }

export function BattleChallengeSheet({ open, onClose, liveId }: Props) {
  const { addListener, removeListener } = useWs();
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [creators, setCreators]   = useState<EligibleCreator[]>([]);
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(false);
  const [inviting, setInviting]   = useState<string | null>(null);
  const [sentTo, setSentTo]       = useState<string | null>(null);
  const [pendingBattleId, setPendingBattleId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [search, setSearch]       = useState('');
  const [duration, setDuration]   = useState(180);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSentTo(null);
    setPendingBattleId(null);
    setSearch('');
    setPage(1);
    battlesApi.listEligible(liveId, 1)
      .then(p => { setCreators(p.items); setHasMore(p.has_more); })
      .catch(() => { setCreators([]); setHasMore(false); })
      .finally(() => setLoading(false));
  }, [open, liveId]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore || search.trim()) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const p = await battlesApi.listEligible(liveId, nextPage);
      setCreators(prev => [...prev, ...p.items]);
      setHasMore(p.has_more);
      setPage(nextPage);
    } catch { /* silencieux */ } finally { setLoadingMore(false); }
  }, [loading, loadingMore, hasMore, search, page, liveId]);

  useEffect(() => {
    if (!open) return;
    const handler = (payload: any) => {
      if (!pendingBattleId || payload.battle_id !== pendingBattleId) return;
      if (payload.type === 'battle_invite_response' && payload.accepted === false) {
        setSentTo(null);
        setPendingBattleId(null);
      }
    };
    addListener(handler);
    return () => removeListener(handler);
  }, [open, pendingBattleId, addListener, removeListener]);

  const filteredCreators = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return creators;
    return creators.filter(c => (c.host_name ?? '').toLowerCase().includes(q));
  }, [creators, search]);

  async function handleInvite(creator: EligibleCreator) {
    if (inviting || pendingBattleId) return;
    setInviting(creator.live_id);
    try {
      const battle = await battlesApi.invite(liveId, creator.live_id, duration);
      setSentTo(creator.live_id);
      setPendingBattleId(battle.id);
    } catch { /* silencieux */ } finally { setInviting(null); }
  }

  const handleCancel = useCallback(async () => {
    if (!pendingBattleId || cancelling) return;
    setCancelling(true);
    try { await battlesApi.cancel(pendingBattleId); } catch { /* silencieux */ } finally {
      setSentTo(null);
      setPendingBattleId(null);
      setCancelling(false);
    }
  }, [pendingBattleId, cancelling]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl p-4 pb-6" style={{ background: '#14101f', border: '1px solid rgba(255,255,255,0.08)' }} onClick={e => e.stopPropagation()}>
        <div className="w-9 h-1 rounded-full mx-auto mb-3.5" style={{ background: 'rgba(255,255,255,0.2)' }} />
        <div className="flex items-center gap-2 mb-1">
          <Zap size={18} color="#7B3FF2" />
          <p className="text-white text-base font-extrabold">Défier un créateur</p>
        </div>
        <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Choisis un créateur actuellement en direct pour lui envoyer une invitation de battle.
        </p>

        <p className="text-[11px] font-bold tracking-wide mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>DURÉE DU MATCH</p>
        <div className="flex gap-2 mb-3.5">
          {DURATIONS.map(d => (
            <button key={d.value} disabled={!!pendingBattleId} onClick={() => setDuration(d.value)}
              className="flex-1 text-center py-2 rounded-[10px] border text-xs font-bold transition-colors disabled:opacity-50"
              style={{
                borderColor: duration === d.value ? '#7B3FF2' : 'rgba(255,255,255,0.15)',
                background: duration === d.value ? 'rgba(123,63,242,0.18)' : 'rgba(255,255,255,0.05)',
                color: duration === d.value ? '#9B65F5' : 'rgba(255,255,255,0.6)',
              }}>
              {d.label}
            </button>
          ))}
        </div>

        {!loading && creators.length > 0 && (
          <div className="flex items-center gap-2 rounded-2xl px-3 py-2.5 mb-3" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <Search size={16} color="rgba(255,255,255,0.4)" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un créateur…"
              className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-white/40" />
            {search.length > 0 && (
              <button onClick={() => setSearch('')}><X size={16} color="rgba(255,255,255,0.5)" /></button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : creators.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-7">
            <VideoOff size={28} color="rgba(255,255,255,0.3)" />
            <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>Aucun autre créateur en direct pour le moment.</p>
          </div>
        ) : filteredCreators.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-7">
            <Search size={28} color="rgba(255,255,255,0.3)" />
            <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>Aucun créateur ne correspond à « {search} ».</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto" onScroll={e => {
            const t = e.currentTarget;
            if (t.scrollTop + t.clientHeight >= t.scrollHeight - 40) loadMore();
          }}>
            {filteredCreators.map(item => {
              const isSent = sentTo === item.live_id;
              return (
                <div key={item.live_id} className="flex items-center gap-3 py-2.5">
                  {item.host_avatar
                    ? <img src={item.host_avatar} className="w-[42px] h-[42px] rounded-full object-cover" />
                    : <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}><User size={18} color="rgba(255,255,255,0.5)" /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold truncate">{item.host_name ?? 'Créateur'}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.current_viewers} viewer{item.current_viewers !== 1 ? 's' : ''}</p>
                  </div>
                  <button
                    onClick={() => isSent ? handleCancel() : handleInvite(item)}
                    disabled={(!!inviting && !isSent) || (!!pendingBattleId && !isSent) || cancelling}
                    className="rounded-xl py-2 px-4 min-w-[76px] flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: isSent ? 'rgba(255,255,255,0.1)' : '#7B3FF2' }}>
                    {inviting === item.live_id || (isSent && cancelling) ? <Spinner size="sm" /> : (isSent ? 'Annuler' : 'Défier')}
                  </button>
                </div>
              );
            })}
            {loadingMore && <div className="flex justify-center py-3"><Spinner size="sm" /></div>}
          </div>
        )}

        <button onClick={onClose} className="w-full mt-3 pt-3.5 border-t text-sm font-semibold" style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)' }}>
          Fermer
        </button>
      </div>
    </div>
  );
}
