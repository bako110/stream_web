import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Tag, Share2, BookOpen, ChevronRight } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { Images } from '../components/assets';
import { ARTICLES } from '../data/blogData';

// ── Renderer markdown léger ───────────────────────────────────────────────────
function renderContent(text: string) {
  return text.split('\n\n').map((block, i) => {
    if (block.startsWith('## ')) {
      return (
        <h2 key={i} className="text-xl font-black mt-10 mb-4" style={{ color: 'var(--text-primary)' }}>
          {block.slice(3)}
        </h2>
      );
    }
    const lines = block.split('\n').map((line, j) => {
      if (line.startsWith('- ') || line.match(/^\d+\. /)) {
        const content = line.replace(/^- /, '').replace(/^\d+\. /, '');
        return (
          <li key={j} className="flex items-start gap-2 mb-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--primary)' }} />
            <span>{content}</span>
          </li>
        );
      }
      return line;
    });
    const hasList = block.split('\n').some(l => l.startsWith('- ') || l.match(/^\d+\. /));
    if (hasList) {
      return <ul key={i} className="mb-4 space-y-0 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{lines}</ul>;
    }
    // Citation (commence par ")
    if (block.startsWith('"')) {
      return (
        <blockquote key={i} className="my-6 pl-4 py-3 rounded-r-xl italic text-sm leading-relaxed"
          style={{ borderLeft: '3px solid var(--primary)', background: '#7B3FF208', color: 'var(--text-secondary)' }}>
          {block}
        </blockquote>
      );
    }
    return (
      <p key={i} className="mb-5 text-sm leading-7" style={{ color: 'var(--text-secondary)' }}>
        {block}
      </p>
    );
  });
}

// ── Scroll progress temps réel ────────────────────────────────────────────────
function useScrollProgress(ref: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft]  = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const rect   = el.getBoundingClientRect();
      const total  = el.scrollHeight - window.innerHeight;
      const scrolled = Math.max(0, -rect.top);
      const pct    = total > 0 ? Math.min(100, (scrolled / total) * 100) : 0;
      setProgress(pct);
      // Temps restant estimé (mots restants / vitesse lecture 200 mots/min)
      if (el.textContent) {
        const words      = el.textContent.trim().split(/\s+/).length;
        const remaining  = words * (1 - pct / 100);
        setTimeLeft(Math.ceil(remaining / 200));
      }
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, [ref]);

  return { progress, timeLeft };
}

export default function BlogArticlePage() {
  const { slug }    = useParams<{ slug: string }>();
  const navigate    = useNavigate();
  const { isDark }  = useThemeStore();
  const contentRef  = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const article = ARTICLES.find(a => a.slug === slug);
  const related = ARTICLES.filter(a => a.slug !== slug && a.cat === article?.cat).slice(0, 2);
  const { progress, timeLeft } = useScrollProgress(contentRef);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
        <BookOpen size={40} style={{ color: 'var(--text-tertiary)' }} />
        <p className="font-bold">Article introuvable</p>
        <Link to="/blog" className="text-sm" style={{ color: 'var(--primary)' }}>
          Retour au blog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>

      {/* Barre de progression sticky */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="h-0.5" style={{ background: 'var(--border)' }}>
          <div className="h-full transition-all duration-100"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#7B3FF2,#9B65F5)' }} />
        </div>
        <nav className="flex items-center gap-3 px-6 py-3"
          style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => navigate('/blog')}
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-secondary)' }}>
            <ArrowLeft size={16} />
            Blog
          </button>
          <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-sm truncate flex-1" style={{ color: 'var(--text-tertiary)' }}>
            {article.title}
          </span>
          <div className="flex items-center gap-3 flex-shrink-0">
            {timeLeft !== null && progress > 0 && progress < 98 && (
              <span className="text-xs hidden sm:flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                <Clock size={11} />
                {timeLeft > 0 ? `~${timeLeft} min restantes` : 'Presque fini'}
              </span>
            )}
            <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
              {Math.round(progress)}%
            </span>
            <button onClick={handleShare}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all"
              style={copied
                ? { background: '#10B98120', color: '#10B981' }
                : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
              }>
              <Share2 size={12} />
              {copied ? 'Copié !' : 'Partager'}
            </button>
            <img src={isDark ? Images.logoDark : Images.logoLight} alt="Gofolyx" className="h-6 w-auto hidden md:block" />
          </div>
        </nav>
      </div>

      {/* Hero article */}
      <div className="pt-[72px]">
        <div className="h-64 md:h-80 flex items-end"
          style={{ background: article.gradient }}>
          <div className="max-w-3xl mx-auto w-full px-6 pb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm">
                {article.cat}
              </span>
              {article.tags.slice(1).map(t => (
                <span key={t} className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">
                  {t}
                </span>
              ))}
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white leading-tight mb-4">
              {article.title}
            </h1>
            <div className="flex items-center gap-4 text-white/70 text-xs">
              <span className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-xs"
                  style={{ background: 'rgba(255,255,255,0.25)' }}>
                  {article.author.name.charAt(0)}
                </div>
                {article.author.name}
              </span>
              <span>{article.date}</span>
              <span className="flex items-center gap-1"><Clock size={11} />{article.readTime} min de lecture</span>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="max-w-3xl mx-auto px-6 py-10" ref={contentRef}>
          {/* Excerpt mis en avant */}
          <p className="text-base font-medium leading-relaxed mb-8 pb-8"
            style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
            {article.excerpt}
          </p>

          {/* Corps de l'article */}
          <div className="article-body">
            {renderContent(article.content)}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-10 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
            {article.tags.map(t => (
              <span key={t} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full"
                style={{ background: '#7B3FF215', color: 'var(--primary)' }}>
                <Tag size={10} />
                {t}
              </span>
            ))}
          </div>

          {/* Partager */}
          <div className="mt-8 p-6 rounded-2xl flex items-center justify-between gap-4"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div>
              <p className="font-bold text-sm mb-1">Cet article vous a été utile ?</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Partagez-le avec quelqu'un qui en a besoin.</p>
            </div>
            <button onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
              <Share2 size={14} />
              {copied ? 'Lien copié !' : 'Partager'}
            </button>
          </div>
        </div>

        {/* Articles liés */}
        {related.length > 0 && (
          <div className="max-w-3xl mx-auto px-6 pb-16">
            <h2 className="text-lg font-black mb-5">Dans la même catégorie</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {related.map(a => (
                <Link key={a.slug} to={`/blog/${a.slug}`}
                  className="rounded-2xl overflow-hidden group transition-transform hover:-translate-y-1"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <div className="h-28 flex items-center justify-center" style={{ background: a.gradient }}>
                    <span className="text-white font-black text-3xl opacity-20">GX</span>
                  </div>
                  <div className="p-4">
                    <p className="text-xs mb-1.5" style={{ color: 'var(--primary)' }}>{a.cat}</p>
                    <h3 className="font-bold text-sm leading-snug mb-2 group-hover:opacity-75 transition-opacity">
                      {a.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      <Clock size={10} />
                      {a.readTime} min
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="text-center py-8 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>
          © 2026 Gofolyx. Tous droits réservés.
        </div>
      </div>
    </div>
  );
}
