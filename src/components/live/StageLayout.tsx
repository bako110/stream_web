/**
 * StageLayout — affichage vidéo multi-participants d'un live web, façon TikTok
 * Live multi-guest : un grand bloc principal (l'organisateur, ou la personne
 * épinglée par le host) occupe la majorité de la largeur/hauteur, les autres
 * participants s'alignent verticalement en petites cases à côté. Le host peut
 * épingler n'importe qui en plein écran — l'action est synchronisée pour TOUS
 * les viewers (POST/DELETE /lives/{id}/spotlight + WS live_spotlight_changed,
 * cf. LiveSimplePage.tsx), pas un simple changement d'affichage local.
 *
 * Volontairement différent du layout mobile natif (grille adaptative centrée)
 * — sur desktop web (lg+), la largeur disponible permet une colonne latérale
 * verticale fixe (Twitch/TikTok Live desktop). Sur mobile web (<lg, écran
 * étroit), la colonne passe en bande horizontale scrollable sous le bloc
 * principal — même esprit (petites cases fixes, scroll pour en accueillir
 * beaucoup), adapté à la largeur d'un téléphone.
 */
import { useState } from 'react';
import type { TrackReference } from '@livekit/components-react';
import { VideoTrack } from '@livekit/components-react';
import { Gift, MoreVertical, Pin, PinOff } from 'lucide-react';

export interface StageParticipant {
  identity:   string;
  name:       string;
  track:      TrackReference;
  isLocal:    boolean;
  onStage:    boolean;
  isSpeaking: boolean;
}

export function StageLayout({
  participants, mainIdentity, isHost, onGiftClick, onMenuClick, onPinClick,
}: {
  participants: StageParticipant[];
  /** Identité affichée en grand — la personne épinglée par le host, ou par défaut le premier participant. */
  mainIdentity: string | null;
  isHost: boolean;
  onGiftClick: (identity: string, name: string) => void;
  /** Reçoit la position du bouton cliqué — le menu est rendu via portail par
   * l'appelant (LiveSimplePage), pour ne jamais être rogné par l'overflow-hidden
   * des tuiles/cadres vidéo (cf. commentaire historique plus bas). */
  onMenuClick: (identity: string, anchor: { x: number; y: number; alignRight: boolean }) => void;
  onPinClick:  (identity: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const pinnedParticipant = mainIdentity ? participants.find(p => p.identity === mainIdentity) : undefined;
  // La personne épinglée par le host n'a pas encore de flux vidéo disponible chez
  // CE client précis (souscription LiveKit pas encore arrivée, quelques centaines
  // de ms après le broadcast WS) — avant ce fix, ce cas retombait SILENCIEUSEMENT
  // sur le premier participant de la liste (souvent quelqu'un d'autre), donnant
  // l'impression que "les autres ne voient pas la même personne en principal".
  // On affiche plutôt un état de chargement explicite le temps que le flux arrive,
  // jamais quelqu'un d'autre à sa place.
  const pinnedButNotReady = !!mainIdentity && !pinnedParticipant;
  const main = pinnedParticipant ?? (mainIdentity ? undefined : participants[0]) ?? null;
  const others = participants.filter(p => p.identity !== main?.identity);

  if (pinnedButNotReady) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-2 text-white/60">
          <Pin size={22} />
          <span className="text-xs">Connexion au flux épinglé…</span>
        </div>
      </div>
    );
  }

  if (!main) return null;

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-1.5 p-1.5 bg-black overflow-hidden">
      {/* ── Bloc principal — organisateur ou personne épinglée ── */}
      <div
        className="relative flex-1 min-w-0 min-h-0 rounded-xl overflow-hidden"
        style={{ border: `1.5px solid ${main.isSpeaking ? '#22c55e' : 'rgba(255,255,255,0.12)'}` }}
        onMouseEnter={() => setHoveredId(main.identity)}
        onMouseLeave={() => setHoveredId(null)}
      >
        <VideoTrack trackRef={main.track} className="w-full h-full object-cover" />
        {main.isSpeaking && (
          <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 3px #22c55e' }} />
        )}

        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white text-sm font-semibold px-3 py-1 rounded-full"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
          {main.onStage && <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />}
          {main.isLocal ? 'Toi' : main.name}
          {mainIdentity && (
            <Pin size={12} className="ml-0.5 shrink-0" style={{ color: '#a78bfa' }} />
          )}
        </div>

        {!main.isLocal && (
          <div className={`absolute top-3 right-3 z-20 flex items-center gap-2 transition-opacity ${hoveredId === main.identity || isHost ? 'opacity-100' : 'opacity-0'}`}>
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.55)' }}
              onClick={() => onGiftClick(main.identity, main.name)}>
              <Gift size={16} style={{ color: '#fbbf24' }} />
            </button>
            {isHost && (
              <>
                {mainIdentity && (
                  <button
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.55)' }}
                    title="Désépingler"
                    onClick={() => onPinClick(main.identity)}>
                    <PinOff size={16} color="#fff" />
                  </button>
                )}
                <button
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.55)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const r = e.currentTarget.getBoundingClientRect();
                    onMenuClick(main.identity, { x: r.right, y: r.bottom, alignRight: true });
                  }}>
                  <MoreVertical size={16} color="#fff" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Les autres participants en petites cases fixes — colonne verticale à
          droite sur desktop (lg+), bande horizontale sous la vidéo sur mobile web.
          Taille constante quel que soit leur nombre (jamais de case géante avec
          1 seul participant) : seule la personne en direct/présentée a droit au
          grand espace. Scroll dès que ça déborde, pour accueillir beaucoup de
          monde sans jamais agrandir les cases. ── */}
      {others.length > 0 && (
        <div className="relative z-20 flex flex-row lg:flex-col gap-1 shrink-0 w-full h-[76px] lg:w-[84px] lg:h-full
          overflow-x-auto lg:overflow-x-visible overflow-y-visible lg:overflow-y-auto">
          {others.map(p => (
            <div
              key={p.identity}
              className="relative rounded-md overflow-hidden shrink-0 cursor-pointer transition-transform hover:scale-[0.97] w-14 h-[72px] lg:w-full lg:h-auto"
              style={{
                border: `1.5px solid ${p.isSpeaking ? '#22c55e' : 'rgba(255,255,255,0.12)'}`,
                aspectRatio: '3 / 4',
              }}
              onMouseEnter={() => setHoveredId(p.identity)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => isHost && onPinClick(p.identity)}
              title={isHost ? 'Épingler en plein écran pour tous' : undefined}
            >
              <VideoTrack trackRef={p.track} className="w-full h-full object-cover" />
              {p.isSpeaking && (
                <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 2px #22c55e' }} />
              )}

              <div className="absolute bottom-0.5 left-0.5 right-0.5 flex items-center gap-0.5 text-white text-[8px] font-semibold px-1 py-0.5 rounded-full truncate"
                style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
                {p.onStage && <span className="w-1 h-1 rounded-full bg-green-400 shrink-0" />}
                <span className="truncate">{p.isLocal ? 'Toi' : p.name}</span>
              </div>

              {!p.isLocal && (hoveredId === p.identity || isHost) && (
                <div className="absolute top-0.5 right-0.5 z-20 flex items-center gap-0.5">
                  <button
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.6)' }}
                    onClick={(e) => { e.stopPropagation(); onGiftClick(p.identity, p.name); }}>
                    <Gift size={8} style={{ color: '#fbbf24' }} />
                  </button>
                  {isHost && (
                    <button
                      className="w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.6)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const r = e.currentTarget.getBoundingClientRect();
                        onMenuClick(p.identity, { x: r.right, y: r.bottom, alignRight: true });
                      }}>
                      <MoreVertical size={8} color="#fff" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
