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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const adminSecret = Deno.env.get("WORKOUT_MIGRATION_ADMIN_SECRET");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ success: false, error: "Missing Supabase config" }, 500);
    }

    const body = (await req.json().catch(() => ({}))) as {
      jobId?: string;
      cursorUserId?: string;
      batchSize?: number;
      dryRun?: boolean;
      adminSecret?: string;
    };

    if (adminSecret && body.adminSecret !== adminSecret) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const batchSize = Math.max(1, Math.min(200, Number(body.batchSize || 50)));
    const dryRun = body.dryRun === true;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let jobId = body.jobId || null;
    if (!jobId) {
      const { data: job, error: createJobError } = await supabase
        .from("workout_plan_migration_jobs")
        .insert({ status: "running", started_at: new Date().toISOString() })
        .select("id")
        .single();

      if (createJobError || !job) {
        return jsonResponse({ success: false, error: createJobError?.message || "Failed to create migration job" }, 500);
      }
      jobId = job.id;
    } else {
      await supabase
        .from("workout_plan_migration_jobs")
        .update({ status: "running", started_at: new Date().toISOString() })
        .eq("id", jobId);
    }

    const cursorUserId = body.cursorUserId || null;

    let query = supabase
      .from("user_workout_plans")
      .select("id, user_id, version, name, description, start_date, total_weeks, days_per_week")
      .eq("is_active", true)
      .order("user_id", { ascending: true })
      .limit(batchSize);

    if (cursorUserId) {
      query = query.gt("user_id", cursorUserId);
    }

    const { data: plans, error: plansError } = await query;
    if (plansError) {
      await supabase
        .from("workout_plan_migration_jobs")
        .update({ status: "failed", last_error: plansError.message, updated_at: new Date().toISOString() })
        .eq("id", jobId);
      return jsonResponse({ success: false, error: plansError.message }, 500);
    }

    let processed = 0;
    let success = 0;
    let failed = 0;
    let nextCursor: string | null = null;

    for (const plan of plans || []) {
      processed += 1;
      nextCursor = plan.user_id;

      const { data: existingAudit } = await supabase
        .from("workout_plan_migration_audit")
        .select("id, migration_payload_json")
        .eq("old_plan_id", plan.id)
        .eq("status", "success")
        .limit(1)
        .maybeSingle();

      const dryRunSuccess = Boolean((existingAudit as any)?.migration_payload_json?.dryRun);
      if (existingAudit && !dryRunSuccess) {
        await supabase.from("workout_plan_migration_audit").insert({
          job_id: jobId,
          user_id: plan.user_id,
          old_plan_id: plan.id,
          new_plan_id: null,
          status: "skipped",
          migration_payload_json: { reason: "already_migrated" },
        });
        continue;
      }

      try {
        const { data: maxVersion } = await supabase
          .from("user_workout_plans")
          .select("version")
          .eq("user_id", plan.user_id)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: days, error: daysError } = await supabase
          .from("user_workout_plan_days")
          .select("id, day_number, name, focus, scheduled_date")
          .eq("plan_id", plan.id)
          .order("day_number", { ascending: true });

        if (daysError) throw new Error(daysError.message || "Failed to load plan days");

        const dayIds = (days || []).map((d) => d.id);

        const { data: blocks, error: blocksError } = await supabase
          .from("user_workout_plan_blocks")
          .select("id, plan_day_id, order_index, block_type, title, config_json")
          .in("plan_day_id", dayIds.length ? dayIds : ["00000000-0000-0000-0000-000000000000"]);
        if (blocksError && dayIds.length) throw new Error(blocksError.message || "Failed to load plan blocks");

        const { data: exercises, error: exerciseError } = await supabase
          .from("user_workout_plan_exercises")
          .select("*")
          .in("plan_day_id", dayIds.length ? dayIds : ["00000000-0000-0000-0000-000000000000"])
          .order("order_index", { ascending: true });
        if (exerciseError && dayIds.length) throw new Error(exerciseError.message || "Failed to load exercises");

        const { data: schedule, error: scheduleError } = await supabase
          .from("user_workout_plan_schedule")
          .select("*")
          .eq("plan_id", plan.id)
          .order("scheduled_date", { ascending: true });
        if (scheduleError) throw new Error(scheduleError.message || "Failed to load schedule");

        if (dryRun) {
          success += 1;
          await supabase.from("workout_plan_migration_audit").insert({
            job_id: jobId,
            user_id: plan.user_id,
            old_plan_id: plan.id,
            new_plan_id: null,
            status: "success",
            migration_payload_json: {
              dryRun: true,
              dayCount: days?.length || 0,
              exerciseCount: exercises?.length || 0,
              scheduleCount: schedule?.length || 0,
            },
          });
          continue;
        }

        const { data: newPlan, error: newPlanError } = await supabase
          .from("user_workout_plans")
          .insert({
            user_id: plan.user_id,
            generation_run_id: null,
            version: Number(maxVersion?.version || 0) + 1,
            is_active: false,
            name: `${plan.name} (V2)`,
            description: plan.description,
            start_date: plan.start_date,
            total_weeks: plan.total_weeks,
            days_per_week: plan.days_per_week,
          })
          .select("id")
          .single();

        if (newPlanError || !newPlan) throw new Error(newPlanError?.message || "Failed to create migrated plan");

        const dayMap = new Map<string, string>();
        for (const day of days || []) {
          const { data: newDay, error: dayInsertError } = await supabase
            .from("user_workout_plan_days")
            .insert({
              plan_id: newPlan.id,
              day_number: day.day_number,
              name: day.name,
              focus: day.focus,
              scheduled_date: day.scheduled_date,
              is_completed: false,
            })
            .select("id")
            .single();

          if (dayInsertError || !newDay) throw new Error(dayInsertError?.message || "Failed to copy day");
          dayMap.set(day.id, newDay.id);
        }

        const blockMap = new Map<string, string>();
        if (blocks && blocks.length) {
          for (const block of blocks) {
            const mappedDayId = dayMap.get(block.plan_day_id);
            if (!mappedDayId) continue;
            const { data: newBlock, error: blockInsertError } = await supabase
              .from("user_workout_plan_blocks")
              .insert({
                plan_day_id: mappedDayId,
                order_index: block.order_index,
                block_type: block.block_type,
                title: block.title,
                config_json: block.config_json || {},
                is_user_modified: true,
              })
              .select("id")
              .single();

            if (blockInsertError || !newBlock) throw new Error(blockInsertError?.message || "Failed to copy block");
            blockMap.set(block.id, newBlock.id);
          }
        }

        for (const ex of exercises || []) {
          const mappedDayId = dayMap.get(ex.plan_day_id);
          if (!mappedDayId) continue;

          const { error: exInsertError } = await supabase
            .from("user_workout_plan_exercises")
            .insert({
              plan_day_id: mappedDayId,
              block_id: ex.block_id ? blockMap.get(ex.block_id) || null : null,
              exercise_id: ex.exercise_id,
              order_index: ex.order_index,
              sets_target: ex.sets_target,
              reps_min: ex.reps_min,
              reps_max: ex.reps_max,
              rest_seconds: ex.rest_seconds,
              tempo: ex.tempo,
              technique_type: ex.technique_type,
              technique_config_json: ex.technique_config_json || {},
              set_style: ex.set_style,
              rir_target_min: ex.rir_target_min,
              rir_target_max: ex.rir_target_max,
              rpe_target_min: ex.rpe_target_min,
              rpe_target_max: ex.rpe_target_max,
              pause_seconds: ex.pause_seconds,
              user_notes: ex.user_notes,
              is_user_modified: true,
              original_exercise_id: ex.original_exercise_id || ex.exercise_id,
            });

          if (exInsertError) throw new Error(exInsertError.message || "Failed to copy exercise");
        }

        for (const row of schedule || []) {
          const mappedDayId = row.plan_day_id ? dayMap.get(row.plan_day_id) || null : null;
          const { error: scheduleInsertError } = await supabase
            .from("user_workout_plan_schedule")
            .insert({
              plan_id: newPlan.id,
              plan_day_id: mappedDayId,
              scheduled_date: row.scheduled_date,
              session_type: row.session_type,
              status: row.status,
              original_date: row.original_date,
              completed_session_id: row.completed_session_id,
              notes: row.notes,
            });

          if (scheduleInsertError) throw new Error(scheduleInsertError.message || "Failed to copy schedule");
        }

        await supabase
          .from("user_workout_plans")
          .update({ is_active: false })
          .eq("id", plan.id)
          .eq("user_id", plan.user_id);

        await supabase
          .from("user_workout_plans")
          .update({ is_active: true })
          .eq("id", newPlan.id)
          .eq("user_id", plan.user_id);

        await supabase.from("workout_plan_migration_audit").insert({
          job_id: jobId,
          user_id: plan.user_id,
          old_plan_id: plan.id,
          new_plan_id: newPlan.id,
          status: "success",
          migration_payload_json: {
            copiedDayCount: days?.length || 0,
            copiedExerciseCount: exercises?.length || 0,
            copiedScheduleCount: schedule?.length || 0,
          },
        });

        success += 1;
      } catch (err: any) {
        failed += 1;
        await supabase.from("workout_plan_migration_audit").insert({
          job_id: jobId,
          user_id: plan.user_id,
          old_plan_id: plan.id,
          new_plan_id: null,
          status: "failed",
          error_message: err?.message || "Migration failed",
          migration_payload_json: {
            dryRun,
          },
        });
      }
    }

    const shouldComplete = (plans || []).length < batchSize;
    await supabase
      .from("workout_plan_migration_jobs")
      .update({
        status: shouldComplete ? "completed" : "running",
        total_processed: (processed || 0),
        total_success: (success || 0),
        total_failed: (failed || 0),
        cursor_user_id: nextCursor,
        completed_at: shouldComplete ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return jsonResponse({
      success: true,
      jobId,
      dryRun,
      batchSize,
      processed,
      successCount: success,
      failedCount: failed,
      nextCursor,
      completed: shouldComplete,
    });
  } catch (err: any) {
    return jsonResponse({ success: false, error: err?.message || "Internal error" }, 500);
  }
});
