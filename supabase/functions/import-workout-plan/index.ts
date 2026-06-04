import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
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

type TechniqueType =
  | "tempo"
  | "pause_reps"
  | "superset"
  | "giant_set"
  | "drop_set"
  | "rest_pause"
  | "amrap"
  | "warmup_protocol"
  | null;

type NormalizedExercise = {
  source_name: string;
  mapped_exercise_id: string | null;
  sets_target: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  tempo: string | null;
  technique_type: TechniqueType;
  notes: string | null;
};

type NormalizedDay = {
  name: string;
  day_type: "workout" | "rest" | "conditioning" | "recovery";
  exercises: NormalizedExercise[];
};

type NormalizedPlan = {
  name: string;
  description: string;
  days: NormalizedDay[];
};

type ImportInput = {
  sourceType?: "text" | "json" | "csv";
  payload?: unknown;
  format?: string;
  activate?: boolean;
  jobId?: string;
  mappings?: Array<{ sourceExerciseName: string; mappedExerciseId: string }>;
};

function normalizeName(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ");
}

function parseRepToken(token: string) {
  const matchRange = token.match(/(\d+)\s*[-x]\s*(\d+)/i);
  if (matchRange) {
    const a = Number(matchRange[1]);
    const b = Number(matchRange[2]);
    if (token.includes("x") && a <= 30 && b <= 50) {
      return { repsMin: b, repsMax: b, sets: a };
    }
    return { repsMin: Math.min(a, b), repsMax: Math.max(a, b), sets: 3 };
  }

  const matchSingle = token.match(/\d+/);
  if (!matchSingle) return { repsMin: 8, repsMax: 12, sets: 3 };
  const v = Number(matchSingle[0]);
  return { repsMin: v, repsMax: v, sets: 3 };
}

function parseTechnique(source: string): TechniqueType {
  const s = source.toLowerCase();
  if (s.includes("superset")) return "superset";
  if (s.includes("giant")) return "giant_set";
  if (s.includes("drop")) return "drop_set";
  if (s.includes("rest pause") || s.includes("rest-pause")) return "rest_pause";
  if (s.includes("amrap")) return "amrap";
  if (s.includes("pause")) return "pause_reps";
  if (s.includes("tempo")) return "tempo";
  if (s.includes("warmup") || s.includes("warm-up")) return "warmup_protocol";
  return null;
}

function parseTextPlan(text: string): { plan: NormalizedPlan; staging: Array<{ line: number; raw: string; parsed: Record<string, unknown> }>; warnings: string[] } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const days: NormalizedDay[] = [];
  const staging: Array<{ line: number; raw: string; parsed: Record<string, unknown> }> = [];
  const warnings: string[] = [];
  let currentDay: NormalizedDay | null = null;

  lines.forEach((line, idx) => {
    const dayMatch = line.match(/^(day\s*\d+|push|pull|legs|upper|lower|rest|conditioning|recovery|chest|back|shoulders|arms)[:\-]?\s*(.*)$/i);
    if (dayMatch && (line.toLowerCase().startsWith("day") || line.length < 28)) {
      const base = dayMatch[1];
      const suffix = dayMatch[2]?.trim();
      const dayName = suffix ? `${base} ${suffix}` : base;
      const dayType = normalizeName(dayName).includes("rest")
        ? "rest"
        : normalizeName(dayName).includes("conditioning")
          ? "conditioning"
          : normalizeName(dayName).includes("recovery")
            ? "recovery"
            : "workout";

      currentDay = { name: dayName, day_type: dayType, exercises: [] };
      days.push(currentDay);
      staging.push({ line: idx + 1, raw: line, parsed: { type: "day", name: dayName, day_type: dayType } });
      return;
    }

    if (!currentDay) {
      currentDay = { name: `Day ${days.length + 1}`, day_type: "workout", exercises: [] };
      days.push(currentDay);
    }

    // Exercise heuristics: "Bench Press - 4x8-10 @120s"
    const parts = line.split(/[-–—]/).map((x) => x.trim()).filter(Boolean);
    const sourceName = parts[0] || line;
    const tail = parts.slice(1).join(" ");
    const reps = parseRepToken(tail || line);
    const restMatch = (tail || line).match(/(\d{2,3})\s*(s|sec|seconds)/i);
    const restSeconds = restMatch ? Number(restMatch[1]) : 90;
    const technique = parseTechnique(line);
    const tempoMatch = line.match(/(\d-\d-\d)/);

    const parsedExercise: NormalizedExercise = {
      source_name: sourceName,
      mapped_exercise_id: null,
      sets_target: Math.max(1, Math.min(20, reps.sets)),
      reps_min: Math.max(1, Math.min(100, reps.repsMin)),
      reps_max: Math.max(1, Math.min(100, reps.repsMax)),
      rest_seconds: Math.max(0, Math.min(600, restSeconds)),
      tempo: tempoMatch ? tempoMatch[1] : null,
      technique_type: technique,
      notes: null,
    };

    currentDay.exercises.push(parsedExercise);
    staging.push({ line: idx + 1, raw: line, parsed: { type: "exercise", ...parsedExercise } });
  });

  if (!days.length) {
    warnings.push("No explicit day blocks detected. Created a single workout day.");
    days.push({ name: "Day 1", day_type: "workout", exercises: [] });
  }

  return {
    plan: {
      name: "Imported Workout Plan",
      description: "Imported from text",
      days,
    },
    staging,
    warnings,
  };
}

function parseCsvPlan(csv: string): { plan: NormalizedPlan; staging: Array<{ line: number; raw: string; parsed: Record<string, unknown> }>; warnings: string[] } {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const headers = (lines[0] || "").split(",").map((h) => normalizeName(h));
  const idx = {
    day: headers.findIndex((h) => h === "day" || h === "day name"),
    exercise: headers.findIndex((h) => h === "exercise" || h === "exercise name"),
    sets: headers.findIndex((h) => h === "sets"),
    reps: headers.findIndex((h) => h === "reps" || h === "rep range"),
    rest: headers.findIndex((h) => h === "rest" || h === "rest seconds"),
    tempo: headers.findIndex((h) => h === "tempo"),
    technique: headers.findIndex((h) => h === "technique"),
    notes: headers.findIndex((h) => h === "notes"),
  };

  const daysMap = new Map<string, NormalizedDay>();
  const staging: Array<{ line: number; raw: string; parsed: Record<string, unknown> }> = [];
  const warnings: string[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const row = lines[i].split(",").map((cell) => cell.trim());
    const dayName = (idx.day >= 0 ? row[idx.day] : null) || `Day ${Math.max(1, i)}`;
    const exerciseName = idx.exercise >= 0 ? row[idx.exercise] : "";
    if (!exerciseName) {
      warnings.push(`Line ${i + 1}: missing exercise name`);
      continue;
    }

    const repsParsed = parseRepToken(idx.reps >= 0 ? row[idx.reps] || "8-12" : "8-12");
    const sets = idx.sets >= 0 ? Number(row[idx.sets] || repsParsed.sets) : repsParsed.sets;
    const rest = idx.rest >= 0 ? Number(row[idx.rest] || 90) : 90;
    const technique = idx.technique >= 0 ? parseTechnique(row[idx.technique] || "") : null;

    if (!daysMap.has(dayName)) {
      daysMap.set(dayName, {
        name: dayName,
        day_type: normalizeName(dayName).includes("rest") ? "rest" : "workout",
        exercises: [],
      });
    }

    const ex: NormalizedExercise = {
      source_name: exerciseName,
      mapped_exercise_id: null,
      sets_target: Math.max(1, Math.min(20, Number.isFinite(sets) ? sets : 3)),
      reps_min: Math.max(1, Math.min(100, repsParsed.repsMin)),
      reps_max: Math.max(1, Math.min(100, repsParsed.repsMax)),
      rest_seconds: Math.max(0, Math.min(600, Number.isFinite(rest) ? rest : 90)),
      tempo: idx.tempo >= 0 ? row[idx.tempo] || null : null,
      technique_type: technique,
      notes: idx.notes >= 0 ? row[idx.notes] || null : null,
    };

    daysMap.get(dayName)!.exercises.push(ex);
    staging.push({ line: i + 1, raw: lines[i], parsed: { type: "exercise", day: dayName, ...ex } });
  }

  return {
    plan: {
      name: "Imported Workout Plan",
      description: "Imported from CSV",
      days: Array.from(daysMap.values()),
    },
    staging,
    warnings,
  };
}

function parseJsonPlan(payload: unknown): { plan: NormalizedPlan; staging: Array<{ line: number; raw: string; parsed: Record<string, unknown> }>; warnings: string[] } {
  const src = typeof payload === "string" ? JSON.parse(payload) : payload;
  const root = (src || {}) as Record<string, unknown>;
  const daysRaw = Array.isArray(root.days) ? root.days : [];

  const days: NormalizedDay[] = daysRaw.map((day, index) => {
    const d = (day || {}) as Record<string, unknown>;
    const exercisesRaw = Array.isArray(d.exercises) ? d.exercises : [];
    const exercises: NormalizedExercise[] = exercisesRaw.map((exercise) => {
      const ex = (exercise || {}) as Record<string, unknown>;
      const repToken = typeof ex.reps === "string" ? ex.reps : `${ex.reps_min || 8}-${ex.reps_max || 12}`;
      const parsed = parseRepToken(repToken);
      const sets = Number(ex.sets_target || ex.sets || parsed.sets || 3);
      return {
        source_name: String(ex.source_name || ex.exercise_name || ex.name || "Unknown Exercise"),
        mapped_exercise_id: typeof ex.mapped_exercise_id === "string" ? ex.mapped_exercise_id : null,
        sets_target: Math.max(1, Math.min(20, Number.isFinite(sets) ? sets : 3)),
        reps_min: Math.max(1, Math.min(100, Number(ex.reps_min || parsed.repsMin || 8))),
        reps_max: Math.max(1, Math.min(100, Number(ex.reps_max || parsed.repsMax || 12))),
        rest_seconds: Math.max(0, Math.min(600, Number(ex.rest_seconds || 90))),
        tempo: ex.tempo ? String(ex.tempo) : null,
        technique_type: parseTechnique(String(ex.technique_type || ex.technique || "")),
        notes: ex.notes ? String(ex.notes) : null,
      };
    });

    return {
      name: String(d.name || `Day ${index + 1}`),
      day_type: normalizeName(String(d.day_type || d.name || "")).includes("rest")
        ? "rest"
        : normalizeName(String(d.day_type || d.name || "")).includes("conditioning")
          ? "conditioning"
          : normalizeName(String(d.day_type || d.name || "")).includes("recovery")
            ? "recovery"
            : "workout",
      exercises,
    };
  });

  return {
    plan: {
      name: String(root.name || "Imported Workout Plan"),
      description: String(root.description || "Imported from JSON"),
      days: days.length ? days : [{ name: "Day 1", day_type: "workout", exercises: [] }],
    },
    staging: [],
    warnings: [],
  };
}

async function mapExercises(plan: NormalizedPlan, supabase: SupabaseClient) {
  const { data: exerciseRows, error } = await supabase
    .from("exercises")
    .select("id, name")
    .limit(2000);

  if (error) throw new Error(error.message || "Failed to load exercise catalog");

  const byExact = new Map<string, { id: string; name: string }>();
  const all = (exerciseRows || []).map((row) => ({ id: row.id, name: row.name, normalized: normalizeName(row.name) }));
  all.forEach((row) => byExact.set(row.normalized, { id: row.id, name: row.name }));

  const unresolved: Array<{ sourceExerciseName: string; suggestedExerciseName?: string; suggestedExerciseId?: string; confidence: number }> = [];
  const decisions: Array<{ source_exercise_name: string; mapped_exercise_id: string | null; confidence: number; decided_by: "system" | "user" }> = [];

  for (const day of plan.days) {
    for (const ex of day.exercises) {
      const key = normalizeName(ex.source_name);
      const exact = byExact.get(key);
      if (exact) {
        ex.mapped_exercise_id = exact.id;
        decisions.push({ source_exercise_name: ex.source_name, mapped_exercise_id: exact.id, confidence: 1, decided_by: "system" });
        continue;
      }

      const partial = all.find((candidate) => candidate.normalized.includes(key) || key.includes(candidate.normalized));
      if (partial) {
        ex.mapped_exercise_id = partial.id;
        decisions.push({ source_exercise_name: ex.source_name, mapped_exercise_id: partial.id, confidence: 0.7, decided_by: "system" });
        unresolved.push({
          sourceExerciseName: ex.source_name,
          suggestedExerciseName: partial.name,
          suggestedExerciseId: partial.id,
          confidence: 0.7,
        });
        continue;
      }

      ex.mapped_exercise_id = null;
      decisions.push({ source_exercise_name: ex.source_name, mapped_exercise_id: null, confidence: 0, decided_by: "system" });
      unresolved.push({ sourceExerciseName: ex.source_name, confidence: 0 });
    }
  }

  return { plan, unresolved, decisions };
}

function getAllowedDays(daysPerWeek: number) {
  const all = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  if (daysPerWeek <= 0) return ["mon", "wed", "fri"];
  if (daysPerWeek >= 7) return all;

  const step = all.length / daysPerWeek;
  const selected: string[] = [];
  for (let i = 0; i < daysPerWeek; i += 1) {
    const day = all[Math.floor(i * step)];
    if (!selected.includes(day)) selected.push(day);
  }
  while (selected.length < daysPerWeek) {
    const next = all.find((d) => !selected.includes(d));
    if (!next) break;
    selected.push(next);
  }
  return selected;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDate(date: Date) {
  return date.toISOString().split("T")[0];
}

async function activateImportedPlan(
  supabase: SupabaseClient,
  userId: string,
  plan: NormalizedPlan,
  jobId: string,
) {
  const workoutDays = plan.days.filter((d) => d.day_type === "workout");
  const daysPerWeek = Math.max(2, Math.min(6, workoutDays.length || 3));

  const { data: maxVersion } = await supabase
    .from("user_workout_plans")
    .select("version")
    .eq("user_id", userId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase
    .from("user_workout_plans")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);

  const { data: newPlan, error: planError } = await supabase
    .from("user_workout_plans")
    .insert({
      user_id: userId,
      generation_run_id: null,
      version: Number(maxVersion?.version || 0) + 1,
      is_active: true,
      name: plan.name,
      description: plan.description,
      start_date: toDate(new Date()),
      total_weeks: 8,
      days_per_week: daysPerWeek,
    })
    .select("id")
    .single();

  if (planError || !newPlan) {
    throw new Error(planError?.message || "Failed to create imported plan");
  }

  const dayIds: string[] = [];
  for (let i = 0; i < workoutDays.length; i += 1) {
    const day = workoutDays[i];
    const { data: dayRow, error: dayError } = await supabase
      .from("user_workout_plan_days")
      .insert({
        plan_id: newPlan.id,
        day_number: i + 1,
        name: day.name,
        focus: day.day_type === "workout" ? "Imported training day" : day.day_type,
      })
      .select("id")
      .single();

    if (dayError || !dayRow) throw new Error(dayError?.message || "Failed to create imported day");
    dayIds.push(dayRow.id);

    const { data: blockRow, error: blockError } = await supabase
      .from("user_workout_plan_blocks")
      .insert({
        plan_day_id: dayRow.id,
        order_index: 1,
        block_type: "normal",
        title: "Imported Block",
        config_json: { imported: true, job_id: jobId },
        is_user_modified: true,
      })
      .select("id")
      .single();

    if (blockError || !blockRow) throw new Error(blockError?.message || "Failed to create imported day block");

    const payload = day.exercises
      .filter((ex) => ex.mapped_exercise_id)
      .map((ex, idx) => ({
        plan_day_id: dayRow.id,
        block_id: blockRow.id,
        exercise_id: ex.mapped_exercise_id,
        order_index: idx + 1,
        sets_target: ex.sets_target,
        reps_min: ex.reps_min,
        reps_max: ex.reps_max,
        rest_seconds: ex.rest_seconds,
        tempo: ex.tempo,
        technique_type: ex.technique_type,
        technique_config_json: {
          imported: true,
          technique: ex.technique_type,
        },
        set_style: ex.technique_type === "drop_set" ? "pyramid" : "straight",
        pause_seconds: ex.technique_type === "pause_reps" ? 2 : null,
        user_notes: ex.notes,
        is_user_modified: true,
        original_exercise_id: ex.mapped_exercise_id,
      }));

    if (payload.length) {
      const { error: exError } = await supabase.from("user_workout_plan_exercises").insert(payload);
      if (exError) throw new Error(exError.message || "Failed to create imported exercises");
    }
  }

  // 4-week schedule
  const allowedDays = getAllowedDays(daysPerWeek);
  const weekStart = startOfWeek(new Date());
  let dayPointer = 0;

  for (let offset = 0; offset < 28; offset += 1) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + offset);
    const weekday = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][date.getDay()];
    const isWorkout = allowedDays.includes(weekday);

    const entry = isWorkout
      ? {
        plan_id: newPlan.id,
        plan_day_id: dayIds[dayPointer % dayIds.length],
        scheduled_date: toDate(date),
        session_type: "workout",
        status: "planned",
      }
      : {
        plan_id: newPlan.id,
        plan_day_id: null,
        scheduled_date: toDate(date),
        session_type: "rest",
        status: "planned",
      };

    if (isWorkout) dayPointer += 1;

    const { error: scheduleError } = await supabase.from("user_workout_plan_schedule").insert(entry);
    if (scheduleError) throw new Error(scheduleError.message || "Failed to create imported schedule");
  }

  await supabase
    .from("workout_import_jobs")
    .update({ status: "activated", activated_plan_id: newPlan.id, completed_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("user_id", userId);

  return newPlan.id;
}

async function resolveMappingsAndMaybeActivate(
  supabase: SupabaseClient,
  userId: string,
  jobId: string,
  mappings: Array<{ sourceExerciseName: string; mappedExerciseId: string }>,
  activate: boolean,
) {
  const { data: job, error: jobError } = await supabase
    .from("workout_import_jobs")
    .select("id, user_id, normalized_plan_json")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();

  if (jobError || !job) throw new Error(jobError?.message || "Import job not found");

  const normalized = (job.normalized_plan_json || {}) as NormalizedPlan;
  const map = new Map(mappings.map((m) => [normalizeName(m.sourceExerciseName), m.mappedExerciseId]));

  for (const day of normalized.days || []) {
    for (const ex of day.exercises || []) {
      if (!ex.mapped_exercise_id) {
        const mapped = map.get(normalizeName(ex.source_name));
        if (mapped) ex.mapped_exercise_id = mapped;
      }
    }
  }

  const unresolved = (normalized.days || [])
    .flatMap((day) => day.exercises || [])
    .filter((ex) => !ex.mapped_exercise_id)
    .map((ex) => ({ sourceExerciseName: ex.source_name, confidence: 0 }));

  await supabase
    .from("workout_import_jobs")
    .update({
      normalized_plan_json: normalized,
      unresolved_mappings_json: unresolved,
      status: unresolved.length ? "needs_mapping" : "validated",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("user_id", userId);

  for (const mapping of mappings) {
    await supabase.from("workout_import_mapping_decisions").insert({
      job_id: jobId,
      source_exercise_name: mapping.sourceExerciseName,
      mapped_exercise_id: mapping.mappedExerciseId,
      confidence: 1,
      decided_by: "user",
    });
  }

  let activatedPlanId: string | null = null;
  if (activate && !unresolved.length) {
    activatedPlanId = await activateImportedPlan(supabase, userId, normalized, jobId);
  }

  return {
    jobId,
    unresolvedMappings: unresolved,
    status: activatedPlanId ? "activated" : unresolved.length ? "needs_mapping" : "validated",
    activatedPlanId,
  };
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

    const { data: authData, error: authError } = await verifyClerkRequest(req);
    if (authError || !authData?.user) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const body = (await req.json()) as ImportInput;

    if (body.jobId && Array.isArray(body.mappings)) {
      const resolved = await resolveMappingsAndMaybeActivate(
        supabase,
        authData.user.id,
        body.jobId,
        body.mappings,
        body.activate === true,
      );

      return jsonResponse({ success: true, ...resolved });
    }

    const sourceType = body.sourceType || "text";
    const activate = body.activate === true;

    if (!["text", "json", "csv"].includes(sourceType)) {
      return jsonResponse({ success: false, error: "Invalid sourceType" }, 400);
    }

    if (body.payload === null || body.payload === undefined || body.payload === "") {
      return jsonResponse({ success: false, error: "payload is required" }, 400);
    }

    let parsed: { plan: NormalizedPlan; staging: Array<{ line: number; raw: string; parsed: Record<string, unknown> }>; warnings: string[] };
    if (sourceType === "json") {
      parsed = parseJsonPlan(body.payload);
    } else if (sourceType === "csv") {
      parsed = parseCsvPlan(String(body.payload));
    } else {
      parsed = parseTextPlan(String(body.payload));
    }

    const mapped = await mapExercises(parsed.plan, supabase);
    const plan = mapped.plan;

    const dayCount = plan.days.length;
    const exerciseCount = plan.days.reduce((acc, day) => acc + day.exercises.length, 0);
    const unresolvedCount = mapped.unresolved.length;

    const validationSummary = {
      dayCount,
      exerciseCount,
      unresolvedCount,
      warnings: parsed.warnings,
      strictValidation: {
        hasDays: dayCount > 0,
        hasExercises: exerciseCount > 0,
        unresolvedAllowedForActivation: false,
      },
    };

    const status = unresolvedCount ? "needs_mapping" : "validated";

    const { data: job, error: jobError } = await supabase
      .from("workout_import_jobs")
      .insert({
        user_id: authData.user.id,
        status,
        source_type: sourceType,
        source_payload: String(body.payload).slice(0, 40000),
        normalized_plan_json: plan,
        validation_summary_json: validationSummary,
        unresolved_mappings_json: mapped.unresolved,
      })
      .select("id")
      .single();

    if (jobError || !job) {
      return jsonResponse({ success: false, error: jobError?.message || "Failed to create import job" }, 500);
    }

    if (parsed.staging.length) {
      const rows = parsed.staging.map((row) => ({
        job_id: job.id,
        line_number: row.line,
        raw_line: row.raw,
        parsed_json: row.parsed,
      }));
      await supabase.from("workout_import_staging_rows").insert(rows);
    }

    if (mapped.decisions.length) {
      const decisions = mapped.decisions.map((decision) => ({
        job_id: job.id,
        source_exercise_name: decision.source_exercise_name,
        mapped_exercise_id: decision.mapped_exercise_id,
        confidence: decision.confidence,
        decided_by: decision.decided_by,
      }));
      await supabase.from("workout_import_mapping_decisions").insert(decisions);
    }

    if (parsed.warnings.length) {
      const warnings = parsed.warnings.map((warning) => ({
        job_id: job.id,
        code: "PARSER_WARNING",
        message: warning,
        severity: "warning",
      }));
      await supabase.from("workout_import_errors").insert(warnings);
    }

    let activatedPlanId: string | null = null;
    if (activate && unresolvedCount === 0) {
      activatedPlanId = await activateImportedPlan(supabase, authData.user.id, plan, job.id);
    }

    return jsonResponse({
      success: true,
      jobId: job.id,
      status: activatedPlanId ? "activated" : status,
      validationSummary,
      unresolvedMappings: mapped.unresolved,
      activatedPlanId,
    });
  } catch (err: any) {
    return jsonResponse({ success: false, error: err?.message || "Internal error" }, 500);
  }
});
