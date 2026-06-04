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

type GoalType = "cut" | "bulk" | "high_protein" | "low_sodium" | "balanced";

function parseMenuText(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 3)
    .slice(0, 120);
}

function extractPrice(line: string) {
  const match = line.match(/\$(\d+(?:\.\d{1,2})?)/);
  return match ? Number(match[1]) : null;
}

function estimateMacros(name: string) {
  const n = name.toLowerCase();

  let calories = 500;
  let protein = 25;
  let carbs = 40;
  let fat = 18;
  let sodium = 850;

  if (/(salad|greens|bowl)/.test(n)) {
    calories -= 120;
    carbs -= 10;
    sodium -= 120;
  }

  if (/(fried|crispy|breaded)/.test(n)) {
    calories += 220;
    fat += 16;
    sodium += 220;
  }

  if (/(grilled|roasted|seared|baked)/.test(n)) {
    calories -= 70;
    fat -= 4;
  }

  if (/(chicken|turkey|salmon|tuna|shrimp|steak|beef|tofu|egg)/.test(n)) {
    protein += 18;
  }

  if (/(fries|nachos|pasta|burger bun|pizza|rice|potato)/.test(n)) {
    carbs += 25;
    calories += 150;
  }

  if (/(cream|alfredo|cheese|mayo|aioli|butter)/.test(n)) {
    fat += 12;
    calories += 120;
    sodium += 120;
  }

  if (/(soup|ramen|soy|teriyaki)/.test(n)) {
    sodium += 450;
  }

  return {
    calories: Math.max(120, Math.round(calories)),
    protein: Math.max(5, round1(protein)),
    carbs: Math.max(0, round1(carbs)),
    fat: Math.max(0, round1(fat)),
    sodiumMg: Math.max(80, Math.round(sodium)),
  };
}

function getModificationSuggestions(name: string) {
  const n = name.toLowerCase();
  const suggestions: string[] = [];

  if (/(sauce|aioli|dressing|teriyaki)/.test(n)) suggestions.push("Ask for sauce on the side.");
  if (/(fried|crispy|breaded)/.test(n)) suggestions.push("Request grilled preparation if available.");
  if (/(fries|chips)/.test(n)) suggestions.push("Swap fries/chips for side salad or vegetables.");
  if (/(burger|sandwich)/.test(n)) suggestions.push("Go open-face or remove top bun to reduce carbs.");
  if (/(soup|ramen|soy)/.test(n)) suggestions.push("Ask for reduced sodium broth/sauce.");
  if (!suggestions.length) suggestions.push("Keep portions moderate and prioritize protein first.");

  return suggestions;
}

function buildScore(args: {
  goals: GoalType[];
  macros: { calories: number; protein: number; carbs: number; fat: number; sodiumMg: number };
  price: number | null;
}) {
  const { goals, macros, price } = args;
  let score = 50;

  if (goals.includes("high_protein")) score += Math.min(20, macros.protein * 0.4);
  if (goals.includes("cut")) score += Math.max(-18, 700 - macros.calories) * 0.03;
  if (goals.includes("bulk")) score += Math.max(-14, macros.calories - 420) * 0.03;
  if (goals.includes("low_sodium")) score += Math.max(-20, 1400 - macros.sodiumMg) * 0.02;
  if (goals.includes("balanced")) {
    const ratioPenalty = Math.abs(macros.protein * 4 + macros.carbs * 4 + macros.fat * 9 - macros.calories);
    score += Math.max(-10, 10 - ratioPenalty * 0.02);
  }

  if (price != null) {
    score += Math.max(-6, 20 - price) * 0.1;
  }

  return round1(score);
}

async function extractMenuTextFromImage(openAiKey: string, base64Image: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Extract menu item lines from the image. Return JSON { lines: string[] }.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract readable menu item lines." },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to OCR menu image (${response.status})`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error("No OCR content returned");

  const parsed = JSON.parse(content);
  return (parsed?.lines || []).map((line: unknown) => String(line).trim()).filter((line: string) => line.length > 0);
}

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

async function applyToMeal(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  mealId: string,
  selection: {
    name: string;
    modifications: string[];
    macros: { calories: number; protein: number; carbs: number; fat: number };
  },
) {
  const { data: meal, error: mealError } = await supabase
    .from("user_nutrition_plan_meals")
    .select("id, plan_id, meal_slot")
    .eq("id", mealId)
    .maybeSingle();

  if (mealError || !meal) throw new Error("Invalid plan meal selected");

  const { data: plan } = await supabase
    .from("user_nutrition_plans")
    .select("id")
    .eq("id", meal.plan_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!plan) throw new Error("Meal does not belong to user");

  const description = `Menu suggestion applied. ${selection.modifications.join(" ")}`;

  const { data: variant, error: variantError } = await supabase
    .from("user_nutrition_plan_meal_variants")
    .insert({
      plan_meal_id: meal.id,
      variant_type: "user_custom",
      name: selection.name,
      description,
      target_calories: selection.macros.calories,
      target_protein: selection.macros.protein,
      target_carbs: selection.macros.carbs,
      target_fat: selection.macros.fat,
      prep_time_min: 0,
      source: "user",
      is_active: true,
    })
    .select("id")
    .single();

  if (variantError || !variant) throw new Error(variantError?.message || "Failed to create variant");

  const { error: updateMealError } = await supabase
    .from("user_nutrition_plan_meals")
    .update({
      selected_variant_id: variant.id,
      name: selection.name,
      description,
      target_calories: selection.macros.calories,
      target_protein: selection.macros.protein,
      target_carbs: selection.macros.carbs,
      target_fat: selection.macros.fat,
      is_user_modified: true,
    })
    .eq("id", meal.id);

  if (updateMealError) throw new Error(updateMealError.message);

  return meal.id;
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

    const { data: authData, error: authError } = await verifyClerkRequest(req);
    if (authError || !authData?.user) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const isElite = await isEliteUser(supabase, authData.user.id);
    if (!isElite) return jsonResponse({ success: false, error: "ELITE_REQUIRED" }, 403);

    const body = await req.json() as {
      menu_text?: string;
      image_base64?: string;
      goals?: GoalType[];
      constraints?: {
        allergies?: string[];
        refused_foods?: string[];
      };
      apply_to_meal_id?: string;
      selected_item_name?: string;
      selected_index?: number;
    };

    const goals = (body.goals || ["balanced"]) as GoalType[];

    let inputType: "text" | "photo" = "text";
    let lines: string[] = [];

    if (body.menu_text?.trim()) {
      lines = parseMenuText(body.menu_text);
    } else if (body.image_base64?.trim()) {
      inputType = "photo";
      const key = Deno.env.get("OPENAI_API_KEY");
      if (!key) return jsonResponse({ success: false, error: "Photo mode unavailable: OPENAI_API_KEY missing" }, 500);
      lines = await extractMenuTextFromImage(key, body.image_base64);
    } else {
      return jsonResponse({ success: false, error: "menu_text or image_base64 is required" }, 400);
    }

    if (!lines.length) {
      return jsonResponse({ success: false, error: "No menu lines found" }, 400);
    }

    const allergyWords = (body.constraints?.allergies || []).map((v) => String(v).toLowerCase());
    const refusedWords = (body.constraints?.refused_foods || []).map((v) => String(v).toLowerCase());

    const candidates = lines
      .map((line) => {
        const lower = line.toLowerCase();
        const blockedByAllergy = allergyWords.some((word) => word && lower.includes(word));
        const blockedByRefusal = refusedWords.some((word) => word && lower.includes(word));
        const blocked = blockedByAllergy || blockedByRefusal;

        const macros = estimateMacros(line);
        const price = extractPrice(line);
        const score = blocked ? -999 : buildScore({ goals, macros, price });

        return {
          name: line,
          score,
          price,
          blocked,
          macros,
          modifications: getModificationSuggestions(line),
        };
      })
      .filter((item) => !item.blocked)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    if (!candidates.length) {
      return jsonResponse({ success: false, error: "All candidate meals conflict with your constraints" }, 400);
    }

    const bestChoice = candidates[0];
    const runnerUps = candidates.slice(1, 4);

    const selectedName = body.selected_item_name || bestChoice.name;
    const selectedByName = candidates.find((item) => item.name === selectedName);
    const selectedByIndex = Number.isFinite(Number(body.selected_index))
      ? candidates[Math.max(0, Math.min(candidates.length - 1, Number(body.selected_index)))]
      : null;
    const selected = selectedByName || selectedByIndex || bestChoice;

    let appliedMealId: string | null = null;
    if (body.apply_to_meal_id) {
      appliedMealId = await applyToMeal(supabase, authData.user.id, body.apply_to_meal_id, {
        name: selected.name,
        modifications: selected.modifications,
        macros: {
          calories: selected.macros.calories,
          protein: selected.macros.protein,
          carbs: selected.macros.carbs,
          fat: selected.macros.fat,
        },
      });
    }

    await supabase.from("menu_scan_sessions").insert({
      user_id: authData.user.id,
      input_type: inputType,
      goal_context_json: { goals },
      constraints_json: body.constraints || {},
      ranked_items_json: candidates,
      selected_item_json: selected,
      explanations_json: {
        scoring: "Goal-weighted heuristic scoring with macro and sodium estimation.",
      },
      applied_plan_meal_id: appliedMealId,
    });

    await supabase.rpc("increment_ai_usage", {
      p_user_id: authData.user.id,
      p_usage_type: "menu_scans",
    });

    return jsonResponse({
      success: true,
      bestChoice,
      runnerUps,
      modifications: selected.modifications,
      rationale: {
        summary: `Ranked for goals: ${goals.join(", ")}`,
        note: "Estimates are approximate. Confirm portions when logging.",
      },
      applied: Boolean(appliedMealId),
      appliedMealId,
    });
  } catch (error) {
    const err = error as Error;
    console.error("[menu-scan-rank]", err);
    return jsonResponse({ success: false, error: err.message || "Internal error" }, 500);
  }
});
