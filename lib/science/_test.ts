// Sanity tests for the science tables.
//
// Run: deno test lib/science/_test.ts --no-check

import { assert, assertEquals, assertExists } from "jsr:@std/assert@^1";

import {
  ALL_AGE_BANDS,
  ALL_EXPERIENCE,
  ALL_GOALS,
  ALL_MUSCLES,
  ALL_SEX,
} from "./types.ts";

import {
  lookup as lookupVolume,
  VOLUME_TARGETS,
  VOLUME_TARGETS_VERSION,
} from "./volume_targets.ts";

import {
  INTENSITY_TARGETS,
  INTENSITY_TARGETS_VERSION,
  lookup as lookupIntensity,
} from "./intensity_targets.ts";

import {
  lookup as lookupProtein,
  PROTEIN_TARGETS,
  PROTEIN_TARGETS_VERSION,
} from "./protein_targets.ts";

import {
  _TEMPLATES as SLOT_TEMPLATES,
  lookup as lookupSlots,
  SLOT_RATIOS,
  SLOT_RATIOS_VERSION,
} from "./slot_ratios.ts";

import {
  CARB_CYCLING,
  CARB_CYCLING_VERSION,
  lookup as lookupCarbCycling,
} from "./carb_cycling.ts";

import {
  _NUTRIENTS,
  lookup as lookupMicros,
  lookupOne as lookupMicroOne,
  MICRONUTRIENT_MINIMUMS,
  MICRONUTRIENT_MINIMUMS_VERSION,
} from "./micronutrient_minimums.ts";

import {
  compute as computeHydration,
  HYDRATION,
  HYDRATION_VERSION,
  lookup as lookupHydration,
} from "./hydration.ts";

import { SCIENCE_TABLE_VERSIONS } from "./index.ts";

// ---------- volume_targets ----------

Deno.test("volume_targets: every (experience x goal x sex x muscle) is present", () => {
  let count = 0;
  for (const exp of ALL_EXPERIENCE) {
    for (const goal of ALL_GOALS) {
      for (const sex of ALL_SEX) {
        for (const muscle of ALL_MUSCLES) {
          const row = lookupVolume(exp, goal, sex, muscle);
          assertExists(row, `${exp}/${goal}/${sex}/${muscle}`);
          assert(
            row.mev <= row.target && row.target <= row.mav,
            `${exp}/${goal}/${sex}/${muscle}: target ${row.target} not in [${row.mev}, ${row.mav}]`,
          );
          assertExists(row.citation, "citation missing");
          assertExists(row.citation.source, "citation.source missing");
          count++;
        }
      }
    }
  }
  // 3 experience x 5 goals x 2 sex x 12 muscles = 360 rows.
  assertEquals(count, 360);
  assertEquals(VOLUME_TARGETS.rows.length, 360);
});

Deno.test("volume_targets: female hypertrophy target >= male target for same cell", () => {
  for (const exp of ALL_EXPERIENCE) {
    for (const muscle of ALL_MUSCLES) {
      const m = lookupVolume(exp, "gain_muscle", "male", muscle);
      const f = lookupVolume(exp, "gain_muscle", "female", muscle);
      assert(
        f.target >= m.target,
        `female gain_muscle target should be >= male for ${exp}/${muscle}: got ${f.target} vs ${m.target}`,
      );
    }
  }
});

// ---------- intensity_targets ----------

Deno.test("intensity_targets: every (goal x category) present with valid ranges", () => {
  const categories = ["primary", "secondary", "accessory", "isolation"] as const;
  for (const goal of ALL_GOALS) {
    for (const cat of categories) {
      const row = lookupIntensity(goal, cat);
      assertExists(row);
      assert(row.rep_min > 0 && row.rep_max >= row.rep_min);
      assert(row.rir_min >= 0 && row.rir_max >= row.rir_min);
      assert(row.rest_sec >= 30 && row.rest_sec <= 600);
      assertExists(row.citation);
      assertExists(row.citation.source);
    }
  }
  assertEquals(INTENSITY_TARGETS.rows.length, 5 * 4);
});

// ---------- protein_targets ----------

Deno.test("protein_targets: every (goal x age_band x sex) present", () => {
  for (const goal of ALL_GOALS) {
    for (const age_band of ALL_AGE_BANDS) {
      for (const sex of ALL_SEX) {
        // Pick representative age within band.
        const age =
          age_band === "under_40" ? 30 : age_band === "40_to_59" ? 50 : 70;
        const row = lookupProtein(goal, age, sex);
        assertExists(row);
        assert(row.g_per_kg_min <= row.g_per_kg_target);
        assert(row.g_per_kg_target <= row.g_per_kg_max);
        assert(row.g_per_kg_min >= 1.0 && row.g_per_kg_max <= 3.5);
        assertExists(row.citation);
        assertExists(row.citation.source);
      }
    }
  }
  assertEquals(PROTEIN_TARGETS.rows.length, 5 * 3 * 2);
});

Deno.test("protein_targets: older bands have >= per-kg target than under_40", () => {
  for (const goal of ALL_GOALS) {
    for (const sex of ALL_SEX) {
      const young = lookupProtein(goal, 30, sex);
      const mid = lookupProtein(goal, 50, sex);
      const old = lookupProtein(goal, 70, sex);
      assert(
        mid.g_per_kg_target >= young.g_per_kg_target,
        `mid >= young failed for ${goal}/${sex}`,
      );
      assert(
        old.g_per_kg_target >= mid.g_per_kg_target,
        `old >= mid failed for ${goal}/${sex}`,
      );
    }
  }
});

// ---------- slot_ratios ----------

Deno.test("slot_ratios: every template's shares sum to ~1.0", () => {
  const epsilon = 0.02;
  for (const tpl of SLOT_TEMPLATES) {
    let kcal = 0, p = 0, c = 0, f = 0;
    for (const e of tpl.entries) {
      kcal += e.kcal;
      p += e.protein;
      c += e.carb;
      f += e.fat;
    }
    assert(
      Math.abs(kcal - 1) < epsilon,
      `kcal ${kcal} for ${tpl.meals_per_day}/${tpl.is_training_day}/${tpl.has_workout_window}`,
    );
    assert(
      Math.abs(p - 1) < epsilon,
      `protein ${p} for ${tpl.meals_per_day}/${tpl.is_training_day}/${tpl.has_workout_window}`,
    );
    assert(
      Math.abs(c - 1) < epsilon,
      `carb ${c} for ${tpl.meals_per_day}/${tpl.is_training_day}/${tpl.has_workout_window}`,
    );
    assert(
      Math.abs(f - 1) < epsilon,
      `fat ${f} for ${tpl.meals_per_day}/${tpl.is_training_day}/${tpl.has_workout_window}`,
    );
  }
});

Deno.test("slot_ratios: every row has a citation", () => {
  for (const r of SLOT_RATIOS.rows) {
    assertExists(r.citation);
    assertExists(r.citation.source);
  }
});

Deno.test("slot_ratios: lookup covers 3/4/5/6 meals on training+rest", () => {
  for (const n of [3, 4, 5, 6]) {
    const rest = lookupSlots(n, false, false);
    assertEquals(rest.slots.length, n);
    const train = lookupSlots(n, true, true);
    assertEquals(train.slots.length, n);
    // Training day without window falls back to rest template.
    const fallback = lookupSlots(n, true, false);
    assertEquals(fallback.slots.length, n);
  }
});

// ---------- carb_cycling ----------

Deno.test("carb_cycling: every goal has a row; maintain has no cycling", () => {
  for (const goal of ALL_GOALS) {
    const row = lookupCarbCycling(goal);
    assertExists(row);
    assertExists(row.citation);
    assertExists(row.citation.source);
    assert(
      row.training_kcal_multiplier >= 0.9 &&
        row.training_kcal_multiplier <= 1.1,
    );
    assert(
      row.rest_kcal_multiplier >= 0.9 && row.rest_kcal_multiplier <= 1.1,
    );
  }
  const maintain = lookupCarbCycling("maintain");
  assertEquals(maintain.training_kcal_multiplier, 1);
  assertEquals(maintain.rest_kcal_multiplier, 1);
  assertEquals(maintain.training_carb_pct_shift, 0);
  assertEquals(maintain.training_fat_pct_shift, 0);
  assertEquals(CARB_CYCLING.rows.length, ALL_GOALS.length);
});

// ---------- micronutrient_minimums ----------

Deno.test("micronutrient_minimums: every (sex x age x nutrient) present with citation", () => {
  for (const sex of ALL_SEX) {
    for (const age_band of ALL_AGE_BANDS) {
      const age =
        age_band === "under_40" ? 30 : age_band === "40_to_59" ? 50 : 70;
      for (const nutrient of _NUTRIENTS) {
        const row = lookupMicroOne(sex, age, nutrient);
        assertExists(row);
        assert(row.weekly_min > 0);
        assertExists(row.citation);
        assertExists(row.citation.url);
      }
      const all = lookupMicros(sex, age);
      assertEquals(all.length, _NUTRIENTS.length);
    }
  }
  assertEquals(
    MICRONUTRIENT_MINIMUMS.rows.length,
    ALL_SEX.length * ALL_AGE_BANDS.length * _NUTRIENTS.length,
  );
});

Deno.test("micronutrient_minimums: iron is higher for premenopausal women than men", () => {
  const male_young = lookupMicroOne("male", 30, "iron");
  const female_young = lookupMicroOne("female", 30, "iron");
  assert(
    female_young.weekly_min > male_young.weekly_min,
    `female iron ${female_young.weekly_min} should exceed male ${male_young.weekly_min}`,
  );
});

// ---------- hydration ----------

Deno.test("hydration: each activity_level row valid; compute produces sane number", () => {
  for (const lvl of ["sedentary", "active", "very_active"] as const) {
    const row = lookupHydration(lvl);
    assertExists(row);
    assert(row.ml_per_kg_base >= 25 && row.ml_per_kg_base <= 50);
    assert(row.ml_per_training_minute >= 5 && row.ml_per_training_minute <= 20);
    assertExists(row.citation);
    assertExists(row.citation.source);
  }
  assertEquals(HYDRATION.rows.length, 3);
  const ml = computeHydration("active", 75, 60);
  // 35 * 75 + 10 * 60 = 2625 + 600 = 3225
  assertEquals(ml, 3225);
});

// ---------- version coherence ----------

Deno.test("SCIENCE_TABLE_VERSIONS matches per-file VERSION constants", () => {
  assertEquals(SCIENCE_TABLE_VERSIONS.volume, VOLUME_TARGETS_VERSION);
  assertEquals(SCIENCE_TABLE_VERSIONS.intensity, INTENSITY_TARGETS_VERSION);
  assertEquals(SCIENCE_TABLE_VERSIONS.slot_ratios, SLOT_RATIOS_VERSION);
  assertEquals(SCIENCE_TABLE_VERSIONS.protein_targets, PROTEIN_TARGETS_VERSION);
  assertEquals(SCIENCE_TABLE_VERSIONS.carb_cycling, CARB_CYCLING_VERSION);
  assertEquals(
    SCIENCE_TABLE_VERSIONS.micronutrient_minimums,
    MICRONUTRIENT_MINIMUMS_VERSION,
  );
  assertEquals(SCIENCE_TABLE_VERSIONS.hydration, HYDRATION_VERSION);
});
