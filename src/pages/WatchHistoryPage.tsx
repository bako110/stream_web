import { Film, Tv, CheckCircle2, History } from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { useApi } from '../hooks/useApi';
import { Spinner , PageLoader} from '../components/ui/Spinner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface HistoryEntry {
  id:                string;
  content_id?:       string;
  episode_id?:       string;
  title?:            string;
  thumbnail_url?:    string | null;
  content_type?:     string;
  last_position_sec: number;
  duration_sec?:     number;
  completed:         boolean;
  watched_at?:       string;
  created_at?:       string;
  updated_at?:       string;
  [key: string]:     unknown;
}

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}

function progressPct(entry: HistoryEntry): number {
  if (!entry.duration_sec || entry.duration_sec <= 0) return 0;
  return Math.min(100, Math.round((entry.last_position_sec / entry.duration_sec) * 100));
}

function typeLabel(entry: HistoryEntry): string {
  if (entry.episode_id || entry.content_type === 'episode' || entry.content_type === 'serie') return 'Episode';
  return 'Film';
}

// ── Entry card ─────────────────────────────────────────────────────────────────
function EntryCard({ entry }: { entry: HistoryEntry }) {
  const pct      = progressPct(entry);
  const label    = typeLabel(entry);
  const isEp     = label === 'Episode';
  const typeColor = isEp ? '#7B3FF2' : '#7B3FF2';
  const date     = entry.watched_at ?? entry.updated_at ?? entry.created_at;

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-xl transition-all"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* Thumbnail */}
      <div
        className="relative rounded-lg overflow-hidden shrink-0"
        style={{ width: 110, height: 65, background: 'var(--bg-tertiary)' }}
      >
        {entry.thumbnail_url
          ? <img src={entry.thumbnail_url} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center">
              {isEp
                ? <Tv size={20} style={{ color: 'var(--text-tertiary)' }} />
                : <Film size={20} style={{ color: 'var(--text-tertiary)' }} />
              }
            </div>
        }

        {/* Progress bar */}
        {pct > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{ background: 'rgba(0,0,0,0.4)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: entry.completed
                  ? 'linear-gradient(90deg,#22C55E,#16A34A)'
                  : 'linear-gradient(90deg,#7B3FF2,#5B2EC4)',
              }}
            />
          </div>
        )}

        {/* Check badge if completed */}
        {entry.completed && (
          <div
            className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: '#16A34A' }}
          >
            <CheckCircle2 size={12} color="#fff" fill="#fff" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Type badge + timeAgo */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: typeColor + '18', color: typeColor }}
          >
            {label}
          </span>
          {date && (
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              {formatDistanceToNow(new Date(date), { locale: fr, addSuffix: true })}
            </span>
          )}
        </div>

        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {entry.title ?? 'Sans titre'}
        </p>

        {/* Time watched */}
        {entry.last_position_sec > 0 && (
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {entry.completed
              ? `Termine (${fmtTime(entry.duration_sec ?? entry.last_position_sec)})`
              : `Vu jusqu'a ${fmtTime(entry.last_position_sec)}${entry.duration_sec ? ` / ${fmtTime(entry.duration_sec)}` : ''}`
            }
          </p>
        )}
      </div>
    </div>
  );
}

// ── Section ────────────────────────────────────────────────────────────────────
function Section({ title, entries }: { title: string; entries: HistoryEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold px-1" style={{ color: 'var(--text-secondary)' }}>
        {title}
      </h2>
      {entries.map(e => <EntryCard key={e.id} entry={e} />)}
    </section>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function WatchHistoryPage() {
  const { data, loading } = useApi<unknown>(
    () => apiClient.get<unknown>(Endpoints.users.watchHistory),
  );

  const raw: HistoryEntry[] = Array.isArray(data) ? data
    : Array.isArray((data as any)?.items) ? (data as any).items
    : Array.isArray((data as any)?.data)  ? (data as any).data
    : [];

  const inProgress = raw.filter(e => !e.completed && e.last_position_sec > 0);
  const finished   = raw.filter(e => e.completed);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-2">
        <History size={22} style={{ color: 'var(--primary)' }} />
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
          Historique
        </h1>
      </div>

      {loading ? (
        <PageLoader />
      ) : raw.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20" style={{ color: 'var(--text-tertiary)' }}>
          <History size={40} strokeWidth={1.2} />
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Aucun historique</p>
          <p className="text-sm">Vos visionnages apparaitront ici</p>
        </div>
      ) : (
        <>
          <Section title="En cours" entries={inProgress} />
          <Section title="Termines"  entries={finished}   />
        </>
      )}
    </div>
  );
}
