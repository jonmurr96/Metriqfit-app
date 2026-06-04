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

function toDateString(date: Date) {
  return date.toISOString().split("T")[0];
}

function weekWindow(dateText: string) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  const day = date.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    from: toDateString(monday),
    to: toDateString(sunday),
  };
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

    const { data: authData, error: authError } = await verifyClerkRequest(req);
    if (authError || !authData?.user) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const body = await req.json() as {
      plan_id?: string;
      schedule_id?: string;
      from_date?: string;
      to_date?: string;
      notes?: string;
    };

    if (!body.to_date) {
      return jsonResponse({ success: false, error: "to_date is required" }, 400);
    }

    let fromEntry: {
      id: string;
      plan_id: string;
      plan_day_id: string | null;
      scheduled_date: string;
      session_type: string;
      status: string;
      notes: string | null;
      original_date: string | null;
    } | null = null;

    if (body.schedule_id) {
      const { data, error } = await supabase
        .from("user_workout_plan_schedule")
        .select("id, plan_id, plan_day_id, scheduled_date, session_type, status, notes, original_date")
        .eq("id", body.schedule_id)
        .single();

      if (error || !data) return jsonResponse({ success: false, error: "Schedule entry not found" }, 404);
      fromEntry = data;
    } else {
      if (!body.plan_id || !body.from_date) {
        return jsonResponse({ success: false, error: "plan_id and from_date are required when schedule_id is not provided" }, 400);
      }

      const { data, error } = await supabase
        .from("user_workout_plan_schedule")
        .select("id, plan_id, plan_day_id, scheduled_date, session_type, status, notes, original_date")
        .eq("plan_id", body.plan_id)
        .eq("scheduled_date", body.from_date)
        .single();

      if (error || !data) return jsonResponse({ success: false, error: "Source workout day not found" }, 404);
      fromEntry = data;
    }

    if (!fromEntry) return jsonResponse({ success: false, error: "Source workout day not found" }, 404);

    const { data: plan, error: planError } = await supabase
      .from("user_workout_plans")
      .select("id, user_id")
      .eq("id", fromEntry.plan_id)
      .single();

    if (planError || !plan || plan.user_id !== authData.user.id) {
      return jsonResponse({ success: false, error: "Schedule does not belong to user" }, 403);
    }

    if (fromEntry.session_type !== "workout") {
      return jsonResponse({ success: false, error: "Only workout sessions can be rescheduled" }, 400);
    }

    const fromDate = fromEntry.scheduled_date;
    const toDate = body.to_date;

    if (fromDate === toDate) {
      const range = weekWindow(toDate);
      const { data: weekSchedule } = await supabase
        .from("user_workout_plan_schedule")
        .select("id, plan_id, plan_day_id, scheduled_date, session_type, status, original_date, notes, completed_session_id, plan_day:user_workout_plan_days(id, day_number, name, focus)")
        .eq("plan_id", fromEntry.plan_id)
        .gte("scheduled_date", range.from)
        .lte("scheduled_date", range.to)
        .order("scheduled_date", { ascending: true });

      return jsonResponse({
        success: true,
        message: "No change needed",
        week_schedule: weekSchedule || [],
      });
    }

    const { data: targetEntry, error: targetError } = await supabase
      .from("user_workout_plan_schedule")
      .select("id, session_type, status")
      .eq("plan_id", fromEntry.plan_id)
      .eq("scheduled_date", toDate)
      .maybeSingle();

    if (targetError) return jsonResponse({ success: false, error: targetError.message }, 500);

    if (targetEntry && targetEntry.session_type === "workout") {
      return jsonResponse({ success: false, error: "Target date already has a workout session" }, 409);
    }

    if (targetEntry) {
      const { error: toUpdateError } = await supabase
        .from("user_workout_plan_schedule")
        .update({
          session_type: "workout",
          plan_day_id: fromEntry.plan_day_id,
          status: "rescheduled",
          original_date: fromDate,
          notes: body.notes || fromEntry.notes,
        })
        .eq("id", targetEntry.id);

      if (toUpdateError) {
        return jsonResponse({ success: false, error: toUpdateError.message }, 500);
      }

      const { error: fromUpdateError } = await supabase
        .from("user_workout_plan_schedule")
        .update({
          session_type: "rest",
          plan_day_id: null,
          status: "rescheduled",
          notes: body.notes || fromEntry.notes,
        })
        .eq("id", fromEntry.id);

      if (fromUpdateError) {
        return jsonResponse({ success: false, error: fromUpdateError.message }, 500);
      }
    } else {
      const { error: updateError } = await supabase
        .from("user_workout_plan_schedule")
        .update({
          scheduled_date: toDate,
          status: "rescheduled",
          original_date: fromDate,
          notes: body.notes || fromEntry.notes,
        })
        .eq("id", fromEntry.id);

      if (updateError) {
        return jsonResponse({ success: false, error: updateError.message }, 500);
      }
    }

    const range = weekWindow(toDate);
    const { data: weekSchedule, error: weekError } = await supabase
      .from("user_workout_plan_schedule")
      .select("id, plan_id, plan_day_id, scheduled_date, session_type, status, original_date, notes, completed_session_id, plan_day:user_workout_plan_days(id, day_number, name, focus)")
      .eq("plan_id", fromEntry.plan_id)
      .gte("scheduled_date", range.from)
      .lte("scheduled_date", range.to)
      .order("scheduled_date", { ascending: true });

    if (weekError) return jsonResponse({ success: false, error: weekError.message }, 500);

    return jsonResponse({
      success: true,
      from_date: fromDate,
      to_date: toDate,
      week_schedule: weekSchedule || [],
    });
  } catch (error) {
    const err = error as Error;
    console.error("[reschedule-workout-day]", err);
    return jsonResponse({ success: false, error: err.message || "Internal error" }, 500);
  }
});
