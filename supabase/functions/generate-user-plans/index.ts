/* eslint-disable import/no-unresolved */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  STRICT_WORKOUT_FOCUS_TAGS,
  exerciseMatchesWorkoutFocus,
  inferWorkoutFocusTags,
  type WorkoutFocusTag,
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
import {
  selectExercisesForGeneratedSplitDay,
  type GeneratedSplitDayDefinition,
} from "../../../lib/workout/generated-split-selection.ts";
import {
  generateDailyMeals,
  getSlotTemplate,
  type FoodWithMetadata,
  type UserNutritionSelections,
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
  DayType,
  MovementPattern,
  EquipmentCategory,
  SetupComplexity,
  FatigueCost,
  ExerciseTier
} from "../../../types/v1_engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

async function storeV1WorkoutPlan(
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
    lifecycle_state: config.activationMode === "preview" ? "preview" : "live",
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
    days_per_week: v1Plan.days.filter((d: any) => d.day_type !== DayType.Recovery && d.day_type !== DayType.Conditioning).length,
  });

  const planId = workoutPlan.id;
  let scheduleCount = 0;
  const dayRecords: Array<{ id: string; day_type: string }> = [];

  // Resolve V1 exercise names → public.exercises UUIDs (required by FK constraint).
  // coreExercises use string external_ids; public.exercises uses UUIDs. Bridge by name.
  const allExerciseNames = [...new Set(
    v1Plan.days.flatMap((d: any) =>
      d.exercises.map((ex: any) => ex.name as string)
    )
  )];
  const { data: pubExercises, error: exerciseLookupError } = await supabase
    .from("exercises")
    .select("id, name")
    .in("name", allExerciseNames);
  if (exerciseLookupError) {
    throw new Error(`V1 exercise name lookup failed: ${exerciseLookupError.message}`);
  }
  const exerciseIdByName: Record<string, string> = {};
  for (const ex of (pubExercises || [])) {
    if (!exerciseIdByName[ex.name]) exerciseIdByName[ex.name] = ex.id; // first match wins on duplicates
  }

  for (const day of v1Plan.days) {
    if (day.day_type === DayType.Recovery) continue;

    const dayInsert = await insertWorkoutPlanDayWithFallback(supabase, {
      plan_id: planId,
      day_number: day.day_number,
      name: day.day_type,
      focus: day.day_type,
      day_type: "workout",
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
        const publicExerciseId = exerciseIdByName[exercise.name];
        if (!publicExerciseId) {
          warnings.push(`V1 exercise "${exercise.name}" (${exercise.external_id}) not found in public.exercises — skipped`);
          continue;
        }
        const { error: exerciseError } = await supabase
          .from("user_workout_plan_exercises")
          .insert({
            plan_day_id: dayInsert.id,
            block_id: blockInsert.id,
            exercise_id: publicExerciseId,
            order_index: exerciseIndex + 1,
            sets_target: exercise.sets,
            reps_min: exercise.reps_min,
            reps_max: exercise.reps_max,
            rest_seconds: exercise.rest_seconds,
            user_notes: `Progression: ${exercise.progression_model}`,
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

  return { planId, warnings, scheduleCount };
}

type PlanType = "workout" | "nutrition" | "both";
type GenerationMode = "initial" | "regenerate";
type ActivationMode = "preview" | "activate";
type NutritionMealSlot = "breakfast" | "lunch" | "dinner" | "snack";

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

type WorkoutRegenerationRequest = {
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

type NutritionRegenerationRequest = {
  current_plan_id?: string;
  reason?: NutritionRegenerationReason;
  issue_flags?: string[];
  meals_per_day_override?: number | null;
  dietary_preference_override?: string | null;
  allergies?: string[];
  refused_foods?: string[];
  preferred_proteins?: string[];
  prep_time_target_min?: number | null;
  budget_limit?: number | null;
  keep_meal_slots?: boolean;
  start_fresh?: boolean;
};

type CurrentWorkoutPlanContext = {
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

type CurrentNutritionPlanContext = {
  planId: string;
  mealSlots: NutritionMealSlot[];
};

type WorkoutGenerationConfig = {
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

const WORKOUT_PREVIEW_NAME_PREFIX = "Preview · ";
const NUTRITION_PREVIEW_NAME_PREFIX = "Preview · ";

type OnboardingAnswers = {
  goal_type?: string;
  experience_level?: "beginner" | "intermediate" | "advanced";
  training_days_per_week?: number;
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
};

type UserContext = {
  profile: {
    first_name: string | null;
    sex: string | null;
    unit_system: string;
  };
  onboarding: {
    goal_type: string;
    experience_level: "beginner" | "intermediate" | "advanced";
    training_days_per_week: number;
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
    traditional_meals: boolean;
    training_time: string | null;
  };
  targets: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    water_ml: number;
  };
  exercises: Array<{
    id: string;
    name: string;
    category: string;
    equipment_required: string[];
    primary_muscle: string | null;
    pattern: string | null;
    difficulty: string | null;
  }>;
  foods: Array<{
    id: string;
    name: string;
    calories_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
    fiber_per_100g: number | null;
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
  }>;
};

type WorkoutDayTemplate = {
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
  disallowedFocuses?: string[];
  targetExercises?: number | null;
  minExercises?: number | null;
  minPrimaryExercises?: number | null;
  maxSupportExercises?: number | null;
  requiredCoverage?: WorkoutFocusTag[];
  allowDuplicateMovementFamilies?: boolean;
};

type SplitDefinition = {
  key: string;
  familyKey?: string | null;
  name: string;
  description: string;
  recommendedFor: "beginner" | "intermediate" | "advanced";
  frequency: number;
  days: WorkoutDayTemplate[];
};

class WorkoutGenerationValidationError extends Error {
  warnings: string[];

  constructor(message: string, warnings: string[] = []) {
    super(message);
    this.name = "WorkoutGenerationValidationError";
    this.warnings = warnings;
  }
}

type FoodCandidate = {
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

type MealVariantPayload = {
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

type VarietyProfile = "moderate_rotation_4_5" | "minimal" | "high";

type MealAnchorSelection = {
  protein: FoodCandidate;
  carb: FoodCandidate;
  fat: FoodCandidate;
  veggie: FoodCandidate;
};

type FoodRecord = UserContext["foods"][number];
type FoodRecordLookupEntry = FoodRecord & {
  normalizedName: string;
  tokens: string[];
};
type FoodRecordLookup = {
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

type AllowedWorkoutDaysResult = {
  allowedDays: string[];
  resolvedDaysOff: string[];
  droppedDaysOff: string[];
  warning?: string;
};

type SelectedTemplate = {
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

const SLOT_ORDER: NutritionMealSlot[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

const SLOT_RATIO: Record<string, number> = {
  breakfast: 0.25,
  lunch: 0.3,
  dinner: 0.3,
  snack: 0.15,
};

function normalizeNutritionSlots(
  slots: NutritionMealSlot[] | null | undefined,
) {
  const unique = Array.from(new Set((slots || []).filter(Boolean)));
  const ordered = SLOT_ORDER.filter((slot) => unique.includes(slot));
  return ordered.length ? ordered : [...SLOT_ORDER];
}

function buildNutritionSlotRatio(
  slots: NutritionMealSlot[],
) {
  const normalizedSlots = normalizeNutritionSlots(slots);
  const total = normalizedSlots.reduce((sum, slot) => sum + (SLOT_RATIO[slot] || 0), 0) || 1;
  return normalizedSlots.reduce<Record<string, number>>((acc, slot) => {
    acc[slot] = (SLOT_RATIO[slot] || 0) / total;
    return acc;
  }, {});
}

const DAYS: string[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const FOOD_LIBRARY: FoodCandidate[] = [
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
];

const STRICT_FOCUS_TAGS = STRICT_WORKOUT_FOCUS_TAGS;
const MIN_DAY_FOCUS_MATCH_RATIO = 0.8;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function normalizeGeneratedFoodLookupName(value: string | null | undefined) {
  return normalizeToken(value || "");
}

function tokenizeGeneratedFoodLookupName(value: string | null | undefined) {
  return normalizeGeneratedFoodLookupName(value)
    .split(" ")
    .filter(Boolean);
}

function buildFoodRecordLookup(foods: FoodRecord[]): FoodRecordLookup {
  const exact = new Map<string, FoodRecordLookupEntry>();
  const all: FoodRecordLookupEntry[] = [];

  for (const food of foods) {
    const normalizedName = normalizeGeneratedFoodLookupName(food.name);
    if (!normalizedName) continue;

    const entry: FoodRecordLookupEntry = {
      ...food,
      normalizedName,
      tokens: tokenizeGeneratedFoodLookupName(food.name),
    };

    all.push(entry);

    const current = exact.get(normalizedName);
    if (!current) {
      exact.set(normalizedName, entry);
    }
  }

  return { exact, all };
}

function scoreFoodRecordLookupEntry(entry: FoodRecordLookupEntry, searchTokens: string[]) {
  const matchedTokens = searchTokens.filter((token) => entry.tokens.includes(token)).length;
  const coverage = searchTokens.length ? matchedTokens / searchTokens.length : 0;
  const exactBoost = entry.normalizedName === searchTokens.join(" ") ? 4 : 0;
  const prefixBoost = entry.normalizedName.startsWith(searchTokens.join(" ")) ? 2 : 0;

  return (coverage * 100) + prefixBoost + exactBoost;
}

function findBestFoodRecordMatch(name: string, lookup: FoodRecordLookup): FoodRecord | null {
  const normalizedName = normalizeGeneratedFoodLookupName(name);
  if (!normalizedName) return null;

  const exact = lookup.exact.get(normalizedName);
  if (exact) return exact;

  const searchPhrases = [normalizedName, ...(GENERATED_FOOD_NAME_ALIASES[normalizedName] || [])];
  const phraseMatches = lookup.all.filter((entry) =>
    searchPhrases.some((phrase) => {
      const phraseTokens = tokenizeGeneratedFoodLookupName(phrase);
      return phraseTokens.length > 0 && phraseTokens.every((token) => entry.tokens.includes(token));
    }),
  );

  if (phraseMatches.length) {
    return phraseMatches.sort((left, right) => {
      const leftScore = scoreFoodRecordLookupEntry(left, tokenizeGeneratedFoodLookupName(searchPhrases[0]));
      const rightScore = scoreFoodRecordLookupEntry(right, tokenizeGeneratedFoodLookupName(searchPhrases[0]));
      if (rightScore !== leftScore) return rightScore - leftScore;
      return left.name.length - right.name.length;
    })[0];
  }

  const queryTokens = tokenizeGeneratedFoodLookupName(name);
  const fuzzyMatches = lookup.all
    .filter((entry) => queryTokens.length > 0 && queryTokens.every((token) => entry.tokens.includes(token)))
    .sort((left, right) => {
      const leftScore = scoreFoodRecordLookupEntry(left, queryTokens);
      const rightScore = scoreFoodRecordLookupEntry(right, queryTokens);
      if (rightScore !== leftScore) return rightScore - leftScore;
      return left.name.length - right.name.length;
    });

  return fuzzyMatches[0] || null;
}

function deterministicPick<T>(items: T[], seed: number): T | null {
  if (!items.length) return null;
  return items[Math.abs(seed) % items.length];
}

function macroFromFood(food: FoodCandidate, grams: number) {
  return {
    calories: (food.calories100 * grams) / 100,
    protein: (food.protein100 * grams) / 100,
    carbs: (food.carbs100 * grams) / 100,
    fat: (food.fat100 * grams) / 100,
    fiber: (food.fiber100 * grams) / 100,
  };
}

const RESTRICTION_ALIASES: Record<string, string[]> = {
  dairy: ["dairy", "milk", "cheese", "yogurt", "whey", "butter"],
  peanuts: ["peanut", "peanuts", "peanut butter"],
  nuts: ["nuts", "almond", "walnut"],
  shellfish: ["shellfish", "shrimp", "prawn", "crab", "lobster"],
  fish: ["fish", "salmon", "tuna", "cod", "tilapia"],
  seafood: ["seafood", "fish", "salmon", "tuna", "shellfish", "shrimp"],
  eggs: ["egg", "eggs", "egg whites"],
  gluten: ["gluten", "wheat", "barley", "rye", "pasta"],
  soy: ["soy", "tofu", "tempeh"],
  rice: ["rice", "jasmine rice", "brown rice", "rice cakes"],
  potatoes: ["potato", "sweet potato"],
};

const EQUIPMENT_ALLOWLISTS: Record<string, string[] | null> = {
  full_gym: null,
  dumbbells_only: ["dumbbell", "bodyweight", "none"],
  dumbbells_plus_bench: ["dumbbell", "bench", "bodyweight", "none"],
  bands_only: ["band", "bands", "resistance_band", "bodyweight", "none"],
  bodyweight_only: ["bodyweight", "none"],
  other: null,
};

const INJURY_KEYWORD_BLOCKLIST: Record<string, string[]> = {
  shoulders: ["overhead", "military press", "upright row", "shoulder press"],
  knees: ["squat", "lunge", "leg press", "jump", "plyo"],
  back: ["deadlift", "good morning", "bent-over", "hinge"],
  wrists: ["curl", "extension", "dip", "press"],
  elbows: ["extension", "skull", "triceps", "curl"],
  neck: ["shrug", "neck"],
  hips: ["deep squat", "lunge", "split squat", "hinge"],
  ankles: ["jump", "calf raise", "running", "sprint"],
};

function normalizeToken(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, " ");
}

function formatWeekdayLabel(day: string) {
  const normalized = normalizeToken(day);
  return normalized ? `${normalized[0].toUpperCase()}${normalized.slice(1)}` : normalized;
}

function expandRestrictionTokens(values: string[]) {
  const expanded = new Set<string>();
  for (const raw of values) {
    const token = normalizeToken(raw);
    if (!token || token === "none" || token === "other") continue;
    expanded.add(token);
    const aliases = RESTRICTION_ALIASES[token] || [];
    for (const alias of aliases) expanded.add(alias);
  }
  return Array.from(expanded);
}

function scoreFoodForMacro(food: FoodCandidate, required: "protein" | "carb" | "fat") {
  if (required === "protein") return food.protein100 - food.carbs100 * 0.4 - food.fat100 * 0.8;
  if (required === "carb") return food.carbs100 - food.fat100 * 2 - food.protein100 * 0.5;
  return food.fat100 - food.carbs100 * 0.7 - food.protein100 * 0.4;
}

function foodMatchesProteinPreference(food: FoodCandidate, preferredProteins: string[]): boolean {
  if (!preferredProteins || !preferredProteins.length) return false;
  if (!food || !food.name) return false;
  const name = food.name.toLowerCase();
  const tags = (food.tags || []).map((t) => t.toLowerCase());
  
  for (const pref of preferredProteins) {
    if (!pref) continue;
    const p = pref.toLowerCase();
    if (name.includes(p)) return true;
    if (p === "chicken" && (name.includes("chicken") || tags.includes("poultry"))) return true;
    if (p === "turkey" && name.includes("turkey")) return true;
    if (p === "beef" && (name.includes("beef") || name.includes("steak") || name.includes("ground"))) return true;
    if (p === "pork" && (name.includes("pork") || name.includes("bacon") || name.includes("ham"))) return true;
    if (p === "fish" && (name.includes("fish") || name.includes("salmon") || name.includes("tuna") || name.includes("cod"))) return true;
    if (p === "shellfish" && (name.includes("shrimp") || name.includes("prawn") || name.includes("crab") || name.includes("lobster"))) return true;
    if (p === "eggs" && (name.includes("egg") || tags.includes("eggs"))) return true;
    if (p === "dairy" && (name.includes("cheese") || name.includes("yogurt") || name.includes("milk") || tags.includes("dairy"))) return true;
    if (p === "tofu_tempeh" && (name.includes("tofu") || name.includes("tempeh"))) return true;
    if (p === "legumes" && (name.includes("beans") || name.includes("lentil") || name.includes("chickpea"))) return true;
    if (p === "protein_powder" && (name.includes("whey") || name.includes("protein") || name.includes("shake"))) return true;
  }
  return false;
}

function buildMacroRotationPool(
  foods: FoodCandidate[],
  macro: "protein" | "carb" | "fat",
  varietyProfile: VarietyProfile,
  preferredProteins?: string[],
) {
  const poolSize = varietyProfile === "high" ? 6 : varietyProfile === "minimal" ? 3 : 5;
  const tagged = foods.filter((food) => food.tags.includes(macro));
  if (!tagged.length) return foods.slice(0, Math.max(1, Math.min(poolSize, foods.length)));

  return tagged
    .map((food) => {
      let score = scoreFoodForMacro(food, macro);
      if (macro === "protein" && preferredProteins?.length && foodMatchesProteinPreference(food, preferredProteins)) {
        score *= 3.0;
      }
      return { food, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(poolSize, tagged.length)))
    .map((entry) => entry.food);
}

function pickFromRotationPool(
  pool: FoodCandidate[],
  seed: number,
  avoidKeys: string[] = [],
) {
  if (!pool.length) return null;
  const blocked = new Set(avoidKeys);
  const ordered = pool.slice();
  const baseIndex = Math.abs(seed) % ordered.length;

  for (let i = 0; i < ordered.length; i += 1) {
    const candidate = ordered[(baseIndex + i) % ordered.length];
    if (!blocked.has(candidate.key)) return candidate;
  }
  return ordered[baseIndex];
}

function getFoodByTag(
  foods: FoodCandidate[],
  required: string,
  excludes: string[],
  daySeed: number,
): FoodCandidate {
  const loweredExcludes = excludes.map((entry) => normalizeToken(entry));
  const filtered = foods.filter((food) => {
    if (!food.tags.includes(required)) return false;
    const name = normalizeToken(food.name);
    if (loweredExcludes.some((entry) => entry && name.includes(entry))) return false;
    return true;
  });
  return deterministicPick(filtered, daySeed) || foods.find((food) => food.tags.includes(required)) || foods[0];
}

function pickFoodForMacro(
  foods: FoodCandidate[],
  required: "protein" | "carb" | "fat",
  daySeed: number,
) {
  const pool = buildMacroRotationPool(foods, required, "moderate_rotation_4_5");
  return pickFromRotationPool(pool, daySeed) || foods[0];
}

function foodMatchesRestriction(food: FoodCandidate, expandedTerms: string[]) {
  if (!expandedTerms.length) return false;
  const name = normalizeToken(food.name);
  const tagString = food.tags.join(" ");

  return expandedTerms.some((term) => {
    if (!term) return false;
    return name.includes(term) || tagString.includes(term);
  });
}

function applyDietaryFilters(foods: FoodCandidate[], dietaryPref: string, refusedFoods: string[], allergies: string[]) {
  const blockedTerms = expandRestrictionTokens([...refusedFoods, ...allergies]);

  return foods.filter((food) => {
    const name = normalizeToken(food.name);
    if (foodMatchesRestriction(food, blockedTerms)) return false;

    if (dietaryPref === "vegan") {
      return food.tags.includes("vegan");
    }
    if (dietaryPref === "vegetarian") {
      return food.tags.includes("vegetarian") || food.tags.includes("vegan");
    }
    if (dietaryPref === "pescatarian") {
      if (name.includes("chicken") || name.includes("turkey") || name.includes("beef") || name.includes("pork")) return false;
      return true;
    }
    if (dietaryPref === "keto") {
      if (food.tags.includes("carb") && !food.tags.includes("veggie") && !food.tags.includes("fat")) return false;
      return true;
    }
    if (dietaryPref === "paleo") {
      if (name.includes("pasta") || name.includes("yogurt") || name.includes("rice") || name.includes("oats")) return false;
      return true;
    }
    return true;
  });
}

function adaptSplitToFrequency(split: SplitDefinition, targetDaysPerWeek: number): SplitDefinition {
  if (targetDaysPerWeek <= 0) return split;
  if (split.frequency === targetDaysPerWeek && split.days.length === targetDaysPerWeek) return split;

  const sourceDays = split.days;
  const adaptedDays: WorkoutDayTemplate[] = [];

  if (targetDaysPerWeek <= sourceDays.length) {
    const step = sourceDays.length / targetDaysPerWeek;
    for (let i = 0; i < targetDaysPerWeek; i += 1) {
      const source = sourceDays[Math.floor(i * step)];
      adaptedDays.push({
        ...source,
        key: `${source.key}_d${i + 1}`,
      });
    }
  } else {
    for (let i = 0; i < targetDaysPerWeek; i += 1) {
      const source = sourceDays[i % sourceDays.length];
      const cycle = Math.floor(i / sourceDays.length) + 1;
      adaptedDays.push({
        ...source,
        key: `${source.key}_c${cycle}_d${i + 1}`,
        name: cycle > 1 ? `${source.name} (${cycle})` : source.name,
      });
    }
  }

  return {
    ...split,
    frequency: targetDaysPerWeek,
    name: `${split.name} • ${targetDaysPerWeek} days`,
    description: `${split.description} Adapted to exactly ${targetDaysPerWeek} training days/week.`,
    days: adaptedDays,
  };
}

function scoreSplitForContext(split: SplitDefinition, context: UserContext, strictDaysMatch: boolean) {
  const onboarding = context.onboarding;
  let score = 0;

  if (split.recommendedFor === onboarding.experience_level) score += 25;
  if (split.frequency === onboarding.training_days_per_week) score += strictDaysMatch ? 60 : 25;
  else score -= strictDaysMatch ? 40 : Math.abs(split.frequency - onboarding.training_days_per_week) * 8;

  if (onboarding.goal_type === "increase_endurance" || onboarding.goal_type === "lose_weight") {
    if (split.frequency >= 4) score += 12;
  }

  if (onboarding.goal_type === "gain_weight" || onboarding.goal_type === "recomp") {
    if (split.days.some((day) => day.tags.includes("legs")) && split.days.some((day) => day.tags.includes("back"))) score += 10;
  }

  if (onboarding.injuries.includes("back")) {
    const lowerHeavy = split.days.filter((day) => day.tags.includes("hamstrings") || day.tags.includes("legs")).length;
    score -= lowerHeavy * 2;
  }

  if (onboarding.injuries.includes("shoulders")) {
    const shoulderDays = split.days.filter((day) => day.tags.includes("shoulders")).length;
    score -= shoulderDays * 2;
  }

  return score;
}

function chooseSplit(
  context: UserContext,
  splitOverride?: string | null,
  strictDaysMatch = true,
  excludeSplitKey?: string | null,
): SplitDefinition {
  const targetDays = context.onboarding.training_days_per_week;

  if (splitOverride) {
    const normalizedOverride = normalizeToken(splitOverride);
    const match = SPLIT_LIBRARY.find((split) =>
      split.key === splitOverride
      || split.name.toLowerCase() === splitOverride.toLowerCase()
      || normalizeToken(split.familyKey || "") === normalizedOverride
    );
    if (match) return adaptSplitToFrequency(match, targetDays);
  }

  let candidates = SPLIT_LIBRARY.slice();
  if (excludeSplitKey) {
    const normalizedExclude = normalizeToken(excludeSplitKey);
    candidates = candidates.filter((split) =>
      split.key !== excludeSplitKey
      && normalizeToken(split.familyKey || "") !== normalizedExclude
      && normalizeToken(split.key) !== normalizedExclude
    );
  }
  if (strictDaysMatch) {
    const exact = candidates.filter((split) => split.frequency === targetDays);
    if (exact.length) candidates = exact;
  }

  const ranked = candidates
    .map((split) => ({ split, score: scoreSplitForContext(split, context, strictDaysMatch) }))
    .sort((a, b) => b.score - a.score);

  const selected = ranked[0]?.split || SPLIT_LIBRARY[0];
  return adaptSplitToFrequency(selected, targetDays);
}

function normalizeEquipmentTag(tag: string) {
  return normalizeToken(tag).replaceAll(" ", "_");
}

function isEquipmentCompatible(
  exercise: UserContext["exercises"][number],
  equipmentAccess: string,
) {
  const allowlist = EQUIPMENT_ALLOWLISTS[equipmentAccess] || null;
  if (!allowlist || !exercise.equipment_required?.length) return true;

  const allowedSet = new Set(allowlist.map((item) => normalizeEquipmentTag(item)));
  const normalizedExerciseEquipment = exercise.equipment_required.map((item) => normalizeEquipmentTag(item));
  return normalizedExerciseEquipment.every((item) => allowedSet.has(item));
}

function isInjuryCompatible(
  exercise: UserContext["exercises"][number],
  injuries: string[],
) {
  if (!injuries.length || injuries.includes("none")) return true;

  const descriptor = `${exercise.name} ${exercise.pattern || ""} ${exercise.primary_muscle || ""} ${exercise.category}`.toLowerCase();
  for (const injury of injuries) {
    if (!injury || injury === "none" || injury === "other") continue;
    const blockedKeywords = INJURY_KEYWORD_BLOCKLIST[injury] || [];
    if (blockedKeywords.some((keyword) => descriptor.includes(keyword))) {
      return false;
    }
  }
  return true;
}

function filterExercisesForConstraints(
  exercises: UserContext["exercises"],
  equipmentAccess: string,
  injuries: string[],
  avoidExerciseTerms: string[] = [],
) {
  const equipmentFiltered = exercises.filter((exercise) => isEquipmentCompatible(exercise, equipmentAccess));
  const injuryFiltered = equipmentFiltered.filter((exercise) => isInjuryCompatible(exercise, injuries));
  const preferenceFiltered = avoidExerciseTerms.length
    ? injuryFiltered.filter((exercise) => !matchesNamePreference(exercise.name, avoidExerciseTerms))
    : injuryFiltered;
  const warnings: string[] = [];

  if (!equipmentFiltered.length) {
    warnings.push("No exercises matched equipment constraints; falling back to full catalog.");
    return { exercises, warnings };
  }

  if (!injuryFiltered.length) {
    warnings.push("Injury constraints removed all matched exercises; falling back to equipment-compatible set.");
    return { exercises: equipmentFiltered, warnings };
  }

  if (avoidExerciseTerms.length && !preferenceFiltered.length) {
    warnings.push("Avoided exercise preferences removed the full pool; falling back to injury-compatible matches.");
    return { exercises: injuryFiltered, warnings };
  }

  if (preferenceFiltered.length < 25) {
    warnings.push("Limited exercise pool after equipment/injury filtering; variety may be reduced.");
  }

  return {
    exercises: preferenceFiltered,
    warnings,
  };
}

function goalTagsForContext(goalType: string) {
  const map: Record<string, string[]> = {
    lose_weight: ["fat_loss", "conditioning", "general_fitness"],
    gain_weight: ["hypertrophy", "muscle_building", "strength"],
    maintain_weight: ["general_fitness", "consistency", "balanced"],
    recomp: ["recomp", "hypertrophy", "strength"],
    increase_endurance: ["endurance", "conditioning", "athletic_performance"],
    general_fitness: ["general_fitness", "consistency", "beginner_friendly"],
  };
  return map[goalType] || ["general_fitness"];
}

function expandEquipmentAccess(equipmentAccess: string) {
  const allowlist = EQUIPMENT_ALLOWLISTS[equipmentAccess] || null;
  if (!allowlist) return null;
  return new Set(allowlist.map((item) => normalizeEquipmentTag(item)));
}

function isTemplateEquipmentCompatible(templateEquipment: string[] | null | undefined, equipmentAccess: string) {
  const allowed = expandEquipmentAccess(equipmentAccess);
  if (!allowed || !templateEquipment?.length) return true;
  const normalized = templateEquipment.map((item) => normalizeEquipmentTag(item));
  return normalized.every((item) => allowed.has(item));
}

function scoreTemplateForContext(
  template: any,
  context: UserContext,
  opts: {
    strictDaysMatch: boolean;
    programFamilyPreference?: string | null;
    trainingStylePreferences?: string[];
    progressionPreference?: string | null;
  },
) {
  const rationale: string[] = [];
  let score = 0;

  const daysPerWeek = Number(template.days_per_week || 0);
  if (daysPerWeek === context.onboarding.training_days_per_week) {
    score += 55;
    rationale.push("Exact match on requested training days/week.");
  } else if (opts.strictDaysMatch) {
    score -= 200;
    rationale.push("Penalized due to strict days/week mismatch.");
  } else {
    score -= Math.abs(daysPerWeek - context.onboarding.training_days_per_week) * 12;
  }

  const goalTags = new Set(goalTagsForContext(context.onboarding.goal_type));
  const templateGoalTags: string[] = (template.goal_tags || []).map((tag: string) => normalizeToken(tag).replaceAll(" ", "_"));
  const goalMatches = templateGoalTags.filter((tag) => goalTags.has(tag));
  if (goalMatches.length) {
    score += 28;
    rationale.push(`Goal alignment via tags: ${goalMatches.join(", ")}.`);
  } else {
    score -= 12;
  }

  const difficulty = normalizeToken(template.difficulty || "");
  if (difficulty && difficulty === context.onboarding.experience_level) {
    score += 20;
    rationale.push("Experience level aligned.");
  } else if (difficulty) {
    score -= 6;
  }

  if (isTemplateEquipmentCompatible(template.equipment_required, context.onboarding.equipment_access)) {
    score += 22;
  } else {
    score -= 28;
    rationale.push("Equipment mismatch penalty applied.");
  }

  const requestedFamily = normalizeToken(opts.programFamilyPreference || context.onboarding.preferred_split_family || "");
  const familyKey = normalizeToken(template.family?.external_key || "");
  if (requestedFamily && requestedFamily !== "no_preference") {
    if (requestedFamily === familyKey) {
      score += 30;
      rationale.push("Matched preferred split family.");
    } else {
      // 🔧 FIX: Increase penalty for split mismatch when explicitly requested
      // If user explicitly requested a split family (via opts.programFamilyPreference),
      // apply a much stronger penalty to ensure we respect their preference
      const explicitRequest = !!opts.programFamilyPreference;
      const penalty = explicitRequest ? -50 : -4;
      score += penalty;
      if (explicitRequest) {
        rationale.push(`Strong penalty for split mismatch (requested: ${requestedFamily}, template: ${familyKey}).`);
      }
    }
  }

  const preferredStyles = (opts.trainingStylePreferences || context.onboarding.technique_preferences || [])
    .map((tag) => normalizeToken(tag).replaceAll(" ", "_"))
    .filter(Boolean);
  if (preferredStyles.length) {
    const templateStyles = ((template.training_style_tags || []) as string[])
      .map((tag) => normalizeToken(tag).replaceAll(" ", "_"));
    const overlap = preferredStyles.filter((pref) => templateStyles.includes(pref));
    score += overlap.length * 5;
    if (overlap.length) rationale.push(`Style overlap: ${overlap.join(", ")}.`);
  }

  const requestedProgression = normalizeToken(opts.progressionPreference || context.onboarding.progression_preference || "");
  if (requestedProgression && requestedProgression !== "no_preference") {
    const progressionModel = normalizeToken(template.progression_model || "");
    if (progressionModel.includes(requestedProgression)) {
      score += 10;
      rationale.push("Matched progression preference.");
    } else if (opts.progressionPreference) {
      // 🔧 FIX: Apply penalty when explicitly requested progression doesn't match
      score -= 25;
      rationale.push(`Penalty for progression mismatch (requested: ${requestedProgression}, template: ${progressionModel}).`);
    }
  }

  const emphasis = normalizeToken(context.onboarding.session_emphasis || "");
  if (emphasis && emphasis !== "no_preference") {
    const templateStyles = ((template.training_style_tags || []) as string[]).map((tag) => normalizeToken(tag));
    if (templateStyles.some((tag) => tag.includes(emphasis))) score += 6;
  }

  return { score, rationale };
}

async function chooseTemplateFromCatalog(
  supabase: SupabaseClient,
  context: UserContext,
  opts: {
    strictDaysMatch: boolean;
    splitOverride?: string | null;
    programFamilyPreference?: string | null;
    trainingStylePreferences?: string[];
    progressionPreference?: string | null;
    strictTemplateSource?: boolean;
    excludeFamilyKey?: string | null;
  },
): Promise<{ template: SelectedTemplate | null; warnings: string[] }> {
  const warnings: string[] = [];
  const targetDays = context.onboarding.training_days_per_week;

  // 🔍 DIAGNOSTIC: Log template selection criteria
  console.log('🔍 Template selection criteria:', {
    targetDays,
    preferredSplit: context.onboarding.preferred_split_family,
    programFamilyPref: opts.programFamilyPreference,
    progression: opts.progressionPreference,
    trainingStyles: opts.trainingStylePreferences,
    strictDaysMatch: opts.strictDaysMatch,
    excludeFamily: opts.excludeFamilyKey,
  });

  let query = supabase
    .from("workout_program_templates_v2")
    .select(
      `
      id,name,description,days_per_week,difficulty,goal_tags,equipment_required,training_style_tags,progression_model,
      family:workout_program_families(external_key,display_name)
    `,
    )
    .eq("is_public", true);

  if (opts.strictDaysMatch) {
    query = query.eq("days_per_week", targetDays);
  }

  const { data: templates, error } = await query;
  if (error) {
    warnings.push(`Template catalog unavailable (${error.message}); using legacy split library.`);
    return { template: null, warnings };
  }

  let candidates = (templates || []) as any[];
  if (opts.excludeFamilyKey) {
    const excluded = normalizeToken(opts.excludeFamilyKey);
    candidates = candidates.filter((item) => normalizeToken(item.family?.external_key || "") !== excluded);
  }
  if (opts.splitOverride) {
    const override = normalizeToken(opts.splitOverride);
    candidates = candidates.filter((item) =>
      normalizeToken(item.name).includes(override)
      || normalizeToken(item.family?.external_key || "") === override
      || normalizeToken(item.id) === override,
    );
  }

  if (!candidates.length) {
    if (opts.strictTemplateSource) {
      warnings.push("No v2 template matched strict template selection constraints.");
    } else {
      warnings.push("No matching v2 template found; falling back to legacy generator.");
    }
    return { template: null, warnings };
  }

  const ranked = candidates
    .map((template) => {
      const scored = scoreTemplateForContext(template, context, opts);
      return { template, score: scored.score, rationale: scored.rationale };
    })
    .sort((a, b) => b.score - a.score);

  const selected = ranked[0];
  if (!selected || selected.score < -80) {
    warnings.push("Template fit score below threshold; falling back to legacy generator.");
    return { template: null, warnings };
  }

  // 🔍 DIAGNOSTIC: Log selected template
  console.log('🔍 Selected template:', {
    templateId: selected.template.id,
    templateName: selected.template.name,
    familyKey: selected.template.family?.external_key,
    daysPerWeek: selected.template.days_per_week,
    progressionModel: selected.template.progression_model,
    score: selected.score,
    rationale: selected.rationale,
    topThree: ranked.slice(0, 3).map(r => ({
      name: r.template.name,
      family: r.template.family?.external_key,
      score: r.score,
    })),
  });

  const { data: fullTemplate, error: fullError } = await supabase
    .from("workout_program_templates_v2")
    .select(
      `
      id,name,description,days_per_week,progression_model,goal_tags,training_style_tags,
      family:workout_program_families(external_key,display_name),
      days:workout_program_days_v2(
        id,sequence_index,day_type,name,focus,estimated_duration_min,
        blocks:workout_program_day_blocks_v2(
          id,order_index,block_type,title,config_json,
          exercises:workout_program_block_exercises_v2(
            id,order_index,exercise_id,sets_target,reps_min,reps_max,rest_seconds,tempo,technique_type,technique_config_json,set_style,rir_target_min,rir_target_max,rpe_target_min,rpe_target_max,pause_seconds,notes,
            exercise:exercises(id,name,category,equipment_required,primary_muscle,pattern,difficulty)
          )
        )
      )
    `,
    )
    .eq("id", selected.template.id)
    .single();

  if (fullError || !fullTemplate) {
    warnings.push(`Failed to load selected template details (${fullError?.message || "unknown"}).`);
    return { template: null, warnings };
  }

  const normalized: SelectedTemplate = {
    id: fullTemplate.id,
    name: fullTemplate.name,
    description: fullTemplate.description,
    days_per_week: fullTemplate.days_per_week,
    progression_model: fullTemplate.progression_model,
    goal_tags: fullTemplate.goal_tags || [],
    training_style_tags: fullTemplate.training_style_tags || [],
    family_key: fullTemplate.family?.external_key || null,
    family_name: fullTemplate.family?.display_name || null,
    score: selected.score,
    rationale: selected.rationale,
    days: (fullTemplate.days || [])
      .sort((a: any, b: any) => a.sequence_index - b.sequence_index)
      .map((day: any) => ({
        id: day.id,
        sequence_index: day.sequence_index,
        day_type: day.day_type,
        name: day.name,
        focus: day.focus,
        estimated_duration_min: day.estimated_duration_min,
        blocks: (day.blocks || [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((block: any) => ({
            id: block.id,
            order_index: block.order_index,
            block_type: block.block_type,
            title: block.title,
            config_json: block.config_json || {},
            exercises: (block.exercises || [])
              .sort((a: any, b: any) => a.order_index - b.order_index)
              .map((exercise: any) => ({
                ...exercise,
                technique_config_json: exercise.technique_config_json || {},
                exercise: exercise.exercise || null,
              })),
          })),
      })),
  };

  return { template: normalized, warnings };
}

function buildExercisePools(exercises: UserContext["exercises"]) {
  const byTag: Record<string, UserContext["exercises"]> = {
    chest: [],
    back: [],
    shoulders: [],
    arms: [],
    legs: [],
    glutes: [],
    hamstrings: [],
    core: [],
  };

  for (const ex of exercises) {
    const muscle = (ex.primary_muscle || "").toLowerCase();
    const name = ex.name.toLowerCase();
    const category = ex.category.toLowerCase();

    if (muscle.includes("chest") || category.includes("chest") || name.includes("press")) byTag.chest.push(ex);
    if (muscle.includes("back") || category.includes("back") || name.includes("row") || name.includes("pull")) byTag.back.push(ex);
    if (muscle.includes("shoulder") || category.includes("shoulder") || name.includes("shoulder")) byTag.shoulders.push(ex);
    if (muscle.includes("biceps") || muscle.includes("triceps") || category.includes("arms")) byTag.arms.push(ex);
    if (muscle.includes("quad") || muscle.includes("leg") || category.includes("legs")) byTag.legs.push(ex);
    if (muscle.includes("glute")) byTag.glutes.push(ex);
    if (muscle.includes("hamstring")) byTag.hamstrings.push(ex);
    if (muscle.includes("core") || muscle.includes("ab") || category.includes("core")) byTag.core.push(ex);
  }

  return byTag;
}

function pickExercisesForDay(
  day: WorkoutDayTemplate,
  exercisePools: ReturnType<typeof buildExercisePools>,
  fallbackExercises: UserContext["exercises"],
  daySeed: number,
  options: {
    maxExercises?: number | null;
    avoidTerms?: string[];
    keepTerms?: string[];
  } = {},
): Array<{
  exercise_id: string;
  order_index: number;
  sets_target: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  tempo: string | null;
  user_notes: string | null;
}> {
  const selected: UserContext["exercises"] = [];
  const maxExercises = Math.max(1, Math.min(7, Number(options.maxExercises || 6)));
  const avoidTerms = options.avoidTerms || [];
  const keepTerms = options.keepTerms || [];
  for (const [idx, tag] of day.tags.entries()) {
    const pool = (exercisePools[tag] || []).filter((exercise) => !matchesNamePreference(exercise.name, avoidTerms));
    const preferredPool = keepTerms.length
      ? pool.filter((exercise) => matchesNamePreference(exercise.name, keepTerms))
      : [];
    const pick = deterministicPick(preferredPool.length ? preferredPool : pool, daySeed + idx * 13);
    if (pick && !selected.some((s) => s.id === pick.id)) selected.push(pick);
  }

  const fallbackPool = fallbackExercises.filter((exercise) => !matchesNamePreference(exercise.name, avoidTerms));

  while (selected.length < maxExercises) {
    const prioritized = keepTerms.length
      ? fallbackPool.filter((exercise) => matchesNamePreference(exercise.name, keepTerms) && !selected.some((item) => item.id === exercise.id))
      : [];
    const fallback = deterministicPick(prioritized.length ? prioritized : fallbackPool, daySeed + selected.length * 7);
    if (!fallback) break;
    if (!selected.some((s) => s.id === fallback.id)) selected.push(fallback);
    if (selected.length >= fallbackPool.length) break;
  }

  return selected.slice(0, maxExercises).map((exercise, index) => ({
    exercise_id: exercise.id,
    order_index: index,
    sets_target: day.sets,
    reps_min: day.repRange[0],
    reps_max: day.repRange[1],
    rest_seconds: day.restSeconds,
    tempo: day.tempo || null,
    user_notes: day.cue || null,
  }));
}

function getDayVariation(dayIndex: number) {
  const variations = [0.97, 1, 1.03, 1.01, 0.99, 1.02, 0.98];
  return variations[dayIndex % variations.length];
}

function buildMealVariant(
  slot: "breakfast" | "lunch" | "dinner" | "snack",
  target: { protein: number; carbs: number; fat: number },
  foods: FoodCandidate[],
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
  const veggie = options?.anchors?.veggie || getFoodByTag(foods, slot === "breakfast" ? "fruit" : "veggie", excludedNames, daySeed + variantIndex * 9 + 37);

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
  const veggiePerGram = {
    protein: veggie.protein100 / 100,
    carbs: veggie.carbs100 / 100,
    fat: veggie.fat100 / 100,
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
  const snackVeggieBase = target.carbs < 15 ? 20 : 45;
  const veggieGrams = slot === "snack"
    ? strictMacroMode ? 0 : clamp(snackVeggieBase, 0, 90)
    : clamp(veggie.defaultGrams, 60, 180);

  let proteinGrams = clamp(target.protein / proteinPerGram.protein, proteinBounds[0], proteinBounds[1]);
  let carbGrams = clamp(target.carbs / carbPerGram.carbs, carbBounds[0], carbBounds[1]);
  let fatGrams = clamp(target.fat / fatPerGram.fat, fatBounds[0], fatBounds[1]);

  const applyTotals = (p: number, c: number, f: number) => ({
    protein: (p * proteinPerGram.protein) + (c * carbPerGram.protein) + (f * fatPerGram.protein) + (veggieGrams * veggiePerGram.protein),
    carbs: (p * proteinPerGram.carbs) + (c * carbPerGram.carbs) + (f * fatPerGram.carbs) + (veggieGrams * veggiePerGram.carbs),
    fat: (p * proteinPerGram.fat) + (c * carbPerGram.fat) + (f * fatPerGram.fat) + (veggieGrams * veggiePerGram.fat),
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

  const itemPlan = [
    { food: protein, grams: proteinGrams },
    { food: carb, grams: carbGrams },
    { food: fat, grams: fatGrams },
    { food: veggie, grams: veggieGrams },
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
    description: `Auto-generated ${slot} option aligned to macro targets.`,
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

function calculateMacroDiffPercent(target: number, actual: number) {
  if (target <= 0) return 0;
  return Math.abs(actual - target) / target * 100;
}

async function fetchUserContext(supabase: SupabaseClient, userId: string): Promise<UserContext> {
  const [profileRes, onboardingRes, targetsRes, exercisesRes, foodsRes] = await Promise.all([
    supabase.from("profiles").select("first_name, sex, unit_system").eq("id", userId).single(),
    supabase.from("onboarding_answers").select("answers").eq("user_id", userId).single(),
    supabase.from("user_targets").select("calories, protein_g, carbs_g, fat_g, water_ml").eq("user_id", userId).single(),
    supabase.from("exercises").select("id, name, category, equipment_required, primary_muscle, pattern, difficulty").limit(2000),
    supabase.from("food_items").select("id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, category, breakfast_score, lunch_dinner_score, preworkout_score, postworkout_score, evening_score, digestion_speed, fat_load, carb_speed, protein_leanness, formality, goal_form, variety_family").limit(400),
  ]);

  if (profileRes.error || !profileRes.data) throw new Error(profileRes.error?.message || "Profile not found");
  if (onboardingRes.error || !onboardingRes.data) throw new Error(onboardingRes.error?.message || "Onboarding answers not found");
  if (targetsRes.error || !targetsRes.data) throw new Error(targetsRes.error?.message || "User targets not found");
  if (exercisesRes.error) throw new Error(exercisesRes.error.message);
  if (foodsRes.error) throw new Error(foodsRes.error.message);

  const answers = (onboardingRes.data.answers || {}) as OnboardingAnswers;

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
      traditional_meals: answers.traditional_meals !== false, // default true
      training_time: answers.training_time || null,
    },
    targets: targetsRes.data,
    exercises: exercisesRes.data || [],
    foods: foodsRes.data || [],
  };
}

function normalizeNameTerm(value: string | null | undefined) {
  return normalizeToken(value || "");
}

function matchesNamePreference(value: string | null | undefined, terms: string[]) {
  const normalizedValue = normalizeNameTerm(value);
  if (!normalizedValue) return false;
  return terms.some((term) => normalizedValue.includes(term));
}

function toComparableWorkoutPlan(plan: {
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

async function fetchCurrentWorkoutPlanContext(
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
      .filter((value) => Number.isFinite(value) && value > 0);
    if (durations.length) {
      avgLoggedDurationMin = Math.round(
        durations.reduce((sum, value) => sum + value, 0) / durations.length / 60,
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

async function fetchCurrentNutritionPlanContext(
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

async function fetchStoredWorkoutPlanComparable(
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

function applyWorkoutRegenerationToContext(
  context: UserContext,
  workoutRegeneration: WorkoutRegenerationRequest | null,
  currentPlanContext: CurrentWorkoutPlanContext | null,
) {
  const nextContext: UserContext = {
    ...context,
    onboarding: {
      ...context.onboarding,
    },
  };

  if (!workoutRegeneration) {
    return nextContext;
  }

  if (workoutRegeneration.days_per_week_override) {
    nextContext.onboarding.training_days_per_week = clamp(
      Number(workoutRegeneration.days_per_week_override),
      2,
      6,
    );
  } else if (workoutRegeneration.reason === "too_hard_to_recover" && currentPlanContext) {
    nextContext.onboarding.training_days_per_week = clamp(
      currentPlanContext.daysPerWeek - 1,
      2,
      6,
    );
  }

  if (workoutRegeneration.preferred_days_off?.length) {
    nextContext.onboarding.preferred_days_off = workoutRegeneration.preferred_days_off;
  }
  if (workoutRegeneration.equipment_access) {
    nextContext.onboarding.equipment_access = workoutRegeneration.equipment_access;
  }
  if (workoutRegeneration.injuries?.length) {
    nextContext.onboarding.injuries = workoutRegeneration.injuries;
  }
  if (workoutRegeneration.preferred_split_family) {
    nextContext.onboarding.preferred_split_family = workoutRegeneration.preferred_split_family;
  } else if (workoutRegeneration.keep_current_split && currentPlanContext?.familyKey) {
    nextContext.onboarding.preferred_split_family = currentPlanContext.familyKey;
  }
  if (workoutRegeneration.progression_preference) {
    nextContext.onboarding.progression_preference = workoutRegeneration.progression_preference;
  }
  if (workoutRegeneration.goal_emphasis) {
    nextContext.onboarding.session_emphasis = workoutRegeneration.goal_emphasis;
  }

  return nextContext;
}

function applyNutritionRegenerationToContext(
  context: UserContext,
  nutritionRegeneration: NutritionRegenerationRequest | null,
) {
  const nextContext: UserContext = {
    ...context,
    onboarding: {
      ...context.onboarding,
    },
  };

  if (!nutritionRegeneration) {
    return nextContext;
  }

  if (nutritionRegeneration.dietary_preference_override) {
    nextContext.onboarding.dietary_preference = nutritionRegeneration.dietary_preference_override;
  }
  if (nutritionRegeneration.allergies?.length) {
    nextContext.onboarding.allergies_exclusions = nutritionRegeneration.allergies;
  }
  if (nutritionRegeneration.refused_foods?.length) {
    nextContext.onboarding.refused_foods = nutritionRegeneration.refused_foods;
  }
  if (nutritionRegeneration.preferred_proteins?.length) {
    nextContext.onboarding.preferred_proteins = nutritionRegeneration.preferred_proteins;
  }

  return nextContext;
}

function resolveNutritionMealSlots(
  nutritionRegeneration: NutritionRegenerationRequest | null,
  currentPlanContext: CurrentNutritionPlanContext | null,
) {
  if (nutritionRegeneration?.keep_meal_slots && !nutritionRegeneration.start_fresh && currentPlanContext?.mealSlots?.length) {
    return currentPlanContext.mealSlots;
  }

  const mealsPerDayOverride = Number(nutritionRegeneration?.meals_per_day_override || 0);
  if (Number.isFinite(mealsPerDayOverride) && mealsPerDayOverride > 0) {
    return normalizeNutritionSlots(SLOT_ORDER.slice(0, clamp(mealsPerDayOverride, 1, SLOT_ORDER.length)));
  }

  return [...SLOT_ORDER];
}

function buildWorkoutGenerationConfig(input: {
  generationMode: GenerationMode;
  activationMode: ActivationMode;
  workoutRegeneration: WorkoutRegenerationRequest | null;
  currentPlanContext: CurrentWorkoutPlanContext | null;
}) {
  const { generationMode, activationMode, workoutRegeneration, currentPlanContext } = input;
  const reason = workoutRegeneration?.reason || null;
  const avoidExerciseTerms = (workoutRegeneration?.avoid_exercise_names || [])
    .map((value) => normalizeNameTerm(value))
    .filter(Boolean);
  const keepExerciseTerms = (workoutRegeneration?.keep_exercise_names || [])
    .map((value) => normalizeNameTerm(value))
    .filter(Boolean);

  let excludeFamilyKey: string | null = null;
  if (
    generationMode === "regenerate"
    && !workoutRegeneration?.keep_current_split
    && currentPlanContext?.familyKey
    && (
      reason === "too_repetitive"
      || reason === "want_different_split"
      || reason === "not_seeing_results"
    )
  ) {
    excludeFamilyKey = currentPlanContext.familyKey;
  }

  let sessionDurationTargetMin = workoutRegeneration?.session_duration_target_min ?? null;
  let maxExercisesPerDay: number | null = null;
  if (sessionDurationTargetMin && sessionDurationTargetMin <= 50) {
    maxExercisesPerDay = 4;
  } else if (sessionDurationTargetMin && sessionDurationTargetMin <= 60) {
    maxExercisesPerDay = 5;
  } else if (reason === "too_hard_to_recover") {
    sessionDurationTargetMin = sessionDurationTargetMin ?? 55;
    maxExercisesPerDay = 4;
  }

  return {
    generationMode,
    activationMode,
    currentPlanContext,
    workoutRegeneration,
    sessionDurationTargetMin,
    maxExercisesPerDay,
    avoidExerciseTerms,
    keepExerciseTerms,
    excludeFamilyKey,
    minorRefinement: !!workoutRegeneration?.keep_current_split && !workoutRegeneration?.start_fresh,
  } satisfies WorkoutGenerationConfig;
}

async function deleteWorkoutPlanTree(supabase: SupabaseClient, planId: string) {
  const { error } = await supabase
    .from("user_workout_plans")
    .delete()
    .eq("id", planId);

  if (error) {
    throw new Error(`Failed to discard generated preview: ${error.message}`);
  }
}

async function loadStoredWorkoutPlanValidationData(
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

  return data as {
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

function collectDayPolicyValidation(input: {
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

async function validateStoredWorkoutPlanCoherence(
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

async function finalizeStoredWorkoutPlanActivation(
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

function getAllowedWorkoutDays(daysPerWeek: number, preferredDaysOff: string[]): AllowedWorkoutDaysResult {
  const rawDaysOff = (preferredDaysOff || [])
    .map((day) => day.toLowerCase())
    .filter((day) => day !== "no_preference" && DAYS.includes(day));

  const uniqueDaysOff = Array.from(new Set(rawDaysOff));
  const maxDaysOffAllowed = Math.max(0, 7 - daysPerWeek);
  const resolvedDaysOff = uniqueDaysOff.slice(0, maxDaysOffAllowed);
  const droppedDaysOff = uniqueDaysOff.slice(maxDaysOffAllowed);

  const blocked = new Set(resolvedDaysOff);
  const candidates = DAYS.filter((day) => !blocked.has(day));

  let allowedDays: string[] = [];
  if (candidates.length <= daysPerWeek) {
    allowedDays = candidates.slice(0, daysPerWeek);
  } else {
    const spread: string[] = [];
    const step = candidates.length / daysPerWeek;
    for (let i = 0; i < daysPerWeek; i += 1) {
      const index = Math.floor(i * step);
      spread.push(candidates[index]);
    }

    allowedDays = Array.from(new Set(spread));
    if (allowedDays.length < daysPerWeek) {
      for (const day of candidates) {
        if (!allowedDays.includes(day)) allowedDays.push(day);
        if (allowedDays.length >= daysPerWeek) break;
      }
    }
    allowedDays = allowedDays.slice(0, daysPerWeek);
  }

  let warning: string | undefined;
  if (droppedDaysOff.length > 0) {
    const keptLabel = resolvedDaysOff.length
      ? resolvedDaysOff.map(formatWeekdayLabel).join(", ")
      : "none";
    const ignoredLabel = droppedDaysOff.map(formatWeekdayLabel).join(", ");
    warning = `Preferred days off conflicted with ${daysPerWeek} training days/week. Kept: ${keptLabel}. Ignored: ${ignoredLabel}.`;
  }

  return {
    allowedDays,
    resolvedDaysOff,
    droppedDaysOff,
    warning,
  };
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message || "");
  }
  return String(error || "");
}

function isMissingColumnError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("column")
    || message.includes("schema cache")
    || message.includes("does not exist")
    || message.includes("could not find")
  );
}

async function insertWorkoutPlanWithFallback(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
) {
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

async function insertWorkoutPlanDayWithFallback(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
) {
  const attempts = [
    payload,
    {
      plan_id: payload.plan_id,
      day_number: payload.day_number,
      name: payload.name,
      focus: payload.focus,
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

async function updateWorkoutPlanMetadataWithFallback(
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

async function seedWorkoutScheduleFromLayout(
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

async function syncLegacyPlanDayScheduledDates(
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

type ReplacementOptions = {
  focusTags?: string[];
  avoidIds?: string[];
  strictFocus?: boolean;
  avoidTerms?: string[];
  keepTerms?: string[];
};

function pickReplacementExercise(
  original: UserContext["exercises"][number] | null,
  pool: UserContext["exercises"],
  context: UserContext,
  seed: number,
  options: ReplacementOptions = {},
) {
  if (!pool.length) return null;
  const focusTags = options.focusTags || [];
  const avoidIds = new Set(options.avoidIds || []);
  const avoidTerms = options.avoidTerms || [];
  const keepTerms = options.keepTerms || [];

  const compatiblePool = pool.filter((exercise) =>
    isEquipmentCompatible(exercise, context.onboarding.equipment_access)
    && isInjuryCompatible(exercise, context.onboarding.injuries),
  );
  const source = (compatiblePool.length ? compatiblePool : pool)
    .filter((exercise) => !avoidIds.has(exercise.id))
    .filter((exercise) => !matchesNamePreference(exercise.name, avoidTerms));
  if (!source.length) return null;

  const focusFiltered = focusTags.length
    ? source.filter((exercise) => exerciseMatchesFocus(exercise, focusTags))
    : source;
  const candidatePool = options.strictFocus ? focusFiltered : (focusFiltered.length ? focusFiltered : source);
  if (!candidatePool.length) return null;

  const preferredPool = keepTerms.length
    ? candidatePool.filter((exercise) => matchesNamePreference(exercise.name, keepTerms))
    : [];
  const weightedPool = preferredPool.length ? preferredPool : candidatePool;

  if (!original) {
    return deterministicPick(weightedPool, seed);
  }

  const primaryMuscle = normalizeToken(original.primary_muscle || "");
  const category = normalizeToken(original.category || "");
  const sameMuscle = weightedPool.filter((item) => normalizeToken(item.primary_muscle || "") === primaryMuscle);
  if (sameMuscle.length) return deterministicPick(sameMuscle, seed);

  const sameCategory = weightedPool.filter((item) => normalizeToken(item.category || "") === category);
  if (sameCategory.length) return deterministicPick(sameCategory, seed + 11);

  return deterministicPick(weightedPool, seed + 19);
}

function inferFocusTags(dayName: string, dayFocus: string | null): WorkoutFocusTag[] {
  return inferWorkoutFocusTags(dayName, dayFocus);
}

function exerciseMatchesFocus(exercise: UserContext["exercises"][number], focusTags: string[]) {
  if (!focusTags.length) return true;
  return exerciseMatchesWorkoutFocus(exercise, focusTags as WorkoutFocusTag[]);
}

function buildFocusFallbackPool(
  pool: UserContext["exercises"],
  focusTags: string[],
) {
  if (!focusTags.length) return pool;

  const pooledByTag = buildExercisePools(pool);
  const byId = new Map<string, UserContext["exercises"][number]>();

  for (const tag of focusTags) {
    for (const ex of (pooledByTag[tag] || [])) {
      if (exerciseMatchesFocus(ex, focusTags)) {
        byId.set(ex.id, ex);
      }
    }
  }

  for (const ex of pool) {
    if (exerciseMatchesFocus(ex, focusTags)) {
      byId.set(ex.id, ex);
    }
  }

  return Array.from(byId.values());
}

async function storeWorkoutPlanFromTemplateV2(
  supabase: SupabaseClient,
  userId: string,
  runId: string,
  context: UserContext,
  template: SelectedTemplate,
  horizonDays: number,
  config: WorkoutGenerationConfig,
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
    lifecycle_state: config.activationMode === "preview" ? "preview" : "live",
    replaces_plan_id: config.currentPlanContext?.planId || null,
    source_model: "v2_template",
    program_template_v2_id: template.id,
    program_family_key: template.family_key,
    progression_model: template.progression_model,
    training_style_tags: template.training_style_tags || [],
    goal_tags: template.goal_tags || [],
    weekly_layout_json: null,
    name: `${config.activationMode === "preview" ? WORKOUT_PREVIEW_NAME_PREFIX : ""}MetriqFit ${template.name}`,
    description: template.description || "Template-driven plan aligned to onboarding preferences.",
    start_date: formatDate(new Date()),
    total_weeks: Math.max(4, Math.ceil(horizonDays / 7)),
    days_per_week: template.days_per_week,
  });

  const planId = workoutPlan.id;
  const dayRecords: Array<{
    id: string;
    day_number: number;
    name: string;
    focus: string | null;
    day_type: string;
    estimated_duration_min: number | null;
  }> = [];
  const filteredPool = filterExercisesForConstraints(
    context.exercises,
    context.onboarding.equipment_access,
    context.onboarding.injuries,
    config.avoidExerciseTerms,
  );
  const exercisePool = filteredPool.exercises.length ? filteredPool.exercises : context.exercises;
  const exerciseLookup = new Map(exercisePool.map((exercise) => [exercise.id, exercise]));
  warnings.push(...filteredPool.warnings);

  for (const day of template.days) {
    const dayFocusTags = inferFocusTags(day.name, day.focus);
    const strictDayFocusTags = dayFocusTags.filter((tag) => STRICT_FOCUS_TAGS.has(tag));
    const focusFallbackPool = buildFocusFallbackPool(exercisePool, strictDayFocusTags);

    const dayInsert = await insertWorkoutPlanDayWithFallback(supabase, {
      plan_id: planId,
      day_number: day.sequence_index,
      name: day.name,
      focus: day.focus,
      day_type: day.day_type || "workout",
      estimated_duration_min: config.sessionDurationTargetMin
        ? Math.min(day.estimated_duration_min ?? config.sessionDurationTargetMin, config.sessionDurationTargetMin)
        : (day.estimated_duration_min ?? null),
    });

    dayRecords.push({
      ...dayInsert,
      day_type: day.day_type || "workout",
      estimated_duration_min: config.sessionDurationTargetMin
        ? Math.min(day.estimated_duration_min ?? config.sessionDurationTargetMin, config.sessionDurationTargetMin)
        : (day.estimated_duration_min ?? null),
    });

    let insertedForDay = 0;
    const usedExerciseIds = new Set<string>();
    const daySelections: Array<{ rowId: string; exerciseId: string; focusMatch: boolean }> = [];
    const blocks = (day.blocks || []).sort((a, b) => a.order_index - b.order_index);

    if (day.day_type === "workout") {
      for (const block of blocks) {
        const { data: blockInsert, error: blockError } = await supabase
          .from("user_workout_plan_blocks")
          .insert({
            plan_day_id: dayInsert.id,
            order_index: block.order_index,
            block_type: block.block_type || "normal",
            title: block.title || null,
            config_json: block.config_json || {},
          })
          .select("id")
          .single();

        if (blockError || !blockInsert) {
          throw new Error(`Failed to create workout block: ${blockError?.message || "unknown"}`);
        }

        const blockExercises = config.maxExercisesPerDay
          ? (block.exercises || []).slice(0, config.maxExercisesPerDay)
          : (block.exercises || []);

        for (const [exerciseIndex, exercise] of blockExercises.entries()) {
          const rawExercise = exercise.exercise as UserContext["exercises"][number] | null;
          let resolvedExerciseId = exercise.exercise_id;
          let replaced = false;
          const focusMismatch = !!rawExercise && dayFocusTags.length > 0 && !exerciseMatchesFocus(rawExercise, dayFocusTags);
          const seed = day.sequence_index * 31 + exerciseIndex;
          const shouldReplace = !rawExercise
            || !isEquipmentCompatible(rawExercise, context.onboarding.equipment_access)
            || !isInjuryCompatible(rawExercise, context.onboarding.injuries)
            || matchesNamePreference(rawExercise?.name, config.avoidExerciseTerms)
            || focusMismatch
            || usedExerciseIds.has(resolvedExerciseId);

          if (shouldReplace) {
            let replacement = pickReplacementExercise(
              rawExercise,
              exercisePool,
              context,
              seed,
              {
                focusTags: strictDayFocusTags.length ? strictDayFocusTags : dayFocusTags,
                avoidIds: Array.from(usedExerciseIds),
                strictFocus: strictDayFocusTags.length > 0,
                avoidTerms: config.avoidExerciseTerms,
                keepTerms: config.keepExerciseTerms,
              },
            );
            if (!replacement && strictDayFocusTags.length > 0) {
              replacement = pickReplacementExercise(
                rawExercise,
                focusFallbackPool,
                context,
                seed + 13,
                {
                  focusTags: strictDayFocusTags,
                  avoidIds: Array.from(usedExerciseIds),
                  strictFocus: true,
                  avoidTerms: config.avoidExerciseTerms,
                  keepTerms: config.keepExerciseTerms,
                },
              );
            }
            if (!replacement && strictDayFocusTags.length > 0) {
              replacement = pickReplacementExercise(
                rawExercise,
                exercisePool,
                context,
                seed + 17,
                {
                  focusTags: strictDayFocusTags,
                  avoidIds: [],
                  strictFocus: true,
                  avoidTerms: config.avoidExerciseTerms,
                  keepTerms: config.keepExerciseTerms,
                },
              );
            }
            if (!replacement && dayFocusTags.length > 0) {
              replacement = pickReplacementExercise(
                rawExercise,
                exercisePool,
                context,
                seed + 29,
                {
                  focusTags: dayFocusTags,
                  avoidIds: Array.from(usedExerciseIds),
                  strictFocus: false,
                  avoidTerms: config.avoidExerciseTerms,
                  keepTerms: config.keepExerciseTerms,
                },
              );
            }
            if (replacement && !usedExerciseIds.has(replacement.id)) {
              resolvedExerciseId = replacement.id;
              replaced = replacement.id !== exercise.exercise_id;
            }
          }

          if (usedExerciseIds.has(resolvedExerciseId)) {
            const uniqueReplacement = pickReplacementExercise(
              rawExercise,
              exercisePool,
              context,
              seed + 97,
              {
                focusTags: strictDayFocusTags.length ? strictDayFocusTags : dayFocusTags,
                avoidIds: Array.from(usedExerciseIds),
                strictFocus: strictDayFocusTags.length > 0,
                avoidTerms: config.avoidExerciseTerms,
                keepTerms: config.keepExerciseTerms,
              },
            );
            if (uniqueReplacement) {
              resolvedExerciseId = uniqueReplacement.id;
              replaced = true;
            } else if (strictDayFocusTags.length > 0) {
              const focusedDuplicate = pickReplacementExercise(
                rawExercise,
                focusFallbackPool,
                context,
                seed + 101,
                {
                  focusTags: strictDayFocusTags,
                  avoidIds: [],
                  strictFocus: true,
                  avoidTerms: config.avoidExerciseTerms,
                  keepTerms: config.keepExerciseTerms,
                },
              );
              if (focusedDuplicate) {
                resolvedExerciseId = focusedDuplicate.id;
                replaced = true;
              }
            }
          }

          const repsMin = clamp(Number(exercise.reps_min || 8), 1, 25);
          const repsMax = clamp(Number(exercise.reps_max || Math.max(10, repsMin)), repsMin, 30);
          const restSeconds = clamp(Number(exercise.rest_seconds || 90), 20, 300);
          const setsTarget = clamp(Number(exercise.sets_target || 3), 1, 8);

          const { data: insertedExercise, error: exerciseError } = await supabase
            .from("user_workout_plan_exercises")
            .insert({
              plan_day_id: dayInsert.id,
              block_id: blockInsert.id,
              exercise_id: resolvedExerciseId,
              order_index: exerciseIndex + 1,
              sets_target: setsTarget,
              reps_min: repsMin,
              reps_max: repsMax,
              rest_seconds: restSeconds,
              tempo: exercise.tempo || null,
              technique_type: exercise.technique_type || null,
              technique_config_json: exercise.technique_config_json || {},
              set_style: exercise.set_style || null,
              rir_target_min: exercise.rir_target_min,
              rir_target_max: exercise.rir_target_max,
              rpe_target_min: exercise.rpe_target_min,
              rpe_target_max: exercise.rpe_target_max,
              pause_seconds: exercise.pause_seconds,
              user_notes: replaced ? `${exercise.notes || ""} (Auto-replaced due to constraints)` : (exercise.notes || null),
              original_exercise_id: exercise.exercise_id,
            })
            .select("id, exercise_id")
            .single();

          if (exerciseError || !insertedExercise) {
            throw new Error(`Failed to insert template exercise: ${exerciseError.message}`);
          }

          usedExerciseIds.add(resolvedExerciseId);
          const selectedExercise = exerciseLookup.get(resolvedExerciseId);
          const focusMatch = strictDayFocusTags.length > 0
            ? !!selectedExercise && exerciseMatchesFocus(selectedExercise, strictDayFocusTags)
            : true;
          daySelections.push({
            rowId: insertedExercise.id,
            exerciseId: resolvedExerciseId,
            focusMatch,
          });

          if (replaced) {
            warnings.push(`Adjusted exercise selection in ${day.name} (${block.title || block.block_type}) for safety/focus alignment.`);
          }
          insertedForDay += 1;
        }
      }

      if (insertedForDay === 0) {
        const fallback = pickReplacementExercise(
          null,
          strictDayFocusTags.length > 0 ? focusFallbackPool : exercisePool,
          context,
          day.sequence_index * 101,
          {
            focusTags: strictDayFocusTags.length ? strictDayFocusTags : dayFocusTags,
            avoidIds: Array.from(usedExerciseIds),
            strictFocus: strictDayFocusTags.length > 0,
            avoidTerms: config.avoidExerciseTerms,
            keepTerms: config.keepExerciseTerms,
          },
        );
        if (fallback) {
          const { data: insertedFallback, error: fallbackError } = await supabase
            .from("user_workout_plan_exercises")
            .insert({
              plan_day_id: dayInsert.id,
              block_id: null,
              exercise_id: fallback.id,
              order_index: 1,
              sets_target: 3,
              reps_min: 8,
              reps_max: 12,
              rest_seconds: 90,
              tempo: null,
              technique_type: null,
              technique_config_json: {},
              set_style: "straight",
              user_notes: "Fallback exercise inserted to avoid empty workout day.",
              original_exercise_id: fallback.id,
            })
            .select("id, exercise_id")
            .single();
          if (fallbackError || !insertedFallback) {
            throw new Error(`Failed to insert fallback exercise: ${fallbackError?.message || "unknown"}`);
          }
          usedExerciseIds.add(fallback.id);
          daySelections.push({
            rowId: insertedFallback.id,
            exerciseId: fallback.id,
            focusMatch: strictDayFocusTags.length > 0
              ? exerciseMatchesFocus(fallback, strictDayFocusTags)
              : true,
          });
          insertedForDay += 1;
          warnings.push(`Inserted fallback exercise for ${day.name} because template block became empty.`);
        } else {
          throw new Error(`Workout day ${day.name} has no valid exercises after constraints.`);
        }
      }

      if (strictDayFocusTags.length > 0 && daySelections.length >= 3) {
        const minimumFocused = Math.ceil(daySelections.length * MIN_DAY_FOCUS_MATCH_RATIO);
        let focusedCount = daySelections.filter((selection) => selection.focusMatch).length;
        let remainingNeeded = Math.max(0, minimumFocused - focusedCount);

        if (remainingNeeded > 0) {
          for (const [index, selection] of daySelections.filter((entry) => !entry.focusMatch).entries()) {
            if (remainingNeeded <= 0) break;

            const currentExercise = exerciseLookup.get(selection.exerciseId) || null;
            const avoidIds = daySelections
              .filter((entry) => entry.rowId !== selection.rowId)
              .map((entry) => entry.exerciseId);

            let replacement = pickReplacementExercise(
              currentExercise,
              focusFallbackPool,
              context,
              day.sequence_index * 211 + index,
              {
                focusTags: strictDayFocusTags,
                avoidIds,
                strictFocus: true,
                avoidTerms: config.avoidExerciseTerms,
                keepTerms: config.keepExerciseTerms,
              },
            );

            if (!replacement) {
              replacement = pickReplacementExercise(
                currentExercise,
                focusFallbackPool,
                context,
                day.sequence_index * 223 + index,
                {
                  focusTags: strictDayFocusTags,
                  avoidIds: [],
                  strictFocus: true,
                  avoidTerms: config.avoidExerciseTerms,
                  keepTerms: config.keepExerciseTerms,
                },
              );
            }

            if (!replacement || !exerciseMatchesFocus(replacement, strictDayFocusTags)) {
              continue;
            }

            const { error: updateError } = await supabase
              .from("user_workout_plan_exercises")
              .update({
                exercise_id: replacement.id,
                user_notes: "Auto-adjusted to maintain day-focus coherence.",
              })
              .eq("id", selection.rowId);

            if (updateError) {
              continue;
            }

            selection.exerciseId = replacement.id;
            selection.focusMatch = true;
            focusedCount += 1;
            remainingNeeded = Math.max(0, minimumFocused - focusedCount);
            warnings.push(`Tuned ${day.name} to maintain >${Math.round(MIN_DAY_FOCUS_MATCH_RATIO * 100)}% day-focus exercise coherence.`);
          }
        }

        if (remainingNeeded > 0) {
          warnings.push(`Limited ${day.name} focus pool under current constraints; full day-focus quota could not be met.`);
        }
      }
    }
  }

  if (!dayRecords.length) {
    throw new Error("Selected template produced no workout days.");
  }

  const weeklyLayout = await seedWorkoutScheduleFromLayout(supabase, {
    planId,
    planDays: dayRecords.map((day) => ({
      id: day.id,
      dayType: day.day_type,
    })),
    daysPerWeek: template.days_per_week,
    preferredDaysOff: context.onboarding.preferred_days_off,
    horizonDays,
  });
  await updateWorkoutPlanMetadataWithFallback(supabase, planId, {
    source_model: "v2_template",
    program_template_v2_id: template.id,
    program_family_key: template.family_key,
    progression_model: template.progression_model,
    training_style_tags: template.training_style_tags || [],
    goal_tags: template.goal_tags || [],
    weekly_layout_json: weeklyLayout,
  });
  await syncLegacyPlanDayScheduledDates(supabase, dayRecords, weeklyLayout);

  const coherenceValidation = await validateStoredWorkoutPlanCoherence(supabase, {
    userId,
    planId,
    exercisePool,
    templateEquipment: Array.from(
      new Set(
        exercisePool.flatMap((exercise) => exercise.equipment_required || []).filter(Boolean),
      ),
    ),
    familyKey: template.family_key,
    goalTags: template.goal_tags || [],
  });
  warnings.push(...coherenceValidation.warnings);

  await finalizeStoredWorkoutPlanActivation(supabase, {
    userId,
    planId,
    activationMode: config.activationMode,
    currentPlanId: config.currentPlanContext?.planId || null,
  });

  const dedupedWarnings = Array.from(new Set(warnings));

  return {
    planId,
    warnings: dedupedWarnings,
    splitName: template.name,
    scheduleCount: horizonDays,
    selection: {
      source: "v2_template_catalog",
      template_id: template.id,
      family_key: template.family_key,
      family_name: template.family_name,
      score: template.score,
      rationale: template.rationale,
      progression_model: template.progression_model,
    },
  };
}

async function storeWorkoutPlan(
  supabase: SupabaseClient,
  userId: string,
  runId: string,
  context: UserContext,
  split: SplitDefinition,
  horizonDays: number,
  config: WorkoutGenerationConfig,
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
    lifecycle_state: config.activationMode === "preview" ? "preview" : "live",
    replaces_plan_id: config.currentPlanContext?.planId || null,
    source_model: "generated",
    program_template_v2_id: null,
    program_family_key: split.familyKey || split.key,
    progression_model: context.onboarding.progression_preference || null,
    training_style_tags: context.onboarding.technique_preferences || [],
    goal_tags: context.onboarding.goal_type ? [context.onboarding.goal_type] : [],
    weekly_layout_json: null,
    name: `${config.activationMode === "preview" ? WORKOUT_PREVIEW_NAME_PREFIX : ""}MetriqFit ${split.name}`,
    description: split.description,
    start_date: formatDate(new Date()),
    total_weeks: Math.max(4, Math.ceil(horizonDays / 7)),
    days_per_week: context.onboarding.training_days_per_week,
  });

  const planId = workoutPlan.id;
  const targetDaysPerWeek = context.onboarding.training_days_per_week;
  const exerciseFilterResult = filterExercisesForConstraints(
    context.exercises,
    context.onboarding.equipment_access,
    context.onboarding.injuries,
    config.avoidExerciseTerms,
  );
  warnings.push(...exerciseFilterResult.warnings);

  const exerciseSource = exerciseFilterResult.exercises.length ? exerciseFilterResult.exercises : context.exercises;
  const dayRecords: Array<{
    id: string;
    day_number: number;
    name: string;
    focus: string | null;
    day_type: string;
    estimated_duration_min: number | null;
  }> = [];

  for (const [index, day] of split.days.entries()) {
    const dayInsert = await insertWorkoutPlanDayWithFallback(supabase, {
      plan_id: planId,
      day_number: index + 1,
      name: day.name,
      focus: day.focus,
      day_type: "workout",
      estimated_duration_min: config.sessionDurationTargetMin || 60,
    });

    dayRecords.push({
      ...dayInsert,
      day_type: "workout",
      estimated_duration_min: config.sessionDurationTargetMin || 60,
    });

    const selection = selectExercisesForGeneratedSplitDay({
      day: {
        ...day,
        targetExercises: config.maxExercisesPerDay
          ? Math.min(config.maxExercisesPerDay, Number(day.targetExercises || config.maxExercisesPerDay))
          : day.targetExercises,
        minExercises: config.maxExercisesPerDay
          ? Math.min(config.maxExercisesPerDay, Number(day.minExercises || Math.min(4, config.maxExercisesPerDay)))
          : day.minExercises,
        minPrimaryExercises: config.maxExercisesPerDay
          ? Math.min(config.maxExercisesPerDay, Number(day.minPrimaryExercises || Math.min(3, config.maxExercisesPerDay)))
          : day.minPrimaryExercises,
      } satisfies GeneratedSplitDayDefinition,
      familyKey: split.familyKey || split.key,
      dayIndex: index + 1,
      daysPerWeek: split.frequency,
      exercises: exerciseSource,
      keepTerms: config.keepExerciseTerms,
      avoidTerms: config.avoidExerciseTerms,
    });

    warnings.push(...selection.warnings.map((warning) => `${day.name}: ${warning}`));

    if (selection.exercises.length < selection.minExercises || selection.primaryExerciseCount < selection.minPrimaryExercises) {
      await deleteWorkoutPlanTree(supabase, planId);
      throw new WorkoutGenerationValidationError(
        `Workout day "${day.name}" could not be filled coherently with the current constraints.`,
        warnings,
      );
    }

    const exerciseInsert = selection.exercises.map((exercise, exerciseIndex) => ({
      plan_day_id: dayInsert.id,
      exercise_id: exercise.id,
      order_index: exerciseIndex + 1,
      sets_target: day.sets,
      reps_min: day.repRange[0],
      reps_max: day.repRange[1],
      rest_seconds: day.restSeconds,
      tempo: day.tempo || null,
      user_notes: day.cue || null,
    }));

    const { error: exerciseError } = await supabase
      .from("user_workout_plan_exercises")
      .insert(exerciseInsert);

    if (exerciseError) {
      throw new Error(`Failed to insert plan exercises: ${exerciseError.message}`);
    }
  }

  const daySelection = getAllowedWorkoutDays(targetDaysPerWeek, context.onboarding.preferred_days_off);
  if (daySelection.warning) warnings.push(daySelection.warning);

  const weeklyLayout = await seedWorkoutScheduleFromLayout(supabase, {
    planId,
    planDays: dayRecords.map((day) => ({
      id: day.id,
      dayType: day.day_type,
    })),
    daysPerWeek: targetDaysPerWeek,
    preferredDaysOff: context.onboarding.preferred_days_off,
    horizonDays,
  });
  await updateWorkoutPlanMetadataWithFallback(supabase, planId, {
    source_model: "generated",
    program_template_v2_id: null,
    program_family_key: split.familyKey || split.key,
    progression_model: context.onboarding.progression_preference || null,
    training_style_tags: context.onboarding.technique_preferences || [],
    goal_tags: context.onboarding.goal_type ? [context.onboarding.goal_type] : [],
    weekly_layout_json: weeklyLayout,
  });
  await syncLegacyPlanDayScheduledDates(supabase, dayRecords, weeklyLayout);

  const coherenceValidation = await validateStoredWorkoutPlanCoherence(supabase, {
    userId,
    planId,
    exercisePool: exerciseSource,
    familyKey: split.familyKey || split.key,
    goalTags: context.onboarding.goal_type ? [context.onboarding.goal_type] : [],
  });
  warnings.push(...coherenceValidation.warnings);

  await finalizeStoredWorkoutPlanActivation(supabase, {
    userId,
    planId,
    activationMode: config.activationMode,
    currentPlanId: config.currentPlanContext?.planId || null,
  });

  return {
    planId,
    warnings: Array.from(new Set(warnings)),
    splitName: split.name,
    scheduleCount: horizonDays,
  };
}

/**
 * Convert database food records to scientific engine format
 */
function convertFoodsToScientificFormat(foods: UserContext["foods"]): FoodWithMetadata[] {
  return foods.map((food) => ({
    id: food.id,
    name: food.name,
    calories_per_100g: food.calories_per_100g,
    protein_per_100g: food.protein_per_100g,
    carbs_per_100g: food.carbs_per_100g,
    fat_per_100g: food.fat_per_100g,
    fiber_per_100g: food.fiber_per_100g,
    category: food.category,
    breakfast_score: food.breakfast_score || 0,
    lunch_dinner_score: food.lunch_dinner_score || 0,
    preworkout_score: food.preworkout_score || 0,
    postworkout_score: food.postworkout_score || 0,
    evening_score: food.evening_score || 0,
    digestion_speed: food.digestion_speed || "moderate",
    fat_load: food.fat_load || "medium",
    carb_speed: food.carb_speed || "moderate",
    protein_leanness: food.protein_leanness || "medium",
    formality: food.formality || "neutral",
    goal_form: food.goal_form || "both",
    variety_family: food.variety_family || "",
  }));
}

/**
 * Generate meals using the scientific meal engine
 * Used when user has preferred proteins, carbs, and fats selected
 */
async function generateScientificMealPlan(
  supabase: SupabaseClient,
  userId: string,
  runId: string,
  context: UserContext,
  activationMode: ActivationMode,
  horizonDays: number,
  currentPlanId: string | null,
  workoutSchedule: Array<{ day: number; hasWorkout: boolean; time: string | null }>,
): Promise<{ planId: string; variantCount: number; warnings: string[] }> {
  const warnings: string[] = [];
  const nutritionDays = Math.max(7, Math.min(14, horizonDays));

  // Get user selections
  const selections: UserNutritionSelections = {
    proteins: context.onboarding.preferred_proteins,
    carbs: context.onboarding.preferred_carbs,
    fats: context.onboarding.preferred_fats,
    traditional_meals: context.onboarding.traditional_meals,
  };

  // Validate selections
  if (!selections.proteins.length || !selections.carbs.length || !selections.fats.length) {
    throw new Error("User must select proteins, carbs, and fats for scientific meal generation");
  }

  // Convert foods to scientific format
  const scientificFoods = convertFoodsToScientificFormat(context.foods);

  // Determine goal
  const goal: "muscle_gain" | "fat_loss" | "maintenance" =
    context.onboarding.goal_type === "gain_weight" ? "muscle_gain" :
    context.onboarding.goal_type === "lose_weight" ? "fat_loss" :
    "maintenance";

  // Create plan
  const { data: maxVersionData } = await supabase
    .from("user_nutrition_plans")
    .select("version")
    .eq("user_id", userId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (maxVersionData?.version || 0) + 1;

  if (activationMode === "activate") {
    await supabase
      .from("user_nutrition_plans")
      .update({ is_active: false, lifecycle_state: "archived" })
      .eq("user_id", userId)
      .eq("is_active", true);
  }

  const { data: nutritionPlan, error: planError } = await supabase
    .from("user_nutrition_plans")
    .insert({
      user_id: userId,
      generation_run_id: runId,
      version,
      is_active: activationMode === "activate",
      lifecycle_state: activationMode === "preview" ? "preview" : "live",
      replaces_plan_id: activationMode === "preview" ? currentPlanId : null,
      name: activationMode === "preview"
        ? `${NUTRITION_PREVIEW_NAME_PREFIX}Scientific Precision Plan`
        : "Scientific Precision Nutrition Plan",
      description: "7-day precision meal plan using your selected proteins, carbs, and fats with workout-optimized timing.",
      meal_structure: {
        slots: ["breakfast", "lunch", "dinner", "snack"],
      },
      dietary_preferences: {
        preference: context.onboarding.dietary_preference,
        allergies: context.onboarding.allergies_exclusions,
        refused_foods: context.onboarding.refused_foods,
        preferred_proteins: selections.proteins,
        preferred_carbs: selections.carbs,
        preferred_fats: selections.fats,
        traditional_meals: selections.traditional_meals,
      },
    })
    .select("id")
    .single();

  if (planError || !nutritionPlan) {
    throw new Error(`Failed to create nutrition plan: ${planError?.message || "unknown"}`);
  }

  // Generate meals for each day
  let variantCount = 0;
  const groceryMap = new Map<string, { grams: number; calories: number; protein: number; carbs: number; fat: number; unit: string }>();

  for (let dayIndex = 0; dayIndex < nutritionDays; dayIndex++) {
    const dayWorkout = workoutSchedule[dayIndex % workoutSchedule.length];
    const hasWorkout = dayWorkout?.hasWorkout || false;
    const workoutTime = dayWorkout?.time || null;

    // Get slot template based on workout
    const slots = getSlotTemplate(hasWorkout, workoutTime);

    // Generate daily meals using scientific engine
    const dailyMeals = generateDailyMeals(
      scientificFoods,
      selections,
      slots,
      {
        calories: context.targets.calories,
        protein_g: context.targets.protein_g,
        carbs_g: context.targets.carbs_g,
        fat_g: context.targets.fat_g,
      },
      goal,
    );

    // Store meals in database
    for (const meal of dailyMeals) {
      const { data: mealRow, error: mealError } = await supabase
        .from("user_nutrition_plan_meals")
        .insert({
          plan_id: nutritionPlan.id,
          meal_slot: meal.slot as NutritionMealSlot,
          day_of_week: dayIndex,
          name: `${meal.name}: ${meal.items.protein.food.name} + ${meal.items.carb.food.name}`,
          description: meal.rationale,
          target_calories: Math.round(meal.macros.calories),
          target_protein: round1(meal.macros.protein),
          target_carbs: round1(meal.macros.carbs),
          target_fat: round1(meal.macros.fat),
          prep_time_min: 15,
        })
        .select("id")
        .single();

      if (mealError || !mealRow) {
        throw new Error(`Failed to insert nutrition meal: ${mealError?.message || "unknown"}`);
      }

      // Create variant
      const { data: variantRow, error: variantError } = await supabase
        .from("user_nutrition_plan_meal_variants")
        .insert({
          plan_meal_id: mealRow.id,
          variant_type: "default",
          name: meal.name,
          description: meal.rationale,
          target_calories: Math.round(meal.macros.calories),
          target_protein: round1(meal.macros.protein),
          target_carbs: round1(meal.macros.carbs),
          target_fat: round1(meal.macros.fat),
          prep_time_min: 15,
          source: "rule",
          is_active: true,
        })
        .select("id")
        .single();

      if (variantError || !variantRow) {
        throw new Error(`Failed to insert meal variant: ${variantError?.message || "unknown"}`);
      }

      variantCount++;

      // Insert items
      const itemsPayload = [
        {
          variant_id: variantRow.id,
          food_item_id: meal.items.protein.food.id,
          item_name: meal.items.protein.food.name,
          quantity_value: Math.round(meal.items.protein.grams),
          quantity_unit: "g",
          grams: Math.round(meal.items.protein.grams),
          calories: Math.round((meal.items.protein.food.calories_per_100g / 100) * meal.items.protein.grams),
          protein: round1((meal.items.protein.food.protein_per_100g / 100) * meal.items.protein.grams),
          carbs: round1((meal.items.protein.food.carbs_per_100g / 100) * meal.items.protein.grams),
          fat: round1((meal.items.protein.food.fat_per_100g / 100) * meal.items.protein.grams),
          fiber: 0,
          order_index: 0,
        },
        {
          variant_id: variantRow.id,
          food_item_id: meal.items.carb.food.id,
          item_name: meal.items.carb.food.name,
          quantity_value: Math.round(meal.items.carb.grams),
          quantity_unit: "g",
          grams: Math.round(meal.items.carb.grams),
          calories: Math.round((meal.items.carb.food.calories_per_100g / 100) * meal.items.carb.grams),
          protein: round1((meal.items.carb.food.protein_per_100g / 100) * meal.items.carb.grams),
          carbs: round1((meal.items.carb.food.carbs_per_100g / 100) * meal.items.carb.grams),
          fat: round1((meal.items.carb.food.fat_per_100g / 100) * meal.items.carb.grams),
          fiber: 0,
          order_index: 1,
        },
        {
          variant_id: variantRow.id,
          food_item_id: meal.items.fat.food.id,
          item_name: meal.items.fat.food.name,
          quantity_value: Math.round(meal.items.fat.grams),
          quantity_unit: "g",
          grams: Math.round(meal.items.fat.grams),
          calories: Math.round((meal.items.fat.food.calories_per_100g / 100) * meal.items.fat.grams),
          protein: round1((meal.items.fat.food.protein_per_100g / 100) * meal.items.fat.grams),
          carbs: round1((meal.items.fat.food.carbs_per_100g / 100) * meal.items.fat.grams),
          fat: round1((meal.items.fat.food.fat_per_100g / 100) * meal.items.fat.grams),
          fiber: 0,
          order_index: 2,
        },
      ];

      const { error: itemsError } = await supabase
        .from("user_nutrition_plan_meal_variant_items")
        .insert(itemsPayload);

      if (itemsError) {
        throw new Error(`Failed to insert meal variant items: ${itemsError.message}`);
      }

      // Update selected variant
      await supabase
        .from("user_nutrition_plan_meals")
        .update({ selected_variant_id: variantRow.id })
        .eq("id", mealRow.id);

      // Add to grocery map
      for (const item of itemsPayload) {
        const existing = groceryMap.get(item.item_name) || {
          grams: 0,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          unit: item.quantity_unit,
        };
        existing.grams += item.grams;
        existing.calories += item.calories;
        existing.protein += item.protein;
        existing.carbs += item.carbs;
        existing.fat += item.fat;
        groceryMap.set(item.item_name, existing);
      }
    }
  }

  // Insert grocery items
  const groceryItems = Array.from(groceryMap.entries()).map(([name, totals]) => ({
    plan_id: nutritionPlan.id,
    item_name: name,
    quantity_g: Math.round(totals.grams),
    unit: totals.unit,
    calories: Math.round(totals.calories),
    protein: round1(totals.protein),
    carbs: round1(totals.carbs),
    fat: round1(totals.fat),
  }));

  if (groceryItems.length) {
    const { error: groceryError } = await supabase
      .from("user_nutrition_plan_grocery_items")
      .insert(groceryItems);
    if (groceryError) {
      warnings.push("Grocery list generation partially failed.");
    }
  }

  return {
    planId: nutritionPlan.id,
    variantCount,
    warnings: Array.from(new Set(warnings)),
  };
}

async function storeNutritionPlan(
  supabase: SupabaseClient,
  userId: string,
  runId: string,
  context: UserContext,
  macroTolerancePercent: number,
  includeVariants: boolean,
  horizonDays: number,
  strictMacroMode: boolean,
  varietyProfile: VarietyProfile,
  activationMode: ActivationMode,
  currentPlanId: string | null,
  mealSlots: NutritionMealSlot[],
) {
  const warnings: string[] = [];
  const nutritionDays = Math.max(7, Math.min(14, horizonDays));
  const normalizedMealSlots = normalizeNutritionSlots(mealSlots);
  const slotRatio = buildNutritionSlotRatio(normalizedMealSlots);

  const { data: maxVersionData } = await supabase
    .from("user_nutrition_plans")
    .select("version")
    .eq("user_id", userId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (maxVersionData?.version || 0) + 1;

  if (activationMode === "activate") {
    await supabase
      .from("user_nutrition_plans")
      .update({ is_active: false, lifecycle_state: "archived" })
      .eq("user_id", userId)
      .eq("is_active", true);
  }

  const { data: nutritionPlan, error: planError } = await supabase
    .from("user_nutrition_plans")
    .insert({
      user_id: userId,
      generation_run_id: runId,
      version,
      is_active: activationMode === "activate",
      lifecycle_state: activationMode === "preview" ? "preview" : "live",
      replaces_plan_id: activationMode === "preview" ? currentPlanId : null,
      name: activationMode === "preview"
        ? `${NUTRITION_PREVIEW_NAME_PREFIX}MetriqFit Adaptive Nutrition Plan`
        : "MetriqFit Adaptive Nutrition Plan",
      description: "7-day ingredient-level plan generated from onboarding preferences and macro targets.",
      meal_structure: {
        slots: normalizedMealSlots,
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: [],
      },
      macro_distribution: slotRatio,
      dietary_preferences: {
        preference: context.onboarding.dietary_preference,
        allergies: context.onboarding.allergies_exclusions,
        refused_foods: context.onboarding.refused_foods,
        preferred_proteins: context.onboarding.preferred_proteins,
      },
    })
    .select("id")
    .single();

  if (planError || !nutritionPlan) {
    throw new Error(`Failed to create nutrition plan: ${planError?.message || "unknown"}`);
  }

  const allowedFoods = applyDietaryFilters(
    FOOD_LIBRARY,
    context.onboarding.dietary_preference,
    context.onboarding.refused_foods,
    context.onboarding.allergies_exclusions,
  );

  if (!allowedFoods.length) {
    warnings.push("No foods matched dietary filters. Falling back to full library.");
  }

  const dbFoodLookup = buildFoodRecordLookup(context.foods);
  const mappedAllowedFoods = (allowedFoods.length ? allowedFoods : FOOD_LIBRARY).filter((food) =>
    !!findBestFoodRecordMatch(food.name, dbFoodLookup)
  );
  const mappedFallbackFoods = FOOD_LIBRARY.filter((food) =>
    !!findBestFoodRecordMatch(food.name, dbFoodLookup)
  );

  if (!mappedAllowedFoods.length && allowedFoods.length) {
    warnings.push("Dietary-filtered foods did not fully map to the food database. Falling back to mapped foods from the full library.");
  }

  const workingFoods = mappedAllowedFoods.length ? mappedAllowedFoods : mappedFallbackFoods;
  if (!workingFoods.length) {
    throw new Error("No mapped foods are available to build a loggable nutrition plan.");
  }

  const proteinPool = buildMacroRotationPool(workingFoods, "protein", varietyProfile, context.onboarding.preferred_proteins || []);
  const carbPool = buildMacroRotationPool(workingFoods, "carb", varietyProfile);
  const fatPool = buildMacroRotationPool(workingFoods, "fat", varietyProfile);
  const producePool = workingFoods.filter((food) =>
    food.tags.includes("veggie") || food.tags.includes("fruit") || food.tags.includes("breakfast")
  );

  if (!proteinPool.length || !carbPool.length || !fatPool.length || !producePool.length) {
    throw new Error("Could not build a fully mapped nutrition plan with the current food library and dietary constraints.");
  }

  if (proteinPool.length < 4) {
    warnings.push("Protein variety is limited by dietary constraints; using reduced rotation.");
  }

  let variantCount = 0;
  const groceryMap = new Map<string, { grams: number; calories: number; protein: number; carbs: number; fat: number; unit: string }>();
  let lastPrimaryProteinKey: string | null = null;
  const uniqueProteinKeys = new Set<string>();

  for (let dayIndex = 0; dayIndex < nutritionDays; dayIndex += 1) {
    const dayVariation = strictMacroMode ? 1 : getDayVariation(dayIndex);
    const dayTargets = {
      calories: context.targets.calories * dayVariation,
      protein: context.targets.protein_g * dayVariation,
      carbs: context.targets.carbs_g * dayVariation,
      fat: context.targets.fat_g * dayVariation,
    };

    const mealTargets = normalizedMealSlots.map((slot) => ({
      slot,
      protein: dayTargets.protein * slotRatio[slot],
      carbs: dayTargets.carbs * slotRatio[slot],
      fat: dayTargets.fat * slotRatio[slot],
    }));
    const dayActualTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

    for (const [slotIndex, meal] of mealTargets.entries()) {
      // Use snack as the balancing slot to close residual macros for the day.
      if (meal.slot === "snack") {
        meal.protein = Math.max(0, dayTargets.protein - dayActualTotals.protein);
        meal.carbs = Math.max(0, dayTargets.carbs - dayActualTotals.carbs);
        meal.fat = Math.max(0, dayTargets.fat - dayActualTotals.fat);
      }

      const slotSeed = dayIndex * 97 + slotIndex * 17 + meal.slot.length;
      const defaultProtein = pickFromRotationPool(
        proteinPool.length ? proteinPool : workingFoods,
        slotSeed + 3,
        lastPrimaryProteinKey ? [lastPrimaryProteinKey] : [],
      ) || pickFoodForMacro(workingFoods, "protein", slotSeed + 3);
      const defaultCarb = pickFromRotationPool(carbPool.length ? carbPool : workingFoods, slotSeed + 5)
        || pickFoodForMacro(workingFoods, "carb", slotSeed + 5);
      const defaultFat = pickFromRotationPool(fatPool.length ? fatPool : workingFoods, slotSeed + 7)
        || pickFoodForMacro(workingFoods, "fat", slotSeed + 7);
      const defaultVeggie = pickFromRotationPool(
        producePool.length ? producePool : workingFoods,
        slotSeed + 11,
      ) || getFoodByTag(workingFoods, meal.slot === "breakfast" ? "fruit" : "veggie", [], slotSeed + 11);

      const defaultAnchors: MealAnchorSelection = {
        protein: defaultProtein,
        carb: defaultCarb,
        fat: defaultFat,
        veggie: defaultVeggie,
      };

      const variants: MealVariantPayload[] = [
        buildMealVariant(
          meal.slot,
          meal,
          workingFoods,
          dayIndex * 31 + meal.slot.length,
          0,
          dbFoodLookup,
          { strictMacroMode, anchors: defaultAnchors },
        ),
      ];

      if (includeVariants) {
        const alt1Anchors: MealAnchorSelection = {
          protein: pickFromRotationPool(proteinPool.length ? proteinPool : workingFoods, slotSeed + 101, [defaultAnchors.protein.key]) || defaultAnchors.protein,
          carb: pickFromRotationPool(carbPool.length ? carbPool : workingFoods, slotSeed + 103, [defaultAnchors.carb.key]) || defaultAnchors.carb,
          fat: pickFromRotationPool(fatPool.length ? fatPool : workingFoods, slotSeed + 107, [defaultAnchors.fat.key]) || defaultAnchors.fat,
          veggie: pickFromRotationPool(producePool.length ? producePool : workingFoods, slotSeed + 109, [defaultAnchors.veggie.key]) || defaultAnchors.veggie,
        };
        const alt2Anchors: MealAnchorSelection = {
          protein: pickFromRotationPool(proteinPool.length ? proteinPool : workingFoods, slotSeed + 151, [defaultAnchors.protein.key, alt1Anchors.protein.key]) || defaultAnchors.protein,
          carb: pickFromRotationPool(carbPool.length ? carbPool : workingFoods, slotSeed + 157, [defaultAnchors.carb.key, alt1Anchors.carb.key]) || defaultAnchors.carb,
          fat: pickFromRotationPool(fatPool.length ? fatPool : workingFoods, slotSeed + 163, [defaultAnchors.fat.key, alt1Anchors.fat.key]) || defaultAnchors.fat,
          veggie: pickFromRotationPool(producePool.length ? producePool : workingFoods, slotSeed + 167, [defaultAnchors.veggie.key, alt1Anchors.veggie.key]) || defaultAnchors.veggie,
        };

        variants.push(
          buildMealVariant(
            meal.slot,
            meal,
            workingFoods,
            dayIndex * 37 + meal.slot.length,
            1,
            dbFoodLookup,
            { strictMacroMode, anchors: alt1Anchors },
          ),
          buildMealVariant(
            meal.slot,
            meal,
            workingFoods,
            dayIndex * 43 + meal.slot.length,
            2,
            dbFoodLookup,
            { strictMacroMode, anchors: alt2Anchors },
          ),
        );
      }

      const defaultVariant = variants[0];
      dayActualTotals.calories += defaultVariant.totals.calories;
      dayActualTotals.protein += defaultVariant.totals.protein;
      dayActualTotals.carbs += defaultVariant.totals.carbs;
      dayActualTotals.fat += defaultVariant.totals.fat;
      lastPrimaryProteinKey = defaultAnchors.protein.key;
      uniqueProteinKeys.add(defaultAnchors.protein.key);

      const { data: mealRow, error: mealError } = await supabase
        .from("user_nutrition_plan_meals")
        .insert({
          plan_id: nutritionPlan.id,
          meal_slot: meal.slot,
          day_of_week: dayIndex,
          name: defaultVariant.name,
          description: defaultVariant.description,
          target_calories: Math.round(defaultVariant.totals.calories),
          target_protein: round1(defaultVariant.totals.protein),
          target_carbs: round1(defaultVariant.totals.carbs),
          target_fat: round1(defaultVariant.totals.fat),
          prep_time_min: defaultVariant.prep_time_min,
        })
        .select("id")
        .single();

      if (mealError || !mealRow) {
        throw new Error(`Failed to insert nutrition meal: ${mealError?.message || "unknown"}`);
      }

      const insertedVariantIds: string[] = [];

      for (const variant of variants) {
        const { data: variantRow, error: variantError } = await supabase
          .from("user_nutrition_plan_meal_variants")
          .insert({
            plan_meal_id: mealRow.id,
            variant_type: variant.variant_type,
            name: variant.name,
            description: variant.description,
            target_calories: Math.round(variant.totals.calories),
            target_protein: round1(variant.totals.protein),
            target_carbs: round1(variant.totals.carbs),
            target_fat: round1(variant.totals.fat),
            prep_time_min: variant.prep_time_min,
            source: variant.source,
            is_active: true,
          })
          .select("id")
          .single();

        if (variantError || !variantRow) {
          throw new Error(`Failed to insert meal variant: ${variantError?.message || "unknown"}`);
        }

        insertedVariantIds.push(variantRow.id);
        variantCount += 1;

        const itemsPayload = variant.items.map((item, index) => ({
          variant_id: variantRow.id,
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
          order_index: index,
        }));

        const { error: itemsError } = await supabase
          .from("user_nutrition_plan_meal_variant_items")
          .insert(itemsPayload);

        if (itemsError) {
          throw new Error(`Failed to insert meal variant items: ${itemsError.message}`);
        }

        if (variant.variant_type === "default") {
          for (const item of variant.items) {
            const existing = groceryMap.get(item.item_name) || {
              grams: 0,
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              unit: item.quantity_unit,
            };

            existing.grams += item.grams;
            existing.calories += item.calories;
            existing.protein += item.protein;
            existing.carbs += item.carbs;
            existing.fat += item.fat;
            groceryMap.set(item.item_name, existing);
          }
        }
      }

      const selectedVariantId = insertedVariantIds[0];
      if (selectedVariantId) {
        await supabase
          .from("user_nutrition_plan_meals")
          .update({ selected_variant_id: selectedVariantId })
          .eq("id", mealRow.id);
      }

      // Validate default variant against slot target tolerance.
      const proteinDiff = calculateMacroDiffPercent(meal.protein, defaultVariant.totals.protein);
      const carbsDiff = calculateMacroDiffPercent(meal.carbs, defaultVariant.totals.carbs);
      const fatDiff = calculateMacroDiffPercent(meal.fat, defaultVariant.totals.fat);
      const maxDiff = Math.max(proteinDiff, carbsDiff, fatDiff);
      void maxDiff;
    }

    const dayCaloriesDiff = calculateMacroDiffPercent(dayTargets.calories, dayActualTotals.calories);
    const dayProteinDiff = calculateMacroDiffPercent(dayTargets.protein, dayActualTotals.protein);
    const dayCarbsDiff = calculateMacroDiffPercent(dayTargets.carbs, dayActualTotals.carbs);
    const dayFatDiff = calculateMacroDiffPercent(dayTargets.fat, dayActualTotals.fat);
    const dayMaxDiff = Math.max(dayCaloriesDiff, dayProteinDiff, dayCarbsDiff, dayFatDiff);
    if (dayMaxDiff > macroTolerancePercent) {
      warnings.push(`Day ${dayIndex + 1} aggregate exceeds tolerance (${round1(dayMaxDiff)}%). Minimal relaxation applied.`);
    }
  }

  const minimumUniqueProteins = Math.min(4, proteinPool.length);
  if (minimumUniqueProteins > 0 && uniqueProteinKeys.size < minimumUniqueProteins) {
    warnings.push(`Protein rotation below target variety (${uniqueProteinKeys.size}/${minimumUniqueProteins}).`);
  }

  const groceryItems = Array.from(groceryMap.entries()).map(([name, totals]) => ({
    item_name: name,
    grams: round1(totals.grams),
    quantity_unit: totals.unit,
    estimated_calories: Math.round(totals.calories),
    estimated_protein: round1(totals.protein),
    estimated_carbs: round1(totals.carbs),
    estimated_fat: round1(totals.fat),
  }));

  const prepBatches = [
    {
      name: "Batch cook proteins",
      instructions: "Cook 2-3 days of proteins in one session and store in portions.",
      items: groceryItems.filter((item) => ["Chicken", "Turkey", "Salmon", "Tofu", "Egg"].some((k) => item.item_name.includes(k))).map((item) => item.item_name),
    },
    {
      name: "Prep carb bases",
      instructions: "Pre-cook rice/oats/potatoes and portion by grams for each meal slot.",
      items: groceryItems.filter((item) => ["Rice", "Oats", "Potato"].some((k) => item.item_name.includes(k))).map((item) => item.item_name),
    },
  ];

  const now = new Date();
  const monday = startOfWeek(now);

  const { error: groceryError } = await supabase
    .from("user_plan_grocery_weeks")
    .upsert({
      plan_id: nutritionPlan.id,
      week_start_date: formatDate(monday),
      items_json: groceryItems,
      prep_batches_json: prepBatches,
    }, {
      onConflict: "plan_id,week_start_date",
    });

  if (groceryError) {
    warnings.push(`Failed to save grocery week: ${groceryError.message}`);
  }

  return {
    planId: nutritionPlan.id,
    warnings,
    variantCount,
  };
}

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

serve(async (req) => {
  console.log('[generate-user-plans] Function invoked:', req.method);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    console.log('[generate-user-plans] Starting request processing...');
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log('[generate-user-plans] Environment check:', { 
      hasSupabaseUrl: !!supabaseUrl, 
      hasServiceRoleKey: !!serviceRoleKey 
    });

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ success: false, error: "Missing Supabase config" }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    console.log('[generate-user-plans] Auth header present:', !!authHeader);
    
    if (!authHeader) {
      return jsonResponse({ success: false, error: "Missing authorization header" }, 401);
    }

    console.log('[generate-user-plans] Creating auth client...');
    const authClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    console.log('[generate-user-plans] Getting user...');
    const { data: authData, error: authError } = await authClient.auth.getUser();
    console.log('[generate-user-plans] Auth result:', { 
      hasUser: !!authData?.user, 
      authError: authError?.message 
    });
    
    if (authError || !authData?.user) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

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
      console.error('[generate-user-plans] Failed to parse body:', parseError.message);
      return jsonResponse({ success: false, error: "Invalid request body" }, 400);
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
      generation_version?: 'v1' | 'v2';
    };

    const userId = typedBody.user_id || authData.user.id;
    if (!userId || userId !== authData.user.id) {
      return jsonResponse({ success: false, error: "Invalid user context" }, 403);
    }

    const planType = typedBody.plan_type || "both";
    if (!["workout", "nutrition", "both"].includes(planType)) {
      return jsonResponse({ success: false, error: "Invalid plan_type" }, 400);
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
    const generationVersion = typedBody.generation_version || "v1";

    // 🔍 BRANCH INTEGRITY: Log resolved generation branch so deployment drift is immediately visible
    console.log('[generate-user-plans] Branch decision:', {
      requested_generation_version: typedBody.generation_version ?? '(not set — defaulting to v1)',
      resolved_generation_version: generationVersion,
      resolved_planner_mode: generationVersion === 'v1' ? 'deterministic' : 'hybrid',
      resolved_source_model: generationVersion === 'v1' ? 'v1_architect' : 'v2_template',
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

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const currentPlanContext = (planType === "workout" || planType === "both")
      ? await fetchCurrentWorkoutPlanContext(supabase, userId, workoutRegeneration?.current_plan_id || null)
      : null;
    const currentNutritionPlanContext = (planType === "nutrition" || planType === "both")
      ? await fetchCurrentNutritionPlanContext(supabase, userId, nutritionRegeneration?.current_plan_id || null)
      : null;

    if (generationMode === "regenerate" && (planType === "workout" || planType === "both") && !currentPlanContext) {
      return jsonResponse({ success: false, error: "No active workout plan found for regeneration" }, 400);
    }
    if (generationMode === "regenerate" && (planType === "nutrition" || planType === "both") && !currentNutritionPlanContext) {
      return jsonResponse({ success: false, error: "No active nutrition plan found for regeneration" }, 400);
    }

    const startedAt = Date.now();

    const { data: runData, error: runError } = await supabase
      .from("plan_generation_runs")
      .insert({
        user_id: userId,
        plan_type: planType,
        status: "pending",
        planner_mode: generationVersion === 'v1' ? 'deterministic' : 'hybrid',
        generation_version: generationVersion === 'v1' ? 1 : 4,
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
      throw new Error(`Failed to create generation run: ${runError?.message || "unknown"}`);
    }

    const runId = runData.id;
    const warnings: string[] = [];

    try {
      console.log('[generate-user-plans] Fetching user context...');
      const context = await fetchUserContext(supabase, userId);
      console.log('[generate-user-plans] User context fetched:', { 
        hasProfile: !!context.profile,
        hasOnboarding: !!context.onboarding,
        hasTargets: !!context.targets,
        exerciseCount: context.exercises?.length,
        foodCount: context.foods?.length
      });
      
      console.log('[generate-user-plans] Applying workout regeneration...');
      const workoutContext = applyWorkoutRegenerationToContext(
        context,
        workoutRegeneration,
        currentPlanContext,
      );
      console.log('[generate-user-plans] Workout context ready:', {
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
          );
          warnings.push(...result.warnings);
          return result;
        }

        if (strictTemplateSource) {
          throw new Error("No v2 workout template matched strict requirements.");
        }

        const split = chooseSplit(
          workoutContext,
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
        );

        warnings.push(...result.warnings);
        return result;
      };

      if (planType === "workout" || planType === "both") {
        console.log('[V1] Workout generation block entered:', { generationVersion, planType });
        
        if (generationVersion === 'v1') {
          console.log('[V1] Using V1 generation path');
          
          try {
          const mapOnboardingToV1 = (onboarding: any): OnboardingProfileInput => {
            let env = SessionEnvironment.Commercial;
            if (onboarding.equipment_access === 'bodyweight_only') env = SessionEnvironment.Bodyweight;
            else if (onboarding.equipment_access === 'dumbbells_only' || onboarding.equipment_access === 'bands_only') env = SessionEnvironment.AptHotel;
            else if (onboarding.equipment_access === 'dumbbells_plus_bench') env = SessionEnvironment.Home;

            let exp = ExperienceLevel.Beginner;
            if (onboarding.experience_level === 'intermediate') exp = ExperienceLevel.Intermediate;
            else if (onboarding.experience_level === 'advanced') exp = ExperienceLevel.Advanced;

            let goal = GoalBucket.GenFitness;
            if (onboarding.goal_type === 'lose_weight') goal = GoalBucket.FatLoss;
            else if (onboarding.goal_type === 'gain_weight') goal = GoalBucket.Hypertrophy;
            else if (onboarding.goal_type === 'recomp') goal = GoalBucket.Recomp;
            else if (onboarding.goal_type === 'increase_endurance') goal = GoalBucket.Athletic;

            let comfort = LiftComfort.BarbellBasic;
            if (env === SessionEnvironment.Bodyweight) comfort = LiftComfort.NoBarbell;
            else if (env === SessionEnvironment.AptHotel) comfort = LiftComfort.MachineDB;
            else if (exp === ExperienceLevel.Advanced && onboarding.session_emphasis === 'strength') comfort = LiftComfort.BarbellAdv;

            return {
              experienceLevel: exp,
              primaryGoal: goal,
              daysPerWeek: onboarding.training_days_per_week || 3,
              liftComfort: comfort,
              environment: env
            };
          };

          // Defensive: validate onboarding data before V1 mapping
          if (!workoutContext.onboarding) {
            throw new Error("V1: workoutContext.onboarding is missing");
          }
          
          const profile = mapOnboardingToV1(workoutContext.onboarding);
          console.log('[V1] Mapped profile:', JSON.stringify(profile));
          
          const recommendation = routeUserToPlan(profile);
          console.log('[V1] Router recommendation:', JSON.stringify(recommendation));
          
          if (!recommendation?.familyIdRef) {
            throw new Error("V1: routeUserToPlan returned invalid recommendation: " + JSON.stringify(recommendation));
          }
          
          const family = planFamilies.find(f => f.external_id === recommendation.familyIdRef);
          if (!family) {
            console.error('[V1] Available families:', planFamilies.map(f => f.external_id));
            throw new Error("V1 Family Reference not found: " + recommendation.familyIdRef);
          }
          
          const template = coreTemplates.find(t => t.external_id === family.template_id);
          if (!template) {
            console.error('[V1] Available templates:', coreTemplates.map(t => t.external_id));
            throw new Error("V1 Template not found: " + family.template_id);
          }

          const hydratorPersona = {
            goal: profile.primaryGoal,
            environment: profile.environment,
            comfort: profile.liftComfort,
            injuries: workoutContext.onboarding.injuries || []
          };
          
          // 🔍 DIAGNOSTIC: V1 Backend Verification Logging
          console.log('\n=============================================');
          console.log('🔄 V1 PLAN GENERATION: END-TO-END VERIFICATION');
          console.log('---------------------------------------------');
          console.log('1. Raw Onboarding Answers:');
          console.log(JSON.stringify(workoutContext.onboarding, null, 2));
          console.log('\n2. Mapped V1 Profile:');
          console.log(JSON.stringify(profile, null, 2));
          console.log('\n3. Routed Family ID:', recommendation.familyIdRef);
          console.log('4. Resolved Template ID:', family.template_id);
          
          let v1Plan;
          try {
            v1Plan = hydrateTemplate(template as any, family.external_id, hydratorPersona);
            console.log('\n5. Hydration Success: TRUE');
          } catch (e: any) {
            console.log('\n5. Hydration Success: FALSE', e.message);
            throw e;
          }

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
            
            console.log('\n6. DB Writes Success: TRUE');
            console.log('   Stored Plan ID:', workoutResult!.planId);
          } catch (e: any) {
            console.log('\n6. DB Writes Success: FALSE', e.message);
            throw e;
          }

          // V1 Activation: Finalize activation after successful storage
          console.log('[V1] Starting activation block:', { activationMode, hasPlanId: !!workoutResult?.planId });
          if (activationMode !== 'preview' && workoutResult?.planId) {
            try {
              console.log('[V1] Calling finalizeStoredWorkoutPlanActivation...');
              await finalizeStoredWorkoutPlanActivation(supabase, {
                userId,
                planId: workoutResult.planId,
                activationMode,
                currentPlanId: currentPlanContext?.planId || null,
              });
              console.log('\n7. V1 Activation Success: TRUE');
              console.log('   Activated Plan ID:', workoutResult.planId);
            } catch (e: any) {
              console.error('\n7. V1 Activation Success: FALSE', e.message);
              console.error('[V1] Activation error stack:', e.stack);
              warnings.push(`V1 activation warning: ${e.message}`);
            }
          } else {
            console.log('[V1] Skipping activation:', { activationMode, planId: workoutResult?.planId });
          }
          
          console.log('=============================================\n');

          warnings.push(...workoutResult!.warnings);
          
          } catch (v1Error: any) {
            console.error('[V1] CRITICAL ERROR in V1 generation:', v1Error.message);
            console.error('[V1] Error stack:', v1Error.stack);
            
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
              details: {
                step: 'v1_generation',
                message: v1Error.message,
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

                await supabase
                  .from("plan_generation_runs")
                  .update({
                    status: "validation_failed",
                    completed_at: new Date().toISOString(),
                    validation_errors: [validationMessage],
                    warnings_json: warnings,
                    ai_response: {
                      current_plan_id: currentPlanContext.planId,
                      no_op_blocked: true,
                    },
                  })
                  .eq("id", runId);

                return jsonResponse({
                  success: false,
                  status: "validation_failed",
                  run_id: runId,
                  runId,
                  message: validationMessage,
                  warnings,
                });
              }
            }
          }
        }
      }

      if (planType === "nutrition" || planType === "both") {
        // Check if user has scientific nutrition preferences (proteins, carbs, fats)
        const hasScientificPreferences =
          nutritionContext.onboarding.preferred_proteins?.length > 0 &&
          nutritionContext.onboarding.preferred_carbs?.length > 0 &&
          nutritionContext.onboarding.preferred_fats?.length > 0;

        if (hasScientificPreferences) {
          // Build workout schedule for meal timing
          const workoutSchedule = Array.from({ length: 7 }, (_, i) => ({
            day: i,
            hasWorkout: i < (nutritionContext.onboarding.training_days_per_week || 3),
            time: nutritionContext.onboarding.training_time === "evening" ? "18:00" :
                  nutritionContext.onboarding.training_time === "afternoon" ? "15:00" :
                  nutritionContext.onboarding.training_time === "midday" ? "12:00" :
                  nutritionContext.onboarding.training_time === "early_morning" ? "06:00" :
                  "07:00",
          }));

          nutritionResult = await generateScientificMealPlan(
            supabase,
            userId,
            runId,
            nutritionContext,
            activationMode,
            nutritionHorizon,
            currentNutritionPlanContext?.planId || null,
            workoutSchedule,
          );
        } else {
          // Fallback to legacy meal generation
          const nutritionMealSlots = resolveNutritionMealSlots(nutritionRegeneration, currentNutritionPlanContext);
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
          );
        }

        warnings.push(...nutritionResult.warnings);
      }

      const consistencySeeded = await seedConsistency(supabase, userId);

      const durationMs = Date.now() - startedAt;
      const dedupedWarnings = Array.from(new Set(warnings));

      await supabase
        .from("plan_generation_runs")
        .update({
          status: "success",
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
        })
        .eq("id", runId);

      return jsonResponse({
        success: true,
        status: activationMode === "preview" ? "preview_ready" : "success",
        run_id: runId,
        runId,
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
      const err = generationError as Error;
      const dedupedWarnings = Array.from(
        new Set([
          ...warnings,
          ...(generationError instanceof WorkoutGenerationValidationError ? generationError.warnings : []),
        ]),
      );

      if (generationError instanceof WorkoutGenerationValidationError) {
        await supabase
          .from("plan_generation_runs")
          .update({
            status: "validation_failed",
            completed_at: new Date().toISOString(),
            validation_errors: [err.message],
            warnings_json: dedupedWarnings,
          })
          .eq("id", runId);

        return jsonResponse({
          success: false,
          status: "validation_failed",
          run_id: runId,
          runId,
          message: err.message,
          warnings: dedupedWarnings,
        });
      }

      await supabase
        .from("plan_generation_runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          validation_errors: [err.message],
          warnings_json: dedupedWarnings,
        })
        .eq("id", runId);

      throw err;
    }
  } catch (error) {
    const err = error as Error;
    console.error("[generate-user-plans]", err);
    return jsonResponse({ success: false, error: err.message || "Failed to generate plans" }, 500);
  }
});
