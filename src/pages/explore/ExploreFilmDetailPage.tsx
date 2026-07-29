import { useParams, Link } from 'react-router-dom';
import { Play, ArrowLeft, Lock } from 'lucide-react';
import { decodeId } from '../../utils/slugId';
import { useApi } from '../../hooks/useApi';
import { publicClient } from '../../api/client';
import { Endpoints } from '../../api/endpoints';
import { Spinner , PageLoader} from '../../components/ui/Spinner';
import type { Content } from '../../types';

interface Props { type?: 'film' | 'serie' }

export default function ExploreFilmDetailPage({ type = 'film' }: Props) {
  const { id: slug } = useParams<{ id: string }>();
  const id            = decodeId(slug!);

  const endpoint = type === 'film'
    ? Endpoints.content.filmById(id)
    : Endpoints.content.serieById(id);

  const { data: content, loading } = useApi<Content>(
    () => publicClient.get<Content>(endpoint),
    [id]
  );

  if (loading) return <PageLoader />;

  if (!content) {
    return (
      <div className="w-full mx-auto px-4 py-16 text-center">
        <p className="text-[var(--text-tertiary)]">Contenu introuvable</p>
        <Link to={`/explore/${type === 'film' ? 'films' : 'series'}`} className="btn-primary mt-4 inline-block">
          Retour
        </Link>
      </div>
    );
  }

  const backPath  = type === 'film' ? '/explore/films' : '/explore/series';
  const backLabel = type === 'film' ? 'Films' : 'Séries';

  return (
    <div>
      {/* Hero */}
      <div className="relative h-72 md:h-96 overflow-hidden">
        {content.banner_url || content.thumbnail_url ? (
          <img
            src={content.banner_url ?? content.thumbnail_url!}
            alt={content.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900/80 to-blue-900/80" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/50 to-transparent" />

        <Link
          to={backPath}
          className="absolute top-4 left-4 flex items-center gap-2 text-white bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm hover:bg-black/60 transition-colors"
        >
          <ArrowLeft size={14} />
          {backLabel}
        </Link>
      </div>

      {/* Content */}
      <div className="w-full mx-auto px-4 -mt-24 relative z-10 pb-16">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Thumbnail as poster */}
          {content.thumbnail_url && (
            <div className="shrink-0 w-36 md:w-48 rounded-2xl overflow-hidden shadow-2xl self-start">
              <img src={content.thumbnail_url} alt={content.title} className="w-full h-auto" />
            </div>
          )}

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-2xl md:text-4xl font-bold text-[var(--text-primary)] mb-2">{content.title}</h1>
            {content.original_title && content.original_title !== content.title && (
              <p className="text-[var(--text-tertiary)] text-sm mb-2 italic">{content.original_title}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-[var(--text-secondary)]">
              {content.rating && (
                <span className="text-yellow-400">★ {Number(content.rating).toFixed(1)}</span>
              )}
              {content.year && <span>{content.year}</span>}
              {content.language && (
                <span className="bg-[var(--bg-secondary)] border border-[var(--border)] px-2 py-0.5 rounded-full text-xs">
                  {content.language.toUpperCase()}
                </span>
              )}
              {content.country && (
                <span className="bg-[var(--bg-secondary)] border border-[var(--border)] px-2 py-0.5 rounded-full text-xs">
                  {content.country}
                </span>
              )}
            </div>

            {content.synopsis && (
              <p className="text-[var(--text-secondary)] leading-relaxed mb-6 max-w-2xl">
                {content.synopsis}
              </p>
            )}

            {/* CTA */}
            <div className="flex flex-wrap gap-3">
              <Link to="/auth/register" className="btn-primary flex items-center gap-2">
                <Play size={18} fill="currentColor" />
                Regarder maintenant
              </Link>
              <Link to="/auth/login" className="btn-secondary flex items-center gap-2">
                <Lock size={16} />
                Se connecter
              </Link>
            </div>

            <p className="text-xs text-[var(--text-tertiary)] mt-3">
              Inscription gratuite — accès complet immédiat
            </p>
          </div>
        </div>

        {/* Director / cast */}
        {(content.director || content.cast) && (
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            {content.director && (
              <div className="card p-4">
                <h3 className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Réalisateur</h3>
                <p className="text-[var(--text-primary)] font-medium">{content.director}</p>
              </div>
            )}
            {content.cast && Object.keys(content.cast).length > 0 && (
              <div className="card p-4">
                <h3 className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Casting</h3>
                <p className="text-[var(--text-primary)]">{Object.values(content.cast).join(', ')}</p>
              </div>
            )}
          </div>
        )}

        {/* Signup banner */}
        <div className="mt-12 rounded-2xl bg-gradient-to-r from-[var(--primary)]/20 to-purple-500/10 border border-[var(--primary)]/20 p-8 text-center">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            Prêt à regarder {content.title} ?
          </h2>
          <p className="text-[var(--text-secondary)] mb-4">
            Créez votre compte gratuit et accédez à tout le catalogue
          </p>
          <Link to="/auth/register" className="btn-primary inline-block">
            Commencer gratuitement
          </Link>
        </div>
      </div>
    </div>
  );
}
