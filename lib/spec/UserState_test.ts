// Deno test: locks the core determinism invariants of UserState.
// Run with: deno test lib/spec/UserState_test.ts
//
// These tests are the contract for Rule #3 (repeatability). If they fail, the
// plan engine cannot guarantee "same answers in → same plan out" anymore.

import {
  assertEquals,
  assertNotEquals,
  assertGreater,
} from "https://deno.land/std@0.220.0/assert/mod.ts";
import {
  buildUserState,
  buildUserStateSeed,
  canonicalJson,
  fnv1a64Hex,
  planRelevantProjection,
  seedHexToNumber,
} from "./UserState.ts";

// A realistic onboarding payload modeled on the audited user (Jonathon).
function baseAnswers(): Record<string, unknown> {
  return {
    dob: "1979-05-28",
    sex: "male",
    height_ft: 6,
    height_in: 3,
    current_weight_lb: 225,
    target_weight_lb: 200,
    target_weight_enabled: true,
    target_date: null,
    goal_type: "lose_weight",
    goal_timeline: null,
    experience_level: "advanced",
    activity_level: "moderately_active",
    sleep_hours: null,
    step_tracking: false,
    avg_steps: null,
    training_days: ["mon", "tue", "fri", "sat", "wed"],
    training_days_per_week: 5,
    preferred_days_off: ["thu", "sun"],
    minutes_per_workout: "60",
    training_time: "no_training",
    preferred_split_family: null,
    session_emphasis: null,
    progression_preference: null,
    technique_preferences: [],
    training_style_preferences: [],
    equipment_access: "full_gym",
    equipment_other_text: null,
    injuries: ["none"],
    injuries_other_text: null,
    meals_per_day: "4",
    traditional_meals: true,
    dietary_preference: "anything",
    dietary_preference_other_text: null,
    allergies_exclusions: ["none"],
    allergies_other_text: null,
    refused_foods: [],
    refused_foods_other_text: null,
    carb_tolerance: null,
    cooking_level: null,
    preferred_proteins: ["chicken", "turkey", "beef"],
    preferred_carbs: ["oats", "sweet_potato", "rice"],
    preferred_fats: ["olive_oil", "almonds", "walnuts"],
    wake_time: "5_6am",
    first_meal_delay: "immediate",
    last_meal_before_bed: "2hrs",
    prep_mode_enabled: false,
    prep_phase: null,
    prep_discipline: null,
    prep_auto_adjust_enabled: false,
  };
}

const FIXED_NOW = new Date("2026-05-29T00:00:00Z");

Deno.test("canonicalJson sorts keys deterministically", () => {
  const a = canonicalJson({ b: 1, a: 2, c: { y: 1, x: 2 } });
  const b = canonicalJson({ c: { x: 2, y: 1 }, a: 2, b: 1 });
  assertEquals(a, b);
  assertEquals(a, `{"a":2,"b":1,"c":{"x":2,"y":1}}`);
});

Deno.test("fnv1a64Hex is stable for stable input", () => {
  assertEquals(fnv1a64Hex(""), fnv1a64Hex(""));
  assertEquals(fnv1a64Hex("hello"), fnv1a64Hex("hello"));
  assertNotEquals(fnv1a64Hex("hello"), fnv1a64Hex("hellp"));
});

Deno.test("identical onboardings produce identical seeds", () => {
  const s1 = buildUserState(baseAnswers(), FIXED_NOW);
  const s2 = buildUserState(baseAnswers(), FIXED_NOW);
  assertEquals(buildUserStateSeed(s1), buildUserStateSeed(s2));
});

Deno.test("PII (name, userId) does NOT affect the seed", () => {
  const a = baseAnswers();
  const b = { ...baseAnswers(), first_name: "Alex", last_name: "Smith", userId: "user_other" };
  const sa = buildUserState(a, FIXED_NOW);
  const sb = buildUserState(b, FIXED_NOW);
  assertEquals(buildUserStateSeed(sa), buildUserStateSeed(sb));
});

Deno.test("array order in onboarding does NOT change the seed", () => {
  const a = baseAnswers();
  const b = {
    ...baseAnswers(),
    training_days: ["sat", "wed", "tue", "mon", "fri"],         // reordered
    preferred_proteins: ["beef", "chicken", "turkey"],          // reordered
    preferred_fats: ["walnuts", "olive_oil", "almonds"],        // reordered
  };
  const sa = buildUserState(a, FIXED_NOW);
  const sb = buildUserState(b, FIXED_NOW);
  assertEquals(buildUserStateSeed(sa), buildUserStateSeed(sb));
});

Deno.test("array duplicates and casing in onboarding do NOT change the seed", () => {
  const a = baseAnswers();
  const b = {
    ...baseAnswers(),
    preferred_proteins: ["CHICKEN", "chicken", "Turkey", "beef", "beef"],
  };
  const sa = buildUserState(a, FIXED_NOW);
  const sb = buildUserState(b, FIXED_NOW);
  assertEquals(buildUserStateSeed(sa), buildUserStateSeed(sb));
});

Deno.test("changing a plan-relevant field changes the seed", () => {
  const sBase = buildUserState(baseAnswers(), FIXED_NOW);
  for (const mutation of [
    { goal_type: "gain_muscle" },
    { minutes_per_workout: 45 },
    { training_days_per_week: 4 },
    { equipment_access: "home_gym" },
    { meals_per_day: 5 },
    { preferred_proteins: ["chicken", "turkey", "salmon"] },
    { experience_level: "intermediate" },
    { dietary_preference: "vegetarian" },
    { dob: "1990-01-01" },                                    // age changes
    { current_weight_lb: 220 },                               // weight changes
  ]) {
    const sMut = buildUserState({ ...baseAnswers(), ...mutation }, FIXED_NOW);
    assertNotEquals(
      buildUserStateSeed(sBase),
      buildUserStateSeed(sMut),
      `seed should differ when mutation is ${JSON.stringify(mutation)}`,
    );
  }
});

Deno.test("changing a non-plan-relevant field does NOT change the seed", () => {
  const sBase = buildUserState(baseAnswers(), FIXED_NOW);
  for (const mutation of [
    { first_name: "Diff" },
    { last_name: "Other" },
    { userId: "user_zzzz" },
    { equipment_other_text: "free notes" },
    { injuries_other_text: "free notes" },
    { allergies_other_text: "free notes" },
    { refused_foods_other_text: "free notes" },
    { dietary_preference_other_text: "free notes" },
  ]) {
    const sMut = buildUserState({ ...baseAnswers(), ...mutation }, FIXED_NOW);
    assertEquals(
      buildUserStateSeed(sBase),
      buildUserStateSeed(sMut),
      `seed must not change for mutation ${JSON.stringify(mutation)}`,
    );
  }
});

Deno.test("seedHexToNumber returns a positive integer", () => {
  const seed = buildUserStateSeed(buildUserState(baseAnswers(), FIXED_NOW));
  const n = seedHexToNumber(seed);
  assertGreater(n, 0);
  assertEquals(Number.isInteger(n), true);
});

Deno.test("planRelevantProjection excludes PII keys", () => {
  const s = buildUserState({ ...baseAnswers(), first_name: "X" }, FIXED_NOW);
  const proj = planRelevantProjection(s);
  assertEquals("first_name" in proj, false);
  assertEquals("last_name" in proj, false);
});

Deno.test("normalization: lb→kg, ft+in→cm, age from dob", () => {
  const s = buildUserState(baseAnswers(), FIXED_NOW);
  // 225 lb -> 102.1 kg (one decimal)
  assertEquals(s.current_weight_kg, 102.1);
  // 6'3" = 75 in × 2.54 = 190.5 cm → Math.round → 191
  assertEquals(s.height_cm, 191);
  // dob 1979-05-28, now 2026-05-29 -> age 47
  assertEquals(s.age_years, 47);
});

Deno.test("normalization: injuries=[none] dropped when other injuries present", () => {
  const s1 = buildUserState({ ...baseAnswers(), injuries: ["none"] }, FIXED_NOW);
  assertEquals(s1.injuries, ["none"]);

  const s2 = buildUserState({ ...baseAnswers(), injuries: ["none", "knee"] }, FIXED_NOW);
  assertEquals(s2.injuries, ["knee"]);
});
