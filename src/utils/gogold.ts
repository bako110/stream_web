/**
 * Taux de conversion GoGold — source unique de vérité.
 *
 * ACHAT  : 1 € = 100 GoGold  (prix d'achat pour l'utilisateur)
 * RETRAIT: 100 GoGold = 0,35 € (reversé au créateur/annonceur)
 */
export const GOGOLD_PER_EUR_BUY      = 100;   // achat  : 1 € → 100 GoGold
export const EUR_PER_100_GOGOLD_SELL = 0.35;  // retrait: 100 GoGold → 0,35 €

/** Convertit des GoGold en euros (contexte retrait/gains créateur) */
export const goGoldToEurSell = (gogold: number): string =>
  ((gogold / 100) * EUR_PER_100_GOGOLD_SELL).toFixed(2);

/** Convertit des euros en GoGold (contexte achat/pub) */
export const eurToGoGold = (eur: number): number =>
  Math.round(eur * GOGOLD_PER_EUR_BUY);

/** Convertit des GoGold en euros (contexte achat — pour affichage valeur acquise) */
export const goGoldToEurBuy = (gogold: number): string =>
  (gogold / GOGOLD_PER_EUR_BUY).toFixed(2);

/** Retrait minimum */
export const MIN_WITHDRAW_GOGOLD = 500;
