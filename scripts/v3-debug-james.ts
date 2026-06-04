// Local debug: load James's onboarding from real DB, build spec + plan,
// print per-day exercise lists with muscle volume state.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildUserState } from "../lib/spec/UserState.ts";
import { buildPlanSpec } from "../lib/spec/buildPlanSpec.ts";
import { fillContent } from "../lib/spec/fillContent.ts";

function loadDotenv(p: string) {
  const out: Record<string,string> = {};
  try { for (const l of Deno.readTextFileSync(p).split("\n")) { const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(l); if (m) out[m[1]] = m[2].replace(/^"|"$/g, ""); } } catch {}
  return out;
}
const env = { ...loadDotenv(".env"), ...Deno.env.toObject() };
const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);

const { data: onb } = await supabase.from("onboarding_answers").select("answers").eq("user_id", "user_3ETNFnvWrcvYao53WBFopH8fmmn").maybeSingle();
const state = buildUserState(onb!.answers as any, new Date("2026-05-31"));
const spec = buildPlanSpec({ state, now: new Date("2026-05-31") });

console.log("training_days:", state.training_days);
console.log("days_per_week:", state.training_days_per_week);
console.log("split_template:", spec.workout.split_template);
console.log("calendar:", spec.workout.calendar);
console.log("required_patterns:", spec.workout.required_movement_patterns.map(r => r.pattern));

// Load exercises
const { data: exRows } = await supabase.from("exercises").select("id, name, primary_muscle, primary_muscles, muscle_groups, equipment, equipment_required, split_tags, is_system_exercise, movement_pattern").order("id");
// We'll use the same mapper as v3-pipeline
const { runV3Pipeline } = await import("../supabase/functions/generate-user-plans/pipelines/v3-pipeline.ts");

// Run the pipeline (no persist) to get the plan and print per-day exercises
const result = await runV3Pipeline(supabase as any, "user_3ETNFnvWrcvYao53WBFopH8fmmn", new Date("2026-05-31"));
console.log("\nPLAN PER-DAY (week 1):");
const w1 = result.plan.workout_weeks[0];
for (const d of w1.workout_days) {
  console.log(`  ${d.weekday}  [${d.exercises.length} ex]  focus="${d.focus}"`);
  for (const e of d.exercises) {
    console.log(`    ${e.order}. ${e.exercise_name} (${e.movement_pattern}/${e.category}) ${e.sets}x${e.reps_min}-${e.reps_max}`);
  }
}
console.log("\nweek1 volume by muscle:");
for (const [m, v] of Object.entries(w1.weekly_volume_actual)) {
  console.log(`  ${m}: ${v}  (mev=${spec.workout.volume_targets[m as any].mev}, target=${spec.workout.volume_targets[m as any].target}, mav=${spec.workout.volume_targets[m as any].mav})`);
}
