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
      isDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
      toggle: () => set(s => { applyTheme(!s.isDark); return { isDark: !s.isDark }; }),
      setDark: (v) => { applyTheme(v); set({ isDark: v }); },
    }),
    { name: 'gofolix-theme' },
  ),
);

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}

// init on load
applyTheme(useThemeStore.getState().isDark);
