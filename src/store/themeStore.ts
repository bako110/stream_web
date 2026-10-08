import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  setDark: (v: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: false,   // clair par défaut (le thème sombre reste un choix explicite)
      toggle: () => set(s => { applyTheme(!s.isDark); return { isDark: !s.isDark }; }),
      setDark: (v) => { applyTheme(v); set({ isDark: v }); },
    }),
    {
      name: 'gofolyx-theme',
      version: 2,
      // v2 : thème clair par défaut pour tous — ancien état (suivi du thème système) réinitialisé une fois.
      migrate: () => ({ isDark: false }) as ThemeState,
    },
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
