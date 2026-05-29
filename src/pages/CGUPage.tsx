import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, UserCheck, Edit3, Shield, Zap, AlertTriangle, Tv,
  Link2, XCircle, Info, RefreshCw, Globe, ChevronDown, ArrowLeft,
  List, Mail,
} from 'lucide-react';

interface Section {
  key:   string;
  Icon:  React.FC<any>;
  title: string;
  body:  string;
}

const SECTIONS: Section[] = [
  {
    key: 'objet', Icon: FileText, title: "1. Objet et champ d'application",
    body: `Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de la plateforme FoliX (application mobile et site web folix.app), éditée par FoliX SAS, société par actions simplifiée au capital de 10 000 €, immatriculée au RCS de Paris.

En créant un compte ou en accédant à l'application, vous acceptez sans réserve les présentes CGU dans leur intégralité. Si vous n'acceptez pas ces conditions, vous devez cesser immédiatement d'utiliser la plateforme.

Les CGU peuvent évoluer à tout moment. La version en vigueur est celle publiée dans l'application, datée en haut de ce document.`,
  },
  {
    key: 'eligibilite', Icon: UserCheck, title: "2. Éligibilité et inscription",
    body: `Pour utiliser FoliX, vous devez :
• Avoir au moins 13 ans (ou l'âge légal de majorité numérique dans votre pays si supérieur)
• Fournir des informations exactes, complètes et à jour lors de votre inscription
• Ne pas avoir été précédemment banni de la plateforme

Vous êtes seul responsable de la confidentialité de vos identifiants (email/téléphone et mot de passe). Toute action réalisée depuis votre compte vous est réputée imputable. En cas d'accès non autorisé, contactez-nous immédiatement à support@folix.app.

FoliX se réserve le droit de refuser l'inscription ou de suspendre un compte sans justification préalable, notamment en cas de suspicion de fraude ou de comportement contraire aux présentes CGU.`,
  },
  {
    key: 'contenu', Icon: Edit3, title: "3. Contenu publié par les utilisateurs",
    body: `Vous conservez l'intégralité des droits de propriété intellectuelle sur les contenus que vous créez et publiez (posts, reels, stories, commentaires, sons, vidéos en direct, etc.).

En publiant du contenu sur FoliX, vous accordez à FoliX une licence mondiale, non exclusive, gratuite, sous-licenciable et transférable pour héberger, afficher, reproduire, distribuer, adapter et promouvoir ces contenus dans le cadre de la fourniture et de la promotion du service.

Sont strictement interdits :
• Les contenus illicites, haineux, discriminatoires, racistes ou incitant à la violence
• Les contenus sexuellement explicites impliquant des mineurs (CSAM) — passibles de poursuites pénales
• Les contenus portant atteinte aux droits de tiers (droits d'auteur, marques, vie privée, droit à l'image)
• Le spam, les arnaques, le phishing, la désinformation délibérée et les théories du complot dangereuses
• Les contenus promouvant des activités illégales (trafic, terrorisme, drogues, armes)

FoliX utilise des systèmes automatisés et des équipes de modération pour détecter et retirer les contenus non conformes.`,
  },
  {
    key: 'confidentialite', Icon: Shield, title: "4. Confidentialité et données personnelles",
    body: `FoliX collecte et traite vos données personnelles conformément à sa Politique de Confidentialité, disponible dans l'application et consultable à tout moment.

Points clés :
• Vos données sont hébergées en Europe (Union européenne)
• Elles sont protégées par les dispositions du RGPD
• Vous disposez d'un droit d'accès, de rectification, de suppression, de portabilité et d'opposition
• Vous pouvez exercer vos droits à l'adresse : privacy@folix.app
• Vous pouvez également saisir la CNIL (www.cnil.fr) en cas de litige

FoliX ne vend jamais vos données personnelles à des tiers.`,
  },
  {
    key: 'monetisation', Icon: Zap, title: "5. Coins, monétisation et paiements",
    body: `FoliX propose un système de Coins (monnaie virtuelle interne) permettant d'accéder à des fonctionnalités premium, d'envoyer des cadeaux virtuels à des créateurs ou d'acheter des contenus exclusifs.

Conditions d'achat et d'utilisation :
• Les Coins s'achètent via les stores officiels (Apple App Store, Google Play) ou sur folix.app
• Les Coins achetés sont définitifs et non remboursables, sauf obligation légale contraire
• Les Coins n'ont aucune valeur monétaire réelle en dehors du programme de monétisation FoliX
• Ils ne peuvent pas être échangés contre de l'argent réel, sauf dans le cadre du Programme Créateur FoliX sous réserve d'éligibilité

Programme Créateur :
• Les créateurs éligibles peuvent convertir leurs Coins reçus en revenus réels
• FoliX retient une commission définie dans les conditions du Programme Créateur
• Les revenus sont soumis aux obligations fiscales applicables dans votre pays

FoliX se réserve le droit de modifier les tarifs, les taux de conversion et les conditions du programme à tout moment, avec préavis de 15 jours.`,
  },
  {
    key: 'comportement', Icon: AlertTriangle, title: "6. Comportements interdits",
    body: `En utilisant FoliX, vous vous engagez à ne pas :

Harcèlement et violence :
• Harceler, intimider, menacer, stalker ou abuser verbalement d'autres utilisateurs
• Encourager ou coordonner des campagnes de harcèlement collectif

Fraude et sécurité :
• Usurper l'identité d'une personne physique, d'une organisation ou d'une marque
• Créer des comptes multiples pour contourner une suspension
• Tenter d'accéder sans autorisation aux systèmes, serveurs ou comptes d'autres utilisateurs

Automatisation non autorisée :
• Utiliser des robots (bots), scrapers, crawlers ou tout outil automatisé non expressément autorisé
• Manipuler artificiellement les métriques d'engagement (vues, likes, followers)
• Spammer des utilisateurs via les messages privés ou les commentaires

Tout manquement grave peut entraîner la suspension temporaire ou la suppression définitive du compte, sans préavis ni remboursement des Coins éventuels.`,
  },
  {
    key: 'ip', Icon: Tv, title: "7. Propriété intellectuelle",
    body: `L'application FoliX, son nom, ses logos, son design, son code source, ses algorithmes, ses bases de données et l'ensemble de ses composants sont la propriété exclusive de FoliX SAS et/ou de ses licenciés, protégés par le droit français et international de la propriété intellectuelle.

Toute reproduction, modification, adaptation, traduction, distribution ou exploitation commerciale non autorisée est strictement interdite et passible de poursuites civiles et pénales.

Les marques, noms commerciaux et logos des partenaires ou tiers présents sur la plateforme restent la propriété de leurs détenteurs respectifs.

Si vous pensez qu'un contenu publié sur FoliX porte atteinte à vos droits d'auteur, contactez notre équipe à : dmca@folix.app`,
  },
  {
    key: 'services-tiers', Icon: Link2, title: "8. Services tiers et liens externes",
    body: `FoliX peut contenir des liens vers des sites ou services tiers (réseaux sociaux, services de paiement, partenaires, etc.). Ces liens sont fournis à titre informatif uniquement.

FoliX n'exerce aucun contrôle sur le contenu, les politiques de confidentialité ou les pratiques des sites tiers et décline toute responsabilité à leur égard.

L'utilisation de fonctionnalités d'authentification ou de partage vers des plateformes tierces (Google, Apple, etc.) est soumise aux conditions générales de ces plateformes.`,
  },
  {
    key: 'resiliation', Icon: XCircle, title: "9. Résiliation et suppression de compte",
    body: `Vous pouvez supprimer votre compte FoliX à tout moment depuis :
Paramètres > Compte > Zone dangereuse > Supprimer mon compte

Effets de la suppression :
• Vos données personnelles sont effacées sous 30 jours (délai légal de rétention)
• Vos contenus publiés sont supprimés des flux, mais peuvent être conservés temporairement dans nos sauvegardes
• Les Coins non utilisés sont définitivement perdus sans remboursement
• Les abonnements actifs ne sont pas automatiquement annulés — gérez-les depuis votre store

FoliX se réserve le droit de suspendre ou supprimer tout compte :
• En cas de violation grave ou répétée des CGU
• En cas d'inactivité prolongée (compte inactif depuis plus de 24 mois)
• Sur décision judiciaire ou administrative`,
  },
  {
    key: 'responsabilite', Icon: Info, title: "10. Limitation de responsabilité",
    body: `FoliX est fourni "en l'état" et "selon disponibilité", sans garantie d'aucune sorte, expresse ou implicite.

FoliX ne peut être tenu responsable :
• Des interruptions de service, pannes, erreurs ou pertes de données, même temporaires
• Des dommages directs ou indirects résultant de l'utilisation ou de l'impossibilité d'utiliser la plateforme
• Du contenu publié par les utilisateurs tiers
• Des actes malveillants de tiers (piratage, phishing, etc.) non imputables à FoliX

La responsabilité totale de FoliX, quelle qu'en soit la cause, est limitée au montant payé par l'utilisateur à FoliX au cours des 12 derniers mois précédant le dommage.`,
  },
  {
    key: 'modifications', Icon: RefreshCw, title: "11. Modifications des CGU",
    body: `FoliX se réserve le droit de modifier les présentes CGU à tout moment, notamment pour s'adapter aux évolutions légales, réglementaires ou fonctionnelles de la plateforme.

En cas de modification substantielle :
• Vous serez notifié par une alerte dans l'application et/ou par email au moins 15 jours avant l'entrée en vigueur
• La poursuite de l'utilisation de l'application après cette date vaut acceptation des nouvelles CGU
• Si vous refusez les nouvelles CGU, vous devrez supprimer votre compte

La date de dernière mise à jour est toujours indiquée en haut de ce document.`,
  },
  {
    key: 'droit', Icon: Globe, title: "12. Droit applicable et juridiction",
    body: `Les présentes CGU sont régies par le droit français.

En cas de litige :
• Nous vous encourageons à nous contacter d'abord à legal@folix.app pour tenter une résolution amiable
• À défaut d'accord amiable dans un délai de 30 jours, le litige sera soumis aux tribunaux compétents de Paris
• Pour les consommateurs résidant dans l'Union européenne, vous pouvez recourir à la plateforme de règlement en ligne des litiges : ec.europa.eu/consumers/odr

Contact légal : legal@folix.app`,
  },
];

// ── Accordion item ─────────────────────────────────────────────────────────────
function AccordionItem({ section, defaultOpen }: { section: Section; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const { Icon } = section;

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-all"
        style={{ background: open ? 'rgba(123,63,242,0.04)' : 'transparent' }}
        onMouseEnter={e => !open && (e.currentTarget.style.background = 'var(--bg-secondary)')}
        onMouseLeave={e => !open && (e.currentTarget.style.background = 'transparent')}
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(123,63,242,0.12)' }}>
          <Icon size={15} style={{ color: 'var(--primary)' }} />
        </div>
        <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {section.title}
        </span>
        <ChevronDown
          size={16}
          style={{
            color: 'var(--text-tertiary)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 220ms',
            flexShrink: 0,
          }}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1" style={{ background: 'var(--bg)' }}>
          <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans"
            style={{ color: 'var(--text-secondary)' }}>
            {section.body}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function CGUPage() {
  const navigate   = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollTo = (key: string) => {
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 px-4 sm:px-6 py-3 flex items-center gap-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <ArrowLeft size={16} style={{ color: 'var(--text-primary)' }} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
            Conditions d'utilisation
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Dernière mise à jour : 1er mai 2026</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{ background: 'rgba(123,63,242,0.1)', border: '1px solid rgba(123,63,242,0.2)' }}>
          <FileText size={13} style={{ color: 'var(--primary)' }} />
          <span className="text-xs font-bold" style={{ color: 'var(--primary)' }}>CGU v2.0</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Intro card ── */}
        <div className="rounded-2xl p-6 flex flex-col sm:flex-row gap-5 items-start"
          style={{ background: 'linear-gradient(135deg,rgba(123,63,242,0.08),rgba(224,56,154,0.06))', border: '1px solid rgba(123,63,242,0.2)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(123,63,242,0.15)' }}>
            <FileText size={26} style={{ color: 'var(--primary)' }} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
              CGU FoliX
            </h2>
            <p className="text-sm mb-3" style={{ color: 'var(--text-tertiary)' }}>Éditée par FoliX SAS · Paris, France</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Ces conditions régissent votre accès et l'utilisation de la plateforme FoliX. En utilisant FoliX, vous acceptez l'intégralité des présentes conditions.
            </p>
          </div>
        </div>

        {/* ── Layout deux colonnes sur desktop ── */}
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sommaire sticky */}
          <aside className="lg:w-72 shrink-0">
            <div className="lg:sticky lg:top-20 rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 px-4 py-3"
                style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <List size={14} style={{ color: 'var(--primary)' }} />
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Sommaire</span>
              </div>
              <nav className="p-2">
                {SECTIONS.map(sec => (
                  <button
                    key={sec.key}
                    onClick={() => scrollTo(sec.key)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all"
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <sec.Icon size={12} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span className="text-xs font-medium leading-tight" style={{ color: 'var(--text-secondary)' }}>
                      {sec.title.replace(/^\d+\.\s/, '')}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Contenu */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Accordeon */}
            <div ref={contentRef} className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {SECTIONS.map((sec, i) => (
                <div key={sec.key} ref={el => { sectionRefs.current[sec.key] = el; }}>
                  <AccordionItem section={sec} defaultOpen={i === 0} />
                </div>
              ))}
            </div>

            {/* Contact légal */}
            <div className="rounded-2xl p-4 flex items-start gap-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(123,63,242,0.1)' }}>
                <Mail size={16} style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                  Contact légal
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Des questions sur ces conditions ?{' '}
                  <a href="mailto:legal@folix.app" className="font-semibold"
                    style={{ color: 'var(--primary)' }}>legal@folix.app</a>
                </p>
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-xs py-2" style={{ color: 'var(--text-tertiary)' }}>
              CGU version 2.0 · FoliX SAS · © 2026 Sahelys · Tous droits réservés
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
