// PlanSpec v1 — the typed, versioned contract between Layer 1 (Decision) and
// Layer 2 (Content) of the v3 plan engine.
//
// PlanSpec is a pure function of UserState + science tables. It contains every
// decision that Layer 2 needs to fill content, and every science-table-derived
// constraint that Layer 3 will validate against. Nothing in PlanSpec depends on
// the catalog of available exercises/foods — that's strictly Layer 2's concern.
//
// Persistence: stored alongside the generated plan in
// `plan_generation_runs.diagnostics_json` (as the `spec` key) so we can re-run
// Layer 2 deterministically without re-running Layer 1.

import type { UserState, Weekday } from "./UserState.ts";

export const PLAN_SPEC_VERSION = 1 as const;
export type PlanSpecVersion = typeof PLAN_SPEC_VERSION;

// -------- Provenance --------
//
// Every constant pulled from a science table carries a citation. Decisions made
// by Layer 1 carry a Decision record so we can answer "why is my chest target 16
// sets?" with "experience=advanced, goal=lose_weight, lookup table volume_v1
// row #12 (Schoenfeld 2017)".

export type Confidence = "high" | "medium" | "low";

export interface ScienceCitation {
  readonly source: string;     // e.g. "Schoenfeld 2017 meta-analysis"
  readonly url?: string;
  readonly confidence: Confidence;
  readonly notes?: string;
}

export interface Decision {
  readonly field: string;      // dotted path into PlanSpec, e.g. "volume_targets.chest.target"
  readonly value: number | string | boolean | null;
  readonly inputs: ReadonlyArray<string>; // UserState field names that drove this
  readonly source: string;     // science table row id OR "derived"
  readonly rationale?: string;
}

// -------- Calendar --------

export type DayKind = "workout" | "cardio" | "rest" | "active_recovery";

export interface WeekCalendar {
  readonly mon: DayKind;
  readonly tue: DayKind;
  readonly wed: DayKind;
  readonly thu: DayKind;
  readonly fri: DayKind;
  readonly sat: DayKind;
  readonly sun: DayKind;
}

// -------- Workout (per-muscle volume + structure) --------

export type MusclePattern =
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

// MEV = Minimum Effective Volume, MAV = Maximum Adaptive Volume.
// `target` is the planned weekly set count.
export interface VolumeTarget {
  readonly mev: number;
  readonly target: number;
  readonly mav: number;
  readonly source: ScienceCitation;
}

export type VolumeTargets = {
  readonly [M in MusclePattern]: VolumeTarget;
};

// Required movement patterns the plan MUST include at least N times per week.
export type MovementPattern =
  | "squat"
  | "hinge"
  | "horizontal_press"
  | "vertical_press"
  | "horizontal_pull"
  | "vertical_pull"
  | "lunge"
  | "carry"
  | "core_anti_extension"
  | "core_anti_rotation";

export interface MovementRequirement {
  readonly pattern: MovementPattern;
  readonly min_per_week: number;
}

export type LiftCategory = "primary" | "secondary" | "accessory" | "isolation";

export interface IntensityTarget {
  readonly category: LiftCategory;
  readonly rep_range: readonly [number, number];
  readonly rir_target: readonly [number, number]; // [min, max]
  readonly rest_seconds: number;
}

// Some prescriptions are not reps — fix the plank bug at the type level.
export type PrescriptionUnit = "reps" | "time_seconds" | "distance_meters";

export interface DurationPrescription {
  readonly unit: PrescriptionUnit;
  readonly min: number;
  readonly max: number;
}

export interface WarmupProtocol {
  readonly general_minutes: number;
  readonly ramp_set_pattern: ReadonlyArray<{ percent_of_working: number; reps: number }>;
}

export interface DeloadSpec {
  readonly week_index: number;       // 1-indexed
  readonly mode: "volume_reduction" | "intensity_reduction" | "active_recovery";
  readonly volume_multiplier: number; // 0.6 for -40%
}

export type CardioModality = "z2_steady" | "liss" | "hiit" | "moderate_intervals";

export interface CardioPrescription {
  readonly sessions_per_week: number;
  readonly modality: CardioModality;
  readonly minutes_per_session: number;
  readonly placement: "after_lift" | "separate_day" | "either";
  readonly source: ScienceCitation;
}

// Split template — assigns a coherent muscle/pattern grouping to each
// training day. Lets fillContent place "this day is a Push day, target
// chest + shoulders + triceps" rather than picking exercises ad-hoc from
// every required pattern on day 1 and starving days 4-5.
export type SplitDay = "push" | "pull" | "legs" | "upper" | "lower" | "full_body";

export interface WorkoutSpec {
  readonly horizon_weeks: number;
  readonly days_per_week: number;
  readonly session_minutes_target: number;
  readonly session_minutes_min: number;
  readonly calendar: WeekCalendar;

  readonly volume_targets: VolumeTargets;
  readonly intensity_by_category: { readonly [C in LiftCategory]: IntensityTarget };
  readonly required_movement_patterns: ReadonlyArray<MovementRequirement>;

  // One SplitDay per training session, in the order they appear in the
  // calendar (Mon-Sun, training days only). Length === days_per_week.
  readonly split_template: ReadonlyArray<SplitDay>;
  readonly split_family: "ppl" | "upper_lower" | "ppl_upper_lower" | "full_body" | "bro";

  readonly warmup: WarmupProtocol;
  readonly deload?: DeloadSpec;
  readonly cardio?: CardioPrescription;

  // Hard exclusions derived from injuries / equipment access.
  readonly exclude_movement_patterns: ReadonlyArray<MovementPattern>;
  readonly exclude_exercise_tags: ReadonlyArray<string>;
}

// -------- Nutrition --------

export type MealSlotName =
  | "breakfast"
  | "morning_snack"
  | "lunch"
  | "afternoon_snack"
  | "preworkout"
  | "postworkout"
  | "dinner"
  | "evening_snack";

export interface SlotShape {
  readonly slot: MealSlotName;
  readonly target_kcal_share: number;     // 0..1, sums across slots ≈ 1
  readonly target_protein_share: number;
  readonly target_carb_share: number;
  readonly target_fat_share: number;
  readonly carb_density: "high" | "medium" | "low";
  readonly fat_density: "high" | "medium" | "low";
  readonly required_food_categories: ReadonlyArray<string>; // e.g. ["leafy_green"]
  readonly is_snack: boolean;
}

export interface DayTypeMacros {
  readonly kcal: number;
  readonly protein_g: number;
  readonly carbs_g: number;
  readonly fat_g: number;
  readonly fiber_g: number;
  readonly water_ml: number;
  readonly slots: ReadonlyArray<SlotShape>;
  readonly source: ScienceCitation;
}

// Required appearance counts to enforce variety and honor preferences.
export interface WeeklyFoodMinimum {
  readonly tag: string;        // e.g. "fish", "leafy_green", "walnuts"
  readonly min_appearances: number;
  readonly origin: "preference" | "science" | "user_required";
}

export type Micronutrient =
  | "omega_3"
  | "vitamin_d"
  | "iron"
  | "calcium"
  | "choline"
  | "magnesium"
  | "zinc"
  | "vitamin_b12";

export interface MicronutrientGate {
  readonly nutrient: Micronutrient;
  readonly weekly_min: number;
  readonly weekly_unit: "mg" | "mcg" | "g";
  readonly source: ScienceCitation;
}

export interface NutritionSpec {
  readonly horizon_weeks: number;
  readonly meals_per_day: number;
  readonly training_calendar: WeekCalendar;

  // Day-type splits: training days vs rest days carry different totals + slot shapes.
  readonly training_day: DayTypeMacros;
  readonly rest_day: DayTypeMacros;

  // Variety + preference constraints.
  readonly weekly_food_minimums: ReadonlyArray<WeeklyFoodMinimum>;
  readonly max_repeats_of_template_per_week: number;
  readonly min_unique_templates_per_slot_per_week: number;

  // Allergen / refusal hard excludes — anything matching these is filtered before
  // candidate scoring, never reaches the user's plate.
  readonly hard_exclude_tags: ReadonlyArray<string>;

  readonly micronutrient_gates: ReadonlyArray<MicronutrientGate>;
}

// -------- Top-level PlanSpec --------

export interface PlanSpec {
  readonly plan_spec_version: PlanSpecVersion;
  readonly user_state_version: number;
  readonly seed: string;            // hex from buildUserStateSeed
  readonly generated_at: string;    // ISO timestamp (not part of seed)

  // Versions of the science tables consulted to build this spec.
  readonly science_table_versions: {
    readonly volume: number;
    readonly intensity: number;
    readonly slot_ratios: number;
    readonly protein_targets: number;
    readonly carb_cycling: number;
    readonly micronutrient_minimums: number;
    readonly hydration: number;
  };

  readonly workout: WorkoutSpec;
  readonly nutrition: NutritionSpec;

  // The whole point: every decision is queryable.
  readonly decisions: ReadonlyArray<Decision>;
}

// -------- Utility: get a Decision by dotted-field path --------

export function getDecision(spec: PlanSpec, field: string): Decision | undefined {
  return spec.decisions.find((d) => d.field === field);
}

// -------- Skeleton builder placeholder --------
//
// The real Layer 1 (`buildPlanSpec`) lives in lib/spec/buildPlanSpec.ts (Phase 1).
// This stub exists only so callers in tests can import the type-level API.

export interface BuildPlanSpecInput {
  readonly state: UserState;
  readonly now?: Date;
}

export type BuildPlanSpec = (input: BuildPlanSpecInput) => PlanSpec;
