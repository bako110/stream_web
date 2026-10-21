import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Upload, X, Zap, Image as ImageIcon, Video, Globe,
  Play, BarChart2, CheckCircle, Loader2, Megaphone, Search, ChevronDown } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner } from '../../components/ui/Spinner';
import { useAuthStore } from '../../store/authStore';
import { ALL_COUNTRIES } from '../../data/countries';
import type { Ad, AdFormat, AdPlacement } from './WalletAdsPage';

const EUR_TO_GOGOLD = 100;

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
  { label: 'Économique', cpm: 1,  gogold: 100,  color: '#22C55E' },
  { label: 'Standard',   cpm: 2,  gogold: 200,  color: '#7B3FF2' },
  { label: 'Premium',    cpm: 5,  gogold: 500,  color: '#7B3FF2' },
  { label: 'Top',        cpm: 10, gogold: 1000, color: '#EF4444' },
];

const GENDER_OPTIONS: { key: string; label: string }[] = [
  { key: 'male',             label: 'Hommes' },
  { key: 'female',           label: 'Femmes' },
  { key: 'other',            label: 'Autre' },
  { key: 'prefer_not_to_say',label: 'Non précisé' },
];

// Texte libre "Abidjan, Bouaké" → ["Abidjan", "Bouaké"] — pour la région/ville
// uniquement (le pays utilise CountryMultiSelect ci-dessous, liste fermée).
// Le backend tokenise lui-même pour le matching (cf. _matches_region côté
// serveur).
function parseTargetList(raw: string): string[] | undefined {
  const items = raw.split(',').map(s => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

// Sélecteur multi-pays à liste fermée (dropdown + recherche + checkboxes) —
// les codes doivent correspondre exactement à _COUNTRY_NAME_HINTS côté
// backend (app/routers/ads.py), sinon un pays sélectionné ici ne matcherait
// jamais personne (cf. ALL_COUNTRIES, même liste que login/inscription).
function CountryMultiSelect({ selected, onChange, disabled }: {
  selected: string[]; onChange: (codes: string[]) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? ALL_COUNTRIES.filter(c => c.name.toLowerCase().includes(q)) : ALL_COUNTRIES;
  }, [search]);

  const toggle = (code: string) =>
    onChange(selected.includes(code) ? selected.filter(c => c !== code) : [...selected, code]);

  const selectedCountries = ALL_COUNTRIES.filter(c => selected.includes(c.code));

  return (
    <div ref={ref} className="relative">
      <button type="button" disabled={disabled} onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', opacity: disabled ? 0.6 : 1 }}>
        <Globe size={14} style={{ color: 'var(--text-tertiary)' }} />
        <span className="flex-1 truncate">
          {selectedCountries.length > 0
            ? selectedCountries.map(c => `${c.flag} ${c.code}`).join('  ')
            : <span style={{ color: 'var(--text-tertiary)' }}>Tous les pays</span>}
        </span>
        <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full rounded-xl overflow-hidden shadow-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un pays" className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--text-primary)' }} />
          </div>
          {selected.length > 0 && (
            <button type="button" onClick={() => onChange([])}
              className="w-full text-left px-3 py-2 text-xs font-semibold" style={{ color: '#EF4444' }}>
              Effacer la sélection ({selected.length})
            </button>
          )}
          <div className="max-h-56 overflow-y-auto">
            {filtered.map(c => {
              const isSel = selected.includes(c.code);
              return (
                <button key={c.code} type="button" onClick={() => toggle(c.code)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors"
                  style={{ color: 'var(--text-primary)', background: isSel ? 'rgba(123,63,242,0.08)' : 'transparent' }}>
                  <span>{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  {isSel && <CheckCircle size={14} style={{ color: '#7B3FF2' }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

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

  // Ciblage — uniquement modifiable à la création (le backend n'accepte pas de
  // changer le ciblage d'une campagne existante via PATCH), pré-rempli en
  // lecture seule en édition pour que l'annonceur voie ce qui est actif.
  const [targetCountries, setTargetCountries] = useState<string[]>(editAd?.target_countries ?? []);
  const [targetRegions,   setTargetRegions]   = useState(editAd?.target_regions?.join(', ') ?? '');
  const [targetGenders,   setTargetGenders]   = useState<string[]>(editAd?.target_genders ?? []);
  const [targetAgeMin,    setTargetAgeMin]    = useState(editAd?.target_age_min != null ? String(editAd.target_age_min) : '');
  const [targetAgeMax,    setTargetAgeMax]    = useState(editAd?.target_age_max != null ? String(editAd.target_age_max) : '');

  // Upload state
  const [uploading,     setUploading]     = useState(false);
  const [uploadProgress,setUploadProgress]= useState('');
  const imgRef  = useRef<HTMLInputElement>(null);
  const vidRef  = useRef<HTMLInputElement>(null);

  // Submit state
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Wallet balance
  const [walletGoGold, setWalletGoGold] = useState<number | null>(null);
  useEffect(() => {
    apiClient.get<any>(Endpoints.wallet.balance)
      .then(r => setWalletGoGold(r.data?.gogold_balance ?? null))
      .catch(() => {});
  }, []);

  // Estimations
  const budgetNum   = parseFloat(budgetEur) || 0;
  const goGoldNeeded = Math.round(budgetNum * EUR_TO_GOGOLD);
  const estImpressions = cpmEur > 0 ? Math.round((budgetNum / cpmEur) * 1000) : 0;
  const insufficient = !isEdit && walletGoGold !== null && goGoldNeeded > walletGoGold;

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
    const ageMinNum = targetAgeMin.trim() ? parseInt(targetAgeMin, 10) : null;
    const ageMaxNum = targetAgeMax.trim() ? parseInt(targetAgeMax, 10) : null;
    if ((ageMinNum !== null && (isNaN(ageMinNum) || ageMinNum < 13 || ageMinNum > 100))
      || (ageMaxNum !== null && (isNaN(ageMaxNum) || ageMaxNum < 13 || ageMaxNum > 100))) {
      setError('Âge cible invalide (entre 13 et 100 ans)'); return;
    }
    if (ageMinNum !== null && ageMaxNum !== null && ageMinNum > ageMaxNum) {
      setError("Âge minimum supérieur à l'âge maximum"); return;
    }
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
      // Ciblage — uniquement à la création (le backend ne permet pas de modifier
      // le ciblage d'une campagne existante via PATCH, cf. AdUpdate côté serveur).
      ...(isEdit ? {} : {
        target_countries: targetCountries.length ? targetCountries : undefined,
        target_regions:   parseTargetList(targetRegions),
        target_genders:   targetGenders.length ? targetGenders : undefined,
        target_age_min:   ageMinNum ?? undefined,
        target_age_max:   ageMaxNum ?? undefined,
      }) };

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
    <div className="w-full mx-auto px-4 py-5 space-y-5">

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
            {isEdit ? editAd!.title : 'Touchez plus d\'utilisateurs avec Gofolyx Ads'}
          </p>
        </div>
      </div>

      {/* Aperçu budget */}
      <div className="rounded-2xl p-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 8px 24px rgba(123,63,242,0.3)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12), transparent 55%)' }} />
        <p className="text-xs text-white/70 font-bold uppercase tracking-wider mb-3">Aperçu de la campagne</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Impressions est.',  value: estImpressions > 0 ? estImpressions.toLocaleString('fr-FR') : '—' },
            { label: 'Coût total',        value: goGoldNeeded > 0 ? `${goGoldNeeded.toLocaleString('fr-FR')} GoGold` : '—' },
            { label: 'CPM',               value: `${cpmEur * EUR_TO_GOGOLD} GoGold` },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center"
              style={{ background: 'rgba(255,255,255,0.1)' }}>
              <p className="text-white font-black text-sm">{s.value}</p>
              <p className="text-white/60 text-[10px] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        {walletGoGold !== null && !isEdit && (
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-white/70">Votre solde</span>
            <span className={`font-bold ${insufficient ? 'text-red-300' : 'text-white'}`}>
              {walletGoGold.toLocaleString('fr-FR')} GoGold {insufficient ? '⚠ insuffisant' : '✓'}
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
                background: placement === p.value ? 'rgba(123,63,242,0.08)' : 'var(--bg-secondary)' }}>
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
                color: format === f.value ? 'var(--primary)' : 'var(--text-secondary)' }}>
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
                background: cpmEur === o.cpm ? `${o.color}12` : 'var(--bg-secondary)' }}>
              <span className="text-[10px] font-bold mb-0.5" style={{ color: 'var(--text-tertiary)' }}>{o.label}</span>
              <span className="text-base font-black" style={{ color: o.color }}>{o.gogold}</span>
              <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>GoGold</span>
            </button>
          ))}
        </div>
      </div>

      {/* Ciblage de l'audience — uniquement modifiable à la création (le backend
          ne permet pas de changer le ciblage d'une campagne existante). En
          édition, affiché en lecture seule pour que l'annonceur voie ce qui
          est actif sans pouvoir le casser accidentellement. */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          Audience ciblée {isEdit ? '(lecture seule)' : '(optionnel)'}
        </label>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Laisse vide pour toucher tout le monde. Chaque critère rempli restreint l'audience.
        </p>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>Sexe</label>
          <div className="flex flex-wrap gap-2">
            {GENDER_OPTIONS.map(g => {
              const active = targetGenders.includes(g.key);
              return (
                <button key={g.key} type="button" disabled={isEdit}
                  onClick={() => setTargetGenders(prev => prev.includes(g.key) ? prev.filter(k => k !== g.key) : [...prev, g.key])}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    border: `1.5px solid ${active ? '#7B3FF2' : 'var(--border)'}`,
                    background: active ? '#7B3FF222' : 'var(--bg-secondary)',
                    color: active ? '#7B3FF2' : 'var(--text-secondary)',
                    opacity: isEdit ? 0.6 : 1, cursor: isEdit ? 'default' : 'pointer' }}>
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-tertiary)' }}>Âge min</label>
            <input value={targetAgeMin} onChange={e => setTargetAgeMin(e.target.value)} type="number" min="13" max="100"
              disabled={isEdit} placeholder="Ex: 18"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', opacity: isEdit ? 0.6 : 1 }} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-tertiary)' }}>Âge max</label>
            <input value={targetAgeMax} onChange={e => setTargetAgeMax(e.target.value)} type="number" min="13" max="100"
              disabled={isEdit} placeholder="Ex: 45"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', opacity: isEdit ? 0.6 : 1 }} />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-tertiary)' }}>Pays</label>
          <CountryMultiSelect selected={targetCountries} onChange={setTargetCountries} disabled={isEdit} />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-tertiary)' }}>Région / ville</label>
          <input value={targetRegions} onChange={e => setTargetRegions(e.target.value)}
            disabled={isEdit} placeholder="Abidjan, Bouaké…"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', opacity: isEdit ? 0.6 : 1 }} />
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Séparés par des virgules. Comparé au lieu renseigné sur le profil de chaque utilisateur.
          </p>
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
            = <span className="font-bold" style={{ color: 'var(--primary)' }}>{goGoldNeeded.toLocaleString('fr-FR')} GoGold</span>
            {' '}· ~<span className="font-bold">{estImpressions.toLocaleString('fr-FR')}</span> impressions estimées
          </p>
        )}
        {insufficient && (
          <p className="text-xs font-semibold" style={{ color: '#EF4444' }}>
            Solde insuffisant — il vous manque {(goGoldNeeded - (walletGoGold ?? 0)).toLocaleString('fr-FR')} GoGold
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
          <Zap size={14} style={{ color: '#22C55E' }} />
          <p className="text-xs" style={{ color: '#22C55E' }}>
            La pub est diffusée immédiatement après validation. Les GoGold sont débités à la création.
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
        style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: '0 6px 20px rgba(123,63,242,0.35)' }}>
        {loading ? <><Spinner size="sm" /> Traitement…</> : isEdit
          ? <><CheckCircle size={16} /> Enregistrer les modifications</>
          : <><Megaphone size={16} /> Lancer la campagne · {goGoldNeeded > 0 ? `${goGoldNeeded.toLocaleString('fr-FR')} GoGold` : '…'}</>
        }
      </button>
    </div>
  );
}
