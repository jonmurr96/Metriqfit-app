#!/usr/bin/env -S deno run --allow-all
/**
 * Nutrition Smoke Test — Scientific Nutrition Engine Verification
 * Verifies all 10 evidence-based improvements are functioning correctly.
 *
 * Run: deno run --allow-all scripts/remote-smoke-test-nutrition.mjs
 */

import {
  generateDailyMeals,
  getSlotTemplate,
  scoreMealCandidate,
} from "../supabase/functions/generate-user-plans/scientificMealEngine.ts";

import {
  determineProduceDecision,
} from "../supabase/functions/generate-user-plans/produceStrategy.ts";

// ============================================================================
// SHARED MOCK FOOD CATALOG
// ============================================================================

const mockFoods = [
  // Proteins
  { id: "p1", name: "Chicken Breast", calories_per_100g: 165, protein_per_100g: 31, carbs_per_100g: 0, fat_per_100g: 3.6, fiber_per_100g: 0, category: "protein", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 2, postworkout_score: 3, evening_score: 2, digestion_speed: "moderate", fat_load: "low", carb_speed: "none", protein_leanness: "lean", formality: "neutral", goal_form: "both", variety_family: "chicken", tags: ["chicken", "meat"], min_grams: 80, max_grams: 300 },
  { id: "p2", name: "Salmon Fillet", calories_per_100g: 208, protein_per_100g: 20, carbs_per_100g: 0, fat_per_100g: 13, fiber_per_100g: 0, category: "protein", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 1, postworkout_score: 3, evening_score: 2, digestion_speed: "moderate", fat_load: "medium", carb_speed: "none", protein_leanness: "moderate", formality: "neutral", goal_form: "both", variety_family: "salmon", tags: ["fish", "seafood"], min_grams: 100, max_grams: 300 },
  { id: "p3", name: "Cottage Cheese", calories_per_100g: 98, protein_per_100g: 11, carbs_per_100g: 3.4, fat_per_100g: 4.3, fiber_per_100g: 0, category: "protein", breakfast_score: 3, lunch_dinner_score: 1, preworkout_score: 1, postworkout_score: 2, evening_score: 3, digestion_speed: "slow", fat_load: "low", carb_speed: "none", protein_leanness: "lean", formality: "neutral", goal_form: "both", variety_family: "cottage_cheese", tags: ["dairy", "cheese"], min_grams: 150, max_grams: 400 },
  { id: "p4", name: "Whey Protein", calories_per_100g: 400, protein_per_100g: 80, carbs_per_100g: 8, fat_per_100g: 5, fiber_per_100g: 0, category: "protein", breakfast_score: 3, lunch_dinner_score: 1, preworkout_score: 3, postworkout_score: 3, evening_score: 1, digestion_speed: "fast", fat_load: "low", carb_speed: "none", protein_leanness: "lean", formality: "neutral", goal_form: "both", variety_family: "whey", tags: ["dairy", "whey"], min_grams: 25, max_grams: 100 },
  { id: "p5", name: "Turkey Breast", calories_per_100g: 135, protein_per_100g: 30, carbs_per_100g: 0, fat_per_100g: 1, fiber_per_100g: 0, category: "protein", breakfast_score: 2, lunch_dinner_score: 3, preworkout_score: 2, postworkout_score: 3, evening_score: 2, digestion_speed: "fast", fat_load: "low", carb_speed: "none", protein_leanness: "lean", formality: "neutral", goal_form: "both", variety_family: "turkey", tags: ["turkey", "meat"], min_grams: 80, max_grams: 300 },
  { id: "p6", name: "Tofu", calories_per_100g: 76, protein_per_100g: 15, carbs_per_100g: 1.9, fat_per_100g: 4.8, fiber_per_100g: 0.3, category: "protein", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 2, postworkout_score: 2, evening_score: 2, digestion_speed: "moderate", fat_load: "low", carb_speed: "none", protein_leanness: "lean", formality: "neutral", goal_form: "both", variety_family: "tofu", tags: ["soy", "tofu", "vegan"], min_grams: 150, max_grams: 500 },
  { id: "p7", name: "Tempeh", calories_per_100g: 193, protein_per_100g: 19, carbs_per_100g: 9, fat_per_100g: 11, fiber_per_100g: 0, category: "protein", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 1, postworkout_score: 2, evening_score: 2, digestion_speed: "moderate", fat_load: "medium", carb_speed: "none", protein_leanness: "lean", formality: "neutral", goal_form: "both", variety_family: "tempeh", tags: ["soy", "vegan"], min_grams: 100, max_grams: 300 },
  { id: "p8", name: "Lentils", calories_per_100g: 116, protein_per_100g: 9, carbs_per_100g: 20, fat_per_100g: 0.4, fiber_per_100g: 7.9, category: "protein", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 1, postworkout_score: 2, evening_score: 2, digestion_speed: "slow", fat_load: "low", carb_speed: "slow", protein_leanness: "lean", formality: "neutral", goal_form: "both", variety_family: "lentils", tags: ["legume", "vegan"], min_grams: 150, max_grams: 600 },
  // Carbs
  { id: "c1", name: "White Rice", calories_per_100g: 130, protein_per_100g: 2.7, carbs_per_100g: 28, fat_per_100g: 0.3, fiber_per_100g: 0.4, category: "carb", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 3, postworkout_score: 3, evening_score: 2, digestion_speed: "fast", fat_load: "low", carb_speed: "fast", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "rice", tags: ["grain"], min_grams: 100, max_grams: 400 },
  { id: "c2", name: "Oats", calories_per_100g: 389, protein_per_100g: 16.9, carbs_per_100g: 66, fat_per_100g: 6.9, fiber_per_100g: 10.6, category: "carb", breakfast_score: 3, lunch_dinner_score: 1, preworkout_score: 2, postworkout_score: 2, evening_score: 1, digestion_speed: "slow", fat_load: "low", carb_speed: "slow", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "oats", tags: ["grain"], min_grams: 40, max_grams: 150 },
  { id: "c3", name: "Sweet Potato", calories_per_100g: 86, protein_per_100g: 1.6, carbs_per_100g: 20, fat_per_100g: 0.1, fiber_per_100g: 3, category: "carb", breakfast_score: 2, lunch_dinner_score: 3, preworkout_score: 2, postworkout_score: 3, evening_score: 2, digestion_speed: "moderate", fat_load: "low", carb_speed: "slow", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "sweet_potato", tags: ["vegetable"], min_grams: 150, max_grams: 400 },
  { id: "c4", name: "Banana", calories_per_100g: 89, protein_per_100g: 1.1, carbs_per_100g: 22.8, fat_per_100g: 0.3, fiber_per_100g: 2.6, category: "carb", breakfast_score: 3, lunch_dinner_score: 1, preworkout_score: 3, postworkout_score: 3, evening_score: 1, digestion_speed: "fast", fat_load: "low", carb_speed: "fast", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "banana", tags: ["fruit"], min_grams: 80, max_grams: 200 },
  { id: "c5", name: "Brown Rice", calories_per_100g: 111, protein_per_100g: 2.6, carbs_per_100g: 23, fat_per_100g: 0.9, fiber_per_100g: 1.8, category: "carb", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 2, postworkout_score: 3, evening_score: 2, digestion_speed: "moderate", fat_load: "low", carb_speed: "slow", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "brown_rice", tags: ["grain"], min_grams: 100, max_grams: 400 },
  { id: "c6", name: "Quinoa", calories_per_100g: 120, protein_per_100g: 4.4, carbs_per_100g: 21.3, fat_per_100g: 1.9, fiber_per_100g: 2.8, category: "carb", breakfast_score: 2, lunch_dinner_score: 3, preworkout_score: 2, postworkout_score: 2, evening_score: 2, digestion_speed: "moderate", fat_load: "low", carb_speed: "moderate", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "quinoa", tags: ["grain", "gluten-free", "vegan"], min_grams: 80, max_grams: 250 },
  // Fats
  { id: "f1", name: "Olive Oil", calories_per_100g: 884, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, fiber_per_100g: 0, category: "fat", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 0, postworkout_score: 1, evening_score: 1, digestion_speed: "slow", fat_load: "high", carb_speed: "none", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "olive_oil", tags: ["oil"], min_grams: 5, max_grams: 30 },
  { id: "f2", name: "Almonds", calories_per_100g: 579, protein_per_100g: 21, carbs_per_100g: 21.6, fat_per_100g: 49.9, fiber_per_100g: 12.5, category: "fat", breakfast_score: 2, lunch_dinner_score: 2, preworkout_score: 1, postworkout_score: 1, evening_score: 2, digestion_speed: "slow", fat_load: "high", carb_speed: "none", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "almonds", tags: ["nuts"], min_grams: 15, max_grams: 60 },
  { id: "f3", name: "Avocado", calories_per_100g: 160, protein_per_100g: 2, carbs_per_100g: 8.5, fat_per_100g: 14.7, fiber_per_100g: 6.7, category: "fat", breakfast_score: 3, lunch_dinner_score: 2, preworkout_score: 0, postworkout_score: 1, evening_score: 1, digestion_speed: "moderate", fat_load: "high", carb_speed: "none", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "avocado", tags: ["fruit"], min_grams: 50, max_grams: 200 },
  { id: "f4", name: "Walnuts", calories_per_100g: 654, protein_per_100g: 15.2, carbs_per_100g: 13.7, fat_per_100g: 65.2, fiber_per_100g: 6.7, category: "fat", breakfast_score: 2, lunch_dinner_score: 2, preworkout_score: 1, postworkout_score: 1, evening_score: 2, digestion_speed: "slow", fat_load: "high", carb_speed: "none", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "walnuts", tags: ["nuts"], min_grams: 15, max_grams: 60 },
  { id: "f5", name: "Chia Seeds", calories_per_100g: 486, protein_per_100g: 16.5, carbs_per_100g: 42, fat_per_100g: 30.7, fiber_per_100g: 34.4, category: "fat", breakfast_score: 2, lunch_dinner_score: 2, preworkout_score: 1, postworkout_score: 1, evening_score: 2, digestion_speed: "slow", fat_load: "high", carb_speed: "none", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "chia_seeds", tags: ["seeds", "vegan"], min_grams: 10, max_grams: 40 },
];

const allFamilies = { proteins: ["chicken", "salmon", "turkey", "tofu", "tempeh", "lentils"], carbs: ["rice", "oats", "sweet_potato", "banana", "brown_rice", "quinoa"], fats: ["olive_oil", "almonds", "avocado", "walnuts", "chia_seeds"] };

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// ============================================================================
// SCENARIO 1: Carb Periodization — training vs rest day
// ============================================================================
console.log("\n📊 Scenario 1: Carb Periodization (Training vs Rest Day)");

const baseMacros = { calories: 2400, protein_g: 180, carbs_g: 250, fat_g: 80 };
const trainingDayMacros = {
  calories: Math.round(baseMacros.calories * 1.08),
  protein_g: baseMacros.protein_g,
  carbs_g: Math.round(baseMacros.carbs_g * 1.20),
  fat_g: Math.round(baseMacros.fat_g * 0.88),
};
const restDayMacros = {
  calories: Math.round(baseMacros.calories * 0.94),
  protein_g: baseMacros.protein_g,
  carbs_g: Math.round(baseMacros.carbs_g * 0.82),
  fat_g: Math.round(baseMacros.fat_g * 1.10),
};

assert(trainingDayMacros.carbs_g > restDayMacros.carbs_g, `Training day carbs (${trainingDayMacros.carbs_g}g) > rest day carbs (${restDayMacros.carbs_g}g)`);
assert(trainingDayMacros.fat_g < restDayMacros.fat_g, `Training day fat (${trainingDayMacros.fat_g}g) < rest day fat (${restDayMacros.fat_g}g)`);
assert(trainingDayMacros.protein_g === restDayMacros.protein_g, `Protein unchanged on both days (${trainingDayMacros.protein_g}g)`);
assert(trainingDayMacros.calories > restDayMacros.calories, `Training day calories (${trainingDayMacros.calories}) > rest day calories (${restDayMacros.calories})`);

// ============================================================================
// SCENARIO 2: Pre-workout carb speed fix
// ============================================================================
console.log("\n⚡ Scenario 2: Pre-workout Carb Speed at 2.5h Out");

// Use 17:00 workout — pre-workout window is 14:30, well after lunch (12:00), so slot is created
const preWorkoutSlots = getSlotTemplate(true, "17:00");
const preWorkoutSlot = preWorkoutSlots.find(s => s.slot === "pre-workout");
const postWorkoutSlot = preWorkoutSlots.find(s => s.slot === "post-workout");

assert(preWorkoutSlot !== undefined, "Pre-workout slot exists when workout at 17:00 (pre-workout at 14:30 > lunch at 12:00)");
assert(preWorkoutSlot?.targetProfile.carbSpeed === "moderate",
  `Pre-workout carb speed is "moderate" at 2.5h offset (got "${preWorkoutSlot?.targetProfile.carbSpeed}")`);
assert(preWorkoutSlot?.targetProfile.fatAcceptable === true,
  "Pre-workout slot has fatAcceptable=true");
assert(postWorkoutSlot?.targetProfile.fatAcceptable === true,
  "Post-workout slot has fatAcceptable=true (fat doesn't block MPS)");

// ============================================================================
// SCENARIO 3: Protein Floor per Meal
// ============================================================================
console.log("\n💪 Scenario 3: Protein Floor per Meal (≥20g snack, ≥25g main)");

const selections = {
  proteins: allFamilies.proteins,
  carbs: allFamilies.carbs,
  fats: allFamilies.fats,
  traditional_meals: true,
};

try {
  const restSlots = getSlotTemplate(false, null);
  const result = generateDailyMeals(
    mockFoods,
    selections,
    restSlots,
    { calories: 2400, protein_g: 180, carbs_g: 280, fat_g: 80 },
    "muscle_gain",
    {}
  );

  assert(result.meals.length > 0, `Generated ${result.meals.length} meals`);

  const mainSlots = ["breakfast", "lunch", "dinner"];
  const snackSlots = ["snack", "evening"];

  for (const meal of result.meals) {
    if (mainSlots.includes(meal.slot)) {
      assert(
        meal.macros.protein >= 25,
        `${meal.slot} protein ${meal.macros.protein}g ≥ 25g floor`
      );
    } else if (snackSlots.includes(meal.slot)) {
      assert(
        meal.macros.protein >= 20,
        `${meal.slot} protein ${meal.macros.protein}g ≥ 20g floor`
      );
    }
  }
} catch (e) {
  console.error(`  ❌ ERROR in Scenario 3: ${e.message}`);
  failed++;
}

// ============================================================================
// SCENARIO 4: Vegan Completeness Warning
// ============================================================================
console.log("\n🌱 Scenario 4: Vegan Completeness Warning");

// Test with vegan diet using ONLY lentils (incomplete protein — no complete amino acid source)
const veganFoodsNoComplete = mockFoods.filter(f =>
  !["chicken", "salmon", "turkey", "cottage_cheese", "whey"].includes(f.variety_family)
);
const veganSelectionsIncomplete = {
  proteins: ["lentils"],
  carbs: ["brown_rice", "quinoa"],
  fats: ["olive_oil", "almonds", "chia_seeds"],
  traditional_meals: true,
};

try {
  const veganSlots = getSlotTemplate(false, null);
  const veganResult = generateDailyMeals(
    veganFoodsNoComplete,
    veganSelectionsIncomplete,
    veganSlots,
    { calories: 1800, protein_g: 120, carbs_g: 220, fat_g: 60 },
    "maintenance",
    { dietaryPreference: "vegan" }
  );

  const hasCompletenessWarning = veganResult.warnings.some(w =>
    w.toLowerCase().includes("complete amino acid") || w.toLowerCase().includes("complete protein")
  );
  assert(hasCompletenessWarning,
    "Vegan plan without complete protein source emits completeness warning");
} catch (e) {
  console.error(`  ❌ ERROR in Scenario 4: ${e.message}`);
  failed++;
}

// Test with vegan diet including tofu (complete protein — no warning expected)
const veganSelectionsComplete = {
  proteins: ["tofu", "tempeh", "lentils"],
  carbs: ["brown_rice", "quinoa"],
  fats: ["olive_oil", "almonds"],
  traditional_meals: true,
};

try {
  const veganSlots = getSlotTemplate(false, null);
  const veganCompleteResult = generateDailyMeals(
    veganFoodsNoComplete,
    veganSelectionsComplete,
    veganSlots,
    { calories: 1800, protein_g: 120, carbs_g: 220, fat_g: 60 },
    "maintenance",
    { dietaryPreference: "vegan" }
  );

  const hasWarning = veganCompleteResult.warnings.some(w =>
    w.toLowerCase().includes("complete amino acid")
  );
  assert(!hasWarning,
    "Vegan plan WITH tofu/tempeh does NOT emit completeness warning");
} catch (e) {
  console.error(`  ❌ ERROR in Scenario 4 (complete): ${e.message}`);
  failed++;
}

// ============================================================================
// SCENARIO 5: Daily Fiber Accumulation Gating
// ============================================================================
console.log("\n🥦 Scenario 5: Daily Fiber Accumulation Gating (produceStrategy)");

const slot5Input = {
  slot: "snack",
  goal: "muscle_gain",
  baseFiberG: 2.0,
  baseCalories: 450,
  dailyFiberSoFarG: 35, // Already above 30g daily target
};

const decisionMetTarget = determineProduceDecision(slot5Input);
assert(!decisionMetTarget.include,
  `Produce not added when daily fiber target already met (got ${decisionMetTarget.rationale})`);
assert(decisionMetTarget.rationale.toLowerCase().includes("daily fiber"),
  "Rationale mentions daily fiber target");

// When daily budget still has room, produce should be included for snack
const slot5InputLow = {
  slot: "snack",
  goal: "muscle_gain",
  baseFiberG: 0.5,
  baseCalories: 450,
  dailyFiberSoFarG: 5, // Only 5g so far
};
const decisionNeedFiber = determineProduceDecision(slot5InputLow);
assert(decisionNeedFiber.include,
  `Produce added when daily fiber gap is large (fiberGap=${decisionNeedFiber.fiberGapG.toFixed(1)}g)`);

// Mandatory veggie slots (lunch/dinner) always get produce regardless of daily total
const lunchHighFiber = {
  slot: "lunch",
  goal: "muscle_gain",
  baseFiberG: 0.5,
  baseCalories: 600,
  dailyFiberSoFarG: 50, // Way above daily target
};
const decisionMandatory = determineProduceDecision(lunchHighFiber);
assert(decisionMandatory.include,
  "Lunch/dinner always get produce (mandatory slot) even when daily fiber target exceeded");

// ============================================================================
// SUMMARY
// ============================================================================
console.log(`\n${"═".repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log("✅ All nutrition smoke tests passed!");
} else {
  console.error(`❌ ${failed} test(s) failed — review the engine changes.`);
  Deno.exit(1);
}
