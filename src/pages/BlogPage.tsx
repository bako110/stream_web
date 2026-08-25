import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Search, ArrowRight, BookOpen } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { Images } from '../components/assets';
import { ARTICLES, CATS } from '../data/blogData';

// ── Scroll reveal simple ──────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function ArticleCard({ article, delay = 0 }: { article: typeof ARTICLES[0]; delay?: number }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} style={{ transition: `opacity 0.4s ${delay}ms, transform 0.4s ${delay}ms`, opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(16px)' }}>
      <Link to={`/blog/${article.slug}`}
        className="block rounded-2xl overflow-hidden group transition-transform hover:-translate-y-1"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="h-40 flex items-center justify-center relative overflow-hidden"
          style={{ background: article.gradient }}>
          <span className="text-white font-black text-6xl opacity-10 select-none">GX</span>
          <div className="absolute bottom-3 left-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-black/25 text-white backdrop-blur-sm">
              {article.cat}
            </span>
          </div>
        </div>
        <div className="p-5">
          <h3 className="font-bold leading-snug mb-2 group-hover:opacity-75 transition-opacity line-clamp-2">
            {article.title}
          </h3>
          <p className="text-xs leading-relaxed mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
            {article.excerpt}
          </p>
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <span className="flex items-center gap-1"><Clock size={11} />{article.readTime} min</span>
            <span>{article.date}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function BlogPage() {
  const navigate      = useNavigate();
  const { isDark }    = useThemeStore();
  const [cat, setCat] = useState('Tous');
  const [q, setQ]     = useState('');

  const featured = ARTICLES.find(a => a.featured);
  const rest     = ARTICLES.filter(a => !a.featured);

  const filtered = rest.filter(a =>
    (cat === 'Tous' || a.cat === cat) &&
    (q === '' || a.title.toLowerCase().includes(q.toLowerCase()) || a.excerpt.toLowerCase().includes(q.toLowerCase()))
  );

  const showFeatured = featured && q === '' && cat === 'Tous';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>

      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center gap-4 px-6 py-4"
        style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-secondary)' }}>
          <ArrowLeft size={18} />
          Retour
        </button>
        <div className="flex-1" />
        <img src={isDark ? Images.logoDark : Images.logoLight} alt="Gofolyx" className="h-7 w-auto" />
      </nav>

      {/* Hero */}
      <section className="relative py-16 px-6 text-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, #7B3FF218, transparent)' }} />
        <div className="flex items-center justify-center gap-2 mb-4">
          <BookOpen size={18} style={{ color: 'var(--primary)' }} />
          <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--primary)' }}>Blog</p>
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-4">Actualités &amp; insights</h1>
        <p className="max-w-xl mx-auto text-base" style={{ color: 'var(--text-secondary)' }}>
          Conseils, nouveautés produit, culture — tout ce qui se passe dans l'univers Gofolyx.
        </p>

        {/* Recherche */}
        <div className="max-w-md mx-auto mt-8 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-tertiary)' }} />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Rechercher un article…"
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 pb-20">

        {/* Article à la une */}
        {showFeatured && (
          <Link to={`/blog/${featured.slug}`}
            className="mb-12 rounded-3xl overflow-hidden grid md:grid-cols-2 group transition-opacity hover:opacity-95"
            style={{ border: '1px solid var(--border)', display: 'grid' }}>
            <div className="h-56 md:h-auto flex items-center justify-center relative"
              style={{ background: featured.gradient }}>
              <span className="text-white font-black text-8xl opacity-10 select-none">GX</span>
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-black/25 text-white backdrop-blur-sm">
                  {featured.cat}
                </span>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm">
                  A la une
                </span>
              </div>
            </div>
            <div className="p-8 flex flex-col justify-center" style={{ background: 'var(--bg-secondary)' }}>
              <h2 className="text-2xl font-black mb-3 group-hover:opacity-80 transition-opacity">
                {featured.title}
              </h2>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                {featured.excerpt}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <span className="flex items-center gap-1"><Clock size={12} />{featured.readTime} min</span>
                  <span>{featured.date}</span>
                </div>
                <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                  Lire <ArrowRight size={14} />
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* Filtres */}
        <div className="flex gap-2 flex-wrap mb-8">
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={cat === c
                ? { background: 'var(--primary)', color: '#fff' }
                : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              {c}
            </button>
          ))}
        </div>

        {/* Grille */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center" style={{ color: 'var(--text-secondary)' }}>
            Aucun article pour cette recherche.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((article, i) => (
              <ArticleCard key={article.slug} article={article} delay={i * 60} />
            ))}
          </div>
        )}

        {/* Newsletter */}
        <div className="mt-16 rounded-3xl p-10 text-center"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <h2 className="text-2xl font-black mb-3">Restez informé</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Recevez les nouveaux articles directement dans votre boîte mail.
          </p>
          <form className="flex max-w-md mx-auto gap-3" onSubmit={e => e.preventDefault()}>
            <input type="email" placeholder="votre@email.com"
              className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            <button type="submit"
              className="px-5 py-3 rounded-xl text-sm font-semibold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
              S'abonner
            </button>
          </form>
        </div>
      </div>

      <footer className="py-8 text-center text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>
        © 2026 Gofolyx. Tous droits réservés.
      </footer>
    </div>
  );
}
