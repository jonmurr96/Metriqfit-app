import { WEEKDAY_SEQUENCE, type WeeklyLayoutAssignment } from './program-catalog.ts';

export interface WorkoutPlanDiffExercise {
  exerciseId?: string | null;
  name?: string | null;
}

export interface WorkoutPlanDiffDay {
  id?: string | null;
  name: string;
  focus?: string | null;
  estimatedDurationMin?: number | null;
  exercises?: WorkoutPlanDiffExercise[];
}

export interface WorkoutPlanComparable {
  id?: string | null;
  familyKey?: string | null;
  progressionModel?: string | null;
  daysPerWeek?: number | null;
  weeklyLayout?: WeeklyLayoutAssignment[] | null;
  days?: WorkoutPlanDiffDay[];
}

export interface WorkoutPlanDiffResult {
  familyChanged: boolean;
  progressionChanged: boolean;
  daysPerWeekChanged: boolean;
  weeklyLayoutChanged: boolean;
  dayFocusChanges: Array<{
    dayIndex: number;
    currentName: string;
    previewName: string;
    currentFocus: string | null;
    previewFocus: string | null;
  }>;
  exerciseOverlapPercent: number;
  averageSessionDurationCurrent: number | null;
  averageSessionDurationPreview: number | null;
  averageSessionDurationDelta: number;
  removedExerciseNames: string[];
  addedExerciseNames: string[];
  changeSummary: string[];
  isMateriallyDifferent: boolean;
}

function normalizeToken(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function labelToken(value: string | null | undefined, fallback = 'Unspecified') {
  const normalized = normalizeToken(value);
  if (!normalized) return fallback;
  return normalized
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeExerciseKey(exercise: WorkoutPlanDiffExercise) {
  return normalizeToken(exercise.exerciseId || exercise.name || '');
}

function collectExerciseMaps(plan: WorkoutPlanComparable) {
  const namesByKey = new Map<string, string>();
  const keys = new Set<string>();

  for (const day of plan.days || []) {
    for (const exercise of day.exercises || []) {
      const key = normalizeExerciseKey(exercise);
      if (!key) continue;
      keys.add(key);
      namesByKey.set(key, String(exercise.name || exercise.exerciseId || '').trim());
    }
  }

  return { keys, namesByKey };
}

function averageDuration(plan: WorkoutPlanComparable) {
  const durations = (plan.days || [])
    .map((day) => Number(day.estimatedDurationMin || 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!durations.length) return null;
  return Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
}

function buildWeeklyLayoutSignature(plan: WorkoutPlanComparable) {
  const dayById = new Map((plan.days || []).map((day) => [day.id || day.name, day]));
  const layoutByWeekday = new Map((plan.weeklyLayout || []).map((entry) => [entry.weekday, entry]));

  return WEEKDAY_SEQUENCE.map((weekday) => {
    const entry = layoutByWeekday.get(weekday);
    if (!entry) {
      return `${weekday}:missing`;
    }

    const day = entry.planDayId ? dayById.get(entry.planDayId) : null;
    const dayName = normalizeToken(day?.name || '');
    const dayFocus = normalizeToken(day?.focus || '');
    return `${weekday}:${entry.sessionType}:${dayName}:${dayFocus}`;
  }).join('|');
}

function buildDayFocusChanges(currentPlan: WorkoutPlanComparable, previewPlan: WorkoutPlanComparable) {
  const currentDays = currentPlan.days || [];
  const previewDays = previewPlan.days || [];
  const maxLength = Math.max(currentDays.length, previewDays.length);
  const changes: WorkoutPlanDiffResult['dayFocusChanges'] = [];

  for (let index = 0; index < maxLength; index += 1) {
    const currentDay = currentDays[index];
    const previewDay = previewDays[index];
    if (!currentDay || !previewDay) {
      continue;
    }

    const currentName = String(currentDay.name || '').trim();
    const previewName = String(previewDay.name || '').trim();
    const currentFocus = String(currentDay.focus || '').trim() || null;
    const previewFocus = String(previewDay.focus || '').trim() || null;

    if (
      normalizeToken(currentName) !== normalizeToken(previewName)
      || normalizeToken(currentFocus) !== normalizeToken(previewFocus)
    ) {
      changes.push({
        dayIndex: index + 1,
        currentName,
        previewName,
        currentFocus,
        previewFocus,
      });
    }
  }

  return changes;
}

export function buildWorkoutPlanDiff(input: {
  currentPlan: WorkoutPlanComparable;
  previewPlan: WorkoutPlanComparable;
  minorRefinement?: boolean;
}): WorkoutPlanDiffResult {
  const { currentPlan, previewPlan } = input;
  const currentFamily = normalizeToken(currentPlan.familyKey);
  const previewFamily = normalizeToken(previewPlan.familyKey);
  const currentProgression = normalizeToken(currentPlan.progressionModel);
  const previewProgression = normalizeToken(previewPlan.progressionModel);
  const familyChanged = currentFamily !== previewFamily;
  const progressionChanged = currentProgression !== previewProgression;
  const daysPerWeekChanged = Number(currentPlan.daysPerWeek || 0) !== Number(previewPlan.daysPerWeek || 0);
  const weeklyLayoutChanged = buildWeeklyLayoutSignature(currentPlan) !== buildWeeklyLayoutSignature(previewPlan);
  const dayFocusChanges = buildDayFocusChanges(currentPlan, previewPlan);

  const currentExercises = collectExerciseMaps(currentPlan);
  const previewExercises = collectExerciseMaps(previewPlan);

  const overlapKeys = Array.from(currentExercises.keys).filter((key) => previewExercises.keys.has(key));
  const removedKeys = Array.from(currentExercises.keys).filter((key) => !previewExercises.keys.has(key));
  const addedKeys = Array.from(previewExercises.keys).filter((key) => !currentExercises.keys.has(key));

  const exerciseOverlapPercent = currentExercises.keys.size
    ? Math.round((overlapKeys.length / currentExercises.keys.size) * 100)
    : 0;

  const averageSessionDurationCurrent = averageDuration(currentPlan);
  const averageSessionDurationPreview = averageDuration(previewPlan);
  const averageSessionDurationDelta = (averageSessionDurationPreview || 0) - (averageSessionDurationCurrent || 0);

  const changeSummary: string[] = [];
  if (familyChanged) {
    changeSummary.push(`Changed family from ${labelToken(currentPlan.familyKey)} to ${labelToken(previewPlan.familyKey)}.`);
  }
  if (daysPerWeekChanged) {
    changeSummary.push(
      `Adjusted training frequency from ${Number(currentPlan.daysPerWeek || 0)} to ${Number(previewPlan.daysPerWeek || 0)} days per week.`,
    );
  }
  if (progressionChanged) {
    changeSummary.push(
      `Changed progression from ${labelToken(currentPlan.progressionModel)} to ${labelToken(previewPlan.progressionModel)}.`,
    );
  }
  if (Math.abs(averageSessionDurationDelta) >= 10 && averageSessionDurationCurrent && averageSessionDurationPreview) {
    changeSummary.push(
      averageSessionDurationDelta < 0
        ? `Shortened target sessions from ${averageSessionDurationCurrent}m to ${averageSessionDurationPreview}m.`
        : `Lengthened target sessions from ${averageSessionDurationCurrent}m to ${averageSessionDurationPreview}m.`,
    );
  }
  if (!familyChanged && !daysPerWeekChanged && exerciseOverlapPercent <= 70) {
    changeSummary.push(`Replaced ${removedKeys.length} exercises to meaningfully refresh the current program.`);
  }
  if (weeklyLayoutChanged && !daysPerWeekChanged) {
    changeSummary.push('Updated the weekly layout to better fit the target schedule.');
  }

  const overlapThreshold = input.minorRefinement ? 85 : 70;
  const isMateriallyDifferent =
    familyChanged
    || progressionChanged
    || daysPerWeekChanged
    || weeklyLayoutChanged
    || Math.abs(averageSessionDurationDelta) >= 10
    || dayFocusChanges.length >= 2
    || exerciseOverlapPercent <= overlapThreshold;

  return {
    familyChanged,
    progressionChanged,
    daysPerWeekChanged,
    weeklyLayoutChanged,
    dayFocusChanges,
    exerciseOverlapPercent,
    averageSessionDurationCurrent,
    averageSessionDurationPreview,
    averageSessionDurationDelta,
    removedExerciseNames: removedKeys.map((key) => currentExercises.namesByKey.get(key) || key),
    addedExerciseNames: addedKeys.map((key) => previewExercises.namesByKey.get(key) || key),
    changeSummary,
    isMateriallyDifferent,
  };
}
