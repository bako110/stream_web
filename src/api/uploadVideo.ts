/**
 * Upload vidéo avec attente du pipeline HLS backend.
 * Le backend traite la vidéo en background (FFmpeg → segments .ts + master.m3u8).
 * On poll /upload/video/status/{job_id} toutes les 4s jusqu'à status=done.
 */

export interface UploadedVideo {
  url:            string;
  public_id?:     string;
  job_id?:        string;
  duration?:      number;
  thumbnail_url?: string;
  hls_url?:       string;
  width?:         number;
  height?:        number;
  format?:        string;
}

function getToken(): string {
  try { return JSON.parse(localStorage.getItem('gofolix-auth-tokens') ?? '{}').access ?? ''; }
  catch { return ''; }
}

function xhrUpload(
  file: File,
  folder: string,
  onProgress?: (pct: number) => void,
): Promise<UploadedVideo> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file);
    const token = getToken();
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/v1/upload/video?folder=${folder}`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 70));
    };
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve((json?.data ?? json) as UploadedVideo);
        else reject(new Error(json?.detail ?? json?.message ?? 'Upload vidéo échoué'));
      } catch { reject(new Error('Réponse invalide du serveur')); }
    };
    xhr.onerror = () => reject(new Error('Erreur réseau pendant l\'upload'));
    xhr.send(fd);
  });
}

async function pollHls(
  jobId: string,
  initialData: UploadedVideo,
  onProgress?: (pct: number) => void,
): Promise<UploadedVideo> {
  const token = getToken();
  const MAX_POLLS = 75;
  const INTERVAL = 4_000;
  const MAX_NET_ERRORS = 3;
  let netErrors = 0;

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise<void>(r => setTimeout(r, INTERVAL));
    onProgress?.(Math.min(95, 70 + Math.round(i * 25 / MAX_POLLS)));
    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/v1/upload/video/status/${jobId}`, { headers });
      const status = await res.json() as any;
      netErrors = 0;
      if (status.status === 'done') {
        onProgress?.(100);
        return {
          url:           status.url           ?? initialData.url,
          public_id:     initialData.public_id ?? initialData.url,
          job_id:        jobId,
          duration:      status.duration      ?? initialData.duration,
          thumbnail_url: status.thumbnail_url ?? initialData.thumbnail_url,
          hls_url:       status.hls_url       ?? undefined,
          width:         status.width         ?? initialData.width,
          height:        status.height        ?? initialData.height,
        };
      }
      if (status.status === 'error') break;
    } catch {
      netErrors++;
      if (netErrors >= MAX_NET_ERRORS) break;
    }
  }

  const fallback = initialData.hls_url;
  if (!fallback) throw new Error('HLS non disponible après timeout — réessaie dans quelques minutes');
  return { ...initialData, url: fallback };
}

/**
 * Upload une vidéo et attend la fin du traitement HLS.
 * Retourne toujours hls_url une fois prêt.
 */
export async function uploadVideoHls(
  file: File,
  folder: string,
  onProgress?: (pct: number) => void,
): Promise<UploadedVideo> {
  const data = await xhrUpload(file, folder, onProgress);
  onProgress?.(70);
  if (data.job_id) return pollHls(data.job_id, data, onProgress);
  const fallback = data.hls_url;
  if (!fallback) throw new Error('HLS non disponible — réessaie dans quelques minutes');
  onProgress?.(100);
  return data;
}
