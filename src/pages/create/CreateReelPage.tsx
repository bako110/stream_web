import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Video, Upload, Repeat2 } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints'; // used for reels.feed
import { Spinner } from '../../components/ui/Spinner';
import { uploadVideoHls, uploadImageAsReel } from '../../api/uploadVideo';
import { ReelEditor } from '../../components/reel-editor/ReelEditor';
import { createDefaultEditState } from '../../components/reel-editor/types';
import type { ReelEditState } from '../../components/reel-editor/types';
import toast from 'react-hot-toast';

// Alignée sur MAX_VIDEO_DURATION_SEC côté mobile (CreateReelScreen.tsx) — un
// reel vidéo ne peut pas dépasser 10 minutes.
const MAX_VIDEO_DURATION_SEC = 10 * 60;

function readVideoDuration(file: File): Promise<number> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(v.duration || 0); };
    v.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    v.src = url;
  });
}

export default function CreateReelPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sourceReelId = params.get('sourceReelId') ?? undefined;

  const [caption,      setCaption]      = useState('');
  const [mediaFile,    setMediaFile]    = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isPhoto,      setIsPhoto]      = useState(false);
  const [publishing,   setPublishing]   = useState(false);
  const [uploadPct,    setUploadPct]    = useState(0);
  const [edit,         setEdit]         = useState<ReelEditState>(createDefaultEditState());

  const mediaInputRef = useRef<HTMLInputElement>(null);

  const canPublish = !!mediaFile;

  const handlePickMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const fileIsPhoto = file.type.startsWith('image/');
    if (!fileIsPhoto) {
      const dur = await readVideoDuration(file);
      if (dur > MAX_VIDEO_DURATION_SEC) {
        toast.error(`La vidéo dure ${Math.round(dur / 60)} min. La durée maximale autorisée est de 10 minutes.`);
        return;
      }
    }

    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setIsPhoto(fileIsPhoto);
    setEdit(createDefaultEditState());
  };

  const removeMedia = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
  };

  const handlePublish = async () => {
    if (!mediaFile || publishing) return;
    setPublishing(true);
    setUploadPct(0);
    try {
      const uploaded = isPhoto
        ? await uploadImageAsReel(mediaFile, 5, setUploadPct)
        : await uploadVideoHls(mediaFile, 'reels', setUploadPct);

      // Noms de champs POST (ReelCreate) : "filter" (pas "filter_name", réservé
      // à la lecture/ReelResponse). Trim vidéo/vitesse non envoyés — comportement
      // de preview uniquement côté web (pas de ré-encodage client), cohérent avec
      // le mobile qui ne les envoie pas non plus (le trim y est déjà "brûlé" dans
      // le fichier avant upload).
      await apiClient.post(Endpoints.reels.feed, {
        hls_url:        uploaded.hls_url,
        thumbnail_url:  uploaded.thumbnail_url,
        duration_sec:   isPhoto ? 5 : (uploaded.duration ? Math.round(uploaded.duration) : undefined),
        caption:        caption.trim() || undefined,
        ...(edit.filter !== 'original' ? { filter: edit.filter } : {}),
        ...(edit.layers.length ? { text_layers: JSON.stringify(edit.layers) } : {}),
        ...(edit.stickers.length ? { sticker_layers: JSON.stringify(edit.stickers) } : {}),
        ...(edit.drawings.length ? { draw_layers: JSON.stringify(edit.drawings) } : {}),
        ...(Object.values(edit.adjust).some(v => v !== 0) ? { video_adjust: JSON.stringify(edit.adjust) } : {}),
        ...(edit.musicUrl ? {
          music_url:       edit.musicUrl,
          music_name:      edit.musicName,
          music_start_sec: edit.musicStartSec,
          music_end_sec:   edit.musicEndSec,
        } : {}),
        source_reel_id: sourceReelId,
        remix_type:     sourceReelId ? 'remix' : undefined,
      });

      toast.success('Reel publié !');
      navigate(-1);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur lors de la publication');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="w-full mx-auto" style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={20} />
        </button>
        <p className="flex-1 font-black text-lg flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          {sourceReelId && <Repeat2 size={16} style={{ color: 'var(--primary)' }} />}
          {sourceReelId ? 'Remixer' : 'Nouveau Reel'}
        </p>
        <button onClick={handlePublish} disabled={!canPublish || publishing}
          className="px-4 py-2 rounded-xl text-sm font-black disabled:opacity-40 transition-all"
          style={{ background: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
          Envoyer
        </button>
      </div>

      {/* Upload hint */}
      {mediaFile && !publishing && (
        <div className="flex items-center gap-2 px-4 py-2"
          style={{ background: 'rgba(123,63,242,0.08)', borderBottom: '1px solid rgba(123,63,242,0.15)' }}>
          <Upload size={13} style={{ color: 'var(--primary)' }} />
          <span className="text-xs" style={{ color: 'var(--primary)' }}>
            Upload en cours après "Envoyer"
          </span>
        </div>
      )}

      {/* Progress bar */}
      {publishing && (
        <div className="px-4 py-2 flex items-center gap-3"
          style={{ background: 'rgba(123,63,242,0.08)', borderBottom: '1px solid rgba(123,63,242,0.15)' }}>
          <Spinner size="sm" />
          <div className="flex-1">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${uploadPct}%`, background: 'var(--primary)' }} />
            </div>
          </div>
          <span className="text-xs font-bold" style={{ color: 'var(--primary)' }}>{uploadPct}%</span>
        </div>
      )}

      {/* Media zone / éditeur */}
      {mediaPreview ? (
        <ReelEditor
          mediaUrl={mediaPreview}
          isPhoto={isPhoto}
          onChange={setEdit}
        />
      ) : (
        <div className="relative flex flex-col items-center justify-center"
          style={{ background: '#000', aspectRatio: '9/16', maxHeight: 480 }}>
          <div className="flex flex-col items-center gap-3 py-12">
            <Video size={48} style={{ color: 'var(--primary)' }} />
            <p className="text-white font-bold text-lg">Ajouter une photo ou vidéo</p>
            <p className="text-white/50 text-sm">Vidéo max 10 min · Photo JPEG/PNG/WebP</p>
            <button onClick={() => mediaInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white mt-2"
              style={{ background: 'var(--primary)' }}>
              <Upload size={15} />
              Choisir depuis l'appareil
            </button>
          </div>
        </div>
      )}
      {mediaPreview && (
        <div className="px-4 pt-3">
          <button onClick={removeMedia}
            className="text-xs font-bold"
            style={{ color: 'var(--text-tertiary)' }}>
            Retirer {isPhoto ? 'la photo' : 'la vidéo'}
          </button>
        </div>
      )}

      <input ref={mediaInputRef} type="file" accept="image/*,video/*" hidden onChange={handlePickMedia} />

      {/* Caption */}
      <div className="px-4 py-5">
        <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
          Description
        </p>
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Décris ton reel… #hashtag @mention"
          maxLength={300}
          rows={4}
          className="w-full outline-none resize-none rounded-xl px-4 py-3 text-sm leading-relaxed"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
        <p className="text-xs text-right mt-1" style={{ color: 'var(--text-tertiary)' }}>{caption.length}/300</p>
      </div>

      {/* Publish CTA */}
      <div className="px-4 pb-8">
        <button onClick={handlePublish} disabled={!canPublish || publishing}
          className="w-full py-4 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
          style={{ background: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', boxShadow: canPublish ? '0 6px 24px rgba(123,63,242,0.4)' : 'none' }}>
          {publishing ? <Spinner size="sm" /> : <><Upload size={15} /> Publier le Reel</>}
        </button>
      </div>
    </div>
  );
}
