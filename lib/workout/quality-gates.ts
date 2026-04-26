/**
 * quality-gates.ts
 *
 * Pre-save workout validation. These gates run after exercise selection and
 * before persistence so low-quality plans fail closed instead of reaching the
 * user. The checks are intentionally rules-first and deterministic.
 */

import type { PoolExercise } from './exercise-pool.ts';
import {
  buildExerciseMetadata,
  buildExerciseQualityPolicy,
  type ExercisePriorityContext,
  type ExerciseQualityPolicy,
} from './exercise-priority.ts';
import { classifyExercise, type PatternSlot } from './exerciseClassification.ts';
import type { SlotEntry } from './generated-split-selection.ts';
import type { CoachRecipeSlot } from './coach-day-recipes.ts';
import {
  deriveMaxExercisesPerDay,
  type ExperienceLevel,
  type UserTrainingProfile,
} from './training-profile.ts';
import {
  analyzeWeeklyVolume,
  getVolumeLandmark,
  type MuscleGroup,
  type WeeklyVolumeAnalysis,
} from './volume-landmarks.ts';
import {
  checkPlanForInjuryConflicts,
  getExerciseConflicts,
  parseInjuries,
  type InjuryType,
} from './injury-substitutions.ts';

type SelectedProgrammingExercise = {
  exercise: PoolExercise;
  slot: PatternSlot | null;
  sets: number;
  repRange: [number, number];
  restSeconds: number;
};

type WorkoutQualityDayInput = {
  dayName: string;
  focusTags: string[];
  exercises: PoolExercise[];
  slots?: SlotEntry[];
  recipeId?: string | null;
  recipeGoal?: string | null;
  recipeSlots?: CoachRecipeSlot[] | null;
  recipeFallbackReason?: string | null;
  selectedExercises?: SelectedProgrammingExercise[] | null;
  estimatedDurationMin?: number | null;
  allowDuplicateMovementFamilies?: boolean;
};

export type QualityGateInput = {
  workoutDays: WorkoutQualityDayInput[];
  experienceLevel?: ExperienceLevel;
  trainingProfile?: Pick<
    UserTrainingProfile,
    'experienceLevel'
    | 'equipmentAccess'
    | 'primaryGoal'
    | 'trainingStylePreference'
    | 'sessionDurationMin'
    | 'injuries'
    | 'recoveryBurden'
  >;
};

export type QualityGateResult = {
  passed: boolean;
  warnings: string[];
  fixes: {
    dayIndex: number;
    type:
      | 'add_rear_delt'
      | 'replace_low_popularity'
      | 'add_compound'
      | 'replace_low_priority_exercise'
      | 'replace_novelty_exercise'
      | 'replace_full_gym_substitution'
      | 'repair_focus_mismatch'
      | 'reduce_session_overflow'
      | 'repair_slot_coverage'
      | 'resolve_recovery_conflict'
      | 'replace_complexity_mismatch'
      | 'replace_smith_machine'
      | 'reduce_excessive_volume'
      | 'increase_insufficient_volume'
      | 'substitute_injury_conflict';
    exerciseIndex?: number;
    muscleGroup?: string;
  }[];
  metrics: {
    pushSets: number;
    pullSets: number;
    pushPullRatio: number | null;
    rearDeltDaysWithCoverage: number;
    rearDeltDaysMissing: number;
    compoundDaysWithCoverage: number;
    lowestPopularityScore: number | null;
    standardTierRatio: number;
      stapleRatio: number;
      specialtyExerciseCount: number;
      disallowedExerciseCount: number;
      focusMismatchDays: number;
      recipeMismatchDays: number;
      recoveryConflictDays: number;
      averageStabilityScore: number;
      averageSetupBurdenScore: number;
    averageProgressionClarityScore: number;
    fullGymSubstitutionViolations: number;
    uncommonCountPerDay: number[];
    complexityMismatchCount: number;
    smithMachineCount: number;
    // Sprint 3: Volume landmarks
    weeklyVolumeAnalysis: WeeklyVolumeAnalysis | null;
    musclesAboveMRV: number;
    musclesBelowMEV: number;
    // Sprint 3: Injury conflicts
    injuryConflictCount: number;
    injuryConflictsByType: Record<InjuryType, number>;
  };
  policy: ExerciseQualityPolicy;
  nonStapleSelections: Array<{
    dayName: string;
    exerciseName: string;
    tier: string;
    reasons: string[];
  }>;
  // Sprint 3: Volume analysis
  volumeAnalysis: WeeklyVolumeAnalysis | null;
  // Sprint 3: Injury conflicts
  injuryConflicts: Array<{
    dayIndex: number;
    exerciseIndex: number;
    exerciseName: string;
    conflictingInjuries: InjuryType[];
    suggestedReplacement?: string;
  }>;
};

const PUSH_PATTERNS = new Set(['horizontal_push', 'incline_push', 'vertical_push', 'dip', 'fly']);
const PULL_PATTERNS = new Set(['horizontal_pull', 'vertical_pull']);
const PUSH_SPLIT_TAGS = new Set(['push', 'chest', 'triceps']);
const PULL_SPLIT_TAGS = new Set(['pull', 'back', 'biceps']);
const LOWER_FOCUS_TAGS = new Set(['legs', 'lower', 'glutes', 'hamstrings', 'quads']);
const UPPER_FOCUS_TAGS = new Set(['upper', 'push', 'pull', 'back', 'chest', 'shoulders', 'arms']);
const REAR_DELT_KEYWORDS = ['rear delt', 'face pull', 'reverse pec', 'rear fly'];
const REAR_DELT_MUSCLES = ['rear_delts', 'rear_delt'];
const COMPOUND_PATTERNS = new Set([
  'horizontal_push',
  'incline_push',
  'vertical_push',
  'dip',
  'horizontal_pull',
  'vertical_pull',
  'squat',
  'hip_hinge',
  'lunge',
  'hip_thrust',
  'carry',
]);
const POPULARITY_FLOOR: Record<string, number> = {
  beginner: 65,
  intermediate: 55,
  advanced: 45,
};

// Map common synonyms to canonical volume muscles
function mapToVolumeMuscle(muscle: string): MuscleGroup | null {
  const normalized = muscle.toLowerCase();
  if (normalized === 'lats' || normalized === 'back') return 'back';
  if (normalized === 'quads' || normalized === 'quadriceps') return 'quads';
  if (normalized === 'chest' || normalized === 'pectorals') return 'chest';
  if (normalized === 'biceps' || normalized === 'bicep') return 'biceps';
  if (normalized === 'triceps' || normalized === 'tricep') return 'triceps';
  if (normalized === 'glutes' || normalized === 'glute') return 'glutes';
  if (normalized === 'hamstrings' || normalized === 'hamstring') return 'hamstrings';
  if (normalized === 'shoulders' || normalized === 'shoulder') return 'shoulders';
  if (normalized === 'calves' || normalized === 'calf') return 'calves';
  if (normalized === 'abs' || normalized === 'abdominals') return 'abs';
  if (normalized === 'forearms' || normalized === 'forearm') return 'forearms';
  if (normalized === 'traps' || normalized === 'trapezius') return 'traps';
  if (normalized === 'rear_delts' || normalized === 'rear_delt') return 'rear_delts';
  return null;
}

function isPushExercise(ex: PoolExercise) {
  if (ex.pattern && PUSH_PATTERNS.has(ex.pattern)) return true;
  return !!ex.split_tags?.some((tag) => PUSH_SPLIT_TAGS.has(tag));
}

function isPullExercise(ex: PoolExercise) {
  if (ex.pattern && PULL_PATTERNS.has(ex.pattern)) return true;
  return !!ex.split_tags?.some((tag) => PULL_SPLIT_TAGS.has(tag));
}

function isRearDeltExercise(ex: PoolExercise) {
  const nameLower = (ex.name ?? '').toLowerCase();
  if (REAR_DELT_KEYWORDS.some((keyword) => nameLower.includes(keyword))) return true;
  return !!ex.primary_muscles?.some((muscle) => REAR_DELT_MUSCLES.includes(muscle));
}

function isCompoundExercise(ex: PoolExercise) {
  if (ex.is_compound) return true;
  return !!(ex.pattern && COMPOUND_PATTERNS.has(ex.pattern));
}

function isMixedFullBodyDay(focusTags: string[]) {
  const tags = new Set(focusTags);
  const hasLower = Array.from(LOWER_FOCUS_TAGS).some((tag) => tags.has(tag));
  const hasUpper = Array.from(UPPER_FOCUS_TAGS).some((tag) => tags.has(tag));
  return hasLower && hasUpper;
}

function isUpperOrPushPullDay(focusTags: string[]) {
  if (isMixedFullBodyDay(focusTags)) return false;
  const tags = new Set(focusTags);
  return (
    tags.has('upper')
    || tags.has('push')
    || tags.has('pull')
    || tags.has('back')
    || tags.has('chest')
    || tags.has('shoulders')
  );
}

function expectedSlotsForFocus(focusTags: string[]) {
  const tags = new Set(focusTags);
  const expected = new Set<PatternSlot>();

  if (tags.has('full_body')) {
    expected.add('compound_squat');
    expected.add('compound_hinge');
    expected.add('horizontal_push');
    expected.add('horizontal_pull');
  }

  if (tags.has('push') || tags.has('chest')) {
    expected.add('horizontal_push');
    expected.add('vertical_push');
  }

  if (tags.has('pull') || tags.has('back')) {
    expected.add('horizontal_pull');
    expected.add('vertical_pull');
  }

  if (tags.has('shoulders')) {
    expected.add('vertical_push');
    expected.add('shoulder_raise');
    expected.add('rear_delt');
  }

  if (tags.has('arms')) {
    expected.add('bicep_curl');
    expected.add('tricep_ext');
  }

  if (tags.has('legs') || tags.has('lower') || tags.has('glutes') || tags.has('hamstrings')) {
    expected.add('compound_squat');
    expected.add('compound_hinge');
  }

  return expected;
}

function focusMatchRatio(day: WorkoutQualityDayInput) {
  if (day.recipeSlots?.length) {
    const allowedSlots = new Set(day.recipeSlots.map((slot) => slot.slot));
    const selectedSlots = (day.selectedExercises?.length
      ? day.selectedExercises.map((entry) => entry.slot || classifyExercise(entry.exercise).patternSlot)
      : day.exercises.map((exercise) => classifyExercise(exercise).patternSlot)
    ).filter(Boolean);

    if (!selectedSlots.length) return 0;
    const matched = selectedSlots.filter((slot) => allowedSlots.has(slot as PatternSlot)).length;
    return matched / selectedSlots.length;
  }

  const expected = expectedSlotsForFocus(day.focusTags);
  if (!expected.size || !day.exercises.length) return 1;

  const matched = day.exercises.filter((exercise) => {
    const slot = classifyExercise(exercise).patternSlot;
    if (expected.has(slot)) return true;
    if (day.focusTags.includes('push') && ['rear_delt', 'tricep_ext', 'chest_fly'].includes(slot)) return true;
    if (day.focusTags.includes('pull') && ['rear_delt', 'bicep_curl'].includes(slot)) return true;
    if (day.focusTags.includes('chest') && ['chest_fly', 'tricep_ext', 'shoulder_raise', 'rear_delt'].includes(slot)) return true;
    if (day.focusTags.includes('back') && ['rear_delt', 'bicep_curl', 'conditioning', 'core'].includes(slot)) return true;
    if (day.focusTags.includes('shoulders') && ['rear_delt', 'tricep_ext', 'bicep_curl'].includes(slot)) return true;
    if (day.focusTags.includes('arms') && ['bicep_curl', 'tricep_ext', 'shoulder_raise', 'rear_delt'].includes(slot)) return true;
    if ((day.focusTags.includes('legs') || day.focusTags.includes('lower')) && ['single_leg', 'leg_extension', 'leg_curl', 'calf', 'hip_thrust', 'core'].includes(slot)) return true;
    return false;
  }).length;

  return matched / day.exercises.length;
}

function missingRequiredSlots(day: WorkoutQualityDayInput) {
  const sourceSlots = day.recipeSlots || day.slots;
  if (!sourceSlots?.length) return [];

  const selectedSlots = new Set(
    day.selectedExercises?.length
      ? day.selectedExercises.map((entry) => entry.slot || classifyExercise(entry.exercise).patternSlot)
      : day.exercises.map((exercise) => classifyExercise(exercise).patternSlot),
  );
  return sourceSlots
    .filter((slot) => slot.priority <= 2)
    .filter((slot) => !selectedSlots.has(slot.slot))
    .map((slot) => slot.slot);
}

function dayHasHeavyLowerStress(day: WorkoutQualityDayInput) {
  if (day.focusTags.some((tag) => ['legs', 'lower', 'glutes', 'hamstrings'].includes(tag))) {
    return true;
  }

  return day.exercises.some((exercise) => {
    const slot = classifyExercise(exercise).patternSlot;
    return slot === 'compound_squat' || slot === 'compound_hinge';
  });
}

function slotDuplicationIssues(day: WorkoutQualityDayInput) {
  const sourceSlots = day.recipeSlots || day.slots;
  if (day.allowDuplicateMovementFamilies || !sourceSlots?.length) return [];

  const counts = new Map<PatternSlot, number>();
  for (const entry of day.selectedExercises?.length ? day.selectedExercises : day.exercises.map((exercise) => ({ exercise, slot: classifyExercise(exercise).patternSlot }))) {
    const slot = entry.slot || classifyExercise(entry.exercise).patternSlot;
    counts.set(slot, (counts.get(slot) || 0) + 1);
  }

  const allowedCounts = new Map<PatternSlot, number>();
  for (const slot of sourceSlots || []) {
    allowedCounts.set(slot.slot, (allowedCounts.get(slot.slot) || 0) + 1);
  }

  const monitored = new Set<PatternSlot>([
    'compound_squat',
    'compound_hinge',
    'horizontal_push',
    'vertical_push',
    'horizontal_pull',
    'vertical_pull',
    'single_leg',
    'hip_thrust',
  ]);

  return Array.from(counts.entries())
    .filter(([slot]) => monitored.has(slot))
    .filter(([slot, count]) => count > (allowedCounts.get(slot) || 1))
    .map(([slot]) => slot);
}

function buildQualityContext(input: QualityGateInput): ExercisePriorityContext {
  const profile = input.trainingProfile;
  return {
    experienceLevel: profile?.experienceLevel || input.experienceLevel || 'intermediate',
    equipmentAccess: profile?.equipmentAccess || 'other',
    primaryGoal: profile?.primaryGoal,
    trainingStylePreference: profile?.trainingStylePreference,
    sessionDurationMin: profile?.sessionDurationMin,
    injuries: profile?.injuries || [],
    recoveryBurden: profile?.recoveryBurden,
  };
}

function computeSessionBudget(
  day: WorkoutQualityDayInput,
  qualityContext: ExercisePriorityContext,
) {
  const compoundCount = day.exercises.filter(isCompoundExercise).length;
  const baseMax = deriveMaxExercisesPerDay(day.estimatedDurationMin ?? qualityContext.sessionDurationMin ?? null, {
    experienceLevel: qualityContext.experienceLevel,
    trainingStylePreference: qualityContext.trainingStylePreference,
  });
  return Math.max(3, baseMax - (compoundCount >= 2 ? 1 : 0));
}

function averageScore(values: number[]) {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

export function runQualityGates(input: QualityGateInput): QualityGateResult {
  const qualityContext = buildQualityContext(input);
  const experienceLevel = qualityContext.experienceLevel || 'intermediate';
  const policy = buildExerciseQualityPolicy(qualityContext);
  const { workoutDays } = input;
  const warnings: string[] = [];
  const fixes: QualityGateResult['fixes'] = [];
  const floor = POPULARITY_FLOOR[experienceLevel] ?? 55;
  const popularityValues = workoutDays
    .flatMap((day) => day.exercises || [])
    .map((exercise) => exercise.popularity_score ?? 50)
    .filter((value) => Number.isFinite(value));
  const hasPopularitySignal = new Set(popularityValues).size > 1 || popularityValues.some((value) => value > floor);

  let totalPushSets = 0;
  let totalPullSets = 0;
  let lowestScore: number | null = null;
  let rearDeltCoverageCount = 0;
  let rearDeltMissingCount = 0;
  let rearDeltTargetDays = 0;
  let compoundDaysCount = 0;
  let standardTierCount = 0;
  let stapleCount = 0;
  let totalExerciseCount = 0;
  let specialtyExerciseCount = 0;
  let disallowedExerciseCount = 0;
  let focusMismatchDays = 0;
  let recipeMismatchDays = 0;
  let recoveryConflictDays = 0;
  let fullGymSubstitutionViolations = 0;
  let complexityMismatchCount = 0;
  let smithMachineCount = 0;
  
  // Sprint 3: Volume tracking
  let muscleVolumes: Record<MuscleGroup, number> = {
    chest: 0, back: 0, shoulders: 0, quads: 0, hamstrings: 0,
    glutes: 0, biceps: 0, triceps: 0, calves: 0, abs: 0,
    forearms: 0, traps: 0, rear_delts: 0,
  };
  let musclesAboveMRV = 0;
  let musclesBelowMEV = 0;
  
  // Sprint 3: Injury tracking
  let injuryConflictCount = 0;
  const injuryConflictsByType: Record<InjuryType, number> = {
    knees: 0, back: 0, shoulders: 0, wrists: 0, ankles: 0, hips: 0, elbows: 0, neck: 0,
  };
  const injuryConflicts: QualityGateResult['injuryConflicts'] = [];
  const userInjuries = parseInjuries(qualityContext.injuries || []);

  const uncommonCountPerDay: number[] = [];
  const stabilityScores: number[] = [];
  const setupScores: number[] = [];
  const progressionScores: number[] = [];
  const nonStapleSelections: QualityGateResult['nonStapleSelections'] = [];

  for (const [dayIdx, day] of workoutDays.entries()) {
    for (const [exerciseIdx, exercise] of day.exercises.entries()) {
      const sets = 3;
      const metadata = buildExerciseMetadata(exercise, qualityContext);

      if (isPushExercise(exercise)) totalPushSets += sets;
      if (isPullExercise(exercise)) totalPullSets += sets;

      totalExerciseCount += 1;
      stabilityScores.push(metadata.stabilityScore);
      setupScores.push(metadata.setupSimplicityScore);
      progressionScores.push(metadata.progressionClarityScore);

      if (metadata.tier === 'very_common' || metadata.tier === 'common') standardTierCount += 1;
      if (metadata.isFoundationalDefault) stapleCount += 1;
      if (metadata.tier === 'specialty_only') specialtyExerciseCount += 1;
      if (metadata.coachStatus === 'disallowed') disallowedExerciseCount += 1;
      if (metadata.fullGymSubstitutionRisk) fullGymSubstitutionViolations += 1;
      if (metadata.complexityMismatch) complexityMismatchCount += 1;
      if (metadata.isSmithMachine) smithMachineCount += 1;
      
      // Sprint 3: Track volume by muscle group (assume 3 sets per exercise)
      const primaryMuscles = exercise.primary_muscles || (exercise.primary_muscle ? [exercise.primary_muscle] : []);
      primaryMuscles.forEach((muscle) => {
        const canonical = mapToVolumeMuscle(muscle);
        if (canonical && Object.prototype.hasOwnProperty.call(muscleVolumes, canonical)) {
          muscleVolumes[canonical as MuscleGroup] += sets;
        }
      });
      
      // Sprint 3: Check for injury conflicts
      if (userInjuries.length > 0) {
        const conflicts = getExerciseConflicts(exercise, userInjuries);
        if (conflicts.hasConflict) {
          injuryConflictCount += 1;
          conflicts.conflictingInjuries.forEach((injury) => {
            injuryConflictsByType[injury] += 1;
          });
          injuryConflicts.push({
            dayIndex: dayIdx,
            exerciseIndex: exerciseIdx,
            exerciseName: exercise.name || 'Unknown',
            conflictingInjuries: conflicts.conflictingInjuries,
          });
        }
      }
    }
  }

  let pushPullRatio: number | null = null;
  if (totalPullSets > 0) {
    pushPullRatio = totalPushSets / totalPullSets;
    if (pushPullRatio < 0.75) {
      warnings.push(
        `Push:Pull ratio is ${pushPullRatio.toFixed(2)} (${totalPushSets} push sets vs ${totalPullSets} pull sets). ` +
        `Target 0.85–1.15. Consider adding more push volume or reducing pull volume.`,
      );
    } else if (pushPullRatio > 1.45) {
      warnings.push(
        `Push:Pull ratio is ${pushPullRatio.toFixed(2)} (${totalPushSets} push sets vs ${totalPullSets} pull sets). ` +
        `High push volume risks shoulder irritation. Add more rows or reduce pressing duplication.`,
      );
    }
  }

  workoutDays.forEach((day, dayIdx) => {
    if (isUpperOrPushPullDay(day.focusTags)) {
      rearDeltTargetDays += 1;
      if (day.exercises.some(isRearDeltExercise)) {
        rearDeltCoverageCount += 1;
      }
    }

    const hasCompound = day.exercises.some(isCompoundExercise);
    if (hasCompound) {
      compoundDaysCount += 1;
    } else if (day.focusTags.some((tag) => !['core', 'conditioning', 'arms'].includes(tag))) {
      warnings.push(
        `${day.dayName}: No compound exercise found. Every strength or hypertrophy day should anchor with at least one multi-joint movement.`,
      );
      fixes.push({ dayIndex: dayIdx, type: 'add_compound' });
    }

    const missingSlots = missingRequiredSlots(day);
    if (missingSlots.length) {
      recipeMismatchDays += 1;
      warnings.push(
        `${day.dayName}: Missing required movement slots (${missingSlots.join(', ')}). The day focus and selected exercise list do not line up.`,
      );
      fixes.push({ dayIndex: dayIdx, type: 'repair_slot_coverage' });
    }

    const matchRatio = focusMatchRatio(day);
    if (matchRatio < (day.recipeSlots?.length ? 0.8 : 0.6)) {
      focusMismatchDays += 1;
      warnings.push(
        `${day.dayName}: Day focus mismatch. Only ${(matchRatio * 100).toFixed(0)}% of exercises match the stated day purpose${day.recipeId ? ` for recipe ${day.recipeId}` : ''}.`,
      );
      fixes.push({ dayIndex: dayIdx, type: 'repair_focus_mismatch' });
    }

    if (day.recipeFallbackReason) {
      warnings.push(`${day.dayName}: ${day.recipeFallbackReason}`);
    }

    const maxExercises = computeSessionBudget(day, qualityContext);
    if ((day.exercises.length || 0) > maxExercises) {
      warnings.push(
        `${day.dayName}: ${day.exercises.length} exercises exceeds the session budget for ${day.estimatedDurationMin || qualityContext.sessionDurationMin || 60} minutes.`,
      );
      fixes.push({ dayIndex: dayIdx, type: 'reduce_session_overflow' });
    }

    const duplicateSlots = slotDuplicationIssues(day);
    if (duplicateSlots.length) {
      warnings.push(
        `${day.dayName}: Repeats ${duplicateSlots.join(', ')} more than the day blueprint supports. Reduce redundant movement patterns.`,
      );
      fixes.push({ dayIndex: dayIdx, type: 'repair_focus_mismatch' });
    }

    let uncommonCount = 0;
    const dayLowQualitySelections: string[] = [];

    day.exercises.forEach((exercise, exerciseIdx) => {
      const metadata = buildExerciseMetadata(exercise, qualityContext);
      const score = exercise.popularity_score ?? 50;

      if (lowestScore === null || score < lowestScore) lowestScore = score;
      if (hasPopularitySignal && score < floor) {
        warnings.push(
          `${day.dayName}: "${exercise.name}" has popularity score ${score} (floor: ${floor}). ` +
          `This exercise is too obscure for the user's experience level.`,
        );
        fixes.push({ dayIndex: dayIdx, type: 'replace_low_popularity', exerciseIndex: exerciseIdx });
      }

      if (!metadata.isFoundationalDefault) {
        nonStapleSelections.push({
          dayName: day.dayName,
          exerciseName: exercise.name || 'Unknown',
          tier: metadata.tier,
          reasons: metadata.reasons,
        });
      }

      if (metadata.coachStatus === 'disallowed' || metadata.tier === 'specialty_only') {
        warnings.push(
          `${day.dayName}: "${exercise.name}" is disallowed by the curated coach catalog and should not appear in a standard workout day.`,
        );
        fixes.push({ dayIndex: dayIdx, type: 'replace_low_priority_exercise', exerciseIndex: exerciseIdx });
      }

      if (metadata.tier === 'uncommon') {
        uncommonCount += 1;
        if (experienceLevel === 'beginner') {
          warnings.push(
            `${day.dayName}: "${exercise.name}" is too novel for a beginner conservative-default plan.`,
          );
          fixes.push({ dayIndex: dayIdx, type: 'replace_novelty_exercise', exerciseIndex: exerciseIdx });
        }
      }

      if (metadata.fullGymSubstitutionRisk) {
        warnings.push(
          `${day.dayName}: "${exercise.name}" is an unjustified full-gym substitution. Prefer stable barbell, dumbbell, machine, or cable defaults instead.`,
        );
        fixes.push({ dayIndex: dayIdx, type: 'replace_full_gym_substitution', exerciseIndex: exerciseIdx });
      }

      if (metadata.stabilityScore <= 2 || metadata.progressionClarityScore <= 2) {
        dayLowQualitySelections.push(exercise.name || 'Unknown');
      }

      // Check for complexity mismatch
      if (metadata.complexityMismatch) {
        warnings.push(
          `${day.dayName}: "${exercise.name}" (complexity: ${metadata.complexity}) is too advanced for a ${experienceLevel} lifter. ` +
          `Maximum allowed complexity is ${policy.maxAllowedComplexity}.`,
        );
        fixes.push({ dayIndex: dayIdx, type: 'replace_complexity_mismatch', exerciseIndex: exerciseIdx });
      }

      // Check for smith machine usage by beginners with full gym
      if (metadata.isSmithMachine && experienceLevel === 'beginner' && policy.preferFreeWeightsOverSmith) {
        warnings.push(
          `${day.dayName}: "${exercise.name}" uses a smith machine, which is not recommended for beginners with full gym access. ` +
          `Smith machines teach unnatural movement patterns. Prefer barbell or dumbbell variants.`,
        );
        fixes.push({ dayIndex: dayIdx, type: 'replace_smith_machine', exerciseIndex: exerciseIdx });
      }
    });

    uncommonCountPerDay.push(uncommonCount);
    if (uncommonCount > policy.noveltyBudgetPerDay) {
      warnings.push(
        `${day.dayName}: Contains ${uncommonCount} uncommon exercises. This profile is capped at ${policy.noveltyBudgetPerDay} uncommon movements per day.`,
      );
      fixes.push({ dayIndex: dayIdx, type: 'replace_low_priority_exercise' });
    }

    if (dayLowQualitySelections.length >= 2) {
      warnings.push(
        `${day.dayName}: Too many low-stability or hard-to-progress exercises (${dayLowQualitySelections.join(', ')}).`,
      );
      fixes.push({ dayIndex: dayIdx, type: 'replace_low_priority_exercise' });
    }
  });

  for (let index = 0; index < workoutDays.length - 1; index += 1) {
    const currentDay = workoutDays[index];
    const nextDay = workoutDays[index + 1];
    if (
      currentDay.focusTags.includes('full_body')
      || nextDay.focusTags.includes('full_body')
      || isMixedFullBodyDay(currentDay.focusTags)
      || isMixedFullBodyDay(nextDay.focusTags)
    ) {
      continue;
    }
    if (dayHasHeavyLowerStress(currentDay) && dayHasHeavyLowerStress(nextDay)) {
      recoveryConflictDays += 1;
      warnings.push(
        `${currentDay.dayName} and ${nextDay.dayName} both load the lower body heavily on consecutive days. This reduces recovery quality and makes progression harder to sustain.`,
      );
      fixes.push({ dayIndex: index + 1, type: 'resolve_recovery_conflict' });
    }
  }

  if (rearDeltTargetDays > 0 && rearDeltCoverageCount === 0) {
    rearDeltMissingCount = 1;
    warnings.push(
      'No upper-body day includes rear delt work (face pulls or reverse flys). ' +
      'Add at least one rear delt movement across the week to protect shoulder health.',
    );
    fixes.push({ dayIndex: 0, type: 'add_rear_delt' });
  }

  const standardTierRatio = totalExerciseCount > 0
    ? Number((standardTierCount / totalExerciseCount).toFixed(2))
    : 1;
  const stapleRatio = totalExerciseCount > 0
    ? Number((stapleCount / totalExerciseCount).toFixed(2))
    : 1;

  if (standardTierRatio < policy.minimumStandardRatio) {
    warnings.push(
      `Only ${(standardTierRatio * 100).toFixed(0)}% of the plan uses very common or common exercises. This profile requires at least ${(policy.minimumStandardRatio * 100).toFixed(0)}%.`,
    );
    fixes.push({ dayIndex: 0, type: 'replace_low_priority_exercise' });
  }

  if (stapleRatio < policy.minimumStapleRatio) {
    warnings.push(
      `Only ${(stapleRatio * 100).toFixed(0)}% of the plan uses staple default exercises. This is too low for a conservative-default plan.`,
    );
    fixes.push({ dayIndex: 0, type: 'replace_low_priority_exercise' });
  }

  const averageStabilityScore = averageScore(stabilityScores);
  const averageSetupBurdenScore = averageScore(setupScores);
  const averageProgressionClarityScore = averageScore(progressionScores);
  
  // Sprint 3: Run volume landmark analysis
  const daysPerWeek = workoutDays.length;
  const weeklyVolumeAnalysis = analyzeWeeklyVolume(
    muscleVolumes,
    experienceLevel,
    qualityContext.recoveryBurden || 'moderate',
    daysPerWeek
  );
  
  // Add volume warnings
  weeklyVolumeAnalysis.statusByMuscle.forEach((status) => {
    if (status.status === 'above_mrv') {
      musclesAboveMRV += 1;
      warnings.push(
        `Volume: ${status.muscle} has ${status.currentSets} sets, exceeding MRV (${status.target.mrv}). ${status.recommendation}`
      );
      fixes.push({ dayIndex: 0, type: 'reduce_excessive_volume', muscleGroup: status.muscle });
    } else if (status.status === 'below_mev' && ['chest', 'back', 'quads'].includes(status.muscle)) {
      // Only warn about missing major muscles if we have at least 3 days (heuristic for a "full" program)
      if (workoutDays.length >= 3) {
        musclesBelowMEV += 1;
        warnings.push(
          `Volume: ${status.muscle} has only ${status.currentSets} sets, below MEV (${status.target.mev}). ${status.recommendation}`
        );
        fixes.push({ dayIndex: 0, type: 'increase_insufficient_volume', muscleGroup: status.muscle });
      }
    }
  });
  
  // Sprint 3: Add injury conflict warnings
  if (injuryConflictCount > 0) {
    warnings.push(
      `Injury conflicts detected: ${injuryConflictCount} exercise(s) conflict with reported injuries. ` +
      Object.entries(injuryConflictsByType)
        .filter(([, count]) => count > 0)
        .map(([injury, count]) => `${count} for ${injury}`)
        .join(', ')
    );
    
    injuryConflicts.forEach((conflict) => {
      fixes.push({
        dayIndex: conflict.dayIndex,
        exerciseIndex: conflict.exerciseIndex,
        type: 'substitute_injury_conflict',
      });
    });
  }

  return {
    passed: warnings.length === 0 && fixes.length === 0,
    warnings,
    fixes,
    metrics: {
      pushSets: totalPushSets,
      pullSets: totalPullSets,
      pushPullRatio,
      rearDeltDaysWithCoverage: rearDeltCoverageCount,
      rearDeltDaysMissing: rearDeltMissingCount,
      compoundDaysWithCoverage: compoundDaysCount,
      lowestPopularityScore: lowestScore,
      standardTierRatio,
      stapleRatio,
      specialtyExerciseCount,
      disallowedExerciseCount,
      focusMismatchDays,
      recipeMismatchDays,
      recoveryConflictDays,
      averageStabilityScore,
      averageSetupBurdenScore,
      averageProgressionClarityScore,
      fullGymSubstitutionViolations,
      uncommonCountPerDay,
      complexityMismatchCount,
      smithMachineCount,
      // Sprint 3: Volume landmarks
      weeklyVolumeAnalysis,
      musclesAboveMRV,
      musclesBelowMEV,
      // Sprint 3: Injury conflicts
      injuryConflictCount,
      injuryConflictsByType,
    },
    policy,
    nonStapleSelections,
    // Sprint 3: Additional outputs
    volumeAnalysis: weeklyVolumeAnalysis,
    injuryConflicts,
  };
}

export function formatQualityReport(result: QualityGateResult) {
  const lines: string[] = [];
  lines.push(`Quality Gates: ${result.passed ? 'PASSED' : `${result.warnings.length} warning(s)`}`);
  lines.push(`  Policy: ${result.policy.version}`);
  lines.push(`  Push:Pull ratio: ${result.metrics.pushPullRatio?.toFixed(2) ?? 'N/A'} (${result.metrics.pushSets}p / ${result.metrics.pullSets}l)`);
  lines.push(`  Rear delt coverage: ${result.metrics.rearDeltDaysWithCoverage} covered, ${result.metrics.rearDeltDaysMissing} missing`);
  lines.push(`  Standard tier ratio: ${(result.metrics.standardTierRatio * 100).toFixed(0)}%`);
  lines.push(`  Staple ratio: ${(result.metrics.stapleRatio * 100).toFixed(0)}%`);
  lines.push(`  Full-gym substitution violations: ${result.metrics.fullGymSubstitutionViolations}`);
  lines.push(`  Specialty exercise count: ${result.metrics.specialtyExerciseCount}`);
  lines.push(`  Disallowed exercise count: ${result.metrics.disallowedExerciseCount}`);
  lines.push(`  Complexity mismatches: ${result.metrics.complexityMismatchCount}`);
  lines.push(`  Smith machine exercises: ${result.metrics.smithMachineCount}`);
  // Sprint 3: Volume landmarks
  lines.push(`  Muscles above MRV: ${result.metrics.musclesAboveMRV}`);
  lines.push(`  Muscles below MEV: ${result.metrics.musclesBelowMEV}`);
  lines.push(`  Recovery risk: ${result.metrics.weeklyVolumeAnalysis?.recoveryRisk ?? 'N/A'}`);
  // Sprint 3: Injury conflicts
  lines.push(`  Injury conflicts: ${result.metrics.injuryConflictCount}`);
  if (result.metrics.injuryConflictCount > 0) {
    const conflicts = Object.entries(result.metrics.injuryConflictsByType)
      .filter(([, count]) => count > 0)
      .map(([injury, count]) => `${injury}:${count}`)
      .join(', ');
    lines.push(`    Breakdown: ${conflicts}`);
  }
  lines.push(`  Smith machine exercises: ${result.metrics.smithMachineCount}`);
  if (result.warnings.length) {
    lines.push('  Warnings:');
    result.warnings.forEach((warning) => lines.push(`    - ${warning}`));
  }
  return lines.join('\n');
}
