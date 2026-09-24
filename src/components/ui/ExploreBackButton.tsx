import { ArrowLeft } from 'lucide-react';
import { useSmartBack } from '../../hooks/useSmartBack';

// ── Bouton retour pour les pages de liste Explorer — ces pages sont
// accessibles depuis divers points d'entrée (landing, lien direct, moteur
// de recherche) et n'ont pas toujours d'historique interne exploitable. ──
export function ExploreBackButton({ fallback = '/' }: { fallback?: string }) {
  const goBack = useSmartBack(fallback);
  return (
    <button onClick={goBack} className="xp-icon-btn inline-flex items-center justify-center mb-4" title="Retour" aria-label="Retour">
      <ArrowLeft size={17} />
    </button>
  );
}
