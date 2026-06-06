/* eslint-disable import/no-unresolved */

// Deterministic preference and variety checks for the scientific meal engine.
// Run with:
//   deno test supabase/functions/generate-user-plans/scientificMealEngine_preference_test.ts

import { assertEquals, assertGreaterOrEqual, assertMatch, assertThrows } from "https://deno.land/std@0.220.0/assert/mod.ts";
import {
  generateDailyMeals,
  type FoodWithMetadata,
  type GenerationOptions,
  type MacroTargets,
  type MealSlot,
  type UserNutritionSelections,
} from "./scientificMealEngine.ts";

function food(overrides: Partial<FoodWithMetadata>): FoodWithMetadata {
  return {
    id: overrides.id || crypto.randomUUID(),
    name: overrides.name || "Food",
    calories_per_100g: overrides.calories_per_100g ?? 100,
    protein_per_100g: overrides.protein_per_100g ?? 10,
    carbs_per_100g: overrides.carbs_per_100g ?? 10,
    fat_per_100g: overrides.fat_per_100g ?? 10,
    fiber_per_100g: overrides.fiber_per_100g ?? 0,
    category: overrides.category ?? "protein",
    breakfast_score: overrides.breakfast_score ?? 2,
    lunch_dinner_score: overrides.lunch_dinner_score ?? 2,
    preworkout_score: overrides.preworkout_score ?? 2,
    postworkout_score: overrides.postworkout_score ?? 2,
    evening_score: overrides.evening_score ?? 2,
    digestion_speed: overrides.digestion_speed ?? "moderate",
    fat_load: overrides.fat_load ?? "low",
    carb_speed: overrides.carb_speed ?? "moderate",
    protein_leanness: overrides.protein_leanness ?? "moderate",
    formality: overrides.formality ?? "neutral",
    goal_form: overrides.goal_form ?? "both",
    variety_family: overrides.variety_family ?? (overrides.name?.toLowerCase().replace(/\s+/g, "_") || "food"),
    tags: overrides.tags ?? [],
    min_grams: overrides.min_grams ?? 10,
    max_grams: overrides.max_grams ?? 500,
  };
}

const lunchSlot: MealSlot = {
  name: "Lunch",
  slot: "lunch",
  timing: "13:00",
  targetProfile: { proteinPreference: "any", carbSpeed: "any", fatAcceptable: true },
};

const tripleMealSlots: MealSlot[] = [
  lunchSlot,
  { ...lunchSlot, name: "Dinner", timing: "18:30", slot: "dinner" },
  { ...lunchSlot, name: "Evening", timing: "21:00", slot: "evening" },
];

const selection: UserNutritionSelections = {
  proteins: ["chicken", "beef"],
  carbs: ["rice", "oats"],
  fats: ["olive_oil", "avocado"],
  traditional_meals: true,
};

const options: GenerationOptions = {
  carbTolerance: "energized_satiated",
  cookingLevel: "basic",
};

const targets: MacroTargets = {
  calories: 650,
  protein_g: 35,
  carbs_g: 35,
  fat_g: 15,
};

const deterministicCatalog: FoodWithMetadata[] = [
  food({
    id: "protein-chicken",
    name: "Chicken Breast",
    category: "protein",
    variety_family: "chicken",
    tags: ["chicken", "meat"],
    calories_per_100g: 165,
    protein_per_100g: 31,
    carbs_per_100g: 0,
    fat_per_100g: 3.5,
    protein_leanness: "lean",
    lunch_dinner_score: 3,
    breakfast_score: 1,
    evening_score: 2,
    min_grams: 80,
    max_grams: 250,
  }),
  food({
    id: "protein-beef",
    name: "Lean Beef",
    category: "protein",
    variety_family: "beef",
    tags: ["beef", "meat"],
    calories_per_100g: 165,
    protein_per_100g: 31,
    carbs_per_100g: 0,
    fat_per_100g: 3.5,
    protein_leanness: "moderate",
    lunch_dinner_score: 3,
    breakfast_score: 1,
    evening_score: 2,
    min_grams: 80,
    max_grams: 250,
  }),
  food({
    id: "carb-rice",
    name: "White Rice",
    category: "carb",
    variety_family: "rice",
    tags: ["grain", "rice"],
    calories_per_100g: 130,
    protein_per_100g: 2.7,
    carbs_per_100g: 28,
    fat_per_100g: 0.2,
    carb_speed: "fast",
    lunch_dinner_score: 3,
    breakfast_score: 1,
    preworkout_score: 3,
    postworkout_score: 3,
    min_grams: 100,
    max_grams: 350,
  }),
  food({
    id: "carb-oats",
    name: "Oats",
    category: "carb",
    variety_family: "oats",
    tags: ["grain", "oats"],
    calories_per_100g: 130,
    protein_per_100g: 2.7,
    carbs_per_100g: 28,
    fat_per_100g: 0.2,
    carb_speed: "slow",
    lunch_dinner_score: 3,
    breakfast_score: 3,
    preworkout_score: 2,
    postworkout_score: 2,
    min_grams: 100,
    max_grams: 350,
  }),
  food({
    id: "fat-oil",
    name: "Olive Oil",
    category: "fat",
    variety_family: "olive_oil",
    tags: ["oil"],
    calories_per_100g: 884,
    protein_per_100g: 0,
    carbs_per_100g: 0,
    fat_per_100g: 100,
    fat_load: "high",
    lunch_dinner_score: 3,
    breakfast_score: 1,
    evening_score: 1,
    min_grams: 5,
    max_grams: 25,
  }),
  food({
    id: "fat-avocado",
    name: "Avocado",
    category: "fat",
    variety_family: "avocado",
    tags: ["fruit", "avocado"],
    calories_per_100g: 160,
    protein_per_100g: 2,
    carbs_per_100g: 8.5,
    fat_per_100g: 14.7,
    fat_load: "high",
    lunch_dinner_score: 2,
    breakfast_score: 3,
    evening_score: 1,
    min_grams: 50,
    max_grams: 180,
  }),
];

Deno.test("scientific meal engine honors ordered protein, carb, and fat preferences", () => {
  const result = generateDailyMeals(deterministicCatalog, selection, [lunchSlot], targets, "maintenance", options);

  assertEquals(result.meals.length, 1, "Expected a single meal");
  assertEquals(result.meals[0].items.protein.food.variety_family, "chicken", "Top protein preference should win");
  assertEquals(result.meals[0].items.carb.food.variety_family, "rice", "Top carb preference should win");
  assertEquals(result.meals[0].items.fat.food.variety_family, "olive_oil", "Top fat preference should win");
  assertMatch(result.meals[0].rationale, /preferred/i, "Rationale should explain the preference match");
});

Deno.test("scientific meal engine uses variety pressure when meals repeat", () => {
  const result = generateDailyMeals(deterministicCatalog, selection, tripleMealSlots, targets, "maintenance", options);

  assertGreaterOrEqual(result.meals.length, 2, "Expected multiple meals");
  const proteinFamilies = result.meals.map((meal) => meal.items.protein.food.variety_family);
  const carbFamilies = result.meals.map((meal) => meal.items.carb.food.variety_family);
  const fatFamilies = result.meals.map((meal) => meal.items.fat.food.variety_family);

  assertGreaterOrEqual(new Set(proteinFamilies).size, 2, "Protein families should vary across meals");
  assertGreaterOrEqual(new Set(carbFamilies).size, 2, "Carb families should vary across meals");
  assertGreaterOrEqual(new Set(fatFamilies).size, 2, "Fat families should vary across meals");
});

Deno.test("scientific meal engine does not reintroduce refused preferred foods through fallback", () => {
  const result = generateDailyMeals(
    [
      ...deterministicCatalog,
      food({
        id: "protein-tofu",
        name: "Tofu",
        category: "protein",
        variety_family: "tofu",
        tags: ["tofu", "soy", "vegan"],
        calories_per_100g: 90,
        protein_per_100g: 16,
        carbs_per_100g: 2,
        fat_per_100g: 5,
        lunch_dinner_score: 3,
        min_grams: 120,
        max_grams: 350,
      }),
    ],
    { ...selection, proteins: ["chicken", "tofu"] },
    [lunchSlot],
    targets,
    "maintenance",
    { ...options, refusedFoods: ["chicken"] },
  );

  assertEquals(result.meals.length, 1, "Expected a meal from the remaining allowed pool");
  assertEquals(result.meals[0].items.protein.food.variety_family, "tofu", "Refused chicken must not be used as a fallback");
});

Deno.test("scientific meal engine fails when hard restrictions remove all usable macro categories", () => {
  assertThrows(
    () => generateDailyMeals(
      deterministicCatalog,
      selection,
      [lunchSlot],
      targets,
      "maintenance",
      {
        ...options,
        allergies: ["dairy", "gluten", "eggs", "soy", "fish", "shellfish", "peanuts"],
        refusedFoods: ["chicken", "beef", "rice", "oats", "avocado", "olive oil"],
      },
    ),
    Error,
    "CRITICAL",
  );
});
