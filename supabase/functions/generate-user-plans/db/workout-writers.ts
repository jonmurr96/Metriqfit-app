// Workout-plan DB writers / loaders extracted from index.ts
// during Phase 0.5 monolith split (zero behavior change).
//
// Function bodies are byte-for-byte preserved; only `function` becomes `export function`.
// Types/constants are re-imported from index.ts (temporary partial cycle is intentional
// and will be resolved in Phase 1).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  auditDayExerciseMappings,
  remediateDayExerciseMappings,
} from "../../../../lib/workout/programMappingEngine.ts";
import {
  buildWeeklyLayout,
  type WeeklyLayoutAssignment,
} from "../../../../lib/workout/program-catalog.ts";
import { publicExerciseNameCandidates } from "../../../../lib/workout/v1-public-exercise-aliases.ts";
import type {
  UserContext,
  ActivationMode,
} from "../index.ts";
import {
  WORKOUT_PREVIEW_NAME_PREFIX,
  WorkoutGenerationValidationError,
  collectDayPolicyValidation,
} from "../index.ts";
import { dbTechniqueTypeForExercise } from "../helpers/response.ts";
import {
  clamp,
  formatDate,
  getErrorMessage,
  isMissingColumnError,
  startOfWeek,
} from "../helpers/scalars.ts";

export async function storeV1WorkoutPlan(
  supabase: SupabaseClient,
  userId: string,
  runId: string,
  context: any,
  v1Plan: any,
  horizonDays: number,
  config: any,
) {
  const warnings: string[] = [];

  const { data: maxVersionData } = await supabase
    .from("user_workout_plans")
    .select("version")
    .eq("user_id", userId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (maxVersionData?.version || 0) + 1;

  const workoutPlan = await insertWorkoutPlanWithFallback(supabase, {
    user_id: userId,
    generation_run_id: runId,
    version,
    is_active: false,
    lifecycle_state: "preview",
    replaces_plan_id: config.currentPlanContext?.planId || null,
    source_model: "v1_architect",
    program_template_v2_id: null,
    program_family_key: v1Plan.family_id,
    progression_model: context.onboarding.progression_preference || null,
    training_style_tags: [],
    goal_tags: [],
    weekly_layout_json: null,
    name: `${config.activationMode === "preview" ? WORKOUT_PREVIEW_NAME_PREFIX : ""}MetriqFit V1 Architect Plan`,
    description: "Personalized plan generated using the new V1 Architect and Librarian Engine.",
    start_date: formatDate(new Date()),
    total_weeks: Math.max(4, Math.ceil(horizonDays / 7)),
    days_per_week: v1Plan.days.filter((d: any) => d.day_type !== 'Recovery' && d.day_type !== 'Conditioning').length,
  });

  const planId = workoutPlan.id;
  let scheduleCount = 0;
  const dayRecords: Array<{ id: string; day_type: string }> = [];

  // Resolve V1 exercise names → public.exercises UUIDs (required by FK constraint).
  // coreExercises use string external_ids; public.exercises uses UUIDs. Bridge by name.
  const allExerciseNames: string[] = [...new Set<string>(
    v1Plan.days.flatMap((d: any) =>
      d.exercises.map((ex: any) => ex.name as string)
    )
  )];
  const publicExerciseNameLookupCandidates = [...new Set(allExerciseNames.flatMap(publicExerciseNameCandidates))];
  const { data: pubExercises, error: exerciseLookupError } = await supabase
    .from("exercises")
    .select("id, name")
    .in("name", publicExerciseNameLookupCandidates);
  if (exerciseLookupError) {
    throw new Error(`V1 exercise name lookup failed: ${exerciseLookupError.message}`);
  }
  const exerciseIdByName: Record<string, string> = {};
  for (const ex of (pubExercises || [])) {
    if (!exerciseIdByName[ex.name]) exerciseIdByName[ex.name] = ex.id; // first match wins on duplicates
  }
  const resolvePublicExerciseId = (v1Name: string) => {
    for (const candidate of publicExerciseNameCandidates(v1Name)) {
      const id = exerciseIdByName[candidate];
      if (id) return id;
    }
    return null;
  };

  for (const day of v1Plan.days) {
    if (day.day_type === 'Recovery') continue;
    const dayFocus = day.cardio_note ? `${day.day_type} + ${day.cardio_note}` : day.day_type;

    const dayInsert = await insertWorkoutPlanDayWithFallback(supabase, {
      plan_id: planId,
      day_number: day.day_number,
      name: day.day_type,
      focus: dayFocus,
      day_type: day.day_type || "workout",
      estimated_duration_min: Math.max(30, Math.floor(day.exercises.reduce((acc: number, ex: any) => acc + (ex.estimated_duration_seconds / 60), 0))),
    });

    dayRecords.push({ id: dayInsert.id, day_type: day.day_type });

    if (day.exercises.length > 0) {
      scheduleCount++;
      const { data: blockInsert, error: blockError } = await supabase
        .from("user_workout_plan_blocks")
        .insert({
          plan_day_id: dayInsert.id,
          order_index: 1,
          block_type: "normal",
          title: "Main Workout",
          config_json: {},
        })
        .select("id")
        .single();

      if (blockError || !blockInsert) {
        throw new Error(`Failed to create workout block: ${blockError?.message || "unknown"}`);
      }

      for (const [exerciseIndex, exercise] of day.exercises.entries()) {
        const publicExerciseId = resolvePublicExerciseId(exercise.name);
        if (!publicExerciseId) {
          warnings.push(`V1 exercise "${exercise.name}" (${exercise.external_id}) not found in public.exercises — skipped`);
          continue;
        }
        const v1RepsMin = clamp(Number(exercise.reps_min || 8), 1, 100);
        const v1RepsMax = clamp(Number(exercise.reps_max || Math.max(10, v1RepsMin)), v1RepsMin, 100);
        const v1SetsTarget = clamp(Number(exercise.sets || 3), 1, 20);
        const v1RestSeconds = clamp(Number(exercise.rest_seconds || 90), 20, 300);
        const techniqueType = dbTechniqueTypeForExercise(exercise);
        const techniqueNotes = exercise.technique_notes ? ` Technique: ${exercise.technique_notes}` : "";
        const { error: exerciseError } = await supabase
          .from("user_workout_plan_exercises")
          .insert({
            plan_day_id: dayInsert.id,
            block_id: blockInsert.id,
            exercise_id: publicExerciseId,
            order_index: exerciseIndex + 1,
            sets_target: v1SetsTarget,
            reps_min: v1RepsMin,
            reps_max: v1RepsMax,
            rest_seconds: v1RestSeconds,
            technique_type: techniqueType,
            technique_config_json: exercise.technique_config_json || {},
            user_notes: `Progression: ${exercise.progression_model}.${techniqueNotes}`,
          });

        if (exerciseError) {
          throw new Error(`Failed to insert exercise ${exercise.external_id}: ${exerciseError.message}`);
        }
      }
    }
  }

  // Seed weekly schedule entries so the frontend can display day-by-day workout schedule.
  // V2 paths do this via seedWorkoutScheduleFromLayout; V1 must do the same.
  const weeklyLayout = await seedWorkoutScheduleFromLayout(supabase, {
    planId,
    planDays: dayRecords.map((d) => ({ id: d.id, dayType: d.day_type })),
    daysPerWeek: dayRecords.length,
    preferredDaysOff: context.onboarding.preferred_days_off || [],
    horizonDays,
  });

  await updateWorkoutPlanMetadataWithFallback(supabase, planId, {
    weekly_layout_json: weeklyLayout,
  });

  await syncLegacyPlanDayScheduledDates(supabase, dayRecords, weeklyLayout);

  return { planId, plan: v1Plan, warnings, scheduleCount };
}

export async function deleteWorkoutPlanTree(supabase: SupabaseClient, planId: string) {
  const { error } = await supabase
    .from("user_workout_plans")
    .delete()
    .eq("id", planId);

  if (error) {
    throw new Error(`Failed to discard generated preview: ${error.message}`);
  }
}

export async function loadStoredWorkoutPlanValidationData(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
) {
  const { data, error } = await supabase
    .from("user_workout_plans")
    .select(`
      id,
      user_id,
      days_per_week,
      source_model,
      program_family_key,
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
          exercise:exercises!exercise_id(
            id,
            name,
            category,
            equipment_required,
            primary_muscle,
            pattern,
            difficulty
          )
        )
      )
    `)
    .eq("user_id", userId)
    .eq("id", planId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message || "Generated workout plan could not be reloaded for validation.");
  }

  return (data as unknown) as {
    id: string;
    user_id: string;
    days_per_week: number;
    source_model: string | null;
    program_family_key: string | null;
    goal_tags: string[] | null;
    days: Array<{
      id: string;
      day_number: number;
      name: string;
      focus: string | null;
      day_type: string | null;
      exercises: Array<{
        id: string;
        exercise_id: string;
        order_index: number;
        block_id: string | null;
        exercise: UserContext["exercises"][number] | null;
      }>;
    }>;
  };
}

export async function validateStoredWorkoutPlanCoherence(
  supabase: SupabaseClient,
  input: {
    userId: string;
    planId: string;
    exercisePool: UserContext["exercises"];
    templateEquipment?: string[] | null;
    familyKey?: string | null;
    goalTags?: string[] | null;
  },
) {
  const warnings: string[] = [];
  const plan = await loadStoredWorkoutPlanValidationData(supabase, input.userId, input.planId);
  const templateEquipment = input.templateEquipment || [];
  const familyKey = input.familyKey ?? plan.program_family_key ?? null;
  const goalTags = input.goalTags ?? plan.goal_tags ?? [];

  const runAudits = () =>
    (plan.days || [])
      .filter((day) => (day.day_type || "workout") === "workout")
      .map((day) => {
        const rows = (day.exercises || [])
          .filter((row) => !!row.exercise)
          .map((row) => ({
            rowId: row.id,
            exerciseId: row.exercise_id,
            orderIndex: Number(row.order_index || 0),
            blockId: row.block_id || null,
            exercise: row.exercise!,
          }));

        const audit = auditDayExerciseMappings({
          dayId: day.id,
          dayName: day.name,
          dayFocus: day.focus,
          dayIndex: Number(day.day_number || 1),
          daysPerWeek: Number(plan.days_per_week || 0),
          familyKey,
          goalTags,
          templateEquipment,
          rows,
          exercisePool: input.exercisePool,
        });

        return { day, rows, audit };
      });

  const initialAudits = runAudits();

  for (const entry of initialAudits) {
    const validation = collectDayPolicyValidation({
      dayAudit: entry.audit,
      rowCount: entry.rows.length,
    });
    const requiresRepair = entry.audit.hardViolationCount > 0 || validation.failsRatio;

    if (!requiresRepair) {
      continue;
    }

    const remediation = remediateDayExerciseMappings({
      dayId: entry.day.id,
      dayName: entry.day.name,
      dayFocus: entry.day.focus,
      dayIndex: Number(entry.day.day_number || 1),
      daysPerWeek: Number(plan.days_per_week || 0),
      familyKey,
      goalTags,
      templateEquipment,
      rows: entry.rows,
      exercisePool: input.exercisePool,
    });

    if (remediation.unresolvedRows.length > 0) {
      await deleteWorkoutPlanTree(supabase, input.planId);
      throw new WorkoutGenerationValidationError(
        `Workout day "${entry.day.name}" could not be repaired without violating focus rules.`,
        warnings,
      );
    }

    for (const change of remediation.changedRows) {
      const { error } = await supabase
        .from("user_workout_plan_exercises")
        .update({
          exercise_id: change.nextExerciseId,
          user_notes: "Auto-adjusted to maintain workout-day coherence.",
        })
        .eq("id", change.rowId);

      if (error) {
        await deleteWorkoutPlanTree(supabase, input.planId);
        throw new Error(`Failed to apply workout coherence repair: ${error.message}`);
      }
    }

    if (remediation.changedRows.length > 0) {
      warnings.push(`Repaired ${entry.day.name} to match its workout-day focus.`);
      for (const change of remediation.changedRows) {
        const row = entry.day.exercises.find((exercise) => exercise.id === change.rowId);
        if (row) {
          row.exercise_id = change.nextExerciseId;
          row.exercise = input.exercisePool.find((exercise) => exercise.id === change.nextExerciseId) || row.exercise;
        }
      }
    }
  }

  const finalAudits = runAudits();
  for (const entry of finalAudits) {
    const validation = collectDayPolicyValidation({
      dayAudit: entry.audit,
      rowCount: entry.rows.length,
    });
    if (entry.audit.hardViolationCount > 0 || validation.failsRatio) {
      await deleteWorkoutPlanTree(supabase, input.planId);
      throw new WorkoutGenerationValidationError(
        `Workout day "${entry.day.name}" still contains exercises that do not match the day intent.`,
        warnings,
      );
    }
  }

  return {
    warnings,
  };
}

export async function finalizeStoredWorkoutPlanActivation(
  supabase: SupabaseClient,
  input: {
    userId: string;
    planId: string;
    activationMode: ActivationMode;
    currentPlanId?: string | null;
  },
) {
  if (input.activationMode === "preview") {
    await supabase
      .from("user_workout_plans")
      .update({
        is_active: false,
        lifecycle_state: "preview",
        replaces_plan_id: input.currentPlanId || null,
      })
      .eq("id", input.planId)
      .eq("user_id", input.userId);
    return;
  }

  await supabase
    .from("user_workout_plans")
    .update({
      is_active: false,
      lifecycle_state: "archived",
    })
    .eq("user_id", input.userId)
    .eq("is_active", true);

  const { error } = await supabase
    .from("user_workout_plans")
    .update({
      is_active: true,
      lifecycle_state: "live",
      replaces_plan_id: null,
    })
    .eq("id", input.planId)
    .eq("user_id", input.userId);

  if (error) {
    throw new Error(`Failed to activate generated workout plan: ${error.message}`);
  }
}

export async function insertWorkoutPlanWithFallback(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
  dryRun: boolean = false
) {
  if (dryRun) {
    return { id: crypto.randomUUID() };
  }
  const attempts = [
    payload,
    {
      user_id: payload.user_id,
      generation_run_id: payload.generation_run_id,
      template_id: payload.template_id,
      version: payload.version,
      is_active: payload.is_active,
      name: payload.name,
      description: payload.description,
      start_date: payload.start_date,
      total_weeks: payload.total_weeks,
      days_per_week: payload.days_per_week,
    },
  ];

  let lastError: unknown = null;
  for (const attempt of attempts) {
    const { data, error } = await supabase
      .from("user_workout_plans")
      .insert(attempt)
      .select("id")
      .single();

    if (!error && data) {
      return data;
    }

    lastError = error;
  }

  throw new Error(getErrorMessage(lastError) || "Failed to create workout plan");
}

export async function insertWorkoutPlanDayWithFallback(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
  dryRun: boolean = false
) {
  if (dryRun) {
    return { id: crypto.randomUUID() };
  }
  const attempts = [
    payload,
    {
      plan_id: payload.plan_id,
      day_number: payload.day_number,
      name: payload.name,
      focus: payload.focus,
      day_type: payload.day_type,
    },
  ];

  let lastError: unknown = null;
  for (const attempt of attempts) {
    const { data, error } = await supabase
      .from("user_workout_plan_days")
      .insert(attempt)
      .select("id, day_number, name, focus")
      .single();

    if (!error && data) {
      return data;
    }

    lastError = error;
  }

  throw new Error(getErrorMessage(lastError) || "Failed to create workout plan day");
}

export async function updateWorkoutPlanMetadataWithFallback(
  supabase: SupabaseClient,
  planId: string,
  updates: Record<string, unknown>,
) {
  const { error } = await supabase
    .from("user_workout_plans")
    .update(updates)
    .eq("id", planId);

  if (!error) {
    return;
  }

  if (isMissingColumnError(error)) {
    console.warn(
      "[generate-user-plans] Skipping workout plan metadata update because latest columns are unavailable:",
      getErrorMessage(error),
    );
    return;
  }

  throw new Error(getErrorMessage(error) || "Failed to update workout plan metadata");
}

export async function seedWorkoutScheduleFromLayout(
  supabase: SupabaseClient,
  input: {
    planId: string;
    planDays: Array<{ id: string; dayType?: string | null }>;
    daysPerWeek: number;
    preferredDaysOff: string[];
    horizonDays: number;
  },
) {
  const weeklyLayout = buildWeeklyLayout({
    planDays: input.planDays,
    daysPerWeek: input.daysPerWeek,
    preferredDaysOff: input.preferredDaysOff,
  });

  const weekStart = startOfWeek(new Date());
  const layoutByWeekday = new Map(
    weeklyLayout.map((entry) => [entry.weekday, entry]),
  );

  for (let offset = 0; offset < input.horizonDays; offset += 1) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + offset);
    const weekday = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][date.getDay()];
    const entry = layoutByWeekday.get(weekday as WeeklyLayoutAssignment["weekday"]);

    const payload = entry
      ? {
          plan_id: input.planId,
          plan_day_id: entry.planDayId,
          scheduled_date: formatDate(date),
          session_type: entry.sessionType,
          status: "planned",
        }
      : {
          plan_id: input.planId,
          plan_day_id: null,
          scheduled_date: formatDate(date),
          session_type: "rest",
          status: "planned",
        };

    const { error } = await supabase
      .from("user_workout_plan_schedule")
      .insert(payload);

    if (error) {
      throw new Error(`Failed to insert schedule row: ${error.message}`);
    }
  }

  return weeklyLayout;
}

export async function syncLegacyPlanDayScheduledDates(
  supabase: SupabaseClient,
  dayRecords: Array<{ id: string }>,
  weeklyLayout: WeeklyLayoutAssignment[],
) {
  const weekStart = startOfWeek(new Date());
  const weekdayOffset: Record<WeeklyLayoutAssignment["weekday"], number> = {
    mon: 0,
    tue: 1,
    wed: 2,
    thu: 3,
    fri: 4,
    sat: 5,
    sun: 6,
  };

  for (const day of dayRecords) {
    const scheduled = weeklyLayout.find((entry) => entry.planDayId === day.id);
    if (!scheduled) continue;

    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + weekdayOffset[scheduled.weekday]);

    await supabase
      .from("user_workout_plan_days")
      .update({ scheduled_date: formatDate(date) })
      .eq("id", day.id);
  }
}
