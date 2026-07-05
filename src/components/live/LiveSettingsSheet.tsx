import { useState, useEffect } from 'react';
import {
  X, VideoIcon, VideoOff, Mic, MicOff, UserCheck,
  Lock, Unlock, Edit2, GoGold, Gift, ChevronLeft, Check, Radio, ShieldOff,
} from 'lucide-react';
import { useConfirm } from '../ui/Dialog';
import { useLocalParticipant } from '@livekit/components-react';
import { Track, ParticipantEvent } from 'livekit-client';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../ui/Spinner';
import { Avatar } from '../ui/Avatar';
import type { GiftType } from './LiveGiftModal';

interface HandRequest { identity: string; name: string; avatar?: string | null; }

interface LiveData {
  is_monetized?: boolean;
  monetization_type?: string | null;
  monetization_gogold?: number | null;
  monetization_gift_id?: string | null;
  monetization_gift_name?: string | null;
  stage_monetized?: boolean;
  stage_type?: string | null;
  stage_gogold?: number | null;
  stage_gift_id?: string | null;
  stage_gift_name?: string | null;
}

interface Props {
  liveId: string;
  live: LiveData | null;
  handRequests: HandRequest[];
  onInvite: (identity: string) => void;
  onDismissHand: (identity: string) => void;
  onStopLive: () => void;
  onMonetizationUpdated: (updated: Partial<LiveData>) => void;
  onClose: () => void;
}

// ── MonetForm compact ─────────────────────────────────────────────────────────

function MonetForm({
  title, accentColor, isActive,
  currentType, currentGoGold, currentGiftId, currentGiftName,
  onSave, onRemove,
}: {
  title: string; accentColor: string; isActive: boolean;
  currentType?: string | null; currentGoGold?: number | null;
  currentGiftId?: string | null; currentGiftName?: string | null;
  onSave: (type: 'gogold' | 'gift', gogold: number | null, gift: GiftType | null) => Promise<void>;
  onRemove: () => void;
}) {
  const [showForm,     setShowForm]     = useState(false);
  const [type,         setType]         = useState<'gogold' | 'gift' | null>((currentType as any) ?? null);
  const [gogold,        setGoGold]        = useState(currentGoGold ? String(currentGoGold) : '');
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
      if (currentGiftId) { const f = list.find(g => g.id === currentGiftId); if (f) setGift(f); }
    } catch { /* ignore */ }
    setGiftsLoading(false);
  }

  async function save() {
    if (!type) return;
    if (type === 'gogold' && (!parseInt(gogold, 10) || parseInt(gogold, 10) < 1)) { setError('Montant invalide'); return; }
    if (type === 'gift' && !gift) { setError('Choisis un cadeau'); return; }
    setError(null); setSaving(true);
    try { await onSave(type, type === 'gogold' ? parseInt(gogold, 10) : null, type === 'gift' ? gift : null); setShowForm(false); }
    catch (e: any) { setError(e?.response?.data?.detail ?? 'Erreur'); }
    setSaving(false);
  }

  if (showForm) {
    return (
      <div className="rounded-xl border p-3 space-y-2.5"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <button onClick={() => setShowForm(false)} className="flex items-center gap-1 text-xs"
          style={{ color: 'var(--text-tertiary)' }}>
          <ChevronLeft size={12} /> Retour
        </button>

        {/* Type selector — 2 boutons compacts */}
        <div className="flex gap-2">
          {([
            { key: 'gogold', icon: <GoGold size={13} />, label: 'GoGold', color: '#F59E0B' },
            { key: 'gift',  icon: <Gift  size={13} />, label: 'Cadeau', color: '#E85DAD' },
          ] as const).map(opt => (
            <button key={opt.key} type="button" onClick={() => setType(opt.key)}
              className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border-2 text-xs font-bold transition-all"
              style={{
                borderColor: type === opt.key ? opt.color : 'var(--border)',
                background:  type === opt.key ? `${opt.color}14` : 'var(--surface)',
                color:       type === opt.key ? opt.color : 'var(--text-secondary)',
              }}>
              {opt.icon} {opt.label}
              {type === opt.key && <Check size={10} />}
            </button>
          ))}
        </div>

        {type === 'gogold' && (
          <div className="flex items-center gap-2 rounded-lg border px-2.5 h-9"
            style={{ borderColor: '#F59E0B', background: 'var(--surface)' }}>
            <GoGold size={13} style={{ color: '#F59E0B', flexShrink: 0 }} />
            <input type="number" min={1}
              className="flex-1 bg-transparent text-sm font-bold focus:outline-none"
              style={{ color: 'var(--text-primary)' }}
              placeholder="Montant..." value={gogold}
              onChange={e => setGoGold(e.target.value.replace(/[^0-9]/g, ''))}
              autoFocus />
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>GoGold</span>
          </div>
        )}

        {type === 'gift' && (
          giftsLoading
            ? <div className="flex justify-center py-2"><Spinner size="sm" /></div>
            : gifts.length === 0
              ? <p className="text-xs text-center py-1" style={{ color: 'var(--text-tertiary)' }}>Aucun cadeau</p>
              : (
                <div className="grid grid-cols-5 gap-1 max-h-24 overflow-y-auto">
                  {gifts.map(g => (
                    <button key={g.id} type="button" onClick={() => setGift(g)}
                      className="flex flex-col items-center gap-0.5 p-1 rounded-lg border-2 transition-all"
                      style={{
                        borderColor: gift?.id === g.id ? '#E85DAD' : 'var(--border)',
                        background:  gift?.id === g.id ? 'rgba(232,93,173,0.1)' : 'var(--surface)',
                      }}>
                      <span className="text-base">{g.emoji}</span>
                      <span className="text-[8px] truncate w-full text-center font-semibold"
                        style={{ color: 'var(--text-primary)' }}>{g.name}</span>
                      <span className="text-[8px] font-bold" style={{ color: '#fbbf24' }}>{g.gogold_cost}</span>
                    </button>
                  ))}
                </div>
              )
        )}

        {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}

        <button type="button" onClick={save} disabled={!type || saving}
          className="w-full h-8 rounded-lg font-bold text-white text-xs disabled:opacity-40 flex items-center justify-center gap-1.5"
          style={{ background: `linear-gradient(135deg,${accentColor},${accentColor}BB)` }}>
          {saving ? <Spinner size="sm" /> : 'Confirmer'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
      style={{
        borderColor: isActive ? `${accentColor}44` : 'var(--border)',
        background: 'var(--bg-secondary)',
      }}>
      <Lock size={13} style={{ color: isActive ? accentColor : 'var(--text-tertiary)', flexShrink: 0 }} />
      <span className="flex-1 text-xs truncate" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
        {isActive
          ? (currentType === 'gogold' ? `${currentGoGold} GoGold` : `Cadeau : ${currentGiftName ?? ''}`)
          : title}
      </span>
      {isActive ? (
        <div className="flex gap-1.5 shrink-0">
          <button onClick={open}
            className="flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-semibold"
            style={{ borderColor: accentColor, color: accentColor }}>
            <Edit2 size={10} /> Modifier
          </button>
          <button onClick={onRemove}
            className="flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-semibold"
            style={{ borderColor: '#F0365A', color: '#F0365A' }}>
            <Unlock size={10} /> Retirer
          </button>
        </div>
      ) : (
        <button onClick={open}
          className="shrink-0 px-3 py-1 rounded-lg font-bold text-white text-[11px]"
          style={{ background: `linear-gradient(135deg,${accentColor},${accentColor}AA)` }}>
          Activer
        </button>
      )}
    </div>
  );
}

// ── Section utilisateurs bloqués ──────────────────────────────────────────────

interface BlockedUser {
  blocked_id:   string;
  username?:    string | null;
  display_name?: string | null;
  avatar_url?:  string | null;
  created_at:   string;
}

function BlockedUsersSection() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [blocked,   setBlocked]   = useState<BlockedUser[] | null>(null);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<BlockedUser[]>(Endpoints.lives.listBlocks)
      .then(r => setBlocked(Array.isArray(r.data) ? r.data : []))
      .catch(() => setBlocked([]));
  }, []);

  async function unblock(userId: string, name: string) {
    const ok = await confirm({ title: `Débloquer ${name} ?`, message: 'Cette personne pourra à nouveau voir tes lives.', danger: false, confirmLabel: 'Débloquer' });
    if (!ok) return;
    setUnblocking(userId);
    try {
      await apiClient.delete(Endpoints.lives.blockUser(userId));
      setBlocked(prev => prev?.filter(b => b.blocked_id !== userId) ?? prev);
    } catch { /* ignore */ }
    finally { setUnblocking(null); }
  }

  return (
    <div>
      {ConfirmDialog}
      <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
        style={{ color: 'var(--text-tertiary)' }}>
        Bloqués{blocked && blocked.length > 0 && <span> ({blocked.length})</span>}
      </p>
      {blocked === null ? (
        <div className="flex justify-center py-3"><Spinner size="sm" /></div>
      ) : blocked.length === 0 ? (
        <div className="flex items-center justify-center py-3 rounded-xl"
          style={{ background: 'var(--bg-secondary)' }}>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Aucun utilisateur bloqué</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {blocked.map(b => {
            const name = b.display_name ?? b.username ?? 'Utilisateur';
            return (
              <div key={b.blocked_id}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                <Avatar src={b.avatar_url} name={name} size="xs" className="shrink-0" />
                <span className="text-xs font-semibold truncate flex-1"
                  style={{ color: 'var(--text-primary)' }}>{name}</span>
                <button onClick={() => unblock(b.blocked_id, name)} disabled={unblocking === b.blocked_id}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 disabled:opacity-50"
                  style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  {unblocking === b.blocked_id ? <Spinner size="sm" /> : <><ShieldOff size={11} /> Débloquer</>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Section utilisateurs éjectés/bannis ───────────────────────────────────────

interface BannedUser {
  banned_user_id: string;
  username?:      string | null;
  display_name?:  string | null;
  avatar_url?:    string | null;
  created_at:     string;
}

function BannedUsersSection() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [banned,     setBanned]     = useState<BannedUser[] | null>(null);
  const [unbanning,  setUnbanning]  = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<BannedUser[]>(Endpoints.lives.listBans)
      .then(r => setBanned(Array.isArray(r.data) ? r.data : []))
      .catch(() => setBanned([]));
  }, []);

  async function unban(userId: string, name: string) {
    const ok = await confirm({ title: `Annuler l'éjection de ${name} ?`, message: 'Cette personne pourra à nouveau rejoindre tes lives.', danger: false, confirmLabel: 'Annuler l\'éjection' });
    if (!ok) return;
    setUnbanning(userId);
    try {
      await apiClient.delete(Endpoints.lives.removeBan(userId));
      setBanned(prev => prev?.filter(b => b.banned_user_id !== userId) ?? prev);
    } catch { /* ignore */ }
    finally { setUnbanning(null); }
  }

  return (
    <div>
      {ConfirmDialog}
      <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
        style={{ color: 'var(--text-tertiary)' }}>
        Éjectés{banned && banned.length > 0 && <span> ({banned.length})</span>}
      </p>
      {banned === null ? (
        <div className="flex justify-center py-3"><Spinner size="sm" /></div>
      ) : banned.length === 0 ? (
        <div className="flex items-center justify-center py-3 rounded-xl"
          style={{ background: 'var(--bg-secondary)' }}>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Aucun utilisateur éjecté</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {banned.map(b => {
            const name = b.display_name ?? b.username ?? 'Utilisateur';
            return (
              <div key={b.banned_user_id}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                <Avatar src={b.avatar_url} name={name} size="xs" className="shrink-0" />
                <span className="text-xs font-semibold truncate flex-1"
                  style={{ color: 'var(--text-primary)' }}>{name}</span>
                <button onClick={() => unban(b.banned_user_id, name)} disabled={unbanning === b.banned_user_id}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 disabled:opacity-50"
                  style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  {unbanning === b.banned_user_id ? <Spinner size="sm" /> : <><ShieldOff size={11} /> Réintégrer</>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Sheet principal ───────────────────────────────────────────────────────────

export function LiveSettingsSheet({
  liveId, live,
  handRequests, onInvite, onDismissHand,
  onStopLive, onMonetizationUpdated, onClose,
}: Props) {
  const { confirm, ConfirmDialog } = useConfirm();

  // ── État cam/mic lu directement depuis LiveKit ──
  const { localParticipant } = useLocalParticipant();

  function getCamOn() {
    const pub = localParticipant.getTrackPublication(Track.Source.Camera);
    return !!pub && !pub.isMuted;
  }
  function getMicOn() {
    const pub = localParticipant.getTrackPublication(Track.Source.Microphone);
    return !!pub && !pub.isMuted;
  }

  const [camOn, setCamOn] = useState(getCamOn);
  const [micOn, setMicOn] = useState(getMicOn);

  // Re-sync quand les tracks changent
  useEffect(() => {
    function sync() {
      setCamOn(getCamOn());
      setMicOn(getMicOn());
    }
    localParticipant.on(ParticipantEvent.TrackMuted,   sync);
    localParticipant.on(ParticipantEvent.TrackUnmuted, sync);
    localParticipant.on(ParticipantEvent.LocalTrackPublished,   sync);
    localParticipant.on(ParticipantEvent.LocalTrackUnpublished, sync);
    return () => {
      localParticipant.off(ParticipantEvent.TrackMuted,   sync);
      localParticipant.off(ParticipantEvent.TrackUnmuted, sync);
      localParticipant.off(ParticipantEvent.LocalTrackPublished,   sync);
      localParticipant.off(ParticipantEvent.LocalTrackUnpublished, sync);
    };
  }, [localParticipant]);

  async function toggleCam() {
    const next = !camOn;
    await localParticipant.setCameraEnabled(next);
    setCamOn(next);
  }
  async function toggleMic() {
    const next = !micOn;
    await localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  }

  async function saveAccessMonet(type: 'gogold' | 'gift', gogold: number | null, gift: GiftType | null) {
    const payload: any = { is_monetized: true, monetization_type: type,
      monetization_gogold: type === 'gogold' ? gogold : null,
      monetization_gift_id: type === 'gift' ? gift!.id : null };
    await apiClient.patch(Endpoints.lives.monetization(liveId), payload);
    onMonetizationUpdated({ is_monetized: true, monetization_type: type,
      monetization_gogold: type === 'gogold' ? gogold : undefined,
      monetization_gift_id: type === 'gift' ? gift!.id : undefined,
      monetization_gift_name: type === 'gift' ? gift!.name : undefined });
  }

  async function removeAccessMonet() {
    const ok = await confirm({ title: 'Retirer la monétisation ?', message: 'Les prochains viewers pourront rejoindre gratuitement.', danger: true, confirmLabel: 'Retirer' });
    if (!ok) return;
    try {
      await apiClient.patch(Endpoints.lives.monetization(liveId), { is_monetized: false });
      onMonetizationUpdated({ is_monetized: false, monetization_type: null, monetization_gogold: null });
    } catch { /* ignore */ }
  }

  async function saveStageMonet(type: 'gogold' | 'gift', gogold: number | null, gift: GiftType | null) {
    const payload: any = { stage_monetized: true, stage_type: type,
      stage_gogold: type === 'gogold' ? gogold : null,
      stage_gift_id: type === 'gift' ? gift!.id : null };
    await apiClient.patch(Endpoints.lives.stageMonetization(liveId), payload);
    onMonetizationUpdated({ stage_monetized: true, stage_type: type,
      stage_gogold: type === 'gogold' ? gogold : undefined,
      stage_gift_id: type === 'gift' ? gift!.id : undefined,
      stage_gift_name: type === 'gift' ? gift!.name : undefined });
  }

  async function removeStageMonet() {
    const ok = await confirm({ title: 'Retirer la condition ?', message: 'Les viewers pourront lever la main gratuitement.', danger: true, confirmLabel: 'Retirer' });
    if (!ok) return;
    try {
      await apiClient.patch(Endpoints.lives.stageMonetization(liveId), { stage_monetized: false });
      onMonetizationUpdated({ stage_monetized: false, stage_type: null, stage_gogold: null });
    } catch { /* ignore */ }
  }

  async function confirmStop() {
    const ok = await confirm({ title: 'Terminer le live ?', message: 'Tous les viewers seront déconnectés.', danger: true, confirmLabel: 'Terminer' });
    if (!ok) return;
    onStopLive();
  }

  return (
    <>
      {ConfirmDialog}
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />

      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="w-full sm:max-w-sm flex flex-col pointer-events-auto"
        style={{
          maxHeight: '72vh',
          background: 'var(--surface)',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          borderTop: '1px solid var(--border)',
          borderLeft: '1px solid var(--border)',
          borderRight: '1px solid var(--border)',
          animation: 'slideUpSheet 0.25s cubic-bezier(0.32,0.72,0,1)',
        }}>

        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-0.5 shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 shrink-0">
          <h2 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Paramètres</h2>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)' }}><X size={16} /></button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4 min-h-0">

          {/* ── Diffusion : 2 boutons horizontaux compacts ── */}
          <div className="flex gap-2">
            <button onClick={toggleCam}
              className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all"
              style={{
                borderColor: camOn ? '#4ade80' : 'var(--border)',
                background: camOn ? 'rgba(74,222,128,0.07)' : 'var(--bg-secondary)',
              }}>
              {camOn
                ? <VideoIcon size={16} style={{ color: '#4ade80', flexShrink: 0 }} />
                : <VideoOff  size={16} style={{ color: '#F0365A', flexShrink: 0 }} />}
              <span className="text-xs font-bold" style={{ color: camOn ? '#4ade80' : '#F0365A' }}>
                {camOn ? 'Caméra ON' : 'Caméra OFF'}
              </span>
              <span className="ml-auto w-2 h-2 rounded-full shrink-0"
                style={{ background: camOn ? '#4ade80' : '#F0365A' }} />
            </button>

            <button onClick={toggleMic}
              className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all"
              style={{
                borderColor: micOn ? '#4ade80' : 'var(--border)',
                background: micOn ? 'rgba(74,222,128,0.07)' : 'var(--bg-secondary)',
              }}>
              {micOn
                ? <Mic    size={16} style={{ color: '#4ade80', flexShrink: 0 }} />
                : <MicOff size={16} style={{ color: '#F0365A', flexShrink: 0 }} />}
              <span className="text-xs font-bold" style={{ color: micOn ? '#4ade80' : '#F0365A' }}>
                {micOn ? 'Micro ON' : 'Micro OFF'}
              </span>
              <span className="ml-auto w-2 h-2 rounded-full shrink-0"
                style={{ background: micOn ? '#4ade80' : '#F0365A' }} />
            </button>
          </div>

          {/* ── Demandes de scène ── */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
              style={{ color: 'var(--text-tertiary)' }}>
              Demandes{handRequests.length > 0 && <span style={{ color: '#F0365A' }}> ({handRequests.length})</span>}
            </p>
            {handRequests.length === 0 ? (
              <div className="flex items-center justify-center py-3 rounded-xl"
                style={{ background: 'var(--bg-secondary)' }}>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Aucune demande</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {handRequests.map(req => (
                  <div key={req.identity}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                    <Avatar src={req.avatar} name={req.name} size="xs" className="shrink-0" />
                    <span className="text-xs font-semibold truncate flex-1"
                      style={{ color: 'var(--text-primary)' }}>{req.name}</span>
                    <button onClick={() => onInvite(req.identity)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white shrink-0"
                      style={{ background: 'linear-gradient(135deg,#4ade80,#22c55e)' }}>
                      <UserCheck size={11} /> Inviter
                    </button>
                    <button onClick={() => onDismissHand(req.identity)}
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'var(--surface)', color: 'var(--text-tertiary)' }}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Accès au live ── */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
              style={{ color: 'var(--text-tertiary)' }}>Accès au live</p>
            <MonetForm
              title="Monétiser l'accès"
              accentColor="#F59E0B"
              isActive={live?.is_monetized ?? false}
              currentType={live?.monetization_type}
              currentGoGold={live?.monetization_gogold}
              currentGiftId={live?.monetization_gift_id}
              currentGiftName={live?.monetization_gift_name}
              onSave={saveAccessMonet}
              onRemove={removeAccessMonet}
            />
          </div>

          {/* ── Montée sur scène ── */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
              style={{ color: 'var(--text-tertiary)' }}>Montée sur scène</p>
            <MonetForm
              title="Monétiser la montée"
              accentColor="#9B65F5"
              isActive={live?.stage_monetized ?? false}
              currentType={live?.stage_type}
              currentGoGold={live?.stage_gogold}
              currentGiftId={live?.stage_gift_id}
              currentGiftName={live?.stage_gift_name}
              onSave={saveStageMonet}
              onRemove={removeStageMonet}
            />
          </div>

          {/* ── Utilisateurs éjectés/bannis ── */}
          <BannedUsersSection />

          {/* ── Utilisateurs bloqués ── */}
          <BlockedUsersSection />

          {/* ── Terminer ── */}
          <button onClick={confirmStop}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-bold text-sm transition-all"
            style={{ borderColor: '#F0365A', color: '#F0365A' }}>
            <Radio size={15} /> Terminer le live
          </button>

        </div>
      </div>
      </div>
    </>
  );
}
