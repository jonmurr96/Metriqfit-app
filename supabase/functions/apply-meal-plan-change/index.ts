import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { verifyClerkRequest } from "../_shared/clerkAuth.ts";

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

type ChangeItem = {
  food_item_id?: string | null;
  item_name?: string;
  quantity_value?: number;
  quantity_unit?: string;
  grams?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
};

async function computeDayTotals(
  supabase: ReturnType<typeof createClient>,
  planId: string,
  dayOfWeek: number,
  userId: string,
) {
  const { data: meals, error: mealsError } = await supabase
    .from("user_nutrition_plan_meals")
    .select("id, meal_slot, selected_variant_id")
    .eq("plan_id", planId)
    .eq("day_of_week", dayOfWeek)
    .order("meal_slot", { ascending: true });

  if (mealsError) throw new Error(mealsError.message);

  const variantIds = (meals || [])
    .map((meal) => meal.selected_variant_id)
    .filter(Boolean) as string[];

  let variantMap = new Map<string, { target_calories: number | null; target_protein: number | null; target_carbs: number | null; target_fat: number | null }>();

  if (variantIds.length) {
    const { data: variants, error: variantsError } = await supabase
      .from("user_nutrition_plan_meal_variants")
      .select("id, target_calories, target_protein, target_carbs, target_fat")
      .in("id", variantIds);

    if (variantsError) throw new Error(variantsError.message);

    variantMap = new Map((variants || []).map((variant) => [variant.id, variant]));
  }

  const { data: targets } = await supabase
    .from("user_targets")
    .select("calories, protein_g, carbs_g, fat_g")
    .eq("user_id", userId)
    .maybeSingle();

  const mealsWithTotals = (meals || []).map((meal) => {
    const variant = meal.selected_variant_id ? variantMap.get(meal.selected_variant_id) : null;
    return {
      meal_id: meal.id,
      meal_slot: meal.meal_slot,
      calories: round1(variant?.target_calories || 0),
      protein: round1(Number(variant?.target_protein || 0)),
      carbs: round1(Number(variant?.target_carbs || 0)),
      fat: round1(Number(variant?.target_fat || 0)),
    };
  });

  const totals = mealsWithTotals.reduce(
    (acc, meal) => {
      acc.calories += meal.calories;
      acc.protein += meal.protein;
      acc.carbs += meal.carbs;
      acc.fat += meal.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const targetTotals = {
    calories: targets?.calories || 0,
    protein: targets?.protein_g || 0,
    carbs: targets?.carbs_g || 0,
    fat: targets?.fat_g || 0,
  };

  return {
    meals: mealsWithTotals,
    totals: {
      calories: round1(totals.calories),
      protein: round1(totals.protein),
      carbs: round1(totals.carbs),
      fat: round1(totals.fat),
    },
    targets: targetTotals,
    delta: {
      calories: round1(totals.calories - targetTotals.calories),
      protein: round1(totals.protein - targetTotals.protein),
      carbs: round1(totals.carbs - targetTotals.carbs),
      fat: round1(totals.fat - targetTotals.fat),
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ success: false, error: "Missing Supabase config" }, 500);

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return jsonResponse({ success: false, error: "Missing authorization header" }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await verifyClerkRequest(req);
    if (authError || !authData?.user) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const body = await req.json() as {
      plan_meal_id?: string;
      operation?: "swap_variant" | "customize_variant_items";
      variant_id?: string;
      items?: ChangeItem[];
      name?: string;
      description?: string;
    };

    if (!body.plan_meal_id || !body.operation) {
      return jsonResponse({ success: false, error: "plan_meal_id and operation are required" }, 400);
    }

    const { data: meal, error: mealError } = await supabase
      .from("user_nutrition_plan_meals")
      .select("id, plan_id, day_of_week, meal_slot")
      .eq("id", body.plan_meal_id)
      .single();

    if (mealError || !meal) return jsonResponse({ success: false, error: "Meal not found" }, 404);

    const { data: plan, error: planError } = await supabase
      .from("user_nutrition_plans")
      .select("id, user_id")
      .eq("id", meal.plan_id)
      .single();

    if (planError || !plan || plan.user_id !== authData.user.id) {
      return jsonResponse({ success: false, error: "Meal does not belong to user" }, 403);
    }

    if (body.operation === "swap_variant") {
      if (!body.variant_id) {
        return jsonResponse({ success: false, error: "variant_id is required for swap_variant" }, 400);
      }

      const { data: variant, error: variantError } = await supabase
        .from("user_nutrition_plan_meal_variants")
        .select("id, plan_meal_id")
        .eq("id", body.variant_id)
        .single();

      if (variantError || !variant || variant.plan_meal_id !== meal.id) {
        return jsonResponse({ success: false, error: "Invalid variant for meal" }, 400);
      }

      const { error: updateError } = await supabase
        .from("user_nutrition_plan_meals")
        .update({ selected_variant_id: variant.id })
        .eq("id", meal.id);

      if (updateError) {
        return jsonResponse({ success: false, error: updateError.message }, 500);
      }
    }

    if (body.operation === "customize_variant_items") {
      if (!body.items || !body.items.length) {
        return jsonResponse({ success: false, error: "items are required for customize_variant_items" }, 400);
      }

      const normalizedItems = [] as Array<{
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
      }>;

      for (const input of body.items) {
        const grams = Number(input.grams || input.quantity_value || 0);
        if (!grams || grams <= 0) continue;

        let calories = Number(input.calories || 0);
        let protein = Number(input.protein || 0);
        let carbs = Number(input.carbs || 0);
        let fat = Number(input.fat || 0);
        let fiber = Number(input.fiber || 0);
        let itemName = input.item_name || "Custom Item";

        if (input.food_item_id) {
          const { data: food } = await supabase
            .from("food_items")
            .select("name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g")
            .eq("id", input.food_item_id)
            .maybeSingle();

          if (food) {
            itemName = food.name;
            calories = (food.calories_per_100g * grams) / 100;
            protein = (food.protein_per_100g * grams) / 100;
            carbs = (food.carbs_per_100g * grams) / 100;
            fat = (food.fat_per_100g * grams) / 100;
            fiber = ((food.fiber_per_100g || 0) * grams) / 100;
          }
        }

        normalizedItems.push({
          food_item_id: input.food_item_id || null,
          item_name: itemName,
          quantity_value: round1(Number(input.quantity_value || grams)),
          quantity_unit: input.quantity_unit || "g",
          grams: round1(grams),
          calories: round1(calories),
          protein: round1(protein),
          carbs: round1(carbs),
          fat: round1(fat),
          fiber: round1(fiber),
        });
      }

      if (!normalizedItems.length) {
        return jsonResponse({ success: false, error: "No valid items in payload" }, 400);
      }

      const totals = normalizedItems.reduce(
        (acc, item) => {
          acc.calories += item.calories;
          acc.protein += item.protein;
          acc.carbs += item.carbs;
          acc.fat += item.fat;
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      );

      const { data: variant, error: variantError } = await supabase
        .from("user_nutrition_plan_meal_variants")
        .insert({
          plan_meal_id: meal.id,
          variant_type: "user_custom",
          name: body.name || `${meal.meal_slot[0].toUpperCase()}${meal.meal_slot.slice(1)} Custom`,
          description: body.description || "Customized by user",
          target_calories: Math.round(totals.calories),
          target_protein: round1(totals.protein),
          target_carbs: round1(totals.carbs),
          target_fat: round1(totals.fat),
          prep_time_min: 15,
          source: "user",
          is_active: true,
        })
        .select("id")
        .single();

      if (variantError || !variant) {
        return jsonResponse({ success: false, error: variantError?.message || "Failed to create custom variant" }, 500);
      }

      const payload = normalizedItems.map((item, index) => ({
        variant_id: variant.id,
        ...item,
        order_index: index,
      }));

      const { error: itemsError } = await supabase
        .from("user_nutrition_plan_meal_variant_items")
        .insert(payload);

      if (itemsError) {
        return jsonResponse({ success: false, error: itemsError.message }, 500);
      }

      const { error: updateMealError } = await supabase
        .from("user_nutrition_plan_meals")
        .update({
          selected_variant_id: variant.id,
          name: body.name || `${meal.meal_slot[0].toUpperCase()}${meal.meal_slot.slice(1)} Custom`,
          description: body.description || "Customized by user",
          target_calories: Math.round(totals.calories),
          target_protein: round1(totals.protein),
          target_carbs: round1(totals.carbs),
          target_fat: round1(totals.fat),
          is_user_modified: true,
        })
        .eq("id", meal.id);

      if (updateMealError) {
        return jsonResponse({ success: false, error: updateMealError.message }, 500);
      }
    }

    const dayMetrics = await computeDayTotals(supabase, meal.plan_id, meal.day_of_week || 0, authData.user.id);

    return jsonResponse({
      success: true,
      plan_meal_id: meal.id,
      day_of_week: meal.day_of_week,
      ...dayMetrics,
    });
  } catch (error) {
    const err = error as Error;
    console.error("[apply-meal-plan-change]", err);
    return jsonResponse({ success: false, error: err.message || "Internal error" }, 500);
  }
});
