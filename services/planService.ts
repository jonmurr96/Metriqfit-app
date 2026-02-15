/**
 * Plan Service - Workout and Nutrition Plan Management
 * Includes plan generation, ingredient-level nutrition variants,
 * workout scheduling, rescheduling, and consistency scoring.
 */

import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase/types';
import { assertExerciseMatchesPlanDayFocus } from './workoutCoherenceService';

type WorkoutPlan = Database['public']['Tables']['user_workout_plans']['Row'];
type WorkoutPlanDay = Database['public']['Tables']['user_workout_plan_days']['Row'];
type WorkoutPlanExercise = Database['public']['Tables']['user_workout_plan_exercises']['Row'];
type NutritionPlan = Database['public']['Tables']['user_nutrition_plans']['Row'];

type LegacyPlanGenerationStatus = 'pending' | 'success' | 'failed' | 'validation_failed';

const db = supabase as any;

export interface WorkoutPlanWithDetails extends WorkoutPlan {
  days: Array<
    WorkoutPlanDay & {
      exercises: Array<
        WorkoutPlanExercise & {
          exercise: {
            id: string;
            name: string;
            category: string;
            equipment_required: string[];
            primary_muscle: string | null;
            video_url: string | null;
          };
        }
      >;
    }
  >;
}

export interface NutritionPlanWithDetails extends NutritionPlan {
  meal_structure: {
    slots?: string[];
    breakfast?: any;
    lunch?: any;
    dinner?: any;
    snacks?: any;
  };
  macro_distribution: {
    protein_percent?: number;
    carbs_percent?: number;
    fat_percent?: number;
    [key: string]: number | undefined;
  } | null;
}

export interface PlanRegenerationUsage {
  regenerationsToday: number;
  regenerationsLimit: number;
  isElite: boolean;
  remainingRegenerations: number;
}

export interface PlanGenerationOptions {
  generation_horizon_days?: number | { workout?: number; nutrition?: number };
  macro_tolerance_percent?: number;
  include_variants?: boolean;
  split_override?: string | null;
  program_family_preference?: string | null;
  training_style_preferences?: string[];
  progression_preference?: string | null;
  strict_days_match?: boolean;
  strict_macro_mode?: boolean;
  variety_profile?: 'moderate_rotation_4_5' | 'minimal' | 'high';
  strict_template_source?: boolean;
}

export interface NutritionPlanMealVariantItem {
  id: string;
  variant_id: string;
  food_item_id: string | null;
  item_name: string;
  quantity_value: number;
  quantity_unit: string;
  grams: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  order_index: number;
}

export interface NutritionPlanMealVariant {
  id: string;
  plan_meal_id: string;
  variant_type: 'default' | 'alternative' | 'user_custom';
  name: string;
  description: string | null;
  target_calories: number | null;
  target_protein: number | null;
  target_carbs: number | null;
  target_fat: number | null;
  prep_time_min: number | null;
  source: 'ai' | 'rule' | 'user';
  is_active: boolean;
  items: NutritionPlanMealVariantItem[];
}

export interface NutritionPlanMeal {
  id: string;
  plan_id: string;
  meal_slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  day_of_week: number | null;
  name: string;
  description: string | null;
  target_calories: number | null;
  target_protein: number | null;
  target_carbs: number | null;
  target_fat: number | null;
  prep_time_min: number | null;
  is_user_modified: boolean;
  selected_variant_id: string | null;
  selected_variant: NutritionPlanMealVariant | null;
  variants: NutritionPlanMealVariant[];
}

export interface NutritionDayTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionPlanDayDetails {
  planId: string;
  dayOfWeek: number;
  meals: NutritionPlanMeal[];
  totals: NutritionDayTotals;
  targets: NutritionDayTotals;
  delta: NutritionDayTotals;
}

export interface ApplyMealPlanChangeInput {
  planMealId: string;
  operation: 'swap_variant' | 'customize_variant_items';
  variantId?: string;
  name?: string;
  description?: string;
  items?: Array<{
    food_item_id?: string | null;
    item_name?: string;
    quantity_value?: number;
    quantity_unit?: string;
    grams?: number;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  }>;
}

export interface ApplyMealPlanBatchInput {
  planId?: string;
  dayOfWeek: number;
  meals: Array<{
    meal_slot: NutritionMealSlot;
    name: string;
    description?: string;
    target_calories?: number;
    target_protein?: number;
    target_carbs?: number;
    target_fat?: number;
    prep_time_min?: number;
    items?: Array<{
      food_item_id?: string | null;
      item_name?: string;
      quantity_value?: number;
      quantity_unit?: string;
      grams?: number;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      fiber?: number;
    }>;
  }>;
}

export type NutritionMealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface WorkoutScheduleEntry {
  id: string;
  plan_id: string;
  plan_day_id: string | null;
  scheduled_date: string;
  session_type: 'workout' | 'rest' | 'active_recovery' | 'conditioning';
  status: 'planned' | 'completed' | 'missed' | 'rescheduled' | 'skipped';
  original_date: string | null;
  completed_session_id: string | null;
  notes: string | null;
  plan_day?: {
    id: string;
    day_number: number;
    name: string;
    focus: string | null;
  } | null;
}

export interface ConsistencyRecord {
  id: string;
  user_id: string;
  log_date: string;
  nutrition_score: number;
  workout_score: number;
  hydration_score: number;
  overall_score: number;
  nutrition_status_json: any;
  workout_status_json: any;
  hydration_status_json: any;
  recommendation_json: any;
}

export type PlanGenerationRun = {
  id: string;
  user_id: string;
  plan_type: 'workout' | 'nutrition' | 'both';
  status: LegacyPlanGenerationStatus;
  created_at: string;
  completed_at: string | null;
  validation_errors?: any;
  warnings_json?: any;
};

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

const MEAL_SLOT_SEQUENCE: NutritionMealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_SLOT_INDEX: Record<NutritionMealSlot, number> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
  snack: 3,
};

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

function dateRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - Math.max(0, days - 1));
  return {
    from: start.toISOString().split('T')[0],
    to: end.toISOString().split('T')[0],
  };
}

async function getSelectedVariantMap(mealIds: string[]) {
  if (!mealIds.length) return new Map<string, NutritionPlanMealVariant[]>();

  const { data: variants, error: variantError } = await db
    .from('user_nutrition_plan_meal_variants')
    .select('*')
    .in('plan_meal_id', mealIds)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (variantError) throw variantError;

  const variantRows = (variants || []) as NutritionPlanMealVariant[];
  const variantIds = variantRows.map((v) => v.id);

  const itemByVariant = new Map<string, NutritionPlanMealVariantItem[]>();

  if (variantIds.length) {
    const { data: items, error: itemError } = await db
      .from('user_nutrition_plan_meal_variant_items')
      .select('*')
      .in('variant_id', variantIds)
      .order('order_index', { ascending: true });

    if (itemError) throw itemError;

    for (const item of (items || []) as NutritionPlanMealVariantItem[]) {
      const list = itemByVariant.get(item.variant_id) || [];
      list.push(item);
      itemByVariant.set(item.variant_id, list);
    }
  }

  const byMeal = new Map<string, NutritionPlanMealVariant[]>();
  for (const variant of variantRows) {
    variant.items = itemByVariant.get(variant.id) || [];
    const list = byMeal.get(variant.plan_meal_id) || [];
    list.push(variant);
    byMeal.set(variant.plan_meal_id, list);
  }

  return byMeal;
}

function computeDayTotalsFromMeals(
  meals: NutritionPlanMeal[],
  targets: NutritionDayTotals,
): Pick<NutritionPlanDayDetails, 'totals' | 'delta'> {
  const totals = meals.reduce(
    (acc, meal) => {
      const src = meal.selected_variant || null;
      acc.calories += Number(src?.target_calories || 0);
      acc.protein += Number(src?.target_protein || 0);
      acc.carbs += Number(src?.target_carbs || 0);
      acc.fat += Number(src?.target_fat || 0);
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return {
    totals: {
      calories: round1(totals.calories),
      protein: round1(totals.protein),
      carbs: round1(totals.carbs),
      fat: round1(totals.fat),
    },
    delta: {
      calories: round1(totals.calories - targets.calories),
      protein: round1(totals.protein - targets.protein),
      carbs: round1(totals.carbs - targets.carbs),
      fat: round1(totals.fat - targets.fat),
    },
  };
}

/**
 * Get user's active workout plan with all details
 */
export async function getActiveWorkoutPlan(
  userId: string,
): Promise<WorkoutPlanWithDetails | null> {
  const { data, error } = await supabase
    .from('user_workout_plans')
    .select(
      `
      *,
      days:user_workout_plan_days(
        *,
        exercises:user_workout_plan_exercises(
          *,
          exercise:exercises!exercise_id(
            id,
            name,
            category,
            equipment_required,
            primary_muscle,
            video_url
          )
        )
      )
    `,
    )
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch active workout plan:', error);
    return null;
  }

  return data as WorkoutPlanWithDetails | null;
}

/**
 * Get user's active nutrition plan
 */
export async function getActiveNutritionPlan(
  userId: string,
): Promise<NutritionPlanWithDetails | null> {
  const { data, error } = await supabase
    .from('user_nutrition_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch active nutrition plan:', error);
    return null;
  }

  return data as NutritionPlanWithDetails | null;
}

/**
 * Get nutrition plan meals for a specific day with selected variant and alternatives.
 */
export async function getNutritionPlanMealsForDay(
  userId: string,
  dayOfWeek: number,
  planId?: string | null,
): Promise<NutritionPlanDayDetails | null> {
  let resolvedPlanId = planId || null;
  if (!resolvedPlanId) {
    const activePlan = await getActiveNutritionPlan(userId);
    if (!activePlan) return null;
    resolvedPlanId = activePlan.id;
  }

  const { data: mealRows, error: mealError } = await db
    .from('user_nutrition_plan_meals')
    .select('*')
    .eq('plan_id', resolvedPlanId)
    .eq('day_of_week', dayOfWeek)
    .order('meal_slot', { ascending: true });

  if (mealError) {
    console.error('Failed to fetch nutrition day meals:', mealError);
    return null;
  }

  const mealsRaw = (mealRows || []) as Array<any>;
  const mealIds = mealsRaw.map((meal) => meal.id);
  const variantMap = await getSelectedVariantMap(mealIds);

  const meals: NutritionPlanMeal[] = mealsRaw.map((meal) => {
    const variants = variantMap.get(meal.id) || [];
    const selected = variants.find((variant) => variant.id === meal.selected_variant_id)
      || variants.find((variant) => variant.variant_type === 'default')
      || null;

    return {
      id: meal.id,
      plan_id: meal.plan_id,
      meal_slot: meal.meal_slot,
      day_of_week: meal.day_of_week,
      name: meal.name,
      description: meal.description,
      target_calories: meal.target_calories,
      target_protein: meal.target_protein,
      target_carbs: meal.target_carbs,
      target_fat: meal.target_fat,
      prep_time_min: meal.prep_time_min,
      is_user_modified: meal.is_user_modified,
      selected_variant_id: meal.selected_variant_id,
      selected_variant: selected,
      variants,
    };
  });

  const { data: targetsData } = await supabase
    .from('user_targets')
    .select('calories, protein_g, carbs_g, fat_g')
    .eq('user_id', userId)
    .maybeSingle();

  const targets = {
    calories: Number(targetsData?.calories || 0),
    protein: Number(targetsData?.protein_g || 0),
    carbs: Number(targetsData?.carbs_g || 0),
    fat: Number(targetsData?.fat_g || 0),
  };

  const computed = computeDayTotalsFromMeals(meals, targets);

  return {
    planId: resolvedPlanId,
    dayOfWeek,
    meals,
    targets,
    totals: computed.totals,
    delta: computed.delta,
  };
}

/**
 * Get nutrition plan meal by meal id including variants and items.
 */
export async function getNutritionPlanMeal(
  mealId: string,
): Promise<NutritionPlanMeal | null> {
  const { data: meal, error: mealError } = await db
    .from('user_nutrition_plan_meals')
    .select('*')
    .eq('id', mealId)
    .maybeSingle();

  if (mealError) {
    console.error('Failed to fetch nutrition meal:', mealError);
    return null;
  }

  if (!meal) return null;

  const variantMap = await getSelectedVariantMap([meal.id]);
  const variants = variantMap.get(meal.id) || [];

  return {
    id: meal.id,
    plan_id: meal.plan_id,
    meal_slot: meal.meal_slot,
    day_of_week: meal.day_of_week,
    name: meal.name,
    description: meal.description,
    target_calories: meal.target_calories,
    target_protein: meal.target_protein,
    target_carbs: meal.target_carbs,
    target_fat: meal.target_fat,
    prep_time_min: meal.prep_time_min,
    is_user_modified: meal.is_user_modified,
    selected_variant_id: meal.selected_variant_id,
    selected_variant: variants.find((variant) => variant.id === meal.selected_variant_id)
      || variants.find((variant) => variant.variant_type === 'default')
      || null,
    variants,
  };
}

/**
 * Apply swap/customization to nutrition meal plan and return updated day totals.
 */
export async function applyMealPlanChange(input: ApplyMealPlanChangeInput): Promise<NutritionPlanDayDetails> {
  const { data, error } = await supabase.functions.invoke('apply-meal-plan-change', {
    body: {
      plan_meal_id: input.planMealId,
      operation: input.operation,
      variant_id: input.variantId,
      name: input.name,
      description: input.description,
      items: input.items,
    },
  });

  if (error) {
    console.error('apply-meal-plan-change error:', error);
    throw new Error(error.message || 'Failed to update meal plan');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to update meal plan');
  }

  const meal = await getNutritionPlanMeal(input.planMealId);
  if (!meal) throw new Error('Meal not found after change');

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required');

  const day = await getNutritionPlanMealsForDay(
    user.id,
    meal.day_of_week || 0,
    meal.plan_id,
  );

  if (!day) {
    throw new Error('Failed to refresh day totals after meal change');
  }

  return day;
}

/**
 * Apply multiple meal updates to the same plan/day in one request.
 */
export async function applyMealPlanBatchChange(input: ApplyMealPlanBatchInput): Promise<{
  planId: string;
  dayOfWeek: number;
  changedMealIds: string[];
}> {
  const { data, error } = await supabase.functions.invoke('apply-meal-plan-batch-change', {
    body: {
      plan_id: input.planId,
      day_of_week: input.dayOfWeek,
      meals: input.meals,
    },
  });

  if (error) {
    console.error('apply-meal-plan-batch-change error:', error);
    throw new Error(error.message || 'Failed to apply meal batch change');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to apply meal batch change');
  }

  return {
    planId: data.plan_id,
    dayOfWeek: Number(data.day_of_week),
    changedMealIds: data.changed_meal_ids || [],
  };
}

/**
 * Add a meal block to user's active nutrition plan for a specific day.
 */
export async function addNutritionPlanMeal(
  userId: string,
  dayOfWeek: number,
  mealSlot: NutritionMealSlot,
): Promise<void> {
  const activePlan = await getActiveNutritionPlan(userId);
  if (!activePlan) throw new Error('No active nutrition plan found');

  const { data: targetsRow } = await db
    .from('user_targets')
    .select('calories, protein_g, carbs_g, fat_g')
    .eq('user_id', userId)
    .maybeSingle();

  const calories = Number(targetsRow?.calories || 0);
  const protein = Number(targetsRow?.protein_g || 0);
  const carbs = Number(targetsRow?.carbs_g || 0);
  const fat = Number(targetsRow?.fat_g || 0);

  const slotMultiplier: Record<NutritionMealSlot, number> = {
    breakfast: 0.25,
    lunch: 0.30,
    dinner: 0.30,
    snack: 0.15,
  };
  const multiplier = slotMultiplier[mealSlot] || 0.25;

  const baseName = `${mealSlot.charAt(0).toUpperCase()}${mealSlot.slice(1)} Custom`;

  const { data: meal, error: mealError } = await db
    .from('user_nutrition_plan_meals')
    .insert({
      plan_id: activePlan.id,
      meal_slot: mealSlot,
      day_of_week: dayOfWeek,
      name: baseName,
      description: 'Custom meal block added during onboarding review.',
      target_calories: round1(calories * multiplier),
      target_protein: round1(protein * multiplier),
      target_carbs: round1(carbs * multiplier),
      target_fat: round1(fat * multiplier),
      prep_time_min: 15,
      is_user_modified: true,
      selected_variant_id: null,
    })
    .select('id')
    .single();

  if (mealError || !meal) {
    throw new Error(mealError?.message || 'Failed to add meal');
  }

  const { data: variant, error: variantError } = await db
    .from('user_nutrition_plan_meal_variants')
    .insert({
      plan_meal_id: meal.id,
      variant_type: 'user_custom',
      name: baseName,
      description: 'Customize ingredient list and macros.',
      target_calories: round1(calories * multiplier),
      target_protein: round1(protein * multiplier),
      target_carbs: round1(carbs * multiplier),
      target_fat: round1(fat * multiplier),
      prep_time_min: 15,
      source: 'user',
      is_active: true,
    })
    .select('id')
    .single();

  if (variantError || !variant) {
    throw new Error(variantError?.message || 'Failed to create meal variant');
  }

  const { error: selectVariantError } = await db
    .from('user_nutrition_plan_meals')
    .update({ selected_variant_id: variant.id, is_user_modified: true })
    .eq('id', meal.id);

  if (selectVariantError) {
    throw new Error(selectVariantError.message || 'Failed to finalize meal add');
  }
}

/**
 * Remove a meal block from user's nutrition plan.
 */
export async function removeNutritionPlanMeal(planMealId: string): Promise<void> {
  const { data: variants } = await db
    .from('user_nutrition_plan_meal_variants')
    .select('id')
    .eq('plan_meal_id', planMealId);

  const variantIds = (variants || []).map((row: any) => row.id);
  if (variantIds.length) {
    const { error: deleteItemsError } = await db
      .from('user_nutrition_plan_meal_variant_items')
      .delete()
      .in('variant_id', variantIds);
    if (deleteItemsError) throw new Error(deleteItemsError.message || 'Failed to remove meal items');

    const { error: deleteVariantsError } = await db
      .from('user_nutrition_plan_meal_variants')
      .delete()
      .eq('plan_meal_id', planMealId);
    if (deleteVariantsError) throw new Error(deleteVariantsError.message || 'Failed to remove meal variants');
  }

  const { error } = await db
    .from('user_nutrition_plan_meals')
    .delete()
    .eq('id', planMealId);

  if (error) throw new Error(error.message || 'Failed to remove meal');
}

/**
 * Move a meal up/down by swapping slot with adjacent meal on the same day.
 */
export async function moveNutritionPlanMeal(
  planMealId: string,
  direction: 'up' | 'down',
): Promise<void> {
  const { data: current, error: currentError } = await db
    .from('user_nutrition_plan_meals')
    .select('id, plan_id, day_of_week, meal_slot')
    .eq('id', planMealId)
    .maybeSingle();

  if (currentError || !current) {
    throw new Error(currentError?.message || 'Meal not found');
  }

  const currentIndex = MEAL_SLOT_INDEX[current.meal_slot as NutritionMealSlot];
  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= MEAL_SLOT_SEQUENCE.length) return;

  const targetSlot = MEAL_SLOT_SEQUENCE[targetIndex];
  const { data: sibling, error: siblingError } = await db
    .from('user_nutrition_plan_meals')
    .select('id, meal_slot')
    .eq('plan_id', current.plan_id)
    .eq('day_of_week', current.day_of_week)
    .eq('meal_slot', targetSlot)
    .maybeSingle();

  if (siblingError) {
    throw new Error(siblingError.message || 'Failed to load adjacent meal');
  }

  if (!sibling) return;

  const originalDayOfWeek = current.day_of_week;
  const originalCurrentSlot = current.meal_slot as NutritionMealSlot;
  const originalSiblingSlot = sibling.meal_slot as NutritionMealSlot;

  let movedCurrentOffDay = false;
  let movedSiblingIntoCurrent = false;

  try {
    const { error: firstSwapError } = await db
      .from('user_nutrition_plan_meals')
      .update({ day_of_week: null })
      .eq('id', current.id);
    if (firstSwapError) throw new Error(firstSwapError.message || 'Failed to reorder meal');
    movedCurrentOffDay = true;

    const { error: secondSwapError } = await db
      .from('user_nutrition_plan_meals')
      .update({ meal_slot: originalCurrentSlot })
      .eq('id', sibling.id);
    if (secondSwapError) throw new Error(secondSwapError.message || 'Failed to reorder meal');
    movedSiblingIntoCurrent = true;

    const { error: finalSwapError } = await db
      .from('user_nutrition_plan_meals')
      .update({ meal_slot: originalSiblingSlot, day_of_week: originalDayOfWeek })
      .eq('id', current.id);
    if (finalSwapError) throw new Error(finalSwapError.message || 'Failed to reorder meal');
  } catch (error: any) {
    // Best-effort rollback to avoid leaving the plan in an intermediate state.
    if (movedSiblingIntoCurrent) {
      await db
        .from('user_nutrition_plan_meals')
        .update({ meal_slot: originalSiblingSlot })
        .eq('id', sibling.id);
    }

    if (movedCurrentOffDay) {
      await db
        .from('user_nutrition_plan_meals')
        .update({ meal_slot: originalCurrentSlot, day_of_week: originalDayOfWeek })
        .eq('id', current.id);
    }

    throw new Error(error?.message || 'Failed to reorder meal');
  }
}

/**
 * Copy full meal structure from one day to selected target days.
 */
export async function copyNutritionDayMeals(
  userId: string,
  sourceDayOfWeek: number,
  targetDaysOfWeek: number[],
): Promise<void> {
  if (!targetDaysOfWeek.length) return;

  const activePlan = await getActiveNutritionPlan(userId);
  if (!activePlan) throw new Error('No active nutrition plan found');

  const { data: sourceMealsRaw, error: sourceMealsError } = await db
    .from('user_nutrition_plan_meals')
    .select('*')
    .eq('plan_id', activePlan.id)
    .eq('day_of_week', sourceDayOfWeek);

  if (sourceMealsError) throw new Error(sourceMealsError.message || 'Failed to load source day meals');
  const sourceMeals = (sourceMealsRaw || []) as any[];
  if (!sourceMeals.length) throw new Error('No source meals found to copy');

  const sourceMealIds = sourceMeals.map((meal) => meal.id);
  const sourceVariantsByMeal = await getSelectedVariantMap(sourceMealIds);

  for (const targetDay of targetDaysOfWeek) {
    if (targetDay === sourceDayOfWeek) continue;

    const { data: targetMealsRaw, error: targetMealsError } = await db
      .from('user_nutrition_plan_meals')
      .select('id')
      .eq('plan_id', activePlan.id)
      .eq('day_of_week', targetDay);

    if (targetMealsError) throw new Error(targetMealsError.message || 'Failed to load target day meals');

    const targetMealIds = (targetMealsRaw || []).map((meal: any) => meal.id);
    if (targetMealIds.length) {
      const { data: targetVariantsRaw } = await db
        .from('user_nutrition_plan_meal_variants')
        .select('id')
        .in('plan_meal_id', targetMealIds);

      const targetVariantIds = (targetVariantsRaw || []).map((variant: any) => variant.id);
      if (targetVariantIds.length) {
        const { error: deleteItemsError } = await db
          .from('user_nutrition_plan_meal_variant_items')
          .delete()
          .in('variant_id', targetVariantIds);
        if (deleteItemsError) throw new Error(deleteItemsError.message || 'Failed clearing target items');

        const { error: deleteVariantsError } = await db
          .from('user_nutrition_plan_meal_variants')
          .delete()
          .in('id', targetVariantIds);
        if (deleteVariantsError) throw new Error(deleteVariantsError.message || 'Failed clearing target variants');
      }

      const { error: deleteMealsError } = await db
        .from('user_nutrition_plan_meals')
        .delete()
        .in('id', targetMealIds);
      if (deleteMealsError) throw new Error(deleteMealsError.message || 'Failed clearing target meals');
    }

    const orderedSourceMeals = [...sourceMeals].sort(
      (a, b) => (MEAL_SLOT_INDEX[a.meal_slot as NutritionMealSlot] ?? 99) - (MEAL_SLOT_INDEX[b.meal_slot as NutritionMealSlot] ?? 99),
    );

    for (const sourceMeal of orderedSourceMeals) {
      const { data: newMeal, error: newMealError } = await db
        .from('user_nutrition_plan_meals')
        .insert({
          plan_id: sourceMeal.plan_id,
          meal_slot: sourceMeal.meal_slot,
          day_of_week: targetDay,
          name: sourceMeal.name,
          description: sourceMeal.description,
          target_calories: sourceMeal.target_calories,
          target_protein: sourceMeal.target_protein,
          target_carbs: sourceMeal.target_carbs,
          target_fat: sourceMeal.target_fat,
          recipe_url: sourceMeal.recipe_url,
          prep_time_min: sourceMeal.prep_time_min,
          is_user_modified: true,
          selected_variant_id: null,
        })
        .select('id')
        .single();

      if (newMealError || !newMeal) {
        throw new Error(newMealError?.message || 'Failed to copy meal row');
      }

      const sourceVariants = sourceVariantsByMeal.get(sourceMeal.id) || [];
      const variantIdMap = new Map<string, string>();

      for (const sourceVariant of sourceVariants) {
        const { data: newVariant, error: newVariantError } = await db
          .from('user_nutrition_plan_meal_variants')
          .insert({
            plan_meal_id: newMeal.id,
            variant_type: sourceVariant.variant_type,
            name: sourceVariant.name,
            description: sourceVariant.description,
            target_calories: sourceVariant.target_calories,
            target_protein: sourceVariant.target_protein,
            target_carbs: sourceVariant.target_carbs,
            target_fat: sourceVariant.target_fat,
            prep_time_min: sourceVariant.prep_time_min,
            source: sourceVariant.source,
            is_active: sourceVariant.is_active,
          })
          .select('id')
          .single();

        if (newVariantError || !newVariant) {
          throw new Error(newVariantError?.message || 'Failed to copy meal variant');
        }

        variantIdMap.set(sourceVariant.id, newVariant.id);

        const variantItems = sourceVariant.items || [];
        for (const item of variantItems) {
          const { error: itemError } = await db
            .from('user_nutrition_plan_meal_variant_items')
            .insert({
              variant_id: newVariant.id,
              food_item_id: item.food_item_id,
              item_name: item.item_name,
              quantity_value: item.quantity_value,
              quantity_unit: item.quantity_unit,
              grams: item.grams,
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat,
              fiber: item.fiber,
              order_index: item.order_index,
            });

          if (itemError) {
            throw new Error(itemError.message || 'Failed to copy meal variant item');
          }
        }
      }

      const mappedSelectedVariantId = sourceMeal.selected_variant_id
        ? variantIdMap.get(sourceMeal.selected_variant_id) || null
        : null;

      if (mappedSelectedVariantId) {
        const { error: selectVariantError } = await db
          .from('user_nutrition_plan_meals')
          .update({ selected_variant_id: mappedSelectedVariantId, is_user_modified: true })
          .eq('id', newMeal.id);
        if (selectVariantError) {
          throw new Error(selectVariantError.message || 'Failed to set copied selected variant');
        }
      }
    }
  }
}

/**
 * Get all workout plan versions for a user
 */
export async function getWorkoutPlanHistory(userId: string): Promise<WorkoutPlan[]> {
  const { data, error } = await supabase
    .from('user_workout_plans')
    .select('*')
    .eq('user_id', userId)
    .order('version', { ascending: false });

  if (error) {
    console.error('Failed to fetch workout plan history:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all nutrition plan versions for a user
 */
export async function getNutritionPlanHistory(userId: string): Promise<NutritionPlan[]> {
  const { data, error } = await supabase
    .from('user_nutrition_plans')
    .select('*')
    .eq('user_id', userId)
    .order('version', { ascending: false });

  if (error) {
    console.error('Failed to fetch nutrition plan history:', error);
    return [];
  }

  return data || [];
}

/**
 * Get plan regeneration usage for rate limiting
 */
export async function getPlanRegenerationUsage(
  userId: string,
): Promise<PlanRegenerationUsage> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_type, status, expires_at, trial_ends_at, updated_at')
    .eq('user_id', userId)
    .in('status', ['active', 'trial', 'grace_period'])
    .order('updated_at', { ascending: false })
    .maybeSingle();

  const isElite = !!subscription && subscription.plan_type !== 'free';
  const regenerationsLimit = isElite ? 3 : 1;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: recentRuns } = await supabase
    .from('plan_generation_runs')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo);

  const regenerationsToday = recentRuns?.length || 0;

  return {
    regenerationsToday,
    regenerationsLimit,
    isElite,
    remainingRegenerations: Math.max(0, regenerationsLimit - regenerationsToday),
  };
}

/**
 * Check if user can regenerate plans (rate limit check)
 */
export async function canRegeneratePlans(userId: string): Promise<boolean> {
  const usage = await getPlanRegenerationUsage(userId);
  return usage.remainingRegenerations > 0;
}

/**
 * Regenerate user's workout and nutrition plans via Edge Function.
 */
export async function regeneratePlans(
  userId: string,
  options: PlanGenerationOptions = {},
): Promise<{ workoutPlanId?: string; nutritionPlanId?: string; runId?: string }> {
  const canRegenerate = await canRegeneratePlans(userId);
  if (!canRegenerate) {
    const usage = await getPlanRegenerationUsage(userId);
    throw new Error(
      `Plan regeneration limit reached (${usage.regenerationsLimit} per hour for ${usage.isElite ? 'Elite' : 'free'} users). Please try again later.`,
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Authentication required. Please sign in again.');
  }

  const { data, error } = await supabase.functions.invoke('generate-user-plans', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: {
      user_id: userId,
      ...options,
    },
  });

  if (error) {
    console.error('Plan regeneration error:', error);
    throw new Error('Failed to regenerate plans. Please try again.');
  }

  return {
    runId: data?.runId || data?.run_id,
    workoutPlanId: data?.workoutPlanId || data?.workout_plan_id,
    nutritionPlanId: data?.nutritionPlanId || data?.nutrition_plan_id,
  };
}

/**
 * Activate a specific workout plan version
 */
export async function activateWorkoutPlan(planId: string, userId: string): Promise<void> {
  await supabase
    .from('user_workout_plans')
    .update({ is_active: false })
    .eq('user_id', userId);

  const { error } = await supabase
    .from('user_workout_plans')
    .update({ is_active: true })
    .eq('id', planId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to activate workout plan:', error);
    throw new Error('Failed to activate workout plan');
  }
}

/**
 * Activate a specific nutrition plan version
 */
export async function activateNutritionPlan(planId: string, userId: string): Promise<void> {
  await supabase
    .from('user_nutrition_plans')
    .update({ is_active: false })
    .eq('user_id', userId);

  const { error } = await supabase
    .from('user_nutrition_plans')
    .update({ is_active: true })
    .eq('id', planId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to activate nutrition plan:', error);
    throw new Error('Failed to activate nutrition plan');
  }
}

/**
 * Get a specific workout plan day with exercises
 */
export async function getWorkoutPlanDay(
  dayId: string,
): Promise<
  | (WorkoutPlanDay & {
      exercises: Array<
        WorkoutPlanExercise & {
          exercise: {
            id: string;
            name: string;
            category: string;
            equipment_required: string[];
            primary_muscle: string | null;
            video_url: string | null;
          };
        }
      >;
    })
  | null
> {
  const { data, error } = await supabase
    .from('user_workout_plans')
    .select(
      `
      id,
      days:user_workout_plan_days!inner(
        *,
        exercises:user_workout_plan_exercises(
          *,
          exercise:exercises!exercise_id(
            id,
            name,
            category,
            equipment_required,
            primary_muscle,
            video_url
          )
        )
      )
    `,
    )
    .eq('days.id', dayId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch workout plan day:', error);
    return null;
  }

  return (data?.days?.[0] as any) || null;
}

/**
 * Mark a workout plan day as completed.
 */
export async function markWorkoutDayComplete(
  dayId: string,
  sessionId?: string,
): Promise<void> {
  const { error } = await supabase
    .from('user_workout_plan_days')
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
      session_id: sessionId || null,
    })
    .eq('id', dayId);

  if (error) {
    console.error('Failed to mark workout day complete:', error);
    throw new Error('Failed to mark workout day complete');
  }

  // If schedule table exists, mark today as completed for same plan_day.
  await db
    .from('user_workout_plan_schedule')
    .update({
      status: 'completed',
      completed_session_id: sessionId || null,
    })
    .eq('plan_day_id', dayId)
    .eq('scheduled_date', todayDate());
}

// Type exports for hooks
export type UserWorkoutPlan = WorkoutPlan;
export type UserWorkoutPlanDay = WorkoutPlanDay;
export type UserNutritionPlan = NutritionPlan;

/**
 * Trigger AI plan generation via Edge Function.
 */
export async function triggerPlanGeneration(
  userId: string,
  planType: 'workout' | 'nutrition' | 'both',
  options: PlanGenerationOptions = {},
): Promise<{ runId: string; workoutPlanId?: string; nutritionPlanId?: string; warnings?: string[] }> {
  const canRegenerate = await canRegeneratePlans(userId);
  if (!canRegenerate) {
    const usage = await getPlanRegenerationUsage(userId);
    throw new Error(
      `Plan regeneration limit reached (${usage.regenerationsLimit} per hour for ${usage.isElite ? 'Elite' : 'free'} users). Please try again later.`,
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Authentication required. Please sign in again.');
  }

  try {
    const { data, error } = await supabase.functions.invoke('generate-user-plans', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        user_id: userId,
        plan_type: planType,
        ...options,
      },
    });

    if (error) {
      console.error('Plan generation edge function error:', error);
      throw new Error(error.message || 'Plan generation failed');
    }

    return {
      runId: data?.runId || data?.run_id,
      workoutPlanId: data?.workoutPlanId || data?.workout_plan_id,
      nutritionPlanId: data?.nutritionPlanId || data?.nutrition_plan_id,
      warnings: data?.warnings || [],
    };
  } catch (err: any) {
    console.error('Plan generation failed with exception:', err);
    throw new Error(`Failed to generate plans: ${err.message || 'Unknown error'}`);
  }
}

/**
 * Get plan history by type (workout or nutrition)
 */
export async function getPlanHistory(
  userId: string,
  planType: 'workout' | 'nutrition',
): Promise<(WorkoutPlan | NutritionPlan)[]> {
  const table = planType === 'workout' ? 'user_workout_plans' : 'user_nutrition_plans';

  const { data, error } = await db
    .from(table)
    .select('*')
    .eq('user_id', userId)
    .order('version', { ascending: false });

  if (error) {
    console.error(`Failed to fetch ${planType} plan history:`, error);
    return [];
  }

  return data || [];
}

/**
 * Get today's scheduled workout based on schedule table with fallback to template day map.
 */
export async function getTodaysWorkout(
  userId: string,
): Promise<
  | (WorkoutPlanDay & {
      exercises: Array<
        WorkoutPlanExercise & {
          exercise: {
            id: string;
            name: string;
            category: string;
            equipment_required: string[];
            primary_muscle: string | null;
            video_url: string | null;
          };
        }
      >;
    })
  | null
> {
  const activePlan = await getActiveWorkoutPlan(userId);
  if (!activePlan) return null;

  const today = todayDate();
  const { data: scheduleRow } = await db
    .from('user_workout_plan_schedule')
    .select('plan_day_id, session_type, status')
    .eq('plan_id', activePlan.id)
    .eq('scheduled_date', today)
    .maybeSingle();

  if (scheduleRow?.session_type === 'workout' && scheduleRow.plan_day_id) {
    const bySchedule = await getWorkoutPlanDay(scheduleRow.plan_day_id);
    if (bySchedule) return bySchedule;
  }
  return null;
}

/**
 * Get today's schedule entry (workout/rest/active_recovery/conditioning).
 */
export async function getTodayWorkoutScheduleEntry(
  userId: string,
): Promise<WorkoutScheduleEntry | null> {
  const plan = await getActiveWorkoutPlan(userId);
  if (!plan) return null;

  const today = todayDate();
  const { data, error } = await db
    .from('user_workout_plan_schedule')
    .select('id, plan_id, plan_day_id, scheduled_date, session_type, status, original_date, completed_session_id, notes')
    .eq('plan_id', plan.id)
    .eq('scheduled_date', today)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch today workout schedule entry:', error);
    return null;
  }

  if (!data) return null;

  let planDay: WorkoutScheduleEntry['plan_day'] = null;
  if (data.plan_day_id) {
    const { data: dayRow } = await supabase
      .from('user_workout_plan_days')
      .select('id, day_number, name, focus')
      .eq('id', data.plan_day_id)
      .maybeSingle();
    if (dayRow) {
      planDay = dayRow;
    }
  }

  return {
    ...(data as WorkoutScheduleEntry),
    plan_day: planDay,
  };
}

/**
 * Mark a workout day as completed (alias)
 */
export async function markDayCompleted(dayId: string): Promise<void> {
  return markWorkoutDayComplete(dayId);
}

/**
 * Swap an exercise in a workout plan
 */
export async function swapExercise(
  planExerciseId: string,
  newExerciseId: string,
): Promise<void> {
  const { data: current, error: currentError } = await db
    .from('user_workout_plan_exercises')
    .select('id, plan_day_id')
    .eq('id', planExerciseId)
    .maybeSingle();

  if (currentError || !current) {
    console.error('Failed to load exercise for swap:', currentError);
    throw new Error('Failed to swap exercise');
  }

  await assertExerciseMatchesPlanDayFocus(current.plan_day_id, newExerciseId);

  const { error } = await supabase
    .from('user_workout_plan_exercises')
    .update({
      exercise_id: newExerciseId,
      is_user_modified: true,
    })
    .eq('id', planExerciseId);

  if (error) {
    console.error('Failed to swap exercise:', error);
    throw new Error('Failed to swap exercise');
  }
}

/**
 * Update exercise targets (sets, reps, rest)
 */
export async function updateExerciseTargets(
  planExerciseId: string,
  updates: {
    sets_target?: number;
    reps_min?: number;
    reps_max?: number;
    rest_seconds?: number;
  },
): Promise<void> {
  const { error } = await supabase
    .from('user_workout_plan_exercises')
    .update(updates)
    .eq('id', planExerciseId);

  if (error) {
    console.error('Failed to update exercise targets:', error);
    throw new Error('Failed to update exercise targets');
  }
}

/**
 * Add an exercise block to a workout plan day.
 */
export async function addWorkoutPlanExercise(
  planDayId: string,
  exerciseId: string,
  defaults?: {
    sets_target?: number;
    reps_min?: number;
    reps_max?: number;
    rest_seconds?: number;
  },
): Promise<void> {
  await assertExerciseMatchesPlanDayFocus(planDayId, exerciseId);

  const { data: dayRows, error: dayError } = await db
    .from('user_workout_plan_exercises')
    .select('order_index')
    .eq('plan_day_id', planDayId)
    .order('order_index', { ascending: false })
    .limit(1);

  if (dayError) {
    console.error('Failed to load day exercises for insert:', dayError);
    throw new Error('Failed to add exercise');
  }

  const nextOrderIndex = Number(dayRows?.[0]?.order_index || 0) + 1;

  const { error: insertError } = await db
    .from('user_workout_plan_exercises')
    .insert({
      plan_day_id: planDayId,
      exercise_id: exerciseId,
      order_index: nextOrderIndex,
      sets_target: defaults?.sets_target ?? 3,
      reps_min: defaults?.reps_min ?? 8,
      reps_max: defaults?.reps_max ?? 12,
      rest_seconds: defaults?.rest_seconds ?? 90,
      is_user_modified: true,
      original_exercise_id: exerciseId,
    });

  if (insertError) {
    console.error('Failed to insert workout plan exercise:', insertError);
    throw new Error('Failed to add exercise');
  }
}

/**
 * Remove an exercise block from a workout plan day and compact order indexes.
 */
export async function removeWorkoutPlanExercise(
  planExerciseId: string,
): Promise<void> {
  const { data: row, error: rowError } = await db
    .from('user_workout_plan_exercises')
    .select('id, plan_day_id, order_index')
    .eq('id', planExerciseId)
    .maybeSingle();

  if (rowError || !row) {
    console.error('Failed to load exercise for removal:', rowError);
    throw new Error('Failed to remove exercise');
  }

  const { error: deleteError } = await db
    .from('user_workout_plan_exercises')
    .delete()
    .eq('id', planExerciseId);

  if (deleteError) {
    console.error('Failed to delete workout plan exercise:', deleteError);
    throw new Error('Failed to remove exercise');
  }

  const { data: siblings, error: siblingsError } = await db
    .from('user_workout_plan_exercises')
    .select('id, order_index')
    .eq('plan_day_id', row.plan_day_id)
    .gt('order_index', row.order_index)
    .order('order_index', { ascending: true });

  if (siblingsError) {
    console.error('Failed to load sibling exercises:', siblingsError);
    throw new Error('Failed to update exercise order');
  }

  for (const sibling of siblings || []) {
    const { error: updateError } = await db
      .from('user_workout_plan_exercises')
      .update({ order_index: Number(sibling.order_index) - 1 })
      .eq('id', sibling.id);

    if (updateError) {
      console.error('Failed to compact exercise order:', updateError);
      throw new Error('Failed to update exercise order');
    }
  }
}

/**
 * Move an exercise block up or down within the same workout day.
 */
export async function moveWorkoutPlanExercise(
  planExerciseId: string,
  direction: 'up' | 'down',
): Promise<void> {
  const { data: current, error: currentError } = await db
    .from('user_workout_plan_exercises')
    .select('id, plan_day_id, order_index')
    .eq('id', planExerciseId)
    .maybeSingle();

  if (currentError || !current) {
    console.error('Failed to load exercise for move:', currentError);
    throw new Error('Failed to move exercise');
  }

  const targetOrder = direction === 'up'
    ? Number(current.order_index) - 1
    : Number(current.order_index) + 1;

  if (targetOrder < 1) return;

  const { data: sibling, error: siblingError } = await db
    .from('user_workout_plan_exercises')
    .select('id, order_index')
    .eq('plan_day_id', current.plan_day_id)
    .eq('order_index', targetOrder)
    .maybeSingle();

  if (siblingError) {
    console.error('Failed to load sibling for move:', siblingError);
    throw new Error('Failed to move exercise');
  }

  if (!sibling) return;

  const { error: firstSwapError } = await db
    .from('user_workout_plan_exercises')
    .update({ order_index: -1 })
    .eq('id', current.id);

  if (firstSwapError) {
    console.error('Failed first swap update:', firstSwapError);
    throw new Error('Failed to move exercise');
  }

  const { error: secondSwapError } = await db
    .from('user_workout_plan_exercises')
    .update({ order_index: current.order_index })
    .eq('id', sibling.id);

  if (secondSwapError) {
    console.error('Failed second swap update:', secondSwapError);
    throw new Error('Failed to move exercise');
  }

  const { error: finalSwapError } = await db
    .from('user_workout_plan_exercises')
    .update({ order_index: sibling.order_index })
    .eq('id', current.id);

  if (finalSwapError) {
    console.error('Failed final swap update:', finalSwapError);
    throw new Error('Failed to move exercise');
  }
}

/**
 * Get plan generation history (audit log)
 */
export async function getGenerationHistory(
  userId: string,
): Promise<PlanGenerationRun[]> {
  const { data, error } = await supabase
    .from('plan_generation_runs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Failed to fetch generation history:', error);
    return [];
  }

  return (data || []) as PlanGenerationRun[];
}

/**
 * Reactivate an old plan version
 */
export async function reactivatePlan(
  userId: string,
  planId: string,
  planType: 'workout' | 'nutrition',
): Promise<void> {
  if (planType === 'workout') {
    await activateWorkoutPlan(planId, userId);
  } else {
    await activateNutritionPlan(planId, userId);
  }
}

/**
 * Get workout schedule entries for a date range.
 */
export async function getWorkoutSchedule(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<WorkoutScheduleEntry[]> {
  const plan = await getActiveWorkoutPlan(userId);
  if (!plan) return [];

  const { data, error } = await db
    .from('user_workout_plan_schedule')
    .select('id, plan_id, plan_day_id, scheduled_date, session_type, status, original_date, completed_session_id, notes')
    .eq('plan_id', plan.id)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .order('scheduled_date', { ascending: true });

  if (error) {
    console.error('Failed to fetch workout schedule:', error);
    return [];
  }

  const entries = (data || []) as WorkoutScheduleEntry[];
  const dayIds = entries.map((entry) => entry.plan_day_id).filter(Boolean) as string[];

  const dayMap = new Map<string, { id: string; day_number: number; name: string; focus: string | null }>();
  if (dayIds.length) {
    const { data: dayRows } = await supabase
      .from('user_workout_plan_days')
      .select('id, day_number, name, focus')
      .in('id', dayIds);

    for (const day of dayRows || []) {
      dayMap.set(day.id, day);
    }
  }

  return entries.map((entry) => ({
    ...entry,
    plan_day: entry.plan_day_id ? dayMap.get(entry.plan_day_id) || null : null,
  }));
}

/**
 * Reschedule a workout day to another date.
 */
export async function rescheduleWorkoutDay(input: {
  planId?: string;
  scheduleId?: string;
  fromDate?: string;
  toDate: string;
  notes?: string;
}): Promise<WorkoutScheduleEntry[]> {
  const { data, error } = await supabase.functions.invoke('reschedule-workout-day', {
    body: {
      plan_id: input.planId,
      schedule_id: input.scheduleId,
      from_date: input.fromDate,
      to_date: input.toDate,
      notes: input.notes,
    },
  });

  if (error) {
    console.error('reschedule-workout-day error:', error);
    throw new Error(error.message || 'Failed to reschedule workout');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to reschedule workout');
  }

  return (data.week_schedule || []) as WorkoutScheduleEntry[];
}

/**
 * Compute and persist daily consistency scores.
 */
export async function computePlanConsistency(input: {
  startDate?: string;
  endDate?: string;
  days?: number;
} = {}): Promise<{ averageOverallScore: number; days: any[]; latestRecommendation: any }> {
  const { data, error } = await supabase.functions.invoke('compute-plan-consistency', {
    body: {
      start_date: input.startDate,
      end_date: input.endDate,
      days: input.days,
    },
  });

  if (error) {
    console.error('compute-plan-consistency error:', error);
    throw new Error(error.message || 'Failed to compute consistency');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to compute consistency');
  }

  return {
    averageOverallScore: Number(data.average_overall_score || 0),
    days: data.days || [],
    latestRecommendation: data.latest_recommendation || null,
  };
}

/**
 * Get consistency history from cache table.
 */
export async function getConsistencyHistory(
  userId: string,
  days = 7,
): Promise<ConsistencyRecord[]> {
  const range = dateRange(days);
  const { data, error } = await db
    .from('user_plan_consistency_daily')
    .select('*')
    .eq('user_id', userId)
    .gte('log_date', range.from)
    .lte('log_date', range.to)
    .order('log_date', { ascending: true });

  if (error) {
    console.error('Failed to fetch consistency history:', error);
    return [];
  }

  return (data || []) as ConsistencyRecord[];
}

/**
 * Get latest consistency row.
 */
export async function getLatestConsistency(
  userId: string,
): Promise<ConsistencyRecord | null> {
  const { data, error } = await db
    .from('user_plan_consistency_daily')
    .select('*')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch latest consistency:', error);
    return null;
  }

  return (data as ConsistencyRecord) || null;
}
