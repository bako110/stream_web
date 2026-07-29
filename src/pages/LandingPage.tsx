import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { encodeId } from '../utils/slugId';
import {
  Play, Radio, Music2, Calendar, Users, ArrowRight, ArrowUpRight,
  Sun, Moon, Menu, X, MapPin, Star, Eye, Zap, Shield, Ticket,
} from 'lucide-react';
import { publicClient } from '../api';
import { Endpoints } from '../api/endpoints';
import type { Concert, Content, Event } from '../types';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { Images } from '../components/assets';
import './landing.css';

// ── Scroll reveal ─────────────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.lp-rise');
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' },
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  });
}

// ── Logo rond réutilisable ────────────────────────────────────────────────────
function RoundLogo({ size = 40 }: { size?: number }) {
  const { isDark } = useThemeStore();
  const border = Math.max(2, Math.round(size * 0.04));
  return (
    <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
      <div style={{
        position: 'relative', width: size, height: size, borderRadius: '50%', padding: border,
        background: 'linear-gradient(135deg, #7B3FF2, #A67CF7)',
        flexShrink: 0,
      }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          background: isDark ? '#0A0812' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>
          <img
            src={isDark ? Images.logoDark : Images.logoLight}
            alt="GoFolyX"
            style={{ width: '78%', height: '78%', objectFit: 'contain', display: 'block' }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  const { isAuthenticated } = useAuthStore();
  const { isDark, toggle }  = useThemeStore();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const navLinks = [
    { label: 'Films & Séries', href: '/explore/films'    },
    { label: 'Concerts',       href: '/explore/concerts' },
    { label: 'Événements',     href: '/explore/events'   },
    { label: 'Pourquoi GoFolyX', href: '#features'        },
  ];

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled ? 'var(--lp-bg)' : 'transparent',
          borderBottom: scrolled ? '1px solid var(--lp-line)' : '1px solid transparent',
        }}
      >
        <div className="w-full mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <RoundLogo size={38} />
            <span className="lp-display text-lg" style={{ color: 'var(--lp-ink-text)' }}>GoFolyX</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ label, href }) => href.startsWith('#') ? (
              <a key={href} href={href}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200"
                style={{ color: 'var(--lp-ink-text-2)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--lp-ink-text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--lp-ink-text-2)')}
              >{label}</a>
            ) : (
              <Link key={href} to={href}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200"
                style={{ color: 'var(--lp-ink-text-2)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--lp-ink-text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--lp-ink-text-2)')}
              >{label}</Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="p-2.5 rounded-full transition-colors duration-200"
              style={{ color: 'var(--lp-ink-text-3)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--lp-ink-text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--lp-ink-text-3)')}
              title={isDark ? 'Mode clair' : 'Mode sombre'}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {isAuthenticated ? (
              <button onClick={() => navigate('/feed')}
                className="text-sm font-bold px-5 py-2.5 rounded-full text-white"
                style={{ background: 'var(--lp-violet)' }}>
                Mon espace
              </button>
            ) : (
              <>
                <Link to="/auth/login"
                  className="hidden sm:block text-sm font-medium px-4 py-2"
                  style={{ color: 'var(--lp-ink-text-2)' }}>
                  Connexion
                </Link>
                <Link to="/auth/register"
                  className="text-sm font-bold px-5 py-2.5 rounded-full text-white"
                  style={{ background: 'var(--lp-violet)' }}>
                  S'inscrire
                </Link>
              </>
            )}

            <button onClick={() => setMenuOpen(v => !v)} className="md:hidden p-2.5" style={{ color: 'var(--lp-ink-text)' }}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--lp-bg)' }}>
          <div className="flex items-center justify-between px-5 h-16 shrink-0" style={{ borderBottom: '1px solid var(--lp-line)' }}>
            <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5">
              <RoundLogo size={34} />
              <span className="lp-display text-base" style={{ color: 'var(--lp-ink-text)' }}>GoFolyX</span>
            </Link>
            <button onClick={() => setMenuOpen(false)} style={{ color: 'var(--lp-ink-text)' }}><X size={24} /></button>
          </div>
          <nav className="flex flex-col px-6 pt-6 gap-1">
            {navLinks.map(({ label, href }) => href.startsWith('#') ? (
              <a key={href} href={href} onClick={() => setMenuOpen(false)}
                className="py-4 text-xl lp-display transition-colors duration-200"
                style={{ color: 'var(--lp-ink-text)', borderBottom: '1px solid var(--lp-line)' }}
              >{label}</a>
            ) : (
              <Link key={href} to={href} onClick={() => setMenuOpen(false)}
                className="py-4 text-xl lp-display transition-colors duration-200"
                style={{ color: 'var(--lp-ink-text)', borderBottom: '1px solid var(--lp-line)' }}
              >{label}</Link>
            ))}
          </nav>
          {!isAuthenticated && (
            <div className="px-6 pt-8 flex flex-col gap-3">
              <Link to="/auth/register"
                className="text-base text-center py-3.5 rounded-full font-bold text-white"
                style={{ background: 'var(--lp-violet)' }}
                onClick={() => setMenuOpen(false)}>
                S'inscrire
              </Link>
              <Link to="/auth/login"
                className="text-base text-center py-3.5 rounded-full font-medium"
                style={{ color: 'var(--lp-ink-text)', border: '1px solid var(--lp-line)' }}
                onClick={() => setMenuOpen(false)}>
                Connexion
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Hero — split asymétrique, mur d'affiches à droite ─────────────────────────
function HeroSection({ films, concerts }: { films: Content[]; concerts: Concert[] }) {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const posterA = films[0];
  const posterB = concerts[0];
  const posterC = films[1];

  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      <div className="w-full mx-auto lp-hero-grid">
        {/* ── Colonne texte ── */}
        <div>
          <div className="lp-rise flex items-center gap-2 mb-7">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inset-0 rounded-full" style={{ background: 'var(--lp-amber)', opacity: 0.7 }} />
              <span className="relative rounded-full h-2 w-2 inline-block" style={{ background: 'var(--lp-amber)' }} />
            </span>
            <span className="lp-eyebrow" style={{ color: 'var(--lp-ink-text-3)' }}>
              En direct maintenant · {concerts.length > 0 ? `${concerts.length} lives` : 'reels, films, concerts'}
            </span>
          </div>

          <h1 className="text-[2.6rem] sm:text-[3.4rem] lg:text-[3.8rem] font-semibold leading-[1.08] tracking-tight mb-7 lp-rise"
            style={{ color: 'var(--lp-ink-text)', animationDelay: '80ms' }}>
            Tout se passe, en <span style={{ color: 'var(--lp-violet)' }}>direct</span>.
          </h1>

          <p className="text-lg leading-relaxed max-w-md mb-9 lp-rise" style={{ color: 'var(--lp-ink-text-2)', animationDelay: '160ms' }}>
            Concerts live, films, séries, reels et communautés — un seul pass pour vivre
            la scène, l'écran et le direct, où que tu sois.
          </p>

          <div className="flex flex-wrap items-center gap-4 mb-14 lp-rise" style={{ animationDelay: '240ms' }}>
            {isAuthenticated ? (
              <button onClick={() => navigate('/feed')}
                className="inline-flex items-center gap-2.5 text-white font-bold px-7 py-4 rounded-full text-base"
                style={{ background: 'var(--lp-violet)', boxShadow: '0 12px 32px rgba(123,63,242,0.35)' }}>
                Mon espace <ArrowRight size={18} />
              </button>
            ) : (
              <>
                <Link to="/auth/register"
                  className="inline-flex items-center gap-2.5 text-white font-bold px-7 py-4 rounded-full text-base"
                  style={{ background: 'var(--lp-violet)', boxShadow: '0 12px 32px rgba(123,63,242,0.35)' }}>
                  Rejoindre GoFolyX <ArrowRight size={18} />
                </Link>
                <a href="#discover"
                  className="inline-flex items-center gap-2.5 font-bold px-7 py-4 rounded-full text-base"
                  style={{ color: 'var(--lp-ink-text)', border: '1.5px solid var(--lp-line)' }}>
                  <Play size={16} /> Explorer sans compte
                </a>
              </>
            )}
          </div>

          <div className="flex items-center gap-8 lp-rise" style={{ animationDelay: '320ms' }}>
            {[['500+', 'Films & séries'], ['200+', 'Concerts live'], ['1 000+', 'Communautés']].map(([n, l]) => (
              <div key={l}>
                <p className="lp-display text-2xl" style={{ color: 'var(--lp-ink-text)' }}>{n}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--lp-ink-text-3)' }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Mur d'affiches ── */}
        <div className="lp-poster-stack hidden lg:block lp-rise" style={{ animationDelay: '200ms' }}>
          {posterB && (
            <div className="lp-stub rounded-2xl overflow-hidden shadow-2xl"
              style={{ width: 260, height: 330, top: 0, right: 40, transform: 'rotate(-4deg)', background: 'var(--lp-surface)' }}>
              <div className="relative w-full h-full">
                {posterB.thumbnail_url
                  ? <img src={posterB.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7B3FF2,#3C1F80)' }}><Music2 size={40} className="text-white/50" /></div>}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,8,18,0.85), transparent 55%)' }} />
                {posterB.status === 'live' && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-xs font-bold uppercase tracking-wider"
                    style={{ background: 'var(--lp-amber)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live
                  </div>
                )}
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-white font-bold text-sm truncate">{posterB.title}</p>
                </div>
              </div>
            </div>
          )}
          {posterA && (
            <div className="rounded-2xl overflow-hidden shadow-2xl"
              style={{ width: 210, aspectRatio: '2/3', top: 140, left: 0, transform: 'rotate(3deg)', background: 'var(--lp-surface)' }}>
              {posterA.thumbnail_url
                ? <img src={posterA.thumbnail_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#5B2EC4,#0A0812)' }}><Play size={32} className="text-white/50" /></div>}
            </div>
          )}
          {posterC && (
            <div className="rounded-2xl overflow-hidden shadow-2xl"
              style={{ width: 170, aspectRatio: '2/3', bottom: 0, right: 0, transform: 'rotate(-2deg)', background: 'var(--lp-surface)' }}>
              {posterC.thumbnail_url
                ? <img src={posterC.thumbnail_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#A67CF7,#7B3FF2)' }}><Play size={28} className="text-white/60" /></div>}
            </div>
          )}
          {/* Glow violet derrière la pile */}
          <div className="absolute rounded-full pointer-events-none" style={{
            width: 340, height: 340, top: 100, right: -40, zIndex: -1,
            background: 'radial-gradient(circle, rgba(123,63,242,0.22), transparent 70%)', filter: 'blur(40px)',
          }} />
        </div>
      </div>
    </section>
  );
}

// ── Section header — rule + label, pas de carte flottante ─────────────────────
function SectionHeader({ index, title, sub, seeAllHref }: {
  index: string; title: string; sub?: string; seeAllHref?: string;
}) {
  return (
    <div className="w-full mx-auto px-6 mb-7 lp-rise">
      <div className="lp-rule mb-3">
        <span className="lp-eyebrow shrink-0" style={{ color: 'var(--lp-violet)' }}>{index}</span>
      </div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="lp-display text-3xl md:text-4xl" style={{ color: 'var(--lp-ink-text)' }}>{title}</h2>
          {sub && <p className="mt-1.5 text-sm" style={{ color: 'var(--lp-ink-text-2)' }}>{sub}</p>}
        </div>
        {seeAllHref && (
          <Link to={seeAllHref}
            className="shrink-0 flex items-center gap-1.5 text-sm font-bold transition-transform hover:translate-x-1"
            style={{ color: 'var(--lp-violet)' }}>
            Tout voir <ArrowUpRight size={15} />
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Poster card (film / série) ────────────────────────────────────────────────
function PosterCard({ item, onClick }: { item: Content; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div className="shrink-0 group cursor-pointer" style={{ width: 168 }} onClick={onClick}>
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden transition-transform duration-500 group-hover:-translate-y-2"
        style={{ background: 'var(--lp-surface)', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
        {item.thumbnail_url && !imgErr ? (
          <img src={item.thumbnail_url} alt={item.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#5B2EC4,#0A0812)' }}>
            <Play size={26} className="text-white/50" />
          </div>
        )}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
          style={{ background: 'rgba(10,8,18,0.4)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--lp-amber)' }}>
            <Play size={15} className="text-white" fill="white" style={{ marginLeft: 1 }} />
          </div>
        </div>
        {item.rating != null && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold text-white"
            style={{ background: 'rgba(10,8,18,0.65)' }}>
            <Star size={9} fill="var(--lp-amber)" style={{ color: 'var(--lp-amber)' }} />
            {Number(item.rating).toFixed(1)}
          </div>
        )}
      </div>
      <p className="mt-2.5 text-sm font-semibold truncate" style={{ color: 'var(--lp-ink-text)' }}>{item.title}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--lp-ink-text-3)' }}>{item.year}</p>
    </div>
  );
}

// ── Concert card — ticket-stub ────────────────────────────────────────────────
function ConcertCard({ concert, onClick }: { concert: Concert; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const isLive = concert.status === 'live';
  const artistName = concert.artist?.display_name ?? concert.artist?.username;

  return (
    <div className="lp-stub shrink-0 cursor-pointer group transition-transform duration-500 hover:-translate-y-2"
      style={{ width: 300, background: 'var(--lp-surface)', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}
      onClick={onClick}>
      <div className="relative h-44 overflow-hidden">
        {concert.thumbnail_url && !imgErr ? (
          <img src={concert.thumbnail_url} alt={concert.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7B3FF2,#3C1F80)' }}>
            <Music2 size={34} className="text-white/50" />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,8,18,0.8) 30%, transparent)' }} />
        {isLive && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-xs font-bold uppercase tracking-wider"
            style={{ background: 'var(--lp-amber)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live
          </div>
        )}
        <div className="absolute bottom-3 left-4 right-4">
          <p className="font-bold text-white text-base leading-tight truncate">{concert.title}</p>
          {artistName && <p className="text-white/65 text-xs mt-0.5">{artistName}</p>}
        </div>
      </div>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: '1px dashed var(--lp-line)' }}>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--lp-ink-text-3)' }}>
          <Eye size={12} /> {(concert.current_viewers ?? 0).toLocaleString()} spectateurs
        </div>
        {concert.ticket_price != null && (
          <span className="flex items-center gap-1 text-sm font-bold" style={{ color: 'var(--lp-violet)' }}>
            <Ticket size={13} /> {concert.ticket_price === 0 ? 'Gratuit' : `${concert.ticket_price}€`}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Event card ────────────────────────────────────────────────────────────────
function EventCard({ event, onClick }: { event: Event; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const date = new Date(event.starts_at);
  const dd = date.getDate().toString().padStart(2, '0');
  const mo = date.toLocaleString('fr', { month: 'short' }).toUpperCase();
  const location = [event.venue_name, event.venue_city].filter(Boolean).join(', ');

  return (
    <div className="shrink-0 cursor-pointer group flex rounded-2xl overflow-hidden transition-transform duration-500 hover:-translate-y-2"
      style={{ width: 320, background: 'var(--lp-surface)', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}
      onClick={onClick}>
      <div className="w-16 shrink-0 flex flex-col items-center justify-center py-4"
        style={{ background: 'var(--lp-violet)' }}>
        <span className="lp-display text-2xl text-white leading-none">{dd}</span>
        <span className="text-[10px] font-bold tracking-widest mt-1 text-white/80">{mo}</span>
      </div>
      <div className="relative flex-1 overflow-hidden" style={{ minHeight: 116 }}>
        {event.thumbnail_url && !imgErr ? (
          <img src={event.thumbnail_url} alt={event.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#5B2EC4,#0A0812)' }}>
            <Calendar size={26} className="text-white/40" />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, transparent 15%, rgba(10,8,18,0.7))' }} />
        <div className="absolute inset-0 p-3.5 flex flex-col justify-end">
          <p className="font-bold text-white text-sm leading-tight line-clamp-2">{event.title}</p>
          {location && (
            <div className="flex items-center gap-1 text-xs mt-1 text-white/60">
              <MapPin size={10} /> {location}
            </div>
          )}
          {event.ticket_price != null && (
            <span className="lp-amber-text text-xs font-bold mt-1.5">
              {event.ticket_price === 0 ? 'Gratuit' : `${event.ticket_price}€`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Rangée scrollable manuellement (sans auto-scroll — plus lisible, plus pro) ─
function ScrollRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-5 overflow-x-auto px-6 pb-4" style={{ scrollbarWidth: 'none' }}>
      {children}
    </div>
  );
}

// ── Marquee — bandeau plein, fond violet, sur une ligne ───────────────────────
function MarqueeBanner() {
  const tags = ['Reels', 'Concerts live', 'Films', 'Séries', 'Communautés', 'Cadeaux virtuels', 'Billetterie', 'Monétisation créateur', 'Trésorerie', 'Événements'];
  const doubled = [...tags, ...tags];

  return (
    <div className="relative py-4 overflow-hidden my-16" style={{ background: 'var(--lp-violet)' }}>
      <div className="lp-marquee-track">
        {doubled.map((tag, i) => (
          <span key={i} className="inline-flex items-center mx-5 lp-display text-sm text-white/90">
            {tag} <span className="mx-5 text-white/40">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Features — liste numérotée, pas de grille de cartes iconées ──────────────
function FeaturesSection() {
  const features = [
    { n: '01', icon: Radio,  title: 'Concerts en direct', desc: 'Live streaming HD, chat en temps réel, cadeaux virtuels pour soutenir les artistes pendant le show.' },
    { n: '02', icon: Play,   title: 'Films & séries',     desc: 'Un catalogue en streaming HD, sous-titré, accessible sans interruption publicitaire.' },
    { n: '03', icon: Zap,    title: 'Reels & stories',    desc: 'Formats courts pour découvrir les créateurs et partager tes propres moments en quelques secondes.' },
    { n: '04', icon: Users,  title: 'Communautés',        desc: 'Groupes thématiques avec trésorerie partagée, cotisations et gouvernance par les membres.' },
    { n: '05', icon: Calendar, title: 'Événements & billets', desc: 'Festivals, expos, conférences — billetterie intégrée, du premier accès au dernier rappel.' },
    { n: '06', icon: Shield, title: 'Monétisation créatrice', desc: 'Abonnements, cadeaux, publicité partagée — les créateurs sont payés directement sur la plateforme.' },
  ];

  return (
    <section id="features" className="py-24 px-6">
      <div className="w-full mx-auto">
        <div className="mb-16 lp-rise">
          <div className="lp-rule mb-4"><span className="lp-eyebrow shrink-0" style={{ color: 'var(--lp-violet)' }}>Pourquoi GoFolyX</span></div>
          <h2 className="lp-display text-4xl md:text-5xl" style={{ color: 'var(--lp-ink-text)' }}>Une scène, un écran,<br />une seule adresse.</h2>
        </div>

        <div>
          {features.map(({ n, icon: Icon, title, desc }, i) => (
            <div key={n}
              className="lp-rise flex items-start gap-6 py-7 group"
              style={{ animationDelay: `${i * 60}ms`, borderTop: i === 0 ? '1px solid var(--lp-line)' : undefined, borderBottom: '1px solid var(--lp-line)' }}
            >
              <span className="lp-display text-2xl shrink-0 w-14" style={{ color: 'var(--lp-ink-text-3)' }}>{n}</span>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300"
                style={{ background: 'rgba(123,63,242,0.1)' }}>
                <Icon size={19} style={{ color: 'var(--lp-violet)' }} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--lp-ink-text)' }}>{title}</h3>
                <p className="text-sm leading-relaxed max-w-md" style={{ color: 'var(--lp-ink-text-2)' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Social proof ───────────────────────────────────────────────────────────────
function SocialProof() {
  const cards = [
    { name: 'Kouamé A.',  city: 'Abidjan',     text: 'Les concerts live sont incroyables, j\'ai l\'impression d\'y être vraiment présent.' },
    { name: 'Fatou D.',   city: 'Dakar',        text: 'Enfin une plateforme qui regroupe tout — films, concerts, events. Je ne peux plus m\'en passer.' },
    { name: 'Moussa T.',  city: 'Ouagadougou',  text: 'La communauté est top, le contenu de qualité, les reels vraiment addictifs.' },
    { name: 'Aminata B.', city: 'Bamako',       text: 'Interface fluide, concerts live avec le chat en direct — une expérience unique.' },
  ];

  return (
    <section className="py-20 px-6">
      <div className="w-full mx-auto">
        <div className="mb-12 lp-rise">
          <div className="lp-rule mb-4"><span className="lp-eyebrow shrink-0" style={{ color: 'var(--lp-violet)' }}>Communauté</span></div>
          <h2 className="lp-display text-3xl md:text-4xl" style={{ color: 'var(--lp-ink-text)' }}>Déjà sur GoFolyX</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map((r, i) => (
            <div key={r.name}
              className="lp-rise rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${i * 90}ms`, background: 'var(--lp-surface)', border: '1px solid var(--lp-line)' }}
            >
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} size={13} style={{ color: 'var(--lp-amber)' }} fill="var(--lp-amber)" />
                ))}
              </div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--lp-ink-text-2)' }}>"{r.text}"</p>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ background: 'var(--lp-violet)' }}>
                  {r.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--lp-ink-text)' }}>{r.name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--lp-ink-text-3)' }}>{r.city}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA — pleine largeur, fond encre + spot ambre ─────────────────────────────
function CtaSection() {
  const { isAuthenticated } = useAuthStore();

  return (
    <section className="py-24 px-6">
      <div className="w-full mx-auto lp-rise">
        <div className="relative rounded-3xl overflow-hidden px-8 py-16 md:px-16 md:py-20 text-center"
          style={{ background: 'var(--lp-ink)' }}>
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(circle at 20% 20%, rgba(166,124,247,0.18), transparent 55%), radial-gradient(circle at 85% 80%, rgba(123,63,242,0.28), transparent 55%)',
          }} />
          <div className="relative z-10">
            <p className="lp-eyebrow mb-5" style={{ color: 'var(--lp-amber)' }}>Rejoins la scène</p>
            <h2 className="lp-display text-4xl md:text-5xl text-white leading-tight mb-5">
              Prêt à tout vivre<br />en direct ?
            </h2>
            <p className="text-lg mb-10 max-w-lg mx-auto" style={{ color: 'rgba(245,243,250,0.7)' }}>
              Rejoins des milliers d'utilisateurs qui vivent la musique, le cinéma et les événements en direct.
            </p>
            {isAuthenticated ? (
              <Link to="/feed"
                className="inline-flex items-center gap-2 font-bold px-9 py-4 rounded-full text-base transition-transform hover:scale-105"
                style={{ background: 'var(--lp-amber)', color: 'var(--lp-ink)' }}>
                Accéder à mon espace <ArrowRight size={18} />
              </Link>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/auth/register"
                  className="inline-flex items-center gap-2 font-bold px-9 py-4 rounded-full text-base transition-transform hover:scale-105"
                  style={{ background: 'var(--lp-amber)', color: 'var(--lp-ink)' }}>
                  Commencer gratuitement <ArrowRight size={18} />
                </Link>
                <Link to="/auth/login"
                  className="font-medium px-6 py-4 rounded-full transition-colors hover:bg-white/10"
                  style={{ color: 'rgba(245,243,250,0.75)' }}>
                  Déjà un compte ? →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
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
    { title: 'GoFolyX', links: [
      { label: 'À propos', href: '/a-propos' },
      { label: 'Blog',     href: '/blog'     },
    ]},
  ];

  return (
    <footer className="pt-16 pb-8 px-6" style={{ borderTop: '1px solid var(--lp-line)' }}>
      <div className="w-full mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <RoundLogo size={34} />
              <span className="lp-display text-base" style={{ color: 'var(--lp-ink-text)' }}>GoFolyX</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--lp-ink-text-3)' }}>
              La scène, l'écran et le direct — réunis en un seul endroit.
            </p>
          </div>
          {cols.map(col => (
            <div key={col.title}>
              <h4 className="lp-eyebrow mb-4" style={{ color: 'var(--lp-ink-text-3)' }}>{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map(({ label, href }) => (
                  <li key={label}>
                    <Link to={href} className="text-sm transition-colors"
                      style={{ color: 'var(--lp-ink-text-2)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--lp-ink-text)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--lp-ink-text-2)')}
                    >{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs"
          style={{ borderTop: '1px solid var(--lp-line)', color: 'var(--lp-ink-text-3)' }}>
          <p>© 2026 GoFolyX. Tous droits réservés.</p>
          <div className="flex gap-6">
            {[
              { label: 'Confidentialité', href: '/politique-confidentialite' },
              { label: 'Conditions',      href: '/cgu'                       },
              { label: 'Cookies',         href: '/cookies'                   },
            ].map(({ label, href }) => (
              <Link key={label} to={href} className="transition-colors"
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--lp-ink-text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--lp-ink-text-3)')}
              >{label}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Skeleton placeholders ─────────────────────────────────────────────────────
function PlaceholderRow({ count, aspect, width }: { count: number; aspect: string; width: number }) {
  return (
    <div className="flex gap-5 overflow-x-hidden px-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="shrink-0 rounded-2xl animate-pulse"
          style={{ width, aspectRatio: aspect, background: 'var(--lp-surface)' }} />
      ))}
    </div>
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
      publicClient.get<any>(`${Endpoints.content.films}?page=1&limit=12&status=published`)
        .then(r => setFilms(r.data?.items ?? [])),
      publicClient.get<any>(`${Endpoints.content.series}?page=1&limit=12&status=published`)
        .then(r => setSeries(r.data?.items ?? [])),
      publicClient.get<any>(`${Endpoints.concerts.list}?page=1&limit=10&status=published`)
        .then(r => setConcerts(Array.isArray(r.data) ? r.data : (r.data?.items ?? []))),
      publicClient.get<any>(`${Endpoints.events.list}?page=1&limit=10&status=published`)
        .then(r => setEvents(Array.isArray(r.data) ? r.data : (r.data?.items ?? []))),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <div className="landing-v2 relative min-h-screen overflow-x-hidden" style={{ background: 'var(--lp-bg)' }}>
      <div className="lp-grain" />
      <Navbar />
      <HeroSection films={films} concerts={concerts} />

      <div id="discover" className="relative z-10 space-y-16 pb-8">
        <section id="films">
          <SectionHeader index="01 · Cinéma" title="Films en vedette" sub="Sans inscription requise" seeAllHref="/explore/films" />
          {loading
            ? <PlaceholderRow count={8} aspect="2/3" width={168} />
            : films.length === 0
              ? <div className="px-6 py-8 text-center text-sm" style={{ color: 'var(--lp-ink-text-3)' }}>Aucun contenu disponible pour le moment</div>
              : <ScrollRow>{films.map(f => <PosterCard key={f.id} item={f} onClick={() => navigate(`/explore/films/${encodeId(f.id)}`)} />)}</ScrollRow>
          }
        </section>

        <section>
          <SectionHeader index="02 · Séries" title="Séries populaires" sub="Des saisons entières à explorer" seeAllHref="/explore/series" />
          {loading
            ? <PlaceholderRow count={8} aspect="2/3" width={168} />
            : series.length === 0
              ? <div className="px-6 py-8 text-center text-sm" style={{ color: 'var(--lp-ink-text-3)' }}>Aucun contenu disponible pour le moment</div>
              : <ScrollRow>{series.map(s => <PosterCard key={s.id} item={s} onClick={() => navigate(`/explore/series/${encodeId(s.id)}`)} />)}</ScrollRow>
          }
        </section>

        <section id="concerts">
          <SectionHeader index="03 · Live" title="Concerts & lives" sub="La musique en temps réel" seeAllHref="/explore/concerts" />
          {loading
            ? <PlaceholderRow count={5} aspect="16/9" width={300} />
            : concerts.length === 0
              ? <div className="px-6 py-8 text-center text-sm" style={{ color: 'var(--lp-ink-text-3)' }}>Aucun contenu disponible pour le moment</div>
              : <ScrollRow>{concerts.map(c => <ConcertCard key={c.id} concert={c} onClick={() => navigate(`/explore/concerts/${encodeId(c.id)}`)} />)}</ScrollRow>
          }
        </section>

        <section id="events">
          <SectionHeader index="04 · Événements" title="À ne pas manquer" sub="Festivals, conférences, expositions" seeAllHref="/explore/events" />
          {loading
            ? <PlaceholderRow count={5} aspect="16/9" width={320} />
            : events.length === 0
              ? <div className="px-6 py-8 text-center text-sm" style={{ color: 'var(--lp-ink-text-3)' }}>Aucun contenu disponible pour le moment</div>
              : <ScrollRow>{events.map(e => <EventCard key={e.id} event={e} onClick={() => navigate(`/explore/events/${encodeId(e.id)}`)} />)}</ScrollRow>
          }
        </section>
      </div>

      <MarqueeBanner />
      <FeaturesSection />
      <SocialProof />
      <CtaSection />
      <Footer />
    </div>
  );
}
