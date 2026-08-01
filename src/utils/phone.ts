// Même détection que côté mobile (stream_mobile/src/utils/phoneMenu.ts) : un
// cta_url de pub est traité comme un numéro de téléphone (pas un lien web)
// s'il ne commence pas par http(s):// et ne contient que des chiffres/+()-.
export function isPhoneNumber(raw: string): boolean {
  return !/^https?:\/\//i.test(raw) && /^[+()\d\s.-]{6,}$/.test(raw.replace(/^tel:/i, ''));
}
