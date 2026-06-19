import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { encodeId } from '../utils/slugId';
import {
  Radio, Video, Calendar, Zap, ChevronRight, Clock, Music,
  Globe, Lock, Coins, Gift, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Spinner } from '../components/ui/Spinner';
import type { LiveStartResponse } from '../types';
import type { GiftType } from '../components/live/LiveGiftModal';

// ── Carte de choix ────────────────────────────────────────────────────────────

function ChoiceCard({
  icon, title, description, badge, onClick, color }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button onClick={onClick}
      className="w-full text-left group transition-all duration-200"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '1.25rem',
        padding: '1.5rem' }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = color;
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 24px ${color}30`;
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
      }}>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: `${color}20` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-[var(--text-primary)] text-lg">{title}</p>
            {badge && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${color}20`, color }}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{description}</p>
        </div>
        <ChevronRight size={20} className="text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors shrink-0" />
      </div>
    </button>
  );
}

// ── Sélecteur monetisation ────────────────────────────────────────────────────

type MonetType = 'none' | 'coins' | 'gift';

interface MonetFormProps {
  label: string;
  value: MonetType;
  coinsAmount: number;
  giftId: string;
  gifts: GiftType[];
  giftsLoading: boolean;
  onChange: (v: MonetType) => void;
  onCoinsChange: (v: number) => void;
  onGiftChange: (id: string) => void;
}

function MonetForm({
  label, value, coinsAmount, giftId, gifts, giftsLoading,
  onChange, onCoinsChange, onGiftChange,
}: MonetFormProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {([
          { key: 'none',  icon: <X size={14} />,      label: 'Gratuit' },
          { key: 'coins', icon: <Coins size={14} />,   label: 'Coins' },
          { key: 'gift',  icon: <Gift size={14} />,    label: 'Cadeau' },
        ] as { key: MonetType; icon: React.ReactNode; label: string }[]).map(opt => (
          <button key={opt.key} type="button" onClick={() => onChange(opt.key)}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all border-2"
            style={{
              borderColor: value === opt.key ? '#7B3FF2' : 'var(--border)',
              background:  value === opt.key ? 'rgba(123,63,242,0.1)' : 'var(--bg-secondary)',
              color:       value === opt.key ? '#7B3FF2' : 'var(--text-secondary)',
            }}>
            {opt.icon} {opt.label}
          </button>
        ))}
      </div>

      {value === 'coins' && (
        <div className="flex items-center gap-3">
          <Coins size={16} style={{ color: '#7B3FF2', shrink: 0 }} />
          <input type="number" min={1} max={99999}
            className="input flex-1"
            placeholder="Montant en coins"
            value={coinsAmount || ''}
            onChange={e => onCoinsChange(Math.max(1, parseInt(e.target.value) || 0))}
          />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>coins</span>
        </div>
      )}

      {value === 'gift' && (
        giftsLoading ? (
          <div className="flex justify-center py-4"><Spinner size="sm" /></div>
        ) : gifts.length === 0 ? (
          <p className="text-xs text-center py-2" style={{ color: 'var(--text-tertiary)' }}>Aucun cadeau disponible</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {gifts.map(g => (
              <button key={g.id} type="button" onClick={() => onGiftChange(g.id)}
                className="flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all"
                style={{
                  borderColor: giftId === g.id ? '#7B3FF2' : 'var(--border)',
                  background:  giftId === g.id ? 'rgba(123,63,242,0.1)' : 'var(--bg-secondary)',
                }}>
                <span className="text-2xl">{g.emoji}</span>
                <span className="text-[10px] truncate w-full text-center font-semibold"
                  style={{ color: giftId === g.id ? '#7B3FF2' : 'var(--text-primary)' }}>
                  {g.name}
                </span>
                <span className="text-[10px] font-bold flex items-center gap-0.5"
                  style={{ color: 'var(--text-tertiary)' }}>
                  <Coins size={8} /> {g.coins_cost}
                </span>
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ── Formulaire live spontané ──────────────────────────────────────────────────

function QuickLiveForm({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();

  // Formulaire de base
  const [title,     setTitle]     = useState('');
  const [desc,      setDesc]      = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  // Monétisation accès
  const [showMonet,      setShowMonet]      = useState(false);
  const [monetType,      setMonetType]      = useState<MonetType>('none');
  const [monetCoins,     setMonetCoins]     = useState(50);
  const [monetGiftId,    setMonetGiftId]    = useState('');

  // Monétisation montée scène
  const [stageType,      setStageType]      = useState<MonetType>('none');
  const [stageCoins,     setStageCoins]     = useState(20);
  const [stageGiftId,    setStageGiftId]    = useState('');

  // Cadeaux disponibles
  const [gifts,         setGifts]         = useState<GiftType[]>([]);
  const [giftsLoading,  setGiftsLoading]  = useState(false);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Charge les cadeaux dès que la section monétisation est ouverte
  useEffect(() => {
    if (!showMonet || gifts.length > 0) return;
    setGiftsLoading(true);
    apiClient.get<any>(Endpoints.wallet.gifts)
      .then(r => {
        const list: GiftType[] = Array.isArray(r.data) ? r.data : r.data?.items ?? r.data?.data ?? [];
        setGifts(list);
        if (list.length > 0) { setMonetGiftId(list[0].id); setStageGiftId(list[0].id); }
      })
      .catch(() => {})
      .finally(() => setGiftsLoading(false));
  }, [showMonet, gifts.length]);

  async function handleStart() {
    if (!title.trim()) { setError('Donne un titre à ton live'); return; }
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, any> = {
        title:       title.trim(),
        description: desc.trim() || null,
        is_private:  isPrivate,
        is_monetized: monetType !== 'none',
      };
      if (monetType === 'coins')  { payload.monetization_type = 'coins'; payload.monetization_coins = monetCoins; }
      if (monetType === 'gift')   { payload.monetization_type = 'gift';  payload.monetization_gift_id = monetGiftId; }
      if (stageType === 'coins')  { payload.stage_monetized = true; payload.stage_type = 'coins'; payload.stage_coins = stageCoins; }
      if (stageType === 'gift')   { payload.stage_monetized = true; payload.stage_type = 'gift';  payload.stage_gift_id = stageGiftId; }

      const r = await apiClient.post<LiveStartResponse>(Endpoints.lives.start, payload);
      navigate(`/lives/${encodeId(r.data.live.id)}`, {
        state: {
          publisherToken: r.data.token,
          livekitUrl:     r.data.livekit_url,
          roomName:       r.data.room_name,
        },
      });
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Impossible de démarrer le live');
    } finally {
      setLoading(false);
    }
  }

  const monetBadge = monetType !== 'none'
    ? monetType === 'coins' ? `${monetCoins} coins` : gifts.find(g => g.id === monetGiftId)?.name ?? 'Cadeau'
    : null;

  const stageBadge = stageType !== 'none'
    ? stageType === 'coins' ? `${stageCoins} coins` : gifts.find(g => g.id === stageGiftId)?.name ?? 'Cadeau'
    : null;

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-sm flex items-center gap-1 transition-colors"
        style={{ color: 'var(--text-tertiary)' }}>
        <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /> Retour
      </button>

      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Démarrer un live</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Tu seras en direct immédiatement après avoir cliqué sur Démarrer.</p>
      </div>

      {/* Titre + description */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Titre *</label>
          <input
            className="input mt-1 w-full"
            placeholder="Ex: Q&A avec ma communauté, Session freestyle..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={120}
            autoFocus
          />
          <p className="text-xs mt-1 text-right" style={{ color: 'var(--text-tertiary)' }}>{title.length}/120</p>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Description (optionnel)</label>
          <textarea
            className="input mt-1 w-full resize-none"
            placeholder="De quoi va parler ton live ?"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={3}
            maxLength={300}
          />
        </div>
      </div>

      {/* Visibilité */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-tertiary)' }}>
          Visibilité
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setIsPrivate(false)}
            className="flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all"
            style={{
              borderColor: !isPrivate ? '#10B981' : 'var(--border)',
              background:  !isPrivate ? 'rgba(16,185,129,0.08)' : 'var(--bg-secondary)',
            }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: !isPrivate ? 'rgba(16,185,129,0.15)' : 'var(--bg-tertiary)' }}>
              <Globe size={16} style={{ color: !isPrivate ? '#10B981' : 'var(--text-tertiary)' }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: !isPrivate ? '#10B981' : 'var(--text-primary)' }}>Public</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Tout le monde</p>
            </div>
            {!isPrivate && (
              <div className="ml-auto w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#10B981' }}>
                <span className="text-white text-[9px] font-black">✓</span>
              </div>
            )}
          </button>

          <button type="button" onClick={() => setIsPrivate(true)}
            className="flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all"
            style={{
              borderColor: isPrivate ? '#7B3FF2' : 'var(--border)',
              background:  isPrivate ? 'rgba(123,63,242,0.08)' : 'var(--bg-secondary)',
            }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: isPrivate ? 'rgba(123,63,242,0.15)' : 'var(--bg-tertiary)' }}>
              <Lock size={16} style={{ color: isPrivate ? '#7B3FF2' : 'var(--text-tertiary)' }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: isPrivate ? '#7B3FF2' : 'var(--text-primary)' }}>Abonnés</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Tes abonnés seulement</p>
            </div>
            {isPrivate && (
              <div className="ml-auto w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#7B3FF2' }}>
                <span className="text-white text-[9px] font-black">✓</span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Monétisation — accordéon */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <button
          type="button"
          onClick={() => setShowMonet(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
          style={{ background: showMonet ? 'rgba(123,63,242,0.06)' : 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-2.5">
            <Coins size={16} style={{ color: '#7B3FF2' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Monétisation</span>
            {(monetBadge || stageBadge) && (
              <div className="flex gap-1.5">
                {monetBadge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(123,63,242,0.15)', color: '#7B3FF2' }}>
                    Accès: {monetBadge}
                  </span>
                )}
                {stageBadge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                    Scène: {stageBadge}
                  </span>
                )}
              </div>
            )}
          </div>
          {showMonet ? <ChevronUp size={16} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />}
        </button>

        {showMonet && (
          <div className="px-4 pb-4 pt-3 space-y-5 border-t" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <MonetForm
              label="Accès au live"
              value={monetType}
              coinsAmount={monetCoins}
              giftId={monetGiftId}
              gifts={gifts}
              giftsLoading={giftsLoading}
              onChange={setMonetType}
              onCoinsChange={setMonetCoins}
              onGiftChange={setMonetGiftId}
            />
            <div className="border-t" style={{ borderColor: 'var(--border)' }} />
            <MonetForm
              label="Montée sur scène"
              value={stageType}
              coinsAmount={stageCoins}
              giftId={stageGiftId}
              gifts={gifts}
              giftsLoading={giftsLoading}
              onChange={setStageType}
              onCoinsChange={setStageCoins}
              onGiftChange={setStageGiftId}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)' }}>{error}</div>
      )}

      <div className="pt-2 flex gap-3">
        <button onClick={onBack} className="btn-ghost flex-1">Annuler</button>
        <button onClick={handleStart} disabled={loading || !title.trim()}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
          {loading ? <Spinner size="sm" /> : <Radio size={16} />}
          {loading ? 'Démarrage...' : 'Démarrer le live'}
        </button>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function GoLivePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'choice' | 'quick-live'>('choice');

  return (
    <div className="max-w-xl mx-auto p-6 space-y-8">

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 8px 32px rgba(123,63,242,0.35)' }}>
          <Radio size={28} color="white" />
        </div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Passer en direct</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Choisis le type de live que tu veux démarrer</p>
      </div>

      {step === 'choice' ? (
        <div className="space-y-4">

          <ChoiceCard
            icon={<Video size={24} />}
            title="Live spontané"
            description="Démarre immédiatement. Parle à ta communauté en temps réel, sans préparation."
            badge="Immédiat"
            color="#7B3FF2"
            onClick={() => setStep('quick-live')}
          />

          <ChoiceCard
            icon={<Music size={24} />}
            title="Concert live"
            description="Crée un concert programmé avec billetterie, replay, et mise en avant dans les événements."
            badge="Programmé"
            color="#7B3FF2"
            onClick={() => navigate('/concerts/new')}
          />

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: 'var(--border)' }} />
            </div>
            <div className="relative flex justify-center">
              <span className="text-xs px-3" style={{ color: 'var(--text-tertiary)', background: 'var(--bg)' }}>ou</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate('/live')}
              className="card p-4 text-left hover:border-brand-primary transition-colors group">
              <Clock size={20} className="text-[var(--text-tertiary)] group-hover:text-brand-primary transition-colors mb-2" />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Lives en cours</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Voir les streams actifs</p>
            </button>

            <button onClick={() => navigate('/lives')}
              className="card p-4 text-left transition-colors group"
              style={{ borderColor: 'var(--border)' }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = '#7B3FF2'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'}>
              <Zap size={20} className="mb-2 transition-colors" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Lives spontanés</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Voir tous les lives</p>
            </button>
          </div>
        </div>
      ) : (
        <QuickLiveForm onBack={() => setStep('choice')} />
      )}
    </div>
  );
}
