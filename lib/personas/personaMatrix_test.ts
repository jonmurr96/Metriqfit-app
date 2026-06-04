// Deno test: validates the persona matrix is well-formed.
// Run with: deno test lib/personas/personaMatrix_test.ts --no-check
//
// These tests enforce that:
//   - every persona builds a valid UserState (no throws, no undefineds)
//   - the persona's `tags` agree with its normalized UserState fields
//   - every persona produces a unique deterministic seed
//   - the matrix covers all combinatorial corners required by the plan engine.

import {
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.220.0/assert/mod.ts";
import {
  buildUserState,
  buildUserStateSeed,
} from "../spec/UserState.ts";
import { CANONICAL_PERSONAS, type Persona } from "./personaMatrix.ts";

const FIXED_NOW = new Date("2026-05-29T00:00:00Z");

function hasTag(p: Persona, tag: string): boolean {
  return p.tags.includes(tag);
}

Deno.test("matrix has at least 25 personas", () => {
  if (CANONICAL_PERSONAS.length < 25) {
    throw new Error(
      `expected >= 25 personas, got ${CANONICAL_PERSONAS.length}`,
    );
  }
});

Deno.test("every persona builds a valid UserState", () => {
  for (const persona of CANONICAL_PERSONAS) {
    const state = buildUserState(persona, FIXED_NOW);
    // Spot-check that all required fields are present (not undefined).
    if (state.state_version !== 1) {
      throw new Error(`${persona.name}: bad state_version`);
    }
    if (typeof state.age_years !== "number" || state.age_years <= 0) {
      throw new Error(`${persona.name}: bad age_years ${state.age_years}`);
    }
    if (typeof state.height_cm !== "number" || state.height_cm <= 0) {
      throw new Error(`${persona.name}: bad height_cm ${state.height_cm}`);
    }
    if (typeof state.current_weight_kg !== "number" || state.current_weight_kg <= 0) {
      throw new Error(`${persona.name}: bad current_weight_kg`);
    }
  }
});

Deno.test("persona tags agree with normalized UserState", () => {
  for (const persona of CANONICAL_PERSONAS) {
    const state = buildUserState(persona, FIXED_NOW);

    if (hasTag(persona, "male") && state.sex !== "male") {
      throw new Error(`${persona.name}: tag male but sex=${state.sex}`);
    }
    if (hasTag(persona, "female") && state.sex !== "female") {
      throw new Error(`${persona.name}: tag female but sex=${state.sex}`);
    }
    if (hasTag(persona, "beginner") && state.experience_level !== "beginner") {
      throw new Error(`${persona.name}: experience mismatch`);
    }
    if (hasTag(persona, "intermediate") && state.experience_level !== "intermediate") {
      throw new Error(`${persona.name}: experience mismatch`);
    }
    if (hasTag(persona, "advanced") && state.experience_level !== "advanced") {
      throw new Error(`${persona.name}: experience mismatch`);
    }

    if (hasTag(persona, "fat_loss") && state.goal_type !== "lose_weight") {
      throw new Error(`${persona.name}: goal mismatch (expected lose_weight)`);
    }
    if (hasTag(persona, "gain_muscle") && state.goal_type !== "gain_muscle") {
      throw new Error(`${persona.name}: goal mismatch (expected gain_muscle)`);
    }
    if (hasTag(persona, "maintain") && state.goal_type !== "maintain") {
      throw new Error(`${persona.name}: goal mismatch (expected maintain)`);
    }
    if (hasTag(persona, "recomp") && state.goal_type !== "recomp") {
      throw new Error(`${persona.name}: goal mismatch (expected recomp)`);
    }
    if (hasTag(persona, "performance") && state.goal_type !== "performance") {
      throw new Error(`${persona.name}: goal mismatch (expected performance)`);
    }

    // Day count tags
    for (const [tag, count] of [
      ["2day", 2], ["3day", 3], ["4day", 4], ["5day", 5], ["6day", 6],
    ] as const) {
      if (hasTag(persona, tag) && state.training_days_per_week !== count) {
        throw new Error(
          `${persona.name}: tag ${tag} but training_days_per_week=${state.training_days_per_week}`,
        );
      }
    }

    // Equipment tags
    for (const eq of ["full_gym", "home_gym", "bodyweight_only", "minimal_equipment"]) {
      if (hasTag(persona, eq) && state.equipment_access !== eq) {
        throw new Error(`${persona.name}: equipment mismatch ${eq} vs ${state.equipment_access}`);
      }
    }

    // Dietary tags
    for (const diet of ["anything", "vegetarian", "vegan", "pescatarian", "keto", "mediterranean"]) {
      if (hasTag(persona, diet) && state.dietary_preference !== diet) {
        throw new Error(`${persona.name}: diet mismatch ${diet} vs ${state.dietary_preference}`);
      }
    }
  }
});

Deno.test("every persona has a unique seed", () => {
  const seen = new Map<string, string>();
  for (const persona of CANONICAL_PERSONAS) {
    const state = buildUserState(persona, FIXED_NOW);
    const seed = buildUserStateSeed(state);
    const prev = seen.get(seed);
    if (prev) {
      throw new Error(
        `seed collision: ${persona.name} and ${prev} both produced ${seed}`,
      );
    }
    seen.set(seed, persona.name);
  }
  assertEquals(seen.size, CANONICAL_PERSONAS.length);
});

Deno.test("every persona has a unique name", () => {
  const names = new Set<string>();
  for (const persona of CANONICAL_PERSONAS) {
    if (names.has(persona.name)) {
      throw new Error(`duplicate persona name: ${persona.name}`);
    }
    names.add(persona.name);
  }
});

// -------- Coverage assertions --------

function countByPredicate(pred: (p: Persona) => boolean): number {
  return CANONICAL_PERSONAS.filter(pred).length;
}

function assertAtLeast(label: string, n: number, min: number): void {
  if (n < min) {
    throw new Error(`coverage: ${label} expected >= ${min}, got ${n}`);
  }
}

Deno.test("coverage: experience levels", () => {
  assertAtLeast("beginner", countByPredicate((p) => hasTag(p, "beginner")), 3);
  assertAtLeast("intermediate", countByPredicate((p) => hasTag(p, "intermediate")), 3);
  assertAtLeast("advanced", countByPredicate((p) => hasTag(p, "advanced")), 3);
});

Deno.test("coverage: goal types", () => {
  assertAtLeast("lose_weight", countByPredicate((p) => hasTag(p, "fat_loss")), 1);
  assertAtLeast("gain_muscle", countByPredicate((p) => hasTag(p, "gain_muscle")), 1);
  assertAtLeast("maintain", countByPredicate((p) => hasTag(p, "maintain")), 1);
  assertAtLeast("recomp", countByPredicate((p) => hasTag(p, "recomp")), 1);
  assertAtLeast("performance", countByPredicate((p) => hasTag(p, "performance")), 1);
});

Deno.test("coverage: sex representation across goals", () => {
  const males = countByPredicate((p) => hasTag(p, "male"));
  const females = countByPredicate((p) => hasTag(p, "female"));
  assertAtLeast("male personas", males, 3);
  assertAtLeast("female personas", females, 3);
});

Deno.test("coverage: age buckets", () => {
  assertAtLeast("age_under_25", countByPredicate((p) => hasTag(p, "age_under_25")), 1);
  assertAtLeast("age_25_34", countByPredicate((p) => hasTag(p, "age_25_34")), 1);
  assertAtLeast("age_35_44", countByPredicate((p) => hasTag(p, "age_35_44")), 1);
  assertAtLeast("age_45_54", countByPredicate((p) => hasTag(p, "age_45_54")), 1);
  assertAtLeast("age_55_64", countByPredicate((p) => hasTag(p, "age_55_64")), 1);
  assertAtLeast("age_65_plus", countByPredicate((p) => hasTag(p, "age_65_plus")), 1);
});

Deno.test("coverage: training days/week (2, 3, 4, 5, 6)", () => {
  for (const t of ["2day", "3day", "4day", "5day", "6day"]) {
    assertAtLeast(t, countByPredicate((p) => hasTag(p, t)), 1);
  }
});

Deno.test("coverage: equipment access (full_gym, home_gym, bodyweight_only, minimal_equipment)", () => {
  for (const eq of ["full_gym", "home_gym", "bodyweight_only", "minimal_equipment"]) {
    assertAtLeast(eq, countByPredicate((p) => hasTag(p, eq)), 1);
  }
});

Deno.test("coverage: dietary preferences", () => {
  for (const diet of ["anything", "vegetarian", "vegan", "pescatarian", "keto"]) {
    assertAtLeast(diet, countByPredicate((p) => hasTag(p, diet)), 1);
  }
});

Deno.test("coverage: meals per day (3, 4, 5)", () => {
  const states = CANONICAL_PERSONAS.map((p) => buildUserState(p, FIXED_NOW));
  for (const n of [3, 4, 5] as const) {
    const c = states.filter((s) => s.meals_per_day === n).length;
    if (c === 0) throw new Error(`coverage: meals_per_day=${n} has 0 personas`);
  }
});

Deno.test("coverage: activity level full range", () => {
  const states = CANONICAL_PERSONAS.map((p) => buildUserState(p, FIXED_NOW));
  const levels = new Set(states.map((s) => s.activity_level));
  for (const lvl of ["sedentary", "lightly_active", "moderately_active", "very_active", "extra_active"]) {
    if (!levels.has(lvl as never)) {
      throw new Error(`coverage: activity_level=${lvl} missing`);
    }
  }
});

Deno.test("coverage: at least 3 personas with back / knee / shoulder injuries", () => {
  assertAtLeast("injury_back", countByPredicate((p) => hasTag(p, "injury_back")), 1);
  assertAtLeast("injury_knee", countByPredicate((p) => hasTag(p, "injury_knee")), 1);
  assertAtLeast("injury_shoulder", countByPredicate((p) => hasTag(p, "injury_shoulder")), 1);
  const withInjuries = CANONICAL_PERSONAS.filter((p) => {
    const inj = (p as Record<string, unknown>).injuries;
    return Array.isArray(inj) && inj.some((i) => typeof i === "string" && i !== "none");
  }).length;
  assertAtLeast("total injuries", withInjuries, 3);
});

Deno.test("coverage: at least 2 with explicit preferred_split_family (PPL, upper_lower)", () => {
  assertAtLeast("split_ppl", countByPredicate((p) => hasTag(p, "split_ppl")), 1);
  assertAtLeast("split_upper_lower", countByPredicate((p) => hasTag(p, "split_upper_lower")), 1);
  const withSplit = CANONICAL_PERSONAS.filter(
    (p) => typeof (p as Record<string, unknown>).preferred_split_family === "string",
  ).length;
  assertAtLeast("explicit split", withSplit, 2);
});

Deno.test("coverage: at least 3 with refused_foods or allergies", () => {
  const withFoodRestrictions = CANONICAL_PERSONAS.filter((p) => {
    const r = (p as Record<string, unknown>).refused_foods;
    const a = (p as Record<string, unknown>).allergies_exclusions;
    const hasRefused = Array.isArray(r) && r.length > 0;
    const hasAllergy = Array.isArray(a) && a.some((v) => typeof v === "string" && v !== "none");
    return hasRefused || hasAllergy;
  }).length;
  assertAtLeast("refused_foods_or_allergies", withFoodRestrictions, 3);
});

Deno.test("coverage: at least 2 elderly + sedentary edge cases", () => {
  const c = CANONICAL_PERSONAS.filter(
    (p) => hasTag(p, "elderly") && hasTag(p, "sedentary"),
  ).length;
  assertAtLeast("elderly+sedentary", c, 2);
});

Deno.test("identical persona built twice yields identical seed", () => {
  const p = CANONICAL_PERSONAS[0];
  const s1 = buildUserStateSeed(buildUserState(p, FIXED_NOW));
  const s2 = buildUserStateSeed(buildUserState(p, FIXED_NOW));
  assertEquals(s1, s2);
  // and two different personas should differ
  const other = buildUserStateSeed(buildUserState(CANONICAL_PERSONAS[1], FIXED_NOW));
  assertNotEquals(s1, other);
});
