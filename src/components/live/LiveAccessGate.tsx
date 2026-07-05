import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Crown, GoGold } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Avatar } from '../ui/Avatar';
import type { LiveStream } from '../../types';

interface Props {
  live: LiveStream;
  liveId: string;
  onAccessGranted: () => void;
  onLeave: () => void;
}

/**
 * Verrou d'accès pour les lives monétisés — affiché avant de charger le token
 * LiveKit tant que l'utilisateur n'a pas payé (GoGold ou cadeau requis par le host).
 * Équivalent du LiveAccessGate mobile (stream_mobile/src/components/live/LiveAccessGate.tsx).
 */
export function LiveAccessGate({ live, liveId, onAccessGranted, onLeave }: Props) {
  const navigate = useNavigate();
  const isGoGold = live.monetization_type === 'gogold';

  const hostName   = live.user?.display_name ?? live.user?.username ?? 'Créateur';
  const hostAvatar = live.user?.avatar_url ?? null;

  const requiredGiftName  = live.monetization_gift_name ?? 'Cadeau';
  const requiredGiftEmoji = live.monetization_gift_emoji ?? '🎁';
  const requiredGoGold     = live.monetization_gogold ?? 0;

  const [myBalance, setMyBalance] = useState<number | null>(null);
  const [checking,  setChecking]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<any>(Endpoints.wallet.balance)
      .then(r => setMyBalance(r.data?.gogold_balance ?? r.data?.balance ?? 0))
      .catch(() => setMyBalance(null));
  }, []);

  const hasEnough = myBalance !== null && (isGoGold ? myBalance >= requiredGoGold : true);

  async function handlePayGoGold() {
    setChecking(true);
    setError(null);
    try {
      const r = await apiClient.post<any>(Endpoints.lives.accessGoGold(liveId));
      if (r.data?.access_granted) onAccessGranted();
      else setError('Solde insuffisant. Recharge ton portefeuille pour continuer.');
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors du paiement.');
    } finally {
      setChecking(false);
    }
  }

  async function handleSendGift() {
    if (!live.monetization_gift_id) return;
    setChecking(true);
    setError(null);
    try {
      const r = await apiClient.post<any>(Endpoints.lives.accessGift(liveId), { gift_id: live.monetization_gift_id });
      if (r.data?.access_granted) onAccessGranted();
      else setError('Solde insuffisant pour envoyer ce cadeau.');
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de l'envoi du cadeau.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#000' }}>
      {/* Fond flouté — avatar host */}
      <div className="absolute inset-0" style={{ overflow: 'hidden' }}>
        {hostAvatar ? (
          <img src={hostAvatar} alt="" className="w-full h-full object-cover" style={{ filter: 'blur(18px)', transform: 'scale(1.1)' }} />
        ) : (
          <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#1a0533,#2d0f5e)' }} />
        )}
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.72)' }} />
      </div>

      {/* Bouton retour */}
      <button onClick={onLeave}
        className="absolute top-5 left-4 z-10 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}>
        ←
      </button>

      {/* Info host */}
      <div className="absolute top-5 left-16 right-4 z-10 flex items-center gap-2.5">
        <Avatar src={hostAvatar} name={hostName} size="sm" />
        <div>
          <p className="text-white text-sm font-bold">{hostName}</p>
          <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded"
            style={{ background: '#F0365A', color: '#fff', letterSpacing: '0.05em' }}>
            <span className="w-1 h-1 rounded-full bg-white animate-pulse" /> LIVE
          </span>
        </div>
      </div>

      {/* Carte d'accès */}
      <div className="relative z-10 mt-auto w-full rounded-t-3xl p-6 pb-10"
        style={{ background: 'var(--surface)' }}>
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3.5"
            style={{ background: 'linear-gradient(135deg,#F59E0B,#F97316)' }}>
            <Lock size={26} color="#fff" />
          </div>

          <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>Live payant</h2>
          <p className="text-sm text-center mb-5" style={{ color: 'var(--text-secondary)' }}>
            {hostName} a rendu ce live accessible sur condition.<br />
            {isGoGold ? `Envoie ${requiredGoGold} GoGold pour regarder.` : `Envoie le cadeau requis pour regarder.`}
          </p>

          <div className="w-full flex items-center gap-3 rounded-2xl p-4 mb-5"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <span className="text-3xl">{isGoGold ? '🪙' : requiredGiftEmoji}</span>
            <div className="flex-1">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                {isGoGold ? "Prix d'accès" : 'Cadeau requis'}
              </p>
              <p className="text-lg font-black" style={{ color: isGoGold ? '#F59E0B' : '#E85DAD' }}>
                {isGoGold ? `${requiredGoGold} GoGold` : requiredGiftName}
              </p>
            </div>
          </div>

          {myBalance !== null && (
            <div className="w-full flex items-center justify-between rounded-xl px-4 py-2.5 mb-4"
              style={{
                background: !hasEnough ? 'rgba(240,54,90,0.08)' : 'var(--bg-secondary)',
                border: `1px solid ${!hasEnough ? '#F0365A' : 'var(--border)'}`,
              }}>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Ton solde</span>
              <span className="text-sm font-black" style={{ color: !hasEnough ? '#F0365A' : '#3FEDB6' }}>
                {myBalance} GoGold{isGoGold && !hasEnough ? ` (manque ${requiredGoGold - myBalance})` : ''}
              </span>
            </div>
          )}

          {error && (
            <p className="text-xs text-center mb-3" style={{ color: '#F0365A' }}>{error}</p>
          )}

          {isGoGold && !hasEnough && myBalance !== null ? (
            <button onClick={() => navigate('/wallet')}
              className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-black text-white"
              style={{ background: 'linear-gradient(135deg,#F0365A,#9B65F5)' }}>
              <GoGold size={18} /> Recharger mon solde
            </button>
          ) : (
            <button onClick={isGoGold ? handlePayGoGold : handleSendGift} disabled={checking}
              className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-black text-white disabled:opacity-50"
              style={{ background: isGoGold ? 'linear-gradient(135deg,#F59E0B,#F97316)' : 'linear-gradient(135deg,#E85DAD,#9B65F5)' }}>
              {checking ? (
                <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                <>
                  <span className="text-lg">{isGoGold ? '🪙' : requiredGiftEmoji}</span>
                  {isGoGold ? `Payer ${requiredGoGold} GoGold` : `Envoyer ${requiredGiftName}`}
                </>
              )}
            </button>
          )}

          <button onClick={onLeave} className="mt-3 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
            Pas maintenant
          </button>
        </div>
      </div>
    </div>
  );
}
