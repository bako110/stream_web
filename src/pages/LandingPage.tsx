import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { encodeId } from '../utils/slugId';
import { getEventTiming, sortEventsByProximity, isMultiDay, formatDateRange, getConcertEnd } from '../utils/eventTiming';
import {
  Play, Music2, Calendar, Users, ArrowRight, ArrowUpRight,
  Menu, X, MapPin, ArrowUp, Star, Ticket, Radio, Film, Shield, Eye, Volume2, VolumeX,
} from 'lucide-react';
import Hls from 'hls.js';
import { toProxiedUrl } from '../utils/constants';
import { publicClient } from '../api';
import { Endpoints } from '../api/endpoints';
import type { Concert, Content, Event } from '../types';
import { useAuthStore } from '../store/authStore';
import { GateLogo } from '../components/ui/GateLogo';
import { PriceWithLocal } from '../components/ui/PriceWithLocal';
import { STICKERS } from '../components/ui/Stickers';
import { BentoRail, BentoSkeleton, type BentoTile } from '../components/ui/BentoRail';
import './landing.css';

// ── Scroll reveal ─────────────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.gt-rise');
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' },
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  });
}

// ── Mouvement : parallaxe souris (hero) + compteur animé ─────────────────────
const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useHeroParallax() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', String(((e.clientX - r.left) / r.width - 0.5).toFixed(3)));
        el.style.setProperty('--my', String(((e.clientY - r.top) / r.height - 0.5).toFixed(3)));
      });
    };
    const leave = () => { el.style.setProperty('--mx', '0'); el.style.setProperty('--my', '0'); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => { cancelAnimationFrame(raf); el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  }, []);
  return ref;
}

function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [text, setText] = useState(value);
  useEffect(() => {
    const el = ref.current;
    const target = parseInt(value.replace(/\D/g, ''), 10);
    if (!el || !target || reducedMotion()) return;
    const suffix = value.replace(/[\d\s]/g, '');
    setText(`0${suffix}`);
    let raf = 0;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / 1600);
        const n = Math.round(target * (1 - Math.pow(1 - p, 4)));
        setText(`${n.toLocaleString('fr-FR')}${suffix}`);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => { obs.disconnect(); cancelAnimationFrame(raf); };
  }, [value]);
  return <p ref={ref} className="gt-stat-value">{text}</p>;
}

// Inclinaison 3D du panneau live qui suit le curseur
function useTilt() {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== 'mouse' || reducedMotion()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--rx', `${(-y * 8).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`);
  };
  const onLeave = () => {
    ref.current?.style.setProperty('--rx', '0deg');
    ref.current?.style.setProperty('--ry', '0deg');
  };
  return { ref, onMove, onLeave };
}

const NAV_LINKS = [
  { label: 'Films & séries', href: '/explore/films'    },
  { label: 'Concerts',       href: '/explore/concerts' },
  { label: 'Événements',     href: '/explore/events'   },
  { label: 'Pourquoi nous',  href: '#features'         },
];

// Nav sans l'ancre #features (n'existe que sur la landing) — utilisée par
// les pages qui réutilisent GateHeader ailleurs que sur "/".
export const EXPLORE_NAV_LINKS = NAV_LINKS.filter(l => !l.href.startsWith('#'));

// ── Bandeau de stickers défilant — illustrations line-art, boucle infinie ─────
export function StickerStrip() {
  const items = [...STICKERS, ...STICKERS];
  return (
    <div className="gt-strip">
      <div className="gt-strip-track">
        {items.map(({ Icon, label }, i) => (
          <div key={i} className="gt-sticker">
            <span className="gt-sticker-icon"><Icon size={20} /></span>
            <span className="gt-sticker-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Header — un seul composant réutilisé par toutes les pages "gate"
// (landing, onboarding, explore...) pour une identité unique cohérente. ─────
export function GateHeader({ navLinks = NAV_LINKS }: { navLinks?: typeof NAV_LINKS }) {
  const { isAuthenticated } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fn = () => {
      setScrolled(window.scrollY > 8);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      headerRef.current?.style.setProperty('--sp', String(max > 0 ? Math.min(1, window.scrollY / max) : 0));
    };
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <>
      <header ref={headerRef} className={`gt-header${scrolled ? ' is-scrolled' : ''}`}>
        <div className="gt-container gt-header-inner">
          <span className="gt-progress" aria-hidden="true" />
          <Link to="/" className="flex items-center gap-2.5">
            <GateLogo size={32} />
            <span className="gt-display text-base">Gofolyx</span>
          </Link>

          <nav className="!hidden md:!flex gt-header-nav">
            {navLinks.map(({ label, href }) => href.startsWith('#') ? (
              <a key={href} href={href} className="gt-navlink">{label}</a>
            ) : (
              <Link key={href} to={href} className="gt-navlink">{label}</Link>
            ))}
          </nav>

          <div className="gt-header-actions">
            {isAuthenticated ? (
              <button onClick={() => navigate('/feed')} className="gt-btn gt-btn-solid gt-btn-sm">
                Mon espace
              </button>
            ) : (
              <>
                <Link to="/auth/login" className="!hidden md:!inline-flex gt-btn gt-btn-line gt-btn-sm">
                  Connexion
                </Link>
                <Link to="/auth/register" className="gt-btn gt-btn-solid gt-btn-sm">
                  S'inscrire
                </Link>
              </>
            )}

            <button onClick={() => setMenuOpen(v => !v)} className="md:!hidden inline-flex items-center justify-center gt-icon-btn">
              {menuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
      </header>
      <div className="gt-header-spacer" />

      {menuOpen && (
        <div className="md:!hidden fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--gt-bg)', top: 84 }}>
          <nav className="flex flex-col px-6 pt-6 gap-1">
            {navLinks.map(({ label, href }) => href.startsWith('#') ? (
              <a key={href} href={href} onClick={() => setMenuOpen(false)}
                className="py-4 text-xl gt-display" style={{ borderBottom: '1px solid var(--gt-line)' }}
              >{label}</a>
            ) : (
              <Link key={href} to={href} onClick={() => setMenuOpen(false)}
                className="py-4 text-xl gt-display" style={{ borderBottom: '1px solid var(--gt-line)' }}
              >{label}</Link>
            ))}
          </nav>
          {!isAuthenticated && (
            <div className="px-6 pt-8 flex flex-col gap-3">
              <Link to="/auth/register" className="gt-btn gt-btn-accent gt-btn-block" onClick={() => setMenuOpen(false)}>
                S'inscrire
              </Link>
              <Link to="/auth/login" className="gt-btn gt-btn-line gt-btn-block" onClick={() => setMenuOpen(false)}>
                Connexion
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Hero — texte centré, une seule bannière visuelle en dessous ──────────────
// ── Panneau « En direct » — colonne droite du hero ───────────────────────────
// Montre un live en cours sur Gofolyx : vidéo en lecture muette (aperçu), badge LIVE, nombre de
// spectateurs, artiste, bouton « Regarder ». Priorité : concert réellement en direct, sinon le plus
// récent avec une vidéo/replay, sinon sa vignette. Les autres lives s'affichent en pastilles dessous.
function pickVideo(c: Concert): string | null {
  return c.replay_url ?? c.video_url ?? null;
}

function LivePreviewVideo({ src, poster }: { src: string; poster?: string | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    setReady(false);
    const url = toProxiedUrl(src);
    let hls: Hls | null = null;
    const start = () => { setReady(true); v.play().catch(() => {}); };
    if (url.includes('.m3u8') || url.includes('/hls/')) {
      if (Hls.isSupported()) {
        hls = new Hls({ autoStartLoad: true, maxBufferLength: 10 });
        hls.loadSource(url);
        hls.attachMedia(v);
        hls.once(Hls.Events.MANIFEST_PARSED, start);
      } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
        v.src = url;
        v.addEventListener('loadedmetadata', start, { once: true });
      }
    } else {
      v.src = url;
      v.addEventListener('loadeddata', start, { once: true });
    }
    return () => { hls?.destroy(); v.removeAttribute('src'); v.load(); };
  }, [src]);

  return (
    <>
      <video ref={ref} muted={muted} loop playsInline autoPlay poster={poster ?? undefined}
        className="gt-live-video" style={{ opacity: ready ? 1 : 0 }} />
      <button type="button" className="gt-live-sound" onClick={() => setMuted(m => !m)}
        aria-label={muted ? 'Activer le son' : 'Couper le son'}>
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
    </>
  );
}

function HeroLivePanel({ concerts }: { concerts: Concert[] }) {
  const [liveNow, setLiveNow] = useState<Concert[]>([]);
  const tilt = useTilt();

  // Concerts réellement en direct (endpoint public) — silencieux si indisponible.
  useEffect(() => {
    publicClient.get<any>(Endpoints.concerts.live)
      .then(r => setLiveNow(Array.isArray(r.data) ? r.data : (r.data?.items ?? [])))
      .catch(() => {});
  }, []);

  const pool  = [...liveNow, ...concerts.filter(c => !liveNow.some(l => l.id === c.id))];
  const main  = pool.find(c => c.status === 'live') ?? pool.find(c => pickVideo(c)) ?? pool[0];
  if (!main) return null;
  const others  = pool.filter(c => c.id !== main.id).slice(0, 2);
  const isLive  = main.status === 'live';
  const video   = pickVideo(main);
  const artist  = main.artist?.display_name ?? main.artist?.username;

  return (
    <aside className="gt-livepanel gt-rise" style={{ transitionDelay: '200ms' }} aria-label="En direct sur Gofolyx">
      <div className="gt-float" onPointerMove={tilt.onMove} onPointerLeave={tilt.onLeave}>
      <div className="gt-livepanel-media" ref={tilt.ref}>
        {main.thumbnail_url && <img src={main.thumbnail_url} alt="" className="gt-live-poster" />}
        {video && <LivePreviewVideo src={video} poster={main.thumbnail_url} />}
        <div className="gt-livepanel-scrim" />
        <div className="gt-livepanel-top">
          <span className="gt-livebadge"><span className="gt-livebadge-dot" />{isLive ? 'EN DIRECT' : 'À L\'AFFICHE'}</span>
          {isLive && (
            <span className="gt-liveviewers"><Eye size={12} /> {(main.current_viewers ?? 0).toLocaleString('fr-FR')}</span>
          )}
        </div>
        <div className="gt-livepanel-info">
          <p className="gt-livepanel-title">{main.title}</p>
          {artist && <p className="gt-livepanel-artist">{artist}</p>}
          <Link to={`/explore/concerts/${encodeId(main.id)}`} className="gt-livepanel-cta">
            <Play size={14} fill="currentColor" /> {isLive ? 'Regarder le live' : 'Voir le concert'}
          </Link>
        </div>
      </div>
      </div>

      {others.length > 0 && (
        <div className="gt-livepanel-more">
          <span className="gt-eyebrow">Aussi sur Gofolyx</span>
          <div className="gt-livepanel-chips">
            {others.map(c => (
              <Link key={c.id} to={`/explore/concerts/${encodeId(c.id)}`} className="gt-livechip">
                <span className="gt-livechip-thumb">
                  {c.thumbnail_url ? <img src={c.thumbnail_url} alt="" /> : <Radio size={14} />}
                </span>
                <span className="gt-livechip-text">
                  <strong>{c.title}</strong>
                  <span>{c.status === 'live' ? 'En direct' : 'Bientôt'}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function HeroSection({ concerts }: { films: Content[]; concerts: Concert[] }) {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const heroRef = useHeroParallax();
  const words: { t: string; accent?: boolean }[] = [
    { t: 'Tout' }, { t: 'se' }, { t: 'passe,' }, { t: 'en' }, { t: 'direct.', accent: true },
  ];

  return (
    <section className="gt-hero" ref={heroRef}>
      <div className="gt-aurora" aria-hidden="true">
        <span className="gt-orb gt-orb-1" />
        <span className="gt-orb gt-orb-2" />
        <span className="gt-orb gt-orb-3" />
      </div>
      <div className="gt-container gt-hero-content">
        <div className="gt-hero-grid">
        <div className="gt-hero-intro">
          <div className="gt-rise flex items-center justify-center lg:justify-start gap-2 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inset-0 rounded-full" style={{ background: 'var(--gt-accent)', opacity: 0.6 }} />
              <span className="relative rounded-full h-2 w-2 inline-block" style={{ background: 'var(--gt-accent)' }} />
            </span>
            <span className="gt-eq" aria-hidden="true"><i /><i /><i /><i /></span>
            <span className="gt-eyebrow">
              En direct maintenant · {concerts.length > 0 ? `${concerts.length} lives` : 'reels, films, concerts'}
            </span>
          </div>

          <h1 className="gt-display text-[2.6rem] sm:text-[4rem] lg:text-[4.6rem] leading-[1.05] mb-7">
            {words.map((w, i) => (
              <Fragment key={i}>
                <span className="gt-word-mask">
                  <span className={`gt-word${w.accent ? ' gt-word-accent' : ''}`} style={{ ['--i' as any]: i }}>{w.t}</span>
                </span>
                {' '}
              </Fragment>
            ))}
          </h1>

          <p className="text-lg leading-relaxed max-w-xl mx-auto lg:mx-0 mb-9 gt-rise" style={{ color: 'var(--gt-text-2)', transitionDelay: '160ms' }}>
            Concerts live, films, séries, reels et communautés — un seul endroit pour
            vivre la scène, l'écran et le direct, où que tu sois.
          </p>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-12 lg:mb-0 gt-rise" style={{ transitionDelay: '240ms' }}>
            {isAuthenticated ? (
              <button onClick={() => navigate('/feed')} className="gt-btn gt-btn-accent">
                Mon espace <ArrowRight size={17} />
              </button>
            ) : (
              <>
                <Link to="/auth/register" className="gt-btn gt-btn-accent">
                  Rejoindre Gofolyx <ArrowRight size={17} />
                </Link>
                <a href="#discover" className="gt-btn gt-btn-line">
                  <Play size={15} /> Explorer sans compte
                </a>
              </>
            )}
          </div>
        </div>
        <HeroLivePanel concerts={concerts} />
        </div>

        <div className="gt-stats gt-rise" style={{ transitionDelay: '200ms' }}>
          {[
            { icon: Film,   n: '500+',   l: 'Films & séries', d: 'En streaming HD' },
            { icon: Music2, n: '200+',   l: 'Concerts live',  d: 'Chat et cadeaux en direct' },
            { icon: Users,  n: '1 000+', l: 'Communautés',    d: 'Groupes et créateurs' },
          ].map(({ icon: Icon, n, l, d }, i) => (
            <div key={l} className="gt-stat-card" style={{ ['--i' as any]: i }}>
              <span className="gt-stat-card-icon"><Icon size={20} /></span>
              <div className="gt-stat-card-body">
                <CountUp value={n} />
                <p className="gt-stat-label">{l}</p>
                <p className="gt-stat-desc">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ index, title, sub, seeAllHref }: {
  index: string; title: string; sub?: string; seeAllHref?: string;
}) {
  return (
    <div className="gt-section-head gt-rise">
      <div>
        <span className="gt-eyebrow">{index}</span>
        <h2 className="gt-display gt-section-title">{title}</h2>
        {sub && <p className="gt-section-sub">{sub}</p>}
      </div>
      {seeAllHref && (
        <Link to={seeAllHref} className="gt-section-link">
          Tout voir <ArrowUpRight size={14} />
        </Link>
      )}
    </div>
  );
}

// ── Carte vedette film / série — une seule, grand format ──────────────────────
function FilmShowcase({ item, onClick }: { item: Content; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div className="gt-showcase-card" onClick={onClick}>
      <div className="gt-showcase-media">
        {item.thumbnail_url && !imgErr ? (
          <img src={item.thumbnail_url} alt={item.title} onError={() => setImgErr(true)} />
        ) : (
          <div className="gt-showcase-media-fallback"><Film size={40} /></div>
        )}
        <div className="gt-showcase-scrim" />
        {item.rating != null && (
          <div className="gt-showcase-rating"><Star size={11} fill="#fff" /> {Number(item.rating).toFixed(1)}</div>
        )}
        <div className="gt-showcase-overlay">
          <p className="gt-showcase-title truncate">{item.title}</p>
          {item.year && <p className="gt-showcase-sub">{item.year}</p>}
        </div>
      </div>
      <div className="gt-showcase-footer">
        <span className="gt-showcase-meta"><Film size={13} /> Disponible en streaming</span>
        <span className="gt-showcase-cta"><Play size={12} fill="currentColor" /> Regarder</span>
      </div>
    </div>
  );
}

// ── Carte vedette concert — une seule, grand format ───────────────────────────
function ConcertShowcase({ concert, onClick }: { concert: Concert; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const isLive = concert.status === 'live';
  const artistName = concert.artist?.display_name ?? concert.artist?.username;

  return (
    <div className="gt-showcase-card" onClick={onClick}>
      <div className="gt-showcase-media">
        {concert.thumbnail_url && !imgErr ? (
          <img src={concert.thumbnail_url} alt={concert.title} onError={() => setImgErr(true)} />
        ) : (
          <div className="gt-showcase-media-fallback"><Music2 size={40} /></div>
        )}
        <div className="gt-showcase-scrim" />
        {isLive && <span className="gt-showcase-badge"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live</span>}
        <div className="gt-showcase-overlay">
          <p className="gt-showcase-title truncate">{concert.title}</p>
          {artistName && <p className="gt-showcase-sub truncate">{artistName}</p>}
        </div>
      </div>
      <div className="gt-showcase-footer">
        <span className="gt-showcase-meta"><Music2 size={13} /> Concert en streaming</span>
        {concert.ticket_price != null ? (
          <span className="gt-showcase-price"><Ticket size={13} /> {concert.ticket_price === 0 ? 'Gratuit' : <PriceWithLocal amountEur={concert.ticket_price} />}</span>
        ) : (
          <span className="gt-showcase-cta">Voir <ArrowUpRight size={14} /></span>
        )}
      </div>
    </div>
  );
}

// ── Carte vedette événement — une seule, grand format ─────────────────────────
function EventShowcase({ event, onClick }: { event: Event; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const date = new Date(event.starts_at);
  const dd = date.getDate().toString().padStart(2, '0');
  const mo = date.toLocaleString('fr', { month: 'short' }).toUpperCase();
  const location = [event.venue_name, event.venue_city].filter(Boolean).join(', ');
  const timing = getEventTiming(event);

  return (
    <div className={`gt-showcase-card gt-event-${timing.phase}`} onClick={onClick}>
      <div className="gt-showcase-media">
        {event.thumbnail_url && !imgErr ? (
          <img src={event.thumbnail_url} alt={event.title} onError={() => setImgErr(true)} />
        ) : (
          <div className="gt-showcase-media-fallback"><Calendar size={40} /></div>
        )}
        <div className="gt-showcase-scrim" />
        <div className="gt-showcase-date">
          <span className="gt-showcase-date-day">{dd}</span>
          <span className="gt-showcase-date-month">{mo}</span>
        </div>
        <span className="gt-timing-chip" style={{ background: timing.color }}>
          {timing.phase === 'live' && <span className="gt-timing-dot" />}
          {timing.label}
        </span>
        <div className="gt-showcase-overlay">
          <p className="gt-showcase-title truncate">{event.title}</p>
          {location && <p className="gt-showcase-sub truncate"><MapPin size={12} /> {location}</p>}
        </div>
      </div>
      <div className="gt-showcase-footer">
        <span className="gt-showcase-meta"><Calendar size={13} /> {timing.isPast ? 'Événement terminé' : timing.isNear ? 'Bientôt — ne le manque pas' : 'Billetterie intégrée'}</span>
        {timing.isPast ? (
          <span className="gt-showcase-price gt-showcase-price--past">Terminé</span>
        ) : event.ticket_price != null ? (
          <span className="gt-showcase-price">{event.ticket_price === 0 ? 'Gratuit' : <PriceWithLocal amountEur={event.ticket_price} />}</span>
        ) : (
          <span className="gt-showcase-cta">Voir <ArrowUpRight size={14} /></span>
        )}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function ShowcaseSkeleton() {
  return (
    <div className="gt-showcase">
      <div className="gt-showcase-card">
        <div className="gt-showcase-media gt-skeleton" />
        <div className="gt-showcase-footer">
          <div className="gt-skeleton" style={{ width: 120, height: 12, borderRadius: 4 }} />
          <div className="gt-skeleton" style={{ width: 60, height: 12, borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
}

function EmptyRow() {
  return <p className="text-sm py-6" style={{ color: 'var(--gt-text-3)' }}>Aucun contenu disponible pour le moment</p>;
}

// ── Features — mise en page éditoriale : titre figé à gauche, cartes à droite ─
function FeaturesSection() {
  const features = [
    { icon: Radio,  c: '#7B3FF2', title: 'Concerts en direct', desc: 'Live streaming HD, chat en temps réel, cadeaux virtuels pour soutenir les artistes pendant le show.' },
    { icon: Play,   c: '#EC4899', title: 'Films & séries',     desc: 'Un catalogue en streaming HD, sous-titré, accessible sans interruption publicitaire.' },
    { icon: Film,   c: '#F59E0B', title: 'Reels & stories',    desc: 'Formats courts pour découvrir les créateurs et partager tes propres moments en quelques secondes.' },
    { icon: Users,  c: '#10B981', title: 'Communautés',        desc: 'Groupes thématiques avec trésorerie partagée, cotisations et gouvernance par les membres.' },
    { icon: Calendar, c: '#0EA5E9', title: 'Événements & billets', desc: 'Festivals, expos, conférences — billetterie intégrée, du premier accès au dernier rappel.' },
    { icon: Shield, c: '#8B5CF6', title: 'Monétisation créatrice', desc: 'Abonnements, cadeaux, publicité partagée — les créateurs sont payés directement sur la plateforme.' },
  ];

  return (
    <section id="features" className="gt-section">
      <div className="gt-container">
        <div className="gt-features-grid">
          <div className="gt-features-intro gt-rise">
            <span className="gt-eyebrow">Pourquoi Gofolyx</span>
            <h2 className="gt-display text-3xl sm:text-4xl mt-3 mb-4">
              Une scène,<br />un écran,<br />une seule adresse.
            </h2>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--gt-text-2)' }}>
              Chaque format que tu regardes, chaque scène que tu suis, chaque
              communauté que tu rejoins — au même endroit, avec le même compte.
            </p>
            <ul className="gt-checks">
              {['Gratuit pour commencer', 'Sans publicité intrusive', 'Sur mobile et sur le web'].map(t => (
                <li key={t}><span><Star size={11} fill="currentColor" /></span>{t}</li>
              ))}
            </ul>
            <Link to="/auth/register" className="gt-btn gt-btn-accent mt-6">
              Créer mon compte <ArrowRight size={17} />
            </Link>
          </div>

          <div className="gt-features-list">
            {features.map(({ icon: Icon, c, title, desc }, i) => (
              <div key={title} className="gt-rise gt-feature-card" style={{ transitionDelay: `${i * 60}ms`, ['--c' as any]: c }}>
                <span className="gt-feature-card-num">{String(i + 1).padStart(2, '0')}</span>
                <div className="gt-feature-icon"><Icon size={18} /></div>
                <h3 className="font-semibold text-base mb-1.5">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--gt-text-2)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Social proof ──────────────────────────────────────────────────────────────
function SocialProof() {
  const cards = [
    { name: 'Kouamé A.',  city: 'Abidjan',     text: 'Les concerts live sont incroyables, j\'ai l\'impression d\'y être vraiment présent.' },
    { name: 'Fatou D.',   city: 'Dakar',        text: 'Enfin une plateforme qui regroupe tout — films, concerts, events. Je ne peux plus m\'en passer.' },
    { name: 'Moussa T.',  city: 'Ouagadougou',  text: 'La communauté est top, le contenu de qualité, les reels vraiment addictifs.' },
    { name: 'Aminata B.', city: 'Bamako',       text: 'Interface fluide, concerts live avec le chat en direct — une expérience unique.' },
  ];

  return (
    <section className="gt-section">
      <div className="gt-container">
        <div className="mb-10 gt-rise">
          <span className="gt-eyebrow">Communauté</span>
          <h2 className="gt-display text-2xl sm:text-3xl mt-2">Déjà sur Gofolyx</h2>
        </div>
      </div>
      <div className="gt-marquee gt-rise">
        <div className="gt-marquee-track">
          {[...cards, ...cards].map((r, i) => (
            <figure key={i} className="gt-review" aria-hidden={i >= cards.length}>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} size={13} style={{ color: '#F59E0B' }} fill="#F59E0B" />
                ))}
              </div>
              <blockquote>"{r.text}"</blockquote>
              <figcaption>
                <div className="gt-avatar">{r.name.charAt(0)}</div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{r.name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--gt-text-3)' }}>{r.city}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────
function CtaSection() {
  const { isAuthenticated } = useAuthStore();

  return (
    <section className="gt-section">
      <div className="gt-container gt-rise">
        <div className="gt-cta">
          <p className="gt-eyebrow mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>Rejoins la scène</p>
          <h2 className="gt-display text-2xl sm:text-3xl leading-tight mb-4" style={{ color: 'var(--gt-paper)' }}>
            Prêt à tout vivre en direct ?
          </h2>
          <p className="text-base mb-9 max-w-lg mx-auto" style={{ color: 'rgba(245,244,242,0.65)' }}>
            Rejoins des milliers d'utilisateurs qui vivent la musique, le cinéma et les événements en direct.
          </p>
          {isAuthenticated ? (
            <Link to="/feed" className="gt-btn gt-btn-accent">
              Accéder à mon espace <ArrowRight size={17} />
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/auth/register" className="gt-btn gt-btn-accent">
                Commencer gratuitement <ArrowRight size={17} />
              </Link>
              <Link to="/auth/login" className="gt-btn gt-btn-ghost-invert">
                Déjà un compte ? →
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Footer — un seul composant réutilisé par toutes les pages "gate" ─────────
export function GateFooter() {
  const { isAuthenticated } = useAuthStore();
  const cols = [
    { title: 'Explorer', links: [
      { label: 'Films',      href: '/explore/films'    },
      { label: 'Séries',     href: '/explore/series'   },
      { label: 'Concerts',   href: '/explore/concerts' },
      { label: 'Événements', href: '/explore/events'   },
    ]},
    { title: 'Compte', links: [
      { label: 'Se connecter', href: '/auth/login'    },
      { label: "S'inscrire",   href: '/auth/register' },
    ]},
    { title: 'Gofolyx', links: [
      { label: 'À propos', href: '/a-propos' },
      { label: 'Blog',     href: '/blog'     },
      { label: 'Support',  href: '/support'  },
    ]},
  ];

  return (
    <footer className="gt-footer">
      <div className="gt-footer-glow" aria-hidden="true" />
      <div className="gt-container gt-footer-inner">
        <div className="gt-footer-top">
          <h3 className="gt-display gt-footer-big">
            La scène, l'écran et le direct — <em>réunis</em>.
          </h3>
          {!isAuthenticated && (
            <Link to="/auth/register" className="gt-btn gt-btn-accent">
              Rejoindre Gofolyx <ArrowRight size={17} />
            </Link>
          )}
        </div>

        <div className="gt-footer-grid">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <GateLogo size={30} />
              <span className="gt-display text-base">Gofolyx</span>
            </div>
            <p className="text-sm leading-relaxed max-w-[240px]" style={{ color: 'var(--gt-text-3)' }}>
              Concerts live, films, séries, reels et communautés — un seul endroit, un seul compte.
            </p>
          </div>
          {cols.map(col => (
            <div key={col.title}>
              <span className="gt-eyebrow gt-footer-col-title block">{col.title}</span>
              <div className="gt-footer-links">
                {col.links.map(({ label, href }) => (
                  <Link key={label} to={href}><span>{label}</span><ArrowUpRight size={13} /></Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="gt-footer-bottom">
          <p>© 2026 Gofolyx. Tous droits réservés.</p>
          <div className="gt-footer-legal">
            {[
              { label: 'Confidentialité', href: '/politique-confidentialite' },
              { label: 'Conditions',      href: '/cgu'                       },
              { label: 'Cookies',         href: '/cookies'                   },
            ].map(({ label, href }) => (
              <Link key={label} to={href} className="transition-colors">{label}</Link>
            ))}
          </div>
          <button type="button" className="gt-totop" aria-label="Retour en haut"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
      <div className="gt-footer-mark" aria-hidden="true">Gofolyx</div>
    </footer>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [films,    setFilms]    = useState<Content[]>([]);
  const [series,   setSeries]   = useState<Content[]>([]);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [events,   setEvents]   = useState<Event[]>([]);
  const [loading,  setLoading]  = useState(true);

  useScrollReveal();

  useEffect(() => {
    Promise.allSettled([
      publicClient.get<any>(`${Endpoints.content.films}?page=1&limit=8&status=published`)
        .then(r => setFilms(r.data?.items ?? [])),
      publicClient.get<any>(`${Endpoints.content.series}?page=1&limit=8&status=published`)
        .then(r => setSeries(r.data?.items ?? [])),
      publicClient.get<any>(`${Endpoints.concerts.list}?page=1&limit=6&status=published&originals_only=true`)
        .then(r => setConcerts(Array.isArray(r.data) ? r.data : (r.data?.items ?? []))),
      publicClient.get<any>(`${Endpoints.events.list}?page=1&limit=6&status=published&originals_only=true`)
        .then(r => setEvents(sortEventsByProximity<Event>(Array.isArray(r.data) ? r.data : (r.data?.items ?? [])))),
    ]).finally(() => setLoading(false));
  }, []);

  const contentTile = (kind: 'films' | 'series') => (c: Content): BentoTile => ({
    key: c.id, title: c.title, image: c.thumbnail_url,
    chip: c.year ? String(c.year) : null,
    badge: c.rating != null ? <><Star size={12} fill="#fff" /> {Number(c.rating).toFixed(1)}</> : null,
    icon: <Film size={40} />,
    onClick: () => navigate(`/explore/${kind}/${encodeId(c.id)}`),
  });
  const filmTiles = films.map(contentTile('films'));
  const serieTiles = series.map(contentTile('series'));
  const concertTiles: BentoTile[] = concerts.map(c => ({
    key: c.id, title: c.title, image: c.thumbnail_url,
    chip: c.artist?.display_name ?? c.artist?.username ?? null,
    badge: c.status === 'live' ? <><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> EN DIRECT</>
      : (new Date(c.scheduled_at) <= new Date() && new Date() <= getConcertEnd(c)) ? <><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> EN COURS</> : null,
    icon: <Music2 size={40} />,
    onClick: () => navigate(`/explore/concerts/${encodeId(c.id)}`),
  }));
  const eventTiles: BentoTile[] = events.map(e => {
    const d = new Date(e.starts_at);
    return {
      key: e.id, title: e.title, image: e.thumbnail_url,
      chip: [isMultiDay(d, e.ends_at ? new Date(e.ends_at) : null) ? formatDateRange(d, new Date(e.ends_at!)) : d.toLocaleDateString('fr', { day: '2-digit', month: 'short' }), e.venue_city].filter(Boolean).join(' · '),
      badge: getEventTiming(e).label,
      icon: <Calendar size={40} />,
      onClick: () => navigate(`/explore/events/${encodeId(e.id)}`),
    };
  });

  return (
    <div className="gate-page relative min-h-screen">
      <GateHeader />
      <HeroSection films={films} concerts={concerts} />
      <StickerStrip />

      <div id="discover">
        <section id="films" className="gt-section" style={{ paddingBottom: 0 }}>
          <div className="gt-container">
            <SectionHeader index="Cinéma" title="Films en vedette" sub="Sans inscription requise" seeAllHref="/explore/films" />
            {loading ? <BentoSkeleton /> : films.length === 0 ? <EmptyRow /> : <BentoRail tiles={filmTiles} />}
          </div>
        </section>

        <section className="gt-section">
          <div className="gt-container">
            <SectionHeader index="Séries" title="Séries populaires" sub="Des saisons entières à explorer" seeAllHref="/explore/series" />
            {loading ? <BentoSkeleton /> : series.length === 0 ? <EmptyRow /> : <BentoRail tiles={serieTiles} />}
          </div>
        </section>

        <section id="concerts" className="gt-section">
          <div className="gt-container">
            <SectionHeader index="Live" title="Concerts & lives" sub="La musique en temps réel" seeAllHref="/explore/concerts" />
            {loading ? <BentoSkeleton /> : concerts.length === 0 ? <EmptyRow /> : <BentoRail tiles={concertTiles} />}
          </div>
        </section>

        <section id="events" className="gt-section">
          <div className="gt-container">
            <SectionHeader index="Événements" title="À ne pas manquer" sub="Festivals, conférences, expositions" seeAllHref="/explore/events" />
            {loading ? <BentoSkeleton /> : events.length === 0 ? <EmptyRow /> : <BentoRail tiles={eventTiles} />}
          </div>
        </section>
      </div>

      <FeaturesSection />
      <SocialProof />
      <CtaSection />
      <GateFooter />
    </div>
  );
}
