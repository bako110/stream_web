import { Link } from 'react-router-dom';
import { Play, Lock, Calendar, MapPin, Users, Ticket, Heart, MessageCircle, Eye, Music2 } from 'lucide-react';
import { Avatar, VerifiedBadge } from './Avatar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export type GuestPreviewType = 'post' | 'reel' | 'event' | 'concert';

interface GuestPreviewProps {
  type: GuestPreviewType;
  thumbnail?: string | null;
  title?: string | null;
  body?: string | null;
  author?: {
    avatar_url?: string | null;
    display_name?: string | null;
    username?: string | null;
    is_verified?: boolean;
  } | null;
  date?: string | null;
  location?: string | null;
  attendees?: number | null;
  ticketPrice?: number | null;
  likeCount?: number;
  commentCount?: number;
  viewCount?: number;
  isLive?: boolean;
}

const TYPE_CONFIG: Record<GuestPreviewType, { label: string; color: string; icon: React.ElementType; ctaText: string }> = {
  post:    { label: 'Post',    color: '#7B3FF2', icon: MessageCircle, ctaText: 'Connecte-toi pour voir le post complet' },
  reel:    { label: 'Reel',   color: '#7B3FF2', icon: Play,          ctaText: 'Connecte-toi pour regarder ce reel' },
  event:   { label: 'Event',  color: '#7B3FF2', icon: Calendar,      ctaText: 'Connecte-toi pour voir les détails et participer' },
  concert: { label: 'Concert',color: '#7B3FF2', icon: Music2,        ctaText: 'Connecte-toi pour accéder au concert' },
};

export function GuestPreview({
  type, thumbnail, title, body, author, date,
  location, attendees, ticketPrice, likeCount, commentCount, viewCount, isLive,
}: GuestPreviewProps) {
  const cfg = TYPE_CONFIG[type];
  const isMedia = type === 'reel' || type === 'concert';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* ── Hero visuel ── */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: isMedia ? 380 : 260 }}>
        {thumbnail ? (
          <>
            <img src={thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.7) 60%, var(--bg) 100%)',
            }} />
          </>
        ) : (
          <div className="absolute inset-0" style={{
            background: `linear-gradient(135deg, ${cfg.color}22 0%, ${cfg.color}08 100%)`,
          }} />
        )}

        {/* Badge type + live */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black text-white"
              style={{ background: '#EF4444', letterSpacing: '0.05em' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full text-[11px] font-black text-white"
            style={{ background: cfg.color }}>
            {cfg.label.toUpperCase()}
          </span>
        </div>

        {/* Overlay play pour reel/concert */}
        {isMedia && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.3)' }}>
              <Play size={28} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />
            </div>
          </div>
        )}

        {/* Titre + auteur en bas du hero */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          {title && (
            <h1 className="text-xl font-black text-white mb-2 leading-tight" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
              {title}
            </h1>
          )}
          {author && (
            <div className="flex items-center gap-2">
              <Avatar src={author.avatar_url} name={author.display_name ?? author.username ?? '?'} size="xs" />
              <span className="text-xs font-semibold text-white/90">
                {author.display_name ?? author.username ?? 'Utilisateur'}
              </span>
              {author.is_verified && <VerifiedBadge size={12} />}
              {date && (
                <span className="text-xs text-white/60 ml-1">
                  · {format(new Date(date), 'd MMM yyyy', { locale: fr })}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Contenu aperçu ── */}
      <div className="flex-1 max-w-xl mx-auto w-full px-4 -mt-2">

        {/* Meta infos (event/concert) */}
        {(location || attendees != null || ticketPrice != null) && (
          <div className="rounded-2xl px-4 py-3 mb-4 flex flex-wrap gap-3"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {location && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <MapPin size={13} style={{ color: cfg.color }} />
                <span>{location}</span>
              </div>
            )}
            {attendees != null && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <Users size={13} style={{ color: cfg.color }} />
                <span>{attendees.toLocaleString()} participants</span>
              </div>
            )}
            {ticketPrice != null && (
              <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: cfg.color }}>
                <Ticket size={13} />
                <span>{ticketPrice === 0 ? 'Gratuit' : `À partir de ${ticketPrice} €`}</span>
              </div>
            )}
          </div>
        )}

        {/* Aperçu texte */}
        {body && (
          <div className="mb-4 relative">
            <p className="text-sm leading-relaxed line-clamp-3" style={{ color: 'var(--text-secondary)' }}>
              {body}
            </p>
            {/* Fade out */}
            <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, transparent, var(--bg))' }} />
          </div>
        )}

        {/* Stats */}
        {(likeCount != null || commentCount != null || viewCount != null) && (
          <div className="flex items-center gap-4 mb-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {likeCount != null && (
              <span className="flex items-center gap-1">
                <Heart size={12} /> {likeCount.toLocaleString()}
              </span>
            )}
            {commentCount != null && (
              <span className="flex items-center gap-1">
                <MessageCircle size={12} /> {commentCount.toLocaleString()}
              </span>
            )}
            {viewCount != null && (
              <span className="flex items-center gap-1">
                <Eye size={12} /> {viewCount.toLocaleString()}
              </span>
            )}
          </div>
        )}

        {/* ── CTA card ── */}
        <div className="rounded-2xl overflow-hidden mb-8"
          style={{ background: 'var(--surface)', border: `1px solid ${cfg.color}30` }}>

          {/* Bande couleur top */}
          <div className="h-1" style={{ background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}80)` }} />

          <div className="px-5 py-6 flex flex-col items-center gap-4 text-center">
            {/* Icone */}
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: `${cfg.color}15` }}>
              <Lock size={20} style={{ color: cfg.color }} />
            </div>

            <div>
              <p className="font-black text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                {cfg.ctaText}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                Rejoins GoFoliX — concerts, events, reels et bien plus.
              </p>
            </div>

            {/* Boutons */}
            <div className="flex gap-3 w-full">
              <Link to={`/auth/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                className="flex-1 py-3 rounded-xl text-sm font-black text-center transition-opacity hover:opacity-90"
                style={{ background: cfg.color, color: '#fff' }}>
                Se connecter
              </Link>
              <Link to={`/auth/register?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                className="flex-1 py-3 rounded-xl text-sm font-black text-center transition-opacity hover:opacity-90"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                S'inscrire
              </Link>
            </div>

            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              Gratuit · Pas de carte bancaire requise
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
