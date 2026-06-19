import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Video, Upload, X, Play } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints'; // used for reels.feed
import { Spinner } from '../../components/ui/Spinner';
import { uploadVideoHls } from '../../api/uploadVideo';
import { SoundPickerSheet, SoundBar } from '../../components/ui/SoundPickerSheet';
import type { Sound } from '../../types';
import toast from 'react-hot-toast';

export default function CreateReelPage() {
  const navigate = useNavigate();

  const [caption,      setCaption]      = useState('');
  const [videoFile,    setVideoFile]    = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [paused,       setPaused]       = useState(false);
  const [publishing,   setPublishing]   = useState(false);
  const [uploadPct,    setUploadPct]    = useState(0);
  const [sound,        setSound]        = useState<Sound | null>(null);
  const [soundOpen,    setSoundOpen]    = useState(false);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoRef      = useRef<HTMLVideoElement>(null);

  const canPublish = !!videoFile;

  const handlePickVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setPaused(false);
    e.target.value = '';
  };

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
  };

  const togglePause = () => {
    if (!videoRef.current) return;
    if (paused) { videoRef.current.play(); setPaused(false); }
    else        { videoRef.current.pause(); setPaused(true); }
  };

  const handlePublish = async () => {
    if (!videoFile || publishing) return;
    setPublishing(true);
    setUploadPct(0);
    try {
      const uploaded = await uploadVideoHls(videoFile, 'reels', setUploadPct);

      await apiClient.post(Endpoints.reels.feed, {
        hls_url:       uploaded.hls_url,
        thumbnail_url: uploaded.thumbnail_url,
        duration_sec:  uploaded.duration ? Math.round(uploaded.duration) : undefined,
        caption:       caption.trim() || undefined,
        music_url:     sound?.file_url,
        music_name:    sound ? `${sound.title}${sound.artist_name ? ` — ${sound.artist_name}` : ''}` : undefined,
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
    <div className="max-w-2xl mx-auto" style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={20} />
        </button>
        <p className="flex-1 font-black text-lg" style={{ color: 'var(--text-primary)' }}>Nouveau Reel</p>
        <button onClick={handlePublish} disabled={!canPublish || publishing}
          className="px-4 py-2 rounded-xl text-sm font-black disabled:opacity-40 transition-all"
          style={{ background: 'var(--bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
          Envoyer
        </button>
      </div>

      {/* Upload hint */}
      {videoFile && !publishing && (
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

      {/* Video zone */}
      <div className="relative flex flex-col items-center justify-center"
        style={{ background: '#000', aspectRatio: '9/16', maxHeight: 480 }}>

        {videoPreview ? (
          <>
            <video
              ref={videoRef}
              src={videoPreview}
              className="w-full h-full object-cover"
              autoPlay
              loop
              playsInline
              onClick={togglePause}
              style={{ cursor: 'pointer' }}
            />
            {paused && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.5)' }}>
                  <Play size={30} color="#fff" />
                </div>
              </div>
            )}
            <button onClick={removeVideo}
              className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.55)' }}>
              <X size={18} color="#fff" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-12">
            <Video size={48} style={{ color: 'var(--primary)' }} />
            <p className="text-white font-bold text-lg">Ajouter une vidéo</p>
            <p className="text-white/50 text-sm">MP4 · Max 60 s · 1080p recommandé</p>
            <button onClick={() => videoInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white mt-2"
              style={{ background: 'var(--primary)' }}>
              <Upload size={15} />
              Choisir depuis l'appareil
            </button>
          </div>
        )}

        <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={handlePickVideo} />
      </div>

      {/* Son */}
      <div className="px-4 pt-5">
        <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
          Son
        </p>
        <SoundBar sound={sound} onOpen={() => setSoundOpen(true)} onRemove={() => setSound(null)} />
      </div>

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

      {/* Sound picker */}
      <SoundPickerSheet
        open={soundOpen}
        onClose={() => setSoundOpen(false)}
        onSelect={setSound}
        selected={sound}
      />

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
