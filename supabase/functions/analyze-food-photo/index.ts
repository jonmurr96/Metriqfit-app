import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Confidence = "high" | "medium" | "low";

type RecognizedFood = {
  name: string;
  estimatedGrams: number;
  confidence: Confidence;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type FoodPhotoAnalysis = {
  foods: RecognizedFood[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  needsReview: boolean;
  warnings: string[];
};

class ProviderError extends Error {
  status: number;
  retryable: boolean;
  providerCode?: string;
  provider: "gemini" | "openai";

  constructor(
    message: string,
    status: number,
    retryable: boolean,
    provider: "gemini" | "openai",
    providerCode?: string,
  ) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
    this.retryable = retryable;
    this.provider = provider;
    this.providerCode = providerCode;
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function cleanBase64(value: unknown) {
  return String(value || "")
    .replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "")
    .replace(/\s/g, "");
}

function numberOrZero(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tierFromPlan(planType: unknown): "free" | "premium" | "elite" {
  const value = String(planType || "").toLowerCase();
  if (value.startsWith("premium")) return "premium";
  if (value.startsWith("elite")) return "elite";
  return "free";
}

function photoScanLimit(tier: "free" | "premium" | "elite") {
  if (tier === "elite") return -1;
  if (tier === "premium") return 15;
  return 3;
}

async function getSubscriptionTier(supabase: any, userId: string) {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan_type, status, expires_at, trial_ends_at, updated_at")
    .eq("user_id", userId)
    .in("status", ["active", "trial", "grace_period"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return "free";
  const now = Date.now();
  const expiresAt = data.expires_at ? new Date(String(data.expires_at)).getTime() : null;
  const trialEndsAt = data.trial_ends_at ? new Date(String(data.trial_ends_at)).getTime() : null;
  const isTrialing = data.status === "trial" && trialEndsAt !== null && trialEndsAt > now;
  const isActive = data.status === "active" || data.status === "grace_period" || isTrialing;
  if (!isActive) return "free";
  if (expiresAt !== null && expiresAt <= now && !isTrialing) return "free";
  return tierFromPlan(data.plan_type);
}

async function consumePhotoScanQuota(supabase: any, userId: string) {
  const tier = await getSubscriptionTier(supabase, userId);
  const limit = photoScanLimit(tier);
  if (limit < 0) return { allowed: true, limit, tier };

  const { data, error } = await (supabase as any).rpc("consume_ai_usage_quota", {
    p_user_id: userId,
    p_usage_type: "food_photo_scans",
    p_limit: limit,
  });

  if (error) throw error;
  return { allowed: data === true, limit, tier };
}

function parseConfidence(value: unknown): Confidence {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "low";
}

function analysisPrompt() {
  return [
    "You are a careful nutrition photo estimator.",
    "Return only valid JSON with keys foods, totalCalories, totalProtein, totalCarbs, totalFat, needsReview, warnings.",
    "Estimate visible edible items only.",
    "Each food must be { name, estimatedGrams, confidence: 'high'|'medium'|'low', calories, protein, carbs, fat }.",
    "Use grams for portions and grams for macros.",
    "Be conservative and add warnings for uncertainty.",
    "If the photo is unclear, empty, or not food, return foods: [] and needsReview: true.",
  ].join(" ");
}

function normalizeAnalysis(raw: unknown): FoodPhotoAnalysis {
  const payload = raw as Partial<FoodPhotoAnalysis> & { foods?: unknown[] };
  const warnings = Array.isArray(payload?.warnings)
    ? payload.warnings.map((warning) => String(warning)).filter(Boolean).slice(0, 8)
    : [];

  const foods = Array.isArray(payload?.foods)
    ? payload.foods
      .map((item) => {
        const food = item as Record<string, unknown>;
        const name = String(food.name || "").trim();
        const estimatedGrams = Math.round(clamp(numberOrZero(food.estimatedGrams), 0, 2000));
        const calories = Math.round(clamp(numberOrZero(food.calories), 0, 5000));
        const protein = round1(clamp(numberOrZero(food.protein), 0, 400));
        const carbs = round1(clamp(numberOrZero(food.carbs), 0, 800));
        const fat = round1(clamp(numberOrZero(food.fat), 0, 400));

        if (!name || estimatedGrams <= 0 || calories <= 0) return null;

        return {
          name,
          estimatedGrams,
          confidence: parseConfidence(food.confidence),
          calories,
          protein,
          carbs,
          fat,
        };
      })
      .filter((food): food is RecognizedFood => Boolean(food))
      .slice(0, 8)
    : [];

  const totals = foods.reduce(
    (sum, food) => ({
      calories: sum.calories + food.calories,
      protein: sum.protein + food.protein,
      carbs: sum.carbs + food.carbs,
      fat: sum.fat + food.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const lowConfidence = foods.some((food) => food.confidence !== "high");
  const noFoods = foods.length === 0;

  return {
    foods,
    totalCalories: Math.round(totals.calories),
    totalProtein: round1(totals.protein),
    totalCarbs: round1(totals.carbs),
    totalFat: round1(totals.fat),
    needsReview: Boolean(payload?.needsReview) || lowConfidence || noFoods,
    warnings: noFoods
      ? [...warnings, "No clear food items were detected. Try retaking the photo with the food centered and well lit."]
      : warnings,
  };
}

async function analyzeWithGemini(geminiKey: string, base64Image: string): Promise<FoodPhotoAnalysis> {
  const primaryModel = Deno.env.get("GEMINI_VISION_MODEL") || "gemini-3-pro-preview";
  const fallbackModels = (Deno.env.get("GEMINI_VISION_FALLBACK_MODELS") || "gemini-3-flash-preview,gemini-2.5-flash")
    .split(",")
    .map((model) => model.trim())
    .filter((model) => model && model !== primaryModel);
  const models = [primaryModel, ...fallbackModels];
  let lastError: ProviderError | null = null;

  for (const model of models) {
    try {
      return await analyzeWithGeminiModel(geminiKey, base64Image, model);
    } catch (error) {
      if (!(error instanceof ProviderError)) throw error;
      lastError = error;

      if (error.providerCode === "RESOURCE_EXHAUSTED" || error.providerCode === "insufficient_quota") break;
      if (!error.retryable) break;

      console.warn("[analyze-food-photo] retryable Gemini error", {
        status: error.status,
        code: error.providerCode,
        model,
      });
    }
  }

  throw lastError || new Error("Gemini photo analysis failed");
}

async function analyzeWithGeminiModel(geminiKey: string, base64Image: string, model: string): Promise<FoodPhotoAnalysis> {
  let lastError: ProviderError | null = null;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: analysisPrompt() },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 700,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const providerError = await parseGeminiProviderError(response);
      lastError = providerError;

      if (providerError.status !== 429 || attempt === 2) throw providerError;

      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 0;
      await sleep(Number.isFinite(retryAfterMs) && retryAfterMs > 0 ? retryAfterMs : 700 * (attempt + 1));
      continue;
    }

    const payload = await response.json();
    const content = payload?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part?.text || "")
      .join("")
      .trim();

    if (!content) throw new Error("Gemini photo analysis returned no content");
    return normalizeAnalysis(JSON.parse(content));
  }

  throw lastError || new Error("Gemini photo analysis failed");
}

async function parseGeminiProviderError(response: Response): Promise<ProviderError> {
  const text = await response.text().catch(() => "");
  let providerCode: string | undefined;
  let providerMessage = "";

  try {
    const parsed = JSON.parse(text);
    providerCode = parsed?.error?.status || parsed?.error?.code;
    providerMessage = parsed?.error?.message || "";
  } catch {
    providerMessage = text;
  }

  console.error("[analyze-food-photo] Gemini error", response.status, text.slice(0, 500));

  if (
    response.status === 429 &&
    /(prepayment credits are depleted|billing|quota)/i.test(providerMessage)
  ) {
    return new ProviderError(
      "Photo analysis is unavailable because the Gemini project quota or credits are exhausted.",
      503,
      false,
      "gemini",
      String(providerCode || "RESOURCE_EXHAUSTED"),
    );
  }

  if (response.status === 429 || providerCode === "RESOURCE_EXHAUSTED") {
    return new ProviderError(
      "Photo analysis is temporarily busy. Please wait a few seconds and try again.",
      503,
      true,
      "gemini",
      String(providerCode || "RESOURCE_EXHAUSTED"),
    );
  }

  return new ProviderError(
    providerMessage || `Gemini photo analysis failed (${response.status})`,
    response.status >= 500 ? 503 : 502,
    response.status >= 500,
    "gemini",
    providerCode ? String(providerCode) : undefined,
  );
}

async function analyzeWithOpenAi(openAiKey: string, base64Image: string): Promise<FoodPhotoAnalysis> {
  const primaryModel = Deno.env.get("OPENAI_VISION_MODEL") || "gpt-4o-mini";
  const fallbackModels = (Deno.env.get("OPENAI_VISION_FALLBACK_MODELS") || "gpt-4.1-mini,gpt-4.1-nano")
    .split(",")
    .map((model) => model.trim())
    .filter((model) => model && model !== primaryModel);
  const models = [primaryModel, ...fallbackModels];
  let lastError: ProviderError | null = null;

  for (const model of models) {
    try {
      return await analyzeWithOpenAiModel(openAiKey, base64Image, model);
    } catch (error) {
      if (!(error instanceof ProviderError)) throw error;
      lastError = error;

      if (error.providerCode === "insufficient_quota") break;
      if (!error.retryable) break;

      console.warn("[analyze-food-photo] retryable provider error", {
        status: error.status,
        code: error.providerCode,
        model,
      });
    }
  }

  throw lastError || new Error("Photo analysis failed");
}

async function analyzeWithOpenAiModel(openAiKey: string, base64Image: string, model: string): Promise<FoodPhotoAnalysis> {
  let lastError: ProviderError | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a careful nutrition photo estimator. Return only JSON with keys foods, totalCalories, totalProtein, totalCarbs, totalFat, needsReview, warnings. Estimate visible edible items only. Use grams and grams of macros. If the photo is unclear, empty, or not food, return foods: [] and needsReview: true.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Identify the visible foods and estimate portions/macros. Each food must be { name, estimatedGrams, confidence: 'high'|'medium'|'low', calories, protein, carbs, fat }. Be conservative and add warnings for uncertainty.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: "low",
              },
            },
          ],
        },
      ],
    }),
    });

    if (!response.ok) {
      const providerError = await parseProviderError(response);
      lastError = providerError;

      if (providerError.status !== 429 || providerError.providerCode === "insufficient_quota" || attempt === 2) {
        throw providerError;
      }

      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 0;
      await sleep(Number.isFinite(retryAfterMs) && retryAfterMs > 0 ? retryAfterMs : 700 * (attempt + 1));
      continue;
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Photo analysis returned no content");

    return normalizeAnalysis(JSON.parse(content));
  }

  throw lastError || new Error("Photo analysis failed");
}

async function parseProviderError(response: Response): Promise<ProviderError> {
  const text = await response.text().catch(() => "");
  let providerCode: string | undefined;
  let providerMessage = "";

  try {
    const parsed = JSON.parse(text);
    providerCode = parsed?.error?.code || parsed?.error?.type;
    providerMessage = parsed?.error?.message || "";
  } catch {
    providerMessage = text;
  }

  console.error("[analyze-food-photo] OpenAI error", response.status, text.slice(0, 500));

  if (response.status === 429 && providerCode === "insufficient_quota") {
    return new ProviderError(
      "Photo analysis is temporarily unavailable because the AI provider quota is exhausted.",
      503,
      false,
      "openai",
      providerCode,
    );
  }

  if (response.status === 429) {
    return new ProviderError(
      "Photo analysis is temporarily busy. Please wait a few seconds and try again.",
      503,
      true,
      "openai",
      providerCode,
    );
  }

  return new ProviderError(
    providerMessage || `Photo analysis failed (${response.status})`,
    response.status >= 500 ? 503 : 502,
    response.status >= 500,
    "openai",
    providerCode,
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_AI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Missing Supabase config" }, 500);
    if (!geminiKey) {
      return jsonResponse({ error: "Photo analysis unavailable: GEMINI_API_KEY missing" }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return jsonResponse({ error: "Missing authorization header" }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json() as { image?: string; image_base64?: string; userId?: string };
    if (body.userId && body.userId !== authData.user.id) {
      return jsonResponse({ error: "User mismatch" }, 403);
    }

    const base64Image = cleanBase64(body.image || body.image_base64);
    if (!base64Image) return jsonResponse({ error: "image is required" }, 400);
    if (base64Image.length > 12_000_000) {
      return jsonResponse({ error: "Photo is too large. Retake the photo from slightly farther away and try again." }, 413);
    }

    const quota = await consumePhotoScanQuota(supabase, authData.user.id);
    if (!quota.allowed) {
      return jsonResponse({
        error: "Daily photo scan limit reached",
        limit: quota.limit,
        tier: quota.tier,
      }, 429);
    }

    let analysis: FoodPhotoAnalysis;
    try {
      analysis = await analyzeWithGemini(geminiKey, base64Image);
    } catch (error) {
      const openAiFallbackEnabled = Deno.env.get("ENABLE_OPENAI_PHOTO_FALLBACK") === "true";
      if (!openAiFallbackEnabled || !openAiKey || !(error instanceof ProviderError) || !error.retryable) {
        throw error;
      }
      analysis = await analyzeWithOpenAi(openAiKey, base64Image);
    }
    return jsonResponse(analysis);
  } catch (error) {
    const err = error as Error;
    console.error("[analyze-food-photo]", err);
    if (error instanceof ProviderError) {
      return jsonResponse({ error: error.message, provider: error.provider, provider_code: error.providerCode }, error.status);
    }
    return jsonResponse({ error: err.message || "Failed to analyze photo" }, 500);
  }
});
