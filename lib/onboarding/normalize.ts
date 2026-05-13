import type { OnboardingData } from './OnboardingContext';
import { resolvePreferredDaysOff } from './schedule';

const REFUSAL_SYNONYMS: Record<string, string> = {
  shrimp: 'seafood',
  prawns: 'seafood',
  tuna: 'seafood',
  salmon: 'seafood',
  cod: 'seafood',
  nuts: 'nuts',
  peanut: 'peanuts',
  peanuts: 'peanuts',
};

function dedupe(values: string[]) {
  return Array.from(new Set(values));
}

function normalizeList(values: string[] | null | undefined) {
  return dedupe(
    (values || [])
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean),
  );
}

export type NormalizedOnboardingAnswers = Omit<
  Partial<OnboardingData>,
  'preferred_days_off' | 'allergies_exclusions' | 'refused_foods' | 'technique_preferences' | 'training_days'
> & {
  preferred_days_off: string[];
  training_days: string[];
  allergies_exclusions: string[];
  refused_foods: string[];
  technique_preferences: string[];
};

const ALL_WEEKDAYS: string[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export function normalizeOnboardingAnswers(input: Partial<OnboardingData>): NormalizedOnboardingAnswers {
  // Normalize explicit training days (new model — user picks exact days they'll train)
  const training_days = normalizeList(input.training_days as unknown as string[]).filter(
    (d) => ALL_WEEKDAYS.includes(d),
  );

  // Derive days-per-week and rest days from explicit training_days when available;
  // fall back to the legacy count + days-off model for backward compatibility.
  let training_days_per_week = typeof input.training_days_per_week === 'number' ? input.training_days_per_week : null;
  let preferred_days_off: string[];

  if (training_days.length >= 2) {
    // Explicit training days → derive everything else
    training_days_per_week = training_days.length;
    preferred_days_off = ALL_WEEKDAYS.filter((d) => !training_days.includes(d));
  } else {
    // Legacy path: count + days-off
    const preferredDaysOffRaw = normalizeList(input.preferred_days_off as unknown as string[]);
    const requestedDaysOff = preferredDaysOffRaw.includes('no_preference')
      ? []
      : preferredDaysOffRaw.filter((day) => day !== 'no_preference');
    preferred_days_off = resolvePreferredDaysOff(
      training_days_per_week,
      requestedDaysOff,
    ).resolvedDaysOff;
  }

  const allergyRaw = normalizeList(input.allergies_exclusions as unknown as string[]);
  const allergies_exclusions = allergyRaw.includes('none')
    ? ['none']
    : allergyRaw.filter((item) => item !== 'none');

  const refusedRaw = normalizeList(input.refused_foods as unknown as string[])
    .map((item) => REFUSAL_SYNONYMS[item] || item);
  const refused_foods = refusedRaw.includes('none')
    ? []
    : dedupe(refusedRaw.filter((item) => item !== 'none'));

  const techniqueRaw = normalizeList(input.technique_preferences as unknown as string[]);
  const technique_preferences = techniqueRaw.includes('none')
    ? []
    : techniqueRaw.filter((item) => item !== 'none');

  return {
    ...input,
    training_days,
    training_days_per_week,
    preferred_days_off,
    allergies_exclusions,
    refused_foods,
    technique_preferences,
  };
}
