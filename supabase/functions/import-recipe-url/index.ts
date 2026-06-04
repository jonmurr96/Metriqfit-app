import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { verifyClerkRequest } from "../_shared/clerkAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_HTML_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function normalizeUrl(url: string) {
  const parsed = new URL(url);
  parsed.hash = "";
  return parsed.toString();
}

function isPrivateIp(hostname: string) {
  if (/^127\./.test(hostname)) return true;
  if (/^169\.254\./.test(hostname)) return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(hostname)) return true;
  if (hostname === "0.0.0.0" || hostname === "::1") return true;
  if (hostname.includes(":")) {
    const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (normalized === "::1" || normalized === "::" || normalized.startsWith("fe80:")) return true;
    if (/^f[cd][0-9a-f]{2}:/.test(normalized)) return true;
  }
  return false;
}

function validateSourceUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http/https URLs are supported");
  }

  const host = parsed.hostname.toLowerCase();
  if (
    ["localhost", "localhost.localdomain", "metadata.google.internal"].includes(host)
    || host.endsWith(".localhost")
    || host.endsWith(".local")
    || host.endsWith(".internal")
  ) {
    throw new Error("Localhost URLs are not allowed");
  }

  if (isPrivateIp(host)) {
    throw new Error("Private network URLs are not allowed");
  }

  return parsed;
}

async function readTextWithLimit(response: Response) {
  const contentLength = Number(response.headers.get("content-length") || "0");
  if (contentLength && contentLength > MAX_HTML_BYTES) {
    throw new Error("Recipe page too large to process");
  }

  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).length > MAX_HTML_BYTES) {
      throw new Error("Recipe page too large to process");
    }
    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    received += value.byteLength;
    if (received > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new Error("Recipe page too large to process");
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(merged);
}

async function fetchRecipeHtml(sourceUrl: string, signal: AbortSignal) {
  let current = validateSourceUrl(sourceUrl);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetch(current.toString(), {
      method: "GET",
      redirect: "manual",
      signal,
      headers: {
        "User-Agent": "MetriqFitRecipeImporter/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Recipe page redirected without a Location header");
      current = validateSourceUrl(new URL(location, current).toString());
      continue;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch recipe page (${response.status})`);
    }

    return readTextWithLimit(response);
  }

  throw new Error("Recipe page redirected too many times");
}

async function sha256Hex(input: string) {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function extractJsonLdBlocks(html: string): string[] {
  const results: string[] = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match = regex.exec(html);
  while (match) {
    results.push(match[1] || "");
    match = regex.exec(html);
  }
  return results;
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function isRecipeType(typeField: unknown) {
  const list = asArray(typeField).map((v) => String(v).toLowerCase());
  return list.includes("recipe");
}

function sanitizeText(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

type ParsedIngredient = {
  original: string;
  quantity: number | null;
  unit: string | null;
  name: string;
  grams_estimate: number;
};

type ExtractedRecipe = {
  parserPath: "jsonld" | "html_heuristic" | "ai_fallback";
  name: string;
  description: string | null;
  servings: string | null;
  ingredients: ParsedIngredient[];
  instructions: string[];
  warnings: string[];
};

function unitToGrams(unit: string | null, quantity: number | null) {
  if (!unit || !quantity) return 100;
  const u = unit.toLowerCase();
  const map: Record<string, number> = {
    g: 1,
    gram: 1,
    grams: 1,
    oz: 28.35,
    ounce: 28.35,
    ounces: 28.35,
    lb: 453.6,
    lbs: 453.6,
    pound: 453.6,
    cup: 240,
    cups: 240,
    tbsp: 15,
    tablespoon: 15,
    tablespoons: 15,
    tsp: 5,
    teaspoon: 5,
    teaspoons: 5,
    ml: 1,
    l: 1000,
  };
  const factor = map[u] || 100;
  return round1(quantity * factor);
}

function parseQuantity(value: string): number | null {
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (/^\d+\/\d+$/.test(cleaned)) {
    const [a, b] = cleaned.split("/").map(Number);
    return b ? a / b : null;
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseIngredientLine(line: string): ParsedIngredient {
  const normalized = sanitizeText(line.replace(/^[-*•]\s*/, ""));
  const match = normalized.match(/^([\d./]+)?\s*([a-zA-Z]+)?\s*(.*)$/);

  const quantity = parseQuantity(match?.[1] || "");
  const unit = match?.[2] ? match[2].toLowerCase() : null;
  const name = sanitizeText(match?.[3] || normalized) || normalized;

  return {
    original: normalized,
    quantity,
    unit,
    name,
    grams_estimate: unitToGrams(unit, quantity),
  };
}

function extractRecipeFromJsonLd(html: string): ExtractedRecipe | null {
  const blocks = extractJsonLdBlocks(html);
  const parsedDocs: any[] = [];

  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block.trim());
      parsedDocs.push(parsed);
    } catch {
      // ignore malformed JSON-LD blocks
    }
  }

  const queue = [...parsedDocs];
  const candidates: any[] = [];

  while (queue.length) {
    const node = queue.shift();
    if (!node) continue;

    if (Array.isArray(node)) {
      queue.push(...node);
      continue;
    }

    if (typeof node === "object") {
      if (isRecipeType(node["@type"])) {
        candidates.push(node);
      }
      if (Array.isArray(node["@graph"])) {
        queue.push(...node["@graph"]);
      }
    }
  }

  const recipe = candidates[0];
  if (!recipe) return null;

  const ingredientsRaw = asArray<string>(recipe.recipeIngredient).map((line) => String(line));
  const instructionsRaw = asArray<any>(recipe.recipeInstructions)
    .map((step) => (typeof step === "string" ? step : step?.text || ""))
    .map((step) => sanitizeText(step))
    .filter(Boolean);

  return {
    parserPath: "jsonld" as const,
    name: sanitizeText(String(recipe.name || "Imported Recipe")),
    description: sanitizeText(String(recipe.description || "")) || null,
    servings: sanitizeText(String(recipe.recipeYield || "")) || null,
    ingredients: ingredientsRaw.map(parseIngredientLine),
    instructions: instructionsRaw,
    warnings: [] as string[],
  };
}

function extractRecipeHeuristic(html: string): ExtractedRecipe {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = sanitizeText(titleMatch?.[1] || "Imported Recipe");

  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

  const lines = cleaned
    .split("\n")
    .map((line) => sanitizeText(line))
    .filter((line) => line.length >= 3 && line.length <= 140);

  const ingredientCandidates = lines
    .filter((line) => /^([\d./]+\s*)?([a-zA-Z]+\s+)?[a-zA-Z]/.test(line))
    .filter((line) => /(cup|cups|tbsp|tsp|oz|gram|grams|ml|lb|lbs|chicken|beef|rice|egg|tofu|turkey|salmon|milk|flour|potato|oats)/i.test(line))
    .slice(0, 25)
    .map(parseIngredientLine);

  const instructions = lines
    .filter((line) => /^(step\s*\d+|\d+\.|mix|combine|bake|cook|stir|heat|serve)/i.test(line))
    .slice(0, 15);

  return {
    parserPath: "html_heuristic" as const,
    name: title || "Imported Recipe",
    description: null,
    servings: null,
    ingredients: ingredientCandidates,
    instructions,
    warnings: ingredientCandidates.length ? [] : ["Could not confidently parse ingredients from this page."],
  };
}

async function aiFallbackParse(openAiKey: string, html: string): Promise<ExtractedRecipe> {
  const snippet = html.slice(0, 14000);

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
          content: "Extract recipe fields from webpage text. Return JSON with name, ingredients[{original,quantity,unit,name,grams_estimate}], instructions[], warnings[].",
        },
        {
          role: "user",
          content: snippet,
        },
      ],
    }),
  });

  if (!response.ok) throw new Error(`AI fallback failed: ${response.status}`);

  const payload = await response.json();
  const raw = payload?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("AI fallback returned no content");

  const parsed = JSON.parse(raw);
  const ingredients = asArray<any>(parsed.ingredients)
    .map((item) => ({
      original: sanitizeText(String(item?.original || item?.name || "")),
      quantity: Number.isFinite(Number(item?.quantity)) ? Number(item.quantity) : null,
      unit: item?.unit ? String(item.unit).toLowerCase() : null,
      name: sanitizeText(String(item?.name || item?.original || "Custom Ingredient")),
      grams_estimate: Number.isFinite(Number(item?.grams_estimate)) ? round1(Number(item.grams_estimate)) : 100,
    }))
    .filter((i) => i.name.length > 0);

  return {
    parserPath: "ai_fallback" as const,
    name: sanitizeText(String(parsed.name || "Imported Recipe")),
    description: null,
    servings: null,
    ingredients,
    instructions: asArray<string>(parsed.instructions).map((s) => sanitizeText(String(s))).filter(Boolean),
    warnings: asArray<string>(parsed.warnings).map((w) => sanitizeText(String(w))).filter(Boolean),
  };
}

async function mapIngredientsToFoods(
  supabase: any,
  ingredients: ParsedIngredient[],
) {
  const mapped = [] as Array<ParsedIngredient & {
    matched_food_item_id: string | null;
    matched_food_name: string | null;
  }>;

  for (const ingredient of ingredients) {
    const search = ingredient.name.split(",")[0].trim().slice(0, 60);

    const { data: food } = await supabase
      .from("food_items")
      .select("id, name")
      .ilike("name", `%${search}%`)
      .order("is_verified", { ascending: false })
      .limit(1)
      .maybeSingle();

    mapped.push({
      ...ingredient,
      matched_food_item_id: typeof food?.id === "string" ? food.id : null,
      matched_food_name: typeof food?.name === "string" ? food.name : null,
    });
  }

  return mapped;
}

async function isEliteUser(supabase: any, userId: string) {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_type, status, expires_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = sub as { plan_type?: string; status?: string; expires_at?: string | null } | null;
  if (!row) return false;
  if (!["elite_monthly", "elite_annual", "elite_lifetime"].includes(String(row.plan_type))) return false;
  if (row.plan_type === "elite_lifetime") return true;
  if (!["active", "trial", "grace_period"].includes(String(row.status))) return false;
  if (row.expires_at) return new Date(row.expires_at) > new Date();
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

  const startedAt = Date.now();

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
    if (!isElite) {
      return jsonResponse({ success: false, error: "ELITE_REQUIRED" }, 403);
    }

    const body = await req.json() as {
      url?: string;
      saveDraft?: boolean;
      existingRecipeId?: string;
    };

    const sourceUrl = String(body.url || "").trim();
    if (!sourceUrl) {
      return jsonResponse({ success: false, error: "url is required" }, 400);
    }

    const parsedUrl = validateSourceUrl(sourceUrl);
    const normalized = normalizeUrl(parsedUrl.toString());
    const normalizedHash = await sha256Hex(normalized);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let html = "";
    try {
      html = await fetchRecipeHtml(normalized, controller.signal);
    } finally {
      clearTimeout(timeout);
    }

    if (!html || html.length < 100) {
      return jsonResponse({ success: false, error: "Recipe page content is empty or unsupported" }, 400);
    }

    let extracted = extractRecipeFromJsonLd(html);

    if (!extracted || !extracted.ingredients.length) {
      extracted = extractRecipeHeuristic(html);
    }

    if (!extracted.ingredients.length) {
      const openAiKey = Deno.env.get("OPENAI_API_KEY");
      if (openAiKey) {
        try {
          extracted = await aiFallbackParse(openAiKey, html);
        } catch (error) {
          extracted.warnings.push(`AI fallback failed: ${(error as Error).message}`);
        }
      }
    }

    const mappedIngredients = await mapIngredientsToFoods(supabase, extracted.ingredients);
    const mappedCount = mappedIngredients.filter((item) => item.matched_food_item_id).length;
    const confidence = mappedIngredients.length
      ? round1((mappedCount / mappedIngredients.length) * 100)
      : 0;

    let savedRecipeId: string | null = null;

    if (body.saveDraft) {
      let recipeId = body.existingRecipeId || null;

      if (recipeId) {
        const { data: ownedRecipe } = await supabase
          .from("recipes")
          .select("id")
          .eq("id", recipeId)
          .eq("user_id", authData.user.id)
          .maybeSingle();

        if (!ownedRecipe) {
          return jsonResponse({ success: false, error: "Invalid existing recipe id" }, 403);
        }

        const { error: updateRecipeError } = await supabase
          .from("recipes")
          .update({
            name: extracted.name,
            description: extracted.description,
            instructions: extracted.instructions.join("\n"),
            source_type: "url_import",
            source_url: normalized,
            source_domain: parsedUrl.hostname,
            import_status: confidence >= 70 ? "parsed" : "needs_review",
            import_confidence: confidence,
          })
          .eq("id", recipeId);

        if (updateRecipeError) {
          return jsonResponse({ success: false, error: updateRecipeError.message }, 500);
        }

        await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
      } else {
        const { data: inserted, error: insertRecipeError } = await supabase
          .from("recipes")
          .insert({
            user_id: authData.user.id,
            name: extracted.name,
            description: extracted.description,
            instructions: extracted.instructions.join("\n"),
            serving_size: 1,
            is_public: false,
            source_type: "url_import",
            source_url: normalized,
            source_domain: parsedUrl.hostname,
            import_status: confidence >= 70 ? "parsed" : "needs_review",
            import_confidence: confidence,
          })
          .select("id")
          .single();

        if (insertRecipeError || !inserted) {
          return jsonResponse({ success: false, error: insertRecipeError?.message || "Failed to save recipe" }, 500);
        }

        recipeId = inserted.id;
      }

      const ingredientRows = mappedIngredients
        .filter((item) => item.matched_food_item_id)
        .map((item) => ({
          recipe_id: recipeId,
          food_item_id: item.matched_food_item_id,
          quantity_grams: round1(item.grams_estimate || 100),
        }));

      if (ingredientRows.length) {
        const { error: ingredientsError } = await supabase
          .from("recipe_ingredients")
          .insert(ingredientRows);

        if (ingredientsError) {
          return jsonResponse({ success: false, error: ingredientsError.message }, 500);
        }
      }

      savedRecipeId = recipeId;
    }

    const parseWarnings = [
      ...extracted.warnings,
      ...(mappedCount < mappedIngredients.length
        ? [`${mappedIngredients.length - mappedCount} ingredients need manual food mapping.`]
        : []),
    ];

    await supabase
      .from("recipe_import_events")
      .upsert({
        user_id: authData.user.id,
        normalized_url_hash: normalizedHash,
        source_url: normalized,
        source_domain: parsedUrl.hostname,
        parser_path: extracted.parserPath,
        parse_warnings_json: parseWarnings,
        parse_result_json: {
          name: extracted.name,
          ingredient_count: mappedIngredients.length,
        },
        error_message: null,
        elapsed_ms: Date.now() - startedAt,
      }, {
        onConflict: "user_id,normalized_url_hash",
      });

    await supabase.rpc("increment_ai_usage", {
      p_user_id: authData.user.id,
      p_usage_type: "recipe_url_imports",
    });

    return jsonResponse({
      success: true,
      draft: {
        name: extracted.name,
        description: extracted.description,
        servings: extracted.servings,
        instructions: extracted.instructions,
        ingredients: mappedIngredients,
      },
      warnings: parseWarnings,
      confidence,
      parserPath: extracted.parserPath,
      savedRecipeId,
    });
  } catch (error) {
    const err = error as Error;
    console.error("[import-recipe-url]", err);
    return jsonResponse({ success: false, error: err.message || "Internal error" }, 500);
  }
});
