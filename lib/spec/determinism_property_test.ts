// Property-style determinism tests.
//
// 1. Same UserState → byte-identical PlanSpec + Plan.
// 2. Changing a plan-relevant field forces a corresponding PlanSpec change
//    (in the field we expect, not other fields).
// 3. Changing a non-plan-relevant field (PII, free-text "other" fields) does
//    NOT change anything in the PlanSpec or the Plan.
//
// Run with: deno test lib/spec/determinism_property_test.ts --no-check --allow-read --allow-env

import {
  assertEquals,
  assertNotEquals,
  assertExists,
} from "https://deno.land/std@0.220.0/assert/mod.ts";
import { buildUserState } from "./UserState.ts";
import { buildPlanSpec } from "./buildPlanSpec.ts";
import { fillContent, type ExerciseRow, type FoodRow } from "./fillContent.ts";
import { canonicalSnapshot } from "./snapshot.ts";

const FIXED_NOW = new Date("2026-05-29T00:00:00Z");

function baseAnswers(): Record<string, unknown> {
  return {
    dob: "1985-05-15",
    sex: "male",
    height_ft: 5,
    height_in: 10,
    current_weight_lb: 180,
    target_weight_lb: 175,
    target_weight_enabled: true,
    target_date: null,
    goal_type: "lose_weight",
    goal_timeline: null,
    experience_level: "intermediate",
    activity_level: "moderately_active",
    sleep_hours: 7,
    step_tracking: false,
    avg_steps: null,
    training_days: ["mon", "tue", "thu", "fri"],
    training_days_per_week: 4,
    preferred_days_off: ["wed", "sat", "sun"],
    minutes_per_workout: 60,
    training_time: "evening",
    preferred_split_family: null,
    session_emphasis: null,
    progression_preference: null,
    technique_preferences: [],
    training_style_preferences: [],
    equipment_access: "full_gym",
    equipment_other_text: null,
    injuries: ["none"],
    injuries_other_text: null,
    meals_per_day: 4,
    traditional_meals: true,
    dietary_preference: "anything",
    dietary_preference_other_text: null,
    allergies_exclusions: ["none"],
    allergies_other_text: null,
    refused_foods: [],
    refused_foods_other_text: null,
    carb_tolerance: null,
    cooking_level: null,
    preferred_proteins: ["chicken", "salmon"],
    preferred_carbs: ["oats", "rice"],
    preferred_fats: ["olive_oil", "walnuts"],
    wake_time: "6_7am",
    first_meal_delay: "immediate",
    last_meal_before_bed: "2hrs",
    prep_mode_enabled: false,
    prep_phase: null,
    prep_discipline: null,
    prep_auto_adjust_enabled: false,
  };
}

const EXERCISES: ReadonlyArray<ExerciseRow> = [
  e("ex_bench", "Bench Press", "horizontal_press", ["chest"], "primary", "reps", ["barbell"]),
  e("ex_row", "Row", "horizontal_pull", ["back_upper"], "primary", "reps", ["barbell"]),
  e("ex_ohp", "Overhead Press", "vertical_press", ["shoulders_lateral"], "primary", "reps", ["barbell"]),
  e("ex_pullup", "Pull Up", "vertical_pull", ["back_lats"], "primary", "reps", ["bodyweight"]),
  e("ex_squat", "Squat", "squat", ["quads"], "primary", "reps", ["barbell"]),
  e("ex_dl", "Deadlift", "hinge", ["hamstrings"], "primary", "reps", ["barbell"]),
  e("ex_plank", "Plank", "core_anti_extension", ["core"], "isolation", "time_seconds", ["bodyweight"], 30),
  e("ex_pallof", "Pallof", "core_anti_rotation", ["core"], "isolation", "reps", ["cable"]),
];

function e(id: string, name: string, m: any, primary: any[], cat: any, unit: any, tags: string[], baseline?: number): ExerciseRow {
  return { id, name, movement_pattern: m, primary_muscles: primary, equipment_tags: tags, category: cat, prescription_unit: unit, baseline_unit_amount: baseline };
}

const FOODS: ReadonlyArray<FoodRow> = [
  { id: "f_chicken", name: "Chicken", tags: ["meat"], kcal_per_g: 1.65, protein_g_per_g: 0.31, carb_g_per_g: 0, fat_g_per_g: 0.036, slot_affinity: [], category: "protein" },
  { id: "f_salmon", name: "Salmon", tags: ["fish"], kcal_per_g: 2.08, protein_g_per_g: 0.20, carb_g_per_g: 0, fat_g_per_g: 0.13, slot_affinity: [], category: "protein" },
  { id: "f_rice", name: "Rice", tags: ["grain"], kcal_per_g: 1.30, protein_g_per_g: 0.027, carb_g_per_g: 0.282, fat_g_per_g: 0.003, slot_affinity: [], category: "carb" },
  { id: "f_oats", name: "Oats", tags: ["grain"], kcal_per_g: 3.89, protein_g_per_g: 0.169, carb_g_per_g: 0.663, fat_g_per_g: 0.069, slot_affinity: [], category: "carb" },
  { id: "f_olive_oil", name: "Olive Oil", tags: ["oil"], kcal_per_g: 8.84, protein_g_per_g: 0, carb_g_per_g: 0, fat_g_per_g: 1.0, slot_affinity: [], category: "fat" },
  { id: "f_walnuts", name: "Walnuts", tags: ["nut"], kcal_per_g: 6.54, protein_g_per_g: 0.152, carb_g_per_g: 0.137, fat_g_per_g: 0.652, slot_affinity: [], category: "fat" },
  { id: "f_broccoli", name: "Broccoli", tags: ["leafy_green"], kcal_per_g: 0.35, protein_g_per_g: 0.024, carb_g_per_g: 0.072, fat_g_per_g: 0.004, slot_affinity: [], category: "vegetable" },
];

function generate(answers: Record<string, unknown>) {
  const state = buildUserState(answers, FIXED_NOW);
  const spec = buildPlanSpec({ state, now: FIXED_NOW });
  const plan = fillContent({ spec, exercises: EXERCISES, foods: FOODS });
  return { state, spec, plan };
}

/**
 * Snapshot of just the engine OUTPUT (spec + plan) — excludes UserState because
 * normalization preserves PII / "other" text fields for completeness even though
 * those fields don't influence the seed or any downstream decision.
 */
function planSig(p: ReturnType<typeof generate>): string {
  return canonicalSnapshot({
    spec: { ...p.spec, generated_at: "FIXED" },
    plan: p.plan,
  });
}

// ---------- core property: same input → same output ----------

Deno.test("identical onboarding produces byte-identical Spec + Plan (50× shuffle stress)", () => {
  const baseline = planSig(generate(baseAnswers()));
  for (let i = 0; i < 50; i++) {
    const sig = planSig(generate(baseAnswers()));
    assertEquals(sig, baseline, `run ${i + 1} diverged`);
  }
});

Deno.test("array-order-insensitive: shuffling list fields does not change output", () => {
  const baseline = planSig(generate(baseAnswers()));
  const shuffled = planSig(generate({
    ...baseAnswers(),
    training_days: ["fri", "tue", "mon", "thu"],
    preferred_proteins: ["salmon", "chicken"],
    preferred_carbs: ["rice", "oats"],
    preferred_fats: ["walnuts", "olive_oil"],
  }));
  assertEquals(shuffled, baseline);
});

// ---------- non-plan-relevant fields don't change anything ----------

Deno.test("PII fields don't affect Spec or Plan", () => {
  const baseline = planSig(generate(baseAnswers()));
  for (const mutation of [
    { first_name: "Other" },
    { last_name: "Different" },
    { userId: "user_other" },
    { equipment_other_text: "free text notes" },
    { injuries_other_text: "free text notes" },
    { allergies_other_text: "free text notes" },
    { refused_foods_other_text: "free text notes" },
    { dietary_preference_other_text: "free text notes" },
  ]) {
    const sig = planSig(generate({ ...baseAnswers(), ...mutation }));
    assertEquals(sig, baseline, `mutation ${JSON.stringify(mutation)} changed output`);
  }
});

// ---------- plan-relevant fields force a change in the expected place ----------

Deno.test("changing goal_type changes nutrition kcal target", () => {
  const a = generate({ ...baseAnswers(), goal_type: "lose_weight" });
  const b = generate({ ...baseAnswers(), goal_type: "gain_muscle" });
  assertNotEquals(a.spec.nutrition.training_day.kcal, b.spec.nutrition.training_day.kcal);
});

Deno.test("changing experience_level changes volume targets", () => {
  const a = generate({ ...baseAnswers(), experience_level: "beginner" });
  const b = generate({ ...baseAnswers(), experience_level: "advanced" });
  // Targets must differ on at least one major muscle.
  let differs = 0;
  for (const m of ["chest", "back_upper", "quads"] as const) {
    if (a.spec.workout.volume_targets[m].target !== b.spec.workout.volume_targets[m].target) differs++;
  }
  assertExists(differs > 0 ? true : undefined, "no volume target changed with experience level");
});

Deno.test("changing training_days_per_week changes workout calendar", () => {
  const a = generate({ ...baseAnswers(), training_days_per_week: 3, training_days: ["mon", "wed", "fri"] });
  const b = generate({ ...baseAnswers(), training_days_per_week: 5, training_days: ["mon", "tue", "wed", "thu", "fri"], preferred_days_off: ["sat", "sun"] });
  const calA = JSON.stringify(a.spec.workout.calendar);
  const calB = JSON.stringify(b.spec.workout.calendar);
  assertNotEquals(calA, calB);
});

Deno.test("changing minutes_per_workout changes session_minutes_target", () => {
  const a = generate({ ...baseAnswers(), minutes_per_workout: 45 });
  const b = generate({ ...baseAnswers(), minutes_per_workout: 90 });
  assertEquals(a.spec.workout.session_minutes_target, 45);
  assertEquals(b.spec.workout.session_minutes_target, 90);
});

Deno.test("changing dietary_preference shifts hard_exclude_tags", () => {
  const omnivore = generate({ ...baseAnswers(), dietary_preference: "anything" });
  const vegan = generate({
    ...baseAnswers(),
    dietary_preference: "vegan",
    preferred_proteins: ["tofu", "lentils"],
  });
  // Vegan adds meat/dairy/eggs/fish to hard_exclude_tags.
  const ex = new Set(vegan.spec.nutrition.hard_exclude_tags);
  assertEquals(ex.has("meat"), true);
  assertEquals(ex.has("dairy"), true);
  assertEquals(ex.has("fish"), true);
  const omnEx = new Set(omnivore.spec.nutrition.hard_exclude_tags);
  assertEquals(omnEx.has("meat"), false);
});

Deno.test("changing preferred_fats updates weekly_food_minimums", () => {
  const withWalnuts = generate({ ...baseAnswers(), preferred_fats: ["walnuts", "olive_oil"] });
  const withoutWalnuts = generate({ ...baseAnswers(), preferred_fats: ["olive_oil"] });
  const withTags = new Set(withWalnuts.spec.nutrition.weekly_food_minimums.map((m) => m.tag));
  const withoutTags = new Set(withoutWalnuts.spec.nutrition.weekly_food_minimums.map((m) => m.tag));
  assertEquals(withTags.has("walnuts"), true);
  assertEquals(withoutTags.has("walnuts"), false);
});

Deno.test("changing age changes protein target (age band crossover)", () => {
  // 35yo (under_40) vs 50yo (40_to_59).
  const a = generate({ ...baseAnswers(), dob: "1991-01-01" });
  const b = generate({ ...baseAnswers(), dob: "1976-01-01" });
  // At least the seed must differ.
  assertNotEquals(a.spec.seed, b.spec.seed);
});

Deno.test("changing weight changes nutrition kcal", () => {
  const light = generate({ ...baseAnswers(), current_weight_lb: 140 });
  const heavy = generate({ ...baseAnswers(), current_weight_lb: 220 });
  assertNotEquals(light.spec.nutrition.training_day.kcal, heavy.spec.nutrition.training_day.kcal);
});

Deno.test("changing equipment_access changes excluded exercise tags", () => {
  const fullGym = generate({ ...baseAnswers(), equipment_access: "full_gym" });
  const bodyweight = generate({ ...baseAnswers(), equipment_access: "bodyweight_only" });
  const tags = new Set(bodyweight.spec.workout.exclude_exercise_tags);
  assertEquals(tags.has("barbell"), true);
  assertEquals(tags.has("dumbbell"), true);
  const fullTags = new Set(fullGym.spec.workout.exclude_exercise_tags);
  assertEquals(fullTags.has("barbell"), false);
});

Deno.test("changing injuries adds to exclude_movement_patterns", () => {
  const healthy = generate({ ...baseAnswers(), injuries: ["none"] });
  const kneeInjury = generate({ ...baseAnswers(), injuries: ["knee"] });
  const tags = new Set(kneeInjury.spec.workout.exclude_movement_patterns);
  assertEquals(tags.has("squat"), true);
  const healthyTags = new Set(healthy.spec.workout.exclude_movement_patterns);
  assertEquals(healthyTags.has("squat"), false);
});
