// supabase/functions/barcode-lookup/index.ts
// Deno + Supabase Edge Function
//
// Purpose:
// - Accept a UPC/EAN barcode
// - Try OpenFoodFacts first
// - Fallback to USDA FoodData Central (Branded)
// - Normalize to MetriqFit per-100g macros
// - Cache/upsert into `food_items` table
//
// Deploy name suggestion: "barcode-lookup"
//
// Required secrets (Supabase Project -> Edge Functions -> Secrets):
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - USDA_FDC_API_KEY (optional but recommended for fallback)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type NormalizedFood = {
  source: "openfoodfacts" | "usda_fdc";
  barcode: string;
  name?: string;
  brand?: string;
  imageUrl?: string;

  // Canonical nutrition (per 100g). Store these.
  kcal_100g?: number;
  protein_g_100g?: number;
  carbs_g_100g?: number;
  fat_g_100g?: number;

  // Meta
  confidence?: number; // 0..1 (optional; OFF doesn’t provide, you can infer)
  needs_manual_review?: boolean;
  warnings?: string[];
  raw?: unknown; // keep for debugging; consider stripping in prod
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function cleanBarcode(input: string): string {
  return String(input ?? "").replace(/\D/g, "");
}

function num(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : undefined;
}

function round1(n?: number) {
  if (n === undefined) return undefined;
  return Math.round(n * 10) / 10;
}

function round0(n?: number) {
  if (n === undefined) return undefined;
  return Math.round(n);
}

async function tryCacheByBarcode(supabase: any, barcode: string) {
  const { data, error } = await supabase
    .from("food_items")
    .select(
      "id, source, barcode, name, brand, image_url, kcal_100g, protein_g_100g, carbs_g_100g, fat_g_100g, updated_at",
    )
    .eq("barcode", barcode)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

async function upsertFoodItem(supabase: any, food: NormalizedFood) {
  // Keep raw small if you store it; you can omit or store only a subset.
  const row = {
    source: food.source,
    barcode: food.barcode,
    name: food.name ?? null,
    brand: food.brand ?? null,
    image_url: food.imageUrl ?? null,
    kcal_100g: food.kcal_100g ?? null,
    protein_g_100g: food.protein_g_100g ?? null,
    carbs_g_100g: food.carbs_g_100g ?? null,
    fat_g_100g: food.fat_g_100g ?? null,
    raw: food.raw ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("food_items")
    .upsert(row, { onConflict: "barcode" })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/** OpenFoodFacts: product by barcode */
async function fetchOpenFoodFacts(barcode: string): Promise<NormalizedFood | null> {
  const fields = [
    "code",
    "product_name",
    "brands",
    "image_url",
    "nutriments",
  ].join(",");

  const url =
    `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${
      encodeURIComponent(fields)
    }`;

  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      // Use a real contact email/domain for your app
      "User-Agent": "MetriqFit/1.0 (support@metriqfit.com)",
    },
  });

  if (!res.ok) return null;

  const json = await res.json();

  // OFF uses status: 1 = found, 0 = not found
  if (!json || json.status !== 1 || !json.product) return null;

  const p = json.product;
  const n = (p.nutriments ?? {}) as Record<string, unknown>;

  // Per 100g macros commonly present in OFF nutriments
  const kcal = num(n["energy-kcal_100g"]);
  const protein = num(n["proteins_100g"]);
  const carbs = num(n["carbohydrates_100g"]);
  const fat = num(n["fat_100g"]);

  const warnings: string[] = [];
  let needs_manual_review = false;

  // If any macro is missing, flag for manual review (still return what we have)
  if (
    kcal === undefined || protein === undefined || carbs === undefined ||
    fat === undefined
  ) {
    needs_manual_review = true;
    warnings.push("Missing one or more nutriments per 100g from OpenFoodFacts.");
  }

  return {
    source: "openfoodfacts",
    barcode,
    name: p.product_name,
    brand: p.brands,
    imageUrl: p.image_url,
    kcal_100g: round0(kcal),
    protein_g_100g: round1(protein),
    carbs_g_100g: round1(carbs),
    fat_g_100g: round1(fat),
    confidence: 0.8,
    needs_manual_review,
    warnings: warnings.length ? warnings : undefined,
    raw: json,
  };
}

/**
 * USDA FoodData Central fallback
 * Strategy:
 * - Search branded foods by the barcode string
 * - Pick first hit where gtinUpc matches, else first branded hit
 * - Prefer labelNutrients when available (usually per serving)
 * - Convert to per-100g if servingSizeUnit === 'g' and servingSize present
 */
async function fetchUsdaFdc(barcode: string, apiKey?: string): Promise<NormalizedFood | null> {
  if (!apiKey) return null;

  const url = "https://api.nal.usda.gov/fdc/v1/foods/search";

  const body = {
    query: barcode,
    dataType: ["Branded"],
    pageSize: 10,
    pageNumber: 1,
  };

  const res = await fetch(`${url}?api_key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) return null;

  const json = await res.json();
  const foods = (json?.foods ?? []) as any[];
  if (!foods.length) return null;

  const exact = foods.find((f) => String(f.gtinUpc ?? "") === barcode);
  const f = exact ?? foods[0];

  const name = f.description ?? f.lowercaseDescription ?? f.brandOwner ?? undefined;
  const brand = f.brandOwner ?? f.brandName ?? undefined;
  const imageUrl = f?.foodPortions?.[0]?.imageUrl ?? undefined; // often missing

  // Prefer labelNutrients (common in branded results)
  const ln = f.labelNutrients ?? {};
  const kcalServing = num(ln.calories?.value);
  const proteinServing = num(ln.protein?.value);
  const carbsServing = num(ln.carbohydrates?.value);
  const fatServing = num(ln.fat?.value);

  const servingSize = num(f.servingSize);
  const servingUnit = String(f.servingSizeUnit ?? "").toLowerCase();

  const warnings: string[] = [];
  let needs_manual_review = false;

  // Convert per serving -> per 100g when serving is in grams
  let factor: number | undefined;
  if (servingSize && servingSize > 0 && servingUnit === "g") {
    factor = 100 / servingSize;
  } else {
    needs_manual_review = true;
    warnings.push(
      "USDA FDC branded nutrients are typically per serving. Could not convert to per 100g because servingSizeUnit was not 'g'.",
    );
  }

  // If we don't have label nutrients, try foodNutrients list (may exist)
  let kcal = kcalServing;
  let protein = proteinServing;
  let carbs = carbsServing;
  let fat = fatServing;

  if (
    kcal === undefined || protein === undefined || carbs === undefined ||
    fat === undefined
  ) {
    const nutrients = (f.foodNutrients ?? []) as any[];
    const get = (needle: string) =>
      nutrients.find((x) =>
        String(x.nutrientName ?? "").toLowerCase().includes(needle)
      )?.value;

    kcal ??= num(get("energy"));
    protein ??= num(get("protein"));
    carbs ??= num(get("carbohydrate"));
    fat ??= num(get("total lipid"));
  }

  if (
    kcal === undefined || protein === undefined || carbs === undefined ||
    fat === undefined
  ) {
    needs_manual_review = true;
    warnings.push("Missing one or more nutrients from USDA FDC response.");
  }

  const kcal100 = factor ? (kcal !== undefined ? kcal * factor : undefined) : undefined;
  const p100 = factor ? (protein !== undefined ? protein * factor : undefined) : undefined;
  const c100 = factor ? (carbs !== undefined ? carbs * factor : undefined) : undefined;
  const f100 = factor ? (fat !== undefined ? fat * factor : undefined) : undefined;

  return {
    source: "usda_fdc",
    barcode,
    name,
    brand,
    imageUrl,
    kcal_100g: round0(kcal100),
    protein_g_100g: round1(p100),
    carbs_g_100g: round1(c100),
    fat_g_100g: round1(f100),
    confidence: exact ? 0.75 : 0.6,
    needs_manual_review,
    warnings: warnings.length ? warnings : undefined,
    raw: json,
  };
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") return jsonResponse({ error: "Use POST" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const USDA_FDC_API_KEY = Deno.env.get("USDA_FDC_API_KEY") ?? undefined;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  // Optional: Require auth (recommended). Comment out if you want public access.
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // Enforce Elite access server-side for barcode scanning.
  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("plan_type, status, updated_at")
    .eq("user_id", authData.user.id)
    .in("status", ["active", "trial", "grace_period"])
    .order("updated_at", { ascending: false })
    .maybeSingle();

  if (subscriptionError) {
    console.error("Subscription lookup error:", subscriptionError);
    return jsonResponse({ error: "Failed to verify subscription" }, 500);
  }

  const isElite = Boolean(subscription && subscription.plan_type !== "free");
  if (!isElite) {
    return jsonResponse(
      {
        error: "MetriqFit Elite required",
        code: "ELITE_REQUIRED",
      },
      402,
    );
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch (_) {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const barcode = cleanBarcode(payload?.barcode);
  if (!barcode || barcode.length < 8) {
    return jsonResponse({ error: "Invalid barcode" }, 400);
  }

  // 1) Cache hit (optional but recommended)
  try {
    const cached = await tryCacheByBarcode(supabase, barcode);
    if (cached) {
      return jsonResponse({
        ok: true,
        from_cache: true,
        food: {
          source: cached.source,
          barcode: cached.barcode,
          name: cached.name ?? undefined,
          brand: cached.brand ?? undefined,
          imageUrl: cached.image_url ?? undefined,
          kcal_100g: cached.kcal_100g ?? undefined,
          protein_g_100g: cached.protein_g_100g ?? undefined,
          carbs_g_100g: cached.carbs_g_100g ?? undefined,
          fat_g_100g: cached.fat_g_100g ?? undefined,
        },
      });
    }
  } catch (e) {
    // Cache is optional; don't block lookup if cache fails.
    console.error("Cache lookup error:", e);
  }

  // 2) OFF
  let found: NormalizedFood | null = null;
  try {
    found = await fetchOpenFoodFacts(barcode);
  } catch (e) {
    console.error("OFF fetch error:", e);
  }

  // 3) USDA fallback
  if (!found) {
    try {
      found = await fetchUsdaFdc(barcode, USDA_FDC_API_KEY);
    } catch (e) {
      console.error("USDA FDC fetch error:", e);
    }
  }

  if (!found) {
    return jsonResponse({ ok: false, found: false, barcode }, 200);
  }

  // 4) Upsert cache
  try {
    const saved = await upsertFoodItem(supabase, found);
    return jsonResponse({
      ok: true,
      found: true,
      from_cache: false,
      food: {
        source: found.source,
        barcode: found.barcode,
        name: found.name,
        brand: found.brand,
        imageUrl: found.imageUrl,
        kcal_100g: found.kcal_100g,
        protein_g_100g: found.protein_g_100g,
        carbs_g_100g: found.carbs_g_100g,
        fat_g_100g: found.fat_g_100g,
        needs_manual_review: found.needs_manual_review ?? false,
        warnings: found.warnings ?? [],
      },
      saved_row: {
        id: saved.id,
        updated_at: saved.updated_at,
      },
    });
  } catch (e) {
    console.error("Upsert error:", e);
    // Still return found result even if caching fails.
    return jsonResponse({
      ok: true,
      found: true,
      from_cache: false,
      food: found,
      cache_write_failed: true,
    });
  }
});
