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

function toDateString(date: Date) {
  return date.toISOString().split("T")[0];
}

function dateRange(start: string, end: string) {
  const out: string[] = [];
  const cursor = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);
  while (cursor <= endDate) {
    out.push(toDateString(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function macroScore(consumed: number, target: number, tolerance = 0.1) {
  if (!target || target <= 0) return 0;
  const diffRatio = Math.abs(consumed - target) / target;
  return clamp((1 - diffRatio / tolerance) * 100);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ success: false, error: "Missing Supabase config" }, 500);

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return jsonResponse({ success: false, error: "Missing authorization header" }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({})) as {
      start_date?: string;
      end_date?: string;
      days?: number;
    };

    const today = new Date();
    const endDate = body.end_date || toDateString(today);
    const dayCount = Math.max(1, Math.min(30, Number(body.days || 7)));
    const startDate = body.start_date || (() => {
      const start = new Date(`${endDate}T00:00:00.000Z`);
      start.setUTCDate(start.getUTCDate() - (dayCount - 1));
      return toDateString(start);
    })();

    const allDates = dateRange(startDate, endDate);

    const [{ data: targets }, { data: activeWorkoutPlan }] = await Promise.all([
      supabase
        .from("user_targets")
        .select("calories, protein_g, carbs_g, fat_g, water_ml")
        .eq("user_id", authData.user.id)
        .maybeSingle(),
      supabase
        .from("user_workout_plans")
        .select("id, days_per_week")
        .eq("user_id", authData.user.id)
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    if (!targets) {
      return jsonResponse({ success: false, error: "User targets not found" }, 404);
    }

    const dayStartTs = `${startDate}T00:00:00.000Z`;
    const dayEndTs = `${endDate}T23:59:59.999Z`;

    const [mealLogsRes, waterLogsRes, scheduleRes, sessionsRes] = await Promise.all([
      supabase
        .from("meal_logs")
        .select("id, logged_at, meal_log_items(calories, protein, carbs, fat)")
        .eq("user_id", authData.user.id)
        .gte("logged_at", dayStartTs)
        .lte("logged_at", dayEndTs),
      supabase
        .from("water_logs")
        .select("logged_at, amount_ml")
        .eq("user_id", authData.user.id)
        .gte("logged_at", dayStartTs)
        .lte("logged_at", dayEndTs),
      activeWorkoutPlan
        ? supabase
          .from("user_workout_plan_schedule")
          .select("id, scheduled_date, session_type, status, plan_day_id, completed_session_id")
          .eq("plan_id", activeWorkoutPlan.id)
          .gte("scheduled_date", startDate)
          .lte("scheduled_date", endDate)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("workout_sessions")
        .select("id, started_at, finished_at")
        .eq("user_id", authData.user.id)
        .gte("started_at", dayStartTs)
        .lte("started_at", dayEndTs),
    ]);

    if (mealLogsRes.error) throw new Error(mealLogsRes.error.message);
    if (waterLogsRes.error) throw new Error(waterLogsRes.error.message);
    if (scheduleRes.error) throw new Error(scheduleRes.error.message);
    if (sessionsRes.error) throw new Error(sessionsRes.error.message);

    const mealTotalsByDate = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();
    for (const log of mealLogsRes.data || []) {
      const date = toDateString(new Date(log.logged_at));
      const current = mealTotalsByDate.get(date) || { calories: 0, protein: 0, carbs: 0, fat: 0 };
      for (const item of (log.meal_log_items || []) as Array<{ calories: number; protein: number; carbs: number; fat: number }>) {
        current.calories += Number(item.calories || 0);
        current.protein += Number(item.protein || 0);
        current.carbs += Number(item.carbs || 0);
        current.fat += Number(item.fat || 0);
      }
      mealTotalsByDate.set(date, current);
    }

    const waterByDate = new Map<string, number>();
    for (const log of waterLogsRes.data || []) {
      const date = toDateString(new Date(log.logged_at));
      const current = waterByDate.get(date) || 0;
      waterByDate.set(date, current + Number(log.amount_ml || 0));
    }

    const scheduleByDate = new Map<string, { session_type: string; status: string; completed_session_id: string | null }>();
    for (const row of scheduleRes.data || []) {
      scheduleByDate.set(row.scheduled_date, {
        session_type: row.session_type,
        status: row.status,
        completed_session_id: row.completed_session_id,
      });
    }

    const completedSessionDates = new Set(
      (sessionsRes.data || [])
        .filter((session) => !!session.finished_at)
        .map((session) => toDateString(new Date(session.started_at))),
    );

    let missedWorkoutStreak = 0;
    const results: Array<{
      date: string;
      nutrition_score: number;
      workout_score: number;
      hydration_score: number;
      overall_score: number;
      recommendation: Record<string, unknown>;
    }> = [];

    for (const date of allDates) {
      const nutrition = mealTotalsByDate.get(date) || { calories: 0, protein: 0, carbs: 0, fat: 0 };
      const water = waterByDate.get(date) || 0;
      const schedule = scheduleByDate.get(date) || null;

      const proteinAdherence = macroScore(nutrition.protein, targets.protein_g, 0.1);
      const carbsAdherence = macroScore(nutrition.carbs, targets.carbs_g, 0.1);
      const fatAdherence = macroScore(nutrition.fat, targets.fat_g, 0.1);
      const nutritionScore = round1((proteinAdherence + carbsAdherence + fatAdherence) / 3);

      let workoutScore = 100;
      let workoutStatus = "rest_day";
      if (schedule && schedule.session_type === "workout") {
        const completed = !!schedule.completed_session_id || completedSessionDates.has(date) || schedule.status === "completed";
        workoutScore = completed ? 100 : (date < toDateString(today) ? 0 : 50);
        workoutStatus = completed ? "completed" : "missed";
      }

      if (schedule && schedule.session_type === "workout" && workoutScore === 0) {
        missedWorkoutStreak += 1;
      } else {
        missedWorkoutStreak = 0;
      }

      const hydrationScore = round1(clamp((water / Math.max(targets.water_ml, 1)) * 100));
      const overallScore = round1(nutritionScore * 0.5 + workoutScore * 0.35 + hydrationScore * 0.15);

      let recommendation: Record<string, unknown> = {
        type: "maintenance",
        title: "Stay consistent",
        message: "Keep following your current plan. Small daily wins compound over time.",
        actions: ["Log meals", "Complete scheduled workouts", "Track hydration"],
      };

      if (proteinAdherence < 70) {
        recommendation = {
          type: "nutrition_protein",
          title: "Protein is behind target",
          message: "Swap one meal to a higher-protein variant and add a lean protein snack.",
          actions: ["Use swap on lunch or dinner", "Add Greek yogurt or shake", "Keep carbs/fat similar"],
        };
      } else if (missedWorkoutStreak >= 2) {
        recommendation = {
          type: "workout_adherence",
          title: "Training frequency is too aggressive",
          message: "You have missed multiple sessions. Consider reducing weekly frequency for better consistency.",
          actions: ["Switch to simpler split", "Use reschedule instead of skip", "Aim for streak of 3 sessions"],
        };
      } else if (hydrationScore < 70) {
        recommendation = {
          type: "hydration",
          title: "Hydration below target",
          message: "Hydration is low. Use timed water reminders and front-load water in the morning.",
          actions: ["500ml on wake-up", "500ml before lunch", "500ml during training"],
        };
      }

      const nutritionStatusJson = {
        calories: round1(nutrition.calories),
        protein: round1(nutrition.protein),
        carbs: round1(nutrition.carbs),
        fat: round1(nutrition.fat),
        target_calories: targets.calories,
        target_protein: targets.protein_g,
        target_carbs: targets.carbs_g,
        target_fat: targets.fat_g,
      };

      const workoutStatusJson = {
        status: workoutStatus,
        planned_type: schedule?.session_type || "rest",
        scheduled_status: schedule?.status || "none",
      };

      const hydrationStatusJson = {
        consumed_ml: water,
        target_ml: targets.water_ml,
      };

      const { error: upsertError } = await supabase
        .from("user_plan_consistency_daily")
        .upsert({
          user_id: authData.user.id,
          log_date: date,
          nutrition_score: nutritionScore,
          workout_score: workoutScore,
          hydration_score: hydrationScore,
          overall_score: overallScore,
          nutrition_status_json: nutritionStatusJson,
          workout_status_json: workoutStatusJson,
          hydration_status_json: hydrationStatusJson,
          recommendation_json: recommendation,
        }, {
          onConflict: "user_id,log_date",
        });

      if (upsertError) throw new Error(upsertError.message);

      results.push({
        date,
        nutrition_score: nutritionScore,
        workout_score: workoutScore,
        hydration_score: hydrationScore,
        overall_score: overallScore,
        recommendation,
      });
    }

    const averageOverall = results.length
      ? round1(results.reduce((sum, row) => sum + row.overall_score, 0) / results.length)
      : 0;

    return jsonResponse({
      success: true,
      start_date: startDate,
      end_date: endDate,
      average_overall_score: averageOverall,
      days: results,
      latest_recommendation: results[results.length - 1]?.recommendation || null,
    });
  } catch (error) {
    const err = error as Error;
    console.error("[compute-plan-consistency]", err);
    return jsonResponse({ success: false, error: err.message || "Internal error" }, 500);
  }
});
