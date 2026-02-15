import { supabase } from '../lib/supabase';
import { normalizeOnboardingAnswers, resolvePreferredDaysOff } from '../lib/onboarding';
import type { MealsPerDay, Weekday } from '../lib/onboarding';

const db = supabase as any;

export type ReviewSection = 'macros' | 'daily_targets' | 'workout_plan' | 'nutrition_plan';
export type PricingTier = 'free' | 'elite_monthly' | 'elite_annual' | 'elite_lifetime';

export interface OnboardingReviewState {
  id: string;
  user_id: string;
  generation_run_id: string;
  macros_accepted: boolean;
  daily_targets_accepted: boolean;
  workout_plan_accepted: boolean;
  nutrition_plan_accepted: boolean;
  all_accepted_at: string | null;
  selected_tier: PricingTier | null;
  selected_at: string | null;
  created_at: string;
  updated_at: string;
}

interface OnboardingAnswersRow {
  id: string;
  user_id: string;
  answers: Record<string, any>;
  completed_at: string | null;
}

interface WorkoutPlanEditInput {
  name: string;
  description: string | null;
  days_per_week: number;
  preferred_days_off: Weekday[];
  minutes_per_workout: string;
}

interface NutritionPlanEditInput {
  name: string;
  description: string | null;
  meals_per_day: MealsPerDay;
  dietary_preference: string;
  allergies_exclusions: string[];
  refused_foods: string[];
}

interface ActiveWorkoutPlanRow {
  id: string;
  name: string;
  description: string | null;
  days_per_week: number;
}

interface WorkoutPlanDayRow {
  id: string;
  day_number: number;
  name: string;
  focus: string | null;
}

const SECTION_TO_COLUMN: Record<ReviewSection, keyof OnboardingReviewState> = {
  macros: 'macros_accepted',
  daily_targets: 'daily_targets_accepted',
  workout_plan: 'workout_plan_accepted',
  nutrition_plan: 'nutrition_plan_accepted',
};

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

type NormalizedWeekday = Exclude<Weekday, 'no_preference'>;
type NutritionMealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

function clampDaysPerWeek(value: number) {
  return Math.max(2, Math.min(6, Math.round(value)));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function normalizeReviewState(row: any): OnboardingReviewState {
  return {
    id: row.id,
    user_id: row.user_id,
    generation_run_id: row.generation_run_id,
    macros_accepted: Boolean(row.macros_accepted),
    daily_targets_accepted: Boolean(row.daily_targets_accepted),
    workout_plan_accepted: Boolean(row.workout_plan_accepted),
    nutrition_plan_accepted: Boolean(row.nutrition_plan_accepted),
    all_accepted_at: row.all_accepted_at || null,
    selected_tier: (row.selected_tier as PricingTier | null) || null,
    selected_at: row.selected_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function computeAllAccepted(row: Pick<OnboardingReviewState, 'macros_accepted' | 'daily_targets_accepted' | 'workout_plan_accepted' | 'nutrition_plan_accepted'>) {
  return row.macros_accepted && row.daily_targets_accepted && row.workout_plan_accepted && row.nutrition_plan_accepted;
}

function dayKeyFromDate(dateText: string): NormalizedWeekday {
  const date = new Date(`${dateText}T00:00:00`);
  const key = WEEKDAY_KEYS[date.getDay()];
  if (key === 'sun') return 'sun';
  return key as NormalizedWeekday;
}

function getSlotsForMealsPerDay(mealsPerDay: MealsPerDay): NutritionMealSlot[] {
  switch (mealsPerDay) {
    case '2':
      return ['breakfast', 'dinner'];
    case '3':
      return ['breakfast', 'lunch', 'dinner'];
    case '4':
      return ['breakfast', 'lunch', 'dinner', 'snack'];
    case '5_plus':
      // Current schema supports 4 meal slots; use snack for additional snacks.
      return ['breakfast', 'lunch', 'dinner', 'snack'];
    case 'no_preference':
    default:
      return ['breakfast', 'lunch', 'dinner', 'snack'];
  }
}

function macroSplitForSlot(slot: NutritionMealSlot) {
  const map: Record<NutritionMealSlot, number> = {
    breakfast: 0.25,
    lunch: 0.30,
    dinner: 0.30,
    snack: 0.15,
  };
  return map[slot] || 0.25;
}

async function runInBatches<T>(
  items: T[],
  batchSize: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (!items.length) return;
  const safeSize = Math.max(1, batchSize);

  for (let index = 0; index < items.length; index += safeSize) {
    const batch = items.slice(index, index + safeSize);
    await Promise.all(batch.map((item) => worker(item)));
  }
}

async function getOnboardingAnswersRow(userId: string): Promise<OnboardingAnswersRow | null> {
  const { data, error } = await db
    .from('onboarding_answers')
    .select('id, user_id, answers, completed_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load onboarding answers');
  }

  return (data as OnboardingAnswersRow | null) || null;
}

async function upsertOnboardingAnswers(userId: string, answersPatch: Record<string, any>, normalize = false): Promise<void> {
  const existing = await getOnboardingAnswersRow(userId);
  const mergedAnswers = {
    ...(existing?.answers || {}),
    ...answersPatch,
  };

  const payloadAnswers = normalize ? normalizeOnboardingAnswers(mergedAnswers as any) : mergedAnswers;

  const { error } = await db
    .from('onboarding_answers')
    .upsert({
      user_id: userId,
      answers: payloadAnswers,
      completed_at: existing?.completed_at || new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    throw new Error(error.message || 'Failed to save onboarding answers');
  }
}

async function getActiveWorkoutPlanRow(userId: string): Promise<ActiveWorkoutPlanRow> {
  const { data, error } = await db
    .from('user_workout_plans')
    .select('id, name, description, days_per_week')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message || 'No active workout plan found');
  }

  return data as ActiveWorkoutPlanRow;
}

async function getWorkoutPlanDays(planId: string): Promise<WorkoutPlanDayRow[]> {
  const { data, error } = await db
    .from('user_workout_plan_days')
    .select('id, day_number, name, focus')
    .eq('plan_id', planId)
    .order('day_number', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to load workout days');
  }

  return (data || []) as WorkoutPlanDayRow[];
}

async function resequenceWorkoutPlanDays(planId: string): Promise<WorkoutPlanDayRow[]> {
  const days = await getWorkoutPlanDays(planId);
  if (!days.length) return [];
  const indexedDays = days.map((day, index) => ({ day, index }));

  await runInBatches(indexedDays, 8, async ({ day, index }) => {
    const { error } = await db
      .from('user_workout_plan_days')
      .update({ day_number: 1000 + index + 1 })
      .eq('id', day.id);

    if (error) {
      throw new Error(error.message || 'Failed to normalize workout day order');
    }
  });

  await runInBatches(indexedDays, 8, async ({ day, index }) => {
    const { error } = await db
      .from('user_workout_plan_days')
      .update({ day_number: index + 1 })
      .eq('id', day.id);

    if (error) {
      throw new Error(error.message || 'Failed to normalize workout day order');
    }
  });

  return getWorkoutPlanDays(planId);
}

async function resolveWorkoutDaysOff(
  userId: string,
  daysPerWeek: number,
  preferredDaysOffOverride?: Weekday[],
): Promise<NormalizedWeekday[]> {
  const onboarding = await getOnboardingAnswersRow(userId);
  const onboardingPreferredDaysOff = Array.isArray(onboarding?.answers?.preferred_days_off)
    ? onboarding?.answers?.preferred_days_off
    : [];

  const dayResolution = resolvePreferredDaysOff(
    daysPerWeek,
    (preferredDaysOffOverride || onboardingPreferredDaysOff) as Weekday[],
  );
  const requiredDaysOff = Math.max(0, 7 - daysPerWeek);
  const resolvedDaysOff = [...dayResolution.resolvedDaysOff];

  if (resolvedDaysOff.length < requiredDaysOff) {
    const fillPriority: NormalizedWeekday[] = ['sun', 'sat', 'wed', 'fri', 'mon', 'thu', 'tue'];
    for (const day of fillPriority) {
      if (resolvedDaysOff.includes(day)) continue;
      resolvedDaysOff.push(day);
      if (resolvedDaysOff.length >= requiredDaysOff) break;
    }
  }

  return resolvedDaysOff.slice(0, requiredDaysOff);
}

async function rebalanceWorkoutScheduleForPlan(
  planId: string,
  dayIds: string[],
  resolvedDaysOff: NormalizedWeekday[],
): Promise<void> {
  if (!dayIds.length) return;

  const allDays: NormalizedWeekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const allowedDays = allDays.filter((day) => !resolvedDaysOff.includes(day));

  const { data: scheduleRows, error: scheduleError } = await db
    .from('user_workout_plan_schedule')
    .select('id, scheduled_date, status')
    .eq('plan_id', planId)
    .order('scheduled_date', { ascending: true });

  if (scheduleError) {
    throw new Error(scheduleError.message || 'Failed to load workout schedule');
  }

  let workoutIndex = 0;
  const updates: { id: string; payload: Record<string, any> }[] = [];

  for (const row of scheduleRows || []) {
    if (row.status === 'completed') {
      continue;
    }

    const dayKey = dayKeyFromDate(row.scheduled_date);
    const isWorkoutDay = allowedDays.includes(dayKey);
    const nextStatus = row.status === 'rescheduled' ? 'rescheduled' : 'planned';

    const payload = isWorkoutDay
      ? {
        session_type: 'workout',
        plan_day_id: dayIds[workoutIndex % dayIds.length],
        status: nextStatus,
      }
      : {
        session_type: 'rest',
        plan_day_id: null,
        status: nextStatus,
      };

    if (isWorkoutDay) {
      workoutIndex += 1;
    }

    updates.push({ id: row.id, payload });
  }

  await runInBatches(updates, 20, async (entry) => {
    const { error: updateScheduleError } = await db
      .from('user_workout_plan_schedule')
      .update(entry.payload)
      .eq('id', entry.id);

    if (updateScheduleError) {
      throw new Error(updateScheduleError.message || 'Failed to update workout schedule');
    }
  });
}

async function removeNutritionMealsBatch(planMealIds: string[]): Promise<void> {
  if (!planMealIds.length) return;

  const { data: variants, error: variantsError } = await db
    .from('user_nutrition_plan_meal_variants')
    .select('id')
    .in('plan_meal_id', planMealIds);

  if (variantsError) {
    throw new Error(variantsError.message || 'Failed to load meal variants');
  }

  const variantIds = (variants || []).map((row: { id: string }) => row.id);
  if (variantIds.length) {
    const { error: deleteItemsError } = await db
      .from('user_nutrition_plan_meal_variant_items')
      .delete()
      .in('variant_id', variantIds);

    if (deleteItemsError) {
      throw new Error(deleteItemsError.message || 'Failed to remove meal variant items');
    }

    const { error: deleteVariantsError } = await db
      .from('user_nutrition_plan_meal_variants')
      .delete()
      .in('id', variantIds);

    if (deleteVariantsError) {
      throw new Error(deleteVariantsError.message || 'Failed to remove meal variants');
    }
  }

  const { error: deleteMealError } = await db
    .from('user_nutrition_plan_meals')
    .delete()
    .in('id', planMealIds);

  if (deleteMealError) {
    throw new Error(deleteMealError.message || 'Failed to remove meal');
  }
}

async function syncWorkoutPlanNameWithFrequency(planId: string, daysPerWeek: number): Promise<void> {
  const { data: plan, error } = await db
    .from('user_workout_plans')
    .select('name')
    .eq('id', planId)
    .maybeSingle();

  if (error || !plan?.name) {
    return;
  }

  const currentName = String(plan.name);
  const nextName = currentName.replace(/\(\s*\d+\s*days?\s*\)/i, `(${daysPerWeek} days)`);

  if (nextName === currentName) {
    return;
  }

  const { error: renameError } = await db
    .from('user_workout_plans')
    .update({
      name: nextName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId);

  if (renameError) {
    throw new Error(renameError.message || 'Failed to synchronize workout plan title');
  }
}

async function cloneWorkoutDayExercises(sourceDayId: string, targetDayId: string): Promise<void> {
  const { data: donorExercises, error: donorExercisesError } = await db
    .from('user_workout_plan_exercises')
    .select('exercise_id, order_index, sets_target, reps_min, reps_max, rest_seconds, tempo, user_notes, original_exercise_id')
    .eq('plan_day_id', sourceDayId)
    .order('order_index', { ascending: true });

  if (donorExercisesError) {
    throw new Error(donorExercisesError.message || 'Failed to load donor workout day exercises');
  }

  for (const exercise of donorExercises || []) {
    const { error: insertExerciseError } = await db
      .from('user_workout_plan_exercises')
      .insert({
        plan_day_id: targetDayId,
        exercise_id: exercise.exercise_id,
        order_index: exercise.order_index,
        sets_target: exercise.sets_target,
        reps_min: exercise.reps_min,
        reps_max: exercise.reps_max,
        rest_seconds: exercise.rest_seconds,
        tempo: exercise.tempo,
        user_notes: exercise.user_notes,
        original_exercise_id: exercise.original_exercise_id || exercise.exercise_id,
        is_user_modified: true,
      });

    if (insertExerciseError) {
      throw new Error(insertExerciseError.message || 'Failed to clone workout day exercises');
    }
  }
}

async function ensureWorkoutPlanDayCount(planId: string, targetDaysPerWeek: number): Promise<void> {
  const safeTarget = clampDaysPerWeek(targetDaysPerWeek);
  const existingDays = await getWorkoutPlanDays(planId);

  if (!existingDays.length) {
    throw new Error('Workout plan has no days to rebalance');
  }

  if (existingDays.length > safeTarget) {
    const daysToDelete = existingDays.slice(safeTarget);
    for (const day of daysToDelete) {
      const { error: deleteDayError } = await db
        .from('user_workout_plan_days')
        .delete()
        .eq('id', day.id)
        .eq('plan_id', planId);

      if (deleteDayError) {
        throw new Error(deleteDayError.message || 'Failed to remove extra workout day');
      }
    }
  } else if (existingDays.length < safeTarget) {
    const donorDay = existingDays[existingDays.length - 1];
    for (let index = existingDays.length + 1; index <= safeTarget; index += 1) {
      const { data: insertedDay, error: insertDayError } = await db
        .from('user_workout_plan_days')
        .insert({
          plan_id: planId,
          day_number: index,
          name: `Day ${index}`,
          focus: donorDay?.focus || 'Custom focus',
          is_completed: false,
        })
        .select('id')
        .single();

      if (insertDayError || !insertedDay) {
        throw new Error(insertDayError?.message || 'Failed to add workout day');
      }

      if (donorDay?.id) {
        await cloneWorkoutDayExercises(donorDay.id, insertedDay.id);
      }
    }
  }

  await resequenceWorkoutPlanDays(planId);
}

async function syncWorkoutFrequencyAndSchedule(
  userId: string,
  planId: string,
  daysPerWeek: number,
  resolvedDaysOff: NormalizedWeekday[],
  minutesPerWorkout?: string,
): Promise<void> {
  const { error: updatePlanError } = await db
    .from('user_workout_plans')
    .update({
      days_per_week: daysPerWeek,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId);

  if (updatePlanError) {
    throw new Error(updatePlanError.message || 'Failed to update workout plan');
  }

  await syncWorkoutPlanNameWithFrequency(planId, daysPerWeek);

  const answersPatch: Record<string, any> = {
    training_days_per_week: daysPerWeek,
    preferred_days_off: resolvedDaysOff,
  };

  if (typeof minutesPerWorkout === 'string') {
    answersPatch.minutes_per_workout = minutesPerWorkout;
  }

  await upsertOnboardingAnswers(userId, answersPatch, true);

  const days = await getWorkoutPlanDays(planId);
  const dayIds = days.map((day) => day.id);
  await rebalanceWorkoutScheduleForPlan(planId, dayIds, resolvedDaysOff);
}

export async function getReviewState(
  userId: string,
  generationRunId: string,
  createIfMissing = true,
): Promise<OnboardingReviewState | null> {
  if (!generationRunId) return null;

  const { data, error } = await db
    .from('onboarding_plan_review_states')
    .select('*')
    .eq('user_id', userId)
    .eq('generation_run_id', generationRunId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load review state');
  }

  if (data) {
    return normalizeReviewState(data);
  }

  if (!createIfMissing) {
    return null;
  }

  return upsertReviewState(userId, generationRunId, {});
}

export async function upsertReviewState(
  userId: string,
  generationRunId: string,
  updates: Partial<Omit<OnboardingReviewState, 'id' | 'user_id' | 'generation_run_id' | 'created_at' | 'updated_at'>>,
): Promise<OnboardingReviewState> {
  const payload = {
    user_id: userId,
    generation_run_id: generationRunId,
    ...updates,
  };

  const { data, error } = await db
    .from('onboarding_plan_review_states')
    .upsert(payload, { onConflict: 'user_id,generation_run_id' })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to save review state');
  }

  return normalizeReviewState(data);
}

export async function setSectionAccepted(
  userId: string,
  generationRunId: string,
  section: ReviewSection,
  accepted: boolean,
): Promise<OnboardingReviewState> {
  const column = SECTION_TO_COLUMN[section] as string;

  const row = await upsertReviewState(userId, generationRunId, {
    [column]: accepted,
  } as any);

  const allAccepted = computeAllAccepted(row);
  const withAllAccepted = await upsertReviewState(userId, generationRunId, {
    all_accepted_at: allAccepted ? new Date().toISOString() : null,
  });

  return withAllAccepted;
}

export async function setPricingDecision(
  userId: string,
  generationRunId: string,
  tier: PricingTier,
): Promise<OnboardingReviewState> {
  return upsertReviewState(userId, generationRunId, {
    selected_tier: tier,
    selected_at: new Date().toISOString(),
  });
}

export async function updateManualTargets(
  userId: string,
  input: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  },
): Promise<void> {
  const { error } = await db
    .from('user_targets')
    .update({
      calories: input.calories,
      protein_g: input.protein_g,
      carbs_g: input.carbs_g,
      fat_g: input.fat_g,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message || 'Failed to update macro targets');
  }
}

export async function updateManualDailyTargets(
  userId: string,
  input: {
    water_ml: number;
    avg_steps: number | null;
  },
): Promise<void> {
  const { error } = await db
    .from('user_targets')
    .update({
      water_ml: input.water_ml,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message || 'Failed to update daily targets');
  }

  await upsertOnboardingAnswers(userId, {
    avg_steps: input.avg_steps,
  }, true);
}

export async function updateManualWorkoutPlan(
  userId: string,
  input: WorkoutPlanEditInput,
): Promise<void> {
  const normalizedDaysPerWeek = clampDaysPerWeek(input.days_per_week);
  const resolvedDaysOff = await resolveWorkoutDaysOff(userId, normalizedDaysPerWeek, input.preferred_days_off);
  const activePlan = await getActiveWorkoutPlanRow(userId);

  const { error: updatePlanError } = await db
    .from('user_workout_plans')
    .update({
      name: input.name,
      description: input.description,
      updated_at: new Date().toISOString(),
    })
    .eq('id', activePlan.id);

  if (updatePlanError) {
    throw new Error(updatePlanError.message || 'Failed to update workout plan');
  }

  await ensureWorkoutPlanDayCount(activePlan.id, normalizedDaysPerWeek);

  await syncWorkoutFrequencyAndSchedule(
    userId,
    activePlan.id,
    normalizedDaysPerWeek,
    resolvedDaysOff,
    input.minutes_per_workout,
  );
}

export async function addManualWorkoutPlanDay(
  userId: string,
  input?: {
    name?: string;
    focus?: string;
    preferred_days_off?: Weekday[];
  },
): Promise<void> {
  const activePlan = await getActiveWorkoutPlanRow(userId);
  const existingDays = await getWorkoutPlanDays(activePlan.id);

  if (existingDays.length >= 6) {
    throw new Error('Maximum 6 workout days are supported.');
  }

  const nextDayNumber = existingDays.length + 1;
  const dayName = input?.name?.trim() || `Day ${nextDayNumber}`;
  const dayFocus = input?.focus?.trim() || 'Custom focus';

  const { data: insertedDay, error: insertDayError } = await db
    .from('user_workout_plan_days')
    .insert({
      plan_id: activePlan.id,
      day_number: nextDayNumber,
      name: dayName,
      focus: dayFocus,
      is_completed: false,
    })
    .select('id')
    .single();

  if (insertDayError || !insertedDay) {
    throw new Error(insertDayError?.message || 'Failed to add workout day');
  }

  const donorDay = existingDays[existingDays.length - 1];
  if (donorDay) {
    const { data: donorExercises, error: donorExercisesError } = await db
      .from('user_workout_plan_exercises')
      .select('exercise_id, order_index, sets_target, reps_min, reps_max, rest_seconds, tempo, user_notes, original_exercise_id')
      .eq('plan_day_id', donorDay.id)
      .order('order_index', { ascending: true });

    if (donorExercisesError) {
      throw new Error(donorExercisesError.message || 'Failed to initialize new workout day');
    }

    for (const exercise of donorExercises || []) {
      const { error: insertExerciseError } = await db
        .from('user_workout_plan_exercises')
        .insert({
          plan_day_id: insertedDay.id,
          exercise_id: exercise.exercise_id,
          order_index: exercise.order_index,
          sets_target: exercise.sets_target,
          reps_min: exercise.reps_min,
          reps_max: exercise.reps_max,
          rest_seconds: exercise.rest_seconds,
          tempo: exercise.tempo,
          user_notes: exercise.user_notes,
          original_exercise_id: exercise.original_exercise_id || exercise.exercise_id,
          is_user_modified: true,
        });

      if (insertExerciseError) {
        throw new Error(insertExerciseError.message || 'Failed to initialize new workout day exercises');
      }
    }
  }

  const resequencedDays = await resequenceWorkoutPlanDays(activePlan.id);
  const nextDaysPerWeek = clampDaysPerWeek(resequencedDays.length);
  const resolvedDaysOff = await resolveWorkoutDaysOff(
    userId,
    nextDaysPerWeek,
    input?.preferred_days_off,
  );

  await syncWorkoutFrequencyAndSchedule(
    userId,
    activePlan.id,
    nextDaysPerWeek,
    resolvedDaysOff,
  );
}

export async function removeManualWorkoutPlanDay(
  userId: string,
  planDayId: string,
  preferredDaysOffOverride?: Weekday[],
): Promise<void> {
  const activePlan = await getActiveWorkoutPlanRow(userId);
  const existingDays = await getWorkoutPlanDays(activePlan.id);

  if (existingDays.length <= 2) {
    throw new Error('At least 2 workout days are required.');
  }

  const targetDay = existingDays.find((day) => day.id === planDayId);
  if (!targetDay) {
    throw new Error('Workout day not found');
  }

  const { error: deleteError } = await db
    .from('user_workout_plan_days')
    .delete()
    .eq('id', targetDay.id)
    .eq('plan_id', activePlan.id);

  if (deleteError) {
    throw new Error(deleteError.message || 'Failed to remove workout day');
  }

  const resequencedDays = await resequenceWorkoutPlanDays(activePlan.id);
  const nextDaysPerWeek = clampDaysPerWeek(resequencedDays.length);
  const resolvedDaysOff = await resolveWorkoutDaysOff(
    userId,
    nextDaysPerWeek,
    preferredDaysOffOverride,
  );

  await syncWorkoutFrequencyAndSchedule(
    userId,
    activePlan.id,
    nextDaysPerWeek,
    resolvedDaysOff,
  );
}

async function createDefaultNutritionMealsBatch(
  planId: string,
  missing: { dayOfWeek: number; slot: NutritionMealSlot }[],
  targets: { calories: number; protein_g: number; carbs_g: number; fat_g: number },
): Promise<void> {
  if (!missing.length) return;

  const mealRows = missing.map((entry) => {
    const multiplier = macroSplitForSlot(entry.slot);
    const name = `${entry.slot.charAt(0).toUpperCase()}${entry.slot.slice(1)} Custom`;

    return {
      plan_id: planId,
      meal_slot: entry.slot,
      day_of_week: entry.dayOfWeek,
      name,
      description: 'Custom meal block added during onboarding review.',
      target_calories: round1(targets.calories * multiplier),
      target_protein: round1(targets.protein_g * multiplier),
      target_carbs: round1(targets.carbs_g * multiplier),
      target_fat: round1(targets.fat_g * multiplier),
      prep_time_min: 15,
      is_user_modified: true,
      selected_variant_id: null,
    };
  });

  const { data: createdMeals, error: mealsInsertError } = await db
    .from('user_nutrition_plan_meals')
    .insert(mealRows)
    .select('id, name, target_calories, target_protein, target_carbs, target_fat, prep_time_min');

  if (mealsInsertError || !createdMeals?.length) {
    throw new Error(mealsInsertError?.message || 'Failed to create default meals');
  }

  const variantRows = createdMeals.map((meal: any) => ({
    plan_meal_id: meal.id,
    variant_type: 'user_custom',
    name: meal.name,
    description: 'Customize ingredient list and macros.',
    target_calories: meal.target_calories,
    target_protein: meal.target_protein,
    target_carbs: meal.target_carbs,
    target_fat: meal.target_fat,
    prep_time_min: meal.prep_time_min || 15,
    source: 'user',
    is_active: true,
  }));

  const { data: createdVariants, error: variantsInsertError } = await db
    .from('user_nutrition_plan_meal_variants')
    .insert(variantRows)
    .select('id, plan_meal_id');

  if (variantsInsertError || !createdVariants?.length) {
    throw new Error(variantsInsertError?.message || 'Failed to create default meal variants');
  }

  await runInBatches(createdVariants, 20, async (variant: any) => {
    const { error: selectVariantError } = await db
      .from('user_nutrition_plan_meals')
      .update({ selected_variant_id: variant.id, is_user_modified: true })
      .eq('id', variant.plan_meal_id);

    if (selectVariantError) {
      throw new Error(selectVariantError.message || 'Failed to finalize created meal');
    }
  });
}

async function enforceNutritionMealStructure(
  userId: string,
  planId: string,
  slots: NutritionMealSlot[],
): Promise<void> {
  const { data: targetsRow } = await db
    .from('user_targets')
    .select('calories, protein_g, carbs_g, fat_g')
    .eq('user_id', userId)
    .maybeSingle();

  const targets = {
    calories: Number(targetsRow?.calories || 0),
    protein_g: Number(targetsRow?.protein_g || 0),
    carbs_g: Number(targetsRow?.carbs_g || 0),
    fat_g: Number(targetsRow?.fat_g || 0),
  };

  const { data: meals, error: mealsError } = await db
    .from('user_nutrition_plan_meals')
    .select('id, day_of_week, meal_slot, created_at')
    .eq('plan_id', planId)
    .order('created_at', { ascending: true });

  if (mealsError) {
    throw new Error(mealsError.message || 'Failed to load nutrition meals');
  }

  const byDay = new Map<number, { id: string; day_of_week: number; meal_slot: NutritionMealSlot }[]>();
  for (const row of meals || []) {
    if (typeof row.day_of_week !== 'number' || row.day_of_week < 0 || row.day_of_week > 6) continue;
    const normalized = {
      id: row.id,
      day_of_week: row.day_of_week,
      meal_slot: row.meal_slot as NutritionMealSlot,
    };
    const list = byDay.get(row.day_of_week) || [];
    list.push(normalized);
    byDay.set(row.day_of_week, list);
  }

  const planMealIdsToRemove: string[] = [];
  const missingMeals: { dayOfWeek: number; slot: NutritionMealSlot }[] = [];

  for (let day = 0; day <= 6; day += 1) {
    const dayMeals = byDay.get(day) || [];
    const keeperIds = new Set<string>();
    const slotToMeals = new Map<NutritionMealSlot, { id: string; meal_slot: NutritionMealSlot }[]>();

    for (const meal of dayMeals) {
      const list = slotToMeals.get(meal.meal_slot) || [];
      list.push({ id: meal.id, meal_slot: meal.meal_slot });
      slotToMeals.set(meal.meal_slot, list);
    }

    for (const slot of slots) {
      const matchingMeals = slotToMeals.get(slot) || [];
      if (matchingMeals.length) {
        keeperIds.add(matchingMeals[0].id);
      } else {
        missingMeals.push({ dayOfWeek: day, slot });
      }
    }

    const removals = dayMeals.filter((meal) => !keeperIds.has(meal.id));
    for (const meal of removals) {
      planMealIdsToRemove.push(meal.id);
    }
  }

  if (planMealIdsToRemove.length) {
    await removeNutritionMealsBatch(planMealIdsToRemove);
  }

  if (missingMeals.length) {
    await createDefaultNutritionMealsBatch(planId, missingMeals, targets);
  }
}

export async function updateManualNutritionPlan(
  userId: string,
  input: NutritionPlanEditInput,
): Promise<void> {
  const slots = getSlotsForMealsPerDay(input.meals_per_day);

  const { data: activePlan, error: planError } = await db
    .from('user_nutrition_plans')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (planError || !activePlan) {
    throw new Error(planError?.message || 'No active nutrition plan found');
  }

  const { error: updatePlanError } = await db
    .from('user_nutrition_plans')
    .update({
      name: input.name,
      description: input.description,
      meal_structure: { slots },
      dietary_preferences: {
        preference: input.dietary_preference,
        allergies: input.allergies_exclusions,
        refused_foods: input.refused_foods,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', activePlan.id)
    .eq('user_id', userId);

  if (updatePlanError) {
    throw new Error(updatePlanError.message || 'Failed to update nutrition plan');
  }

  await upsertOnboardingAnswers(userId, {
    meals_per_day: input.meals_per_day,
    dietary_preference: input.dietary_preference,
    allergies_exclusions: input.allergies_exclusions,
    refused_foods: input.refused_foods,
  }, true);

  await enforceNutritionMealStructure(userId, activePlan.id, slots);
}
