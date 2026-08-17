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
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 animate-[mrm-fadein_0.3s_ease-out]">
        <div className="w-full max-w-[340px] sm:max-w-sm lg:max-w-md rounded-[28px] p-6 sm:p-7 lg:p-9 flex flex-col items-center gap-3 text-center animate-[mrm-bouncein_0.7s_ease-out]"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#4C1D95)' }}>
          <Award className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14" color="#FFD700" />
          <p className="text-white text-lg sm:text-xl lg:text-2xl font-extrabold">Match nul !</p>
          <p className="text-white/90 text-2xl sm:text-3xl lg:text-4xl font-black">{result.scoreA} — {result.scoreB}</p>
          <p className="text-white/70 text-sm lg:text-base">{result.winnerName} et {result.loserName} terminent à égalité.</p>
          <button onClick={onClose} className="mt-2 bg-white text-[#4C1D95] rounded-2xl px-7 py-3 lg:px-8 lg:py-3.5 font-extrabold text-sm lg:text-base">
            Fermer
          </button>
        </div>
        <style>{mrmKeyframes}</style>
      </div>
    );
  }

  if (result.viewerRole === 'lost') {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 animate-[mrm-fadein_0.3s_ease-out]">
        <div className="w-full max-w-[340px] sm:max-w-sm lg:max-w-md rounded-[28px] p-6 sm:p-7 lg:p-9 flex flex-col items-center gap-2.5 text-center animate-[mrm-fadein_0.7s_ease-out]"
          style={{ background: 'linear-gradient(135deg,#3A3F52,#20232F)' }}>
          <span className="text-4xl lg:text-5xl mb-0.5">💙</span>
          <p className="text-white text-lg lg:text-xl font-extrabold">Ce n'est que partie remise</p>
          <p className="text-white/70 text-[13px] lg:text-sm leading-relaxed">
            {result.winnerName} remporte ce match, mais chaque champion a connu la défaite avant de gagner.
          </p>
          <p className="text-white/85 text-2xl lg:text-3xl font-black mt-1">{result.scoreA} — {result.scoreB}</p>
          {!!result.forfeitPenalty && result.forfeitByMe && (
            <div className="flex items-center gap-1.5 rounded-xl px-3 py-2 mt-0.5"
              style={{ background: 'rgba(240,54,90,0.12)', border: '1px solid rgba(240,54,90,0.3)' }}>
              <ArrowUpRight size={14} color="#F0365A" />
              <span className="text-[#F0365A] text-[11px] lg:text-xs font-bold">
                {result.forfeitPenalty.toLocaleString('fr-FR')} GoGold reversés à ton adversaire pour avoir quitté en menant
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5 mt-1.5"
            style={{ background: 'rgba(155,101,245,0.15)', border: '1px solid rgba(155,101,245,0.3)' }}>
            <TrendingUp size={16} color="#9B65F5" />
            <span className="text-[#C4A8FA] text-xs lg:text-sm font-bold">La prochaine victoire est pour toi. Reviens plus fort !</span>
          </div>
          <button onClick={onClose} className="mt-2 bg-white text-[#3A3F52] rounded-2xl px-7 py-3 lg:px-8 lg:py-3.5 font-extrabold text-sm lg:text-base">
            Fermer
          </button>
        </div>
        <style>{mrmKeyframes}</style>
      </div>
    );
  }

  // Champion — vainqueur ET spectateurs voient ce même écran doré à pétales,
  // avec la vidéo de victoire en fond (autoplay muted loop — obligatoire pour
  // que les navigateurs autorisent l'autoplay sans interaction préalable).
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 overflow-hidden p-4 animate-[mrm-fadein_0.3s_ease-out]">
      <video
        src="/victoire.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-60 motion-reduce:hidden"
      />
      <div className="absolute inset-0 bg-black/40" />
      <FallingPetals />
      <div className="relative w-full max-w-[340px] sm:max-w-sm lg:max-w-md rounded-[32px] p-1 animate-[mrm-bouncein_0.8s_ease-out]"
        style={{ background: 'linear-gradient(135deg,#FFD700,#FFA000,#B8860B)' }}>
        <div className="rounded-[28px] py-7 sm:py-8 lg:py-10 px-5 sm:px-6 lg:px-8 flex flex-col items-center gap-2.5 text-center"
          style={{ background: 'rgba(20,14,4,0.55)', border: '1.5px solid rgba(255,255,255,0.35)' }}>
          <span className="text-4xl lg:text-5xl mb-0.5">👑</span>

          <p className="text-white text-[15px] lg:text-lg font-black tracking-wide text-center" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
            {result.viewerRole === 'won' ? 'CHAMPION DU MATCH' : `${result.winnerName.toUpperCase()} GAGNE LE MATCH`}
          </p>

          <div className="relative mt-2">
            {result.winnerAvatar ? (
              <img src={result.winnerAvatar} alt={result.winnerName}
                className="w-[88px] h-[88px] lg:w-28 lg:h-28 rounded-full border-[3px]"
                style={{ borderColor: '#FFD700', boxShadow: '0 0 16px rgba(255,215,0,0.9)' }} />
            ) : (
              <div className="rounded-full flex items-center justify-center bg-[#7B3FF2] w-[88px] h-[88px] lg:w-28 lg:h-28">
                <User size={30} color="#fff" />
              </div>
            )}
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-3xl lg:text-4xl">👑</span>
          </div>

          <p className="text-white text-xl lg:text-2xl font-black mt-1 truncate max-w-full">{result.winnerName}</p>

          {!!result.winnerGoGold && (
            <div className="flex items-center gap-1.5 rounded-2xl px-4 py-2 lg:px-5 lg:py-2.5 mt-1" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <span className="text-base lg:text-lg">🪙</span>
              <span className="text-[#FFD700] text-base lg:text-lg font-black">{result.winnerGoGold.toLocaleString('fr-FR')} GoGold</span>
            </div>
          )}

          {!!result.forfeitPenalty && !result.forfeitByMe && (
            <div className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 mt-0.5 max-w-[90%]" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <Gift size={13} color="#fff" />
              <span className="text-white text-[11px] lg:text-xs font-bold text-center">
                +{result.forfeitPenalty.toLocaleString('fr-FR')} GoGold bonus — l'adversaire a abandonné en menant
              </span>
            </div>
          )}

          <p className="text-white/85 text-base lg:text-lg font-bold mt-1">{result.scoreA} — {result.scoreB}</p>

          <button onClick={onClose} className="mt-2 bg-white text-[#B8860B] rounded-2xl px-8 py-3 lg:px-9 lg:py-3.5 font-black text-sm lg:text-base">
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
