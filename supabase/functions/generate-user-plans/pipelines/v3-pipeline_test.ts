// V3 pipeline integration tests.
//
// Run with:
//   deno test supabase/functions/generate-user-plans/pipelines/v3-pipeline_test.ts \
//     --no-check --allow-read --allow-env --allow-net
//
// We stub the SupabaseClient against an in-memory fixture so the pipeline
// runs end-to-end without a network. The point of this test is the orchestration
// layer — validatePlan + retry + diagnostics + violation_summary — not the
// individual layer behaviors (those have their own focused tests).

import { assertEquals, assertExists, assertGreater } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { runV3Pipeline } from "./v3-pipeline.ts";
import { CANONICAL_PERSONAS } from "../../../../lib/personas/personaMatrix.ts";

const NOW = new Date("2026-05-29T00:00:00Z");

const FIXTURE_EXERCISES = [
  { id: "ex_bench", name: "Bench Press", primary_muscle_group: "chest", equipment: "barbell", tags: [], is_system_exercise: true },
  { id: "ex_db_bench", name: "Dumbbell Bench Press", primary_muscle_group: "chest", equipment: "dumbbell", tags: [], is_system_exercise: true },
  { id: "ex_row", name: "Barbell Row", primary_muscle_group: "back", equipment: "barbell", tags: [], is_system_exercise: true },
  { id: "ex_db_row", name: "Dumbbell Row", primary_muscle_group: "back", equipment: "dumbbell", tags: [], is_system_exercise: true },
  { id: "ex_pullup", name: "Pull Up", primary_muscle_group: "back", equipment: "bodyweight", tags: [], is_system_exercise: true },
  { id: "ex_pulldown", name: "Lat Pulldown", primary_muscle_group: "back", equipment: "cable", tags: [], is_system_exercise: true },
  { id: "ex_ohp", name: "Overhead Press", primary_muscle_group: "shoulders", equipment: "barbell", tags: [], is_system_exercise: true },
  { id: "ex_lat_raise", name: "Lateral Raise", primary_muscle_group: "shoulders", equipment: "dumbbell", tags: [], is_system_exercise: true },
  { id: "ex_squat", name: "Back Squat", primary_muscle_group: "quads", equipment: "barbell", tags: [], is_system_exercise: true },
  { id: "ex_front_squat", name: "Front Squat", primary_muscle_group: "quads", equipment: "barbell", tags: [], is_system_exercise: true },
  { id: "ex_dl", name: "Deadlift", primary_muscle_group: "hamstrings", equipment: "barbell", tags: [], is_system_exercise: true },
  { id: "ex_rdl", name: "Romanian Deadlift", primary_muscle_group: "hamstrings", equipment: "barbell", tags: [], is_system_exercise: true },
  { id: "ex_lunge", name: "Walking Lunge", primary_muscle_group: "quads", equipment: "dumbbell", tags: [], is_system_exercise: true },
  { id: "ex_farmer", name: "Farmer Carry", primary_muscle_group: "core", equipment: "dumbbell", tags: [], is_system_exercise: true },
  { id: "ex_plank", name: "Plank", primary_muscle_group: "abs", equipment: "bodyweight", tags: [], is_system_exercise: true },
  { id: "ex_pallof", name: "Pallof Press", primary_muscle_group: "abs", equipment: "cable", tags: [], is_system_exercise: true },
  { id: "ex_curl", name: "Barbell Curl", primary_muscle_group: "biceps", equipment: "barbell", tags: [], is_system_exercise: true },
  { id: "ex_tri", name: "Tricep Pushdown", primary_muscle_group: "triceps", equipment: "cable", tags: [], is_system_exercise: true },
  { id: "ex_calf", name: "Calf Raise", primary_muscle_group: "calves", equipment: "bodyweight", tags: [], is_system_exercise: true },
];

const FIXTURE_FOODS = [
  { id: "f_chicken", name: "Chicken Breast", calories_per_100g: 165, protein_per_100g: 31, carbs_per_100g: 0, fat_per_100g: 3.6, tags: ["meat", "poultry"] },
  { id: "f_salmon", name: "Salmon", calories_per_100g: 208, protein_per_100g: 20, carbs_per_100g: 0, fat_per_100g: 13, tags: ["fish"] },
  { id: "f_eggs", name: "Eggs", calories_per_100g: 155, protein_per_100g: 13, carbs_per_100g: 1.1, fat_per_100g: 11, tags: ["eggs"] },
  { id: "f_yogurt", name: "Greek Yogurt 0%", calories_per_100g: 59, protein_per_100g: 10.3, carbs_per_100g: 3.6, fat_per_100g: 0.4, tags: ["dairy"] },
  { id: "f_tofu", name: "Tofu", calories_per_100g: 144, protein_per_100g: 17.3, carbs_per_100g: 3.0, fat_per_100g: 8.7, tags: ["tofu", "soy", "vegan"] },
  { id: "f_oats", name: "Oats", calories_per_100g: 389, protein_per_100g: 16.9, carbs_per_100g: 66.3, fat_per_100g: 6.9, tags: ["grain"] },
  { id: "f_rice", name: "Rice", calories_per_100g: 130, protein_per_100g: 2.7, carbs_per_100g: 28.2, fat_per_100g: 0.3, tags: ["grain"] },
  { id: "f_quinoa", name: "Quinoa", calories_per_100g: 120, protein_per_100g: 4.4, carbs_per_100g: 21.3, fat_per_100g: 1.9, tags: ["grain", "vegan"] },
  { id: "f_sweet_potato", name: "Sweet Potato", calories_per_100g: 90, protein_per_100g: 2.0, carbs_per_100g: 20.7, fat_per_100g: 0.2, tags: ["root"] },
  { id: "f_olive_oil", name: "Olive Oil", calories_per_100g: 884, protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, tags: ["oil"] },
  { id: "f_almonds", name: "Almonds", calories_per_100g: 579, protein_per_100g: 21.2, carbs_per_100g: 21.6, fat_per_100g: 49.9, tags: ["nut"] },
  { id: "f_broccoli", name: "Broccoli", calories_per_100g: 35, protein_per_100g: 2.4, carbs_per_100g: 7.2, fat_per_100g: 0.4, tags: ["vegetable", "leafy_green"] },
];

function makeStubSupabase(onboardingAnswers: Record<string, unknown>) {
  return {
    from(table: string) {
      return {
        select(_cols: string) {
          if (table === "onboarding_answers") {
            return {
              eq() {
                return {
                  maybeSingle: () =>
                    Promise.resolve({ data: { answers: onboardingAnswers }, error: null }),
                };
              },
            };
          }
          if (table === "exercises") {
            return {
              order: () => Promise.resolve({ data: FIXTURE_EXERCISES, error: null }),
            };
          }
          if (table === "food_items") {
            return {
              order: () => ({
                limit: () => Promise.resolve({ data: FIXTURE_FOODS, error: null }),
              }),
            };
          }
          throw new Error(`stub supabase: unexpected table ${table}`);
        },
      };
    },
  } as any;
}

Deno.test("V3 pipeline runs end-to-end and surfaces diagnostics + violation_summary", async () => {
  const persona = CANONICAL_PERSONAS[9]; // "anything" diet, full gym — should validate cleanly
  const supabase = makeStubSupabase(persona as unknown as Record<string, unknown>);
  const result = await runV3Pipeline(supabase, "user_test", NOW);

  assertEquals(result.user_id, "user_test");
  assertExists(result.spec.seed);
  assertExists(result.plan.workout_weeks);
  assertExists(result.validation);

  // Diagnostics shape
  assertEquals(result.diagnostics.attempts >= 1, true);
  assertEquals(result.diagnostics.exercises_loaded, FIXTURE_EXERCISES.length);
  assertEquals(result.diagnostics.foods_loaded, FIXTURE_FOODS.length);
  assertEquals(typeof result.diagnostics.validation_passed, "boolean");
  assertExists(result.diagnostics.violation_summary);

  // violation_summary entries should each have a count >= 1
  for (const v of result.diagnostics.violation_summary) {
    assertGreater(v.count, 0);
    assertExists(v.check);
    assertEquals(typeof v.severity, "string");
  }
});

Deno.test("V3 pipeline retry attempts is bounded and deterministic", async () => {
  const persona = CANONICAL_PERSONAS[0];
  const supabase = makeStubSupabase(persona as unknown as Record<string, unknown>);
  const a = await runV3Pipeline(supabase, "u", NOW);
  const b = await runV3Pipeline(supabase, "u", NOW);
  assertEquals(a.diagnostics.attempts, b.diagnostics.attempts);
  assertEquals(a.spec.seed, b.spec.seed);
  assertEquals(JSON.stringify(a.plan), JSON.stringify(b.plan));
});

Deno.test("V3 pipeline raises when onboarding is missing", async () => {
  const supabase: any = {
    from(table: string) {
      return {
        select() {
          if (table === "onboarding_answers") {
            return {
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
            };
          }
          return { order: () => Promise.resolve({ data: [], error: null }) };
        },
      };
    },
  };
  let threw = false;
  try {
    await runV3Pipeline(supabase, "user_missing", NOW);
  } catch (e) {
    threw = true;
    assertEquals(
      (e as Error).message.includes("No onboarding answers"),
      true,
    );
  }
  assertEquals(threw, true, "should throw on missing onboarding");
});
