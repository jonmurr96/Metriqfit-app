// User / plan context loaders extracted from index.ts
// during Phase 0.5 monolith split (zero behavior change).
//
// Function bodies are byte-for-byte preserved; only `function` becomes `export function`.
// Types/constants are re-imported from index.ts (temporary partial cycle is intentional
// and will be resolved in Phase 1).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  normalizeWeeklyLayout,
} from "../../../../lib/workout/program-catalog.ts";
import type { WorkoutPlanComparable } from "../../../../lib/workout/plan-regeneration-diff.ts";
import type {
  CurrentNutritionPlanContext,
  CurrentWorkoutPlanContext,
  MealsPerDayChoice,
  OnboardingAnswers,
  UserContext,
} from "../index.ts";
import { inferFoodTags } from "../helpers/food.ts";
import { clamp, formatDate } from "../helpers/scalars.ts";

function normalizeMealsPerDayChoice(value: unknown): MealsPerDayChoice {
  return value === "2" || value === "3" || value === "4" || value === "5_plus" || value === "no_preference"
    ? value
    : "no_preference";
}
import { normalizeNutritionSlots } from "../helpers/nutrition-slots.ts";

export async function fetchUserContext(supabase: SupabaseClient, userId: string): Promise<UserContext> {
  const [profileRes, onboardingRes, targetsRes, exercisesRes, foodsRes] = await Promise.all([
    supabase.from("profiles").select("first_name, sex, unit_system").eq("id", userId).single(),
    supabase.from("onboarding_answers").select("answers").eq("user_id", userId).single(),
    supabase.from("user_targets").select("*").eq("user_id", userId).single(),
    // ORDER BY id for deterministic catalog row order (Phase 4 hardening).
    supabase.from("exercises").select("id, name, category, equipment_required, primary_muscle, pattern, difficulty, popularity_score").order("id").limit(2000),
    supabase.from("food_items").select("id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, category, breakfast_score, lunch_dinner_score, preworkout_score, postworkout_score, evening_score, digestion_speed, fat_load, carb_speed, protein_leanness, formality, goal_form, variety_family").order("id").limit(400),
  ]);

  if (profileRes.error || !profileRes.data) throw new Error(`Profile not found for user ${userId}. The auth trigger may not have created the profiles row. DB: ${profileRes.error?.message || "row missing"}`);
  if (onboardingRes.error || !onboardingRes.data) throw new Error(`Onboarding answers not found for user ${userId}. Please complete onboarding. DB: ${onboardingRes.error?.message || "row missing"}`);
  if (targetsRes.error || !targetsRes.data) throw new Error(`Nutrition targets not found for user ${userId}. Please complete onboarding. DB: ${targetsRes.error?.message || "row missing"}`);

  if (!targetsRes.data?.calories || targetsRes.data.calories <= 0) {
    throw new Error(`Invalid nutrition targets (0 calories). This usually means vital stats were not provided correctly. RETRY_ONBOARDING`);
  }

  if (exercisesRes.error) throw new Error(`Failed to load exercise library: ${exercisesRes.error.message}`);
  if (foodsRes.error) throw new Error(`Failed to load food library: ${foodsRes.error.message}`);

  // Fix 7: Assert minimum library sizes — fewer than 20 records indicates a seed/data problem.
  const exerciseCount = exercisesRes.data?.length ?? 0;
  const foodCount = foodsRes.data?.length ?? 0;
  if (exerciseCount < 20) {
    throw new Error(
      `Exercise library too small: only ${exerciseCount} exercises found (minimum 20 required). Please contact support or check your database seed.`,
    );
  }
  if (foodCount < 20) {
    throw new Error(
      `Food library too small: only ${foodCount} foods found (minimum 20 required). Please contact support or check your database seed.`,
    );
  }

  const answers = (onboardingRes.data.answers || {}) as OnboardingAnswers;

  // Fix 2: Validate required onboarding answer fields before applying defaults.
  // Throw a typed error (statusCode: 400) so the serve handler can return HTTP 400
  // instead of letting it bubble up as a generic 500.
  const requiredAnswerFields: (keyof OnboardingAnswers)[] = [
    "goal_type",
    "experience_level",
    "training_days_per_week",
    "equipment_access",
  ];
  for (const field of requiredAnswerFields) {
    if (answers[field] == null) {
      const err = new Error(`Missing required field: ${field}`);
      (err as any).statusCode = 400;
      (err as any).field = field;
      throw err;
    }
  }

  return {
    profile: {
      first_name: profileRes.data.first_name,
      sex: profileRes.data.sex,
      unit_system: profileRes.data.unit_system || "imperial",
    },
    onboarding: {
      goal_type: answers.goal_type || "general_fitness",
      experience_level: answers.experience_level || "beginner",
      training_days_per_week: clamp(Number(answers.training_days_per_week || 3), 2, 6),
      training_days: Array.isArray(answers.training_days) ? answers.training_days : [],
      preferred_days_off: answers.preferred_days_off || [],
      equipment_access: answers.equipment_access || "full_gym",
      injuries: answers.injuries || [],
      preferred_split_family: answers.preferred_split_family || "no_preference",
      technique_preferences: (answers.technique_preferences || []).filter(Boolean),
      progression_preference: answers.progression_preference || "no_preference",
      session_emphasis: answers.session_emphasis || "no_preference",
      dietary_preference: answers.dietary_preference || "anything",
      allergies_exclusions: answers.allergies_exclusions || [],
      refused_foods: answers.refused_foods || [],
      preferred_proteins: answers.preferred_proteins || [],
      preferred_carbs: answers.preferred_carbs || [],
      preferred_fats: answers.preferred_fats || [],
      meals_per_day: normalizeMealsPerDayChoice(answers.meals_per_day),
      traditional_meals: answers.traditional_meals !== false, // default true
      training_time: answers.training_time || null,
      wake_time: answers.wake_time || null,
      first_meal_delay: answers.first_meal_delay || null,
      last_meal_before_bed: answers.last_meal_before_bed || null,
      carb_tolerance: answers.carb_tolerance || null,
      cooking_level: answers.cooking_level || null,
      target_weight_lb: typeof answers.target_weight_lb === 'number' ? answers.target_weight_lb : null,
    },
    targets: targetsRes.data,
    exercises: exercisesRes.data || [],
    foods: (foodsRes.data || []).map((f: any) => ({
      ...f,
      fiber_per_100g: f.fiber_per_100g ?? 0,
      breakfast_score: f.breakfast_score ?? 0,
      lunch_dinner_score: f.lunch_dinner_score ?? 0,
      preworkout_score: f.preworkout_score ?? 0,
      postworkout_score: f.postworkout_score ?? 0,
      evening_score: f.evening_score ?? 0,
      tags: Array.isArray(f.tags) ? f.tags : inferFoodTags(f),
    })),
  };
}

export function toComparableWorkoutPlan(plan: {
  id: string;
  days_per_week: number | null;
  program_family_key: string | null;
  progression_model: string | null;
  weekly_layout_json: unknown;
  days: Array<{
    id: string;
    name: string;
    focus: string | null;
    day_type?: string | null;
    estimated_duration_min?: number | null;
    exercises: Array<{
      exercise_id?: string | null;
      exercise?: { id?: string | null; name?: string | null } | null;
    }>;
  }>;
}): WorkoutPlanComparable {
  const weeklyLayout = normalizeWeeklyLayout(
    plan.weekly_layout_json,
    plan.days.map((day) => ({
      id: day.id,
      dayType: day.day_type || "workout",
    })),
    Number(plan.days_per_week || plan.days.length || 0),
    [],
  );

  return {
    id: plan.id,
    familyKey: plan.program_family_key,
    progressionModel: plan.progression_model,
    daysPerWeek: Number(plan.days_per_week || plan.days.length || 0),
    weeklyLayout,
    days: plan.days.map((day) => ({
      id: day.id,
      name: day.name,
      focus: day.focus,
      estimatedDurationMin: day.estimated_duration_min ?? null,
      exercises: (day.exercises || []).map((exercise) => ({
        exerciseId: exercise.exercise_id || exercise.exercise?.id || null,
        name: exercise.exercise?.name || null,
      })),
    })),
  };
}

export async function fetchCurrentWorkoutPlanContext(
  supabase: SupabaseClient,
  userId: string,
  planId?: string | null,
): Promise<CurrentWorkoutPlanContext | null> {
  let query = supabase
    .from("user_workout_plans")
    .select(`
      id,
      days_per_week,
      program_family_key,
      progression_model,
      weekly_layout_json,
      days:user_workout_plan_days(
        id,
        name,
        focus,
        day_type,
        estimated_duration_min,
        exercises:user_workout_plan_exercises(
          exercise_id,
          exercise:exercises!exercise_id(id,name)
        )
      )
    `)
    .eq("user_id", userId);

  if (planId) {
    query = query.eq("id", planId);
  } else {
    query = query.eq("is_active", true);
  }

  const { data: planRow, error: planError } = await query.maybeSingle();
  if (planError || !planRow) {
    return null;
  }

  const comparablePlan = toComparableWorkoutPlan(planRow as any);
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 27);

  const { data: scheduleRows } = await supabase
    .from("user_workout_plan_schedule")
    .select(`
      status,
      completed_session_id,
      plan_day:plan_day_id(name)
    `)
    .eq("plan_id", planRow.id)
    .gte("scheduled_date", formatDate(start))
    .lte("scheduled_date", formatDate(today));

  const rows = scheduleRows || [];
  const workoutRows = rows.filter((row: any) => row.plan_day || row.completed_session_id);
  const completedRows = rows.filter((row: any) => row.status === "completed");
  const missedRows = rows.filter((row: any) => row.status === "missed");
  const completedSessionIds = completedRows
    .map((row: any) => row.completed_session_id)
    .filter(Boolean);

  let avgLoggedDurationMin: number | null = null;
  if (completedSessionIds.length) {
    const { data: sessions } = await supabase
      .from("workout_sessions")
      .select("duration_sec")
      .in("id", completedSessionIds);
    const durations = (sessions || [])
      .map((session: any) => Number(session.duration_sec || 0))
      .filter((val: number) => Number.isFinite(val) && val > 0);
    if (durations.length) {
      avgLoggedDurationMin = Math.round(
        durations.reduce((sum: number, val: number) => sum + val, 0) / durations.length / 60,
      );
    }
  }

  const missedCounts = new Map<string, number>();
  for (const row of missedRows as any[]) {
    const dayName = String(row.plan_day?.name || "").trim();
    if (!dayName) continue;
    missedCounts.set(dayName, (missedCounts.get(dayName) || 0) + 1);
  }

  return {
    planId: planRow.id,
    familyKey: planRow.program_family_key || null,
    progressionModel: planRow.progression_model || null,
    daysPerWeek: Number(planRow.days_per_week || comparablePlan.days?.length || 0),
    weeklyLayout: comparablePlan.weeklyLayout || [],
    comparablePlan,
    adherenceSummary: {
      completionRate28d: workoutRows.length
        ? Math.round((completedRows.length / workoutRows.length) * 100)
        : 0,
      missedSessions28d: missedRows.length,
      completedSessions28d: completedRows.length,
      avgLoggedDurationMin,
      mostFrequentlySkippedDays: Array.from(missedCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name),
    },
  };
}

export async function fetchCurrentNutritionPlanContext(
  supabase: SupabaseClient,
  userId: string,
  planId?: string | null,
): Promise<CurrentNutritionPlanContext | null> {
  let query = supabase
    .from("user_nutrition_plans")
    .select("id, meal_structure")
    .eq("user_id", userId);

  if (planId) {
    query = query.eq("id", planId);
  } else {
    query = query.eq("is_active", true);
  }

  const { data: planRow, error: planError } = await query.maybeSingle();
  if (planError || !planRow) {
    return null;
  }

  const mealStructureSlots = Array.isArray((planRow as any).meal_structure?.slots)
    ? (planRow as any).meal_structure.slots.filter(Boolean)
    : [];

  const { data: mealRows } = await supabase
    .from("user_nutrition_plan_meals")
    .select("meal_slot")
    .eq("plan_id", planRow.id);

  const mealSlots = normalizeNutritionSlots([
    ...mealStructureSlots,
    ...((mealRows || []).map((row: any) => row.meal_slot).filter(Boolean)),
  ]);

  return {
    planId: planRow.id,
    mealSlots,
  };
}

export async function fetchStoredWorkoutPlanComparable(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
): Promise<WorkoutPlanComparable | null> {
  const { data, error } = await supabase
    .from("user_workout_plans")
    .select(`
      id,
      days_per_week,
      program_family_key,
      progression_model,
      weekly_layout_json,
      days:user_workout_plan_days(
        id,
        name,
        focus,
        day_type,
        estimated_duration_min,
        exercises:user_workout_plan_exercises(
          exercise_id,
          exercise:exercises!exercise_id(id,name)
        )
      )
    `)
    .eq("user_id", userId)
    .eq("id", planId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toComparableWorkoutPlan(data as any);
}
