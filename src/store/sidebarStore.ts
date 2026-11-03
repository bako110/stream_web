import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  /** true = menu latéral réduit aux icônes seules ; false = menu complet (icônes + libellés). */
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
}

// Mémorisé dans le navigateur (comme le thème) : le choix survit au rechargement et à la reconnexion.
export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => set(s => ({ collapsed: !s.collapsed })),
      setCollapsed: (v) => set({ collapsed: v }),
    }),
    { name: 'gofolyx-sidebar' },
  ),
);
