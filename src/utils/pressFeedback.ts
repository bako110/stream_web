/**
 * Assombrissement au clic/toucher sur TOUT élément cliquable — équivalent web du
 * TouchableOpacity mobile. Complète la règle CSS :active (index.css), qui ne voit
 * que boutons/liens/cursor-pointer inline : ici on détecte tout élément dont le
 * curseur calculé est "pointer" (classes définies en CSS : GuestPreview, pages
 * gate/Explorer, cartes custom…), sur n'importe quelle page, connectée ou invité.
 * Pose data-pressed (stylé dans index.css) le temps de l'appui.
 */
let pressed: HTMLElement | null = null;

function release() {
  if (pressed) { pressed.removeAttribute('data-pressed'); pressed = null; }
}

function findClickable(start: EventTarget | null): HTMLElement | null {
  let el = start instanceof HTMLElement ? start : null;
  for (let depth = 0; el && depth < 8; depth++, el = el.parentElement) {
    if (el === document.body) return null;
    if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return null;
    if (getComputedStyle(el).cursor !== 'pointer') continue;
    // Pas d'assombrissement des overlays plein écran ni des conteneurs vidéo.
    if (getComputedStyle(el).position === 'fixed' || el.querySelector('video')) return null;
    return el;
  }
  return null;
}

export function initPressFeedback() {
  document.addEventListener('pointerdown', e => {
    release();
    const el = findClickable(e.target);
    if (el) { pressed = el; el.setAttribute('data-pressed', ''); }
  }, { passive: true, capture: true });
  for (const type of ['pointerup', 'pointercancel', 'dragstart', 'scroll'] as const) {
    document.addEventListener(type, release, { passive: true, capture: true });
  }
}
