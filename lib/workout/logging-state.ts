export const DEFAULT_LOGGING_SETS_TARGET = 3;
export const DEFAULT_LOGGING_REST_SECONDS = 90;

export interface WorkoutSetDraft {
  weight: string;
  reps: string;
  rpe: string;
  isWarmup: boolean;
}

export interface LoggingSet {
  id?: string;
  set_number: number;
  reps: number;
  weight_lb: number | null;
  rpe: number | null;
  is_warmup: boolean;
}

export interface PreviousExerciseSession {
  sessionId: string;
  sets: LoggingSet[];
}

export interface LoggingExercise {
  id: string;
  exerciseName: string;
  sets_target?: number | null;
  reps_min?: number | null;
  reps_max?: number | null;
  rest_seconds?: number | null;
  sets: LoggingSet[];
  isModifiedCarryover?: boolean;
  isReset?: boolean;
}

export interface ActiveSetRowViewModel {
  setNumber: number;
  state: 'completed' | 'active' | 'upcoming';
  draft: WorkoutSetDraft;
  previousLabel: string;
  summaryLabel?: string;
  completedSet?: LoggingSet;
  canRepeatLast: boolean;
  canRepeatPlusFive: boolean;
  repeatLastDraft?: WorkoutSetDraft;
  repeatPlusFiveDraft?: WorkoutSetDraft;
  // Progression fields
  targetWeight?: number;
  targetReps?: number;
  progressionLabel?: string;
  progressionRationale?: string;
  isPROpportunity?: boolean;
}

export interface ExerciseSetRowsViewModel {
  rows: ActiveSetRowViewModel[];
  activeSetNumber: number | null;
  totalPlannedSets: number;
  totalLoggedSets: number;
  exerciseComplete: boolean;
  restSeconds: number;
  targetRepLabel: string | null;
  lastWorkingSetLabel: string | null;
}

export interface FinishWorkoutViewModel {
  title: string;
  ctaLabel: string;
  isEarlyFinish: boolean;
  exercisesCompleted: number;
  totalExercises: number;
  totalSets: number;
  durationLabel: string;
  noteStatus: string;
  incompleteItems: {
    exerciseId: string;
    exerciseName: string;
    remainingSets: number;
  }[];
}

function toDraft(set?: Partial<LoggingSet> | null): WorkoutSetDraft {
  return {
    weight:
      set?.weight_lb === null || set?.weight_lb === undefined
        ? ''
        : String(set.weight_lb),
    reps:
      set?.reps === null || set?.reps === undefined
        ? ''
        : String(set.reps),
    rpe:
      set?.rpe === null || set?.rpe === undefined
        ? ''
        : String(set.rpe),
    isWarmup: Boolean(set?.is_warmup),
  };
}

function getTargetSetCount(exercise: Pick<LoggingExercise, 'sets_target'>) {
  return Math.max(DEFAULT_LOGGING_SETS_TARGET, exercise.sets_target ?? DEFAULT_LOGGING_SETS_TARGET);
}

function getHighestLoggedSetNumber(sets: LoggingSet[]) {
  return sets.reduce((max, set) => Math.max(max, set.set_number), 0);
}

function getRestSeconds(exercise: Pick<LoggingExercise, 'rest_seconds'>) {
  return exercise.rest_seconds ?? DEFAULT_LOGGING_REST_SECONDS;
}

function isWorkingSet(set: LoggingSet | null | undefined) {
  return set ? !set.is_warmup : false;
}

function getLastWorkingSet(sets: LoggingSet[]) {
  const sorted = [...sets].sort((a, b) => a.set_number - b.set_number);
  return [...sorted].reverse().find((set) => isWorkingSet(set)) ?? null;
}

function getPreviousSessionSameSet(previousSession: PreviousExerciseSession | null | undefined, setNumber: number) {
  return previousSession?.sets.find((set) => set.set_number === setNumber && isWorkingSet(set)) ?? null;
}

function getPreviousSessionLastWorkingSet(previousSession: PreviousExerciseSession | null | undefined) {
  return previousSession ? getLastWorkingSet(previousSession.sets) : null;
}

function buildSummaryLabel(set: LoggingSet) {
  const parts = [`Set ${set.set_number}`];
  const weight = set.weight_lb === null || set.weight_lb === undefined ? 'Bodyweight' : `${set.weight_lb}`;
  parts.push(`${weight} x ${set.reps}`);
  if (set.rpe !== null && set.rpe !== undefined) {
    parts.push(`RPE ${set.rpe}`);
  }
  if (set.is_warmup) {
    parts.push('Warm-up');
  }
  return parts.join(' · ');
}

function buildRepTargetLabel(exercise: Pick<LoggingExercise, 'reps_min' | 'reps_max'>) {
  if (!exercise.reps_min || !exercise.reps_max) {
    return null;
  }

  return exercise.reps_min === exercise.reps_max
    ? `Target ${exercise.reps_min} reps`
    : `Target ${exercise.reps_min}-${exercise.reps_max} reps`;
}

function buildDefaultDraft(
  exercise: LoggingExercise,
  setNumber: number,
  draftsBySet: Record<number, WorkoutSetDraft>,
  previousSession: PreviousExerciseSession | null | undefined,
) {
  const savedDraft = draftsBySet[setNumber];
  if (savedDraft) {
    return savedDraft;
  }

  const completedCurrentSet = getLastWorkingSet(
    exercise.sets.filter((set) => set.set_number < setNumber),
  );
  if (completedCurrentSet) {
    return toDraft(completedCurrentSet);
  }

  const previousSameSet = getPreviousSessionSameSet(previousSession, setNumber);
  if (previousSameSet) {
    return toDraft(previousSameSet);
  }

  const previousWorkingSet = getPreviousSessionLastWorkingSet(previousSession);
  if (previousWorkingSet) {
    return toDraft(previousWorkingSet);
  }

  const midpoint =
    exercise.reps_min && exercise.reps_max
      ? Math.round((exercise.reps_min + exercise.reps_max) / 2)
      : '';

  return {
    weight: '',
    reps: midpoint ? String(midpoint) : '',
    rpe: '',
    isWarmup: false,
  };
}

function formatPreviousLabel(previousSession: PreviousExerciseSession | null | undefined, setNumber: number) {
  const previousSameSet = getPreviousSessionSameSet(previousSession, setNumber);
  if (previousSameSet) {
    return formatSetCompact(previousSameSet);
  }

  const previousWorkingSet = getPreviousSessionLastWorkingSet(previousSession);
  if (previousWorkingSet) {
    return formatSetCompact(previousWorkingSet);
  }

  return 'No previous';
}

function formatSetCompact(set: LoggingSet) {
  const weight = set.weight_lb === null || set.weight_lb === undefined ? 'BW' : String(set.weight_lb);
  return `${weight} x ${set.reps}`;
}

function formatDurationShort(elapsedSeconds: number) {
  const totalMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${totalMinutes}m`;
}

export function buildExerciseSetRows(input: {
  exercise: LoggingExercise;
  draftsBySet?: Record<number, WorkoutSetDraft>;
  extraSetCount?: number;
  activeSetNumber?: number | null;
  previousSession?: PreviousExerciseSession | null;
  recommendation?: {
    type: 'increase_weight' | 'increase_reps' | 'maintain' | 'deload';
    suggestedWeight?: number;
    suggestedReps?: number;
    rationale: string;
  } | null;
}): ExerciseSetRowsViewModel {
  const draftsBySet = input.draftsBySet ?? {};
  const extraSetCount = input.extraSetCount ?? 0;
  const baseTarget = getTargetSetCount(input.exercise);
  const highestLoggedSet = getHighestLoggedSetNumber(input.exercise.sets);
  const totalPlannedSets = Math.max(baseTarget + extraSetCount, highestLoggedSet);
  const firstIncompleteSetNumber =
    Array.from({ length: totalPlannedSets }, (_, index) => index + 1).find(
      (setNumber) => !input.exercise.sets.some((set) => set.set_number === setNumber),
    ) ?? null;
  const activeSetNumber =
    input.activeSetNumber && input.activeSetNumber <= totalPlannedSets
      ? input.activeSetNumber
      : firstIncompleteSetNumber;
  const lastWorkingSet = getLastWorkingSet(input.exercise.sets);
  const targetRepLabel = buildRepTargetLabel(input.exercise);

  const rows = Array.from({ length: totalPlannedSets }, (_, index) => {
    const setNumber = index + 1;
    const completedSet = input.exercise.sets.find((set) => set.set_number === setNumber);
    const draft = completedSet
      ? toDraft(completedSet)
      : buildDefaultDraft(input.exercise, setNumber, draftsBySet, input.previousSession);
    const isActive = !completedSet && activeSetNumber === setNumber;
    const previousLabel = formatPreviousLabel(input.previousSession, setNumber);

    // Progression logic
    let targetWeight = input.recommendation?.suggestedWeight;
    let targetReps = input.recommendation?.suggestedReps;
    let progressionLabel: string | undefined;
    let progressionRationale: string | undefined;
    let isPROpportunity = false;

    if (input.recommendation) {
      if (input.recommendation.type === 'increase_weight') {
        progressionLabel = input.exercise.isModifiedCarryover ? 'Adjusted Baseline' : 'Weight Increase';
        isPROpportunity = !input.exercise.isModifiedCarryover;
      } else if (input.recommendation.type === 'increase_reps') {
        progressionLabel = 'Rep Progression';
        isPROpportunity = !input.exercise.isModifiedCarryover;
      } else if (input.recommendation.type === 'deload') {
        progressionLabel = 'Deload Focus';
      } else if (input.exercise.isReset) {
        progressionLabel = 'Fresh Benchmark';
      }

      // Only show rationale for the active set
      if (isActive) {
        progressionRationale = input.recommendation.rationale;
      }
    } else if (input.exercise.isReset) {
      progressionLabel = 'Fresh Benchmark';
    } else if (input.exercise.isModifiedCarryover) {
      progressionLabel = 'Adjusted Baseline';
    }

    // Space optimization: Only show "Previous" if it differs from the current Target
    // or if no target is present. This reduces visual noise in the active row.
    const isTargetSameAsPrevious = 
      targetWeight !== undefined && 
      targetReps !== undefined && 
      previousLabel === `${targetWeight === null ? 'BW' : targetWeight} x ${targetReps}`;

    return {
      setNumber,
      state: completedSet ? 'completed' : isActive ? 'active' : 'upcoming',
      draft,
      previousLabel: (isActive && isTargetSameAsPrevious) ? '' : previousLabel,
      summaryLabel: completedSet ? buildSummaryLabel(completedSet) : undefined,
      completedSet,
      canRepeatLast: Boolean(lastWorkingSet) && isActive,
      canRepeatPlusFive:
        Boolean(lastWorkingSet)
        && lastWorkingSet?.weight_lb !== null
        && lastWorkingSet?.weight_lb !== undefined
        && isActive,
      repeatLastDraft: lastWorkingSet && isActive ? toDraft(lastWorkingSet) : undefined,
      repeatPlusFiveDraft:
        lastWorkingSet
        && lastWorkingSet.weight_lb !== null
        && lastWorkingSet.weight_lb !== undefined
        && isActive
          ? {
              ...toDraft(lastWorkingSet),
              weight: String(lastWorkingSet.weight_lb + 5),
            }
          : undefined,
      targetWeight,
      targetReps,
      progressionLabel,
      progressionRationale,
      isPROpportunity,
    } satisfies ActiveSetRowViewModel;

  });

  return {
    rows,
    activeSetNumber,
    totalPlannedSets,
    totalLoggedSets: input.exercise.sets.length,
    exerciseComplete: input.exercise.sets.length >= totalPlannedSets,
    restSeconds: getRestSeconds(input.exercise),
    targetRepLabel,
    lastWorkingSetLabel: lastWorkingSet ? formatSetCompact(lastWorkingSet) : null,
  };
}

export function buildFinishWorkoutViewModel(input: {
  sessionNote: string;
  elapsedSeconds: number;
  exercises: {
    id: string;
    exerciseName: string;
    sets_target?: number | null;
    sets: LoggingSet[];
  }[];
}): FinishWorkoutViewModel {
  const incompleteItems = input.exercises
    .map((exercise) => {
      const target = getTargetSetCount(exercise);
      const remainingSets = Math.max(0, target - exercise.sets.length);
      return remainingSets > 0
        ? {
            exerciseId: exercise.id,
            exerciseName: exercise.exerciseName,
            remainingSets,
          }
        : null;
    })
    .filter(Boolean) as FinishWorkoutViewModel['incompleteItems'];

  const totalSets = input.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  const exercisesCompleted = input.exercises.filter(
    (exercise) => exercise.sets.length >= getTargetSetCount(exercise),
  ).length;
  const isEarlyFinish = incompleteItems.length > 0;

  return {
    title: isEarlyFinish ? 'Finish Early?' : 'Finish Workout',
    ctaLabel: isEarlyFinish ? 'Finish Anyway' : 'Finish Workout',
    isEarlyFinish,
    exercisesCompleted,
    totalExercises: input.exercises.length,
    totalSets,
    durationLabel: formatDurationShort(input.elapsedSeconds),
    noteStatus: input.sessionNote.trim() ? 'Session note ready' : 'No session note yet',
    incompleteItems,
  };
}

export function getNextExerciseIndex(exercises: { sets_target?: number | null; sets: LoggingSet[] }[], currentIndex: number) {
  for (let index = currentIndex + 1; index < exercises.length; index += 1) {
    const exercise = exercises[index];
    if (exercise.sets.length < getTargetSetCount(exercise)) {
      return index;
    }
  }
  return Math.min(currentIndex + 1, Math.max(0, exercises.length - 1));
}
