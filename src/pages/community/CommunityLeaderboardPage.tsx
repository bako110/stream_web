import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { encodeId, decodeId } from '../../utils/slugId';
import { ArrowLeft, Trophy, Crown, Medal, Star } from 'lucide-react';
import { apiClient } from '../../api';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';

interface LeaderEntry {
  rank: number;
  user_id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  score: number;
  coins_spent?: number;
  messages_count?: number;
  reactions_count?: number;
}

const RANK_COLORS = ['#7B3FF2', '#9CA3AF', '#CD7C2F'];
const RANK_ICONS  = [Crown, Medal, Star];

export default function CommunityLeaderboardPage() {
  const { id: slug } = useParams<{ id: string }>();
  const id            = decodeId(slug!);
  const navigate      = useNavigate();
  const [entries,   setEntries]  = useState<LeaderEntry[]>([]);
  const [loading,   setLoading]  = useState(true);
  const [name,      setName]     = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      apiClient.get<any>(`/api/v1/communities/${id}`),
      apiClient.get<any>(`/api/v1/communities/${id}/leaderboard`),
    ]).then(([commRes, lbRes]) => {
      const comm = commRes.data?.data ?? commRes.data;
      setName(comm?.name ?? '');
      const list = Array.isArray(lbRes.data) ? lbRes.data : lbRes.data?.items ?? lbRes.data?.data ?? [];
      setEntries(list.map((e: any, i: number) => ({ ...e, rank: e.rank ?? i + 1 })));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const top3    = entries.slice(0, 3);
  const rest    = entries.slice(3);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl transition-all"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Classement</p>
          {name && <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{name}</p>}
        </div>
        <Trophy size={20} style={{ color: '#7B3FF2' }} />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 opacity-50">
          <Trophy size={40} style={{ color: 'var(--text-tertiary)' }} />
          <p className="font-semibold text-sm" style={{ color: 'var(--text-tertiary)' }}>Pas encore de classement</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Podium top 3 */}
          {top3.length > 0 && (
            <div className="px-6 pt-6 pb-8">
              <div className="flex items-end justify-center gap-4">
                {/* 2e place */}
                {top3[1] && (
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className="relative">
                      <Avatar src={top3[1].avatar_url} name={top3[1].display_name ?? top3[1].username ?? '?'} size="md" />
                      <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black"
                        style={{ background: RANK_COLORS[1] }}>2</div>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-xs truncate max-w-[80px]" style={{ color: 'var(--text-primary)' }}>
                        {top3[1].display_name ?? top3[1].username}
                      </p>
                      <p className="text-xs font-semibold" style={{ color: RANK_COLORS[1] }}>{top3[1].score} pts</p>
                    </div>
                    <div className="w-full h-16 rounded-t-xl flex items-center justify-center"
                      style={{ background: RANK_COLORS[1] + '20', border: `1px solid ${RANK_COLORS[1]}30` }}>
                      <Medal size={20} style={{ color: RANK_COLORS[1] }} />
                    </div>
                  </div>
                )}
                {/* 1re place */}
                {top3[0] && (
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full overflow-hidden"
                        style={{ border: `3px solid ${RANK_COLORS[0]}` }}>
                        <Avatar src={top3[0].avatar_url} name={top3[0].display_name ?? top3[0].username ?? '?'} size="lg" />
                      </div>
                      <Crown size={20} className="absolute -top-3 left-1/2 -translate-x-1/2"
                        style={{ color: RANK_COLORS[0] }} />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-sm truncate max-w-[90px]" style={{ color: 'var(--text-primary)' }}>
                        {top3[0].display_name ?? top3[0].username}
                      </p>
                      <p className="text-xs font-bold" style={{ color: RANK_COLORS[0] }}>{top3[0].score} pts</p>
                    </div>
                    <div className="w-full h-24 rounded-t-xl flex items-center justify-center"
                      style={{ background: `linear-gradient(180deg,${RANK_COLORS[0]}30,${RANK_COLORS[0]}10)`, border: `1px solid ${RANK_COLORS[0]}40` }}>
                      <Trophy size={24} style={{ color: RANK_COLORS[0] }} />
                    </div>
                  </div>
                )}
                {/* 3e place */}
                {top3[2] && (
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className="relative">
                      <Avatar src={top3[2].avatar_url} name={top3[2].display_name ?? top3[2].username ?? '?'} size="md" />
                      <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black"
                        style={{ background: RANK_COLORS[2] }}>3</div>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-xs truncate max-w-[80px]" style={{ color: 'var(--text-primary)' }}>
                        {top3[2].display_name ?? top3[2].username}
                      </p>
                      <p className="text-xs font-semibold" style={{ color: RANK_COLORS[2] }}>{top3[2].score} pts</p>
                    </div>
                    <div className="w-full h-10 rounded-t-xl flex items-center justify-center"
                      style={{ background: RANK_COLORS[2] + '20', border: `1px solid ${RANK_COLORS[2]}30` }}>
                      <Star size={16} style={{ color: RANK_COLORS[2] }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Le reste */}
          {rest.length > 0 && (
            <div className="px-4 space-y-1 pb-6">
              <p className="text-[10px] font-bold tracking-widest px-1 mb-2" style={{ color: 'var(--text-tertiary)' }}>
                CLASSEMENT GENERAL
              </p>
              {rest.map(entry => (
                <button key={entry.user_id}
                  onClick={() => navigate(`/user/${encodeId(entry.user_id)}`)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all"
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <span className="w-7 text-center font-black text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    {entry.rank}
                  </span>
                  <Avatar src={entry.avatar_url} name={entry.display_name ?? entry.username ?? '?'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {entry.display_name ?? entry.username}
                    </p>
                    {entry.messages_count !== undefined && (
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {entry.messages_count} messages
                      </p>
                    )}
                  </div>
                  <span className="font-bold text-sm shrink-0" style={{ color: 'var(--primary)' }}>
                    {entry.score} pts
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
