import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  setDark: (v: boolean) => void;
}

const media = window.matchMedia('(prefers-color-scheme: dark)');

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: media.matches,
      toggle: () => set(s => { applyTheme(!s.isDark); return { isDark: !s.isDark }; }),
      setDark: (v) => { applyTheme(v); set({ isDark: v }); },
    }),
    { name: 'gofolyx-theme' },
  ),
);

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
  // Barre de statut mobile (Android/Chrome) — synchronisée avec le thème
  // réellement appliqué à l'écran, jamais avec la couleur de marque violette.
  // Les deux balises <meta name="theme-color" media="..."> posées dans
  // index.html couvrent le cas par défaut (thème système) ; ceci prend le
  // dessus dès qu'un choix explicite (setDark) diverge du système.
  let meta = document.querySelector('meta[name="theme-color"]:not([media])') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', dark ? '#000000' : '#FFFFFF');
}

// init on load
applyTheme(useThemeStore.getState().isDark);

// Détection automatique — suit les préférences système en direct, y compris
// un changement pendant que l'app est ouverte (bascule OS jour/nuit
// planifiée, etc.), sans dépendre d'un choix manuel resté persisté.
media.addEventListener('change', (e) => {
  useThemeStore.getState().setDark(e.matches);
});
