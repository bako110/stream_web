import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { encodeId } from '../utils/slugId';
import {
  Play, Music2, Calendar, Users, ArrowRight, ArrowUpRight,
  Menu, X, MapPin, Star, Ticket, Radio, Film, Shield,
} from 'lucide-react';
import { publicClient } from '../api';
import { Endpoints } from '../api/endpoints';
import type { Concert, Content, Event } from '../types';
import { useAuthStore } from '../store/authStore';
import { GateLogo } from '../components/ui/GateLogo';
import { STICKERS } from '../components/ui/Stickers';
import { ShowcaseSlideshow } from '../components/ui/ShowcaseSlideshow';
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
  const navigate = useNavigate();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    fn();
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <>
      <header className={`gt-header${scrolled ? ' is-scrolled' : ''}`}>
        <div className="gt-container gt-header-inner">
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
        <div className="md:!hidden fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--gt-bg)', top: 72 }}>
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
function HeroSection({ films, concerts }: { films: Content[]; concerts: Concert[] }) {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [imgErr, setImgErr] = useState(false);

  const banner = concerts[0] ?? films[0];

  return (
    <section className="gt-hero">
      <div className="gt-container">
        <div className="gt-hero-intro">
          <div className="gt-rise flex items-center justify-center gap-2 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inset-0 rounded-full" style={{ background: 'var(--gt-accent)', opacity: 0.6 }} />
              <span className="relative rounded-full h-2 w-2 inline-block" style={{ background: 'var(--gt-accent)' }} />
            </span>
            <span className="gt-eyebrow">
              En direct maintenant · {concerts.length > 0 ? `${concerts.length} lives` : 'reels, films, concerts'}
            </span>
          </div>

          <h1 className="gt-display gt-rise text-[2.6rem] sm:text-[4rem] lg:text-[4.6rem] leading-[1.05] mb-7"
            style={{ animationDelay: '80ms' }}>
            Tout se passe, en <span style={{ color: 'var(--gt-accent)' }}>direct</span>.
          </h1>

          <p className="text-lg leading-relaxed max-w-xl mx-auto mb-9 gt-rise" style={{ color: 'var(--gt-text-2)', animationDelay: '160ms' }}>
            Concerts live, films, séries, reels et communautés — un seul endroit pour
            vivre la scène, l'écran et le direct, où que tu sois.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-12 gt-rise" style={{ animationDelay: '240ms' }}>
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

        <div className="gt-hero-banner gt-rise" style={{ animationDelay: '200ms' }}>
          {banner?.thumbnail_url && !imgErr ? (
            <img src={banner.thumbnail_url} alt="" onError={() => setImgErr(true)} />
          ) : (
            <div className="gt-hero-banner-fallback"><Play size={40} /></div>
          )}
          <div className="gt-hero-banner-scrim" />
          <div className="gt-stat-row gt-hero-banner-stats">
            {[['500+', 'Films & séries'], ['200+', 'Concerts live'], ['1 000+', 'Communautés']].map(([n, l]) => (
              <div key={l}>
                <p className="gt-stat-value">{n}</p>
                <p className="gt-stat-label">{l}</p>
              </div>
            ))}
          </div>
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
        <span className="gt-showcase-cta">Regarder <ArrowUpRight size={14} /></span>
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
          <span className="gt-showcase-price"><Ticket size={13} /> {concert.ticket_price === 0 ? 'Gratuit' : `${concert.ticket_price}€`}</span>
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

  return (
    <div className="gt-showcase-card" onClick={onClick}>
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
        <div className="gt-showcase-overlay">
          <p className="gt-showcase-title truncate">{event.title}</p>
          {location && <p className="gt-showcase-sub truncate"><MapPin size={12} /> {location}</p>}
        </div>
      </div>
      <div className="gt-showcase-footer">
        <span className="gt-showcase-meta"><Calendar size={13} /> Billetterie intégrée</span>
        {event.ticket_price != null ? (
          <span className="gt-showcase-price">{event.ticket_price === 0 ? 'Gratuit' : `${event.ticket_price}€`}</span>
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
    { icon: Radio,  title: 'Concerts en direct', desc: 'Live streaming HD, chat en temps réel, cadeaux virtuels pour soutenir les artistes pendant le show.' },
    { icon: Play,   title: 'Films & séries',     desc: 'Un catalogue en streaming HD, sous-titré, accessible sans interruption publicitaire.' },
    { icon: Film,   title: 'Reels & stories',    desc: 'Formats courts pour découvrir les créateurs et partager tes propres moments en quelques secondes.' },
    { icon: Users,  title: 'Communautés',        desc: 'Groupes thématiques avec trésorerie partagée, cotisations et gouvernance par les membres.' },
    { icon: Calendar, title: 'Événements & billets', desc: 'Festivals, expos, conférences — billetterie intégrée, du premier accès au dernier rappel.' },
    { icon: Shield, title: 'Monétisation créatrice', desc: 'Abonnements, cadeaux, publicité partagée — les créateurs sont payés directement sur la plateforme.' },
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
          </div>

          <div className="gt-features-list">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="gt-rise gt-feature-card" style={{ animationDelay: `${i * 60}ms` }}>
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
        <div className="gt-grid gt-grid-wide">
          {cards.map((r, i) => (
            <div key={r.name} className="gt-tile gt-rise" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="gt-testimonial">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} size={12} style={{ color: 'var(--gt-accent)' }} fill="var(--gt-accent)" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--gt-text-2)' }}>"{r.text}"</p>
                <div className="flex items-center gap-2.5">
                  <div className="gt-avatar">{r.name.charAt(0)}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{r.name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--gt-text-3)' }}>{r.city}</p>
                  </div>
                </div>
              </div>
            </div>
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
      <div className="gt-container">
        <div className="gt-footer-grid">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <GateLogo size={30} />
              <span className="gt-display text-base">Gofolyx</span>
            </div>
            <p className="text-sm leading-relaxed max-w-[220px]" style={{ color: 'var(--gt-text-3)' }}>
              La scène, l'écran et le direct — réunis en un seul endroit.
            </p>
          </div>
          {cols.map(col => (
            <div key={col.title}>
              <span className="gt-eyebrow gt-footer-col-title block">{col.title}</span>
              <div className="gt-footer-links">
                {col.links.map(({ label, href }) => (
                  <Link key={label} to={href}>{label}</Link>
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
        </div>
      </div>
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
      publicClient.get<any>(`${Endpoints.concerts.list}?page=1&limit=6&status=published`)
        .then(r => setConcerts(Array.isArray(r.data) ? r.data : (r.data?.items ?? []))),
      publicClient.get<any>(`${Endpoints.events.list}?page=1&limit=6&status=published`)
        .then(r => setEvents(Array.isArray(r.data) ? r.data : (r.data?.items ?? []))),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <div className="gate-page relative min-h-screen">
      <GateHeader />
      <HeroSection films={films} concerts={concerts} />
      <StickerStrip />

      <div id="discover">
        <section id="films" className="gt-section" style={{ paddingBottom: 0 }}>
          <div className="gt-container">
            <SectionHeader index="Cinéma" title="Films en vedette" sub="Sans inscription requise" seeAllHref="/explore/films" />
            {loading ? <ShowcaseSkeleton />
              : films.length === 0 ? <EmptyRow />
              : <ShowcaseSlideshow
                  items={films}
                  getKey={f => f.id}
                  renderItem={f => <FilmShowcase item={f} onClick={() => navigate(`/explore/films/${encodeId(f.id)}`)} />}
                />}
          </div>
        </section>

        <section className="gt-section">
          <div className="gt-container">
            <SectionHeader index="Séries" title="Séries populaires" sub="Des saisons entières à explorer" seeAllHref="/explore/series" />
            {loading ? <ShowcaseSkeleton />
              : series.length === 0 ? <EmptyRow />
              : <ShowcaseSlideshow
                  items={series}
                  getKey={s => s.id}
                  renderItem={s => <FilmShowcase item={s} onClick={() => navigate(`/explore/series/${encodeId(s.id)}`)} />}
                />}
          </div>
        </section>

        <section id="concerts" className="gt-section">
          <div className="gt-container">
            <SectionHeader index="Live" title="Concerts & lives" sub="La musique en temps réel" seeAllHref="/explore/concerts" />
            {loading ? <ShowcaseSkeleton />
              : concerts.length === 0 ? <EmptyRow />
              : <ShowcaseSlideshow
                  items={concerts}
                  getKey={c => c.id}
                  renderItem={c => <ConcertShowcase concert={c} onClick={() => navigate(`/explore/concerts/${encodeId(c.id)}`)} />}
                />}
          </div>
        </section>

        <section id="events" className="gt-section">
          <div className="gt-container">
            <SectionHeader index="Événements" title="À ne pas manquer" sub="Festivals, conférences, expositions" seeAllHref="/explore/events" />
            {loading ? <ShowcaseSkeleton />
              : events.length === 0 ? <EmptyRow />
              : <ShowcaseSlideshow
                  items={events}
                  getKey={e => e.id}
                  renderItem={e => <EventShowcase event={e} onClick={() => navigate(`/explore/events/${encodeId(e.id)}`)} />}
                />}
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
