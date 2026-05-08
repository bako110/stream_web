// Catalogue boost — source de vérité unique, identique au backend _BOOST_CATALOG

export type ContentType = 'reel' | 'community' | 'post' | 'event' | 'concert' | 'live';

export interface BoostTier {
  id: string;
  label: string;
  quantity: string;
  quantity_num: number;       // valeur numérique pour livraison
  duration: string;
  duration_days: number;
  coins: number;
  popular?: boolean;
}

export interface BoostCategory {
  id: string;
  label: string;
  sublabel: string;
  description: string;
  gradient: [string, string];
  contentType?: ContentType;
  targetLabel?: string;
  tiers: BoostTier[];
}

export const BOOST_CATEGORIES: BoostCategory[] = [
  {
    id: 'followers',
    label: 'Abonnés',
    sublabel: 'Compte',
    description: 'Gagnez de nouveaux abonnés et développez votre audience',
    gradient: ['#7B3FF2', '#E0389A'],
    tiers: [
      { id: 'f1', label: 'Starter', quantity: '+50 abonnés',    quantity_num: 50,   duration: '3 jours',  duration_days: 3,  coins: 200 },
      { id: 'f2', label: 'Growth',  quantity: '+150 abonnés',   quantity_num: 150,  duration: '7 jours',  duration_days: 7,  coins: 500, popular: true },
      { id: 'f3', label: 'Viral',   quantity: '+500 abonnés',   quantity_num: 500,  duration: '14 jours', duration_days: 14, coins: 1500 },
      { id: 'f4', label: 'Mega',    quantity: '+2 000 abonnés', quantity_num: 2000, duration: '30 jours', duration_days: 30, coins: 5000 },
    ],
  },
  {
    id: 'profile_views',
    label: 'Vues profil',
    sublabel: 'Compte',
    description: 'Augmentez le nombre de visites sur votre profil',
    gradient: ['#FF8C00', '#FF4500'],
    tiers: [
      { id: 'p1', label: 'Starter', quantity: '500 vues',    quantity_num: 500,   duration: '2 jours',  duration_days: 2,  coins: 150 },
      { id: 'p2', label: 'Growth',  quantity: '2 000 vues',  quantity_num: 2000,  duration: '5 jours',  duration_days: 5,  coins: 400, popular: true },
      { id: 'p3', label: 'Viral',   quantity: '10 000 vues', quantity_num: 10000, duration: '10 jours', duration_days: 10, coins: 1200 },
      { id: 'p4', label: 'Mega',    quantity: '50 000 vues', quantity_num: 50000, duration: '21 jours', duration_days: 21, coins: 4000 },
    ],
  },
  {
    id: 'content_reach',
    label: 'Portée',
    sublabel: 'Contenus',
    description: 'Augmentez la portée de tous vos contenus publiés',
    gradient: ['#10B981', '#06B6D4'],
    tiers: [
      { id: 'c1', label: 'Starter', quantity: '1 000 impressions',   quantity_num: 1000,   duration: '3 jours',  duration_days: 3,  coins: 250 },
      { id: 'c2', label: 'Growth',  quantity: '5 000 impressions',   quantity_num: 5000,   duration: '7 jours',  duration_days: 7,  coins: 700, popular: true },
      { id: 'c3', label: 'Viral',   quantity: '20 000 impressions',  quantity_num: 20000,  duration: '14 jours', duration_days: 14, coins: 2000 },
      { id: 'c4', label: 'Mega',    quantity: '100 000 impressions', quantity_num: 100000, duration: '30 jours', duration_days: 30, coins: 7000 },
    ],
  },
  {
    id: 'reel_views',
    label: 'Reels',
    sublabel: 'Vues',
    description: 'Propulsez un Reel spécifique avec plus de vues',
    gradient: ['#E0389A', '#FF8C00'],
    contentType: 'reel',
    targetLabel: 'Choisir un Reel',
    tiers: [
      { id: 'r1', label: 'Starter', quantity: '1 000 vues',    quantity_num: 1000,   duration: '2 jours',  duration_days: 2,  coins: 200 },
      { id: 'r2', label: 'Growth',  quantity: '5 000 vues',    quantity_num: 5000,   duration: '5 jours',  duration_days: 5,  coins: 600, popular: true },
      { id: 'r3', label: 'Viral',   quantity: '25 000 vues',   quantity_num: 25000,  duration: '10 jours', duration_days: 10, coins: 2000 },
      { id: 'r4', label: 'Mega',    quantity: '100 000 vues',  quantity_num: 100000, duration: '20 jours', duration_days: 20, coins: 6000 },
    ],
  },
  {
    id: 'post_reach',
    label: 'Posts',
    sublabel: 'Publications',
    description: "Boostez la portée d'une publication spécifique",
    gradient: ['#06B6D4', '#0EA5E9'],
    contentType: 'post',
    targetLabel: 'Choisir un post',
    tiers: [
      { id: 'po1', label: 'Starter', quantity: '2 000 impressions',   quantity_num: 2000,   duration: '2 jours',  duration_days: 2,  coins: 200 },
      { id: 'po2', label: 'Growth',  quantity: '8 000 impressions',   quantity_num: 8000,   duration: '5 jours',  duration_days: 5,  coins: 550, popular: true },
      { id: 'po3', label: 'Viral',   quantity: '30 000 impressions',  quantity_num: 30000,  duration: '10 jours', duration_days: 10, coins: 1600 },
      { id: 'po4', label: 'Mega',    quantity: '120 000 impressions', quantity_num: 120000, duration: '21 jours', duration_days: 21, coins: 5500 },
    ],
  },
  {
    id: 'event_reach',
    label: 'Événements',
    sublabel: 'Events',
    description: "Faites connaître un événement à plus de personnes",
    gradient: ['#F59E0B', '#EF4444'],
    contentType: 'event',
    targetLabel: 'Choisir un événement',
    tiers: [
      { id: 'ev1', label: 'Starter', quantity: '500 personnes',    quantity_num: 500,   duration: '2 jours',  duration_days: 2,  coins: 300 },
      { id: 'ev2', label: 'Growth',  quantity: '2 000 personnes',  quantity_num: 2000,  duration: '5 jours',  duration_days: 5,  coins: 800, popular: true },
      { id: 'ev3', label: 'Viral',   quantity: '8 000 personnes',  quantity_num: 8000,  duration: '10 jours', duration_days: 10, coins: 2200 },
      { id: 'ev4', label: 'Mega',    quantity: '30 000 personnes', quantity_num: 30000, duration: '20 jours', duration_days: 20, coins: 7000 },
    ],
  },
  {
    id: 'concert_reach',
    label: 'Concerts',
    sublabel: 'Concerts',
    description: 'Remplissez votre concert en touchant plus de fans',
    gradient: ['#EC4899', '#8B5CF6'],
    contentType: 'concert',
    targetLabel: 'Choisir un concert',
    tiers: [
      { id: 'co1', label: 'Starter', quantity: '300 personnes',    quantity_num: 300,   duration: '1 jour',   duration_days: 1,  coins: 400 },
      { id: 'co2', label: 'Growth',  quantity: '1 500 personnes',  quantity_num: 1500,  duration: '3 jours',  duration_days: 3,  coins: 1000, popular: true },
      { id: 'co3', label: 'Viral',   quantity: '5 000 personnes',  quantity_num: 5000,  duration: '7 jours',  duration_days: 7,  coins: 2800 },
      { id: 'co4', label: 'Mega',    quantity: '20 000 personnes', quantity_num: 20000, duration: '14 jours', duration_days: 14, coins: 8000 },
    ],
  },
  {
    id: 'live_viewers',
    label: 'Live',
    sublabel: 'Viewers',
    description: 'Boostez votre audience en direct pendant un live',
    gradient: ['#EF4444', '#F97316'],
    contentType: 'live',
    targetLabel: 'Choisir un concert live',
    tiers: [
      { id: 'lv1', label: 'Starter', quantity: '100 viewers',   quantity_num: 100,  duration: '1 jour',  duration_days: 1, coins: 300 },
      { id: 'lv2', label: 'Growth',  quantity: '500 viewers',   quantity_num: 500,  duration: '2 jours', duration_days: 2, coins: 800, popular: true },
      { id: 'lv3', label: 'Viral',   quantity: '2 000 viewers', quantity_num: 2000, duration: '3 jours', duration_days: 3, coins: 2000 },
      { id: 'lv4', label: 'Mega',    quantity: '8 000 viewers', quantity_num: 8000, duration: '7 jours', duration_days: 7, coins: 6000 },
    ],
  },
];

// ── Custom boost pricing ───────────────────────────────────────────────────────

export const CUSTOM_RATES: Record<string, number> = {
  followers:     0.48,
  profile_views: 0.04,
  content_reach: 0.008,
  reel_views:    0.025,
  post_reach:    0.009,
  event_reach:   0.18,
  concert_reach: 0.25,
  live_viewers:  0.35,
};

export const CUSTOM_UNITS: Record<string, string> = {
  followers: 'abonnés', profile_views: 'vues', content_reach: 'impressions',
  reel_views: 'vues', post_reach: 'impressions',
  event_reach: 'personnes', concert_reach: 'personnes', live_viewers: 'viewers',
};

export const CUSTOM_REACH_CONFIG: Record<string, { min: number; max: number; step: number; presets: number[] }> = {
  followers:     { min: 10,  max: 10000,  step: 10,  presets: [50, 200, 500, 2000, 5000] },
  profile_views: { min: 100, max: 200000, step: 100, presets: [500, 2000, 10000, 50000] },
  content_reach: { min: 500, max: 500000, step: 500, presets: [1000, 5000, 20000, 100000] },
  reel_views:    { min: 100, max: 200000, step: 100, presets: [1000, 5000, 25000, 100000] },
  post_reach:    { min: 500, max: 200000, step: 500, presets: [2000, 8000, 30000, 120000] },
  event_reach:   { min: 100, max: 50000,  step: 100, presets: [500, 2000, 8000, 30000] },
  concert_reach: { min: 50,  max: 30000,  step: 50,  presets: [300, 1500, 5000, 20000] },
  live_viewers:  { min: 10,  max: 10000,  step: 10,  presets: [100, 500, 2000, 8000] },
};

export function computeCustomCoins(optionId: string, reach: number, days: number): number {
  const rate = CUSTOM_RATES[optionId] ?? 0.02;
  return Math.max(50, Math.round(rate * reach * days));
}

export function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toLocaleString('fr-FR');
}

export function daysLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
}
