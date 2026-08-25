import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Clock, Briefcase, ArrowRight,
  Users, Zap, Heart, Globe, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { Images } from '../components/assets';

interface Offre {
  id:       string;
  titre:    string;
  dept:     string;
  lieu:     string;
  type:     'CDI' | 'CDD' | 'Stage' | 'Freelance';
  remote:   boolean;
  desc:     string;
  missions: string[];
  profil:   string[];
}

const OFFRES: Offre[] = [
  {
    id:     'dev-fullstack',
    titre:  'Développeur·se Full-Stack (React + FastAPI)',
    dept:   'Engineering',
    lieu:   'Abidjan ou Remote',
    type:   'CDI',
    remote: true,
    desc:   "Rejoignez l'équipe core pour développer les nouvelles fonctionnalités de Gofolyx — du feed en temps réel aux outils créateurs.",
    missions: [
      'Développer de nouvelles features frontend (React + TypeScript)',
      'Concevoir et maintenir les API FastAPI/PostgreSQL',
      'Participer aux code reviews et à l\'architecture technique',
      'Améliorer les performances et la scalabilité',
    ],
    profil: [
      '3+ ans d\'expérience en développement web',
      'Maîtrise de React, TypeScript et Python',
      'Expérience avec PostgreSQL et architectures REST/WebSocket',
      'Passion pour les produits à fort impact',
    ],
  },
  {
    id:     'product-manager',
    titre:  'Product Manager',
    dept:   'Produit',
    lieu:   'Abidjan',
    type:   'CDI',
    remote: false,
    desc:   "Vous serez responsable de la roadmap d'une verticale clé (Événements ou Créateurs) et travaillerez au contact direct des utilisateurs.",
    missions: [
      'Définir et prioriser le backlog de votre verticale',
      'Conduire les interviews utilisateurs et analyser les métriques',
      'Rédiger des specs claires pour l\'équipe engineering',
      'Suivre les KPIs et itérer vite sur les hypothèses produit',
    ],
    profil: [
      '2+ ans d\'expérience en product management',
      'Capacité à lire et interpréter des données (Mixpanel, SQL)',
      'Excellentes compétences de communication',
      'Intérêt pour le secteur culturel et créatif africain',
    ],
  },
  {
    id:     'content-manager',
    titre:  'Content & Community Manager',
    dept:   'Growth',
    lieu:   'Dakar ou Remote',
    type:   'CDI',
    remote: true,
    desc:   "Vous animez notre présence sur les réseaux sociaux, gérez les relations avec les créateurs et construisez la communauté Gofolyx.",
    missions: [
      'Créer et publier du contenu sur Instagram, TikTok, X',
      'Animer la communauté et répondre aux messages',
      'Identifier et onboarder de nouveaux créateurs partenaires',
      'Produire des newsletters et articles de blog',
    ],
    profil: [
      'Excellente maîtrise du français écrit',
      'Sensibilité aux tendances culturelles africaines',
      'Expérience en gestion de communauté',
      'Bonus : notions de montage vidéo',
    ],
  },
  {
    id:     'stage-design',
    titre:  'Stage UI/UX Design (6 mois)',
    dept:   'Design',
    lieu:   'Remote',
    type:   'Stage',
    remote: true,
    desc:   "Un stage concret où vous travaillerez sur l'interface mobile et web de Gofolyx, avec de vraies responsabilités dès le premier jour.",
    missions: [
      'Concevoir des maquettes et prototypes Figma',
      'Réaliser des tests utilisateurs et analyser les retours',
      'Créer des assets visuels pour la communication',
      'Itérer sur l\'expérience onboarding et les flows critiques',
    ],
    profil: [
      'Formation en design (licence ou master)',
      'Maîtrise de Figma',
      'Intérêt pour les apps mobiles et les produits grand public',
      'Curiosité et capacité à prendre des initiatives',
    ],
  },
];

const DEPTS = ['Tous', 'Engineering', 'Produit', 'Growth', 'Design'];

const AVANTAGES = [
  { Icon: Globe,   title: 'Remote-friendly',    desc: 'La majorité de nos postes sont ouverts en full remote depuis l\'Afrique ou l\'Europe.' },
  { Icon: Zap,     title: 'Impact immédiat',    desc: 'Des équipes réduites où chaque contribution façonne directement le produit.' },
  { Icon: Heart,   title: 'Mission culturelle', desc: 'Travailler ici, c\'est contribuer à valoriser les créateurs africains à l\'international.' },
  { Icon: Users,   title: 'Équipe diverse',     desc: 'Des profils de 8 nationalités, une culture d\'entreprise inclusive et bienveillante.' },
];

export default function CarrieresPage() {
  const navigate    = useNavigate();
  const { isDark }  = useThemeStore();
  const [dept, setDept]     = useState('Tous');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = OFFRES.filter(o => dept === 'Tous' || o.dept === dept);

  const typeColor: Record<Offre['type'], string> = {
    CDI:       '#10B981',
    CDD:       '#3B82F6',
    Stage:     '#F97316',
    Freelance: '#8B5CF6',
  };

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
      <section className="relative overflow-hidden py-20 px-6 text-center">
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, #7B3FF225, transparent)' }} />
        <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>Carrières</p>
        <h1 className="text-4xl md:text-5xl font-black mb-4">
          Construisons ensemble<br />
          <span style={{ background: 'linear-gradient(135deg,#7B3FF2,#9B65F5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            le futur culturel
          </span>
        </h1>
        <p className="max-w-xl mx-auto text-base" style={{ color: 'var(--text-secondary)' }}>
          Rejoignez une équipe passionnée qui réinvente l'accès à la culture en Afrique et dans le monde.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span style={{ color: 'var(--text-secondary)' }}>{OFFRES.length} postes ouverts</span>
        </div>
      </section>

      {/* Avantages */}
      <section className="py-12 px-6" style={{ background: 'var(--bg-secondary)' }}>
        <div className="max-w-5xl mx-auto grid md:grid-cols-4 gap-5">
          {AVANTAGES.map(({ Icon, title, desc }) => (
            <div key={title} className="rounded-2xl p-5"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: '#7B3FF215' }}>
                <Icon size={18} style={{ color: 'var(--primary)' }} />
              </div>
              <h3 className="font-bold text-sm mb-1">{title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Offres */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-black mb-6">Offres d'emploi</h2>

        {/* Filtres */}
        <div className="flex gap-2 flex-wrap mb-8">
          {DEPTS.map(d => (
            <button key={d} onClick={() => setDept(d)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={dept === d
                ? { background: 'var(--primary)', color: '#fff' }
                : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
              }>
              {d}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filtered.map(offre => {
            const open = expanded === offre.id;
            return (
              <div key={offre.id} className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                {/* En-tête offre */}
                <button className="w-full flex items-start gap-4 p-5 text-left"
                  onClick={() => setExpanded(open ? null : offre.id)}>
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: '#7B3FF215' }}>
                    <Briefcase size={18} style={{ color: 'var(--primary)' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">{offre.titre}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span className="flex items-center gap-1"><MapPin size={11} />{offre.lieu}</span>
                      <span className="flex items-center gap-1"><Clock size={11} />{offre.dept}</span>
                      <span className="px-2 py-0.5 rounded-full font-semibold text-white"
                        style={{ background: typeColor[offre.type] }}>
                        {offre.type}
                      </span>
                      {offre.remote && (
                        <span className="px-2 py-0.5 rounded-full"
                          style={{ background: '#10B98120', color: '#10B981' }}>
                          Remote OK
                        </span>
                      )}
                    </div>
                  </div>
                  {open ? <ChevronUp size={18} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={18} style={{ color: 'var(--text-tertiary)' }} />}
                </button>

                {/* Détail */}
                {open && (
                  <div className="px-5 pb-6 border-t" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-sm leading-relaxed mt-4 mb-5" style={{ color: 'var(--text-secondary)' }}>
                      {offre.desc}
                    </p>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-bold text-sm mb-3">Missions</h4>
                        <ul className="space-y-2">
                          {offre.missions.map(m => (
                            <li key={m} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                              <ArrowRight size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
                              {m}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm mb-3">Profil recherché</h4>
                        <ul className="space-y-2">
                          {offre.profil.map(p => (
                            <li key={p} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                              <ArrowRight size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <a href={`mailto:rh@gofolyx.com?subject=Candidature — ${offre.titre}`}
                      className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl text-sm font-semibold text-white"
                      style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
                      Postuler par email
                      <ArrowRight size={14} />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Candidature spontanée */}
        <div className="mt-12 rounded-3xl p-8 text-center"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <h2 className="text-xl font-black mb-2">Pas de poste qui vous correspond ?</h2>
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
            Envoyez-nous une candidature spontanée avec votre CV et une courte présentation de votre profil.
          </p>
          <a href="mailto:rh@gofolyx.com?subject=Candidature spontanée"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            Candidature spontanée
            <ArrowRight size={14} />
          </a>
        </div>
      </section>

      <footer className="py-8 text-center text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>
        © 2025 Gofolyx. Tous droits réservés.
      </footer>
    </div>
  );
}
