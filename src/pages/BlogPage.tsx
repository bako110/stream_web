import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Tag, ArrowRight, Search } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { Images } from '../components/assets';

interface Article {
  slug:      string;
  cat:       string;
  title:     string;
  excerpt:   string;
  date:      string;
  readTime:  number;
  gradient:  string;
  featured?: boolean;
}

const ARTICLES: Article[] = [
  {
    slug:     'lancement-gofolyx-v2',
    cat:      'Produit',
    title:    'GoFolyX v2 : ce qui change pour les créateurs',
    excerpt:  'Nouveau tableau de bord monétisation, statistiques avancées, partage enrichi — voici tout ce que prépare la prochaine version majeure de la plateforme.',
    date:     '5 juin 2025',
    readTime: 6,
    gradient: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)',
    featured: true,
  },
  {
    slug:     'concerts-live-streaming-afrique',
    cat:      'Culture',
    title:    'Comment le streaming transforme les concerts en Afrique',
    excerpt:  "Des artistes de Dakar à Abidjan témoignent : GoFolyX leur a permis de toucher des fans en Europe, en Amérique et dans toute l'Afrique sans quitter leur studio.",
    date:     '28 mai 2025',
    readTime: 8,
    gradient: 'linear-gradient(135deg,#F97316,#EA580C)',
  },
  {
    slug:     'monetisation-createurs',
    cat:      'Monétisation',
    title:    'Guide complet : gagner de l\'argent sur GoFolyX',
    excerpt:  'Abonnements, coins, publicités CPM, vente de billets — découvrez toutes les façons dont les créateurs transforment leur audience en revenus récurrents.',
    date:     '20 mai 2025',
    readTime: 10,
    gradient: 'linear-gradient(135deg,#10B981,#059669)',
  },
  {
    slug:     'communautes-fonctionnement',
    cat:      'Fonctionnalités',
    title:    'Les communautés GoFolyX : votre fanbase organisée',
    excerpt:  'Canaux, trésorerie commune, classements, votes — découvrez comment construire une communauté engagée autour de votre contenu.',
    date:     '12 mai 2025',
    readTime: 5,
    gradient: 'linear-gradient(135deg,#3B82F6,#2563EB)',
  },
  {
    slug:     'protection-droits-auteur',
    cat:      'Legal',
    title:    'Droits d\'auteur & contenus : ce que GoFolyX fait pour vous',
    excerpt:  'Système de signalement, Content ID, licences — comment nous protégeons les créateurs tout en maintenant une expérience fluide pour les fans.',
    date:     '4 mai 2025',
    readTime: 7,
    gradient: 'linear-gradient(135deg,#8B5CF6,#7C3AED)',
  },
  {
    slug:     'tips-reels-viraux',
    cat:      'Conseils',
    title:    '10 astuces pour rendre vos Reels viraux',
    excerpt:  'Durée optimale, accroches, hashtags, heure de publication — les données de notre équipe Growth compilées en conseils actionnables.',
    date:     '25 avril 2025',
    readTime: 4,
    gradient: 'linear-gradient(135deg,#EC4899,#DB2777)',
  },
];

const CATS = ['Tous', 'Produit', 'Culture', 'Monétisation', 'Fonctionnalités', 'Legal', 'Conseils'];

export default function BlogPage() {
  const navigate       = useNavigate();
  const { isDark }     = useThemeStore();
  const [cat, setCat]  = useState('Tous');
  const [q, setQ]      = useState('');

  const featured   = ARTICLES.find(a => a.featured);
  const rest        = ARTICLES.filter(a => !a.featured);

  const filtered = rest.filter(a =>
    (cat === 'Tous' || a.cat === cat) &&
    (q === '' || a.title.toLowerCase().includes(q.toLowerCase()) || a.excerpt.toLowerCase().includes(q.toLowerCase()))
  );

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
        <img src={isDark ? Images.logoDark : Images.logoLight} alt="GoFolyX" className="h-7 w-auto" />
      </nav>

      {/* Hero */}
      <section className="py-16 px-6 text-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ background: 'radial-gradient(ellipse 70% 40% at 50% 0%, #7B3FF218, transparent)' }} />
        <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>Blog</p>
        <h1 className="text-4xl md:text-5xl font-black mb-4">
          Actualités &amp; insights
        </h1>
        <p className="max-w-xl mx-auto text-base" style={{ color: 'var(--text-secondary)' }}>
          Conseils, nouveautés produit, reportages culture — tout ce qui se passe dans l'univers GoFolyX.
        </p>

        {/* Recherche */}
        <div className="max-w-md mx-auto mt-8 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Rechercher un article…"
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 pb-20">
        {/* Article featured */}
        {featured && q === '' && cat === 'Tous' && (
          <div className="mb-12 rounded-3xl overflow-hidden grid md:grid-cols-2"
            style={{ border: '1px solid var(--border)' }}>
            <div className="h-56 md:h-auto flex items-center justify-center"
              style={{ background: featured.gradient }}>
              <span className="text-white font-black text-5xl opacity-20">GX</span>
            </div>
            <div className="p-8 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{ background: '#7B3FF220', color: 'var(--primary)' }}>
                  {featured.cat}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  A la une
                </span>
              </div>
              <h2 className="text-2xl font-black mb-3">{featured.title}</h2>
              <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
                {featured.excerpt}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <span className="flex items-center gap-1"><Clock size={12} />{featured.readTime} min</span>
                  <span>{featured.date}</span>
                </div>
                <button className="flex items-center gap-1 text-sm font-semibold"
                  style={{ color: 'var(--primary)' }}>
                  Lire <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filtres catégories */}
        <div className="flex gap-2 flex-wrap mb-8">
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={cat === c
                ? { background: 'var(--primary)', color: '#fff' }
                : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
              }>
              {c}
            </button>
          ))}
        </div>

        {/* Grille articles */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center" style={{ color: 'var(--text-secondary)' }}>
            Aucun article trouvé pour cette recherche.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(article => (
              <article key={article.slug} className="rounded-2xl overflow-hidden group cursor-pointer transition-transform hover:-translate-y-1"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div className="h-40 flex items-center justify-center" style={{ background: article.gradient }}>
                  <Tag size={32} className="text-white opacity-30" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: '#7B3FF218', color: 'var(--primary)' }}>
                      {article.cat}
                    </span>
                  </div>
                  <h3 className="font-bold mb-2 leading-snug group-hover:opacity-80 transition-opacity">
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
              </article>
            ))}
          </div>
        )}

        {/* Newsletter */}
        <div className="mt-16 rounded-3xl p-10 text-center"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <h2 className="text-2xl font-black mb-3">Restez informé</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Recevez les nouveaux articles directement dans votre boite mail, pas de spam.
          </p>
          <div className="flex max-w-md mx-auto gap-3">
            <input
              type="email"
              placeholder="votre@email.com"
              className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            <button className="px-5 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
              S'abonner
            </button>
          </div>
        </div>
      </div>

      <footer className="py-8 text-center text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>
        © 2025 GoFolyX. Tous droits réservés.
      </footer>
    </div>
  );
}
