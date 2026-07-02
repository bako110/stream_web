import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import type { LiveStream } from '../../types';

interface Props {
  live: LiveStream;
  liveId: string;
  identity: string;
  onRequested: () => void;
  onClose: () => void;
  onOpenGift: (receiverId: string, receiverName: string) => void;
}

/**
 * Modal de confirmation avant de lever la main quand la montée sur scène est
 * monétisée. Équivalent du StageAccessSheet mobile
 * (stream_mobile/src/screens/Live/SimpleLiveViewerScreen.tsx).
 * - Mode coins : appelle handRaise directement, le backend débite en escrow.
 * - Mode gift : ouvre l'overlay cadeau standard vers le host (le cadeau est
 *   envoyé séparément, comme sur mobile — le backend ne vérifie pas l'envoi
 *   pour ce mode, cf. commentaire dans app/routers/lives.py:hand_raise).
 */
export function StageAccessGate({ live, liveId, identity, onRequested, onClose, onOpenGift }: Props) {
  const navigate = useNavigate();
  const [myBalance, setMyBalance] = useState<number | null>(null);
  const [giftCost,  setGiftCost]  = useState<number | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const isCoins           = live.stage_type === 'coins';
  const requiredCoins     = live.stage_coins ?? 0;
  const requiredGiftName  = live.stage_gift_name ?? 'Cadeau';
  const requiredGiftEmoji = live.stage_gift_emoji ?? '🎁';
  const hostId            = live.user_id;
  const hostName          = live.user?.display_name ?? live.user?.username ?? 'le host';

  const effectiveCost = isCoins ? requiredCoins : (giftCost ?? 0);
  const balanceLoading = myBalance === null;
  const insufficientFunds = !balanceLoading && myBalance < effectiveCost;

  useEffect(() => {
    apiClient.get<any>(Endpoints.wallet.balance)
      .then(r => setMyBalance(r.data?.coins_balance ?? r.data?.balance ?? 0))
      .catch(() => setMyBalance(0));

    if (!isCoins && live.stage_gift_id) {
      apiClient.get<any>(Endpoints.wallet.gifts)
        .then(r => {
          const list: any[] = r.data?.gifts ?? r.data ?? [];
          const found = list.find(g => g.id === live.stage_gift_id);
          if (found) setGiftCost(Number(found.coins_cost ?? 0));
        })
        .catch(() => {});
    }
  }, [isCoins, live.stage_gift_id]);

  async function handlePay() {
    if (!isCoins) {
      // Cadeau : ouvre l'overlay cadeau vers le host, la demande de scène
      // suit séparément (comme mobile) — pas d'appel handRaise ici.
      onClose();
      if (hostId) onOpenGift(hostId, hostName);
      return;
    }
    if (balanceLoading || insufficientFunds || !liveId) return;
    setLoading(true);
    setError(null);
    try {
      await apiClient.post(Endpoints.lives.handRaise(liveId, identity));
      onRequested();
    } catch (e: any) {
      setError(e?.message ?? 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />
      <div className="relative w-full rounded-t-3xl p-6 pb-8"
        style={{ background: '#0D0820', border: '1px solid rgba(155,101,245,0.3)', borderBottom: 'none' }}
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'rgba(255,255,255,0.2)' }} />

        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#F0365A,#9B65F5)' }}>
            <span className="text-lg">🎤</span>
          </div>
          <div>
            <p className="text-white font-black text-lg">Monter sur scène</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{hostName} a monétisé l'accès à la scène</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl p-4 mb-3"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span className="text-3xl">{isCoins ? '🪙' : requiredGiftEmoji}</span>
          <div className="flex-1">
            <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Condition requise</p>
            <p className="text-lg font-black" style={{ color: '#F59E0B' }}>
              {isCoins ? `${requiredCoins} coins` : requiredGiftName}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl px-4 py-3 mb-4"
          style={{
            background: insufficientFunds ? 'rgba(240,54,90,0.07)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${insufficientFunds ? '#F0365A' : 'rgba(255,255,255,0.1)'}`,
          }}>
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>Ton solde actuel</span>
          {balanceLoading ? (
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <span className="text-sm font-black" style={{ color: insufficientFunds ? '#F0365A' : '#3FEDB6' }}>
              {myBalance} coins{insufficientFunds && effectiveCost > 0 ? ` · manque ${effectiveCost - myBalance}` : ''}
            </span>
          )}
        </div>

        {isCoins && requiredCoins > 0 && (
          <p className="text-[11px] text-center mb-3 leading-snug" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Les coins sont réservés jusqu'à l'acceptation du host. Remboursés automatiquement si le live se termine.
          </p>
        )}

        {error && <p className="text-xs text-center mb-3" style={{ color: '#F0365A' }}>{error}</p>}

        {insufficientFunds && !balanceLoading ? (
          <button onClick={() => navigate('/wallet')}
            className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-black text-white mb-2.5"
            style={{ background: 'linear-gradient(135deg,#F0365A,#9B65F5)' }}>
            <Coins size={18} /> Recharger mon solde
          </button>
        ) : (
          <button onClick={handlePay} disabled={loading || balanceLoading}
            className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-black text-white mb-2.5 disabled:opacity-50"
            style={{ background: isCoins ? 'linear-gradient(135deg,#F59E0B,#F97316)' : 'linear-gradient(135deg,#F0365A,#9B65F5)' }}>
            {loading || balanceLoading ? (
              <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              <>
                <span className="text-lg">{isCoins ? '🪙' : requiredGiftEmoji}</span>
                {isCoins
                  ? `Payer ${requiredCoins} coins · Lever la main`
                  : `Envoyer ${requiredGiftName}${giftCost ? ` (${giftCost} coins)` : ''} · Lever la main`}
              </>
            )}
          </button>
        )}

        <button onClick={onClose} className="w-full text-center text-sm font-medium py-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Pas maintenant
        </button>
      </div>
    </div>
  );
}
