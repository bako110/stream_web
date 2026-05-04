import { useNavigate } from 'react-router-dom';
import { Radio, Users } from 'lucide-react';
import type { Concert } from "../types";
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useApi } from '../hooks/useApi';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Avatar';

export default function LiveListPage() {
  const navigate = useNavigate();
  const { data: lives, loading } = useApi<Concert[]>(() => apiClient.get<Concert[]>(Endpoints.concerts.live));

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
        <Radio className="text-brand-live" /> Live en cours
      </h1>

      {!lives || lives.length === 0 ? (
        <EmptyState icon={<Radio size={48} />} title="Aucun live en ce moment" description="Revenez plus tard pour assister aux prochains concerts en direct." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lives.map(concert => (
            <div key={concert.id} className="card overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => navigate(`/live/${concert.id}`)}>
              <div className="relative aspect-video bg-[var(--bg-tertiary)]">
                {concert.thumbnail_url && (
                  <img src={concert.thumbnail_url} alt={concert.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                )}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="badge-live flex items-center gap-1"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE</span>
                  <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Users size={10} /> {concert.current_viewers.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="p-4 flex gap-3">
                <Avatar src={concert.artist?.avatar_url} name={concert.artist?.display_name ?? concert.artist?.username} size="sm" />
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--text-primary)] line-clamp-1">{concert.title}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{concert.artist?.display_name ?? concert.artist?.username}</p>
                  {concert.genre && <span className="text-xs text-[var(--text-tertiary)]">{concert.genre}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
