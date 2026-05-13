import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

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

async function requireUser(request: Request, supabaseUrl: string) {
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("ANON_KEY");
  const authHeader = request.headers.get("Authorization") ?? "";
  if (!anonKey || !authHeader) {
    return { user: null, error: "Unauthorized" };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) {
    return { user: null, error: "Unauthorized" };
  }

  return { user: data.user, error: null };
}

function num(value: unknown, fallback?: number) {
  const parsed = typeof value === "string" ? Number(value) : value as number;
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return fallback;
}

function isMissingColumnError(error: unknown, columnName: string) {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error && typeof error.message === "string"
    ? error.message
    : "";
  return message.includes(`column ${columnName} does not exist`) ||
    message.includes(`column "${columnName}" does not exist`);
}

async function findFirstMatchingFoodId(
  supabase: any,
  filters: {
    barcode?: string | null;
    provider?: "usda_fdc" | "openfoodfacts";
    name?: string;
    brand?: string | null;
  },
) {
  const buildQuery = (filterToSharedRows: boolean) => {
    let query = supabase
    .from("food_items")
    .select("id")
    .limit(5);

    if (filterToSharedRows) {
      query = query.is("created_by_user_id", null);
    }

    if (filters.barcode) {
      query = query.eq("barcode", filters.barcode);
    }

    if (filters.provider) {
      query = query.eq("source", filters.provider);
    }

    if (filters.name) {
      query = query.eq("name", filters.name);
    }

    if (filters.brand === null) {
      query = query.is("brand", null);
    } else if (filters.brand) {
      query = query.eq("brand", filters.brand);
    }

    return query;
  };

  let { data, error } = await buildQuery(true);

  if (error && isMissingColumnError(error, "created_by_user_id")) {
    ({ data, error } = await buildQuery(false));
  }

  if (error) {
    throw error;
  }

  return data?.[0]?.id ?? null;
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase service role is not configured");
    }

    const auth = await requireUser(request, supabaseUrl);
    if (!auth.user) {
      return jsonResponse({ ok: false, error: auth.error }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await request.json();
    const provider = body?.provider;
    const externalId = String(body?.externalId ?? "").trim();
    const name = String(body?.name ?? "").trim();

    if (
      (provider !== "usda_fdc" && provider !== "openfoodfacts") || !externalId ||
      !name
    ) {
      return jsonResponse({ ok: false, error: "Invalid external food payload" }, 400);
    }

    const barcode = body?.barcode ? String(body.barcode).trim() : null;

    if (barcode) {
      const existingByBarcodeId = await findFirstMatchingFoodId(supabase, {
        barcode,
      });

      if (existingByBarcodeId) {
        return jsonResponse({ ok: true, foodItemId: existingByBarcodeId });
      }
    }

    const brand = typeof body?.brand === "string" ? body.brand.trim() || null : null;
    const existingByNameBrandId = await findFirstMatchingFoodId(supabase, {
      provider,
      name,
      brand,
    });

    if (existingByNameBrandId) {
      return jsonResponse({ ok: true, foodItemId: existingByNameBrandId });
    }

    const servingSizeG = num(body?.servingSizeG, 100) ?? 100;
    const servingDescription = typeof body?.servingDescription === "string" &&
        body.servingDescription.trim().length > 0
      ? body.servingDescription.trim()
      : `${Math.round(servingSizeG)}g`;

    const insertPayload: Record<string, unknown> = {
      name,
      brand,
      category: "imported",
      calories_per_100g: num(body?.caloriesPer100g, 0) ?? 0,
      protein_per_100g: num(body?.proteinPer100g, 0) ?? 0,
      carbs_per_100g: num(body?.carbsPer100g, 0) ?? 0,
      fat_per_100g: num(body?.fatPer100g, 0) ?? 0,
      serving_size_g: servingSizeG,
      serving_description: servingDescription,
      barcode,
      source: provider,
      image_url: typeof body?.imageUrl === "string" ? body.imageUrl.trim() || null : null,
      is_verified: false,
      created_by_user_id: auth.user.id,
      external_source_id: `${provider}:${externalId}`,
    };

    let { data: insertedFood, error: insertError } = await supabase
      .from("food_items")
      .insert(insertPayload)
      .select("id")
      .single();

    if (
      insertError &&
      (isMissingColumnError(insertError, "created_by_user_id") ||
        isMissingColumnError(insertError, "external_source_id"))
    ) {
      const legacyPayload = { ...insertPayload };
      delete legacyPayload.created_by_user_id;
      delete legacyPayload.external_source_id;

      ({ data: insertedFood, error: insertError } = await supabase
        .from("food_items")
        .insert(legacyPayload)
        .select("id")
        .single());
    }

    if (insertError || !insertedFood) {
      console.error("upsert-external-food-item insert error:", insertError);
      const fallbackId = await findFirstMatchingFoodId(supabase, {
        barcode,
        provider,
        name,
        brand,
      });

      if (fallbackId) {
        return jsonResponse({ ok: true, foodItemId: fallbackId });
      }

      throw insertError ?? new Error("Insert failed");
    }

    return jsonResponse({ ok: true, foodItemId: insertedFood.id });
  } catch (error) {
    console.error("upsert-external-food-item error:", error);
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : "Unexpected import error",
    }, 500);
  }
});
