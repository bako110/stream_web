import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { encodeId } from '../utils/slugId';
import {
  Radio, Music, Globe, Lock, Coins, Gift, X, ChevronDown, ChevronUp,
  ArrowRight, AlignLeft, Type, Check,
} from 'lucide-react';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { Spinner } from '../components/ui/Spinner';
import type { LiveStartResponse } from '../types';
import type { GiftType } from '../components/live/LiveGiftModal';

// ── Modal monétisation (bottom sheet) ────────────────────────────────────────

type MonetType = 'coins' | 'gift';

function MonetModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (type: MonetType, coins: number, gift: GiftType | null) => void;
}) {
  const [type,   setType]   = useState<MonetType | null>(null);
  const [coins,  setCoins]  = useState('');
  const [gift,   setGift]   = useState<GiftType | null>(null);
  const [gifts,  setGifts]  = useState<GiftType[]>([]);
  const [loading,setLoading]= useState(false);

  useEffect(() => {
    setLoading(true);
    apiClient.get<any>(Endpoints.wallet.gifts)
      .then(r => {
        const list: GiftType[] = Array.isArray(r.data) ? r.data : r.data?.items ?? r.data?.data ?? [];
        setGifts(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleConfirm() {
    if (type === 'coins') {
      const v = parseInt(coins, 10);
      if (!v || v < 1) return;
      onConfirm('coins', v, null);
    }
    if (type === 'gift') {
      if (!gift) return;
      onConfirm('gift', 0, gift);
    }
  }

  const canConfirm = type === 'coins' ? parseInt(coins, 10) > 0 : type === 'gift' ? gift !== null : false;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

        {/* Handle mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-8 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Monétiser le live</h3>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="px-4 pb-5 space-y-3">
          {/* Choix du type — 2 boutons compacts */}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setType('coins')}
              className="relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all text-left"
              style={{
                borderColor: type === 'coins' ? '#F59E0B' : 'var(--border)',
                background:  type === 'coins' ? 'rgba(245,158,11,0.08)' : 'var(--bg-secondary)',
              }}>
              <Coins size={18} style={{ color: type === 'coins' ? '#F59E0B' : 'var(--text-tertiary)', flexShrink: 0 }} />
              <div>
                <p className="text-xs font-bold" style={{ color: type === 'coins' ? '#F59E0B' : 'var(--text-primary)' }}>Coins</p>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Montant fixe</p>
              </div>
              {type === 'coins' && <Check size={12} className="absolute top-2 right-2" style={{ color: '#F59E0B' }} />}
            </button>

            <button type="button" onClick={() => setType('gift')}
              className="relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all text-left"
              style={{
                borderColor: type === 'gift' ? '#E85DAD' : 'var(--border)',
                background:  type === 'gift' ? 'rgba(232,93,173,0.08)' : 'var(--bg-secondary)',
              }}>
              <Gift size={18} style={{ color: type === 'gift' ? '#E85DAD' : 'var(--text-tertiary)', flexShrink: 0 }} />
              <div>
                <p className="text-xs font-bold" style={{ color: type === 'gift' ? '#E85DAD' : 'var(--text-primary)' }}>Cadeau</p>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Cadeau requis</p>
              </div>
              {type === 'gift' && <Check size={12} className="absolute top-2 right-2" style={{ color: '#E85DAD' }} />}
            </button>
          </div>

          {/* Saisie coins */}
          {type === 'coins' && (
            <div className="flex items-center gap-2 rounded-xl border-2 px-3 h-11"
              style={{ borderColor: '#F59E0B', background: 'var(--bg-secondary)' }}>
              <Coins size={16} style={{ color: '#F59E0B', flexShrink: 0 }} />
              <input
                type="number" min={1} max={999999}
                className="flex-1 bg-transparent text-base font-bold focus:outline-none"
                style={{ color: 'var(--text-primary)' }}
                placeholder="Montant..."
                value={coins}
                onChange={e => setCoins(e.target.value.replace(/[^0-9]/g, ''))}
                autoFocus
              />
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>coins</span>
            </div>
          )}

          {/* Grille cadeaux compacte */}
          {type === 'gift' && (
            loading ? (
              <div className="flex justify-center py-4"><Spinner size="sm" /></div>
            ) : gifts.length === 0 ? (
              <p className="text-xs text-center py-3" style={{ color: 'var(--text-tertiary)' }}>Aucun cadeau disponible</p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto">
                {gifts.map(g => (
                  <button key={g.id} type="button" onClick={() => setGift(g)}
                    className="relative flex flex-col items-center gap-0.5 p-1.5 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: gift?.id === g.id ? '#E85DAD' : 'var(--border)',
                      background:  gift?.id === g.id ? 'rgba(232,93,173,0.08)' : 'var(--bg-secondary)',
                    }}>
                    {gift?.id === g.id && (
                      <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full" style={{ background: '#E85DAD' }} />
                    )}
                    <span className="text-xl">{g.emoji}</span>
                    <span className="text-[9px] font-semibold truncate w-full text-center"
                      style={{ color: 'var(--text-primary)' }}>{g.name}</span>
                    <span className="text-[9px] font-bold" style={{ color: '#fbbf24' }}>{g.coins_cost}</span>
                  </button>
                ))}
              </div>
            )
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border font-semibold text-sm transition-all"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', height: 44 }}>
              Annuler
            </button>
            <button type="button" onClick={handleConfirm} disabled={!canConfirm}
              className="flex-[2] rounded-xl font-black text-white text-sm transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#F59E0B,#F97316)', height: 44 }}>
              Confirmer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function GoLivePage() {
  const navigate = useNavigate();

  // Formulaire
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate,   setIsPrivate]   = useState(false);
  const [starting,    setStarting]    = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // Métadonnées collapsible
  const [showMeta, setShowMeta] = useState(false);

  // Monétisation
  const [showMonetModal, setShowMonetModal] = useState(false);
  const [monetType,      setMonetType]      = useState<MonetType | null>(null);
  const [monetCoins,     setMonetCoins]     = useState(0);
  const [monetGift,      setMonetGift]      = useState<GiftType | null>(null);

  const isMonetized = monetType !== null;

  const monetLabel = isMonetized
    ? monetType === 'coins'
      ? `${monetCoins} coins`
      : monetGift ? `${monetGift.name}` : null
    : null;

  function cancelMonet() {
    setMonetType(null);
    setMonetCoins(0);
    setMonetGift(null);
  }

  async function handleStart() {
    if (starting) return;
    setStarting(true);
    setError(null);
    const t = title.trim() || 'Live en direct';
    try {
      const payload: Record<string, any> = {
        title:        t,
        description:  description.trim() || undefined,
        is_private:   isPrivate,
        is_monetized: isMonetized,
      };
      if (monetType === 'coins') { payload.monetization_type = 'coins'; payload.monetization_coins = monetCoins; }
      if (monetType === 'gift')  { payload.monetization_type = 'gift';  payload.monetization_gift_id = monetGift?.id; }

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
      setStarting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6 space-y-4">

      {/* ── Carte Live spontané ─────────────────────────────────────────── */}
      <div className="rounded-3xl overflow-hidden border"
        style={{
          background: 'var(--surface)',
          borderColor: 'rgba(240,54,90,0.25)',
          boxShadow: '0 0 0 0 rgba(240,54,90,0)',
        }}>

        {/* Fond dégradé léger */}
        <div className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{ background: 'linear-gradient(135deg,rgba(240,54,90,0.06),rgba(224,56,154,0.03))' }} />

        <div className="relative p-5 space-y-4">

          {/* Top — icône + labels */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#F0365A,#E0389A)', boxShadow: '0 6px 20px rgba(240,54,90,0.4)' }}>
              <Radio size={26} color="white" />
            </div>
            <div>
              <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Live spontané</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Lance-toi maintenant — tes abonnés sont notifiés
              </p>
            </div>
          </div>

          {/* Boutons Métadonnées + Monétiser */}
          <div className="flex gap-2">
            <button type="button"
              onClick={() => setShowMeta(v => !v)}
              className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-left"
              style={{
                borderColor: showMeta ? '#3B82F6' : 'var(--border)',
                background:  showMeta ? 'rgba(59,130,246,0.08)' : 'var(--bg-secondary)',
              }}>
              <AlignLeft size={15} style={{ color: showMeta ? '#3B82F6' : 'var(--text-tertiary)', flexShrink: 0 }} />
              <span className="text-xs font-semibold flex-1" style={{ color: showMeta ? '#3B82F6' : 'var(--text-secondary)' }}>
                Métadonnées
              </span>
              {showMeta
                ? <ChevronUp size={14} style={{ color: '#3B82F6' }} />
                : <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />}
            </button>

            <button type="button"
              onClick={() => isMonetized ? cancelMonet() : setShowMonetModal(true)}
              className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-left"
              style={{
                borderColor: isMonetized ? '#F59E0B' : 'var(--border)',
                background:  isMonetized ? 'rgba(245,158,11,0.08)' : 'var(--bg-secondary)',
              }}>
              <Coins size={15} style={{ color: isMonetized ? '#F59E0B' : 'var(--text-tertiary)', flexShrink: 0 }} />
              <span className="text-xs font-semibold flex-1 truncate" style={{ color: isMonetized ? '#F59E0B' : 'var(--text-secondary)' }}>
                {isMonetized ? monetLabel : 'Monétiser'}
              </span>
              {isMonetized && <X size={13} style={{ color: '#F59E0B', flexShrink: 0 }} />}
            </button>
          </div>

          {/* Métadonnées collapsibles */}
          {showMeta && (
            <div className="space-y-2.5 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2.5 rounded-xl border px-3 h-12"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                <Type size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                <input
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  style={{ color: 'var(--text-primary)' }}
                  placeholder="Titre du live (optionnel)"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="flex items-start gap-2.5 rounded-xl border px-3 py-2.5"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                <AlignLeft size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 2 }} />
                <textarea
                  className="flex-1 bg-transparent text-sm focus:outline-none resize-none"
                  style={{ color: 'var(--text-primary)' }}
                  placeholder="Description (optionnel)"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  maxLength={300}
                />
              </div>
            </div>
          )}

          {/* Visibilité */}
          <div className="space-y-2">
            <button type="button" onClick={() => setIsPrivate(false)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left"
              style={{
                borderColor: !isPrivate ? '#10B981' : 'transparent',
                background:  !isPrivate ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
              }}>
              <Globe size={18} style={{ color: !isPrivate ? '#10B981' : 'var(--text-tertiary)', flexShrink: 0 }} />
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: !isPrivate ? '#10B981' : 'var(--text-primary)' }}>Public</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Tout le monde peut voir</p>
              </div>
              {!isPrivate && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: '#10B981' }}>
                  <Check size={11} color="white" strokeWidth={3} />
                </div>
              )}
            </button>

            <button type="button" onClick={() => setIsPrivate(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left"
              style={{
                borderColor: isPrivate ? '#7B3FF2' : 'transparent',
                background:  isPrivate ? 'rgba(123,63,242,0.08)' : 'rgba(255,255,255,0.04)',
              }}>
              <Lock size={18} style={{ color: isPrivate ? '#7B3FF2' : 'var(--text-tertiary)', flexShrink: 0 }} />
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: isPrivate ? '#7B3FF2' : 'var(--text-primary)' }}>Abonnés seulement</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Uniquement tes abonnés</p>
              </div>
              {isPrivate && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: '#7B3FF2' }}>
                  <Check size={11} color="white" strokeWidth={3} />
                </div>
              )}
            </button>
          </div>

          {/* Badge monétisation active */}
          {isMonetized && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
              style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)' }}>
              <Coins size={13} style={{ color: '#F59E0B', flexShrink: 0 }} />
              <span className="text-xs font-semibold flex-1" style={{ color: '#F59E0B' }}>
                {monetType === 'coins'
                  ? `Live payant · ${monetCoins} coins pour rejoindre`
                  : `Live payant · cadeau requis : ${monetGift?.name}`}
              </span>
            </div>
          )}

          {error && (
            <div className="text-sm rounded-xl px-4 py-3" style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)' }}>
              {error}
            </div>
          )}

          {/* Bouton Go Live */}
          <button type="button" onClick={handleStart} disabled={starting}
            className="w-full h-14 rounded-3xl font-black text-white text-base flex items-center justify-center gap-3 transition-all disabled:opacity-60"
            style={{ background: starting ? '#555' : 'linear-gradient(135deg,#F0365A,#E0389A)', boxShadow: starting ? 'none' : '0 6px 24px rgba(240,54,90,0.4)' }}>
            {starting ? (
              <Spinner size="sm" />
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-white opacity-90 animate-pulse" />
                Go Live maintenant
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Carte Concert live ──────────────────────────────────────────── */}
      <button type="button"
        onClick={() => navigate('/concerts/new')}
        className="w-full rounded-3xl overflow-hidden border text-left transition-all group"
        style={{ background: 'var(--surface)', borderColor: 'rgba(123,63,242,0.25)' }}
        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(123,63,242,0.6)'}
        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(123,63,242,0.25)'}>
        <div className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#9B65F5)', boxShadow: '0 4px 16px rgba(123,63,242,0.3)' }}>
            <Music size={22} color="white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Concert live</p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Programme, vends des billets et diffuse
            </p>
          </div>
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all group-hover:scale-110"
            style={{ background: 'var(--bg-secondary)' }}>
            <ArrowRight size={16} style={{ color: 'var(--text-secondary)' }} />
          </div>
        </div>
      </button>

      {/* Modal monétisation */}
      {showMonetModal && (
        <MonetModal
          onClose={() => setShowMonetModal(false)}
          onConfirm={(type, coins, gift) => {
            setMonetType(type);
            setMonetCoins(coins);
            setMonetGift(gift);
            setShowMonetModal(false);
          }}
        />
      )}
    </div>
  );
}
