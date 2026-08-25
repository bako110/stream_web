/**
 * Fingerprint d'appareil léger, sans dépendance externe (pas de FingerprintJS).
 * Combine quelques caractéristiques stables du navigateur (rendu canvas, user-agent,
 * résolution, timezone, langue) en un hash — pas parfaitement unique ni infalsifiable,
 * mais stable pour un même appareil/navigateur et suffisant pour détecter les rafales
 * de création de comptes depuis le même poste (anti-bot), en complément du rate limit
 * par IP. Stocké en localStorage pour rester identique entre les visites.
 */

const STORAGE_KEY = 'gofolyx_device_fp';

function canvasSignature(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    canvas.width = 200;
    canvas.height = 40;
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(0, 0, 100, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Gofolyx-fp', 2, 2);
    return canvas.toDataURL();
  } catch {
    return '';
  }
}

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (Math.imul(31, hash) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function computeFingerprint(): string {
  const parts = [
    navigator.userAgent,
    navigator.language,
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth),
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
    String(navigator.hardwareConcurrency ?? ''),
    canvasSignature(),
  ];
  return simpleHash(parts.join('||'));
}

/** Retourne un identifiant d'appareil stable, généré une fois puis persisté. */
export function getDeviceFingerprint(): string {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) return cached;
    const fp = computeFingerprint();
    localStorage.setItem(STORAGE_KEY, fp);
    return fp;
  } catch {
    // localStorage indisponible (navigation privée stricte, etc.) — fingerprint
    // recalculé à chaque appel, moins stable mais ne bloque jamais l'inscription.
    return computeFingerprint();
  }
}
