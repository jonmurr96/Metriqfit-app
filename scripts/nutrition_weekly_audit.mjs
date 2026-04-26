#!/usr/bin/env -S deno run --allow-all
/**
 * Nutrition Weekly Audit Harness
 * Generates 7-day meal plans for 10 personas and outputs a human-readable
 * markdown report for realism review.
 *
 * Run: deno run --allow-all scripts/nutrition_weekly_audit.mjs
 */

import {
  generateDailyMeals,
  analyzeWeeklyCoherence,
  rebalanceWeeklyMeals,
} from "../supabase/functions/generate-user-plans/scientificMealEngine.ts";

// ============================================================================
// MOCK DATA (mirrors persona_matrix_test.ts, expanded slightly)
// ============================================================================

const baseFoods = [
  // Proteins
  { id: "p1", name: "Chicken Breast", calories_per_100g: 165, protein_per_100g: 31, carbs_per_100g: 0, fat_per_100g: 3.6, fiber_per_100g: 0, category: "protein", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 2, postworkout_score: 3, evening_score: 2, digestion_speed: "moderate", fat_load: "low", carb_speed: "none", protein_leanness: "lean", formality: "neutral", goal_form: "both", variety_family: "chicken", tags: ["chicken", "meat"], min_grams: 80, max_grams: 300 },
  { id: "p2", name: "Salmon Fillet", calories_per_100g: 208, protein_per_100g: 20, carbs_per_100g: 0, fat_per_100g: 13, fiber_per_100g: 0, category: "protein", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 1, postworkout_score: 3, evening_score: 2, digestion_speed: "moderate", fat_load: "medium", carb_speed: "none", protein_leanness: "moderate", formality: "neutral", goal_form: "both", variety_family: "salmon", tags: ["fish", "salmon", "seafood"], min_grams: 100, max_grams: 300 },
  { id: "p3", name: "Eggs", calories_per_100g: 155, protein_per_100g: 13, carbs_per_100g: 1.1, fat_per_100g: 11, fiber_per_100g: 0, category: "protein", breakfast_score: 3, lunch_dinner_score: 2, preworkout_score: 1, postworkout_score: 2, evening_score: 1, digestion_speed: "moderate", fat_load: "medium", carb_speed: "none", protein_leanness: "moderate", formality: "neutral", goal_form: "both", variety_family: "eggs", tags: ["egg"], min_grams: 100, max_grams: 300 },
  { id: "p4", name: "Tofu", calories_per_100g: 76, protein_per_100g: 15, carbs_per_100g: 1.9, fat_per_100g: 4.8, fiber_per_100g: 0.3, category: "protein", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 2, postworkout_score: 2, evening_score: 2, digestion_speed: "moderate", fat_load: "low", carb_speed: "none", protein_leanness: "lean", formality: "neutral", goal_form: "both", variety_family: "tofu", tags: ["soy", "tofu", "vegan"], min_grams: 150, max_grams: 500 },
  { id: "p5", name: "Whey Protein Powder", calories_per_100g: 400, protein_per_100g: 80, carbs_per_100g: 8, fat_per_100g: 5, fiber_per_100g: 0, category: "protein", breakfast_score: 3, lunch_dinner_score: 1, preworkout_score: 3, postworkout_score: 3, evening_score: 1, digestion_speed: "fast", fat_load: "low", carb_speed: "none", protein_leanness: "lean", formality: "neutral", goal_form: "both", variety_family: "whey", tags: ["dairy", "whey"], min_grams: 25, max_grams: 100 },
  { id: "p6", name: "Beef Steak", calories_per_100g: 250, protein_per_100g: 26, carbs_per_100g: 0, fat_per_100g: 17, fiber_per_100g: 0, category: "protein", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 1, postworkout_score: 3, evening_score: 2, digestion_speed: "slow", fat_load: "high", carb_speed: "none", protein_leanness: "moderate", formality: "neutral", goal_form: "bulk_default", variety_family: "beef", tags: ["beef", "meat"], min_grams: 100, max_grams: 300 },
  { id: "p7", name: "Shrimp", calories_per_100g: 99, protein_per_100g: 24, carbs_per_100g: 0, fat_per_100g: 0.3, fiber_per_100g: 0, category: "protein", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 2, postworkout_score: 3, evening_score: 2, digestion_speed: "fast", fat_load: "low", carb_speed: "none", protein_leanness: "lean", formality: "neutral", goal_form: "both", variety_family: "shrimp", tags: ["shellfish", "shrimp", "seafood"], min_grams: 100, max_grams: 300 },
  { id: "p8", name: "Lentils", calories_per_100g: 116, protein_per_100g: 9, carbs_per_100g: 20, fat_per_100g: 0.4, fiber_per_100g: 7.9, category: "protein", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 1, postworkout_score: 2, evening_score: 2, digestion_speed: "slow", fat_load: "low", carb_speed: "slow", protein_leanness: "lean", formality: "neutral", goal_form: "both", variety_family: "lentils", tags: ["legume", "vegan"], min_grams: 150, max_grams: 600 },
  { id: "p9", name: "Turkey Breast", calories_per_100g: 135, protein_per_100g: 30, carbs_per_100g: 0, fat_per_100g: 1, fiber_per_100g: 0, category: "protein", breakfast_score: 2, lunch_dinner_score: 3, preworkout_score: 2, postworkout_score: 3, evening_score: 2, digestion_speed: "fast", fat_load: "low", carb_speed: "none", protein_leanness: "lean", formality: "neutral", goal_form: "both", variety_family: "turkey", tags: ["turkey", "meat"], min_grams: 80, max_grams: 300 },
  { id: "p10", name: "Greek Yogurt", calories_per_100g: 97, protein_per_100g: 10, carbs_per_100g: 3.6, fat_per_100g: 5, fiber_per_100g: 0, category: "protein", breakfast_score: 3, lunch_dinner_score: 1, preworkout_score: 1, postworkout_score: 2, evening_score: 1, digestion_speed: "moderate", fat_load: "low", carb_speed: "none", protein_leanness: "lean", formality: "neutral", goal_form: "both", variety_family: "greek_yogurt", tags: ["dairy", "yogurt"], min_grams: 150, max_grams: 400 },
  { id: "p11", name: "Cod Fillet", calories_per_100g: 82, protein_per_100g: 18, carbs_per_100g: 0, fat_per_100g: 0.7, fiber_per_100g: 0, category: "protein", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 2, postworkout_score: 3, evening_score: 2, digestion_speed: "fast", fat_load: "low", carb_speed: "none", protein_leanness: "lean", formality: "neutral", goal_form: "both", variety_family: "cod", tags: ["fish", "seafood"], min_grams: 100, max_grams: 300 },
  { id: "p12", name: "Pork Loin", calories_per_100g: 143, protein_per_100g: 27, carbs_per_100g: 0, fat_per_100g: 3.5, fiber_per_100g: 0, category: "protein", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 1, postworkout_score: 3, evening_score: 2, digestion_speed: "moderate", fat_load: "low", carb_speed: "none", protein_leanness: "lean", formality: "neutral", goal_form: "both", variety_family: "pork", tags: ["pork", "meat"], min_grams: 100, max_grams: 300 },
  { id: "p13", name: "Cottage Cheese", calories_per_100g: 98, protein_per_100g: 11, carbs_per_100g: 3.4, fat_per_100g: 4.3, fiber_per_100g: 0, category: "protein", breakfast_score: 3, lunch_dinner_score: 1, preworkout_score: 1, postworkout_score: 2, evening_score: 1, digestion_speed: "moderate", fat_load: "low", carb_speed: "none", protein_leanness: "lean", formality: "neutral", goal_form: "both", variety_family: "cottage_cheese", tags: ["dairy", "cheese"], min_grams: 150, max_grams: 400 },
  { id: "p14", name: "Black Beans", calories_per_100g: 132, protein_per_100g: 8.9, carbs_per_100g: 24, fat_per_100g: 0.5, fiber_per_100g: 8.7, category: "protein", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 1, postworkout_score: 2, evening_score: 2, digestion_speed: "slow", fat_load: "low", carb_speed: "slow", protein_leanness: "lean", formality: "neutral", goal_form: "both", variety_family: "black_beans", tags: ["legume", "vegan"], min_grams: 150, max_grams: 500 },
  { id: "p15", name: "Tempeh", calories_per_100g: 193, protein_per_100g: 19, carbs_per_100g: 9, fat_per_100g: 11, fiber_per_100g: 0, category: "protein", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 1, postworkout_score: 2, evening_score: 2, digestion_speed: "moderate", fat_load: "medium", carb_speed: "none", protein_leanness: "lean", formality: "neutral", goal_form: "both", variety_family: "tempeh", tags: ["soy", "vegan"], min_grams: 100, max_grams: 300 },
  { id: "p16", name: "Chicken Thigh", calories_per_100g: 177, protein_per_100g: 24, carbs_per_100g: 0, fat_per_100g: 8, fiber_per_100g: 0, category: "protein", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 1, postworkout_score: 3, evening_score: 2, digestion_speed: "moderate", fat_load: "medium", carb_speed: "none", protein_leanness: "moderate", formality: "neutral", goal_form: "both", variety_family: "chicken_thigh", tags: ["chicken", "meat"], min_grams: 100, max_grams: 300 },
  { id: "p17", name: "Tuna Steak", calories_per_100g: 132, protein_per_100g: 28, carbs_per_100g: 0, fat_per_100g: 1, fiber_per_100g: 0, category: "protein", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 2, postworkout_score: 3, evening_score: 2, digestion_speed: "fast", fat_load: "low", carb_speed: "none", protein_leanness: "lean", formality: "neutral", goal_form: "both", variety_family: "tuna", tags: ["fish", "seafood"], min_grams: 100, max_grams: 300 },
  { id: "p18", name: "Ground Turkey", calories_per_100g: 149, protein_per_100g: 20, carbs_per_100g: 0, fat_per_100g: 7, fiber_per_100g: 0, category: "protein", breakfast_score: 2, lunch_dinner_score: 3, preworkout_score: 1, postworkout_score: 3, evening_score: 2, digestion_speed: "moderate", fat_load: "medium", carb_speed: "none", protein_leanness: "moderate", formality: "neutral", goal_form: "both", variety_family: "ground_turkey", tags: ["turkey", "meat"], min_grams: 100, max_grams: 300 },
  { id: "p19", name: "Edamame", calories_per_100g: 121, protein_per_100g: 12, carbs_per_100g: 9, fat_per_100g: 5, fiber_per_100g: 5.2, category: "protein", breakfast_score: 1, lunch_dinner_score: 2, preworkout_score: 1, postworkout_score: 2, evening_score: 1, digestion_speed: "moderate", fat_load: "low", carb_speed: "none", protein_leanness: "lean", formality: "neutral", goal_form: "both", variety_family: "edamame", tags: ["soy", "vegan"], min_grams: 150, max_grams: 400 },
  // Carbs
  { id: "c1", name: "White Rice", calories_per_100g: 130, protein_per_100g: 2.7, carbs_per_100g: 28, fat_per_100g: 0.3, fiber_per_100g: 0.4, category: "carb", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 3, postworkout_score: 3, evening_score: 2, digestion_speed: "fast", fat_load: "low", carb_speed: "fast", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "rice", tags: ["grain", "rice"], min_grams: 100, max_grams: 400 },
  { id: "c2", name: "Oats", calories_per_100g: 389, protein_per_100g: 16.9, carbs_per_100g: 66, fat_per_100g: 6.9, fiber_per_100g: 10.6, category: "carb", breakfast_score: 3, lunch_dinner_score: 1, preworkout_score: 2, postworkout_score: 2, evening_score: 1, digestion_speed: "slow", fat_load: "low", carb_speed: "slow", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "oats", tags: ["grain", "wheat", "gluten"], min_grams: 40, max_grams: 150 },
  { id: "c3", name: "Sweet Potato", calories_per_100g: 86, protein_per_100g: 1.6, carbs_per_100g: 20, fat_per_100g: 0.1, fiber_per_100g: 3, category: "carb", breakfast_score: 2, lunch_dinner_score: 3, preworkout_score: 2, postworkout_score: 3, evening_score: 2, digestion_speed: "moderate", fat_load: "low", carb_speed: "slow", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "sweet_potato", tags: ["vegetable", "low-carb"], min_grams: 150, max_grams: 400 },
  { id: "c4", name: "Banana", calories_per_100g: 89, protein_per_100g: 1.1, carbs_per_100g: 22.8, fat_per_100g: 0.3, fiber_per_100g: 2.6, category: "carb", breakfast_score: 3, lunch_dinner_score: 1, preworkout_score: 3, postworkout_score: 3, evening_score: 1, digestion_speed: "fast", fat_load: "low", carb_speed: "fast", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "banana", tags: ["fruit"], min_grams: 80, max_grams: 200 },
  { id: "c5", name: "Pasta", calories_per_100g: 131, protein_per_100g: 5, carbs_per_100g: 25, fat_per_100g: 1.1, fiber_per_100g: 1.8, category: "carb", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 2, postworkout_score: 3, evening_score: 2, digestion_speed: "moderate", fat_load: "low", carb_speed: "moderate", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "pasta", tags: ["wheat", "gluten", "grain"], min_grams: 100, max_grams: 350 },
  { id: "c6", name: "Quinoa", calories_per_100g: 120, protein_per_100g: 4.4, carbs_per_100g: 21.3, fat_per_100g: 1.9, fiber_per_100g: 2.8, category: "carb", breakfast_score: 2, lunch_dinner_score: 3, preworkout_score: 2, postworkout_score: 2, evening_score: 2, digestion_speed: "moderate", fat_load: "low", carb_speed: "moderate", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "quinoa", tags: ["grain", "gluten-free"], min_grams: 80, max_grams: 250 },
  { id: "c7", name: "Potato", calories_per_100g: 77, protein_per_100g: 2, carbs_per_100g: 17, fat_per_100g: 0.1, fiber_per_100g: 2.2, category: "carb", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 2, postworkout_score: 3, evening_score: 2, digestion_speed: "moderate", fat_load: "low", carb_speed: "moderate", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "potato", tags: ["vegetable"], min_grams: 150, max_grams: 400 },
  { id: "c8", name: "Whole Wheat Bread", calories_per_100g: 247, protein_per_100g: 13, carbs_per_100g: 41, fat_per_100g: 3.4, fiber_per_100g: 7, category: "carb", breakfast_score: 3, lunch_dinner_score: 2, preworkout_score: 2, postworkout_score: 2, evening_score: 1, digestion_speed: "moderate", fat_load: "low", carb_speed: "moderate", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "bread", tags: ["wheat", "gluten", "grain"], min_grams: 60, max_grams: 150 },
  { id: "c9", name: "Brown Rice", calories_per_100g: 111, protein_per_100g: 2.6, carbs_per_100g: 23, fat_per_100g: 0.9, fiber_per_100g: 1.8, category: "carb", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 2, postworkout_score: 3, evening_score: 2, digestion_speed: "moderate", fat_load: "low", carb_speed: "slow", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "brown_rice", tags: ["grain", "rice"], min_grams: 100, max_grams: 400 },
  { id: "c10", name: "Couscous", calories_per_100g: 112, protein_per_100g: 3.8, carbs_per_100g: 23, fat_per_100g: 0.2, fiber_per_100g: 1.4, category: "carb", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 2, postworkout_score: 2, evening_score: 2, digestion_speed: "fast", fat_load: "low", carb_speed: "fast", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "couscous", tags: ["grain", "wheat"], min_grams: 80, max_grams: 300 },
  { id: "c11", name: "Butternut Squash", calories_per_100g: 45, protein_per_100g: 1, carbs_per_100g: 12, fat_per_100g: 0.1, fiber_per_100g: 2, category: "carb", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 1, postworkout_score: 2, evening_score: 2, digestion_speed: "moderate", fat_load: "low", carb_speed: "slow", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "butternut_squash", tags: ["vegetable"], min_grams: 200, max_grams: 500 },
  { id: "c12", name: "Apple", calories_per_100g: 52, protein_per_100g: 0.3, carbs_per_100g: 14, fat_per_100g: 0.2, fiber_per_100g: 2.4, category: "carb", breakfast_score: 3, lunch_dinner_score: 1, preworkout_score: 2, postworkout_score: 1, evening_score: 1, digestion_speed: "fast", fat_load: "low", carb_speed: "fast", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "apple", tags: ["fruit"], min_grams: 150, max_grams: 300 },
  { id: "c13", name: "Granola", calories_per_100g: 471, protein_per_100g: 10, carbs_per_100g: 64, fat_per_100g: 20, fiber_per_100g: 7, category: "carb", breakfast_score: 3, lunch_dinner_score: 1, preworkout_score: 2, postworkout_score: 2, evening_score: 1, digestion_speed: "moderate", fat_load: "medium", carb_speed: "moderate", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "granola", tags: ["grain", "wheat"], min_grams: 40, max_grams: 120 },
  { id: "c14", name: "Corn Tortillas", calories_per_100g: 218, protein_per_100g: 5.7, carbs_per_100g: 45, fat_per_100g: 2.8, fiber_per_100g: 4.5, category: "carb", breakfast_score: 2, lunch_dinner_score: 3, preworkout_score: 2, postworkout_score: 2, evening_score: 2, digestion_speed: "moderate", fat_load: "low", carb_speed: "moderate", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "corn_tortillas", tags: ["grain", "gluten-free"], min_grams: 80, max_grams: 250 },
  { id: "c15", name: "Mango", calories_per_100g: 60, protein_per_100g: 0.8, carbs_per_100g: 15, fat_per_100g: 0.4, fiber_per_100g: 1.6, category: "carb", breakfast_score: 3, lunch_dinner_score: 1, preworkout_score: 2, postworkout_score: 1, evening_score: 1, digestion_speed: "fast", fat_load: "low", carb_speed: "fast", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "mango", tags: ["fruit"], min_grams: 150, max_grams: 350 },
  // Fats
  { id: "f1", name: "Olive Oil", calories_per_100g: 884, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, fiber_per_100g: 0, category: "fat", breakfast_score: 1, lunch_dinner_score: 3, preworkout_score: 0, postworkout_score: 1, evening_score: 1, digestion_speed: "slow", fat_load: "high", carb_speed: "none", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "olive_oil", tags: ["oil"], min_grams: 5, max_grams: 30 },
  { id: "f2", name: "Almonds", calories_per_100g: 579, protein_per_100g: 21, carbs_per_100g: 21.6, fat_per_100g: 49.9, fiber_per_100g: 12.5, category: "fat", breakfast_score: 2, lunch_dinner_score: 2, preworkout_score: 1, postworkout_score: 1, evening_score: 2, digestion_speed: "slow", fat_load: "high", carb_speed: "none", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "almonds", tags: ["nuts"], min_grams: 15, max_grams: 60 },
  { id: "f3", name: "Avocado", calories_per_100g: 160, protein_per_100g: 2, carbs_per_100g: 8.5, fat_per_100g: 14.7, fiber_per_100g: 6.7, category: "fat", breakfast_score: 3, lunch_dinner_score: 2, preworkout_score: 0, postworkout_score: 1, evening_score: 1, digestion_speed: "moderate", fat_load: "high", carb_speed: "none", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "avocado", tags: ["fruit"], min_grams: 50, max_grams: 200 },
  { id: "f4", name: "Peanut Butter", calories_per_100g: 588, protein_per_100g: 25, carbs_per_100g: 20, fat_per_100g: 50, fiber_per_100g: 6, category: "fat", breakfast_score: 3, lunch_dinner_score: 1, preworkout_score: 1, postworkout_score: 1, evening_score: 1, digestion_speed: "moderate", fat_load: "high", carb_speed: "none", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "peanut_butter", tags: ["peanut", "nuts"], min_grams: 15, max_grams: 60 },
  { id: "f5", name: "Cheese", calories_per_100g: 402, protein_per_100g: 25, carbs_per_100g: 1.3, fat_per_100g: 33, fiber_per_100g: 0, category: "fat", breakfast_score: 2, lunch_dinner_score: 2, preworkout_score: 0, postworkout_score: 1, evening_score: 2, digestion_speed: "slow", fat_load: "high", carb_speed: "none", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "cheese", tags: ["dairy", "cheese"], min_grams: 20, max_grams: 80 },
  { id: "f6", name: "Walnuts", calories_per_100g: 654, protein_per_100g: 15.2, carbs_per_100g: 13.7, fat_per_100g: 65.2, fiber_per_100g: 6.7, category: "fat", breakfast_score: 2, lunch_dinner_score: 2, preworkout_score: 1, postworkout_score: 1, evening_score: 2, digestion_speed: "slow", fat_load: "high", carb_speed: "none", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "walnuts", tags: ["nuts"], min_grams: 15, max_grams: 60 },
  { id: "f7", name: "Cashews", calories_per_100g: 553, protein_per_100g: 18, carbs_per_100g: 30, fat_per_100g: 44, fiber_per_100g: 3.3, category: "fat", breakfast_score: 2, lunch_dinner_score: 2, preworkout_score: 1, postworkout_score: 1, evening_score: 2, digestion_speed: "slow", fat_load: "high", carb_speed: "none", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "cashews", tags: ["nuts"], min_grams: 15, max_grams: 60 },
  { id: "f8", name: "Sunflower Seeds", calories_per_100g: 584, protein_per_100g: 21, carbs_per_100g: 20, fat_per_100g: 51, fiber_per_100g: 8.6, category: "fat", breakfast_score: 2, lunch_dinner_score: 2, preworkout_score: 1, postworkout_score: 1, evening_score: 2, digestion_speed: "slow", fat_load: "high", carb_speed: "none", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "sunflower_seeds", tags: ["seeds"], min_grams: 15, max_grams: 60 },
  { id: "f9", name: "Tahini", calories_per_100g: 595, protein_per_100g: 17, carbs_per_100g: 21, fat_per_100g: 54, fiber_per_100g: 9.3, category: "fat", breakfast_score: 2, lunch_dinner_score: 2, preworkout_score: 1, postworkout_score: 1, evening_score: 2, digestion_speed: "slow", fat_load: "high", carb_speed: "none", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "tahini", tags: ["seeds"], min_grams: 10, max_grams: 40 },
  { id: "f10", name: "Dark Chocolate", calories_per_100g: 546, protein_per_100g: 4.9, carbs_per_100g: 61, fat_per_100g: 31, fiber_per_100g: 7, category: "fat", breakfast_score: 1, lunch_dinner_score: 1, preworkout_score: 0, postworkout_score: 0, evening_score: 2, digestion_speed: "slow", fat_load: "high", carb_speed: "none", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "dark_chocolate", tags: ["cocoa"], min_grams: 15, max_grams: 50 },
  { id: "f11", name: "Coconut Oil", calories_per_100g: 862, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, fiber_per_100g: 0, category: "fat", breakfast_score: 2, lunch_dinner_score: 2, preworkout_score: 0, postworkout_score: 1, evening_score: 1, digestion_speed: "slow", fat_load: "high", carb_speed: "none", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "coconut_oil", tags: ["oil"], min_grams: 5, max_grams: 30 },
  { id: "f12", name: "Butter", calories_per_100g: 717, protein_per_100g: 0.9, carbs_per_100g: 0.1, fat_per_100g: 81, fiber_per_100g: 0, category: "fat", breakfast_score: 2, lunch_dinner_score: 2, preworkout_score: 0, postworkout_score: 1, evening_score: 2, digestion_speed: "slow", fat_load: "high", carb_speed: "none", protein_leanness: "none", formality: "neutral", goal_form: "both", variety_family: "butter", tags: ["dairy"], min_grams: 5, max_grams: 30 },
];

const restDaySlots = [
  { name: "Breakfast", slot: "breakfast", timing: "08:00", targetProfile: { proteinPreference: "any", carbSpeed: "any", fatAcceptable: true } },
  { name: "Lunch", slot: "lunch", timing: "13:00", targetProfile: { proteinPreference: "any", carbSpeed: "any", fatAcceptable: true } },
  { name: "Dinner", slot: "dinner", timing: "19:00", targetProfile: { proteinPreference: "any", carbSpeed: "any", fatAcceptable: true } },
  { name: "Snack", slot: "snack", timing: "21:00", targetProfile: { proteinPreference: "any", carbSpeed: "any", fatAcceptable: true } },
];

const trainingDaySlots = [
  { name: "Breakfast", slot: "breakfast", timing: "08:00", targetProfile: { proteinPreference: "any", carbSpeed: "any", fatAcceptable: true } },
  { name: "Lunch", slot: "lunch", timing: "13:00", targetProfile: { proteinPreference: "any", carbSpeed: "any", fatAcceptable: true } },
  { name: "Pre-Workout", slot: "pre-workout", timing: "17:00", targetProfile: { proteinPreference: "lean", carbSpeed: "fast", fatAcceptable: false }, workoutContext: "pre" },
  { name: "Post-Workout", slot: "post-workout", timing: "19:30", targetProfile: { proteinPreference: "any", carbSpeed: "fast", fatAcceptable: true }, workoutContext: "post" },
  { name: "Dinner", slot: "dinner", timing: "20:30", targetProfile: { proteinPreference: "any", carbSpeed: "any", fatAcceptable: true } },
];

const defaultTargets = { calories: 2400, protein_g: 180, carbs_g: 240, fat_g: 80 };

// ============================================================================
// PERSONAS
// ============================================================================

const personas = [
  {
    id: "maintain",
    label: "Maintain user — balanced, no restrictions",
    selections: { proteins: ["chicken", "salmon", "eggs", "turkey", "cod"], carbs: ["rice", "oats", "sweet_potato", "brown_rice", "quinoa"], fats: ["olive_oil", "almonds", "avocado"], traditional_meals: true },
    options: { carbTolerance: "energized_satiated", cookingLevel: "basic" },
    slots: restDaySlots,
    targets: defaultTargets,
    goal: "maintenance",
  },
  {
    id: "cut",
    label: "Cut user — lower calories, lean proteins",
    selections: { proteins: ["chicken", "shrimp", "whey"], carbs: ["rice", "sweet_potato", "oats"], fats: ["olive_oil", "almonds"], traditional_meals: true },
    options: { carbTolerance: "tired_hungry", cookingLevel: "intermediate" },
    slots: restDaySlots,
    targets: { calories: 1800, protein_g: 160, carbs_g: 150, fat_g: 60 },
    goal: "fat_loss",
  },
  {
    id: "recomp",
    label: "Recomp user — training days, moderate variety",
    selections: { proteins: ["chicken", "beef", "eggs", "salmon", "shrimp", "tuna", "turkey"], carbs: ["rice", "pasta", "quinoa", "sweet_potato", "potato", "brown_rice", "bread"], fats: ["olive_oil", "avocado", "almonds", "cheese", "peanut_butter"], traditional_meals: true },
    options: { carbTolerance: "energized_satiated", cookingLevel: "advanced" },
    slots: trainingDaySlots,
    targets: defaultTargets,
    goal: "maintenance",
  },
  {
    id: "endurance",
    label: "Endurance user — high carbs, fast carbs",
    selections: { proteins: ["chicken", "salmon", "eggs", "tuna", "turkey", "shrimp", "cod"], carbs: ["rice", "banana", "pasta", "mango", "apple", "sweet_potato", "potato", "quinoa", "brown_rice", "bread"], fats: ["olive_oil", "almonds", "peanut_butter", "avocado", "cashews"], traditional_meals: true },
    options: { carbTolerance: "energized_hungry", cookingLevel: "basic" },
    slots: trainingDaySlots,
    targets: { calories: 2800, protein_g: 150, carbs_g: 350, fat_g: 80 },
    goal: "maintenance",
  },
  {
    id: "narrow",
    label: "Narrow-preference user — 1 protein, 1 carb, 1 fat",
    selections: { proteins: ["chicken"], carbs: ["rice"], fats: ["olive_oil"], traditional_meals: true },
    options: { carbTolerance: "energized_satiated", cookingLevel: "basic" },
    slots: restDaySlots,
    targets: defaultTargets,
    goal: "maintenance",
  },
  {
    id: "restrictive",
    label: "Restrictive-allergy user — gluten + dairy + peanut allergy, vegetarian",
    selections: { proteins: ["chicken", "salmon", "eggs", "beef", "shrimp", "whey", "tofu", "lentils"], carbs: ["rice", "oats", "sweet_potato", "banana", "pasta", "quinoa"], fats: ["olive_oil", "almonds", "avocado", "peanut_butter", "cheese"], traditional_meals: true },
    options: { dietaryPreference: "vegetarian", allergies: ["gluten", "dairy", "peanuts"], refusedFoods: [], carbTolerance: "tired_satiated", cookingLevel: "intermediate" },
    slots: restDaySlots,
    targets: defaultTargets,
    goal: "maintenance",
  },
  {
    id: "highvariety",
    label: "High-variety user — wants lots of different foods",
    selections: { proteins: ["chicken", "salmon", "beef", "shrimp", "eggs", "turkey", "tofu", "lentils"], carbs: ["rice", "oats", "sweet_potato", "banana", "pasta", "quinoa", "potato", "bread"], fats: ["olive_oil", "almonds", "avocado", "peanut_butter", "cheese", "walnuts"], traditional_meals: true },
    options: { carbTolerance: "energized_satiated", cookingLevel: "advanced" },
    slots: restDaySlots,
    targets: defaultTargets,
    goal: "maintenance",
  },
  {
    id: "bulker",
    label: "Bulker — high calories, red meat & pasta lover",
    selections: { proteins: ["beef", "chicken", "eggs", "salmon", "tuna", "pork", "chicken_thigh", "turkey", "ground_turkey"], carbs: ["pasta", "rice", "potato", "bread", "sweet_potato", "quinoa", "brown_rice", "couscous"], fats: ["olive_oil", "cheese", "avocado", "peanut_butter", "butter", "walnuts"], traditional_meals: true },
    options: { carbTolerance: "energized_satiated", cookingLevel: "basic" },
    slots: trainingDaySlots,
    targets: { calories: 3200, protein_g: 200, carbs_g: 360, fat_g: 100 },
    goal: "muscle_gain",
  },
  {
    id: "busy",
    label: "Busy professional — basic cooking, minimal prep",
    selections: { proteins: ["chicken", "eggs", "whey", "turkey", "ground_turkey", "cottage_cheese"], carbs: ["rice", "oats", "bread", "banana", "apple", "sweet_potato"], fats: ["olive_oil", "almonds", "peanut_butter", "avocado"], traditional_meals: true },
    options: { carbTolerance: "tired_satiated", cookingLevel: "basic" },
    slots: restDaySlots,
    targets: { calories: 2200, protein_g: 150, carbs_g: 220, fat_g: 70 },
    goal: "maintenance",
  },
  {
    id: "veganathlete",
    label: "Vegan athlete — plant-based, high protein",
    selections: { proteins: ["tofu", "lentils", "tempeh", "black_beans", "edamame"], carbs: ["rice", "quinoa", "sweet_potato", "oats", "brown_rice", "corn_tortillas", "potato"], fats: ["olive_oil", "almonds", "avocado", "walnuts", "peanut_butter", "tahini", "sunflower_seeds"], traditional_meals: true },
    options: { dietaryPreference: "vegan", allergies: [], refusedFoods: [], carbTolerance: "energized_hungry", cookingLevel: "intermediate" },
    slots: trainingDaySlots,
    targets: { calories: 2600, protein_g: 160, carbs_g: 300, fat_g: 70 },
    goal: "maintenance",
  },
];

// ============================================================================
// HELPERS
// ============================================================================

function generateWeekForPersona(persona) {
  const allDays = [];
  const allSlots = [];
  const allWarnings = [];
  const allLogs = [];

  for (let d = 0; d < 7; d++) {
    const isTrainingDay = persona.slots === trainingDaySlots;
    // Alternate training/rest for recomp/endurance/bulker/veganathlete to add realism
    let daySlots = persona.slots;
    if (isTrainingDay && ["recomp", "endurance", "bulker", "veganathlete"].includes(persona.id)) {
      daySlots = (d === 1 || d === 3 || d === 5) ? trainingDaySlots : restDaySlots;
    }
    allSlots.push(daySlots);

    const previousDaysMeals = allDays.flat();
    const result = generateDailyMeals(
      baseFoods,
      persona.selections,
      daySlots,
      persona.targets,
      persona.goal,
      { ...persona.options, previousDaysMeals }
    );

    allDays.push(result.meals);
    if (result.warnings?.length) allWarnings.push(...result.warnings);
    if (result.logs?.length) allLogs.push(...result.logs);
  }

  const preCoherence = analyzeWeeklyCoherence(allDays);
  const rebalance = rebalanceWeeklyMeals(
    baseFoods,
    persona.selections,
    allSlots,
    persona.targets,
    persona.goal,
    persona.options,
    allDays
  );

  return {
    persona,
    days: rebalance.meals,
    preCoherence,
    postCoherence: analyzeWeeklyCoherence(rebalance.meals),
    warnings: [...new Set([...allWarnings, ...rebalance.warnings])],
    logs: [...rebalance.logs, ...allLogs],
  };
}

function buildIngredientFrequency(days) {
  const freq = {};
  for (const day of days) {
    for (const meal of day) {
      for (const key of ["protein", "carb", "fat"]) {
        const name = meal.items[key].food.name;
        freq[name] = (freq[name] || 0) + 1;
      }
    }
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]);
}

function coachVerdict(score, persona) {
  if (score >= 90) return "Excellent weekly plan — realistic, coherent, and well-matched.";
  if (score >= 75) return "Good plan with minor oddities — mostly human-feel.";
  if (score >= 60) return "Acceptable but has some repetition or pairing issues.";
  if (score >= 40) return "Needs review — odd pairings or chaotic grocery pattern.";
  return "Unrealistic — significant issues with pairings or variety.";
}

function formatMacro(m) {
  return `${Math.round(m.calories)}kcal · P${Math.round(m.protein)}g · C${Math.round(m.carbs)}g · F${Math.round(m.fat)}g`;
}

function formatReport(results) {
  const lines = [];
  lines.push("# Nutrition Weekly Audit Report\n");
  lines.push(`Generated: ${new Date().toISOString()}\n`);
  lines.push("## Summary\n");
  lines.push("| Persona | Pre-Score | Post-Score | Verdict |");
  lines.push("|---------|-----------|------------|---------|");
  for (const r of results) {
    const pre = r.preCoherence.realismScore;
    const post = r.postCoherence.realismScore;
    const verdict = coachVerdict(post, r.persona);
    lines.push(`| ${r.persona.label} | ${pre} | ${post} | ${verdict} |`);
  }
  lines.push("");

  for (const r of results) {
    lines.push(`---\n`);
    lines.push(`## ${r.persona.label}\n`);
    lines.push(`**Goal:** ${r.persona.goal}  `);
    lines.push(`**Targets:** ${r.persona.targets.calories}kcal / P${r.persona.targets.protein_g}g / C${r.persona.targets.carbs_g}g / F${r.persona.targets.fat_g}g  `);
    lines.push(`**Pre-rebalance score:** ${r.preCoherence.realismScore} (${r.preCoherence.realismLabel})  `);
    lines.push(`**Post-rebalance score:** ${r.postCoherence.realismScore} (${r.postCoherence.realismLabel})  `);
    lines.push(`**Coach verdict:** ${coachVerdict(r.postCoherence.realismScore, r.persona)}\n`);

    lines.push("### 7-Day Meal Plan\n");
    for (let d = 0; d < r.days.length; d++) {
      lines.push(`#### Day ${d + 1}\n`);
      for (const meal of r.days[d]) {
        lines.push(`- **${meal.slot}** — ${meal.name}  `);
        lines.push(`  - *Description:* ${meal.description}  `);
        lines.push(`  - *Prep:* ${meal.prep_time_min}min · *Macros:* ${formatMacro(meal.macros)}`);
      }
      lines.push("");
    }

    lines.push("### Weekly Ingredient Frequency\n");
    const freq = buildIngredientFrequency(r.days);
    for (const [name, count] of freq) {
      lines.push(`- ${name}: ${count}x`);
    }
    lines.push("");

    if (r.warnings.length) {
      lines.push("### Warnings\n");
      for (const w of r.warnings) lines.push(`- ⚠️ ${w}`);
      lines.push("");
    }

    if (r.logs.length) {
      lines.push("### Logs\n");
      for (const l of r.logs.slice(0, 20)) lines.push(`- ${l}`);
      if (r.logs.length > 20) lines.push(`- ... and ${r.logs.length - 20} more logs`);
      lines.push("");
    }
  }

  lines.push("---\n");
  lines.push("## Review Checklist\n");
  lines.push("- [ ] Does this look like a real weekly meal plan, not a macro spreadsheet?\n");
  lines.push("- [ ] Are the meals coherent by slot?\n");
  lines.push("- [ ] Is repetition controlled without becoming chaotic?\n");
  lines.push("- [ ] Does the grocery list feel sensible?\n");
  lines.push("- [ ] Are there any weird pairings or awkward dish names?\n");
  lines.push("- [ ] Does prep burden match the persona?\n");
  lines.push("- [ ] High-variety persona still shows diversity after coherence pass?\n");

  return lines.join("\n");
}

// ============================================================================
// MAIN
// ============================================================================

const results = [];
for (const persona of personas) {
  console.log(`[audit] Generating ${persona.id}...`);
  const result = generateWeekForPersona(persona);
  results.push(result);
  console.log(`[audit] ${persona.id} → pre:${result.preCoherence.realismScore} post:${result.postCoherence.realismScore}`);
}

const report = formatReport(results);
const outPath = new URL("./nutrition_weekly_audit_report.md", import.meta.url).pathname;
await Deno.writeTextFile(outPath, report);
console.log(`\n[audit] Report written to ${outPath}`);
