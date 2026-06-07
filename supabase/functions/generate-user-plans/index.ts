/* eslint-disable import/no-unresolved */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  STRICT_WORKOUT_FOCUS_TAGS,
  exerciseMatchesWorkoutFocus,
  inferWorkoutFocusTags,
  type WorkoutFocusTag,
  type ExerciseFocusTag,
} from "../../../lib/workout/programMappingRules.ts";
import {
  auditDayExerciseMappings,
  remediateDayExerciseMappings,
} from "../../../lib/workout/programMappingEngine.ts";
import {
  buildWeeklyLayout,
  normalizeWeeklyLayout,
  type WeeklyLayoutAssignment,
} from "../../../lib/workout/program-catalog.ts";
import { buildWorkoutPlanDiff, type WorkoutPlanComparable } from "../../../lib/workout/plan-regeneration-diff.ts";
import { publicExerciseNameCandidates } from "../../../lib/workout/v1-public-exercise-aliases.ts";
import {
  selectExercisesForGeneratedSplitDay,
  type GeneratedSplitDayDefinition,
} from "../../../lib/workout/generated-split-selection.ts";
import {
  recommendMealFrequency,
  resolveMealFrequencyChoice,
} from "../../../lib/nutrition/meal-frequency.ts";
import { determineProduceDecision, type ProduceGoal } from "./produceStrategy.ts";
import {
  generateDailyMeals,
  getSlotTemplate,
  type FoodWithMetadata,
  type UserNutritionSelections,
  type ScheduleConfig,
  type GenerationOptions,
  type GeneratedMeal,
  type MealSlot,
  type MacroTargets,
} from "./scientificMealEngine.ts";
import { routeUserToPlan, type OnboardingProfileInput } from "../../../lib/workout/v1_librarian_router.ts";
import { hydrateTemplate } from "../../../lib/workout/v1_architect.ts";
import { planFamilies } from "../../../loaders/seeds/families.ts";
import { coreTemplates } from "../../../loaders/seeds/templates.ts";
import {
  LiftComfort,
  SessionEnvironment,
  ExperienceLevel,
  GoalBucket,
  TrainingStyle,
  ProgressionModel,
  ReplacementGroup,
  SlotArchetype,

  MovementPattern,
  EquipmentCategory,
  SetupComplexity,
  FatigueCost,
  ExerciseTier
} from "../../../types/v1_engine.ts";

import {
  corsHeaders,
  DB_ALLOWED_TECHNIQUE_TYPES,
  dbTechniqueTypeForExercise,
  jsonResponse,
  performRenderCheck,
} from "./helpers/response.ts";
import {
  calculateMacroDiffPercent,
  clamp,
  expandRestrictionTokens,
  formatDate,
  formatWeekdayLabel,
  getDayVariation,
  getErrorMessage,
  isMissingColumnError,
  matchesNamePreference,
  normalizeNameTerm,
  normalizeToken,
  RESTRICTION_ALIASES,
  round1,
  startOfWeek,
} from "./helpers/scalars.ts";
import {
  applyDietaryFilters,
  buildFoodRecordLookup,
  buildMacroRotationPool,
  deterministicPick,
  findBestFoodRecordMatch,
  foodMatchesProteinPreference,
  foodMatchesRestriction,
  getFoodByTag,
  inferFoodTags,
  macroFromFood,
  normalizeGeneratedFoodLookupName,
  pickFoodForMacro,
  pickFromRotationPool,
  scoreFoodForMacro,
  scoreFoodRecordLookupEntry,
  tokenizeGeneratedFoodLookupName,
} from "./helpers/food.ts";
import {
  adaptSplitToFrequency,
  buildExercisePools,
  chooseSplit,
  EQUIPMENT_ALLOWLISTS,
  exerciseMatchesFocus,
  expandEquipmentAccess,
  filterExercisesForConstraints,
  goalTagsForContext,
  inferFocusTags,
  INJURY_KEYWORD_BLOCKLIST,
  isEquipmentCompatible,
  isInjuryCompatible,
  isTemplateEquipmentCompatible,
  normalizeEquipmentTag,
  pickExercisesForDay,
  pickReplacementExercise,
  scoreSplitForContext,
  scoreTemplateForContext,
} from "./helpers/workout-selection.ts";
import {
  buildNutritionSlotRatio,
  normalizeNutritionSlots,
  resolveNutritionMealSlots,
  SLOT_ORDER,
  SLOT_RATIO,
} from "./helpers/nutrition-slots.ts";
import {
  deleteWorkoutPlanTree,
  insertWorkoutPlanDayWithFallback,
  insertWorkoutPlanWithFallback,
  loadStoredWorkoutPlanValidationData,
  seedWorkoutScheduleFromLayout,
  storeV1WorkoutPlan,
  syncLegacyPlanDayScheduledDates,
  updateWorkoutPlanMetadataWithFallback,
  validateStoredWorkoutPlanCoherence,
} from "./db/workout-writers.ts";
import {
  deleteNutritionPlanTree,
  storeNutritionPlan,
} from "./db/nutrition-writers.ts";
import { updateGenerationRunFailure, updateGenerationRunStage } from "./db/generation-runs.ts";
import {
  fetchCurrentNutritionPlanContext,
  fetchCurrentWorkoutPlanContext,
  fetchStoredWorkoutPlanComparable,
  fetchUserContext,
  toComparableWorkoutPlan,
} from "./db/context-loaders.ts";
import {
  baseMacroTargets,
  convertFoodsToScientificFormat,
  generateScientificMealPlan,
  getDefaultPortionBounds,
  getFoodSpecificBounds,
  macroTargetsForDay,
  normalizeDayTypeTarget,
} from "./pipelines/nutrition-pipeline.ts";
import {
  applyWorkoutRegenerationToContext,
  buildFocusFallbackPool,
  buildWorkoutGenerationConfig,
  chooseTemplateFromCatalog,
  getAllowedWorkoutDays,
  storeWorkoutPlan,
  storeWorkoutPlanFromTemplateV2,
} from "./pipelines/workout-pipeline.ts";
import { applyNutritionRegenerationToContext } from "./helpers/nutrition-regen.ts";
import { verifyClerkRequest } from "../_shared/clerkAuth.ts";
import { runV3Pipeline } from "./pipelines/v3-pipeline.ts";




type PlanType = "workout" | "nutrition" | "both";
export type GenerationMode = "initial" | "regenerate";
export type ActivationMode = "preview" | "activate";
// Extended to match the DB CHECK constraint in migration 084 which allows
// scientific engine slots alongside the four legacy slots.
export type NutritionMealSlot = "breakfast" | "lunch" | "dinner" | "snack" | "pre-workout" | "post-workout" | "evening";
export type MealsPerDayChoice = "2" | "3" | "4" | "5_plus" | "no_preference";

function normalizeCorrelationId(value: string | null): string | null {
  const trimmed = String(value || "").trim();
  return /^[A-Za-z0-9._:-]{8,120}$/.test(trimmed) ? trimmed : null;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

type WorkoutRegenerationReason =
  | "not_seeing_results"
  | "too_hard_to_recover"
  | "sessions_too_long"
  | "too_repetitive"
  | "schedule_changed"
  | "equipment_changed"
  | "pain_or_discomfort"
  | "want_different_split"
  | "other";

export type WorkoutRegenerationRequest = {
  current_plan_id?: string;
  reason?: WorkoutRegenerationReason;
  issue_flags?: string[];
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
};

type NutritionRegenerationReason =
  | "not_hitting_macros"
  | "too_repetitive"
  | "prep_takes_too_long"
  | "budget_changed"
  | "dietary_preferences_changed"
  | "allergy_or_food_issue"
  | "schedule_changed"
  | "want_different_meals"
  | "other";

export type NutritionRegenerationRequest = {
  current_plan_id?: string;
  reason?: NutritionRegenerationReason;
  issue_flags?: string[];
  meals_per_day_override?: number | null;
  dietary_preference_override?: string | null;
  allergies?: string[];
  refused_foods?: string[];
  preferred_proteins?: string[];
  preferred_carbs?: string[];
  preferred_fats?: string[];
  prep_time_target_min?: number | null;
  budget_limit?: number | null;
  keep_meal_slots?: boolean;
  start_fresh?: boolean;
};

export type CurrentWorkoutPlanContext = {
  planId: string;
  familyKey: string | null;
  progressionModel: string | null;
  daysPerWeek: number;
  weeklyLayout: WeeklyLayoutAssignment[];
  comparablePlan: WorkoutPlanComparable;
  adherenceSummary: {
    completionRate28d: number;
    missedSessions28d: number;
    completedSessions28d: number;
    avgLoggedDurationMin: number | null;
    mostFrequentlySkippedDays: string[];
  };
};

export type CurrentNutritionPlanContext = {
  planId: string;
  mealSlots: NutritionMealSlot[];
};

export type WorkoutGenerationConfig = {
  generationMode: GenerationMode;
  activationMode: ActivationMode;
  currentPlanContext: CurrentWorkoutPlanContext | null;
  workoutRegeneration: WorkoutRegenerationRequest | null;
  sessionDurationTargetMin: number | null;
  maxExercisesPerDay: number | null;
  avoidExerciseTerms: string[];
  keepExerciseTerms: string[];
  excludeFamilyKey: string | null;
  minorRefinement: boolean;
};

export const WORKOUT_PREVIEW_NAME_PREFIX = "Preview · ";
export const NUTRITION_PREVIEW_NAME_PREFIX = "Preview · ";

export type OnboardingAnswers = {
  goal_type?: string;
  experience_level?: "beginner" | "intermediate" | "advanced";
  training_days_per_week?: number;
  training_days?: string[];
  preferred_days_off?: string[];
  equipment_access?: string;
  injuries?: string[];
  preferred_split_family?: string;
  technique_preferences?: string[];
  progression_preference?: string;
  session_emphasis?: string;
  dietary_preference?: string;
  allergies_exclusions?: string[];
  refused_foods?: string[];
  preferred_proteins?: string[];
  preferred_carbs?: string[];
  preferred_fats?: string[];
  meals_per_day?: MealsPerDayChoice;
  traditional_meals?: boolean;
  training_time?: string;
  wake_time?: string;
  first_meal_delay?: string;
  last_meal_before_bed?: string;
  carb_tolerance?: string;
  cooking_level?: string;
  target_weight_lb?: number | null;
};

export type UserContext = {
  profile: {
    first_name: string | null;
    sex: string | null;
    unit_system: string;
  };
  onboarding: {
    goal_type: string;
    experience_level: "beginner" | "intermediate" | "advanced";
    training_days_per_week: number;
    training_days: string[];
    preferred_days_off: string[];
    equipment_access: string;
    injuries: string[];
    preferred_split_family: string;
    technique_preferences: string[];
    progression_preference: string;
    session_emphasis: string;
    dietary_preference: string;
    allergies_exclusions: string[];
    refused_foods: string[];
    preferred_proteins: string[];
    preferred_carbs: string[];
    preferred_fats: string[];
    meals_per_day: MealsPerDayChoice;
    traditional_meals: boolean;
    training_time: string | null;
    wake_time: string | null;
    first_meal_delay: string | null;
    last_meal_before_bed: string | null;
    carb_tolerance: string | null;
    cooking_level: string | null;
    target_weight_lb: number | null;
  };
  targets: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number | null;
    water_ml: number;
    day_type_targets_json?: {
      daily?: MacroTargets & { fiber_g?: number };
      trainingDay?: MacroTargets & { fiber_g?: number };
      restDay?: MacroTargets & { fiber_g?: number };
    } | null;
    target_diagnostics_json?: Record<string, unknown> | null;
  };
  exercises: Array<{
    id: string;
    name: string;
    category: string;
    equipment_required: string[];
    primary_muscle: string | null;
    pattern: string | null;
    difficulty: string | null;
    popularity_score: number | null;
  }>;
  foods: Array<{
    id: string;
    name: string;
    calories_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
    fiber_per_100g: number;
    category: string | null;
    // Food metadata for scientific meal generation
    breakfast_score?: number;
    lunch_dinner_score?: number;
    preworkout_score?: number;
    postworkout_score?: number;
    evening_score?: number;
    digestion_speed?: string;
    fat_load?: string;
    carb_speed?: string;
    protein_leanness?: string;
    formality?: string;
    goal_form?: string;
    variety_family?: string;
    tags?: string[];
  }>;
};

export type WorkoutDayTemplate = {
  key: string;
  name: string;
  focus: string;
  tags: string[];
  sets: number;
  repRange: [number, number];
  restSeconds: number;
  tempo?: string;
  cue?: string;
  primaryFocuses?: WorkoutFocusTag[];
  supportFocuses?: WorkoutFocusTag[];
  disallowedFocuses?: ExerciseFocusTag[];
  targetExercises?: number | null;
  minExercises?: number | null;
  minPrimaryExercises?: number | null;
  maxSupportExercises?: number | null;
  requiredCoverage?: WorkoutFocusTag[];
  allowDuplicateMovementFamilies?: boolean;
};

export type SplitDefinition = {
  key: string;
  familyKey?: string | null;
  name: string;
  description: string;
  recommendedFor: "beginner" | "intermediate" | "advanced";
  frequency: number;
  days: WorkoutDayTemplate[];
};

export class WorkoutGenerationValidationError extends Error {
  warnings: string[];

  constructor(message: string, warnings: string[] = []) {
    super(message);
    this.name = "WorkoutGenerationValidationError";
    this.warnings = warnings;
  }
}

class StrictTemplateSelectionError extends Error {
  warnings: string[];
  statusCode: number;
  step: string;
  errorCode: string;
  details: Record<string, unknown>;

  constructor(
    message: string,
    details: Record<string, unknown>,
    warnings: string[] = [],
  ) {
    super(message);
    this.name = "StrictTemplateSelectionError";
    this.warnings = warnings;
    this.statusCode = 422;
    this.step = "template_selection";
    this.errorCode = "template_selection_unsupported";
    this.details = details;
  }
}


export type FoodCandidate = {
  key: string;
  name: string;
  tags: string[];
  unit: string;
  defaultGrams: number;
  calories100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  fiber100: number;
};

type MealItem = {
  food_item_id: string | null;
  item_name: string;
  quantity_value: number;
  quantity_unit: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

export type MealVariantPayload = {
  variant_type: "default" | "alternative" | "user_custom";
  name: string;
  description: string;
  source: "rule" | "ai" | "user";
  prep_time_min: number;
  items: MealItem[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
};

export type VarietyProfile = "moderate_rotation_4_5" | "minimal" | "high";

export type MealAnchorSelection = {
  protein: FoodCandidate;
  carb: FoodCandidate;
  fat: FoodCandidate;
  veggie: FoodCandidate;
};

export type FoodRecord = UserContext["foods"][number];
export type FoodRecordLookupEntry = FoodRecord & {
  normalizedName: string;
  tokens: string[];
};
export type FoodRecordLookup = {
  exact: Map<string, FoodRecordLookupEntry>;
  all: FoodRecordLookupEntry[];
};

const GENERATED_FOOD_NAME_ALIASES: Record<string, string[]> = {
  "pea protein": ["plant protein powder pea"],
  "cottage cheese": ["cottage cheese low fat", "cottage cheese full fat"],
  "chicken breast": ["chicken breast skinless cooked", "rotisserie chicken breast"],
  "rice cakes": ["rice cakes plain"],
  almonds: ["almonds raw"],
  "whole eggs": ["eggs whole cooked"],
  tuna: ["tuna canned in water"],
  walnuts: ["walnuts raw"],
  "olive oil": ["olive oil extra virgin"],
  "rolled oats": ["instant oats dry", "oatmeal cooked", "oats"],
  banana: ["banana"],
};

export type AllowedWorkoutDaysResult = {
  allowedDays: string[];
  resolvedDaysOff: string[];
  droppedDaysOff: string[];
  warning?: string;
};

export type SelectedTemplate = {
  id: string;
  name: string;
  description: string | null;
  days_per_week: number;
  progression_model: string | null;
  goal_tags: string[];
  training_style_tags: string[];
  family_key: string | null;
  family_name: string | null;
  score: number;
  rationale: string[];
  days: Array<{
    id: string;
    sequence_index: number;
    day_type: "workout" | "rest" | "conditioning" | "recovery";
    name: string;
    focus: string | null;
    estimated_duration_min: number | null;
    blocks: Array<{
      id: string;
      order_index: number;
      block_type: string;
      title: string | null;
      config_json: Record<string, unknown>;
      exercises: Array<{
        id: string;
        order_index: number;
        exercise_id: string;
        sets_target: number;
        reps_min: number;
        reps_max: number;
        rest_seconds: number | null;
        tempo: string | null;
        technique_type: string | null;
        technique_config_json: Record<string, unknown>;
        set_style: string | null;
        rir_target_min: number | null;
        rir_target_max: number | null;
        rpe_target_min: number | null;
        rpe_target_max: number | null;
        pause_seconds: number | null;
        notes: string | null;
        exercise: UserContext["exercises"][number] | null;
      }>;
    }>;
  }>;
};





export const DAYS: string[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export const FOOD_LIBRARY: FoodCandidate[] = [
  { key: "egg_whites", name: "Egg Whites", tags: ["protein", "breakfast", "vegetarian"], unit: "g", defaultGrams: 220, calories100: 52, protein100: 11, carbs100: 0.7, fat100: 0.2, fiber100: 0 },
  { key: "whole_eggs", name: "Whole Eggs", tags: ["protein", "breakfast", "vegetarian", "fat"], unit: "g", defaultGrams: 100, calories100: 143, protein100: 12.6, carbs100: 1.1, fat100: 9.5, fiber100: 0 },
  { key: "chicken_breast", name: "Chicken Breast", tags: ["protein", "lunch", "dinner"], unit: "g", defaultGrams: 170, calories100: 165, protein100: 31, carbs100: 0, fat100: 3.6, fiber100: 0 },
  { key: "turkey_breast", name: "Turkey Breast", tags: ["protein", "lunch", "dinner"], unit: "g", defaultGrams: 170, calories100: 157, protein100: 29, carbs100: 0, fat100: 4, fiber100: 0 },
  { key: "salmon", name: "Salmon", tags: ["protein", "dinner", "fat", "pescatarian"], unit: "g", defaultGrams: 160, calories100: 208, protein100: 20, carbs100: 0, fat100: 13, fiber100: 0 },
  { key: "tofu", name: "Firm Tofu", tags: ["protein", "vegan", "vegetarian", "lunch", "dinner"], unit: "g", defaultGrams: 180, calories100: 144, protein100: 17.3, carbs100: 3, fat100: 8.7, fiber100: 2.3 },
  { key: "tempeh", name: "Tempeh", tags: ["protein", "vegan", "vegetarian", "lunch", "dinner"], unit: "g", defaultGrams: 160, calories100: 193, protein100: 20.3, carbs100: 9.4, fat100: 10.8, fiber100: 1.4 },
  { key: "lean_beef", name: "Lean Beef", tags: ["protein", "lunch", "dinner"], unit: "g", defaultGrams: 170, calories100: 176, protein100: 27, carbs100: 0, fat100: 7, fiber100: 0 },
  { key: "tuna", name: "Tuna", tags: ["protein", "lunch", "dinner", "pescatarian"], unit: "g", defaultGrams: 170, calories100: 132, protein100: 29, carbs100: 0, fat100: 1, fiber100: 0 },
  { key: "shrimp", name: "Shrimp", tags: ["protein", "lunch", "dinner", "pescatarian", "shellfish"], unit: "g", defaultGrams: 170, calories100: 99, protein100: 24, carbs100: 0.2, fat100: 0.3, fiber100: 0 },
  { key: "lentils", name: "Lentils", tags: ["protein", "carb", "vegan", "vegetarian", "lunch", "dinner"], unit: "g", defaultGrams: 200, calories100: 116, protein100: 9, carbs100: 20, fat100: 0.4, fiber100: 7.9 },
  { key: "cottage_cheese", name: "Cottage Cheese", tags: ["protein", "snack", "breakfast", "vegetarian", "dairy"], unit: "g", defaultGrams: 180, calories100: 98, protein100: 11.1, carbs100: 3.4, fat100: 4.3, fiber100: 0 },
  { key: "greek_yogurt", name: "Greek Yogurt 0%", tags: ["protein", "snack", "breakfast", "vegetarian"], unit: "g", defaultGrams: 220, calories100: 59, protein100: 10.3, carbs100: 3.6, fat100: 0.4, fiber100: 0 },
  { key: "protein_powder", name: "Whey Protein", tags: ["protein", "snack"], unit: "g", defaultGrams: 35, calories100: 400, protein100: 80, carbs100: 8, fat100: 6, fiber100: 2 },
  { key: "pea_protein", name: "Pea Protein", tags: ["protein", "snack", "vegan"], unit: "g", defaultGrams: 35, calories100: 395, protein100: 80, carbs100: 7, fat100: 6.5, fiber100: 4.5 },
  { key: "jasmine_rice", name: "Jasmine Rice (Cooked)", tags: ["carb", "lunch", "dinner", "breakfast"], unit: "g", defaultGrams: 180, calories100: 129, protein100: 2.7, carbs100: 28.2, fat100: 0.3, fiber100: 0.4 },
  { key: "brown_rice", name: "Brown Rice (Cooked)", tags: ["carb", "lunch", "dinner", "vegan"], unit: "g", defaultGrams: 180, calories100: 111, protein100: 2.6, carbs100: 23, fat100: 0.9, fiber100: 1.8 },
  { key: "quinoa", name: "Quinoa (Cooked)", tags: ["carb", "protein", "lunch", "dinner", "vegan"], unit: "g", defaultGrams: 170, calories100: 120, protein100: 4.4, carbs100: 21.3, fat100: 1.9, fiber100: 2.8 },
  { key: "potato", name: "Potato (Cooked)", tags: ["carb", "lunch", "dinner"], unit: "g", defaultGrams: 250, calories100: 87, protein100: 1.9, carbs100: 20.1, fat100: 0.1, fiber100: 1.8 },
  { key: "sweet_potato", name: "Sweet Potato (Cooked)", tags: ["carb", "lunch", "dinner", "vegan"], unit: "g", defaultGrams: 220, calories100: 90, protein100: 2, carbs100: 20.7, fat100: 0.2, fiber100: 3.3 },
  { key: "whole_wheat_pasta", name: "Whole Wheat Pasta (Cooked)", tags: ["carb", "lunch", "dinner", "vegetarian"], unit: "g", defaultGrams: 180, calories100: 149, protein100: 5.8, carbs100: 30.9, fat100: 0.9, fiber100: 3.9 },
  { key: "oats", name: "Rolled Oats", tags: ["carb", "breakfast", "snack", "vegetarian", "vegan"], unit: "g", defaultGrams: 70, calories100: 389, protein100: 16.9, carbs100: 66.3, fat100: 6.9, fiber100: 10.6 },
  { key: "berries", name: "Mixed Berries", tags: ["carb", "breakfast", "snack", "fruit", "vegan"], unit: "g", defaultGrams: 130, calories100: 57, protein100: 0.7, carbs100: 14.5, fat100: 0.3, fiber100: 4.5 },
  { key: "banana", name: "Banana", tags: ["carb", "snack", "breakfast", "fruit", "vegan"], unit: "g", defaultGrams: 120, calories100: 89, protein100: 1.1, carbs100: 22.8, fat100: 0.3, fiber100: 2.6 },
  { key: "broccoli", name: "Broccoli", tags: ["veggie", "lunch", "dinner", "vegan"], unit: "g", defaultGrams: 120, calories100: 35, protein100: 2.4, carbs100: 7.2, fat100: 0.4, fiber100: 3.3 },
  { key: "spinach", name: "Spinach", tags: ["veggie", "breakfast", "lunch", "dinner", "vegan"], unit: "g", defaultGrams: 80, calories100: 23, protein100: 2.9, carbs100: 3.6, fat100: 0.4, fiber100: 2.2 },
  { key: "mixed_salad", name: "Mixed Salad Greens", tags: ["veggie", "lunch", "dinner", "vegan"], unit: "g", defaultGrams: 100, calories100: 19, protein100: 1.7, carbs100: 3.5, fat100: 0.2, fiber100: 2.1 },
  { key: "avocado", name: "Avocado", tags: ["fat", "breakfast", "lunch", "dinner", "vegan"], unit: "g", defaultGrams: 80, calories100: 160, protein100: 2, carbs100: 8.5, fat100: 14.7, fiber100: 6.7 },
  { key: "olive_oil", name: "Olive Oil", tags: ["fat", "lunch", "dinner", "vegan"], unit: "g", defaultGrams: 12, calories100: 884, protein100: 0, carbs100: 0, fat100: 100, fiber100: 0 },
  { key: "almonds", name: "Almonds", tags: ["fat", "snack", "vegan", "vegetarian"], unit: "g", defaultGrams: 25, calories100: 579, protein100: 21.2, carbs100: 21.6, fat100: 49.9, fiber100: 12.5 },
  { key: "walnuts", name: "Walnuts", tags: ["fat", "snack", "vegan", "vegetarian"], unit: "g", defaultGrams: 25, calories100: 654, protein100: 15.2, carbs100: 13.7, fat100: 65.2, fiber100: 6.7 },
  { key: "chia_seeds", name: "Chia Seeds", tags: ["fat", "snack", "breakfast", "vegan"], unit: "g", defaultGrams: 18, calories100: 486, protein100: 16.5, carbs100: 42.1, fat100: 30.7, fiber100: 34.4 },
  { key: "peanut_butter", name: "Peanut Butter", tags: ["fat", "snack", "breakfast", "vegetarian"], unit: "g", defaultGrams: 20, calories100: 588, protein100: 25, carbs100: 20, fat100: 50, fiber100: 6 },
  { key: "rice_cakes", name: "Rice Cakes", tags: ["carb", "snack", "vegan"], unit: "g", defaultGrams: 36, calories100: 387, protein100: 7.5, carbs100: 81.5, fat100: 2.8, fiber100: 4.2 },
];

const SPLIT_LIBRARY: SplitDefinition[] = [
  {
    key: "beginner-full-body-3",
    familyKey: "full_body_beginner_3",
    name: "Full Body (3x/week)",
    description: "Simple full-body progression for beginners.",
    recommendedFor: "beginner",
    frequency: 3,
    days: [
      { key: "fb_a", name: "Full Body A", focus: "Squat + Push + Pull", tags: ["legs", "chest", "back", "shoulders"], sets: 3, repRange: [6, 10], restSeconds: 120, tempo: "2-0-1", cue: "Leave 2 reps in reserve" },
      { key: "fb_b", name: "Full Body B", focus: "Hinge + Vertical Push/Pull", tags: ["hamstrings", "back", "shoulders", "arms"], sets: 3, repRange: [8, 12], restSeconds: 90 },
      { key: "fb_c", name: "Full Body C", focus: "Balanced Strength + Core", tags: ["legs", "chest", "back", "core"], sets: 3, repRange: [10, 15], restSeconds: 75 },
    ],
  },
  {
    key: "beginner-upper-lower-4",
    familyKey: "upper_lower_4",
    name: "Upper / Lower (4x/week)",
    description: "Alternating upper and lower sessions with forgiving volume.",
    recommendedFor: "beginner",
    frequency: 4,
    days: [
      { key: "upper_a", name: "Upper A", focus: "Push-Pull Balance", tags: ["chest", "back", "shoulders", "arms"], sets: 3, repRange: [8, 12], restSeconds: 90 },
      { key: "lower_a", name: "Lower A", focus: "Squat Dominant", tags: ["legs", "glutes", "core"], sets: 3, repRange: [8, 12], restSeconds: 120 },
      { key: "upper_b", name: "Upper B", focus: "Hypertrophy + Posture", tags: ["back", "chest", "shoulders", "arms"], sets: 3, repRange: [10, 15], restSeconds: 75 },
      { key: "lower_b", name: "Lower B", focus: "Hinge Dominant", tags: ["hamstrings", "glutes", "legs", "core"], sets: 3, repRange: [6, 10], restSeconds: 120 },
    ],
  },
  {
    key: "intermediate-phul-4",
    familyKey: "phul_4",
    name: "PHUL (4 days)",
    description: "Power + hypertrophy upper/lower split.",
    recommendedFor: "intermediate",
    frequency: 4,
    days: [
      { key: "upper_power", name: "Upper Power", focus: "Heavy compound upper", tags: ["chest", "back", "shoulders"], sets: 4, repRange: [4, 6], restSeconds: 150, tempo: "2-1-1" },
      { key: "lower_power", name: "Lower Power", focus: "Heavy lower compounds", tags: ["legs", "glutes", "hamstrings", "core"], sets: 4, repRange: [4, 6], restSeconds: 150 },
      { key: "upper_hyp", name: "Upper Hypertrophy", focus: "Volume upper body", tags: ["chest", "back", "shoulders", "arms"], sets: 3, repRange: [8, 12], restSeconds: 90 },
      { key: "lower_hyp", name: "Lower Hypertrophy", focus: "Volume lower body", tags: ["legs", "glutes", "hamstrings", "core"], sets: 3, repRange: [8, 12], restSeconds: 90 },
    ],
  },
  {
    key: "intermediate-ppl-5",
    familyKey: "ppl_ul_hybrid_5",
    name: "PPL + Upper/Lower Hybrid (5 days)",
    description: "Push/pull/legs plus upper/lower volume days.",
    recommendedFor: "intermediate",
    frequency: 5,
    days: [
      { key: "push", name: "Push", focus: "Chest, shoulders, triceps", tags: ["chest", "shoulders", "arms"], sets: 3, repRange: [6, 10], restSeconds: 90 },
      { key: "pull", name: "Pull", focus: "Back, biceps, posture", tags: ["back", "arms"], sets: 3, repRange: [8, 12], restSeconds: 90 },
      { key: "legs", name: "Legs", focus: "Quads, glutes, hamstrings", tags: ["legs", "glutes", "hamstrings", "core"], sets: 4, repRange: [6, 10], restSeconds: 120 },
      { key: "upper", name: "Upper Mix", focus: "Upper hypertrophy", tags: ["chest", "back", "shoulders", "arms"], sets: 3, repRange: [10, 15], restSeconds: 75 },
      { key: "lower", name: "Lower Mix", focus: "Lower hypertrophy", tags: ["legs", "glutes", "hamstrings", "core"], sets: 3, repRange: [10, 15], restSeconds: 90 },
    ],
  },
  {
    key: "advanced-conjugate-4",
    familyKey: "conjugate_4",
    name: "Conjugate (4 days)",
    description: "Max effort and dynamic effort split for advanced lifters.",
    recommendedFor: "advanced",
    frequency: 4,
    days: [
      { key: "me_upper", name: "ME Upper", focus: "Max effort press", tags: ["chest", "shoulders", "arms"], sets: 5, repRange: [1, 5], restSeconds: 180 },
      { key: "me_lower", name: "ME Lower", focus: "Max effort squat/deadlift", tags: ["legs", "glutes", "hamstrings", "core"], sets: 5, repRange: [1, 5], restSeconds: 180 },
      { key: "de_upper", name: "DE Upper", focus: "Speed upper + accessories", tags: ["chest", "back", "shoulders", "arms"], sets: 6, repRange: [2, 5], restSeconds: 60 },
      { key: "de_lower", name: "DE Lower", focus: "Speed lower + accessories", tags: ["legs", "glutes", "hamstrings", "core"], sets: 6, repRange: [2, 5], restSeconds: 60 },
    ],
  },
  {
    key: "minimalist-full-body-2",
    familyKey: "minimalist_full_body_2",
    name: "Minimalist Full Body (2 days)",
    description: "Low-friction full body plan built for consistency.",
    recommendedFor: "beginner",
    frequency: 2,
    days: [
      { key: "min_fb_a", name: "Minimal Full Body A", focus: "Push + Legs + Core", tags: ["chest", "legs", "core"], sets: 3, repRange: [8, 12], restSeconds: 90 },
      { key: "min_fb_b", name: "Minimal Full Body B", focus: "Pull + Hinge + Core", tags: ["back", "hamstrings", "core"], sets: 3, repRange: [8, 12], restSeconds: 90 },
    ],
  },
  {
    key: "athletic-performance-5",
    familyKey: "athletic_performance_5",
    name: "Athletic Performance (5 days)",
    description: "Strength, speed, and conditioning blend for athletic goals.",
    recommendedFor: "intermediate",
    frequency: 5,
    days: [
      { key: "ath_lower_power", name: "Lower Power", focus: "Power + acceleration", tags: ["legs", "glutes", "core"], sets: 4, repRange: [3, 6], restSeconds: 150 },
      { key: "ath_upper_power", name: "Upper Power", focus: "Explosive upper", tags: ["chest", "back", "shoulders"], sets: 4, repRange: [4, 8], restSeconds: 120 },
      { key: "ath_conditioning", name: "Conditioning", focus: "Intervals + carries", tags: ["legs", "core"], sets: 5, repRange: [8, 15], restSeconds: 75 },
      { key: "ath_upper_vol", name: "Upper Volume", focus: "Hypertrophy and posture", tags: ["back", "chest", "shoulders", "arms"], sets: 3, repRange: [8, 12], restSeconds: 90 },
      { key: "ath_lower_vol", name: "Lower Volume", focus: "Hypertrophy and unilateral", tags: ["legs", "glutes", "hamstrings", "core"], sets: 3, repRange: [8, 12], restSeconds: 90 },
    ],
  },
  {
    key: "conditioning-hybrid-4",
    familyKey: "conditioning_hybrid_4",
    name: "Conditioning Hybrid (4 days)",
    description: "Mixed resistance and metabolic conditioning.",
    recommendedFor: "intermediate",
    frequency: 4,
    days: [
      { key: "cond_strength_a", name: "Strength A", focus: "Compound strength", tags: ["legs", "chest", "back"], sets: 4, repRange: [5, 8], restSeconds: 120 },
      { key: "cond_metcon_a", name: "MetCon A", focus: "Circuit conditioning", tags: ["legs", "core", "shoulders"], sets: 3, repRange: [10, 20], restSeconds: 45 },
      { key: "cond_strength_b", name: "Strength B", focus: "Posterior and pull", tags: ["back", "hamstrings", "glutes"], sets: 4, repRange: [6, 10], restSeconds: 120 },
      { key: "cond_metcon_b", name: "MetCon B", focus: "Engine and trunk", tags: ["core", "legs", "arms"], sets: 3, repRange: [12, 20], restSeconds: 45 },
    ],
  },
  {
    key: "calisthenics-foundation-4",
    familyKey: "calisthenics_foundation_4",
    name: "Calisthenics Foundation (4 days)",
    description: "Bodyweight-focused progression for control and strength.",
    recommendedFor: "beginner",
    frequency: 4,
    days: [
      { key: "cali_push", name: "Calisthenics Push", focus: "Push and trunk", tags: ["chest", "shoulders", "arms", "core"], sets: 3, repRange: [6, 15], restSeconds: 90 },
      { key: "cali_pull", name: "Calisthenics Pull", focus: "Back and grip", tags: ["back", "arms", "core"], sets: 3, repRange: [6, 15], restSeconds: 90 },
      { key: "cali_legs", name: "Calisthenics Legs", focus: "Leg strength and single-leg work", tags: ["legs", "glutes", "core"], sets: 3, repRange: [8, 20], restSeconds: 75 },
      { key: "cali_mix", name: "Calisthenics Mixed", focus: "Skills and control", tags: ["core", "shoulders", "back"], sets: 3, repRange: [8, 15], restSeconds: 75 },
    ],
  },
  {
    key: "rehab-resilience-3",
    familyKey: "rehab_resilience_3",
    name: "Rehab & Resilience (3 days)",
    description: "Lower-intensity full body with control and mobility emphasis.",
    recommendedFor: "beginner",
    frequency: 3,
    days: [
      { key: "rehab_a", name: "Resilience A", focus: "Controlled push/pull", tags: ["chest", "back", "core"], sets: 2, repRange: [10, 15], restSeconds: 75 },
      { key: "rehab_b", name: "Resilience B", focus: "Lower body stability", tags: ["legs", "glutes", "core"], sets: 2, repRange: [10, 15], restSeconds: 75 },
      { key: "rehab_c", name: "Resilience C", focus: "Mobility and integrated strength", tags: ["core", "shoulders", "back"], sets: 2, repRange: [10, 15], restSeconds: 60 },
    ],
  },
  {
    key: "advanced-powerbuilding-5",
    familyKey: "powerbuilding_5",
    name: "Advanced Powerbuilding (5 days)",
    description: "Heavy compounds with high-volume hypertrophy sessions.",
    recommendedFor: "advanced",
    frequency: 5,
    days: [
      { key: "pow_squat", name: "Squat Focus", focus: "Lower max strength", tags: ["legs", "glutes", "core"], sets: 5, repRange: [3, 6], restSeconds: 180 },
      { key: "pow_upper_strength", name: "Upper Strength", focus: "Bench and row", tags: ["chest", "back", "arms"], sets: 5, repRange: [3, 6], restSeconds: 180 },
      { key: "pow_deadlift", name: "Deadlift Focus", focus: "Posterior chain strength", tags: ["hamstrings", "glutes", "back", "core"], sets: 5, repRange: [2, 5], restSeconds: 180 },
      { key: "pow_upper_hyp", name: "Upper Hypertrophy", focus: "Volume upper body", tags: ["chest", "back", "shoulders", "arms"], sets: 4, repRange: [8, 12], restSeconds: 90 },
      { key: "pow_lower_hyp", name: "Lower Hypertrophy", focus: "Volume lower body", tags: ["legs", "hamstrings", "glutes", "core"], sets: 4, repRange: [8, 12], restSeconds: 90 },
    ],
  },
  {
    key: "intermediate-upper-lower-full-3",
    familyKey: "fam_upper_lower_full_3day",
    name: "Upper / Lower / Full (3 days)",
    description: "3-day hybrid hitting every muscle group twice per week: Upper, Lower, then a Full Body day.",
    recommendedFor: "intermediate",
    frequency: 3,
    days: [
      { key: "ulf3_upper", name: "Upper", focus: "Horizontal press + vertical pull + shoulders + biceps", tags: ["chest", "back", "shoulders", "arms"], sets: 3, repRange: [8, 12], restSeconds: 120 },
      { key: "ulf3_lower", name: "Lower", focus: "Squat + hinge + unilateral + calves", tags: ["legs", "glutes", "hamstrings", "core"], sets: 4, repRange: [6, 12], restSeconds: 150 },
      { key: "ulf3_full", name: "Full Body", focus: "Vertical press + horizontal pull + unilateral hinge + triceps", tags: ["chest", "back", "shoulders", "legs", "arms"], sets: 3, repRange: [8, 12], restSeconds: 120 },
    ],
  },
  {
    key: "intermediate-ppl-3",
    familyKey: "fam_ppl_3day",
    name: "Push / Pull / Legs (3 days)",
    description: "Classic 3-day PPL split hitting each muscle group once per week with targeted volume.",
    recommendedFor: "intermediate",
    frequency: 3,
    days: [
      { key: "ppl3_push", name: "Push", focus: "Chest, shoulders, triceps", tags: ["chest", "shoulders", "arms"], sets: 4, repRange: [6, 12], restSeconds: 120 },
      { key: "ppl3_pull", name: "Pull", focus: "Back and biceps", tags: ["back", "arms"], sets: 4, repRange: [6, 12], restSeconds: 120 },
      { key: "ppl3_legs", name: "Legs", focus: "Quads, hamstrings, glutes, calves", tags: ["legs", "glutes", "hamstrings", "core"], sets: 4, repRange: [6, 12], restSeconds: 150 },
    ],
  },
  {
    key: "advanced-ppl-6",
    familyKey: "fam_ppl_6day",
    name: "Push / Pull / Legs (6 days)",
    description: "High-frequency PPL 6-day split with A/B variation for maximum hypertrophy.",
    recommendedFor: "advanced",
    frequency: 6,
    days: [
      { key: "ppl6_push_a", name: "Push A", focus: "Horizontal press emphasis, triceps", tags: ["chest", "shoulders", "arms"], sets: 4, repRange: [5, 10], restSeconds: 150 },
      { key: "ppl6_pull_a", name: "Pull A", focus: "Vertical pull emphasis, biceps", tags: ["back", "arms"], sets: 4, repRange: [5, 10], restSeconds: 150 },
      { key: "ppl6_legs_a", name: "Legs A", focus: "Squat dominant, calves, core", tags: ["legs", "glutes", "hamstrings", "core"], sets: 4, repRange: [5, 10], restSeconds: 180 },
      { key: "ppl6_push_b", name: "Push B", focus: "Vertical press emphasis, chest fly", tags: ["chest", "shoulders", "arms"], sets: 4, repRange: [8, 15], restSeconds: 120 },
      { key: "ppl6_pull_b", name: "Pull B", focus: "Horizontal pull emphasis, rear delt", tags: ["back", "arms", "shoulders"], sets: 4, repRange: [8, 15], restSeconds: 120 },
      { key: "ppl6_legs_b", name: "Legs B", focus: "Hinge dominant, unilateral, calves", tags: ["legs", "glutes", "hamstrings", "core"], sets: 4, repRange: [6, 12], restSeconds: 180 },
    ],
  },
  {
    key: "intermediate-brosplit-4",
    familyKey: "fam_brosplit_4day",
    name: "Bro Split (4 days)",
    description: "Classic Bro Split with dedicated Chest/Triceps, Back/Biceps, Shoulders, and Legs days.",
    recommendedFor: "intermediate",
    frequency: 4,
    days: [
      { key: "bro4_chest_tri", name: "Chest & Triceps", focus: "Full chest volume + tricep isolation", tags: ["chest", "arms"], sets: 4, repRange: [8, 12], restSeconds: 120 },
      { key: "bro4_back_bi", name: "Back & Biceps", focus: "Full back volume + bicep isolation", tags: ["back", "arms"], sets: 4, repRange: [8, 12], restSeconds: 120 },
      { key: "bro4_shoulders", name: "Shoulders", focus: "Overhead press, laterals, rear delts", tags: ["shoulders", "arms"], sets: 4, repRange: [8, 15], restSeconds: 90 },
      { key: "bro4_legs", name: "Legs", focus: "Quads, hamstrings, glutes, calves", tags: ["legs", "glutes", "hamstrings", "core"], sets: 4, repRange: [8, 12], restSeconds: 150 },
    ],
  },
  {
    key: "intermediate-brosplit-5",
    familyKey: "fam_brosplit_5day",
    name: "Bro Split (5 days)",
    description: "5-day Bro Split adding a dedicated Arms day on top of the classic 4-day structure.",
    recommendedFor: "intermediate",
    frequency: 5,
    days: [
      { key: "bro5_chest_tri", name: "Chest & Triceps", focus: "Full chest volume + tricep isolation", tags: ["chest", "arms"], sets: 4, repRange: [8, 12], restSeconds: 120 },
      { key: "bro5_back_bi", name: "Back & Biceps", focus: "Full back volume + bicep isolation", tags: ["back", "arms"], sets: 4, repRange: [8, 12], restSeconds: 120 },
      { key: "bro5_shoulders", name: "Shoulders", focus: "Overhead press, laterals, rear delts", tags: ["shoulders", "arms"], sets: 4, repRange: [8, 15], restSeconds: 90 },
      { key: "bro5_legs", name: "Legs", focus: "Quads, hamstrings, glutes, calves", tags: ["legs", "glutes", "hamstrings", "core"], sets: 4, repRange: [8, 12], restSeconds: 150 },
      { key: "bro5_arms", name: "Arms", focus: "Bicep and tricep volume day", tags: ["arms", "shoulders"], sets: 4, repRange: [8, 15], restSeconds: 75 },
    ],
  },
];

export const STRICT_FOCUS_TAGS = STRICT_WORKOUT_FOCUS_TAGS;
export const MIN_DAY_FOCUS_MATCH_RATIO = 0.8;







































export function buildMealVariant(
  slot: "breakfast" | "lunch" | "dinner" | "snack",
  target: { protein: number; carbs: number; fat: number },
  foods: FoodCandidate[],
  goal: ProduceGoal,
  daySeed: number,
  variantIndex: number,
  foodLookup: FoodRecordLookup,
  options?: {
    strictMacroMode?: boolean;
    anchors?: MealAnchorSelection;
  },
): MealVariantPayload {
  const strictMacroMode = options?.strictMacroMode ?? false;
  const excludedNames: string[] = [];
  const protein = options?.anchors?.protein || pickFoodForMacro(foods, "protein", daySeed + variantIndex * 3);
  const carb = options?.anchors?.carb || pickFoodForMacro(foods, "carb", daySeed + variantIndex * 5 + 11);
  const fat = options?.anchors?.fat || pickFoodForMacro(foods, "fat", daySeed + variantIndex * 7 + 23);

  const proteinPerGram = {
    protein: Math.max(0.01, protein.protein100 / 100),
    carbs: protein.carbs100 / 100,
    fat: protein.fat100 / 100,
  };
  const carbPerGram = {
    protein: carb.protein100 / 100,
    carbs: Math.max(0.01, carb.carbs100 / 100),
    fat: carb.fat100 / 100,
  };
  const fatPerGram = {
    protein: fat.protein100 / 100,
    carbs: fat.carbs100 / 100,
    fat: Math.max(0.01, fat.fat100 / 100),
  };

  const proteinBounds: [number, number] = slot === "snack"
    ? [strictMacroMode ? 0.1 : 10, protein.defaultGrams * (strictMacroMode ? 6 : 1.8)]
    : [strictMacroMode ? 20 : Math.max(40, protein.defaultGrams * 0.6), protein.defaultGrams * (strictMacroMode ? 3.4 : 2.6)];
  const carbBounds: [number, number] = slot === "snack"
    ? [strictMacroMode ? 0.1 : 8, carb.defaultGrams * (strictMacroMode ? 6 : 1.8)]
    : [strictMacroMode ? 16 : Math.max(30, carb.defaultGrams * 0.5), carb.defaultGrams * (strictMacroMode ? 3.4 : 2.8)];
  const fatBounds: [number, number] = slot === "snack"
    ? [strictMacroMode ? 0.1 : 1, fat.defaultGrams * (strictMacroMode ? 6 : 1.6)]
    : [strictMacroMode ? 2 : Math.max(4, fat.defaultGrams * 0.4), fat.defaultGrams * (strictMacroMode ? 3 : 2.2)];

  let proteinGrams = clamp(target.protein / proteinPerGram.protein, proteinBounds[0], proteinBounds[1]);
  let carbGrams = clamp(target.carbs / carbPerGram.carbs, carbBounds[0], carbBounds[1]);
  let fatGrams = clamp(target.fat / fatPerGram.fat, fatBounds[0], fatBounds[1]);

  const applyTotals = (p: number, c: number, f: number) => ({
    protein: (p * proteinPerGram.protein) + (c * carbPerGram.protein) + (f * fatPerGram.protein),
    carbs: (p * proteinPerGram.carbs) + (c * carbPerGram.carbs) + (f * fatPerGram.carbs),
    fat: (p * proteinPerGram.fat) + (c * carbPerGram.fat) + (f * fatPerGram.fat),
  });

  // Iteratively fit the three anchor ingredients so combined macros converge on target.
  for (let i = 0; i < 8; i += 1) {
    const totals = applyTotals(proteinGrams, carbGrams, fatGrams);
    proteinGrams = clamp(proteinGrams + ((target.protein - totals.protein) / proteinPerGram.protein), proteinBounds[0], proteinBounds[1]);
    const afterProtein = applyTotals(proteinGrams, carbGrams, fatGrams);
    carbGrams = clamp(carbGrams + ((target.carbs - afterProtein.carbs) / carbPerGram.carbs), carbBounds[0], carbBounds[1]);
    const afterCarb = applyTotals(proteinGrams, carbGrams, fatGrams);
    fatGrams = clamp(fatGrams + ((target.fat - afterCarb.fat) / fatPerGram.fat), fatBounds[0], fatBounds[1]);
  }

  if (variantIndex > 0 && !strictMacroMode) {
    const drift = variantIndex === 1 ? -0.04 : 0.04;
    proteinGrams = clamp(proteinGrams * (1 + drift * 0.4), proteinBounds[0], proteinBounds[1]);
    carbGrams = clamp(carbGrams * (1 + drift * 0.7), carbBounds[0], carbBounds[1]);
    fatGrams = clamp(fatGrams * (1 - drift * 0.5), fatBounds[0], fatBounds[1]);
  }

  const baseMacros = {
    calories: round1(
      (proteinGrams * protein.calories100) / 100 +
      (carbGrams * carb.calories100) / 100 +
      (fatGrams * fat.calories100) / 100,
    ),
  };
  const baseFiber =
    (proteinGrams * protein.fiber100) / 100 +
    (carbGrams * carb.fiber100) / 100 +
    (fatGrams * fat.fiber100) / 100;

  const produceDecision = determineProduceDecision({
    slot,
    goal,
    baseFiberG: baseFiber,
    baseCalories: baseMacros.calories,
  });

  let produce: FoodCandidate | null = null;
  let produceGrams = 0;
  if (produceDecision.include) {
    const preferredTag = produceDecision.kind === "vegetable" ? "veggie" : "fruit";
    produce =
      getFoodByTag(foods, preferredTag, excludedNames, daySeed + variantIndex * 9 + 37) ||
      getFoodByTag(foods, preferredTag === "fruit" ? "veggie" : "fruit", excludedNames, daySeed + variantIndex * 9 + 37);
    if (produce) {
      produceGrams = produceDecision.grams;
    }
  }

  const itemPlan = [
    { food: protein, grams: proteinGrams },
    { food: carb, grams: carbGrams },
    { food: fat, grams: fatGrams },
    ...(produce ? [{ food: produce, grams: produceGrams }] : []),
  ];

  const items: MealItem[] = itemPlan
    .filter(({ grams }) => grams > 0.1)
    .map(({ food, grams }) => {
    const matchedFood = findBestFoodRecordMatch(food.name, foodLookup);
    if (!matchedFood) {
      throw new Error(`Generated meal item "${food.name}" is not mapped to a food record.`);
    }
    const macros = macroFromFood(food, grams);
    return {
      food_item_id: matchedFood.id,
      item_name: food.name,
      quantity_value: round1(grams),
      quantity_unit: "g",
      grams: round1(grams),
      calories: round1(macros.calories),
      protein: round1(macros.protein),
      carbs: round1(macros.carbs),
      fat: round1(macros.fat),
      fiber: round1(macros.fiber),
    };
    });

  const totals = items.reduce(
    (acc, item) => {
      acc.calories += item.calories;
      acc.protein += item.protein;
      acc.carbs += item.carbs;
      acc.fat += item.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const variantName = variantIndex === 0
    ? `${slot[0].toUpperCase()}${slot.slice(1)} Default`
    : `${slot[0].toUpperCase()}${slot.slice(1)} Alternative ${variantIndex}`;

  return {
    variant_type: variantIndex === 0 ? "default" : "alternative",
    name: variantName,
    description: produce
      ? `Auto-generated ${slot} option aligned to macro targets with produce for fiber and micronutrients.`
      : `Auto-generated ${slot} option aligned to macro targets.`,
    source: "rule",
    prep_time_min: slot === "snack" ? 5 : 15,
    items,
    totals: {
      calories: round1(totals.calories),
      protein: round1(totals.protein),
      carbs: round1(totals.carbs),
      fat: round1(totals.fat),
    },
  };
}

















export function collectDayPolicyValidation(input: {
  dayAudit: ReturnType<typeof auditDayExerciseMappings>;
  rowCount: number;
}) {
  const focusMismatchRows = input.dayAudit.violations.filter((violation) =>
    violation.violationTypes.includes("focus_mismatch")
  ).length;
  const focusAlignedRows = Math.max(0, input.rowCount - focusMismatchRows);
  const focusRatio = input.rowCount > 0 ? focusAlignedRows / input.rowCount : 1;
  const singleFocusDay = !input.dayAudit.policy.mixed && input.dayAudit.policy.primaryFocusTags.length <= 1;
  const requiredRatio = singleFocusDay ? 1 : MIN_DAY_FOCUS_MATCH_RATIO;

  return {
    focusRatio,
    requiredRatio,
    singleFocusDay,
    failsRatio: input.rowCount > 0 && focusRatio < requiredRatio,
  };
}













type ReplacementOptions = {
  focusTags?: string[];
  avoidIds?: string[];
  strictFocus?: boolean;
  avoidTerms?: string[];
  keepTerms?: string[];
};















async function seedConsistency(supabase: SupabaseClient, userId: string) {
  const today = formatDate(new Date());
  const recommendation = {
    level: "info",
    title: "Build your first consistency streak",
    message: "Log your meals, complete your workout, and hit water target to unlock stronger AI recommendations.",
    actions: [
      "Log breakfast",
      "Complete planned session",
      "Drink 500ml water before lunch",
    ],
  };

  const { error } = await supabase
    .from("user_plan_consistency_daily")
    .upsert({
      user_id: userId,
      log_date: today,
      nutrition_score: 0,
      workout_score: 0,
      hydration_score: 0,
      overall_score: 0,
      recommendation_json: recommendation,
      nutrition_status_json: { seeded: true },
      workout_status_json: { seeded: true },
      hydration_status_json: { seeded: true },
    }, {
      onConflict: "user_id,log_date",
    });

  if (error) {
    console.error("[generate-user-plans] consistency seed warning", error);
    return false;
  }

  return true;
}

type V3BackgroundRunParams = {
  supabase: SupabaseClient;
  userId: string;
  runId: string;
  activationMode: ActivationMode;
  generationMode: GenerationMode;
  requestId: string;
  startedAt: number;
};

function scheduleBackgroundTask(task: Promise<unknown>) {
  const waitUntil = (globalThis as any).EdgeRuntime?.waitUntil;
  if (typeof waitUntil === "function") {
    waitUntil(task);
    return;
  }
  task.catch((error) => {
    console.error("[generate-user-plans] Background task failed outside EdgeRuntime:", error);
  });
}

async function processV3GenerationRun(params: V3BackgroundRunParams) {
  const { supabase, userId, runId, activationMode, generationMode, requestId, startedAt } = params;

  try {
    const { data: existingRun } = await supabase
      .from("plan_generation_runs")
      .select("status, orchestration_status")
      .eq("id", runId)
      .maybeSingle();

    if (
      existingRun?.status === "success"
      || existingRun?.orchestration_status === "success"
      || existingRun?.orchestration_status === "failed"
      || existingRun?.orchestration_status === "validation_failed"
      || existingRun?.orchestration_status === "cancelled"
    ) {
      console.log(`[generate-user-plans] [${requestId}] V3 run ${runId} is already terminal; skipping background resume.`);
      return;
    }

    await updateGenerationRunStage(supabase, runId, {
      stage: "background_processing",
      orchestrationStatus: "running",
      details: { requestId, activation_mode: activationMode, generation_mode: generationMode },
    });

    const result = await runV3Pipeline(supabase, userId, new Date(), {
      runId,
      persist: true,
      activate: activationMode === "activate",
    });

    if (!result.validation.passed) {
      return;
    }

    const persistence = result.diagnostics.persistence;
    if (!persistence?.workout_plan_id || !persistence?.nutrition_plan_id) {
      throw new Error("V3 completed without both workout and nutrition plan ids.");
    }

    const consistencySeeded = activationMode === "activate"
      ? await seedConsistency(supabase, userId)
      : false;
    const warnings = Array.from(new Set([
      ...(persistence.warnings || []),
      ...result.validation.violations
        .filter((v) => v.severity === "warning")
        .map((v) => `${v.check}:${v.field}`),
    ]));

    const { error: updateError } = await supabase
      .from("plan_generation_runs")
      .update({
        duration_ms: Date.now() - startedAt,
        ai_response: {
          workout_plan_id: persistence.workout_plan_id,
          nutrition_plan_id: persistence.nutrition_plan_id,
          workout_schedule_count: result.plan.workout_days.length,
          nutrition_variant_count: result.plan.nutrition_days.reduce(
            (sum, day) => sum + day.meals.reduce((mealSum, meal) => mealSum + meal.variants.length, 0),
            0,
          ),
          consistency_seeded: consistencySeeded,
          activation_mode: activationMode,
          generation_mode: generationMode,
          generation_version: "v3",
          spec_seed_hex: result.spec.seed,
        },
        warnings_json: warnings,
        error_step: null,
        error_code: null,
        error_context: null,
      })
      .eq("id", runId);

    if (updateError) {
      console.error(`[generate-user-plans] [${requestId}] V3 final run metadata update failed after activation:`, updateError.message);
    }
  } catch (error) {
    const err = error as Error;
    console.error(`[generate-user-plans] [${requestId}] V3 background run failed:`, err);
    await updateGenerationRunFailure(supabase, runId, {
      status: "failed",
      validationErrors: [err.message || "V3 background generation failed"],
      warnings: [],
      errorStep: "v3_background_processing",
      errorCode: "v3_background_failed",
      errorContext: { requestId, generation_version: "v3" },
    });
  }
}

serve(async (req: Request) => {
  // Generate request ID for correlation across frontend/backend/logs
  const incomingCorrelationId = normalizeCorrelationId(req.headers.get("X-Correlation-Id"));
  const requestId = incomingCorrelationId || crypto.randomUUID();
  const startTime = Date.now();
  
  console.log(`[generate-user-plans] [${requestId}] Function invoked:`, req.method);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ 
      success: false, 
      error: "Method not allowed",
      requestId,
      step: 'validation'
    }, 405);
  }

  try {
    console.log(`[generate-user-plans] [${requestId}] Starting request processing...`);
    
    // @ts-ignore: Deno is defined at runtime
    const supabaseUrl = (Deno as any).env.get("SUPABASE_URL");
    
    // 🛡️ Robust Service Role Key Selection with validation
    const env_sb_srk = (Deno as any).env.get("SUPABASE_SERVICE_ROLE_KEY");
    const env_srk = (Deno as any).env.get("SERVICE_ROLE_KEY");
    const env_m_srk = (Deno as any).env.get("METRIQFIT_SERVICE_ROLE_KEY");
    
    // JWTs are usually > 200 chars. Publishable keys are 41.
    const isServiceRoleJwt = (key: string) => !!key && key.length > 100 && key.includes('.');
    
    let serviceRoleKey = env_sb_srk || env_srk || env_m_srk;
    let keySource = "none";
    
    if (isServiceRoleJwt(env_sb_srk)) {
      serviceRoleKey = env_sb_srk;
      keySource = "SUPABASE_SERVICE_ROLE_KEY";
    } else if (isServiceRoleJwt(env_srk)) {
      serviceRoleKey = env_srk;
      keySource = "SERVICE_ROLE_KEY";
    } else if (isServiceRoleJwt(env_m_srk)) {
      serviceRoleKey = env_m_srk;
      keySource = "METRIQFIT_SERVICE_ROLE_KEY";
    } else {
      // Fallback to whatever exists if no valid JWT found (for legacy support or if all are wrong)
      if (serviceRoleKey) {
        console.warn(`[CRITICAL] No valid Service Role JWT found in environment. Using fallback key of length ${serviceRoleKey.length}. This will likely cause 401 errors.`);
        keySource = "fallback_raw";
        if (serviceRoleKey.length === 41) {
          console.error(`[CRITICAL] Detected 41-character key. This looks like a PUBLISHABLE key, NOT a service role key. Please update Supabase secrets.`);
        }
      }
    }

    console.log(`[generate-user-plans] [${requestId}] Auth Key Check:`, { 
      hasSupabaseUrl: !!supabaseUrl, 
      hasServiceRoleKey: !!serviceRoleKey,
      keySource,
      keyLength: serviceRoleKey?.length || 0
    });

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(`[generate-user-plans] [${requestId}] Environment missing:`, { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!serviceRoleKey,
        requestId 
      });
      return jsonResponse({ 
        success: false, 
        error: "Server configuration error: Missing Supabase credentials",
        details: "The Edge Function is missing required environment variables. Contact support.",
        requestId,
        step: 'environment_check'
      }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = (authHeader.split(" ")[1] ?? "").trim();
    const isServiceRole = false;
    console.log(`[DEBUG] Auth check: jwt length=${jwt.length}`);
    
    // Create base client early for auth check
    const baseClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    if (!authHeader) {
      return jsonResponse({ 
        success: false, 
        error: "Missing authorization header",
        requestId,
        step: 'auth_validation',
        details: 'Authorization header is required'
      }, 401);
    }
    // Clerk JWT verification via shared helper (Phase 0.5).
    // Supabase's GoTrue (auth.getUser) only accepts HS256 project tokens and rejects
    // Clerk's RS256 third-party tokens; verifyClerkRequest validates the Clerk JWT
    // against the pinned issuer's JWKS and returns the same shape as auth.getUser.
    const { data: authData, error: authErr } = await verifyClerkRequest(req);
    if (authErr || !authData.user) {
      return jsonResponse({
        success: false,
        error: "Unauthorized",
        requestId,
        step: 'auth_validation',
        details: authErr?.message || 'Invalid or expired authentication token'
      }, 401);
    }
    const user = authData.user;

    // proceed to body parsing

    console.log('[generate-user-plans] Parsing request body...');
    let body: any;
    try {
      body = await req.json();
      console.log('[generate-user-plans] Body parsed successfully:', { 
        hasUserId: !!body.user_id,
        planType: body.plan_type,
        generationMode: body.generation_mode,
        generationVersion: body.generation_version
      });
    } catch (parseError: any) {
      console.error(`[generate-user-plans] [${requestId}] Failed to parse body:`, parseError.message);
      return jsonResponse({ 
        success: false, 
        error: "Invalid request body",
        requestId,
        step: 'body_parsing',
        details: parseError.message
      }, 400);
    }
    
    const typedBody = body as {
      user_id?: string;
      plan_type?: PlanType;
      generation_mode?: GenerationMode;
      activation_mode?: ActivationMode;
      generation_horizon_days?: number | { workout?: number; nutrition?: number };
      macro_tolerance_percent?: number;
      include_variants?: boolean;
      split_override?: string | null;
      program_family_preference?: string | null;
      training_style_preferences?: string[];
      progression_preference?: string | null;
      strict_days_match?: boolean;
      strict_macro_mode?: boolean;
      variety_profile?: VarietyProfile;
      strict_template_source?: boolean;
      workout_regeneration?: WorkoutRegenerationRequest | null;
      nutrition_regeneration?: NutritionRegenerationRequest | null;
      generation_version?: 'v1' | 'v2' | 'v3';
      dry_run?: boolean;
    };

    const dryRun = !!typedBody.dry_run;

    const userId = typedBody.user_id || user.id;
    if (!isServiceRole && userId !== user.id) {
      console.error(`[generate-user-plans] [${requestId}] User mismatch:`, { bodyUserId: typedBody.user_id, authUserId: user.id });
      return jsonResponse({ 
        success: false, 
        error: "Invalid user context",
        requestId,
        step: 'user_validation',
        details: 'User ID in request body does not match authenticated user'
      }, 403);
    }

    const planType = typedBody.plan_type || "both";
    if (!["workout", "nutrition", "both"].includes(planType)) {
      return jsonResponse({ 
        success: false, 
        error: "Invalid plan_type",
        requestId,
        step: 'validation',
        details: `plan_type must be 'workout', 'nutrition', or 'both', received: ${planType}`
      }, 400);
    }

    const workoutHorizon = typeof typedBody.generation_horizon_days === "number"
      ? Math.max(7, Math.min(56, body.generation_horizon_days))
      : Math.max(7, Math.min(56, body.generation_horizon_days?.workout ?? 28));

    const nutritionHorizon = typeof typedBody.generation_horizon_days === "number"
      ? Math.max(7, Math.min(14, body.generation_horizon_days))
      : Math.max(7, Math.min(14, body.generation_horizon_days?.nutrition ?? 7));

    const strictDaysMatch = typedBody.strict_days_match !== false;
    const strictMacroMode = typedBody.strict_macro_mode !== false;
    const strictTemplateSource = typedBody.strict_template_source === true;
    const generationMode: GenerationMode = typedBody.generation_mode === "regenerate" ? "regenerate" : "initial";
    const activationMode: ActivationMode = typedBody.activation_mode === "preview" ? "preview" : "activate";
    const configuredGenerationEngine = String((Deno as any).env.get("PLAN_GENERATION_ENGINE") || "v3").toLowerCase();
    const requestedGenerationVersion = typedBody.generation_version || (configuredGenerationEngine === "v2" ? "v2" : "v3");
    const enableV3EdgePipeline = (Deno as any).env.get("ENABLE_V3_EDGE_PIPELINE") !== "false";
    const generationVersion: "v1" | "v2" | "v3" = requestedGenerationVersion === "v1"
      ? "v1"
      : configuredGenerationEngine === "v2" || !enableV3EdgePipeline
        ? "v2"
        : requestedGenerationVersion === "v3"
          ? "v3"
          : "v2";

    // 🔍 BRANCH INTEGRITY: Log resolved generation branch so deployment drift is immediately visible
    console.log('[generate-user-plans] Branch decision:', {
      requested_generation_version: typedBody.generation_version ?? '(not set - defaulting by PLAN_GENERATION_ENGINE)',
      configured_generation_engine: configuredGenerationEngine,
      resolved_generation_version: generationVersion,
      v3_edge_pipeline_enabled: enableV3EdgePipeline,
      v3_request_routed_to_stable_generator: requestedGenerationVersion === "v3" && generationVersion !== "v3",
      resolved_planner_mode: generationVersion === 'v1' ? 'deterministic' : (generationVersion === 'v3' ? 'deterministic_v3' : 'hybrid'),
      resolved_source_model: generationVersion === 'v1' ? 'v1_architect' : (generationVersion === 'v3' ? 'v3_deterministic' : 'v2_template'),
    });

    const programFamilyPreference = typedBody.program_family_preference || null;
    const trainingStylePreferences = (typedBody.training_style_preferences || []).filter(Boolean);
    const progressionPreference = typedBody.progression_preference || null;
    const workoutRegeneration = generationMode === "regenerate" && planType !== "nutrition"
      ? (typedBody.workout_regeneration || null)
      : null;

    // 🔍 DIAGNOSTIC: Log regeneration request
    if (workoutRegeneration) {
      console.log('🔍 Regeneration request received:', {
        has_workout_regen: !!workoutRegeneration,
        days_per_week: workoutRegeneration.days_per_week_override,
        split_family: workoutRegeneration.preferred_split_family,
        progression: workoutRegeneration.progression_preference,
        days_off: workoutRegeneration.preferred_days_off,
        goal_emphasis: workoutRegeneration.goal_emphasis,
        keep_current_split: workoutRegeneration.keep_current_split,
        start_fresh: workoutRegeneration.start_fresh,
      });
    }
    const nutritionRegeneration = generationMode === "regenerate" && planType !== "workout"
      ? (typedBody.nutrition_regeneration || null)
      : null;
    const varietyProfile: VarietyProfile = typedBody.variety_profile === "minimal" || typedBody.variety_profile === "high"
      ? typedBody.variety_profile
      : "moderate_rotation_4_5";
    const defaultTolerance = strictMacroMode ? 5 : 10;
    const macroTolerancePercent = clamp(Number(typedBody.macro_tolerance_percent ?? defaultTolerance), 5, 20);
    const includeVariants = typedBody.include_variants !== false;
    const requestCorrelationId = normalizeCorrelationId(String((body as any)?.correlation_id || "")) || incomingCorrelationId || requestId;

    const [idempotencyAnswersRes, idempotencyTargetsRes] = await Promise.all([
      baseClient
        .from("onboarding_answers")
        .select("answers, completed_at")
        .eq("user_id", userId)
        .maybeSingle(),
      baseClient
        .from("user_targets")
        .select("calories, protein_g, carbs_g, fat_g, water_ml, day_type_targets_json, target_diagnostics_json, updated_at")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const idempotencyKey = await sha256Hex(stableStringify({
      user_id: userId,
      plan_type: planType,
      generation_version: generationVersion,
      generation_mode: generationMode,
      activation_mode: activationMode,
      workout_horizon: workoutHorizon,
      nutrition_horizon: nutritionHorizon,
      strict_days_match: strictDaysMatch,
      strict_macro_mode: strictMacroMode,
      strict_template_source: strictTemplateSource,
      macro_tolerance_percent: macroTolerancePercent,
      include_variants: includeVariants,
      variety_profile: varietyProfile,
      split_override: typedBody.split_override || null,
      program_family_preference: programFamilyPreference,
      training_style_preferences: trainingStylePreferences,
      progression_preference: progressionPreference,
      workout_regeneration: workoutRegeneration,
      nutrition_regeneration: nutritionRegeneration,
      onboarding_answers: idempotencyAnswersRes.data?.answers || null,
      onboarding_completed_at: idempotencyAnswersRes.data?.completed_at || null,
      targets: idempotencyTargetsRes.data || null,
    }));

    if (!dryRun) {
      const { data: existingRun, error: existingRunError } = await baseClient
        .from("plan_generation_runs")
        .select("id, status, orchestration_status, current_stage, ai_response, warnings_json, created_at")
        .eq("user_id", userId)
        .eq("idempotency_key", idempotencyKey)
        .in("status", ["pending", "success"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingRunError) {
        console.warn(`[generate-user-plans] [${requestId}] Idempotency lookup failed:`, existingRunError.message);
      } else if (existingRun?.status === "success") {
        const aiResponse = (existingRun.ai_response || {}) as Record<string, any>;
        return jsonResponse({
          success: true,
          status: activationMode === "preview" ? "preview_ready" : "success",
          requestId,
          run_id: existingRun.id,
          runId: existingRun.id,
          workout_plan_id: aiResponse.workout_plan_id,
          workoutPlanId: aiResponse.workout_plan_id,
          nutrition_plan_id: aiResponse.nutrition_plan_id,
          nutritionPlanId: aiResponse.nutrition_plan_id,
          workout_schedule_count: aiResponse.workout_schedule_count || 0,
          nutrition_variant_count: aiResponse.nutrition_variant_count || 0,
          consistency_seeded: aiResponse.consistency_seeded || false,
          warnings: existingRun.warnings_json || [],
          idempotent_replay: true,
        });
      } else if (existingRun?.status === "pending" && generationVersion === "v3") {
        scheduleBackgroundTask(processV3GenerationRun({
          supabase: baseClient,
          userId,
      runId: existingRun.id,
      activationMode,
      generationMode,
      requestId,
      startedAt: Date.now(),
        }));
        return jsonResponse({
          success: true,
          status: existingRun.orchestration_status || "queued",
          requestId,
          run_id: existingRun.id,
          runId: existingRun.id,
          current_stage: existingRun.current_stage || "queued",
          generation_version: "v3",
          idempotent_replay: true,
        }, 202);
      } else if (existingRun?.status === "pending") {
        return jsonResponse({
          success: false,
          status: "pending",
          error: "Plan generation is already in progress for these onboarding answers.",
          error_code: "generation_in_progress",
          requestId,
          run_id: existingRun.id,
          runId: existingRun.id,
          step: "idempotency",
        }, 409);
      }
    }

    if (generationVersion === "v3") {
      if (planType !== "both") {
        return jsonResponse({
          success: false,
          error: "V3 generation currently supports workout + nutrition together only.",
          error_code: "v3_plan_type_unsupported",
          requestId,
          step: "v3_validation",
          details: { plan_type: planType, supported_plan_type: "both" },
        }, 400);
      }

      let v3RunId: string;
      try {
        const nowIso = new Date().toISOString();
        const { data: runRow, error: runErr } = await baseClient
          .from("plan_generation_runs")
          .insert({
            user_id: userId,
            plan_type: "both",
            status: "pending",
            planner_mode: "deterministic_v3",
            generation_version: 3,
            idempotency_key: idempotencyKey,
            correlation_id: requestCorrelationId,
            orchestration_status: "queued",
            current_stage: "queued",
            queued_at: nowIso,
            stage_updated_at: nowIso,
            stage_history_json: [{
              stage: "queued",
              orchestration_status: "queued",
              at: nowIso,
              details: {
                trigger_source: generationMode === "regenerate" ? "my_plan_regenerate" : "system_generate",
                activation_mode: activationMode,
              },
            }],
            input_context: {
              generation_mode: generationMode,
              activation_mode: activationMode,
              trigger_source: generationMode === "regenerate" ? "my_plan_regenerate" : "system_generate",
              workout_horizon_days: workoutHorizon,
              nutrition_horizon_days: nutritionHorizon,
              macro_tolerance_percent: macroTolerancePercent,
              generation_version: "v3",
            },
          })
          .select("id")
          .single();
        if (runErr || !runRow) {
          throw new Error(`plan_generation_runs insert: ${runErr?.message ?? "no row returned"}`);
        }
        v3RunId = runRow.id;
      } catch (err: any) {
        if ((err as any)?.code === "23505") {
          const { data: existingRun } = await baseClient
            .from("plan_generation_runs")
            .select("id, status, orchestration_status, current_stage")
            .eq("user_id", userId)
            .eq("idempotency_key", idempotencyKey)
            .in("status", ["pending", "success"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (existingRun?.id) {
            scheduleBackgroundTask(processV3GenerationRun({
              supabase: baseClient,
              userId,
              runId: existingRun.id,
              activationMode,
              generationMode,
              requestId,
              startedAt: Date.now(),
            }));
            return jsonResponse({
              success: true,
              status: existingRun.orchestration_status || existingRun.status || "queued",
              requestId,
              run_id: existingRun.id,
              runId: existingRun.id,
              current_stage: existingRun.current_stage || "queued",
              generation_version: "v3",
              idempotent_replay: true,
            }, 202);
          }
        }
        console.error(`[generate-user-plans] [${requestId}] V3 run-row create error:`, err);
        return jsonResponse({
          success: false,
          error: 'V3 pipeline failed (run row)',
          requestId,
          step: 'v3_pipeline_run_row',
          details: err?.message || String(err),
        }, 500);
      }

      scheduleBackgroundTask(processV3GenerationRun({
        supabase: baseClient,
        userId,
        runId: v3RunId,
        activationMode,
        generationMode,
        requestId,
        startedAt: Date.now(),
      }));

      return jsonResponse({
        success: true,
        status: "queued",
        requestId,
        run_id: v3RunId,
        runId: v3RunId,
        current_stage: "queued",
        generation_version: "v3",
      }, 202);
    }

    // Wrap Supabase client for dry run if requested
    const supabase = dryRun ? new Proxy(baseClient, {
      get(target, prop) {
        if (prop === 'from') {
          return (table: string) => {
            const originalFrom = target.from(table);
            return new Proxy(originalFrom, {
              get(fromTarget, fromProp) {
                if (['insert', 'update', 'upsert', 'delete'].includes(fromProp as string)) {
                  return () => {
                    const mock = {
                      select: () => mock,
                      eq: () => mock,
                      match: () => mock,
                      order: () => mock,
                      limit: () => mock,
                      single: () => Promise.resolve({ data: { id: crypto.randomUUID() }, error: null }),
                      maybeSingle: () => Promise.resolve({ data: { id: crypto.randomUUID() }, error: null }),
                      then: (onfulfilled: any) => onfulfilled({ data: { id: crypto.randomUUID() }, error: null }),
                    };
                    return mock;
                  };
                }
                return (fromTarget as any)[fromProp];
              }
            });
          };
        }
        return (target as any)[prop];
      }
    }) : baseClient;

    const currentPlanContext = (planType === "workout" || planType === "both")
      ? await fetchCurrentWorkoutPlanContext(supabase, userId, workoutRegeneration?.current_plan_id || null)
      : null;
    const currentNutritionPlanContext = (planType === "nutrition" || planType === "both")
      ? await fetchCurrentNutritionPlanContext(supabase, userId, nutritionRegeneration?.current_plan_id || null)
      : null;

    if (generationMode === "regenerate" && (planType === "workout" || planType === "both") && !currentPlanContext) {
      return jsonResponse({ 
        success: false, 
        error: "No active workout plan found for regeneration",
        requestId,
        step: 'regeneration_validation',
        details: 'Cannot regenerate workout plan: no active plan found for this user'
      }, 400);
    }
    if (generationMode === "regenerate" && (planType === "nutrition" || planType === "both") && !currentNutritionPlanContext) {
      return jsonResponse({ 
        success: false, 
        error: "No active nutrition plan found for regeneration",
        requestId,
        step: 'regeneration_validation',
        details: 'Cannot regenerate nutrition plan: no active plan found for this user'
      }, 400);
    }

    const startedAt = Date.now();

    // Create generation run record
    let runId: string;
    try {
      const { data: runData, error: runError } = await supabase
        .from("plan_generation_runs")
        .insert({
          user_id: userId,
          plan_type: planType,
          status: "pending",
          planner_mode: generationVersion === 'v1' ? 'deterministic' : 'hybrid',
          generation_version: generationVersion === 'v1' ? 1 : 2,
          idempotency_key: idempotencyKey,
          correlation_id: requestCorrelationId,
          orchestration_status: "running",
          current_stage: "run_initialization",
          queued_at: new Date().toISOString(),
          stage_updated_at: new Date().toISOString(),
          stage_history_json: [{
            stage: "run_initialization",
            orchestration_status: "running",
            at: new Date().toISOString(),
            details: { generation_version: generationVersion },
          }],
          input_context: {
            generation_mode: generationMode,
            activation_mode: activationMode,
            trigger_source: generationMode === "regenerate" ? "my_plan_regenerate" : "system_generate",
            workout_horizon_days: workoutHorizon,
            nutrition_horizon_days: nutritionHorizon,
            include_variants: includeVariants,
            macro_tolerance_percent: macroTolerancePercent,
            split_override: typedBody.split_override || null,
            program_family_preference: programFamilyPreference,
            training_style_preferences: trainingStylePreferences,
            progression_preference: progressionPreference,
            strict_days_match: strictDaysMatch,
            strict_macro_mode: strictMacroMode,
            strict_template_source: strictTemplateSource,
            variety_profile: varietyProfile,
            current_plan_snapshot: currentPlanContext
              ? {
                  plan_id: currentPlanContext.planId,
                  family_key: currentPlanContext.familyKey,
                  progression_model: currentPlanContext.progressionModel,
                  days_per_week: currentPlanContext.daysPerWeek,
                  weekly_layout: currentPlanContext.weeklyLayout,
                }
              : null,
            current_nutrition_plan_snapshot: currentNutritionPlanContext
              ? {
                  plan_id: currentNutritionPlanContext.planId,
                  meal_slots: currentNutritionPlanContext.mealSlots,
                }
              : null,
            adherence_summary: currentPlanContext?.adherenceSummary || null,
            workout_regeneration: workoutRegeneration,
            nutrition_regeneration: nutritionRegeneration,
          },
        })
        .select("id")
        .single();

	      if (runError || !runData) {
	        if ((runError as any)?.code === "23505" && !dryRun) {
	          const { data: existingRun } = await baseClient
	            .from("plan_generation_runs")
	            .select("id, status, ai_response, warnings_json")
	            .eq("user_id", userId)
	            .eq("idempotency_key", idempotencyKey)
	            .in("status", ["pending", "success"])
	            .order("created_at", { ascending: false })
	            .limit(1)
	            .maybeSingle();
	          if (existingRun?.status === "success") {
	            const aiResponse = (existingRun.ai_response || {}) as Record<string, any>;
	            return jsonResponse({
	              success: true,
	              status: activationMode === "preview" ? "preview_ready" : "success",
	              requestId,
	              run_id: existingRun.id,
	              runId: existingRun.id,
	              workout_plan_id: aiResponse.workout_plan_id,
	              workoutPlanId: aiResponse.workout_plan_id,
	              nutrition_plan_id: aiResponse.nutrition_plan_id,
	              nutritionPlanId: aiResponse.nutrition_plan_id,
	              workout_schedule_count: aiResponse.workout_schedule_count || 0,
	              nutrition_variant_count: aiResponse.nutrition_variant_count || 0,
	              warnings: existingRun.warnings_json || [],
	              idempotent_replay: true,
	            });
	          }
	          if (existingRun?.status === "pending") {
	            return jsonResponse({
	              success: false,
	              status: "pending",
	              error: "Plan generation is already in progress for these onboarding answers.",
	              error_code: "generation_in_progress",
	              requestId,
	              run_id: existingRun.id,
	              runId: existingRun.id,
	              step: "idempotency",
	            }, 409);
	          }
	        }
	        throw new Error(`Failed to create generation run: ${runError?.message || "unknown"}`);
	      }

      runId = runData.id;
      console.log(`[generate-user-plans] [${requestId}] Run created: ${runId}`);
    } catch (runError: any) {
      console.error(`[generate-user-plans] [${requestId}] Failed to create run:`, runError);
      return jsonResponse({
        success: false,
        error: `Failed to initialize plan generation: ${runError.message}`,
        requestId,
        step: 'run_initialization',
        details: runError.message,
      }, 500);
    }

    const warnings: string[] = [];
    let stagedWorkoutPlanId: string | null = null;
    let stagedNutritionPlanId: string | null = null;

    try {
      // STEP 1: Fetch user context
      console.log(`[generate-user-plans] [${requestId}] Step 1/5: Fetching user context...`);
      const context = await fetchUserContext(supabase, userId);
      console.log(`[generate-user-plans] [${requestId}] User context fetched:`, { 
        hasProfile: !!context.profile,
        hasOnboarding: !!context.onboarding,
        hasTargets: !!context.targets,
        exerciseCount: context.exercises?.length,
        foodCount: context.foods?.length
      });
      
      // STEP 2: Apply regeneration context
      console.log(`[generate-user-plans] [${requestId}] Step 2/5: Applying workout regeneration...`);
      const workoutContext = applyWorkoutRegenerationToContext(
        context,
        workoutRegeneration,
        currentPlanContext,
      );
      console.log(`[generate-user-plans] [${requestId}] Workout context ready:`, {
        hasOnboarding: !!workoutContext.onboarding,
        trainingDays: workoutContext.onboarding?.training_days_per_week
      });

      // 🔍 DIAGNOSTIC: Log context after regeneration
      if (workoutRegeneration) {
        console.log('🔍 Context after applying regeneration:', {
          training_days: workoutContext.onboarding.training_days_per_week,
          split_family: workoutContext.onboarding.preferred_split_family,
          progression: workoutContext.onboarding.progression_preference,
          days_off: workoutContext.onboarding.preferred_days_off,
          session_emphasis: workoutContext.onboarding.session_emphasis,
          equipment: workoutContext.onboarding.equipment_access,
        });
      }
      const nutritionContext = applyNutritionRegenerationToContext(
        workoutContext,
        nutritionRegeneration,
      );
      const workoutConfig = buildWorkoutGenerationConfig({
        generationMode,
        activationMode,
        workoutRegeneration,
        currentPlanContext,
      });
      const effectiveProgramFamilyPreference =
        workoutRegeneration?.preferred_split_family
        || (workoutRegeneration?.keep_current_split ? currentPlanContext?.familyKey || null : null)
        || programFamilyPreference;
      const effectiveProgressionPreference =
        workoutRegeneration?.progression_preference
        || progressionPreference;

      // 🔍 DIAGNOSTIC: Log effective preferences for template selection
      if (workoutRegeneration) {
        console.log('🔍 Effective preferences for template selection:', {
          programFamily: effectiveProgramFamilyPreference,
          progression: effectiveProgressionPreference,
          trainingStyles: trainingStylePreferences,
          splitOverride: typedBody.split_override,
          currentPlanFamily: currentPlanContext?.familyKey,
        });
      }

      let workoutResult:
        | Awaited<ReturnType<typeof storeWorkoutPlan>>
        | Awaited<ReturnType<typeof storeWorkoutPlanFromTemplateV2>>
        | null = null;
      let nutritionResult: Awaited<ReturnType<typeof storeNutritionPlan>> | null = null;

      const generateWorkoutCandidate = async (attemptConfig: WorkoutGenerationConfig) => {
        const selectedTemplate = await chooseTemplateFromCatalog(
          supabase,
          workoutContext,
          {
            strictDaysMatch,
            splitOverride: typedBody.split_override || null,
            programFamilyPreference: effectiveProgramFamilyPreference,
            trainingStylePreferences,
            progressionPreference: effectiveProgressionPreference,
            strictTemplateSource,
            excludeFamilyKey: attemptConfig.excludeFamilyKey,
          },
        );
        warnings.push(...selectedTemplate.warnings);

        if (selectedTemplate.template) {
          const result = await storeWorkoutPlanFromTemplateV2(
            supabase,
            userId,
            runId,
            workoutContext,
            selectedTemplate.template,
            workoutHorizon,
            attemptConfig,
            dryRun
          );
          warnings.push(...result.warnings);
          return result;
        }

        if (strictTemplateSource) {
          throw new StrictTemplateSelectionError(
            "No supported workout template matches your current training setup.",
            {
              generation_version: generationVersion,
              requested_days_per_week: workoutContext.onboarding.training_days_per_week ?? null,
              goal_type: workoutContext.onboarding.goal_type ?? null,
              experience_level: workoutContext.onboarding.experience_level ?? null,
              equipment_access: workoutContext.onboarding.equipment_access ?? null,
              preferred_split_family: workoutContext.onboarding.preferred_split_family ?? null,
              split_override: typedBody.split_override || null,
              program_family_preference: effectiveProgramFamilyPreference || null,
              progression_preference: effectiveProgressionPreference || null,
              training_style_preferences: trainingStylePreferences,
              strict_days_match: strictDaysMatch,
              strict_template_source: strictTemplateSource,
              exclude_family_key: attemptConfig.excludeFamilyKey || null,
              recommended_onboarding_route: "/(onboarding)/training",
              recommendation:
                "Adjust training days, equipment access, or split preference and try again.",
            },
            selectedTemplate.warnings,
          );
        }

        const split = chooseSplit(
          workoutContext,
          SPLIT_LIBRARY,
          typedBody.split_override,
          strictDaysMatch,
          attemptConfig.excludeFamilyKey,
        );

        const result = await storeWorkoutPlan(
          supabase,
          userId,
          runId,
          workoutContext,
          split,
          workoutHorizon,
          attemptConfig,
          dryRun
        );

        warnings.push(...result.warnings);
        return result;
      };

      if (planType === "workout" || planType === "both") {
        console.log(`[generate-user-plans] [${requestId}] Step 3/5: Starting workout generation (${generationVersion})...`);
        
        if (generationVersion === 'v1') {
          console.log(`[V1] [${requestId}] Using V1 generation path`);
          
          try {
          // STEP 3A: Map onboarding to V1 profile
          console.log(`[V1] [${requestId}] Step 3A: Mapping onboarding to V1 profile...`);
          const mapOnboardingToV1 = (onboarding: any): OnboardingProfileInput => {
            const minutes = onboarding.minutes_per_workout === '90_plus'
              ? 90
              : Number(onboarding.minutes_per_workout || 60);
            let env = SessionEnvironment.Commercial;
            if (onboarding.equipment_access === 'bodyweight_only') env = SessionEnvironment.Bodyweight;
            else if (onboarding.equipment_access === 'dumbbells_only') env = SessionEnvironment.AptHotel;
            else if (onboarding.equipment_access === 'dumbbells_plus_bench') env = SessionEnvironment.Home;

            let exp = ExperienceLevel.Beginner;
            if (onboarding.experience_level === 'intermediate') exp = ExperienceLevel.Intermediate;
            else if (onboarding.experience_level === 'advanced') exp = ExperienceLevel.Advanced;

            let goal = GoalBucket.GenFitness;
            if (onboarding.goal_type === 'lose_weight') goal = GoalBucket.FatLoss;
            else if (onboarding.goal_type === 'gain_weight' || onboarding.goal_type === 'build_muscle') goal = GoalBucket.Hypertrophy;
            else if (onboarding.goal_type === 'recomp') goal = GoalBucket.Recomp;
            else if (onboarding.goal_type === 'increase_endurance') goal = GoalBucket.Athletic;
            // session_emphasis === 'strength' overrides broad goals into GoalBucket.Strength.
            // This is the primary way to reach the dedicated strength families (2-day and 3-day).
            // It is intentionally applied after goal_type so it can override gain_weight and general_fitness.
            if (onboarding.session_emphasis === 'strength') goal = GoalBucket.Strength;
            else if (onboarding.session_emphasis === 'conditioning') goal = GoalBucket.Athletic;

            const weightDelta = typeof onboarding.target_weight_lb === 'number' && typeof onboarding.current_weight_lb === 'number'
              ? onboarding.target_weight_lb - onboarding.current_weight_lb
              : 0;

            let comfort = LiftComfort.BarbellBasic;
            if (env === SessionEnvironment.Bodyweight) comfort = LiftComfort.NoBarbell;
            else if (env === SessionEnvironment.AptHotel) comfort = LiftComfort.MachineDB;
            else if (env === SessionEnvironment.Home) comfort = LiftComfort.MachineDB;
            else if (exp === ExperienceLevel.Beginner) comfort = LiftComfort.MachineDB;
            else if (exp === ExperienceLevel.Advanced && onboarding.session_emphasis === 'strength') comfort = LiftComfort.BarbellAdv;
            // Big bulk goal for advanced users signals comfort with barbell work
            else if (exp === ExperienceLevel.Advanced && (onboarding.goal_type === 'build_muscle' || onboarding.goal_type === 'gain_weight') && weightDelta > 15) comfort = LiftComfort.BarbellAdv;

            return {
              experienceLevel: exp,
              primaryGoal: goal,
              daysPerWeek: onboarding.training_days_per_week || 3,
              liftComfort: comfort,
              environment: env,
              sessionDurationMin: Number.isFinite(minutes) ? minutes : 60,
              preferredSplitFamily: onboarding.preferred_split_family || null,
            };
          };

          // Defensive: validate onboarding data before V1 mapping
          if (!workoutContext.onboarding) {
            throw new Error("V1: workoutContext.onboarding is missing");
          }
          
          const profile = mapOnboardingToV1(workoutContext.onboarding);
          console.log(`[V1] [${requestId}] Mapped profile:`, JSON.stringify(profile, null, 2));
          
          // STEP 3B: Route to plan family
          console.log(`[V1] [${requestId}] Step 3B: Routing to plan family...`);
          const recommendation = routeUserToPlan(profile);
          console.log(`[V1] [${requestId}] Router recommendation:`, JSON.stringify(recommendation));
          
          if (!recommendation?.familyIdRef) {
            throw new Error("V1: routeUserToPlan returned invalid recommendation: " + JSON.stringify(recommendation));
          }
          
          // Fix 3: Guard plan family lookup — remove silent fallback to planFamilies[0].
          // If the recommended family is missing, something is wrong with the seed data;
          // surfacing a clear 500 is better than silently using the wrong family.
          const family = planFamilies.find(f => f.external_id === recommendation.familyIdRef);
          if (!family) {
            console.error(
              `[V1] [${requestId}] Plan family not found: "${recommendation.familyIdRef}".`,
              `Available families: [${planFamilies.map(f => f.external_id).join(", ")}]`,
            );
            await supabase
              .from("plan_generation_runs")
              .update({
                status: "failed",
                completed_at: new Date().toISOString(),
                validation_errors: [`V1 plan family not found: ${recommendation.familyIdRef}`],
                warnings_json: warnings,
              })
              .eq("id", runId);
            return jsonResponse({
              success: false,
              error: `Plan family not found: ${recommendation.familyIdRef}`,
              details: `The recommended plan family was not found in the library. This is a seed/configuration issue — please contact support.`,
              requestId,
              step: "v1_family_lookup",
            }, 500);
          }

          // Fix 4: Guard template lookup before hydration — return structured 500 if missing.
          const template = coreTemplates.find(t => t.external_id === family.template_id);
          if (!template) {
            console.error(
              `[V1] [${requestId}] Template not found: "${family.template_id}".`,
              `Available templates: [${coreTemplates.map(t => t.external_id).join(", ")}]`,
            );
            await supabase
              .from("plan_generation_runs")
              .update({
                status: "failed",
                completed_at: new Date().toISOString(),
                validation_errors: [`V1 template not found: ${family.template_id}`],
                warnings_json: warnings,
              })
              .eq("id", runId);
            return jsonResponse({
              success: false,
              error: "Plan template not found",
              templateId: family.template_id,
              details: `Template "${family.template_id}" was not found in the core template library. This is a seed/configuration issue.`,
              requestId,
              step: "v1_template_lookup",
            }, 500);
          }

          const hydratorPersona = {
            goal: profile.primaryGoal,
            environment: profile.environment,
            comfort: profile.liftComfort,
            experience_level: profile.experienceLevel,
            injuries: workoutContext.onboarding.injuries || [],
            session_duration_min: profile.sessionDurationMin,
            conditioning_goal: workoutContext.onboarding.goal_type === 'lose_weight'
              || workoutContext.onboarding.goal_type === 'increase_endurance'
              || workoutContext.onboarding.session_emphasis === 'conditioning',
          };
          
          // STEP 3C: Hydrate template
          console.log(`[V1] [${requestId}] Step 3C: Hydrating template...`);
          console.log(`[V1] [${requestId}] Routed Family ID:`, recommendation.familyIdRef);
          console.log(`[V1] [${requestId}] Resolved Template ID:`, family.template_id);
          
          let v1Plan;
          try {
            v1Plan = hydrateTemplate(template as any, family.external_id, hydratorPersona, profile.daysPerWeek);
            console.log(`[V1] [${requestId}] Hydration Success: TRUE`);
          } catch (e: any) {
            console.error(`[V1] [${requestId}] Hydration Success: FALSE -`, e.message);
            throw e;
          }

          // Fix 8: Quality gate — validate V1 plan structure IN MEMORY before any DB writes.
          // This prevents orphaned inactive plan rows when the generated content is unusable.
          // Note: V1 plans include Recovery days, so we count only workout days for validation.
          const v1WorkoutDays = (v1Plan.days || []).filter((d: any) => d.day_type !== "Recovery");
          const v1HasExercises = v1WorkoutDays.some((d: any) =>
            Array.isArray(d.exercises) && d.exercises.length > 0
          );
          const v1FirstEx = v1WorkoutDays.find((d: any) => d.exercises?.length > 0)?.exercises?.[0];
          const v1ExercisesRenderable = !!(v1FirstEx?.sets && (v1FirstEx?.reps_min || v1FirstEx?.reps_max));
          const v1Exercises = v1WorkoutDays.flatMap((d: any) => Array.isArray(d.exercises) ? d.exercises : []);
          const blockedExerciseNames = ["Pike Push-Up"];
          const blockedGeneratedExercises = v1Exercises
            .filter((exercise: any) => blockedExerciseNames.includes(String(exercise?.name || "")))
            .map((exercise: any) => exercise.name);
          const v1PreStoreDetails = {
            workout_day_count: v1WorkoutDays.length,
            has_exercises: v1HasExercises,
            exercises_renderable: v1ExercisesRenderable,
            blocked_generated_exercises: blockedGeneratedExercises,
          };
          const v1PreStorePassed = v1WorkoutDays.length > 0
            && v1HasExercises
            && v1ExercisesRenderable
            && blockedGeneratedExercises.length === 0;
          if (!v1PreStorePassed) {
            console.error(`[V1] [${requestId}] Pre-store quality check FAILED — aborting DB writes:`, v1PreStoreDetails);
            await supabase
              .from("plan_generation_runs")
              .update({
                status: "failed",
                completed_at: new Date().toISOString(),
                validation_errors: blockedGeneratedExercises.length > 0
                  ? [`Generated V1 plan included blocked exercise(s): ${blockedGeneratedExercises.join(", ")}`]
                  : ["Generated V1 plan failed pre-store quality check"],
                warnings_json: warnings,
              })
              .eq("id", runId);
            return jsonResponse({
              success: false,
              error: "Generated workout plan failed the pre-store quality gate and was not saved",
              details: v1PreStoreDetails,
              requestId,
              step: "v1_quality_gate",
            }, 500);
          }
          console.log(`[V1] [${requestId}] Pre-store quality check PASSED:`, v1PreStoreDetails);

          // STEP 4: Store V1 workout plan
          console.log(`[V1] [${requestId}] Step 4/5: Storing V1 workout plan...`);
          try {
            workoutResult = (await storeV1WorkoutPlan(
              supabase,
              userId,
              runId,
              workoutContext,
              v1Plan,
              workoutHorizon,
              workoutConfig
            )) as any;
            
            console.log(`[V1] [${requestId}] DB Writes Success: TRUE, Plan ID:`, workoutResult!.planId);
          } catch (e: any) {
            console.error(`[V1] [${requestId}] DB Writes Success: FALSE -`, e.message);
            throw e;
          }

	          console.log(`[V1] [${requestId}] Stored staged workout plan:`, { activationMode, planId: workoutResult?.planId });
          
          console.log(`[V1] [${requestId}] =============================================`);

          warnings.push(...workoutResult!.warnings);
          
          } catch (v1Error: any) {
            console.error(`[V1] [${requestId}] CRITICAL ERROR in V1 generation:`, v1Error.message);
            console.error(`[V1] [${requestId}] Error stack:`, v1Error.stack);
            
            // Update run status to failed
            await supabase
              .from("plan_generation_runs")
              .update({
                status: "failed",
                completed_at: new Date().toISOString(),
                validation_errors: [`V1 Generation Failed: ${v1Error.message}`],
                warnings_json: warnings,
              })
              .eq("id", runId);
            
            return jsonResponse({
              success: false,
              error: `V1 Generation Failed: ${v1Error.message}`,
              run_id: runId,
              requestId,
              step: 'v1_generation',
              details: {
                message: v1Error.message,
                stack: v1Error.stack?.split('\n')[0] || 'N/A',
              }
            }, 500);
          }

        } else {
          workoutResult = await generateWorkoutCandidate(workoutConfig);

          if (
            generationMode === "regenerate"
            && activationMode === "preview"
            && currentPlanContext
            && workoutResult?.planId
          ) {
            let previewComparable = await fetchStoredWorkoutPlanComparable(supabase, userId, workoutResult.planId);
            if (!previewComparable) {
              throw new Error("Generated workout preview could not be compared");
            }

            let previewDiff = buildWorkoutPlanDiff({
              currentPlan: currentPlanContext.comparablePlan,
              previewPlan: previewComparable,
              minorRefinement: workoutConfig.minorRefinement,
            });

            if (!previewDiff.isMateriallyDifferent) {
              await deleteWorkoutPlanTree(supabase, workoutResult.planId);

              const retryExcludeFamily = currentPlanContext.familyKey
                || workoutConfig.excludeFamilyKey
                || null;
              const retryConfig: WorkoutGenerationConfig = {
                ...workoutConfig,
                excludeFamilyKey: retryExcludeFamily,
              };

              workoutResult = await generateWorkoutCandidate(retryConfig);
              previewComparable = await fetchStoredWorkoutPlanComparable(supabase, userId, workoutResult.planId);
              if (!previewComparable) {
                throw new Error("Regenerated workout preview could not be compared");
              }

              previewDiff = buildWorkoutPlanDiff({
                currentPlan: currentPlanContext.comparablePlan,
                previewPlan: previewComparable,
                minorRefinement: retryConfig.minorRefinement,
              });

              if (!previewDiff.isMateriallyDifferent) {
                await deleteWorkoutPlanTree(supabase, workoutResult.planId);
                const validationMessage = "We need more direction to build a meaningfully different plan.";

                await updateGenerationRunFailure(supabase, runId, {
                  status: "validation_failed",
                  validationErrors: [validationMessage],
                  warnings,
                  errorStep: "validation",
                  errorCode: "no_material_difference",
                  errorContext: {
                    current_plan_id: currentPlanContext.planId,
                    no_op_blocked: true,
                  },
                  aiResponse: {
                    current_plan_id: currentPlanContext.planId,
                    no_op_blocked: true,
                  },
                });

                return jsonResponse({
                  success: false,
                  status: "validation_failed",
                  run_id: runId,
                  runId,
                  error: validationMessage,
                  message: validationMessage,
                  error_code: "no_material_difference",
                  requestId,
                  step: "validation",
                  details: {
                    current_plan_id: currentPlanContext.planId,
                    no_op_blocked: true,
                  },
                  warnings,
                });
              }
            }
          }
	        }
	      }
	      stagedWorkoutPlanId = workoutResult?.planId || null;

	      if (planType === "nutrition" || planType === "both") {
        // Check if user has scientific nutrition preferences (proteins, carbs, fats)
        const hasScientificPreferences =
          nutritionContext.onboarding.preferred_proteins?.length > 0 &&
          nutritionContext.onboarding.preferred_carbs?.length > 0 &&
          nutritionContext.onboarding.preferred_fats?.length > 0;

        if (hasScientificPreferences) {
          // Build workout schedule for meal timing
          const requestedTrainingDays = Array.isArray(nutritionContext.onboarding.training_days)
            ? nutritionContext.onboarding.training_days.filter((day: string) => DAYS.includes(day))
            : [];
          const resolvedWorkoutTime =
            nutritionContext.onboarding.training_time === "evening" ? "18:00" :
            nutritionContext.onboarding.training_time === "afternoon" ? "15:00" :
            nutritionContext.onboarding.training_time === "midday" ? "12:00" :
            nutritionContext.onboarding.training_time === "mid_morning" ? "09:00" :
            nutritionContext.onboarding.training_time === "early_morning" ? "06:00" :
            null;
          const workoutSchedule = Array.from({ length: 7 }, (_, i) => ({
            day: i,
            hasWorkout: !!resolvedWorkoutTime && (
              requestedTrainingDays.length
                ? requestedTrainingDays.includes(DAYS[i])
                : i < (nutritionContext.onboarding.training_days_per_week || 3)
            ),
            time: resolvedWorkoutTime,
          }));

          // Resolve how many meals per day the user wants — same logic as resolveNutritionMealSlots
          const scientificMealFreqRec = recommendMealFrequency({
            goalType: nutritionContext.onboarding.goal_type,
            calories: nutritionContext.targets.calories,
            proteinGrams: nutritionContext.targets.protein_g,
          });
          const scientificResolvedFreq = resolveMealFrequencyChoice(
            nutritionContext.onboarding.meals_per_day,
            scientificMealFreqRec,
          );
          const scientificMealsPerDay = clamp(
            scientificResolvedFreq === "5_plus" ? 5 : Number(scientificResolvedFreq),
            2,
            5,
          );

          nutritionResult = await generateScientificMealPlan(
            supabase,
            userId,
            runId,
            nutritionContext,
            activationMode,
            nutritionHorizon,
            currentNutritionPlanContext?.planId || null,
            workoutSchedule,
            scientificMealsPerDay,
            macroTolerancePercent,
          );
        } else {
          // Fallback to legacy meal generation
          const nutritionMealSlots = resolveNutritionMealSlots(nutritionContext, nutritionRegeneration, currentNutritionPlanContext);
          nutritionResult = await storeNutritionPlan(
            supabase,
            userId,
            runId,
            nutritionContext,
            macroTolerancePercent,
            includeVariants,
            nutritionHorizon,
            strictMacroMode,
            varietyProfile,
            activationMode,
            currentNutritionPlanContext?.planId || null,
            nutritionMealSlots,
            dryRun,
          );
        }

	        warnings.push(...nutritionResult.warnings);
	      }
	      stagedNutritionPlanId = nutritionResult?.planId || null;

	      const requiresWorkoutPlan = planType === "workout" || planType === "both";
	      const requiresNutritionPlan = planType === "nutrition" || planType === "both";
	      if (requiresWorkoutPlan && !workoutResult?.planId) {
	        throw new Error("Workout generation completed without a workout plan id.");
	      }
	      if (requiresNutritionPlan && !nutritionResult?.planId) {
	        throw new Error("Nutrition generation completed without a nutrition plan id.");
	      }

	      if (activationMode === "activate" && !dryRun) {
	        const { error: promotionError } = await supabase.rpc("promote_generated_plans", {
	          p_user_id: userId,
	          p_workout_plan_id: workoutResult?.planId || null,
	          p_nutrition_plan_id: nutritionResult?.planId || null,
	        });
	        if (promotionError) {
	          throw new Error(`Failed to atomically activate generated plans: ${promotionError.message}`);
	        }
	      }

	      const consistencySeeded = await seedConsistency(supabase, userId);

      const durationMs = Date.now() - startedAt;
      const dedupedWarnings = Array.from(new Set(warnings));

      await supabase
        .from("plan_generation_runs")
        .update({
          status: "success",
          orchestration_status: "success",
          current_stage: "complete",
          stage_updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
          ai_response: {
            workout_plan_id: workoutResult?.planId,
            nutrition_plan_id: nutritionResult?.planId,
            workout_schedule_count: workoutResult?.scheduleCount || 0,
            nutrition_variant_count: nutritionResult?.variantCount || 0,
            workout_selection: (workoutResult as any)?.selection || null,
            consistency_seeded: consistencySeeded,
            activation_mode: activationMode,
            generation_mode: generationMode,
          },
          warnings_json: dedupedWarnings,
          error_step: null,
          error_code: null,
          error_context: null,
        })
        .eq("id", runId);

      // 🛡️ QUALITY GATE: Render verification
      const renderCheckResult = performRenderCheck({
        workout_plan: (workoutResult && 'plan' in workoutResult) ? (workoutResult as any).plan : undefined,
        nutrition_plan: (nutritionResult && 'plan' in nutritionResult) ? (nutritionResult as any).plan : undefined,
      }, context.onboarding.training_days_per_week);

      if (!renderCheckResult.passed) {
        console.error(`[generate-user-plans] Render check FAILED for user ${userId}:`, renderCheckResult.details);
      } else {
        console.log(`[generate-user-plans] Render check PASSED for user ${userId}:`, renderCheckResult.details);
      }

      if (dryRun) {
        return jsonResponse({
          success: renderCheckResult.passed,
          status: renderCheckResult.passed ? "dry_run_success" : "dry_run_render_failed",
          run_id: runId,
          requestId,
          render_check: renderCheckResult,
          data: {
            workout: workoutResult,
            nutrition: nutritionResult,
          },
          warnings: dedupedWarnings,
        }, renderCheckResult.passed ? 200 : 422);
      }

      console.log(`[${requestId}] Plan generation completed successfully in ${durationMs}ms`);
      
      return jsonResponse({
        success: true,
        status: activationMode === "preview" ? "preview_ready" : "success",
        run_id: runId,
        runId,
        requestId,
        render_check: renderCheckResult,
        workout_plan_id: workoutResult?.planId,
        workoutPlanId: workoutResult?.planId,
        nutrition_plan_id: nutritionResult?.planId,
        nutritionPlanId: nutritionResult?.planId,
        workout_schedule_count: workoutResult?.scheduleCount || 0,
        nutrition_variant_count: nutritionResult?.variantCount || 0,
        consistency_seeded: consistencySeeded,
        warnings: dedupedWarnings,
      });
    } catch (generationError) {
      const err = generationError as any;
      const dedupedWarnings = Array.from(
        new Set([
          ...warnings,
          ...(generationError instanceof StrictTemplateSelectionError ? generationError.warnings : []),
	          ...(generationError instanceof WorkoutGenerationValidationError ? (generationError as WorkoutGenerationValidationError).warnings : []),
	        ]),
	      );

	      await Promise.allSettled([
	        stagedWorkoutPlanId ? deleteWorkoutPlanTree(supabase, stagedWorkoutPlanId) : Promise.resolve(),
	        stagedNutritionPlanId ? deleteNutritionPlanTree(supabase, stagedNutritionPlanId) : Promise.resolve(),
	      ]);

	      if (generationError instanceof StrictTemplateSelectionError) {
        await updateGenerationRunFailure(supabase, runId, {
          status: "validation_failed",
          validationErrors: [err.message],
          warnings: dedupedWarnings,
          errorStep: generationError.step,
          errorCode: generationError.errorCode,
          errorContext: generationError.details,
        });

        return jsonResponse({
          success: false,
          status: "validation_failed",
          error: err.message,
          message: err.message,
          error_code: generationError.errorCode,
          run_id: runId,
          runId,
          requestId,
          step: generationError.step,
          details: generationError.details,
          warnings: dedupedWarnings,
        }, generationError.statusCode);
      }

      // Fix 2: Handle structured validation errors (HTTP 400) from fetchUserContext field checks.
      if (err.statusCode === 400) {
        await updateGenerationRunFailure(supabase, runId, {
          status: "failed",
          validationErrors: [err.message],
          warnings: dedupedWarnings,
          errorStep: "context_validation",
          errorCode: err.errorCode || "context_validation_failed",
          errorContext: err.field ? { field: err.field } : null,
        });

        return jsonResponse({
          success: false,
          error: err.message,
          error_code: err.errorCode || "context_validation_failed",
          field: err.field || null,
          requestId,
          step: "context_validation",
        }, 400);
      }

      if (generationError instanceof WorkoutGenerationValidationError) {
        await updateGenerationRunFailure(supabase, runId, {
          status: "validation_failed",
          validationErrors: [err.message],
          warnings: dedupedWarnings,
          errorStep: err.step || "validation",
          errorCode: err.errorCode || "workout_generation_validation_failed",
          errorContext: err.details || null,
        });

        return jsonResponse({
          success: false,
          status: "validation_failed",
          run_id: runId,
          runId,
          error: err.message,
          message: err.message,
          error_code: err.errorCode || "workout_generation_validation_failed",
          warnings: dedupedWarnings,
          requestId,
          step: err.step || 'validation',
          details: err.details || null,
        });
      }

      await updateGenerationRunFailure(supabase, runId, {
        status: "failed",
        validationErrors: [err.message],
        warnings: dedupedWarnings,
        errorStep: err.step || "generation",
        errorCode: err.errorCode || "generation_failed",
        errorContext: err.details || null,
      });

      // Return structured error instead of throwing
      return jsonResponse({
        success: false,
        error: `Generation failed: ${err.message}`,
        error_code: err.errorCode || "generation_failed",
        run_id: runId,
        runId,
        requestId,
        step: err.step || 'generation',
        details: err.details || null,
        warnings: dedupedWarnings,
      }, 500);
    }
  } catch (error) {
    const err = error as Error;
    const duration = Date.now() - startTime;
    console.error(`[generate-user-plans] [${requestId}] Fatal error after ${duration}ms:`, err);
    
    // Always return structured JSON error with requestId for correlation
    return jsonResponse({ 
      success: false, 
      error: err.message || "Failed to generate plans",
      details: "An unexpected error occurred during plan generation. Please try again or contact support if the issue persists.",
      requestId,
      step: 'unknown',
      duration_ms: duration
    }, 500);
  }
});
