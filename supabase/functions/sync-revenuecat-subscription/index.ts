import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SubscriptionPlanType =
  | "free"
  | "premium_monthly"
  | "premium_annual"
  | "elite_monthly"
  | "elite_annual"
  | "elite_lifetime";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function inferPlanTypeFromProductId(productId: string | null | undefined): SubscriptionPlanType {
  const normalized = String(productId || "").toLowerCase();
  if (!normalized) return "premium_monthly";
  if (normalized.includes("elite")) {
    if (normalized.includes("lifetime") || normalized.includes("life")) return "elite_lifetime";
    return normalized.includes("annual") || normalized.includes("year")
      ? "elite_annual"
      : "elite_monthly";
  }
  if (normalized.includes("premium") || normalized.includes("pro")) {
    return normalized.includes("annual") || normalized.includes("year")
      ? "premium_annual"
      : "premium_monthly";
  }
  if (normalized.includes("annual") || normalized.includes("year")) return "premium_annual";
  return "premium_monthly";
}

function isActiveExpiration(value: unknown) {
  if (value === null || value === undefined || value === "") return true;
  const expiresAt = new Date(String(value));
  return Number.isFinite(expiresAt.getTime()) && expiresAt > new Date();
}

function pickActiveEntitlement(subscriber: any, requiredEntitlementId: string | null) {
  const entitlements = subscriber?.entitlements || {};
  const entries = Object.entries(entitlements) as Array<[string, any]>;
  const candidates = requiredEntitlementId
    ? entries.filter(([id]) => id === requiredEntitlementId)
    : entries;

  return candidates.find(([, entitlement]) =>
    isActiveExpiration(entitlement?.expires_date)
    && !entitlement?.unsubscribe_detected_at
    && !entitlement?.billing_issues_detected_at
  ) || null;
}

function findSubscription(subscriber: any, productId: string | null) {
  const subscriptions = subscriber?.subscriptions || {};
  if (productId && subscriptions[productId]) return subscriptions[productId];

  const active = (Object.entries(subscriptions) as Array<[string, any]>).find(([, value]) =>
    isActiveExpiration(value?.expires_date)
    && !value?.unsubscribe_detected_at
    && !value?.billing_issues_detected_at
  );
  return active?.[1] || null;
}

function platformHeader(platform: unknown) {
  const value = String(platform || "").toLowerCase();
  if (value === "ios") return "ios";
  if (value === "android") return "android";
  return undefined;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const revenueCatApiKey = Deno.env.get("REVENUECAT_API_KEY") || Deno.env.get("REVENUECAT_SECRET_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ success: false, error: "Missing Supabase config" }, 500);
    }
    if (!revenueCatApiKey) {
      return jsonResponse({ success: false, error: "RevenueCat server API key is not configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return jsonResponse({ success: false, error: "Missing authorization header" }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const body = (await req.json().catch(() => ({}))) as { user_id?: string; userId?: string; platform?: string };
    const userId = body.user_id || body.userId || authData.user.id;
    if (userId !== authData.user.id) {
      return jsonResponse({ success: false, error: "User mismatch" }, 403);
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${revenueCatApiKey}`,
      Accept: "application/json",
    };
    const platform = platformHeader(body.platform);
    if (platform) headers["X-Platform"] = platform;

    const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      return jsonResponse({ success: false, error: "RevenueCat verification failed" }, response.status === 401 ? 502 : 400);
    }

    const payload = await response.json();
    const subscriber = payload?.subscriber || {};
    const requiredEntitlementId = Deno.env.get("REVENUECAT_REQUIRED_ENTITLEMENT_ID") || null;
    const activeEntitlementEntry = pickActiveEntitlement(subscriber, requiredEntitlementId);

    let planType: SubscriptionPlanType = "free";
    let status: "active" | "trial" = "active";
    let expiresAt: string | null = null;
    let trialEndsAt: string | null = null;
    let productId: string | null = null;

    if (activeEntitlementEntry) {
      const [, entitlement] = activeEntitlementEntry;
      productId = String(entitlement?.product_identifier || "").trim() || null;
      const subscription = findSubscription(subscriber, productId);
      productId = productId || String(subscription?.product_identifier || "").trim() || null;
      planType = inferPlanTypeFromProductId(productId);
      expiresAt = entitlement?.expires_date || subscription?.expires_date || null;
      const periodType = String(subscription?.period_type || entitlement?.period_type || "").toLowerCase();
      status = periodType.includes("trial") || periodType.includes("intro") ? "trial" : "active";
      trialEndsAt = status === "trial" ? expiresAt : null;
    }

    const { error: upsertError } = await (supabase as any).rpc("upsert_subscription", {
      p_user_id: userId,
      p_plan_type: planType,
      p_status: status,
      p_expires_at: expiresAt,
      p_trial_ends_at: trialEndsAt,
      p_revenuecat_customer_id: subscriber?.original_app_user_id || userId,
      p_platform: platform || null,
      p_product_id: productId,
    });

    if (upsertError) throw upsertError;

    return jsonResponse({
      success: true,
      plan_type: planType,
      status,
      expires_at: expiresAt,
      product_id: productId,
    });
  } catch (error) {
    console.error("[sync-revenuecat-subscription]", error);
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : "Subscription sync failed" }, 500);
  }
});
