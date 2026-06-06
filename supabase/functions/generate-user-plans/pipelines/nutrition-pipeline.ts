// Nutrition pipeline orchestration extracted from index.ts
// during Phase 0.5 monolith split (zero behavior change).
//
// Function bodies are byte-for-byte preserved; only `function` becomes `export function`.
// Types/constants are re-imported from index.ts (temporary partial cycle is intentional
// and will be resolved in Phase 1).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
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
} from "../scientificMealEngine.ts";
import type {
  ActivationMode,
  NutritionMealSlot,
  UserContext,
} from "../index.ts";
import { NUTRITION_PREVIEW_NAME_PREFIX } from "../index.ts";
import { round1 } from "../helpers/scalars.ts";

export function getDefaultPortionBounds(category: string | null): { min: number; max: number } {
  const normalized = String(category || "").toLowerCase();
  switch (normalized) {
    case "protein":
    case "proteins":
      return { min: 50, max: 400 };
    case "carb":
    case "carbs":
    case "grain":
    case "grains":
    case "starch":
    case "starches":
      return { min: 30, max: 500 };
    case "fat":
    case "fats":
    case "nuts":
    case "seeds":
      return { min: 5, max: 80 };
    case "vegetable":
    case "vegetables":
      return { min: 40, max: 450 };
    case "fruit":
    case "fruits":
      return { min: 60, max: 350 };
    default:
      return { min: 10, max: 300 };
  }
}

export function getFoodSpecificBounds(food: UserContext["foods"][number]): { min: number; max: number } {
  const defaults = getDefaultPortionBounds(food.category);
  const name = (food.name || "").toLowerCase();

  // Tighten bounds for very calorie-dense foods
  if (name.includes("oil")) return { min: 5, max: 30 };
  if (name.includes("butter")) return { min: 5, max: 30 };
  if (name.includes("nut") && !name.includes("coconut")) return { min: 10, max: 60 };
  if (name.includes("seeds") || name.includes("chia") || name.includes("flax")) return { min: 5, max: 30 };
  if (name.includes("peanut butter")) return { min: 10, max: 40 };
  if (name.includes("avocado")) return { min: 30, max: 150 };
  if (name.includes("cheese")) return { min: 15, max: 80 };
  if (name.includes("egg white")) return { min: 100, max: 400 };
  if (name.includes("rice")) return { min: 90, max: 520 };
  if (name.includes("quinoa")) return { min: 90, max: 520 };
  if (name.includes("sweet potato")) return { min: 150, max: 650 };
  if (name.includes("potato")) return { min: 150, max: 650 };
  if (name.includes("pasta")) return { min: 90, max: 500 };
  if (name.includes("oat")) return { min: 40, max: 180 };
  if (name.includes("bread") || name.includes("toast") || name.includes("muffin") || name.includes("tortilla")) {
    return { min: 50, max: 220 };
  }
  if (name.includes("whey") || name.includes("protein powder") || name.includes("casein")) {
    return { min: 20, max: 100 };
  }

  return defaults;
}

export function convertFoodsToScientificFormat(foods: UserContext["foods"]): FoodWithMetadata[] {
  const seen = new Map<string, FoodWithMetadata>();

  for (const food of foods) {
    const bounds = getFoodSpecificBounds(food);
    const converted = {
      id: food.id,
      name: food.name,
      calories_per_100g: food.calories_per_100g,
      protein_per_100g: food.protein_per_100g,
      carbs_per_100g: food.carbs_per_100g,
      fat_per_100g: food.fat_per_100g,
      fiber_per_100g: food.fiber_per_100g ?? 0,
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
      tags: food.tags || [],
      min_grams: bounds.min,
      max_grams: bounds.max,
    };
    const key = `${String(converted.variety_family || "").toLowerCase()}::${String(converted.name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}`;
    const existing = seen.get(key);
    const metadataScore = (converted.breakfast_score || 0)
      + (converted.lunch_dinner_score || 0)
      + (converted.preworkout_score || 0)
      + (converted.postworkout_score || 0)
      + (converted.evening_score || 0)
      + (converted.fiber_per_100g || 0) * 0.1;
    const existingScore = existing
      ? (existing.breakfast_score || 0)
        + (existing.lunch_dinner_score || 0)
        + (existing.preworkout_score || 0)
        + (existing.postworkout_score || 0)
        + (existing.evening_score || 0)
        + (existing.fiber_per_100g || 0) * 0.1
      : -Infinity;

    if (!existing || metadataScore > existingScore) {
      seen.set(key, converted);
    }
  }

  return Array.from(seen.values());
}

export function baseMacroTargets(targets: UserContext["targets"]): MacroTargets {
  return {
    calories: Number(targets.calories || 0),
    protein_g: Number(targets.protein_g || 0),
    carbs_g: Number(targets.carbs_g || 0),
    fat_g: Number(targets.fat_g || 0),
  };
}

export function normalizeDayTypeTarget(raw: unknown, fallback: MacroTargets): MacroTargets {
  const candidate = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  return {
    calories: Number(candidate.calories || fallback.calories),
    protein_g: Number(candidate.protein_g || fallback.protein_g),
    carbs_g: Number(candidate.carbs_g || fallback.carbs_g),
    fat_g: Number(candidate.fat_g || fallback.fat_g),
  };
}

export function macroTargetsForDay(context: UserContext, hasWorkout: boolean): MacroTargets {
  const fallback = baseMacroTargets(context.targets);
  const dayTypeTargets = context.targets.day_type_targets_json;
  if (!dayTypeTargets) return fallback;
  return normalizeDayTypeTarget(hasWorkout ? dayTypeTargets.trainingDay : dayTypeTargets.restDay, fallback);
}

/**
 * Generate meals using the scientific meal engine
 * Used when user has preferred proteins, carbs, and fats selected
 */
export async function generateScientificMealPlan(
  supabase: SupabaseClient,
  userId: string,
  runId: string,
  context: UserContext,
  activationMode: ActivationMode,
  horizonDays: number,
  currentPlanId: string | null,
  workoutSchedule: Array<{ day: number; hasWorkout: boolean; time: string | null }>,
  mealsPerDay?: number,
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

  // Determine goal — exhaustive mapping from all onboarding goal types
  function resolveGoalType(goalType: string): "muscle_gain" | "fat_loss" | "maintenance" {
    switch (goalType) {
      case "build_muscle":
      case "gain_weight":
        return "muscle_gain";
      case "lose_weight":
      case "get_fitter":
        return "fat_loss";
      case "maintain_weight":
      case "recomp":
      case "increase_endurance":
      case "general_fitness":
      default:
        return "maintenance";
    }
  }
  const goal = resolveGoalType(context.onboarding.goal_type);

  // Create plan
  const { data: maxVersionData } = await supabase
    .from("user_nutrition_plans")
    .select("version")
    .eq("user_id", userId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (maxVersionData?.version || 0) + 1;

  const { data: nutritionPlan, error: planError } = await supabase
    .from("user_nutrition_plans")
    .insert({
      user_id: userId,
      generation_run_id: runId,
      version,
      is_active: false,
      lifecycle_state: "preview",
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

  // Phase 1: Generate all days independently (with cross-day variety via previousDaysMeals)
  const dayPlans: { meals: GeneratedMeal[]; slots: MealSlot[]; dayIndex: number }[] = [];
  const allDayMeals: GeneratedMeal[][] = [];
  const allDayTargets: MacroTargets[] = [];

  for (let dayIndex = 0; dayIndex < nutritionDays; dayIndex++) {
    const dayWorkout = workoutSchedule[dayIndex % workoutSchedule.length];
    const hasWorkout = dayWorkout?.hasWorkout || false;
    const workoutTime = dayWorkout?.time || null;
    const dayTargets = macroTargetsForDay(context, hasWorkout);

    const scheduleConfig: ScheduleConfig = {
      wake_time:
        context.onboarding.wake_time === "5_6am" ? "05:30" :
        context.onboarding.wake_time === "7_8am" ? "07:30" :
        context.onboarding.wake_time === "9_10am" ? "09:30" :
        "07:30",
      first_meal_delay_minutes:
        context.onboarding.first_meal_delay === "immediate" ? 15 :
        context.onboarding.first_meal_delay === "3hrs_plus" ? 210 :
        90,
      last_meal_before_bed_minutes:
        context.onboarding.last_meal_before_bed === "3_4hrs" ? 240 :
        context.onboarding.last_meal_before_bed === "no_constraint" ? 30 :
        120,
      workout_time: workoutTime,
    };

    const slots = getSlotTemplate(hasWorkout, workoutTime, scheduleConfig, mealsPerDay);

    const mealGenOptions: GenerationOptions = {
      carbTolerance: context.onboarding.carb_tolerance || undefined,
      cookingLevel: context.onboarding.cooking_level || undefined,
      isTrainingDay: hasWorkout,
      dietaryPreference: context.onboarding.dietary_preference,
      allergies: context.onboarding.allergies_exclusions,
      refusedFoods: context.onboarding.refused_foods,
      previousDaysMeals: allDayMeals.flat(),
    };

    const { meals: dailyMeals, warnings: dailyWarnings, logs: dailyLogs } = generateDailyMeals(
      scientificFoods,
      selections,
      slots,
      dayTargets,
      goal,
      mealGenOptions,
    );

    if (dailyWarnings?.length > 0) {
      for (const dw of dailyWarnings) {
        if (!warnings.includes(dw)) warnings.push(dw);
      }
    }

    if (dailyLogs?.length > 0) {
      for (const dl of dailyLogs) {
        console.log(`[generate-user-plans] [day-${dayIndex}] ${dl}`);
      }
    }

    dayPlans.push({ meals: dailyMeals, slots, dayIndex });
    allDayMeals.push(dailyMeals);
    allDayTargets.push(dayTargets);
  }

  // Phase 2: Weekly coherence pass (soft rebalance if chaotic)
  const allSlots = dayPlans.map((d) => d.slots);
  const baseOptions: GenerationOptions = {
    carbTolerance: context.onboarding.carb_tolerance || undefined,
    cookingLevel: context.onboarding.cooking_level || undefined,
    dietaryPreference: context.onboarding.dietary_preference,
    allergies: context.onboarding.allergies_exclusions,
    refusedFoods: context.onboarding.refused_foods,
  };

  const { analyzeWeeklyCoherence, rebalanceWeeklyMeals } = await import("../scientificMealEngine.ts");
  const preCoherence = analyzeWeeklyCoherence(allDayMeals);
  console.log(`[generate-user-plans] Pre-coherence score: ${preCoherence.realismScore} (${preCoherence.realismLabel})`);

  const { meals: rebalancedDays, warnings: rebalanceWarnings, logs: rebalanceLogs } = rebalanceWeeklyMeals(
    scientificFoods,
    selections,
    allSlots,
    allDayTargets,
    goal,
    baseOptions,
    allDayMeals
  );

  for (const w of rebalanceWarnings) if (!warnings.includes(w)) warnings.push(w);
  for (const l of rebalanceLogs) console.log(`[generate-user-plans] [weekly-rebalance] ${l}`);

  const postCoherence = analyzeWeeklyCoherence(rebalancedDays);
  console.log(`[generate-user-plans] Post-coherence score: ${postCoherence.realismScore} (${postCoherence.realismLabel})`);

  const generatedSlots = Array.from(new Set(rebalancedDays.flat().map((meal) => meal.slot)));
  if (generatedSlots.length) {
    await supabase
      .from("user_nutrition_plans")
      .update({
        meal_structure: {
          slots: generatedSlots,
        },
      })
      .eq("id", nutritionPlan.id);
  }

  // Phase 3: Store in database
  let variantCount = 0;
  const groceryMap = new Map<string, { grams: number; calories: number; protein: number; carbs: number; fat: number; unit: string }>();

  for (let dayIndex = 0; dayIndex < nutritionDays; dayIndex++) {
    const dailyMeals = rebalancedDays[dayIndex];

    for (const meal of dailyMeals) {
      const { data: mealRow, error: mealError } = await supabase
        .from("user_nutrition_plan_meals")
        .insert({
          plan_id: nutritionPlan.id,
          meal_slot: meal.slot as NutritionMealSlot,
          day_of_week: dayIndex,
          name: meal.name,
          description: meal.description,
          target_calories: Math.round(meal.macros.calories),
          target_protein: round1(meal.macros.protein),
          target_carbs: round1(meal.macros.carbs),
          target_fat: round1(meal.macros.fat),
          prep_time_min: meal.prep_time_min,
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
          description: meal.description,
          target_calories: Math.round(meal.macros.calories),
          target_protein: round1(meal.macros.protein),
          target_carbs: round1(meal.macros.carbs),
          target_fat: round1(meal.macros.fat),
          prep_time_min: meal.prep_time_min,
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
          fiber: round1((meal.items.protein.food.fiber_per_100g / 100) * meal.items.protein.grams),
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
          fiber: round1((meal.items.carb.food.fiber_per_100g / 100) * meal.items.carb.grams),
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
          fiber: round1((meal.items.fat.food.fiber_per_100g / 100) * meal.items.fat.grams),
          order_index: 2,
        },
      ];

      if (meal.items.produce) {
        itemsPayload.push({
          variant_id: variantRow.id,
          food_item_id: meal.items.produce.food.id,
          item_name: meal.items.produce.food.name,
          quantity_value: Math.round(meal.items.produce.grams),
          quantity_unit: "g",
          grams: Math.round(meal.items.produce.grams),
          calories: Math.round((meal.items.produce.food.calories_per_100g / 100) * meal.items.produce.grams),
          protein: round1((meal.items.produce.food.protein_per_100g / 100) * meal.items.produce.grams),
          carbs: round1((meal.items.produce.food.carbs_per_100g / 100) * meal.items.produce.grams),
          fat: round1((meal.items.produce.food.fat_per_100g / 100) * meal.items.produce.grams),
          fiber: round1((meal.items.produce.food.fiber_per_100g / 100) * meal.items.produce.grams),
          order_index: 3,
        });
      }

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

  // Guard: if no meals were stored at all, the plan is useless. Throw so the
  // outer catch block can fall back to the legacy storeNutritionPlan generator.
  if (variantCount === 0) {
    throw new Error(
      "Scientific meal engine produced 0 meal variants across all days. " +
      "This likely means isFeasible rejected every food combination. " +
      "Falling back to legacy meal generator."
    );
  }

  return {
    planId: nutritionPlan.id,
    variantCount,
    warnings: Array.from(new Set(warnings)),
  };
}
