import { supabase } from '../lib/supabase';
import {
  exerciseMatchesWorkoutFocus,
  inferWorkoutFocusTags,
  STRICT_WORKOUT_FOCUS_TAGS,
  type WorkoutFocusTag,
} from '../lib/workout/focusCoherence';

const db = supabase as any;

export type PlanDayFocusSummary = {
  dayId: string;
  dayName: string;
  focus: string | null;
  focusTags: WorkoutFocusTag[];
  strictExerciseCount: number;
  focusedExerciseCount: number;
  focusRatio: number;
  failingExerciseNames: string[];
};

export type PlanFocusCoherenceReport = {
  minRatio: number;
  checkedDays: number;
  violations: PlanDayFocusSummary[];
  summaries: PlanDayFocusSummary[];
};

export async function getPlanDayFocusTags(planDayId: string): Promise<WorkoutFocusTag[]> {
  const { data, error } = await db
    .from('user_workout_plan_days')
    .select('name, focus')
    .eq('id', planDayId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message || 'Workout day not found');
  }

  return inferWorkoutFocusTags(String(data.name || ''), data.focus || null).filter((tag) =>
    STRICT_WORKOUT_FOCUS_TAGS.has(tag),
  );
}

export async function assertExerciseMatchesPlanDayFocus(
  planDayId: string,
  exerciseId: string,
): Promise<void> {
  const [focusTags, exerciseRes] = await Promise.all([
    getPlanDayFocusTags(planDayId),
    db
      .from('exercises')
      .select('id, name, category, primary_muscle, pattern')
      .eq('id', exerciseId)
      .maybeSingle(),
  ]);

  if (exerciseRes.error || !exerciseRes.data) {
    throw new Error(exerciseRes.error?.message || 'Exercise not found');
  }

  if (!focusTags.length) return;

  const matches = exerciseMatchesWorkoutFocus(exerciseRes.data, focusTags);
  if (!matches) {
    throw new Error('Exercise does not match the day focus. Choose a movement aligned with this training day.');
  }
}

export async function getPlanFocusCoherenceReport(
  planId: string,
  minRatio = 0.8,
): Promise<PlanFocusCoherenceReport> {
  const { data, error } = await db
    .from('user_workout_plan_days')
    .select(
      `
      id,
      name,
      focus,
      user_workout_plan_exercises(
        id,
        order_index,
        exercise_id,
        exercise:exercises!user_workout_plan_exercises_exercise_id_fkey(
          id,
          name,
          category,
          primary_muscle,
          pattern
        )
      )
    `,
    )
    .eq('plan_id', planId)
    .order('day_number', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to load workout plan days');
  }

  const summaries: PlanDayFocusSummary[] = (data || []).map((day: any) => {
    const focusTags = inferWorkoutFocusTags(String(day.name || ''), day.focus || null).filter((tag) =>
      STRICT_WORKOUT_FOCUS_TAGS.has(tag),
    );
    const exercises = (day.user_workout_plan_exercises || []) as {
      exercise?: { name?: string | null; category?: string | null; primary_muscle?: string | null; pattern?: string | null } | null;
    }[];

    if (!focusTags.length || exercises.length === 0) {
      return {
        dayId: day.id,
        dayName: day.name || 'Workout Day',
        focus: day.focus || null,
        focusTags,
        strictExerciseCount: 0,
        focusedExerciseCount: 0,
        focusRatio: 1,
        failingExerciseNames: [],
      };
    }

    let focusedExerciseCount = 0;
    const failingExerciseNames: string[] = [];

    for (const row of exercises) {
      const ex = row.exercise || {};
      const isFocused = exerciseMatchesWorkoutFocus(
        {
          name: ex.name || '',
          category: ex.category || '',
          primary_muscle: ex.primary_muscle || '',
          pattern: ex.pattern || '',
        },
        focusTags,
      );
      if (isFocused) {
        focusedExerciseCount += 1;
      } else {
        failingExerciseNames.push(String(ex.name || 'Unknown exercise'));
      }
    }

    const strictExerciseCount = exercises.length;
    const focusRatio = strictExerciseCount > 0 ? focusedExerciseCount / strictExerciseCount : 1;

    return {
      dayId: day.id,
      dayName: day.name || 'Workout Day',
      focus: day.focus || null,
      focusTags,
      strictExerciseCount,
      focusedExerciseCount,
      focusRatio,
      failingExerciseNames,
    };
  });

  const violations = summaries.filter((summary) => summary.strictExerciseCount > 0 && summary.focusRatio < minRatio);

  return {
    minRatio,
    checkedDays: summaries.length,
    violations,
    summaries,
  };
}

export async function assertPlanFocusCoherence(
  planId: string,
  minRatio = 0.8,
): Promise<void> {
  const report = await getPlanFocusCoherenceReport(planId, minRatio);
  if (!report.violations.length) return;

  const first = report.violations[0];
  const pct = Math.round(first.focusRatio * 100);
  throw new Error(
    `${first.dayName} is only ${pct}% focus-aligned (min ${Math.round(minRatio * 100)}%). Adjust the day before publishing.`,
  );
}
