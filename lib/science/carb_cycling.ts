// Training vs rest day macro modulation by goal.
//
// We modulate by goal: training days slightly higher kcal (more carbs, fewer
// fats) than the weekly average; rest days slightly lower (carbs replaced by
// fat/protein for satiety). Maintain has no cycling.
//
// Sources:
//   - Helms et al. The Muscle and Strength Pyramid: Nutrition (2nd ed., 2019).
//     Practical "calorie cycling" / "macro cycling" recommendations for cuts
//     and recomp: shift fats down on training days, carbs up; small effect on
//     average weekly kcal (~+/- 3-5%).
//   - Kerksick et al. (2017). "ISSN Position Stand: Nutrient timing."
//     J Int Soc Sports Nutr. https://pubmed.ncbi.nlm.nih.gov/28919842/
//     Supports peri-workout carbohydrate availability.
//   - Helms, Aragon, Fitschen (2014). Bodybuilding contest prep paper —
//     calorie/carb cycling can preserve adherence and training quality during
//     deficits.
//
// IMPORTANT: training_kcal_multiplier and rest_kcal_multiplier should produce
// a weekly average ~= 1.0 given a 4-day training week (the modal case). Layer
// 1 should re-normalize across the actual week to keep weekly kcal target
// exact; this table provides the relative shape.

import type { Goal, ScienceCitation, ScienceTable } from "./types.ts";
import { ALL_GOALS } from "./types.ts";

export const CARB_CYCLING_VERSION = 1 as const;

export interface CarbCyclingRow {
  readonly goal: Goal;
  readonly training_kcal_multiplier: number;
  readonly rest_kcal_multiplier: number;
  // Percentage-point shifts applied on training day, relative to the day's
  // baseline macro split (after protein is set). Positive = more, negative =
  // less. Rest day = mirror image.
  readonly training_fat_pct_shift: number;  // e.g. -0.03 = -3%
  readonly training_carb_pct_shift: number; // e.g. +0.03 = +3%
  readonly citation: ScienceCitation;
}

const CITE_HELMS_NUTRITION: ScienceCitation = {
  source:
    "Helms et al. The Muscle and Strength Pyramid: Nutrition (2nd ed., 2019).",
  confidence: "high",
  year: 2019,
};

const CITE_HELMS_2014: ScienceCitation = {
  source:
    "Helms, Aragon, Fitschen (2014). Evidence-based recommendations for natural bodybuilding contest preparation.",
  url: "https://pubmed.ncbi.nlm.nih.gov/24864135/",
  confidence: "high",
  year: 2014,
};

const CITE_KERKSICK_2017: ScienceCitation = {
  source:
    "Kerksick et al. (2017). ISSN Position Stand: Nutrient timing. J Int Soc Sports Nutr.",
  url: "https://pubmed.ncbi.nlm.nih.gov/28919842/",
  confidence: "high",
  year: 2017,
};

const ROWS: ReadonlyArray<CarbCyclingRow> = [
  {
    goal: "lose_weight",
    training_kcal_multiplier: 1.03,
    rest_kcal_multiplier: 0.96,
    training_fat_pct_shift: -0.03,
    training_carb_pct_shift: 0.03,
    citation: CITE_HELMS_2014,
  },
  {
    goal: "gain_muscle",
    training_kcal_multiplier: 1.04,
    rest_kcal_multiplier: 0.97,
    training_fat_pct_shift: -0.02,
    training_carb_pct_shift: 0.02,
    citation: CITE_KERKSICK_2017,
  },
  {
    goal: "maintain",
    training_kcal_multiplier: 1.00,
    rest_kcal_multiplier: 1.00,
    training_fat_pct_shift: 0.00,
    training_carb_pct_shift: 0.00,
    citation: CITE_HELMS_NUTRITION,
  },
  {
    goal: "recomp",
    training_kcal_multiplier: 1.05,
    rest_kcal_multiplier: 0.95,
    training_fat_pct_shift: -0.03,
    training_carb_pct_shift: 0.03,
    citation: CITE_HELMS_NUTRITION,
  },
  {
    goal: "performance",
    training_kcal_multiplier: 1.05,
    rest_kcal_multiplier: 0.95,
    training_fat_pct_shift: -0.04,
    training_carb_pct_shift: 0.04,
    citation: CITE_KERKSICK_2017,
  },
];

export const CARB_CYCLING: ScienceTable<CarbCyclingRow> = {
  version: CARB_CYCLING_VERSION,
  name: "carb_cycling",
  rows: ROWS,
};

export function lookup(goal: Goal): CarbCyclingRow {
  const row = CARB_CYCLING.rows.find((r) => r.goal === goal);
  if (!row) throw new Error(`carb_cycling: no row for ${goal}`);
  return row;
}

export const _ALL_GOALS = ALL_GOALS;
