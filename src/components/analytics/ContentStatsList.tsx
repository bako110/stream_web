import { Video, FileText, Calendar, Music, Radio, Eye, ChevronRight } from 'lucide-react';
import type { ContentStatItem, AnalyticsContentType } from '../../api/analyticsService';

const TYPE_ICON: Record<AnalyticsContentType, typeof Video> = {
  reel: Video, post: FileText, event: Calendar, concert: Music, live: Radio,
};
const TYPE_LABEL: Record<AnalyticsContentType, string> = {
  reel: 'Reel', post: 'Post', event: 'Événement', concert: 'Concert', live: 'Live',
};

interface RowProps {
  item: ContentStatItem;
  onClick: () => void;
  bordered?: boolean;
}

export function ContentStatsRow({ item, onClick, bordered }: RowProps) {
  const TypeIcon = TYPE_ICON[item.content_type];
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 py-2.5 w-full text-left transition-colors"
      style={{ borderBottom: bordered ? '1px solid var(--border)' : 'none' }}
    >
      {item.thumbnail_url ? (
        <img src={item.thumbnail_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg)' }}>
          <TypeIcon size={16} style={{ color: 'var(--text-tertiary)' }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
          {item.title ?? TYPE_LABEL[item.content_type]}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          {TYPE_LABEL[item.content_type]}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
        <Eye size={12} />
        <span className="text-xs font-bold">{item.views.toLocaleString('fr-FR')}</span>
      </div>
      <ChevronRight size={16} style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} className="flex-shrink-0" />
    </button>
  );
}

interface ListProps {
  items: ContentStatItem[];
  onItemClick: (item: ContentStatItem) => void;
}

export function ContentStatsList({ items, onItemClick }: ListProps) {
  return (
    <div>
      {items.map((item, i) => (
        <ContentStatsRow
          key={`${item.content_type}:${item.content_id}`}
          item={item}
          onClick={() => onItemClick(item)}
          bordered={i < items.length - 1}
        />
      ))}
    </div>
  );
}
