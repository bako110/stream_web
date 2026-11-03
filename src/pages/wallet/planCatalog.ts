import { useEffect, useState } from 'react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';

/** Plan tel que renvoyé par GET /plans — le backend (PLAN_CONFIG) est la source unique des droits. */
export interface ApiPlan {
  plan: string;
  monthly: number;
  annual: number;
  screens: number;
  profiles: number;
  downloads: number;
  quality: string;
  max_height: number;
  dolby: boolean;
  parental_control: boolean;
}

export interface PlanConfig {
  id: string;
  label: string;
  price: number;
  screens: number;
  quality: string;
  profiles: number;
  downloads: number;
  gradient: string;
  color: string;
  features: string[];
}

// Seule la présentation (nom, couleurs) vit ici ; les chiffres viennent du backend.
const VISUALS: Record<string, { label: string; gradient: string; color: string }> = {
  free:    { label: 'Gratuit', gradient: 'linear-gradient(135deg,#6B7280,#9CA3AF)', color: '#6B7280' },
  basic:   { label: 'Basic',   gradient: 'linear-gradient(135deg,#7B3FF2,#5B2EC4)', color: '#7B3FF2' },
  premium: { label: 'Premium', gradient: 'linear-gradient(135deg,#7B3FF2,#A855F7)', color: '#7B3FF2' },
  family:  { label: 'Famille', gradient: 'linear-gradient(135deg,#10B981,#34D399)', color: '#10B981' },
};

// Valeurs de secours (backend injoignable) — identiques à PLAN_CONFIG côté serveur.
const FALLBACK: ApiPlan[] = [
  { plan: 'free',    monthly: 0,    annual: 0,     screens: 1, profiles: 1, downloads: 0,  quality: 'SD', max_height: 480,  dolby: false, parental_control: false },
  { plan: 'basic',   monthly: 3.99, annual: 39.99, screens: 2, profiles: 2, downloads: 5,  quality: 'HD', max_height: 1080, dolby: false, parental_control: false },
  { plan: 'premium', monthly: 6.99, annual: 69.99, screens: 4, profiles: 4, downloads: 25, quality: '4K', max_height: 2160, dolby: true,  parental_control: false },
  { plan: 'family',  monthly: 9.99, annual: 99.99, screens: 6, profiles: 6, downloads: 50, quality: '4K', max_height: 2160, dolby: true,  parental_control: true },
];

/**
 * Avantages affichés = uniquement ce que le backend applique réellement
 * (écrans simultanés, qualité max, quota de téléchargements, contenu premium).
 */
function buildFeatures(p: ApiPlan): string[] {
  const f = [p.plan === 'free' ? 'Contenu standard uniquement' : 'Tout le contenu premium'];
  f.push(`${p.screens} écran${p.screens > 1 ? 's' : ''} simultané${p.screens > 1 ? 's' : ''}`);
  f.push(`Qualité ${p.quality === '4K' ? '4K Ultra HD' : p.quality}`);
  if (p.downloads > 0) f.push(`${p.downloads} téléchargements / mois`);
  return f;
}

export function toPlanConfig(p: ApiPlan): PlanConfig {
  const v = VISUALS[p.plan] ?? VISUALS.basic;
  return {
    id: p.plan, label: v.label, price: p.monthly, screens: p.screens, quality: p.quality,
    profiles: p.profiles, downloads: p.downloads, gradient: v.gradient, color: v.color,
    features: buildFeatures(p),
  };
}

/** Plans prêts à afficher : valeurs de secours tout de suite, puis ceux du serveur. */
export function usePlanCatalog(): PlanConfig[] {
  const [plans, setPlans] = useState<PlanConfig[]>(() => FALLBACK.map(toPlanConfig));
  useEffect(() => {
    let alive = true;
    apiClient.get<ApiPlan[]>(Endpoints.subscriptions.plans)
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : [];
        if (alive && list.length) setPlans(list.filter(p => VISUALS[p.plan]).map(toPlanConfig));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return plans;
}
