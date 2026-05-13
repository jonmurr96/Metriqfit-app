import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type ExternalFoodSearchResult = {
  provider: "usda_fdc" | "openfoodfacts";
  externalId: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  servingSizeG: number | null;
  servingDescription: string | null;
  confidence: number | null;
};

type ProviderName = "openfoodfacts" | "usda";
type ProviderStatus = "ok" | "timeout" | "error";
type SearchCacheStatus = "hit" | "miss" | "stale-fallback";
type SearchMetadata = {
  cacheStatus: SearchCacheStatus;
  providerStatus: Record<ProviderName, ProviderStatus>;
  providerTimingsMs: {
    openfoodfacts?: number;
    usda?: number;
    total: number;
  };
};

type CacheRow = {
  query_key: string;
  normalized_query: string;
  result_limit: number;
  results: ExternalFoodSearchResult[];
  provider_status: Record<ProviderName, ProviderStatus>;
  provider_timings_ms: {
    openfoodfacts?: number;
    usda?: number;
    total?: number;
  };
  expires_at: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPEN_FOOD_FACTS_TIMEOUT_MS = 1500;
const USDA_TIMEOUT_MS = 2200;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

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

function num(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = typeof value === "string" ? Number(value) : value as number;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function round1(value?: number | null) {
  if (value === null || value === undefined) return undefined;
  return Math.round(value * 10) / 10;
}

function round0(value?: number | null) {
  if (value === null || value === undefined) return undefined;
  return Math.round(value);
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeQuery(value: string | null | undefined) {
  return normalizeText(value).replace(/\s+/g, " ");
}

function buildQueryKey(query: string, limit: number) {
  return `${normalizeQuery(query)}::${limit}`;
}

class ProviderTimeoutError extends Error {
  provider: ProviderName;

  constructor(provider: ProviderName, timeoutMs: number) {
    super(`${provider} search timed out after ${timeoutMs}ms`);
    this.name = "ProviderTimeoutError";
    this.provider = provider;
  }
}

function isTimeoutError(error: unknown): error is ProviderTimeoutError {
  return error instanceof ProviderTimeoutError;
}

async function fetchWithTimeout(
  provider: ProviderName,
  input: string,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if ((error instanceof DOMException && error.name === "AbortError") || controller.signal.aborted) {
      throw new ProviderTimeoutError(provider, timeoutMs);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function createAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("search-food-catalog cache disabled: missing Supabase service role config");
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function readCachedSearch(
  supabase: any,
  queryKey: string,
) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("external_food_search_cache")
    .select("query_key, normalized_query, result_limit, results, provider_status, provider_timings_ms, expires_at")
    .eq("query_key", queryKey)
    .maybeSingle();

  if (error) {
    console.error("search-food-catalog cache read failed:", error);
    return null;
  }

  return (data as CacheRow | null) ?? null;
}

async function writeCachedSearch(
  supabase: any,
  queryKey: string,
  normalizedQuery: string,
  limit: number,
  results: ExternalFoodSearchResult[],
  metadata: Omit<SearchMetadata, "cacheStatus">,
) {
  if (!supabase) return;

  const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
  const { error } = await supabase
    .from("external_food_search_cache")
    .upsert({
      query_key: queryKey,
      normalized_query: normalizedQuery,
      result_limit: limit,
      results,
      provider_status: metadata.providerStatus,
      provider_timings_ms: metadata.providerTimingsMs,
      expires_at: expiresAt,
    }, {
      onConflict: "query_key",
    });

  if (error) {
    console.error("search-food-catalog cache write failed:", error);
  }
}

function buildServingDescription(servingSizeG?: number | null) {
  if (!servingSizeG || servingSizeG <= 0) {
    return null;
  }

  return `${round1(servingSizeG)}g`;
}

function computeMatchScore(
  query: string,
  candidate: { name: string; brand: string | null; confidence: number | null },
) {
  const normalizedQuery = normalizeText(query);
  const normalizedName = normalizeText(candidate.name);
  const normalizedBrand = normalizeText(candidate.brand);
  let score = candidate.confidence ?? 0;

  if (normalizedName === normalizedQuery) {
    score += 100;
  } else if (normalizedName.startsWith(normalizedQuery)) {
    score += 70;
  } else if (normalizedName.includes(normalizedQuery)) {
    score += 50;
  }

  if (normalizedBrand === normalizedQuery) {
    score += 30;
  } else if (normalizedBrand.includes(normalizedQuery)) {
    score += 10;
  }

  return score;
}

function dedupeResults(query: string, results: ExternalFoodSearchResult[]) {
  const sorted = [...results].sort((left, right) => {
    const scoreDifference = computeMatchScore(query, right) -
      computeMatchScore(query, left);
    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return left.name.localeCompare(right.name);
  });

  const seenBarcodes = new Set<string>();
  const seenNames = new Set<string>();
  const deduped: ExternalFoodSearchResult[] = [];

  for (const result of sorted) {
    const barcode = result.barcode?.trim();
    const normalizedNameKey = `${normalizeText(result.name)}::${
      normalizeText(result.brand)
    }`;

    if (barcode && seenBarcodes.has(barcode)) {
      continue;
    }

    if (seenNames.has(normalizedNameKey)) {
      continue;
    }

    if (barcode) {
      seenBarcodes.add(barcode);
    }
    seenNames.add(normalizedNameKey);
    deduped.push(result);
  }

  return deduped;
}

async function searchOpenFoodFacts(
  query: string,
  limit: number,
): Promise<ExternalFoodSearchResult[]> {
  const url =
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${
      encodeURIComponent(query)
    }&search_simple=1&action=process&json=1&page_size=${limit}&fields=code,product_name,brands,image_url,nutriments,serving_quantity,serving_size`;

  const response = await fetchWithTimeout("openfoodfacts", url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "MetriqFit/1.0 (support@metriqfit.com)",
    },
  }, OPEN_FOOD_FACTS_TIMEOUT_MS);

  if (!response.ok) {
    throw new Error(`OpenFoodFacts search failed with ${response.status}`);
  }

  const payload = await response.json();
  const products = Array.isArray(payload?.products) ? payload.products : [];

  return products.flatMap((product: any) => {
    const calories = round0(num(product?.nutriments?.["energy-kcal_100g"]));
    const protein = round1(num(product?.nutriments?.["proteins_100g"]));
    const carbs = round1(num(product?.nutriments?.["carbohydrates_100g"]));
    const fat = round1(num(product?.nutriments?.["fat_100g"]));

    if (
      !product?.product_name || calories === undefined || protein === undefined ||
      carbs === undefined || fat === undefined
    ) {
      return [];
    }

    const servingSizeG = num(product?.serving_quantity) ?? 100;

    return [{
      provider: "openfoodfacts" as const,
      externalId: String(product.code ?? product.product_name),
      barcode: product.code ? String(product.code) : null,
      name: String(product.product_name),
      brand: product.brands ? String(product.brands) : null,
      imageUrl: product.image_url ? String(product.image_url) : null,
      caloriesPer100g: calories,
      proteinPer100g: protein,
      carbsPer100g: carbs,
      fatPer100g: fat,
      servingSizeG,
      servingDescription: buildServingDescription(servingSizeG) ?? "100g",
      confidence: 0.8,
    }];
  });
}

function findFoodNutrient(food: any, nutrientNumbers: string[], names: string[]) {
  const nutrients = Array.isArray(food?.foodNutrients) ? food.foodNutrients : [];

  const byNumber = nutrients.find((nutrient: any) =>
    nutrientNumbers.includes(String(nutrient?.nutrientNumber ?? ""))
  );
  if (byNumber && num(byNumber.value) !== undefined) {
    return num(byNumber.value);
  }

  const byName = nutrients.find((nutrient: any) => {
    const nutrientName = String(nutrient?.nutrientName ?? "").toLowerCase();
    return names.some((name) => nutrientName.includes(name));
  });
  return byName ? num(byName.value) : undefined;
}

async function searchUsda(
  query: string,
  limit: number,
  apiKey?: string,
): Promise<ExternalFoodSearchResult[]> {
  if (!apiKey) {
    return [];
  }

  const response = await fetchWithTimeout(
    "usda",
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${
      encodeURIComponent(apiKey)
    }`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        query,
        pageSize: limit,
        pageNumber: 1,
        dataType: ["Branded", "Foundation", "SR Legacy", "Survey (FNDDS)"],
      }),
    },
    USDA_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`USDA search failed with ${response.status}`);
  }

  const payload = await response.json();
  const foods = Array.isArray(payload?.foods) ? payload.foods : [];

  return foods.flatMap((food: any) => {
    const servingSizeG = num(food?.servingSize);
    const servingUnit = String(food?.servingSizeUnit ?? "").toLowerCase();
    const servingMultiplier = servingSizeG && servingSizeG > 0 && servingUnit === "g"
      ? 100 / servingSizeG
      : undefined;

    const labelCalories = num(food?.labelNutrients?.calories?.value);
    const labelProtein = num(food?.labelNutrients?.protein?.value);
    const labelCarbs = num(food?.labelNutrients?.carbohydrates?.value);
    const labelFat = num(food?.labelNutrients?.fat?.value);

    const nutrientCalories = findFoodNutrient(food, ["1008"], ["energy", "calories"]);
    const nutrientProtein = findFoodNutrient(food, ["1003"], ["protein"]);
    const nutrientCarbs = findFoodNutrient(food, ["1005"], ["carbohydrate"]);
    const nutrientFat = findFoodNutrient(food, ["1004"], ["lipid", "fat"]);

    const calories = servingMultiplier && labelCalories !== undefined
      ? round0(labelCalories * servingMultiplier)
      : round0(nutrientCalories);
    const protein = servingMultiplier && labelProtein !== undefined
      ? round1(labelProtein * servingMultiplier)
      : round1(nutrientProtein);
    const carbs = servingMultiplier && labelCarbs !== undefined
      ? round1(labelCarbs * servingMultiplier)
      : round1(nutrientCarbs);
    const fat = servingMultiplier && labelFat !== undefined
      ? round1(labelFat * servingMultiplier)
      : round1(nutrientFat);

    if (
      !food?.description || calories === undefined || protein === undefined ||
      carbs === undefined || fat === undefined
    ) {
      return [];
    }

    return [{
      provider: "usda_fdc" as const,
      externalId: String(food.fdcId ?? food.description),
      barcode: food.gtinUpc ? String(food.gtinUpc) : null,
      name: String(food.description),
      brand: food.brandOwner
        ? String(food.brandOwner)
        : food.brandName
        ? String(food.brandName)
        : null,
      imageUrl: null,
      caloriesPer100g: calories,
      proteinPer100g: protein,
      carbsPer100g: carbs,
      fatPer100g: fat,
      servingSizeG: servingSizeG ?? 100,
      servingDescription: buildServingDescription(servingSizeG) ?? "100g",
      confidence: servingMultiplier ? 0.82 : 0.74,
    }];
  });
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
    if (!supabaseUrl) {
      return jsonResponse({ ok: false, error: "Supabase URL is not configured" }, 500);
    }

    const auth = await requireUser(request, supabaseUrl);
    if (!auth.user) {
      return jsonResponse({ ok: false, error: auth.error }, 401);
    }

    const { query, limit } = await request.json();
    const normalizedQuery = String(query ?? "").trim();
    const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 30);
    const normalizedQueryKey = buildQueryKey(normalizedQuery, normalizedLimit);
    const startedAt = Date.now();

    if (normalizedQuery.length < 2) {
      return jsonResponse({
        ok: true,
        results: [],
        cacheStatus: "miss",
        providerStatus: {
          openfoodfacts: "ok",
          usda: "ok",
        },
        providerTimingsMs: {
          total: 0,
        },
      });
    }

    const supabase = createAdminClient();
    const cached = await readCachedSearch(supabase, normalizedQueryKey);
    if (cached && new Date(cached.expires_at).getTime() > Date.now()) {
      const totalMs = Date.now() - startedAt;
      console.log("search-food-catalog cache hit", {
        query: normalizedQuery,
        limit: normalizedLimit,
        totalMs,
        resultCount: cached.results.length,
      });
      return jsonResponse({
        ok: true,
        results: cached.results,
        cacheStatus: "hit",
        providerStatus: cached.provider_status,
        providerTimingsMs: {
          ...cached.provider_timings_ms,
          total: totalMs,
        },
      });
    }

    const usdaApiKey = Deno.env.get("USDA_FDC_API_KEY");

    const providerTimingsMs: SearchMetadata["providerTimingsMs"] = {
      total: 0,
    };
    const timedSearch = async (
      provider: ProviderName,
      searchFn: () => Promise<ExternalFoodSearchResult[]>,
    ) => {
      const providerStartedAt = Date.now();
      try {
        const results = await searchFn();
        providerTimingsMs[provider] = Date.now() - providerStartedAt;
        return results;
      } catch (error) {
        providerTimingsMs[provider] = Date.now() - providerStartedAt;
        throw error;
      }
    };

    const [openFoodFactsResult, usdaResult] = await Promise.allSettled([
      timedSearch("openfoodfacts", () => searchOpenFoodFacts(normalizedQuery, normalizedLimit)),
      timedSearch("usda", () => searchUsda(normalizedQuery, normalizedLimit, usdaApiKey)),
    ]);

    const openFoodFacts = openFoodFactsResult.status === "fulfilled"
      ? openFoodFactsResult.value
      : [];
    const usda = usdaResult.status === "fulfilled" ? usdaResult.value : [];
    const providerStatus: SearchMetadata["providerStatus"] = {
      openfoodfacts: openFoodFactsResult.status === "fulfilled"
        ? "ok"
        : isTimeoutError(openFoodFactsResult.reason)
        ? "timeout"
        : "error",
      usda: usdaResult.status === "fulfilled"
        ? "ok"
        : isTimeoutError(usdaResult.reason)
        ? "timeout"
        : "error",
    };

    if (openFoodFactsResult.status === "rejected") {
      console.error("OpenFoodFacts search error:", openFoodFactsResult.reason);
    }

    if (usdaResult.status === "rejected") {
      console.error("USDA search error:", usdaResult.reason);
    }

    const deduped = dedupeResults(normalizedQuery, [...openFoodFacts, ...usda])
      .slice(0, normalizedLimit);
    providerTimingsMs.total = Date.now() - startedAt;

    const metadata = {
      providerStatus,
      providerTimingsMs,
    };

    if (!deduped.length && cached?.results?.length) {
      console.warn("search-food-catalog using stale cache fallback", {
        query: normalizedQuery,
        limit: normalizedLimit,
        providerStatus,
      });
      return jsonResponse({
        ok: true,
        results: cached.results,
        cacheStatus: "stale-fallback",
        ...metadata,
      });
    }

    await writeCachedSearch(
      supabase,
      normalizedQueryKey,
      normalizeQuery(normalizedQuery),
      normalizedLimit,
      deduped,
      metadata,
    );

    console.log("search-food-catalog cache miss", {
      query: normalizedQuery,
      limit: normalizedLimit,
      resultCount: deduped.length,
      providerStatus,
      providerTimingsMs,
    });

    return jsonResponse({
      ok: true,
      results: deduped,
      cacheStatus: "miss",
      ...metadata,
    });
  } catch (error) {
    console.error("search-food-catalog error:", error);
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : "Unexpected search error",
    }, 500);
  }
});
