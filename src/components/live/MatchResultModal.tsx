import { Award, TrendingUp, ArrowUpRight, Gift, User } from 'lucide-react';

export interface MatchResultData {
  isDraw: boolean;
  /** 'won'/'lost' si le spectateur est l'un des deux participants, 'spectator' sinon */
  viewerRole: 'won' | 'lost' | 'spectator';
  winnerName: string;
  loserName: string;
  winnerAvatar?: string | null;
  scoreA: number;
  scoreB: number;
  /** Optionnel — gain GoGold du vainqueur (battles classiques uniquement, pas les matchs de tournoi) */
  winnerGoGold?: number | null;
  /** Optionnel — pénalité de forfait à afficher côté perdant/vainqueur */
  forfeitPenalty?: number | null;
  forfeitByMe?: boolean;
}

const PETALS = ['🌸', '🌼', '✨', '🌟', '🎉'];

function FallingPetals() {
  return (
    <>
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          className="absolute -top-6 text-2xl pointer-events-none"
          style={{
            left: `${Math.random() * 92}%`,
            animation: `mrm-fall ${2.6 + Math.random() * 1.4}s linear ${i * 0.14}s forwards`,
          }}
        >
          {PETALS[i % PETALS.length]}
        </span>
      ))}
    </>
  );
}

export function MatchResultModal({ result, onClose }: { result: MatchResultData | null; onClose: () => void }) {
  if (!result) return null;

  if (result.isDraw) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 animate-[mrm-fadein_0.3s_ease-out]">
        <div className="w-[80%] max-w-sm rounded-[28px] p-7 flex flex-col items-center gap-3 text-center animate-[mrm-bouncein_0.7s_ease-out]"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#4C1D95)' }}>
          <Award size={48} color="#FFD700" />
          <p className="text-white text-xl font-extrabold">Match nul !</p>
          <p className="text-white/90 text-3xl font-black">{result.scoreA} — {result.scoreB}</p>
          <p className="text-white/70 text-sm">{result.winnerName} et {result.loserName} terminent à égalité.</p>
          <button onClick={onClose} className="mt-2 bg-white text-[#4C1D95] rounded-2xl px-7 py-3 font-extrabold text-sm">
            Fermer
          </button>
        </div>
        <style>{mrmKeyframes}</style>
      </div>
    );
  }

  if (result.viewerRole === 'lost') {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 animate-[mrm-fadein_0.3s_ease-out]">
        <div className="w-[84%] max-w-sm rounded-[28px] p-7 flex flex-col items-center gap-2.5 text-center animate-[mrm-fadein_0.7s_ease-out]"
          style={{ background: 'linear-gradient(135deg,#3A3F52,#20232F)' }}>
          <span className="text-4xl mb-0.5">💙</span>
          <p className="text-white text-lg font-extrabold">Ce n'est que partie remise</p>
          <p className="text-white/70 text-[13px] leading-relaxed">
            {result.winnerName} remporte ce match, mais chaque champion a connu la défaite avant de gagner.
          </p>
          <p className="text-white/85 text-2xl font-black mt-1">{result.scoreA} — {result.scoreB}</p>
          {!!result.forfeitPenalty && result.forfeitByMe && (
            <div className="flex items-center gap-1.5 rounded-xl px-3 py-2 mt-0.5"
              style={{ background: 'rgba(240,54,90,0.12)', border: '1px solid rgba(240,54,90,0.3)' }}>
              <ArrowUpRight size={14} color="#F0365A" />
              <span className="text-[#F0365A] text-[11px] font-bold">
                {result.forfeitPenalty.toLocaleString('fr-FR')} GoGold reversés à ton adversaire pour avoir quitté en menant
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5 mt-1.5"
            style={{ background: 'rgba(155,101,245,0.15)', border: '1px solid rgba(155,101,245,0.3)' }}>
            <TrendingUp size={16} color="#9B65F5" />
            <span className="text-[#C4A8FA] text-xs font-bold">La prochaine victoire est pour toi. Reviens plus fort !</span>
          </div>
          <button onClick={onClose} className="mt-2 bg-white text-[#3A3F52] rounded-2xl px-7 py-3 font-extrabold text-sm">
            Fermer
          </button>
        </div>
        <style>{mrmKeyframes}</style>
      </div>
    );
  }

  // Champion — vainqueur ET spectateurs voient ce même écran doré à pétales
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 overflow-hidden animate-[mrm-fadein_0.3s_ease-out]">
      <FallingPetals />
      <div className="w-[86%] max-w-sm rounded-[32px] p-1 animate-[mrm-bouncein_0.8s_ease-out]"
        style={{ background: 'linear-gradient(135deg,#FFD700,#FFA000,#B8860B)' }}>
        <div className="rounded-[28px] py-8 px-6 flex flex-col items-center gap-2.5 text-center"
          style={{ background: 'rgba(20,14,4,0.55)', border: '1.5px solid rgba(255,255,255,0.35)' }}>
          <span className="text-4xl mb-0.5">👑</span>

          <p className="text-white text-[15px] font-black tracking-wide text-center" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
            {result.viewerRole === 'won' ? 'CHAMPION DU MATCH' : `${result.winnerName.toUpperCase()} GAGNE LE MATCH`}
          </p>

          <div className="relative mt-2">
            {result.winnerAvatar ? (
              <img src={result.winnerAvatar} alt={result.winnerName}
                className="w-22 h-22 rounded-full border-[3px]"
                style={{ width: 88, height: 88, borderColor: '#FFD700', boxShadow: '0 0 16px rgba(255,215,0,0.9)' }} />
            ) : (
              <div className="rounded-full flex items-center justify-center bg-[#7B3FF2]" style={{ width: 88, height: 88 }}>
                <User size={30} color="#fff" />
              </div>
            )}
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-3xl">👑</span>
          </div>

          <p className="text-white text-xl font-black mt-1 truncate max-w-full">{result.winnerName}</p>

          {!!result.winnerGoGold && (
            <div className="flex items-center gap-1.5 rounded-2xl px-4 py-2 mt-1" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <span className="text-base">🪙</span>
              <span className="text-[#FFD700] text-base font-black">{result.winnerGoGold.toLocaleString('fr-FR')} GoGold</span>
            </div>
          )}

          {!!result.forfeitPenalty && !result.forfeitByMe && (
            <div className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 mt-0.5 max-w-[90%]" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <Gift size={13} color="#fff" />
              <span className="text-white text-[11px] font-bold text-center">
                +{result.forfeitPenalty.toLocaleString('fr-FR')} GoGold bonus — l'adversaire a abandonné en menant
              </span>
            </div>
          )}

          <p className="text-white/85 text-base font-bold mt-1">{result.scoreA} — {result.scoreB}</p>

          <button onClick={onClose} className="mt-2 bg-white text-[#B8860B] rounded-2xl px-8 py-3 font-black text-sm">
            Fermer
          </button>
        </div>
      </div>
      <style>{mrmKeyframes}</style>
    </div>
  );
}

const mrmKeyframes = `
@keyframes mrm-fadein { from { opacity: 0; } to { opacity: 1; } }
@keyframes mrm-bouncein {
  0% { opacity: 0; transform: scale(0.3); }
  60% { opacity: 1; transform: scale(1.05); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes mrm-fall {
  0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
  5% { opacity: 1; }
  85% { opacity: 1; }
  100% { transform: translateY(55vh) translateX(18px) rotate(360deg); opacity: 0; }
}
`;
