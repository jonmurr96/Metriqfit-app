// Layer 3 — Validation.
//
// Pure function: PlanSpec + Plan -> { passed, violations, diagnostics }.
//
// Validates the engine's output against the contract PlanSpec promised. Every
// check fails closed with a structured violation describing the field, the
// observed value, the expected range, and the source decision/citation. The
// V3 pipeline runs the validator after fillContent and either accepts the
// plan, retries with adjusted thresholds, or surfaces an explicit error
// (rather than silently writing a bad plan to the DB).

import type { Plan, PlanWeek } from "./fillContent.ts";
import type { MusclePattern, PlanSpec } from "./PlanSpec.ts";

export type ValidationSeverity = "error" | "warning";

export interface ValidationViolation {
  readonly severity: ValidationSeverity;
  readonly check: string;
  readonly field: string;
  readonly observed: number | string | null;
  readonly expected: string;
  readonly rationale?: string;
}

export interface ValidationDiagnostics {
  readonly volume_per_muscle: Record<MusclePattern, { actual: number; mev: number; target: number; mav: number }>;
  readonly nutrition_macro_totals: {
    readonly training_day: { kcal: number; protein_g: number; carb_g: number; fat_g: number };
    readonly rest_day: { kcal: number; protein_g: number; carb_g: number; fat_g: number };
    readonly training_target: { kcal: number; protein_g: number; carb_g: number; fat_g: number };
    readonly rest_target: { kcal: number; protein_g: number; carb_g: number; fat_g: number };
  };
  readonly variety: {
    readonly unique_meal_templates: number;
    readonly max_triple_repeats: number;
    readonly weekly_minimum_coverage: Record<string, { needed: number; observed: number }>;
  };
  readonly workout_structure: {
    readonly required_movement_patterns_hit: Record<string, boolean>;
    readonly deload_week_index: number | null;
    readonly cardio_sessions: number;
  };
}

export interface ValidationResult {
  readonly passed: boolean;
  readonly violations: ReadonlyArray<ValidationViolation>;
  readonly diagnostics: ValidationDiagnostics;
}

const MACRO_TOLERANCE = 0.10;        // ±10% on per-day macro totals
const SLOT_KCAL_SUM_TOLERANCE = 0.05; // slot kcal shares must sum to 1 ± 5%

const ALL_MUSCLES: ReadonlyArray<MusclePattern> = [
  "chest", "back_lats", "back_upper", "shoulders_lateral", "shoulders_rear",
  "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "core",
];

// ---------- helpers ----------

function representativeWorkoutWeek(plan: Plan): PlanWeek | undefined {
  // Use the first non-deload week as the "reference week" for volume checks.
  // If every week is deload (impossible by construction), fall back to week 1.
  return plan.workout_weeks.find((w) => !w.is_deload) ?? plan.workout_weeks[0];
}

function withinTolerance(actual: number, target: number, tol: number): boolean {
  if (target === 0) return Math.abs(actual) <= tol;
  return Math.abs(actual - target) / target <= tol;
}

// ---------- check: weekly volume per muscle within [MEV, MAV] ----------

function checkVolume(
  spec: PlanSpec,
  plan: Plan,
  violations: ValidationViolation[],
): ValidationDiagnostics["volume_per_muscle"] {
  const week = representativeWorkoutWeek(plan);
  const diag = {} as ValidationDiagnostics["volume_per_muscle"];
  if (!week) return diag;
  for (const muscle of ALL_MUSCLES) {
    const v = spec.workout.volume_targets[muscle];
    const actual = week.weekly_volume_actual[muscle];
    diag[muscle] = { actual, mev: v.mev, target: v.target, mav: v.mav };
    if (actual < v.mev * 0.7) {
      violations.push({
        severity: "error",
        check: "weekly_volume_below_mev",
        field: `workout.weekly_volume_actual.${muscle}`,
        observed: actual,
        expected: `>= ${v.mev * 0.7} (70% of MEV ${v.mev})`,
        rationale: `target ${v.target} from volume_targets`,
      });
    } else if (actual < v.mev) {
      violations.push({
        severity: "warning",
        check: "weekly_volume_under_mev",
        field: `workout.weekly_volume_actual.${muscle}`,
        observed: actual,
        expected: `>= MEV ${v.mev}`,
      });
    }
    if (actual > v.mav + 2) {
      violations.push({
        severity: "error",
        check: "weekly_volume_above_mav",
        field: `workout.weekly_volume_actual.${muscle}`,
        observed: actual,
        expected: `<= MAV ${v.mav}+2`,
      });
    }
  }
  return diag;
}

// ---------- check: required movement patterns hit weekly ----------

function checkMovementPatterns(
  spec: PlanSpec,
  plan: Plan,
  violations: ValidationViolation[],
): Record<string, boolean> {
  const week = representativeWorkoutWeek(plan);
  const hits = new Map<string, number>();
  if (week) {
    for (const day of week.workout_days) {
      for (const ex of day.exercises) {
        hits.set(ex.movement_pattern, (hits.get(ex.movement_pattern) ?? 0) + 1);
      }
    }
  }
  const out: Record<string, boolean> = {};
  for (const req of spec.workout.required_movement_patterns) {
    const got = hits.get(req.pattern) ?? 0;
    const ok = got >= req.min_per_week;
    out[req.pattern] = ok;
    if (!ok) {
      violations.push({
        severity: "error",
        check: "required_pattern_missing",
        field: `workout.required_movement_patterns.${req.pattern}`,
        observed: got,
        expected: `>= ${req.min_per_week}`,
      });
    }
  }
  return out;
}

// ---------- check: every exercise has RIR + valid prescription_type ----------

function checkExercisePrescriptions(plan: Plan, violations: ValidationViolation[]) {
  const validUnits = new Set(["reps", "time_seconds", "distance_meters"]);
  for (const week of plan.workout_weeks) {
    for (const day of week.workout_days) {
      for (const ex of day.exercises) {
        if (!validUnits.has(ex.prescription_unit)) {
          violations.push({
            severity: "error",
            check: "invalid_prescription_unit",
            field: `workout_weeks[${week.week_index}].${day.weekday}.${ex.exercise_name}.prescription_unit`,
            observed: ex.prescription_unit,
            expected: "one of: reps | time_seconds | distance_meters",
          });
        }
        if (ex.rir_max < ex.rir_min) {
          violations.push({
            severity: "error",
            check: "rir_range_invalid",
            field: `workout_weeks[${week.week_index}].${day.weekday}.${ex.exercise_name}.rir`,
            observed: `${ex.rir_min}-${ex.rir_max}`,
            expected: "rir_min <= rir_max",
          });
        }
        if (ex.sets <= 0) {
          violations.push({
            severity: "error",
            check: "sets_invalid",
            field: `workout_weeks[${week.week_index}].${day.weekday}.${ex.exercise_name}.sets`,
            observed: ex.sets,
            expected: "> 0",
          });
        }
        // Time / distance prescriptions must carry unit_min/max.
        if (ex.prescription_unit !== "reps") {
          if (ex.unit_min == null || ex.unit_max == null) {
            violations.push({
              severity: "error",
              check: "missing_unit_bounds",
              field: `workout_weeks[${week.week_index}].${day.weekday}.${ex.exercise_name}.unit_min/max`,
              observed: `${ex.unit_min ?? "null"}/${ex.unit_max ?? "null"}`,
              expected: "both required when prescription_unit != reps",
            });
          }
        }
      }
    }
  }
}

// ---------- check: nutrition macros within tolerance ----------

function checkNutritionMacros(
  spec: PlanSpec,
  plan: Plan,
  violations: ValidationViolation[],
): ValidationDiagnostics["nutrition_macro_totals"] {
  const trainTotals = avgTotals(plan.nutrition_days.filter((d) => d.is_training_day));
  const restTotals = avgTotals(plan.nutrition_days.filter((d) => !d.is_training_day));

  const training_target = {
    kcal: spec.nutrition.training_day.kcal,
    protein_g: spec.nutrition.training_day.protein_g,
    carb_g: spec.nutrition.training_day.carbs_g,
    fat_g: spec.nutrition.training_day.fat_g,
  };
  const rest_target = {
    kcal: spec.nutrition.rest_day.kcal,
    protein_g: spec.nutrition.rest_day.protein_g,
    carb_g: spec.nutrition.rest_day.carbs_g,
    fat_g: spec.nutrition.rest_day.fat_g,
  };

  for (const [k, t, tg] of [
    ["kcal", trainTotals.kcal, training_target.kcal],
    ["protein_g", trainTotals.protein_g, training_target.protein_g],
    ["carb_g", trainTotals.carb_g, training_target.carb_g],
    ["fat_g", trainTotals.fat_g, training_target.fat_g],
  ] as const) {
    if (!withinTolerance(t, tg, MACRO_TOLERANCE)) {
      violations.push({
        severity: "warning",
        check: "training_day_macro_off",
        field: `nutrition.training_day.${k}`,
        observed: Math.round(t),
        expected: `${tg} ± ${Math.round(tg * MACRO_TOLERANCE)}`,
      });
    }
  }

  return { training_day: trainTotals, rest_day: restTotals, training_target, rest_target };
}

function avgTotals(days: ReadonlyArray<Plan["nutrition_days"][number]>) {
  if (days.length === 0) return { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0 };
  let kcal = 0, protein = 0, carb = 0, fat = 0;
  for (const d of days) {
    kcal += d.totals.kcal;
    protein += d.totals.protein_g;
    carb += d.totals.carb_g;
    fat += d.totals.fat_g;
  }
  return {
    kcal: Math.round(kcal / days.length),
    protein_g: Math.round((protein / days.length) * 10) / 10,
    carb_g: Math.round((carb / days.length) * 10) / 10,
    fat_g: Math.round((fat / days.length) * 10) / 10,
  };
}

// ---------- check: slot kcal shares sum ≈ 1 ----------

function checkSlotShares(spec: PlanSpec, violations: ValidationViolation[]) {
  for (const dayType of ["training_day", "rest_day"] as const) {
    const sum = spec.nutrition[dayType].slots.reduce((a, s) => a + s.target_kcal_share, 0);
    if (Math.abs(sum - 1) > SLOT_KCAL_SUM_TOLERANCE) {
      violations.push({
        severity: "error",
        check: "slot_kcal_shares_off",
        field: `nutrition.${dayType}.slots`,
        observed: Number(sum.toFixed(3)),
        expected: `1.0 ± ${SLOT_KCAL_SUM_TOLERANCE}`,
      });
    }
  }
}

// ---------- check: variety + weekly minimums ----------

function checkVariety(
  spec: PlanSpec,
  plan: Plan,
  violations: ValidationViolation[],
): ValidationDiagnostics["variety"] {
  // Unique templates (by sorted food id list per meal).
  const templates = new Set<string>();
  const tripleCounts = new Map<string, number>();
  for (const day of plan.nutrition_days) {
    for (const meal of day.meals) {
      if (meal.items.length === 0) continue;
      const key = meal.items.map((i) => i.food_id).sort().join("|");
      templates.add(key);
      tripleCounts.set(key, (tripleCounts.get(key) ?? 0) + 1);
    }
  }
  let maxRepeats = 0;
  for (const c of tripleCounts.values()) if (c > maxRepeats) maxRepeats = c;
  if (maxRepeats > spec.nutrition.max_repeats_of_template_per_week) {
    violations.push({
      severity: "error",
      check: "triple_repeat_exceeded",
      field: "nutrition.weekly_meals",
      observed: maxRepeats,
      expected: `<= ${spec.nutrition.max_repeats_of_template_per_week}`,
    });
  }
  if (templates.size < spec.nutrition.min_unique_templates_per_slot_per_week) {
    violations.push({
      severity: "warning",
      check: "unique_templates_below_minimum",
      field: "nutrition.weekly_meals.unique_templates",
      observed: templates.size,
      expected: `>= ${spec.nutrition.min_unique_templates_per_slot_per_week}`,
    });
  }

  // Weekly minimums coverage (food appearances by tag).
  const appearancesByFoodId = new Map<string, number>();
  const allFoodNames = new Map<string, string[]>(); // id -> tags
  for (const day of plan.nutrition_days) {
    for (const meal of day.meals) {
      for (const item of meal.items) {
        appearancesByFoodId.set(item.food_id, (appearancesByFoodId.get(item.food_id) ?? 0) + 1);
        if (!allFoodNames.has(item.food_id)) allFoodNames.set(item.food_id, [item.food_name.toLowerCase()]);
      }
    }
  }
  const minCoverage: Record<string, { needed: number; observed: number }> = {};
  for (const min of spec.nutrition.weekly_food_minimums) {
    let observed = 0;
    for (const [foodId, count] of appearancesByFoodId) {
      const names = allFoodNames.get(foodId) ?? [];
      if (
        foodId.toLowerCase().includes(min.tag) ||
        names.some((n) => n.includes(min.tag.replace(/_/g, " ")))
      ) {
        observed += count;
      }
    }
    minCoverage[min.tag] = { needed: min.min_appearances, observed };
    if (observed < min.min_appearances) {
      violations.push({
        severity: "warning",
        check: "weekly_food_minimum_unmet",
        field: `nutrition.weekly_food_minimums.${min.tag}`,
        observed,
        expected: `>= ${min.min_appearances} (origin: ${min.origin})`,
      });
    }
  }

  return {
    unique_meal_templates: templates.size,
    max_triple_repeats: maxRepeats,
    weekly_minimum_coverage: minCoverage,
  };
}

// ---------- check: hard exclude tags absent ----------

function normalizeFoodToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expandHardExcludeToken(token: string): ReadonlyArray<string> {
  switch (token) {
    case "tree nuts":
    case "tree nut":
    case "nuts":
      return [token, "nut"];
    default:
      return [token];
  }
}

function planItemMatchesExcludedFood(
  item: { readonly food_id: string; readonly food_name: string },
  excludedTag: string,
): boolean {
  const excluded = normalizeFoodToken(excludedTag);
  if (!excluded || excluded === "none") return false;
  const excludedTokens = expandHardExcludeToken(excluded);

  const values = [item.food_id, item.food_name]
    .map(normalizeFoodToken)
    .filter(Boolean);

  return excludedTokens.some((token) =>
    values.some((value) => value === token || value.includes(token))
  );
}

function checkExcludes(spec: PlanSpec, plan: Plan, violations: ValidationViolation[]) {
  const excluded = new Set(spec.nutrition.hard_exclude_tags);
  if (excluded.size === 0) return;
  for (const day of plan.nutrition_days) {
    for (const meal of day.meals) {
      for (const item of meal.items) {
        for (const tag of excluded) {
          if (planItemMatchesExcludedFood(item, tag)) {
            violations.push({
              severity: "error",
              check: "hard_excluded_food_present",
              field: `nutrition.${day.weekday}.${meal.slot}.${item.food_name}`,
              observed: item.food_name,
              expected: `must not contain excluded tag "${tag}"`,
            });
          }
        }
      }
    }
  }
}

// ---------- top-level entry ----------

export function validatePlan(plan: Plan, spec: PlanSpec): ValidationResult {
  const violations: ValidationViolation[] = [];

  const volume_per_muscle = checkVolume(spec, plan, violations);
  const required_movement_patterns_hit = checkMovementPatterns(spec, plan, violations);
  checkExercisePrescriptions(plan, violations);
  const nutrition_macro_totals = checkNutritionMacros(spec, plan, violations);
  checkSlotShares(spec, violations);
  const variety = checkVariety(spec, plan, violations);
  checkExcludes(spec, plan, violations);

  // Cardio + deload diagnostics
  let cardio = 0;
  for (const w of plan.workout_weeks) for (const d of w.workout_days) if (d.cardio) cardio++;
  const deloadIdx = plan.workout_weeks.find((w) => w.is_deload)?.week_index ?? null;

  const diagnostics: ValidationDiagnostics = {
    volume_per_muscle,
    nutrition_macro_totals,
    variety,
    workout_structure: {
      required_movement_patterns_hit,
      deload_week_index: deloadIdx,
      cardio_sessions: cardio,
    },
  };

  const passed = !violations.some((v) => v.severity === "error");
  return { passed, violations, diagnostics };
}
