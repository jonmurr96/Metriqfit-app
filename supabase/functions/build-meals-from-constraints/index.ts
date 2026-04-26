import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

type FoodRow = {
  id: string;
  name: string;
  category: string | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
};

type MealCandidate = {
  name: string;
  slot: "breakfast" | "lunch" | "dinner" | "snack";
  ingredients: Array<{
    food_item_id: string | null;
    item_name: string;
    grams: number;
    quantity_unit: string;
    quantity_value: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  }>;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  estimatedCost: number;
  substitutions: Array<{
    ingredient: string;
    alternatives: string[];
  }>;
  score: number;
};

async function isEliteUser(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_type, status, expires_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub) return false;
  if (!["elite_monthly", "elite_annual", "elite_lifetime"].includes(sub.plan_type)) return false;
  if (sub.plan_type === "elite_lifetime") return true;
  if (!["active", "trial", "grace_period"].includes(sub.status)) return false;
  if (sub.expires_at) return new Date(sub.expires_at) > new Date();
  return true;
}

function foodCostPer100g(food: FoodRow) {
  const name = food.name.toLowerCase();
  const category = (food.category || "").toLowerCase();

  if (/(salmon|shrimp|steak)/.test(name)) return 2.2;
  if (/(chicken|turkey|beef)/.test(name)) return 1.3;
  if (/(tofu|egg|yogurt)/.test(name)) return 0.9;
  if (/(rice|oats|pasta|potato)/.test(name)) return 0.4;
  if (/(avocado|nuts|almond|olive)/.test(name)) return 1.6;
  if (category.includes("vegetable") || category.includes("fruit")) return 0.7;
  return 1.0;
}

function calcItem(food: FoodRow, grams: number) {
  const ratio = grams / 100;
  return {
    food_item_id: food.id,
    item_name: food.name,
    grams: round1(grams),
    quantity_unit: "g",
    quantity_value: round1(grams),
    calories: round1(food.calories_per_100g * ratio),
    protein: round1(food.protein_per_100g * ratio),
    carbs: round1(food.carbs_per_100g * ratio),
    fat: round1(food.fat_per_100g * ratio),
    fiber: 0,
  };
}

function calcTotals(items: ReturnType<typeof calcItem>[]) {
  return items.reduce(
    (acc, item) => {
      acc.calories += item.calories;
      acc.protein += item.protein;
      acc.carbs += item.carbs;
      acc.fat += item.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function findAlternatives(pool: FoodRow[], current: FoodRow, count = 3) {
  return pool
    .filter((item) => item.id !== current.id)
    .slice(0, count)
    .map((item) => item.name);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ success: false, error: "Missing Supabase config" }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return jsonResponse({ success: false, error: "Missing authorization header" }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const isElite = await isEliteUser(supabase, authData.user.id);
    if (!isElite) return jsonResponse({ success: false, error: "ELITE_REQUIRED" }, 403);

    const body = await req.json() as {
      constraints?: {
        meal_count?: number;
        meal_slot?: "breakfast" | "lunch" | "dinner" | "snack";
        protein_target?: number;
        max_calories?: number;
        budget_limit?: number;
        allergies?: string[];
        refused_foods?: string[];
      };
      pantry_mode?: "full_inventory" | "off";
      persist_grocery_list?: boolean;
      apply_target?: {
        plan_id?: string;
        day_of_week?: number;
        meal_slots?: Array<"breakfast" | "lunch" | "dinner" | "snack">;
        selected_indexes?: number[];
      };
    };

    const constraints = body.constraints || {};
    const mealCount = Math.max(1, Math.min(7, Number(constraints.meal_count || 3)));
    const slot = constraints.meal_slot || "lunch";
    const proteinTarget = Number(constraints.protein_target || 40);
    const maxCalories = Number(constraints.max_calories || 650);
    const budgetLimit = constraints.budget_limit != null ? Number(constraints.budget_limit) : null;

    const allergyWords = (constraints.allergies || []).map((v) => String(v).toLowerCase());
    const refusedWords = (constraints.refused_foods || []).map((v) => String(v).toLowerCase());

    const { data: foodsRaw, error: foodsError } = await supabase
      .from("food_items")
      .select("id, name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g")
      .eq("is_verified", true)
      .limit(800);

    if (foodsError || !foodsRaw?.length) {
      return jsonResponse({ success: false, error: foodsError?.message || "No food catalog found" }, 500);
    }

    const filteredFoods = (foodsRaw as FoodRow[]).filter((food) => {
      const lower = food.name.toLowerCase();
      return !allergyWords.some((a) => a && lower.includes(a))
        && !refusedWords.some((r) => r && lower.includes(r));
    });

    const proteinPool = filteredFoods.filter((f) => f.protein_per_100g >= 12).slice(0, 80);
    const carbPool = filteredFoods.filter((f) => f.carbs_per_100g >= 15).slice(0, 80);
    const fatPool = filteredFoods.filter((f) => f.fat_per_100g >= 8).slice(0, 80);
    const producePool = filteredFoods.filter((f) => /(vegetable|fruit|salad|greens|broccoli|spinach|pepper|tomato|berry|apple|banana)/i.test(f.name + " " + (f.category || ""))).slice(0, 80);

    if (!proteinPool.length || !carbPool.length || !fatPool.length) {
      return jsonResponse({ success: false, error: "Not enough foods match your constraints" }, 400);
    }

    const candidates: MealCandidate[] = [];

    for (let i = 0; i < mealCount * 3; i += 1) {
      const protein = proteinPool[i % proteinPool.length];
      const carb = carbPool[(i * 2) % carbPool.length];
      const fat = fatPool[(i * 3) % fatPool.length];
      const produce = producePool.length ? producePool[(i * 5) % producePool.length] : null;

      let proteinGrams = 170;
      let carbGrams = 140;
      let fatGrams = 18;
      const produceGrams = produce ? 110 : 0;

      const proteinProbe = calcItem(protein, proteinGrams);
      if (proteinProbe.protein < proteinTarget) {
        proteinGrams += Math.min(90, (proteinTarget - proteinProbe.protein) * 4);
      }

      const items = [
        calcItem(protein, proteinGrams),
        calcItem(carb, carbGrams),
        calcItem(fat, fatGrams),
        ...(produce ? [calcItem(produce, produceGrams)] : []),
      ];

      let totals = calcTotals(items);
      if (totals.calories > maxCalories) {
        const overflow = totals.calories - maxCalories;
        carbGrams = Math.max(50, carbGrams - overflow * 0.4);
        fatGrams = Math.max(8, fatGrams - overflow * 0.08);

        const adjustedItems = [
          calcItem(protein, proteinGrams),
          calcItem(carb, carbGrams),
          calcItem(fat, fatGrams),
          ...(produce ? [calcItem(produce, produceGrams)] : []),
        ];

        totals = calcTotals(adjustedItems);
        items.splice(0, items.length, ...adjustedItems);
      }

      const estimatedCost = round1(items.reduce((sum, item) => {
        const itemFood = [protein, carb, fat, produce].find((f) => f?.id === item.food_item_id);
        if (!itemFood) return sum;
        return sum + (item.grams / 100) * foodCostPer100g(itemFood);
      }, 0));

      const proteinDelta = Math.abs(totals.protein - proteinTarget);
      const caloriePenalty = Math.max(0, totals.calories - maxCalories);
      const score = round1(100 - proteinDelta * 2 - caloriePenalty * 0.08);

      candidates.push({
        name: `${protein.name} + ${carb.name}`,
        slot,
        ingredients: items,
        totals: {
          calories: round1(totals.calories),
          protein: round1(totals.protein),
          carbs: round1(totals.carbs),
          fat: round1(totals.fat),
        },
        estimatedCost,
        substitutions: [
          {
            ingredient: protein.name,
            alternatives: findAlternatives(proteinPool, protein),
          },
          {
            ingredient: carb.name,
            alternatives: findAlternatives(carbPool, carb),
          },
        ],
        score,
      });
    }

    const rankedMeals = candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, mealCount);

    const pantryMode = body.pantry_mode || "full_inventory";
    const pantryItems = pantryMode === "full_inventory"
      ? await supabase
        .from("pantry_items")
        .select("id, name, quantity_value, quantity_unit")
        .eq("user_id", authData.user.id)
        .eq("is_active", true)
      : { data: [] as Array<{ id: string; name: string; quantity_value: number; quantity_unit: string }> };

    const pantryMap = new Map<string, number>();
    for (const item of pantryItems.data || []) {
      pantryMap.set(item.name.toLowerCase(), Number(item.quantity_value || 0));
    }

    const groceryAggregate = new Map<string, {
      item_name: string;
      food_item_id: string | null;
      required: number;
      on_hand: number;
      unit: string;
      estimated_unit_cost: number;
      substitutions: string[];
    }>();

    for (const meal of rankedMeals) {
      for (const ingredient of meal.ingredients) {
        const key = ingredient.item_name.toLowerCase();
        const existing = groceryAggregate.get(key) || {
          item_name: ingredient.item_name,
          food_item_id: ingredient.food_item_id,
          required: 0,
          on_hand: pantryMap.get(key) || 0,
          unit: "g",
          estimated_unit_cost: 1,
          substitutions: [],
        };

        existing.required += ingredient.grams;

        const substitutionFromMeal = meal.substitutions.find((s) => s.ingredient === ingredient.item_name);
        if (substitutionFromMeal) {
          existing.substitutions = substitutionFromMeal.alternatives;
        }

        groceryAggregate.set(key, existing);
      }
    }

    const groceryItems = Array.from(groceryAggregate.values()).map((item) => {
      const toBuy = Math.max(0, round1(item.required - item.on_hand));
      const estimatedUnitCost = round1(item.estimated_unit_cost);
      return {
        item_name: item.item_name,
        food_item_id: item.food_item_id,
        required_quantity: round1(item.required),
        on_hand_quantity: round1(item.on_hand),
        to_buy_quantity: toBuy,
        quantity_unit: item.unit,
        estimated_unit_cost: estimatedUnitCost,
        estimated_total_cost: round1((toBuy / 100) * estimatedUnitCost),
        substitution_suggestions: item.substitutions,
      };
    });

    const totalEstimatedCost = round1(groceryItems.reduce((sum, item) => sum + (item.estimated_total_cost || 0), 0));

    const leftoversPlan = groceryItems
      .map((item) => {
        const packageSize = 500;
        const packagesNeeded = Math.ceil(item.to_buy_quantity / packageSize);
        const bought = packagesNeeded * packageSize;
        const leftovers = Math.max(0, bought - item.to_buy_quantity);
        return {
          item_name: item.item_name,
          expected_leftover_grams: round1(leftovers),
          note: leftovers > 0 ? "Carry leftovers into next prep cycle." : "No expected leftovers.",
        };
      })
      .filter((item) => item.expected_leftover_grams > 0);

    let listId: string | null = null;
    if (body.persist_grocery_list) {
      const title = `AI Meal Builder ${new Date().toLocaleDateString("en-US")}`;
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      const { data: list, error: listError } = await supabase
        .from("grocery_lists")
        .insert({
          user_id: authData.user.id,
          title,
          week_start_date: weekStart.toISOString().split("T")[0],
          source: "meal_builder",
          budget_limit: budgetLimit,
          total_estimated_cost: totalEstimatedCost,
          status: "active",
          metadata_json: {
            meal_count: mealCount,
            slot,
            protein_target: proteinTarget,
            max_calories: maxCalories,
          },
        })
        .select("id")
        .single();

      if (listError || !list) {
        return jsonResponse({ success: false, error: listError?.message || "Failed to persist grocery list" }, 500);
      }

      listId = list.id;

      const rows = groceryItems.map((item, index) => ({
        list_id: list.id,
        item_name: item.item_name,
        food_item_id: item.food_item_id,
        required_quantity: item.required_quantity,
        on_hand_quantity: item.on_hand_quantity,
        to_buy_quantity: item.to_buy_quantity,
        quantity_unit: item.quantity_unit,
        estimated_unit_cost: item.estimated_unit_cost,
        estimated_total_cost: item.estimated_total_cost,
        substitution_suggestions_json: item.substitution_suggestions,
        leftovers_json: leftoversPlan.find((l) => l.item_name === item.item_name) || {},
        priority: 100 - index,
      }));

      const { error: rowsError } = await supabase
        .from("grocery_list_items")
        .insert(rows);

      if (rowsError) {
        return jsonResponse({ success: false, error: rowsError.message }, 500);
      }
    }

    const appliedMealIds: string[] = [];
    if (body.apply_target) {
      const dayOfWeek = Number.isInteger(body.apply_target.day_of_week)
        ? Number(body.apply_target.day_of_week)
        : new Date().getDay();

      let planId = body.apply_target.plan_id || null;
      if (!planId) {
        const { data: activePlan } = await supabase
          .from("user_nutrition_plans")
          .select("id")
          .eq("user_id", authData.user.id)
          .eq("is_active", true)
          .maybeSingle();
        planId = activePlan?.id || null;
      }

      if (planId) {
        const slotOrder = body.apply_target.meal_slots?.length
          ? body.apply_target.meal_slots
          : ["breakfast", "lunch", "dinner", "snack"];

        const selectedIndexes = body.apply_target.selected_indexes?.length
          ? body.apply_target.selected_indexes
          : rankedMeals.map((_, idx) => idx);

        const selectedMeals = selectedIndexes
          .map((idx) => rankedMeals[idx])
          .filter(Boolean);

        for (let i = 0; i < selectedMeals.length && i < slotOrder.length; i += 1) {
          const selectedMeal = selectedMeals[i];
          const mealSlot = slotOrder[i];

          const { data: existingMeal } = await supabase
            .from("user_nutrition_plan_meals")
            .select("id")
            .eq("plan_id", planId)
            .eq("day_of_week", dayOfWeek)
            .eq("meal_slot", mealSlot)
            .maybeSingle();

          let mealId = existingMeal?.id;

          if (mealId) {
            const { error: updateMealError } = await supabase
              .from("user_nutrition_plan_meals")
              .update({
                name: selectedMeal.name,
                description: "Generated by AI meal builder",
                target_calories: selectedMeal.totals.calories,
                target_protein: selectedMeal.totals.protein,
                target_carbs: selectedMeal.totals.carbs,
                target_fat: selectedMeal.totals.fat,
                prep_time_min: 20,
                is_user_modified: true,
              })
              .eq("id", mealId);

            if (updateMealError) {
              return jsonResponse({ success: false, error: updateMealError.message }, 500);
            }
          } else {
            const { data: insertedMeal, error: insertMealError } = await supabase
              .from("user_nutrition_plan_meals")
              .insert({
                plan_id: planId,
                day_of_week: dayOfWeek,
                meal_slot: mealSlot,
                name: selectedMeal.name,
                description: "Generated by AI meal builder",
                target_calories: selectedMeal.totals.calories,
                target_protein: selectedMeal.totals.protein,
                target_carbs: selectedMeal.totals.carbs,
                target_fat: selectedMeal.totals.fat,
                prep_time_min: 20,
                is_user_modified: true,
              })
              .select("id")
              .single();

            if (insertMealError || !insertedMeal) {
              return jsonResponse({ success: false, error: insertMealError?.message || "Failed to insert meal" }, 500);
            }

            mealId = insertedMeal.id;
          }

          const { data: variant, error: variantError } = await supabase
            .from("user_nutrition_plan_meal_variants")
            .insert({
              plan_meal_id: mealId,
              variant_type: "user_custom",
              name: selectedMeal.name,
              description: "Generated by AI meal builder",
              target_calories: selectedMeal.totals.calories,
              target_protein: selectedMeal.totals.protein,
              target_carbs: selectedMeal.totals.carbs,
              target_fat: selectedMeal.totals.fat,
              prep_time_min: 20,
              source: "user",
              is_active: true,
            })
            .select("id")
            .single();

          if (variantError || !variant) {
            return jsonResponse({ success: false, error: variantError?.message || "Failed to create variant" }, 500);
          }

          const itemRows = selectedMeal.ingredients.map((item, idx) => ({
            variant_id: variant.id,
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
            order_index: idx,
          }));

          const { error: itemsError } = await supabase
            .from("user_nutrition_plan_meal_variant_items")
            .insert(itemRows);

          if (itemsError) {
            return jsonResponse({ success: false, error: itemsError.message }, 500);
          }

          const { error: selectVariantError } = await supabase
            .from("user_nutrition_plan_meals")
            .update({
              selected_variant_id: variant.id,
              is_user_modified: true,
            })
            .eq("id", mealId);

          if (selectVariantError) {
            return jsonResponse({ success: false, error: selectVariantError.message }, 500);
          }

          appliedMealIds.push(mealId);
        }
      }
    }

    await supabase.rpc("increment_ai_usage", {
      p_user_id: authData.user.id,
      p_usage_type: "meal_builder_runs",
    });

    return jsonResponse({
      success: true,
      meals: rankedMeals,
      groceryList: {
        listId,
        totalEstimatedCost,
        items: groceryItems,
      },
      leftoversPlan,
      appliedMealIds,
      warnings: budgetLimit != null && totalEstimatedCost > budgetLimit
        ? [`Estimated grocery cost ($${totalEstimatedCost}) exceeds your budget target ($${budgetLimit}).`]
        : [],
    });
  } catch (error) {
    const err = error as Error;
    console.error("[build-meals-from-constraints]", err);
    return jsonResponse({ success: false, error: err.message || "Internal error" }, 500);
  }
});
