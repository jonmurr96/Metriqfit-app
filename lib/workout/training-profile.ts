export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type PrimaryGoal =
  | 'build_muscle'
  | 'lose_fat'
  | 'get_stronger'
  | 'improve_endurance'
  | 'general_fitness'
  | 'athletic_performance';

export type EquipmentAccess =
  | 'full_gym'
  | 'dumbbells_plus_bench'
  | 'dumbbells_only'
  | 'bands_only'
  | 'bodyweight_only'
  | 'other';

export type TrainingStylePreference =
  | 'bodybuilding'
  | 'strength'
  | 'general_fitness'
  | 'athletic'
  | 'balanced';

export type RecoveryBurden = 'low' | 'moderate' | 'high';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';

export type UserTrainingProfileInput = {
  daysPerWeek: number;
  experienceLevel: ExperienceLevel;
  primaryGoal: PrimaryGoal;
  equipmentAccess?: EquipmentAccess | string | null;
  injuries?: string[];
  preferredSplitFamily?: string | null;
  techniquePreferences?: string[];
  progressionPreference?: string | null;
  sessionEmphasis?: string | null;
  minutesPerWorkout?: string | number | null;
  sessionDurationTargetMin?: number | null;
  recoveryReason?: string | null;
  bodyFocusPreferences?: string[];
  activityLevel?: ActivityLevel | string | null;
};

export type UserTrainingProfile = {
  daysPerWeek: number;
  experienceLevel: ExperienceLevel;
  primaryGoal: PrimaryGoal;
  equipmentAccess: EquipmentAccess | 'other';
  injuries: string[];
  preferredSplitFamily: string | null;
  techniquePreferences: string[];
  progressionPreference: string | null;
  sessionEmphasis: string | null;
  sessionDurationMin: number | null;
  maxExercisesPerDay: number;
  trainingStylePreference: TrainingStylePreference;
  recoveryBurden: RecoveryBurden;
  bodyFocusPreferences: string[];
  activityLevel: ActivityLevel | null;
  prefersBodybuildingStyle: boolean;
  limitedEquipment: boolean;
};

const BODYBUILDING_SPLIT_HINTS = ['bro', 'arnold', 'bodypart', 'ppl'];
const STRENGTH_SPLIT_HINTS = ['powerbuilding', 'phul', 'phat', 'strength'];
const BODY_FOCUS_HINTS = ['chest', 'back', 'shoulders', 'arms', 'legs', 'glutes', 'hamstrings', 'quads', 'core'];

function normalizeToken(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function parseSessionDurationMinutes(value: string | number | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  const normalized = normalizeToken(typeof value === 'string' ? value : '');
  if (!normalized) return null;
  if (normalized === '90_plus') return 90;

  const numeric = Number.parseInt(normalized, 10);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

export function deriveMaxExercisesPerDay(
  sessionDurationMin: number | null,
  options: {
    experienceLevel?: ExperienceLevel;
    trainingStylePreference?: TrainingStylePreference | null;
  } = {},
) {
  const experience = options.experienceLevel || 'intermediate';
  const style = options.trainingStylePreference || 'balanced';

  if (experience === 'beginner') {
    if (!sessionDurationMin) return 5;
    if (sessionDurationMin <= 40) return 4;
    if (sessionDurationMin <= 60) return 5;
    if (sessionDurationMin <= 75) return 6;
    return 6;
  }

  if (experience === 'advanced' && style === 'bodybuilding') {
    if (!sessionDurationMin) return 6;
    if (sessionDurationMin <= 40) return 5;
    if (sessionDurationMin <= 60) return 7;
    if (sessionDurationMin <= 75) return 8;
    return 8;
  }

  if (!sessionDurationMin) return 6;
  if (sessionDurationMin <= 40) return 5;
  if (sessionDurationMin <= 60) return 6;
  if (sessionDurationMin <= 75) return 7;
  return 7;
}

export function deriveTrainingStylePreference(input: {
  primaryGoal: PrimaryGoal;
  preferredSplitFamily?: string | null;
  sessionEmphasis?: string | null;
  techniquePreferences?: string[];
}): TrainingStylePreference {
  const emphasis = normalizeToken(input.sessionEmphasis);
  const preferredSplit = normalizeToken(input.preferredSplitFamily);
  const techniques = (input.techniquePreferences || []).map((value) => normalizeToken(value));

  if (
    emphasis === 'hypertrophy'
    || BODYBUILDING_SPLIT_HINTS.some((hint) => preferredSplit.includes(hint))
    || techniques.some((value) => value.includes('bodybuilding') || value.includes('hypertrophy'))
  ) {
    return 'bodybuilding';
  }

  if (
    emphasis === 'strength'
    || input.primaryGoal === 'get_stronger'
    || STRENGTH_SPLIT_HINTS.some((hint) => preferredSplit.includes(hint))
  ) {
    return 'strength';
  }

  if (
    emphasis === 'conditioning'
    || input.primaryGoal === 'athletic_performance'
    || input.primaryGoal === 'improve_endurance'
    || techniques.some((value) => value.includes('athletic') || value.includes('sport'))
  ) {
    return 'athletic';
  }

  if (
    input.primaryGoal === 'general_fitness'
    || input.primaryGoal === 'lose_fat'
  ) {
    return 'general_fitness';
  }

  return 'balanced';
}

export function deriveRecoveryBurden(input: {
  injuries?: string[];
  daysPerWeek: number;
  sessionDurationMin: number | null;
  recoveryReason?: string | null;
  experienceLevel: ExperienceLevel;
  activityLevel?: ActivityLevel | string | null;
}) : RecoveryBurden {
  let score = 0;
  const injuries = (input.injuries || []).filter((value) => value && value !== 'none');

  if (injuries.length >= 2) score += 2;
  else if (injuries.length === 1) score += 1;

  if (input.daysPerWeek >= 6) score += 2;
  else if (input.daysPerWeek >= 5) score += 1;

  if ((input.sessionDurationMin || 0) >= 75) score += 1;

  const reason = normalizeToken(input.recoveryReason);
  if (reason === 'too_hard_to_recover' || reason === 'pain_or_discomfort') score += 2;

  if (input.experienceLevel === 'beginner' && input.daysPerWeek >= 5) score += 1;

  const activityLevel = normalizeToken(typeof input.activityLevel === 'string' ? input.activityLevel : '');
  if (activityLevel === 'very_active') score += 1;
  if (activityLevel === 'moderately_active' && input.daysPerWeek >= 5) score += 1;

  if (score >= 4) return 'high';
  if (score >= 2) return 'moderate';
  return 'low';
}

export function normalizeUserTrainingProfile(input: UserTrainingProfileInput): UserTrainingProfile {
  const sessionDurationMin = input.sessionDurationTargetMin
    ?? parseSessionDurationMinutes(input.minutesPerWorkout);
  const trainingStylePreference = deriveTrainingStylePreference({
    primaryGoal: input.primaryGoal,
    preferredSplitFamily: input.preferredSplitFamily,
    sessionEmphasis: input.sessionEmphasis,
    techniquePreferences: input.techniquePreferences,
  });

  const equipmentAccess = normalizeToken(input.equipmentAccess) || 'other';
  const normalizedEquipment = (
    equipmentAccess === 'full_gym'
    || equipmentAccess === 'dumbbells_plus_bench'
    || equipmentAccess === 'dumbbells_only'
    || equipmentAccess === 'bands_only'
    || equipmentAccess === 'bodyweight_only'
  )
    ? equipmentAccess
    : 'other';

  const bodyFocusPreferences = Array.from(new Set(
    (input.bodyFocusPreferences || input.techniquePreferences || [])
      .map((value) => normalizeToken(value))
      .filter((value) => BODY_FOCUS_HINTS.includes(value)),
  ));

  const activityLevel = (() => {
    const normalized = normalizeToken(typeof input.activityLevel === 'string' ? input.activityLevel : '');
    if (normalized === 'sedentary' || normalized === 'lightly_active' || normalized === 'moderately_active' || normalized === 'very_active') {
      return normalized;
    }
    return null;
  })();

  const recoveryBurden = deriveRecoveryBurden({
    injuries: input.injuries,
    daysPerWeek: input.daysPerWeek,
    sessionDurationMin,
    recoveryReason: input.recoveryReason,
    experienceLevel: input.experienceLevel,
    activityLevel,
  });

  return {
    daysPerWeek: input.daysPerWeek,
    experienceLevel: input.experienceLevel,
    primaryGoal: input.primaryGoal,
    equipmentAccess: normalizedEquipment,
    injuries: (input.injuries || []).filter(Boolean),
    preferredSplitFamily: input.preferredSplitFamily || null,
    techniquePreferences: (input.techniquePreferences || []).filter(Boolean),
    progressionPreference: input.progressionPreference || null,
    sessionEmphasis: input.sessionEmphasis || null,
    sessionDurationMin,
    maxExercisesPerDay: deriveMaxExercisesPerDay(sessionDurationMin, {
      experienceLevel: input.experienceLevel,
      trainingStylePreference,
    }),
    trainingStylePreference,
    recoveryBurden,
    bodyFocusPreferences,
    activityLevel,
    prefersBodybuildingStyle: trainingStylePreference === 'bodybuilding',
    limitedEquipment: normalizedEquipment !== 'full_gym',
  };
}
