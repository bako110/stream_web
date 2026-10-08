import { ArrowLeft } from 'lucide-react';
import { useSmartBack } from '../../hooks/useSmartBack';

// ── Bouton retour pour les pages de liste Explorer — ces pages sont
// accessibles depuis divers points d'entrée (landing, lien direct, moteur
// de recherche) et n'ont pas toujours d'historique interne exploitable.
// Même pilule (.xp-back) que les pages détail. ──
export function ExploreBackButton({ fallback = '/', label = 'Retour' }: { fallback?: string; label?: string }) {
  const goBack = useSmartBack(fallback);
  return (
    <button onClick={goBack} className="xp-back" aria-label="Retour">
      <ArrowLeft size={15} />
      {label}
    </button>
  );
}
