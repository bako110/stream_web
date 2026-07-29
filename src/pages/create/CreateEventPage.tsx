import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, Music, Star, Gift, Mic,
  Activity, Film, Image as ImageIcon, Calendar, Lock, Tag,
  MapPin, Globe, Upload, X,
} from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner , PageLoader} from '../../components/ui/Spinner';
import { uploadVideoHls } from '../../api/uploadVideo';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

type EventType      = 'concert' | 'festival' | 'birthday' | 'conference' | 'sport' | 'theater' | 'exhibition' | 'other';
type EventAccessType= 'free' | 'ticket' | 'invite_only';

const STEPS = ['Infos', 'Accès', 'Lieu & Dates', 'Médias', 'Révision'] as const;

const EVENT_TYPES = [
  { type: 'concert'    as EventType, Icon: Music,    label: 'Concert',      color: '#7B3FF2' },
  { type: 'festival'   as EventType, Icon: Star,     label: 'Festival',     color: '#7B3FF2' },
  { type: 'birthday'   as EventType, Icon: Gift,     label: 'Anniversaire', color: '#7B3FF2' },
  { type: 'conference' as EventType, Icon: Mic,      label: 'Conférence',   color: '#7B3FF2' },
  { type: 'sport'      as EventType, Icon: Activity, label: 'Sport',        color: '#7B3FF2' },
  { type: 'theater'    as EventType, Icon: Film,     label: 'Théâtre',      color: '#9B65F5' },
  { type: 'exhibition' as EventType, Icon: ImageIcon,label: 'Exposition',   color: '#7B3FF2' },
  { type: 'other'      as EventType, Icon: Calendar, label: 'Autre',        color: '#9390AB' },
];

const ACCESS_TYPES = [
  { type: 'free'        as EventAccessType, Icon: Gift, label: 'Gratuit',    sub: 'Accès libre'   },
  { type: 'ticket'      as EventAccessType, Icon: Tag,  label: 'Payant',     sub: 'Billet requis' },
  { type: 'invite_only' as EventAccessType, Icon: Lock, label: 'Sur invite', sub: 'Liste fermée'  },
];

const TICKET_TIERS = [
  { key: 'simple' as const, label: 'Simple', sub: 'Accès standard',       color: '#7B3FF2' },
  { key: 'vip'    as const, label: 'VIP',    sub: 'Accès privilégié',     color: '#7B3FF2' },
  { key: 'vvip'   as const, label: 'VVIP',   sub: 'Expérience premium',   color: '#7B3FF2' },
  { key: 'vvvip'  as const, label: 'VVVIP',  sub: 'Accès ultra exclusif', color: '#7B3FF2' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

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

export default function CreateEventPage() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const editId        = params.get('edit');
  const isEdit        = !!editId;

  const [step, setStep] = useState(0);
  const [loadingEdit, setLoadingEdit] = useState(isEdit);

  // Step 0
  const [title,           setTitle]           = useState('');
  const [description,     setDescription]     = useState('');
  const [eventType,       setEventType]       = useState<EventType>('concert');
  const [customEventType, setCustomEventType] = useState('');

  // Step 1
  const [accessType,   setAccessType]   = useState<EventAccessType>('free');
  const [priceSimple,  setPriceSimple]  = useState('');
  const [priceVip,     setPriceVip]     = useState('');
  const [priceVvip,    setPriceVvip]    = useState('');
  const [priceVvvip,   setPriceVvvip]   = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');

  // Step 2
  const [isOnline,   setIsOnline]   = useState(false);
  const [onlineUrl,  setOnlineUrl]  = useState('');
  const [venueName,  setVenueName]  = useState('');
  const [venueAddr,  setVenueAddr]  = useState('');
  const [venueCity,  setVenueCity]  = useState('');
  const [country,    setCountry]    = useState('Burkina Faso');
  const [startDate,  setStartDate]  = useState('');
  const [startTime,  setStartTime]  = useState('');
  const [endDate,    setEndDate]    = useState('');
  const [endTime,    setEndTime]    = useState('');
  const [locating,   setLocating]   = useState(false);

  // Step 3
  const [imageFiles,    setImageFiles]    = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoFile,     setVideoFile]     = useState<File | null>(null);
  const [videoPreview,  setVideoPreview]  = useState<string | null>(null);
  // Existing URLs conserves en mode edition
  const [existingThumbnail, setExistingThumbnail] = useState<string | null>(null);
  const [existingVideoUrl,  setExistingVideoUrl]  = useState<string | null>(null);

  const [publishing, setPublishing] = useState(false);

  // ── Charger les donnees existantes en mode edition ─────────────────────────
  useEffect(() => {
    if (!editId) return;
    apiClient.get<any>(Endpoints.events.byId(editId))
      .then(r => {
        const ev = r.data?.data ?? r.data;
        setTitle(ev.title ?? '');
        setDescription(ev.description ?? '');
        setEventType((ev.event_type as EventType) ?? 'concert');
        setAccessType((ev.access_type as EventAccessType) ?? 'free');
        setPriceSimple(ev.ticket_price       != null ? String(ev.ticket_price)       : '');
        setPriceVip   (ev.ticket_price_vip   != null ? String(ev.ticket_price_vip)   : '');
        setPriceVvip  (ev.ticket_price_vvip  != null ? String(ev.ticket_price_vvip)  : '');
        setPriceVvvip (ev.ticket_price_vvvip != null ? String(ev.ticket_price_vvvip) : '');
        setMaxAttendees(ev.max_attendees != null ? String(ev.max_attendees) : '');
        setIsOnline(ev.is_online ?? false);
        setOnlineUrl(ev.online_url ?? '');
        setVenueName(ev.venue_name ?? '');
        setVenueAddr(ev.venue_address ?? '');
        setVenueCity(ev.venue_city ?? '');
        setCountry(ev.venue_country ?? 'Burkina Faso');
        if (ev.starts_at) {
          const d = new Date(ev.starts_at);
          setStartDate(d.toISOString().slice(0, 10));
          setStartTime(d.toISOString().slice(11, 16));
        }
        if (ev.ends_at) {
          const d = new Date(ev.ends_at);
          setEndDate(d.toISOString().slice(0, 10));
          setEndTime(d.toISOString().slice(11, 16));
        }
        if (ev.thumbnail_url) {
          setExistingThumbnail(ev.thumbnail_url);
          setImagePreviews([ev.thumbnail_url]);
        }
        if (ev.video_url) {
          setExistingVideoUrl(ev.video_url);
        }
      })
      .catch(() => toast.error('Impossible de charger l\'événement'))
      .finally(() => setLoadingEdit(false));
  }, [editId]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // ── Step validation ────────────────────────────────────────────────────────

  const stepValid = [
    title.trim().length > 0 && (eventType !== 'other' || customEventType.trim().length > 0),
    true,
    (isOnline || venueCity.trim().length > 0) && !!startDate && !!startTime,
    true,
    true,
  ];

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
        const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
        const data = await res.json();
        setVenueCity(data.address?.city ?? data.address?.town ?? data.address?.village ?? '');
        setCountry(data.address?.country ?? 'Burkina Faso');
        if (data.address?.road) setVenueAddr(data.address.road);
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
      // null explicite = l'utilisateur a retiré la vidéo existante (à distinguer de "non modifiée")
      let promo_video_url: string | null | undefined = existingVideoUrl;
      const gallery_urls: string[] = [];

      if (imageFiles.length > 0) {
        const urls = await Promise.all(imageFiles.map(f => uploadImage(f, 'events')));
        thumbnail_url = urls[0];
        gallery_urls.push(...urls);
      }
      if (videoFile) {
        const uploaded = await uploadVideoHls(videoFile, 'events');
        promo_video_url = uploaded.hls_url ?? uploaded.url;
      }

      const starts_at = startDate && startTime ? `${startDate}T${startTime}:00` : undefined;
      const ends_at   = endDate   && endTime   ? `${endDate}T${endTime}:00`     : undefined;

      const payload: Record<string, unknown> = {
        title:          title.trim(),
        description:    description.trim() || undefined,
        event_type:     eventType === 'other' ? (customEventType.trim() || 'other') : eventType,
        access_type:    accessType,
        is_online:      isOnline,
        online_url:     isOnline ? (onlineUrl.trim() || undefined) : undefined,
        venue_name:     !isOnline ? (venueName.trim() || undefined) : undefined,
        venue_address:  !isOnline ? (venueAddr.trim() || undefined) : undefined,
        venue_city:     venueCity.trim() || 'En ligne',
        venue_country:  country.trim()   || 'International',
        starts_at,
        ends_at,
        max_attendees:  maxAttendees ? Number(maxAttendees) : undefined,
        thumbnail_url,
        gallery_urls:   gallery_urls.length > 0 ? gallery_urls : undefined,
        video_url:      promo_video_url,
      };

      if (accessType === 'ticket') {
        if (priceSimple) payload.ticket_price       = Number(priceSimple);
        if (priceVip)    payload.ticket_price_vip   = Number(priceVip);
        if (priceVvip)   payload.ticket_price_vvip  = Number(priceVvip);
        if (priceVvvip)  payload.ticket_price_vvvip = Number(priceVvvip);
      }

      if (isEdit && editId) {
        await apiClient.put(Endpoints.events.byId(editId), payload);
        toast.success('Événement mis à jour !');
        navigate('/my-events');
      } else {
        const res = await apiClient.post<{ id: string }>(Endpoints.events.list, payload);
        const id  = res.data?.id;
        if (id) {
          await apiClient.patch(`${Endpoints.events.list}/${id}/publish`).catch(() => {});
        }
        toast.success('Événement créé !');
        navigate('/my-events');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? (isEdit ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création'));
    } finally {
      setPublishing(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const inputCls  = "w-full px-4 py-3 rounded-xl text-sm outline-none";
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
            {isEdit ? 'Modifier l\'événement' : 'Créer un événement'}
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
                placeholder="Nom de l'événement" value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Description
              </label>
              <textarea className={inputCls} style={inputStyle} rows={4}
                placeholder="Décrivez votre événement..." value={description}
                onChange={e => setDescription(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Type d'événement
              </label>
              <div className="grid grid-cols-4 gap-2">
                {EVENT_TYPES.map(({ type, Icon, label, color }) => (
                  <button key={type} onClick={() => setEventType(type)}
                    className="relative flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all"
                    style={{
                      background: eventType === type ? `${color}15` : 'var(--surface)',
                      borderColor: eventType === type ? color : 'var(--border)',
                    }}>
                    <Icon size={16} style={{ color: eventType === type ? color : 'var(--text-secondary)' }} />
                    <p className="text-[10px] font-black text-center leading-tight"
                      style={{ color: eventType === type ? color : 'var(--text-primary)' }}>{label}</p>
                    {eventType === type && (
                      <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                        style={{ background: color }}>
                        <Check size={8} color="#fff" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {eventType === 'other' && (
                <input className={`${inputCls} mt-3`} style={inputStyle}
                  placeholder="Précisez le type d'événement *" value={customEventType}
                  onChange={e => setCustomEventType(e.target.value)} />
              )}
            </div>
          </>
        )}

        {/* ── Step 1: Accès ───────────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <div>
              <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Type d'accès
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ACCESS_TYPES.map(({ type, Icon, label, sub }) => (
                  <button key={type} onClick={() => setAccessType(type)}
                    className="relative flex flex-col items-center gap-1.5 py-4 rounded-2xl border transition-all"
                    style={{
                      background: accessType === type ? 'rgba(123,63,242,0.1)' : 'var(--surface)',
                      borderColor: accessType === type ? 'var(--primary)' : 'var(--border)',
                    }}>
                    <Icon size={18} style={{ color: accessType === type ? 'var(--primary)' : 'var(--text-secondary)' }} />
                    <p className="text-xs font-black" style={{ color: accessType === type ? 'var(--primary)' : 'var(--text-primary)' }}>{label}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>
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
                <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  Prix par catégorie (laisser vide = non disponible)
                </p>
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

            <div>
              <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Max participants
              </label>
              <input type="number" className={inputCls} style={inputStyle}
                placeholder="Illimité" value={maxAttendees} onChange={e => setMaxAttendees(e.target.value)} />
            </div>
          </>
        )}

        {/* ── Step 2: Lieu & Dates ────────────────────────────────────────── */}
        {step === 2 && (
          <>
            {/* Online toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <Globe size={18} style={{ color: 'var(--primary)' }} />
                <div>
                  <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Événement en ligne</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Lien de connexion fourni</p>
                </div>
              </div>
              <button onClick={() => setIsOnline(v => !v)}
                className="w-12 h-6 rounded-full transition-all relative"
                style={{ background: isOnline ? 'var(--primary)' : 'var(--border)' }}>
                <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                  style={{ left: isOnline ? 26 : 2 }} />
              </button>
            </div>

            {isOnline ? (
              <div>
                <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Lien de l'événement
                </label>
                <input className={inputCls} style={inputStyle}
                  placeholder="https://..." value={onlineUrl} onChange={e => setOnlineUrl(e.target.value)} />
              </div>
            ) : (
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
                    placeholder="Ex: Salle des fêtes" value={venueName} onChange={e => setVenueName(e.target.value)} />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                    Adresse
                  </label>
                  <input className={inputCls} style={inputStyle}
                    placeholder="Rue, quartier..." value={venueAddr} onChange={e => setVenueAddr(e.target.value)} />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                    Pays
                  </label>
                  <input className={inputCls} style={inputStyle}
                    value={country} onChange={e => setCountry(e.target.value)} />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Date début *
                </label>
                <input type="date" className={inputCls} style={inputStyle}
                  value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Heure début *
                </label>
                <input type="time" className={inputCls} style={inputStyle}
                  value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Date fin
                </label>
                <input type="date" className={inputCls} style={inputStyle}
                  value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Heure fin
                </label>
                <input type="time" className={inputCls} style={inputStyle}
                  value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            </div>
          </>
        )}

        {/* ── Step 3: Médias ──────────────────────────────────────────────── */}
        {step === 3 && (
          <>
            <div>
              <label className="text-xs font-black uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Photos (max 5 · 1re = miniature)
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
              {videoPreview || existingVideoUrl ? (
                <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  <video src={videoPreview ?? existingVideoUrl!} className="w-full h-full object-cover" controls />
                  <button onClick={() => { if (videoPreview) URL.revokeObjectURL(videoPreview); setVideoFile(null); setVideoPreview(null); setExistingVideoUrl(null); }}
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
                { label: 'Titre',    value: title },
                { label: 'Type',     value: EVENT_TYPES.find(t => t.type === eventType)?.label ?? eventType },
                { label: 'Accès',    value: ACCESS_TYPES.find(t => t.type === accessType)?.label ?? accessType },
                { label: 'Lieu',     value: isOnline ? 'En ligne' : `${venueCity}${country ? `, ${country}` : ''}` },
                { label: 'Début',    value: startDate && startTime ? `${startDate} à ${startTime}` : '—' },
                { label: 'Fin',      value: endDate && endTime ? `${endDate} à ${endTime}` : '—' },
                { label: 'Photos',   value: `${imagePreviews.length} photo(s)` },
                { label: 'Vidéo',    value: videoFile ? videoFile.name : existingVideoUrl ? 'Vidéo existante conservée' : '—' },
              ].map(({ label, value }, i, arr) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <p className="text-xs w-20 shrink-0" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
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
            {publishing ? <Spinner size="sm" /> : <><Check size={16} /> {isEdit ? 'Enregistrer les modifications' : 'Publier l\'événement'}</>}
          </button>
        )}
      </div>
    </div>
  );
}
