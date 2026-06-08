import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cookie, Shield, BarChart2, Settings, XCircle } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { Images } from '../components/assets';

interface Section {
  Icon:  React.FC<any>;
  title: string;
  body:  string;
}

const SECTIONS: Section[] = [
  {
    Icon:  Cookie,
    title: '1. Qu\'est-ce qu\'un cookie ?',
    body:  `Un cookie est un petit fichier texte déposé sur votre appareil (ordinateur, téléphone, tablette) lorsque vous visitez un site web ou utilisez une application.

Les cookies permettent au site de mémoriser vos actions et préférences (langue, thème, session de connexion, etc.) afin que vous n'ayez pas à les reconfigurer à chaque visite.`,
  },
  {
    Icon:  Shield,
    title: '2. Cookies strictement nécessaires',
    body:  `Ces cookies sont indispensables au bon fonctionnement de la plateforme GoFolyX. Ils ne peuvent pas être désactivés.

• Session d'authentification (token JWT)
• Préférences de thème (dark/light mode)
• Panier / sélection de billets en cours
• Protection CSRF et sécurité des formulaires

Sans ces cookies, certaines fonctionnalités essentielles ne seraient pas disponibles.`,
  },
  {
    Icon:  BarChart2,
    title: '3. Cookies analytiques',
    body:  `Ces cookies nous aident à comprendre comment vous utilisez GoFolyX afin d'améliorer l'expérience utilisateur. Les données collectées sont agrégées et anonymisées.

• Nombre de visites et pages vues
• Durée de session
• Source de trafic (comment vous êtes arrivé sur la plateforme)
• Fonctionnalités les plus utilisées

Outil utilisé : Mixpanel (données hébergées en Europe).`,
  },
  {
    Icon:  Settings,
    title: '4. Cookies de préférences',
    body:  `Ces cookies mémorisent vos choix personnels pour personnaliser votre expérience.

• Langue d'interface
• Préférences de lecture (qualité vidéo, sous-titres)
• Filtres et tri sauvegardés dans les listes
• Notifications désactivées par catégorie`,
  },
  {
    Icon:  XCircle,
    title: '5. Comment gérer ou désactiver les cookies ?',
    body:  `Vous pouvez à tout moment modifier vos préférences de cookies via :

• Les paramètres de votre navigateur (Chrome, Firefox, Safari, Edge)
• Le panneau de gestion des cookies accessible dans les Paramètres de l'application GoFolyX > Confidentialité

Notez que la désactivation des cookies strictement nécessaires pourrait empêcher l'accès à certaines fonctionnalités de la plateforme.

Pour plus d'informations sur la gestion des cookies, consultez le site de la CNIL : www.cnil.fr`,
  },
];

export default function CookiesPage() {
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
      <section className="py-16 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'linear-gradient(135deg,#7B3FF220,#9B65F510)' }}>
          <Cookie size={28} style={{ color: 'var(--primary)' }} />
        </div>
        <h1 className="text-3xl md:text-4xl font-black mb-3">Politique Cookies</h1>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Dernière mise à jour : juin 2025
        </p>
        <p className="max-w-xl mx-auto mt-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          GoFolyX utilise des cookies et technologies similaires pour faire fonctionner la plateforme, analyser son utilisation et personnaliser votre expérience.
        </p>
      </section>

      {/* Sections */}
      <div className="max-w-3xl mx-auto px-6 pb-16 space-y-4">
        {SECTIONS.map(({ Icon, title, body }) => (
          <div key={title} className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3 p-5 pb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#7B3FF215' }}>
                <Icon size={17} style={{ color: 'var(--primary)' }} />
              </div>
              <h2 className="font-bold">{title}</h2>
            </div>
            <div className="px-5 pb-5">
              <p className="text-sm leading-relaxed whitespace-pre-line"
                style={{ color: 'var(--text-secondary)' }}>
                {body}
              </p>
            </div>
          </div>
        ))}

        {/* Contact */}
        <div className="rounded-2xl p-6 text-center"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
            Des questions sur notre usage des cookies ?
          </p>
          <a href="mailto:privacy@gofolyx.app"
            className="font-semibold text-sm" style={{ color: 'var(--primary)' }}>
            privacy@gofolyx.app
          </a>
        </div>
      </div>

      <footer className="py-8 text-center text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>
        © 2025 GoFolyX. Tous droits réservés.
      </footer>
    </div>
  );
}
