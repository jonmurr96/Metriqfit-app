import {
  exerciseMatchesWorkoutFocus,
  inferExerciseMovementFamily,
  inferPrimaryExerciseFocus,
  isExerciseAllowedForDayPolicy,
  normalizeWorkoutToken,
  resolveDayFocusPolicy,
  stableHash,
  type DayFocusPolicy,
  type ExerciseFocusTag,
  type ProgramExercise,
  type WorkoutFocusTag,
} from './programMappingRules.ts';
import { classifyExercise, inferPatternSlot, type PatternSlot } from './exerciseClassification.ts';
import {
  buildExerciseMetadata,
  isExerciseTierAllowedForPolicy,
  scoreExerciseForSelection,
  type ExercisePriorityContext,
} from './exercise-priority.ts';
import {
  isExerciseSafeForInjuries,
  parseInjuries,
  type InjuryType,
} from './injury-substitutions.ts';
import {
  resolveCoachDayRecipe,
  type CoachDayRecipe,
  type CoachRecipeSlot,
} from './coach-day-recipes.ts';

// ---------------------------------------------------------------------------
// Slot-based types
// ---------------------------------------------------------------------------

/**
 * A single slot in a day's movement manifest.
 * The same PatternSlot can appear multiple times in a day (e.g., two horizontal_push
 * slots on a Push day) — the family deduplication ensures they pick different exercises.
 */
export type SlotEntry = {
  slot: PatternSlot;
  /** 1 = essential (fill first), 2 = recommended, 3 = optional (fill if space remains) */
  priority: 1 | 2 | 3;
  /** Override sets for this slot (defaults to day-level sets) */
  sets?: number;
  /** Override rep range for this slot */
  repRange?: [number, number];
  /** Override rest seconds for this slot */
  restSeconds?: number;
};

// ---------------------------------------------------------------------------
// Legacy tag-bucket types (kept for backward compatibility)
// ---------------------------------------------------------------------------
export type GeneratedSplitDayDefinition = {
  key: string;
  name: string;
  focus?: string | null;
  /** New: slot-based manifest. When present, uses slot algorithm. */
  slots?: SlotEntry[];
  /** Legacy tag-bucket fields (used as fallback when slots is absent) */
  primaryFocuses?: WorkoutFocusTag[];
  supportFocuses?: WorkoutFocusTag[];
  disallowedFocuses?: ExerciseFocusTag[];
  targetExercises?: number | null;
  minExercises?: number | null;
  minPrimaryExercises?: number | null;
  maxSupportExercises?: number | null;
  requiredCoverage?: WorkoutFocusTag[];
  allowDuplicateMovementFamilies?: boolean;
};

export type ResolvedGeneratedSplitDayProfile = {
  day: GeneratedSplitDayDefinition;
  policy: DayFocusPolicy;
  primaryFocuses: WorkoutFocusTag[];
  supportFocuses: WorkoutFocusTag[];
  disallowedFocuses: ExerciseFocusTag[];
  requiredCoverage: WorkoutFocusTag[];
  targetExercises: number;
  minExercises: number;
  minPrimaryExercises: number;
  maxSupportExercises: number;
  allowDuplicateMovementFamilies: boolean;
};

export type GeneratedSplitDaySelection = {
  exercises: ProgramExercise[];
  recipe: CoachDayRecipe;
  selectedExercises: Array<{
    exercise: ProgramExercise;
    slot: PatternSlot | null;
    sets: number;
    repRange: [number, number];
    restSeconds: number;
  }>;
  warnings: string[];
  primaryExerciseCount: number;
  supportExerciseCount: number;
  missingCoverage: WorkoutFocusTag[];
  targetExercises: number;
  minExercises: number;
  minPrimaryExercises: number;
  profile: ResolvedGeneratedSplitDayProfile;
};

type SelectionOptions = {
  day: GeneratedSplitDayDefinition;
  familyKey: string | null;
  dayIndex: number;
  daysPerWeek: number;
  exercises: ProgramExercise[];
  keepTerms?: string[];
  avoidTerms?: string[];
  qualityContext?: ExercisePriorityContext;
};

// ---------------------------------------------------------------------------
// Per-slot programming defaults
// These defaults kick in when the slot-based algorithm is used and no
// override is specified on the SlotEntry.
// ---------------------------------------------------------------------------
const SLOT_PROGRAMMING_DEFAULTS: Record<PatternSlot, { sets: number; repRange: [number, number]; restSeconds: number }> = {
  compound_squat:  { sets: 4, repRange: [5, 8],   restSeconds: 150 },
  compound_hinge:  { sets: 4, repRange: [5, 8],   restSeconds: 150 },
  single_leg:      { sets: 3, repRange: [8, 12],  restSeconds: 90  },
  hip_thrust:      { sets: 3, repRange: [8, 12],  restSeconds: 90  },
  leg_extension:   { sets: 3, repRange: [10, 15], restSeconds: 60  },
  leg_curl:        { sets: 3, repRange: [10, 15], restSeconds: 60  },
  calf:            { sets: 4, repRange: [12, 20], restSeconds: 45  },
  horizontal_push: { sets: 4, repRange: [6, 10],  restSeconds: 120 },
  vertical_push:   { sets: 3, repRange: [8, 12],  restSeconds: 90  },
  horizontal_pull: { sets: 4, repRange: [6, 10],  restSeconds: 120 },
  vertical_pull:   { sets: 3, repRange: [6, 10],  restSeconds: 90  },
  chest_fly:       { sets: 3, repRange: [10, 15], restSeconds: 60  },
  shoulder_raise:  { sets: 3, repRange: [12, 20], restSeconds: 45  },
  rear_delt:       { sets: 3, repRange: [12, 20], restSeconds: 45  },
  bicep_curl:      { sets: 3, repRange: [10, 15], restSeconds: 60  },
  tricep_ext:      { sets: 3, repRange: [10, 15], restSeconds: 60  },
  core:            { sets: 3, repRange: [10, 20], restSeconds: 45  },
  conditioning:    { sets: 4, repRange: [10, 20], restSeconds: 45  },
  unknown:         { sets: 3, repRange: [10, 15], restSeconds: 60  },
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function matchesNamePreference(name: string | null | undefined, terms: string[]) {
  if (!terms.length) return false;
  const normalized = normalizeWorkoutToken(name || '');
  return terms.some((term) => normalized.includes(normalizeWorkoutToken(term)));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// ---------------------------------------------------------------------------
// SLOT-BASED SELECTION (new algorithm)
// ---------------------------------------------------------------------------

/**
 * Score an exercise for a specific slot.
 * Prioritizes: keepTerms match > common > compound appropriate to slot > variety.
 */
function scoreForSlot(
  exercise: ProgramExercise,
  recipeSlot: CoachRecipeSlot,
  dayKey: string,
  slotIndex: number,
  keepTerms: string[],
  usedMovementFamilies: Set<string>,
  qualityContext: ExercisePriorityContext,
): number {
  const classification = classifyExercise(exercise);
  const metadata = buildExerciseMetadata(exercise, qualityContext);
  const slot = recipeSlot.slot;
  let score = 0;
  const difficultyLabel = typeof exercise.difficulty === 'string'
    ? exercise.difficulty.toLowerCase()
    : exercise.difficulty === 3
      ? 'intermediate'
      : '';

  // Hard keeper bonus
  if (matchesNamePreference(exercise.name, keepTerms)) score += 500;

  score += scoreExerciseForSelection(exercise, qualityContext);
  if (metadata.coachStatus === 'approved_default') score += 40;
  if (metadata.coachStatus === 'approved_alternate') score += 18;
  if (metadata.coachStatus === 'approved_progression') score += 6;

  // Compound bonus for compound slots, isolation bonus for isolation slots
  const compoundSlots: PatternSlot[] = ['compound_squat', 'compound_hinge', 'horizontal_push', 'horizontal_pull', 'vertical_push', 'vertical_pull'];
  const isolationSlots: PatternSlot[] = ['leg_extension', 'leg_curl', 'calf', 'chest_fly', 'shoulder_raise', 'rear_delt', 'bicep_curl', 'tricep_ext'];

  if (compoundSlots.includes(slot) && classification.isCompound) score += 32;
  if (isolationSlots.includes(slot) && !classification.isCompound) score += 16;
  if (metadata.isFoundationalDefault) score += 25;
  if (metadata.isAcceptableAlternate) score += 12;
  if (metadata.fullGymSubstitutionRisk) score -= 70;
  if (metadata.isNoveltyRisk) score -= 35;
  if (recipeSlot.priority === 1 && !metadata.isFoundationalDefault) score -= 10;

  // Intermediate difficulty is ideal for most users
  if (difficultyLabel === 'intermediate') score += 5;

  // Antagonist pairing reward — gives variety across the session
  const family = classification.movementPatternGroup;
  if (slot === 'horizontal_pull' && usedMovementFamilies.has('horizontal_push')) score += 15;
  if (slot === 'horizontal_push' && usedMovementFamilies.has('horizontal_pull')) score += 15;
  if (slot === 'vertical_pull' && usedMovementFamilies.has('vertical_push')) score += 15;
  if (slot === 'vertical_push' && usedMovementFamilies.has('vertical_pull')) score += 15;
  if (slot === 'compound_hinge' && usedMovementFamilies.has('compound_squat')) score += 15;
  if (slot === 'compound_squat' && usedMovementFamilies.has('compound_hinge')) score += 15;

  // Slot-specific bonuses for good matches
  if (slot === 'compound_squat' && family === 'squat') score += 30;
  if (slot === 'compound_hinge' && family === 'hinge') score += 30;
  if (slot === 'horizontal_push' && family === 'bench_press') score += 30;
  if (slot === 'vertical_pull' && family === 'pulldown') score += 30;
  if (slot === 'horizontal_pull' && family === 'row') score += 30;
  if (slot === 'hip_thrust' && family === 'hip_thrust') score += 30;

  // Deterministic tie-breaker (prevents random ordering between runs)
  score += (stableHash(`${dayKey}::slot${slotIndex}::${exercise.id}`) % 1000) / 1000;

  return score;
}

/**
 * Pick the best exercise for a slot from the candidate pool.
 * Returns null if no valid exercise found (slot is skipped, no crash).
 * STRICT: never falls back to already-used movement families.
 */
function pickForSlot(
  candidates: ProgramExercise[],
  recipeSlot: CoachRecipeSlot,
  dayKey: string,
  slotIndex: number,
  keepTerms: string[],
  usedExerciseIds: Set<string>,
  usedMovementFamilies: Set<string>,
  qualityContext: ExercisePriorityContext,
  userInjuries?: InjuryType[],
): ProgramExercise | null {
  const slot = recipeSlot.slot;
  // Parse injuries from context if not provided directly
  const injuries = userInjuries || parseInjuries(qualityContext.injuries || []);
  
  // Filter to valid, not-yet-used exercises of this PatternSlot
  const eligible = candidates.filter((ex) => {
    if (usedExerciseIds.has(ex.id)) return false;
    const metadata = buildExerciseMetadata(ex, qualityContext);
    if (metadata.patternSlot !== slot) return false;
    if (!recipeSlot.allowedStatuses.includes(metadata.coachStatus)) return false;
    // STRICT family deduplication — no fallback
    const family = metadata.canonicalFamily || inferExerciseMovementFamily(ex);
    if (family && usedMovementFamilies.has(family)) return false;
    if (!isExerciseTierAllowedForPolicy(metadata.tier, qualityContext)) return false;
    if (metadata.coachStatus === 'disallowed' || metadata.tier === 'specialty_only') return false;
    // Sprint 4: Filter out exercises that conflict with user injuries
    if (injuries.length > 0 && !isExerciseSafeForInjuries(ex, injuries)) return false;
    return true;
  });

  if (!eligible.length) return null;

  return eligible
    .map((ex) => ({ ex, score: scoreForSlot(ex, recipeSlot, dayKey, slotIndex, keepTerms, usedMovementFamilies, qualityContext) }))
    .sort((a, b) => b.score - a.score)[0].ex;
}

/**
 * Main slot-based day filler.
 */
function fillBySlots(
  recipe: CoachDayRecipe,
  exercises: ProgramExercise[],
  dayKey: string,
  keepTerms: string[],
  targetExercises: number,
  minExercises: number,
  qualityContext: ExercisePriorityContext,
): {
  selected: ProgramExercise[];
  selectedExercises: GeneratedSplitDaySelection['selectedExercises'];
  warnings: string[];
} {
  const selected: ProgramExercise[] = [];
  const selectedExercises: GeneratedSplitDaySelection['selectedExercises'] = [];
  const warnings: string[] = [];
  const usedExerciseIds = new Set<string>();
  const usedMovementFamilies = new Set<string>();

  // Sort slots by priority ascending (fill essentials first)
  const sorted = [...recipe.slots].sort((a, b) => a.priority - b.priority);

  for (const entry of sorted) {
    // Respect maxExercisesPerDay
    if (selected.length >= targetExercises) break;
    // Skip optional slots if we already have enough
    if (entry.priority === 3 && selected.length >= minExercises) continue;

    const pick = pickForSlot(
      exercises,
      entry,
      dayKey,
      selected.length,
      keepTerms,
      usedExerciseIds,
      usedMovementFamilies,
      qualityContext,
    );

    if (pick) {
      selected.push(pick);
      const defaults = SLOT_PROGRAMMING_DEFAULTS[entry.slot] || SLOT_PROGRAMMING_DEFAULTS.unknown;
      selectedExercises.push({
        exercise: pick,
        slot: entry.slot,
        sets: entry.sets ?? defaults.sets,
        repRange: entry.repRange ?? defaults.repRange,
        restSeconds: entry.restSeconds ?? defaults.restSeconds,
      });
      usedExerciseIds.add(pick.id);
      const family = buildExerciseMetadata(pick, qualityContext).canonicalFamily || inferExerciseMovementFamily(pick);
      if (family) usedMovementFamilies.add(family);
    } else {
      if (entry.priority <= 2) {
        warnings.push(`Could not fill ${entry.slot} slot for recipe ${recipe.recipeId} (priority ${entry.priority}) — no eligible curated exercises available.`);
      }
    }
  }

  return { selected, selectedExercises, warnings };
}

// ---------------------------------------------------------------------------
// LEGACY TAG-BUCKET SELECTION (preserved for backward compatibility)
// ---------------------------------------------------------------------------

const ALL_EXERCISE_FOCUS_TAGS: ExerciseFocusTag[] = [
  'chest', 'back', 'shoulders', 'arms', 'legs', 'hamstrings', 'glutes', 'core', 'conditioning',
];

function inferDayKind(day: GeneratedSplitDayDefinition, primaryFocuses: WorkoutFocusTag[]) {
  const normalized = normalizeWorkoutToken(`${day.key} ${day.name} ${day.focus || ''}`);
  const primary = new Set(primaryFocuses);

  if (normalized.includes('push')) return 'push';
  if (normalized.includes('pull')) return 'pull';
  if (normalized.includes('full body') || normalized.includes('fullbody')) return 'full_body';
  if (normalized.includes('conditioning') || normalized.includes('metcon')) return 'conditioning';
  if (normalized.includes('rehab') || normalized.includes('resilience')) return 'rehab';
  if (normalized.includes('upper')) return 'upper';
  if (normalized.includes('lower') || normalized.includes('legs') || normalized.includes('squat') || normalized.includes('deadlift')) {
    return 'lower';
  }
  if (normalized.includes('chest')) return 'chest';
  if (normalized.includes('back')) return 'back';
  if (normalized.includes('shoulder')) return 'shoulders';
  if (normalized.includes('arm')) return 'arms';
  if (primary.has('legs') || primary.has('hamstrings') || primary.has('glutes')) {
    return primary.size <= 3 && !primary.has('chest') && !primary.has('back') ? 'lower' : 'full_body';
  }
  if (primary.has('chest') && primary.has('back') && primary.has('shoulders')) return 'upper';
  if (primary.has('chest')) return 'chest';
  if (primary.has('back')) return 'back';
  if (primary.has('shoulders')) return 'shoulders';
  if (primary.has('arms')) return 'arms';
  return 'mixed';
}

function defaultProfileForDay(day: GeneratedSplitDayDefinition, policy: DayFocusPolicy): Omit<ResolvedGeneratedSplitDayProfile, 'day' | 'policy'> {
  const primaryFocuses = unique((day.primaryFocuses || policy.primaryFocusTags || policy.focusTags).filter(Boolean));
  const supportFocuses = unique((day.supportFocuses || policy.supportFocusTags || []).filter(Boolean));
  const dayKind = inferDayKind(day, primaryFocuses);

  const disallowedBase = ALL_EXERCISE_FOCUS_TAGS.filter(
    (tag) => !primaryFocuses.includes(tag as WorkoutFocusTag) && !supportFocuses.includes(tag as WorkoutFocusTag),
  );

  const base = {
    targetExercises: clamp(Number(day.targetExercises || 5), 1, 7),
    minExercises: clamp(Number(day.minExercises || 4), 1, 7),
    allowDuplicateMovementFamilies: !!day.allowDuplicateMovementFamilies,
  };

  if (dayKind === 'upper') {
    return {
      ...base,
      primaryFocuses,
      supportFocuses: unique<WorkoutFocusTag>([...supportFocuses, 'arms']),
      disallowedFocuses: day.disallowedFocuses || disallowedBase,
      requiredCoverage: day.requiredCoverage || primaryFocuses.filter((tag) => ['chest', 'back', 'shoulders'].includes(tag as string)),
      minPrimaryExercises: clamp(Number(day.minPrimaryExercises || 4), 1, 7),
      maxSupportExercises: clamp(Number(day.maxSupportExercises || 1), 0, 4),
    };
  }
  if (dayKind === 'lower') {
    const lowerPrimary = unique<WorkoutFocusTag>(primaryFocuses.length ? primaryFocuses : ['legs', 'hamstrings', 'glutes']);
    return {
      ...base,
      primaryFocuses: lowerPrimary,
      supportFocuses: unique<WorkoutFocusTag>([...supportFocuses, 'core']),
      disallowedFocuses: day.disallowedFocuses || ALL_EXERCISE_FOCUS_TAGS.filter((tag) => !['legs', 'hamstrings', 'glutes', 'core'].includes(tag)),
      requiredCoverage: day.requiredCoverage || ['legs'],
      minPrimaryExercises: clamp(Number(day.minPrimaryExercises || 4), 1, 7),
      maxSupportExercises: clamp(Number(day.maxSupportExercises || 1), 0, 4),
    };
  }
  if (dayKind === 'push') {
    return {
      ...base,
      primaryFocuses: unique<WorkoutFocusTag>(primaryFocuses.length ? primaryFocuses : ['chest', 'shoulders']),
      supportFocuses: unique<WorkoutFocusTag>([...supportFocuses, 'arms']),
      disallowedFocuses: day.disallowedFocuses || ALL_EXERCISE_FOCUS_TAGS.filter((tag) => !['chest', 'shoulders', 'arms', 'core'].includes(tag)),
      requiredCoverage: day.requiredCoverage || ['chest', 'shoulders'],
      minPrimaryExercises: clamp(Number(day.minPrimaryExercises || 4), 1, 7),
      maxSupportExercises: clamp(Number(day.maxSupportExercises || 1), 0, 4),
    };
  }
  if (dayKind === 'pull') {
    return {
      ...base,
      primaryFocuses: unique<WorkoutFocusTag>(primaryFocuses.length ? primaryFocuses : ['back']),
      supportFocuses: unique<WorkoutFocusTag>([...supportFocuses, 'arms']),
      disallowedFocuses: day.disallowedFocuses || ALL_EXERCISE_FOCUS_TAGS.filter((tag) => !['back', 'arms', 'core'].includes(tag)),
      requiredCoverage: day.requiredCoverage || ['back'],
      minPrimaryExercises: clamp(Number(day.minPrimaryExercises || 4), 1, 7),
      maxSupportExercises: clamp(Number(day.maxSupportExercises || 1), 0, 4),
    };
  }
  if (dayKind === 'full_body') {
    return {
      ...base,
      primaryFocuses,
      supportFocuses: unique<WorkoutFocusTag>([...supportFocuses, 'core', 'arms']),
      disallowedFocuses: day.disallowedFocuses || disallowedBase.filter((tag) => tag !== 'core' && tag !== 'arms'),
      requiredCoverage: day.requiredCoverage || ['legs', 'chest', 'back'],
      minPrimaryExercises: clamp(Number(day.minPrimaryExercises || 3), 1, 7),
      maxSupportExercises: clamp(Number(day.maxSupportExercises || 2), 0, 4),
    };
  }
  if (dayKind === 'chest' || dayKind === 'back' || dayKind === 'shoulders' || dayKind === 'arms') {
    return {
      ...base,
      primaryFocuses,
      supportFocuses,
      disallowedFocuses: day.disallowedFocuses || disallowedBase,
      requiredCoverage: day.requiredCoverage || primaryFocuses.slice(0, 1),
      minPrimaryExercises: clamp(Number(day.minPrimaryExercises || 3), 1, 7),
      maxSupportExercises: clamp(Number(day.maxSupportExercises || 1), 0, 4),
    };
  }
  // conditioning / rehab / mixed fallback
  return {
    ...base,
    primaryFocuses,
    supportFocuses,
    disallowedFocuses: day.disallowedFocuses || disallowedBase,
    requiredCoverage: day.requiredCoverage || primaryFocuses.slice(0, 2),
    minPrimaryExercises: clamp(Number(day.minPrimaryExercises || Math.max(2, Math.min(4, primaryFocuses.length || 2))), 1, 7),
    maxSupportExercises: clamp(Number(day.maxSupportExercises || 2), 0, 4),
  };
}

export function resolveGeneratedSplitDayProfile(input: {
  day: GeneratedSplitDayDefinition;
  familyKey: string | null;
  dayIndex: number;
  daysPerWeek: number;
}): ResolvedGeneratedSplitDayProfile {
  const policy = resolveDayFocusPolicy({
    dayName: input.day.name,
    dayFocus: input.day.focus || null,
    familyKey: input.familyKey,
    dayIndex: input.dayIndex,
    daysPerWeek: input.daysPerWeek,
    goalTags: [],
  });
  return { day: input.day, policy, ...defaultProfileForDay(input.day, policy) };
}

function matchesFocus(exercise: ProgramExercise, focusTag: WorkoutFocusTag) {
  const focus = inferPrimaryExerciseFocus(exercise);
  if (focus === focusTag) return true;
  return exerciseMatchesWorkoutFocus(exercise, [focusTag]);
}

type CandidateBucket = 'primary' | 'support';

function classifyCandidate(exercise: ProgramExercise, profile: ResolvedGeneratedSplitDayProfile): CandidateBucket | null {
  const primaryFocus = inferPrimaryExerciseFocus(exercise);
  if (primaryFocus && profile.disallowedFocuses.includes(primaryFocus)) return null;
  if (!isExerciseAllowedForDayPolicy(exercise, profile.policy)) return null;
  if (primaryFocus && profile.primaryFocuses.includes(primaryFocus as WorkoutFocusTag)) return 'primary';
  if (primaryFocus && profile.supportFocuses.includes(primaryFocus as WorkoutFocusTag)) return 'support';
  if (profile.primaryFocuses.some((tag) => matchesFocus(exercise, tag))) return 'primary';
  if (profile.supportFocuses.some((tag) => matchesFocus(exercise, tag))) return 'support';
  return null;
}

function rankLegacy(
  exercise: ProgramExercise,
  bucket: CandidateBucket,
  profile: ResolvedGeneratedSplitDayProfile,
  keepTerms: string[],
  coverageTag: WorkoutFocusTag | null,
  slotIndex: number,
  usedPatternGroups: Set<string>,
  qualityContext: ExercisePriorityContext,
): number {
  const classification = classifyExercise(exercise);
  const primaryFocus = inferPrimaryExerciseFocus(exercise);
  const metadata = buildExerciseMetadata(exercise, qualityContext);
  let score = 0;
  const difficultyLabel = typeof exercise.difficulty === 'string'
    ? exercise.difficulty.toLowerCase()
    : exercise.difficulty === 3
      ? 'intermediate'
      : '';

  if (matchesNamePreference(exercise.name, keepTerms)) score += 500;
  if (coverageTag && matchesFocus(exercise, coverageTag)) score += 250;
  if (bucket === 'primary') score += 100;
  score += scoreExerciseForSelection(exercise, qualityContext);
  if (primaryFocus && profile.primaryFocuses.includes(primaryFocus as WorkoutFocusTag)) score += 40;
  if (primaryFocus && profile.supportFocuses.includes(primaryFocus as WorkoutFocusTag)) score += 10;
  if (difficultyLabel === 'intermediate') score += 4;
  if (slotIndex <= 2 && classification.isCompound) score += 40;
  else if (slotIndex <= 4 && classification.isCompound) score += 20;
  if (classification.isCompound) score += 20;
  if (metadata.isFoundationalDefault) score += 18;
  if (metadata.fullGymSubstitutionRisk) score -= 70;

  // Antagonist pairing
  const pattern = classification.movementPatternGroup;
  if (pattern === 'horizontal_push' && usedPatternGroups.has('horizontal_pull')) score += 20;
  if (pattern === 'horizontal_pull' && usedPatternGroups.has('horizontal_push')) score += 20;
  if (pattern === 'vertical_push' && usedPatternGroups.has('vertical_pull')) score += 20;
  if (pattern === 'vertical_pull' && usedPatternGroups.has('vertical_push')) score += 20;
  if (pattern === 'squat' && usedPatternGroups.has('hinge')) score += 15;
  if (pattern === 'hinge' && usedPatternGroups.has('squat')) score += 15;

  score += (stableHash(`${profile.day.key}::${bucket}::${exercise.id}`) % 1000) / 1000;
  return score;
}

function pickLegacy(input: {
  candidates: ProgramExercise[];
  bucket: CandidateBucket;
  profile: ResolvedGeneratedSplitDayProfile;
  keepTerms: string[];
  usedExerciseIds: Set<string>;
  usedMovementFamilies: Set<string>;
  coverageTag?: WorkoutFocusTag | null;
  slotIndex?: number;
  usedPatternGroups?: Set<string>;
  qualityContext?: ExercisePriorityContext;
}): ProgramExercise | null {
  const qualityContext = input.qualityContext || {};
  const available = input.candidates.filter((ex) => {
    if (input.usedExerciseIds.has(ex.id)) return false;
    const metadata = buildExerciseMetadata(ex, qualityContext);
    return isExerciseTierAllowedForPolicy(metadata.tier, qualityContext) && metadata.tier !== 'specialty_only';
  });
  if (!available.length) return null;

  const withoutFamily = available.filter((ex) => {
    const family = inferExerciseMovementFamily(ex);
    if (!family || input.profile.allowDuplicateMovementFamilies) return true;
    return !input.usedMovementFamilies.has(family);
  });

  // FIXED: if all candidates are same-family, skip rather than fallback to duplicates
  const pool = withoutFamily.length ? withoutFamily : [];
  if (!pool.length) return null;

  return pool
    .map((ex) => ({
      ex,
      score: rankLegacy(ex, input.bucket, input.profile, input.keepTerms, input.coverageTag || null, input.slotIndex || 0, input.usedPatternGroups || new Set(), qualityContext),
    }))
    .sort((a, b) => b.score - a.score)[0]?.ex || null;
}

function addToSelection(
  exercise: ProgramExercise,
  selected: ProgramExercise[],
  usedIds: Set<string>,
  usedFamilies: Set<string>,
  usedPatterns: Set<string>,
) {
  selected.push(exercise);
  usedIds.add(exercise.id);
  const family = inferExerciseMovementFamily(exercise);
  if (family) usedFamilies.add(family);
  const pattern = classifyExercise(exercise).movementPatternGroup;
  usedPatterns.add(pattern);
}

function legacyFillDay(
  day: GeneratedSplitDayDefinition,
  profile: ResolvedGeneratedSplitDayProfile,
  exercises: ProgramExercise[],
  keepTerms: string[],
  avoidTerms: string[],
  qualityContext: ExercisePriorityContext,
): { selected: ProgramExercise[]; warnings: string[]; primaryCount: number; supportCount: number; missingCoverage: WorkoutFocusTag[] } {
  const filtered = exercises.filter((ex) => !matchesNamePreference(ex.name, avoidTerms));
  const primaryCandidates = filtered.filter((ex) => classifyCandidate(ex, profile) === 'primary');
  const supportCandidates = filtered.filter((ex) => classifyCandidate(ex, profile) === 'support');

  const selected: ProgramExercise[] = [];
  const primarySelections: ProgramExercise[] = [];
  const supportSelections: ProgramExercise[] = [];
  const warnings: string[] = [];
  const missingCoverage: WorkoutFocusTag[] = [];
  const usedIds = new Set<string>();
  const usedFamilies = new Set<string>();
  const usedPatterns = new Set<string>();

  for (const coverageTag of profile.requiredCoverage) {
    const candidate = pickLegacy({
      candidates: primaryCandidates.filter((ex) => matchesFocus(ex, coverageTag)),
      bucket: 'primary', profile, keepTerms, usedExerciseIds: usedIds, usedMovementFamilies: usedFamilies,
      coverageTag, slotIndex: selected.length, usedPatternGroups: usedPatterns,
      qualityContext,
    });
    if (!candidate) { missingCoverage.push(coverageTag); continue; }
    addToSelection(candidate, selected, usedIds, usedFamilies, usedPatterns);
    primarySelections.push(candidate);
  }

  while (primarySelections.length < profile.minPrimaryExercises) {
    const candidate = pickLegacy({ candidates: primaryCandidates, bucket: 'primary', profile, keepTerms, usedExerciseIds: usedIds, usedMovementFamilies: usedFamilies, slotIndex: selected.length, usedPatternGroups: usedPatterns, qualityContext });
    if (!candidate) break;
    addToSelection(candidate, selected, usedIds, usedFamilies, usedPatterns);
    primarySelections.push(candidate);
  }

  const preferredPrimaryTarget = Math.max(profile.minPrimaryExercises, profile.targetExercises - profile.maxSupportExercises);
  while (primarySelections.length < preferredPrimaryTarget) {
    const candidate = pickLegacy({ candidates: primaryCandidates, bucket: 'primary', profile, keepTerms, usedExerciseIds: usedIds, usedMovementFamilies: usedFamilies, slotIndex: selected.length, usedPatternGroups: usedPatterns, qualityContext });
    if (!candidate) break;
    addToSelection(candidate, selected, usedIds, usedFamilies, usedPatterns);
    primarySelections.push(candidate);
  }

  while (selected.length < profile.targetExercises && supportSelections.length < profile.maxSupportExercises) {
    const candidate = pickLegacy({ candidates: supportCandidates, bucket: 'support', profile, keepTerms, usedExerciseIds: usedIds, usedMovementFamilies: usedFamilies, slotIndex: selected.length, usedPatternGroups: usedPatterns, qualityContext });
    if (!candidate) break;
    addToSelection(candidate, selected, usedIds, usedFamilies, usedPatterns);
    supportSelections.push(candidate);
  }

  while (selected.length < profile.targetExercises) {
    const candidate = pickLegacy({ candidates: primaryCandidates, bucket: 'primary', profile, keepTerms, usedExerciseIds: usedIds, usedMovementFamilies: usedFamilies, slotIndex: selected.length, usedPatternGroups: usedPatterns, qualityContext });
    if (!candidate) break;
    addToSelection(candidate, selected, usedIds, usedFamilies, usedPatterns);
    primarySelections.push(candidate);
  }

  if (missingCoverage.length) warnings.push(`Missing required focus coverage: ${missingCoverage.join(', ')}.`);
  if (selected.length < profile.targetExercises) warnings.push(`Only found ${selected.length}/${profile.targetExercises} coherent exercises for ${day.name}.`);
  if (primarySelections.length < profile.minPrimaryExercises) warnings.push(`Only found ${primarySelections.length}/${profile.minPrimaryExercises} primary exercises for ${day.name}.`);

  return { selected, warnings, primaryCount: primarySelections.length, supportCount: supportSelections.length, missingCoverage };
}

// ---------------------------------------------------------------------------
// Public API — selectExercisesForGeneratedSplitDay
// ---------------------------------------------------------------------------
export function selectExercisesForGeneratedSplitDay(input: SelectionOptions): GeneratedSplitDaySelection {
  const keepTerms = (input.keepTerms || []).map((t) => normalizeWorkoutToken(t)).filter(Boolean);
  const qualityContext = input.qualityContext || {};

  const filteredExercises = input.exercises.filter((ex) => !matchesNamePreference(ex.name, input.avoidTerms || []));

  const profile = resolveGeneratedSplitDayProfile({
    day: input.day,
    familyKey: input.familyKey,
    dayIndex: input.dayIndex,
    daysPerWeek: input.daysPerWeek,
  });

  const recipe = resolveCoachDayRecipe({
    familyKey: input.familyKey,
    dayKey: input.day.key,
    dayName: input.day.name,
    focus: input.day.focus,
    slots: input.day.slots || null,
  });

  const targetExercises = clamp(Number(input.day.targetExercises || recipe.slots.length || 6), 1, 8);
  const minExercises = clamp(
    Number(input.day.minExercises || Math.min(recipe.slots.filter((slot) => slot.priority <= 2).length || 4, targetExercises)),
    1,
    8,
  );
  const minPrimary = clamp(Number(input.day.minPrimaryExercises || minExercises), 1, 8);

  const { selected, selectedExercises, warnings } = fillBySlots(
    recipe,
    filteredExercises,
    input.day.key,
    keepTerms,
    targetExercises,
    minExercises,
    qualityContext,
  );

  if (recipe.fallbackReason) {
    warnings.push(recipe.fallbackReason);
  }

  if (selected.length < minExercises) {
    warnings.push(`Recipe fill for "${input.day.name}" only produced ${selected.length}/${minExercises} minimum exercises. Check curated catalog coverage for ${recipe.recipeId}.`);
  }

  return {
    exercises: selected,
    recipe,
    selectedExercises,
    warnings,
    primaryExerciseCount: selected.length,
    supportExerciseCount: 0,
    missingCoverage: [],
    targetExercises,
    minExercises,
    minPrimaryExercises: minPrimary,
    profile,
  };
}
