import { Activity } from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useApi } from '../hooks/useApi';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Avatar';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ActivityItem {
  id: string; type: string; actor: { id: string; username?: string | null; display_name?: string | null; avatar_url?: string | null; };
  target_type?: string; target_id?: string; created_at: string; description?: string;
}

export default function ActivityPage() {
  const { data, loading } = useApi<ActivityItem[]>(() => apiClient.get<ActivityItem[]>(`${Endpoints.activity.feed}?limit=50`));

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const items = data ?? [];

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
        <Activity size={22} /> Activité
      </h1>

      {items.length === 0 ? (
        <EmptyState icon={<Activity size={40} />} title="Aucune activité" description="L'activité de votre réseau apparaîtra ici." />
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="card p-4 flex gap-3 items-center">
              <Avatar src={item.actor.avatar_url} name={item.actor.display_name ?? item.actor.username} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)]">
                  <span className="font-semibold">{item.actor.display_name ?? item.actor.username}</span>
                  {' '}{item.description ?? item.type}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {formatDistanceToNow(new Date(item.created_at), { locale: fr, addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
