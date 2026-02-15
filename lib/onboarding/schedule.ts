import type { Weekday } from './OnboardingContext';

export type NormalizedWeekday = Exclude<Weekday, 'no_preference'>;

const DAYS: NormalizedWeekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function clampDaysPerWeek(value: number) {
  return Math.max(2, Math.min(6, Math.round(value)));
}

export function formatWeekday(day: string) {
  const lower = String(day || '').toLowerCase();
  return lower.length ? `${lower[0].toUpperCase()}${lower.slice(1)}` : '';
}

export interface PreferredDaysOffResolution {
  requestedDaysOff: NormalizedWeekday[];
  maxDaysOffAllowed: number;
  resolvedDaysOff: NormalizedWeekday[];
  droppedDaysOff: NormalizedWeekday[];
  warning?: string;
}

/**
 * Mirrors edge-function conflict handling so onboarding and generation stay deterministic.
 */
export function resolvePreferredDaysOff(
  trainingDaysPerWeek: number | null | undefined,
  preferredDaysOff: (Weekday | string)[] | null | undefined,
): PreferredDaysOffResolution {
  const normalizedRequested = Array.from(
    new Set(
      (preferredDaysOff || [])
        .map((day) => String(day || '').toLowerCase())
        .filter((day): day is NormalizedWeekday => day !== 'no_preference' && DAYS.includes(day as NormalizedWeekday)),
    ),
  );

  if (!trainingDaysPerWeek || Number.isNaN(Number(trainingDaysPerWeek))) {
    return {
      requestedDaysOff: normalizedRequested,
      maxDaysOffAllowed: 7,
      resolvedDaysOff: normalizedRequested,
      droppedDaysOff: [],
    };
  }

  const clampedDays = clampDaysPerWeek(Number(trainingDaysPerWeek));
  const maxDaysOffAllowed = Math.max(0, 7 - clampedDays);
  const resolvedDaysOff = normalizedRequested.slice(0, maxDaysOffAllowed);
  const droppedDaysOff = normalizedRequested.slice(maxDaysOffAllowed);

  let warning: string | undefined;
  if (droppedDaysOff.length > 0) {
    warning = `With ${clampedDays} training days/week, we can keep ${maxDaysOffAllowed} day(s) off. Ignored: ${droppedDaysOff
      .map(formatWeekday)
      .join(', ')}.`;
  }

  return {
    requestedDaysOff: normalizedRequested,
    maxDaysOffAllowed,
    resolvedDaysOff,
    droppedDaysOff,
    warning,
  };
}
