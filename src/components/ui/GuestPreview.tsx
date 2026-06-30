import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useThemeStore } from '../../store/themeStore';
import { Images } from '../assets';

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

const TYPE_CONFIG: Record<GuestPreviewType, { label: string; cta: string; icon: React.ReactNode }> = {
  post: {
    label: 'Post',
    cta: 'Connecte-toi pour voir le post complet',
    icon: (
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5" stroke="white" strokeWidth="1.3" fill="none"/>
        <path d="M4 6h4M6 4v4" stroke="white" strokeWidth="1.3"/>
      </svg>
    ),
  },
  reel: {
    label: 'Reel',
    cta: 'Connecte-toi pour regarder ce reel',
    icon: (
      <svg width="9" height="9" viewBox="0 0 12 12" fill="white">
        <path d="M3 2l7 4-7 4V2z" fill="white"/>
      </svg>
    ),
  },
  event: {
    label: 'Event',
    cta: 'Connecte-toi pour voir les détails et participer',
    icon: (
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
        <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="white" strokeWidth="1.3" fill="none"/>
        <path d="M4 1v2M8 1v2M1 5h10" stroke="white" strokeWidth="1.3"/>
      </svg>
    ),
  },
  concert: {
    label: 'Concert',
    cta: 'Connecte-toi pour accéder au concert',
    icon: (
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
        <path d="M7 2v8M5 4v4M3 5v2M9 3v6" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
};

const isMedia = (type: GuestPreviewType) => type === 'reel' || type === 'concert';

export function GuestPreview({
  type, thumbnail, title, body, author, date,
  location, attendees, ticketPrice, likeCount, commentCount, viewCount, isLive,
}: GuestPreviewProps) {
  const cfg = TYPE_CONFIG[type];
  const { isDark } = useThemeStore();
  const redirectParam = encodeURIComponent(window.location.pathname + window.location.search);

  const authorName = author?.display_name ?? author?.username ?? null;
  const initials   = authorName ? authorName[0].toUpperCase() : '?';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#0A0010',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* ── Hero ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, #1a0533 0%, #2d0f5e 50%, #0A0010 100%)',
          }} />
        )}
        {/* Gradient sculptural */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to bottom,
            rgba(10,0,16,0.55) 0%,
            rgba(10,0,16,0.08) 22%,
            rgba(10,0,16,0.04) 42%,
            rgba(10,0,16,0.60) 66%,
            rgba(10,0,16,0.97) 83%,
            rgba(10,0,16,1.00) 100%
          )`,
        }} />
      </div>

      {/* ── Topbar ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px 0',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: '#7B3FF2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M5 4L14 9L5 14V4Z" fill="white"/>
            </svg>
          </div>
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.5px', color: '#fff' }}>
            GoFoliX
          </span>
        </div>

        {/* Lien login discret */}
        <Link
          to={`/auth/login?redirect=${redirectParam}`}
          style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
        >
          Se connecter
        </Link>
      </div>

      {/* ── Contenu (poussé vers le bas) ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: '0 0 196px',
      }}>

        {/* Badge type + live */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 24px', marginBottom: 12 }}>
          {isLive && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 20,
              fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
              background: '#EF4444', color: '#fff',
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%', background: '#fff',
                animation: 'gp-pulse 1.1s ease-in-out infinite',
              }} />
              LIVE
            </span>
          )}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 20,
            fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
            background: '#7B3FF2', color: '#fff',
          }}>
            {cfg.icon}
            {cfg.label}
          </span>
        </div>

        <div style={{ padding: '0 24px' }}>

          {/* Bouton play pour reel/concert */}
          {isMedia(type) && (
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(8px)',
              border: '1.5px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 14,
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
                <path d="M5 3l12 7-12 7V3z"/>
              </svg>
            </div>
          )}

          {/* Titre */}
          {title && (
            <h1 style={{
              fontSize: 'clamp(22px, 5vw, 32px)',
              fontWeight: 900, lineHeight: 1.12,
              letterSpacing: '-0.5px', color: '#fff',
              marginBottom: 10,
            }}>
              {title}
            </h1>
          )}

          {/* Auteur */}
          {author && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
              {/* Avatar */}
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
                border: '1.5px solid rgba(255,255,255,0.3)',
                overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)',
              }}>
                {author.avatar_url
                  ? <img src={author.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initials}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                {authorName ?? 'Utilisateur'}
              </span>
              {author.is_verified && (
                <span style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: '#7B3FF2',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </span>
              )}
              {date && (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                  {isLive ? 'En direct' : format(new Date(date), 'd MMM yyyy', { locale: fr })}
                </span>
              )}
            </div>
          )}

          {/* Info pills (event/concert) */}
          {(location || attendees != null || ticketPrice != null) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {location && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 11px', borderRadius: 20,
                  fontSize: 11, fontWeight: 600,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.6)',
                }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1a3.5 3.5 0 0 1 3.5 3.5C9.5 8 6 11 6 11S2.5 8 2.5 4.5A3.5 3.5 0 0 1 6 1z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                    <circle cx="6" cy="4.5" r="1" fill="currentColor"/>
                  </svg>
                  {location}
                </span>
              )}
              {attendees != null && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 11px', borderRadius: 20,
                  fontSize: 11, fontWeight: 600,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.6)',
                }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <circle cx="4.5" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                    <path d="M1 10c0-1.9 1.6-3 3.5-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    <circle cx="8.5" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                    <path d="M11 10c0-1.9-1.6-3-3.5-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  {attendees.toLocaleString()} participants
                </span>
              )}
              {ticketPrice != null && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 11px', borderRadius: 20,
                  fontSize: 11, fontWeight: 600,
                  background: 'rgba(123,63,242,0.1)', border: '1px solid rgba(123,63,242,0.3)',
                  color: '#A78BFA',
                }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <rect x="1" y="3" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                    <path d="M4 3V2M8 3V2" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                  {ticketPrice === 0 ? 'Gratuit' : `À partir de ${ticketPrice.toLocaleString()} XOF`}
                </span>
              )}
            </div>
          )}

          {/* Aperçu texte */}
          {body && (
            <p style={{
              fontSize: 14, lineHeight: 1.55,
              color: 'rgba(255,255,255,0.6)',
              marginBottom: 14,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {body}
            </p>
          )}

          {/* Stats */}
          {(likeCount != null || commentCount != null || viewCount != null) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {likeCount != null && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M8 13.5S1.5 9.5 1.5 5.5a3.5 3.5 0 0 1 6.5-1.8A3.5 3.5 0 0 1 14.5 5.5c0 4-6.5 8-6.5 8z" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                  </svg>
                  {likeCount.toLocaleString()}
                </span>
              )}
              {commentCount != null && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M2 2h12v9H9l-3 3v-3H2V2z" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                  </svg>
                  {commentCount.toLocaleString()}
                </span>
              )}
              {viewCount != null && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.35)' }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M1 8c1.5-3 3.8-5 7-5s5.5 2 7 5c-1.5 3-3.8 5-7 5S2.5 11 1 8z" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                  </svg>
                  {viewCount.toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── CTA bar fixe en bas ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
        background: 'rgba(10,0,16,0.82)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderTop: '1px solid rgba(255,255,255,0.10)',
        padding: '20px 24px 28px',
      }}>
        <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 4, letterSpacing: '-0.2px' }}>
          {cfg.cta}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 16, lineHeight: 1.4 }}>
          Rejoins GoFoliX · concerts, events, reels et bien plus. Gratuit.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link
            to={`/auth/login?redirect=${redirectParam}`}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '13px 16px', borderRadius: 14,
              fontSize: 14, fontWeight: 800, color: '#fff',
              background: '#7B3FF2', textDecoration: 'none',
              letterSpacing: '-0.1px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 1a4 4 0 1 1 0 8A4 4 0 0 1 8 1zm-6 13c0-2.8 2.7-5 6-5s6 2.2 6 5" stroke="white" strokeWidth="1.4" fill="none"/>
            </svg>
            Se connecter
          </Link>
          <Link
            to={`/auth/register?redirect=${redirectParam}`}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '13px 16px', borderRadius: 14,
              fontSize: 14, fontWeight: 800, color: '#fff',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              textDecoration: 'none',
              letterSpacing: '-0.1px',
            }}
          >
            S'inscrire
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes gp-pulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: .4; transform: scale(.7); }
        }
      `}</style>
    </div>
  );
}
