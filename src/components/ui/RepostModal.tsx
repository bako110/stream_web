import { Repeat2, CheckCircle2 } from 'lucide-react';
import { Modal } from './Modal';
import { Avatar } from './Avatar';
import { Spinner } from './Spinner';

type RepostKind = 'post' | 'event' | 'concert' | 'reel';

interface RepostAuthor {
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean | null;
}

interface Props {
  open:      boolean;
  kind:      RepostKind;
  author:    RepostAuthor | null | undefined;
  title?:    string | null;  // event/concert
  body?:     string | null;  // post
  thumb?:    string | null;
  reposting: boolean;
  onConfirm: () => void;
  onClose:   () => void;
}

const KIND_LABEL: Record<RepostKind, string> = {
  post: 'ce post', event: 'cet événement', concert: 'ce concert', reel: 'ce reel',
};

/**
 * RepostModal — confirmation avant republication (post/event/concert/reel).
 * Montre l'auteur original et un aperçu du contenu avant tout envoi —
 * jusqu'ici le web republiait soit instantanément au clic (reels), soit
 * n'avait pas de repost du tout (posts/events/concerts).
 */
export function RepostModal({ open, kind, author, title, body, thumb, reposting, onConfirm, onClose }: Props) {
  const authorName = author?.display_name ?? author?.username ?? 'Utilisateur';

  return (
    <Modal open={open} onClose={reposting ? () => {} : onClose} title={`Republier ${KIND_LABEL[kind]}`} size="sm">
      <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
        Visible sur ton profil avec la mention de l'auteur original.
      </p>

      {/* Aperçu du contenu à republier */}
      <div className="rounded-2xl p-3 mb-5 flex flex-col gap-3"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <Avatar src={author?.avatar_url ?? undefined} name={authorName} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{authorName}</span>
              {author?.is_verified && <CheckCircle2 size={13} style={{ color: 'var(--primary)' }} />}
            </div>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Auteur original</span>
          </div>
        </div>

        {thumb && (
          <img src={thumb} alt="" className="w-full rounded-xl object-cover" style={{ aspectRatio: '1.5' }} />
        )}

        {title && (
          <p className="font-bold text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>{title}</p>
        )}

        {body && (
          <p className="text-sm leading-snug line-clamp-4" style={{ color: 'var(--text-secondary)' }}>{body}</p>
        )}
      </div>

      <button onClick={onConfirm} disabled={reposting}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-sm text-white transition-all disabled:opacity-70 mb-2"
        style={{ background: 'var(--primary)' }}>
        {reposting ? <Spinner size="sm" /> : <><Repeat2 size={16} /> Republier</>}
      </button>

      <button onClick={onClose} disabled={reposting}
        className="w-full text-center py-2 text-sm font-semibold"
        style={{ color: 'var(--text-secondary)' }}>
        Annuler
      </button>
    </Modal>
  );
}
