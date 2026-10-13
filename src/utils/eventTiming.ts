import { differenceInCalendarDays } from 'date-fns';
import type { Event } from '../types';

// Phase temporelle d'un événement — sert à distinguer d'un coup d'œil
// ce qui est en cours, imminent, à venir ou terminé.
export type EventPhase = 'live' | 'today' | 'soon' | 'upcoming' | 'past';

export interface EventTiming {
  phase: EventPhase;
  label: string;
  color: string;
  /** vrai pour les événements des 7 prochains jours (y compris aujourd'hui et en cours) */
  isNear: boolean;
  isPast: boolean;
}

const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000; // sans ends_at : on suppose 3 h

export const TIMING_COLORS: Record<EventPhase, string> = {
  live:     '#EF4444',
  today:    '#F59E0B',
  soon:     '#F59E0B',
  upcoming: '#7B3FF2',
  past:     '#6B7280',
};

export function getEventTiming(ev: Pick<Event, 'starts_at' | 'ends_at'>, now = new Date()): EventTiming {
  const start = new Date(ev.starts_at);
  const end   = ev.ends_at ? new Date(ev.ends_at) : new Date(start.getTime() + DEFAULT_DURATION_MS);
  const make = (phase: EventPhase, label: string, isNear = false): EventTiming =>
    ({ phase, label, color: TIMING_COLORS[phase], isNear, isPast: phase === 'past' });

  if (now >= start && now <= end) return make('live', 'En cours', true);

  if (now > end) {
    const d = differenceInCalendarDays(now, end);
    if (d <= 0) return make('past', "Terminé aujourd'hui");
    if (d === 1) return make('past', 'Terminé hier');
    if (d < 30)  return make('past', `Terminé il y a ${d} j`);
    return make('past', 'Terminé');
  }

  const d = differenceInCalendarDays(start, now);
  if (d <= 0) return make('today', "Aujourd'hui", true);
  if (d === 1) return make('soon', 'Demain', true);
  if (d <= 7)  return make('soon', `Dans ${d} jours`, true);
  if (d < 30)  return make('upcoming', `Dans ${Math.round(d / 7)} sem.`);
  return make('upcoming', `Dans ${Math.round(d / 30)} mois`);
}

/** À venir / en cours : du plus proche au plus lointain, puis les passés du plus récent au plus ancien. */
export function sortEventsByProximity<T extends Pick<Event, 'starts_at' | 'ends_at'>>(list: T[], now = new Date()): T[] {
  const t = (e: T) => new Date(e.starts_at).getTime();
  const upcoming = list.filter(e => !getEventTiming(e, now).isPast).sort((a, b) => t(a) - t(b));
  const past     = list.filter(e => getEventTiming(e, now).isPast).sort((a, b) => t(b) - t(a));
  return [...upcoming, ...past];
}
