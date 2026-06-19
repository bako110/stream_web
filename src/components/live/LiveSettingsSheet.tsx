/**
 * LiveSettingsSheet — Paramètres du live (host uniquement).
 * Sections : Diffusion (cam/mic), Demandes de scène, Accès au live, Montée scène, Terminer.
 */
import { useState, useEffect } from 'react';
import {
  X, VideoIcon, VideoOff, Mic, MicOff, UserCheck, Lock, Unlock,
  LogIn, Edit2, Radio, Coins, Gift, ChevronLeft, Check, StopCircle, Hand,
} from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../ui/Spinner';
import { Avatar } from '../ui/Avatar';
import type { GiftType } from './LiveGiftModal';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HandRequest { identity: string; name: string; avatar?: string | null; }

interface LiveData {
  is_monetized?: boolean;
  monetization_type?: string | null;
  monetization_coins?: number | null;
  monetization_gift_id?: string | null;
  monetization_gift_name?: string | null;
  monetization_gift_emoji?: string | null;
  stage_monetized?: boolean;
  stage_type?: string | null;
  stage_coins?: number | null;
  stage_gift_id?: string | null;
  stage_gift_name?: string | null;
  stage_gift_emoji?: string | null;
}

interface Props {
  liveId: string;
  live: LiveData | null;
  camOn: boolean;
  micOn: boolean;
  onToggleCam: () => void;
  onToggleMic: () => void;
  handRequests: HandRequest[];
  onInvite: (identity: string) => void;
  onDismissHand: (identity: string) => void;
  onStopLive: () => void;
  onMonetizationUpdated: (updated: Partial<LiveData>) => void;
  onClose: () => void;
}

// ── Formulaire monétisation réutilisable ─────────────────────────────────────

function MonetForm({
  title, accentColor, isActive,
  currentType, currentCoins, currentGiftId, currentGiftName,
  onSave, onRemove,
}: {
  title: string;
  accentColor: string;
  isActive: boolean;
  currentType?: string | null;
  currentCoins?: number | null;
  currentGiftId?: string | null;
  currentGiftName?: string | null;
  onSave: (type: 'coins' | 'gift', coins: number | null, gift: GiftType | null) => Promise<void>;
  onRemove: () => void;
}) {
  const [showForm,     setShowForm]     = useState(false);
  const [type,         setType]         = useState<'coins' | 'gift' | null>((currentType as any) ?? null);
  const [coins,        setCoins]        = useState(currentCoins ? String(currentCoins) : '');
  const [gift,         setGift]         = useState<GiftType | null>(null);
  const [gifts,        setGifts]        = useState<GiftType[]>([]);
  const [giftsLoading, setGiftsLoading] = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  async function open() {
    setShowForm(true);
    if (gifts.length > 0) return;
    setGiftsLoading(true);
    try {
      const r = await apiClient.get<any>(Endpoints.wallet.gifts);
      const list: GiftType[] = Array.isArray(r.data) ? r.data : r.data?.items ?? r.data?.data ?? [];
      setGifts(list);
      if (currentGiftId) {
        const found = list.find(g => g.id === currentGiftId);
        if (found) setGift(found);
      }
    } catch { /* ignore */ }
    setGiftsLoading(false);
  }

  async function save() {
    if (!type) return;
    if (type === 'coins' && (!parseInt(coins, 10) || parseInt(coins, 10) < 1)) {
      setError('Saisis un montant valide'); return;
    }
    if (type === 'gift' && !gift) { setError('Choisis un cadeau'); return; }
    setError(null);
    setSaving(true);
    try {
      await onSave(type, type === 'coins' ? parseInt(coins, 10) : null, type === 'gift' ? gift : null);
      setShowForm(false);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Impossible de sauvegarder');
    }
    setSaving(false);
  }

  // Vue formulaire
  if (showForm) {
    return (
      <div className="rounded-2xl border p-4 space-y-3"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <button onClick={() => setShowForm(false)}
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: 'var(--text-tertiary)' }}>
          <ChevronLeft size={13} /> Retour
        </button>

        {/* Type */}
        <div className="grid grid-cols-2 gap-2">
          {([
            { key: 'coins', icon: <Coins size={15} />, label: 'Prix coins', color: '#F59E0B' },
            { key: 'gift',  icon: <Gift size={15} />,  label: 'Cadeau requis', color: '#E85DAD' },
          ] as const).map(opt => (
            <button key={opt.key} type="button" onClick={() => setType(opt.key)}
              className="relative flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-left"
              style={{
                borderColor: type === opt.key ? opt.color : 'var(--border)',
                background:  type === opt.key ? `${opt.color}12` : 'var(--surface)',
              }}>
              <span style={{ color: type === opt.key ? opt.color : 'var(--text-tertiary)' }}>{opt.icon}</span>
              <span className="text-xs font-bold"
                style={{ color: type === opt.key ? opt.color : 'var(--text-primary)' }}>{opt.label}</span>
              {type === opt.key && <Check size={11} className="absolute top-1.5 right-1.5" style={{ color: opt.color }} />}
            </button>
          ))}
        </div>

        {/* Coins input */}
        {type === 'coins' && (
          <div className="flex items-center gap-2 rounded-xl border-2 px-3 h-11"
            style={{ borderColor: '#F59E0B', background: 'var(--surface)' }}>
            <Coins size={15} style={{ color: '#F59E0B', flexShrink: 0 }} />
            <input
              type="number" min={1}
              className="flex-1 bg-transparent text-sm font-bold focus:outline-none"
              style={{ color: 'var(--text-primary)' }}
              placeholder="Montant..."
              value={coins}
              onChange={e => setCoins(e.target.value.replace(/[^0-9]/g, ''))}
              autoFocus
            />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>coins</span>
          </div>
        )}

        {/* Grille cadeaux */}
        {type === 'gift' && (
          giftsLoading ? (
            <div className="flex justify-center py-3"><Spinner size="sm" /></div>
          ) : gifts.length === 0 ? (
            <p className="text-xs text-center py-2" style={{ color: 'var(--text-tertiary)' }}>Aucun cadeau disponible</p>
          ) : (
            <div className="grid grid-cols-4 gap-1.5 max-h-28 overflow-y-auto">
              {gifts.map(g => (
                <button key={g.id} type="button" onClick={() => setGift(g)}
                  className="relative flex flex-col items-center gap-0.5 p-1.5 rounded-xl border-2 transition-all"
                  style={{
                    borderColor: gift?.id === g.id ? '#E85DAD' : 'var(--border)',
                    background:  gift?.id === g.id ? 'rgba(232,93,173,0.08)' : 'var(--surface)',
                  }}>
                  {gift?.id === g.id && (
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: '#E85DAD' }} />
                  )}
                  <span className="text-lg">{g.emoji}</span>
                  <span className="text-[9px] truncate w-full text-center font-semibold"
                    style={{ color: 'var(--text-primary)' }}>{g.name}</span>
                  <span className="text-[9px] font-bold" style={{ color: '#fbbf24' }}>{g.coins_cost}</span>
                </button>
              ))}
            </div>
          )
        )}

        {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}

        <button type="button" onClick={save} disabled={!type || saving}
          className="w-full h-10 rounded-xl font-bold text-white text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: `linear-gradient(135deg,${accentColor},${accentColor}BB)` }}>
          {saving ? <Spinner size="sm" /> : 'Confirmer'}
        </button>
      </div>
    );
  }

  // Vue état courant
  return (
    <div className="rounded-2xl border p-3.5"
      style={{
        borderColor: isActive ? `${accentColor}44` : 'var(--border)',
        background: 'var(--bg-secondary)',
      }}>
      {isActive ? (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Lock size={15} style={{ color: accentColor, flexShrink: 0 }} />
            <span className="text-sm font-semibold flex-1" style={{ color: 'var(--text-primary)' }}>
              {currentType === 'coins'
                ? `${currentCoins} coins requis`
                : `Cadeau requis : ${currentGiftName ?? ''}`}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={open}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all"
              style={{ borderColor: accentColor, color: accentColor }}>
              <Edit2 size={11} /> Modifier
            </button>
            <button onClick={onRemove}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all"
              style={{ borderColor: '#F0365A', color: '#F0365A' }}>
              <Unlock size={11} /> Retirer
            </button>
          </div>
        </div>
      ) : (
        <button onClick={open}
          className="w-full h-11 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2"
          style={{ background: `linear-gradient(135deg,${accentColor},${accentColor}AA)` }}>
          <Lock size={15} /> {title}
        </button>
      )}
    </div>
  );
}

// ── Sheet principal ───────────────────────────────────────────────────────────

export function LiveSettingsSheet({
  liveId, live, camOn, micOn, onToggleCam, onToggleMic,
  handRequests, onInvite, onDismissHand,
  onStopLive, onMonetizationUpdated, onClose,
}: Props) {

  // Monétisation accès
  async function saveAccessMonet(type: 'coins' | 'gift', coins: number | null, gift: GiftType | null) {
    const payload: any = {
      is_monetized: true, monetization_type: type,
      monetization_coins: type === 'coins' ? coins : null,
      monetization_gift_id: type === 'gift' ? gift!.id : null,
    };
    await apiClient.patch(Endpoints.lives.monetization(liveId), payload);
    onMonetizationUpdated({
      is_monetized: true, monetization_type: type,
      monetization_coins: type === 'coins' ? coins : undefined,
      monetization_gift_id: type === 'gift' ? gift!.id : undefined,
      monetization_gift_name: type === 'gift' ? gift!.name : undefined,
    });
  }

  async function removeAccessMonet() {
    if (!window.confirm('Les prochains viewers pourront rejoindre gratuitement.')) return;
    try {
      await apiClient.patch(Endpoints.lives.monetization(liveId), { is_monetized: false });
      onMonetizationUpdated({ is_monetized: false, monetization_type: null, monetization_coins: null });
    } catch { /* ignore */ }
  }

  // Monétisation montée scène
  async function saveStageMonet(type: 'coins' | 'gift', coins: number | null, gift: GiftType | null) {
    const payload: any = {
      stage_monetized: true, stage_type: type,
      stage_coins: type === 'coins' ? coins : null,
      stage_gift_id: type === 'gift' ? gift!.id : null,
    };
    await apiClient.patch(Endpoints.lives.stageMonetization(liveId), payload);
    onMonetizationUpdated({
      stage_monetized: true, stage_type: type,
      stage_coins: type === 'coins' ? coins : undefined,
      stage_gift_id: type === 'gift' ? gift!.id : undefined,
      stage_gift_name: type === 'gift' ? gift!.name : undefined,
    });
  }

  async function removeStageMonet() {
    if (!window.confirm('Les viewers pourront lever la main gratuitement.')) return;
    try {
      await apiClient.patch(Endpoints.lives.stageMonetization(liveId), { stage_monetized: false });
      onMonetizationUpdated({ stage_monetized: false, stage_type: null, stage_coins: null });
    } catch { /* ignore */ }
  }

  function confirmStop() {
    if (!window.confirm('Terminer le live ? Tous les viewers seront déconnectés.')) return;
    onStopLive();
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose} />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{
          maxHeight: '88vh',
          background: 'var(--surface)',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          borderTop: '1px solid var(--border)',
          animation: 'slideUpSheet 0.28s cubic-bezier(0.32,0.72,0,1)',
        }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <h2 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Paramètres du live</h2>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-5 min-h-0">

          {/* ── Diffusion ─────────────────────────────────────────────── */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5"
              style={{ color: 'var(--text-tertiary)' }}>Diffusion</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={onToggleCam}
                className="flex flex-col items-center gap-2 py-3 rounded-2xl border-2 transition-all"
                style={{
                  borderColor: camOn ? '#4ade80' : 'var(--border)',
                  background: camOn ? 'rgba(74,222,128,0.08)' : 'var(--bg-secondary)',
                }}>
                <div className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ background: camOn ? 'rgba(74,222,128,0.15)' : 'rgba(240,54,90,0.1)' }}>
                  {camOn
                    ? <VideoIcon size={20} style={{ color: '#4ade80' }} />
                    : <VideoOff size={20} style={{ color: '#F0365A' }} />}
                </div>
                <span className="text-xs font-bold" style={{ color: camOn ? '#4ade80' : '#F0365A' }}>
                  {camOn ? 'Caméra ON' : 'Caméra OFF'}
                </span>
                <div className="w-2 h-2 rounded-full" style={{ background: camOn ? '#4ade80' : '#F0365A' }} />
              </button>

              <button onClick={onToggleMic}
                className="flex flex-col items-center gap-2 py-3 rounded-2xl border-2 transition-all"
                style={{
                  borderColor: micOn ? '#4ade80' : 'var(--border)',
                  background: micOn ? 'rgba(74,222,128,0.08)' : 'var(--bg-secondary)',
                }}>
                <div className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ background: micOn ? 'rgba(74,222,128,0.15)' : 'rgba(240,54,90,0.1)' }}>
                  {micOn
                    ? <Mic size={20} style={{ color: '#4ade80' }} />
                    : <MicOff size={20} style={{ color: '#F0365A' }} />}
                </div>
                <span className="text-xs font-bold" style={{ color: micOn ? '#4ade80' : '#F0365A' }}>
                  {micOn ? 'Micro ON' : 'Micro OFF'}
                </span>
                <div className="w-2 h-2 rounded-full" style={{ background: micOn ? '#4ade80' : '#F0365A' }} />
              </button>
            </div>
          </section>

          {/* ── Demandes de scène ─────────────────────────────────────── */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5"
              style={{ color: 'var(--text-tertiary)' }}>
              Demandes de scène
              {handRequests.length > 0 && (
                <span style={{ color: '#F0365A' }}> ({handRequests.length})</span>
              )}
            </p>
            {handRequests.length === 0 ? (
              <div className="flex items-center justify-center py-4 rounded-2xl"
                style={{ background: 'var(--bg-secondary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Aucune demande en attente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {handRequests.map(req => (
                  <div key={req.identity}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl border"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <Avatar src={req.avatar} name={req.name} size="sm" className="shrink-0" />
                      <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {req.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => onInvite(req.identity)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white"
                        style={{ background: 'linear-gradient(135deg,#4ade80,#22c55e)' }}>
                        <UserCheck size={12} /> Inviter
                      </button>
                      <button onClick={() => onDismissHand(req.identity)}
                        className="w-8 h-8 rounded-full flex items-center justify-center border transition-colors"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Monétisation accès au live ────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(245,158,11,0.12)' }}>
                <LogIn size={15} style={{ color: '#F59E0B' }} />
              </div>
              <div>
                <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Accès au live</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Condition pour rejoindre le live</p>
              </div>
            </div>
            <MonetForm
              title="Monétiser l'accès"
              accentColor="#F59E0B"
              isActive={live?.is_monetized ?? false}
              currentType={live?.monetization_type}
              currentCoins={live?.monetization_coins}
              currentGiftId={live?.monetization_gift_id}
              currentGiftName={live?.monetization_gift_name}
              onSave={saveAccessMonet}
              onRemove={removeAccessMonet}
            />
          </section>

          {/* ── Monétisation montée sur scène ─────────────────────────── */}
          <section>
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(155,101,245,0.12)' }}>
                <Mic size={15} style={{ color: '#9B65F5' }} />
              </div>
              <div>
                <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Montée sur scène</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Condition pour lever la main</p>
              </div>
            </div>
            <MonetForm
              title="Monétiser la montée scène"
              accentColor="#9B65F5"
              isActive={live?.stage_monetized ?? false}
              currentType={live?.stage_type}
              currentCoins={live?.stage_coins}
              currentGiftId={live?.stage_gift_id}
              currentGiftName={live?.stage_gift_name}
              onSave={saveStageMonet}
              onRemove={removeStageMonet}
            />
          </section>

          {/* ── Terminer le live ──────────────────────────────────────── */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5"
              style={{ color: 'var(--text-tertiary)' }}>Actions</p>
            <button onClick={confirmStop}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border-2 font-bold text-sm transition-all"
              style={{ borderColor: '#F0365A', color: '#F0365A' }}>
              <Radio size={17} /> Terminer le live
            </button>
          </section>
        </div>
      </div>
    </>
  );
}
