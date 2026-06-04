// Shared types for the in-repo science tables.
//
// These tables are the source of truth for every numeric constant referenced by
// Layer 1 (`buildPlanSpec`). Every row carries a citation so any value in a
// generated PlanSpec can be traced back to a credible source.
//
// IMPORTANT: This file must be Deno + Node compatible. No third-party deps,
// no Node/Deno-specific globals.

export type Confidence = "high" | "medium" | "low";

export interface ScienceCitation {
  readonly source: string;
  readonly url?: string;
  readonly confidence: Confidence;
  readonly notes?: string;
  readonly year?: number;
}

export interface ScienceTable<TRow> {
  readonly version: number;
  readonly name: string;
  readonly rows: ReadonlyArray<TRow>;
}

// ----- Shared enums used across science tables -----

export type Sex = "male" | "female";
export type Experience = "beginner" | "intermediate" | "advanced";
export type Goal =
  | "lose_weight"
  | "gain_muscle"
  | "maintain"
  | "recomp"
  | "performance";

export type AgeBand = "under_40" | "40_to_59" | "60_plus";

export type ActivityLevel = "sedentary" | "active" | "very_active";

// Mirror of PlanSpec.MusclePattern. Duplicated here to keep the science layer
// independent of the spec layer (the spec imports types from here at compile
// time only via Phase 1's buildPlanSpec).
export type SciMusclePattern =
  | "chest"
  | "back_lats"
  | "back_upper"
  | "shoulders_lateral"
  | "shoulders_rear"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core";

export type SciLiftCategory =
  | "primary"
  | "secondary"
  | "accessory"
  | "isolation";

export type SciMealSlot =
  | "breakfast"
  | "morning_snack"
  | "lunch"
  | "afternoon_snack"
  | "preworkout"
  | "postworkout"
  | "dinner"
  | "evening_snack";

export type Density = "high" | "medium" | "low";

export type Micronutrient =
  | "omega_3"
  | "vitamin_d"
  | "iron"
  | "calcium"
  | "choline"
  | "magnesium"
  | "zinc"
  | "vitamin_b12";

// All science-table goal values share the PlanSpec goal taxonomy.
export const ALL_GOALS: ReadonlyArray<Goal> = [
  "lose_weight",
  "gain_muscle",
  "maintain",
  "recomp",
  "performance",
];

export const ALL_EXPERIENCE: ReadonlyArray<Experience> = [
  "beginner",
  "intermediate",
  "advanced",
];

export const ALL_SEX: ReadonlyArray<Sex> = ["male", "female"];

export const ALL_MUSCLES: ReadonlyArray<SciMusclePattern> = [
  "chest",
  "back_lats",
  "back_upper",
  "shoulders_lateral",
  "shoulders_rear",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
];

export const ALL_AGE_BANDS: ReadonlyArray<AgeBand> = [
  "under_40",
  "40_to_59",
  "60_plus",
];

export function ageToBand(age_years: number): AgeBand {
  if (age_years >= 60) return "60_plus";
  if (age_years >= 40) return "40_to_59";
  return "under_40";
}
