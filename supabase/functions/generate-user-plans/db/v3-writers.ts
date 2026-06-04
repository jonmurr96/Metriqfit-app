// V3 DB writers — persist the V3 Plan output to the existing
// user_workout_plans / user_nutrition_plans tree.
//
// Contract:
//  - Each write creates a NEW plan version (never overwrites). Old versions
//    stay in lifecycle_state='archived' or remain 'live' inactive — the
//    decision to flip is_active is taken by the caller based on activation
//    mode (see the activate flag).
//  - Writes are tagged source_model='v3_deterministic' and planner_mode is
//    set on the plan_generation_runs row by updateGenerationRunV3.
//  - Exercise / food name lookups are tolerant: a V3 plan that references an
//    exercise/food not present in the live DB will skip that row and emit
//    a warning rather than throw.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import type { Plan, PlanExercise, PlanMeal, PlanMealItem } from "../../../../lib/spec/fillContent.ts";
import type { PlanSpec } from "../../../../lib/spec/PlanSpec.ts";

export interface V3WriteOptions {
  readonly activate: boolean;
}

export interface V3WriteResult {
  readonly workoutPlanId: string;
  readonly nutritionPlanId: string;
  readonly warnings: ReadonlyArray<string>;
}

export async function writeV3Plans(
  supabase: SupabaseClient,
  userId: string,
  runId: string,
  spec: PlanSpec,
  plan: Plan,
  options: V3WriteOptions,
): Promise<V3WriteResult> {
  const warnings: string[] = [];

  if (options.activate) {
    await archiveActiveV3Plans(supabase, userId);
  }

  const workoutPlanId = await writeV3WorkoutPlan(
    supabase, userId, runId, spec, plan, options.activate, warnings,
  );
  const nutritionPlanId = await writeV3NutritionPlan(
    supabase, userId, runId, spec, plan, options.activate, warnings,
  );

  return { workoutPlanId, nutritionPlanId, warnings };
}

// ---------- workout ----------

async function writeV3WorkoutPlan(
  supabase: SupabaseClient,
  userId: string,
  runId: string,
  spec: PlanSpec,
  plan: Plan,
  activate: boolean,
  warnings: string[],
): Promise<string> {
  const version = await nextVersion(supabase, "user_workout_plans", userId);

  const daysPerWeek = plan.workout_weeks[0]?.workout_days.length ?? 0;
  const totalWeeks = plan.workout_weeks.length;

  const { data: planRow, error: planErr } = await supabase
    .from("user_workout_plans")
    .insert({
      user_id: userId,
      generation_run_id: runId,
      version,
      is_active: activate,
      lifecycle_state: activate ? "live" : "preview",
      source_model: "v3_deterministic",
      name: `MetriqFit V3 Plan v${version}`,
      description: "Deterministic V3 plan generated from your onboarding answers.",
      start_date: new Date().toISOString().slice(0, 10),
      total_weeks: totalWeeks,
      days_per_week: daysPerWeek,
      progression_model: spec.workout.progression_model,
      training_style_tags: [],
      goal_tags: [],
    })
    .select("id")
    .single();

  if (planErr || !planRow) {
    throw new Error(`V3 writeWorkoutPlan: ${planErr?.message ?? "insert returned no row"}`);
  }
  const planId: string = planRow.id;

  // Collect every exercise name in the plan and resolve to public.exercises ids in one shot.
  const allExerciseIds = new Set<string>();
  for (const w of plan.workout_weeks) {
    for (const d of w.workout_days) {
      for (const ex of d.exercises) allExerciseIds.add(ex.exercise_id);
    }
  }
  const exerciseIdMap = await resolveExerciseIds(supabase, [...allExerciseIds]);

  // Write each week × day × exercise.
  for (const week of plan.workout_weeks) {
    for (const day of week.workout_days) {
      const dayNumber = (week.week_index - 1) * 7 + weekdayIndex(day.weekday) + 1;

      const { data: dayRow, error: dayErr } = await supabase
        .from("user_workout_plan_days")
        .insert({
          plan_id: planId,
          day_number: dayNumber,
          name: `Week ${week.week_index} ${day.weekday.toUpperCase()}`,
          focus: day.focus,
          day_type: "workout",
          estimated_duration_min: day.estimated_minutes,
        })
        .select("id")
        .single();
      if (dayErr || !dayRow) {
        warnings.push(`V3: failed to write workout_day W${week.week_index}/${day.weekday}: ${dayErr?.message}`);
        continue;
      }
      const dayId: string = dayRow.id;

      for (const ex of day.exercises) {
        const resolved = exerciseIdMap.get(ex.exercise_id);
        if (!resolved) {
          warnings.push(`V3: exercise "${ex.exercise_name}" (${ex.exercise_id}) not in public.exercises — skipped`);
          continue;
        }
        const { error: exErr } = await supabase
          .from("user_workout_plan_exercises")
          .insert(buildExerciseRow(dayId, resolved, ex));
        if (exErr) {
          warnings.push(`V3: failed to write exercise ${ex.exercise_name} W${week.week_index}/${day.weekday}: ${exErr.message}`);
        }
      }
    }
  }

  return planId;
}

function buildExerciseRow(dayId: string, exerciseDbId: string, ex: PlanExercise): Record<string, unknown> {
  const base: Record<string, unknown> = {
    plan_day_id: dayId,
    exercise_id: exerciseDbId,
    order_index: ex.order,
    sets_target: ex.sets,
    rest_seconds: ex.rest_seconds,
    prescription_type: ex.prescription_unit,
    user_notes: ex.tempo ? `tempo: ${ex.tempo}` : null,
  };
  if (ex.prescription_unit === "reps") {
    base.reps_min = ex.reps_min;
    base.reps_max = ex.reps_max;
  } else {
    base.unit_amount_min = ex.unit_min ?? null;
    base.unit_amount_max = ex.unit_max ?? null;
  }
  return base;
}

// ---------- nutrition ----------

async function writeV3NutritionPlan(
  supabase: SupabaseClient,
  userId: string,
  runId: string,
  spec: PlanSpec,
  plan: Plan,
  activate: boolean,
  warnings: string[],
): Promise<string> {
  const version = await nextVersion(supabase, "user_nutrition_plans", userId);

  const { data: planRow, error: planErr } = await supabase
    .from("user_nutrition_plans")
    .insert({
      user_id: userId,
      generation_run_id: runId,
      version,
      is_active: activate,
      lifecycle_state: activate ? "live" : "preview",
      name: `MetriqFit V3 Nutrition v${version}`,
      description: "Deterministic V3 nutrition plan with carb cycling.",
      meal_structure: {
        meals_per_day: spec.nutrition.meals_per_day,
        training_day_slots: spec.nutrition.training_day.slots,
        rest_day_slots: spec.nutrition.rest_day.slots,
      },
      macro_distribution: {
        training_day: {
          kcal: spec.nutrition.training_day.kcal,
          protein_g: spec.nutrition.training_day.protein_g,
          carbs_g: spec.nutrition.training_day.carbs_g,
          fat_g: spec.nutrition.training_day.fat_g,
        },
        rest_day: {
          kcal: spec.nutrition.rest_day.kcal,
          protein_g: spec.nutrition.rest_day.protein_g,
          carbs_g: spec.nutrition.rest_day.carbs_g,
          fat_g: spec.nutrition.rest_day.fat_g,
        },
      },
      dietary_preferences: {
        hard_exclude_tags: spec.nutrition.hard_exclude_tags,
        weekly_food_minimums: spec.nutrition.weekly_food_minimums,
      },
    })
    .select("id")
    .single();

  if (planErr || !planRow) {
    throw new Error(`V3 writeNutritionPlan: ${planErr?.message ?? "insert returned no row"}`);
  }
  const planId: string = planRow.id;

  // Resolve all food ids referenced in the plan in one shot.
  const allFoodIds = new Set<string>();
  for (const d of plan.nutrition_days) {
    for (const m of d.meals) {
      for (const it of m.items) allFoodIds.add(it.food_id);
      for (const v of m.variants) for (const it of v.items) allFoodIds.add(it.food_id);
    }
  }
  const foodIdMap = await resolveFoodIds(supabase, [...allFoodIds]);

  for (const day of plan.nutrition_days) {
    const dayOfWeek = weekdayIndex(day.weekday); // 0..6 to match existing data
    for (const meal of day.meals) {
      const { data: mealRow, error: mealErr } = await supabase
        .from("user_nutrition_plan_meals")
        .insert({
          plan_id: planId,
          day_of_week: dayOfWeek,
          meal_slot: dbMealSlot(meal.slot),
          name: `${meal.slot} (${day.is_training_day ? "training" : "rest"})`,
          target_calories: meal.target_kcal,
          target_protein: meal.target_protein_g,
          target_carbs: meal.target_carb_g,
          target_fat: meal.target_fat_g,
        })
        .select("id")
        .single();
      if (mealErr || !mealRow) {
        warnings.push(`V3: failed to write meal ${day.weekday}/${meal.slot}: ${mealErr?.message}`);
        continue;
      }
      const mealId: string = mealRow.id;

      // Primary serving — stored as a "primary" variant since the schema has no
      // separate user_nutrition_plan_meal_items table; all items live under
      // user_nutrition_plan_meal_variant_items keyed by variant_id.
      await writeVariant(supabase, mealId, "primary", "Primary serving", 0, meal.items, foodIdMap, warnings, day.weekday, meal.slot);

      // Alternative variants.
      for (const [vIdx, variant] of meal.variants.entries()) {
        await writeVariant(
          supabase, mealId, "alternative",
          variant.name ?? `Alternative ${vIdx + 1}`,
          vIdx + 1, variant.items, foodIdMap, warnings, day.weekday, meal.slot,
        );
      }
    }
  }

  return planId;
}

function dbMealSlot(specSlot: string): string {
  switch (specSlot) {
    case "preworkout": return "pre-workout";
    case "postworkout": return "post-workout";
    case "morning_snack":
    case "afternoon_snack":
    case "midday_snack":
      return "snack";
    case "evening_snack":
      return "evening";
    default: return specSlot;
  }
}

async function writeVariant(
  supabase: SupabaseClient,
  mealId: string,
  variantType: "primary" | "alternative",
  name: string,
  orderIndex: number,
  items: ReadonlyArray<PlanMealItem>,
  foodIdMap: Map<string, string>,
  warnings: string[],
  weekday: string,
  slot: string,
): Promise<void> {
  // Compute totals for the variant row (UI can read these without joining items).
  let kcal = 0, p = 0, c = 0, f = 0;
  for (const it of items) { kcal += it.kcal; p += it.protein_g; c += it.carb_g; f += it.fat_g; }

  const { data: variantRow, error: vErr } = await supabase
    .from("user_nutrition_plan_meal_variants")
    .insert({
      plan_meal_id: mealId,
      variant_type: variantType === "primary" ? "default" : "alternative",
      name,
      target_calories: Math.round(kcal),
      target_protein: Math.round(p * 10) / 10,
      target_carbs: Math.round(c * 10) / 10,
      target_fat: Math.round(f * 10) / 10,
      source: "rule",
      is_active: true,
    })
    .select("id")
    .single();
  if (vErr || !variantRow) {
    warnings.push(`V3: failed to write variant ${variantType}/${weekday}/${slot}: ${vErr?.message}`);
    return;
  }

  for (const [i, item] of items.entries()) {
    const resolved = foodIdMap.get(item.food_id);
    if (!resolved) {
      warnings.push(`V3: food "${item.food_name}" (${item.food_id}) not in food_items — skipped (${weekday}/${slot})`);
      continue;
    }
    const { error } = await supabase.from("user_nutrition_plan_meal_variant_items").insert({
      variant_id: variantRow.id,
      food_item_id: resolved,
      item_name: item.food_name,
      grams: item.grams,
      quantity_value: item.grams,
      quantity_unit: "g",
      calories: Math.round(item.kcal),
      protein: Math.round(item.protein_g * 10) / 10,
      carbs: Math.round(item.carb_g * 10) / 10,
      fat: Math.round(item.fat_g * 10) / 10,
      order_index: i + 1,
    });
    if (error) {
      warnings.push(`V3: failed to write item ${item.food_name} (${weekday}/${slot}): ${error.message}`);
    }
  }
}

// ---------- helpers ----------

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
function weekdayIndex(w: string): number {
  const i = WEEKDAYS.indexOf(w as typeof WEEKDAYS[number]);
  return i < 0 ? 0 : i;
}

async function nextVersion(supabase: SupabaseClient, table: string, userId: string): Promise<number> {
  const { data } = await supabase
    .from(table)
    .select("version")
    .eq("user_id", userId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.version ?? 0) + 1;
}

async function archiveActiveV3Plans(supabase: SupabaseClient, userId: string): Promise<void> {
  await Promise.all([
    supabase.from("user_workout_plans")
      .update({ is_active: false, lifecycle_state: "archived" })
      .eq("user_id", userId).eq("is_active", true),
    supabase.from("user_nutrition_plans")
      .update({ is_active: false, lifecycle_state: "archived" })
      .eq("user_id", userId).eq("is_active", true),
  ]);
}

async function resolveExerciseIds(
  supabase: SupabaseClient,
  ids: ReadonlyArray<string>,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (ids.length === 0) return out;
  // The V3 engine uses the public.exercises.id directly (loadExerciseCatalog
  // maps r.id → ExerciseRow.id), so the resolve step is a presence check:
  // make sure each referenced id still exists.
  const { data } = await supabase
    .from("exercises")
    .select("id")
    .in("id", ids as string[]);
  for (const row of data ?? []) out.set(row.id, row.id);
  return out;
}

async function resolveFoodIds(
  supabase: SupabaseClient,
  ids: ReadonlyArray<string>,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (ids.length === 0) return out;
  const { data } = await supabase
    .from("food_items")
    .select("id")
    .in("id", ids as string[]);
  for (const row of data ?? []) out.set(row.id, row.id);
  return out;
}
