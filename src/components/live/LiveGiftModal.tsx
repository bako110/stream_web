import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Coins, Gift, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../ui/Spinner';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GiftType {
  id: string;
  name: string;
  emoji: string;
  coins_cost: number;
}

export interface GiftNotif {
  id: string;
  senderName: string;
  emoji: string;
  giftName: string;
  coins: number;
  /** Nom du destinataire réel — affiché seulement quand ce n'est pas l'hôte,
   * pour ne pas laisser croire que le cadeau lui était destiné. */
  receiverName?: string;
}

// ── FloatingGift — emoji qui monte depuis le bas ──────────────────────────────

function FloatingGift({ emoji, x }: { emoji: string; x: number }) {
  return (
    <div
      className="pointer-events-none absolute bottom-0 text-4xl"
      style={{
        left: `${x}%`,
        animation: 'floatGiftUp 2.2s ease-out forwards',
      }}
    >
      {emoji}
    </div>
  );
}

// ── GiftTicker — barre bas gauche affichant les cadeaux reçus ─────────────────

export function GiftTicker({ notifs }: { notifs: GiftNotif[] }) {
  const visible = notifs.slice(-3);
  if (visible.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5 pointer-events-none">
      {visible.map(n => (
        <div key={n.id}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
          style={{
            background: 'linear-gradient(135deg,rgba(123,63,242,0.85),rgba(234,88,12,0.85))',
            backdropFilter: 'blur(8px)',
            animation: 'slideInLeft 0.3s ease-out',
          }}>
          <Gift size={12} style={{ color: '#FDE68A', flexShrink: 0 }} />
          <span style={{ color: '#FDE68A' }}>{n.senderName}</span>
          <span className="opacity-80">a envoyé</span>
          <span>{n.giftName}</span>
          {n.receiverName && (
            <>
              <span className="opacity-80">à</span>
              <span style={{ color: '#FDE68A' }}>{n.receiverName}</span>
            </>
          )}
          <span className="flex items-center gap-0.5" style={{ color: '#FDE68A' }}>
            <Coins size={10} />{n.coins}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── GiftToast — notification cadeau reçu (host) ───────────────────────────────

export function GiftToast({ notif, onDone }: { notif: GiftNotif; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl text-white pointer-events-none"
      style={{
        background: 'linear-gradient(135deg,rgba(123,63,242,0.9),rgba(234,88,12,0.9))',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 24px rgba(123,63,242,0.4)',
        animation: 'slideInRight 0.3s ease-out',
        minWidth: 220,
      }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(255,215,0,0.2)' }}>
        <Gift size={22} style={{ color: '#fbbf24' }} />
      </div>
      <div>
        <p className="text-xs font-bold" style={{ color: '#FDE68A' }}>
          {notif.senderName}
          {notif.receiverName && <span className="font-normal opacity-80"> → {notif.receiverName}</span>}
        </p>
        <p className="text-sm font-bold">{notif.giftName}</p>
        <p className="text-xs flex items-center gap-1 opacity-80">
          <Coins size={10} /> {notif.coins} coins
        </p>
      </div>
    </div>
  );
}

// ── Modal principal ───────────────────────────────────────────────────────────

interface Props {
  liveId: string;
  receiverId: string;
  receiverName: string;
  onClose: () => void;
  onSent?: (notif: GiftNotif) => void;
}

export function LiveGiftModal({ liveId, receiverId, receiverName, onClose, onSent }: Props) {
  const navigate = useNavigate();
  const [gifts,    setGifts]    = useState<GiftType[]>([]);
  const [balance,  setBalance]  = useState<number | null>(null);
  const [selected, setSelected] = useState<GiftType | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [floats,   setFloats]   = useState<{ id: number; emoji: string; x: number }[]>([]);
  const floatId = useRef(0);

  useEffect(() => {
    Promise.all([
      apiClient.get<any>(Endpoints.wallet.gifts),
      apiClient.get<any>(Endpoints.wallet.balance),
    ]).then(([gr, br]) => {
      const list: GiftType[] = Array.isArray(gr.data) ? gr.data : gr.data?.items ?? gr.data?.data ?? [];
      setGifts(list);
      if (list.length > 0) setSelected(list[0]);
      const bd = br.data?.data ?? br.data;
      setBalance(bd?.coins_balance ?? bd?.balance ?? bd?.coins ?? 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const spawnFloat = useCallback((emoji: string) => {
    const id = ++floatId.current;
    const x  = Math.random() * 60 + 10;
    setFloats(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 2300);
  }, []);

  async function handleSend() {
    if (!selected || sending) return;
    setSending(true);
    try {
      await apiClient.post(Endpoints.wallet.sendGift, {
        receiver_id:  receiverId,
        gift_type_id: selected.id,
        live_id:      liveId,
      });
      spawnFloat(selected.emoji);
      setBalance(b => (b !== null ? b - selected.coins_cost : b));
      onSent?.({
        id:         String(Date.now()),
        senderName: 'Toi',
        emoji:      selected.emoji,
        giftName:   selected.name,
        coins:      selected.coins_cost,
      });
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Envoi du cadeau échoué. Réessayez.');
    }
    finally { setSending(false); }
  }

  const sufficient = balance !== null && selected ? balance >= selected.coins_cost : false;

  return (
    <>
      {/* CSS animations */}
      <style>{`
        @keyframes floatGiftUp {
          0%   { transform: translateY(0) scale(1); opacity: 1; }
          70%  { opacity: 1; }
          100% { transform: translateY(-300px) scale(1.3); opacity: 0; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-20px); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(20px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      {/* Backdrop */}
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />

      {/* Modal — style bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxWidth: 480, margin: '0 auto' }}>

        {/* Floating emojis inside modal */}
        <div className="relative h-0 overflow-visible pointer-events-none">
          {floats.map(f => <FloatingGift key={f.id} emoji={f.emoji} x={f.x} />)}
        </div>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <div>
            <p className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
              Envoyer un cadeau
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>à {receiverName}</p>
          </div>
          <div className="flex items-center gap-3">
            {balance !== null && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: 'rgba(123,63,242,0.12)', color: 'var(--primary)' }}>
                <Coins size={12} /> {balance.toLocaleString('fr-FR')} coins
              </div>
            )}
            <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Grid cadeaux */}
        <div className="px-4 pb-2">
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : gifts.length === 0 ? (
            <p className="text-center text-sm py-8" style={{ color: 'var(--text-tertiary)' }}>
              Aucun cadeau disponible
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {gifts.map(g => {
                const locked = balance !== null && balance < g.coins_cost;
                const isSel  = selected?.id === g.id;
                return (
                  <button key={g.id} onClick={() => setSelected(g)}
                    className="flex-shrink-0 flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all relative"
                    style={{
                      width: 80,
                      background: isSel
                        ? 'linear-gradient(135deg,#7B3FF2,#5B2EC4)'
                        : 'var(--bg-secondary)',
                      border: isSel ? '2px solid #7B3FF2' : '2px solid transparent',
                      opacity: locked ? 0.5 : 1,
                    }}>
                    <span className="text-3xl">{g.emoji}</span>
                    <span className="text-[10px] font-semibold truncate w-full text-center"
                      style={{ color: isSel ? 'white' : 'var(--text-primary)' }}>
                      {g.name}
                    </span>
                    <span className="text-[10px] font-bold flex items-center gap-0.5"
                      style={{ color: isSel ? '#FDE68A' : 'var(--primary)' }}>
                      <Coins size={9} /> {g.coins_cost}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 pt-2 space-y-3">
          {balance !== null && !sufficient && selected && (
            <div className="text-xs text-center" style={{ color: '#EF4444' }}>
              Solde insuffisant — il vous manque {(selected.coins_cost - balance).toLocaleString('fr-FR')} coins
            </div>
          )}
          <div className="flex gap-3">
            {!sufficient && (
              <button onClick={() => navigate('/wallet/buy')}
                className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all"
                style={{ background: 'rgba(123,63,242,0.1)', color: 'var(--primary)', border: '1px solid rgba(123,63,242,0.3)' }}>
                <ExternalLink size={14} /> Recharger
              </button>
            )}
            <button onClick={handleSend}
              disabled={!selected || !sufficient || sending}
              className="flex-1 py-3 rounded-xl font-black text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 6px 20px rgba(123,63,242,0.4)' }}>
              {sending ? <Spinner size="sm" /> : <><Gift size={15} /> Envoyer {selected ? selected.name : ''}</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
