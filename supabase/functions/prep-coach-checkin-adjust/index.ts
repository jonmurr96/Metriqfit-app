import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Discipline = "bodybuilding" | "powerlifting";
type Phase = "cut" | "bulk";

type TargetSnapshot = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
};

type ProfileRule = {
  minRatePct: number;
  maxRatePct: number;
  tooSlowDelta: number;
  tooFastDelta: number;
  recoveryLowDelta: number;
  proteinPerKg: number;
  fatPct: number;
  workoutSetMultiplier: number;
  workoutSetMultiplierBigThree: number;
};

const PROFILE_RULES: Record<Discipline, Record<Phase, ProfileRule>> = {
  bodybuilding: {
    cut: {
      minRatePct: -0.8,
      maxRatePct: -0.4,
      tooSlowDelta: -120,
      tooFastDelta: 120,
      recoveryLowDelta: 80,
      proteinPerKg: 2.4,
      fatPct: 0.25,
      workoutSetMultiplier: 0.9,
      workoutSetMultiplierBigThree: 0.95,
    },
    bulk: {
      minRatePct: 0.2,
      maxRatePct: 0.5,
      tooSlowDelta: 130,
      tooFastDelta: -100,
      recoveryLowDelta: 40,
      proteinPerKg: 2.0,
      fatPct: 0.28,
      workoutSetMultiplier: 1.08,
      workoutSetMultiplierBigThree: 1.04,
    },
  },
  powerlifting: {
    cut: {
      minRatePct: -0.6,
      maxRatePct: -0.25,
      tooSlowDelta: -90,
      tooFastDelta: 140,
      recoveryLowDelta: 120,
      proteinPerKg: 2.2,
      fatPct: 0.27,
      workoutSetMultiplier: 0.95,
      workoutSetMultiplierBigThree: 1,
    },
    bulk: {
      minRatePct: 0.15,
      maxRatePct: 0.35,
      tooSlowDelta: 100,
      tooFastDelta: -80,
      recoveryLowDelta: 60,
      proteinPerKg: 1.9,
      fatPct: 0.30,
      workoutSetMultiplier: 1,
      workoutSetMultiplierBigThree: 1.03,
    },
  },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number) {
  return Math.round(value);
}

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mapGoalTypeToPhase(goalType: string | null): Phase | null {
  if (!goalType) return null;
  if (goalType === "lose_weight") return "cut";
  if (goalType === "gain_weight") return "bulk";
  return null;
}

function detectDisciplineFromAnswers(answers: Record<string, unknown>): Discipline {
  const explicit = String(answers.prep_discipline || "").toLowerCase();
  if (explicit === "powerlifting") return "powerlifting";
  if (explicit === "bodybuilding") return "bodybuilding";

  const emphasis = String(answers.session_emphasis || "").toLowerCase();
  if (emphasis === "strength") return "powerlifting";
  return "bodybuilding";
}

function parseMeasurementNotes(rawNotes: unknown) {
  if (!rawNotes || typeof rawNotes !== "string") return {};
  try {
    const parsed = JSON.parse(rawNotes);
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
  } catch {
    // Ignore invalid note JSON.
  }
  return {};
}

function isBigThree(exerciseName: string) {
  const name = exerciseName.toLowerCase();
  return name.includes("squat") || name.includes("bench") || name.includes("deadlift");
}

function scaleNumber(value: unknown, ratio: number, minimum = 0) {
  const n = safeNumber(value, 0) * ratio;
  return Math.max(minimum, Math.round(n * 10) / 10);
}

async function cloneAndScaleNutritionPlan(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  ratios: { calories: number; protein: number; carbs: number; fat: number },
) {
  const { data: activePlan, error: activePlanError } = await supabase
    .from("user_nutrition_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .maybeSingle();

  if (activePlanError) throw new Error(activePlanError.message || "Failed to load active nutrition plan");
  if (!activePlan) {
    return {
      fromPlanId: null as string | null,
      toPlanId: null as string | null,
      fromVersion: null as number | null,
      toVersion: null as number | null,
    };
  }

  const { data: maxVersionRow } = await supabase
    .from("user_nutrition_plans")
    .select("version")
    .eq("user_id", userId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = safeNumber(maxVersionRow?.version, safeNumber(activePlan.version, 1)) + 1;

  const nextMacroDistribution = {
    ...(activePlan.macro_distribution as Record<string, unknown> || {}),
    prep_adjusted: true,
    adjusted_at: new Date().toISOString(),
    scale: ratios,
  };

  const { data: newPlan, error: newPlanError } = await supabase
    .from("user_nutrition_plans")
    .insert({
      user_id: activePlan.user_id,
      generation_run_id: activePlan.generation_run_id,
      version: nextVersion,
      is_active: false,
      name: activePlan.name,
      description: activePlan.description,
      meal_structure: activePlan.meal_structure,
      macro_distribution: nextMacroDistribution,
      dietary_preferences: activePlan.dietary_preferences,
    })
    .select("*")
    .single();

  if (newPlanError || !newPlan) {
    throw new Error(newPlanError?.message || "Failed to create adjusted nutrition plan");
  }

  const { data: mealRows, error: mealError } = await supabase
    .from("user_nutrition_plan_meals")
    .select("*")
    .eq("plan_id", activePlan.id);

  if (mealError) throw new Error(mealError.message || "Failed to load nutrition meals");

  const mealMap = new Map<string, string>();
  const selectedVariantSourceByMeal = new Map<string, string | null>();

  for (const meal of mealRows || []) {
    const { data: insertedMeal, error: insertMealError } = await supabase
      .from("user_nutrition_plan_meals")
      .insert({
        plan_id: newPlan.id,
        meal_slot: meal.meal_slot,
        day_of_week: meal.day_of_week,
        name: meal.name,
        description: meal.description,
        target_calories: scaleNumber(meal.target_calories, ratios.calories, 0),
        target_protein: scaleNumber(meal.target_protein, ratios.protein, 0),
        target_carbs: scaleNumber(meal.target_carbs, ratios.carbs, 0),
        target_fat: scaleNumber(meal.target_fat, ratios.fat, 0),
        recipe_url: meal.recipe_url,
        prep_time_min: meal.prep_time_min,
        is_user_modified: meal.is_user_modified,
        selected_variant_id: null,
      })
      .select("id")
      .single();

    if (insertMealError || !insertedMeal) {
      throw new Error(insertMealError?.message || "Failed to clone nutrition meal");
    }

    mealMap.set(meal.id, insertedMeal.id);
    selectedVariantSourceByMeal.set(meal.id, meal.selected_variant_id);
  }

  const oldMealIds = Array.from(mealMap.keys());
  if (!oldMealIds.length) {
    await supabase.from("user_nutrition_plans").update({ is_active: false }).eq("id", activePlan.id);
    await supabase.from("user_nutrition_plans").update({ is_active: true }).eq("id", newPlan.id);
    return {
      fromPlanId: activePlan.id,
      toPlanId: newPlan.id,
      fromVersion: safeNumber(activePlan.version, 1),
      toVersion: nextVersion,
    };
  }

  const { data: variantRows, error: variantError } = await supabase
    .from("user_nutrition_plan_meal_variants")
    .select("*")
    .in("plan_meal_id", oldMealIds);

  if (variantError) throw new Error(variantError.message || "Failed to load meal variants");

  const variantMap = new Map<string, string>();
  const variantTargetMealMap = new Map<string, string>();

  for (const variant of variantRows || []) {
    const mappedMealId = mealMap.get(variant.plan_meal_id);
    if (!mappedMealId) continue;

    const { data: insertedVariant, error: insertVariantError } = await supabase
      .from("user_nutrition_plan_meal_variants")
      .insert({
        plan_meal_id: mappedMealId,
        variant_type: variant.variant_type,
        name: variant.name,
        description: variant.description,
        target_calories: scaleNumber(variant.target_calories, ratios.calories, 0),
        target_protein: scaleNumber(variant.target_protein, ratios.protein, 0),
        target_carbs: scaleNumber(variant.target_carbs, ratios.carbs, 0),
        target_fat: scaleNumber(variant.target_fat, ratios.fat, 0),
        prep_time_min: variant.prep_time_min,
        source: variant.source,
        is_active: variant.is_active,
      })
      .select("id")
      .single();

    if (insertVariantError || !insertedVariant) {
      throw new Error(insertVariantError?.message || "Failed to clone meal variant");
    }

    variantMap.set(variant.id, insertedVariant.id);
    variantTargetMealMap.set(variant.id, mappedMealId);
  }

  const oldVariantIds = Array.from(variantMap.keys());
  if (oldVariantIds.length) {
    const { data: itemRows, error: itemError } = await supabase
      .from("user_nutrition_plan_meal_variant_items")
      .select("*")
      .in("variant_id", oldVariantIds);

    if (itemError) throw new Error(itemError.message || "Failed to load variant items");

    const itemPayload = (itemRows || []).map((item) => ({
      variant_id: variantMap.get(item.variant_id),
      food_item_id: item.food_item_id,
      item_name: item.item_name,
      quantity_value: scaleNumber(item.quantity_value, ratios.calories, 0),
      quantity_unit: item.quantity_unit,
      grams: scaleNumber(item.grams, ratios.calories, 0),
      calories: scaleNumber(item.calories, ratios.calories, 0),
      protein: scaleNumber(item.protein, ratios.protein, 0),
      carbs: scaleNumber(item.carbs, ratios.carbs, 0),
      fat: scaleNumber(item.fat, ratios.fat, 0),
      fiber: scaleNumber(item.fiber, ratios.carbs, 0),
      order_index: item.order_index,
    })).filter((item) => !!item.variant_id);

    if (itemPayload.length) {
      const { error: insertItemsError } = await supabase
        .from("user_nutrition_plan_meal_variant_items")
        .insert(itemPayload as any[]);
      if (insertItemsError) throw new Error(insertItemsError.message || "Failed to clone variant items");
    }
  }

  for (const [sourceMealId, selectedVariantId] of selectedVariantSourceByMeal.entries()) {
    const targetMealId = mealMap.get(sourceMealId);
    if (!targetMealId || !selectedVariantId) continue;
    const mappedSelected = variantMap.get(selectedVariantId);
    if (!mappedSelected) continue;

    const { error: updateSelectedError } = await supabase
      .from("user_nutrition_plan_meals")
      .update({ selected_variant_id: mappedSelected })
      .eq("id", targetMealId);

    if (updateSelectedError) throw new Error(updateSelectedError.message || "Failed to restore selected meal variant");
  }

  const { error: deactivateError } = await supabase
    .from("user_nutrition_plans")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);
  if (deactivateError) throw new Error(deactivateError.message || "Failed to deactivate current nutrition plan");

  const { error: activateError } = await supabase
    .from("user_nutrition_plans")
    .update({ is_active: true })
    .eq("id", newPlan.id);
  if (activateError) throw new Error(activateError.message || "Failed to activate adjusted nutrition plan");

  return {
    fromPlanId: activePlan.id,
    toPlanId: newPlan.id,
    fromVersion: safeNumber(activePlan.version, 1),
    toVersion: nextVersion,
  };
}

async function applyWorkoutAdjustments(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  discipline: Discipline,
  phase: Phase,
) {
  const { data: activeWorkoutPlan, error: activePlanError } = await supabase
    .from("user_workout_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .maybeSingle();

  if (activePlanError) throw new Error(activePlanError.message || "Failed to load active workout plan");
  if (!activeWorkoutPlan) return { recommendationIds: [] as string[], changedExerciseCount: 0 };

  const rule = PROFILE_RULES[discipline][phase];

  const { data: days, error: daysError } = await supabase
    .from("user_workout_plan_days")
    .select("id")
    .eq("plan_id", activeWorkoutPlan.id);
  if (daysError) throw new Error(daysError.message || "Failed to load workout plan days");

  const dayIds = (days || []).map((row) => row.id);
  if (!dayIds.length) return { recommendationIds: [] as string[], changedExerciseCount: 0 };

  const { data: exercises, error: exerciseError } = await supabase
    .from("user_workout_plan_exercises")
    .select("id, sets_target, user_notes, exercise:exercises!exercise_id(name)")
    .in("plan_day_id", dayIds);

  if (exerciseError) throw new Error(exerciseError.message || "Failed to load workout exercises");

  let changedExerciseCount = 0;
  for (const exercise of exercises || []) {
    const name = String((exercise as any).exercise?.name || "");
    const multiplier = isBigThree(name)
      ? rule.workoutSetMultiplierBigThree
      : rule.workoutSetMultiplier;

    if (Math.abs(multiplier - 1) < 0.0001) continue;

    const currentSets = safeNumber((exercise as any).sets_target, 3);
    const nextSets = clamp(Math.round(currentSets * multiplier), 1, 8);
    if (nextSets === currentSets) continue;

    const note = `[Prep Coach ${phase}] ${discipline} profile auto-adjustment`;
    const currentNotes = String((exercise as any).user_notes || "");
    const nextNotes = currentNotes.includes(note) ? currentNotes : `${currentNotes}\n${note}`.trim();

    const { error: updateError } = await supabase
      .from("user_workout_plan_exercises")
      .update({
        sets_target: nextSets,
        user_notes: nextNotes,
        is_user_modified: true,
      })
      .eq("id", (exercise as any).id);

    if (updateError) throw new Error(updateError.message || "Failed to apply workout set adjustment");
    changedExerciseCount += 1;
  }

  const payload = {
    discipline,
    phase,
    changed_exercise_count: changedExerciseCount,
    rule: {
      set_multiplier: rule.workoutSetMultiplier,
      set_multiplier_big_three: rule.workoutSetMultiplierBigThree,
    },
  };

  const { data: recommendationRow, error: recommendationError } = await supabase
    .from("workout_adaptation_recommendations")
    .insert({
      user_id: userId,
      plan_id: activeWorkoutPlan.id,
      recommendation_type: "prep_coach_auto_adjustment",
      payload_json: payload,
      rationale: `Applied ${discipline} ${phase} profile workout adjustments.`,
      status: "accepted",
      resolved_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (recommendationError || !recommendationRow) {
    throw new Error(recommendationError?.message || "Failed to record workout adaptation recommendation");
  }

  const { error: eventError } = await supabase
    .from("workout_adaptation_events")
    .insert({
      user_id: userId,
      plan_id: activeWorkoutPlan.id,
      event_type: "prep_coach_auto_adjustment_applied",
      metrics_json: {
        changed_exercise_count: changedExerciseCount,
      },
      recommended_changes_json: payload,
      status: "applied",
      applied_at: new Date().toISOString(),
    });
  if (eventError) throw new Error(eventError.message || "Failed to record workout adaptation event");

  return {
    recommendationIds: [recommendationRow.id],
    changedExerciseCount,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Use POST" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ success: false, error: "Missing Supabase config" }, 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader) return jsonResponse({ success: false, error: "Missing authorization header" }, 401);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  const body = await req.json().catch(() => ({})) as {
    measurementId?: string;
    dryRun?: boolean;
    source?: "weekly_check_in";
  };

  const measurementId = String(body.measurementId || "").trim();
  const dryRun = Boolean(body.dryRun);
  const source = body.source || "weekly_check_in";

  if (!measurementId) {
    return jsonResponse({ success: false, error: "measurementId is required" }, 400);
  }
  if (source !== "weekly_check_in") {
    return jsonResponse({ success: false, error: "Unsupported source" }, 400);
  }

  const userId = authData.user.id;

  const [
    measurementResult,
    onboardingResult,
    targetsResult,
    subscriptionResult,
  ] = await Promise.all([
    supabase
      .from("user_measurements")
      .select("id, weight_kg, logged_at, notes")
      .eq("id", measurementId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("onboarding_answers")
      .select("answers")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("user_targets")
      .select("calories, protein_g, carbs_g, fat_g, water_ml")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("subscriptions")
      .select("plan_type, status, expires_at, trial_ends_at")
      .eq("user_id", userId)
      .in("status", ["active", "trial", "grace_period"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (measurementResult.error || !measurementResult.data) {
    return jsonResponse({ success: false, error: measurementResult.error?.message || "Measurement not found" }, 404);
  }
  if (targetsResult.error || !targetsResult.data) {
    return jsonResponse({ success: false, error: targetsResult.error?.message || "Targets not found" }, 404);
  }

  const onboardingAnswers = (onboardingResult.data?.answers || {}) as Record<string, unknown>;
  const prepModeEnabled = onboardingAnswers.prep_mode_enabled === true;
  const discipline = detectDisciplineFromAnswers(onboardingAnswers);
  const phase = (String(onboardingAnswers.prep_phase || "").toLowerCase() as Phase) || mapGoalTypeToPhase(String(onboardingAnswers.goal_type || "")) || "cut";
  const explicitAutoAdjust = onboardingAnswers.prep_auto_adjust_enabled === true;

  const now = Date.now();
  const subscription = subscriptionResult.data;
  const isElite = !!subscription
    && ["elite_monthly", "elite_annual", "elite_lifetime"].includes(subscription.plan_type)
    && (
      (subscription.status === "active" && (!subscription.expires_at || Date.parse(subscription.expires_at) > now))
      || (subscription.status === "trial" && (!subscription.trial_ends_at || Date.parse(subscription.trial_ends_at) > now))
      || (subscription.status === "grace_period" && (!subscription.expires_at || Date.parse(subscription.expires_at) > now))
    );

  const autoAdjustEnabled = prepModeEnabled && isElite && explicitAutoAdjust;

  const measurement = measurementResult.data;
  const measurementLoggedAt = String(measurement.logged_at || new Date().toISOString());
  const { data: previousMeasurement } = await supabase
    .from("user_measurements")
    .select("weight_kg, logged_at")
    .eq("user_id", userId)
    .lt("logged_at", measurementLoggedAt)
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const currentWeightKg = safeNumber(measurement.weight_kg, 0);
  const previousWeightKg = previousMeasurement ? safeNumber(previousMeasurement.weight_kg, 0) : 0;
  const weightChangePct = previousWeightKg > 0
    ? ((currentWeightKg - previousWeightKg) / previousWeightKg) * 100
    : 0;

  const notes = parseMeasurementNotes(measurement.notes);
  const recoveryScore = safeNumber((notes as Record<string, unknown>).recoveryScore, 0);
  const rule = PROFILE_RULES[discipline][phase];

  let calorieDelta = 0;
  if (previousWeightKg > 0) {
    if (weightChangePct > rule.maxRatePct) calorieDelta += rule.tooSlowDelta;
    if (weightChangePct < rule.minRatePct) calorieDelta += rule.tooFastDelta;
  }
  if (recoveryScore > 0 && recoveryScore < 45) calorieDelta += rule.recoveryLowDelta;

  const beforeTargets: TargetSnapshot = {
    calories: safeNumber(targetsResult.data.calories, 0),
    protein_g: safeNumber(targetsResult.data.protein_g, 0),
    carbs_g: safeNumber(targetsResult.data.carbs_g, 0),
    fat_g: safeNumber(targetsResult.data.fat_g, 0),
    water_ml: safeNumber(targetsResult.data.water_ml, 0),
  };

  const nextCalories = clamp(round(beforeTargets.calories + calorieDelta), 1200, 8000);
  const nextProtein = clamp(round(currentWeightKg * rule.proteinPerKg), 80, 400);
  const nextFat = clamp(round((nextCalories * rule.fatPct) / 9), 30, 220);
  const nextCarbs = clamp(round((nextCalories - (nextProtein * 4 + nextFat * 9)) / 4), 30, 700);

  const afterTargets: TargetSnapshot = {
    calories: nextCalories,
    protein_g: nextProtein,
    carbs_g: nextCarbs,
    fat_g: nextFat,
    water_ml: beforeTargets.water_ml,
  };

  const targetDelta = {
    calories: afterTargets.calories - beforeTargets.calories,
    protein_g: afterTargets.protein_g - beforeTargets.protein_g,
    carbs_g: afterTargets.carbs_g - beforeTargets.carbs_g,
    fat_g: afterTargets.fat_g - beforeTargets.fat_g,
    water_ml: afterTargets.water_ml - beforeTargets.water_ml,
  };

  const coachSummary = [
    `${discipline} ${phase} profile`,
    previousWeightKg > 0
      ? `weekly rate ${weightChangePct.toFixed(2)}% (target ${rule.minRatePct}% to ${rule.maxRatePct}%)`
      : "first prep check-in baseline",
    `calorie delta ${targetDelta.calories >= 0 ? "+" : ""}${targetDelta.calories}`,
  ].join(" | ");

  let nutritionClone = {
    fromPlanId: null as string | null,
    toPlanId: null as string | null,
    fromVersion: null as number | null,
    toVersion: null as number | null,
  };
  let workoutAdjustmentsApplied: string[] = [];
  let eventId: string | null = null;

  if (!dryRun && prepModeEnabled && autoAdjustEnabled) {
    try {
      const ratios = {
        calories: beforeTargets.calories > 0 ? afterTargets.calories / beforeTargets.calories : 1,
        protein: beforeTargets.protein_g > 0 ? afterTargets.protein_g / beforeTargets.protein_g : 1,
        carbs: beforeTargets.carbs_g > 0 ? afterTargets.carbs_g / beforeTargets.carbs_g : 1,
        fat: beforeTargets.fat_g > 0 ? afterTargets.fat_g / beforeTargets.fat_g : 1,
      };

      // Ensure one active cycle with current prep parameters.
      const { data: currentCycle } = await supabase
        .from("prep_coach_cycles")
        .select("id, discipline, phase")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .maybeSingle();

      let cycleId = currentCycle?.id || null;
      if (currentCycle && (currentCycle.discipline !== discipline || currentCycle.phase !== phase)) {
        await supabase
          .from("prep_coach_cycles")
          .update({ is_active: false, ended_at: new Date().toISOString() })
          .eq("id", currentCycle.id);
        cycleId = null;
      }

      if (!cycleId) {
        const { data: insertedCycle, error: insertCycleError } = await supabase
          .from("prep_coach_cycles")
          .insert({
            user_id: userId,
            is_active: true,
            discipline,
            phase,
            auto_adjust_enabled: true,
            source_onboarding_snapshot: onboardingAnswers,
          })
          .select("id")
          .single();
        if (insertCycleError || !insertedCycle) {
          throw new Error(insertCycleError?.message || "Failed to initialize prep cycle");
        }
        cycleId = insertedCycle.id;
      }

      const { error: targetUpdateError } = await supabase
        .from("user_targets")
        .update({
          calories: afterTargets.calories,
          protein_g: afterTargets.protein_g,
          carbs_g: afterTargets.carbs_g,
          fat_g: afterTargets.fat_g,
          water_ml: afterTargets.water_ml,
          computation_method: "prep_coach_v1",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      if (targetUpdateError) throw new Error(targetUpdateError.message || "Failed to apply prep target update");

      nutritionClone = await cloneAndScaleNutritionPlan(supabase, userId, ratios);

      const workoutAdjustmentResult = await applyWorkoutAdjustments(
        supabase,
        userId,
        discipline,
        phase,
      );
      workoutAdjustmentsApplied = workoutAdjustmentResult.recommendationIds;

      const { data: event, error: eventError } = await supabase
        .from("prep_coach_adjustment_events")
        .insert({
          user_id: userId,
          cycle_id: cycleId,
          measurement_id: measurementId,
          source,
          before_target_snapshot: beforeTargets,
          after_target_snapshot: afterTargets,
          before_nutrition_plan_id: nutritionClone.fromPlanId,
          after_nutrition_plan_id: nutritionClone.toPlanId,
          before_nutrition_plan_version: nutritionClone.fromVersion,
          after_nutrition_plan_version: nutritionClone.toVersion,
          applied_workout_adjustment_ids: workoutAdjustmentsApplied,
          coach_summary: coachSummary,
          status: "applied",
          error_payload: null,
        })
        .select("id")
        .single();

      if (eventError || !event) {
        throw new Error(eventError?.message || "Failed to record prep adjustment event");
      }
      eventId = event.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown prep adjustment error";
      const { data: fallbackEvent } = await supabase
        .from("prep_coach_adjustment_events")
        .insert({
          user_id: userId,
          measurement_id: measurementId,
          source,
          before_target_snapshot: beforeTargets,
          after_target_snapshot: afterTargets,
          applied_workout_adjustment_ids: [],
          coach_summary: coachSummary,
          status: "failed",
          error_payload: { message },
        })
        .select("id")
        .single();
      eventId = fallbackEvent?.id || null;

      return jsonResponse({
        success: false,
        applied: false,
        discipline,
        phase,
        targetDelta,
        nutritionPlanVersionFrom: nutritionClone.fromVersion,
        nutritionPlanVersionTo: nutritionClone.toVersion,
        workoutAdjustmentsApplied: [],
        coachSummary,
        eventId,
        error: message,
      }, 500);
    }
  } else if (!dryRun && prepModeEnabled && !autoAdjustEnabled) {
    const { data: recommendationEvent } = await supabase
      .from("prep_coach_adjustment_events")
      .insert({
        user_id: userId,
        measurement_id: measurementId,
        source,
        before_target_snapshot: beforeTargets,
        after_target_snapshot: afterTargets,
        applied_workout_adjustment_ids: [],
        coach_summary: coachSummary,
        status: "recommended",
        error_payload: isElite ? { reason: "prep_auto_adjust_disabled" } : { reason: "elite_required" },
      })
      .select("id")
      .single();
    eventId = recommendationEvent?.id || null;
  }

  return jsonResponse({
    success: true,
    applied: !dryRun && prepModeEnabled && autoAdjustEnabled,
    discipline,
    phase,
    prepModeEnabled,
    isElite,
    autoAdjustEnabled,
    targetDelta,
    targetsBefore: beforeTargets,
    targetsAfter: afterTargets,
    nutritionPlanVersionFrom: nutritionClone.fromVersion,
    nutritionPlanVersionTo: nutritionClone.toVersion,
    workoutAdjustmentsApplied,
    coachSummary,
    eventId,
  });
});
