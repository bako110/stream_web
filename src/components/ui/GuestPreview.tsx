import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { RoundLogo } from './RoundLogo';

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
    label: 'Vidéo',
    cta: 'Connecte-toi pour regarder cette vidéo',
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
  location, attendees, ticketPrice, isLive,
}: GuestPreviewProps) {
  const cfg = TYPE_CONFIG[type];
  const redirectParam = encodeURIComponent(window.location.pathname + window.location.search);
  const [showPlayPrompt, setShowPlayPrompt] = useState(false);
  const authorName = author?.display_name ?? author?.username ?? null;
  const initials   = authorName ? authorName[0].toUpperCase() : '?';

  return (
    <>
      <style>{`
        .gp-shell {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: #0A0010;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .gp-hero {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .gp-hero img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center center;
          display: block;
        }
        .gp-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(10,0,16,0.55) 0%,
            rgba(10,0,16,0.08) 22%,
            rgba(10,0,16,0.04) 42%,
            rgba(10,0,16,0.60) 64%,
            rgba(10,0,16,0.97) 82%,
            rgba(10,0,16,1.00) 100%
          );
        }
        .gp-topbar {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px 0;
          flex-shrink: 0;
        }
        .gp-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }
        .gp-logo-text {
          font-size: 16px;
          font-weight: 800;
          letter-spacing: -0.4px;
          color: #fff;
        }
        .gp-topbar-login {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          padding: 6px 0;
          transition: color .18s;
        }
        .gp-topbar-login:hover { color: #fff; }

        /* Scrollable content zone */
        .gp-scroll {
          position: relative;
          z-index: 10;
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          display: flex;
          flex-direction: column;
          /* padding-bottom = CTA bar height */
          padding-bottom: 180px;
        }
        /* Spacer to push content down toward the gradient */
        .gp-spacer { flex: 1; min-height: 200px; }

        .gp-badges {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 20px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .gp-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .gp-badge-type { background: #7B3FF2; color: #fff; }
        .gp-badge-live { background: #EF4444; color: #fff; }
        .gp-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #fff;
          animation: gp-pulse 1.1s ease-in-out infinite;
        }
        @keyframes gp-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:.4; transform:scale(.7); }
        }

        .gp-meta { padding: 0 20px; }

        .gp-play {
          width: 48px; height: 48px;
          border-radius: 50%;
          background: rgba(255,255,255,0.12);
          border: 1.5px solid rgba(255,255,255,0.25);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 12px;
          flex-shrink: 0;
        }

        .gp-title {
          font-size: clamp(18px, 4vw, 30px);
          font-weight: 900;
          line-height: 1.15;
          letter-spacing: -0.4px;
          color: #fff;
          margin-bottom: 10px;
          word-break: break-word;
        }

        .gp-author {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .gp-avatar {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: rgba(255,255,255,0.12);
          border: 1.5px solid rgba(255,255,255,0.3);
          overflow: hidden;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700;
          color: rgba(255,255,255,0.6);
        }
        .gp-avatar img { width:100%; height:100%; object-fit:cover; }
        .gp-author-name { font-size: 13px; font-weight: 700; color: #fff; }
        .gp-verified {
          width: 14px; height: 14px;
          border-radius: 50%;
          background: #7B3FF2;
          display: inline-flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .gp-date { font-size: 12px; color: rgba(255,255,255,0.35); }

        .gp-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-bottom: 12px;
        }
        .gp-pill {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 10px; border-radius: 20px;
          font-size: 11px; font-weight: 600;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.6);
          white-space: nowrap;
        }
        .gp-pill-accent {
          background: rgba(123,63,242,0.10);
          border-color: rgba(123,63,242,0.30);
          color: #A78BFA;
        }

        .gp-body {
          font-size: 14px;
          line-height: 1.55;
          color: rgba(255,255,255,0.6);
          margin-bottom: 14px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-word;
        }

        .gp-stats {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .gp-stat {
          display: flex; align-items: center; gap: 5px;
          font-size: 12px; font-weight: 600;
          color: rgba(255,255,255,0.35);
        }

        /* CTA bar */
        .gp-cta {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          z-index: 20;
          background: rgba(10,0,16,0.88);
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
          border-top: 1px solid rgba(255,255,255,0.10);
          padding: 16px 20px;
          padding-bottom: max(16px, env(safe-area-inset-bottom));
        }
        .gp-cta-headline {
          font-size: 14px;
          font-weight: 800;
          color: #fff;
          margin-bottom: 3px;
          letter-spacing: -0.2px;
          line-height: 1.3;
        }
        .gp-cta-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.35);
          margin-bottom: 14px;
          line-height: 1.4;
        }
        .gp-btns {
          display: flex;
          gap: 10px;
        }
        .gp-btn {
          flex: 1;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 14px; font-weight: 800;
          text-decoration: none;
          letter-spacing: -0.1px;
          transition: opacity .15s, transform .15s;
          white-space: nowrap;
        }
        .gp-btn:hover { opacity: .88; transform: scale(.985); }
        .gp-btn-primary { background: #7B3FF2; color: #fff; }
        .gp-btn-ghost {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          color: #fff;
        }

        /* Tablet / desktop */
        @media (min-width: 640px) {
          .gp-topbar { padding: 20px 32px 0; }
          .gp-logo-text { font-size: 18px; }
          .gp-badges { padding: 0 32px; }
          .gp-meta { padding: 0 32px; }
          .gp-cta { padding: 20px 32px; padding-bottom: max(20px, env(safe-area-inset-bottom)); }
          .gp-cta-headline { font-size: 15px; }
          .gp-cta-sub { font-size: 12px; }
          .gp-btn { font-size: 15px; padding: 13px 16px; border-radius: 14px; }
          .gp-scroll { padding-bottom: 190px; }
        }
        @media (min-width: 1024px) {
          .gp-topbar { padding: 24px 48px 0; }
          .gp-badges { padding: 0 48px; margin-bottom: 16px; }
          .gp-meta { padding: 0 48px; }
          .gp-cta { padding: 22px 48px; padding-bottom: max(22px, env(safe-area-inset-bottom)); max-width: 640px; left: 50%; transform: translateX(-50%); border-radius: 24px 24px 0 0; }
          .gp-title { font-size: clamp(24px, 3vw, 38px); }
          .gp-scroll { padding-bottom: 200px; }
        }
      `}</style>

      <div className="gp-shell">

        {/* Hero */}
        <div className="gp-hero">
          {thumbnail
            ? <img src={thumbnail} alt="" />
            : <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,#1a0533 0%,#2d0f5e 50%,#0A0010 100%)' }} />
          }
          <div className="gp-gradient" />
        </div>

        {/* Topbar */}
        <div className="gp-topbar">
          <div className="gp-logo">
            <RoundLogo size={36} />
            <span className="gp-logo-text">GoFolyX</span>
          </div>
          <Link to={`/auth/login?redirect=${redirectParam}`} className="gp-topbar-login">
            Se connecter
          </Link>
        </div>

        {/* Scrollable content */}
        <div className="gp-scroll">
          <div className="gp-spacer" />

          {/* Badges */}
          <div className="gp-badges">
            {isLive && (
              <span className="gp-badge gp-badge-live">
                <span className="gp-dot" />
                LIVE
              </span>
            )}
            <span className="gp-badge gp-badge-type">
              {cfg.icon}
              {cfg.label}
            </span>
          </div>

          <div className="gp-meta">
            {/* Play button */}
            {isMedia(type) && (
              <button className="gp-play" onClick={() => setShowPlayPrompt(true)} style={{ cursor: 'pointer', border: 'none' }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="white">
                  <path d="M5 3l12 7-12 7V3z"/>
                </svg>
              </button>
            )}

            {/* Title */}
            {title && <h1 className="gp-title">{title}</h1>}

            {/* Author */}
            {author && (
              <div className="gp-author">
                <div className="gp-avatar">
                  {author.avatar_url
                    ? <img src={author.avatar_url} alt="" />
                    : initials}
                </div>
                <span className="gp-author-name">{authorName ?? 'Utilisateur'}</span>
                {author.is_verified && (
                  <span className="gp-verified">
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </span>
                )}
                {date && (
                  <span className="gp-date">
                    {isLive ? 'En direct' : format(new Date(date), 'd MMM yyyy', { locale: fr })}
                  </span>
                )}
              </div>
            )}

            {/* Info pills */}
            {(location || attendees != null || ticketPrice != null) && (
              <div className="gp-pills">
                {location && (
                  <span className="gp-pill">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1a3.5 3.5 0 0 1 3.5 3.5C9.5 8 6 11 6 11S2.5 8 2.5 4.5A3.5 3.5 0 0 1 6 1z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                      <circle cx="6" cy="4.5" r="1" fill="currentColor"/>
                    </svg>
                    {location}
                  </span>
                )}
                {attendees != null && (
                  <span className="gp-pill">
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
                  <span className="gp-pill gp-pill-accent">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <rect x="1" y="3" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                      <path d="M4 3V2M8 3V2" stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                    {ticketPrice === 0 ? 'Gratuit' : `À partir de ${ticketPrice.toLocaleString()} XOF`}
                  </span>
                )}
              </div>
            )}

            {/* Body */}
            {body && <p className="gp-body">{body}</p>}
          </div>
        </div>

        {/* Modal play prompt */}
        {showPlayPrompt && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
              onClick={() => setShowPlayPrompt(false)}
            />
            <div style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 31,
              background: 'var(--surface, #1a1a2e)',
              borderRadius: '24px 24px 0 0',
              padding: '12px 24px',
              paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
              border: '1px solid rgba(255,255,255,0.10)',
              animation: 'dialogIn 0.25s cubic-bezier(0.32,0.72,0,1)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
              </div>
              {/* Icone play */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #7B3FF2, #A855F7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(123,63,242,0.45)',
                }}>
                  <svg width="22" height="22" viewBox="0 0 20 20" fill="white">
                    <path d="M5 3l12 7-12 7V3z"/>
                  </svg>
                </div>
              </div>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 6, letterSpacing: '-0.3px' }}>
                Connecte-toi pour regarder
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 20, lineHeight: 1.4 }}>
                Rejoins GoFolyX gratuitement pour accéder aux vidéos, concerts et events.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <Link
                  to={`/auth/login?redirect=${redirectParam}`}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '13px', borderRadius: 14,
                    fontSize: 14, fontWeight: 800, color: '#fff',
                    background: '#7B3FF2', textDecoration: 'none',
                  }}
                >
                  Se connecter
                </Link>
                <Link
                  to={`/auth/register?redirect=${redirectParam}`}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '13px', borderRadius: 14,
                    fontSize: 14, fontWeight: 800, color: '#fff',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    textDecoration: 'none',
                  }}
                >
                  S'inscrire
                </Link>
              </div>
            </div>
          </>
        )}

        {/* CTA bar fixe */}
        <div className="gp-cta">
          <p className="gp-cta-headline">{cfg.cta}</p>
          <p className="gp-cta-sub">Rejoins GoFolyX · concerts, events, reels et bien plus. Gratuit.</p>
          <div className="gp-btns">
            <Link to={`/auth/login?redirect=${redirectParam}`} className="gp-btn gp-btn-primary">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M8 1a4 4 0 1 1 0 8A4 4 0 0 1 8 1zm-6 13c0-2.8 2.7-5 6-5s6 2.2 6 5" stroke="white" strokeWidth="1.4"/>
              </svg>
              Se connecter
            </Link>
            <Link to={`/auth/register?redirect=${redirectParam}`} className="gp-btn gp-btn-ghost">
              S'inscrire
            </Link>
          </div>
        </div>

      </div>
    </>
  );
}
