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

export type GeneratedSplitDayDefinition = {
  key: string;
  name: string;
  focus?: string | null;
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
  warnings: string[];
  primaryExerciseCount: number;
  supportExerciseCount: number;
  missingCoverage: WorkoutFocusTag[];
  targetExercises: number;
  minExercises: number;
  minPrimaryExercises: number;
  profile: ResolvedGeneratedSplitDayProfile;
};

type CandidateBucket = 'primary' | 'support';

type SelectionOptions = {
  day: GeneratedSplitDayDefinition;
  familyKey: string | null;
  dayIndex: number;
  daysPerWeek: number;
  exercises: ProgramExercise[];
  keepTerms?: string[];
  avoidTerms?: string[];
};

const ALL_EXERCISE_FOCUS_TAGS: ExerciseFocusTag[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'hamstrings',
  'glutes',
  'core',
  'conditioning',
];

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

function defaultProfileForDay(
  day: GeneratedSplitDayDefinition,
  policy: DayFocusPolicy,
): Omit<ResolvedGeneratedSplitDayProfile, 'day' | 'policy'> {
  const primaryFocuses = unique((day.primaryFocuses || policy.primaryFocusTags || policy.focusTags).filter(Boolean));
  const supportFocuses = unique((day.supportFocuses || policy.supportFocusTags || []).filter(Boolean));
  const dayKind = inferDayKind(day, primaryFocuses);

  const disallowedBase = ALL_EXERCISE_FOCUS_TAGS.filter(
    (tag) => !primaryFocuses.includes(tag as WorkoutFocusTag) && !supportFocuses.includes(tag as WorkoutFocusTag),
  );

  if (dayKind === 'chest' || dayKind === 'back' || dayKind === 'shoulders' || dayKind === 'arms') {
    return {
      primaryFocuses,
      supportFocuses,
      disallowedFocuses: day.disallowedFocuses || disallowedBase,
      requiredCoverage: day.requiredCoverage || primaryFocuses.slice(0, 1),
      targetExercises: clamp(Number(day.targetExercises || 5), 1, 7),
      minExercises: clamp(Number(day.minExercises || 4), 1, 7),
      minPrimaryExercises: clamp(Number(day.minPrimaryExercises || 3), 1, 7),
      maxSupportExercises: clamp(Number(day.maxSupportExercises || 1), 0, 4),
      allowDuplicateMovementFamilies: !!day.allowDuplicateMovementFamilies,
    };
  }

  if (dayKind === 'upper') {
    const requiredCoverage = day.requiredCoverage || primaryFocuses.filter((tag) => ['chest', 'back', 'shoulders'].includes(tag as string));
    return {
      primaryFocuses,
      supportFocuses: unique<WorkoutFocusTag>([...supportFocuses, 'arms']),
      disallowedFocuses: day.disallowedFocuses || disallowedBase,
      requiredCoverage,
      targetExercises: clamp(Number(day.targetExercises || 5), 1, 7),
      minExercises: clamp(Number(day.minExercises || 4), 1, 7),
      minPrimaryExercises: clamp(Number(day.minPrimaryExercises || 4), 1, 7),
      maxSupportExercises: clamp(Number(day.maxSupportExercises || 1), 0, 4),
      allowDuplicateMovementFamilies: !!day.allowDuplicateMovementFamilies,
    };
  }

  if (dayKind === 'lower') {
    const lowerPrimary = unique<WorkoutFocusTag>(primaryFocuses.length ? primaryFocuses : ['legs', 'hamstrings', 'glutes']);
    return {
      primaryFocuses: lowerPrimary,
      supportFocuses: unique<WorkoutFocusTag>([...supportFocuses, 'core']),
      disallowedFocuses: day.disallowedFocuses || ALL_EXERCISE_FOCUS_TAGS.filter((tag) => !['legs', 'hamstrings', 'glutes', 'core'].includes(tag)),
      requiredCoverage: day.requiredCoverage || ['legs'],
      targetExercises: clamp(Number(day.targetExercises || 5), 1, 7),
      minExercises: clamp(Number(day.minExercises || 4), 1, 7),
      minPrimaryExercises: clamp(Number(day.minPrimaryExercises || 4), 1, 7),
      maxSupportExercises: clamp(Number(day.maxSupportExercises || 1), 0, 4),
      allowDuplicateMovementFamilies: !!day.allowDuplicateMovementFamilies,
    };
  }

  if (dayKind === 'push') {
    return {
      primaryFocuses: unique<WorkoutFocusTag>(primaryFocuses.length ? primaryFocuses : ['chest', 'shoulders']),
      supportFocuses: unique<WorkoutFocusTag>([...supportFocuses, 'arms']),
      disallowedFocuses: day.disallowedFocuses || ALL_EXERCISE_FOCUS_TAGS.filter((tag) => !['chest', 'shoulders', 'arms', 'core'].includes(tag)),
      requiredCoverage: day.requiredCoverage || ['chest', 'shoulders'],
      targetExercises: clamp(Number(day.targetExercises || 5), 1, 7),
      minExercises: clamp(Number(day.minExercises || 4), 1, 7),
      minPrimaryExercises: clamp(Number(day.minPrimaryExercises || 4), 1, 7),
      maxSupportExercises: clamp(Number(day.maxSupportExercises || 1), 0, 4),
      allowDuplicateMovementFamilies: !!day.allowDuplicateMovementFamilies,
    };
  }

  if (dayKind === 'pull') {
    return {
      primaryFocuses: unique<WorkoutFocusTag>(primaryFocuses.length ? primaryFocuses : ['back']),
      supportFocuses: unique<WorkoutFocusTag>([...supportFocuses, 'arms']),
      disallowedFocuses: day.disallowedFocuses || ALL_EXERCISE_FOCUS_TAGS.filter((tag) => !['back', 'arms', 'core'].includes(tag)),
      requiredCoverage: day.requiredCoverage || ['back'],
      targetExercises: clamp(Number(day.targetExercises || 5), 1, 7),
      minExercises: clamp(Number(day.minExercises || 4), 1, 7),
      minPrimaryExercises: clamp(Number(day.minPrimaryExercises || 4), 1, 7),
      maxSupportExercises: clamp(Number(day.maxSupportExercises || 1), 0, 4),
      allowDuplicateMovementFamilies: !!day.allowDuplicateMovementFamilies,
    };
  }

  if (dayKind === 'full_body') {
    return {
      primaryFocuses,
      supportFocuses: unique<WorkoutFocusTag>([...supportFocuses, 'core', 'arms']),
      disallowedFocuses: day.disallowedFocuses || disallowedBase.filter((tag) => tag !== 'core' && tag !== 'arms'),
      requiredCoverage: day.requiredCoverage || ['legs', 'chest', 'back'],
      targetExercises: clamp(Number(day.targetExercises || 5), 1, 7),
      minExercises: clamp(Number(day.minExercises || 4), 1, 7),
      minPrimaryExercises: clamp(Number(day.minPrimaryExercises || 3), 1, 7),
      maxSupportExercises: clamp(Number(day.maxSupportExercises || 2), 0, 4),
      allowDuplicateMovementFamilies: !!day.allowDuplicateMovementFamilies,
    };
  }

  if (dayKind === 'conditioning' || dayKind === 'rehab') {
    return {
      primaryFocuses,
      supportFocuses: unique<WorkoutFocusTag>([...supportFocuses, 'core']),
      disallowedFocuses: day.disallowedFocuses || disallowedBase,
      requiredCoverage: day.requiredCoverage || primaryFocuses.slice(0, 2),
      targetExercises: clamp(Number(day.targetExercises || 4), 1, 7),
      minExercises: clamp(Number(day.minExercises || 3), 1, 7),
      minPrimaryExercises: clamp(Number(day.minPrimaryExercises || 2), 1, 7),
      maxSupportExercises: clamp(Number(day.maxSupportExercises || 2), 0, 4),
      allowDuplicateMovementFamilies: !!day.allowDuplicateMovementFamilies,
    };
  }

  return {
    primaryFocuses,
    supportFocuses,
    disallowedFocuses: day.disallowedFocuses || disallowedBase,
    requiredCoverage: day.requiredCoverage || primaryFocuses.slice(0, 2),
    targetExercises: clamp(Number(day.targetExercises || 5), 1, 7),
    minExercises: clamp(Number(day.minExercises || 4), 1, 7),
    minPrimaryExercises: clamp(Number(day.minPrimaryExercises || Math.max(2, Math.min(4, primaryFocuses.length || 2))), 1, 7),
    maxSupportExercises: clamp(Number(day.maxSupportExercises || 1), 0, 4),
    allowDuplicateMovementFamilies: !!day.allowDuplicateMovementFamilies,
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

  const defaults = defaultProfileForDay(input.day, policy);

  return {
    day: input.day,
    policy,
    ...defaults,
  };
}

function matchesFocus(exercise: ProgramExercise, focusTag: WorkoutFocusTag) {
  const focus = inferPrimaryExerciseFocus(exercise);
  if (focus === focusTag) return true;
  return exerciseMatchesWorkoutFocus(exercise, [focusTag]);
}

function classifyCandidate(
  exercise: ProgramExercise,
  profile: ResolvedGeneratedSplitDayProfile,
): CandidateBucket | null {
  const primaryFocus = inferPrimaryExerciseFocus(exercise);

  if (primaryFocus && profile.disallowedFocuses.includes(primaryFocus)) {
    return null;
  }

  if (!isExerciseAllowedForDayPolicy(exercise, profile.policy)) {
    return null;
  }

  if (primaryFocus && profile.primaryFocuses.includes(primaryFocus as WorkoutFocusTag)) {
    return 'primary';
  }

  if (primaryFocus && profile.supportFocuses.includes(primaryFocus as WorkoutFocusTag)) {
    return 'support';
  }

  if (profile.primaryFocuses.some((tag) => matchesFocus(exercise, tag))) {
    return 'primary';
  }

  if (profile.supportFocuses.some((tag) => matchesFocus(exercise, tag))) {
    return 'support';
  }

  return null;
}

function rankCandidate(
  exercise: ProgramExercise,
  bucket: CandidateBucket,
  profile: ResolvedGeneratedSplitDayProfile,
  keepTerms: string[],
  coverageTag: WorkoutFocusTag | null,
) {
  let score = 0;
  const primaryFocus = inferPrimaryExerciseFocus(exercise);

  if (matchesNamePreference(exercise.name, keepTerms)) score += 500;
  if (coverageTag && matchesFocus(exercise, coverageTag)) score += 250;
  if (bucket === 'primary') score += 100;
  if (primaryFocus && profile.primaryFocuses.includes(primaryFocus as WorkoutFocusTag)) score += 40;
  if (primaryFocus && profile.supportFocuses.includes(primaryFocus as WorkoutFocusTag)) score += 10;
  if ((exercise.difficulty || '').toLowerCase() === 'intermediate') score += 4;
  score += (stableHash(`${profile.day.key}::${bucket}::${exercise.id}`) % 1000) / 1000;
  return score;
}

function pickBestCandidate(input: {
  candidates: ProgramExercise[];
  bucket: CandidateBucket;
  profile: ResolvedGeneratedSplitDayProfile;
  keepTerms: string[];
  usedExerciseIds: Set<string>;
  usedMovementFamilies: Set<string>;
  coverageTag?: WorkoutFocusTag | null;
}) {
  const available = input.candidates.filter((exercise) => !input.usedExerciseIds.has(exercise.id));
  if (!available.length) return null;

  const preferredFamilies = available.filter((exercise) => {
    const family = inferExerciseMovementFamily(exercise);
    if (!family || input.profile.allowDuplicateMovementFamilies) return true;
    return !input.usedMovementFamilies.has(family);
  });

  const pool = preferredFamilies.length ? preferredFamilies : available;

  return pool
    .map((exercise) => ({
      exercise,
      score: rankCandidate(
        exercise,
        input.bucket,
        input.profile,
        input.keepTerms,
        input.coverageTag || null,
      ),
    }))
    .sort((a, b) => b.score - a.score)[0]?.exercise || null;
}

function addSelection(
  exercise: ProgramExercise,
  selected: ProgramExercise[],
  usedExerciseIds: Set<string>,
  usedMovementFamilies: Set<string>,
) {
  selected.push(exercise);
  usedExerciseIds.add(exercise.id);
  const family = inferExerciseMovementFamily(exercise);
  if (family) usedMovementFamilies.add(family);
}

export function selectExercisesForGeneratedSplitDay(input: SelectionOptions): GeneratedSplitDaySelection {
  const keepTerms = (input.keepTerms || []).map((term) => normalizeWorkoutToken(term)).filter(Boolean);
  const avoidTerms = (input.avoidTerms || []).map((term) => normalizeWorkoutToken(term)).filter(Boolean);
  const profile = resolveGeneratedSplitDayProfile({
    day: input.day,
    familyKey: input.familyKey,
    dayIndex: input.dayIndex,
    daysPerWeek: input.daysPerWeek,
  });

  const filteredExercises = input.exercises.filter((exercise) => !matchesNamePreference(exercise.name, avoidTerms));
  const primaryCandidates = filteredExercises.filter((exercise) => classifyCandidate(exercise, profile) === 'primary');
  const supportCandidates = filteredExercises.filter((exercise) => classifyCandidate(exercise, profile) === 'support');

  const selected: ProgramExercise[] = [];
  const primarySelections: ProgramExercise[] = [];
  const supportSelections: ProgramExercise[] = [];
  const warnings: string[] = [];
  const missingCoverage: WorkoutFocusTag[] = [];
  const usedExerciseIds = new Set<string>();
  const usedMovementFamilies = new Set<string>();

  for (const coverageTag of profile.requiredCoverage) {
    const candidate = pickBestCandidate({
      candidates: primaryCandidates.filter((exercise) => matchesFocus(exercise, coverageTag)),
      bucket: 'primary',
      profile,
      keepTerms,
      usedExerciseIds,
      usedMovementFamilies,
      coverageTag,
    });

    if (!candidate) {
      missingCoverage.push(coverageTag);
      continue;
    }

    addSelection(candidate, selected, usedExerciseIds, usedMovementFamilies);
    primarySelections.push(candidate);
  }

  while (primarySelections.length < profile.minPrimaryExercises) {
    const candidate = pickBestCandidate({
      candidates: primaryCandidates,
      bucket: 'primary',
      profile,
      keepTerms,
      usedExerciseIds,
      usedMovementFamilies,
    });
    if (!candidate) break;
    addSelection(candidate, selected, usedExerciseIds, usedMovementFamilies);
    primarySelections.push(candidate);
  }

  const preferredPrimaryTarget = Math.max(profile.minPrimaryExercises, profile.targetExercises - profile.maxSupportExercises);
  while (primarySelections.length < preferredPrimaryTarget) {
    const candidate = pickBestCandidate({
      candidates: primaryCandidates,
      bucket: 'primary',
      profile,
      keepTerms,
      usedExerciseIds,
      usedMovementFamilies,
    });
    if (!candidate) break;
    addSelection(candidate, selected, usedExerciseIds, usedMovementFamilies);
    primarySelections.push(candidate);
  }

  while (selected.length < profile.targetExercises && supportSelections.length < profile.maxSupportExercises) {
    const candidate = pickBestCandidate({
      candidates: supportCandidates,
      bucket: 'support',
      profile,
      keepTerms,
      usedExerciseIds,
      usedMovementFamilies,
    });
    if (!candidate) break;
    addSelection(candidate, selected, usedExerciseIds, usedMovementFamilies);
    supportSelections.push(candidate);
  }

  while (selected.length < profile.targetExercises) {
    const candidate = pickBestCandidate({
      candidates: primaryCandidates,
      bucket: 'primary',
      profile,
      keepTerms,
      usedExerciseIds,
      usedMovementFamilies,
    });
    if (!candidate) break;
    addSelection(candidate, selected, usedExerciseIds, usedMovementFamilies);
    primarySelections.push(candidate);
  }

  if (missingCoverage.length) {
    warnings.push(`Missing required focus coverage: ${missingCoverage.join(', ')}.`);
  }

  if (selected.length < profile.targetExercises) {
    warnings.push(`Only found ${selected.length}/${profile.targetExercises} coherent exercises for ${input.day.name}.`);
  }

  if (primarySelections.length < profile.minPrimaryExercises) {
    warnings.push(`Only found ${primarySelections.length}/${profile.minPrimaryExercises} primary-focus exercises for ${input.day.name}.`);
  }

  if (selected.length < profile.minExercises) {
    warnings.push(`Minimum coherent exercise count not met for ${input.day.name}.`);
  }

  return {
    exercises: selected,
    warnings,
    primaryExerciseCount: primarySelections.length,
    supportExerciseCount: supportSelections.length,
    missingCoverage,
    targetExercises: profile.targetExercises,
    minExercises: profile.minExercises,
    minPrimaryExercises: profile.minPrimaryExercises,
    profile,
  };
}
