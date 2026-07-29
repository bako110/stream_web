import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, Radio, Film, Layers,
  Gift, Star, Tag, Eye, MapPin, Upload, X, Image as ImageIcon,
} from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner , PageLoader} from '../../components/ui/Spinner';
import { uploadVideoHls } from '../../api/uploadVideo';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

type ConcertType = 'live' | 'replay' | 'live_and_replay';
type AccessType  = 'free' | 'subscription' | 'ticket' | 'ppv';

const STEPS = ['Infos', 'Accès & Prix', 'Lieu & Date', 'Médias', 'Révision'];

const CONCERT_TYPES = [
  { type: 'live' as ConcertType,            Icon: Radio,  label: 'Live',          sub: 'En direct'   },
  { type: 'replay' as ConcertType,          Icon: Film,   label: 'Replay',        sub: 'Rediffusion' },
  { type: 'live_and_replay' as ConcertType, Icon: Layers, label: 'Live + Replay', sub: 'Les deux'    },
];

const ACCESS_TYPES = [
  { type: 'free' as AccessType,         Icon: Gift, label: 'Gratuit'      },
  { type: 'subscription' as AccessType, Icon: Star, label: 'Abonnement'   },
  { type: 'ticket' as AccessType,       Icon: Tag,  label: 'Billet'       },
  { type: 'ppv' as AccessType,          Icon: Eye,  label: 'Pay-per-view' },
];

const GENRE_PRESETS = ['Pop', 'Rock', 'Hip-Hop', 'R&B', 'Jazz', 'Classique', 'Électronique', 'Reggae', 'Afrobeats'];

const TICKET_TIERS = [
  { key: 'simple' as const, label: 'Simple', sub: 'Entrée standard',    color: '#6B7280' },
  { key: 'vip'    as const, label: 'VIP',    sub: 'Accès privilégié',   color: '#7B3FF2' },
  { key: 'vvip'   as const, label: 'VVIP',   sub: 'Expérience premium', color: '#7B3FF2' },
  { key: 'vvvip'  as const, label: 'VVVIP',  sub: 'Elite exclusif',     color: '#EF4444' },
];

// ── Upload helpers ────────────────────────────────────────────────────────────

async function uploadImage(file: File, folder: string): Promise<string> {
  const contentType = file.type || 'image/jpeg';
  const filename    = file.name || `photo_${Date.now()}.jpg`;
  const r = await apiClient.post<{ upload_url: string; public_url: string }>(
    '/api/v1/upload/presigned',
    { folder, filename, content_type: contentType },
  );
  await fetch(r.data.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  return r.data.public_url;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CreateConcertPage() {
  const navigate    = useNavigate();
  const [params]    = useSearchParams();
  const editId      = params.get('edit');
  const isEdit      = !!editId;

  const [step, setStep] = useState(0);
  const [loadingEdit, setLoadingEdit] = useState(isEdit);

  // Step 0
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [genre,       setGenre]       = useState('');
  const [concertType, setConcertType] = useState<ConcertType>('live');
  const [maxViewers,  setMaxViewers]  = useState('');
  const [durationMin, setDurationMin] = useState('');

  // Step 1
  const [accessType,  setAccessType]  = useState<AccessType>('free');
  const [priceSimple, setPriceSimple] = useState('');
  const [priceVip,    setPriceVip]    = useState('');
  const [priceVvip,   setPriceVvip]   = useState('');
  const [priceVvvip,  setPriceVvvip]  = useState('');
  const [pricePpv,    setPricePpv]    = useState('');

  // Step 2
  const [venueCity,  setVenueCity]  = useState('');
  const [venueName,  setVenueName]  = useState('');
  const [country,    setCountry]    = useState('Burkina Faso');
  const [schedDate,  setSchedDate]  = useState('');
  const [schedTime,  setSchedTime]  = useState('');
  const [locating,   setLocating]   = useState(false);

  // Step 3
  const [imageFiles,    setImageFiles]    = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoFile,     setVideoFile]     = useState<File | null>(null);
  const [videoPreview,  setVideoPreview]  = useState<string | null>(null);
  const [existingThumbnail, setExistingThumbnail] = useState<string | null>(null);

  const [publishing, setPublishing] = useState(false);

  // ── Charger les donnees existantes en mode edition ─────────────────────────
  useEffect(() => {
    if (!editId) return;
    apiClient.get<any>(Endpoints.concerts.byId(editId))
      .then(r => {
        const c = r.data?.data ?? r.data;
        setTitle(c.title ?? '');
        setDescription(c.description ?? '');
        setGenre(c.genre ?? '');
        setConcertType((c.concert_type as ConcertType) ?? 'live');
        setAccessType((c.access_type as AccessType) ?? 'free');
        setPriceSimple(c.ticket_price       != null ? String(c.ticket_price)       : '');
        setPriceVip   (c.ticket_price_vip   != null ? String(c.ticket_price_vip)   : '');
        setPriceVvip  (c.ticket_price_vvip  != null ? String(c.ticket_price_vvip)  : '');
        setPriceVvvip (c.ticket_price_vvvip != null ? String(c.ticket_price_vvvip) : '');
        setPricePpv   (c.ppv_price          != null ? String(c.ppv_price)          : '');
        setVenueCity(c.venue_city ?? '');
        setVenueName(c.venue_name ?? '');
        setCountry(c.venue_country ?? 'Burkina Faso');
        setMaxViewers(c.max_viewers != null ? String(c.max_viewers) : '');
        setDurationMin(c.duration_min != null ? String(c.duration_min) : '');
        if (c.scheduled_at) {
          const d = new Date(c.scheduled_at);
          setSchedDate(d.toISOString().slice(0, 10));
          setSchedTime(d.toISOString().slice(11, 16));
        }
        if (c.thumbnail_url) {
          setExistingThumbnail(c.thumbnail_url);
          setImagePreviews([c.thumbnail_url]);
        }
      })
      .catch(() => toast.error('Impossible de charger le concert'))
      .finally(() => setLoadingEdit(false));
  }, [editId]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // ── Step validation ────────────────────────────────────────────────────────

  const stepValid = [
    title.trim().length > 0,
    true,
    venueCity.trim().length > 0 && !!schedDate && !!schedTime,
    true,
    true,
  ];

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goNext = () => {
    if (!stepValid[step]) { toast.error('Veuillez remplir les champs requis.'); return; }
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };
  const goPrev = () => setStep(s => Math.max(s - 1, 0));

  // ── GPS ────────────────────────────────────────────────────────────────────

  const handleGps = () => {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords;
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        const data = await res.json();
        setVenueCity(data.address?.city ?? data.address?.town ?? data.address?.village ?? '');
        setCountry(data.address?.country ?? 'Burkina Faso');
      } catch {
        toast.error('Géolocalisation impossible');
      } finally {
        setLocating(false);
      }
    }, () => { toast.error('Accès à la position refusé'); setLocating(false); });
  };

  // ── Media ──────────────────────────────────────────────────────────────────

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 5 - imageFiles.length);
    const next  = [...imageFiles, ...files].slice(0, 5);
    setImageFiles(next);
    setImagePreviews(next.map(f => URL.createObjectURL(f)));
    e.target.value = '';
  };

  const removeImage = (i: number) => {
    const next = imageFiles.filter((_, idx) => idx !== i);
    setImageFiles(next);
    setImagePreviews(next.map(f => URL.createObjectURL(f)));
  };

  const handleVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  // ── Publish ────────────────────────────────────────────────────────────────

  const handlePublish = async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      let thumbnail_url: string | undefined = existingThumbnail ?? undefined;
      let banner_url: string | undefined;
      let promo_video_url: string | undefined;
      const gallery_urls: string[] = [];

      if (imageFiles.length > 0) {
        const urls = await Promise.all(imageFiles.map(f => uploadImage(f, 'concerts')));
        thumbnail_url = urls[0];
        if (urls.length > 1) banner_url = urls[1];
        gallery_urls.push(...urls);
      }
      if (videoFile) {
        const uploaded = await uploadVideoHls(videoFile, 'concerts');
        promo_video_url = uploaded.hls_url ?? uploaded.url;
      }

      const scheduled_at = schedDate && schedTime ? `${schedDate}T${schedTime}:00` : undefined;

      const payload: Record<string, unknown> = {
        title:         title.trim(),
        description:   description.trim() || undefined,
        genre:         genre.trim() || undefined,
        concert_type:  concertType,
        access_type:   accessType,
        venue_city:    venueCity.trim() || 'En ligne',
        venue_name:    venueName.trim() || undefined,
        venue_country: country.trim()   || 'International',
        scheduled_at,
        thumbnail_url,
        banner_url,
        hls_url:       promo_video_url || undefined,
        max_viewers:   maxViewers ? Number(maxViewers) : undefined,
        duration_min:  durationMin ? Number(durationMin) : undefined,
      };

      if (accessType === 'ticket') {
        if (priceSimple) payload.ticket_price       = Number(priceSimple);
        if (priceVip)    payload.ticket_price_vip   = Number(priceVip);
        if (priceVvip)   payload.ticket_price_vvip  = Number(priceVvip);
        if (priceVvvip)  payload.ticket_price_vvvip = Number(priceVvvip);
      } else if (accessType === 'ppv') {
        if (pricePpv) payload.ticket_price = Number(pricePpv);
      }

      if (isEdit && editId) {
        await apiClient.patch(Endpoints.concerts.byId(editId), payload);
        toast.success('Concert mis à jour !');
        navigate('/my-concerts');
      } else {
        const res = await apiClient.post<{ id: string }>(Endpoints.concerts.list, payload);
        const id  = res.data?.id;
        if (id) {
          await apiClient.patch(`${Endpoints.concerts.list}/${id}/publish`).catch(() => {});
        }
        toast.success('Concert créé !');
        navigate('/my-concerts');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? (isEdit ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création'));
    } finally {
      setPublishing(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm outline-none";
  const inputStyle = { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' };

  if (loadingEdit) return <PageLoader />;

  return (
    <div className="w-full mx-auto" style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => step > 0 ? goPrev() : navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <p className="font-black text-base" style={{ color: 'var(--text-primary)' }}>
            {isEdit ? 'Modifier le concert' : 'Créer un concert'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{STEPS[step]}</p>
        </div>
        <span className="text-xs font-bold" style={{ color: 'var(--text-tertiary)' }}>{step + 1}/{STEPS.length}</span>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1 px-4 py-3">
        {STEPS.map((_, i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all"
            style={{ background: i <= step ? 'var(--primary)' : 'var(--border)' }} />
        ))}
      </div>

      <div className="px-4 py-4 space-y-4 pb-32">

        {/* ── Step 0: Infos ─────────────────────────────────────────────── */}
        {step === 0 && (
          <>
            <div>
              <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Titre *
              </label>
              <input className={inputCls} style={inputStyle}
                placeholder="Nom du concert" value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Description
              </label>
              <textarea className={inputCls} style={inputStyle} rows={4}
                placeholder="Décrivez votre concert..." value={description}
                onChange={e => setDescription(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Genre musical
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {GENRE_PRESETS.map(g => (
                  <button key={g} onClick={() => setGenre(genre === g ? '' : g)}
                    className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
                    style={{
                      background: genre === g ? 'rgba(123,63,242,0.15)' : 'var(--bg)',
                      borderColor: genre === g ? 'var(--primary)' : 'var(--border)',
                      color: genre === g ? 'var(--primary)' : 'var(--text-secondary)',
                    }}>
                    {g}
                  </button>
                ))}
              </div>
              {!GENRE_PRESETS.includes(genre) && (
                <input className={inputCls} style={inputStyle}
                  placeholder="Autre genre..." value={genre} onChange={e => setGenre(e.target.value)} />
              )}
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Type de concert
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CONCERT_TYPES.map(({ type, Icon, label, sub }) => (
                  <button key={type} onClick={() => setConcertType(type)}
                    className="relative flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-all"
                    style={{
                      background: concertType === type ? 'rgba(123,63,242,0.1)' : 'var(--surface)',
                      borderColor: concertType === type ? 'var(--primary)' : 'var(--border)',
                    }}>
                    <Icon size={18} style={{ color: concertType === type ? 'var(--primary)' : 'var(--text-secondary)' }} />
                    <p className="text-xs font-black" style={{ color: concertType === type ? 'var(--primary)' : 'var(--text-primary)' }}>{label}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>
                    {concertType === type && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--primary)' }}>
                        <Check size={9} color="#fff" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Max spectateurs
                </label>
                <input type="number" className={inputCls} style={inputStyle}
                  placeholder="Illimité" value={maxViewers} onChange={e => setMaxViewers(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Durée (min)
                </label>
                <input type="number" className={inputCls} style={inputStyle}
                  placeholder="Ex: 90" value={durationMin} onChange={e => setDurationMin(e.target.value)} />
              </div>
            </div>
          </>
        )}

        {/* ── Step 1: Accès & Prix ────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <div>
              <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Type d'accès
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ACCESS_TYPES.map(({ type, Icon, label }) => (
                  <button key={type} onClick={() => setAccessType(type)}
                    className="relative flex items-center gap-3 p-4 rounded-2xl border transition-all"
                    style={{
                      background: accessType === type ? 'rgba(123,63,242,0.1)' : 'var(--surface)',
                      borderColor: accessType === type ? 'var(--primary)' : 'var(--border)',
                    }}>
                    <Icon size={16} style={{ color: accessType === type ? 'var(--primary)' : 'var(--text-secondary)' }} />
                    <p className="text-sm font-black" style={{ color: accessType === type ? 'var(--primary)' : 'var(--text-primary)' }}>{label}</p>
                    {accessType === type && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--primary)' }}>
                        <Check size={9} color="#fff" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {accessType === 'ticket' && (
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Prix par catégorie</p>
                {TICKET_TIERS.map(({ key, label, sub, color }) => (
                  <div key={key} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'var(--surface)', border: `1px solid ${color}30` }}>
                    <div className="flex-1">
                      <p className="text-sm font-black" style={{ color }}>{label}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <input type="number" step="0.01" min="0" placeholder="0.00"
                        className="w-24 text-right px-3 py-1.5 rounded-lg text-sm outline-none"
                        style={{ background: 'var(--bg)', border: `1px solid ${color}40`, color: 'var(--text-primary)' }}
                        value={key === 'simple' ? priceSimple : key === 'vip' ? priceVip : key === 'vvip' ? priceVvip : priceVvvip}
                        onChange={e => {
                          const v = e.target.value;
                          if (key === 'simple') setPriceSimple(v);
                          else if (key === 'vip') setPriceVip(v);
                          else if (key === 'vvip') setPriceVvip(v);
                          else setPriceVvvip(v);
                        }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>€</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {accessType === 'ppv' && (
              <div>
                <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Prix pay-per-view
                </label>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.01" min="0" className={inputCls} style={inputStyle}
                    placeholder="0.00" value={pricePpv} onChange={e => setPricePpv(e.target.value)} />
                  <span className="text-sm font-semibold shrink-0" style={{ color: 'var(--text-secondary)' }}>EUR</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Step 2: Lieu & Date ─────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Ville *
                </label>
                <input className={inputCls} style={inputStyle}
                  placeholder="Ex: Ouagadougou" value={venueCity} onChange={e => setVenueCity(e.target.value)} />
              </div>
              <button onClick={handleGps} disabled={locating}
                className="mt-6 w-11 h-11 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {locating ? <Spinner size="sm" /> : <MapPin size={18} style={{ color: 'var(--primary)' }} />}
              </button>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Nom du lieu
              </label>
              <input className={inputCls} style={inputStyle}
                placeholder="Ex: Palais des Sports" value={venueName} onChange={e => setVenueName(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Pays
              </label>
              <input className={inputCls} style={inputStyle}
                value={country} onChange={e => setCountry(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Date *
                </label>
                <input type="date" className={inputCls} style={inputStyle}
                  value={schedDate} onChange={e => setSchedDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Heure *
                </label>
                <input type="time" className={inputCls} style={inputStyle}
                  value={schedTime} onChange={e => setSchedTime(e.target.value)} />
              </div>
            </div>
          </>
        )}

        {/* ── Step 3: Médias ──────────────────────────────────────────────── */}
        {step === 3 && (
          <>
            <div>
              <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Photos (max 5 · 1re = miniature, 2e = bannière)
              </label>
              <div className="flex flex-wrap gap-2">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden">
                    <img src={src} className="w-full h-full object-cover" alt="" />
                    <button onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.6)' }}>
                      <X size={10} color="#fff" />
                    </button>
                  </div>
                ))}
                {imageFiles.length < 5 && (
                  <button onClick={() => imageInputRef.current?.click()}
                    className="w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
                    <ImageIcon size={18} />
                    <span className="text-[10px]">Ajouter</span>
                  </button>
                )}
              </div>
              <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={handleImages} />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Vidéo promotionnelle (optionnel)
              </label>
              {videoPreview ? (
                <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  <video src={videoPreview} className="w-full h-full object-cover" controls />
                  <button onClick={() => { URL.revokeObjectURL(videoPreview); setVideoFile(null); setVideoPreview(null); }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.6)' }}>
                    <X size={14} color="#fff" />
                  </button>
                </div>
              ) : (
                <button onClick={() => videoInputRef.current?.click()}
                  className="w-full py-6 rounded-xl border-2 border-dashed flex flex-col items-center gap-2"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
                  <Upload size={20} />
                  <span className="text-sm font-semibold">Ajouter une vidéo promo</span>
                </button>
              )}
              <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={handleVideo} />
            </div>
          </>
        )}

        {/* ── Step 4: Révision ────────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-3">
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {[
                { label: 'Titre',       value: title },
                { label: 'Type',        value: CONCERT_TYPES.find(t => t.type === concertType)?.label ?? concertType },
                { label: 'Accès',       value: ACCESS_TYPES.find(t => t.type === accessType)?.label ?? accessType },
                { label: 'Genre',       value: genre || '—' },
                { label: 'Ville',       value: venueCity },
                { label: 'Date',        value: schedDate && schedTime ? `${schedDate} à ${schedTime}` : '—' },
                { label: 'Photos',      value: `${imageFiles.length} photo(s)` },
                { label: 'Vidéo promo', value: videoFile ? videoFile.name : '—' },
              ].map(({ label, value }, i, arr) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <p className="text-xs w-24 shrink-0" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
                  <p className="text-sm font-semibold flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 flex gap-3 px-4 py-4 w-full mx-auto"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        {step < STEPS.length - 1 ? (
          <button onClick={goNext}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-white"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
            Suivant <ArrowRight size={16} />
          </button>
        ) : (
          <button onClick={handlePublish} disabled={publishing}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)' }}>
            {publishing ? <Spinner size="sm" /> : <><Check size={16} /> {isEdit ? 'Enregistrer les modifications' : 'Publier le concert'}</>}
          </button>
        )}
      </div>
    </div>
  );
}
