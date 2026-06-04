// Response + render-check helpers, extracted from index.ts during Phase 0.5
// monolith split (zero behavior change).
//
// Self-contained; no I/O, no Supabase client, no domain types. Safe to import
// from any pipeline or DB writer module.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const DB_ALLOWED_TECHNIQUE_TYPES = new Set([
  "tempo",
  "pause_reps",
  "superset",
  "giant_set",
  "drop_set",
  "rest_pause",
  "amrap",
  "warmup_protocol",
  "cluster",
  "cluster_set",
  "failure_set",
  "pyramid_set",
]);

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

export function dbTechniqueTypeForExercise(exercise: any): string | null {
  if (!exercise?.technique_type || exercise.technique_type === "straight_set") {
    return null;
  }

  const techniqueType = String(exercise.technique_type);
  if (!DB_ALLOWED_TECHNIQUE_TYPES.has(techniqueType)) {
    throw new Error(
      `Unsupported technique_type "${techniqueType}" for ${exercise.name || exercise.external_id || "exercise"}`,
    );
  }

  return techniqueType;
}

/**
 * QUALITY GATE: Deep validation of generated plan JSON to ensure UI renderability.
 * Catches "empty shell" plans and structural issues.
 */
export function performRenderCheck(
  data: any,
  requestedDays: number = 0,
): { passed: boolean; details: Record<string, any> } {
  // We'll normalize inputs — data could have workout_days or nested workout_plan
  const details: any = {
    workout: {
      has_plan: !!(data.workout_plan || data.workout_days || data.workoutDays),
      weeks_passed: false,
      exercises_passed: false,
      day_count: 0,
    },
    nutrition: {
      has_plan: !!(data.nutrition_plan || data.nutritionPlan),
      calories_valid: false,
      meals_valid: false,
    },
  };

  if (details.workout.has_plan) {
    const rawWorkout = data.workout_plan || data.workoutPlan;
    const days =
      data.workout_days || data.workoutDays || rawWorkout?.days ||
      rawWorkout?.weeks?.flatMap((w: any) => w.days);

    const isV1 = !!rawWorkout?.family_id;
    details.workout.day_count = days?.length || 0;

    // Check structure — V1 must match the user's requested frequency exactly.
    // V2 snapshots are usually a full 7-day layout.
    details.workout.weeks_passed = isV1
      ? details.workout.day_count === requestedDays // 100% Match for V1
      : details.workout.day_count >= 7;

    // Check for "empty shell" — no exercises in the first workout day
    const firstWorkoutDay = days?.find(
      (d: any) => Array.isArray(d.exercises) && d.exercises.length > 0,
    );
    if (firstWorkoutDay) {
      const firstEx = firstWorkoutDay.exercises[0];
      // Must have sets and either reps or rep_range/reps_min to be renderable
      details.workout.exercises_passed = !!(
        firstEx.sets && (firstEx.reps || firstEx.rep_range || firstEx.reps_min)
      );
    }
  }

  if (details.nutrition.has_plan) {
    const plan = data.nutrition_plan || data.nutritionPlan;
    details.nutrition.calories_valid =
      typeof plan.calories === "number" && plan.calories > 0;
    // Must have meals with actual food items
    details.nutrition.meals_valid =
      Array.isArray(plan.meals) &&
      plan.meals.length > 0 &&
      plan.meals.some(
        (m: any) => Array.isArray(m.items) && m.items.length > 0,
      );
  }

  const passed =
    (details.workout.has_plan
      ? details.workout.weeks_passed && details.workout.exercises_passed
      : true) &&
    (details.nutrition.has_plan
      ? details.nutrition.calories_valid && details.nutrition.meals_valid
      : true);

  return { passed, details };
}
