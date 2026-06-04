import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decodeId } from '../../utils/slugId';
import {
  ArrowLeft, Users, MessageCircle, Heart, TrendingUp,
  BarChart2, Activity, Award, Crown, Medal,
} from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';

interface CommunityStats {
  members: { total: number; new_week: number; new_month: number; growth: number; };
  engagement: { messages_today: number; messages_week: number; active_members: number; reactions: number; };
  content: { posts: number; pinned: number; polls: number; media: number; };
  top_contributors: { id: string; user_id: string; name: string; username: string; avatar_url: string | null; coins: number; posts: number; }[];
  activity: { day: string; msgs: number }[];
  roles: { admin: number; moderator: number; member: number };
  retention: { d1: number; d7: number; d30: number };
}

type Period = '7j' | '30j' | '90j';

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '18' }}>
          <span style={{ color }}>{icon}</span>
        </div>
        {sub && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: color + '15', color }}>{sub}</span>}
      </div>
      <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
    </div>
  );
}

function BarChartSimple({ data }: { data: { day: string; msgs: number }[] }) {
  const max = Math.max(...data.map(d => d.msgs), 1);
  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full rounded-t-sm transition-all"
            style={{ height: `${Math.max(4, (d.msgs / max) * 80)}px`, background: 'var(--primary)', opacity: 0.7 + 0.3 * (d.msgs / max) }} />
          <span className="text-[8px]" style={{ color: 'var(--text-tertiary)' }}>
            {new Date(d.day).toLocaleDateString('fr-FR', { weekday: 'narrow' })}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function CommunityStatsPage() {
  const { id: slug } = useParams<{ id: string }>();
  const id            = decodeId(slug!);
  const navigate      = useNavigate();
  const [stats,   setStats]   = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState<Period>('7j');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiClient.get<any>(`${Endpoints.communities.stats(id)}?period=${period}`)
      .then(r => setStats(r.data?.data ?? r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, period]);

  const MEDAL_COLORS = ['#F59E0B', '#9CA3AF', '#CD7C32'];
  const MedalIcon = ({ rank }: { rank: number }) => {
    if (rank === 0) return <Crown size={16} color={MEDAL_COLORS[0]} />;
    if (rank === 1) return <Medal size={16} color={MEDAL_COLORS[1]} />;
    if (rank === 2) return <Medal size={16} color={MEDAL_COLORS[2]} />;
    return <span className="text-xs font-bold" style={{ color: 'var(--text-tertiary)' }}>#{rank + 1}</span>;
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl transition-all"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Statistiques</h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Tableau de bord de la communauté</p>
          </div>
        </div>
      </div>

      {/* Période */}
      <div className="flex gap-2 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        {(['7j','30j','90j'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
            style={period === p ? { background: 'var(--primary)', color: '#fff' } : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            {p}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>
      ) : !stats ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Statistiques indisponibles</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          {/* Membres */}
          <section>
            <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>MEMBRES</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={<Users size={16} />} label="Total membres" value={stats.members.total} color="#7B3FF2" />
              <StatCard icon={<TrendingUp size={16} />} label="Nouveaux cette semaine" value={stats.members.new_week} color="#36D9A0"
                sub={stats.members.growth > 0 ? `+${stats.members.growth}%` : undefined} />
              <StatCard icon={<Users size={16} />} label="Nouveaux ce mois" value={stats.members.new_month} color="#3B82F6" />
              <StatCard icon={<Activity size={16} />} label="Membres actifs" value={stats.engagement.active_members} color="#F59E0B" />
            </div>
          </section>

          {/* Engagement */}
          <section>
            <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>ENGAGEMENT</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={<MessageCircle size={16} />} label="Messages aujourd'hui" value={stats.engagement.messages_today} color="#7B3FF2" />
              <StatCard icon={<MessageCircle size={16} />} label="Messages cette semaine" value={stats.engagement.messages_week} color="#E0389A" />
              <StatCard icon={<Heart size={16} />} label="Réactions" value={stats.engagement.reactions} color="#EF4444" />
              <StatCard icon={<BarChart2 size={16} />} label="Sondages" value={stats.content.polls} color="#8B5CF6" />
            </div>
          </section>

          {/* Activité graphique */}
          {stats.activity && stats.activity.length > 0 && (
            <section>
              <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>ACTIVITÉ ({period.toUpperCase()})</p>
              <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <BarChartSimple data={stats.activity} />
              </div>
            </section>
          )}

          {/* Rétention */}
          <section>
            <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>RÉTENTION</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'J+1', value: stats.retention.d1, color: '#36D9A0' },
                { label: 'J+7', value: stats.retention.d7, color: '#3B82F6' },
                { label: 'J+30', value: stats.retention.d30, color: '#7B3FF2' },
              ].map(r => (
                <div key={r.label} className="rounded-2xl p-4 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-2xl font-black" style={{ color: r.color }}>{r.value}%</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Rétention {r.label}</p>
                  <div className="w-full h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="h-full rounded-full" style={{ width: `${r.value}%`, background: r.color }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Répartition rôles */}
          <section>
            <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>RÉPARTITION DES RÔLES</p>
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {[
                { label: 'Admins', value: stats.roles.admin, color: '#36D9A0' },
                { label: 'Modérateurs', value: stats.roles.moderator, color: '#3B82F6' },
                { label: 'Membres', value: stats.roles.member, color: '#9390AB' },
              ].map(r => {
                const total = stats.members.total || 1;
                return (
                  <div key={r.label} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                    <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{r.label}</span>
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>{r.value}</span>
                    <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(r.value / total) * 100}%`, background: r.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Top contributeurs */}
          {stats.top_contributors && stats.top_contributors.length > 0 && (
            <section>
              <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>TOP CONTRIBUTEURS</p>
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {stats.top_contributors.slice(0, 10).map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: i < stats.top_contributors.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div className="w-7 flex items-center justify-center shrink-0">
                      <MedalIcon rank={i} />
                    </div>
                    <Avatar src={c.avatar_url} name={c.name ?? c.username ?? '?'} size="xs" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{c.name ?? c.username}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{c.posts} messages</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Award size={13} style={{ color: '#F59E0B' }} />
                      <span className="text-xs font-bold" style={{ color: '#F59E0B' }}>{c.coins}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Contenu */}
          <section>
            <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>CONTENU</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={<MessageCircle size={16} />} label="Messages totaux" value={stats.content.posts} color="#7B3FF2" />
              <StatCard icon={<BarChart2 size={16} />} label="Médias partagés" value={stats.content.media} color="#E0389A" />
              <StatCard icon={<Award size={16} />} label="Épinglés" value={stats.content.pinned} color="#F59E0B" />
              <StatCard icon={<Activity size={16} />} label="Sondages" value={stats.content.polls} color="#36D9A0" />
            </div>
          </section>

        </div>
      )}
    </div>
  );
}
