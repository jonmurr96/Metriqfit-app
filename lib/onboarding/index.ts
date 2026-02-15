export { OnboardingProvider, useOnboarding } from './OnboardingContext';
export { normalizeOnboardingAnswers } from './normalize';
export { resolvePreferredDaysOff, formatWeekday } from './schedule';
export type { 
  OnboardingData,
  GoalType,
  ActivityLevel,
  SleepHours,
  ExperienceLevel,
  EquipmentAccess,
  DietaryPreference,
  GoalTimeline,
  MinutesPerWorkout,
  MealsPerDay,
  Weekday,
  Injury,
  AllergyExclusion,
  RefusedFood,
  ProgressionPreference,
  SessionEmphasis,
  PrepDiscipline,
  PrepPhase,
} from './OnboardingContext';
export type { NormalizedWeekday, PreferredDaysOffResolution } from './schedule';
