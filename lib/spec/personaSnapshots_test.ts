// Persona snapshot suite — the regression gate for the engine.
//
// For every persona in the matrix we generate UserState -> PlanSpec -> Plan
// and assert it equals the committed snapshot. Any change to spec construction,
// content selection, science tables, or persona definitions that produces a
// different output will fail the test, surfacing the diff for review.
//
// Snapshots are stored at lib/spec/__snapshots__/persona_<name>.snap.json.
//
// First run on a clean checkout (or after intentional changes):
//     UPDATE_SNAPSHOTS=1 deno test lib/spec/personaSnapshots_test.ts \
//         --no-check --allow-read --allow-write --allow-env
//
// Normal regression run:
//     deno test lib/spec/personaSnapshots_test.ts \
//         --no-check --allow-read --allow-write --allow-env

import { buildUserState } from "./UserState.ts";
import { buildPlanSpec } from "./buildPlanSpec.ts";
import {
  fillContent,
  type ExerciseRow,
  type FoodRow,
} from "./fillContent.ts";
import { assertSnapshot } from "./snapshot.ts";
import { CANONICAL_PERSONAS } from "../personas/personaMatrix.ts";

const FIXED_NOW = new Date("2026-05-29T00:00:00Z");

// Deterministic, hand-curated catalogs reused from Phase 3 nutrition tests.
const EXERCISES: ReadonlyArray<ExerciseRow> = [
  exRow("ex_bench", "Barbell Bench Press", "horizontal_press", ["chest"], "primary", "reps", ["barbell"]),
  exRow("ex_row", "Barbell Row", "horizontal_pull", ["back_upper"], "primary", "reps", ["barbell"]),
  exRow("ex_ohp", "Overhead Press", "vertical_press", ["shoulders_lateral"], "primary", "reps", ["barbell"]),
  exRow("ex_pullup", "Pull Up", "vertical_pull", ["back_lats"], "primary", "reps", ["bodyweight"]),
  exRow("ex_back_squat", "Back Squat", "squat", ["quads"], "primary", "reps", ["barbell"]),
  exRow("ex_dl", "Deadlift", "hinge", ["hamstrings"], "primary", "reps", ["barbell"]),
  exRow("ex_lunge", "Walking Lunge", "lunge", ["quads"], "secondary", "reps", ["dumbbell"]),
  exRow("ex_farmer", "Farmer Carry", "carry", ["core"], "accessory", "distance_meters", ["dumbbell"], 30),
  exRow("ex_plank", "Plank", "core_anti_extension", ["core"], "isolation", "time_seconds", ["bodyweight"], 30),
  exRow("ex_pallof", "Pallof Press", "core_anti_rotation", ["core"], "isolation", "reps", ["cable"]),
  exRow("ex_db_bench", "Dumbbell Bench Press", "horizontal_press", ["chest"], "secondary", "reps", ["dumbbell"]),
  exRow("ex_db_row", "Dumbbell Row", "horizontal_pull", ["back_upper"], "secondary", "reps", ["dumbbell"]),
  exRow("ex_curl", "Dumbbell Curl", "horizontal_pull", ["biceps"], "isolation", "reps", ["dumbbell"]),
  exRow("ex_tri_pushdown", "Triceps Pushdown", "vertical_press", ["triceps"], "isolation", "reps", ["cable"]),
  exRow("ex_calf_raise", "Calf Raise", "squat", ["calves"], "isolation", "reps", ["bodyweight"]),
];

function exRow(
  id: string,
  name: string,
  movement: any,
  primaryMuscles: any[],
  category: any,
  unit: any,
  tags: string[],
  baselineUnit?: number,
): ExerciseRow {
  return {
    id,
    name,
    movement_pattern: movement,
    primary_muscles: primaryMuscles,
    equipment_tags: tags,
    category,
    prescription_unit: unit,
    baseline_unit_amount: baselineUnit,
  };
}

const FOODS: ReadonlyArray<FoodRow> = [
  { id: "f_chicken", name: "Chicken Breast", tags: ["meat", "poultry"], kcal_per_g: 1.65, protein_g_per_g: 0.31, carb_g_per_g: 0, fat_g_per_g: 0.036, slot_affinity: [], category: "protein" },
  { id: "f_salmon", name: "Salmon", tags: ["fish", "seafood"], kcal_per_g: 2.08, protein_g_per_g: 0.20, carb_g_per_g: 0, fat_g_per_g: 0.13, slot_affinity: [], category: "protein" },
  { id: "f_eggs", name: "Eggs", tags: ["eggs"], kcal_per_g: 1.55, protein_g_per_g: 0.13, carb_g_per_g: 0.011, fat_g_per_g: 0.11, slot_affinity: [], category: "protein" },
  { id: "f_yogurt", name: "Greek Yogurt 0%", tags: ["dairy"], kcal_per_g: 0.59, protein_g_per_g: 0.103, carb_g_per_g: 0.036, fat_g_per_g: 0.004, slot_affinity: [], category: "protein" },
  { id: "f_tofu", name: "Firm Tofu", tags: ["soy", "vegan"], kcal_per_g: 1.44, protein_g_per_g: 0.173, carb_g_per_g: 0.03, fat_g_per_g: 0.087, slot_affinity: [], category: "protein" },
  { id: "f_lentils", name: "Lentils", tags: ["legume", "vegan"], kcal_per_g: 1.16, protein_g_per_g: 0.09, carb_g_per_g: 0.20, fat_g_per_g: 0.004, slot_affinity: [], category: "protein" },
  { id: "f_oats", name: "Rolled Oats", tags: ["grain"], kcal_per_g: 3.89, protein_g_per_g: 0.169, carb_g_per_g: 0.663, fat_g_per_g: 0.069, slot_affinity: [], category: "carb" },
  { id: "f_rice", name: "Jasmine Rice", tags: ["grain"], kcal_per_g: 1.30, protein_g_per_g: 0.027, carb_g_per_g: 0.282, fat_g_per_g: 0.003, slot_affinity: [], category: "carb" },
  { id: "f_quinoa", name: "Quinoa", tags: ["grain", "vegan"], kcal_per_g: 1.20, protein_g_per_g: 0.044, carb_g_per_g: 0.213, fat_g_per_g: 0.019, slot_affinity: [], category: "carb" },
  { id: "f_sweet_potato", name: "Sweet Potato", tags: ["root"], kcal_per_g: 0.90, protein_g_per_g: 0.02, carb_g_per_g: 0.207, fat_g_per_g: 0.002, slot_affinity: [], category: "carb" },
  { id: "f_olive_oil", name: "Olive Oil", tags: ["oil"], kcal_per_g: 8.84, protein_g_per_g: 0, carb_g_per_g: 0, fat_g_per_g: 1.0, slot_affinity: [], category: "fat" },
  { id: "f_almonds", name: "Almonds", tags: ["nut"], kcal_per_g: 5.79, protein_g_per_g: 0.212, carb_g_per_g: 0.216, fat_g_per_g: 0.499, slot_affinity: [], category: "fat" },
  { id: "f_walnuts", name: "Walnuts", tags: ["nut"], kcal_per_g: 6.54, protein_g_per_g: 0.152, carb_g_per_g: 0.137, fat_g_per_g: 0.652, slot_affinity: [], category: "fat" },
  { id: "f_broccoli", name: "Broccoli", tags: ["cruciferous", "leafy_green"], kcal_per_g: 0.35, protein_g_per_g: 0.024, carb_g_per_g: 0.072, fat_g_per_g: 0.004, slot_affinity: [], category: "vegetable" },
];

const SNAPSHOT_DIR = new URL("./__snapshots__", import.meta.url).pathname;

// Build a snapshot-friendly object: omit `generated_at` (changes every run).
function snapshotPayloadFor(personaName: string) {
  const persona = CANONICAL_PERSONAS.find((p) => p.name === personaName);
  if (!persona) throw new Error(`persona ${personaName} not found`);
  const state = buildUserState(persona, FIXED_NOW);
  const spec = buildPlanSpec({ state, now: FIXED_NOW });
  const plan = fillContent({ spec, exercises: EXERCISES, foods: FOODS });
  const payload = {
    persona: personaName,
    state,
    spec: { ...spec, generated_at: "FIXED" },
    plan,
  };
  // Round-trip through JSON to drop undefined fields cleanly — the snapshot
  // encoder only handles JSON-representable values.
  return JSON.parse(JSON.stringify(payload));
}

// One Deno test per persona — easy to grep, easy to see which snapshot failed.
for (const persona of CANONICAL_PERSONAS) {
  Deno.test({
    name: `persona snapshot: ${persona.name}`,
    fn: async () => {
      const payload = snapshotPayloadFor(persona.name);
      await assertSnapshot(`persona_${persona.name}`, payload, SNAPSHOT_DIR);
    },
  });
}
