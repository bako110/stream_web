/**
 * StageLayout — affichage vidéo multi-participants d'un live web, façon TikTok
 * Live multi-guest : un grand bloc principal (l'organisateur, ou la personne
 * épinglée par le host) occupe TOUJOURS tout l'espace disponible. Les autres
 * participants sur scène apparaissent dans un panneau overlay compact
 * "Sur scène (N)" ancré en haut à droite du bloc principal (avatars ronds,
 * pastille verte "actif", scroll horizontal si trop de monde) — jamais une
 * bande qui pousse le layout du bloc principal ou se fait recouvrir par
 * d'autres éléments overlay (chat/actions) sur mobile. Le host peut épingler
 * n'importe qui en plein écran — l'action est synchronisée pour TOUS les
 * viewers (POST/DELETE /lives/{id}/spotlight + WS live_spotlight_changed, cf.
 * LiveSimplePage.tsx), pas un simple changement d'affichage local.
 */
import { useState } from 'react';
import type { TrackReference } from '@livekit/components-react';
import { VideoTrack } from '@livekit/components-react';
import { Gift, Mic, MoreVertical, Pin, PinOff, User } from 'lucide-react';

export interface StageParticipant {
  identity:   string;
  name:       string;
  /** Absent si ce participant n'a pas (encore, ou par choix) activé sa caméra
   * — être sur scène n'oblige pas à publier de vidéo, cf. LiveSimplePage.tsx
   * (contrôle entier laissé à l'utilisateur). Dans ce cas la case affiche son
   * avatar de profil à la place d'un flux vidéo. */
  track:      TrackReference | null;
  avatarUrl:  string | null;
  isLocal:    boolean;
  onStage:    boolean;
  isSpeaking: boolean;
}

function ParticipantAvatarFallback({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: '#1C1033' }}>
      {avatarUrl
        ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        : <User size={28} color="rgba(255,255,255,0.4)" />}
    </div>
  );
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

  const hasOthers = others.length > 0;

  return (
    // Plus de padding-top ni de bande pleine largeur : le bloc principal
    // occupe toujours tout l'espace (jamais de vide au-dessus), le panneau
    // "Sur scène" (ci-dessous) flotte en overlay compact au-dessus de lui,
    // sans jamais pousser son layout.
    <div className="relative w-full h-full flex flex-col lg:flex-row gap-1.5 p-1.5 bg-black overflow-hidden">
      {/* ── Bloc principal — organisateur ou personne épinglée ── */}
      <div
        className="relative flex-1 min-w-0 min-h-0 rounded-2xl overflow-hidden"
        style={{ border: `1.5px solid ${main.isSpeaking ? '#22c55e' : 'rgba(255,255,255,0.12)'}` }}
        onMouseEnter={() => setHoveredId(main.identity)}
        onMouseLeave={() => setHoveredId(null)}
      >
        {main.track
          ? (
            <>
              {/* Fond flou — même flux vidéo en arrière-plan, agrandi et flouté
                  (façon TikTok/Instagram Live), pour remplir les bandes noires
                  que laisserait object-contain seul sur mobile (cadre ~9:19
                  bien plus vertical qu'une webcam 16:9/4:3 classique). Masqué
                  sur desktop (lg+) où le cadre reste proche du ratio vidéo et
                  object-cover seul suffit, sans bande à combler. */}
              <VideoTrack trackRef={main.track} aria-hidden
                className="lg:hidden absolute inset-0 w-full h-full object-cover scale-125"
                style={{ filter: 'blur(24px) brightness(0.55)' }} />
              {/* Premier plan — object-contain sur mobile (jamais de rognage de
                  la caméra source), object-cover sur desktop (cadre proche du
                  ratio vidéo, pas besoin de fond). */}
              <VideoTrack trackRef={main.track} className="relative w-full h-full object-contain lg:object-cover" />
            </>
          )
          : <ParticipantAvatarFallback avatarUrl={main.avatarUrl} name={main.name} />}
        {main.isSpeaking && (
          <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 3px #22c55e' }} />
        )}

        {/* Badge nom — en haut du cadre sur mobile (top-3), en bas sur desktop
            (lg:bottom-3/lg:top-auto) où il n'y a pas de conflit. Sur mobile, le
            bloc vidéo occupe tout l'écran (absolute inset-0, cf. LiveSimplePage)
            et le groupe bas (chat/actions) flotte par-dessus sans jamais
            réserver d'espace — un badge en bas se retrouvait donc caché sous
            cette barre au lieu de rester visible dans la zone vidéo. */}
        <div className="absolute top-3 left-3 lg:top-auto lg:bottom-3 flex items-center gap-1.5 text-white text-sm font-semibold px-3 py-1 rounded-full"
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

      {/* ── Panneau "Sur scène" — overlay compact ancré en haut à droite (façon
          TikTok Live multi-guest), au lieu d'une bande pleine largeur qui
          poussait le layout et se faisait recouvrir par le groupe bas (chat/
          actions) sur mobile. Ne touche jamais à la taille du bloc principal :
          flotte simplement au-dessus de lui, avec son propre scroll horizontal
          si trop de participants pour tenir sur une ligne. ── */}
      {hasOthers && (
        // top-14 sur mobile : réserve la place du header overlay (avatar, nom
        // du live, badge LIVE, timer, viewers — cf. LiveSimplePage.tsx, ~56px)
        // qui flotte par-dessus tout l'écran (le bloc vidéo est en absolute
        // inset-0 sur mobile) ; top-3 sur desktop (lg:) où le header est séparé,
        // au-dessus de la carte, donc pas de conflit à cette hauteur.
        <div className="absolute top-14 sm:top-16 lg:top-3 right-3 z-20 rounded-2xl overflow-hidden max-w-[calc(100%-1.5rem)]"
          style={{ background: 'rgba(10,8,20,0.9)', border: '1px solid rgba(155,101,245,0.5)', boxShadow: '0 0 20px rgba(123,63,242,0.35)', backdropFilter: 'blur(8px)' }}>
          <p className="px-3 pt-2 pb-1.5 text-white text-xs font-bold">Sur scène ({others.length})</p>
          <div className="flex items-center gap-2.5 px-3 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {others.map(p => (
              <div
                key={p.identity}
                className="relative flex flex-col items-center gap-1 shrink-0 cursor-pointer"
                onClick={() => isHost && onPinClick(p.identity)}
                title={isHost ? 'Épingler en plein écran pour tous' : undefined}
              >
                <div className="relative w-14 h-14 rounded-full overflow-hidden"
                  style={{ border: `2px solid ${p.isSpeaking ? '#22c55e' : '#9B65F5'}` }}>
                  {p.track
                    ? <VideoTrack trackRef={p.track} className="w-full h-full object-cover" />
                    : <ParticipantAvatarFallback avatarUrl={p.avatarUrl} name={p.name} />}
                  {/* Pastille verte "actif" — micro/caméra publiés */}
                  <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2"
                    style={{ background: '#22c55e', borderColor: '#0a0814' }} />
                </div>
                <span className="flex items-center gap-0.5 text-white text-[10px] font-semibold max-w-[60px] truncate">
                  <Mic size={9} style={{ color: 'rgba(255,255,255,0.6)' }} />
                  {p.isLocal ? 'Toi' : p.name}
                </span>

                {!p.isLocal && (hoveredId === p.identity || isHost) && (
                  <div className="absolute -top-1 -right-1 z-20 flex items-center gap-0.5"
                    onMouseEnter={() => setHoveredId(p.identity)}>
                    <button
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.7)' }}
                      onClick={(e) => { e.stopPropagation(); onGiftClick(p.identity, p.name); }}>
                      <Gift size={9} style={{ color: '#fbbf24' }} />
                    </button>
                    {isHost && (
                      <button
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.7)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const r = e.currentTarget.getBoundingClientRect();
                          onMenuClick(p.identity, { x: r.right, y: r.bottom, alignRight: true });
                        }}>
                        <MoreVertical size={9} color="#fff" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
