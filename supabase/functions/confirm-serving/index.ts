// supabase/functions/confirm-serving/index.ts
// Purpose: When a barcode item has per-serving nutrition but missing grams-per-serving,
// the client calls this function with grams_per_serving to normalize the item to per-100g.
//
// Security: uses service role inside Supabase Edge runtime via Deno env.
// Client should call with anon key + user auth; function uses SERVICE_ROLE_KEY internally
// only for DB update.
//
// Expected request JSON:
// {
//   "food_item_id": "uuid",            // preferred
//   "barcode": "0123456789012",        // optional alternative lookup
//   "grams_per_serving": 36            // required, > 0
// }
//
// Returns:
// { success: true, food_item_id, updated: {...} }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { verifyClerkRequest } from "../_shared/clerkAuth.ts";

type ReqBody = {
  food_item_id?: string;
  barcode?: string;
  grams_per_serving: number;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      // CORS (adjust if you lock down origins)
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

async function requireUser(req: Request, supabaseUrl: string) {
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("ANON_KEY");
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!anonKey || !authHeader) {
    return { user: null, error: "Unauthorized" };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await verifyClerkRequest(req);
  if (error || !data.user) {
    return { user: null, error: "Unauthorized" };
  }

  return { user: data.user, error: null };
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function scalePerServingToPer100g(perServing: number, gramsPerServing: number): number {
  // per 100g = perServing * (100 / gramsPerServing)
  return perServing * (100 / gramsPerServing);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as Partial<ReqBody>;
    const gramsPerServing = toNumber(body.grams_per_serving);

    if (!gramsPerServing || gramsPerServing <= 0 || gramsPerServing > 5000) {
      return jsonResponse(
        { success: false, error: "grams_per_serving must be a number between 1 and 5000" },
        400,
      );
    }

    const foodItemId = body.food_item_id?.trim();
    const barcode = body.barcode?.trim();

    if (!foodItemId && !barcode) {
      return jsonResponse({ success: false, error: "food_item_id or barcode is required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ success: false, error: "Missing Supabase env vars" }, 500);
    }

    const auth = await requireUser(req, supabaseUrl);
    if (!auth.user) {
      return jsonResponse({ success: false, error: auth.error }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1) Load the food item
    let foodRow: any = null;

    if (foodItemId) {
      const { data, error } = await admin
        .from("food_items")
        .select("*")
        .eq("id", foodItemId)
        .maybeSingle();
      if (error) throw error;
      foodRow = data;
    } else if (barcode) {
      const { data, error } = await admin
        .from("food_items")
        .select("*")
        .eq("barcode", barcode)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      foodRow = data;
    }

    if (!foodRow) {
      return jsonResponse({ success: false, error: "Food item not found" }, 404);
    }

    if (foodRow.created_by_user_id !== auth.user.id) {
      return jsonResponse({ success: false, error: "Food item is not user-owned" }, 403);
    }

    // 2) We require per-serving macros to exist to normalize
    const caloriesServing = toNumber(foodRow.calories_per_serving);
    const proteinServing = toNumber(foodRow.protein_g_per_serving);
    const carbsServing = toNumber(foodRow.carbs_g_per_serving);
    const fatServing = toNumber(foodRow.fat_g_per_serving);

    // At least calories + one macro should exist to proceed
    const anyMacro =
      proteinServing !== null || carbsServing !== null || fatServing !== null;

    if (caloriesServing === null && !anyMacro) {
      return jsonResponse(
        { success: false, error: "Food item is missing per-serving nutrition fields" },
        400,
      );
    }

    // 3) Compute per-100g
    const calories100 = caloriesServing !== null
      ? scalePerServingToPer100g(caloriesServing, gramsPerServing)
      : null;

    const protein100 = proteinServing !== null
      ? scalePerServingToPer100g(proteinServing, gramsPerServing)
      : null;

    const carbs100 = carbsServing !== null
      ? scalePerServingToPer100g(carbsServing, gramsPerServing)
      : null;

    const fat100 = fatServing !== null
      ? scalePerServingToPer100g(fatServing, gramsPerServing)
      : null;

    // Optional: if fiber/sugar exist per-serving
    const fiberServing = toNumber(foodRow.fiber_g_per_serving);
    const sugarServing = toNumber(foodRow.sugar_g_per_serving);
    const sodiumServingMg = toNumber(foodRow.sodium_mg_per_serving);

    const fiber100 = fiberServing !== null ? scalePerServingToPer100g(fiberServing, gramsPerServing) : null;
    const sugar100 = sugarServing !== null ? scalePerServingToPer100g(sugarServing, gramsPerServing) : null;
    const sodium100Mg = sodiumServingMg !== null ? scalePerServingToPer100g(sodiumServingMg, gramsPerServing) : null;

    // 4) Update row
    const updatePayload: Record<string, any> = {
      serving_size_g: gramsPerServing,
      calories_per_100g: calories100,
      protein_g_per_100g: protein100,
      carbs_g_per_100g: carbs100,
      fat_g_per_100g: fat100,
      fiber_g_per_100g: fiber100,
      sugar_g_per_100g: sugar100,
      sodium_mg_per_100g: sodium100Mg,
      needs_serving_confirm: false,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updError } = await admin
      .from("food_items")
      .update(updatePayload)
      .eq("id", foodRow.id)
      .select("*")
      .single();

    if (updError) throw updError;

    return jsonResponse({
      success: true,
      food_item_id: updated.id,
      updated,
    });
  } catch (err) {
    console.error("confirm-serving error:", err);
    return jsonResponse(
      { success: false, error: (err as Error)?.message ?? "Unknown error" },
      500,
    );
  }
});
