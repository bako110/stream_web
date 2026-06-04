/**
 * Taux de conversion coins — source unique de vérité.
 *
 * ACHAT  : 1 € = 100 coins  (prix d'achat pour l'utilisateur)
 * RETRAIT: 100 coins = 0,35 € (reversé au créateur/annonceur)
 */
export const COINS_PER_EUR_BUY      = 100;   // achat  : 1 € → 100 coins
export const EUR_PER_100_COINS_SELL = 0.35;  // retrait: 100 coins → 0,35 €

/** Convertit des coins en euros (contexte retrait/gains créateur) */
export const coinsToEurSell = (coins: number): string =>
  ((coins / 100) * EUR_PER_100_COINS_SELL).toFixed(2);

/** Convertit des euros en coins (contexte achat/pub) */
export const eurToCoins = (eur: number): number =>
  Math.round(eur * COINS_PER_EUR_BUY);

/** Convertit des coins en euros (contexte achat — pour affichage valeur acquise) */
export const coinsToEurBuy = (coins: number): string =>
  (coins / COINS_PER_EUR_BUY).toFixed(2);

/** Retrait minimum */
export const MIN_WITHDRAW_COINS = 500;
