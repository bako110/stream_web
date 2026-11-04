import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
  /** Choix de l'utilisateur : 'system' = on suit l'appareil (défaut). */
  mode: ThemeMode;
  /** Thème réellement affiché (dérivé de `mode` + thème de l'appareil). */
  isDark: boolean;
  setMode: (m: ThemeMode) => void;
  /** Bascule explicite clair/sombre → devient un choix de l'utilisateur. */
  toggle: () => void;
  setDark: (v: boolean) => void;
}

const systemQuery = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null;

const systemIsDark = () => !!systemQuery?.matches;
const resolve = (m: ThemeMode) => (m === 'system' ? systemIsDark() : m === 'dark');

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      isDark: systemIsDark(),
      setMode: (m) => { const d = resolve(m); applyTheme(d); set({ mode: m, isDark: d }); },
      toggle: () => get().setMode(get().isDark ? 'light' : 'dark'),
      setDark: (v) => get().setMode(v ? 'dark' : 'light'),
    }),
    {
      name: 'gofolyx-theme',
      version: 3,
      // v3 : le thème suit l'appareil par défaut, sauf choix explicite de l'utilisateur.
      // Les anciens états (booléen sans notion de choix) repartent sur « appareil ».
      migrate: () => ({ mode: 'system' as ThemeMode }) as unknown as ThemeState,
      partialize: (s) => ({ mode: s.mode }) as unknown as ThemeState,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const d = resolve(state.mode);
        applyTheme(d);
        useThemeStore.setState({ isDark: d });
      },
    },
  ),
);

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
  // Barre de statut mobile — synchronisée avec le thème réellement appliqué.
  let meta = document.querySelector('meta[name="theme-color"]:not([media])') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', dark ? '#000000' : '#FFFFFF');
}

// Le thème de l'appareil change (réglage système, mode nuit auto…) : on suit,
// sauf si l'utilisateur a choisi explicitement clair ou sombre.
systemQuery?.addEventListener?.('change', () => {
  const { mode } = useThemeStore.getState();
  if (mode !== 'system') return;
  const d = systemIsDark();
  applyTheme(d);
  useThemeStore.setState({ isDark: d });
});

// init on load
applyTheme(useThemeStore.getState().isDark);
