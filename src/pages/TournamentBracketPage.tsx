import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, DollarSign, AlertTriangle, Users, Lock, CreditCard,
  Calendar, Clock, Globe, Award, Zap, Play, Check, User, Settings, UserPlus, X, Radio,
} from 'lucide-react';
import { PageLoader, Spinner } from '../components/ui/Spinner';
import { decodeId, encodeId } from '../utils/slugId';
import { useAuthStore } from '../store/authStore';
import { useWs } from '../context/WebSocketContext';
import {
  tournamentsApi, type TournamentBracket, type TournamentMatch,
  type TournamentRound, type TournamentStanding,
} from '../api/tournaments';
import { MatchResultModal, type MatchResultData } from '../components/live/MatchResultModal';

const ROUND_LABELS: Record<TournamentRound, string> = {
  qualifications: 'Qualifications',
  round_of_32:    'Seizièmes',
  round_of_16:    'Huitièmes',
  quarterfinal:   'Quarts',
  semifinal:      'Demies',
  final:          'Finale',
  group_stage:    'Phase de groupes',
  losers_round:   'Bracket des perdants',
  grand_final:    'Grande finale',
};

const REGISTRATION_MODE_LABELS: Record<string, string> = {
  open:        'Inscription libre — rejoins directement',
  approval:    "Inscription sur validation — l'organisateur doit accepter",
  invite_only: 'Sur invitation uniquement — code requis',
};

function LiveDot({ size = 8 }: { size?: number }) {
  return <span className="rounded-full inline-block animate-pulse" style={{ width: size, height: size, background: '#EF4444' }} />;
}

function MatchSlot({ name, avatar, isWinner }: { name: string; avatar?: string | null; isWinner: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      {avatar ? (
        <img src={avatar} className={`w-7 h-7 rounded-full object-cover shrink-0 ${isWinner ? 'ring-2 ring-[#10B981]' : ''}`} />
      ) : (
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isWinner ? 'ring-2 ring-[#10B981]' : ''}`} style={{ background: 'rgba(255,255,255,0.08)' }}>
          <User size={12} className="text-white/40" />
        </div>
      )}
      <span className={`text-sm flex-1 truncate ${isWinner ? 'font-bold' : 'font-medium'}`}
        style={{ color: isWinner ? '#10B981' : 'var(--text-primary)' }}>{name}</span>
      {isWinner && <Check size={14} className="shrink-0" style={{ color: '#10B981' }} />}
    </div>
  );
}

function MatchDetailSide({ name, avatar, isWinner }: { name: string; avatar?: string | null; isWinner: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      {avatar ? (
        <img src={avatar} className="w-14 h-14 rounded-full object-cover" />
      ) : (
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <User size={18} className="text-white/40" />
        </div>
      )}
      <span className={`text-sm text-center line-clamp-2 ${isWinner ? 'font-extrabold' : 'font-medium'}`}
        style={{ color: isWinner ? '#FFD700' : 'var(--text-primary)' }}>{name}</span>
      {isWinner && <Award size={14} style={{ color: '#FFD700' }} />}
    </div>
  );
}

export default function TournamentBracketPage() {
  const { id: slug } = useParams<{ id: string }>();
  const tournamentId = decodeId(slug!);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addListener, removeListener } = useWs();

  const [bracket, setBracket]   = useState<TournamentBracket | null>(null);
  const [standings, setStandings] = useState<TournamentStanding[]>([]);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
  const [decidingForfeit, setDecidingForfeit] = useState(false);
  const [joining, setJoining] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinPassword, setJoinPassword] = useState('');
  const [joinInviteCode, setJoinInviteCode] = useState('');
  const [matchResult, setMatchResult] = useState<MatchResultData | null>(null);

  const bracketRef = useRef(bracket);
  bracketRef.current = bracket;
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await tournamentsApi.getBracket(tournamentId);
      setBracket(data);
      if (data.tournament.tournament_type === 'league' || data.tournament.tournament_type === 'group_stage') {
        tournamentsApi.getStandings(tournamentId).then(setStandings).catch(() => {});
      }
    } catch (e: any) {
      setLoadError(e?.message ?? "Impossible de charger ce tournoi.");
    } finally { setLoading(false); }
  }, [tournamentId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = (payload: any) => {
      if (payload.tournament_id !== tournamentId) return;

      if (payload.type === 'tournament_match_completed') {
        const myId = userIdRef.current;
        const b = bracketRef.current;
        const myPart = b?.participants.find(p => p.user_id === myId) ?? null;
        const isDraw = !!payload.is_draw;
        const winnerId = payload.winner_participant_id;
        const loserId  = payload.loser_participant_id;

        if (isDraw || winnerId) {
          const winner = winnerId ? b?.participants.find(p => String(p.id) === String(winnerId)) ?? null : null;
          const loser  = loserId  ? b?.participants.find(p => String(p.id) === String(loserId))  ?? null : null;
          const viewerRole: 'won' | 'lost' | 'spectator' =
            !myPart || isDraw ? 'spectator'
            : String(myPart.id) === String(winnerId) ? 'won'
            : String(myPart.id) === String(loserId)  ? 'lost'
            : 'spectator';
          setMatchResult({
            isDraw,
            winnerName: winner?.display_name ?? 'Le vainqueur',
            loserName:  loser?.display_name ?? 'Son adversaire',
            winnerAvatar: winner?.avatar_url ?? null,
            scoreA: Number(payload.score_a ?? 0),
            scoreB: Number(payload.score_b ?? 0),
            viewerRole,
          });
        }
        load();
        return;
      }

      if ([
        'tournament_bracket_generated', 'tournament_round_generated', 'tournament_match_ready_update',
        'tournament_match_started', 'tournament_completed', 'tournament_participant_joined',
      ].includes(payload.type)) {
        load();
      }
    };
    addListener(handler);
    return () => removeListener(handler);
  }, [addListener, removeListener, tournamentId, load]);

  const myParticipant = bracket?.participants.find(p => p.user_id === user?.id) ?? null;

  function findMyMatch(): TournamentMatch | null {
    if (!bracket || !myParticipant) return null;
    return bracket.matches.find(
      m => m.status === 'ready' && (m.participant_a_id === myParticipant.id || m.participant_b_id === myParticipant.id),
    ) ?? null;
  }

  async function handleGenerateBracket() {
    if (generating) return;
    setGenerating(true);
    try { await tournamentsApi.generateBracket(tournamentId); await load(); }
    catch { /* silencieux */ } finally { setGenerating(false); }
  }

  function handleOpenJoin() {
    if (bracket?.tournament.has_password || bracket?.tournament.registration_mode === 'invite_only') {
      setShowJoin(true);
    } else {
      handleJoin();
    }
  }

  async function handleJoin() {
    setJoining(true);
    try {
      await tournamentsApi.join(tournamentId, joinPassword || undefined, joinInviteCode || undefined);
      setShowJoin(false);
      setJoinPassword('');
      setJoinInviteCode('');
      await load();
    } catch { /* silencieux */ } finally { setJoining(false); }
  }

  function handleForfeit(winnerParticipantId: string) {
    if (!selectedMatch || decidingForfeit) return;
    setDecidingForfeit(true);
    tournamentsApi.declareForfeit(selectedMatch.id, winnerParticipantId)
      .then(() => { setSelectedMatch(null); return load(); })
      .catch(() => {})
      .finally(() => setDecidingForfeit(false));
  }

  if (loading) return <PageLoader />;

  if (loadError || !bracket) {
    return (
      <div>
        <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <button onClick={() => navigate(-1)} className="text-[var(--text-secondary)]"><ChevronLeft size={22} /></button>
          <h1 className="text-base font-bold flex-1 text-center" style={{ color: 'var(--text-primary)' }}>Tournoi</h1>
          <div style={{ width: 22 }} />
        </div>
        <div className="flex flex-col items-center gap-3.5 pt-20 px-8">
          <AlertTriangle size={32} color="#EF4444" />
          <p className="text-sm text-center font-medium" style={{ color: 'var(--text-primary)' }}>
            {loadError ?? "Ce tournoi n'a pas pu être chargé."}
          </p>
          <button onClick={() => { setLoading(true); load(); }} className="btn-primary text-sm px-5 py-2 mt-1">Réessayer</button>
        </div>
      </div>
    );
  }

  const { tournament, participants } = bracket;
  const isOrganizer = tournament.created_by === user?.id;
  const rounds = Array.from(new Set(bracket.matches.map(m => m.round)));
  const myMatch = findMyMatch();
  const liveMatches = bracket.matches.filter(m => m.status === 'live' && m.battle_id);

  const isSequentialBracket = tournament.tournament_type === 'single_elimination'
    || (tournament.tournament_type === 'group_stage' && rounds.every(r => r !== 'group_stage'));
  const activeRoundIdx = rounds.findIndex(r => bracket.matches.some(m => m.round === r && m.status !== 'completed'));
  const displayedRoundIdx = isSequentialBracket
    ? (activeRoundIdx === -1 ? rounds.length - 1 : activeRoundIdx)
    : -1;

  function myStatus(): { label: string; color: string; icon: React.ReactNode; opponentName: string | null } | null {
    if (!myParticipant) return null;
    if (tournament.status === 'completed') {
      const won = tournament.winner_id === user?.id;
      return won
        ? { label: 'Champion du tournoi 🏆', color: '#FFD700', icon: <Award size={19} />, opponentName: null }
        : { label: 'Tournoi terminé', color: '#9CA3AF', icon: <Award size={19} />, opponentName: null };
    }
    if (tournament.status === 'registration') {
      return { label: 'Inscrit — en attente du démarrage', color: '#7B3FF2', icon: <Clock size={19} />, opponentName: null };
    }
    if (myParticipant.eliminated_round) {
      return { label: 'Éliminé', color: '#EF4444', icon: <X size={19} />, opponentName: null };
    }
    if (myMatch) {
      const opp = myMatch.participant_a_id === myParticipant.id
        ? participants.find(p => p.id === myMatch.participant_b_id)
        : participants.find(p => p.id === myMatch.participant_a_id);
      return { label: 'À toi de jouer', color: '#10B981', icon: <Zap size={19} />, opponentName: opp?.display_name ?? 'Adversaire à confirmer' };
    }
    const myLiveMatch = liveMatches.find(m => m.participant_a_id === myParticipant.id || m.participant_b_id === myParticipant.id);
    if (myLiveMatch) {
      const opp = myLiveMatch.participant_a_id === myParticipant.id
        ? participants.find(p => p.id === myLiveMatch.participant_b_id)
        : participants.find(p => p.id === myLiveMatch.participant_a_id);
      return { label: 'Match en cours', color: '#EF4444', icon: <Radio size={19} />, opponentName: opp?.display_name ?? null };
    }
    return { label: 'Qualifié — en attente du prochain match', color: '#F59E0B', icon: <Check size={19} />, opponentName: null };
  }
  const currentPhase = rounds.length > 0
    ? ROUND_LABELS[rounds.find(r => bracket.matches.some(m => m.round === r && m.status !== 'completed')) ?? rounds[rounds.length - 1]]
    : null;
  const status = myStatus();

  function renderMatchCard(match: TournamentMatch) {
    const partA = participants.find(p => p.id === match.participant_a_id);
    const partB = participants.find(p => p.id === match.participant_b_id);
    const isMine = match.id === myMatch?.id;
    const isLive = match.status === 'live';
    const isTappable = match.status !== 'pending';
    return (
      <button key={match.id} disabled={!isTappable} onClick={() => setSelectedMatch(match)}
        className="relative w-full rounded-2xl border p-3 text-left transition-colors"
        style={{
          background: 'var(--surface)',
          borderColor: isMine ? '#7B3FF2' : isLive ? '#EF444455' : 'var(--border)',
          borderWidth: isMine ? 2 : 1,
          cursor: isTappable ? 'pointer' : 'default',
        }}>
        <MatchSlot name={partA?.display_name ?? (match.status === 'pending' ? '—' : 'En attente')} avatar={partA?.avatar_url} isWinner={match.winner_participant_id === match.participant_a_id} />
        <div className="h-px my-0.5" style={{ background: 'var(--divider)' }} />
        <MatchSlot name={partB?.display_name ?? (match.status === 'pending' ? '—' : 'En attente')} avatar={partB?.avatar_url} isWinner={match.winner_participant_id === match.participant_b_id} />
        {isLive && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <LiveDot size={6} />
            <span className="text-[9px] font-black" style={{ color: '#EF4444' }}>DIRECT</span>
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="min-h-[calc(100vh-57px)]">
      <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <button onClick={() => navigate(-1)} className="text-[var(--text-secondary)]"><ChevronLeft size={22} /></button>
        <h1 className="text-base font-bold flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{tournament.name}</h1>
        {isOrganizer && tournament.status !== 'registration' ? (
          <button onClick={() => navigate(`/tournaments/${encodeId(tournamentId)}/finance`)}
            className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <DollarSign size={17} color="#F59E0B" />
          </button>
        ) : <div style={{ width: 36 }} />}
      </div>

      <div className="max-w-3xl mx-auto p-4 flex flex-col gap-4">

        {tournament.image_url ? (
          <img src={tournament.image_url} alt="" className="w-full h-40 sm:h-52 rounded-2xl object-cover" />
        ) : (
          <div className="w-full h-32 sm:h-40 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7B3FF230,#FFD70015)' }}>
            <Award size={40} style={{ color: '#7B3FF2', opacity: 0.5 }} />
          </div>
        )}

        {status && (
          <div className="flex items-center gap-3 rounded-2xl border p-3.5" style={{ borderColor: `${status.color}45`, background: `linear-gradient(135deg,${status.color}22,${status.color}08)` }}>
            <div className="w-10 h-10 rounded-[13px] flex items-center justify-center shrink-0" style={{ background: `${status.color}25`, color: status.color }}>
              {status.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold" style={{ color: status.color }}>{status.label}</p>
              {currentPhase && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Phase actuelle · {currentPhase}</p>}
              {status.opponentName && <p className="text-sm mt-0.5 font-medium" style={{ color: 'var(--text-primary)' }}>Adversaire : {status.opponentName}</p>}
            </div>
            {status.label === 'Match en cours' && <LiveDot size={9} />}
          </div>
        )}

        {tournament.prize_pool > 0 && (
          <div className="flex items-center gap-3 rounded-2xl p-3.5" style={{ background: 'linear-gradient(90deg,#FFD70020,#FFA00010)' }}>
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-xs font-bold" style={{ color: 'var(--text-tertiary)' }}>Cagnotte du tournoi</p>
              <p className="text-base font-black" style={{ color: 'var(--text-primary)' }}>{tournament.prize_pool.toLocaleString('fr-FR')} GoGold</p>
            </div>
          </div>
        )}

        {tournament.status === 'registration' && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>Inscriptions ouvertes</p>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(123,63,242,0.1)', color: '#7B3FF2' }}>
                {participants.length} / {tournament.format}
              </span>
            </div>
            <div className="h-1.5 rounded-full mb-3 overflow-hidden" style={{ background: 'var(--divider)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (participants.length / tournament.format) * 100)}%`, background: '#7B3FF2' }} />
            </div>

            {!isOrganizer && !myParticipant && participants.length < tournament.format && (
              <button onClick={handleOpenJoin} className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white"
                style={{ background: 'linear-gradient(90deg,#10B981,#059669)' }}>
                <UserPlus size={14} /> Rejoindre{tournament.entry_fee_gogold > 0 ? ` (${tournament.entry_fee_gogold} GoGold)` : ''}
              </button>
            )}

            {isOrganizer && participants.length >= 2 && (
              <button onClick={handleGenerateBracket} disabled={generating}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(90deg,#9B65F5,#7B3FF2)' }}>
                {generating ? <Spinner size="sm" /> : <><Play size={14} /> Démarrer maintenant</>}
              </button>
            )}
          </div>
        )}

        <div className="card p-4 flex flex-col gap-2.5">
          <p className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>À propos de ce tournoi</p>
          {tournament.description && <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{tournament.description}</p>}

          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <Users size={14} className="text-[var(--text-tertiary)] shrink-0" /> {REGISTRATION_MODE_LABELS[tournament.registration_mode]}
          </div>
          {tournament.has_password && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Lock size={14} className="text-[var(--text-tertiary)] shrink-0" /> Tournoi privé — mot de passe requis
            </div>
          )}
          {tournament.entry_fee_gogold > 0 && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <CreditCard size={14} className="text-[var(--text-tertiary)] shrink-0" /> Frais d'inscription : {tournament.entry_fee_gogold} GoGold
            </div>
          )}
          {tournament.scheduled_start_at && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Calendar size={14} className="text-[var(--text-tertiary)] shrink-0" /> Début prévu : {new Date(tournament.scheduled_start_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          )}
          {tournament.registration_closes_at && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Clock size={14} className="text-[var(--text-tertiary)] shrink-0" /> Clôture des inscriptions : {new Date(tournament.registration_closes_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          )}
          {(tournament.allowed_countries?.length || tournament.allowed_languages?.length) ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Globe size={14} className="text-[var(--text-tertiary)] shrink-0" />
              {tournament.allowed_countries?.length ? `Pays : ${tournament.allowed_countries.join(', ')}` : ''}
              {tournament.allowed_countries?.length && tournament.allowed_languages?.length ? ' · ' : ''}
              {tournament.allowed_languages?.length ? `Langues : ${tournament.allowed_languages.join(', ')}` : ''}
            </div>
          ) : null}
          {tournament.rules && (
            <div className="rounded-xl p-3.5 mt-1" style={{ background: 'var(--bg-secondary)' }}>
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Règlement</p>
              <p className="text-xs whitespace-pre-line leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{tournament.rules}</p>
            </div>
          )}
        </div>

        {liveMatches.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <LiveDot />
              <p className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
                {liveMatches.length} match{liveMatches.length > 1 ? 's' : ''} en direct
              </p>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {liveMatches.map(match => {
                const partA = participants.find(p => p.id === match.participant_a_id);
                const partB = participants.find(p => p.id === match.participant_b_id);
                return (
                  <button key={match.id} onClick={() => setSelectedMatch(match)}
                    className="shrink-0 rounded-2xl border p-3 flex flex-col gap-2 min-w-[220px]"
                    style={{ background: 'var(--surface)', borderColor: '#EF444440' }}>
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {partA?.display_name ?? '—'} <span style={{ color: 'var(--text-tertiary)' }}>vs</span> {partB?.display_name ?? '—'}
                    </p>
                    <div className="flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(90deg,#9B65F5,#7B3FF2)' }}>
                      <Play size={10} /> Regarder
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {myMatch && (
          <div className="flex items-center gap-3 rounded-2xl p-3.5" style={{ background: 'linear-gradient(90deg,#7B3FF230,#7B3FF210)' }}>
            <div className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0" style={{ background: 'rgba(123,63,242,0.2)' }}>
              <Zap size={18} color="#7B3FF2" />
            </div>
            <p className="flex-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>C'est ton tour de jouer !</p>
          </div>
        )}

        {tournament.status === 'completed' && tournament.winner_id && (
          <div className="flex flex-col items-center gap-2 rounded-2xl p-6" style={{ background: 'linear-gradient(135deg,#FFD70030,#FFA00015)' }}>
            <Award size={34} color="#FFD700" />
            <p className="text-sm font-bold text-center" style={{ color: 'var(--text-primary)' }}>
              {participants.find(p => p.user_id === tournament.winner_id)?.display_name ?? 'Champion'} remporte le tournoi !
            </p>
            {tournament.prize_pool > 0 && <p className="text-sm font-black" style={{ color: '#FFD700' }}>+{tournament.prize_pool.toLocaleString('fr-FR')} GoGold</p>}
          </div>
        )}

        {standings.length > 0 && (
          <div className="card p-4">
            <p className="text-sm font-extrabold mb-2" style={{ color: 'var(--text-primary)' }}>Classement</p>
            {standings.map(s => (
              <div key={s.user_id} className="flex items-center gap-2.5 py-1.5">
                <span className="text-sm font-bold w-4" style={{ color: s.rank === 1 ? '#FFD700' : 'var(--text-tertiary)' }}>{s.rank}</span>
                {s.avatar_url
                  ? <img src={s.avatar_url} className="w-7 h-7 rounded-full object-cover" />
                  : <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}><User size={12} className="text-white/40" /></div>}
                <span className="flex-1 text-sm truncate font-medium" style={{ color: 'var(--text-primary)' }}>{s.display_name ?? 'Participant'}</span>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{s.wins}V {s.draws}N {s.losses}D</span>
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{s.points} pts</span>
              </div>
            ))}
          </div>
        )}

        {isSequentialBracket ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>{ROUND_LABELS[rounds[displayedRoundIdx]]}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Étape {displayedRoundIdx + 1} / {rounds.length}</p>
            </div>
            <div className="flex gap-1.5 mb-3">
              {rounds.map((r, i) => (
                <div key={r} className="h-1.5 flex-1 rounded-full" style={{ background: i < displayedRoundIdx ? '#10B981' : i === displayedRoundIdx ? '#7B3FF2' : 'var(--border)' }} />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {bracket.matches.filter(m => m.round === rounds[displayedRoundIdx]).sort((a, b) => a.position - b.position).map(match => renderMatchCard(match))}
            </div>

            {displayedRoundIdx > 0 && (
              <div className="rounded-xl border p-3 mt-3" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>Résultats · {ROUND_LABELS[rounds[displayedRoundIdx - 1]]}</p>
                {bracket.matches.filter(m => m.round === rounds[displayedRoundIdx - 1]).sort((a, b) => a.position - b.position).map(match => {
                  const winner = participants.find(p => p.id === match.winner_participant_id);
                  const loser = participants.find(p => p.id === (match.winner_participant_id === match.participant_a_id ? match.participant_b_id : match.participant_a_id));
                  return (
                    <div key={match.id} className="flex items-center gap-1.5 py-1">
                      <Award size={12} color="#FFD700" />
                      <span className="text-xs truncate font-medium" style={{ color: 'var(--text-primary)' }}>{winner?.display_name ?? '—'}</span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>bat</span>
                      <span className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{loser?.display_name ?? '—'}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {rounds.map(round => (
              <div key={round} className="shrink-0 w-56 flex flex-col gap-2.5">
                <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>{ROUND_LABELS[round]}</p>
                {bracket.matches.filter(m => m.round === round).sort((a, b) => a.position - b.position).map(match => renderMatchCard(match))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal rejoindre */}
      {showJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60" onClick={() => setShowJoin(false)}>
          <div className="w-full max-w-sm rounded-2xl p-5 flex flex-col gap-3" style={{ background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
            <p className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>Rejoindre le tournoi</p>
            {tournament.has_password && (
              <input type="password" className="input text-sm" placeholder="Mot de passe" value={joinPassword} onChange={e => setJoinPassword(e.target.value)} />
            )}
            {tournament.registration_mode === 'invite_only' && (
              <input className="input text-sm uppercase" placeholder="Code d'invitation" value={joinInviteCode} onChange={e => setJoinInviteCode(e.target.value)} />
            )}
            <div className="flex gap-2.5 mt-1">
              <button onClick={() => setShowJoin(false)} className="flex-1 rounded-xl py-2.5 text-sm font-bold" style={{ color: 'var(--text-tertiary)' }}>Annuler</button>
              <button onClick={handleJoin} disabled={joining} className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white flex items-center justify-center" style={{ background: 'linear-gradient(90deg,#10B981,#059669)' }}>
                {joining ? <Spinner size="sm" /> : 'Rejoindre'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal détail match */}
      {selectedMatch && (() => {
        const partA = participants.find(p => p.id === selectedMatch.participant_a_id);
        const partB = participants.find(p => p.id === selectedMatch.participant_b_id);
        const isLive = selectedMatch.status === 'live';
        const canForfeit = isOrganizer && (selectedMatch.status === 'ready' || selectedMatch.status === 'live')
          && !!selectedMatch.participant_a_id && !!selectedMatch.participant_b_id;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60" onClick={() => setSelectedMatch(null)}>
            <div className="w-full max-w-sm rounded-2xl p-5 flex flex-col gap-3" style={{ background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
              <p className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>{ROUND_LABELS[selectedMatch.round]}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {isLive ? 'Match en direct' : selectedMatch.status === 'completed' ? 'Match terminé' : 'Match prêt à démarrer'}
              </p>

              <div className="flex items-center gap-3 py-2">
                <MatchDetailSide name={partA?.display_name ?? 'En attente'} avatar={partA?.avatar_url} isWinner={selectedMatch.winner_participant_id === selectedMatch.participant_a_id} />
                <span className="text-sm font-bold" style={{ color: 'var(--text-tertiary)' }}>VS</span>
                <MatchDetailSide name={partB?.display_name ?? 'En attente'} avatar={partB?.avatar_url} isWinner={selectedMatch.winner_participant_id === selectedMatch.participant_b_id} />
              </div>

              {canForfeit && (
                <div className="rounded-xl p-3 mt-1" style={{ background: 'var(--bg-secondary)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Adversaire absent ? Déclare un vainqueur par forfait :</p>
                  <div className="flex gap-2">
                    <button disabled={decidingForfeit} onClick={() => handleForfeit(selectedMatch.participant_a_id!)}
                      className="flex-1 rounded-lg border py-2 text-xs font-bold truncate" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                      {partA?.display_name ?? 'Joueur A'} gagne
                    </button>
                    <button disabled={decidingForfeit} onClick={() => handleForfeit(selectedMatch.participant_b_id!)}
                      className="flex-1 rounded-lg border py-2 text-xs font-bold truncate" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                      {partB?.display_name ?? 'Joueur B'} gagne
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2.5 mt-1">
                <button onClick={() => setSelectedMatch(null)} className="flex-1 rounded-xl py-2.5 text-sm font-bold" style={{ color: 'var(--text-tertiary)' }}>Fermer</button>
                {isLive && selectedMatch.battle_id && (
                  <button onClick={() => { const battleId = selectedMatch.battle_id!; setSelectedMatch(null); navigate(`/battles/${encodeId(battleId)}`); }}
                    className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white" style={{ background: 'linear-gradient(90deg,#9B65F5,#7B3FF2)' }}>
                    Regarder le direct
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <MatchResultModal result={matchResult} onClose={() => setMatchResult(null)} />
    </div>
  );
}
