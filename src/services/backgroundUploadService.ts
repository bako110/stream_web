/**
 * backgroundUploadService — upload en arrière-plan découplé du composant React
 * qui l'a déclenché, calqué sur backgroundUploadService.ts côté mobile
 * (stream_mobile/src/services/backgroundUploadService.ts). Sans ça, la page
 * de création restait bloquée sur `await upload(...)` avant de pouvoir
 * naviguer — ici on enfile le job (fire-and-forget) et on notifie via toast
 * à la fin (succès ou échec), la navigation peut se faire immédiatement.
 */
import toast from 'react-hot-toast';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';
import { uploadVideoHls, uploadImageAsReel } from '../api/uploadVideo';
import { extractApiErrorMessage } from '../utils/apiError';

async function uploadImageFile(file: File, folder: string): Promise<string> {
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

// ── Posts ──────────────────────────────────────────────────────────────────

export interface EnqueuePostArgs {
  body: string;
  feeling?: string | null;
  isPrivate: boolean;
  images: File[];
  video: File | null;
  // Édition d'un post existant
  editId?: string;
  existingImageUrls?: string[];
  existingVideoUrl?: string | null;
  mediaCleared?: boolean;
}

function enqueuePost(args: EnqueuePostArgs): void {
  (async () => {
    try {
      let image_url: string | undefined;
      let image_urls: string[] | undefined;
      let video_url: string | undefined;

      if (args.images.length === 1) {
        image_url = await uploadImageFile(args.images[0], 'posts');
      } else if (args.images.length > 1) {
        image_urls = await Promise.all(args.images.map(f => uploadImageFile(f, 'posts')));
        image_url  = image_urls[0];
      }
      if (args.video) {
        const uploaded = await uploadVideoHls(args.video, 'posts');
        video_url = uploaded.hls_url ?? uploaded.url;
      }

      if (args.editId) {
        const noNewMedia = !image_url && !image_urls && !video_url;
        await apiClient.put(Endpoints.posts.byId(args.editId), {
          body:        args.body.trim() || undefined,
          feeling:     args.feeling ?? undefined,
          is_private:  args.isPrivate,
          image_url,
          image_urls,
          video_url,
          clear_media: noNewMedia && args.mediaCleared ? true : undefined,
        });
        toast.success('Post mis à jour !');
      } else {
        const res = await apiClient.post<{ status?: string }>(Endpoints.posts.create, {
          body:      args.body.trim() || undefined,
          feeling:   args.feeling ?? undefined,
          is_private: args.isPrivate,
          image_url,
          image_urls,
          video_url,
        });
        if (res.data?.status === 'pending_review') {
          toast.success('Publication envoyée, en cours de vérification. Elle sera visible une fois confirmée.');
        } else {
          toast.success('Post publié !');
        }
      }
    } catch (e) {
      toast.error(extractApiErrorMessage(e, args.editId ? 'Erreur lors de la mise à jour' : 'Erreur lors de la publication'));
    }
  })();
}

// ── Reels ──────────────────────────────────────────────────────────────────

export interface EnqueueReelArgs {
  mediaFile: File;
  isPhoto: boolean;
  caption: string;
  edit: {
    filter: string;
    layers: unknown[];
    stickers: unknown[];
    drawings: unknown[];
    adjust: Record<string, number>;
    musicUrl?: string;
    musicName?: string;
    musicStartSec?: number;
    musicEndSec?: number;
  };
  sourceReelId?: string;
}

function enqueueReel(args: EnqueueReelArgs): void {
  (async () => {
    try {
      const uploaded = args.isPhoto
        ? await uploadImageAsReel(args.mediaFile, 5)
        : await uploadVideoHls(args.mediaFile, 'reels');

      const { edit } = args;
      await apiClient.post(Endpoints.reels.feed, {
        hls_url:        uploaded.hls_url,
        thumbnail_url:  uploaded.thumbnail_url,
        duration_sec:   args.isPhoto ? 5 : (uploaded.duration ? Math.round(uploaded.duration) : undefined),
        caption:        args.caption.trim() || undefined,
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
        source_reel_id: args.sourceReelId,
        remix_type:     args.sourceReelId ? 'remix' : undefined,
      });

      toast.success('Reel publié !');
    } catch (e) {
      toast.error(extractApiErrorMessage(e, 'Erreur lors de la publication'));
    }
  })();
}

// ── Stories ────────────────────────────────────────────────────────────────

export interface EnqueueStoryArgs {
  // 'pick' inclus pour matcher le type Mode de StoryEditorPage.tsx (le
  // bouton "publier" n'est atteignable qu'une fois un mode de contenu
  // choisi, mais le state React reste typé au sens large) — ignoré ici.
  mode: 'pick' | 'text' | 'image' | 'video';
  mediaSrc: string | null;
  mediaFile: File | null;
  bgGrad: string;
  caption: string;
  overlaysJson?: string;
  audience: string;
  soundId?: string;
  soundFileUrl?: string;
  soundName?: string;
}

function enqueueStory(args: EnqueueStoryArgs): void {
  (async () => {
    try {
      let media_url: string | undefined;
      let thumbnail_url: string | undefined;
      let duration_sec = 5;

      if (args.mode === 'text') {
        const canvas = document.createElement('canvas');
        canvas.width = 1080; canvas.height = 1920;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#7B3FF2';
          ctx.fillRect(0, 0, 1080, 1920);
        }
        const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.9));
        if (blob) {
          const fd = new FormData();
          fd.append('file', blob, 'story_text.jpg');
          const res = await apiClient.upload<any>(Endpoints.upload.images('stories'), fd);
          const uploaded = res.data?.uploaded?.[0] ?? res.data;
          media_url = uploaded?.url ?? uploaded;
          thumbnail_url = media_url;
        }
        await apiClient.post(Endpoints.stories.create, {
          media_url,
          media_type: 'text',
          thumbnail_url,
          caption: args.caption.trim() || undefined,
          duration_sec: 5,
          background_color: typeof args.bgGrad === 'string' && args.bgGrad.startsWith('#') ? args.bgGrad : '#7B3FF2',
          audio_url: args.soundFileUrl,
          audio_name: args.soundName,
          overlays_json: args.overlaysJson,
          audience_type: args.audience,
        });
      } else if (args.mode === 'image' && args.mediaSrc) {
        const isDataUrl = args.mediaSrc.startsWith('data:');
        if (isDataUrl) {
          const res = await fetch(args.mediaSrc);
          const blob = await res.blob();
          const fd = new FormData();
          fd.append('file', blob, 'story.jpg');
          const up = await apiClient.upload<any>(Endpoints.upload.images('stories'), fd);
          const uploaded = up.data?.uploaded?.[0] ?? up.data;
          media_url = uploaded?.url ?? uploaded;
          thumbnail_url = media_url;
        } else if (args.mediaFile) {
          const fd = new FormData();
          fd.append('file', args.mediaFile);
          const up = await apiClient.upload<any>(Endpoints.upload.images('stories'), fd);
          const uploaded = up.data?.uploaded?.[0] ?? up.data;
          media_url = uploaded?.url ?? uploaded;
          thumbnail_url = media_url;
        }
        await apiClient.post(Endpoints.stories.create, {
          media_url,
          media_type: 'image',
          thumbnail_url,
          caption: args.caption.trim() || undefined,
          duration_sec: 5,
          audio_url: args.soundFileUrl,
          audio_name: args.soundName,
          overlays_json: args.overlaysJson,
          audience_type: args.audience,
        });
      } else if (args.mode === 'video' && args.mediaFile) {
        const uploaded = await uploadVideoHls(args.mediaFile, 'stories');
        media_url = uploaded.hls_url ?? uploaded.url;
        thumbnail_url = uploaded.thumbnail_url;
        duration_sec = uploaded.duration ? Math.min(Math.ceil(uploaded.duration), 90) : 10;
        await apiClient.post(Endpoints.stories.create, {
          media_url,
          media_type: 'video',
          thumbnail_url,
          caption: args.caption.trim() || undefined,
          duration_sec,
          audio_url: args.soundFileUrl,
          audio_name: args.soundName,
          overlays_json: args.overlaysJson,
          audience_type: args.audience,
        });
      }

      if (args.soundId) apiClient.post(Endpoints.sounds.use(args.soundId)).catch(() => {});
      toast.success('Story publiée !');
    } catch (e) {
      toast.error(extractApiErrorMessage(e, 'Erreur lors de la publication'));
    }
  })();
}

export const backgroundUploadService = {
  enqueuePost,
  enqueueReel,
  enqueueStory,
};
