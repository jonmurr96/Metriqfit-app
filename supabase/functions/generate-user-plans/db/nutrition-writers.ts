// Nutrition-plan DB writers extracted from index.ts
// during Phase 0.5 monolith split (zero behavior change).
//
// Function bodies are byte-for-byte preserved; only `function` becomes `export function`.
// Types/constants are re-imported from index.ts (temporary partial cycle is intentional
// and will be resolved in Phase 1).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import type {
  UserContext,
  VarietyProfile,
  ActivationMode,
  NutritionMealSlot,
  MealAnchorSelection,
  MealVariantPayload,
} from "../index.ts";
import {
  FOOD_LIBRARY,
  NUTRITION_PREVIEW_NAME_PREFIX,
  buildMealVariant,
} from "../index.ts";
import {
  buildNutritionSlotRatio,
  normalizeNutritionSlots,
} from "../helpers/nutrition-slots.ts";
import {
  applyDietaryFilters,
  buildFoodRecordLookup,
  buildMacroRotationPool,
  findBestFoodRecordMatch,
  getFoodByTag,
  pickFoodForMacro,
  pickFromRotationPool,
} from "../helpers/food.ts";
import {
  calculateMacroDiffPercent,
  formatDate,
  getDayVariation,
  round1,
  startOfWeek,
} from "../helpers/scalars.ts";

export async function storeNutritionPlan(
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
  dryRun: boolean = false
) {
  const warnings: string[] = [];
  const nutritionDays = Math.max(7, Math.min(14, horizonDays));
  const normalizedMealSlots = normalizeNutritionSlots(mealSlots);
  const slotRatio = buildNutritionSlotRatio(normalizedMealSlots);
  const goal = (() => {
    switch (context.onboarding.goal_type) {
      case "build_muscle":
      case "gain_weight":
        return "muscle_gain" as const;
      case "lose_weight":
      case "get_fitter":
        return "fat_loss" as const;
      default:
        return "maintenance" as const;
    }
  })();

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
    throw new Error("No foods matched your dietary restrictions. Adjust allergies, exclusions, or dietary preference and try again.");
  }

  const dbFoodLookup = buildFoodRecordLookup(context.foods);
  const mappedAllowedFoods = allowedFoods.filter((food) =>
    !!findBestFoodRecordMatch(food.name, dbFoodLookup)
  );

  const workingFoods = mappedAllowedFoods;
  if (!workingFoods.length) {
    throw new Error("No loggable foods matched your dietary restrictions. Adjust allergies, exclusions, or dietary preference and try again.");
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
      // Last slot absorbs remaining macros, but capped at 1.5× its ratio share to
      // prevent any single slot (especially snack) from ballooning into a full meal.
      if (slotIndex === mealTargets.length - 1) {
        const maxRatio = Math.max(slotRatio[meal.slot] || 0, 1 / mealTargets.length);
        const cap = 1.5;
        meal.protein = Math.min(
          Math.max(0, dayTargets.protein - dayActualTotals.protein),
          dayTargets.protein * maxRatio * cap,
        );
        meal.carbs = Math.min(
          Math.max(0, dayTargets.carbs - dayActualTotals.carbs),
          dayTargets.carbs * maxRatio * cap,
        );
        meal.fat = Math.min(
          Math.max(0, dayTargets.fat - dayActualTotals.fat),
          dayTargets.fat * maxRatio * cap,
        );
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

      // storeNutritionPlan only ever uses legacy slots — cast is safe here.
      const legacySlot = meal.slot as "breakfast" | "lunch" | "dinner" | "snack";
      const variants: MealVariantPayload[] = [
        buildMealVariant(
          legacySlot,
          meal,
          workingFoods,
          goal,
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
            legacySlot,
            meal,
            workingFoods,
            goal,
            dayIndex * 37 + meal.slot.length,
            1,
            dbFoodLookup,
            { strictMacroMode, anchors: alt1Anchors },
          ),
          buildMealVariant(
            legacySlot,
            meal,
            workingFoods,
            goal,
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
      throw new Error(`Day ${dayIndex + 1} nutrition plan exceeds the ${macroTolerancePercent}% macro tolerance (${round1(dayMaxDiff)}%). Adjust meal preferences or macro targets and try again.`);
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

export async function deleteNutritionPlanTree(supabase: SupabaseClient, planId: string) {
  const { error } = await supabase
    .from("user_nutrition_plans")
    .delete()
    .eq("id", planId);

  if (error) {
    throw new Error(`Failed to discard generated nutrition plan: ${error.message}`);
  }
}
