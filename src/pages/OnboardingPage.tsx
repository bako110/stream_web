import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import {
  StickerClap, StickerWave, StickerCalendarStar,
  StickerUsers, StickerCoin, StickerPlay,
} from '../components/ui/Stickers';
import { StickerStrip, GateHeader, GateFooter } from './LandingPage';
import './landing.css';

const STEPS = [
  {
    Icon: StickerPlay,
    title: 'Reels & contenus courts',
    description: 'Explore des milliers de vidéos courtes de créateurs africains et du monde entier. Like, commente, partage.',
  },
  {
    Icon: StickerWave,
    title: 'Concerts & lives',
    description: 'Assiste à des concerts en direct depuis chez toi. Achète tes billets, regarde en streaming, interagis avec l\'artiste.',
  },
  {
    Icon: StickerCalendarStar,
    title: 'Événements & billets',
    description: 'Découvre les événements près de chez toi. Achète tes billets en toute sécurité et reçois ton QR code instantanément.',
  },
  {
    Icon: StickerClap,
    title: 'Films & séries',
    description: 'Un catalogue immense de films africains et internationaux, séries exclusives. Regarde en HD, à ton rythme.',
  },
  {
    Icon: StickerUsers,
    title: 'Communautés',
    description: 'Rejoins des communautés passionnantes, échange avec des membres qui partagent tes intérêts.',
  },
  {
    Icon: StickerCoin,
    title: 'Monétisation créateur',
    description: 'Deviens créateur, gagne des GoGold, reçois des cadeaux. Retire tes gains directement sur ton compte ou mobile money.',
  },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;
  const Icon    = current.Icon;

  function next() {
    if (isLast) navigate('/auth/login');
    else setStep(s => s + 1);
  }

  return (
    <div className="gate-page min-h-screen flex flex-col">
      {/* Même header que la landing — identité unique sur tout le parcours
          public, avec la navigation catalogue disponible dès l'intro. */}
      <GateHeader />

      {/* Progress bar */}
      <div className="gt-container">
        <div className="flex items-center gap-2">
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => setStep(i)}
              className={`gt-dot${i === step ? ' is-active' : i < step ? ' is-done' : ''}`}
              style={{ flex: 1 }} />
          ))}
        </div>
      </div>

      {/* Visual central — grand sticker + halo sobre */}
      <div className="flex-1 flex items-center justify-center w-full px-8 py-12">
        <div className="relative flex items-center justify-center">
          <div className="absolute rounded-full" style={{
            width: 220, height: 220,
            background: 'radial-gradient(circle, var(--gt-line-2), transparent 70%)',
          }} />
          <div className="relative flex items-center justify-center rounded-3xl gt-tile"
            style={{ width: 168, height: 168, color: 'var(--gt-accent)', cursor: 'default' }}>
            <Icon size={72} />
          </div>
        </div>
      </div>

      {/* Texte + CTA */}
      <div className="gt-container" style={{ maxWidth: 440 }}>
        <div className="pb-8 text-center">
          <h2 className="gt-display text-2xl mb-3 leading-tight">
            {current.title}
          </h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--gt-text-2)' }}>
            {current.description}
          </p>

          <button onClick={next} className="gt-btn gt-btn-accent gt-btn-block">
            {isLast ? <><Check size={18} /> Commencer</> : <>Suivant <ArrowRight size={18} /></>}
          </button>

          {step === 0 && (
            <p className="text-xs mt-4" style={{ color: 'var(--gt-text-3)' }}>
              Déjà un compte ?{' '}
              <button onClick={() => navigate('/auth/login')} className="font-semibold" style={{ color: 'var(--gt-accent)' }}>
                Se connecter
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Bandeau de stickers — même composant que la landing, style identique */}
      <StickerStrip />

      <GateFooter />
    </div>
  );
}
