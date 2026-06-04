// V3 end-to-end smoke test against the real Supabase project.
//
// Runs the deterministic V3 pipeline against a real user's onboarding row,
// writes plans + diagnostics through the V3 writers, and reports a summary.
// This bypasses the edge function's Clerk JWT auth by talking to Supabase
// directly with the service-role key (read from .env).
//
// Run:
//   deno run --allow-read --allow-env --allow-net \
//     scripts/v3-e2e-smoke.ts <userId>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { runV3Pipeline } from "../supabase/functions/generate-user-plans/pipelines/v3-pipeline.ts";

function loadDotenv(path: string): Record<string, string> {
  try {
    const out: Record<string, string> = {};
    const raw = Deno.readTextFileSync(path);
    for (const line of raw.split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (m) out[m[1]] = m[2].replace(/^"|"$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

const env = { ...loadDotenv(".env"), ...Deno.env.toObject() };
const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  Deno.exit(1);
}

const userId = Deno.args[0];
if (!userId) {
  console.error("Usage: deno run ... scripts/v3-e2e-smoke.ts <userId>");
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// Create a fresh plan_generation_runs row so V3 can persist + audit.
const { data: runRow, error: runErr } = await supabase
  .from("plan_generation_runs")
  .insert({
    user_id: userId,
    plan_type: "both",
    status: "pending",
    planner_mode: "deterministic_v3",
    generation_version: 3,
    input_context: { trigger_source: "v3_e2e_smoke" },
  })
  .select("id")
  .single();

if (runErr || !runRow) {
  console.error("Failed to create generation run row:", runErr?.message);
  Deno.exit(1);
}

console.log(`[v3-e2e] created run ${runRow.id} for user ${userId}`);

try {
  const result = await runV3Pipeline(supabase as any, userId, new Date(), {
    runId: runRow.id,
    persist: true,
    activate: false, // smoke = preview, don't flip is_active
  });

  console.log("\n=== V3 SMOKE RESULT ===");
  console.log("seed:                ", result.spec.seed);
  console.log("validation.passed:   ", result.validation.passed);
  console.log("attempts:            ", result.diagnostics.attempts);
  console.log("exercises_loaded:    ", result.diagnostics.exercises_loaded);
  console.log("foods_loaded:        ", result.diagnostics.foods_loaded);
  console.log("violation_summary:");
  for (const v of result.diagnostics.violation_summary) {
    console.log(`  ${v.severity}/${v.check}: ${v.count}`);
  }
  console.log("persistence:");
  console.log("  workout_plan_id:   ", result.diagnostics.persistence?.workout_plan_id);
  console.log("  nutrition_plan_id: ", result.diagnostics.persistence?.nutrition_plan_id);
  console.log("  warnings (first 5):");
  for (const w of (result.diagnostics.persistence?.warnings ?? []).slice(0, 5)) {
    console.log(`    - ${w}`);
  }
  const warningsTotal = result.diagnostics.persistence?.warnings.length ?? 0;
  if (warningsTotal > 5) console.log(`    ... and ${warningsTotal - 5} more`);

  console.log("\nworkout_weeks:       ", result.plan.workout_weeks.length);
  console.log("nutrition_days:      ", result.plan.nutrition_days.length);
  console.log("\nrun row will be updated automatically by the pipeline.");
} catch (e) {
  console.error("\nV3 pipeline threw:", (e as Error).message);
  Deno.exit(1);
}
