import { classifyExercise, type PatternSlot } from './exerciseClassification.ts';
import { normalizeWorkoutToken, type ProgramExercise } from './programMappingRules.ts';
import {
  resolveCoachExerciseCatalogEntry,
  type CoachAllowedUsage,
  type CoachExerciseStatus,
  type ExerciseComplexity,
  isExerciseAllowedForExperience,
  isSmithMachineExercise,
} from './coach-exercise-catalog.ts';
import type {
  EquipmentAccess,
  ExperienceLevel,
  PrimaryGoal,
  TrainingStylePreference,
} from './training-profile.ts';

export type ExerciseTier =
  | 'very_common'
  | 'common'
  | 'less_common'
  | 'uncommon'
  | 'specialty_only';

export type ExercisePriorityContext = {
  experienceLevel?: ExperienceLevel;
  equipmentAccess?: EquipmentAccess | 'other' | string | null;
  primaryGoal?: PrimaryGoal;
  trainingStylePreference?: TrainingStylePreference | null;
  sessionDurationMin?: number | null;
  injuries?: string[];
};

export type ExerciseQualityPolicy = {
  version: string;
  noveltyBudgetPerDay: number;
  minimumStandardRatio: number;
  minimumStapleRatio: number;
  explicitVarietyIntent: boolean;
  allowUncommonSelections: boolean;
  strictFullGymSubstitutions: boolean;
  /** Complexity filtering policy */
  maxAllowedComplexity: ExerciseComplexity;
  /** Block smith machine exercises when full gym available */
  preferFreeWeightsOverSmith: boolean;
};

export type ExerciseMetadata = {
  tier: ExerciseTier;
  patternSlot: PatternSlot;
  complexity: ExerciseComplexity;
  availabilityScore: number;
  familiarityScore: number;
  stabilityScore: number;
  setupSimplicityScore: number;
  progressionClarityScore: number;
  usefulnessScore: number;
  compositeScore: number;
  popularityScore: number;
  isFoundationalDefault: boolean;
  isAcceptableAlternate: boolean;
  isNoveltyRisk: boolean;
  fullGymSubstitutionRisk: boolean;
  isSmithMachine: boolean;
  /** Whether exercise complexity exceeds user experience level */
  complexityMismatch: boolean;
  injuryConflictRisk: number;
  reasons: string[];
  canonicalFamily: string;
  coachStatus: CoachExerciseStatus;
  allowedUsage: CoachAllowedUsage[];
};

const POLICY_VERSION = 'coach_conservative_defaults_v7_sprint4';

const FULL_GYM_BODYWEIGHT_EXCEPTIONS = new Set([
  'dip_press',
  'vertical_pull_default',
]);

const INJURY_RISK_KEYWORDS: Record<string, string[]> = {
  shoulders: ['overhead press', 'barbell overhead', 'upright row', 'behind neck', 'skull crusher'],
  knees: ['sissy squat', 'box jump', 'plyometric'],
  back: ['good morning', 'stiff leg deadlift'],
  wrists: ['close grip bench', 'skull crusher'],
  hips: ['deep squat'],
  elbows: ['skull crusher', 'preacher curl'],
  neck: ['upright row', 'behind neck'],
};

function clampScore(value: number) {
  return Math.max(1, Math.min(5, Math.round(value)));
}

function loadPopularityScore(exercise: ProgramExercise) {
  return Number((exercise as { popularity_score?: number }).popularity_score ?? 50);
}

function normalizeEquipmentAccess(equipmentAccess: ExercisePriorityContext['equipmentAccess']) {
  const normalized = normalizeWorkoutToken(typeof equipmentAccess === 'string' ? equipmentAccess : '');
  return normalized.replace(/\s+/g, '_') || 'other';
}

function hasExplicitVarietyIntent(context: ExercisePriorityContext) {
  return context.trainingStylePreference === 'bodybuilding'
    || context.trainingStylePreference === 'athletic';
}

function computeInjuryConflictRisk(name: string, context: ExercisePriorityContext) {
  const injuries = (context.injuries || [])
    .map((injury) => normalizeWorkoutToken(injury))
    .filter(Boolean);

  if (!injuries.length) return 0;

  return injuries.reduce((count, injury) => (
    count + ((INJURY_RISK_KEYWORDS[injury] || []).some((keyword) => name.includes(normalizeWorkoutToken(keyword))) ? 1 : 0)
  ), 0);
}

function usageMatchesContext(
  allowedUsage: CoachAllowedUsage[],
  context: ExercisePriorityContext,
) {
  if (!allowedUsage.length || allowedUsage.includes('general')) {
    return true;
  }

  const equipmentAccess = normalizeEquipmentAccess(context.equipmentAccess);
  const limitedEquipment = ['dumbbells_plus_bench', 'dumbbells_only', 'bands_only', 'bodyweight_only'].includes(equipmentAccess);

  if (limitedEquipment && allowedUsage.includes('limited_equipment')) {
    return true;
  }

  if (context.trainingStylePreference === 'bodybuilding' && allowedUsage.includes('hypertrophy')) {
    return true;
  }

  if (
    (context.primaryGoal === 'build_muscle' || context.primaryGoal === 'general_fitness' || context.primaryGoal === 'lose_fat')
    && allowedUsage.includes('hypertrophy')
  ) {
    return true;
  }

  if (
    (context.primaryGoal === 'get_stronger' || context.trainingStylePreference === 'strength')
    && allowedUsage.includes('strength_anchor')
  ) {
    return true;
  }

  if (allowedUsage.includes('vertical_pull_progression') || allowedUsage.includes('bodyweight_progression')) {
    return true;
  }

  return false;
}

function coachTierForStatus(
  status: CoachExerciseStatus,
  popularityScore: number,
  policy: ExerciseQualityPolicy,
) {
  if (status === 'disallowed') return 'specialty_only';
  if (status === 'approved_default') {
    return popularityScore >= 70 ? 'very_common' : 'common';
  }
  if (status === 'approved_alternate') {
    return 'common';
  }
  if (policy.explicitVarietyIntent || popularityScore >= 80) {
    return 'common';
  }
  return 'less_common';
}

export function buildExerciseQualityPolicy(context: ExercisePriorityContext = {}): ExerciseQualityPolicy {
  const experience = context.experienceLevel || 'intermediate';
  const explicitVarietyIntent = hasExplicitVarietyIntent(context);
  const strictFullGymSubstitutions = normalizeEquipmentAccess(context.equipmentAccess) === 'full_gym';
  
  // Determine max allowed complexity based on experience
  let maxAllowedComplexity: ExerciseComplexity;
  switch (experience) {
    case 'beginner':
      maxAllowedComplexity = 'foundational';
      break;
    case 'intermediate':
      maxAllowedComplexity = 'intermediate';
      break;
    case 'advanced':
      maxAllowedComplexity = 'advanced';
      break;
    default:
      maxAllowedComplexity = 'intermediate';
  }

  if (experience === 'beginner') {
    return {
      version: POLICY_VERSION,
      noveltyBudgetPerDay: 0,
      minimumStandardRatio: 0.9,
      minimumStapleRatio: 0.55,
      explicitVarietyIntent: false,
      allowUncommonSelections: false,
      strictFullGymSubstitutions,
      maxAllowedComplexity,
      preferFreeWeightsOverSmith: strictFullGymSubstitutions,
    };
  }

  if (experience === 'intermediate') {
    return {
      version: POLICY_VERSION,
      noveltyBudgetPerDay: explicitVarietyIntent ? 2 : 1,
      minimumStandardRatio: 0.8,
      minimumStapleRatio: 0.45,
      explicitVarietyIntent,
      allowUncommonSelections: explicitVarietyIntent,
      strictFullGymSubstitutions,
      maxAllowedComplexity,
      preferFreeWeightsOverSmith: strictFullGymSubstitutions,
    };
  }

  return {
    version: POLICY_VERSION,
    noveltyBudgetPerDay: explicitVarietyIntent ? 2 : 1,
    minimumStandardRatio: explicitVarietyIntent ? 0.75 : 0.8,
    minimumStapleRatio: explicitVarietyIntent ? 0.35 : 0.4,
    explicitVarietyIntent,
    allowUncommonSelections: explicitVarietyIntent,
    strictFullGymSubstitutions,
    maxAllowedComplexity,
    preferFreeWeightsOverSmith: false, // Advanced users can choose
  };
}

export function buildExerciseMetadata(
  exercise: ProgramExercise,
  context: ExercisePriorityContext = {},
): ExerciseMetadata {
  const classification = classifyExercise(exercise);
  const policy = buildExerciseQualityPolicy(context);
  const name = normalizeWorkoutToken(exercise.name || '');
  const popularityScore = loadPopularityScore(exercise);
  const coachEntry = resolveCoachExerciseCatalogEntry(exercise);
  const injuryConflictRisk = computeInjuryConflictRisk(name, context);
  const isFoundationalDefault = coachEntry.status === 'approved_default';
  const isAcceptableAlternate = coachEntry.status === 'approved_alternate';
  const usageAligned = usageMatchesContext(coachEntry.allowedUsage, context);
  
  // Check if this is a smith machine exercise
  const isSmithMachine = isSmithMachineExercise(exercise.name || '');

  const fullGymSubstitutionRisk = policy.strictFullGymSubstitutions
    && coachEntry.equipmentTier !== 'full_gym_basic'
    && !FULL_GYM_BODYWEIGHT_EXCEPTIONS.has(coachEntry.canonicalFamily);
  
  // Check smith machine preference violation
  const smithMachineViolation = policy.preferFreeWeightsOverSmith && isSmithMachine;

  const isNoveltyRisk = coachEntry.status === 'disallowed';
  const tier = coachTierForStatus(coachEntry.status, popularityScore, policy);
  
  // Check complexity mismatch
  const complexityOrder = { foundational: 0, intermediate: 1, advanced: 2 };
  const complexityMismatch = complexityOrder[coachEntry.complexity] > complexityOrder[policy.maxAllowedComplexity];

  const availabilityScore = clampScore(
    coachEntry.status === 'disallowed'
      ? 1
      : fullGymSubstitutionRisk || smithMachineViolation
      ? 2
      : coachEntry.equipmentTier === 'full_gym_basic'
      ? 5
      : coachEntry.equipmentTier === 'home_basic'
      ? 4
      : coachEntry.equipmentTier === 'bodyweight_basic'
      ? 4
      : coachEntry.equipmentTier === 'conditioning_basic'
      ? 4
      : 1,
  );

  const familiarityScore = clampScore(
    coachEntry.status === 'approved_default'
      ? 5
      : coachEntry.status === 'approved_alternate'
      ? 4
      : coachEntry.status === 'approved_progression'
      ? 3
      : 1,
  );

  const stabilityScore = clampScore(
    coachEntry.status === 'disallowed'
      ? 1
      : fullGymSubstitutionRisk || smithMachineViolation
      ? 2
      : coachEntry.status === 'approved_default'
      ? 5
      : coachEntry.status === 'approved_alternate'
      ? 4
      : 3,
  );

  const setupSimplicityScore = clampScore(
    coachEntry.status === 'disallowed'
      ? 1
      : fullGymSubstitutionRisk || smithMachineViolation
      ? 2
      : coachEntry.equipmentTier === 'full_gym_basic'
      ? 5
      : 4,
  );

  const progressionClarityScore = clampScore(
    coachEntry.status === 'disallowed'
      ? 1
      : coachEntry.status === 'approved_default'
      ? 5
      : 4,
  );

  const usefulnessScore = clampScore(
    coachEntry.status === 'disallowed'
      ? 1
      : !usageAligned
      ? 2
      : coachEntry.status === 'approved_default'
      ? 5
      : 4,
  );

  const compositeScore = Number(((
    availabilityScore
      + familiarityScore
      + stabilityScore
      + setupSimplicityScore
      + progressionClarityScore
      + usefulnessScore
  ) / 6).toFixed(2));

  const reasons = [...coachEntry.reasons];
  if (usageAligned) reasons.push('usage_aligned');
  else reasons.push('usage_mismatch');
  if (fullGymSubstitutionRisk) reasons.push('full_gym_substitution_risk');
  if (smithMachineViolation) reasons.push('smith_machine_avoided');
  if (injuryConflictRisk > 0) reasons.push('injury_conflict_risk');
  if (complexityMismatch) reasons.push('complexity_mismatch');
  if (classification.patternSlot === 'unknown' && coachEntry.status !== 'disallowed') {
    reasons.push('legacy_pattern_unknown');
  }

  return {
    tier,
    patternSlot: coachEntry.movementRole !== 'unknown' ? coachEntry.movementRole : classification.patternSlot,
    complexity: coachEntry.complexity,
    availabilityScore,
    familiarityScore,
    stabilityScore,
    setupSimplicityScore,
    progressionClarityScore,
    usefulnessScore,
    compositeScore,
    popularityScore,
    isFoundationalDefault,
    isAcceptableAlternate,
    isNoveltyRisk,
    fullGymSubstitutionRisk,
    isSmithMachine,
    complexityMismatch,
    injuryConflictRisk,
    reasons,
    canonicalFamily: coachEntry.canonicalFamily,
    coachStatus: coachEntry.status,
    allowedUsage: coachEntry.allowedUsage,
  };
}

export function isStandardWorkoutExercise(exercise: ProgramExercise, context: ExercisePriorityContext = {}) {
  const metadata = buildExerciseMetadata(exercise, context);
  return metadata.coachStatus !== 'disallowed' && metadata.patternSlot !== 'unknown' && !metadata.complexityMismatch;
}

export function isNonDefaultExerciseTier(tier: ExerciseTier) {
  return tier === 'uncommon' || tier === 'specialty_only';
}

export function isExerciseTierAllowedForPolicy(
  tier: ExerciseTier,
  context: ExercisePriorityContext = {},
) {
  if (tier === 'specialty_only') return false;
  if (tier === 'uncommon' && !buildExerciseQualityPolicy(context).allowUncommonSelections) {
    return false;
  }
  return true;
}

/**
 * Check if an exercise is appropriate for the user's experience level
 * considering complexity and equipment access
 */
export function isExerciseAppropriateForUser(
  exercise: ProgramExercise,
  context: ExercisePriorityContext = {},
): boolean {
  const metadata = buildExerciseMetadata(exercise, context);
  
  // Block disallowed exercises
  if (metadata.coachStatus === 'disallowed') return false;
  
  // Block complexity mismatches
  if (metadata.complexityMismatch) return false;
  
  // For beginners with full gym, block smith machine exercises
  if (context.experienceLevel === 'beginner') {
    const equipmentAccess = normalizeEquipmentAccess(context.equipmentAccess);
    if (equipmentAccess === 'full_gym' && metadata.isSmithMachine) {
      return false;
    }
  }
  
  return true;
}

export function exerciseTierScore(tier: ExerciseTier) {
  switch (tier) {
    case 'very_common':
      return 80;
    case 'common':
      return 48;
    case 'less_common':
      return 16;
    case 'uncommon':
      return -22;
    case 'specialty_only':
      return -180;
  }
}

export function scoreExerciseForSelection(
  exercise: ProgramExercise,
  context: ExercisePriorityContext = {},
) {
  const metadata = buildExerciseMetadata(exercise, context);
  const policy = buildExerciseQualityPolicy(context);

  let score = exerciseTierScore(metadata.tier);
  score += metadata.stabilityScore * 12;
  score += metadata.setupSimplicityScore * 8;
  score += metadata.progressionClarityScore * 12;
  score += metadata.usefulnessScore * 10;
  score += metadata.familiarityScore * 8;
  if (metadata.coachStatus === 'approved_default') score += 28;
  if (metadata.coachStatus === 'approved_alternate') score += 10;
  if (metadata.coachStatus === 'approved_progression') score += 4;
  if (metadata.fullGymSubstitutionRisk) score -= policy.strictFullGymSubstitutions ? 90 : 24;
  if (metadata.isSmithMachine && policy.preferFreeWeightsOverSmith) score -= 70;
  if (metadata.isNoveltyRisk) score -= 90;
  if (metadata.complexityMismatch) score -= 100;
  if (metadata.injuryConflictRisk) score -= metadata.injuryConflictRisk * 32;
  if (context.primaryGoal === 'general_fitness' || context.primaryGoal === 'lose_fat') {
    score += metadata.isFoundationalDefault ? 10 : 0;
  }
  return score;
}
