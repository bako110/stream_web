import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../api';
import { Endpoints } from '../api/endpoints';

export interface CurrencyInfo {
  code: string;
  label: string;
  symbol: string;
  rate_from_eur: number;
}

interface CurrenciesResponse {
  base: string;
  currencies: CurrencyInfo[];
}

interface CurrencyState {
  currencies: CurrencyInfo[];
  code: string | null; // null = EUR uniquement, pas de devise locale choisie
  autoDetected: boolean; // true dès qu'une tentative de détection (réussie ou non) a eu lieu
  loading: boolean;

  loadCurrencies: () => Promise<void>;
  setCurrencyCode: (code: string | null) => void;
  convertFromEur: (amountEur: number) => number | null;
  /** Lance la détection automatique par géolocalisation — no-op si déjà tentée ou déjà choisie manuellement. */
  autoDetect: () => void;
}

// Même liste que app/routers/currency.py côté backend (source de vérité
// réelle via /currencies, ceci est juste le type par défaut avant chargement).
export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currencies: [],
      code: null,
      autoDetected: false,
      loading: true,

      loadCurrencies: async () => {
        set({ loading: true });
        try {
          const res = await apiClient.get<CurrenciesResponse>(Endpoints.currencies.list);
          set({ currencies: res.data.currencies, loading: false });
        } catch {
          set({ loading: false });
        }
      },

      setCurrencyCode: (newCode) => {
        // Choix manuel (y compris "Aucune" -> null) marque la détection comme
        // faite pour de bon — autoDetect() ne doit plus jamais écraser un choix
        // explicite de l'utilisateur, même "je reste en EUR".
        set({ code: newCode, autoDetected: true });
      },

      convertFromEur: (amountEur) => {
        const { code, currencies } = get();
        if (!code) return null;
        const selected = currencies.find(c => c.code === code);
        return selected ? amountEur * selected.rate_from_eur : null;
      },

      autoDetect: () => {
        const { autoDetected } = get();
        if (autoDetected) return;
        // Ne JAMAIS afficher le prompt navigateur de permission géoloc nous-
        // mêmes depuis ce store global (mauvaise UX si ça arrive au tout
        // premier chargement de page, avant toute interaction) — seule une
        // position DÉJÀ accordée ailleurs (ex: pages Create*) ou silencieuse
        // via l'API Permissions est utilisée. Si rien n'est disponible,
        // abandon silencieux : rester en EUR est un résultat normal, pas une
        // erreur à retenter en boucle.
        set({ autoDetected: true }); // une seule tentative par session/installation

        if (!navigator.geolocation || !navigator.permissions) return;

        navigator.permissions.query({ name: 'geolocation' as PermissionName }).then(status => {
          if (status.state !== 'granted') return; // jamais provoquer le prompt ici
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                const { latitude: lat, longitude: lon } = pos.coords;
                const geo = await apiClient.get<{ country_code: string | null }>(
                  Endpoints.utils.geocodeCountry(lat, lon),
                );
                const countryCode = geo.data?.country_code;
                if (!countryCode) return;
                const local = await apiClient.get<CurrencyInfo | null>(
                  Endpoints.currencies.byCountry(countryCode),
                );
                if (local.data) {
                  set({ code: local.data.code });
                }
              } catch { /* silencieux — reste en EUR */ }
            },
            () => { /* refus/erreur — silencieux */ },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
          );
        }).catch(() => {});
      },
    }),
    {
      name: 'gofolyx-currency',
      partialize: (s) => ({ code: s.code, autoDetected: s.autoDetected }),
    },
  ),
);
