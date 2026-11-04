import { useEffect, useState } from 'react';
import { Users, CalendarDays, FileText, ShieldCheck, Clock, Check, X, AlertCircle } from 'lucide-react';
import { apiClient } from '../../api';
import { Endpoints } from '../../api/endpoints';

export type MonetizationState = 'none' | 'pending' | 'approved' | 'rejected';

export interface MonetizationEligibility {
  status: MonetizationState;
  admin_note?: string | null;
  followers_count?: number;
  followers_required?: number;
  eligible?: boolean;
  eligibility_reasons?: string[];
  account_age_days?: number;
  account_age_required?: number;
  posts_last_4_weeks?: number;
  posts_required?: number;
  posts_per_week_required?: number;
  is_restricted?: boolean;
  resolved_reports_count?: number;
  auto_review_hours?: number;
}

/** Statut + éligibilité calculés côté serveur (mêmes règles que l'app mobile). */
export function useMonetizationEligibility() {
  const [data, setData] = useState<MonetizationEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiClient.get<MonetizationEligibility>(Endpoints.monetization.status)
      .then(r => setData(r.data))
      .catch(() => setData({ status: 'none' }))
      .finally(() => setLoading(false));
  }, []);
  return { data, loading };
}

interface Check { icon: React.ReactNode; label: string; detail?: string; ok: boolean | null }

const isNum = (v: unknown): v is number => typeof v === 'number';

function buildChecks(e: MonetizationEligibility | null): Check[] {
  const fReq = e?.followers_required ?? 1000;
  const aReq = e?.account_age_required ?? 30;
  const pWeek = e?.posts_per_week_required ?? 3;
  const pReq = e?.posts_required ?? pWeek * 4;
  const fmt = (n: number) => n.toLocaleString('fr-FR');

  return [
    {
      icon: <Users size={15} />,
      label: `${fmt(fReq)} abonnés minimum`,
      detail: isNum(e?.followers_count) ? `${fmt(e.followers_count)} / ${fmt(fReq)}` : undefined,
      ok: isNum(e?.followers_count) ? e.followers_count >= fReq : null,
    },
    {
      icon: <CalendarDays size={15} />,
      label: `Compte créé depuis au moins ${aReq} jours`,
      detail: isNum(e?.account_age_days) ? `${e.account_age_days} jour(s)` : undefined,
      ok: isNum(e?.account_age_days) ? e.account_age_days >= aReq : null,
    },
    {
      icon: <FileText size={15} />,
      label: `Au moins ${pWeek} publications par semaine en moyenne`,
      detail: isNum(e?.posts_last_4_weeks) ? `${e.posts_last_4_weeks} / ${pReq} sur 28 jours` : undefined,
      ok: isNum(e?.posts_last_4_weeks) ? e.posts_last_4_weeks >= pReq : null,
    },
    {
      icon: <ShieldCheck size={15} />,
      label: 'Aucune restriction sur le compte, respect des CGU Gofolyx',
      detail: (e?.resolved_reports_count ?? 0) > 0 ? `${e?.resolved_reports_count} signalement(s) confirmé(s)` : undefined,
      ok: typeof e?.is_restricted === 'boolean' ? !e.is_restricted && (e.resolved_reports_count ?? 0) === 0 : null,
    },
  ];
}

/** Liste des conditions avec vérification automatique (coche verte / croix rouge). */
export function MonetizationChecklist({ eligibility }: { eligibility: MonetizationEligibility | null }) {
  const checks = buildChecks(eligibility);
  const hours = eligibility?.auto_review_hours ?? 24;
  const reasons = eligibility?.eligibility_reasons ?? [];
  const allOk = eligibility?.eligible ?? checks.every(c => c.ok === true);

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          Conditions requises
        </p>
        {eligibility?.eligible !== undefined && (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: allOk ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.12)', color: allOk ? '#16A34A' : '#EF4444' }}>
            {allOk ? 'Vous êtes éligible' : 'Pas encore éligible'}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {checks.map(c => {
          const color = c.ok === null ? '#7B3FF2' : c.ok ? '#22C55E' : '#EF4444';
          return (
            <div key={c.label} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}18`, color }}>
                {c.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{c.label}</p>
                {c.detail && (
                  <p className="text-[11px]" style={{ color: c.ok === false ? '#EF4444' : 'var(--text-tertiary)' }}>{c.detail}</p>
                )}
              </div>
              {c.ok !== null && (
                <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: color, color: '#fff' }}>
                  {c.ok ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
                </span>
              )}
            </div>
          );
        })}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(123,63,242,0.12)', color: '#7B3FF2' }}>
            <Clock size={15} />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            Validation automatique sous {hours}h si les conditions restent remplies
          </p>
        </div>
      </div>

      {!allOk && reasons.length > 0 && (
        <div className="mt-4 rounded-xl px-4 py-3 space-y-1.5"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          {reasons.map(r => (
            <p key={r} className="text-xs flex items-start gap-2" style={{ color: '#EF4444' }}>
              <AlertCircle size={13} className="shrink-0 mt-0.5" /> {r}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
