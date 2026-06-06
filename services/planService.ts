/**
 * Plan Service - Workout and Nutrition Plan Management
 * Includes plan generation, ingredient-level nutrition variants,
 * workout scheduling, rescheduling, and consistency scoring.
 */

import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase/types';
import { getClerkSupabaseToken, getClerkUserId } from '../lib/auth/getClerkToken';
import { invokeFunction } from '../lib/supabase/invokeFunction';
import {
  assertExerciseMatchesPlanDayFocus,
  getWorkoutPlanCoherenceReport as loadWorkoutPlanCoherenceReport,
  type WorkoutPlanCoherenceReport,
} from './workoutCoherenceService';
import {
  normalizeWeeklyLayout,
  summarizeWeeklyLayout,
  type UserWorkoutPlanProgramMeta,
} from '../lib/workout/program-catalog';
import { buildWorkoutPlanDiff, type WorkoutPlanDiffResult } from '../lib/workout/plan-regeneration-diff';
import { buildNutritionPlanDiff, type NutritionPlanDiffResult, type NutritionPlanComparable } from '../lib/nutrition/plan-regeneration-diff';
import {
  isPreviewNutritionPlanRecord,
  normalizePreviewNutritionPlanName,
} from '../lib/nutrition/plan-lifecycle';
import { getLocalDateKey } from '../lib/nutrition/meal-slots';
import { getFeatureLimit } from './subscriptionService';
import { getSubscriptionTier, getTierLabel, type SubscriptionTier } from '../lib/subscription/plans';

type WorkoutPlan = Database['public']['Tables']['user_workout_plans']['Row'];
type WorkoutPlanDay = Database['public']['Tables']['user_workout_plan_days']['Row'];
type WorkoutPlanExercise = Database['public']['Tables']['user_workout_plan_exercises']['Row'];
type NutritionPlan = Database['public']['Tables']['user_nutrition_plans']['Row'];

type LegacyPlanGenerationStatus = 'pending' | 'success' | 'failed' | 'validation_failed';

const db = supabase as any;
const WORKOUT_PREVIEW_NAME_PREFIX = 'Preview · ';
const WORKOUT_PLAN_DETAILS_SELECT = `
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
            video_url,
            gif_url,
            image_url,
            poster_url,
            has_media,
            source_provider
          )
        )
      )
    `;

export interface WorkoutPlanWithDetails extends WorkoutPlan {
  programMeta?: UserWorkoutPlanProgramMeta;
  weeklyLayoutSummary?: string;
  days: Array<
    WorkoutPlanDay & {
      day_type?: string;
      estimated_duration_min?: number | null;
      exercises: Array<
        WorkoutPlanExercise & {
          exercise: {
            id: string;
            name: string;
            category: string;
            equipment_required: string[];
            primary_muscle: string | null;
            video_url: string | null;
            gif_url?: string | null;
            image_url?: string | null;
            poster_url?: string | null;
            has_media?: boolean;
            source_provider?: string | null;
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
  tier: SubscriptionTier;
  isUnlimited: boolean;
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
  generation_mode?: 'initial' | 'regenerate';
  activation_mode?: 'preview' | 'activate';
  workout_regeneration?: WorkoutRegenerationRequest;
  nutrition_regeneration?: NutritionRegenerationRequest;
  generation_version?: 'v1' | 'v2' | 'v3';
}

export type WorkoutRegenerationReason =
  | 'not_seeing_results'
  | 'too_hard_to_recover'
  | 'sessions_too_long'
  | 'too_repetitive'
  | 'schedule_changed'
  | 'equipment_changed'
  | 'pain_or_discomfort'
  | 'want_different_split'
  | 'other';

export type WorkoutRegenerationIssueFlag =
  | 'too_many_days'
  | 'too_much_volume'
  | 'wrong_exercise_selection'
  | 'need_more_variety'
  | 'need_more_structure';

export interface WorkoutRegenerationRequest {
  current_plan_id: string;
  reason: WorkoutRegenerationReason;
  issue_flags: WorkoutRegenerationIssueFlag[];
  free_text?: string;
  days_per_week_override?: number | null;
  preferred_split_family?: string | null;
  progression_preference?: string | null;
  session_duration_target_min?: number | null;
  goal_emphasis?: string | null;
  preferred_days_off?: string[];
  equipment_access?: string | null;
  injuries?: string[];
  avoid_exercise_names?: string[];
  keep_exercise_names?: string[];
  keep_current_split?: boolean;
  start_fresh?: boolean;
}

export interface WorkoutAdherenceSummary {
  completionRate28d: number;
  missedSessions28d: number;
  completedSessions28d: number;
  avgLoggedDurationMin: number | null;
  mostFrequentlySkippedDays: string[];
}

export interface WorkoutPlanPreview {
  runId: string;
  previewPlanId: string;
  currentPlan: WorkoutPlanWithDetails;
  previewPlan: WorkoutPlanWithDetails;
  diff: WorkoutPlanDiffResult;
  warnings: string[];
}

export interface WorkoutPlanPreviewValidationFailure {
  status: 'validation_failed';
  runId: string;
  message: string;
  warnings: string[];
}

export type WorkoutPlanPreviewResult = WorkoutPlanPreview | WorkoutPlanPreviewValidationFailure;
export type { WorkoutPlanCoherenceReport };

export type NutritionRegenerationReason =
  | 'not_hitting_macros'
  | 'too_repetitive'
  | 'prep_takes_too_long'
  | 'budget_changed'
  | 'dietary_preferences_changed'
  | 'allergy_or_food_issue'
  | 'schedule_changed'
  | 'want_different_meals'
  | 'other';

export type NutritionRegenerationIssueFlag =
  | 'too_many_meals'
  | 'too_few_meals'
  | 'wrong_macros'
  | 'need_more_variety'
  | 'too_expensive'
  | 'prep_too_complex'
  | 'foods_i_wont_eat';

export interface NutritionRegenerationRequest {
  current_plan_id: string;
  reason: NutritionRegenerationReason;
  issue_flags: NutritionRegenerationIssueFlag[];
  meals_per_day_override?: number | null;
  dietary_preference_override?: string | null;
  allergies?: string[];
  refused_foods?: string[];
  prep_time_target_min?: number | null;
  budget_limit?: number | null;
  keep_meal_slots?: boolean;
  start_fresh?: boolean;
}

export interface NutritionPlanPreview {
  runId: string;
  previewPlanId: string;
  currentPlan: NutritionPlanWithDetails;
  previewPlan: NutritionPlanWithDetails;
  diff: NutritionPlanDiffResult;
  warnings: string[];
}

export interface NutritionPlanPreviewValidationFailure {
  status: 'validation_failed';
  runId: string;
  message: string;
  warnings: string[];
}

export type NutritionPlanPreviewResult = NutritionPlanPreview | NutritionPlanPreviewValidationFailure;

export interface EditableNutritionPlanContext {
  livePlan: NutritionPlanWithDetails | null;
  previewPlan: NutritionPlanWithDetails | null;
  editablePlan: NutritionPlanWithDetails | null;
  source: 'live' | 'preview' | 'none';
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

export type NutritionMealMappingState = 'ready' | 'repairable' | 'unmapped';

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
  can_direct_log: boolean;
  mapping_state: NutritionMealMappingState;
  unmapped_item_count: number;
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
    day_type?: string;
    estimated_duration_min?: number | null;
  } | null;
}

function buildPlanProgramMeta(plan: WorkoutPlanWithDetails): UserWorkoutPlanProgramMeta {
  const planDays = (plan.days || []).map((day) => ({
    id: day.id,
    dayType: day.day_type || 'workout',
  }));

  const weeklyLayout = normalizeWeeklyLayout(
    plan.weekly_layout_json,
    planDays,
    Number(plan.days_per_week || planDays.length || 0),
    [],
  );

  return {
    sourceModel: (plan.source_model as UserWorkoutPlanProgramMeta['sourceModel']) || 'generated',
    programTemplateV2Id: plan.program_template_v2_id || null,
    programFamilyKey: plan.program_family_key || null,
    progressionModel: plan.progression_model || null,
    trainingStyleTags: plan.training_style_tags || [],
    goalTags: plan.goal_tags || [],
    weeklyLayout,
  };
}

function isPreviewWorkoutPlanRecord(plan: Partial<WorkoutPlan> | null | undefined) {
  if (!plan) return false;
  if ((plan as any).lifecycle_state === 'preview') return true;
  return typeof plan.name === 'string' && plan.name.startsWith(WORKOUT_PREVIEW_NAME_PREFIX);
}

function normalizePreviewWorkoutPlanName(name: string | null | undefined) {
  const raw = String(name || '');
  return raw.startsWith(WORKOUT_PREVIEW_NAME_PREFIX)
    ? raw.slice(WORKOUT_PREVIEW_NAME_PREFIX.length)
    : raw;
}

function decorateWorkoutPlan(plan: WorkoutPlanWithDetails): WorkoutPlanWithDetails {
  const normalizedPlan = {
    ...plan,
    name: normalizePreviewWorkoutPlanName(plan.name),
  };
  const programMeta = buildPlanProgramMeta(normalizedPlan);

  return {
    ...normalizedPlan,
    programMeta,
    weeklyLayoutSummary: summarizeWeeklyLayout(programMeta.weeklyLayout),
  };
}

function decorateNutritionPlan(plan: NutritionPlanWithDetails): NutritionPlanWithDetails {
  return {
    ...plan,
    name: normalizePreviewNutritionPlanName(plan.name),
  };
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
  orchestration_status?: 'queued' | 'running' | 'success' | 'failed' | 'validation_failed' | 'cancelled' | null;
  current_stage?: string | null;
  stage_history_json?: any;
  diagnostics_json?: any;
  spec_seed_hex?: string | null;
  generation_version?: number;
  planner_mode?: string | null;
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

function normalizeFoodLookupName(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[%/(),.-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function tokenizeFoodLookupName(value: string | null | undefined) {
  return normalizeFoodLookupName(value)
    .split(' ')
    .filter(Boolean);
}

type FoodLookupEntry = {
  id: string;
  name: string;
  isVerified: boolean;
  normalizedName: string;
  tokens: string[];
};

type FoodLookupContext = {
  exact: Map<string, FoodLookupEntry>;
  all: FoodLookupEntry[];
};

const FOOD_LOOKUP_ALIASES: Record<string, string[]> = {
  'pea protein': ['plant protein powder pea'],
  'cottage cheese': ['cottage cheese low fat', 'cottage cheese full fat'],
  'chicken breast': ['chicken breast skinless cooked', 'rotisserie chicken breast'],
  'rice cakes': ['rice cakes plain'],
  almonds: ['almonds raw'],
  'whole eggs': ['eggs whole cooked'],
  tuna: ['tuna canned in water'],
  walnuts: ['walnuts raw'],
  'olive oil': ['olive oil extra virgin'],
  'rolled oats': ['instant oats dry', 'oatmeal cooked', 'oats'],
  banana: ['banana'],
};

function scoreFoodLookupEntry(
  entry: FoodLookupEntry,
  searchTokens: string[],
) {
  const matchedTokens = searchTokens.filter((token) => entry.tokens.includes(token)).length;
  const coverage = searchTokens.length ? matchedTokens / searchTokens.length : 0;
  const exactBoost = entry.normalizedName === searchTokens.join(' ') ? 4 : 0;
  const prefixBoost = entry.normalizedName.startsWith(searchTokens.join(' ')) ? 2 : 0;

  return (coverage * 100) + (entry.isVerified ? 5 : 0) + prefixBoost + exactBoost;
}

function buildFoodLookupMap(
  foods: Array<{ id: string; name: string; is_verified?: boolean | null }>,
) {
  const exact = new Map<string, FoodLookupEntry>();
  const all: FoodLookupEntry[] = [];

  for (const food of foods) {
    const normalizedName = normalizeFoodLookupName(food.name);
    if (!normalizedName) continue;

    const candidate: FoodLookupEntry = {
      id: food.id,
      name: food.name,
      isVerified: !!food.is_verified,
      normalizedName,
      tokens: tokenizeFoodLookupName(food.name),
    };
    all.push(candidate);

    const current = exact.get(normalizedName);
    if (!current || (!current.isVerified && candidate.isVerified)) {
      exact.set(normalizedName, candidate);
    }
  }

  return { exact, all };
}

function findBestFoodLookupMatch(
  value: string | null | undefined,
  foodLookup: FoodLookupContext,
) {
  const normalizedValue = normalizeFoodLookupName(value);
  if (!normalizedValue) return null;

  const exactMatch = foodLookup.exact.get(normalizedValue);
  if (exactMatch) return exactMatch;

  const searchPhrases = [normalizedValue, ...(FOOD_LOOKUP_ALIASES[normalizedValue] || [])];
  const phraseMatches = foodLookup.all.filter((entry) =>
    searchPhrases.some((phrase) => {
      const phraseTokens = tokenizeFoodLookupName(phrase);
      return phraseTokens.length > 0 && phraseTokens.every((token) => entry.tokens.includes(token));
    }),
  );

  if (phraseMatches.length) {
    return phraseMatches.sort((left, right) => {
      const leftScore = scoreFoodLookupEntry(left, tokenizeFoodLookupName(searchPhrases[0]));
      const rightScore = scoreFoodLookupEntry(right, tokenizeFoodLookupName(searchPhrases[0]));
      if (rightScore !== leftScore) return rightScore - leftScore;
      return left.name.length - right.name.length;
    })[0];
  }

  const queryTokens = tokenizeFoodLookupName(normalizedValue);
  const fuzzyMatches = foodLookup.all
    .filter((entry) => queryTokens.length > 0 && queryTokens.every((token) => entry.tokens.includes(token)))
    .sort((left, right) => {
      const leftScore = scoreFoodLookupEntry(left, queryTokens);
      const rightScore = scoreFoodLookupEntry(right, queryTokens);
      if (rightScore !== leftScore) return rightScore - leftScore;
      return left.name.length - right.name.length;
    });

  return fuzzyMatches[0] || null;
}

async function getFoodLookupMap() {
  const { data, error } = await supabase
    .from('food_items')
    .select('id, name, is_verified')
    .order('is_verified', { ascending: false })
    .order('name');

  if (error) {
    throw new Error(error.message || 'Failed to load food lookup');
  }

  return buildFoodLookupMap(data || []);
}

type NutritionPlanRepairSummary = {
  planId?: string | null;
  mealIds: string[];
  totalItems: number;
  mappedItems: number;
  remainingUnmappedItems: number;
  affectedMealIds: string[];
};

async function repairNutritionPlanMappingsForMealIds(
  mealIds: string[],
): Promise<NutritionPlanRepairSummary> {
  if (!mealIds.length) {
    return {
      planId: null,
      mealIds: [],
      totalItems: 0,
      mappedItems: 0,
      remainingUnmappedItems: 0,
      affectedMealIds: [],
    };
  }

  const { data: variants, error: variantError } = await db
    .from('user_nutrition_plan_meal_variants')
    .select('id, plan_meal_id')
    .in('plan_meal_id', mealIds)
    .eq('is_active', true);

  if (variantError) {
    throw new Error(variantError.message || 'Failed to load meal variants');
  }

  const variantIds = (variants || []).map((variant: any) => variant.id);
  const variantToMeal = new Map<string, string>(
    (variants || []).map((variant: any) => [variant.id, variant.plan_meal_id]),
  );

  if (!variantIds.length) {
    return {
      planId: null,
      mealIds,
      totalItems: 0,
      mappedItems: 0,
      remainingUnmappedItems: 0,
      affectedMealIds: [],
    };
  }

  const { data: allItems, error: itemError } = await db
    .from('user_nutrition_plan_meal_variant_items')
    .select('id, variant_id, item_name, grams, food_item_id')
    .in('variant_id', variantIds);

  if (itemError) {
    throw new Error(itemError.message || 'Failed to load meal items');
  }

  const zeroGramItemIds = (allItems || [])
    .filter((item: any) => typeof item.grams === 'number' && item.grams <= 0)
    .map((item: any) => item.id);

  if (zeroGramItemIds.length) {
    const { error: deleteError } = await db
      .from('user_nutrition_plan_meal_variant_items')
      .delete()
      .in('id', zeroGramItemIds);

    if (deleteError) {
      throw new Error(deleteError.message || 'Failed to remove invalid zero-gram meal items');
    }
  }

  const unmappedItems = (allItems || []).filter((item: any) =>
    !item.food_item_id && typeof item.grams === 'number' && item.grams > 0,
  );

  if (!unmappedItems.length) {
    return {
      planId: null,
      mealIds,
      totalItems: 0,
      mappedItems: 0,
      remainingUnmappedItems: 0,
      affectedMealIds: [],
    };
  }

  const foodLookup = await getFoodLookupMap();
  let mappedItems = 0;
  const affectedMealIds = new Set<string>();

  for (const item of unmappedItems as Array<{ id: string; variant_id: string; item_name: string }>) {
    const match = findBestFoodLookupMatch(item.item_name, foodLookup);
    if (!match) continue;

    const { error: updateError } = await db
      .from('user_nutrition_plan_meal_variant_items')
      .update({ food_item_id: match.id })
      .eq('id', item.id);

    if (updateError) {
      console.error('Failed to repair meal item mapping:', updateError);
      continue;
    }

    mappedItems += 1;
    const mealId = variantToMeal.get(item.variant_id);
    if (mealId) affectedMealIds.add(mealId);
  }

  const { count: remainingUnmappedItems } = await db
    .from('user_nutrition_plan_meal_variant_items')
    .select('*', { count: 'exact', head: true })
    .in('variant_id', variantIds)
    .is('food_item_id', null);

  return {
    planId: null,
    mealIds,
    totalItems: unmappedItems.length + zeroGramItemIds.length,
    mappedItems,
    remainingUnmappedItems: remainingUnmappedItems || 0,
    affectedMealIds: Array.from(affectedMealIds),
  };
}

function getMealMappingReadiness(
  meal: Pick<NutritionPlanMeal, 'selected_variant'>,
  foodLookup: FoodLookupContext,
): Pick<NutritionPlanMeal, 'can_direct_log' | 'mapping_state' | 'unmapped_item_count'> {
  const items = (meal.selected_variant?.items || []).filter((item) => item.grams == null || item.grams > 0);

  if (!items.length) {
    return {
      can_direct_log: false,
      mapping_state: 'unmapped',
      unmapped_item_count: 0,
    };
  }

  const unmappedItems = items.filter((item) => !item.food_item_id || !item.grams || item.grams <= 0);
  if (!unmappedItems.length) {
    return {
      can_direct_log: true,
      mapping_state: 'ready',
      unmapped_item_count: 0,
    };
  }

  const repairableItems = unmappedItems.filter((item) => {
    if (!item.grams || item.grams <= 0) return false;
    return !!findBestFoodLookupMatch(item.item_name, foodLookup);
  });

  return {
    can_direct_log: false,
    mapping_state: repairableItems.length === unmappedItems.length ? 'repairable' : 'unmapped',
    unmapped_item_count: unmappedItems.length,
  };
}

function todayDate() {
  return getLocalDateKey();
}

function dateRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - Math.max(0, days - 1));
  return {
    from: getLocalDateKey(start),
    to: getLocalDateKey(end),
  };
}

async function getSelectedVariantMap(mealIds: string[]) {
  if (!mealIds.length) return new Map<string, NutritionPlanMealVariant[]>();

  await repairNutritionPlanMappingsForMealIds(mealIds);

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
    .select(WORKOUT_PLAN_DETAILS_SELECT)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch active workout plan:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return decorateWorkoutPlan(data as WorkoutPlanWithDetails);
}

export async function getWorkoutPlanById(
  userId: string,
  planId: string,
): Promise<WorkoutPlanWithDetails | null> {
  const { data, error } = await supabase
    .from('user_workout_plans')
    .select(WORKOUT_PLAN_DETAILS_SELECT)
    .eq('user_id', userId)
    .eq('id', planId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch workout plan by id:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return decorateWorkoutPlan(data as WorkoutPlanWithDetails);
}

export async function getWorkoutPlanByGenerationRun(
  userId: string,
  generationRunId: string,
): Promise<WorkoutPlanWithDetails | null> {
  const { data, error } = await supabase
    .from('user_workout_plans')
    .select(WORKOUT_PLAN_DETAILS_SELECT)
    .eq('user_id', userId)
    .eq('generation_run_id', generationRunId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch workout plan by generation run:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return decorateWorkoutPlan(data as WorkoutPlanWithDetails);
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

  return data ? decorateNutritionPlan(data as NutritionPlanWithDetails) : null;
}

export async function getNutritionPlanByGenerationRun(
  userId: string,
  generationRunId: string,
): Promise<NutritionPlanWithDetails | null> {
  const { data, error } = await supabase
    .from('user_nutrition_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('generation_run_id', generationRunId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch nutrition plan by generation run:', error);
    return null;
  }

  return data ? decorateNutritionPlan(data as NutritionPlanWithDetails) : null;
}

export async function repairNutritionPlanMappings(planId: string): Promise<NutritionPlanRepairSummary> {
  const { data: meals, error } = await db
    .from('user_nutrition_plan_meals')
    .select('id')
    .eq('plan_id', planId);

  if (error) {
    throw new Error(error.message || 'Failed to load plan meals');
  }

  const mealIds = (meals || []).map((meal: any) => meal.id);
  const summary = await repairNutritionPlanMappingsForMealIds(mealIds);
  return {
    ...summary,
    planId,
  };
}

export async function getNutritionPlanById(
  userId: string,
  planId: string,
): Promise<NutritionPlanWithDetails | null> {
  const { data, error } = await supabase
    .from('user_nutrition_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('id', planId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch nutrition plan by id:', error);
    return null;
  }

  return data ? decorateNutritionPlan(data as NutritionPlanWithDetails) : null;
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

  const mealsRaw = (mealRows || []) as any[];
  const mealIds = mealsRaw.map((meal) => meal.id);
  const variantMap = await getSelectedVariantMap(mealIds);
  const foodLookup = await getFoodLookupMap();

  const meals: NutritionPlanMeal[] = mealsRaw.map((meal) => {
    const variants = variantMap.get(meal.id) || [];
    const selected = variants.find((variant) => variant.id === meal.selected_variant_id)
      || variants.find((variant) => variant.variant_type === 'default')
      || null;
    const readiness = getMealMappingReadiness({ selected_variant: selected }, foodLookup);

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
      can_direct_log: readiness.can_direct_log,
      mapping_state: readiness.mapping_state,
      unmapped_item_count: readiness.unmapped_item_count,
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
  const selectedVariant = variants.find((variant) => variant.id === meal.selected_variant_id)
    || variants.find((variant) => variant.variant_type === 'default')
    || null;
  const foodLookup = await getFoodLookupMap();
  const readiness = getMealMappingReadiness({ selected_variant: selectedVariant }, foodLookup);

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
    selected_variant: selectedVariant,
    variants,
    can_direct_log: readiness.can_direct_log,
    mapping_state: readiness.mapping_state,
    unmapped_item_count: readiness.unmapped_item_count,
  };
}

/**
 * Apply swap/customization to nutrition meal plan and return updated day totals.
 */
export async function applyMealPlanChange(input: ApplyMealPlanChangeInput): Promise<NutritionPlanDayDetails> {
  const { data, parsedError, rawError } = await invokeFunction(() =>
    supabase.functions.invoke('apply-meal-plan-change', {
      body: {
        plan_meal_id: input.planMealId,
        operation: input.operation,
        variant_id: input.variantId,
        name: input.name,
        description: input.description,
        items: input.items,
      },
    })
  );

  if (rawError) {
    console.error('apply-meal-plan-change error:', { rawError, parsedError });
    throw new Error(parsedError?.error || parsedError?.message || rawError?.message || 'Failed to update meal plan');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to update meal plan');
  }

  const meal = await getNutritionPlanMeal(input.planMealId);
  if (!meal) throw new Error('Meal not found after change');

  const userId = await getClerkUserId();

  const day = await getNutritionPlanMealsForDay(
    userId,
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
  const { data, parsedError, rawError } = await invokeFunction(() =>
    supabase.functions.invoke('apply-meal-plan-batch-change', {
      body: {
        plan_id: input.planId,
        day_of_week: input.dayOfWeek,
        meals: input.meals,
      },
    })
  );

  if (rawError) {
    console.error('apply-meal-plan-batch-change error:', { rawError, parsedError });
    throw new Error(parsedError?.error || parsedError?.message || rawError?.message || 'Failed to apply meal batch change');
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

  return (data || []).filter((plan) => !isPreviewWorkoutPlanRecord(plan));
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

  return ((data || []) as NutritionPlan[]).filter((plan) => !isPreviewNutritionPlanRecord(plan));
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

  const tier = getSubscriptionTier(subscription?.plan_type);
  const regenerationsLimit = getFeatureLimit('plan_regenerations', tier);
  const isUnlimited = !Number.isFinite(regenerationsLimit);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: recentRuns } = await supabase
    .from('plan_generation_runs')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', todayStart.toISOString());

  const regenerationsToday = recentRuns?.length || 0;

  if (isUnlimited) {
    return {
      regenerationsToday,
      regenerationsLimit: -1,
      tier,
      isUnlimited: true,
      isElite: tier === 'elite',
      remainingRegenerations: -1,
    };
  }

  return {
    regenerationsToday,
    regenerationsLimit: Number(regenerationsLimit),
    tier,
    isUnlimited: false,
    isElite: tier === 'elite',
    remainingRegenerations: Math.max(0, regenerationsLimit - regenerationsToday),
  };
}

/**
 * Check if user can regenerate plans (rate limit check)
 */
export async function canRegeneratePlans(userId: string): Promise<boolean> {
  const usage = await getPlanRegenerationUsage(userId);
  return usage.isUnlimited || usage.remainingRegenerations > 0;
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
      `Plan regeneration limit reached (${usage.regenerationsLimit} per day on ${getTierLabel(usage.tier)}). Please try again later.`,
    );
  }

  const token = await getClerkSupabaseToken();

  const { data, parsedError, rawError } = await invokeFunction(() =>
    supabase.functions.invoke('generate-user-plans', {
      headers: { Authorization: `Bearer ${token}` },
      body: { user_id: userId, generation_version: 'v2', ...options },
    })
  );

  if (rawError) {
    console.error('Plan regeneration error:', { rawError, parsedError });
    throw new Error(parsedError?.error || parsedError?.message || rawError?.message || 'Failed to regenerate plans. Please try again.');
  }

  if (data?.success === false) {
    console.error('Edge Function returned error:', data.error, data.details);
    throw new Error(data.error || 'Plan generation failed. Please try again.');
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
  const { data: targetPlan } = await supabase
    .from('user_nutrition_plans')
    .select('id, name, lifecycle_state')
    .eq('id', planId)
    .eq('user_id', userId)
    .maybeSingle();

  await supabase
    .from('user_nutrition_plans')
    .update({
      is_active: false,
      ...(targetPlan?.lifecycle_state ? { lifecycle_state: 'archived' } : {}),
    })
    .eq('user_id', userId);

  const updates: Record<string, unknown> = { is_active: true };
  if (targetPlan?.lifecycle_state) {
    updates.lifecycle_state = 'live';
    updates.replaces_plan_id = null;
    updates.name = normalizePreviewNutritionPlanName(targetPlan.name);
  }

  const { error } = await supabase
    .from('user_nutrition_plans')
    .update(updates)
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
            gif_url?: string | null;
            image_url?: string | null;
            poster_url?: string | null;
            has_media?: boolean;
            source_provider?: string | null;
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
            video_url,
            gif_url,
            image_url,
            poster_url,
            has_media,
            source_provider
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
  const shouldBypassRegenerationLimit = options.generation_mode === 'initial';
  const canRegenerate = shouldBypassRegenerationLimit ? true : await canRegeneratePlans(userId);
  if (!canRegenerate) {
    const usage = await getPlanRegenerationUsage(userId);
    throw new Error(
      `Plan regeneration limit reached (${usage.regenerationsLimit} per day on ${getTierLabel(usage.tier)}). Please try again later.`,
    );
  }

  const token = await getClerkSupabaseToken();

  // Pre-flight: verify required DB rows exist AND content is valid before invoking
  // the Edge Function. This surfaces actionable errors immediately rather than letting
  // the Edge Function fail deep in generation with an opaque 500.
  // Fix 1: fetch content (not just existence) so we can validate field-level completeness.
  const [profileCheck, answersCheck, targetsCheck] = await Promise.all([
    supabase.from('profiles').select('id').eq('id', userId).single(),
    supabase.from('onboarding_answers').select('user_id, answers').eq('user_id', userId).single(),
    supabase.from('user_targets').select('user_id, calories').eq('user_id', userId).single(),
  ]);

  if (profileCheck.error || !profileCheck.data) {
    throw new Error('Your profile is not set up. Please sign out and complete onboarding again.');
  }
  if (answersCheck.error || !answersCheck.data) {
    throw new Error('Your onboarding answers were not saved. Please go back and complete the questionnaire.');
  }
  if (targetsCheck.error || !targetsCheck.data) {
    throw new Error('Your nutrition targets were not calculated. Please go back and complete onboarding.');
  }

  // Fix 1: Content validation — assert required onboarding answer fields are present.
  const rawAnswers = (answersCheck.data as any)?.answers;
  if (rawAnswers != null) {
    const parsed: Record<string, any> = typeof rawAnswers === 'string'
      ? JSON.parse(rawAnswers)
      : rawAnswers;
    const requiredAnswerFields = [
      'goal_type',
      'experience_level',
      'training_days_per_week',
      'equipment_access',
    ] as const;
    for (const field of requiredAnswerFields) {
      if (parsed[field] == null) {
        const err = new Error(
          `Onboarding is incomplete: "${field}" is missing. Please go back and re-answer that step.`,
        );
        (err as any).step = 'content_validation';
        (err as any).details = `Required onboarding field "${field}" is null or absent from your saved answers.`;
        throw err;
      }
    }
  }

  // Fix 1: Assert calories > 0 before wasting an Edge Function invocation.
  const preflightCalories = (targetsCheck.data as any)?.calories;
  if (typeof preflightCalories !== 'number' || preflightCalories <= 0) {
    const err = new Error(
      'Your nutrition targets have 0 calories. Please go back and re-enter your body stats (age, weight, height, activity level).',
    );
    (err as any).step = 'content_validation';
    (err as any).details = `user_targets.calories is ${preflightCalories}. This usually means vital stats were not saved correctly.`;
    throw err;
  }

  // Generate correlation ID for end-to-end tracing
  const correlationId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  // Fix 11: Retry configuration — up to 2 total attempts with 1.5 s delay.
  // 4xx errors are not retried (client-side problem, retrying won't help).
  const MAX_INVOKE_ATTEMPTS = 2;
  const RETRY_DELAY_MS = 1500;

  let lastInvokeErr: any = null;

  for (let attempt = 1; attempt <= MAX_INVOKE_ATTEMPTS; attempt++) {
    try {
      if (attempt > 1) {
        console.warn(
          `[PlanService] [${correlationId}] Retry attempt ${attempt}/${MAX_INVOKE_ATTEMPTS} after ${RETRY_DELAY_MS}ms...`,
        );
        await new Promise<void>((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }

      console.log(
        `[PlanService] [${correlationId}] Invoking generate-user-plans (attempt ${attempt}/${MAX_INVOKE_ATTEMPTS}) for user ${userId}`,
      );

      const { data, error } = await supabase.functions.invoke('generate-user-plans', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Correlation-Id': correlationId,
        },
        body: {
          user_id: userId,
          plan_type: planType,
          generation_version: options.generation_version || 'v2',
          correlation_id: correlationId,
          ...options,
        },
      });

      if (error) {
        // @supabase/functions-js v2.91+ returns data=null on non-2xx; the raw Response
        // object is in error.context. Parse it to recover the Edge Function's JSON body.
        let parsedErrorBody: any = data; // may already be populated in older SDK versions
        const contextResponse = (error as any)?.context;
        if (!parsedErrorBody && contextResponse && typeof contextResponse.json === 'function') {
          try {
            parsedErrorBody = await (contextResponse as Response).json();
          } catch {
            // Non-JSON response body — fall through to generic error message
          }
        }

        const actualError = parsedErrorBody?.error || parsedErrorBody?.message || (data as any)?.error || error.message || 'Plan generation failed';
        const errorStep = parsedErrorBody?.step || (data as any)?.step || 'unknown';
        const errorRequestId = parsedErrorBody?.requestId || parsedErrorBody?.request_id || (data as any)?.requestId || (data as any)?.request_id || correlationId;
        const errorDetails = parsedErrorBody?.details || (data as any)?.details;
        const errorCode = parsedErrorBody?.error_code || parsedErrorBody?.errorCode || (data as any)?.error_code || (data as any)?.errorCode;
        const errorContext = parsedErrorBody?.error_context || parsedErrorBody?.errorContext || (data as any)?.error_context || (data as any)?.errorContext;
        const httpStatus: number = contextResponse?.status || (error as any)?.status || (error as any)?.code || 0;

        // Always log raw response body on non-2xx before anything else.
        console.error(`[PlanService] [${correlationId}] Edge Function non-2xx (attempt ${attempt}):`, {
          supabaseError: error.message,
          httpStatus,
          rawData: data,
          parsedErrorBody,
          functionError: actualError,
          errorCode,
          step: errorStep,
          requestId: errorRequestId,
          details: errorDetails,
          errorContext,
        });

        const enhancedError = new Error(actualError);
        (enhancedError as any).step = errorStep;
        (enhancedError as any).requestId = errorRequestId;
        (enhancedError as any).details = errorDetails;
        (enhancedError as any).errorCode = errorCode;
        (enhancedError as any).errorContext = errorContext;
        (enhancedError as any).httpStatus = httpStatus;

        // Fix 11: Don't retry 4xx — those are client errors.
        if (httpStatus >= 400 && httpStatus < 500) {
          throw enhancedError;
        }

        // Network / 5xx — retry if we have attempts left.
        if (attempt < MAX_INVOKE_ATTEMPTS) {
          lastInvokeErr = enhancedError;
          continue;
        }

        throw enhancedError;
      }

      // Handle structured error responses from Edge Function (2xx with success:false).
      if (data?.success === false) {
        const errorMessage = data.error || data.message || 'Plan generation failed. Please try again.';
        const errorStep = data.step || 'unknown';
        const errorRequestId = data.requestId || data.request_id || correlationId;
        const errorCode = data.error_code || data.errorCode;
        const errorContext = data.error_context || data.errorContext;

        console.error(`[PlanService] [${correlationId}] Edge Function returned success:false:`, {
          error: errorMessage,
          errorCode,
          step: errorStep,
          requestId: errorRequestId,
          details: data.details,
          errorContext,
        });

        const enhancedError = new Error(errorMessage);
        (enhancedError as any).step = errorStep;
        (enhancedError as any).requestId = errorRequestId;
        (enhancedError as any).details = data.details;
        (enhancedError as any).errorCode = errorCode;
        (enhancedError as any).errorContext = errorContext;
        // success:false responses are application-level errors — don't retry.
        throw enhancedError;
      }

      console.log(`[PlanService] [${correlationId}] Plan generation successful:`, {
        runId: data?.runId || data?.run_id,
        hasWorkoutPlan: !!data?.workoutPlanId,
        hasNutritionPlan: !!data?.nutritionPlanId,
      });

      return {
        runId: data?.runId || data?.run_id,
        workoutPlanId: data?.workoutPlanId || data?.workout_plan_id,
        nutritionPlanId: data?.nutritionPlanId || data?.nutrition_plan_id,
        warnings: data?.warnings || [],
      };
    } catch (err: any) {
      // If this is a 4xx or application-level error, don't retry — rethrow immediately.
      const httpStatus = err?.httpStatus || 0;
      const isClientError = httpStatus >= 400 && httpStatus < 500;
      const isAppLevelError = !!(err.step && err.requestId);
      if (isClientError || isAppLevelError || attempt >= MAX_INVOKE_ATTEMPTS) {
        console.error(`[PlanService] [${correlationId}] Plan generation failed (attempt ${attempt}):`, err);

        // If it's already an enhanced error, re-throw it.
        if (err.step && err.requestId) {
          throw err;
        }

        // Otherwise wrap it with correlation ID.
        const wrappedError = new Error(
          `Failed to generate plans: ${err.message || 'Unknown error'} (requestId: ${correlationId})`,
        );
        (wrappedError as any).requestId = correlationId;
        (wrappedError as any).originalError = err;
        throw wrappedError;
      }

      // Network/transient error, retry
      lastInvokeErr = err;
      console.warn(`[PlanService] [${correlationId}] Transient error on attempt ${attempt}, will retry:`, err.message);
    }
  }

  // Should not reach here, but if somehow loop exhausted without return/throw:
  const finalError = new Error(
    `Plan generation failed after ${MAX_INVOKE_ATTEMPTS} attempts: ${lastInvokeErr?.message || 'Unknown error'} (requestId: ${correlationId})`,
  );
  (finalError as any).requestId = correlationId;
  (finalError as any).originalError = lastInvokeErr;
  throw finalError;
}

export async function buildNutritionPlanComparableSnapshot(
  userId: string,
  plan: NutritionPlanWithDetails,
): Promise<NutritionPlanComparable> {
  const { data: mealRows, error: mealError } = await db
    .from('user_nutrition_plan_meals')
    .select('*')
    .eq('plan_id', plan.id)
    .order('day_of_week', { ascending: true });

  if (mealError) {
    console.error('Failed to fetch nutrition plan meals for diff:', mealError);
    throw new Error('Failed to load nutrition plan meals');
  }

  const mealsRaw = (mealRows || []) as Array<any>;
  const variantMap = await getSelectedVariantMap(mealsRaw.map((meal) => meal.id));
  const foodLookup = await getFoodLookupMap();

  const dayMeals = new Map<number, NutritionPlanMeal[]>();
  for (const meal of mealsRaw) {
    const variants = variantMap.get(meal.id) || [];
    const selected = variants.find((variant) => variant.id === meal.selected_variant_id)
      || variants.find((variant) => variant.variant_type === 'default')
      || null;
    const readiness = getMealMappingReadiness({ selected_variant: selected }, foodLookup);
    const dayOfWeek = Number(meal.day_of_week);
    if (!Number.isFinite(dayOfWeek)) continue;

    const meals = dayMeals.get(dayOfWeek) || [];
    meals.push({
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
      can_direct_log: readiness.can_direct_log,
      mapping_state: readiness.mapping_state,
      unmapped_item_count: readiness.unmapped_item_count,
    });
    dayMeals.set(dayOfWeek, meals);
  }

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

  const days = Array.from(dayMeals.entries())
    .sort(([left], [right]) => left - right)
    .map(([dayOfWeek, meals]) => {
      const orderedMeals = [...meals].sort(
        (left, right) => (MEAL_SLOT_INDEX[left.meal_slot] ?? 99) - (MEAL_SLOT_INDEX[right.meal_slot] ?? 99),
      );
      const computed = computeDayTotalsFromMeals(orderedMeals, targets);
      return {
        dayOfWeek,
        meals: orderedMeals.map((meal) => ({
          id: meal.id,
          meal_slot: meal.meal_slot,
          name: meal.name,
          target_calories: meal.target_calories,
          target_protein: meal.target_protein,
          target_carbs: meal.target_carbs,
          target_fat: meal.target_fat,
          selected_variant: meal.selected_variant
            ? {
                id: meal.selected_variant.id,
                name: meal.selected_variant.name,
                items: meal.selected_variant.items.map((item) => ({
                  item_name: item.item_name,
                  grams: item.grams,
                  calories: item.calories,
                  protein: item.protein,
                  carbs: item.carbs,
                  fat: item.fat,
                })),
              }
            : null,
        })),
        totals: computed.totals,
        targets,
        delta: computed.delta,
      };
    });

  return {
    id: plan.id,
    name: plan.name,
    days,
  };
}

export async function getLatestNutritionPlanPreview(
  userId: string,
  replacesPlanId?: string | null,
): Promise<NutritionPlanWithDetails | null> {
  const { data, error } = await supabase
    .from('user_nutrition_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', false)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Failed to fetch nutrition plan preview:', error);
    return null;
  }

  const preview = ((data || []) as NutritionPlanWithDetails[]).find((plan) => {
    if (!isPreviewNutritionPlanRecord(plan)) return false;
    if (replacesPlanId && (plan as any).replaces_plan_id && (plan as any).replaces_plan_id !== replacesPlanId) {
      return false;
    }
    return true;
  });

  return preview ? decorateNutritionPlan(preview) : null;
}

export async function generateNutritionPlanPreview(
  userId: string,
  nutritionRegeneration: NutritionRegenerationRequest,
): Promise<NutritionPlanPreviewResult> {
  const currentPlan = await getActiveNutritionPlan(userId);
  if (!currentPlan) {
    throw new Error('No active nutrition plan to regenerate');
  }

  const token = await getClerkSupabaseToken();

  const { data, parsedError, rawError } = await invokeFunction(() =>
    supabase.functions.invoke('generate-user-plans', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        user_id: userId,
        plan_type: 'nutrition',
        generation_version: 'v2',
        generation_horizon_days: { nutrition: 7 },
        generation_mode: 'regenerate',
        activation_mode: 'preview',
        nutrition_regeneration: nutritionRegeneration,
      } satisfies PlanGenerationOptions & Record<string, unknown>,
    })
  );

  if (rawError) {
    console.error('Nutrition preview generation failed:', { rawError, parsedError });
    throw new Error(parsedError?.error || parsedError?.message || rawError?.message || 'Failed to generate nutrition preview');
  }

  if (data?.success === false) {
    console.error('Edge Function returned error:', data.error, data.details);
    throw new Error(data.error || 'Failed to generate nutrition preview');
  }

  const runId = data?.runId || data?.run_id;
  const validationStatus = data?.status || 'preview_ready';
  const warnings = data?.warnings || [];

  if (validationStatus === 'validation_failed') {
    return {
      status: 'validation_failed',
      runId,
      warnings,
      message: data?.message || 'We need more direction to build a meaningfully different nutrition plan.',
    };
  }

  const previewPlanId = data?.nutritionPlanId || data?.nutrition_plan_id;
  if (!previewPlanId) {
    throw new Error('Preview generation returned no nutrition plan');
  }

  const previewPlan = await getNutritionPlanById(userId, previewPlanId);
  if (!previewPlan) {
    throw new Error('Preview nutrition plan could not be loaded');
  }

  const [currentComparable, previewComparable] = await Promise.all([
    buildNutritionPlanComparableSnapshot(userId, currentPlan),
    buildNutritionPlanComparableSnapshot(userId, previewPlan),
  ]);

  const diff = buildNutritionPlanDiff({
    currentPlan: currentComparable,
    previewPlan: previewComparable,
  });

  if (!diff.isMateriallyDifferent) {
    await discardNutritionPlanPreview(previewPlanId);
    return {
      status: 'validation_failed',
      runId,
      warnings,
      message: 'We need more direction to build a meaningfully different nutrition plan.',
    };
  }

  return {
    runId,
    previewPlanId,
    currentPlan,
    previewPlan,
    diff,
    warnings,
  };
}

export async function applyNutritionPlanPreview(previewPlanId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('apply_nutrition_plan_preview', {
      preview_plan_id: previewPlanId,
    });
    if (!error) {
      return;
    }
    console.warn('apply_nutrition_plan_preview RPC unavailable, using fallback:', error.message);
  } catch (error) {
    console.warn('apply_nutrition_plan_preview RPC failed, using fallback:', error);
  }

  const userId = await getAuthenticatedUserId();
  const { data: previewPlan, error: previewError } = await supabase
    .from('user_nutrition_plans')
    .select('*')
    .eq('id', previewPlanId)
    .eq('user_id', userId)
    .maybeSingle();

  if (previewError || !previewPlan || !isPreviewNutritionPlanRecord(previewPlan)) {
    throw new Error(previewError?.message || 'Nutrition preview not found');
  }

  await supabase
    .from('user_nutrition_plans')
    .update({
      is_active: false,
      ...(previewPlan.lifecycle_state ? { lifecycle_state: 'archived' } : {}),
    })
    .eq('user_id', userId)
    .eq('is_active', true);

  const previewUpdates: Record<string, unknown> = {
    is_active: true,
    name: normalizePreviewNutritionPlanName(previewPlan.name),
  };

  if (previewPlan.lifecycle_state) {
    previewUpdates.lifecycle_state = 'live';
    previewUpdates.replaces_plan_id = null;
  }

  const { error: activateError } = await supabase
    .from('user_nutrition_plans')
    .update(previewUpdates)
    .eq('id', previewPlanId)
    .eq('user_id', userId);

  if (activateError) {
    throw new Error(activateError.message || 'Failed to activate nutrition preview');
  }
}

export async function discardNutritionPlanPreview(previewPlanId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('discard_nutrition_plan_preview', {
      preview_plan_id: previewPlanId,
    });
    if (!error) {
      return;
    }
    console.warn('discard_nutrition_plan_preview RPC unavailable, using fallback:', error.message);
  } catch (error) {
    console.warn('discard_nutrition_plan_preview RPC failed, using fallback:', error);
  }

  const userId = await getAuthenticatedUserId();
  const { data: previewPlan, error: previewError } = await supabase
    .from('user_nutrition_plans')
    .select('*')
    .eq('id', previewPlanId)
    .eq('user_id', userId)
    .maybeSingle();

  if (previewError || !previewPlan || !isPreviewNutritionPlanRecord(previewPlan)) {
    throw new Error(previewError?.message || 'Nutrition preview not found');
  }

  const { error: deleteError } = await supabase
    .from('user_nutrition_plans')
    .delete()
    .eq('id', previewPlanId)
    .eq('user_id', userId);

  if (deleteError) {
    throw new Error(deleteError.message || 'Failed to discard nutrition preview');
  }
}

export async function getEditableNutritionPlanContext(userId: string): Promise<EditableNutritionPlanContext> {
  const livePlan = await getActiveNutritionPlan(userId);
  const previewPlan = await getLatestNutritionPlanPreview(userId, livePlan?.id);

  if (previewPlan) {
    return {
      livePlan,
      previewPlan,
      editablePlan: previewPlan,
      source: 'preview',
    };
  }

  if (livePlan) {
    return {
      livePlan,
      previewPlan: null,
      editablePlan: livePlan,
      source: 'live',
    };
  }

  return {
    livePlan: null,
    previewPlan: null,
    editablePlan: null,
    source: 'none',
  };
}

export async function getLatestWorkoutPlanPreview(
  userId: string,
  replacesPlanId?: string | null,
): Promise<WorkoutPlanWithDetails | null> {
  const { data, error } = await supabase
    .from('user_workout_plans')
    .select(WORKOUT_PLAN_DETAILS_SELECT)
    .eq('user_id', userId)
    .eq('is_active', false)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Failed to fetch workout plan preview:', error);
    return null;
  }

  const preview = ((data || []) as WorkoutPlanWithDetails[]).find((plan) => {
    if (!isPreviewWorkoutPlanRecord(plan)) return false;
    if (replacesPlanId && (plan as any).replaces_plan_id && (plan as any).replaces_plan_id !== replacesPlanId) {
      return false;
    }
    return true;
  });

  return preview ? decorateWorkoutPlan(preview) : null;
}

export async function generateWorkoutPlanPreview(
  userId: string,
  workoutRegeneration: WorkoutRegenerationRequest,
): Promise<WorkoutPlanPreviewResult> {
  const currentPlan = await getActiveWorkoutPlan(userId);
  if (!currentPlan) {
    throw new Error('No active workout plan to regenerate');
  }

  const token = await getClerkSupabaseToken();

  const { data, parsedError, rawError } = await invokeFunction(() =>
    supabase.functions.invoke('generate-user-plans', {
      headers: { Authorization: `Bearer ${token}` },
      body: {
        user_id: userId,
        plan_type: 'workout',
        generation_version: 'v2',
        generation_horizon_days: { workout: 28 },
        generation_mode: 'regenerate',
        activation_mode: 'preview',
        workout_regeneration: workoutRegeneration,
      } satisfies PlanGenerationOptions & Record<string, unknown>,
    })
  );

  if (rawError) {
    console.error('Workout preview generation failed:', { rawError, parsedError });
    throw new Error(parsedError?.error || parsedError?.message || rawError?.message || 'Failed to generate workout preview');
  }

  if (data?.success === false) {
    console.error('Edge Function returned error:', data.error, data.details);
    throw new Error(data.error || 'Failed to generate workout preview');
  }

  const runId = data?.runId || data?.run_id;
  const validationStatus = data?.status || 'preview_ready';
  const warnings = data?.warnings || [];

  if (validationStatus === 'validation_failed') {
    return {
      status: 'validation_failed',
      runId,
      warnings,
      message: data?.message || 'We need more direction to build a meaningfully different plan.',
    };
  }

  const previewPlanId = data?.workoutPlanId || data?.workout_plan_id;
  if (!previewPlanId) {
    throw new Error('Preview generation returned no workout plan');
  }

  const previewPlan = await getWorkoutPlanById(userId, previewPlanId);
  if (!previewPlan) {
    throw new Error('Preview plan could not be loaded');
  }

  return {
    runId,
    previewPlanId,
    currentPlan,
    previewPlan,
    diff: buildWorkoutPlanDiff({
      currentPlan: {
        id: currentPlan.id,
        familyKey: currentPlan.programMeta?.programFamilyKey || currentPlan.program_family_key,
        progressionModel: currentPlan.programMeta?.progressionModel || currentPlan.progression_model,
        daysPerWeek: currentPlan.days_per_week,
        weeklyLayout: currentPlan.programMeta?.weeklyLayout,
        days: currentPlan.days.map((day) => ({
          id: day.id,
          name: day.name,
          focus: day.focus,
          estimatedDurationMin: day.estimated_duration_min || null,
          exercises: day.exercises.map((exercise) => ({
            exerciseId: exercise.exercise_id,
            name: exercise.exercise?.name || null,
          })),
        })),
      },
      previewPlan: {
        id: previewPlan.id,
        familyKey: previewPlan.programMeta?.programFamilyKey || previewPlan.program_family_key,
        progressionModel: previewPlan.programMeta?.progressionModel || previewPlan.progression_model,
        daysPerWeek: previewPlan.days_per_week,
        weeklyLayout: previewPlan.programMeta?.weeklyLayout,
        days: previewPlan.days.map((day) => ({
          id: day.id,
          name: day.name,
          focus: day.focus,
          estimatedDurationMin: day.estimated_duration_min || null,
          exercises: day.exercises.map((exercise) => ({
            exerciseId: exercise.exercise_id,
            name: exercise.exercise?.name || null,
          })),
        })),
      },
      minorRefinement: !!workoutRegeneration.keep_current_split && !workoutRegeneration.start_fresh,
    }),
    warnings,
  };
}

export async function getWorkoutPlanCoherenceReport(
  planId: string,
): Promise<WorkoutPlanCoherenceReport> {
  return loadWorkoutPlanCoherenceReport(planId);
}

async function getAuthenticatedUserId() {
  try {
    return await getClerkUserId();
  } catch (err: any) {
    throw new Error('Authentication required. Please sign in again.');
  }
}

export async function repairWorkoutPlanCoherencePreview(
  planId: string,
): Promise<WorkoutPlanPreviewResult> {
  const userId = await getAuthenticatedUserId();
  const currentPlan = await getWorkoutPlanById(userId, planId);

  if (!currentPlan) {
    throw new Error('Workout plan not found');
  }

  const token = await getClerkSupabaseToken();

  const { data, parsedError, rawError } = await invokeFunction(() =>
    supabase.functions.invoke('repair-workout-plan-coherence', {
      headers: { Authorization: `Bearer ${token}` },
      body: { plan_id: planId, mode: 'preview' },
    })
  );

  if (rawError) {
    console.error('Workout coherence repair preview failed:', { rawError, parsedError });
    throw new Error(parsedError?.error || parsedError?.message || rawError?.message || 'Failed to build repair preview');
  }

  if (data?.status === 'no_violations') {
    return {
      status: 'validation_failed',
      runId: 'repair-noop',
      message: 'This workout plan does not currently need a repair preview.',
      warnings: [],
    };
  }

  const previewPlanId = data?.workoutPlanId || data?.workout_plan_id;
  if (!previewPlanId) {
    throw new Error(data?.error || 'Repair preview returned no workout plan');
  }

  const previewPlan = await getWorkoutPlanById(userId, previewPlanId);
  if (!previewPlan) {
    throw new Error('Repair preview plan could not be loaded');
  }

  return {
    runId: data?.runId || data?.run_id || 'repair-preview',
    previewPlanId,
    currentPlan,
    previewPlan,
    diff: buildWorkoutPlanDiff({
      currentPlan: {
        id: currentPlan.id,
        familyKey: currentPlan.programMeta?.programFamilyKey || currentPlan.program_family_key,
        progressionModel: currentPlan.programMeta?.progressionModel || currentPlan.progression_model,
        daysPerWeek: currentPlan.days_per_week,
        weeklyLayout: currentPlan.programMeta?.weeklyLayout,
        days: currentPlan.days.map((day) => ({
          id: day.id,
          name: day.name,
          focus: day.focus,
          estimatedDurationMin: day.estimated_duration_min || null,
          exercises: day.exercises.map((exercise) => ({
            exerciseId: exercise.exercise_id,
            name: exercise.exercise?.name || null,
          })),
        })),
      },
      previewPlan: {
        id: previewPlan.id,
        familyKey: previewPlan.programMeta?.programFamilyKey || previewPlan.program_family_key,
        progressionModel: previewPlan.programMeta?.progressionModel || previewPlan.progression_model,
        daysPerWeek: previewPlan.days_per_week,
        weeklyLayout: previewPlan.programMeta?.weeklyLayout,
        days: previewPlan.days.map((day) => ({
          id: day.id,
          name: day.name,
          focus: day.focus,
          estimatedDurationMin: day.estimated_duration_min || null,
          exercises: day.exercises.map((exercise) => ({
            exerciseId: exercise.exercise_id,
            name: exercise.exercise?.name || null,
          })),
        })),
      },
      minorRefinement: false,
    }),
    warnings: data?.warnings || [],
  };
}

export async function applyWorkoutPlanPreview(previewPlanId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('apply_workout_plan_preview', {
      preview_plan_id: previewPlanId,
    });
    if (!error) {
      return;
    }
    console.warn('apply_workout_plan_preview RPC unavailable, using fallback:', error.message);
  } catch (error) {
    console.warn('apply_workout_plan_preview RPC failed, using fallback:', error);
  }

  const userId = await getAuthenticatedUserId();
  const { data: previewPlan, error: previewError } = await supabase
    .from('user_workout_plans')
    .select('*')
    .eq('id', previewPlanId)
    .eq('user_id', userId)
    .maybeSingle();

  if (previewError || !previewPlan || !isPreviewWorkoutPlanRecord(previewPlan)) {
    throw new Error(previewError?.message || 'Workout preview not found');
  }

  await supabase
    .from('user_workout_plans')
    .update({
      is_active: false,
      ...(previewPlan.lifecycle_state ? { lifecycle_state: 'archived' } : {}),
    })
    .eq('user_id', userId)
    .eq('is_active', true);

  const previewUpdates: Record<string, unknown> = {
    is_active: true,
    name: normalizePreviewWorkoutPlanName(previewPlan.name),
  };

  if (previewPlan.lifecycle_state) {
    previewUpdates.lifecycle_state = 'live';
    previewUpdates.replaces_plan_id = null;
  }

  const { error: activateError } = await supabase
    .from('user_workout_plans')
    .update(previewUpdates)
    .eq('id', previewPlanId)
    .eq('user_id', userId);

  if (activateError) {
    throw new Error(activateError.message || 'Failed to activate workout preview');
  }
}

export async function discardWorkoutPlanPreview(previewPlanId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('discard_workout_plan_preview', {
      preview_plan_id: previewPlanId,
    });
    if (!error) {
      return;
    }
    console.warn('discard_workout_plan_preview RPC unavailable, using fallback:', error.message);
  } catch (error) {
    console.warn('discard_workout_plan_preview RPC failed, using fallback:', error);
  }

  const userId = await getAuthenticatedUserId();
  const { data: previewPlan, error: previewError } = await supabase
    .from('user_workout_plans')
    .select('*')
    .eq('id', previewPlanId)
    .eq('user_id', userId)
    .maybeSingle();

  if (previewError || !previewPlan || !isPreviewWorkoutPlanRecord(previewPlan)) {
    throw new Error(previewError?.message || 'Workout preview not found');
  }

  const { error: deleteError } = await supabase
    .from('user_workout_plans')
    .delete()
    .eq('id', previewPlanId)
    .eq('user_id', userId);

  if (deleteError) {
    throw new Error(deleteError.message || 'Failed to discard workout preview');
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

  if (planType === 'workout') {
    return ((data || []) as WorkoutPlan[]).filter((plan) => !isPreviewWorkoutPlanRecord(plan));
  }

  return ((data || []) as NutritionPlan[]).filter((plan) => !isPreviewNutritionPlanRecord(plan));
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
      .select('id, day_number, name, focus, day_type, estimated_duration_min')
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

export async function getGenerationRun(
  userId: string,
  runId: string,
): Promise<PlanGenerationRun | null> {
  const { data, error } = await supabase
    .from('plan_generation_runs')
    .select('*')
    .eq('user_id', userId)
    .eq('id', runId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch generation run:', error);
    return null;
  }

  return (data || null) as PlanGenerationRun | null;
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
      .select('id, day_number, name, focus, day_type, estimated_duration_min')
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
 * Get workout schedule entries for a date range by specific plan ID.
 * This allows fetching schedule for preview or non-active plans.
 */
export async function getWorkoutScheduleByPlanId(
  planId: string,
  startDate: string,
  endDate: string,
): Promise<WorkoutScheduleEntry[]> {
  const { data, error } = await db
    .from('user_workout_plan_schedule')
    .select('id, plan_id, plan_day_id, scheduled_date, session_type, status, original_date, completed_session_id, notes')
    .eq('plan_id', planId)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .order('scheduled_date', { ascending: true });

  if (error) {
    console.error('Failed to fetch workout schedule by plan ID:', error);
    return [];
  }

  const entries = (data || []) as WorkoutScheduleEntry[];
  const dayIds = entries.map((entry) => entry.plan_day_id).filter(Boolean) as string[];

  const dayMap = new Map<string, { id: string; day_number: number; name: string; focus: string | null }>();
  if (dayIds.length) {
    const { data: dayRows } = await supabase
      .from('user_workout_plan_days')
      .select('id, day_number, name, focus, day_type, estimated_duration_min')
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
  const { data, parsedError, rawError } = await invokeFunction(() =>
    supabase.functions.invoke('reschedule-workout-day', {
      body: {
        plan_id: input.planId,
        schedule_id: input.scheduleId,
        from_date: input.fromDate,
        to_date: input.toDate,
        notes: input.notes,
      },
    })
  );

  if (rawError) {
    console.error('reschedule-workout-day error:', { rawError, parsedError });
    throw new Error(parsedError?.error || parsedError?.message || rawError?.message || 'Failed to reschedule workout');
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
  const { data, parsedError, rawError } = await invokeFunction(() =>
    supabase.functions.invoke('compute-plan-consistency', {
      body: {
        start_date: input.startDate,
        end_date: input.endDate,
        days: input.days,
      },
    })
  );

  if (rawError) {
    console.error('compute-plan-consistency error:', { rawError, parsedError });
    throw new Error(parsedError?.error || parsedError?.message || rawError?.message || 'Failed to compute consistency');
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
