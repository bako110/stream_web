import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Upload, X, Zap, Image as ImageIcon, Video, Globe,
  Play, BarChart2, CheckCircle, Loader2, Megaphone,
} from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';
import { useAuthStore } from '../../store/authStore';
import type { Ad, AdFormat, AdPlacement } from './WalletAdsPage';

const EUR_TO_COINS = 100;

const PLACEMENT_OPTIONS: { value: AdPlacement; label: string; desc: string }[] = [
  { value: 'feed',    label: 'Feed',      desc: '1 pub / 7 cartes' },
  { value: 'reels',   label: 'Reels',     desc: 'Entre les reels'   },
  { value: 'stories', label: 'Stories',   desc: 'Entre les stories' },
  { value: 'search',  label: 'Recherche', desc: 'Dans les résultats' },
];

const FORMAT_OPTIONS: { value: AdFormat; label: string; icon: React.ReactNode }[] = [
  { value: 'native', label: 'Natif',  icon: <Globe size={14}/>   },
  { value: 'image',  label: 'Image',  icon: <ImageIcon size={14}/> },
  { value: 'video',  label: 'Vidéo',  icon: <Video size={14}/>   },
];

const CPM_OPTIONS = [
  { label: 'Économique', cpm: 1,  coins: 100,  color: '#22C55E' },
  { label: 'Standard',   cpm: 2,  coins: 200,  color: '#3B82F6' },
  { label: 'Premium',    cpm: 5,  coins: 500,  color: '#F59E0B' },
  { label: 'Top',        cpm: 10, coins: 1000, color: '#EF4444' },
];

export default function WalletCreateAdPage() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { user }    = useAuthStore();
  const editAd: Ad | null = (location.state as any)?.ad ?? null;
  const isEdit      = !!editAd;

  // Form state
  const [title,          setTitle]          = useState(editAd?.title          ?? '');
  const [description,    setDescription]    = useState(editAd?.description    ?? '');
  const [ctaText,        setCtaText]        = useState(editAd?.cta_text       ?? 'En savoir plus');
  const [ctaUrl,         setCtaUrl]         = useState(editAd?.cta_url        ?? '');
  const [creativeUrl,    setCreativeUrl]    = useState(editAd?.creative_url   ?? '');
  const [thumbnailUrl,   setThumbnailUrl]   = useState(editAd?.thumbnail_url  ?? '');
  const [format,         setFormat]         = useState<AdFormat>(editAd?.format     ?? 'native');
  const [placement,      setPlacement]      = useState<AdPlacement>(editAd?.placement  ?? 'feed');
  const [cpmEur,         setCpmEur]         = useState(editAd?.cpm_eur        ?? 2);
  const [budgetEur,      setBudgetEur]      = useState(editAd ? String(editAd.budget_eur) : '');
  const [dailyBudgetEur, setDailyBudgetEur] = useState(editAd?.daily_budget_eur ? String(editAd.daily_budget_eur) : '');

  // Upload state
  const [uploading,     setUploading]     = useState(false);
  const [uploadProgress,setUploadProgress]= useState('');
  const imgRef  = useRef<HTMLInputElement>(null);
  const vidRef  = useRef<HTMLInputElement>(null);

  // Submit state
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Wallet balance
  const [walletCoins, setWalletCoins] = useState<number | null>(null);
  useEffect(() => {
    apiClient.get<any>(Endpoints.wallet.balance)
      .then(r => setWalletCoins(r.data?.coins_balance ?? null))
      .catch(() => {});
  }, []);

  // Estimations
  const budgetNum   = parseFloat(budgetEur) || 0;
  const coinsNeeded = Math.round(budgetNum * EUR_TO_COINS);
  const estImpressions = cpmEur > 0 ? Math.round((budgetNum / cpmEur) * 1000) : 0;
  const insufficient = !isEdit && walletCoins !== null && coinsNeeded > walletCoins;

  // Upload image
  async function handleImageUpload(file: File) {
    setUploading(true); setUploadProgress('Upload image…');
    try {
      const fd = new FormData(); fd.append('file', file);
      const r  = await apiClient.upload<any>(Endpoints.upload.images('ads'), fd);
      const url = r.data?.url ?? r.data?.file_url ?? r.data;
      setCreativeUrl(typeof url === 'string' ? url : '');
      setThumbnailUrl(typeof url === 'string' ? url : '');
      setFormat('image');
    } catch { setError('Erreur upload image'); }
    setUploading(false); setUploadProgress('');
  }

  // Upload vidéo avec polling
  async function handleVideoUpload(file: File) {
    setUploading(true); setUploadProgress('Upload vidéo…');
    try {
      const fd = new FormData(); fd.append('file', file);
      const r  = await apiClient.upload<any>(Endpoints.upload.video('ads'), fd);
      const jobId = r.data?.job_id;
      if (jobId) {
        setUploadProgress('Conversion en cours…');
        await pollVideoJob(jobId);
      } else {
        const url = r.data?.hls_url ?? r.data?.url ?? '';
        setCreativeUrl(url);
        setThumbnailUrl(r.data?.thumbnail_url ?? url);
        setFormat('video');
      }
    } catch { setError('Erreur upload vidéo'); }
    setUploading(false); setUploadProgress('');
  }

  async function pollVideoJob(jobId: string) {
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const r = await apiClient.get<any>(Endpoints.upload.videoJobStatus(jobId));
        if (r.data?.status === 'done' || r.data?.status === 'completed') {
          setCreativeUrl(r.data.hls_url ?? r.data.url ?? '');
          setThumbnailUrl(r.data.thumbnail_url ?? '');
          setFormat('video');
          return;
        }
        if (r.data?.status === 'failed') { setError('Conversion vidéo échouée'); return; }
      } catch { break; }
    }
    setError('Timeout conversion vidéo');
  }

  async function handleSubmit() {
    if (!title.trim())  { setError('Le titre est requis'); return; }
    if (!budgetEur || budgetNum <= 0) { setError('Le budget doit être supérieur à 0'); return; }
    if (ctaUrl && !ctaUrl.startsWith('http')) { setError("L'URL doit commencer par http(s)://"); return; }
    if (insufficient)   { setError('Solde insuffisant'); return; }
    setLoading(true); setError(null);

    const payload = {
      title:           title.trim(),
      description:     description.trim() || undefined,
      cta_text:        ctaText.trim()     || undefined,
      cta_url:         ctaUrl.trim()      || undefined,
      creative_url:    creativeUrl        || undefined,
      thumbnail_url:   thumbnailUrl       || undefined,
      format,
      placement,
      budget_eur:      budgetNum,
      cpm_eur:         cpmEur,
      daily_budget_eur:dailyBudgetEur ? parseFloat(dailyBudgetEur) : undefined,
    };

    try {
      if (isEdit) {
        await apiClient.patch(Endpoints.ads.update(editAd!.id), payload);
      } else {
        await apiClient.post(Endpoints.ads.create, payload);
      }
      navigate('/wallet/ads');
    } catch (e: any) {
      setError(e?.message ?? e?.data?.detail ?? 'Erreur lors de la soumission');
    }
    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/wallet/ads')}
          className="p-2 rounded-xl transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
            {isEdit ? 'Modifier la campagne' : 'Créer une publicité'}
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {isEdit ? editAd!.title : 'Touchez plus d\'utilisateurs avec GoFolyX Ads'}
          </p>
        </div>
      </div>

      {/* Aperçu budget */}
      <div className="rounded-2xl p-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)', boxShadow: '0 8px 24px rgba(123,63,242,0.3)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12), transparent 55%)' }} />
        <p className="text-xs text-white/70 font-bold uppercase tracking-wider mb-3">Aperçu de la campagne</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Impressions est.',  value: estImpressions > 0 ? estImpressions.toLocaleString('fr-FR') : '—' },
            { label: 'Coût total',        value: coinsNeeded > 0 ? `${coinsNeeded.toLocaleString('fr-FR')} coins` : '—' },
            { label: 'CPM',               value: `${cpmEur * EUR_TO_COINS} coins` },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center"
              style={{ background: 'rgba(255,255,255,0.1)' }}>
              <p className="text-white font-black text-sm">{s.value}</p>
              <p className="text-white/60 text-[10px] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        {walletCoins !== null && !isEdit && (
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-white/70">Votre solde</span>
            <span className={`font-bold ${insufficient ? 'text-red-300' : 'text-white'}`}>
              {walletCoins.toLocaleString('fr-FR')} coins {insufficient ? '⚠ insuffisant' : '✓'}
            </span>
          </div>
        )}
      </div>

      {/* Titre */}
      <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Titre *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={100}
          placeholder="Titre accrocheur de votre pub…"
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
          onBlur={e  => (e.target.style.borderColor = 'var(--border)')} />
        <p className="text-[10px] text-right" style={{ color: 'var(--text-tertiary)' }}>{title.length}/100</p>
      </div>

      {/* Description */}
      <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={200} rows={3}
          placeholder="Décrivez votre offre en quelques mots…"
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
          onBlur={e  => (e.target.style.borderColor = 'var(--border)')} />
        <p className="text-[10px] text-right" style={{ color: 'var(--text-tertiary)' }}>{description.length}/200</p>
      </div>

      {/* Créatif */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          Image / Vidéo
        </label>
        {creativeUrl ? (
          <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16/9', background: 'var(--bg-secondary)' }}>
            {format === 'video' ? (
              <video src={creativeUrl} className="w-full h-full object-cover" muted playsInline />
            ) : (
              <img src={thumbnailUrl || creativeUrl} alt="" className="w-full h-full object-cover" />
            )}
            <div className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ background: 'rgba(0,0,0,0.6)' }}>
              {format === 'video' ? <><Video size={10} className="inline mr-1"/>Vidéo</> : <><ImageIcon size={10} className="inline mr-1"/>Image</>}
            </div>
            <button onClick={() => { setCreativeUrl(''); setThumbnailUrl(''); }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.6)', color: 'white' }}>
              <X size={12} />
            </button>
          </div>
        ) : uploading ? (
          <div className="rounded-xl flex flex-col items-center justify-center gap-2 py-8"
            style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border)' }}>
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--primary)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{uploadProgress}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => imgRef.current?.click()}
              className="flex flex-col items-center gap-2 py-5 rounded-xl transition-all"
              style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <Upload size={20} style={{ color: 'var(--primary)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Image</span>
              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>JPG, PNG</span>
            </button>
            <button onClick={() => vidRef.current?.click()}
              className="flex flex-col items-center gap-2 py-5 rounded-xl transition-all"
              style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <Play size={20} style={{ color: 'var(--primary)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Vidéo</span>
              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>MP4 (converti HLS)</span>
            </button>
          </div>
        )}
        <input ref={imgRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }} />
        <input ref={vidRef} type="file" accept="video/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); e.target.value = ''; }} />
      </div>

      {/* CTA */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          Bouton d'action (CTA)
        </label>
        <input value={ctaText} onChange={e => setCtaText(e.target.value)} maxLength={30}
          placeholder="En savoir plus"
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
          onBlur={e  => (e.target.style.borderColor = 'var(--border)')} />
        <input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)}
          placeholder="https://votre-site.com"
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
          onBlur={e  => (e.target.style.borderColor = 'var(--border)')} />
      </div>

      {/* Emplacement */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Emplacement</label>
        <div className="grid grid-cols-2 gap-2">
          {PLACEMENT_OPTIONS.map(p => (
            <button key={p.value} onClick={() => setPlacement(p.value)}
              className="flex flex-col items-start p-3 rounded-xl transition-all text-left"
              style={{
                border: `1.5px solid ${placement === p.value ? 'var(--primary)' : 'var(--border)'}`,
                background: placement === p.value ? 'rgba(123,63,242,0.08)' : 'var(--bg-secondary)',
              }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                {placement === p.value && <CheckCircle size={12} style={{ color: 'var(--primary)' }} />}
                <span className="text-sm font-bold" style={{ color: placement === p.value ? 'var(--primary)' : 'var(--text-primary)' }}>
                  {p.label}
                </span>
              </div>
              <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Format */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Format</label>
        <div className="flex gap-2">
          {FORMAT_OPTIONS.map(f => (
            <button key={f.value} onClick={() => setFormat(f.value)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all text-sm font-semibold"
              style={{
                border: `1.5px solid ${format === f.value ? 'var(--primary)' : 'var(--border)'}`,
                background: format === f.value ? 'rgba(123,63,242,0.08)' : 'var(--bg-secondary)',
                color: format === f.value ? 'var(--primary)' : 'var(--text-secondary)',
              }}>
              {f.icon} {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* CPM */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          CPM (coût pour 1000 impressions)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CPM_OPTIONS.map(o => (
            <button key={o.cpm} onClick={() => setCpmEur(o.cpm)}
              className="flex flex-col items-center p-3 rounded-xl transition-all"
              style={{
                border: `1.5px solid ${cpmEur === o.cpm ? o.color : 'var(--border)'}`,
                background: cpmEur === o.cpm ? `${o.color}12` : 'var(--bg-secondary)',
              }}>
              <span className="text-[10px] font-bold mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{o.label}</span>
              <span className="text-base font-black" style={{ color: o.color }}>{o.coins}</span>
              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>coins</span>
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Budget total *</label>
        <div className="relative">
          <input value={budgetEur} onChange={e => setBudgetEur(e.target.value)} type="number" min="1" step="0.5"
            placeholder="ex: 10"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none pr-16"
            style={{ background: 'var(--bg-secondary)', border: `1.5px solid ${insufficient ? '#EF4444' : 'var(--border)'}`, color: 'var(--text-primary)' }}
            onFocus={e => (e.target.style.borderColor = insufficient ? '#EF4444' : 'var(--primary)')}
            onBlur={e  => (e.target.style.borderColor = insufficient ? '#EF4444' : 'var(--border)')} />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold"
            style={{ color: 'var(--text-tertiary)' }}>EUR</span>
        </div>
        {budgetNum > 0 && (
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            = <span className="font-bold" style={{ color: 'var(--primary)' }}>{coinsNeeded.toLocaleString('fr-FR')} coins</span>
            {' '}· ~<span className="font-bold">{estImpressions.toLocaleString('fr-FR')}</span> impressions estimées
          </p>
        )}
        {insufficient && (
          <p className="text-xs font-semibold" style={{ color: '#EF4444' }}>
            Solde insuffisant — il vous manque {(coinsNeeded - (walletCoins ?? 0)).toLocaleString('fr-FR')} coins
          </p>
        )}

        {/* Budget quotidien */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
            Budget quotidien (optionnel)
          </label>
          <div className="relative">
            <input value={dailyBudgetEur} onChange={e => setDailyBudgetEur(e.target.value)} type="number" min="0.5" step="0.5"
              placeholder="Sans limite"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none pr-16"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--border)')} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold"
              style={{ color: 'var(--text-tertiary)' }}>EUR/j</span>
          </div>
        </div>
      </div>

      {/* Note création */}
      {!isEdit && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <Zap size={14} style={{ color: '#22C55E', shrink: 0 }} />
          <p className="text-xs" style={{ color: '#22C55E' }}>
            La pub est diffusée immédiatement après validation. Les coins sont débités à la création.
          </p>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>
        </div>
      )}

      {/* Bouton submit */}
      <button onClick={handleSubmit} disabled={loading || uploading || insufficient}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-white transition-all disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,#7B3FF2,#E0389A)', boxShadow: '0 6px 20px rgba(123,63,242,0.35)' }}>
        {loading ? <><Spinner size="sm" /> Traitement…</> : isEdit
          ? <><CheckCircle size={16} /> Enregistrer les modifications</>
          : <><Megaphone size={16} /> Lancer la campagne · {coinsNeeded > 0 ? `${coinsNeeded.toLocaleString('fr-FR')} coins` : '…'}</>
        }
      </button>
    </div>
  );
}
