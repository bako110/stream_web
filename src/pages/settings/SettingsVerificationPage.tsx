import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, Check, CheckCircle, X, ArrowLeft, ArrowRight,
  TrendingUp, Star, User, RefreshCw, Send, Info, Music,
  Briefcase, Edit2, Play, Zap, RotateCcw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { Spinner } from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

type VerifStatus = 'none' | 'pending' | 'approved' | 'rejected';
type AccountType = 'artist' | 'creator' | 'public_figure' | 'brand' | 'journalist' | 'other';

const BLUE = '#1D9BF0';
const VERIFICATION_FEE = 500;

const ACCOUNT_TYPES: { key: AccountType; icon: React.ReactNode; label: string; sub: string }[] = [
  { key: 'artist',        icon: <Music size={18} />,    label: 'Artiste',              sub: 'Musicien, chanteur, groupe' },
  { key: 'creator',       icon: <Play size={18} />,     label: 'Créateur de contenu',  sub: 'YouTubeur, streamer, influenceur' },
  { key: 'public_figure', icon: <Star size={18} />,     label: 'Personnalité publique', sub: 'Athlète, acteur, personnalité TV' },
  { key: 'brand',         icon: <Briefcase size={18} />,label: 'Marque / Entreprise',  sub: 'Organisation ou société officielle' },
  { key: 'journalist',    icon: <Edit2 size={18} />,    label: 'Journaliste / Média',  sub: "Presse, radio, chaîne d'info" },
  { key: 'other',         icon: <User size={18} />,     label: 'Autre',                sub: 'Autre catégorie notable' },
];

function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={BLUE}>
      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

export default function SettingsVerificationPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [status,      setStatus]      = useState<VerifStatus>((user?.verification_status as VerifStatus) ?? 'none');
  const [fetching,    setFetching]    = useState(true);
  const [step,        setStep]        = useState(0);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [fullName,    setFullName]    = useState(user?.display_name ?? '');
  const [bio,         setBio]         = useState('');
  const [links,       setLinks]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [verifNote,   setVerifNote]   = useState<string | null>((user as any)?.verification_note ?? null);
  const [myCoins,     setMyCoins]     = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const [verifRes, walletRes] = await Promise.all([
        apiClient.get<{ status: VerifStatus; is_verified: boolean; verification_note?: string }>(Endpoints.users.verificationStatus),
        apiClient.get<{ coins_balance: number }>(Endpoints.wallet.balance),
      ]);
      setStatus(verifRes.data.status);
      setMyCoins(walletRes.data?.coins_balance ?? 0);
      if (verifRes.data.verification_note) setVerifNote(verifRes.data.verification_note);
    } catch {}
    finally { setFetching(false); }
  }, []);

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchStatus]);

  async function handleSubmit() {
    if (myCoins !== null && myCoins < VERIFICATION_FEE) {
      toast.error(`Solde insuffisant. Il te manque ${VERIFICATION_FEE - myCoins} coins.`);
      navigate('/wallet/buy');
      return;
    }
    setLoading(true);
    try {
      const note = [
        `Type: ${accountType}`,
        `Nom: ${fullName.trim()}`,
        `Bio: ${bio.trim()}`,
        links.trim() ? `Liens: ${links.trim()}` : '',
      ].filter(Boolean).join('\n');
      await apiClient.post(Endpoints.users.verifyRequest, { note });
      setMyCoins(prev => prev !== null ? prev - VERIFICATION_FEE : null);
      setStatus('pending');
      setStep(0);
    } catch (e: any) {
      const detail = e?.response?.data?.detail ?? '';
      if (e?.response?.status === 402 || detail.toLowerCase().includes('insuffisant')) {
        const walletRes = await apiClient.get<{ coins_balance: number }>(Endpoints.wallet.balance).catch(() => null);
        const realBalance = walletRes?.data?.coins_balance ?? 0;
        setMyCoins(realBalance);
        toast.error(`Solde insuffisant (${realBalance} coins). Il te manque ${VERIFICATION_FEE - realBalance} coins.`);
        navigate('/wallet/buy');
      } else {
        toast.error(detail || "Impossible d'envoyer la demande.");
      }
    } finally { setLoading(false); }
  }

  const showWizard = (status === 'none' || status === 'rejected') && step > 0;
  const STEPS = ['Type', 'Infos', 'Envoi'];
  const canAfford = myCoins === null || myCoins >= VERIFICATION_FEE;
  const soldeApres = myCoins !== null ? myCoins - VERIFICATION_FEE : null;

  const renderStatus = () => {
    const CFG = {
      pending:  { icon: <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(123,63,242,0.15)' }}><Spinner /></div>, color: '#7B3FF2', title: "En cours d'examen", sub: 'Notre équipe examine votre dossier. Cela peut prendre quelques jours.' },
      approved: { icon: <CheckCircle size={48} color={BLUE} />, color: BLUE, title: 'Compte vérifié', sub: 'Votre compte est certifié GoFolyX.' },
    } as Record<string, any>;
    const cfg = CFG[status];
    return (
      <div className="space-y-4">
        <div className="rounded-2xl p-6 flex flex-col items-center gap-3 text-center"
          style={{ background: `${cfg.color}10`, border: `1px solid ${cfg.color}40` }}>
          {cfg.icon}
          <p className="font-black text-xl" style={{ color: cfg.color }}>{cfg.title}</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{cfg.sub}</p>
          {status === 'approved' && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mt-1"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
                {user?.display_name ?? user?.username}
              </span>
              <VerifiedBadge size={16} />
            </div>
          )}
        </div>
        {status === 'approved' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {[
              { icon: <Shield size={15} />,     text: 'Badge bleu sur votre profil et vos contenus' },
              { icon: <TrendingUp size={15} />,  text: 'Priorité dans les recherches et suggestions' },
              { icon: <Star size={15} />,        text: 'Accès anticipé aux nouvelles fonctionnalités' },
              { icon: <User size={15} />,        text: 'Confiance renforcée de votre communauté' },
            ].map((it, i, arr) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${BLUE}18`, color: BLUE }}>{it.icon}</div>
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{it.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderStep0 = () => (
    <div className="space-y-4">
      <div className="rounded-2xl p-5 flex flex-col items-center gap-3 text-center"
        style={{ background: `${BLUE}10`, border: `1px solid ${BLUE}30` }}>
        <div className="relative">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `${BLUE}20` }}>
            <Shield size={32} color={BLUE} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: BLUE, border: '2px solid var(--bg)' }}>
            <Check size={10} color="#fff" />
          </div>
        </div>
        <p className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>Badge vérifié GoFolyX</p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Le badge bleu confirme que ce compte est le vrai compte d'une personnalité, créateur ou marque notable.
        </p>
      </div>

      {status === 'rejected' && (
        <div className="rounded-xl p-3.5 flex items-start gap-2.5"
          style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <X size={15} color="#EF4444" className="shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold" style={{ color: '#EF4444' }}>Demande refusée</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {verifNote ?? "Votre demande n'a pas été approuvée."}
            </p>
            <p className="text-xs mt-1" style={{ color: '#22C55E' }}>
              Tes {VERIFICATION_FEE} coins ont été remboursés dans ton wallet.
            </p>
          </div>
        </div>
      )}

      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-tertiary)' }}>Qui peut être vérifié ?</p>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {[
            'Artiste ou musicien avec audience active',
            'Créateur de contenu avec présence notable',
            'Personnalité publique, athlète ou acteur',
            'Marque ou organisation officielle',
            'Journaliste ou média reconnu',
          ].map((text, i, arr) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(34,197,94,0.15)' }}>
                <Check size={11} color="#22C55E" />
              </div>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-tertiary)' }}>Ce que ça vous apporte</p>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {[
            { icon: <Shield size={15} />,     text: 'Badge bleu visible sur votre profil et contenus' },
            { icon: <TrendingUp size={15} />,  text: 'Meilleure visibilité dans les recherches' },
            { icon: <Star size={15} />,        text: 'Accès prioritaire aux nouvelles fonctionnalités' },
            { icon: <User size={15} />,        text: 'Confiance accrue de votre communauté' },
          ].map((it, i, arr) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${BLUE}18`, color: BLUE }}>{it.icon}</div>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{it.text}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => setStep(1)}
        className="w-full py-3.5 rounded-2xl font-black text-white flex items-center justify-center gap-2"
        style={{ background: BLUE }}>
        {status === 'rejected' ? <><RefreshCw size={15} /> Nouvelle demande</> : <>Faire une demande <ArrowRight size={16} /></>}
      </button>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <p className="font-black text-base" style={{ color: 'var(--text-primary)' }}>Quel type de compte ?</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Choisissez la catégorie qui correspond le mieux à votre activité.</p>
      </div>
      <div className="space-y-2">
        {ACCOUNT_TYPES.map(t => (
          <button key={t.key} onClick={() => setAccountType(t.key)}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all"
            style={{ background: 'var(--surface)', border: `${accountType === t.key ? '2px' : '1px'} solid ${accountType === t.key ? BLUE : 'var(--border)'}` }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: accountType === t.key ? `${BLUE}20` : 'var(--bg-secondary)', color: accountType === t.key ? BLUE : 'var(--text-secondary)' }}>
              {t.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{t.label}</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t.sub}</p>
            </div>
            {accountType === t.key && <CheckCircle size={18} color={BLUE} />}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={() => setStep(0)} className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={15} /> Retour
        </button>
        <button onClick={() => accountType && setStep(2)} disabled={!accountType}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-white disabled:opacity-40"
          style={{ background: BLUE }}>
          Continuer <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <p className="font-black text-base" style={{ color: 'var(--text-primary)' }}>Vos informations</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Ces informations aident notre équipe à vérifier votre identité et votre notoriété.</p>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>Nom complet ou nom de scène *</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)}
            placeholder="Ex : DJ Krys, Sah Douss…"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{ background: 'var(--bg-secondary)', border: `1.5px solid ${fullName.trim().length >= 2 ? BLUE : 'var(--border)'}`, color: 'var(--text-primary)' }} />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>Pourquoi méritez-vous le badge ? *</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4}
            placeholder="Ex : Artiste avec 50 000 écoutes sur Spotify, présence sur 3 plateformes…"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none transition-all"
            style={{ background: 'var(--bg-secondary)', border: `1.5px solid ${bio.trim().length >= 20 ? BLUE : 'var(--border)'}`, color: 'var(--text-primary)' }} />
          <p className="text-[11px] text-right mt-1" style={{ color: bio.trim().length >= 20 ? '#22C55E' : 'var(--text-tertiary)' }}>
            {bio.trim().length} / 20 min
          </p>
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wide mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>Liens (optionnel)</label>
          <input value={links} onChange={e => setLinks(e.target.value)}
            placeholder="Instagram, Spotify, site web…"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>Séparez les liens par une virgule</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setStep(1)} className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={15} /> Retour
        </button>
        <button onClick={() => fullName.trim().length >= 2 && bio.trim().length >= 20 && setStep(3)}
          disabled={fullName.trim().length < 2 || bio.trim().length < 20}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-white disabled:opacity-40"
          style={{ background: BLUE }}>
          Continuer <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => {
    const typeInfo = ACCOUNT_TYPES.find(t => t.key === accountType)!;
    const rows = [
      { label: 'Type de compte', value: typeInfo.label },
      { label: 'Nom', value: fullName.trim() },
      { label: 'Justification', value: bio.trim() },
      ...(links.trim() ? [{ label: 'Liens', value: links.trim() }] : []),
    ];
    return (
      <div className="space-y-4">
        <div>
          <p className="font-black text-base" style={{ color: 'var(--text-primary)' }}>Vérifiez votre demande</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Relisez votre dossier avant de l'envoyer. Notre équipe répond sous 3 à 7 jours.</p>
        </div>

        {/* Récap */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {rows.map((row, i) => (
            <div key={i} className="flex items-start justify-between gap-4 px-4 py-3"
              style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span className="text-sm shrink-0" style={{ color: 'var(--text-tertiary)' }}>{row.label}</span>
              <span className="text-sm font-semibold text-right" style={{ color: 'var(--text-primary)' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Bloc paiement */}
        <div className="rounded-2xl p-4 space-y-2"
          style={{ background: canAfford ? `${BLUE}12` : 'rgba(239,68,68,0.07)', border: `1px solid ${canAfford ? BLUE + '40' : 'rgba(239,68,68,0.25)'}` }}>
          <div className="flex items-center gap-2">
            <Zap size={16} color={canAfford ? BLUE : '#EF4444'} />
            <p className="text-sm font-black" style={{ color: canAfford ? BLUE : '#EF4444' }}>
              Frais de dossier : {VERIFICATION_FEE} coins
            </p>
          </div>
          {myCoins !== null && (
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Ton solde : {myCoins.toLocaleString('fr-FR')} coins
              {canAfford && soldeApres !== null ? ` → ${soldeApres.toLocaleString('fr-FR')} coins après` : ''}
            </p>
          )}
          <div className="flex items-start gap-1.5">
            <RotateCcw size={12} color="#22C55E" className="shrink-0 mt-0.5" />
            <p className="text-xs" style={{ color: '#22C55E' }}>
              Ces coins sont remboursés automatiquement si ta demande est refusée.
            </p>
          </div>
          {!canAfford && (
            <button onClick={() => navigate('/wallet/buy')}
              className="w-full mt-2 py-2.5 rounded-xl font-bold text-white text-sm"
              style={{ background: '#EF4444' }}>
              Acheter des coins — il te manque {VERIFICATION_FEE - (myCoins ?? 0)} coins
            </button>
          )}
        </div>

        <div className="rounded-xl p-3.5 flex items-start gap-2.5"
          style={{ background: 'rgba(123,63,242,0.08)', border: '1px solid rgba(123,63,242,0.25)' }}>
          <Info size={14} color="#7B3FF2" className="shrink-0 mt-0.5" />
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Fournir de fausses informations entraîne le rejet définitif de votre demande.
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setStep(2)} className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <ArrowLeft size={15} /> Modifier
          </button>
          <button onClick={handleSubmit} disabled={loading || !canAfford}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-white disabled:opacity-60"
            style={{ background: canAfford ? BLUE : 'var(--border)' }}>
            {loading ? <Spinner size="sm" /> : <><Send size={14} /> Envoyer — {VERIFICATION_FEE} coins</>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/settings')}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <ArrowLeft size={16} style={{ color: 'var(--text-primary)' }} />
        </button>
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Vérification GoFolyX</h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Badge bleu de compte certifié</p>
        </div>
      </div>

      {fetching ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <>
          {showWizard && (
            <div className="flex items-center gap-2 rounded-2xl px-4 py-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {STEPS.map((label, i) => (
                <div key={label} className={`flex items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                      style={{ background: step > i + 1 || step === i + 1 ? BLUE : 'var(--border)', color: '#fff' }}>
                      {step > i + 1 ? <Check size={11} /> : i + 1}
                    </div>
                    <span className="text-[9px] font-semibold"
                      style={{ color: step === i + 1 ? BLUE : 'var(--text-tertiary)' }}>{label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 h-0.5 mx-2 mb-3"
                      style={{ background: step > i + 1 ? BLUE : 'var(--border)' }} />
                  )}
                </div>
              ))}
            </div>
          )}

          {status === 'pending' || status === 'approved'
            ? renderStatus()
            : step === 0 ? renderStep0()
            : step === 1 ? renderStep1()
            : step === 2 ? renderStep2()
            : renderStep3()
          }
        </>
      )}
    </div>
  );
}
