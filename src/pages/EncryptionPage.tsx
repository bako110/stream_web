import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Lock, KeyRound, ShieldCheck, EyeOff, Server, HelpCircle, Mail,
} from 'lucide-react';

interface Section {
  key:   string;
  Icon:  React.FC<any>;
  title: string;
  body:  string;
}

const SECTIONS: Section[] = [
  {
    key: 'principe', Icon: Lock, title: 'Comment ça fonctionne',
    body: `Le chiffrement de bout en bout garantit que seuls vous et votre correspondant pouvez lire le contenu échangé — messages, appels et statuts concernés. Le contenu est chiffré sur votre appareil avant même de quitter votre téléphone, et n'est déchiffré que sur l'appareil du destinataire.

Personne d'autre ne peut lire ce contenu en clair à aucun moment du trajet — ni les serveurs de GoFolyX, ni un opérateur réseau, ni un tiers qui intercepterait le trafic.`,
  },
  {
    key: 'cles', Icon: KeyRound, title: 'Des clés qui ne quittent jamais votre appareil',
    body: `Chaque appareil génère une paire de clés cryptographiques uniques : une clé publique, partagée pour permettre le chiffrement, et une clé privée, qui ne quitte jamais votre appareil et n'est jamais transmise à GoFolyX.

Seule la clé privée du destinataire peut déchiffrer un contenu chiffré avec sa clé publique. Sans elle, le contenu intercepté reste illisible.`,
  },
  {
    key: 'serveurs', Icon: Server, title: "Ce que voient nos serveurs",
    body: `Nos serveurs ne relaient et ne stockent que des données déjà chiffrées. Ils n'ont pas accès aux clés privées et ne peuvent donc pas déchiffrer le contenu de vos échanges protégés.

Certaines métadonnées techniques (horodatage, identifiants de conversation, taille du contenu) restent nécessairement visibles pour acheminer les messages, conformément à notre Politique de Confidentialité.`,
  },
  {
    key: 'perimetre', Icon: EyeOff, title: 'Ce que couvre le chiffrement de bout en bout',
    body: `Sont protégés par le chiffrement de bout en bout : les statuts (stories) envoyés à vos contacts.

Les contenus publics (posts, reels, lives, commentaires publics) ne sont pas concernés par ce mécanisme puisqu'ils sont, par nature, destinés à être vus par d'autres utilisateurs de la plateforme.`,
  },
  {
    key: 'garanties', Icon: ShieldCheck, title: 'Vérification et confiance',
    body: `Le chiffrement s'applique automatiquement, sans action requise de votre part. Chaque nouvelle session ou nouvel appareil génère ses propres clés, invalidant les anciennes en cas de perte ou de changement de téléphone.

GoFolyX ne peut pas restaurer un contenu chiffré perdu : en l'absence d'accès aux clés privées, aucune récupération n'est possible depuis nos serveurs.`,
  },
];

export default function EncryptionPage() {
  const navigate = useNavigate();

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
            Chiffrement de bout en bout
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Vos statuts, protégés de bout en bout</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Intro card ── */}
        <div className="rounded-2xl p-6 flex flex-col sm:flex-row gap-5 items-start"
          style={{ background: 'linear-gradient(135deg,rgba(123,63,242,0.08),rgba(123,63,242,0.06))', border: '1px solid rgba(123,63,242,0.2)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(123,63,242,0.15)' }}>
            <Lock size={26} style={{ color: 'var(--primary)' }} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
              Vos statuts sont chiffrés de bout en bout
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Personne d'autre que vous et vos destinataires — pas même GoFolyX — ne peut lire le contenu de vos statuts pendant leur transmission.
            </p>
          </div>
        </div>

        {/* ── Sections ── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {SECTIONS.map((sec, i) => (
            <div key={sec.key}
              className="flex items-start gap-3 px-5 py-4"
              style={{ borderBottom: i < SECTIONS.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'rgba(123,63,242,0.12)' }}>
                <sec.Icon size={16} style={{ color: 'var(--primary)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>{sec.title}</p>
                <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans"
                  style={{ color: 'var(--text-secondary)' }}>
                  {sec.body}
                </pre>
              </div>
            </div>
          ))}
        </div>

        {/* ── Contact ── */}
        <div className="rounded-2xl p-4 flex items-start gap-3"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(123,63,242,0.1)' }}>
            <HelpCircle size={16} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
              Des questions sur la sécurité de vos données ?
            </p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Consultez notre{' '}
              <a href="/politique-confidentialite" className="font-semibold" style={{ color: 'var(--primary)' }}>
                Politique de Confidentialité
              </a>
              {' '}ou écrivez-nous à{' '}
              <a href="mailto:privacy@gofolyx.com" className="font-semibold" style={{ color: 'var(--primary)' }}>
                privacy@gofolyx.com
              </a>
            </p>
          </div>
        </div>

        <p className="text-center text-xs py-2 flex items-center justify-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
          <Mail size={12} /> GoFolyX SAS · © 2026 · Tous droits réservés
        </p>
      </div>
    </div>
  );
}
