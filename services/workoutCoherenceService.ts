import { supabase } from '../lib/supabase';
import {
  auditDayExerciseMappings,
  type DayAuditExerciseViolation,
} from '../lib/workout/programMappingEngine';
import {
  isExerciseAllowedForDayPolicy,
  resolveDayFocusPolicy,
  type ProgramExercise,
  type WorkoutFocusTag,
} from '../lib/workout/programMappingRules';

const db = supabase as any;

export type WorkoutPlanCoherenceViolation = DayAuditExerciseViolation & {
  dayId: string;
  dayName: string;
  dayFocus: string | null;
};

export type WorkoutPlanCoherenceDaySummary = {
  dayId: string;
  dayName: string;
  dayFocus: string | null;
  hardViolationCount: number;
  exerciseCount: number;
  focusTags: WorkoutFocusTag[];
  primaryFocusTags: WorkoutFocusTag[];
  source: 'label' | 'blueprint' | 'auto_derived';
  violationExerciseNames: string[];
};

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

export type WorkoutPlanCoherenceReport = {
  planId: string;
  sourceModel: string | null;
  programFamilyKey: string | null;
  canRepair: boolean;
  checkedDays: number;
  hasHardViolations: boolean;
  violations: WorkoutPlanCoherenceViolation[];
  daySummaries: WorkoutPlanCoherenceDaySummary[];
};

async function loadExercisePool(): Promise<ProgramExercise[]> {
  const { data, error } = await db
    .from('exercises')
    .select('id, external_id, name, category, equipment_required, primary_muscle, pattern, difficulty')
    .limit(5000);

  if (error) {
    throw new Error(error.message || 'Failed to load exercise pool');
  }

  return (data || []) as ProgramExercise[];
}

async function loadTemplateEquipment(programTemplateV2Id?: string | null): Promise<string[]> {
  if (!programTemplateV2Id) return [];

  const { data, error } = await db
    .from('workout_program_templates_v2')
    .select('equipment_required')
    .eq('id', programTemplateV2Id)
    .maybeSingle();

  if (error || !data) {
    return [];
  }

  return data.equipment_required || [];
}

export async function assertExerciseMatchesPlanDayFocus(
  planDayId: string,
  exerciseId: string,
): Promise<void> {
  const [{ data: dayRow, error: dayError }, { data: exerciseRow, error: exerciseError }] = await Promise.all([
    db
      .from('user_workout_plan_days')
      .select(
        `
        id,
        day_number,
        name,
        focus,
        plan:user_workout_plans!plan_id(
          program_family_key,
          days_per_week,
          goal_tags
        )
      `,
      )
      .eq('id', planDayId)
      .maybeSingle(),
    db
      .from('exercises')
      .select('id, external_id, name, category, equipment_required, primary_muscle, pattern, difficulty')
      .eq('id', exerciseId)
      .maybeSingle(),
  ]);

  if (dayError || !dayRow) {
    throw new Error(dayError?.message || 'Workout day not found');
  }

  if (exerciseError || !exerciseRow) {
    throw new Error(exerciseError?.message || 'Exercise not found');
  }

  const policy = resolveDayFocusPolicy({
    dayName: String(dayRow.name || ''),
    dayFocus: dayRow.focus || null,
    familyKey: dayRow.plan?.program_family_key || null,
    dayIndex: Number(dayRow.day_number || 1),
    daysPerWeek: Number(dayRow.plan?.days_per_week || 0),
    goalTags: dayRow.plan?.goal_tags || [],
  });

  if (!isExerciseAllowedForDayPolicy(exerciseRow as ProgramExercise, policy)) {
    throw new Error('Exercise does not match the day focus. Choose a movement aligned with this training day.');
  }
}

export async function getWorkoutPlanCoherenceReport(
  planId: string,
): Promise<WorkoutPlanCoherenceReport> {
  const { data: plan, error: planError } = await db
    .from('user_workout_plans')
    .select(
      `
      id,
      source_model,
      program_family_key,
      program_template_v2_id,
      days_per_week,
      goal_tags,
      days:user_workout_plan_days(
        id,
        day_number,
        name,
        focus,
        day_type,
        exercises:user_workout_plan_exercises(
          id,
          exercise_id,
          order_index,
          block_id,
          exercise:exercises!user_workout_plan_exercises_exercise_id_fkey(
            id,
            external_id,
            name,
            category,
            equipment_required,
            primary_muscle,
            pattern,
            difficulty
          )
        )
      )
    `,
    )
    .eq('id', planId)
    .maybeSingle();

  if (planError || !plan) {
    throw new Error(planError?.message || 'Workout plan not found');
  }

  const [exercisePool, templateEquipment] = await Promise.all([
    loadExercisePool(),
    loadTemplateEquipment(plan.program_template_v2_id || null),
  ]);

  const daySummaries: WorkoutPlanCoherenceDaySummary[] = [];
  const violations: WorkoutPlanCoherenceViolation[] = [];

  for (const day of (plan.days || []).filter((row: any) => (row.day_type || 'workout') === 'workout')) {
    const rows = (day.exercises || [])
      .filter((row: any) => !!row.exercise)
      .map((row: any) => ({
        rowId: row.id,
        exerciseId: row.exercise_id,
        orderIndex: Number(row.order_index || 0),
        blockId: row.block_id || null,
        exercise: row.exercise as ProgramExercise,
      }));

    const audit = auditDayExerciseMappings({
      dayId: day.id,
      dayName: day.name,
      dayFocus: day.focus,
      dayIndex: Number(day.day_number || 1),
      daysPerWeek: Number(plan.days_per_week || 0),
      familyKey: plan.program_family_key || null,
      goalTags: plan.goal_tags || [],
      templateEquipment,
      rows,
      exercisePool,
    });

    daySummaries.push({
      dayId: audit.dayId,
      dayName: audit.dayName,
      dayFocus: audit.dayFocus,
      hardViolationCount: audit.hardViolationCount,
      exerciseCount: audit.exerciseCount,
      focusTags: audit.policy.focusTags,
      primaryFocusTags: audit.policy.primaryFocusTags,
      source: audit.policy.source,
      violationExerciseNames: audit.violations.map((violation) => violation.exerciseName),
    });

    violations.push(
      ...audit.violations.map((violation) => ({
        ...violation,
        dayId: audit.dayId,
        dayName: audit.dayName,
        dayFocus: audit.dayFocus,
      })),
    );
  }

  return {
    planId: plan.id,
    sourceModel: plan.source_model || null,
    programFamilyKey: plan.program_family_key || null,
    canRepair: ['generated', 'v2_template', 'legacy_template'].includes(String(plan.source_model || 'generated')),
    checkedDays: daySummaries.length,
    hasHardViolations: daySummaries.some((day) => day.hardViolationCount > 0),
    violations,
    daySummaries,
  };
}

export async function getPlanFocusCoherenceReport(
  planId: string,
  minRatio = 0.8,
): Promise<PlanFocusCoherenceReport> {
  const report = await getWorkoutPlanCoherenceReport(planId);
  const summaries: PlanDayFocusSummary[] = report.daySummaries.map((day) => {
    const focusedExerciseCount = Math.max(0, day.exerciseCount - day.hardViolationCount);
    const focusRatio = day.exerciseCount > 0 ? focusedExerciseCount / day.exerciseCount : 1;

    return {
      dayId: day.dayId,
      dayName: day.dayName,
      focus: day.dayFocus,
      focusTags: day.focusTags,
      strictExerciseCount: day.exerciseCount,
      focusedExerciseCount,
      focusRatio,
      failingExerciseNames: day.violationExerciseNames,
    };
  });

  return {
    minRatio,
    checkedDays: report.checkedDays,
    summaries,
    violations: summaries.filter((day) => day.strictExerciseCount > 0 && day.focusRatio < minRatio),
  };
}

export async function assertPlanFocusCoherence(planId: string, _minRatio = 0.8): Promise<void> {
  const report = await getWorkoutPlanCoherenceReport(planId);
  if (!report.hasHardViolations) return;

  const firstDay = report.daySummaries.find((day) => day.hardViolationCount > 0);
  throw new Error(
    firstDay
      ? `${firstDay.dayName} contains exercises that do not match the workout day.`
      : 'Workout plan contains exercises that do not match their workout days.',
  );
}
