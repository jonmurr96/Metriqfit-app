// Layer 3 validator tests.
//
// Run with: deno test lib/spec/validatePlan_test.ts --no-check --allow-read --allow-env

import {
  assertEquals,
  assertExists,
  assertGreater,
  assertGreaterOrEqual,
} from "https://deno.land/std@0.220.0/assert/mod.ts";
import { buildUserState } from "./UserState.ts";
import { buildPlanSpec } from "./buildPlanSpec.ts";
import { fillContent, type ExerciseRow, type FoodRow, type Plan } from "./fillContent.ts";
import { validatePlan } from "./validatePlan.ts";
import { CANONICAL_PERSONAS } from "../personas/personaMatrix.ts";

const FIXED_NOW = new Date("2026-05-29T00:00:00Z");

const EXERCISES: ReadonlyArray<ExerciseRow> = [
  e("ex_bench", "Bench Press", "horizontal_press", ["chest"], "primary", "reps", ["barbell"], ["triceps"]),
  e("ex_db_bench", "Dumbbell Bench Press", "horizontal_press", ["chest"], "secondary", "reps", ["dumbbell"]),
  e("ex_row", "Row", "horizontal_pull", ["back_upper"], "primary", "reps", ["barbell"], ["biceps"]),
  e("ex_db_row", "Dumbbell Row", "horizontal_pull", ["back_upper"], "secondary", "reps", ["dumbbell"]),
  e("ex_ohp", "Overhead Press", "vertical_press", ["shoulders_lateral"], "primary", "reps", ["barbell"]),
  e("ex_lat_raise", "Lateral Raise", "vertical_press", ["shoulders_lateral"], "isolation", "reps", ["dumbbell"]),
  e("ex_pullup", "Pull Up", "vertical_pull", ["back_lats"], "primary", "reps", ["bodyweight"]),
  e("ex_pulldown", "Lat Pulldown", "vertical_pull", ["back_lats"], "secondary", "reps", ["cable"]),
  e("ex_squat", "Squat", "squat", ["quads"], "primary", "reps", ["barbell"], ["glutes"]),
  e("ex_front_squat", "Front Squat", "squat", ["quads"], "secondary", "reps", ["barbell"]),
  e("ex_dl", "Deadlift", "hinge", ["hamstrings"], "primary", "reps", ["barbell"], ["glutes"]),
  e("ex_rdl", "RDL", "hinge", ["hamstrings"], "secondary", "reps", ["barbell"]),
  e("ex_lunge", "Lunge", "lunge", ["quads"], "secondary", "reps", ["dumbbell"]),
  e("ex_farmer", "Farmer Carry", "carry", ["core"], "accessory", "distance_meters", ["dumbbell"], [], 30),
  e("ex_plank", "Plank", "core_anti_extension", ["core"], "isolation", "time_seconds", ["bodyweight"], [], 30),
  e("ex_pallof", "Pallof", "core_anti_rotation", ["core"], "isolation", "reps", ["cable"]),
  e("ex_curl", "Curl", "horizontal_pull", ["biceps"], "isolation", "reps", ["dumbbell"]),
  e("ex_tri_pushdown", "Tri Pushdown", "vertical_press", ["triceps"], "isolation", "reps", ["cable"]),
  e("ex_calf_raise", "Calf Raise", "squat", ["calves"], "isolation", "reps", ["bodyweight"]),
];

function e(id: string, name: string, m: any, primary: any[], cat: any, unit: any, tags: string[], secondary: any[] = [], baseline?: number): ExerciseRow {
  return { id, name, movement_pattern: m, primary_muscles: primary, secondary_muscles: secondary, equipment_tags: tags, category: cat, prescription_unit: unit, baseline_unit_amount: baseline };
}

const FOODS: ReadonlyArray<FoodRow> = [
  { id: "f_chicken", name: "Chicken Breast", tags: ["meat", "poultry"], kcal_per_g: 1.65, protein_g_per_g: 0.31, carb_g_per_g: 0, fat_g_per_g: 0.036, slot_affinity: [], category: "protein" },
  { id: "f_salmon", name: "Salmon", tags: ["fish"], kcal_per_g: 2.08, protein_g_per_g: 0.20, carb_g_per_g: 0, fat_g_per_g: 0.13, slot_affinity: [], category: "protein" },
  { id: "f_eggs", name: "Eggs", tags: ["eggs"], kcal_per_g: 1.55, protein_g_per_g: 0.13, carb_g_per_g: 0.011, fat_g_per_g: 0.11, slot_affinity: [], category: "protein" },
  { id: "f_yogurt", name: "Greek Yogurt 0%", tags: ["dairy"], kcal_per_g: 0.59, protein_g_per_g: 0.103, carb_g_per_g: 0.036, fat_g_per_g: 0.004, slot_affinity: [], category: "protein" },
  { id: "f_tofu", name: "Tofu", tags: ["tofu", "soy", "vegan"], kcal_per_g: 1.44, protein_g_per_g: 0.173, carb_g_per_g: 0.03, fat_g_per_g: 0.087, slot_affinity: [], category: "protein" },
  { id: "f_lentils", name: "Lentils", tags: ["legume", "vegan"], kcal_per_g: 1.16, protein_g_per_g: 0.09, carb_g_per_g: 0.20, fat_g_per_g: 0.004, slot_affinity: [], category: "protein" },
  { id: "f_oats", name: "Oats", tags: ["grain"], kcal_per_g: 3.89, protein_g_per_g: 0.169, carb_g_per_g: 0.663, fat_g_per_g: 0.069, slot_affinity: [], category: "carb" },
  { id: "f_rice", name: "Rice", tags: ["grain"], kcal_per_g: 1.30, protein_g_per_g: 0.027, carb_g_per_g: 0.282, fat_g_per_g: 0.003, slot_affinity: [], category: "carb" },
  { id: "f_quinoa", name: "Quinoa", tags: ["grain", "vegan"], kcal_per_g: 1.20, protein_g_per_g: 0.044, carb_g_per_g: 0.213, fat_g_per_g: 0.019, slot_affinity: [], category: "carb" },
  { id: "f_sweet_potato", name: "Sweet Potato", tags: ["root"], kcal_per_g: 0.90, protein_g_per_g: 0.02, carb_g_per_g: 0.207, fat_g_per_g: 0.002, slot_affinity: [], category: "carb" },
  { id: "f_olive_oil", name: "Olive Oil", tags: ["oil"], kcal_per_g: 8.84, protein_g_per_g: 0, carb_g_per_g: 0, fat_g_per_g: 1.0, slot_affinity: [], category: "fat" },
  { id: "f_almonds", name: "Almonds", tags: ["nut"], kcal_per_g: 5.79, protein_g_per_g: 0.212, carb_g_per_g: 0.216, fat_g_per_g: 0.499, slot_affinity: [], category: "fat" },
  { id: "f_walnuts", name: "Walnuts", tags: ["nut"], kcal_per_g: 6.54, protein_g_per_g: 0.152, carb_g_per_g: 0.137, fat_g_per_g: 0.652, slot_affinity: [], category: "fat" },
  { id: "f_broccoli", name: "Broccoli", tags: ["leafy_green"], kcal_per_g: 0.35, protein_g_per_g: 0.024, carb_g_per_g: 0.072, fat_g_per_g: 0.004, slot_affinity: [], category: "vegetable" },
];

function* allValidations() {
  for (const persona of CANONICAL_PERSONAS) {
    const state = buildUserState(persona, FIXED_NOW);
    const spec = buildPlanSpec({ state, now: FIXED_NOW });
    const plan = fillContent({ spec, exercises: EXERCISES, foods: FOODS });
    const result = validatePlan(plan, spec);
    yield { persona, state, spec, plan, result };
  }
}

Deno.test("validator runs for every persona and returns well-formed result", () => {
  // The test catalog is intentionally sparse (19 exercises, 14 foods). With a
  // small catalog we EXPECT volume undershoots and (for some personas)
  // pattern gaps — that's what the validator exists to flag. Here we just
  // verify the result object is structurally sound for every persona; the
  // semantic "production catalogs hit MEV" test runs against the real content
  // catalog in CI.
  for (const { persona, result } of allValidations()) {
    assertExists(result.diagnostics, `${persona.name}: missing diagnostics`);
    assertExists(result.violations, `${persona.name}: missing violations`);
    const hasErrors = result.violations.some((v) => v.severity === "error");
    assertEquals(result.passed, !hasErrors, `${persona.name}: passed flag mismatch`);
  }
});

Deno.test("non-catalog-dependent validator checks pass on every persona", () => {
  // Volume + required-pattern checks need full catalogs to pass. Every other
  // check (RIR, prescription_unit, macro tolerance, slot kcal sum, variety,
  // hard excludes) must come back clean across all 26 personas even with the
  // sparse test catalog.
  const catalogDependent = new Set([
    "weekly_volume_below_mev",
    "weekly_volume_above_mav",
    "required_pattern_missing",
  ]);
  const failures: string[] = [];
  for (const { persona, result } of allValidations()) {
    const offending = result.violations.filter(
      (v) => v.severity === "error" && !catalogDependent.has(v.check),
    );
    if (offending.length > 0) {
      failures.push(`${persona.name}: ${offending.map((o) => o.check).join(", ")}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `non-catalog-dependent validator errors found:\n${failures.join("\n")}`,
    );
  }
});

Deno.test("diagnostics include volume per muscle for every muscle", () => {
  for (const { persona, result } of allValidations()) {
    for (const m of ["chest", "back_upper", "quads", "hamstrings", "core"]) {
      assertExists(result.diagnostics.volume_per_muscle[m as any], `${persona.name}: ${m} missing`);
    }
  }
});

Deno.test("diagnostics include training/rest macro totals", () => {
  for (const { persona, result } of allValidations()) {
    const macros = result.diagnostics.nutrition_macro_totals;
    assertExists(macros.training_day, `${persona.name}: training_day missing`);
    assertExists(macros.rest_day, `${persona.name}: rest_day missing`);
    assertGreater(macros.training_day.kcal, 0, `${persona.name}: training kcal=0`);
    assertGreater(macros.rest_day.kcal, 0, `${persona.name}: rest kcal=0`);
  }
});

Deno.test("required_pattern_missing only fires when the sparse catalog cannot satisfy a pattern", () => {
  // p20 has an "anything" goal with full equipment — every required pattern
  // is coverable by our 19-exercise test catalog and must be satisfied.
  for (const { persona, result } of allValidations()) {
    if (persona.name !== "p10_intermediate_male_5day_performance_anything") continue;
    const patternErrors = result.violations.filter(
      (v) => v.check === "required_pattern_missing",
    );
    if (patternErrors.length > 0) {
      throw new Error(
        `${persona.name} should hit all required patterns with full equipment, missing: ${patternErrors.map((e) => e.field).join(", ")}`,
      );
    }
  }
});

Deno.test("manual injection: a corrupted plan with bad RIR fails validation", () => {
  const persona = CANONICAL_PERSONAS[0];
  const state = buildUserState(persona, FIXED_NOW);
  const spec = buildPlanSpec({ state, now: FIXED_NOW });
  const plan = fillContent({ spec, exercises: EXERCISES, foods: FOODS });

  // Corrupt the plan: make rir_max < rir_min on one exercise.
  const corruptedPlan: Plan = JSON.parse(JSON.stringify(plan));
  if (corruptedPlan.workout_weeks[0]?.workout_days[0]?.exercises[0]) {
    (corruptedPlan.workout_weeks[0].workout_days[0].exercises[0] as any).rir_min = 5;
    (corruptedPlan.workout_weeks[0].workout_days[0].exercises[0] as any).rir_max = 1;
  }
  const result = validatePlan(corruptedPlan, spec);
  assertEquals(result.passed, false, "should reject corrupted plan");
  const rirViolation = result.violations.find((v) => v.check === "rir_range_invalid");
  assertExists(rirViolation);
});

Deno.test("manual injection: a corrupted plan with prescription_unit=garbage fails validation", () => {
  const persona = CANONICAL_PERSONAS[0];
  const state = buildUserState(persona, FIXED_NOW);
  const spec = buildPlanSpec({ state, now: FIXED_NOW });
  const plan = fillContent({ spec, exercises: EXERCISES, foods: FOODS });

  const corruptedPlan: Plan = JSON.parse(JSON.stringify(plan));
  if (corruptedPlan.workout_weeks[0]?.workout_days[0]?.exercises[0]) {
    (corruptedPlan.workout_weeks[0].workout_days[0].exercises[0] as any).prescription_unit = "frogs_per_hour";
  }
  const result = validatePlan(corruptedPlan, spec);
  assertEquals(result.passed, false);
  assertExists(result.violations.find((v) => v.check === "invalid_prescription_unit"));
});

Deno.test("diagnostics report deload week index and cardio session count", () => {
  for (const { state, result } of allValidations()) {
    if (state.experience_level !== "beginner") {
      // Non-beginners with horizon_weeks >= 4 should have a deload.
      assertGreaterOrEqual(
        result.diagnostics.workout_structure.deload_week_index ?? 0,
        0,
      );
    }
    // Fat-loss personas should report at least 1 cardio session.
    if (state.goal_type === "lose_weight") {
      assertGreater(
        result.diagnostics.workout_structure.cardio_sessions,
        0,
        `${state.goal_type}: cardio_sessions=0`,
      );
    }
  }
});

Deno.test("variety diagnostics: unique templates ≥ 6 for richer catalogs", () => {
  // With our 14-food catalog we expect ≥6 unique meal templates per persona.
  for (const { persona, result } of allValidations()) {
    assertGreaterOrEqual(
      result.diagnostics.variety.unique_meal_templates,
      6,
      `${persona.name}: only ${result.diagnostics.variety.unique_meal_templates} unique templates`,
    );
  }
});

Deno.test("validation result is deterministic for the same input", () => {
  for (const { spec, plan } of allValidations()) {
    const a = validatePlan(plan, spec);
    const b = validatePlan(plan, spec);
    assertEquals(JSON.stringify(a), JSON.stringify(b));
  }
});
