/**
 * useReelWatchStats
 *
 * Stocke en localStorage pour chaque reel :
 *   - total_seconds  : cumul de toutes les secondes regardées
 *   - record_seconds : meilleure session continue (record à battre)
 *   - sessions       : nombre de fois que le reel a été regardé
 *   - last_watched   : timestamp ISO de la dernière session
 *
 * Usage :
 *   const { startSession, endSession, getStats } = useReelWatchStats(reel.id)
 */

const LS_KEY = 'gofolyx_reel_watch';

export interface ReelWatchStats {
  total_seconds:  number;
  record_seconds: number;
  sessions:       number;
  last_watched:   string | null;
}

function readAll(): Record<string, ReelWatchStats> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, ReelWatchStats>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

export function getReelWatchStats(reelId: string): ReelWatchStats {
  return readAll()[reelId] ?? { total_seconds: 0, record_seconds: 0, sessions: 0, last_watched: null };
}

export function commitReelSession(reelId: string, seconds: number) {
  if (seconds < 1) return;
  const all  = readAll();
  const prev = all[reelId] ?? { total_seconds: 0, record_seconds: 0, sessions: 0, last_watched: null };
  all[reelId] = {
    total_seconds:  prev.total_seconds + seconds,
    record_seconds: Math.max(prev.record_seconds, seconds),
    sessions:       prev.sessions + 1,
    last_watched:   new Date().toISOString(),
  };
  writeAll(all);
}

/** Hook à utiliser dans un composant React */
export function useReelWatchStats(reelId: string) {
  const sessionStart = { current: 0 };

  function startSession() {
    sessionStart.current = Date.now();
  }

  function endSession() {
    if (!sessionStart.current) return;
    const seconds = Math.round((Date.now() - sessionStart.current) / 1000);
    commitReelSession(reelId, seconds);
    sessionStart.current = 0;
  }

  function getStats(): ReelWatchStats {
    return getReelWatchStats(reelId);
  }

  return { startSession, endSession, getStats };
}
