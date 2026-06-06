// Scientific Meal Generation Engine
// Implements workout-first, context-aware meal placement with weighted scoring

import {
  assembleMeal,
  calculatePairingPenalty,
  calculatePrepTimeMinutes,
  type AssemblyType,
} from "./mealAssembly.ts";
import { determineProduceDecision, type ProduceKind, type ProduceSlot } from "./produceStrategy.ts";

export interface MealSlot {
  name: string;
  slot: "breakfast" | "lunch" | "dinner" | "snack" | "pre-workout" | "post-workout" | "evening";
  timing: string;
  targetProfile: {
    proteinPreference: "any" | "lean" | "moderate";
    carbSpeed: "slow" | "moderate" | "fast" | "any";
    fatAcceptable: boolean;
  };
  workoutContext?: "pre" | "post" | null;
}

export interface FoodWithMetadata {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  category: string | null;
  // Metadata scores
  breakfast_score: number;
  lunch_dinner_score: number;
  preworkout_score: number;
  postworkout_score: number;
  evening_score: number;
  // Nutritional characteristics
  digestion_speed: string;
  fat_load: string;
  carb_speed: string;
  protein_leanness: string;
  // Classification
  formality: string;
  goal_form: string;
  variety_family: string;
  tags: string[];
  // Portion bounds
  min_grams: number;
  max_grams: number;
}

export interface ScheduleConfig {
  wake_time: string; // "HH:MM"
  first_meal_delay_minutes: number;
  last_meal_before_bed_minutes: number;
  workout_time: string | null;
}

export interface UserNutritionSelections {
  proteins: string[]; // variety_family names: ['chicken', 'beef', 'eggs']
  carbs: string[]; // variety_family names: ['rice', 'oats', 'sweet_potato']
  fats: string[]; // variety_family names: ['olive_oil', 'almonds', 'avocado']
  traditional_meals: boolean;
}

export interface GenerationOptions {
  carbTolerance?: string;
  cookingLevel?: string;
  isTrainingDay?: boolean;
  dietaryPreference?: string;
  allergies?: string[];
  refusedFoods?: string[];
  mealPrepMode?: boolean;
  previousDaysMeals?: GeneratedMeal[];
}

export interface MacroTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MealCandidate {
  protein: FoodWithMetadata;
  carb: FoodWithMetadata;
  fat: FoodWithMetadata;
  score: number;
  scoreBreakdown: {
    workoutFit: number;
    mealContextFit: number;
    preferenceFit: number;
    varietyFit: number;
    goalFormFit: number;
  };
}

export interface GeneratedMealPlan {
  meals: GeneratedMeal[];
  warnings: string[];
  logs: string[];
}

export interface GeneratedMeal {
  slot: string;
  name: string;
  description: string;
  timing: string;
  items: {
    protein: { food: FoodWithMetadata; grams: number };
    carb: { food: FoodWithMetadata; grams: number };
    fat: { food: FoodWithMetadata; grams: number };
    produce?: { food: FoodWithMetadata; grams: number };
  };
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  rationale: string;
  logs: string[];
  prep_time_min: number;
  assembly_type: AssemblyType;
  fingerprint: string;
}

// ============================================================================
// SLOT TEMPLATES
// ============================================================================

export function getSlotTemplate(
  hasWorkout: boolean,
  workoutTime: string | null,
  schedule?: ScheduleConfig,
  mealsPerDay?: number,
): MealSlot[] {
  const slots = hasWorkout && workoutTime
    ? getTrainingDaySlots(workoutTime, schedule)
    : getRestDaySlots(schedule);
  if (mealsPerDay && mealsPerDay > 0 && mealsPerDay < slots.length) {
    return trimSlotsToCount(slots, mealsPerDay);
  }
  return slots;
}

// Slot priority: lower number = higher importance (kept first when trimming)
const SLOT_PRIORITY: Record<string, number> = {
  breakfast: 1,
  lunch: 2,
  dinner: 3,
  "post-workout": 4,
  "pre-workout": 5,
  snack: 6,
  evening: 7,
};

export function trimSlotsToCount(slots: MealSlot[], count: number): MealSlot[] {
  if (count >= slots.length) return slots;
  const sorted = [...slots].sort(
    (a, b) => (SLOT_PRIORITY[a.slot] ?? 9) - (SLOT_PRIORITY[b.slot] ?? 9),
  );
  const kept = sorted.slice(0, count);
  // Re-sort by original timing so the day reads chronologically
  return kept.sort((a, b) => a.timing.localeCompare(b.timing));
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTimeMinutes(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function estimateBedtimeMinutes(wakeTimeStr: string): number {
  const wakeMins = parseTimeToMinutes(wakeTimeStr);
  const wakeHour = Math.floor(wakeMins / 60);
  // Rough heuristic: bed time = wake hour + 16h, clamped to reasonable range
  const bedHour = Math.min(24, Math.max(21, wakeHour + 16));
  return bedHour * 60;
}

function getTrainingDaySlots(workoutTime: string, schedule?: ScheduleConfig): MealSlot[] {
  const workoutMinutes = parseTimeToMinutes(workoutTime);
  const preWorkoutMinutes = workoutMinutes - 150; // 2.5 hours before
  const postWorkoutMinutes = workoutMinutes + 45; // 45 min after

  let breakfastMinutes = 7 * 60 + 30; // default 07:30
  let eveningMinutes = 21 * 60 + 30; // default 21:30

  if (schedule) {
    const wakeMinutes = parseTimeToMinutes(schedule.wake_time);
    breakfastMinutes = wakeMinutes + schedule.first_meal_delay_minutes;
    const bedMinutes = estimateBedtimeMinutes(schedule.wake_time);
    eveningMinutes = Math.max(bedMinutes - schedule.last_meal_before_bed_minutes, dinnerMinutesIfKnown());
  }

  // Helper to get a provisional dinner time for evening calc
  function dinnerMinutesIfKnown() {
    return Math.max(19 * 60, postWorkoutMinutes + 45);
  }

  const slots: MealSlot[] = [
    {
      name: "Breakfast",
      slot: "breakfast",
      timing: formatTimeMinutes(breakfastMinutes),
      targetProfile: { proteinPreference: "any", carbSpeed: "moderate", fatAcceptable: true },
    },
    {
      name: "Lunch",
      slot: "lunch",
      timing: formatTimeMinutes(Math.min(breakfastMinutes + 270, 13 * 60)), // +4.5h, cap at 13:00
      targetProfile: { proteinPreference: "any", carbSpeed: "any", fatAcceptable: true },
    },
  ];

  // Add pre-workout slot (only if it's after lunch)
  if (preWorkoutMinutes > parseTimeToMinutes(slots[1].timing)) {
    slots.push({
      name: "Pre-Workout",
      slot: "pre-workout",
      timing: formatTimeMinutes(preWorkoutMinutes),
      targetProfile: { proteinPreference: "lean", carbSpeed: "fast", fatAcceptable: false },
      workoutContext: "pre",
    });
  }

  // Add post-workout slot
  slots.push({
    name: "Post-Workout",
    slot: "post-workout",
    timing: formatTimeMinutes(postWorkoutMinutes),
    targetProfile: { proteinPreference: "lean", carbSpeed: "fast", fatAcceptable: false },
    workoutContext: "post",
  });

  // Add dinner (after post-workout if there's space, or merge)
  const dinnerTime = Math.max(19 * 60, postWorkoutMinutes + 45);
  slots.push({
    name: "Dinner",
    slot: "dinner",
    timing: formatTimeMinutes(dinnerTime),
    targetProfile: { proteinPreference: "any", carbSpeed: "any", fatAcceptable: true },
  });

  // Add evening snack
  slots.push({
    name: "Evening",
    slot: "evening",
    timing: formatTimeMinutes(Math.max(eveningMinutes, dinnerTime + 90)),
    targetProfile: { proteinPreference: "lean", carbSpeed: "slow", fatAcceptable: true },
  });

  return slots;
}

function getRestDaySlots(schedule?: ScheduleConfig): MealSlot[] {
  let breakfastMinutes = 8 * 60; // default 08:00
  let eveningMinutes = 21 * 60 + 30; // default 21:30

  if (schedule) {
    const wakeMinutes = parseTimeToMinutes(schedule.wake_time);
    breakfastMinutes = wakeMinutes + schedule.first_meal_delay_minutes;
    const bedMinutes = estimateBedtimeMinutes(schedule.wake_time);
    eveningMinutes = Math.max(bedMinutes - schedule.last_meal_before_bed_minutes, 19 * 60 + 30);
  }

  const lunchMinutes = Math.min(breakfastMinutes + 270, 13 * 60);
  const snackMinutes = lunchMinutes + 240;
  const dinnerMinutes = Math.min(snackMinutes + 210, 20 * 60);

  return [
    {
      name: "Breakfast",
      slot: "breakfast",
      timing: formatTimeMinutes(breakfastMinutes),
      targetProfile: { proteinPreference: "any", carbSpeed: "moderate", fatAcceptable: true },
    },
    {
      name: "Lunch",
      slot: "lunch",
      timing: formatTimeMinutes(lunchMinutes),
      targetProfile: { proteinPreference: "any", carbSpeed: "any", fatAcceptable: true },
    },
    {
      name: "Afternoon",
      slot: "snack",
      timing: formatTimeMinutes(snackMinutes),
      targetProfile: { proteinPreference: "any", carbSpeed: "moderate", fatAcceptable: true },
    },
    {
      name: "Dinner",
      slot: "dinner",
      timing: formatTimeMinutes(dinnerMinutes),
      targetProfile: { proteinPreference: "any", carbSpeed: "slow", fatAcceptable: true },
    },
    {
      name: "Evening",
      slot: "evening",
      timing: formatTimeMinutes(Math.max(eveningMinutes, dinnerMinutes + 90)),
      targetProfile: { proteinPreference: "lean", carbSpeed: "slow", fatAcceptable: true },
    },
  ];
}

// ============================================================================
// SCORING ENGINE
// ============================================================================

const WEIGHTS = {
  workoutFit: 0.28,
  mealContextFit: 0.20,
  userPreferenceFit: 0.27,
  varietyFit: 0.20,
  goalFormFit: 0.05,
};

const PREFERENCE_WEIGHTS = {
  protein: 0.4,
  carb: 0.3,
  fat: 0.3,
};

export function scoreMealCandidate(
  combo: { protein: FoodWithMetadata; carb: FoodWithMetadata; fat: FoodWithMetadata },
  slot: MealSlot,
  previousMeals: GeneratedMeal[],
  goal: "muscle_gain" | "fat_loss" | "maintenance",
  selections: UserNutritionSelections,
  traditionalMeals: boolean,
  options: GenerationOptions
): MealCandidate {
  const workoutFit = calculateWorkoutFit(combo, slot);
  const mealContextFit = calculateMealContextFit(combo, slot, traditionalMeals);
  const preferenceFit = calculatePreferenceFit(combo, selections);
  const varietyFit = calculateVarietyFit(combo, previousMeals, options, slot);
  const goalFormFit = calculateGoalFormFit(combo, goal);

  const penalties = calculatePenalties(combo, slot, previousMeals, selections, options);

  const score =
    workoutFit * WEIGHTS.workoutFit +
    mealContextFit * WEIGHTS.mealContextFit +
    preferenceFit * WEIGHTS.userPreferenceFit +
    varietyFit * WEIGHTS.varietyFit +
    goalFormFit * WEIGHTS.goalFormFit -
    penalties;
  
  return {
    protein: combo.protein,
    carb: combo.carb,
    fat: combo.fat,
    score,
    scoreBreakdown: {
      workoutFit,
      mealContextFit,
      preferenceFit,
      varietyFit,
      goalFormFit,
    },
  };
}

function calculateWorkoutFit(
  combo: { protein: FoodWithMetadata; carb: FoodWithMetadata; fat: FoodWithMetadata },
  slot: MealSlot
): number {
  // HARD RULE: No high-fat pre/post workout
  if (!slot.targetProfile.fatAcceptable && combo.fat.fat_load === "high") {
    return 0;
  }
  
  let fit = 0.5; // Base score
  
  // Carb speed match
  if (slot.targetProfile.carbSpeed !== "any") {
    if (combo.carb.carb_speed === slot.targetProfile.carbSpeed) {
      fit += 0.25;
    } else if (
      (slot.targetProfile.carbSpeed === "fast" && combo.carb.carb_speed === "moderate") ||
      (slot.targetProfile.carbSpeed === "moderate" && combo.carb.carb_speed === "fast")
    ) {
      fit += 0.1; // Partial credit
    }
  }
  
  // Protein leanness match
  if (slot.targetProfile.proteinPreference === "lean" && combo.protein.fat_load === "low") {
    fit += 0.25;
  }
  
  // Workout-specific scores from food metadata
  if (slot.workoutContext === "pre") {
    fit += (combo.protein.preworkout_score / 3) * 0.2;
    fit += (combo.carb.preworkout_score / 3) * 0.15;
  } else if (slot.workoutContext === "post") {
    fit += (combo.protein.postworkout_score / 3) * 0.2;
    fit += (combo.carb.postworkout_score / 3) * 0.15;
  }
  
  return Math.min(fit, 1.0);
}

function calculateMealContextFit(
  combo: { protein: FoodWithMetadata; carb: FoodWithMetadata; fat: FoodWithMetadata },
  slot: MealSlot,
  traditionalMeals: boolean
): number {
  if (!traditionalMeals) return 1.0;
  
  // Map slot to context score
  const getContextScore = (food: FoodWithMetadata) => {
    switch (slot.slot) {
      case "breakfast":
        return food.breakfast_score;
      case "lunch":
      case "dinner":
        return food.lunch_dinner_score;
      case "evening":
        return food.evening_score;
      default:
        return Math.max(food.breakfast_score, food.lunch_dinner_score, food.evening_score);
    }
  };
  
  const proteinScore = getContextScore(combo.protein);
  const carbScore = getContextScore(combo.carb);
  const fatScore = getContextScore(combo.fat);
  
  // Average normalized to 0-1
  const avgScore = (proteinScore + carbScore + fatScore) / 9;
  let fit = 0.3 + avgScore * 0.7; // Min 0.3, max 1.0

  // Stronger slot appropriateness penalties
  if (slot.slot === "breakfast") {
    // Breakfast should favor breakfast-friendly foods
    const minScore = Math.min(proteinScore, carbScore, fatScore);
    if (minScore < 1) {
      fit -= 0.15;
    }
  }
  if ((slot.slot === "lunch" || slot.slot === "dinner") && combo.protein.breakfast_score >= 3 && combo.protein.lunch_dinner_score === 0) {
    // Pure breakfast protein at lunch/dinner
    fit -= 0.2;
  }
  
  return Math.max(0.1, fit);
}

function calculateVarietyFit(
  combo: { protein: FoodWithMetadata; carb: FoodWithMetadata; fat: FoodWithMetadata },
  previousMeals: GeneratedMeal[],
  options: GenerationOptions,
  currentSlot: MealSlot
): number {
  if (previousMeals.length === 0) return 1.0;

  // Build candidate fingerprint (assembly_type unknown here, so use protein+carb only for now)
  const pcPair = `${combo.protein.variety_family}+${combo.carb.variety_family}`;

  let fit = 1.0;

  // Look at last ~8 meals (covers roughly 48h of eating)
  const lookbackWindow = previousMeals.slice(-8);

  for (const pastMeal of lookbackWindow) {
    const pastPair = `${pastMeal.items.protein.food.variety_family}+${pastMeal.items.carb.food.variety_family}`;

    // Exact fingerprint repeat (protein+carb+assembly) — heavy penalty
    // Since we don't know assembly_type yet, we penalize exact protein+carb pair strongly
    if (pcPair === pastPair) {
      fit -= 0.55;
    }

    // Same carb family in lookback — prevents "rice every meal" patterns
    if (combo.carb.variety_family === pastMeal.items.carb.food.variety_family) {
      fit -= 0.15;
    }

    // Same fat source across many meals makes a plan feel like macro bookkeeping.
    if (combo.fat.variety_family === pastMeal.items.fat.food.variety_family) {
      fit -= 0.1;
    }

    // Same protein family back-to-back in same slot — light penalty
    if (
      combo.protein.variety_family === pastMeal.items.protein.food.variety_family &&
      currentSlot.slot === pastMeal.slot
    ) {
      fit -= 0.15;
    }
  }

  const familyFrequency = new Map<string, number>();
  for (const pastMeal of lookbackWindow) {
    familyFrequency.set(
      pastMeal.items.protein.food.variety_family,
      (familyFrequency.get(pastMeal.items.protein.food.variety_family) || 0) + 1,
    );
    familyFrequency.set(
      pastMeal.items.carb.food.variety_family,
      (familyFrequency.get(pastMeal.items.carb.food.variety_family) || 0) + 1,
    );
    familyFrequency.set(
      pastMeal.items.fat.food.variety_family,
      (familyFrequency.get(pastMeal.items.fat.food.variety_family) || 0) + 1,
    );
  }

  const proteinFrequency = familyFrequency.get(combo.protein.variety_family) || 0;
  const carbFrequency = familyFrequency.get(combo.carb.variety_family) || 0;
  const fatFrequency = familyFrequency.get(combo.fat.variety_family) || 0;
  if (proteinFrequency > 1) fit -= Math.min(0.25, (proteinFrequency - 1) * 0.06);
  if (carbFrequency > 1) fit -= Math.min(0.3, (carbFrequency - 1) * 0.08);
  if (fatFrequency > 1) fit -= Math.min(0.2, (fatFrequency - 1) * 0.05);

  // Back-to-back same protein (immediate previous meal) — additional penalty
  const lastMeal = previousMeals[previousMeals.length - 1];
  if (combo.protein.variety_family === lastMeal.items.protein.food.variety_family) {
    fit -= 0.4;
  }
  if (combo.carb.variety_family === lastMeal.items.carb.food.variety_family) {
    fit -= 0.3;
  }
  if (combo.fat.variety_family === lastMeal.items.fat.food.variety_family) {
    fit -= 0.2;
  }

  // Meal prep mode allows more repetition
  if (options.mealPrepMode) {
    fit = Math.min(1.0, fit + 0.25);
  }

  return Math.max(0.1, fit);
}

function calculateGoalFormFit(
  combo: { protein: FoodWithMetadata; carb: FoodWithMetadata; fat: FoodWithMetadata },
  goal: "muscle_gain" | "fat_loss" | "maintenance"
): number {
  let fit = 0.5;
  
  if (goal === "muscle_gain") {
    if (combo.protein.goal_form === "bulk_default") fit += 0.3;
    else if (combo.protein.goal_form === "both") fit += 0.15;
  } else if (goal === "fat_loss") {
    if (combo.protein.goal_form === "cut_default") fit += 0.3;
    else if (combo.protein.goal_form === "both") fit += 0.15;
  } else {
    // Maintenance
    if (combo.protein.goal_form === "both") fit += 0.25;
  }
  
  return Math.min(fit, 1.0);
}

function normalizePreferenceToken(value: string): string {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function getFoodPreferenceKeys(food: FoodWithMetadata, category: "protein" | "carb" | "fat"): string[] {
  const keys = new Set<string>();
  const rawName = String(food.name || "").toLowerCase();
  const nameTokens = rawName.split(/[^a-z0-9]+/g).filter(Boolean);
  const tags = (food.tags || []).map(normalizePreferenceToken);
  const family = normalizePreferenceToken(food.variety_family || food.name);

  if (family) keys.add(family);
  for (const token of nameTokens) keys.add(normalizePreferenceToken(token));
  for (const tag of tags) keys.add(tag);

  const add = (...values: string[]) => {
    for (const value of values) {
      const normalized = normalizePreferenceToken(value);
      if (normalized) keys.add(normalized);
    }
  };

  if (category === "protein") {
    if (keys.has("fish") || keys.has("salmon") || keys.has("tuna") || keys.has("cod") || keys.has("tilapia")) {
      add("fish", "seafood");
    }
    if (keys.has("shellfish") || keys.has("shrimp") || keys.has("crab") || keys.has("lobster")) {
      add("shellfish", "seafood");
    }
    if (keys.has("egg") || keys.has("eggs")) add("egg", "eggs");
    if (keys.has("tofu") || keys.has("tempeh") || keys.has("soy")) add("tofu", "tempeh", "soy", "plant_protein");
    if (keys.has("whey") || keys.has("casein") || keys.has("protein") || rawName.includes("protein powder")) add("protein_powder", "whey", "casein", "protein_powder");
    if (keys.has("chicken") || keys.has("turkey") || keys.has("beef") || keys.has("pork")) add("meat");
    if (keys.has("lentil") || keys.has("lentils") || keys.has("bean") || keys.has("beans") || keys.has("chickpea") || keys.has("chickpeas")) {
      add("legumes", "legume", "plant_protein");
    }
    if (keys.has("dairy") || keys.has("milk") || keys.has("yogurt") || keys.has("cheese") || keys.has("cottage")) add("dairy");
  } else if (category === "carb") {
    if (keys.has("rice") || rawName.includes("rice")) add("rice");
    if (keys.has("oat") || keys.has("oats")) add("oats");
    if (keys.has("sweet") && keys.has("potato")) add("sweet_potato");
    if (keys.has("potato")) add("potato");
    if (keys.has("quinoa")) add("quinoa");
    if (keys.has("pasta") || keys.has("noodle") || keys.has("noodles")) add("pasta");
    if (keys.has("bread") || keys.has("toast")) add("bread");
    if (keys.has("fruit") || tags.includes("fruit") || /banana|berries|apple|orange|grape|mango|pineapple|kiwi|pear|peach/.test(rawName)) {
      add("fruit");
    }
    if (tags.includes("grain") || /rice|oat|quinoa|pasta|bread|cereal/.test(rawName)) add("grain");
    if (tags.includes("vegetable") || /sweet_potato|potato|corn|peas/.test(rawName)) add("vegetables");
  } else if (category === "fat") {
    if (keys.has("oil") || rawName.includes("oil")) add("oil", "olive_oil", "coconut_oil");
    if (keys.has("olive") || rawName.includes("olive")) add("olive_oil");
    if (keys.has("almond") || keys.has("almonds") || keys.has("walnut") || keys.has("walnuts") || keys.has("cashew") || keys.has("cashews") || keys.has("peanut") || keys.has("peanuts")) {
      add("nuts");
    }
    if (keys.has("chia") || keys.has("flax") || keys.has("seed") || keys.has("seeds")) add("seeds", "chia_seeds");
    if (keys.has("avocado")) add("avocado");
    if (keys.has("peanut") || keys.has("peanuts") || rawName.includes("peanut butter")) add("peanut_butter");
    if (keys.has("cheese") || keys.has("dairy")) add("cheese", "dairy");
  }

  return Array.from(keys);
}

function scorePreferenceRank(
  food: FoodWithMetadata,
  preferredFamilies: string[] | undefined,
  category: "protein" | "carb" | "fat"
): number {
  const normalizedPrefs = (preferredFamilies || [])
    .map(normalizePreferenceToken)
    .filter(Boolean);

  if (normalizedPrefs.length === 0) return 0.5;

  const foodKeys = new Set(getFoodPreferenceKeys(food, category));
  for (let idx = 0; idx < normalizedPrefs.length; idx++) {
    if (foodKeys.has(normalizedPrefs[idx])) {
      return Math.max(0.1, 1 - idx * 0.45);
    }
  }

  // Generic category fallback keeps the engine usable even when the user's
  // preferred family labels do not directly match the food metadata.
  return 0.15;
}

function calculatePreferenceFit(
  combo: { protein: FoodWithMetadata; carb: FoodWithMetadata; fat: FoodWithMetadata },
  selections: UserNutritionSelections
): number {
  const proteinScore = scorePreferenceRank(combo.protein, selections.proteins, "protein");
  const carbScore = scorePreferenceRank(combo.carb, selections.carbs, "carb");
  const fatScore = scorePreferenceRank(combo.fat, selections.fats, "fat");

  return Math.max(0.1, Math.min(1.0,
    proteinScore * PREFERENCE_WEIGHTS.protein +
    carbScore * PREFERENCE_WEIGHTS.carb +
    fatScore * PREFERENCE_WEIGHTS.fat
  ));
}

function calculatePenalties(
  combo: { protein: FoodWithMetadata; carb: FoodWithMetadata; fat: FoodWithMetadata },
  slot: MealSlot,
  previousMeals: GeneratedMeal[],
  selections: UserNutritionSelections,
  options: GenerationOptions
): number {
  let penalty = 0;
  
  // Penalty: Slow carb post-workout
  if (slot.workoutContext === "post" && combo.carb.carb_speed === "slow") {
    penalty += 0.3;
  }
  
  // Penalty: Same protein as last meal (additional beyond varietyFit)
  if (previousMeals.length > 0) {
    const lastMeal = previousMeals[previousMeals.length - 1];
    if (combo.protein.variety_family === lastMeal.items.protein.food.variety_family) {
      penalty += 0.2;
    }
    if (combo.carb.variety_family === lastMeal.items.carb.food.variety_family) {
      penalty += 0.15;
    }
    if (combo.fat.variety_family === lastMeal.items.fat.food.variety_family) {
      penalty += 0.12;
    }
  }

  // Carb tolerance soft preferences
  const carbTolerance = (options.carbTolerance || "energized_satiated").toLowerCase();
  const carbSpeed = combo.carb.carb_speed;
  const isWorkoutSlot = !!slot.workoutContext;
  const carbPreferenceMatch = scorePreferenceRank(combo.carb, selections.carbs, "carb") >= 0.95;
  const carbPenaltyMultiplier = carbPreferenceMatch ? 0.35 : 1.0;
  if (carbTolerance === "tired_satiated") {
    if (carbSpeed === "fast" && !isWorkoutSlot) penalty += 0.25 * carbPenaltyMultiplier;
    if (carbSpeed === "slow") penalty -= 0.1; // bonus
  } else if (carbTolerance === "energized_hungry") {
    if (carbSpeed === "slow" && !isWorkoutSlot) penalty += 0.2 * carbPenaltyMultiplier;
    if (carbSpeed === "fast") penalty -= 0.1; // bonus
  } else if (carbTolerance === "tired_hungry") {
    if ((carbSpeed === "fast" || carbSpeed === "slow") && !isWorkoutSlot) penalty += 0.15 * carbPenaltyMultiplier;
  } else {
    // energized_satiated (default) — slight penalty for fast outside workout
    if (carbSpeed === "fast" && !isWorkoutSlot) penalty += 0.1 * carbPenaltyMultiplier;
  }

  // Cooking level soft preferences
  const cookingLevel = (options.cookingLevel || "basic").toLowerCase();
  const avgComplexity =
    (calculateCookingComplexity(combo.protein) +
      calculateCookingComplexity(combo.carb) +
      calculateCookingComplexity(combo.fat)) / 3;
  if (cookingLevel === "basic" && avgComplexity > 2.2) {
    penalty += 0.2;
  } else if (cookingLevel === "advanced" && avgComplexity < 1.8) {
    penalty += 0.1;
  }

  // Conservative weird-pairing penalties
  penalty += calculatePairingPenalty(combo.protein, combo.carb, combo.fat, slot);

  // Meal prep mode rewards lower-complexity, staple-friendly combos
  if (options.mealPrepMode && avgComplexity <= 2.0) {
    penalty -= 0.1;
  }
  
  return penalty;
}

// ============================================================================
// HARD RESTRICTIONS & CANDIDATE POOLS
// ============================================================================

function hasAnyTag(food: FoodWithMetadata, tags: string[]): boolean {
  return tags.some((t) => food.tags.includes(t));
}

function foodNameContains(food: FoodWithMetadata, terms: string[]): boolean {
  const name = food.name.toLowerCase();
  return terms.some((t) => name.includes(t));
}

export function applyHardRestrictions(
  catalog: FoodWithMetadata[],
  options: GenerationOptions
): { allowed: FoodWithMetadata[]; removedCount: number; logs: string[] } {
  const logs: string[] = [];
  const removedIds = new Set<string>();

  function removeIf(predicate: (f: FoodWithMetadata) => boolean, reason: string) {
    for (const food of catalog) {
      if (!removedIds.has(food.id) && predicate(food)) {
        removedIds.add(food.id);
        logs.push(`Hard restriction: removed ${food.name} — ${reason}`);
      }
    }
  }

  // Dietary preference hard restrictions
  const dietary = (options.dietaryPreference || "").toLowerCase();
  if (dietary === "vegetarian") {
    removeIf(
      (f) => hasAnyTag(f, ["beef", "pork", "chicken", "turkey", "fish", "shellfish", "seafood", "meat"]),
      "vegetarian diet"
    );
  } else if (dietary === "vegan") {
    removeIf(
      (f) =>
        hasAnyTag(f, ["beef", "pork", "chicken", "turkey", "fish", "shellfish", "seafood", "meat", "dairy", "egg", "whey", "casein", "cheese", "yogurt", "cottage"]) ||
        foodNameContains(f, ["egg", "milk", "cheese", "yogurt", "cottage", "whey", "casein"]),
      "vegan diet"
    );
  } else if (dietary === "pescatarian") {
    removeIf(
      (f) => hasAnyTag(f, ["beef", "pork", "chicken", "turkey", "meat"]),
      "pescatarian diet"
    );
  } else if (dietary === "keto") {
    removeIf(
      (f) => f.carbs_per_100g > 15 && !hasAnyTag(f, ["vegetable", "leafy", "low-carb"]),
      "keto diet (high carb)"
    );
  } else if (dietary === "paleo") {
    removeIf(
      (f) => hasAnyTag(f, ["dairy", "grain", "legume", "soy"]) || foodNameContains(f, ["cheese", "milk", "yogurt", "oats", "quinoa", "tofu", "tempeh"]),
      "paleo diet"
    );
  }

  // Allergies hard restrictions
  const allergies = (options.allergies || []).map((a) => a.toLowerCase());
  for (const allergy of allergies) {
    if (allergy === "gluten") {
      removeIf(
        (f) =>
          (hasAnyTag(f, ["wheat", "barley", "rye", "gluten"]) ||
            foodNameContains(f, ["pasta", "bread", "wheat"])) &&
          !hasAnyTag(f, ["gluten-free"]),
        "gluten allergy"
      );
    } else if (allergy === "dairy") {
      removeIf(
        (f) =>
          hasAnyTag(f, ["dairy", "milk", "cheese", "yogurt", "whey", "casein", "cottage"]) ||
          foodNameContains(f, ["milk", "cheese", "yogurt", "cottage", "whey", "casein"]),
        "dairy allergy"
      );
    } else if (allergy === "peanuts") {
      removeIf((f) => hasAnyTag(f, ["peanut"]) || foodNameContains(f, ["peanut"]), "peanut allergy");
    } else if (allergy === "soy") {
      removeIf((f) => hasAnyTag(f, ["soy", "tofu", "tempeh"]) || foodNameContains(f, ["soy", "tofu", "tempeh"]), "soy allergy");
    } else if (allergy === "eggs") {
      removeIf((f) => hasAnyTag(f, ["egg"]) || foodNameContains(f, ["egg"]), "egg allergy");
    } else if (allergy === "shellfish") {
      removeIf((f) => hasAnyTag(f, ["shellfish", "shrimp"]) || foodNameContains(f, ["shrimp", "crab", "lobster"]), "shellfish allergy");
    } else if (allergy === "fish") {
      removeIf((f) => hasAnyTag(f, ["fish", "salmon", "cod", "tilapia", "tuna"]) || foodNameContains(f, ["salmon", "cod", "tilapia", "tuna"]), "fish allergy");
    }
  }

  // Refused foods hard restrictions
  const refused = (options.refusedFoods || []).map((r) => r.toLowerCase());
  for (const refusedItem of refused) {
    removeIf(
      (f) => hasAnyTag(f, [refusedItem]) || foodNameContains(f, [refusedItem]),
      `refused food (${refusedItem})`
    );
  }

  const allowed = catalog.filter((f) => !removedIds.has(f.id));
  return { allowed, removedCount: removedIds.size, logs };
}

function buildCandidatePools(
  catalog: FoodWithMetadata[],
  preferredFamilies: string[],
  macroMin: number,
  category: "protein" | "carb" | "fat"
): { preferred: FoodWithMetadata[]; fallback: FoodWithMetadata[] } {
  const normalizeFamily = (value: string) => String(value || "").toLowerCase().trim();
  const preferredOrder = (preferredFamilies || []).map(normalizeFamily).filter(Boolean);
  const preferredSet = new Set(preferredOrder);
  const byMacro = (f: FoodWithMetadata) => {
    if (category === "protein") return f.protein_per_100g > macroMin;
    if (category === "carb") return f.carbs_per_100g > macroMin;
    return f.fat_per_100g > macroMin;
  };

  const foodScore = (f: FoodWithMetadata) => {
    const name = f.name.toLowerCase();
    const macroScore =
      category === "protein" ? f.protein_per_100g :
      category === "carb" ? f.carbs_per_100g :
      f.fat_per_100g;
    const contextScore = Math.max(
      f.breakfast_score || 0,
      f.lunch_dinner_score || 0,
      f.preworkout_score || 0,
      f.postworkout_score || 0,
      f.evening_score || 0,
    );
    const fiberBonus = category === "carb" ? Math.min(f.fiber_per_100g || 0, 8) * 0.6 : 0;
    const proteinLeannessBonus =
      category === "protein" && f.protein_leanness === "lean" ? 8 :
      category === "protein" && f.protein_leanness === "moderate" ? 3 :
      0;
    const proteinFatPenalty = category === "protein" ? Math.max(0, f.fat_per_100g - 12) * 0.9 : 0;
    const processedProteinPenalty =
      category === "protein" && /(bacon|sausage|pepperoni|salami|hot dog)/.test(name) ? 24 : 0;
    const processedCarbPenalty =
      category === "carb" && /(cracker|juice|cereal|granola|cookie|muffin)/.test(name) ? 12 : 0;
    const ultraDensePenalty =
      category === "fat" && f.calories_per_100g > 750 && !f.name.toLowerCase().includes("oil") ? 6 : 0;
    return macroScore
      + contextScore * 2
      + fiberBonus
      + proteinLeannessBonus
      - proteinFatPenalty
      - processedProteinPenalty
      - processedCarbPenalty
      - ultraDensePenalty;
  };

  const byFamily = new Map<string, FoodWithMetadata[]>();
  for (const food of catalog) {
    if (!byMacro(food)) continue;
    const family = normalizeFamily(food.variety_family || food.name);
    const list = byFamily.get(family) || [];
    list.push(food);
    byFamily.set(family, list);
  }

  for (const [family, foods] of byFamily.entries()) {
    const uniqueByName = new Map<string, FoodWithMetadata>();
    for (const food of foods) {
      const nameKey = food.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const current = uniqueByName.get(nameKey);
      if (!current || foodScore(food) > foodScore(current)) {
        uniqueByName.set(nameKey, food);
      }
    }
    byFamily.set(
      family,
      Array.from(uniqueByName.values()).sort((a, b) => foodScore(b) - foodScore(a)),
    );
  }

  const preferred: FoodWithMetadata[] = [];
  for (const family of preferredOrder) {
    const familyFoods = byFamily.get(family) || [];
    preferred.push(...familyFoods.slice(0, 2));
  }

  const preferredIds = new Set(preferred.map((f) => f.id));
  const fallbackFamilies = Array.from(byFamily.entries())
    .filter(([family]) => !preferredSet.has(family))
    .flatMap(([, foods]) => foods.slice(0, 1))
    .filter((f) => !preferredIds.has(f.id))
    .sort((a, b) => foodScore(b) - foodScore(a))
    .slice(0, 8);

  const rankSortedPreferred = preferred
    .slice(0, 12)
    .sort((a, b) => {
      const prefDiff = scorePreferenceRank(b, preferredFamilies, category) - scorePreferenceRank(a, preferredFamilies, category);
      if (Math.abs(prefDiff) > 0.001) return prefDiff;
      return foodScore(b) - foodScore(a);
    });

  const rankSortedFallback = fallbackFamilies.sort((a, b) => {
    const prefDiff = scorePreferenceRank(b, preferredFamilies, category) - scorePreferenceRank(a, preferredFamilies, category);
    if (Math.abs(prefDiff) > 0.001) return prefDiff;
    return foodScore(b) - foodScore(a);
  });

  return { preferred: rankSortedPreferred, fallback: rankSortedFallback };
}

function calculateCookingComplexity(food: FoodWithMetadata): number {
  // Lower = simpler / less prep
  const name = food.name.toLowerCase();
  if (
    name.includes("protein powder") ||
    name.includes("whey") ||
    name.includes("casein") ||
    name.includes("nuts") ||
    name.includes("almond") ||
    name.includes("walnut") ||
    name.includes("peanut") ||
    name.includes("chia") ||
    name.includes("avocado") ||
    name.includes("banana") ||
    name.includes("berries") ||
    name.includes("yogurt") ||
    name.includes("cottage") ||
    name.includes("cheese") ||
    name.includes("milk") ||
    name.includes("oil") ||
    name.includes("canned") ||
    name.includes("tuna")
  ) {
    return 1; // minimal prep
  }
  if (
    name.includes("egg") ||
    name.includes("chicken breast") ||
    name.includes("tilapia") ||
    name.includes("cod") ||
    name.includes("rice") ||
    name.includes("potato") ||
    name.includes("pasta") ||
    name.includes("bread")
  ) {
    return 2; // basic prep
  }
  return 3; // moderate prep
}

// ============================================================================
// MEAL GENERATION ENGINE
// ============================================================================

export function generateDailyMeals(
  foodCatalog: FoodWithMetadata[],
  selections: UserNutritionSelections,
  slots: MealSlot[],
  macroTargets: MacroTargets,
  goal: "muscle_gain" | "fat_loss" | "maintenance",
  options: GenerationOptions
): GeneratedMealPlan {
  const warnings: string[] = [];
  const logs: string[] = [];

  // 1) Apply hard restrictions (allergies, dietary preference, refused foods)
  const { allowed: restrictedCatalog, removedCount, logs: restrictionLogs } = applyHardRestrictions(
    foodCatalog,
    options
  );
  if (restrictionLogs.length > 0) {
    logs.push(...restrictionLogs);
  }
  if (removedCount > 0) {
    warnings.push(`${removedCount} food(s) removed due to allergies, dietary restrictions, or refused foods.`);
  }

  // 2) Build candidate pools: preferred families first, then fallback
  const proteinPools = buildCandidatePools(restrictedCatalog, selections.proteins || [], 5, "protein");
  const carbPools = buildCandidatePools(restrictedCatalog, selections.carbs || [], 5, "carb");
  const fatPools = buildCandidatePools(restrictedCatalog, selections.fats || [], 2, "fat");

  let availableProteins = proteinPools.preferred;
  if (availableProteins.length === 0) {
    availableProteins = proteinPools.fallback;
    if (availableProteins.length > 0) {
      warnings.push("No preferred proteins available after restrictions; using fallback proteins.");
      logs.push("Fallback used: proteins from non-preferred families.");
    }
  }

  let availableCarbs = carbPools.preferred;
  if (availableCarbs.length === 0) {
    availableCarbs = carbPools.fallback;
    if (availableCarbs.length > 0) {
      warnings.push("No preferred carbs available after restrictions; using fallback carbs.");
      logs.push("Fallback used: carbs from non-preferred families.");
    }
  }

  let availableFats = fatPools.preferred;
  if (availableFats.length === 0) {
    availableFats = fatPools.fallback;
    if (availableFats.length > 0) {
      warnings.push("No preferred fats available after restrictions; using fallback fats.");
      logs.push("Fallback used: fats from non-preferred families.");
    }
  }

  // Final safety fallback: if a category is still empty, pull from full restricted catalog by macro
  if (availableProteins.length === 0) {
    availableProteins = restrictedCatalog.filter((f) => f.protein_per_100g > 15).slice(0, 10);
    if (availableProteins.length > 0) {
      warnings.push("No matching proteins found in your selection. Using standard high-protein fallbacks.");
      logs.push("Critical fallback used: any high-protein foods from restricted catalog.");
    }
  }
  if (availableCarbs.length === 0) {
    availableCarbs = restrictedCatalog.filter((f) => f.carbs_per_100g > 15).slice(0, 10);
    if (availableCarbs.length > 0) {
      warnings.push("No matching carbs found in your selection. Using standard complex carb fallbacks.");
      logs.push("Critical fallback used: any high-carb foods from restricted catalog.");
    }
  }
  if (availableFats.length === 0) {
    availableFats = restrictedCatalog.filter((f) => f.fat_per_100g > 10).slice(0, 10);
    if (availableFats.length > 0) {
      warnings.push("No matching healthy fats found in your selection. Using standard fat fallbacks.");
      logs.push("Critical fallback used: any high-fat foods from restricted catalog.");
    }
  }

  if (availableProteins.length === 0 || availableCarbs.length === 0 || availableFats.length === 0) {
    throw new Error(
      `CRITICAL: Even with fallbacks, no foods found. ` +
      `Catalog size: ${foodCatalog.length}, after restrictions: ${restrictedCatalog.length}. RETRY_ONBOARDING`
    );
  }

  const meals: GeneratedMeal[] = [];
  let remainingMacros = { ...macroTargets };
  // Track protein+carb family pairs used within this day to prevent exact same-day duplicates.
  const usedProteinCarbPairs = new Set<string>();

  for (let slotIdx = 0; slotIdx < slots.length; slotIdx++) {
    const slot = slots[slotIdx];
    const remainingSlots = slots.slice(slotIdx + 1);

    const allPreviousMeals = [...(options.previousDaysMeals || []), ...meals];

    // Build per-slot pools: exclude carb families already used today if alternatives exist.
    const usedCarbFamilies = new Set(meals.map((m) => m.items.carb.food.variety_family));
    const freshCarbs = availableCarbs.filter((c) => !usedCarbFamilies.has(c.variety_family));
    const slotCarbs = freshCarbs.length > 0 ? freshCarbs : availableCarbs;

    // Build per-slot pools: exclude protein families already used today if alternatives exist.
    const usedProteinFamilies = new Set(meals.map((m) => m.items.protein.food.variety_family));
    const freshProteins = availableProteins.filter((p) => !usedProteinFamilies.has(p.variety_family));
    const slotProteins = freshProteins.length > 0 ? freshProteins : availableProteins;

    // Additionally hard-filter out exact protein+carb family pairs already seen today.
    const filteredProteins = slotProteins.filter((p) =>
      slotCarbs.some((c) => !usedProteinCarbPairs.has(`${p.variety_family}+${c.variety_family}`))
    );
    const finalProteins = filteredProteins.length > 0 ? filteredProteins : slotProteins;

    const meal = generateBestMeal(
      finalProteins,
      slotCarbs,
      availableFats,
      slot,
      allPreviousMeals,
      remainingMacros,
      remainingSlots,
      goal,
      selections,
      selections.traditional_meals,
      options
    );

    if (meal) {
      meals.push(meal);
      remainingMacros = subtractMacros(remainingMacros, meal.macros);
      usedProteinCarbPairs.add(
        `${meal.items.protein.food.variety_family}+${meal.items.carb.food.variety_family}`,
      );
    }
  }

  if (meals.length === 0) {
    throw new Error(
      `Scientific meal engine produced 0 meals for this day. ` +
      `Proteins: ${availableProteins.length}, Carbs: ${availableCarbs.length}, Fats: ${availableFats.length}. ` +
      `Targets: ${macroTargets.protein_g}g protein / ${macroTargets.carbs_g}g carbs / ${macroTargets.fat_g}g fat.`
    );
  }

  const mealsWithProduce = addProduceSides(meals, restrictedCatalog, goal, options.previousDaysMeals || []);
  const scaledMeals = scalePortions(mealsWithProduce, macroTargets);
  return { meals: scaledMeals, warnings, logs };
}

function generateBestMeal(
  proteins: FoodWithMetadata[],
  carbs: FoodWithMetadata[],
  fats: FoodWithMetadata[],
  slot: MealSlot,
  previousMeals: GeneratedMeal[],
  remainingMacros: MacroTargets,
  remainingSlots: MealSlot[],
  goal: "muscle_gain" | "fat_loss" | "maintenance",
  selections: UserNutritionSelections,
  traditionalMeals: boolean,
  options: GenerationOptions
): GeneratedMeal | null {
  let bestCandidate: MealCandidate | null = null;
  let bestScore = -Infinity;

  // Allocate a proportional share of remaining macros to this slot
  const slotsTotal = remainingSlots.length + 1;
  const slotTargets: MacroTargets = {
    calories: remainingMacros.calories / slotsTotal,
    protein_g: remainingMacros.protein_g / slotsTotal,
    carbs_g: remainingMacros.carbs_g / slotsTotal,
    fat_g: remainingMacros.fat_g / slotsTotal,
  };

  // Generate all combinations and score them
  for (const protein of proteins) {
    for (const carb of carbs) {
      for (const fat of fats) {
        const combo = { protein, carb, fat };

        // Quick feasibility check using actual bounds
        if (!isFeasible(combo, slotTargets)) {
          continue;
        }

        const candidate = scoreMealCandidate(combo, slot, previousMeals, goal, selections, traditionalMeals, options);

        if (candidate.score > bestScore) {
          bestScore = candidate.score;
          bestCandidate = candidate;
        }
      }
    }
  }

  if (!bestCandidate) return null;

  return createMealFromCandidate(bestCandidate, slot, slotTargets);
}

function isFeasible(
  combo: { protein: FoodWithMetadata; carb: FoodWithMetadata; fat: FoodWithMetadata },
  slotTargets: MacroTargets
): boolean {
  // Estimate grams needed to hit slot targets
  const proteinGrams = combo.protein.protein_per_100g > 0
    ? (slotTargets.protein_g / (combo.protein.protein_per_100g / 100))
    : Infinity;
  const carbGrams = combo.carb.carbs_per_100g > 0
    ? (slotTargets.carbs_g / (combo.carb.carbs_per_100g / 100))
    : Infinity;
  const fatGrams = combo.fat.fat_per_100g > 0
    ? (slotTargets.fat_g / (combo.fat.fat_per_100g / 100))
    : Infinity;

  // Reject if any required serving exceeds the food's realistic max portion
  return (
    proteinGrams <= combo.protein.max_grams &&
    carbGrams <= combo.carb.max_grams &&
    fatGrams <= combo.fat.max_grams
  );
}

function createMealFromCandidate(
  candidate: MealCandidate,
  slot: MealSlot,
  slotTargets: MacroTargets
): GeneratedMeal {
  const { protein, carb, fat } = candidate;

  // Bounds with sensible defaults
  const pMin = protein.min_grams ?? 50;
  const pMax = protein.max_grams ?? 400;
  const cMin = carb.min_grams ?? 30;
  const cMax = carb.max_grams ?? 500;
  const fMin = fat.min_grams ?? 5;
  const fMax = fat.max_grams ?? 100;

  // Step 1: solve protein grams
  const pFactor = protein.protein_per_100g / 100;
  let pGrams = pFactor > 0 ? slotTargets.protein_g / pFactor : 0;
  pGrams = Math.max(pMin, Math.min(pMax, pGrams));
  const pMacros = calculateFoodMacros(protein, pGrams);

  // Step 2: remaining carbs after protein's carb contribution
  const remainingCarbs = Math.max(0, slotTargets.carbs_g - pMacros.carbs);
  const cFactor = carb.carbs_per_100g / 100;
  let cGrams = cFactor > 0 ? remainingCarbs / cFactor : 0;
  cGrams = Math.max(cMin, Math.min(cMax, cGrams));
  const cMacros = calculateFoodMacros(carb, cGrams);

  // Step 3: remaining fat after protein+carb fat contribution
  const remainingFat = Math.max(0, slotTargets.fat_g - pMacros.fat - cMacros.fat);
  const fFactor = fat.fat_per_100g / 100;
  let fGrams = fFactor > 0 ? remainingFat / fFactor : 0;
  fGrams = Math.max(fMin, Math.min(fMax, fGrams));
  const fMacros = calculateFoodMacros(fat, fGrams);

  // Refinement pass: adjust protein if we're meaningfully off target
  const totalProtein = pMacros.protein + cMacros.protein + fMacros.protein;
  if (Math.abs(totalProtein - slotTargets.protein_g) > 3 && pFactor > 0) {
    const adjustedPGrams =
      (slotTargets.protein_g - cMacros.protein - fMacros.protein) / pFactor;
    if (adjustedPGrams >= pMin && adjustedPGrams <= pMax) {
      pGrams = adjustedPGrams;
    }
  }

  const finalProteinMacros = calculateFoodMacros(protein, pGrams);
  const totalMacros = {
    calories:
      finalProteinMacros.calories +
      cMacros.calories +
      fMacros.calories,
    protein:
      finalProteinMacros.protein + cMacros.protein + fMacros.protein,
    carbs:
      finalProteinMacros.carbs + cMacros.carbs + fMacros.carbs,
    fat: finalProteinMacros.fat + cMacros.fat + fMacros.fat,
  };

  const rationale = generateRationale(candidate, slot);
  const assembled = assembleMeal(protein, carb, fat, slot);
  const prepTime = calculatePrepTimeMinutes(protein, carb, fat, slot, assembled.assembly_type);
  const fingerprint = `${protein.variety_family}+${carb.variety_family}+${assembled.assembly_type}`;

  // Combine assembled description with any informative rationale
  let description = assembled.description;
  if (rationale && rationale !== "Balanced macronutrient meal") {
    description = `${assembled.description} ${rationale}`.trim();
  }

  return {
    slot: slot.slot,
    name: assembled.name,
    description,
    timing: slot.timing,
    items: {
      protein: { food: protein, grams: Math.round(pGrams) },
      carb: { food: carb, grams: Math.round(cGrams) },
      fat: { food: fat, grams: Math.round(fGrams) },
    },
    macros: totalMacros,
    rationale,
    logs: [],
    prep_time_min: prepTime,
    assembly_type: assembled.assembly_type,
    fingerprint,
  };
}

function calculateFoodMacros(food: FoodWithMetadata, grams: number) {
  const factor = grams / 100;
  return {
    calories: Math.round(food.calories_per_100g * factor),
    protein: Math.round(food.protein_per_100g * factor * 10) / 10,
    carbs: Math.round(food.carbs_per_100g * factor * 10) / 10,
    fat: Math.round(food.fat_per_100g * factor * 10) / 10,
  };
}

function isNonStarchyVegetable(food: FoodWithMetadata): boolean {
  const category = String(food.category || "").toLowerCase();
  const name = food.name.toLowerCase();
  if (!category.includes("vegetable")) return false;
  if (/(potato|sweet potato|corn|peas|beans|lentil|garlic)/.test(name)) return false;
  return food.calories_per_100g <= 55 && food.carbs_per_100g <= 11;
}

function isWholeFruit(food: FoodWithMetadata): boolean {
  const category = String(food.category || "").toLowerCase();
  const name = food.name.toLowerCase();
  if (!category.includes("fruit")) return false;
  if (/(juice|dates|dried)/.test(name)) return false;
  return food.calories_per_100g <= 90 && food.carbs_per_100g <= 23;
}

function produceGrams(food: FoodWithMetadata): number {
  const name = food.name.toLowerCase();
  if (/(spinach|lettuce|mixed greens|kale)/.test(name)) return 75;
  if (isWholeFruit(food)) return 140;
  return 120;
}

function selectProduce(
  pool: FoodWithMetadata[],
  usedItems: Map<string, number>,
  slot: string,
  preferredKinds: ProduceKind[],
): FoodWithMetadata | null {
  const orderedPool =
    preferredKinds
      .flatMap((kind) => pool.filter((food) => {
        const isFruit = isWholeFruit(food);
        const isVeg = isNonStarchyVegetable(food);
        if (kind === "fruit") return isFruit;
        if (kind === "vegetable") return isVeg;
        return isFruit || isVeg;
      }))
      .filter((food, index, array) => array.findIndex((candidate) => candidate.id === food.id) === index);

  const candidateSource = orderedPool.length > 0
    ? orderedPool
    : pool.filter((food) => {
      if (slot === "lunch" || slot === "dinner") return isNonStarchyVegetable(food);
      if (slot === "breakfast" || slot === "snack" || slot === "evening" || slot === "post-workout") return isWholeFruit(food);
      return false;
    });

  const candidates = candidateSource
    .sort((a, b) => {
      const aKey = a.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const bKey = b.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const aCount = usedItems.get(aKey) || 0;
      const bCount = usedItems.get(bKey) || 0;
      if (aCount !== bCount) return aCount - bCount;
      const aFiber = a.fiber_per_100g || 0;
      const bFiber = b.fiber_per_100g || 0;
      if (aFiber !== bFiber) return bFiber - aFiber;
      return a.name.localeCompare(b.name);
    });

  return candidates[0] || null;
}

function addProduceSides(
  meals: GeneratedMeal[],
  restrictedCatalog: FoodWithMetadata[],
  goal: "muscle_gain" | "fat_loss" | "maintenance",
  previousDaysMeals: GeneratedMeal[] = [],
): GeneratedMeal[] {
  const producePool = restrictedCatalog.filter((food) => isNonStarchyVegetable(food) || isWholeFruit(food));
  if (!producePool.length) return meals;

  const usedFamilies = new Map<string, number>();
  for (const previousMeal of previousDaysMeals) {
    const previousProduce = previousMeal.items.produce;
    if (!previousProduce) continue;
    const previousKey = previousProduce.food.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    usedFamilies.set(previousKey, (usedFamilies.get(previousKey) || 0) + 1);
  }

  return meals.map((meal) => {
    const baseFiber = calculateMealFiber(meal);
    const decision = determineProduceDecision({
      slot: meal.slot as ProduceSlot,
      goal,
      baseFiberG: baseFiber,
      baseCalories: meal.macros.calories,
    });
    if (!decision.include) return meal;

    const produce = selectProduce(producePool, usedFamilies, meal.slot, decision.preferredKinds);
    if (!produce) return meal;

    const grams = decision.grams || produceGrams(produce);
    const produceMacros = calculateFoodMacros(produce, grams);
    const produceKey = produce.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    usedFamilies.set(produceKey, (usedFamilies.get(produceKey) || 0) + 1);

    return {
      ...meal,
      description: `${meal.description} Includes ${produce.name.toLowerCase()} for micronutrients and fiber.`,
      items: {
        ...meal.items,
        produce: { food: produce, grams },
      },
      macros: {
        calories: meal.macros.calories + produceMacros.calories,
        protein: Math.round((meal.macros.protein + produceMacros.protein) * 10) / 10,
        carbs: Math.round((meal.macros.carbs + produceMacros.carbs) * 10) / 10,
        fat: Math.round((meal.macros.fat + produceMacros.fat) * 10) / 10,
      },
    };
  });
}

function calculateMealFiber(meal: GeneratedMeal): number {
  const produceFiber = meal.items.produce
    ? (meal.items.produce.food.fiber_per_100g / 100) * meal.items.produce.grams
    : 0;
  const proteinFiber = (meal.items.protein.food.fiber_per_100g / 100) * meal.items.protein.grams;
  const carbFiber = (meal.items.carb.food.fiber_per_100g / 100) * meal.items.carb.grams;
  const fatFiber = (meal.items.fat.food.fiber_per_100g / 100) * meal.items.fat.grams;

  return proteinFiber + carbFiber + fatFiber + produceFiber;
}

function generateRationale(candidate: MealCandidate, slot: MealSlot): string {
  const parts: string[] = [];
  
  if (slot.workoutContext) {
    parts.push(`Workout-optimized ${slot.workoutContext}-workout meal`);
  }
  
  if (candidate.scoreBreakdown.mealContextFit > 0.7) {
    parts.push("Culturally appropriate for this time of day");
  }

  if (candidate.scoreBreakdown.preferenceFit > 0.8) {
    parts.push("Built around your preferred protein, carb, and fat choices");
  } else if (candidate.scoreBreakdown.preferenceFit > 0.65) {
    parts.push("Built around your preferred foods");
  }

  if (candidate.scoreBreakdown.varietyFit < 1) {
    parts.push("Adjusted to preserve weekly variety");
  }
  
  return parts.join(". ") || "Balanced macronutrient meal";
}

// ============================================================================
// PORTION SCALING
// ============================================================================

function scalePortions(meals: GeneratedMeal[], targets: MacroTargets): GeneratedMeal[] {
  const currentTotals = sumMealMacros(meals);

  // If already close enough, skip rebalancing
  const proteinErr = Math.abs(targets.protein_g - currentTotals.protein);
  const carbsErr = Math.abs(targets.carbs_g - currentTotals.carbs);
  const fatErr = Math.abs(targets.fat_g - currentTotals.fat);
  if (proteinErr < 2 && carbsErr < 2 && fatErr < 2) {
    return meals;
  }

  // Distribute error proportionally across meals, respecting portion bounds.
  const initiallyScaled = meals.map((meal) => {
    const pFood = meal.items.protein.food;
    const cFood = meal.items.carb.food;
    const fFood = meal.items.fat.food;
    const produceItem = meal.items.produce;
    const produceMacros = produceItem
      ? calculateFoodMacros(produceItem.food, produceItem.grams)
      : { calories: 0, protein: 0, carbs: 0, fat: 0 };

    const proteinShare = meal.macros.protein / Math.max(currentTotals.protein, 1);
    const carbShare = meal.macros.carbs / Math.max(currentTotals.carbs, 1);
    const fatShare = meal.macros.fat / Math.max(currentTotals.fat, 1);

    // Calculate adjustment in grams for each component
    const pAdj = (targets.protein_g - currentTotals.protein) * proteinShare / (pFood.protein_per_100g / 100);
    const cAdj = (targets.carbs_g - currentTotals.carbs) * carbShare / (cFood.carbs_per_100g / 100);
    const fAdj = (targets.fat_g - currentTotals.fat) * fatShare / (fFood.fat_per_100g / 100);

    let pGrams = Math.round(meal.items.protein.grams + pAdj);
    let cGrams = Math.round(meal.items.carb.grams + cAdj);
    let fGrams = Math.round(meal.items.fat.grams + fAdj);

    // Clamp to realistic bounds
    pGrams = Math.max(pFood.min_grams ?? 50, Math.min(pFood.max_grams ?? 400, pGrams));
    cGrams = Math.max(cFood.min_grams ?? 30, Math.min(cFood.max_grams ?? 500, cGrams));
    fGrams = Math.max(fFood.min_grams ?? 5, Math.min(fFood.max_grams ?? 100, fGrams));

    const macros = {
      calories:
        calculateFoodMacros(pFood, pGrams).calories +
        calculateFoodMacros(cFood, cGrams).calories +
        calculateFoodMacros(fFood, fGrams).calories +
        produceMacros.calories,
      protein:
        calculateFoodMacros(pFood, pGrams).protein +
        calculateFoodMacros(cFood, cGrams).protein +
        calculateFoodMacros(fFood, fGrams).protein +
        produceMacros.protein,
      carbs:
        calculateFoodMacros(pFood, pGrams).carbs +
        calculateFoodMacros(cFood, cGrams).carbs +
        calculateFoodMacros(fFood, fGrams).carbs +
        produceMacros.carbs,
      fat:
        calculateFoodMacros(pFood, pGrams).fat +
        calculateFoodMacros(cFood, cGrams).fat +
        calculateFoodMacros(fFood, fGrams).fat +
        produceMacros.fat,
    };

    return {
      ...meal,
      items: {
        protein: { food: pFood, grams: pGrams },
        carb: { food: cFood, grams: cGrams },
        fat: { food: fFood, grams: fGrams },
        ...(produceItem ? { produce: produceItem } : {}),
      },
      macros,
    };
  });

  return repairMacroPortions(initiallyScaled, targets);
}

function sumMealMacros(meals: GeneratedMeal[]) {
  return meals.reduce(
    (sum, meal) => ({
      calories: sum.calories + meal.macros.calories,
      protein: sum.protein + meal.macros.protein,
      carbs: sum.carbs + meal.macros.carbs,
      fat: sum.fat + meal.macros.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

function withUpdatedPortions(
  meal: GeneratedMeal,
  next: { protein?: number; carb?: number; fat?: number },
): GeneratedMeal {
  const pFood = meal.items.protein.food;
  const cFood = meal.items.carb.food;
  const fFood = meal.items.fat.food;
  const produceItem = meal.items.produce;
  const pGrams = next.protein ?? meal.items.protein.grams;
  const cGrams = next.carb ?? meal.items.carb.grams;
  const fGrams = next.fat ?? meal.items.fat.grams;
  const produceMacros = produceItem
    ? calculateFoodMacros(produceItem.food, produceItem.grams)
    : { calories: 0, protein: 0, carbs: 0, fat: 0 };

  const pMacros = calculateFoodMacros(pFood, pGrams);
  const cMacros = calculateFoodMacros(cFood, cGrams);
  const fMacros = calculateFoodMacros(fFood, fGrams);
  const macros = {
    calories: pMacros.calories + cMacros.calories + fMacros.calories + produceMacros.calories,
    protein: pMacros.protein + cMacros.protein + fMacros.protein + produceMacros.protein,
    carbs: pMacros.carbs + cMacros.carbs + fMacros.carbs + produceMacros.carbs,
    fat: pMacros.fat + cMacros.fat + fMacros.fat + produceMacros.fat,
  };

  return {
    ...meal,
    items: {
      protein: { food: pFood, grams: pGrams },
      carb: { food: cFood, grams: cGrams },
      fat: { food: fFood, grams: fGrams },
      ...(produceItem ? { produce: produceItem } : {}),
    },
    macros,
  };
}

function adjustMacroPortions(
  meals: GeneratedMeal[],
  component: "protein" | "carb" | "fat",
  diffGrams: number,
): GeneratedMeal[] {
  if (Math.abs(diffGrams) < 1) return meals;

  const macroField = component === "protein" ? "protein_per_100g" : component === "carb" ? "carbs_per_100g" : "fat_per_100g";
  const capacities = meals.map((meal, index) => {
    const item = meal.items[component];
    const macroDensity = Number(item.food[macroField] || 0) / 100;
    if (macroDensity <= 0) return { index, capacityMacro: 0, macroDensity };
    const current = item.grams;
    const min = item.food.min_grams ?? (component === "fat" ? 5 : 30);
    const baseMax = item.food.max_grams ?? (component === "fat" ? 100 : 500);
    const max = component === "carb" && diffGrams > 0 ? baseMax * 1.5 : baseMax;
    const capacityGrams = diffGrams > 0 ? Math.max(0, max - current) : Math.max(0, current - min);
    return { index, capacityMacro: capacityGrams * macroDensity, macroDensity };
  });

  const totalCapacity = capacities.reduce((sum, item) => sum + item.capacityMacro, 0);
  if (totalCapacity <= 0) return meals;

  let remaining = Math.min(Math.abs(diffGrams), totalCapacity);
  let nextMeals = meals;
  for (const capacity of capacities) {
    if (remaining <= 0 || capacity.capacityMacro <= 0 || capacity.macroDensity <= 0) continue;
    const macroDelta = Math.min(remaining, capacity.capacityMacro);
    const gramDelta = macroDelta / capacity.macroDensity * (diffGrams > 0 ? 1 : -1);
    const meal = nextMeals[capacity.index];
    const currentGrams = meal.items[component].grams;
    nextMeals = nextMeals.map((entry, idx) =>
      idx === capacity.index ? withUpdatedPortions(entry, { [component]: Math.round(currentGrams + gramDelta) }) : entry
    );
    remaining -= macroDelta;
  }

  return nextMeals;
}

function repairMacroPortions(meals: GeneratedMeal[], targets: MacroTargets): GeneratedMeal[] {
  let repaired = meals;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const totals = sumMealMacros(repaired);
    repaired = adjustMacroPortions(repaired, "protein", targets.protein_g - totals.protein);
    repaired = adjustMacroPortions(repaired, "carb", targets.carbs_g - sumMealMacros(repaired).carbs);
    repaired = adjustMacroPortions(repaired, "fat", targets.fat_g - sumMealMacros(repaired).fat);
  }
  return repaired;
}

function subtractMacros(current: MacroTargets, used: { calories: number; protein: number; carbs: number; fat: number }): MacroTargets {
  return {
    calories: Math.max(0, current.calories - used.calories),
    protein_g: Math.max(0, current.protein_g - used.protein),
    carbs_g: Math.max(0, current.carbs_g - used.carbs),
    fat_g: Math.max(0, current.fat_g - used.fat),
  };
}

// ============================================================================
// WEEKLY COHERENCE & REALISM SCORING
// ============================================================================

export interface WeeklyCoherenceReport {
  uniqueProteins: number;
  uniqueCarbs: number;
  uniqueFats: number;
  singletonCount: number;
  exactRepeat48h: number;
  averagePrepTime: number;
  weirdPairingCount: number;
  isChaotic: boolean;
  realismScore: number;
  realismLabel: string;
}

export function analyzeWeeklyCoherence(weeklyMeals: GeneratedMeal[][]): WeeklyCoherenceReport {
  const proteinFreq: Record<string, number> = {};
  const carbFreq: Record<string, number> = {};
  const fatFreq: Record<string, number> = {};
  let exactRepeat48h = 0;
  let weirdPairingCount = 0;
  let totalPrepTime = 0;
  let totalMeals = 0;

  const allMeals: GeneratedMeal[] = [];
  for (const day of weeklyMeals) {
    for (const meal of day) {
      allMeals.push(meal);
      proteinFreq[meal.items.protein.food.variety_family] = (proteinFreq[meal.items.protein.food.variety_family] || 0) + 1;
      carbFreq[meal.items.carb.food.variety_family] = (carbFreq[meal.items.carb.food.variety_family] || 0) + 1;
      fatFreq[meal.items.fat.food.variety_family] = (fatFreq[meal.items.fat.food.variety_family] || 0) + 1;
      totalPrepTime += meal.prep_time_min;
      totalMeals++;

      // weird pairings already penalized in scoring; count any that still made it through
      const pairPenalty = calculatePairingPenalty(meal.items.protein.food, meal.items.carb.food, meal.items.fat.food, {
        name: meal.name,
        slot: meal.slot as MealSlot["slot"],
        timing: meal.timing,
        targetProfile: { proteinPreference: "any", carbSpeed: "any", fatAcceptable: true },
      });
      if (pairPenalty > 0.2) weirdPairingCount++;
    }
  }

  // Count exact fingerprint repeats within ~8 meals (48h window)
  for (let i = 0; i < allMeals.length; i++) {
    const window = allMeals.slice(Math.max(0, i - 8), i);
    for (const past of window) {
      if (allMeals[i].fingerprint === past.fingerprint) {
        exactRepeat48h++;
        break;
      }
    }
  }

  const uniqueProteins = Object.keys(proteinFreq).length;
  const uniqueCarbs = Object.keys(carbFreq).length;
  const uniqueFats = Object.keys(fatFreq).length;
  const singletonCount =
    Object.values(proteinFreq).filter((c) => c === 1).length +
    Object.values(carbFreq).filter((c) => c === 1).length +
    Object.values(fatFreq).filter((c) => c === 1).length;

  const averagePrepTime = totalMeals > 0 ? Math.round(totalPrepTime / totalMeals) : 0;

  const isChaotic = uniqueProteins > 5 || uniqueCarbs > 5 || uniqueFats > 4 || singletonCount > 6;
  const dominantCount = Math.max(
    0,
    ...Object.values(proteinFreq),
    ...Object.values(carbFreq),
    ...Object.values(fatFreq),
  );
  const dominantShare = totalMeals > 0 ? dominantCount / totalMeals : 0;

  // Realism score: 0-100
  let score = 100;
  if (uniqueProteins > 5) score -= (uniqueProteins - 5) * 5;
  if (uniqueCarbs > 5) score -= (uniqueCarbs - 5) * 5;
  if (uniqueFats > 4) score -= (uniqueFats - 4) * 5;
  if (uniqueProteins < Math.min(3, totalMeals)) score -= (Math.min(3, totalMeals) - uniqueProteins) * 12;
  if (uniqueCarbs < Math.min(3, totalMeals)) score -= (Math.min(3, totalMeals) - uniqueCarbs) * 12;
  if (uniqueFats < Math.min(2, totalMeals)) score -= (Math.min(2, totalMeals) - uniqueFats) * 10;
  if (dominantShare > 0.45) score -= Math.round((dominantShare - 0.45) * 80);
  score -= singletonCount * 3;
  const possibleProteinCarbPairs = Math.max(1, uniqueProteins * uniqueCarbs);
  const repeatPenalty = possibleProteinCarbPairs <= 9 ? 2 : 4;
  score -= exactRepeat48h * repeatPenalty;
  score -= weirdPairingCount * 5;
  if (averagePrepTime > 35) score -= (averagePrepTime - 35);

  score = Math.max(0, Math.min(100, Math.round(score)));

  let realismLabel = "Looks realistic";
  if (score < 80) realismLabel = "Mostly realistic, minor oddities";
  if (score < 60) realismLabel = "Needs review";
  if (score < 40) realismLabel = "Likely unrealistic — inspect closely";

  return {
    uniqueProteins,
    uniqueCarbs,
    uniqueFats,
    singletonCount,
    exactRepeat48h,
    averagePrepTime,
    weirdPairingCount,
    isChaotic,
    realismScore: score,
    realismLabel,
  };
}

export function rebalanceWeeklyMeals(
  foodCatalog: FoodWithMetadata[],
  selections: UserNutritionSelections,
  allSlots: MealSlot[][],
  macroTargets: MacroTargets | MacroTargets[],
  goal: "muscle_gain" | "fat_loss" | "maintenance",
  baseOptions: GenerationOptions,
  weeklyMeals: GeneratedMeal[][]
): { meals: GeneratedMeal[][]; warnings: string[]; logs: string[] } {
  const warnings: string[] = [];
  const logs: string[] = [];

  const coherence = analyzeWeeklyCoherence(weeklyMeals);
  if (!coherence.isChaotic) {
    return { meals: weeklyMeals, warnings, logs };
  }

  // Identify days with singleton proteins/carbs
  const proteinFreq: Record<string, number> = {};
  const carbFreq: Record<string, number> = {};
  for (const day of weeklyMeals) {
    for (const meal of day) {
      proteinFreq[meal.items.protein.food.variety_family] = (proteinFreq[meal.items.protein.food.variety_family] || 0) + 1;
      carbFreq[meal.items.carb.food.variety_family] = (carbFreq[meal.items.carb.food.variety_family] || 0) + 1;
    }
  }

  const daysToRebalance: number[] = [];
  for (let d = 0; d < weeklyMeals.length; d++) {
    const day = weeklyMeals[d];
    const hasSingleton = day.some(
      (m) =>
        proteinFreq[m.items.protein.food.variety_family] === 1 ||
        carbFreq[m.items.carb.food.variety_family] === 1
    );
    if (hasSingleton) daysToRebalance.push(d);
  }

  // Rebalance at most 2 days
  const targetDays = daysToRebalance.slice(0, 2);
  if (targetDays.length === 0) {
    return { meals: weeklyMeals, warnings, logs };
  }

  warnings.push(
    `Weekly plan was chaotic (${coherence.uniqueProteins} proteins, ${coherence.uniqueCarbs} carbs). Rebalancing ${targetDays.length} day(s) for better grocery coherence.`
  );
  logs.push(`Weekly rebalance triggered for days: ${targetDays.join(", ")}`);

  const result = weeklyMeals.map((day, idx) => {
    if (!targetDays.includes(idx)) return day;

    const otherDays = weeklyMeals.filter((_, i) => i !== idx).flat();
    const rebalanceOptions: GenerationOptions = {
      ...baseOptions,
      mealPrepMode: true,
      previousDaysMeals: otherDays,
    };

    const { meals: newDay, warnings: dayWarnings, logs: dayLogs } = generateDailyMeals(
      foodCatalog,
      selections,
      allSlots[idx],
      Array.isArray(macroTargets) ? macroTargets[idx] : macroTargets,
      goal,
      rebalanceOptions
    );

    if (dayWarnings.length > 0) warnings.push(...dayWarnings);
    if (dayLogs.length > 0) logs.push(...dayLogs);

    return newDay;
  });

  const newCoherence = analyzeWeeklyCoherence(result);
  logs.push(
    `Post-rebalance coherence: ${newCoherence.uniqueProteins} proteins, ${newCoherence.uniqueCarbs} carbs, score ${newCoherence.realismScore}`
  );

  return { meals: result, warnings, logs };
}
