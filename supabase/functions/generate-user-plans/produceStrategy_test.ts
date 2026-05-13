/* eslint-disable import/no-unresolved */

import { assertEquals, assertExists } from "https://deno.land/std@0.220.0/assert/mod.ts";
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

const breakfastSlot: MealSlot = {
  name: "Breakfast",
  slot: "breakfast",
  timing: "07:30",
  targetProfile: { proteinPreference: "any", carbSpeed: "moderate", fatAcceptable: true },
};

const lunchSlot: MealSlot = {
  name: "Lunch",
  slot: "lunch",
  timing: "12:30",
  targetProfile: { proteinPreference: "any", carbSpeed: "any", fatAcceptable: true },
};

const selection: UserNutritionSelections = {
  proteins: ["chicken"],
  carbs: ["oats", "rice"],
  fats: ["avocado", "olive_oil"],
  traditional_meals: true,
};

const lowFiberSelection: UserNutritionSelections = {
  proteins: ["chicken"],
  carbs: ["rice"],
  fats: ["olive_oil"],
  traditional_meals: true,
};

const options: GenerationOptions = {
  carbTolerance: "energized_satiated",
  cookingLevel: "basic",
};

const targets: MacroTargets = {
  calories: 700,
  protein_g: 35,
  carbs_g: 45,
  fat_g: 20,
};

const catalog: FoodWithMetadata[] = [
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
    min_grams: 80,
    max_grams: 250,
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
    fiber_per_100g: 10.6,
    carb_speed: "slow",
    breakfast_score: 3,
    lunch_dinner_score: 2,
    min_grams: 90,
    max_grams: 350,
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
    fiber_per_100g: 0.4,
    carb_speed: "fast",
    lunch_dinner_score: 3,
    breakfast_score: 1,
    min_grams: 100,
    max_grams: 350,
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
    fiber_per_100g: 6.7,
    fat_load: "high",
    breakfast_score: 3,
    lunch_dinner_score: 3,
    min_grams: 50,
    max_grams: 160,
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
    fiber_per_100g: 0,
    fat_load: "high",
    lunch_dinner_score: 3,
    breakfast_score: 1,
    min_grams: 5,
    max_grams: 25,
  }),
  food({
    id: "fruit-banana",
    name: "Banana",
    category: "fruit",
    variety_family: "banana",
    tags: ["fruit"],
    calories_per_100g: 89,
    protein_per_100g: 1.1,
    carbs_per_100g: 22.8,
    fat_per_100g: 0.3,
    fiber_per_100g: 2.6,
    breakfast_score: 3,
    postworkout_score: 3,
    lunch_dinner_score: 1,
    min_grams: 100,
    max_grams: 200,
  }),
  food({
    id: "veg-broccoli",
    name: "Broccoli",
    category: "vegetable",
    variety_family: "broccoli",
    tags: ["vegetable"],
    calories_per_100g: 34,
    protein_per_100g: 2.8,
    carbs_per_100g: 6.6,
    fat_per_100g: 0.4,
    fiber_per_100g: 2.6,
    breakfast_score: 0,
    lunch_dinner_score: 3,
    min_grams: 80,
    max_grams: 220,
  }),
];

Deno.test("fiber-rich breakfast should not force a produce side", () => {
  const result = generateDailyMeals(catalog, selection, [breakfastSlot], targets, "maintenance", options);
  assertEquals(result.meals.length, 1);
  assertEquals(result.meals[0].items.produce, undefined);
});

Deno.test("lunch should still get produce when it helps round out the meal", () => {
  const result = generateDailyMeals(catalog, lowFiberSelection, [lunchSlot], targets, "maintenance", options);
  assertEquals(result.meals.length, 1);
  assertExists(result.meals[0].items.produce);
});
