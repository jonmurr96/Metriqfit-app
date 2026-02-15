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
  'preferred_days_off' | 'allergies_exclusions' | 'refused_foods' | 'technique_preferences'
> & {
  preferred_days_off: string[];
  allergies_exclusions: string[];
  refused_foods: string[];
  technique_preferences: string[];
};

export function normalizeOnboardingAnswers(input: Partial<OnboardingData>): NormalizedOnboardingAnswers {
  const preferredDaysOffRaw = normalizeList(input.preferred_days_off as unknown as string[]);
  const requestedDaysOff = preferredDaysOffRaw.includes('no_preference')
    ? []
    : preferredDaysOffRaw.filter((day) => day !== 'no_preference');
  const preferred_days_off = resolvePreferredDaysOff(
    typeof input.training_days_per_week === 'number' ? input.training_days_per_week : null,
    requestedDaysOff,
  ).resolvedDaysOff;

  const allergyRaw = normalizeList(input.allergies_exclusions as unknown as string[]);
  const allergies_exclusions = allergyRaw.includes('none')
    ? ['none']
    : allergyRaw.filter((item) => item !== 'none');

  const refusedRaw = normalizeList(input.refused_foods as unknown as string[])
    .map((item) => REFUSAL_SYNONYMS[item] || item);
  const refused_foods = refusedRaw.includes('none')
    ? []
    : refusedRaw.filter((item) => item !== 'none');

  const techniqueRaw = normalizeList(input.technique_preferences as unknown as string[]);
  const technique_preferences = techniqueRaw.includes('none')
    ? []
    : techniqueRaw.filter((item) => item !== 'none');

  return {
    ...input,
    preferred_days_off,
    allergies_exclusions,
    refused_foods,
    technique_preferences,
  };
}
