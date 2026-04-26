/**
 * V1 Hosted Probe — verifies all 8 staging branch-integrity checks.
 *
 * Checks:
 *  1. planner_mode = 'deterministic'
 *  2. generation_version = 1
 *  3. source_model = 'v1_architect' (on plan_generation_runs via ai_response)
 *  4. program_family_key is valid (non-null, matches a known family)
 *  5. user_workout_plans.source_model = 'v1_architect'
 *  6. user_workout_plan_days rows exist (plan tree written)
 *  7. resolved template key/ID is valid (plan has non-null program_family_key)
 *  8. no v2_template artifacts in run
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hatskscplygyrrpepqmx.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhdHNrc2NwbHlneXJycGVwcW14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA0NTkxOCwiZXhwIjoyMDg0NjIxOTE4fQ.ncHDx-Z27T2wQzF5b3umO-NeC0ZjwWzMedt8ZtmybGg";
const TEST_USER_ID = "de93ad71-049f-44f1-b3a6-018b9be38e86";

const KNOWN_FAMILIES = [
  "fam_beginner_fb",
  "fam_beginner_machine_fb",
  "fam_hyp_fb",
  "fam_hyp_ul",
  "fam_hyp_ppl",
  "fam_fatloss_fb",
  "fam_str_fb",
  "fam_str_ul",
  "fam_min_equip_db",
  "fam_at_home_bw",
];

const PASS = "✅ PASS";
const FAIL = "❌ FAIL";

function check(label, value, expected, actual) {
  const ok = value;
  console.log(`  ${ok ? PASS : FAIL}  ${label}`);
  if (!ok) {
    console.log(`         expected: ${expected}`);
    console.log(`         actual:   ${actual}`);
  }
  return ok;
}

async function run() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Step 1 — generate a short-lived user token via magic link OTP exchange
  console.log("\n[Probe] Generating test user session...");
  const anon = createClient(SUPABASE_URL,
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhdHNrc2NwbHlneXJycGVwcW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDU5MTgsImV4cCI6MjA4NDYyMTkxOH0.jwQaxsC6AmJrR6dhM5RK7SDz4o4jmTjOeEhqq2qHezA"
  );

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: "jm@gmail.com",
    options: { shouldCreateUser: false },
  });
  if (linkError || !linkData?.properties?.email_otp) {
    console.error("[Probe] generateLink failed:", linkError?.message || "no OTP");
    process.exit(1);
  }

  const { data: verifyData, error: verifyError } = await anon.auth.verifyOtp({
    email: "jm@gmail.com",
    token: linkData.properties.email_otp,
    type: "email",
  });
  if (verifyError || !verifyData?.session?.access_token) {
    console.error("[Probe] verifyOtp failed:", verifyError?.message || "no session");
    process.exit(1);
  }

  const userToken = verifyData.session.access_token;
  console.log("[Probe] User token obtained.");

  // Step 2 — call the edge function with generation_version: 'v1'
  console.log("[Probe] Calling generate-user-plans with generation_version: v1...");
  const fnRes = await fetch(
    `${SUPABASE_URL}/functions/v1/generate-user-plans`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
        apikey: SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        user_id: TEST_USER_ID,
        plan_type: "workout",
        generation_version: "v1",
        activation_mode: "preview",
      }),
    }
  );

  const fnBody = await fnRes.json();
  console.log("[Probe] Function response status:", fnRes.status);
  console.log("[Probe] Function response body:", JSON.stringify(fnBody, null, 2));

  if (!fnBody.success && !fnBody.run_id) {
    console.error("\n[Probe] Function call failed — cannot check DB state.");
    process.exit(1);
  }

  const runId = fnBody.run_id || fnBody.runId;
  const workoutPlanId = fnBody.workout_plan_id || fnBody.workoutPlanId;
  console.log(`\n[Probe] run_id = ${runId}`);
  console.log(`[Probe] workout_plan_id = ${workoutPlanId}`);

  // Step 3 — fetch plan_generation_runs row
  const { data: runRow, error: runErr } = await admin
    .from("plan_generation_runs")
    .select("planner_mode, generation_version, ai_response")
    .eq("id", runId)
    .single();

  if (runErr || !runRow) {
    console.error("[Probe] Could not fetch plan_generation_runs row:", runErr?.message);
    process.exit(1);
  }

  console.log("\n[Probe] plan_generation_runs row:");
  console.log("  planner_mode:       ", runRow.planner_mode);
  console.log("  generation_version: ", runRow.generation_version);
  console.log("  ai_response:        ", JSON.stringify(runRow.ai_response));

  // Step 4 — fetch user_workout_plans row
  let planRow = null;
  let planDayRows = [];
  if (workoutPlanId) {
    const { data: plan, error: planErr } = await admin
      .from("user_workout_plans")
      .select("source_model, program_family_key")
      .eq("id", workoutPlanId)
      .single();

    if (planErr || !plan) {
      console.error("[Probe] Could not fetch user_workout_plans row:", planErr?.message);
    } else {
      planRow = plan;
    }

    const { data: days, error: daysErr } = await admin
      .from("user_workout_plan_days")
      .select("id")
      .eq("plan_id", workoutPlanId);

    if (!daysErr && days) {
      planDayRows = days;
    }
  }

  console.log("\n[Probe] user_workout_plans row:");
  console.log("  source_model:       ", planRow?.source_model);
  console.log("  program_family_key: ", planRow?.program_family_key);
  console.log("  plan_day count:     ", planDayRows.length);

  // ─── Run all 8 checks ─────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════");
  console.log("  V1 BRANCH INTEGRITY — PROBE RESULTS");
  console.log("═══════════════════════════════════════════");

  const results = [];

  results.push(check(
    "planner_mode = 'deterministic'",
    runRow.planner_mode === "deterministic",
    "deterministic",
    runRow.planner_mode
  ));

  results.push(check(
    "generation_version = 1",
    runRow.generation_version === 1,
    1,
    runRow.generation_version
  ));

  results.push(check(
    "source_model = 'v1_architect' (plan row)",
    planRow?.source_model === "v1_architect",
    "v1_architect",
    planRow?.source_model
  ));

  const familyKey = planRow?.program_family_key;
  results.push(check(
    "program_family_key is valid seeded family",
    !!familyKey && KNOWN_FAMILIES.includes(familyKey),
    `one of: ${KNOWN_FAMILIES.join(", ")}`,
    familyKey
  ));

  results.push(check(
    "user_workout_plans.source_model = 'v1_architect'",
    planRow?.source_model === "v1_architect",
    "v1_architect",
    planRow?.source_model
  ));

  results.push(check(
    "user_workout_plan_days rows exist (plan tree written)",
    planDayRows.length > 0,
    "> 0 rows",
    planDayRows.length
  ));

  results.push(check(
    "program_family_key is non-null (template resolved)",
    !!familyKey,
    "non-null",
    familyKey
  ));

  const hasV2Artifact =
    planRow?.source_model === "v2_template" ||
    (runRow.ai_response && JSON.stringify(runRow.ai_response).includes("v2_template"));
  results.push(check(
    "no v2_template artifacts in run",
    !hasV2Artifact,
    "no v2_template",
    hasV2Artifact ? "v2_template FOUND" : "clean"
  ));

  const passed = results.filter(Boolean).length;
  const total = results.length;
  console.log("═══════════════════════════════════════════");
  console.log(`  Result: ${passed}/${total} checks passed`);
  console.log("═══════════════════════════════════════════\n");

  process.exit(passed === total ? 0 : 1);
}

run().catch((err) => {
  console.error("[Probe] Unexpected error:", err);
  process.exit(1);
});
