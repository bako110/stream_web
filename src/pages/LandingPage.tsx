import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { encodeId } from '../utils/slugId';
import {
  Play, Radio, Music2, Calendar, Users, ArrowRight,
  ChevronRight, Zap, Globe, Shield, Sparkles,
  Star, TrendingUp, Eye, Sun, Moon, Menu, X, MapPin,
} from 'lucide-react';
import { publicClient } from '../api';
import { Endpoints } from '../api/endpoints';
import type { Concert, Content, Event } from '../types';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { Images } from '../components/assets';

// ── Scroll reveal ─────────────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.sr,.sr-left,.sr-scale');
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  });
}

// ── Particle canvas — reads theme from CSS vars on every frame ────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isDark } = useThemeStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = (canvas.width  = window.innerWidth);
    let H = (canvas.height = window.innerHeight * 2.5);
    const onResize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight * 2.5;
    };
    window.addEventListener('resize', onResize);

    const COLORS = [
      'rgba(123,63,242,',
      'rgba(224,56,154,',
      'rgba(155,101,245,',
      'rgba(255,122,47,',
      'rgba(54,217,160,',
    ];

    interface P { x:number;y:number;vx:number;vy:number;r:number;color:string;op:number;od:number; }
    const pts: P[] = Array.from({ length: 70 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.2 - 0.05,
      r: Math.random() * 1.8 + 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      op: Math.random() * 0.4 + 0.1,
      od: Math.random() > 0.5 ? 0.002 : -0.002,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const opacity = isDark ? 0.55 : 0.22;
      const lineMax = isDark ? 0.07 : 0.04;

      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.op += p.od;
        if (p.op > 0.55 || p.op < 0.05) p.od *= -1;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + p.op * opacity + ')';
        ctx.fill();
      });

      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d  = Math.sqrt(dx*dx + dy*dy);
          if (d < 110) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(123,63,242,${(1 - d/110) * lineMax})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, [isDark]);   // re-init when theme flips

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

// ── Orbs — opacity adapts to theme ───────────────────────────────────────────
function OrbsBg() {
  const { isDark } = useThemeStore();
  const o = (dark: number, light: number) => isDark ? dark : light;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {[
        { w:700, top:'-200px', left:'-150px',  color:'123,63,242',  dOp:0.18, lOp:0.10, delay:'0s',  blur:60 },
        { w:600, top:'30%',    right:'-180px', color:'224,56,154',  dOp:0.14, lOp:0.07, delay:'3s',  blur:60 },
        { w:500, bottom:'10%', left:'25%',     color:'255,122,47',  dOp:0.10, lOp:0.05, delay:'6s',  blur:80 },
        { w:400, top:'60%',    left:'60%',     color:'54,217,160',  dOp:0.08, lOp:0.04, delay:'9s',  blur:60 },
      ].map(({ w, color, dOp, lOp, delay, blur, ...pos }, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${i % 2 === 0 ? 'animate-float-slow' : i % 3 === 0 ? 'animate-float-fast' : 'animate-float-mid'}`}
          style={{
            width: w, height: w, ...pos,
            background: `radial-gradient(circle at 45% 45%, rgba(${color},${o(dOp, lOp)}), rgba(${color},${o(dOp, lOp) * 0.2}) 60%, transparent)`,
            filter: `blur(${blur}px)`,
            animationDelay: delay,
          }}
        />
      ))}
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  const { isAuthenticated }   = useAuthStore();
  const { isDark, toggle }    = useThemeStore();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate               = useNavigate();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const navLinks = [
    { label: 'Films & Séries', href: '#films'    },
    { label: 'Concerts',       href: '#concerts'  },
    { label: 'Événements',     href: '#events'    },
    { label: 'Fonctionnalités',href: '#features'  },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'glass shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center shrink-0">
          <img src={isDark ? Images.logoDark : Images.logoLight} alt="GoFolix" className="h-10 w-auto" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ label, href }) => (
            <a key={href} href={href}
              className="px-4 py-2 text-sm rounded-lg transition-all duration-200"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = 'var(--text-primary)'; (e.target as HTMLElement).style.background = 'var(--bg-secondary)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = 'var(--text-secondary)'; (e.target as HTMLElement).style.background = 'transparent'; }}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="p-2.5 rounded-xl transition-all duration-200"
            style={{ color: 'var(--text-tertiary)', background: 'transparent' }}
            onMouseEnter={e => { (e.target as HTMLElement).style.background = 'var(--bg-secondary)'; (e.target as HTMLElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; (e.target as HTMLElement).style.color = 'var(--text-tertiary)'; }}
            title={isDark ? 'Mode clair' : 'Mode sombre'}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {isAuthenticated ? (
            <button onClick={() => navigate('/feed')} className="btn-primary text-sm px-5 py-2.5">
              Mon espace
            </button>
          ) : (
            <>
              <Link to="/auth/login"
                className="hidden sm:block text-sm px-4 py-2 rounded-xl transition-all duration-200"
                style={{ color: 'var(--text-secondary)' }}
              >
                Connexion
              </Link>
              <Link to="/auth/register" className="btn-primary text-sm px-5 py-2.5">
                S'inscrire
              </Link>
            </>
          )}

          <button onClick={() => setMenuOpen(v => !v)} className="md:hidden p-2.5" style={{ color: 'var(--text-secondary)' }}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-96' : 'max-h-0'}`}>
        <div className="glass border-t px-6 py-4 space-y-1" style={{ borderColor: 'var(--border)' }}>
          {navLinks.map(({ label, href }) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}
              className="block px-4 py-2.5 text-sm rounded-lg transition-all duration-200"
              style={{ color: 'var(--text-secondary)' }}
            >
              {label}
            </a>
          ))}
          <div className="pt-3 flex gap-3">
            <Link to="/auth/login"    className="flex-1 btn-secondary text-center text-sm">Connexion</Link>
            <Link to="/auth/register" className="flex-1 btn-primary  text-center text-sm">S'inscrire</Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

// ── Typewriter ────────────────────────────────────────────────────────────────
function Typewriter({ words }: { words: string[] }) {
  const [idx,  setIdx]  = useState(0);
  const [text, setText] = useState('');
  const [del,  setDel]  = useState(false);

  useEffect(() => {
    const word  = words[idx % words.length];
    const speed = del ? 38 : 88;
    const t = setTimeout(() => {
      if (!del) {
        setText(word.slice(0, text.length + 1));
        if (text.length + 1 === word.length) setTimeout(() => setDel(true), 1800);
      } else {
        setText(word.slice(0, text.length - 1));
        if (text.length === 0) { setDel(false); setIdx(i => i + 1); }
      }
    }, speed);
    return () => clearTimeout(t);
  }, [text, del, idx, words]);

  return (
    <span className="shimmer-text">
      {text}
      <span className="inline-block w-0.5 h-[0.85em] ml-1 align-middle rounded-sm"
        style={{ background: '#E0389A', animation: 'blink 1s step-end infinite' }} />
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, value, label, color, delay }: {
  icon: React.ElementType; value: string; label: string; color: string; delay: number;
}) {
  return (
    <div
      className="glass-card rounded-2xl px-5 py-4 flex items-center gap-3 animate-reveal-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: color + '22' }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-black leading-none" style={{ color: 'var(--text-primary)' }}>{value}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      </div>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function HeroSection() {
  const { isAuthenticated } = useAuthStore();
  const navigate            = useNavigate();

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-28 pb-20 hero-grid overflow-hidden">
      {/* Bottom fade — uses CSS var so it matches bg */}
      <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none z-10"
        style={{ background: 'linear-gradient(to bottom, transparent, var(--bg))' }} />

      <div className="relative z-10 max-w-5xl mx-auto text-center">

        {/* Badge */}
        <div
          className="inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 mb-10 text-sm font-medium animate-reveal-up"
          style={{
            background: 'linear-gradient(135deg, rgba(123,63,242,0.12), rgba(224,56,154,0.08))',
            border: '1px solid rgba(123,63,242,0.25)',
            animationFillMode: 'both',
          }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inset-0 rounded-full" style={{ background: '#F0365A', opacity: 0.7 }} />
            <span className="relative rounded-full h-2 w-2 inline-block" style={{ background: '#F0365A' }} />
          </span>
          <span className="gradient-text font-semibold">Streaming · Social · Monétisation</span>
          <span style={{ color: 'var(--text-tertiary)' }}>· Reels · Concerts · Communautés · Films</span>
        </div>

        {/* Title */}
        <h1
          className="text-6xl sm:text-7xl md:text-8xl lg:text-[5.5rem] font-black leading-[0.92] tracking-tighter mb-4 animate-reveal-up"
          style={{ animationDelay: '100ms', animationFillMode: 'both', color: 'var(--text-primary)' }}
        >
          <span className="block gradient-text">GoFolix</span>
          <span className="block mt-2">
            <Typewriter words={['vis le live', 'crée ta communauté', 'monétise ton talent', 'explore sans limites']} />
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="text-lg md:text-xl max-w-2xl mx-auto mt-8 mb-10 leading-relaxed animate-reveal-up"
          style={{ animationDelay: '200ms', animationFillMode: 'both', color: 'var(--text-secondary)' }}
        >
          Reels, concerts live, films & séries, événements, communautés avec
          trésorerie, billets, cadeaux virtuels et monétisation créateur —{' '}
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
            tout en un. Explore sans inscription.
          </span>
        </p>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-reveal-up"
          style={{ animationDelay: '300ms', animationFillMode: 'both' }}
        >
          {isAuthenticated ? (
            <button onClick={() => navigate('/feed')} className="btn-primary text-base px-8 py-4 flex items-center gap-2.5">
              <Sparkles size={18} /> Mon espace
            </button>
          ) : (
            <>
              <Link to="/auth/register" className="btn-primary text-base px-8 py-4 flex items-center gap-2.5">
                <Sparkles size={18} /> Rejoindre GoFolix <ArrowRight size={18} />
              </Link>
              <a href="#discover" className="btn-secondary text-base px-8 py-4 flex items-center gap-2.5">
                <Play size={18} /> Explorer gratuitement
              </a>
            </>
          )}
        </div>

        {/* Stats */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto animate-reveal-up"
          style={{ animationDelay: '400ms', animationFillMode: 'both' }}
        >
          <StatCard icon={Play}     value="500+"  label="Films & Séries"   color="#7B3FF2" delay={450} />
          <StatCard icon={Radio}    value="200+"  label="Concerts live"    color="#F0365A" delay={520} />
          <StatCard icon={Users}    value="1 000+"label="Communautés"      color="#E0389A" delay={590} />
          <StatCard icon={Calendar} value="300+"  label="Événements"       color="#36D9A0" delay={660} />
        </div>
      </div>

      {/* Scroll hint */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-reveal-up"
        style={{ animationDelay: '900ms', animationFillMode: 'both' }}
      >
        <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-tertiary)' }}>Défiler</span>
        <div className="w-5 h-8 rounded-full border flex items-start justify-center pt-1.5"
          style={{ borderColor: 'var(--text-tertiary)', opacity: 0.4 }}>
          <div className="w-1 h-2 rounded-full" style={{ background: 'var(--primary)', animation: 'float-fast 1.5s ease-in-out infinite' }} />
        </div>
      </div>
    </section>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ eyebrow, title, sub, seeAllHref }: {
  eyebrow?: string; title: string; sub?: string; seeAllHref?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-8 px-6 max-w-7xl mx-auto">
      <div className="sr">
        {eyebrow && (
          <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: 'var(--primary)' }}>{eyebrow}</p>
        )}
        <h2 className="text-2xl md:text-3xl font-black" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        {sub && <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{sub}</p>}
      </div>
      {seeAllHref && (
        <Link to={seeAllHref}
          className="shrink-0 flex items-center gap-1.5 text-sm font-semibold transition-all duration-200 hover:gap-3 sr"
          style={{ color: 'var(--primary)', animationDelay: '100ms' }}
        >
          Voir tout <ChevronRight size={16} />
        </Link>
      )}
    </div>
  );
}

// ── Poster card (film / série) ────────────────────────────────────────────────
function PosterCard({ item, onClick }: { item: Content; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <div className="poster-card shrink-0 group" style={{ width: 160 }} onClick={onClick}>
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-xl"
        style={{ background: 'var(--bg-tertiary)' }}>
        {item.thumbnail_url && !imgErr ? (
          <img src={item.thumbnail_url} alt={item.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,rgba(123,63,242,0.25),rgba(224,56,154,0.15))' }}>
            <Play size={28} className="text-white/60" />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-3"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent 50%)' }}>
          <div className="mx-auto w-9 h-9 rounded-full flex items-center justify-center mb-1"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
            <Play size={14} className="text-white" fill="white" />
          </div>
        </div>

        {item.is_premium && (
          <div className="absolute top-2 left-2 text-white text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'linear-gradient(135deg,#FF7A2F,#E0389A)' }}>
            Premium
          </div>
        )}
        {item.rating && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ background: 'rgba(0,0,0,0.55)', color: '#FACC15' }}>
            <Star size={9} fill="currentColor" />
            {Number(item.rating).toFixed(1)}
          </div>
        )}
      </div>
      <div className="mt-2.5 px-1">
        <p className="text-sm font-semibold truncate transition-colors"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={e => (e.target as HTMLElement).style.color = 'var(--primary)'}
          onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--text-primary)'}
        >{item.title}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{item.year}</p>
      </div>
    </div>
  );
}

// ── Concert card ──────────────────────────────────────────────────────────────
function ConcertCard({ concert, onClick }: { concert: Concert; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const isLive     = concert.status === 'live';
  const artistName = concert.artist?.display_name ?? concert.artist?.username;

  return (
    <div className="poster-card shrink-0 glass-card rounded-2xl overflow-hidden group" style={{ width: 280 }} onClick={onClick}>
      <div className="relative h-44 overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
        {concert.thumbnail_url && !imgErr ? (
          <img src={concert.thumbnail_url} alt={concert.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,rgba(123,63,242,0.3),rgba(224,56,154,0.2))' }}>
            <Music2 size={36} className="text-white/50" />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 40%, transparent)' }} />

        {isLive && (
          <div className="absolute top-3 left-3 badge-live flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
          </div>
        )}
        {concert.genre && (
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs text-white"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
            {concert.genre}
          </div>
        )}
        <div className="absolute bottom-3 left-3 right-3">
          <p className="font-bold text-white text-base leading-tight truncate">{concert.title}</p>
          {artistName && <p className="text-white/70 text-xs mt-0.5">{artistName}</p>}
        </div>
      </div>
      <div className="p-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <Eye size={12} />
          <span>{(concert.current_viewers ?? 0).toLocaleString()} spectateurs</span>
        </div>
        {concert.ticket_price != null && (
          <span className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
            {concert.ticket_price === 0 ? 'Gratuit' : `${concert.ticket_price}€`}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Event card ────────────────────────────────────────────────────────────────
function EventCard({ event, onClick }: { event: Event; onClick: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const date     = new Date(event.starts_at);
  const dd       = date.getDate().toString().padStart(2, '0');
  const mo       = date.toLocaleString('fr', { month: 'short' }).toUpperCase();
  const location = [event.venue_name, event.venue_city].filter(Boolean).join(', ');

  return (
    <div className="poster-card shrink-0 glass-card rounded-2xl overflow-hidden group flex" style={{ width: 300 }} onClick={onClick}>
      {/* Date sidebar */}
      <div className="w-16 shrink-0 flex flex-col items-center justify-center py-4"
        style={{
          borderRight: '1px solid var(--border)',
          background: 'linear-gradient(180deg,rgba(123,63,242,0.15),rgba(224,56,154,0.08))',
        }}>
        <span className="text-2xl font-black text-white leading-none">{dd}</span>
        <span className="text-xs font-bold tracking-widest mt-0.5" style={{ color: 'var(--primary)' }}>{mo}</span>
      </div>

      {/* Content */}
      <div className="relative flex-1 overflow-hidden">
        {event.thumbnail_url && !imgErr ? (
          <img src={event.thumbnail_url} alt={event.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            style={{ minHeight: 110 }}
            onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ minHeight: 110, background: 'linear-gradient(135deg,rgba(255,122,47,0.2),rgba(240,54,90,0.15))' }}>
            <Calendar size={28} className="text-white/40" />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, transparent 20%, rgba(0,0,0,0.6))' }} />
        <div className="absolute inset-0 p-3 flex flex-col justify-end">
          <p className="font-bold text-white text-sm leading-tight line-clamp-2">{event.title}</p>
          {location && (
            <div className="flex items-center gap-1 text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <MapPin size={10} /> {location}
            </div>
          )}
          {event.ticket_price != null && (
            <span className="text-xs font-bold mt-1.5" style={{ color: '#36D9A0' }}>
              {event.ticket_price === 0 ? '— Gratuit —' : `${event.ticket_price}€`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Horizontal scroll row ─────────────────────────────────────────────────────
function HScrollRow({ children }: { children: React.ReactNode }) {
  const ref       = useRef<HTMLDivElement>(null);
  const scrollBy  = useCallback((dir: number) => {
    ref.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  }, []);

  return (
    <div className="relative">
      <button onClick={() => scrollBy(-1)}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full glass flex items-center justify-center text-lg font-bold shadow-xl hover:scale-110 transition-transform"
        style={{ color: 'var(--text-primary)' }}>
        ‹
      </button>
      <div ref={ref} className="flex gap-4 overflow-x-auto pb-4 px-6" style={{ scrollbarWidth: 'none' }}>
        {children}
      </div>
      <button onClick={() => scrollBy(1)}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full glass flex items-center justify-center text-lg font-bold shadow-xl hover:scale-110 transition-transform"
        style={{ color: 'var(--text-primary)' }}>
        ›
      </button>
    </div>
  );
}

// ── Marquee banner ────────────────────────────────────────────────────────────
function MarqueeBanner() {
  const tags = ['Action','Drame','Comédie','Concert Live','Sport','Horreur','Sci-Fi','R&B','Documentaire','Festival','Jazz','Rock','Thriller','Pop','Animation'];
  const doubled = [...tags, ...tags];

  return (
    <div className="relative py-5 overflow-hidden my-16"
      style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
      <div className="absolute inset-y-0 left-0 w-20 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, var(--bg-secondary), transparent)' }} />
      <div className="absolute inset-y-0 right-0 w-20 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, var(--bg-secondary), transparent)' }} />
      <div className="flex animate-marquee whitespace-nowrap select-none">
        {doubled.map((tag, i) => (
          <span key={i} className="inline-flex items-center mx-6 text-sm font-medium transition-colors cursor-default"
            style={{ color: 'var(--text-tertiary)' }}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Features section ──────────────────────────────────────────────────────────
function FeaturesSection() {
  const features = [
    { icon: Radio,  title: 'Concerts en direct',  desc: 'Vis les concerts de tes artistes préférés en live streaming HD avec chat en temps réel.', gradient: 'linear-gradient(135deg,#F0365A,#E0389A)' },
    { icon: Play,   title: 'Films & Séries',       desc: 'Un catalogue immense en streaming HD, sous-titres multi-langues, sans interruption.',    gradient: 'linear-gradient(135deg,#7B3FF2,#A67CF7)' },
    { icon: Zap,    title: 'Reels & Stories',      desc: 'Partage des courts-métrages, découvre les créations des artistes du monde entier.',      gradient: 'linear-gradient(135deg,#FF7A2F,#FFB340)' },
    { icon: Users,  title: 'Communautés',          desc: 'Rejoins des groupes de passionnés, crée des liens autour de ta culture favorite.',       gradient: 'linear-gradient(135deg,#36D9A0,#00C9A7)' },
    { icon: Globe,  title: 'Événements',           desc: 'Festivals, conférences, expos — près de chez toi ou en ligne depuis partout.',           gradient: 'linear-gradient(135deg,#3B82F6,#60A5FA)' },
    { icon: Shield, title: 'Contenu exclusif',     desc: 'Avant-premières mondiales, replays et contenu premium unique sur GoFolix.',                gradient: 'linear-gradient(135deg,#E0389A,#F97316)' },
  ];

  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 sr">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--primary)' }}>Pourquoi GoFolix</p>
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ color: 'var(--text-primary)' }}>
            Tout ce dont tu as besoin
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Une plateforme complète pensée pour vivre la culture à fond.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc, gradient }, i) => (
            <div
              key={title}
              className="sr-scale relative group rounded-3xl p-6 overflow-hidden transition-all duration-300 hover:-translate-y-2"
              style={{
                animationDelay: `${i * 80}ms`,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(123,63,242,0.3)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                style={{ background: gradient }}>
                <Icon size={22} className="text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2 transition-colors" style={{ color: 'var(--text-primary)' }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Reviews ───────────────────────────────────────────────────────────────────
function SocialProof() {
  const reviews = [
    { name: 'Amira K.',   text: 'Les concerts live sont incroyables, j\'ai l\'impression d\'y être vraiment !',          rating: 5 },
    { name: 'Lucas M.',   text: 'Enfin une plateforme qui regroupe tout ! Films, concerts, events… Addictif.',            rating: 5 },
    { name: 'Sarah D.',   text: 'La communauté est vraiment sympa et le contenu est de qualité. J\'adore les reels.',     rating: 5 },
    { name: 'Youssef B.', text: 'Interface ultra fluide, les concerts live avec le chat c\'est une expérience unique.',   rating: 5 },
  ];

  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 sr">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--primary)' }}>Témoignages</p>
          <h2 className="text-3xl md:text-4xl font-black" style={{ color: 'var(--text-primary)' }}>Ils adorent GoFolix</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {reviews.map((r, i) => (
            <div key={r.name}
              className="sr-scale rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1"
              style={{
                animationDelay: `${i * 100}ms`,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(123,63,242,0.3)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: r.rating }).map((_, j) => (
                  <Star key={j} size={14} style={{ color: '#FACC15' }} fill="#FACC15" />
                ))}
              </div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>"{r.text}"</p>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
                  {r.name.charAt(0)}
                </div>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{r.name}</span>
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
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto sr">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg,#7B3FF2 0%,#E0389A 50%,#FF7A2F 100%)' }} />
          <div className="absolute inset-0 hero-grid opacity-20" />
          <div className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.12), transparent 60%)' }} />

          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full animate-float-slow opacity-20"
            style={{ background: 'radial-gradient(circle, white, transparent)' }} />
          <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full animate-float-mid opacity-10"
            style={{ background: 'radial-gradient(circle, white, transparent)' }} />

          <div className="relative z-10 p-12 md:p-16 text-center">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-white text-sm font-medium mb-6"
              style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
              <Sparkles size={14} /> Rejoins la révolution culturelle
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4">
              Prêt à vivre<br />la culture ?
            </h2>
            <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Rejoins des milliers d'utilisateurs qui vivent la musique, le cinéma et les événements en direct.
            </p>

            {isAuthenticated ? (
              <Link to="/feed"
                className="inline-flex items-center gap-2 bg-white font-bold px-10 py-4 rounded-2xl text-lg transition-all hover:scale-105 hover:shadow-2xl"
                style={{ color: '#7B3FF2' }}>
                Accéder à mon espace <ArrowRight size={20} />
              </Link>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/auth/register"
                  className="inline-flex items-center gap-2 bg-white font-bold px-10 py-4 rounded-2xl text-lg transition-all hover:scale-105 hover:shadow-2xl"
                  style={{ color: '#7B3FF2' }}>
                  Commencer gratuitement <ArrowRight size={20} />
                </Link>
                <Link to="/auth/login"
                  className="font-medium px-6 py-4 rounded-2xl transition-all hover:bg-white/10"
                  style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Déjà un compte ? →
                </Link>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm"
              style={{ color: 'rgba(255,255,255,0.6)' }}>
              <span className="flex items-center gap-1.5"><Shield size={14} /> Gratuit pour commencer</span>
              <span className="flex items-center gap-1.5"><Zap    size={14} /> Accès instantané</span>
              <span className="flex items-center gap-1.5"><Star   size={14} /> Sans carte bancaire</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  const { isDark } = useThemeStore();
  const cols = [
    { title: 'Explorer', links: [
      { label: 'Films',       href: '/explore/films'    },
      { label: 'Séries',      href: '/explore/series'   },
      { label: 'Concerts',    href: '/explore/concerts' },
      { label: 'Événements',  href: '/explore/events'   },
    ]},
    { title: 'Compte', links: [
      { label: 'Se connecter', href: '/auth/login'    },
      { label: "S'inscrire",   href: '/auth/register' },
      { label: 'Mon profil',   href: '/profile'       },
      { label: 'Paramètres',   href: '/settings'      },
    ]},
    { title: 'GoFolix', links: [
      { label: 'À propos',  href: '#' },
      { label: 'Blog',      href: '#' },
      { label: 'Presse',    href: '#' },
      { label: 'Carrières', href: '#' },
    ]},
  ];

  return (
    <footer className="pt-16 pb-8 px-6" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={isDark ? Images.logoDark : Images.logoLight} alt="GoFolix" className="h-9 w-auto" />
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              La plateforme de streaming culturel qui réunit films, concerts, événements et communauté.
            </p>
          </div>

          {cols.map(col => (
            <div key={col.title}>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-tertiary)' }}>
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map(({ label, href }) => (
                  <li key={label}>
                    <Link to={href} className="text-sm transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={e => (e.target as HTMLElement).style.color = 'var(--text-primary)'}
                      onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--text-secondary)'}
                    >{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs"
          style={{ borderTop: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>
          <p>© 2025 GoFolix. Tous droits réservés.</p>
          <div className="flex gap-6">
            {['Confidentialité', 'Conditions', 'Cookies'].map(l => (
              <a key={l} href="#" className="transition-colors"
                onMouseEnter={e => (e.target as HTMLElement).style.color = 'var(--text-primary)'}
                onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--text-tertiary)'}
              >{l}</a>
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
    <div className="flex gap-4 overflow-x-hidden px-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="shrink-0 rounded-2xl animate-pulse"
          style={{ width, aspectRatio: aspect, background: 'var(--bg-secondary)' }} />
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate            = useNavigate();
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
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: 'var(--bg)' }}>
      <OrbsBg />
      <ParticleCanvas />
      <Navbar />
      <HeroSection />

      <div id="discover" className="relative z-10 space-y-16 pb-8">
        <section id="films">
          <SectionHeader eyebrow="Cinéma" title="Films en vedette"
            sub="Découvrez notre sélection sans inscription" seeAllHref="/explore/films" />
          {loading
            ? <PlaceholderRow count={8} aspect="2/3" width={160} />
            : films.length === 0
              ? <div className="px-6 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>Aucun contenu disponible pour le moment</div>
              : <HScrollRow>{films.map(f => <PosterCard key={f.id} item={f} onClick={() => navigate(`/explore/films/${encodeId(f.id)}`)} />)}</HScrollRow>
          }
        </section>

        <section>
          <SectionHeader eyebrow="Séries" title="Séries populaires"
            sub="Des saisons entières à explorer librement" seeAllHref="/explore/series" />
          {loading
            ? <PlaceholderRow count={8} aspect="2/3" width={160} />
            : series.length === 0
              ? <div className="px-6 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>Aucun contenu disponible pour le moment</div>
              : <HScrollRow>{series.map(s => <PosterCard key={s.id} item={s} onClick={() => navigate(`/explore/series/${encodeId(s.id)}`)} />)}</HScrollRow>
          }
        </section>

        <section id="concerts">
          <SectionHeader eyebrow="Live" title="Concerts & Lives"
            sub="Vivez la musique en temps réel" seeAllHref="/explore/concerts" />
          {loading
            ? <PlaceholderRow count={5} aspect="16/9" width={280} />
            : concerts.length === 0
              ? <div className="px-6 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>Aucun contenu disponible pour le moment</div>
              : <HScrollRow>{concerts.map(c => <ConcertCard key={c.id} concert={c} onClick={() => navigate(`/explore/concerts/${encodeId(c.id)}`)} />)}</HScrollRow>
          }
        </section>

        <section id="events">
          <SectionHeader eyebrow="Événements" title="À ne pas manquer"
            sub="Festivals, conférences, expositions" seeAllHref="/explore/events" />
          {loading
            ? <PlaceholderRow count={5} aspect="16/9" width={300} />
            : events.length === 0
              ? <div className="px-6 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>Aucun contenu disponible pour le moment</div>
              : <HScrollRow>{events.map(e => <EventCard key={e.id} event={e} onClick={() => navigate(`/explore/events/${encodeId(e.id)}`)} />)}</HScrollRow>
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
