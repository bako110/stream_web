import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, User, Gift, X } from 'lucide-react';
import { PageLoader, Spinner } from '../components/ui/Spinner';
import { decodeId } from '../utils/slugId';
import { tournamentsApi, type TournamentFinanceReport, type TournamentFinanceParticipant, type TournamentRound } from '../api/tournaments';

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

export default function TournamentFinancePage() {
  const { id: slug } = useParams<{ id: string }>();
  const tournamentId = decodeId(slug!);
  const navigate = useNavigate();

  const [report, setReport] = useState<TournamentFinanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rewardTarget, setRewardTarget] = useState<TournamentFinanceParticipant | null>(null);
  const [rewardAmount, setRewardAmount] = useState('');
  const [rewarding, setRewarding] = useState(false);
  const [rewardMsg, setRewardMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await tournamentsApi.getFinanceReport(tournamentId);
      setReport(data);
    } catch (e: any) {
      setLoadError(e?.message ?? 'Impossible de charger le rapport financier.');
    } finally { setLoading(false); }
  }, [tournamentId]);

  useEffect(() => { load(); }, [load]);

  async function handleReward() {
    const amount = parseInt(rewardAmount, 10);
    if (!rewardTarget || !amount || amount <= 0) return;
    setRewarding(true);
    try {
      await tournamentsApi.rewardParticipant(tournamentId, rewardTarget.user_id, amount);
      setRewardMsg(`${amount.toLocaleString('fr-FR')} GoGold envoyés à ${rewardTarget.display_name ?? 'ce participant'}.`);
      setRewardTarget(null);
      setRewardAmount('');
    } catch { /* silencieux */ } finally { setRewarding(false); }
  }

  if (loading) return <PageLoader />;

  if (loadError || !report) {
    return (
      <div>
        <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <button onClick={() => navigate(-1)} className="text-[var(--text-secondary)]"><ChevronLeft size={22} /></button>
          <h1 className="text-base font-bold flex-1 text-center" style={{ color: 'var(--text-primary)' }}>Finances du tournoi</h1>
          <div style={{ width: 22 }} />
        </div>
        <p className="text-sm text-center pt-16 px-8" style={{ color: 'var(--text-tertiary)' }}>
          {loadError ?? 'Rapport indisponible.'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-57px)]">
      <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <button onClick={() => navigate(-1)} className="text-[var(--text-secondary)]"><ChevronLeft size={22} /></button>
        <h1 className="text-base font-bold flex-1 truncate" style={{ color: 'var(--text-primary)' }}>Finances du tournoi</h1>
        <div style={{ width: 22 }} />
      </div>

      <div className="max-w-2xl mx-auto p-4 flex flex-col gap-5">
        {rewardMsg && (
          <div className="rounded-xl px-3.5 py-2.5 text-sm font-semibold flex items-center justify-between" style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
            {rewardMsg}
            <button onClick={() => setRewardMsg(null)}><X size={14} /></button>
          </div>
        )}

        <div className="rounded-2xl border p-5 flex flex-col items-center gap-1.5" style={{ borderColor: 'rgba(255,215,0,0.35)', background: 'linear-gradient(135deg,#FFD70025,#FFA00010)' }}>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>Total dans ton wallet</p>
          <p className="text-3xl font-black" style={{ color: '#FFD700' }}>{report.wallet_total.toLocaleString('fr-FR')} GoGold</p>
          <div className="flex items-center gap-4 mt-2">
            <div className="text-center">
              <p className="text-[11px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>Inscriptions</p>
              <p className="text-sm font-extrabold mt-0.5" style={{ color: 'var(--text-primary)' }}>{report.entry_fees_total.toLocaleString('fr-FR')}</p>
            </div>
            <div className="w-px h-7" style={{ background: 'var(--border)' }} />
            <div className="text-center">
              <p className="text-[11px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>Cadeaux des matchs</p>
              <p className="text-sm font-extrabold mt-0.5" style={{ color: 'var(--text-primary)' }}>{report.gifts_total.toLocaleString('fr-FR')}</p>
            </div>
          </div>
        </div>

        {report.by_round.length > 0 && (
          <div>
            <p className="text-sm font-extrabold mb-2" style={{ color: 'var(--text-primary)' }}>Par phase</p>
            {report.by_round.map(r => (
              <div key={r.round} className="flex items-center justify-between px-3.5 py-2.5 rounded-xl mb-1.5" style={{ background: 'var(--bg-secondary)' }}>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ROUND_LABELS[r.round] ?? r.round}</span>
                <span className="text-sm font-extrabold" style={{ color: '#FFD700' }}>{r.gogold_generated.toLocaleString('fr-FR')} GoGold</span>
              </div>
            ))}
          </div>
        )}

        <div>
          <p className="text-sm font-extrabold mb-2" style={{ color: 'var(--text-primary)' }}>Par participant — clique pour récompenser</p>
          {report.by_participant.length === 0 ? (
            <p className="text-sm text-center py-5" style={{ color: 'var(--text-tertiary)' }}>Aucun cadeau reçu pour l'instant dans ce tournoi.</p>
          ) : (
            report.by_participant.map(p => (
              <button key={p.user_id} onClick={() => setRewardTarget(p)}
                className="w-full flex items-center gap-2.5 p-3 rounded-2xl border mb-2 text-left"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                {p.avatar_url
                  ? <img src={p.avatar_url} className="w-9 h-9 rounded-full object-cover" />
                  : <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--surface)' }}><User size={14} className="text-[var(--text-tertiary)]" /></div>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{p.display_name ?? 'Participant'}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{p.gifts_count} cadeau{p.gifts_count > 1 ? 'x' : ''} reçu{p.gifts_count > 1 ? 's' : ''}</p>
                </div>
                <span className="text-sm font-extrabold" style={{ color: '#FFD700' }}>{p.gogold_generated.toLocaleString('fr-FR')}</span>
                <Gift size={16} color="#FFD700" />
              </button>
            ))
          )}
        </div>
      </div>

      {rewardTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60" onClick={() => setRewardTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl p-5 flex flex-col gap-3" style={{ background: 'var(--surface)', border: '1px solid rgba(255,215,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <p className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>Récompenser {rewardTarget.display_name ?? 'ce participant'}</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Montant en GoGold, débité de ton wallet</p>
            <input
              className="input text-base font-bold"
              placeholder="Montant"
              inputMode="numeric"
              value={rewardAmount}
              onChange={e => setRewardAmount(e.target.value.replace(/[^0-9]/g, ''))}
              autoFocus
            />
            <div className="flex justify-end gap-2.5 mt-1">
              <button onClick={() => { setRewardTarget(null); setRewardAmount(''); }} className="px-4 py-3 text-sm font-bold" style={{ color: 'var(--text-tertiary)' }}>
                Annuler
              </button>
              <button onClick={handleReward} disabled={rewarding || !rewardAmount}
                className="rounded-xl px-5 py-3 text-sm font-extrabold text-white flex items-center justify-center disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#FFD700,#D97706)' }}>
                {rewarding ? <Spinner size="sm" /> : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
