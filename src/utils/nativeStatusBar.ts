import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

// App Android (Capacitor) : la barre d'état (heure, batterie, réseau) doit
// rester lisible. Icônes sombres sur thème clair, icônes claires sur thème
// sombre — on suit la classe `dark` posée sur <html> par le themeStore.
export function initNativeStatusBar() {
  if (!Capacitor.isNativePlatform()) return;
  document.documentElement.classList.add('is-native');

  const apply = () => {
    const dark = document.documentElement.classList.contains('dark');
    // Style.Light = icônes sombres (fond clair) ; Style.Dark = icônes claires (fond sombre)
    StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
    StatusBar.setBackgroundColor({ color: dark ? '#000000' : '#FFFFFF' }).catch(() => {});
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    StatusBar.show().catch(() => {});
  };

  apply();
  new MutationObserver(apply).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}
