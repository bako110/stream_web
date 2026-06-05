import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, X, FileText, Calendar, Music2, Film,
  Smile, Send, MapPin, Globe, Lock, Tag, Image, Video, UploadCloud, CheckCircle,
} from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../ui/Avatar';
import { Spinner } from '../ui/Spinner';
import { uploadVideoHls } from '../../api/uploadVideo';

// ── Upload helpers (browser) ──────────────────────────────────────────────────

interface UploadedImage { url: string; public_id: string; width?: number; height?: number; }

const uploadVideo = uploadVideoHls;

async function uploadImages(files: File[], folder: string): Promise<UploadedImage[]> {
  const results: UploadedImage[] = [];
  for (const f of files) {
    const fd = new FormData();
    fd.append('file', f);
    const res = await apiClient.upload<{ uploaded: UploadedImage[] }>(
      Endpoints.upload.images(folder), fd,
    );
    const uploaded = (res.data as any)?.uploaded ?? (Array.isArray(res.data) ? res.data : [res.data]);
    results.push(...uploaded);
  }
  return results;
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function ModalBackdrop({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose} />
  );
}

function ModalBox({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <>
      <ModalBackdrop onClose={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col w-[calc(100vw-2rem)] max-w-lg max-h-[90vh]"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1.5rem', boxShadow: '0 32px 80px rgba(0,0,0,0.4)' }}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-black text-base" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl transition-all"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold" style={{ color: error ? '#7B3FF2' : 'var(--text-tertiary)' }}>{label}</label>
      {children}
      {error && <p className="text-xs font-medium" style={{ color: '#7B3FF2' }}>{error}</p>}
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <p className="text-xs font-medium px-3 py-2 rounded-xl"
      style={{ background: 'rgba(123,63,242,0.1)', color: '#7B3FF2' }}>{msg}</p>
  );
}

function UploadZone({
  accept: _accept, label, sub, icon: Icon_, preview, onPick, onRemove,
}: {
  accept: string; label: string; sub: string; icon: React.ElementType;
  preview?: React.ReactNode; onPick: () => void; onRemove?: () => void;
}) {
  return preview ? (
    <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {preview}
      {onRemove && (
        <button onClick={onRemove}
          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}>
          <X size={14} color="#fff" />
        </button>
      )}
    </div>
  ) : (
    <button onClick={onPick}
      className="w-full py-6 rounded-xl flex flex-col items-center gap-2 transition-all"
      style={{ border: '2px dashed var(--border)', background: 'var(--bg-secondary)' }}
      onMouseEnter={e => { (e.currentTarget.style.borderColor = 'var(--primary)'); (e.currentTarget.style.background = 'rgba(123,63,242,0.05)'); }}
      onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--border)'); (e.currentTarget.style.background = 'var(--bg-secondary)'); }}>
      <Icon_ size={24} style={{ color: 'var(--primary)' }} />
      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</span>
      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{sub}</span>
    </button>
  );
}

function ProgressBar({ pct, done }: { pct: number; done?: boolean }) {
  return (
    <div className="rounded-full overflow-hidden h-1.5" style={{ background: 'var(--bg-secondary)' }}>
      <div className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, background: done ? '#7B3FF2' : 'linear-gradient(90deg,#7B3FF2,#5B2EC4)' }} />
    </div>
  );
}

const FEELINGS = ['😊 Content', '😢 Triste', '😂 Heureux', '🔥 Motivé', '🎉 Excité', '😎 Cool', '🤔 Pensif', '💪 Fier'];

// ── Create Post Modal ─────────────────────────────────────────────────────────

function CreatePostModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { user: me } = useAuthStore();
  const [body,         setBody]         = useState('');
  const [feeling,      setFeeling]      = useState('');
  const [showFeelings, setShowFeelings] = useState(false);
  const [images,       setImages]       = useState<File[]>([]);
  const [previews,     setPreviews]     = useState<string[]>([]);
  const [posting,      setPosting]      = useState(false);
  const [apiError,     setApiError]     = useState('');
  const textRef  = useRef<HTMLTextAreaElement>(null);
  const fileRef  = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => textRef.current?.focus(), 100); }, []);

  const addImages = useCallback((files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 4 - images.length);
    setImages(prev => [...prev, ...newFiles]);
    newFiles.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setPreviews(prev => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  }, [images.length]);

  function removeImage(i: number) {
    setImages(prev => prev.filter((_, j) => j !== i));
    setPreviews(prev => prev.filter((_, j) => j !== i));
  }

  async function submit() {
    if ((!body.trim() && images.length === 0) || posting) return;
    setPosting(true);
    setApiError('');
    try {
      let imageUrl: string | undefined;
      let imageUrls: string[] | undefined;

      if (images.length === 1) {
        const [uploaded] = await uploadImages(images, 'content');
        imageUrl = uploaded?.url;
      } else if (images.length > 1) {
        const uploaded = await uploadImages(images, 'content');
        imageUrls = uploaded.map(u => u.url);
        imageUrl  = uploaded[0]?.url;
      }

      await apiClient.post(Endpoints.posts.create, {
        body:       body.trim() || undefined,
        feeling:    feeling || undefined,
        image_url:  imageUrl,
        image_urls: imageUrls,
      });
      onDone();
    } catch (err: any) {
      setApiError(err?.message ?? 'Une erreur est survenue.');
    } finally { setPosting(false); }
  }

  const canPost = body.trim().length > 0 || images.length > 0;

  return (
    <ModalBox title="Nouveau post" onClose={onClose}>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => addImages(e.target.files)} />
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Avatar src={me?.avatar_url} name={me?.display_name ?? me?.username ?? '?'} size="md" />
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{me?.display_name ?? me?.username}</p>
            {feeling
              ? <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>se sent {feeling}</p>
              : <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Public</p>}
          </div>
        </div>

        <textarea ref={textRef} value={body} onChange={e => setBody(e.target.value)}
          rows={3} placeholder="Quoi de neuf ?"
          className="input w-full resize-none text-sm leading-relaxed"
          style={{ minHeight: 80 }} />

        {/* Image previews */}
        {previews.length > 0 && (
          <div className={`grid gap-2 ${previews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {previews.map((src, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden aspect-video">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removeImage(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.6)' }}>
                  <X size={12} color="#fff" />
                </button>
              </div>
            ))}
            {previews.length < 4 && (
              <button onClick={() => fileRef.current?.click()}
                className="aspect-video rounded-xl flex flex-col items-center justify-center gap-1 transition-all"
                style={{ border: '2px dashed var(--border)', background: 'var(--bg-secondary)' }}>
                <Image size={18} style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Ajouter</span>
              </button>
            )}
          </div>
        )}

        {/* Feelings */}
        {showFeelings && (
          <div className="flex flex-wrap gap-2">
            {FEELINGS.map(f => (
              <button key={f} onClick={() => { setFeeling(f === feeling ? '' : f); setShowFeelings(false); }}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: feeling === f ? 'rgba(123,63,242,0.15)' : 'var(--bg-secondary)',
                  color:      feeling === f ? 'var(--primary)' : 'var(--text-secondary)',
                  border:     `1px solid ${feeling === f ? 'rgba(123,63,242,0.3)' : 'var(--border)'}`,
                }}>
                {f}
              </button>
            ))}
          </div>
        )}

        {apiError && <ErrorBanner msg={apiError} />}

        <div className="flex items-center gap-2 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
          {/* Add image btn */}
          {previews.length === 0 && (
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
              onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(76,175,80,0.1)'); (e.currentTarget.style.color = '#4CAF50'); }}
              onMouseLeave={e => { (e.currentTarget.style.background = 'var(--bg-secondary)'); (e.currentTarget.style.color = 'var(--text-tertiary)'); }}>
              <Image size={14} /> Photo
            </button>
          )}
          <button onClick={() => setShowFeelings(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{ background: showFeelings ? 'rgba(123,63,242,0.1)' : 'var(--bg-secondary)', color: showFeelings ? 'var(--primary)' : 'var(--text-tertiary)' }}>
            <Smile size={14} /> Humeur
          </button>
          <button onClick={submit} disabled={!canPost || posting}
            className="ml-auto btn-primary flex items-center gap-2 px-5">
            {posting ? <Spinner size="sm" /> : <Send size={14} />}
            Publier
          </button>
        </div>
      </div>
    </ModalBox>
  );
}

// ── Create Reel Modal ─────────────────────────────────────────────────────────

type ReelStep = 'idle' | 'uploading' | 'creating' | 'done';

function CreateReelModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [caption,   setCaption]   = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl,  setVideoUrl]  = useState('');   // object URL for preview
  const [step,      setStep]      = useState<ReelStep>('idle');
  const [pct,       setPct]       = useState(0);
  const [apiError,  setApiError]  = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => { if (videoUrl) URL.revokeObjectURL(videoUrl); };
  }, [videoUrl]);

  function pickVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setStep('idle');
    setApiError('');
  }

  function removeVideo() {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoFile(null);
    setVideoUrl('');
    setStep('idle');
  }

  async function publish() {
    if (!videoFile || step !== 'idle') return;
    setApiError('');
    try {
      setStep('uploading');
      setPct(0);

      const uploaded = await uploadVideo(videoFile, 'reels', setPct);

      setStep('creating');
      const dur = videoRef.current?.duration;

      await apiClient.post(Endpoints.reels.feed, {
        hls_url:       uploaded.hls_url,
        caption:       caption.trim() || undefined,
        thumbnail_url: uploaded.thumbnail_url,
        duration_sec:  uploaded.duration ? Math.round(uploaded.duration) : (dur ? Math.round(dur) : undefined),
      });

      setStep('done');
      setPct(100);
      setTimeout(() => onDone(), 1400);
    } catch (err: any) {
      setApiError(err?.message ?? 'Impossible de publier le reel.');
      setStep('idle');
      setPct(0);
    }
  }

  const isPublishing = step === 'uploading' || step === 'creating';
  const isDone       = step === 'done';

  return (
    <ModalBox title="Nouveau Reel" onClose={isPublishing ? () => {} : onClose}>
      <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={pickVideo} />
      <div className="p-5 space-y-4">

        {/* Progress */}
        {step !== 'idle' && (
          <div className="space-y-1.5">
            <ProgressBar pct={pct} done={isDone} />
            <p className="text-xs text-center font-medium" style={{ color: isDone ? '#7B3FF2' : 'var(--text-secondary)' }}>
              {isDone
                ? '✓ Reel publié !'
                : step === 'uploading'
                ? `Envoi de la vidéo… ${pct}%`
                : 'Finalisation…'}
            </p>
          </div>
        )}

        {/* Video zone */}
        {videoUrl ? (
          <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '9/16', maxHeight: 340 }}>
            <video ref={videoRef} src={videoUrl} controls className="w-full h-full object-contain"
              style={{ pointerEvents: isPublishing ? 'none' : 'auto' }} />
            {isDone && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                style={{ background: 'rgba(0,0,0,0.6)' }}>
                <CheckCircle size={48} color="#7B3FF2" />
                <p className="text-white font-bold">Reel publié !</p>
              </div>
            )}
            {!isPublishing && !isDone && (
              <button onClick={removeVideo}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.6)' }}>
                <X size={14} color="#fff" />
              </button>
            )}
          </div>
        ) : (
          <UploadZone
            accept="video/*" icon={Video}
            label="Ajouter une vidéo"
            sub="MP4 · Max 60 s · 1080p recommandé"
            onPick={() => fileRef.current?.click()}
          />
        )}

        <Field label={`Description (${caption.length}/300)`}>
          <textarea value={caption} onChange={e => setCaption(e.target.value.slice(0, 300))}
            rows={2} placeholder="Décris ton reel… #hashtag"
            className="input w-full resize-none text-sm"
            disabled={isPublishing} />
        </Field>

        {apiError && <ErrorBanner msg={apiError} />}

        <button onClick={publish} disabled={!videoFile || isPublishing || isDone}
          className="w-full btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-40">
          {isPublishing ? <Spinner size="sm" /> : <UploadCloud size={16} />}
          {isPublishing ? 'Publication…' : 'Publier le Reel'}
        </button>
      </div>
    </ModalBox>
  );
}

// ── Create Event Modal ────────────────────────────────────────────────────────

const EVENT_TYPES = [
  { value: 'concert',    label: 'Concert',      color: '#7B3FF2' },
  { value: 'festival',   label: 'Festival',     color: '#7B3FF2' },
  { value: 'sport',      label: 'Sport',        color: '#7B3FF2' },
  { value: 'conference', label: 'Conférence',   color: '#7B3FF2' },
  { value: 'theater',    label: 'Théâtre',      color: '#7B3FF2' },
  { value: 'birthday',   label: 'Anniversaire', color: '#7B3FF2' },
  { value: 'other',      label: 'Autre',        color: '#6B7280' },
];

interface EventErrors { title?: string; startsAt?: string; venueCity?: string; venueCountry?: string; }

function CreateEventModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [title,        setTitle]        = useState('');
  const [description,  setDescription]  = useState('');
  const [eventType,    setEventType]    = useState('concert');
  const [accessType,   setAccessType]   = useState('free');
  const [price,        setPrice]        = useState('');
  const [startsAt,     setStartsAt]     = useState('');
  const [endsAt,       setEndsAt]       = useState('');
  const [isOnline,     setIsOnline]     = useState(false);
  const [venueCity,    setVenueCity]    = useState('');
  const [venueCountry, setVenueCountry] = useState('');
  const [venueName,    setVenueName]    = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [onlineUrl,    setOnlineUrl]    = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [coverFile,    setCoverFile]    = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [saving,       setSaving]       = useState(false);
  const [errors,       setErrors]       = useState<EventErrors>({});
  const [apiError,     setApiError]     = useState('');
  const coverRef = useRef<HTMLInputElement>(null);

  function pickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setCoverFile(f);
    const reader = new FileReader();
    reader.onload = ev => setCoverPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  }

  function validate(): boolean {
    const e: EventErrors = {};
    if (!title.trim())        e.title        = 'Le titre est obligatoire';
    if (!startsAt)            e.startsAt     = 'La date de début est obligatoire';
    if (!venueCity.trim())    e.venueCity    = 'La ville est obligatoire';
    if (!venueCountry.trim()) e.venueCountry = 'Le pays est obligatoire';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(status: 'draft' | 'published') {
    if (!validate() || saving) return;
    setSaving(true);
    setApiError('');
    try {
      let coverImageUrl: string | undefined;
      if (coverFile) {
        const [img] = await uploadImages([coverFile], 'events');
        coverImageUrl = img?.url;
      }

      await apiClient.post(Endpoints.events.list, {
        title:         title.trim(),
        description:   description.trim() || undefined,
        event_type:    eventType,
        access_type:   accessType,
        ticket_price:  accessType === 'ticket' && price ? parseFloat(price) : undefined,
        starts_at:     new Date(startsAt).toISOString(),
        ends_at:       endsAt ? new Date(endsAt).toISOString() : undefined,
        is_online:     isOnline,
        venue_city:    venueCity.trim(),
        venue_country: venueCountry.trim(),
        venue_name:    venueName.trim() || undefined,
        venue_address: venueAddress.trim() || undefined,
        online_url:    isOnline && onlineUrl.trim() ? onlineUrl.trim() : undefined,
        max_attendees: maxAttendees ? parseInt(maxAttendees) : undefined,
        cover_image_url: coverImageUrl,
        status,
      });
      onDone();
    } catch (err: any) {
      setApiError(err?.message ?? 'Une erreur est survenue.');
    } finally { setSaving(false); }
  }

  return (
    <ModalBox title="Créer un événement" onClose={onClose}>
      <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={pickCover} />
      <div className="p-5 space-y-4">

        {/* Cover */}
        <Field label="Image de couverture">
          {coverPreview ? (
            <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <img src={coverPreview} alt="" className="w-full h-full object-cover" />
              <button onClick={() => { setCoverFile(null); setCoverPreview(''); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.6)' }}>
                <X size={14} color="#fff" />
              </button>
            </div>
          ) : (
            <button onClick={() => coverRef.current?.click()}
              className="w-full py-4 rounded-xl flex items-center justify-center gap-2 transition-all text-xs font-medium"
              style={{ border: '2px dashed var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
              onMouseEnter={e => { (e.currentTarget.style.borderColor = 'var(--primary)'); (e.currentTarget.style.color = 'var(--primary)'); }}
              onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--border)'); (e.currentTarget.style.color = 'var(--text-tertiary)'); }}>
              <Image size={16} /> Ajouter une image de couverture
            </button>
          )}
        </Field>

        {/* Type */}
        <Field label="Type d'événement">
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map(t => (
              <button key={t.value} onClick={() => setEventType(t.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: eventType === t.value ? `${t.color}20` : 'var(--bg-secondary)',
                  color:      eventType === t.value ? t.color : 'var(--text-secondary)',
                  border:     `1px solid ${eventType === t.value ? t.color + '50' : 'var(--border)'}`,
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Titre *" error={errors.title}>
          <input value={title} onChange={e => { setTitle(e.target.value); setErrors(v => ({ ...v, title: undefined })); }}
            placeholder="Nom de l'événement" className="input w-full text-sm"
            style={errors.title ? { borderColor: '#7B3FF2' } : {}} />
        </Field>

        <Field label="Description">
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            rows={2} placeholder="Décrivez votre événement…" className="input w-full resize-none text-sm" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date de début *" error={errors.startsAt}>
            <input type="datetime-local" value={startsAt}
              onChange={e => { setStartsAt(e.target.value); setErrors(v => ({ ...v, startsAt: undefined })); }}
              className="input w-full text-sm" style={errors.startsAt ? { borderColor: '#7B3FF2' } : {}} />
          </Field>
          <Field label="Date de fin">
            <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className="input w-full text-sm" />
          </Field>
        </div>

        {/* Lieu */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-tertiary)' }}>Lieu</p>
          <div className="flex gap-2 mb-3">
            {[{ v: false, label: 'Physique', icon: MapPin }, { v: true, label: 'En ligne', icon: Globe }].map(o => (
              <button key={String(o.v)} onClick={() => setIsOnline(o.v)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: isOnline === o.v ? 'rgba(123,63,242,0.12)' : 'var(--bg-secondary)',
                  color:      isOnline === o.v ? 'var(--primary)' : 'var(--text-secondary)',
                  border:     `1px solid ${isOnline === o.v ? 'rgba(123,63,242,0.3)' : 'var(--border)'}`,
                }}>
                <o.icon size={13} /> {o.label}
              </button>
            ))}
          </div>
          {isOnline && (
            <input value={onlineUrl} onChange={e => setOnlineUrl(e.target.value)}
              placeholder="URL du stream (optionnel)" className="input w-full text-sm mb-3" />
          )}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Ville *" error={errors.venueCity}>
              <input value={venueCity}
                onChange={e => { setVenueCity(e.target.value); setErrors(v => ({ ...v, venueCity: undefined })); }}
                placeholder="Paris, Abidjan…" className="input text-sm"
                style={errors.venueCity ? { borderColor: '#7B3FF2' } : {}} />
            </Field>
            <Field label="Pays *" error={errors.venueCountry}>
              <input value={venueCountry}
                onChange={e => { setVenueCountry(e.target.value); setErrors(v => ({ ...v, venueCountry: undefined })); }}
                placeholder="France, Côte d'Ivoire…" className="input text-sm"
                style={errors.venueCountry ? { borderColor: '#7B3FF2' } : {}} />
            </Field>
          </div>
          {!isOnline && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input value={venueName}    onChange={e => setVenueName(e.target.value)}    placeholder="Salle / Lieu" className="input text-sm" />
              <input value={venueAddress} onChange={e => setVenueAddress(e.target.value)} placeholder="Adresse"     className="input text-sm" />
            </div>
          )}
        </div>

        {/* Accès */}
        <Field label="Accès">
          <div className="flex gap-2">
            {[
              { v: 'free',        label: 'Gratuit',    icon: Globe },
              { v: 'ticket',      label: 'Payant',     icon: Tag   },
              { v: 'invite_only', label: 'Sur invite', icon: Lock  },
            ].map(o => (
              <button key={o.v} onClick={() => setAccessType(o.v)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: accessType === o.v ? 'rgba(123,63,242,0.12)' : 'var(--bg-secondary)',
                  color:      accessType === o.v ? 'var(--primary)' : 'var(--text-secondary)',
                  border:     `1px solid ${accessType === o.v ? 'rgba(123,63,242,0.3)' : 'var(--border)'}`,
                }}>
                <o.icon size={13} /> {o.label}
              </button>
            ))}
          </div>
          {accessType === 'ticket' && (
            <input value={price} onChange={e => setPrice(e.target.value)}
              type="number" min="0" placeholder="Prix (€)" className="input w-full text-sm mt-2" />
          )}
        </Field>

        <Field label="Nombre de places max">
          <input value={maxAttendees} onChange={e => setMaxAttendees(e.target.value)}
            type="number" min="1" placeholder="Illimité si vide" className="input w-full text-sm" />
        </Field>

        {apiError && <ErrorBanner msg={apiError} />}

        <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={() => submit('draft')} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            Brouillon
          </button>
          <button onClick={() => submit('published')} disabled={saving}
            className="flex-1 btn-primary flex items-center justify-center gap-2">
            {saving ? <Spinner size="sm" /> : null} Publier
          </button>
        </div>
      </div>
    </ModalBox>
  );
}

// ── Create Concert Modal ──────────────────────────────────────────────────────

const CONCERT_TYPES  = [
  { value: 'live',            label: 'Live'          },
  { value: 'replay',          label: 'Replay'        },
  { value: 'live_and_replay', label: 'Live + Replay' },
];
const CONCERT_ACCESS = [
  { value: 'free',         label: 'Gratuit'      },
  { value: 'subscription', label: 'Abonnement'   },
  { value: 'ticket',       label: 'Billet'       },
  { value: 'ppv',          label: 'Pay-per-view' },
];

interface ConcertErrors { title?: string; schedAt?: string; venueCity?: string; venueCountry?: string; }

function CreateConcertModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [title,        setTitle]        = useState('');
  const [description,  setDescription]  = useState('');
  const [genre,        setGenre]        = useState('');
  const [concertType,  setConcertType]  = useState('live');
  const [accessType,   setAccessType]   = useState('free');
  const [price,        setPrice]        = useState('');
  const [venueCity,    setVenueCity]    = useState('');
  const [venueCountry, setVenueCountry] = useState('');
  const [venueName,    setVenueName]    = useState('');
  const [schedAt,      setSchedAt]      = useState('');
  const [durationMin,  setDurationMin]  = useState('');
  const [maxViewers,   setMaxViewers]   = useState('');
  const [coverFile,    setCoverFile]    = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [saving,       setSaving]       = useState(false);
  const [errors,       setErrors]       = useState<ConcertErrors>({});
  const [apiError,     setApiError]     = useState('');
  const coverRef = useRef<HTMLInputElement>(null);

  function pickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setCoverFile(f);
    const reader = new FileReader();
    reader.onload = ev => setCoverPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  }

  function validate(): boolean {
    const e: ConcertErrors = {};
    if (!title.trim())        e.title        = 'Le titre est obligatoire';
    if (!schedAt)             e.schedAt      = 'La date est obligatoire';
    if (!venueCity.trim())    e.venueCity    = 'La ville est obligatoire';
    if (!venueCountry.trim()) e.venueCountry = 'Le pays est obligatoire';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(status: 'draft' | 'published') {
    if (!validate() || saving) return;
    setSaving(true);
    setApiError('');
    try {
      let coverImageUrl: string | undefined;
      if (coverFile) {
        const [img] = await uploadImages([coverFile], 'concerts');
        coverImageUrl = img?.url;
      }

      await apiClient.post(Endpoints.concerts.list, {
        title:           title.trim(),
        description:     description.trim() || undefined,
        genre:           genre.trim() || undefined,
        concert_type:    concertType,
        access_type:     accessType,
        ticket_price:    accessType === 'ticket' && price ? parseFloat(price) : undefined,
        venue_city:      venueCity.trim(),
        venue_country:   venueCountry.trim(),
        venue_name:      venueName.trim() || undefined,
        scheduled_at:    new Date(schedAt).toISOString(),
        duration_min:    durationMin ? parseInt(durationMin) : undefined,
        max_viewers:     maxViewers ? parseInt(maxViewers) : undefined,
        cover_image_url: coverImageUrl,
        status,
      });
      onDone();
    } catch (err: any) {
      setApiError(err?.message ?? 'Une erreur est survenue.');
    } finally { setSaving(false); }
  }

  return (
    <ModalBox title="Créer un concert" onClose={onClose}>
      <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={pickCover} />
      <div className="p-5 space-y-4">

        {/* Cover */}
        <Field label="Image de couverture">
          {coverPreview ? (
            <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <img src={coverPreview} alt="" className="w-full h-full object-cover" />
              <button onClick={() => { setCoverFile(null); setCoverPreview(''); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.6)' }}>
                <X size={14} color="#fff" />
              </button>
            </div>
          ) : (
            <button onClick={() => coverRef.current?.click()}
              className="w-full py-4 rounded-xl flex items-center justify-center gap-2 transition-all text-xs font-medium"
              style={{ border: '2px dashed var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}
              onMouseEnter={e => { (e.currentTarget.style.borderColor = 'var(--primary)'); (e.currentTarget.style.color = 'var(--primary)'); }}
              onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--border)'); (e.currentTarget.style.color = 'var(--text-tertiary)'); }}>
              <Image size={16} /> Ajouter une image de couverture
            </button>
          )}
        </Field>

        <Field label="Titre *" error={errors.title}>
          <input value={title} onChange={e => { setTitle(e.target.value); setErrors(v => ({ ...v, title: undefined })); }}
            placeholder="Nom du concert" className="input w-full text-sm"
            style={errors.title ? { borderColor: '#7B3FF2' } : {}} />
        </Field>

        <Field label="Description">
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            rows={2} placeholder="Décrivez le concert…" className="input w-full resize-none text-sm" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Genre musical">
            <input value={genre} onChange={e => setGenre(e.target.value)}
              placeholder="Pop, Rock, Afrobeats…" className="input w-full text-sm" />
          </Field>
          <Field label="Date prévue *" error={errors.schedAt}>
            <input type="datetime-local" value={schedAt}
              onChange={e => { setSchedAt(e.target.value); setErrors(v => ({ ...v, schedAt: undefined })); }}
              className="input w-full text-sm" style={errors.schedAt ? { borderColor: '#7B3FF2' } : {}} />
          </Field>
        </div>

        <Field label="Type de concert">
          <div className="flex gap-2">
            {CONCERT_TYPES.map(t => (
              <button key={t.value} onClick={() => setConcertType(t.value)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: concertType === t.value ? 'rgba(123,63,242,0.12)' : 'var(--bg-secondary)',
                  color:      concertType === t.value ? '#7B3FF2' : 'var(--text-secondary)',
                  border:     `1px solid ${concertType === t.value ? '#7B3FF250' : 'var(--border)'}`,
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Accès">
          <div className="grid grid-cols-2 gap-2">
            {CONCERT_ACCESS.map(a => (
              <button key={a.value} onClick={() => setAccessType(a.value)}
                className="py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: accessType === a.value ? 'rgba(123,63,242,0.12)' : 'var(--bg-secondary)',
                  color:      accessType === a.value ? 'var(--primary)' : 'var(--text-secondary)',
                  border:     `1px solid ${accessType === a.value ? 'rgba(123,63,242,0.3)' : 'var(--border)'}`,
                }}>
                {a.label}
              </button>
            ))}
          </div>
          {accessType === 'ticket' && (
            <input value={price} onChange={e => setPrice(e.target.value)}
              type="number" min="0" placeholder="Prix (€)" className="input w-full text-sm mt-2" />
          )}
        </Field>

        {/* Lieu */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-tertiary)' }}>Lieu *</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Ville *" error={errors.venueCity}>
              <input value={venueCity}
                onChange={e => { setVenueCity(e.target.value); setErrors(v => ({ ...v, venueCity: undefined })); }}
                placeholder="Paris, Abidjan…" className="input text-sm"
                style={errors.venueCity ? { borderColor: '#7B3FF2' } : {}} />
            </Field>
            <Field label="Pays *" error={errors.venueCountry}>
              <input value={venueCountry}
                onChange={e => { setVenueCountry(e.target.value); setErrors(v => ({ ...v, venueCountry: undefined })); }}
                placeholder="France, Côte d'Ivoire…" className="input text-sm"
                style={errors.venueCountry ? { borderColor: '#7B3FF2' } : {}} />
            </Field>
          </div>
          <input value={venueName} onChange={e => setVenueName(e.target.value)}
            placeholder="Salle de concert (optionnel)" className="input w-full text-sm mt-2" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Durée (minutes)">
            <input value={durationMin} onChange={e => setDurationMin(e.target.value)}
              type="number" min="1" placeholder="Ex: 120" className="input w-full text-sm" />
          </Field>
          <Field label="Spectateurs max">
            <input value={maxViewers} onChange={e => setMaxViewers(e.target.value)}
              type="number" min="1" placeholder="Illimité si vide" className="input w-full text-sm" />
          </Field>
        </div>

        {apiError && <ErrorBanner msg={apiError} />}

        <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={() => submit('draft')} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
            Brouillon
          </button>
          <button onClick={() => submit('published')} disabled={saving}
            className="flex-1 btn-primary flex items-center justify-center gap-2">
            {saving ? <Spinner size="sm" /> : null} Publier
          </button>
        </div>
      </div>
    </ModalBox>
  );
}

// ── FAB principal ─────────────────────────────────────────────────────────────

type Modal = 'post' | 'reel' | null;

const FAB_ACTIONS = [
  { id: 'post'    as const, label: 'Post',      icon: FileText, color: '#7B3FF2', route: null           },
  { id: 'reel'    as const, label: 'Reel',      icon: Film,     color: '#7B3FF2', route: null           },
  { id: 'event'   as const, label: 'Événement', icon: Calendar, color: '#7B3FF2', route: '/create/event'   },
  { id: 'concert' as const, label: 'Concert',   icon: Music2,   color: '#7B3FF2', route: '/create/concert' },
];

export function CreateFAB() {
  const navigate = useNavigate();
  const [open,  setOpen]  = useState(false);
  const [modal, setModal] = useState<Modal>(null);

  function handleAction(action: typeof FAB_ACTIONS[number]) {
    setOpen(false);
    if (action.route) {
      navigate(action.route);
    } else {
      setModal(action.id as Modal);
    }
  }

  function closeModal() { setModal(null); }
  function onDone()     { setModal(null); }

  return (
    <>
      <div className="fixed bottom-20 right-5 lg:bottom-8 lg:right-8 z-30 flex flex-col items-end gap-3">
        {open && FAB_ACTIONS.map((action, i) => (
          <div key={action.id} className="flex items-center gap-3"
            style={{ animation: `fade-up 0.15s ease ${i * 0.05}s both` }}>
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg"
              style={{ background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
              {action.label}
            </span>
            <button onClick={() => handleAction(action)}
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-transform hover:scale-110 active:scale-95"
              style={{ background: action.color }}>
              <action.icon size={20} color="#fff" />
            </button>
          </div>
        ))}

        <button onClick={() => setOpen(v => !v)}
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-200"
          style={{
            background: open ? 'var(--surface)' : 'linear-gradient(135deg,#7B3FF2,#5B2EC4)',
            border:     open ? '2px solid var(--border)' : 'none',
            transform:  open ? 'rotate(45deg)' : 'rotate(0deg)',
          }}>
          <Plus size={26} color={open ? 'var(--text-primary)' : '#fff'} />
        </button>
      </div>

      {open && <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />}

      {modal === 'post' && <CreatePostModal onClose={closeModal} onDone={onDone} />}
      {modal === 'reel' && <CreateReelModal onClose={closeModal} onDone={onDone} />}
    </>
  );
}
