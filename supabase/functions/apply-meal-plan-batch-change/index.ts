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

type BatchItem = {
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

type BatchMeal = {
  meal_slot: "breakfast" | "lunch" | "dinner" | "snack";
  name: string;
  description?: string;
  target_calories?: number;
  target_protein?: number;
  target_carbs?: number;
  target_fat?: number;
  prep_time_min?: number;
  items?: BatchItem[];
};

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

    const { data: authData, error: authError } = await verifyClerkRequest(req);
    if (authError || !authData?.user) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const body = await req.json() as {
      plan_id?: string;
      day_of_week?: number;
      meals?: BatchMeal[];
    };

    if (!body.meals?.length) {
      return jsonResponse({ success: false, error: "meals payload is required" }, 400);
    }

    const dayOfWeek = Number.isInteger(body.day_of_week)
      ? Number(body.day_of_week)
      : new Date().getDay();

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return jsonResponse({ success: false, error: "day_of_week must be between 0 and 6" }, 400);
    }

    let planId = body.plan_id || null;
    if (!planId) {
      const { data: activePlan, error: activePlanError } = await supabase
        .from("user_nutrition_plans")
        .select("id")
        .eq("user_id", authData.user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (activePlanError || !activePlan) {
        return jsonResponse({ success: false, error: "No active nutrition plan found" }, 404);
      }
      planId = activePlan.id;
    } else {
      const { data: ownedPlan, error: ownedPlanError } = await supabase
        .from("user_nutrition_plans")
        .select("id")
        .eq("id", planId)
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (ownedPlanError || !ownedPlan) {
        return jsonResponse({ success: false, error: "Invalid plan ownership" }, 403);
      }
    }

    const changedMealIds: string[] = [];

    for (const meal of body.meals) {
      if (!["breakfast", "lunch", "dinner", "snack"].includes(meal.meal_slot)) {
        continue;
      }

      const normalizedItems = (meal.items || [])
        .map((item) => {
          const grams = Number(item.grams || item.quantity_value || 0);
          if (!Number.isFinite(grams) || grams <= 0) return null;

          return {
            food_item_id: item.food_item_id || null,
            item_name: item.item_name || "Custom Item",
            quantity_value: round1(Number(item.quantity_value || grams)),
            quantity_unit: item.quantity_unit || "g",
            grams: round1(grams),
            calories: round1(Number(item.calories || 0)),
            protein: round1(Number(item.protein || 0)),
            carbs: round1(Number(item.carbs || 0)),
            fat: round1(Number(item.fat || 0)),
            fiber: round1(Number(item.fiber || 0)),
          };
        })
        .filter(Boolean) as Array<{
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

      const resolvedCalories = normalizedItems.length ? Math.round(totals.calories) : Math.round(Number(meal.target_calories || 0));
      const resolvedProtein = normalizedItems.length ? round1(totals.protein) : round1(Number(meal.target_protein || 0));
      const resolvedCarbs = normalizedItems.length ? round1(totals.carbs) : round1(Number(meal.target_carbs || 0));
      const resolvedFat = normalizedItems.length ? round1(totals.fat) : round1(Number(meal.target_fat || 0));

      const { data: existingMeal } = await supabase
        .from("user_nutrition_plan_meals")
        .select("id")
        .eq("plan_id", planId)
        .eq("day_of_week", dayOfWeek)
        .eq("meal_slot", meal.meal_slot)
        .maybeSingle();

      let mealId = existingMeal?.id;

      if (mealId) {
        const { error: updateMealError } = await supabase
          .from("user_nutrition_plan_meals")
          .update({
            name: meal.name,
            description: meal.description || null,
            target_calories: resolvedCalories,
            target_protein: resolvedProtein,
            target_carbs: resolvedCarbs,
            target_fat: resolvedFat,
            prep_time_min: Number(meal.prep_time_min || 15),
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
            meal_slot: meal.meal_slot,
            name: meal.name,
            description: meal.description || null,
            target_calories: resolvedCalories,
            target_protein: resolvedProtein,
            target_carbs: resolvedCarbs,
            target_fat: resolvedFat,
            prep_time_min: Number(meal.prep_time_min || 15),
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
          name: meal.name,
          description: meal.description || "Customized by user",
          target_calories: resolvedCalories,
          target_protein: resolvedProtein,
          target_carbs: resolvedCarbs,
          target_fat: resolvedFat,
          prep_time_min: Number(meal.prep_time_min || 15),
          source: "user",
          is_active: true,
        })
        .select("id")
        .single();

      if (variantError || !variant) {
        return jsonResponse({ success: false, error: variantError?.message || "Failed to create variant" }, 500);
      }

      if (normalizedItems.length) {
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

      changedMealIds.push(mealId);
    }

    return jsonResponse({
      success: true,
      plan_id: planId,
      day_of_week: dayOfWeek,
      changed_meal_ids: changedMealIds,
    });
  } catch (error) {
    const err = error as Error;
    console.error("[apply-meal-plan-batch-change]", err);
    return jsonResponse({ success: false, error: err.message || "Internal error" }, 500);
  }
});
