import { useNavigate } from 'react-router-dom';
import { Users, Plus, Globe, Lock } from 'lucide-react';
import type { Community, PaginatedResponse } from "../types";
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { usePaginatedApi } from '../hooks/useApi';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';

function CommunityCard({ community }: { community: Community }) {
  const navigate = useNavigate();
  return (
    <div className="card p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/communities/${community.id}`)}>
      <div className="flex gap-3">
        {community.avatar_url ? (
          <img src={community.avatar_url} className="w-12 h-12 rounded-xl object-cover" alt={community.name} />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-brand-gradient flex items-center justify-center">
            <Users size={20} className="text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-[var(--text-primary)] truncate">{community.name}</p>
            {community.is_private ? <Lock size={12} className="text-[var(--text-tertiary)]" /> : <Globe size={12} className="text-[var(--text-tertiary)]" />}
          </div>
          {community.description && <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-0.5">{community.description}</p>}
          <p className="text-xs text-[var(--text-tertiary)] mt-1 flex items-center gap-1">
            <Users size={10} /> {community.member_count.toLocaleString()} membres
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CommunitiesPage() {
  const { items, loading, loadMore, page, pages } = usePaginatedApi<Community>(
    (p) => apiClient.get<PaginatedResponse<Community>>(`${Endpoints.communities.discover}?page=${p}&limit=20`),
  );

  if (loading && items.length === 0) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Communautés</h1>
        <button className="btn-primary flex items-center gap-2"><Plus size={16} /> Créer</button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<Users size={48} />} title="Aucune communauté" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(c => <CommunityCard key={c.id} community={c} />)}
          </div>
          {page < pages && (
            <div className="flex justify-center">
              <button onClick={loadMore} disabled={loading} className="btn-secondary px-8">
                {loading ? <Spinner size="sm" className="mx-auto" /> : 'Voir plus'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
