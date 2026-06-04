/* eslint-disable import/no-unresolved */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { verifyClerkRequest } from "../_shared/clerkAuth.ts";
import {
  auditPlanDaysForRepair,
  buildTemplateContextCatalog,
  copyPlanWithRemediation,
  inferPlanTemplateContext,
  loadPlanDaysAndExercisesForRepair,
  loadPlanScheduleForRepair,
  loadRepairExercisePool,
  stableSortBy,
} from "../../../lib/workout/active-plan-coherence-repair.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WORKOUT_PREVIEW_NAME_PREFIX = "Preview · ";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase environment configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") || "",
        },
      },
    });

    const { data: { user }, error: authError } = await verifyClerkRequest(req);

    if (authError || !user) {
      return jsonResponse({ success: false, error: "Authentication required" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const planId = String(body?.plan_id || "").trim();
    const mode = String(body?.mode || "preview").trim();

    if (!planId) {
      return jsonResponse({ success: false, error: "plan_id is required" }, 400);
    }

    if (mode !== "preview") {
      return jsonResponse({ success: false, error: "Only preview mode is supported" }, 400);
    }

    const { data: plan, error: planError } = await supabase
      .from("user_workout_plans")
      .select(`
        id,
        user_id,
        name,
        description,
        start_date,
        end_date,
        days_per_week,
        total_weeks,
        current_week,
        template_id,
        generation_run_id,
        version,
        is_active,
        source_model,
        program_template_v2_id,
        program_family_key,
        progression_model,
        training_style_tags,
        goal_tags,
        weekly_layout_json,
        lifecycle_state,
        replaces_plan_id
      `)
      .eq("id", planId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (planError || !plan) {
      return jsonResponse({ success: false, error: planError?.message || "Workout plan not found" }, 404);
    }

    if (!plan.is_active) {
      return jsonResponse({ success: false, error: "Only the active workout plan can be repaired" }, 400);
    }

    if (!["generated", "v2_template", "legacy_template"].includes(String(plan.source_model || "generated"))) {
      return jsonResponse({
        success: false,
        status: "not_repairable",
        error: "Only generated or template-derived workout plans can be repaired automatically.",
      }, 400);
    }

    const { data: existingPreview } = await supabase
      .from("user_workout_plans")
      .select("id, lifecycle_state, replaces_plan_id")
      .eq("user_id", user.id)
      .eq("is_active", false)
      .eq("lifecycle_state", "preview")
      .eq("replaces_plan_id", plan.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPreview?.id) {
      return jsonResponse({
        success: true,
        status: "preview_ready",
        workout_plan_id: existingPreview.id,
        workoutPlanId: existingPreview.id,
        created: false,
      });
    }

    const [exercisePool, templateCatalog, dayPayload, schedule] = await Promise.all([
      loadRepairExercisePool(supabase),
      buildTemplateContextCatalog(supabase),
      loadPlanDaysAndExercisesForRepair(supabase, plan.id),
      loadPlanScheduleForRepair(supabase, plan.id),
    ]);

    const dayNames = stableSortBy(dayPayload.days, (day) => day.day_number).map((day) => day.name);
    const inferredContext = inferPlanTemplateContext(plan, dayNames, templateCatalog);
    const audit = auditPlanDaysForRepair({
      plan,
      days: dayPayload.days,
      familyKey: plan.program_family_key || inferredContext.familyKey,
      templateEquipment: inferredContext.equipment,
      exercisePool,
    });

    const hasHardViolations = audit.dayAudits.some((dayAudit) => dayAudit.hardViolationCount > 0);
    if (!hasHardViolations) {
      return jsonResponse({
        success: true,
        status: "no_violations",
        checked_days: audit.dayAudits.length,
      });
    }

    const preview = await copyPlanWithRemediation({
      supabase,
      plan,
      days: dayPayload.days,
      blocks: dayPayload.blocks,
      schedule,
      remediationsByDayId: audit.remediations,
      dryRun: false,
      mode: "preview",
      previewPrefix: WORKOUT_PREVIEW_NAME_PREFIX,
      jobId: `repair-preview:${plan.id}`,
      programFamilyKey: plan.program_family_key || inferredContext.familyKey || null,
    });

    if (!preview.success || !preview.newPlanId) {
      return jsonResponse({
        success: false,
        status: "validation_failed",
        error: preview.reason || "Failed to create repair preview",
      }, 422);
    }

    return jsonResponse({
      success: true,
      status: "preview_ready",
      workout_plan_id: preview.newPlanId,
      workoutPlanId: preview.newPlanId,
      created: true,
      warnings: preview.auditRows?.length
        ? [`Prepared a repair preview with ${preview.auditRows.length} exercise changes.`]
        : [],
    });
  } catch (error) {
    const err = error as Error;
    console.error("[repair-workout-plan-coherence]", err);
    return jsonResponse({ success: false, error: err.message || "Failed to repair workout plan" }, 500);
  }
});
