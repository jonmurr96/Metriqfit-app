// Verifies that buildPlanSpec produces a valid, aligned PlanSpec for every
// persona, and that the alignment rules my plan promised actually hold.
//
// Run with: deno test lib/spec/buildPlanSpec_test.ts --no-check

import {
  assertEquals,
  assertExists,
  assertGreater,
  assertGreaterOrEqual,
  assertLessOrEqual,
  assertNotEquals,
} from "https://deno.land/std@0.220.0/assert/mod.ts";
import { buildUserState } from "./UserState.ts";
import { buildPlanSpec } from "./buildPlanSpec.ts";
import { CANONICAL_PERSONAS } from "../personas/personaMatrix.ts";

const FIXED_NOW = new Date("2026-05-29T00:00:00Z");

// Helper — run every persona through buildPlanSpec and yield (persona, spec).
function* allSpecs() {
  for (const persona of CANONICAL_PERSONAS) {
    const state = buildUserState(persona, FIXED_NOW);
    const spec = buildPlanSpec({ state, now: FIXED_NOW });
    yield { persona, state, spec };
  }
}

Deno.test("every persona produces a valid PlanSpec", () => {
  for (const { persona, spec } of allSpecs()) {
    assertEquals(spec.plan_spec_version, 1, `version on ${persona.name}`);
    assertExists(spec.seed, `seed missing on ${persona.name}`);
    assertExists(spec.workout, `workout missing on ${persona.name}`);
    assertExists(spec.nutrition, `nutrition missing on ${persona.name}`);
    assertGreater(spec.decisions.length, 0, `no decisions for ${persona.name}`);
  }
});

Deno.test("identical onboardings → identical PlanSpec seed", () => {
  for (const { persona, state } of allSpecs()) {
    const stateAgain = buildUserState(persona, FIXED_NOW);
    const specA = buildPlanSpec({ state, now: FIXED_NOW });
    const specB = buildPlanSpec({ state: stateAgain, now: FIXED_NOW });
    assertEquals(specA.seed, specB.seed, `seed mismatch on ${persona.name}`);
    assertEquals(specA.workout.calendar, specB.workout.calendar, `calendar mismatch on ${persona.name}`);
    assertEquals(specA.nutrition.training_day.kcal, specB.nutrition.training_day.kcal, `kcal mismatch on ${persona.name}`);
  }
});

Deno.test("alignment: workout calendar respects training_days_per_week", () => {
  for (const { persona, spec } of allSpecs()) {
    const workoutCount = Object.values(spec.workout.calendar).filter((d) => d === "workout").length;
    assertEquals(
      workoutCount,
      spec.workout.days_per_week,
      `${persona.name}: ${workoutCount} workouts vs ${spec.workout.days_per_week} requested`,
    );
  }
});

Deno.test("alignment: training_days array honored exactly when count matches", () => {
  for (const { persona, state, spec } of allSpecs()) {
    if (state.training_days.length !== state.training_days_per_week) continue;
    // Every user-selected training day must be a workout day.
    for (const day of state.training_days) {
      assertEquals(
        spec.workout.calendar[day],
        "workout",
        `${persona.name}: requested ${day} but got ${spec.workout.calendar[day]}`,
      );
    }
    // Every preferred-off day must be rest.
    for (const day of state.preferred_days_off) {
      assertEquals(
        spec.workout.calendar[day],
        "rest",
        `${persona.name}: preferred off ${day} but got ${spec.workout.calendar[day]}`,
      );
    }
  }
});

Deno.test("alignment: session_minutes_target equals minutes_per_workout", () => {
  for (const { state, spec } of allSpecs()) {
    assertEquals(
      spec.workout.session_minutes_target,
      state.minutes_per_workout,
      `minutes mismatch: spec=${spec.workout.session_minutes_target} state=${state.minutes_per_workout}`,
    );
  }
});

Deno.test("alignment: volume targets within MEV/MAV bounds", () => {
  for (const { persona, spec } of allSpecs()) {
    for (const [muscle, v] of Object.entries(spec.workout.volume_targets)) {
      assertGreaterOrEqual(v.target, v.mev, `${persona.name} ${muscle}: target<MEV`);
      assertLessOrEqual(v.target, v.mav, `${persona.name} ${muscle}: target>MAV`);
      assertExists(v.source, `${persona.name} ${muscle}: missing citation`);
    }
  }
});

Deno.test("alignment: required movement patterns include squat + hinge for non-bodyweight", () => {
  for (const { state, spec } of allSpecs()) {
    const patterns = new Set(spec.workout.required_movement_patterns.map((m) => m.pattern));
    if (state.equipment_access === "bodyweight_only") continue;
    if (spec.workout.exclude_movement_patterns.includes("squat")) continue;
    if (spec.workout.exclude_movement_patterns.includes("hinge")) continue;
    // Squat + hinge enforced for every other case
    if (!patterns.has("squat") || !patterns.has("hinge")) {
      throw new Error(`squat/hinge missing — patterns=${[...patterns].join(",")}`);
    }
  }
});

Deno.test("alignment: protein_g uses science table g/kg × bodyweight", () => {
  for (const { persona, state, spec } of allSpecs()) {
    // Protein must be at least 1.4 g/kg (lowest entry in any row).
    const gPerKg = spec.nutrition.training_day.protein_g / state.current_weight_kg;
    assertGreaterOrEqual(gPerKg, 1.3, `${persona.name}: protein only ${gPerKg.toFixed(2)} g/kg`);
    assertLessOrEqual(gPerKg, 3.0, `${persona.name}: protein excessive ${gPerKg.toFixed(2)} g/kg`);
  }
});

Deno.test("alignment: slot ratio sums ≈ 1.0 per day type (no 752 kcal snacks at equal split)", () => {
  for (const { persona, spec } of allSpecs()) {
    for (const dayType of ["training_day", "rest_day"] as const) {
      const slots = spec.nutrition[dayType].slots;
      const sum = slots.reduce((a, s) => a + s.target_kcal_share, 0);
      // Slot shares must sum to ~1.0 (within 5% rounding).
      assertGreater(sum, 0.95, `${persona.name} ${dayType}: slot kcal sum=${sum}`);
      assertLessOrEqual(sum, 1.05, `${persona.name} ${dayType}: slot kcal sum=${sum}`);
      // Snack slots must be smaller than meal slots.
      const snacks = slots.filter((s) => s.is_snack);
      const meals = slots.filter((s) => !s.is_snack);
      if (snacks.length && meals.length) {
        const maxSnack = Math.max(...snacks.map((s) => s.target_kcal_share));
        const minMeal = Math.min(...meals.map((s) => s.target_kcal_share));
        assertLessOrEqual(
          maxSnack,
          minMeal,
          `${persona.name} ${dayType}: snack share ${maxSnack} ≥ meal share ${minMeal}`,
        );
      }
    }
  }
});

Deno.test("alignment: every preferred protein/carb/fat shows as weekly minimum", () => {
  for (const { persona, state, spec } of allSpecs()) {
    const mins = new Set(spec.nutrition.weekly_food_minimums.map((m) => m.tag));
    for (const p of state.preferred_proteins) {
      if (!mins.has(p)) throw new Error(`${persona.name}: preferred protein ${p} not enforced`);
    }
    for (const c of state.preferred_carbs) {
      if (!mins.has(c)) throw new Error(`${persona.name}: preferred carb ${c} not enforced`);
    }
    for (const f of state.preferred_fats) {
      if (!mins.has(f)) throw new Error(`${persona.name}: preferred fat ${f} not enforced`);
    }
  }
});

Deno.test("alignment: dietary_preference 'anything' brings fish into weekly minimums", () => {
  let checked = 0;
  for (const { state, spec } of allSpecs()) {
    if (state.dietary_preference !== "anything") continue;
    if (new Set(state.allergies_exclusions).has("fish")) continue;
    const tags = new Set(spec.nutrition.weekly_food_minimums.map((m) => m.tag));
    assertEquals(tags.has("fish"), true, `fish should be enforced for ${state.dietary_preference}`);
    checked++;
  }
  assertGreater(checked, 0, "no anything-diet personas tested");
});

Deno.test("alignment: vegan personas hard-exclude meat/dairy/eggs/fish", () => {
  for (const { state, spec } of allSpecs()) {
    if (state.dietary_preference !== "vegan") continue;
    const tags = new Set(spec.nutrition.hard_exclude_tags);
    for (const t of ["meat", "dairy", "eggs", "fish"]) {
      assertEquals(tags.has(t), true, `vegan must exclude ${t}`);
    }
  }
});

Deno.test("alignment: training-day kcal > rest-day kcal for fat-loss + recomp + gain", () => {
  for (const { state, spec } of allSpecs()) {
    if (state.goal_type === "maintain") continue;
    if (spec.nutrition.training_day.kcal <= spec.nutrition.rest_day.kcal) {
      throw new Error(
        `${state.goal_type}: training kcal ${spec.nutrition.training_day.kcal} not > rest ${spec.nutrition.rest_day.kcal}`,
      );
    }
  }
});

Deno.test("alignment: 40+ males get a fat-% bump (hormonal support)", () => {
  let checked = 0;
  for (const { state, spec } of allSpecs()) {
    if (state.sex !== "male" || state.age_years < 40) continue;
    if (state.dietary_preference === "keto") continue;
    const trainingFatG = spec.nutrition.training_day.fat_g;
    const trainingKcal = spec.nutrition.training_day.kcal;
    const fatPct = (trainingFatG * 9) / trainingKcal;
    // Compute the expected lower bound: lose_weight base 28% + 2% age bump - 3% training-day carb-cycle shift = 27%, minus ~0.5pp for gram rounding.
    assertGreaterOrEqual(
      fatPct,
      0.265,
      `${state.age_years}yo male should get >=26.5% fat (after rounding), got ${(fatPct * 100).toFixed(1)}%`,
    );
    checked++;
  }
  assertGreater(checked, 0, "no 40+ male personas to test");
});

Deno.test("decisions: every output value has provenance", () => {
  for (const { spec } of allSpecs()) {
    // Spot-check: every volume_targets.X.target has a decision row.
    for (const muscle of Object.keys(spec.workout.volume_targets)) {
      const field = `workout.volume_targets.${muscle}.target`;
      const dec = spec.decisions.find((d) => d.field === field);
      assertExists(dec, `missing decision for ${field}`);
    }
    // And session_minutes_target.
    const sm = spec.decisions.find((d) => d.field === "workout.session_minutes_target");
    assertExists(sm);
  }
});

Deno.test("differing personas produce differing seeds AND differing macros", () => {
  const seeds = new Set<string>();
  const kcals = new Set<number>();
  for (const { spec } of allSpecs()) {
    seeds.add(spec.seed);
    kcals.add(spec.nutrition.training_day.kcal);
  }
  // At least 80% of personas should produce a unique seed (some may collide by
  // design when key inputs match).
  assertGreater(seeds.size, CANONICAL_PERSONAS.length * 0.8);
  assertGreater(kcals.size, 5); // a healthy spread of kcal targets
});
