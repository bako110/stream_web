import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Image, Video, Smile, X, Globe, Users, ChevronDown, Check } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';
import { Spinner, PageLoader } from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { backgroundUploadService } from '../../services/backgroundUploadService';

const FEELINGS = [
  'Content', 'Triste', 'Heureux', 'Motivé',
  'Excité', 'Cool', 'Pensif', 'Fier',
  'Amoureux', 'Déterminé', 'En fête', 'Fatigué',
];

const MAX_IMAGES = 6;

export default function CreatePostPage() {
  const navigate   = useNavigate();
  const user       = useAuthStore(s => s.user);
  const [params]   = useSearchParams();
  const editId     = params.get('edit');
  const isEdit     = !!editId;

  const [loadingEdit,  setLoadingEdit]  = useState(isEdit);
  const [body,         setBody]         = useState('');
  const [feeling,      setFeeling]      = useState<string | null>(null);
  const [images,       setImages]       = useState<File[]>([]);
  const [imagePreviews,setImagePreviews]= useState<string[]>([]);
  const [video,        setVideo]        = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [showFeelings, setShowFeelings] = useState(false);
  const [publishing,   setPublishing]   = useState(false);
  const [isPrivate,    setIsPrivate]    = useState(false);
  const [showVisibility, setShowVisibility] = useState(false);

  // Médias existants conservés en mode édition (tant qu'on n'y touche pas)
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [existingVideoUrl,  setExistingVideoUrl]  = useState<string | null>(null);
  const [mediaCleared,      setMediaCleared]      = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // ── Charger le post existant en mode édition ───────────────────────────────
  useEffect(() => {
    if (!editId) return;
    apiClient.get<any>(Endpoints.posts.byId(editId))
      .then(r => {
        const p = r.data?.data ?? r.data;
        setBody(p.body ?? '');
        setFeeling(p.feeling ?? null);
        setIsPrivate(!!p.is_private);
        const urls: string[] = p.image_urls?.length ? p.image_urls : (p.image_url ? [p.image_url] : []);
        if (urls.length) { setExistingImageUrls(urls); setImagePreviews(urls); }
        if (p.video_url || p.hls_url) setExistingVideoUrl(p.video_url ?? p.hls_url);
      })
      .catch(() => toast.error('Impossible de charger le post'))
      .finally(() => setLoadingEdit(false));
  }, [editId]);

  const displayName = user?.display_name ?? user?.first_name ?? user?.username ?? '';
  const initials    = displayName ? displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '?';
  const hasExistingMedia = !mediaCleared && (existingImageUrls.length > 0 || !!existingVideoUrl);
  const canPost     = body.trim().length > 0 || images.length > 0 || !!video || hasExistingMedia;

  const handleImages = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (video || existingVideoUrl) { toast.error('Retire la vidéo pour ajouter des photos.'); return; }
    const files = Array.from(e.target.files ?? []).slice(0, MAX_IMAGES - images.length);
    const newImages = [...images, ...files].slice(0, MAX_IMAGES);
    setImages(newImages);
    // Nouvelles photos ajoutées → on abandonne les anciennes (remplacement total)
    setExistingImageUrls([]);
    setImagePreviews(newImages.map(f => URL.createObjectURL(f)));
    e.target.value = '';
  }, [images, video, existingVideoUrl]);

  const handleVideo = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (images.length > 0 || existingImageUrls.length > 0) { toast.error('Retire les photos pour ajouter une vidéo.'); return; }
    const file = e.target.files?.[0];
    if (!file) return;
    setVideo(file);
    setExistingVideoUrl(null);
    setVideoPreview(URL.createObjectURL(file));
    e.target.value = '';
  }, [images, existingImageUrls]);

  const removeImage = (idx: number) => {
    if (existingImageUrls.length > 0) {
      // On supprime dans les médias existants
      const next = existingImageUrls.filter((_, i) => i !== idx);
      setExistingImageUrls(next);
      setImagePreviews(next);
      if (next.length === 0) setMediaCleared(true);
      return;
    }
    const next = images.filter((_, i) => i !== idx);
    setImages(next);
    setImagePreviews(next.map(f => URL.createObjectURL(f)));
  };

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideo(null);
    setVideoPreview(null);
    if (existingVideoUrl) { setExistingVideoUrl(null); setMediaCleared(true); }
  };

  // Upload en arrière-plan, découplé du cycle de vie de cette page — comme
  // le mobile (backgroundUploadService), on enfile le job puis on navigue
  // immédiatement, la confirmation (succès/échec) arrive en toast une fois
  // l'upload terminé, que l'utilisateur soit resté ici ou soit déjà parti.
  const handlePublish = () => {
    if (!canPost || publishing) return;
    setPublishing(true);
    toast('Publication en cours…', { icon: '📤' });
    backgroundUploadService.enqueuePost({
      body, feeling, isPrivate, images, video,
      editId: isEdit ? editId! : undefined,
      existingImageUrls, existingVideoUrl, mediaCleared,
    });
    navigate(-1);
  };

  if (loadingEdit) return <PageLoader />;

  return (
    <div className="w-full mx-auto" style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl" style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={20} />
        </button>
        <p className="flex-1 font-black text-base" style={{ color: 'var(--text-primary)' }}>
          {isEdit ? 'Modifier le post' : 'Créer un post'}
        </p>
        <button onClick={handlePublish} disabled={!canPost || publishing}
          className="px-4 py-2 rounded-xl text-sm font-black text-white disabled:opacity-40 flex items-center gap-2"
          style={{ background: 'var(--primary)' }}>
          {publishing && <Spinner size="sm" />}
          {isEdit ? 'Enregistrer' : 'Publier'}
        </button>
      </div>

      {/* Author row */}
      <div className="flex items-center gap-3 px-4 py-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        {user?.avatar_url
          ? <img src={user.avatar_url} className="w-12 h-12 rounded-full object-cover" alt="" />
          : <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-black"
              style={{ background: 'rgba(123,63,242,0.15)', color: 'var(--primary)' }}>{initials}</div>
        }
        <div className="min-w-0">
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{displayName}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {feeling && (
              <p className="text-xs" style={{ color: 'var(--primary)' }}>se sent {feeling}</p>
            )}
            <div className="relative">
              <button onClick={() => setShowVisibility(v => !v)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors"
                style={{ background: showVisibility ? 'var(--bg-secondary)' : 'transparent' }}>
                {isPrivate ? (
                  <Users size={11} style={{ color: 'var(--text-tertiary)' }} />
                ) : (
                  <Globe size={11} style={{ color: 'var(--text-tertiary)' }} />
                )}
                <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  {isPrivate ? 'Amis' : 'Public'}
                </span>
                <ChevronDown size={10} style={{ color: 'var(--text-tertiary)' }} />
              </button>

              {showVisibility && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowVisibility(false)} />
                  <div className="absolute top-full left-0 mt-1 z-20 rounded-xl overflow-hidden"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', minWidth: 200 }}>
                    <button onClick={() => { setIsPrivate(false); setShowVisibility(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
                      style={{ background: !isPrivate ? 'var(--bg-secondary)' : 'transparent' }}>
                      <Globe size={16} style={{ color: 'var(--text-secondary)' }} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Public</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Tout le monde peut voir</p>
                      </div>
                      {!isPrivate && <Check size={14} style={{ color: 'var(--primary)' }} />}
                    </button>
                    <button onClick={() => { setIsPrivate(true); setShowVisibility(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
                      style={{ background: isPrivate ? 'var(--bg-secondary)' : 'transparent' }}>
                      <Users size={16} style={{ color: 'var(--text-secondary)' }} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Amis</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Vos abonnés seulement</p>
                      </div>
                      {isPrivate && <Check size={14} style={{ color: 'var(--primary)' }} />}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Text input */}
      <div className="px-4 py-3" style={{ background: 'var(--surface)' }}>
        <textarea
          className="w-full bg-transparent outline-none resize-none text-lg leading-relaxed"
          style={{ color: 'var(--text-primary)', minHeight: 120 }}
          placeholder="Quoi de neuf ?"
          maxLength={2000}
          value={body}
          onChange={e => setBody(e.target.value)}
        />
      </div>

      {/* Video preview (nouvelle sélection ou vidéo existante) */}
      {(videoPreview || existingVideoUrl) && (
        <div className="mx-4 mb-3 rounded-2xl overflow-hidden relative" style={{ aspectRatio: '16/9' }}>
          <video src={videoPreview ?? existingVideoUrl!} className="w-full h-full object-cover" controls />
          <button onClick={removeVideo}
            className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)' }}>
            <X size={16} color="#fff" />
          </button>
        </div>
      )}

      {/* Image grid (nouvelles sélections ou images existantes) */}
      {!video && !existingVideoUrl && imagePreviews.length > 0 && (
        <div className="mx-4 mb-3">
          <div className={`grid gap-1 rounded-2xl overflow-hidden ${imagePreviews.length === 1 ? 'grid-cols-1' : imagePreviews.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}
            style={{ aspectRatio: imagePreviews.length === 1 ? '16/9' : '1' }}>
            {imagePreviews.slice(0, 4).map((src, i) => (
              <div key={i} className="relative" style={{ aspectRatio: imagePreviews.length >= 3 ? '1' : 'auto' }}>
                <img src={src} className="w-full h-full object-cover" alt="" />
                {i === 3 && imagePreviews.length > 4 && (
                  <div className="absolute inset-0 flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.55)' }}>
                    <span className="text-white font-black text-2xl">+{imagePreviews.length - 4}</span>
                  </div>
                )}
                {!(i === 3 && imagePreviews.length > 4) && (
                  <button onClick={() => removeImage(i)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.6)' }}>
                    <X size={12} color="#fff" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {imagePreviews.length < MAX_IMAGES && (
            <button onClick={() => imageInputRef.current?.click()}
              className="mt-2 w-full py-2 rounded-xl text-xs font-bold border-dashed border-2 flex items-center justify-center gap-1"
              style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
              + Ajouter des photos
            </button>
          )}
        </div>
      )}

      {/* Feelings panel */}
      {showFeelings && (
        <div className="px-4 py-3" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
          <p className="text-xs font-bold mb-3" style={{ color: 'var(--text-secondary)' }}>Comment te sens-tu ?</p>
          <div className="flex flex-wrap gap-2">
            {FEELINGS.map(f => (
              <button key={f}
                onClick={() => { setFeeling(feeling === f ? null : f); setShowFeelings(false); }}
                className="px-3 py-1.5 rounded-full text-sm border transition-all"
                style={{
                  background: feeling === f ? 'rgba(123,63,242,0.15)' : 'var(--bg)',
                  borderColor: feeling === f ? 'var(--primary)' : 'var(--border)',
                  color: feeling === f ? 'var(--primary)' : 'var(--text-primary)',
                }}>
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="sticky bottom-0 flex items-center justify-between px-4 py-3"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Ajouter</span>
        <div className="flex items-center gap-2">
          <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={handleImages} />
          <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={handleVideo} />

          <button onClick={() => imageInputRef.current?.click()} disabled={!!video || !!existingVideoUrl}
            className="w-10 h-10 flex items-center justify-center rounded-full relative disabled:opacity-40"
            style={{ background: 'rgba(76,175,80,0.1)' }}>
            <Image size={20} color="#4CAF50" />
            {imagePreviews.length > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-white"
                style={{ background: 'var(--primary)' }}>{imagePreviews.length}</span>
            )}
          </button>

          <button onClick={() => videoInputRef.current?.click()} disabled={imagePreviews.length > 0}
            className="w-10 h-10 flex items-center justify-center rounded-full disabled:opacity-40"
            style={{ background: (video || existingVideoUrl) ? 'rgba(123,63,242,0.15)' : 'var(--bg)' }}>
            <Video size={20} style={{ color: 'var(--primary)' }} />
          </button>

          <button onClick={() => setShowFeelings(v => !v)}
            className="w-10 h-10 flex items-center justify-center rounded-full"
            style={{ background: showFeelings ? 'rgba(123,63,242,0.15)' : 'var(--bg)' }}>
            <Smile size={20} style={{ color: showFeelings ? 'var(--primary)' : 'var(--text-secondary)' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
