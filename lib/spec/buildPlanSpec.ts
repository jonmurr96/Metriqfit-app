// Layer 1 — Decision.
//
// Pure function: UserState (+ science tables) -> PlanSpec.
//
// No I/O. No randomness. No catalog reads. Every numeric constant in the output
// traces back to a science table row (citation captured in spec.decisions).
//
// This is the contract between Layer 1 and Layer 2 (`fillContent`). Layer 2
// only reads PlanSpec to make selections; it never re-derives a decision.

import type {
  ActivityLevel as UserActivityLevel,
  UserState,
  Weekday,
} from "./UserState.ts";
import { buildUserStateSeed, USER_STATE_VERSION } from "./UserState.ts";
import {
  type BuildPlanSpecInput,
  type CardioModality,
  type Decision,
  type DeloadSpec,
  type IntensityTarget,
  type LiftCategory,
  type MealSlotName,
  type MicronutrientGate,
  type MovementPattern,
  type MovementRequirement,
  type MusclePattern,
  type NutritionSpec,
  type PlanSpec,
  PLAN_SPEC_VERSION,
  type ScienceCitation,
  type SlotShape,
  type SplitDay,
  type VolumeTargets,
  type WarmupProtocol,
  type WeekCalendar,
  type WeeklyFoodMinimum,
  type WorkoutSpec,
} from "./PlanSpec.ts";
import { SCIENCE_TABLE_VERSIONS } from "../science/index.ts";
import * as VolumeTable from "../science/volume_targets.ts";
import * as IntensityTable from "../science/intensity_targets.ts";
import * as ProteinTable from "../science/protein_targets.ts";
import * as SlotTable from "../science/slot_ratios.ts";
import * as CarbCycling from "../science/carb_cycling.ts";
import * as Hydration from "../science/hydration.ts";
import * as MicroTable from "../science/micronutrient_minimums.ts";
import type {
  ActivityLevel as SciActivityLevel,
  Confidence,
  Sex as SciSex,
} from "../science/types.ts";

const ALL_MUSCLES: ReadonlyArray<MusclePattern> = [
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

const ALL_LIFT_CATEGORIES: ReadonlyArray<LiftCategory> = [
  "primary",
  "secondary",
  "accessory",
  "isolation",
];

const WEEKDAYS: ReadonlyArray<Weekday> = [
  "mon", "tue", "wed", "thu", "fri", "sat", "sun",
];

const DERIVED_CITATION: ScienceCitation = {
  source: "derived from UserState",
  confidence: "high",
};

// ---------- enum mappings: UserState -> science -----------

function mapUserActivityToScience(level: UserActivityLevel): SciActivityLevel {
  switch (level) {
    case "sedentary":
      return "sedentary";
    case "lightly_active":
    case "moderately_active":
      return "active";
    case "very_active":
    case "extra_active":
      return "very_active";
  }
}

// Mifflin-St Jeor BMR. Returns kcal/day.
function mifflinStJeor(state: UserState): number {
  const weightTerm = 10 * state.current_weight_kg;
  const heightTerm = 6.25 * state.height_cm;
  const ageTerm = 5 * state.age_years;
  const sexOffset = state.sex === "male" ? 5 : -161;
  return Math.round(weightTerm + heightTerm - ageTerm + sexOffset);
}

// Standard activity multipliers (Harris-Benedict-style).
function activityMultiplier(level: UserActivityLevel): number {
  switch (level) {
    case "sedentary": return 1.2;
    case "lightly_active": return 1.375;
    case "moderately_active": return 1.55;
    case "very_active": return 1.725;
    case "extra_active": return 1.9;
  }
}

// Goal calorie offset relative to TDEE (kcal/day).
function goalCalorieOffset(state: UserState, tdee: number): number {
  switch (state.goal_type) {
    case "lose_weight": {
      // 0.75% bodyweight/wk -> ~600 kcal/day deficit for a 80kg person.
      // Use 12% of TDEE as a moderate deficit, capped at 750/day.
      return -Math.min(750, Math.round(tdee * 0.12));
    }
    case "gain_muscle": {
      // 10% surplus, capped at +500.
      return Math.min(500, Math.round(tdee * 0.10));
    }
    case "recomp":
      return 0;
    case "maintain":
      return 0;
    case "performance":
      // Slight surplus to support training capacity.
      return Math.min(300, Math.round(tdee * 0.05));
  }
}

// ---------- workout calendar derivation ----------

function deriveCalendar(state: UserState): WeekCalendar {
  // Honor `training_days` exactly when provided and the count matches
  // training_days_per_week. Otherwise fall back to skipping `preferred_days_off`.
  const trainDays = new Set<Weekday>(state.training_days);
  const off = new Set<Weekday>(state.preferred_days_off);

  if (trainDays.size === state.training_days_per_week) {
    return buildCalendarFromSets(trainDays);
  }

  // Fallback: start Mon, skip off-days, take training_days_per_week workouts.
  const picked = new Set<Weekday>();
  for (const day of WEEKDAYS) {
    if (off.has(day)) continue;
    if (picked.size >= state.training_days_per_week) break;
    picked.add(day);
  }
  return buildCalendarFromSets(picked);
}

function buildCalendarFromSets(workoutDays: Set<Weekday>): WeekCalendar {
  const cal = {} as Record<Weekday, "workout" | "rest">;
  for (const d of WEEKDAYS) cal[d] = workoutDays.has(d) ? "workout" : "rest";
  return cal as unknown as WeekCalendar;
}

// ---------- workout spec ----------

function buildVolumeTargets(
  state: UserState,
  sciSex: SciSex,
  decisions: Decision[],
): VolumeTargets {
  const out = {} as Record<MusclePattern, VolumeTargets[MusclePattern]>;
  for (const muscle of ALL_MUSCLES) {
    const row = VolumeTable.lookup(
      state.experience_level,
      state.goal_type,
      sciSex,
      muscle,
    );
    out[muscle] = {
      mev: row.mev,
      target: row.target,
      mav: row.mav,
      source: row.citation,
    };
    decisions.push({
      field: `workout.volume_targets.${muscle}.target`,
      value: row.target,
      inputs: ["experience_level", "goal_type", "sex"],
      source: `volume_targets@${VolumeTable.VOLUME_TARGETS_VERSION}#${row.experience}_${row.goal}_${row.sex}_${row.muscle}`,
    });
  }
  return out as VolumeTargets;
}

function buildIntensityTable(
  state: UserState,
  decisions: Decision[],
): { readonly [C in LiftCategory]: IntensityTarget } {
  const out = {} as Record<LiftCategory, IntensityTarget>;
  for (const cat of ALL_LIFT_CATEGORIES) {
    const row = IntensityTable.lookup(state.goal_type, cat);
    out[cat] = {
      category: cat,
      rep_range: [row.rep_min, row.rep_max] as const,
      rir_target: [row.rir_min, row.rir_max] as const,
      rest_seconds: row.rest_sec,
    };
    decisions.push({
      field: `workout.intensity_by_category.${cat}.rir_target`,
      value: `${row.rir_min}-${row.rir_max}`,
      inputs: ["goal_type"],
      source: `intensity_targets@${IntensityTable.INTENSITY_TARGETS_VERSION}#${row.goal}_${row.category}`,
    });
  }
  return out;
}

// Minimum movement patterns the plan must include each week.
// Tuned to the goal and experience level; advanced+strength-leaning goals
// pick up barbell-required patterns.
function deriveMovementRequirements(state: UserState): MovementRequirement[] {
  const out: MovementRequirement[] = [
    { pattern: "horizontal_press", min_per_week: 1 },
    { pattern: "horizontal_pull", min_per_week: 1 },
    { pattern: "vertical_press", min_per_week: 1 },
    { pattern: "vertical_pull", min_per_week: 1 },
    { pattern: "squat", min_per_week: 1 },
    { pattern: "hinge", min_per_week: 1 },
    { pattern: "core_anti_extension", min_per_week: 1 },
    { pattern: "core_anti_rotation", min_per_week: 1 },
  ];
  if (state.goal_type === "performance" || state.experience_level === "advanced") {
    out.push({ pattern: "carry", min_per_week: 1 });
    out.push({ pattern: "lunge", min_per_week: 1 });
  }
  return out;
}

function deriveExcludedPatterns(state: UserState): MovementPattern[] {
  const out: MovementPattern[] = [];
  const inj = new Set(state.injuries);
  if (inj.has("knee") || inj.has("knees")) {
    out.push("squat"); // user can swap later; squats excluded by default
  }
  if (inj.has("back") || inj.has("lower_back")) {
    out.push("hinge");
  }
  if (inj.has("shoulder") || inj.has("shoulders")) {
    out.push("vertical_press");
  }
  return out;
}

function deriveExcludedTags(state: UserState): string[] {
  const tags = new Set<string>();
  if (state.equipment_access === "bodyweight_only") {
    tags.add("barbell");
    tags.add("dumbbell");
    tags.add("cable");
    tags.add("machine");
  }
  for (const inj of state.injuries) tags.add(`contraindicated_for_${inj}`);
  return [...tags].sort();
}

function deriveCardio(state: UserState): WorkoutSpec["cardio"] {
  switch (state.goal_type) {
    case "lose_weight":
      return {
        sessions_per_week: 3,
        modality: "z2_steady" satisfies CardioModality,
        minutes_per_session: 25,
        placement: "after_lift",
        source: VolumeTable.lookup(
          state.experience_level,
          state.goal_type,
          state.sex,
          "core",
        ).citation,
      };
    case "performance":
      return {
        sessions_per_week: 2,
        modality: "moderate_intervals",
        minutes_per_session: 20,
        placement: "separate_day",
        source: VolumeTable.lookup(
          state.experience_level,
          state.goal_type,
          state.sex,
          "core",
        ).citation,
      };
    default:
      return undefined; // gain_muscle / recomp / maintain: no required cardio
  }
}

const STANDARD_WARMUP: WarmupProtocol = {
  general_minutes: 6,
  ramp_set_pattern: [
    { percent_of_working: 40, reps: 8 },
    { percent_of_working: 60, reps: 5 },
    { percent_of_working: 80, reps: 3 },
  ],
};

function deriveDeload(state: UserState, horizon_weeks: number): DeloadSpec | undefined {
  if (state.experience_level === "beginner") return undefined;
  // Deload on the 4th week unless plan is shorter than 4 weeks.
  if (horizon_weeks < 4) return undefined;
  return {
    week_index: 4,
    mode: "volume_reduction",
    volume_multiplier: 0.6,
  };
}

function buildWorkoutSpec(
  state: UserState,
  sciSex: SciSex,
  decisions: Decision[],
): WorkoutSpec {
  // Horizon: defer to target_date if present, else 4 weeks (one mesocycle).
  const horizon_weeks = state.target_date_iso
    ? Math.max(4, weeksBetween(new Date(), new Date(state.target_date_iso)))
    : 4;

  const volume_targets = buildVolumeTargets(state, sciSex, decisions);
  const intensity_by_category = buildIntensityTable(state, decisions);
  const calendar = deriveCalendar(state);
  decisions.push({
    field: "workout.calendar",
    value: WEEKDAYS.map((d) => calendar[d]).join(","),
    inputs: ["training_days", "preferred_days_off", "training_days_per_week"],
    source: "derived",
    rationale: state.training_days.length === state.training_days_per_week
      ? "honored user training_days exactly"
      : "fell back to default order skipping preferred_days_off",
  });

  const session_minutes_target = state.minutes_per_workout;
  const session_minutes_min = Math.max(20, Math.floor(state.minutes_per_workout * 0.8));
  decisions.push({
    field: "workout.session_minutes_target",
    value: session_minutes_target,
    inputs: ["minutes_per_workout"],
    source: "derived",
  });

  const { split_template, split_family } = deriveSplitTemplate(state, decisions);

  return {
    horizon_weeks,
    days_per_week: state.training_days_per_week,
    session_minutes_target,
    session_minutes_min,
    calendar,
    volume_targets,
    intensity_by_category,
    required_movement_patterns: deriveMovementRequirements(state),
    split_template,
    split_family,
    warmup: STANDARD_WARMUP,
    deload: deriveDeload(state, horizon_weeks),
    cardio: deriveCardio(state),
    exclude_movement_patterns: deriveExcludedPatterns(state),
    exclude_exercise_tags: deriveExcludedTags(state),
  };
}

// ---------- split template selection ----------
//
// Chooses a coherent split based on days_per_week + experience_level +
// preferred_split_family. The output is a per-day SplitDay assignment in
// calendar order (Mon-first). This is the architecture piece V3 was missing
// pre-Phase-5.5: without it, the engine fills exercises against weekly volume
// targets and lands incoherent muscle pairings (e.g. "chest+biceps+core+glutes"
// on the same day because those happened to be the muscles still below target).
//
// Defaults (advanced/intermediate):
//   2d: FB FB
//   3d: PPL (push/pull/legs)
//   4d: U L U L
//   5d: PPL UL (push/pull/legs/upper/lower)
//   6d: PPL PPL
//   7d: PPL PPL FB
//
// Beginner default:
//   any count: FB...FB (whole-body for movement-pattern mastery)
//
// User override via state.preferred_split_family: honored when compatible
// with days_per_week.

function deriveSplitTemplate(
  state: UserState,
  decisions: Decision[],
): { split_template: ReadonlyArray<SplitDay>; split_family: WorkoutSpec["split_family"] } {
  const days = state.training_days_per_week;
  const pref = (state.preferred_split_family || "").toLowerCase();

  // Honor explicit preference when compatible.
  if (pref === "ppl" && (days === 3 || days === 6)) {
    const template = days === 3
      ? (["push", "pull", "legs"] as ReadonlyArray<SplitDay>)
      : (["push", "pull", "legs", "push", "pull", "legs"] as ReadonlyArray<SplitDay>);
    pushSplitDecision(decisions, "ppl", template, "user preference + days_per_week match");
    return { split_template: template, split_family: "ppl" };
  }
  if ((pref === "upper_lower" || pref === "upperlower" || pref === "ul") && (days === 2 || days === 4)) {
    const template = days === 2
      ? (["upper", "lower"] as ReadonlyArray<SplitDay>)
      : (["upper", "lower", "upper", "lower"] as ReadonlyArray<SplitDay>);
    pushSplitDecision(decisions, "upper_lower", template, "user preference + days_per_week match");
    return { split_template: template, split_family: "upper_lower" };
  }
  if (pref === "full_body" || pref === "fullbody" || pref === "fb") {
    const template = new Array<SplitDay>(days).fill("full_body");
    pushSplitDecision(decisions, "full_body", template, "user preference");
    return { split_template: template, split_family: "full_body" };
  }

  // Beginner default: full-body at any frequency.
  if (state.experience_level === "beginner") {
    const template = new Array<SplitDay>(days).fill("full_body");
    pushSplitDecision(decisions, "full_body", template, "beginner default — full body builds movement-pattern mastery before specialization");
    return { split_template: template, split_family: "full_body" };
  }

  // Intermediate/advanced defaults by frequency.
  let template: ReadonlyArray<SplitDay>;
  let family: WorkoutSpec["split_family"];
  switch (days) {
    case 1:
      template = ["full_body"];
      family = "full_body";
      break;
    case 2:
      template = ["upper", "lower"];
      family = "upper_lower";
      break;
    case 3:
      template = ["push", "pull", "legs"];
      family = "ppl";
      break;
    case 4:
      template = ["upper", "lower", "upper", "lower"];
      family = "upper_lower";
      break;
    case 5:
      template = ["push", "pull", "legs", "upper", "lower"];
      family = "ppl_upper_lower";
      break;
    case 6:
      template = ["push", "pull", "legs", "push", "pull", "legs"];
      family = "ppl";
      break;
    case 7:
    default:
      template = ["push", "pull", "legs", "push", "pull", "legs", "full_body"];
      family = "ppl";
      break;
  }
  pushSplitDecision(decisions, family, template, `default for ${state.experience_level} at ${days}d/wk`);
  return { split_template: template, split_family: family };
}

function pushSplitDecision(
  decisions: Decision[],
  family: string,
  template: ReadonlyArray<SplitDay>,
  rationale: string,
) {
  decisions.push({
    field: "workout.split_template",
    value: `${family}:${template.join(",")}`,
    inputs: ["training_days_per_week", "experience_level", "preferred_split_family"],
    source: "derived",
    rationale,
  });
}

function weeksBetween(a: Date, b: Date): number {
  const ms = Math.max(0, b.getTime() - a.getTime());
  return Math.ceil(ms / (7 * 24 * 60 * 60 * 1000));
}

// ---------- nutrition spec ----------

function trainingCalendarFromWorkout(workout: WorkoutSpec): WeekCalendar {
  return workout.calendar;
}

// Build slot layout from the science slot_ratios table. We pull both the
// training-day and rest-day templates and combine with the day-type macros.
function buildSlotShapes(
  meals_per_day: number,
  is_training_day: boolean,
): ReadonlyArray<SlotShape> {
  // Use has_workout_window=true for training days to bias carbs around training.
  const result = SlotTable.lookup(meals_per_day, is_training_day, is_training_day);
  return result.slots.map<SlotShape>((r) => ({
    slot: r.slot as MealSlotName,
    target_kcal_share: r.kcal_share,
    target_protein_share: r.protein_share,
    target_carb_share: r.carb_share,
    target_fat_share: r.fat_share,
    carb_density: r.carb_density,
    fat_density: r.fat_density,
    required_food_categories: [],
    is_snack: r.slot.includes("snack"),
  }));
}

function buildDayMacros(
  totalKcal: number,
  proteinG: number,
  fatPct: number, // 0..1
  fiberG: number,
  waterMl: number,
  meals_per_day: number,
  is_training_day: boolean,
  source: ScienceCitation,
) {
  const fatKcal = totalKcal * fatPct;
  const proteinKcal = proteinG * 4;
  const carbKcal = Math.max(0, totalKcal - proteinKcal - fatKcal);
  const carbsG = Math.round(carbKcal / 4);
  const fatG = Math.round(fatKcal / 9);
  return {
    kcal: Math.round(totalKcal),
    protein_g: Math.round(proteinG),
    carbs_g: carbsG,
    fat_g: fatG,
    fiber_g: Math.round(fiberG),
    water_ml: Math.round(waterMl),
    slots: buildSlotShapes(meals_per_day, is_training_day),
    source,
  };
}

function deriveWeeklyFoodMinimums(state: UserState): ReadonlyArray<WeeklyFoodMinimum> {
  const out: WeeklyFoodMinimum[] = [];

  // Each preferred protein must appear at least 2x/week (rotation, not picked once).
  for (const p of state.preferred_proteins) {
    out.push({ tag: p, min_appearances: 2, origin: "preference" });
  }
  for (const c of state.preferred_carbs) {
    out.push({ tag: c, min_appearances: 2, origin: "preference" });
  }
  for (const f of state.preferred_fats) {
    out.push({ tag: f, min_appearances: 2, origin: "preference" });
  }

  // Science-driven minimums (omega-3, leafy greens, etc.) — only when the
  // user's dietary preference + allergies don't exclude them.
  const allergies = new Set(state.allergies_exclusions);
  if (state.dietary_preference === "anything" || state.dietary_preference === "pescatarian") {
    if (!allergies.has("fish")) {
      out.push({ tag: "fish", min_appearances: 2, origin: "science" });
    }
  }
  if (!allergies.has("eggs") && state.dietary_preference !== "vegan") {
    out.push({ tag: "eggs", min_appearances: 3, origin: "science" });
  }
  out.push({ tag: "leafy_green", min_appearances: 5, origin: "science" });
  out.push({ tag: "cruciferous", min_appearances: 3, origin: "science" });

  return out;
}

function deriveHardExcludeTags(state: UserState): ReadonlyArray<string> {
  const tags = new Set<string>();
  for (const a of state.allergies_exclusions) tags.add(a);
  for (const r of state.refused_foods) tags.add(r);
  if (state.dietary_preference === "vegan") {
    tags.add("meat"); tags.add("dairy"); tags.add("eggs"); tags.add("fish"); tags.add("shellfish");
  } else if (state.dietary_preference === "vegetarian") {
    tags.add("meat"); tags.add("fish"); tags.add("shellfish");
  } else if (state.dietary_preference === "pescatarian") {
    tags.add("meat");
  }
  tags.delete("none"); // sentinel
  return [...tags].sort();
}

function deriveMicroGates(
  state: UserState,
  sciSex: SciSex,
): ReadonlyArray<MicronutrientGate> {
  const rows = MicroTable.lookup(sciSex, state.age_years);
  return rows.map((r) => ({
    nutrient: r.nutrient,
    weekly_min: r.weekly_min,
    weekly_unit: r.unit,
    source: r.citation,
  }));
}

function buildNutritionSpec(
  state: UserState,
  workout: WorkoutSpec,
  decisions: Decision[],
): NutritionSpec {
  const sciSex: SciSex = state.sex;
  const tdee = Math.round(mifflinStJeor(state) * activityMultiplier(state.activity_level));
  const goalOffset = goalCalorieOffset(state, tdee);
  const targetKcal = tdee + goalOffset;

  const proteinRow = ProteinTable.lookup(state.goal_type, state.age_years, sciSex);
  // Use the mid of the table's g/kg range, applied to current weight.
  const proteinPerKg = (proteinRow.g_per_kg_min + proteinRow.g_per_kg_max) / 2;
  const proteinG = Math.round(state.current_weight_kg * proteinPerKg);

  decisions.push({
    field: "nutrition.protein_g",
    value: proteinG,
    inputs: ["goal_type", "age_years", "sex", "current_weight_kg"],
    source: `protein_targets@${ProteinTable.PROTEIN_TARGETS_VERSION}#${proteinRow.goal}_${proteinRow.age_band}_${proteinRow.sex}`,
    rationale: `${proteinPerKg.toFixed(1)} g/kg × ${state.current_weight_kg} kg`,
  });

  // Fat % bumps for older lifters (hormonal support).
  let fatPct = state.goal_type === "lose_weight" ? 0.28 : 0.30;
  if (state.age_years >= 40 && state.sex === "male") fatPct += 0.02;
  if (state.dietary_preference === "keto") fatPct = 0.70;

  decisions.push({
    field: "nutrition.fat_pct",
    value: fatPct,
    inputs: ["goal_type", "age_years", "sex", "dietary_preference"],
    source: "derived",
    rationale: state.age_years >= 40 && state.sex === "male"
      ? "+2% for male age 40+ hormonal support"
      : "default goal-based fat %",
  });

  const fiberG = Math.max(25, Math.round(targetKcal / 1000 * 14)); // 14g per 1000 kcal
  const hydrationMl = Hydration.compute(
    mapUserActivityToScience(state.activity_level),
    state.current_weight_kg,
    state.minutes_per_workout * state.training_days_per_week / 7, // avg daily training min
  );

  const carb = CarbCycling.lookup(state.goal_type);
  const trainingKcal = Math.round(targetKcal * carb.training_kcal_multiplier);
  const restKcal = Math.round(targetKcal * carb.rest_kcal_multiplier);
  // Carb cycling: rest-day shift mirrors training-day shift (carbs +fat-).
  const trainingFatPct = Math.max(0.15, fatPct + carb.training_fat_pct_shift);
  const restFatPct = Math.min(0.45, fatPct - carb.training_fat_pct_shift);

  decisions.push({
    field: "nutrition.training_day.kcal",
    value: trainingKcal,
    inputs: ["goal_type"],
    source: `carb_cycling@${CarbCycling.CARB_CYCLING_VERSION}#${carb.goal}`,
  });
  decisions.push({
    field: "nutrition.rest_day.kcal",
    value: restKcal,
    inputs: ["goal_type"],
    source: `carb_cycling@${CarbCycling.CARB_CYCLING_VERSION}#${carb.goal}`,
  });

  const slotsCite: ScienceCitation = {
    source: "Aragon & Schoenfeld (2013); Kerksick et al. ISSN (2017)",
    confidence: "high",
  };

  const training_day = buildDayMacros(
    trainingKcal, proteinG, trainingFatPct, fiberG, hydrationMl,
    state.meals_per_day, true, slotsCite,
  );
  const rest_day = buildDayMacros(
    restKcal, proteinG, restFatPct, fiberG, hydrationMl * 0.9,
    state.meals_per_day, false, slotsCite,
  );

  return {
    horizon_weeks: workout.horizon_weeks,
    meals_per_day: state.meals_per_day,
    training_calendar: trainingCalendarFromWorkout(workout),
    training_day,
    rest_day,
    weekly_food_minimums: deriveWeeklyFoodMinimums(state),
    max_repeats_of_template_per_week: 2,
    min_unique_templates_per_slot_per_week: state.meals_per_day >= 4 ? 4 : 3,
    hard_exclude_tags: deriveHardExcludeTags(state),
    micronutrient_gates: deriveMicroGates(state, sciSex),
  };
}

// ---------- top-level entry ----------

export function buildPlanSpec(input: BuildPlanSpecInput): PlanSpec {
  const { state } = input;
  const now = input.now || new Date();
  const seed = buildUserStateSeed(state);

  const decisions: Decision[] = [];
  const workout = buildWorkoutSpec(state, state.sex, decisions);
  const nutrition = buildNutritionSpec(state, workout, decisions);

  return {
    plan_spec_version: PLAN_SPEC_VERSION,
    user_state_version: USER_STATE_VERSION,
    seed,
    generated_at: now.toISOString(),
    science_table_versions: SCIENCE_TABLE_VERSIONS,
    workout,
    nutrition,
    decisions,
  };
}
