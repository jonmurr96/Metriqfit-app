import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

type Recommendation = {
  recommendation_type: string;
  rationale: string;
  payload: Record<string, unknown>;
};

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
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

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const body = (await req.json().catch(() => ({}))) as { planId?: string; contextWindowDays?: number };

    let planId = body.planId || null;
    const contextWindowDays = Math.max(7, Math.min(56, Number(body.contextWindowDays || 21)));

    if (!planId) {
      const { data: activePlan, error: activePlanError } = await supabase
        .from("user_workout_plans")
        .select("id")
        .eq("user_id", authData.user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (activePlanError || !activePlan) {
        return jsonResponse({ success: false, error: activePlanError?.message || "No active workout plan found" }, 404);
      }

      planId = activePlan.id;
    }

    const { data: planRow, error: planError } = await supabase
      .from("user_workout_plans")
      .select("id, user_id, days_per_week")
      .eq("id", planId)
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (planError || !planRow) {
      return jsonResponse({ success: false, error: planError?.message || "Plan not found" }, 404);
    }

    const since = new Date();
    since.setDate(since.getDate() - contextWindowDays);
    const sinceDate = since.toISOString().split("T")[0];

    const { data: scheduleRows, error: scheduleError } = await supabase
      .from("user_workout_plan_schedule")
      .select("id, scheduled_date, status, session_type")
      .eq("plan_id", planId)
      .gte("scheduled_date", sinceDate)
      .order("scheduled_date", { ascending: false });

    if (scheduleError) {
      return jsonResponse({ success: false, error: scheduleError.message || "Failed to load schedule" }, 500);
    }

    let consecutiveMissed = 0;
    for (const row of scheduleRows || []) {
      if (row.session_type !== "workout") continue;
      if (row.status === "missed" || row.status === "skipped") {
        consecutiveMissed += 1;
        continue;
      }
      if (row.status === "planned") continue;
      break;
    }

    const { data: sessions, error: sessionsError } = await supabase
      .from("workout_sessions")
      .select(
        `
        id,
        started_at,
        finished_at,
        exercises:session_exercises(
          id,
          sets:workout_sets(reps, weight_lb, rpe, is_warmup)
        )
      `,
      )
      .eq("user_id", authData.user.id)
      .not("finished_at", "is", null)
      .gte("started_at", since.toISOString())
      .order("started_at", { ascending: false })
      .limit(20);

    if (sessionsError) {
      return jsonResponse({ success: false, error: sessionsError.message || "Failed to load session history" }, 500);
    }

    const rpeValues: number[] = [];
    let totalSets = 0;
    for (const session of sessions || []) {
      for (const exercise of session.exercises || []) {
        for (const set of exercise.sets || []) {
          if (set.is_warmup) continue;
          totalSets += 1;
          if (typeof set.rpe === "number") rpeValues.push(Number(set.rpe));
        }
      }
    }

    const avgRpe = average(rpeValues);

    const { data: readinessRows } = await supabase
      .from("workout_readiness_daily")
      .select("log_date, readiness_score, sleep_hours, soreness, stress, energy")
      .eq("user_id", authData.user.id)
      .gte("log_date", sinceDate)
      .order("log_date", { ascending: false })
      .limit(7);

    const readinessAvg = average((readinessRows || []).map((row) => Number(row.readiness_score || 0)).filter((v) => v > 0));

    const recommendations: Recommendation[] = [];

    if (consecutiveMissed >= 2) {
      recommendations.push({
        recommendation_type: "schedule_recovery_shift",
        rationale: `You missed ${consecutiveMissed} consecutive workout days. A short recovery shift can improve adherence.`,
        payload: {
          action: "insert_recovery_day",
          impact: "Move next high-stress session by 1 day and add recovery slot.",
          priority: "high",
        },
      });
    }

    if (avgRpe >= 8.9 && totalSets >= 18) {
      recommendations.push({
        recommendation_type: "load_adjustment",
        rationale: `Average RPE is ${avgRpe.toFixed(1)} across ${totalSets} recent working sets.`,
        payload: {
          action: "reduce_load_percent",
          value: 5,
          windows: 2,
          priority: "high",
        },
      });
    }

    if (readinessAvg > 0 && readinessAvg <= 50) {
      recommendations.push({
        recommendation_type: "deload_microcycle",
        rationale: `Recent readiness average is ${readinessAvg.toFixed(1)}, which indicates elevated fatigue.`,
        payload: {
          action: "deload",
          duration_days: 7,
          reduce_volume_percent: 20,
          reduce_intensity_percent: 8,
          priority: "medium",
        },
      });
    }

    if (!recommendations.length) {
      recommendations.push({
        recommendation_type: "progression_nudge",
        rationale: "No major fatigue or adherence issues detected. Continue with progressive overload.",
        payload: {
          action: "increase_load_when_top_reps_hit",
          increment_percent: 2.5,
          priority: "low",
        },
      });
    }

    const insertedIds: string[] = [];
    for (const rec of recommendations) {
      const { data: insertedRec, error: insertError } = await supabase
        .from("workout_adaptation_recommendations")
        .insert({
          user_id: authData.user.id,
          plan_id: planId,
          recommendation_type: rec.recommendation_type,
          payload_json: rec.payload,
          rationale: rec.rationale,
          status: "pending",
        })
        .select("id")
        .single();

      if (insertError || !insertedRec) {
        return jsonResponse({ success: false, error: insertError?.message || "Failed to create recommendation" }, 500);
      }
      insertedIds.push(insertedRec.id);

      await supabase.from("workout_adaptation_events").insert({
        user_id: authData.user.id,
        plan_id: planId,
        event_type: rec.recommendation_type,
        metrics_json: {
          consecutiveMissed,
          avgRpe,
          totalSets,
          readinessAvg,
          contextWindowDays,
        },
        recommended_changes_json: rec.payload,
        status: "detected",
      });
    }

    return jsonResponse({
      success: true,
      planId,
      contextWindowDays,
      diagnostics: {
        consecutiveMissed,
        avgRpe: Number(avgRpe.toFixed(2)),
        totalSets,
        readinessAvg: Number(readinessAvg.toFixed(2)),
      },
      recommendations: recommendations.map((rec, idx) => ({ id: insertedIds[idx], ...rec })),
    });
  } catch (err: any) {
    return jsonResponse({ success: false, error: err?.message || "Internal error" }, 500);
  }
});
