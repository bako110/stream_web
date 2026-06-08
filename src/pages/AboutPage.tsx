import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Globe, Zap, Heart, Target, Award } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { Images } from '../components/assets';

const VALEURS = [
  { Icon: Heart,  title: 'Passion culturelle',  desc: "Nous croyons que la culture est un vecteur d'identité et de lien social. Chaque concert, film ou événement est une opportunité de partager quelque chose d'universel." },
  { Icon: Globe,  title: 'Portée mondiale',       desc: "Pensés pour tous, ouverts sur le monde. Nous mettons les créateurs sous les projecteurs et les connectons à une audience globale." },
  { Icon: Zap,    title: 'Innovation concrète',  desc: "GoFolyX est conçu pour les réalités du terrain, avec des solutions adaptées à chaque utilisateur, pas pour un profil hypothétique." },
  { Icon: Users,  title: 'Communauté avant tout',desc: "La plateforme n'est pas juste un catalogue — c'est un espace de vie où fans, artistes et créateurs se retrouvent, discutent et grandissent ensemble." },
];

const CHIFFRES = [
  { value: '50k+', label: 'Créateurs actifs' },
  { value: '12',   label: 'Pays couverts'    },
  { value: '2M+',  label: 'Vues / mois'      },
  { value: '98%',  label: 'Satisfaction'      },
];

const EQUIPE = [
  { name: 'Oumar Bako',       role: 'Co-fondateur & CEO'   },
  { name: 'Fatoumata Diallo', role: 'CTO'                  },
  { name: 'Awa Coulibaly',    role: 'Directrice Créative'  },
  { name: 'Ismaël Traoré',    role: 'Head of Growth'       },
];

export default function AboutPage() {
  const navigate  = useNavigate();
  const { isDark } = useThemeStore();

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
      <section className="relative overflow-hidden py-24 px-6 text-center">
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #7B3FF230, transparent)' }} />
        <p className="text-sm font-semibold uppercase tracking-widest mb-4"
          style={{ color: 'var(--primary)' }}>Notre histoire</p>
        <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
          La culture africaine<br />
          <span style={{ background: 'linear-gradient(135deg,#7B3FF2,#9B65F5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            mérite sa scène
          </span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          GoFolyX est né d'un constat simple : les créateurs manquent de visibilité et les fans manquent d'accès. Nous avons construit la plateforme qui change ça.
        </p>
      </section>

      {/* Chiffres */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {CHIFFRES.map(({ value, label }) => (
            <div key={label} className="rounded-2xl p-6 text-center"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <div className="text-4xl font-black mb-1"
                style={{ background: 'linear-gradient(135deg,#7B3FF2,#9B65F5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {value}
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Target size={20} style={{ color: 'var(--primary)' }} />
              <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--primary)' }}>Mission</span>
            </div>
            <h2 className="text-3xl font-black mb-6">
              Connecter les talents et les audiences sans frontières
            </h2>
            <p className="leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
              GoFolyX est une plateforme de streaming culturel fondée en 2026. Nous combinons divertissement vidéo, billetterie événementielle, concerts en live et communautés pour offrir une expérience complète — accessible partout dans le monde.
            </p>
            <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Nous collaborons avec des artistes, labels, promoteurs d'événements et studios pour rendre la culture accessible à tous, même avec une connexion limitée.
            </p>
          </div>
          <div className="rounded-3xl overflow-hidden aspect-square flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7B3FF215,#9B65F510)', border: '1px solid var(--border)' }}>
            <div className="text-center p-8">
              <Globe size={48} style={{ color: 'var(--primary)', margin: '0 auto 16px' }} />
              <p className="font-bold text-lg mb-2">GoFolyX</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Une plateforme mondiale<br />au service des créateurs
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Valeurs */}
      <section className="py-16 px-6" style={{ background: 'var(--bg-secondary)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>Ce qui nous guide</p>
            <h2 className="text-3xl font-black">Nos valeurs</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {VALEURS.map(({ Icon, title, desc }) => (
              <div key={title} className="rounded-2xl p-6 flex gap-4"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#7B3FF220,#9B65F515)' }}>
                  <Icon size={20} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <h3 className="font-bold mb-2">{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Equipe */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>Les visages</p>
            <h2 className="text-3xl font-black">Notre équipe</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {EQUIPE.map(({ name, role }) => (
              <div key={name} className="rounded-2xl p-5 text-center"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#7B3FF2,#9B65F5)' }}>
                  <span className="text-white font-black text-lg">{name.charAt(0)}</span>
                </div>
                <p className="font-bold text-sm mb-1">{name}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 text-center">
        <div className="max-w-xl mx-auto rounded-3xl p-12"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
          <Award size={40} className="mx-auto mb-4 text-white opacity-80" />
          <h2 className="text-2xl font-black text-white mb-3">Rejoindre l'aventure</h2>
          <p className="text-white/70 mb-6 text-sm leading-relaxed">
            Nous recrutons des passionnés. Consultez nos offres ou contactez-nous directement.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate('/carrieres')}
              className="px-6 py-3 rounded-xl font-semibold text-sm bg-white text-purple-700 hover:opacity-90 transition-opacity">
              Voir les offres
            </button>
            <a href="mailto:contact@gofolyx.app"
              className="px-6 py-3 rounded-xl font-semibold text-sm text-white border border-white/30 hover:bg-white/10 transition-colors">
              Nous contacter
            </a>
          </div>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className="py-8 text-center text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>
        © 2025 GoFolyX. Tous droits réservés.
      </footer>
    </div>
  );
}
