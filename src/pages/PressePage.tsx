import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, ExternalLink, Mail, FileText, Image } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { Images } from '../components/assets';

const COMMUNIQUES = [
  {
    date:  'Mai 2025',
    title: 'GoFolyX franchit le cap des 50 000 créateurs actifs',
    desc:  'La plateforme culturelle africaine annonce une croissance de 300% en 12 mois et l\'ouverture de son bureau parisien.',
  },
  {
    date:  'Mars 2025',
    title: 'Levée de fonds seed : GoFolyX sécurise 2 M€ pour accélérer',
    desc:  'Avec cette levée, GoFolyX renforce son infrastructure technique, son équipe et son expansion vers 5 nouveaux pays d\'Afrique de l\'Ouest.',
  },
  {
    date:  'Janvier 2025',
    title: 'Lancement officiel de GoFolyX en Côte d\'Ivoire, Sénégal et Mali',
    desc:  'Après 6 mois de bêta, la plateforme s\'ouvre au grand public avec déjà 10 000 utilisateurs inscrits et 200 artistes partenaires.',
  },
];

const RETOMBEES = [
  { media: 'Jeune Afrique', type: 'Article', date: 'Juin 2025', title: '"GoFolyX, le Netflix africain qui mise sur les créateurs"' },
  { media: 'Le Monde',      type: 'Article', date: 'Avril 2025',title: '"Start-up : les plateformes qui réinventent le divertissement en Afrique"' },
  { media: 'RFI',           type: 'Radio',   date: 'Mars 2025', title: 'Interview CEO — "La culture africaine a enfin sa scène numérique"' },
  { media: 'Forbes Afrique',type: 'Article', date: 'Fév. 2025', title: '"GoFolyX dans les 10 start-up africaines à suivre en 2025"' },
];

const KIT_ITEMS = [
  { icon: Image,    label: 'Logo pack (SVG + PNG)',         size: '2.4 MB' },
  { icon: Image,    label: 'Screenshots produit HD',        size: '18 MB'  },
  { icon: FileText, label: 'One-pager société (PDF)',       size: '1.1 MB' },
  { icon: FileText, label: 'Biographies équipe fondatrice', size: '0.8 MB' },
];

export default function PressePage() {
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
      <section className="py-20 px-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>Presse & Médias</p>
        <h1 className="text-4xl md:text-5xl font-black mb-4">
          Espace presse GoFolyX
        </h1>
        <p className="max-w-xl mx-auto text-base" style={{ color: 'var(--text-secondary)' }}>
          Retrouvez ici tous nos communiqués, retombées médias et ressources pour journalistes.
        </p>
        <a href="mailto:presse@gofolyx.app"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
          <Mail size={16} />
          Contacter le service presse
        </a>
      </section>

      <div className="max-w-5xl mx-auto px-6 pb-20 space-y-16">
        {/* Chiffres clés */}
        <section>
          <h2 className="text-2xl font-black mb-6">GoFolyX en chiffres</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { v: '50k+', l: 'Créateurs actifs' },
              { v: '2M+',  l: 'Vues / mois'      },
              { v: '12',   l: 'Pays'              },
              { v: '2023', l: 'Fondation'         },
            ].map(({ v, l }) => (
              <div key={l} className="rounded-2xl p-5 text-center"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div className="text-3xl font-black mb-1"
                  style={{ background: 'linear-gradient(135deg,#7B3FF2,#9B65F5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {v}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Communiqués */}
        <section>
          <h2 className="text-2xl font-black mb-6">Communiqués de presse</h2>
          <div className="space-y-4">
            {COMMUNIQUES.map(({ date, title, desc }) => (
              <div key={title} className="rounded-2xl p-6 flex items-start gap-5"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg mt-0.5"
                  style={{ background: '#7B3FF220', color: 'var(--primary)' }}>
                  {date}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold mb-1">{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
                </div>
                <button className="flex-shrink-0 flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
                  style={{ color: 'var(--primary)' }}>
                  <Download size={14} />
                  PDF
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Retombées médias */}
        <section>
          <h2 className="text-2xl font-black mb-6">Retombées médias</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {RETOMBEES.map(({ media, type, date, title }) => (
              <div key={title} className="rounded-2xl p-5 flex flex-col gap-2"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{media}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--bg)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {type}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{date}</span>
                  </div>
                </div>
                <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>{title}</p>
                <button className="self-start flex items-center gap-1 text-xs font-medium"
                  style={{ color: 'var(--primary)' }}>
                  Voir l'article <ExternalLink size={12} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Kit presse */}
        <section>
          <h2 className="text-2xl font-black mb-2">Kit presse</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Téléchargez nos ressources graphiques et documents officiels pour vos articles.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {KIT_ITEMS.map(({ icon: Icon, label, size }) => (
              <button key={label}
                className="flex items-center gap-4 rounded-2xl p-4 text-left transition-opacity hover:opacity-80"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: '#7B3FF220' }}>
                  <Icon size={18} style={{ color: 'var(--primary)' }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{size}</p>
                </div>
                <Download size={16} style={{ color: 'var(--text-tertiary)' }} />
              </button>
            ))}
          </div>
          <button className="w-full py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
            Télécharger tout le kit (.zip)
          </button>
        </section>

        {/* Contact */}
        <section className="rounded-3xl p-10 text-center"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <h2 className="text-2xl font-black mb-3">Contact presse</h2>
          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            Pour toute demande d'interview, de partenariat médias ou d'accréditation événement :
          </p>
          <a href="mailto:presse@gofolyx.app"
            className="text-lg font-bold" style={{ color: 'var(--primary)' }}>
            presse@gofolyx.app
          </a>
          <p className="text-xs mt-4" style={{ color: 'var(--text-tertiary)' }}>
            Nous répondons sous 24h ouvrées.
          </p>
        </section>
      </div>

      <footer className="py-8 text-center text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>
        © 2025 GoFolyX. Tous droits réservés.
      </footer>
    </div>
  );
}
