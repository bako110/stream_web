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
}

// init on load
applyTheme(useThemeStore.getState().isDark);

// Détection automatique — suit les préférences système en direct, y compris
// un changement pendant que l'app est ouverte (bascule OS jour/nuit
// planifiée, etc.), sans dépendre d'un choix manuel resté persisté.
media.addEventListener('change', (e) => {
  useThemeStore.getState().setDark(e.matches);
});
