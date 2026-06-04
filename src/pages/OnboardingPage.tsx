import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Music2, Calendar, Film, Radio, Users, Wallet, ArrowRight, Check } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { Images } from '../components/assets';

const STEPS = [
  {
    icon: Play,
    color: '#E0389A',
    gradient: ['#E0389A', '#7B3FF2'],
    title: 'Reels & Contenus courts',
    description: 'Explorez des milliers de vidéos courtes de créateurs africains et du monde entier. Likez, commentez, partagez.',
    visual: (
      <div className="relative w-full max-w-[240px] mx-auto">
        <div className="rounded-3xl overflow-hidden aspect-[9/16] relative"
          style={{ background: 'linear-gradient(135deg,#1a0533,#2d0f5e)' }}>
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            {[80, 60, 90, 50].map((h, i) => (
              <div key={i} className="mb-1 rounded-full opacity-30"
                style={{ height: 8, width: `${h}%`, background: '#E0389A' }} />
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(224,56,154,0.3)', border: '2px solid rgba(224,56,154,0.6)' }}>
              <Play size={24} fill="white" color="white" />
            </div>
          </div>
        </div>
        <div className="absolute -right-4 top-1/4 flex flex-col gap-3">
          {['❤️', '💬', '↗️'].map((em, i) => (
            <div key={i} className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-lg"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>{em}</div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Music2,
    color: '#7B3FF2',
    gradient: ['#7B3FF2', '#3B82F6'],
    title: 'Concerts & Lives',
    description: 'Assistez à des concerts en direct depuis votre salon. Achetez vos billets, regardez en streaming, interagissez avec l\'artiste.',
    visual: (
      <div className="relative w-full max-w-[280px] mx-auto">
        <div className="rounded-3xl overflow-hidden p-5"
          style={{ background: 'linear-gradient(135deg,#1a0533,#0d0118)', border: '1px solid rgba(123,63,242,0.3)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#F0365A' }} />
            <span className="text-xs font-bold text-white">EN DIRECT</span>
            <span className="ml-auto text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>12.4K</span>
          </div>
          <div className="rounded-2xl aspect-video mb-3 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)' }}>
            <Music2 size={40} color="white" />
          </div>
          <p className="text-white font-bold text-sm">Concert Afrobeat Festival</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Artiste vedette · Dakar, SN</p>
        </div>
      </div>
    ),
  },
  {
    icon: Calendar,
    color: '#F59E0B',
    gradient: ['#F59E0B', '#EF4444'],
    title: 'Événements & Billets',
    description: 'Découvrez les événements près de chez vous. Achetez vos billets en toute sécurité et recevez votre QR code instantanément.',
    visual: (
      <div className="relative w-full max-w-[280px] mx-auto space-y-3">
        {[
          { label: 'AfroVibes Festival', date: '28 Juin · Dakar', color: '#F59E0B' },
          { label: 'Tech Summit 2026', date: '5 Juil · Abidjan', color: '#3B82F6' },
          { label: 'Fashion Week', date: '12 Juil · Paris', color: '#E0389A' },
        ].map((ev, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-2xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: ev.color + '20' }}>
              <Calendar size={18} style={{ color: ev.color }} />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{ev.label}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{ev.date}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Film,
    color: '#3B82F6',
    gradient: ['#3B82F6', '#6366F1'],
    title: 'Films & Séries',
    description: 'Un catalogue immense de films africains et internationaux, séries exclusives. Regardez en HD, à votre rythme.',
    visual: (
      <div className="relative w-full max-w-[280px] mx-auto">
        <div className="grid grid-cols-3 gap-2">
          {['#7B3FF2', '#E0389A', '#3B82F6', '#F59E0B', '#10B981', '#F0365A'].map((c, i) => (
            <div key={i} className="rounded-xl aspect-[2/3] flex items-center justify-center"
              style={{ background: `linear-gradient(135deg,${c}60,${c}20)`, border: `1px solid ${c}30` }}>
              <Film size={20} style={{ color: c }} />
            </div>
          ))}
        </div>
        <div className="absolute -bottom-2 left-0 right-0 h-8 rounded-b-xl"
          style={{ background: 'linear-gradient(to top, var(--bg), transparent)' }} />
      </div>
    ),
  },
  {
    icon: Users,
    color: '#36D9A0',
    gradient: ['#36D9A0', '#3B82F6'],
    title: 'Communautés',
    description: 'Rejoignez des communautés passionnantes, échangez avec des membres partageant vos intérêts, participez aux discussions.',
    visual: (
      <div className="relative w-full max-w-[280px] mx-auto space-y-3">
        {[
          { name: 'Afrobeats Lovers', members: '24.5K', color: '#E0389A' },
          { name: 'Cinéphiles Africains', members: '8.2K', color: '#3B82F6' },
          { name: 'Entrepreneurs', members: '15.1K', color: '#36D9A0' },
        ].map((c, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-2xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shrink-0"
              style={{ background: `linear-gradient(135deg,${c.color},${c.color}90)` }}>
              {c.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{c.members} membres</p>
            </div>
            <div className="px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ background: c.color + '20', color: c.color }}>
              Rejoindre
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Wallet,
    color: '#F0365A',
    gradient: ['#F0365A', '#7B3FF2'],
    title: 'Monétisation & Coins',
    description: 'Devenez créateur, gagnez des coins, envoyez des cadeaux. Retirez vos gains directement sur votre compte ou mobile money.',
    visual: (
      <div className="relative w-full max-w-[280px] mx-auto">
        <div className="rounded-3xl overflow-hidden p-5"
          style={{ background: 'linear-gradient(135deg,#1a0533,#0d0118)', border: '1px solid rgba(240,54,90,0.3)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>Solde GoFolyX Coins</p>
            <Wallet size={16} color="#F0365A" />
          </div>
          <p className="text-3xl font-black text-white mb-1">2,450 <span className="text-lg">FXC</span></p>
          <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>≈ 24.50 €</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Acheter', color: '#36D9A0' },
              { label: 'Envoyer', color: '#3B82F6' },
              { label: 'Retirer', color: '#F59E0B' },
            ].map(btn => (
              <div key={btn.label} className="py-2 rounded-xl text-center text-xs font-bold"
                style={{ background: btn.color + '20', color: btn.color }}>{btn.label}</div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
];

export default function OnboardingPage() {
  const navigate      = useNavigate();
  const { isDark }    = useThemeStore();
  const [step, setStep] = useState(0);

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;
  const Icon    = current.icon;
  const [g1, g2] = current.gradient;

  function next() {
    if (isLast) {
      navigate('/auth/login');
    } else {
      setStep(s => s + 1);
    }
  }

  function skip() {
    navigate('/auth/login');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-between overflow-hidden"
      style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="w-full flex items-center justify-between px-6 pt-6">
        <img src={isDark ? Images.logoDark : Images.logoLight} alt="GoFolyX" className="h-8 w-auto" />
        {!isLast && (
          <button onClick={skip} className="text-sm font-semibold px-3 py-1.5 rounded-xl transition-all"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
            Passer
          </button>
        )}
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2 mt-4">
        {STEPS.map((_, i) => (
          <button key={i} onClick={() => setStep(i)}
            className="rounded-full transition-all duration-300"
            style={{
              width:  i === step ? 24 : 8,
              height: 8,
              background: i === step
                ? `linear-gradient(90deg,${g1},${g2})`
                : i < step ? g1 + '60' : 'var(--border)',
            }} />
        ))}
      </div>

      {/* Visual */}
      <div className="flex-1 flex items-center justify-center w-full px-8 py-6">
        {current.visual}
      </div>

      {/* Text content */}
      <div className="w-full max-w-md px-6 pb-8">
        {/* Icon badge */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: `linear-gradient(135deg,${g1},${g2})` }}>
            <Icon size={28} color="white" />
          </div>
        </div>

        <h2 className="text-2xl font-black text-center mb-3 leading-tight" style={{ color: 'var(--text-primary)' }}>
          {current.title}
        </h2>
        <p className="text-center text-sm leading-relaxed mb-8" style={{ color: 'var(--text-secondary)' }}>
          {current.description}
        </p>

        {/* CTA button */}
        <button onClick={next}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-white text-sm transition-all active:scale-95"
          style={{ background: `linear-gradient(90deg,${g1},${g2})`, boxShadow: `0 8px 24px ${g1}40` }}>
          {isLast
            ? <><Check size={18} /> Commencer</>
            : <>Suivant <ArrowRight size={18} /></>
          }
        </button>

        {step === 0 && (
          <p className="text-center text-xs mt-4" style={{ color: 'var(--text-tertiary)' }}>
            Deja un compte ?{' '}
            <button onClick={() => navigate('/auth/login')} className="font-semibold" style={{ color: 'var(--primary)' }}>
              Se connecter
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
