import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Info, Database, Target, Shield, Users, Globe, Clock, CheckCircle,
  Lock, Smartphone, UserX, RefreshCw, Cpu, ChevronDown, ArrowLeft,
  List, Mail,
} from 'lucide-react';

interface Section {
  key:  string;
  Icon: React.FC<any>;
  title: string;
  body:  string;
}

const SECTIONS: Section[] = [
  {
    key: 'identite', Icon: Info, title: "1. Identité du responsable de traitement",
    body: `Responsable de traitement :
Gofolyx SAS
Email DPO : privacy@gofolyx.com

Gofolyx SAS est responsable du traitement de vos données personnelles collectées via l'application mobile Gofolyx et le site web gofolyx.app.

Pour toute question relative à la protection de vos données, vous pouvez contacter notre Délégué à la Protection des Données (DPO) à l'adresse privacy@gofolyx.com. Nous nous engageons à répondre à toute demande dans un délai maximum de 30 jours.`,
  },
  {
    key: 'collecte', Icon: Database, title: "2. Données collectées",
    body: `Nous collectons les catégories de données suivantes :

Données d'identité et de contact :
• Nom, prénom, nom d'utilisateur, photo de profil
• Adresse e-mail et/ou numéro de téléphone
• Date de naissance (pour vérification de l'âge)

Données de connexion et techniques :
• Adresse IP, type et modèle d'appareil, système d'exploitation
• Identifiants de session, tokens d'authentification
• Version de l'application, langue et fuseau horaire

Contenus et interactions :
• Posts, reels, stories, commentaires, réactions
• Messages privés (chiffrés de bout en bout)
• Historique de visionnage et interactions avec les contenus

Données de localisation :
• Localisation approximative (ville/pays) pour la personnalisation du contenu
• Géolocalisation précise uniquement si vous l'autorisez explicitement

Données financières :
• Historique des transactions GoGold (montants, dates, types)
• Les données bancaires/carte sont gérées exclusivement par nos prestataires de paiement certifiés PCI-DSS (Stripe, Apple Pay, Google Pay)`,
  },
  {
    key: 'finalites', Icon: Target, title: "3. Finalités du traitement",
    body: `Vos données personnelles sont traitées pour les finalités suivantes :

Fourniture du service (nécessaire au contrat) :
• Créer, gérer et sécuriser votre compte utilisateur
• Afficher vos contenus et ceux des personnes que vous suivez
• Traiter les transactions GoGold et gérer votre portefeuille virtuel
• Envoyer les notifications liées à votre activité

Amélioration du service (intérêt légitime) :
• Personnaliser votre fil d'actualité et vos recommandations via nos algorithmes
• Analyser les performances et détecter les bugs
• Prévenir les fraudes, abus et comportements malveillants

Communications (consentement) :
• Vous envoyer des newsletters et communications marketing (uniquement si vous y avez consenti)
• Vous notifier des nouveautés et mises à jour importantes

Obligations légales :
• Conserver certaines données conformément aux obligations légales (comptabilité, lutte contre le blanchiment, etc.)
• Répondre aux réquisitions judiciaires et administratives`,
  },
  {
    key: 'base-legale', Icon: Shield, title: "4. Base légale des traitements",
    body: `Conformément au RGPD, chaque traitement repose sur l'une des bases légales suivantes :

• Exécution du contrat (art. 6.1.b RGPD) : traitements nécessaires à la fourniture du service Gofolyx (compte, contenus, paiements)

• Consentement (art. 6.1.a RGPD) : communications marketing, géolocalisation précise, cookies optionnels — vous pouvez retirer votre consentement à tout moment

• Intérêt légitime (art. 6.1.f RGPD) : amélioration du service, sécurité de la plateforme, prévention des fraudes, analyses d'audience anonymisées

• Obligation légale (art. 6.1.c RGPD) : conservation des données de facturation, réponse aux autorités judiciaires`,
  },
  {
    key: 'partage', Icon: Users, title: "5. Partage et destinataires des données",
    body: `Gofolyx ne vend jamais vos données personnelles à des tiers. Elles peuvent être partagées uniquement dans les cas suivants :

Sous-traitants techniques (traitement pour notre compte) :
• Hébergement cloud (serveurs EU) — AWS / OVH
• Service de paiement — Stripe (certifié PCI-DSS)
• Analytics anonymisés — Mixpanel / Firebase
• Service d'emailing transactionnel — SendGrid
• Authentification sociale — Google, Apple

Tous nos sous-traitants sont liés par des DPA (Data Processing Agreements) conformes au RGPD et ne peuvent utiliser vos données qu'aux fins pour lesquelles nous les mandatons.

Autres utilisateurs Gofolyx :
• Vos contenus publics (posts, reels, profil public) sont visibles conformément à vos paramètres de confidentialité
• Vos messages privés ne sont partagés qu'avec leurs destinataires

Autorités :
• En cas d'obligation légale, judiciaire ou administrative dûment établie`,
  },
  {
    key: 'hebergement', Icon: Globe, title: "6. Hébergement et transferts internationaux",
    body: `Vos données sont hébergées sur des serveurs situés dans l'Union européenne, conformément aux exigences du RGPD.

En cas de transfert hors UE (notamment pour certains services tiers comme Google Analytics, Firebase, AWS us-east) :
• Nous nous assurons de l'existence de garanties appropriées
• Clauses Contractuelles Types (CCT) approuvées par la Commission européenne
• Décision d'adéquation de la Commission pour les pays reconnus équivalents
• Certification Privacy Shield ou mécanisme équivalent en vigueur

Vous pouvez obtenir une copie des garanties mises en place en contactant privacy@gofolyx.com.`,
  },
  {
    key: 'conservation', Icon: Clock, title: "7. Durée de conservation",
    body: `Nous conservons vos données uniquement pour la durée nécessaire aux finalités pour lesquelles elles ont été collectées :

Données de compte actif :
• Pendant toute la durée de vie de votre compte + 30 jours après suppression

Données financières et transactions :
• 10 ans à compter de chaque transaction (obligation comptable légale — Code de commerce)

Logs de connexion et données techniques :
• 12 mois (obligation légale — Loi pour la confiance dans l'économie numérique)

Contenus supprimés par l'utilisateur :
• Effacés immédiatement des flux publics, supprimés des sauvegardes sous 90 jours maximum

Compte désactivé (sans suppression) :
• Données conservées pendant 6 mois, puis anonymisées si aucune réactivation

Consentements marketing :
• 3 ans à compter du dernier contact ou retrait du consentement`,
  },
  {
    key: 'droits', Icon: CheckCircle, title: "8. Vos droits RGPD",
    body: `Conformément au RGPD (articles 15 à 22), vous disposez des droits suivants sur vos données personnelles :

• Droit d'accès (art. 15) : obtenir une copie complète de vos données personnelles traitées par Gofolyx

• Droit de rectification (art. 16) : corriger toute donnée inexacte ou incomplète

• Droit à l'effacement / "droit à l'oubli" (art. 17) : demander la suppression de vos données, sous réserve des obligations légales de conservation

• Droit à la portabilité (art. 20) : recevoir vos données dans un format structuré, couramment utilisé et lisible par machine (JSON/CSV)

• Droit d'opposition (art. 21) : vous opposer au traitement fondé sur l'intérêt légitime, notamment à des fins de prospection commerciale

• Droit à la limitation du traitement (art. 18) : geler temporairement l'utilisation de vos données pendant une vérification ou un litige

Comment exercer vos droits :
→ Par email : privacy@gofolyx.com (réponse sous 30 jours maximum)
→ Depuis l'application : Paramètres > Confidentialité > Mes données

Recours : si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNIL sur www.cnil.fr`,
  },
  {
    key: 'securite', Icon: Lock, title: "9. Sécurité des données",
    body: `Gofolyx met en œuvre un ensemble de mesures techniques et organisationnelles pour protéger vos données :

Mesures techniques :
• Chiffrement des données en transit : TLS 1.3 minimum sur toutes les connexions
• Chiffrement des données au repos : AES-256 pour les données sensibles
• Chiffrement de bout en bout pour les messages privés
• Authentification multi-facteurs disponible pour votre compte
• Hachage irréversible des mots de passe (bcrypt, salt unique)

Mesures organisationnelles :
• Accès aux données strictement limité au personnel autorisé (principe du moindre privilège)
• Formation régulière des équipes aux bonnes pratiques de sécurité
• Audits de sécurité et tests d'intrusion réguliers
• Politique de gestion des incidents de sécurité documentée

En cas de violation de données :
• Gofolyx s'engage à notifier la CNIL dans les 72 heures
• Les utilisateurs concernés seront notifiés dans les meilleurs délais si la violation présente un risque élevé`,
  },
  {
    key: 'cookies', Icon: Smartphone, title: "10. Cookies et technologies de suivi",
    body: `Gofolyx utilise des technologies similaires aux cookies que nous classons en trois catégories :

Strictement nécessaires (toujours actifs) :
• Maintien de votre session authentifiée
• Mémorisation de vos préférences essentielles (thème, langue)
• Sécurité et protection contre la fraude

Fonctionnels (activés par défaut, désactivables) :
• Mémorisation de vos paramètres avancés
• Personnalisation de l'interface

Analytics et mesure d'audience (consentement requis) :
• Analyse du comportement anonymisé pour améliorer l'app
• Comptage des audiences et performances des contenus

Publicité et marketing (consentement requis) :
• Personnalisation des publicités éventuelles

Comment gérer vos préférences :
→ Application : Paramètres > Confidentialité > Cookies et traceurs
→ Vous pouvez retirer votre consentement à tout moment depuis ce menu`,
  },
  {
    key: 'mineurs', Icon: UserX, title: "11. Protection des mineurs",
    body: `Gofolyx est destiné aux personnes âgées de 13 ans et plus. Nous prenons la protection des mineurs très au sérieux.

Mesures en place :
• Vérification de l'âge lors de l'inscription (déclaration de date de naissance)
• Paramètres de confidentialité renforcés pour les comptes dont l'âge déclaré est inférieur à 18 ans
• Contenu sensible masqué par défaut pour les comptes mineurs
• Signalement facilité des profils suspects

Nous ne collectons pas sciemment de données personnelles d'enfants de moins de 13 ans. Si vous êtes un parent ou tuteur légal et pensez qu'un enfant de moins de 13 ans a créé un compte sur Gofolyx, contactez-nous immédiatement à privacy@gofolyx.com.`,
  },
  {
    key: 'ia', Icon: Cpu, title: "12. Intelligence artificielle et algorithmes",
    body: `Gofolyx utilise des systèmes algorithmiques et d'intelligence artificielle pour :

Personnalisation :
• Recommandation de contenus dans votre fil d'actualité
• Suggestion de créateurs et de comptes à suivre
• Sélection des contenus dans l'onglet Découvrir

Modération automatisée :
• Détection de contenus potentiellement violants ou inappropriés
• Filtrage anti-spam dans les commentaires et messages

Droits liés aux décisions automatisées (art. 22 RGPD) :
Si une décision vous concernant (suspension de compte, restriction de visibilité) est prise de manière purement automatisée, vous avez le droit de :
• Demander une intervention humaine
• Exprimer votre point de vue
• Contester la décision

Contactez support@gofolyx.com pour toute demande en ce sens.`,
  },
  {
    key: 'modifications', Icon: RefreshCw, title: "13. Modifications de la politique",
    body: `Gofolyx se réserve le droit de modifier la présente Politique de Confidentialité à tout moment, notamment pour :
• Se conformer aux évolutions légales et réglementaires
• Refléter de nouvelles pratiques de traitement
• Intégrer de nouveaux services ou fonctionnalités

Notification des changements :
• En cas de modification substantielle : notification dans l'application et/ou par email au moins 15 jours avant l'entrée en vigueur
• Pour les modifications mineures : mise à jour silencieuse avec mention de la date

La date de dernière mise à jour est toujours indiquée en haut de ce document.`,
  },
];

// ── Accordion item ─────────────────────────────────────────────────────────────
function AccordionItem({ section, defaultOpen }: { section: Section; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const { Icon } = section;
  const accent = '#7B3FF2';

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-all"
        style={{ background: open ? `${accent}08` : 'transparent' }}
        onMouseEnter={e => !open && (e.currentTarget.style.background = 'var(--bg-secondary)')}
        onMouseLeave={e => !open && (e.currentTarget.style.background = 'transparent')}
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${accent}18` }}>
          <Icon size={15} style={{ color: accent }} />
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
export default function PolitiqueConfidentialitePage() {
  const navigate    = useNavigate();
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const accent      = '#7B3FF2';

  const scrollTo = (key: string) => {
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const BADGES = [
    { label: 'Conforme RGPD',       Icon: Shield },
    { label: 'Chiffrement AES-256', Icon: Lock },
    { label: 'Hébergement UE',      Icon: Globe },
    { label: 'DPO désigné',         Icon: UserX },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 px-4 sm:px-6 py-3 flex items-center gap-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = accent)}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <ArrowLeft size={16} style={{ color: 'var(--text-primary)' }} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
            Politique de confidentialité
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Dernière mise à jour : 1er mai 2026</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}>
          <Shield size={13} style={{ color: accent }} />
          <span className="text-xs font-bold" style={{ color: accent }}>RGPD v2.0</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Intro card ── */}
        <div className="rounded-2xl p-6 flex flex-col sm:flex-row gap-5 items-start"
          style={{ background: `linear-gradient(135deg,${accent}0D,rgba(123,63,242,0.05))`, border: `1px solid ${accent}25` }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: `${accent}20` }}>
            <Shield size={26} style={{ color: accent }} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
              Confidentialité Gofolyx
            </h2>
            <p className="text-sm mb-3" style={{ color: 'var(--text-tertiary)' }}>Gofolyx SAS · DPO : privacy@gofolyx.com</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Nous prenons la protection de vos données très au sérieux. Cette politique explique comment nous collectons, utilisons et protégeons vos informations personnelles.
            </p>
          </div>
        </div>

        {/* ── Badges RGPD ── */}
        <div className="flex flex-wrap gap-3">
          {BADGES.map(({ label, Icon }) => (
            <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: `${accent}12`, border: `1px solid ${accent}25` }}>
              <Icon size={13} style={{ color: accent }} />
              <span className="text-xs font-bold" style={{ color: accent }}>{label}</span>
            </div>
          ))}
        </div>

        {/* ── Layout deux colonnes ── */}
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sommaire sticky */}
          <aside className="lg:w-72 shrink-0">
            <div className="lg:sticky lg:top-20 rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 px-4 py-3"
                style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <List size={14} style={{ color: accent }} />
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
                    <sec.Icon size={12} style={{ color: accent, flexShrink: 0 }} />
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
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {SECTIONS.map((sec, i) => (
                <div key={sec.key} ref={el => { sectionRefs.current[sec.key] = el; }}>
                  <AccordionItem section={sec} defaultOpen={i === 0} />
                </div>
              ))}
            </div>

            {/* Contact DPO */}
            <div className="rounded-2xl p-4 flex items-start gap-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${accent}15` }}>
                <Mail size={16} style={{ color: accent }} />
              </div>
              <div>
                <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                  Contact DPO
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Questions sur vos données ?{' '}
                  <a href="mailto:privacy@gofolyx.com" className="font-semibold" style={{ color: accent }}>
                    privacy@gofolyx.com
                  </a>
                  {' '}— Réponse garantie sous 30 jours.
                </p>
              </div>
            </div>

            {/* CNIL */}
            <div className="rounded-2xl p-4 flex items-start gap-3"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <Info size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 2 }} />
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                Vous pouvez également saisir la CNIL (Commission Nationale de l'Informatique et des Libertés) si vous estimez que vos droits ne sont pas respectés :{' '}
                <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer"
                  className="font-semibold" style={{ color: 'var(--primary)' }}>
                  www.cnil.fr
                </a>
              </p>
            </div>

            {/* Footer */}
            <p className="text-center text-xs py-2" style={{ color: 'var(--text-tertiary)' }}>
              Politique de confidentialité v2.0 · Gofolyx SAS · © 2026 · Tous droits réservés
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
