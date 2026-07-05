import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Tag, Star, Award, Zap, CreditCard, AlertCircle,
  CheckCircle, Music, Calendar, Lock, Check,
} from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from './Spinner';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TicketTier {
  key:   'simple' | 'vip' | 'vvip' | 'vvvip';
  label: string;
  color: string;
  price: number;
  sub:   string;
}

interface Props {
  open:            boolean;
  onClose:         () => void;
  onSuccess:       (ticket: any | null) => void;
  itemId:          string;
  title:           string;
  thumbnail?:      string | null;
  kind:            'concert' | 'event';
  accessType:      'free' | 'ticket' | 'invite_only' | 'subscription' | 'ppv';
  tiers:           TicketTier[];
  selectedTierKey?: TicketTier['key'];
  onBuy:           (tierKey?: TicketTier['key']) => Promise<any>;
}

// ── Constantes — alignées sur GoGold.ts (source unique de vérité) ───────────────

const FEES_RATE    = 0.10;
const EUR_TO_GOGOLD = 100;   // achat : 1 € = 100 GoGold

const goGoldToEur = (c: number) => (c / 100) * 0.35;  // retrait : 100 GoGold = 0,35 €
const eurToGoGold = (e: number | string) => Math.ceil(Number(e) * EUR_TO_GOGOLD);
const fmtGoGold   = (c: number) => c.toLocaleString('fr-FR');
const fmtEur     = (e: number | string) => Number(e).toFixed(2).replace('.', ',') + ' €';

const TIER_ICONS: Record<string, React.ReactNode> = {
  simple: <Tag  size={13} />,
  vip:    <Star size={13} />,
  vvip:   <Award size={13} />,
  vvvip:  <Zap  size={13} />,
};

// ── Composant ──────────────────────────────────────────────────────────────────

export function TicketPaymentModal({
  open, onClose, onSuccess,
  itemId: _itemId, title, thumbnail, kind, accessType,
  tiers, selectedTierKey, onBuy,
}: Props) {
  const navigate = useNavigate();

  const [balance,      setBalance]      = useState<number | null>(null);
  const [loadingBal,   setLoadingBal]   = useState(false);
  const [buying,       setBuying]       = useState(false);
  const [step,         setStep]         = useState<'confirm' | 'processing' | 'success' | 'insufficient'>('confirm');
  const [activeTierKey, setActiveTierKey] = useState<TicketTier['key']>(selectedTierKey ?? tiers[0]?.key ?? 'simple');

  const activeTier = tiers.find(t => t.key === activeTierKey) ?? tiers[0] ?? null;

  const isPaid     = accessType === 'ticket' || accessType === 'ppv';
  const priceEur   = activeTier?.price ?? 0;
  const feesEur    = Math.round(priceEur * FEES_RATE * 100) / 100;
  const totalEur   = priceEur + feesEur;
  const priceGoGold = eurToGoGold(totalEur);
  const hasEnough  = balance !== null && balance >= priceGoGold;
  const goGoldAfter = balance !== null ? balance - priceGoGold : null;
  const missing    = balance !== null ? Math.max(0, priceGoGold - balance) : 0;
  const missingEur = goGoldToEur(missing);

  // Reset + fetch balance à chaque ouverture
  useEffect(() => {
    if (!open) return;
    setStep('confirm');
    setBalance(null);
    setBuying(false);
    setActiveTierKey(selectedTierKey ?? tiers[0]?.key ?? 'simple');
    if (isPaid) fetchBalance();
  }, [open]);

  // Fermeture au clavier
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  async function fetchBalance() {
    setLoadingBal(true);
    try {
      const res = await apiClient.get<{ gogold_balance: number }>(Endpoints.wallet.balance);
      setBalance((res.data as any)?.gogold_balance ?? 0);
    } catch {
      setBalance(0);
    } finally {
      setLoadingBal(false);
    }
  }

  async function handleConfirm() {
    if (isPaid && balance === null) return;
    if (isPaid && !hasEnough) { setStep('insufficient'); return; }
    setBuying(true);
    setStep('processing');
    try {
      const ticket = await onBuy(activeTier?.key);
      setStep('success');
      setTimeout(() => { onSuccess(ticket ?? null); onClose(); }, 1800);
    } catch (e: any) {
      const msg = (e?.message ?? '') as string;
      if (msg.includes('déjà inscrit') || msg.includes('already')) {
        setStep('success');
        setTimeout(() => { onSuccess(null); onClose(); }, 1200);
      } else {
        setStep('confirm');
      }
    } finally {
      setBuying(false);
    }
  }

  function goRecharge() {
    onClose();
    navigate(`/wallet?recharge=1&needed=${missing}`);
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />

      {/* Sheet — monte depuis le bas, centré sur desktop */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 mx-auto flex flex-col"
        style={{
          maxWidth: 520,
          background: 'var(--surface)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          animation: 'slideUpSheet 0.28s cubic-bezier(0.32,0.72,0,1)',
          maxHeight: '92dvh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Poignée */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Bouton fermer */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}>
          <X size={15} />
        </button>

        {/* Header event/concert */}
        <div className="flex items-start gap-3 px-5 pt-2 pb-3">
          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
            style={{ background: thumbnail ? undefined : 'rgba(123,63,242,0.1)' }}>
            {thumbnail
              ? <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
              : kind === 'concert'
                ? <Music size={22} style={{ color: 'var(--primary)' }} />
                : <Calendar size={22} style={{ color: 'var(--primary)' }} />
            }
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="font-bold text-sm leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>{title}</p>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5"
              style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)' }}>
              {kind === 'concert' ? <Music size={9} /> : <Calendar size={9} />}
              {kind === 'concert' ? 'Concert' : 'Événement'}
            </span>
          </div>
        </div>

        <div className="mx-5" style={{ height: 1, background: 'var(--border)' }} />

        {/* ── Étapes confirm / insufficient ── */}
        {(step === 'confirm' || step === 'insufficient') && (
          <div className="px-5 pt-4 pb-5 space-y-4">

            {/* Sélecteur tiers (si plusieurs) */}
            {isPaid && tiers.length > 1 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-tertiary)' }}>
                  Catégorie
                </p>
                <div className="flex flex-wrap gap-2">
                  {tiers.map(tier => {
                    const active = activeTierKey === tier.key;
                    return (
                      <button
                        key={tier.key}
                        onClick={() => { setActiveTierKey(tier.key); setStep('confirm'); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-sm font-black"
                        style={{
                          background:   active ? tier.color + '18' : 'var(--bg-secondary)',
                          borderColor:  active ? tier.color : 'var(--border)',
                          color:        active ? tier.color : 'var(--text-secondary)',
                          border:       '1.5px solid',
                        }}>
                        <span style={{ color: active ? tier.color : 'var(--text-tertiary)' }}>
                          {TIER_ICONS[tier.key]}
                        </span>
                        {tier.label}
                        <span className="font-semibold text-xs opacity-80">{fmtEur(tier.price)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Gratuit */}
            {!isPaid && (
              <div className="flex flex-col items-center py-6 gap-3 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(16,185,129,0.12)' }}>
                  <CheckCircle size={30} color="#10B981" />
                </div>
                <p className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>C'est gratuit, fonce !</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                  Une place t'attend — confirme maintenant avant qu'elles partent.
                </p>
              </div>
            )}

            {/* Payant — wallet + recap */}
            {isPaid && activeTier && (
              <div className="space-y-3">

                {/* Solde wallet */}
                <div className="flex items-center justify-between p-3.5 rounded-xl"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      Ton wallet
                    </p>
                    {loadingBal ? (
                      <Spinner size="sm" />
                    ) : (
                      <p className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
                        {fmtGoGold(balance ?? 0)}{' '}
                        <span className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>GoGold</span>
                        {'  '}
                        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>≈ {fmtEur(goGoldToEur(balance ?? 0))}</span>
                      </p>
                    )}
                  </div>
                  <CreditCard size={20} style={{ color: 'var(--primary)' }} />
                </div>

                {/* Recap prix */}
                <div className="rounded-xl overflow-hidden"
                  style={{ border: `1.5px solid ${activeTier.color}30`, background: 'var(--bg-secondary)' }}>

                  {/* Tier actif */}
                  <div className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: activeTier.color + '20' }}>
                      <span style={{ color: activeTier.color }}>{TIER_ICONS[activeTier.key]}</span>
                    </div>
                    <div>
                      <p className="text-xs font-black tracking-wide" style={{ color: activeTier.color }}>
                        {activeTier.label.toUpperCase()}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{activeTier.sub}</p>
                    </div>
                  </div>

                  {/* Lignes de prix */}
                  <div className="px-4 py-2 space-y-1">
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Prix du billet</span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{fmtEur(priceEur)}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Frais de service (10%)</span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{fmtEur(feesEur)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2"
                      style={{ borderTop: '1px solid var(--border)', marginTop: 4 }}>
                      <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Total</span>
                      <span className="text-base font-black" style={{ color: activeTier.color }}>{fmtEur(totalEur)}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Équivalent GoGold</span>
                      <span className="text-sm font-bold" style={{ color: 'var(--primary)' }}>{fmtGoGold(priceGoGold)} GoGold</span>
                    </div>
                    {!loadingBal && goGoldAfter !== null && (
                      <div className="flex items-center justify-between py-1"
                        style={{ borderTop: '1px solid var(--border)', marginTop: 2 }}>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Solde après</span>
                        <span className="text-sm font-bold"
                          style={{ color: hasEnough ? '#10B981' : '#EF4444' }}>
                          {hasEnough ? `${fmtGoGold(goGoldAfter)} GoGold` : 'Insuffisant'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Banner solde insuffisant */}
                {step === 'insufficient' && (
                  <div className="flex items-start gap-3 p-3.5 rounded-xl"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.4)' }}>
                    <AlertCircle size={18} color="#EF4444" className="shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold" style={{ color: '#EF4444' }}>Pas assez de GoGold</p>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#EF4444', opacity: 0.85 }}>
                        Il te manque {fmtGoGold(missing)} GoGold (≈ {fmtEur(missingEur)}). Recharge en 30 secondes !
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Boutons */}
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-3.5 rounded-xl font-semibold text-sm transition-all"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                Pas maintenant
              </button>

              {step === 'insufficient' ? (
                <button
                  onClick={goRecharge}
                  className="flex-[2] py-3.5 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#7B3FF2,#EF4444)' }}>
                  <Zap size={15} fill="white" />
                  Recharger mon wallet
                </button>
              ) : (
                <button
                  onClick={handleConfirm}
                  disabled={loadingBal || buying || (isPaid && balance === null)}
                  className="flex-[2] py-3.5 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
                  style={{ background: activeTier ? `linear-gradient(135deg,${activeTier.color},${activeTier.color}BB)` : 'var(--primary)' }}>
                  {buying ? (
                    <Spinner size="sm" />
                  ) : (
                    <>
                      {!isPaid ? <Check size={15} /> : <Lock size={15} />}
                      {!isPaid
                        ? 'Je réserve ma place !'
                        : `Payer — ${fmtGoGold(priceGoGold)} GoGold`}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Processing ── */}
        {step === 'processing' && (
          <div className="flex flex-col items-center py-12 px-8 gap-4 text-center">
            <Spinner size="lg" />
            <p className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>On s'occupe de tout...</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Ta place est presque sécurisée</p>
          </div>
        )}

        {/* ── Succès ── */}
        {step === 'success' && (
          <div className="flex flex-col items-center py-12 px-8 gap-4 text-center">
            <div className="w-18 h-18 rounded-full flex items-center justify-center"
              style={{ width: 72, height: 72, background: 'rgba(16,185,129,0.12)' }}>
              <Check size={36} color="#10B981" />
            </div>
            <p className="font-black text-xl" style={{ color: 'var(--text-primary)' }}>
              {!isPaid ? 'Place réservée !' : 'Billet dans ta poche !'}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              {!isPaid
                ? "C'est officiel, on se voit là-bas !"
                : "Ton billet est dans ton profil. Prêt pour vivre quelque chose d'exceptionnel ?"}
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUpSheet {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
