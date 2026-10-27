import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '../../api';
import { getApiErrorDetail } from '../../utils/apiError';
import { Repeat2, CheckCircle2, X } from 'lucide-react';
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
  const close = () => { if (!reposting) onClose(); };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !reposting) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, reposting, onClose]);

  if (!open) return null;

  // Bottom sheet — même présentation que useConfirm (Dialog.tsx) : ancré en bas,
  // pleine largeur, contenu centré et lisible, quelle que soit la taille d'écran.
  return (
    <>
      <div className="fixed inset-0 z-[9998]" onClick={close}
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} />
      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center pointer-events-none">
        <div className="pointer-events-auto w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
          style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.35)',
            maxHeight: '80dvh',
            animation: 'repostSheetIn 0.25s cubic-bezier(0.32,0.72,0,1)',
            paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          }}>
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
          </div>

          {/* Titre/sous-titre + aperçu défilables — seuls les boutons d'action
              (hors de ce bloc, cf. plus bas) restent fixes, pour que
              "Republier" reste toujours atteignable même quand une
              description longue pousse le contenu au-delà de 90dvh (bug
              corrigé : overflow-y-auto englobait aussi les boutons, qui
              pouvaient défiler hors de vue avant tout scroll). */}
          <div className="w-full max-w-md mx-auto px-5 pt-2 overflow-y-auto min-h-0">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>
                Republier {KIND_LABEL[kind]}
              </h2>
              <button onClick={close} disabled={reposting} aria-label="Fermer" className="p-1.5"
                style={{ color: 'var(--text-tertiary)' }}>
                <X size={18} />
              </button>
            </div>
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
                <img src={thumb} alt="" className="w-full rounded-xl object-cover max-h-48" style={{ aspectRatio: '1.8' }} />
              )}

              {title && (
                <p className="font-bold text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>{title}</p>
              )}

              {body && (
                <p className="text-sm leading-snug line-clamp-4" style={{ color: 'var(--text-secondary)' }}>{body}</p>
              )}
            </div>
          </div>

          {/* Actions — fixes, toujours visibles, hors du bloc scrollable */}
          <div className="w-full max-w-md mx-auto px-5 pt-2 shrink-0">
            <button onClick={onConfirm} disabled={reposting}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-sm text-white transition-all disabled:opacity-70 mb-2"
              style={{ background: 'var(--primary)' }}>
              {reposting ? <Spinner size="sm" /> : <><Repeat2 size={16} /> Republier</>}
            </button>

            <button onClick={close} disabled={reposting}
              className="w-full text-center py-2 text-sm font-semibold"
              style={{ color: 'var(--text-secondary)' }}>
              Annuler
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes repostSheetIn {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

interface RepostTarget {
  endpoint: string;
  author: RepostAuthor | null | undefined;
  title?: string | null;
  body?: string | null;
  thumb?: string | null;
  onReposted?: () => void;
}

/** Hook pour les pages de détail : `open(kind, target)` + `modal` à rendre dans la page. */
export function useRepost() {
  const [state, setState] = useState<{ kind: RepostKind; target: RepostTarget } | null>(null);
  const [reposting, setReposting] = useState(false);

  const confirm = async () => {
    if (!state || reposting) return;
    setReposting(true);
    try {
      await apiClient.post(state.target.endpoint);
      state.target.onReposted?.();
      setState(null);
      toast.success('Republié sur votre profil.');
    } catch (e: any) {
      toast.error(getApiErrorDetail(e) ?? e?.message ?? 'Impossible de republier.');
    } finally { setReposting(false); }
  };

  const modal = (
    <RepostModal
      open={!!state}
      kind={state?.kind ?? 'post'}
      author={state?.target.author}
      title={state?.target.title}
      body={state?.target.body}
      thumb={state?.target.thumb}
      reposting={reposting}
      onConfirm={confirm}
      onClose={() => { if (!reposting) setState(null); }}
    />
  );
  return { open: (kind: RepostKind, target: RepostTarget) => setState({ kind, target }), modal };
}
