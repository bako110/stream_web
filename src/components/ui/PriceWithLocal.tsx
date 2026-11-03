import { useCurrencyStore } from '../../store/currencyStore';

function formatLocalAmount(amount: number): string {
  // Devises comme XOF/GNF n'ont pas de décimales à l'usage courant — on arrondit
  // à l'entier pour éviter un affichage du type "6 559,60 F" qui n'a pas de sens.
  return Math.round(amount).toLocaleString('fr-FR');
}

interface PriceWithLocalProps {
  /** Montant en EUR — valeur de référence stockée en base (ticket_price, etc.), jamais une devise locale. */
  amountEur: number;
  className?: string;
  localClassName?: string;
  /** Préfixe/suffixe autour du montant EUR, ex: "/mois" */
  suffix?: string;
}

// Affiche un montant en euro, avec la conversion en devise locale à côté si
// l'utilisateur en a une (choisie manuellement ou détectée automatiquement
// par pays, cf. currencyStore). Le prix EUR reste toujours la valeur de
// référence (celle réellement facturée) — la devise locale n'est qu'une
// indication, jamais utilisée pour le calcul du paiement. Équivalent exact du
// composant mobile du même nom (stream_mobile/src/components/common/PriceWithLocal.tsx).
export function PriceWithLocal({ amountEur, className, localClassName, suffix }: PriceWithLocalProps) {
  const code = useCurrencyStore(s => s.code);
  const currencies = useCurrencyStore(s => s.currencies);
  const selected = code ? currencies.find(c => c.code === code) ?? null : null;
  const local = selected ? amountEur * selected.rate_from_eur : null;

  return (
    <span className={className}>
      {amountEur.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €{suffix}
      {selected && local !== null && (
        <span className={localClassName ?? 'text-xs font-medium text-[#9CA3AF]'}>
          {' '}· {formatLocalAmount(local)} {selected.symbol}
        </span>
      )}
    </span>
  );
}
