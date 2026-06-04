// supabase/functions/delete-account/index.ts
// Purpose: Delete a user's account and all associated data
//
// Security: Requires authenticated user. Uses service role for deletion.
// The user can only delete their own account.
//
// Process:
// 1. Verify user is authenticated
// 2. Delete user data in proper order (respecting foreign keys)
// 3. Delete auth.users record (cascades remaining data)
// 4. Optionally revoke RevenueCat entitlements
//
// Expected request: POST with Authorization header (user's JWT)
// No body required - user_id comes from auth token
//
// Returns:
// { success: true, message: "Account deleted successfully" }

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

interface DeletionLog {
  table: string;
  deleted: number;
  error?: string;
}

const PROGRESS_PHOTO_BUCKET = "progress-photos";
const STORAGE_REMOVE_BATCH_SIZE = 100;
const IGNORABLE_DELETE_ERROR_CODES = new Set(["42P01", "42703"]);

type UserOwnedDeleteTarget = {
  table: string;
  column?: string;
};

const ADDITIONAL_USER_OWNED_DELETE_TARGETS: UserOwnedDeleteTarget[] = [
  { table: "analytics_events" },
  { table: "ai_coach_tool_receipts" },
  { table: "ai_coach_action_proposals" },
  { table: "ai_coach_memory_items" },
  { table: "ai_coach_threads" },
  { table: "food_favorites" },
  { table: "recipe_import_events" },
  { table: "menu_scan_sessions" },
  { table: "pantry_transactions" },
  { table: "pantry_items" },
  { table: "grocery_lists" },
  { table: "prep_coach_adjustment_events" },
  { table: "prep_coach_cycles" },
  { table: "workout_import_jobs" },
  { table: "workout_adaptation_events" },
  { table: "workout_adaptation_recommendations" },
  { table: "workout_readiness_daily" },
  { table: "user_progression_suggestions" },
  { table: "user_achievements" },
  { table: "user_streak_freezes" },
  { table: "user_streaks" },
  { table: "user_xp_events" },
  { table: "user_xp_levels" },
  { table: "subscription_events" },
  { table: "promo_code_redemptions" },
  { table: "onboarding_plan_review_states" },
  { table: "recipes" },
  { table: "food_items", column: "created_by_user_id" },
];

async function removeStoragePaths(
  adminClient: any,
  bucket: string,
  paths: string[],
) {
  let removed = 0;
  for (let index = 0; index < paths.length; index += STORAGE_REMOVE_BATCH_SIZE) {
    const batch = paths.slice(index, index + STORAGE_REMOVE_BATCH_SIZE);
    if (!batch.length) continue;

    const { data, error } = await adminClient.storage.from(bucket).remove(batch);
    if (error) throw error;
    removed += data?.length || batch.length;
  }
  return removed;
}

async function deleteUserOwnedRows(
  adminClient: any,
  target: UserOwnedDeleteTarget,
  userId: string,
): Promise<DeletionLog> {
  const column = target.column || "user_id";
  const { count, error } = await adminClient
    .from(target.table)
    .delete({ count: "exact" })
    .eq(column, userId);

  if (!error) {
    return { table: target.table, deleted: count || 0 };
  }

  const code = typeof error?.code === "string" ? error.code : "";
  if (IGNORABLE_DELETE_ERROR_CODES.has(code)) {
    return {
      table: target.table,
      deleted: 0,
      error: `Skipped: ${error.message}`,
    };
  }

  return {
    table: target.table,
    deleted: 0,
    error: error.message || "Delete failed",
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const revenueCatApiKey = Deno.env.get("REVENUECAT_API_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ success: false, error: "Missing Supabase env vars" }, 500);
  }

  // Create client with user's auth token to verify identity
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ success: false, error: "Missing Authorization header" }, 401);
  }

  // User client - to verify the user
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  // Get the authenticated user
  const { data: authData, error: authError } = await verifyClerkRequest(req);
  if (authError || !authData?.user) {
    console.error("Auth error:", authError);
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  const userId = authData.user.id;
  const userEmail = authData.user.email;

  console.log(`Starting account deletion for user: ${userId}`);

  // Admin client - for service-level operations
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const deletionLogs: DeletionLog[] = [];

  try {
    // Optional: Parse request body for confirmation
    let body: { confirm?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      // No body is fine
    }

    // Require explicit confirmation in production
    const appEnv = Deno.env.get("APP_ENV") || "production";
    if (appEnv === "production" && body.confirm !== true) {
      return jsonResponse({
        success: false,
        error: "Account deletion requires confirmation. Send { confirm: true } in request body.",
      }, 400);
    }

    // =========================================
    // Step 1: Revoke RevenueCat entitlements (if configured)
    // =========================================
    if (revenueCatApiKey && userEmail) {
      try {
        // RevenueCat uses app_user_id which is typically our user_id
        const rcResponse = await fetch(
          `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
          {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${revenueCatApiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (rcResponse.ok || rcResponse.status === 404) {
          console.log("RevenueCat subscriber deleted or not found");
          deletionLogs.push({ table: "revenuecat_subscriber", deleted: 1 });
        } else {
          const rcError = await rcResponse.text();
          console.error("RevenueCat deletion warning:", rcError);
          deletionLogs.push({ table: "revenuecat_subscriber", deleted: 0, error: "Warning: Could not revoke" });
        }
      } catch (rcErr) {
        console.error("RevenueCat API error:", rcErr);
        deletionLogs.push({ table: "revenuecat_subscriber", deleted: 0, error: "Warning: API error" });
      }
    }

    // =========================================
    // Step 2: Delete user data manually for tables without CASCADE
    // Most tables have ON DELETE CASCADE, but we'll be explicit
    // =========================================

    // Delete private progress photo objects before removing metadata/auth rows.
    const { data: progressPhotoRows, error: progressPhotosFetchErr } = await adminClient
      .from("progress_photos")
      .select("storage_path")
      .eq("user_id", userId);

    if (progressPhotosFetchErr) {
      return jsonResponse({
        success: false,
        error: "Failed to load progress photo paths: " + progressPhotosFetchErr.message,
        partial_deletion: true,
        deletion_logs: deletionLogs,
      }, 500);
    }

    const progressPhotoPaths = (progressPhotoRows || [])
      .map((row: { storage_path?: string | null }) => row.storage_path)
      .filter((value): value is string => typeof value === "string" && value.length > 0);

    try {
      const removedObjects = await removeStoragePaths(adminClient, PROGRESS_PHOTO_BUCKET, progressPhotoPaths);
      deletionLogs.push({ table: "storage.progress-photos", deleted: removedObjects });
    } catch (storageErr) {
      console.error("Progress photo storage deletion error:", storageErr);
      return jsonResponse({
        success: false,
        error: "Failed to delete progress photo files: " + ((storageErr as Error)?.message || "storage error"),
        partial_deletion: true,
        deletion_logs: deletionLogs,
      }, 500);
    }

    const { count: progressPhotosCount, error: progressPhotosErr } = await adminClient
      .from("progress_photos")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    deletionLogs.push({
      table: "progress_photos",
      deleted: progressPhotosCount || 0,
      error: progressPhotosErr?.message,
    });

    for (const target of ADDITIONAL_USER_OWNED_DELETE_TARGETS) {
      deletionLogs.push(await deleteUserOwnedRows(adminClient, target, userId));
    }

    // Delete AI coach feedback (references ai_coach_messages)
    const { count: feedbackCount, error: feedbackErr } = await adminClient
      .from("ai_coach_feedback")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    deletionLogs.push({
      table: "ai_coach_feedback",
      deleted: feedbackCount || 0,
      error: feedbackErr?.message,
    });

    // Delete AI coach messages
    const { count: messagesCount, error: messagesErr } = await adminClient
      .from("ai_coach_messages")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    deletionLogs.push({
      table: "ai_coach_messages",
      deleted: messagesCount || 0,
      error: messagesErr?.message,
    });

    // Delete AI usage daily
    const { count: usageCount, error: usageErr } = await adminClient
      .from("ai_usage_daily")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    deletionLogs.push({
      table: "ai_usage_daily",
      deleted: usageCount || 0,
      error: usageErr?.message,
    });

    // Delete workout sets (references session_exercises)
    const { count: setsCount, error: setsErr } = await adminClient
      .from("workout_sets")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    deletionLogs.push({
      table: "workout_sets",
      deleted: setsCount || 0,
      error: setsErr?.message,
    });

    // Delete session exercises (references workout_sessions)
    const { count: sessionExCount, error: sessionExErr } = await adminClient
      .from("session_exercises")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    deletionLogs.push({
      table: "session_exercises",
      deleted: sessionExCount || 0,
      error: sessionExErr?.message,
    });

    // Delete workout sessions
    const { count: sessionsCount, error: sessionsErr } = await adminClient
      .from("workout_sessions")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    deletionLogs.push({
      table: "workout_sessions",
      deleted: sessionsCount || 0,
      error: sessionsErr?.message,
    });

    // Delete user PRs
    const { count: prsCount, error: prsErr } = await adminClient
      .from("user_prs")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    deletionLogs.push({
      table: "user_prs",
      deleted: prsCount || 0,
      error: prsErr?.message,
    });

    // Delete workout plan exercises (references workout_plan_days)
    const { count: planExCount, error: planExErr } = await adminClient
      .from("user_workout_plan_exercises")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    deletionLogs.push({
      table: "user_workout_plan_exercises",
      deleted: planExCount || 0,
      error: planExErr?.message,
    });

    // Delete workout plan days (references workout_plans)
    const { count: planDaysCount, error: planDaysErr } = await adminClient
      .from("user_workout_plan_days")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    deletionLogs.push({
      table: "user_workout_plan_days",
      deleted: planDaysCount || 0,
      error: planDaysErr?.message,
    });

    // Delete workout plans
    const { count: plansCount, error: plansErr } = await adminClient
      .from("user_workout_plans")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    deletionLogs.push({
      table: "user_workout_plans",
      deleted: plansCount || 0,
      error: plansErr?.message,
    });

    // Delete nutrition plan meals
    const { count: nutMealsCount, error: nutMealsErr } = await adminClient
      .from("user_nutrition_plan_meals")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    deletionLogs.push({
      table: "user_nutrition_plan_meals",
      deleted: nutMealsCount || 0,
      error: nutMealsErr?.message,
    });

    // Delete nutrition plans
    const { count: nutPlansCount, error: nutPlansErr } = await adminClient
      .from("user_nutrition_plans")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    deletionLogs.push({
      table: "user_nutrition_plans",
      deleted: nutPlansCount || 0,
      error: nutPlansErr?.message,
    });

    // Delete plan generation runs
    const { count: runsCount, error: runsErr } = await adminClient
      .from("plan_generation_runs")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    deletionLogs.push({
      table: "plan_generation_runs",
      deleted: runsCount || 0,
      error: runsErr?.message,
    });

    // Delete meal log items (references meal_logs)
    const { count: mealItemsCount, error: mealItemsErr } = await adminClient
      .from("meal_log_items")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    deletionLogs.push({
      table: "meal_log_items",
      deleted: mealItemsCount || 0,
      error: mealItemsErr?.message,
    });

    // Delete meal logs
    const { count: mealLogsCount, error: mealLogsErr } = await adminClient
      .from("meal_logs")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    deletionLogs.push({
      table: "meal_logs",
      deleted: mealLogsCount || 0,
      error: mealLogsErr?.message,
    });

    // Delete water logs
    const { count: waterCount, error: waterErr } = await adminClient
      .from("water_logs")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    deletionLogs.push({
      table: "water_logs",
      deleted: waterCount || 0,
      error: waterErr?.message,
    });

    // Delete user measurements
    const { count: measureCount, error: measureErr } = await adminClient
      .from("user_measurements")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    deletionLogs.push({
      table: "user_measurements",
      deleted: measureCount || 0,
      error: measureErr?.message,
    });

    // Delete subscriptions
    const { count: subsCount, error: subsErr } = await adminClient
      .from("subscriptions")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    deletionLogs.push({
      table: "subscriptions",
      deleted: subsCount || 0,
      error: subsErr?.message,
    });

    // Delete user targets
    const { count: targetsCount, error: targetsErr } = await adminClient
      .from("user_targets")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    deletionLogs.push({
      table: "user_targets",
      deleted: targetsCount || 0,
      error: targetsErr?.message,
    });

    // Delete onboarding answers
    const { count: onboardingCount, error: onboardingErr } = await adminClient
      .from("onboarding_answers")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    deletionLogs.push({
      table: "onboarding_answers",
      deleted: onboardingCount || 0,
      error: onboardingErr?.message,
    });

    // Delete profile (this is the main user data table)
    const { count: profileCount, error: profileErr } = await adminClient
      .from("profiles")
      .delete({ count: "exact" })
      .eq("id", userId);

    deletionLogs.push({
      table: "profiles",
      deleted: profileCount || 0,
      error: profileErr?.message,
    });

    // =========================================
    // Step 3: Delete auth.users record
    // =========================================
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error("Failed to delete auth user:", deleteUserError);
      return jsonResponse({
        success: false,
        error: "Failed to delete auth user: " + deleteUserError.message,
        partial_deletion: true,
        deletion_logs: deletionLogs,
      }, 500);
    }

    deletionLogs.push({ table: "auth.users", deleted: 1 });

    console.log(`Account deletion completed for user: ${userId}`);

    return jsonResponse({
      success: true,
      message: "Account deleted successfully",
      deletion_logs: deletionLogs,
    });

  } catch (err) {
    console.error("Account deletion error:", err);
    return jsonResponse({
      success: false,
      error: (err as Error)?.message ?? "Unknown error during account deletion",
      partial_deletion: true,
      deletion_logs: deletionLogs,
    }, 500);
  }
});
