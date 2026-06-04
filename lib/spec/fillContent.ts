// Layer 2 — Content (Phase 2).
//
// Pure function: PlanSpec + catalogs (exercises, foods) -> Plan over N weeks.
//
// Deterministic given the PlanSpec seed.
//
// Phase 2 additions vs Phase 1:
//   - Plan extends over `spec.workout.horizon_weeks` weeks (deload supported).
//   - Weekly volume per muscle hits `volume_targets[muscle].target` between MEV
//     and MAV by adding accessories after required movement patterns.
//   - No primary lift repeats across workout days within a week.
//   - Each workout day emits a warm-up section from PlanSpec.workout.warmup.
//   - Cardio sessions emitted per PlanSpec.workout.cardio.
//   - Deload week: volume multiplier applied (sets reduced, intensity preserved).

import type {
  IntensityTarget,
  LiftCategory,
  MealSlotName,
  MovementPattern,
  MusclePattern,
  PlanSpec,
  PrescriptionUnit,
  SlotShape,
  SplitDay,
  WarmupProtocol,
  CardioPrescription,
} from "./PlanSpec.ts";
import { seedHexToNumber } from "./UserState.ts";

// ---------- catalog inputs ----------

export interface ExerciseRow {
  readonly id: string;
  readonly name: string;
  readonly movement_pattern: MovementPattern;
  readonly primary_muscles: ReadonlyArray<MusclePattern>;
  readonly secondary_muscles?: ReadonlyArray<MusclePattern>;
  readonly equipment_tags: ReadonlyArray<string>;
  readonly category: LiftCategory;
  readonly prescription_unit: PrescriptionUnit;
  readonly baseline_unit_amount?: number;
}

export interface FoodRow {
  readonly id: string;
  readonly name: string;
  readonly tags: ReadonlyArray<string>;
  readonly kcal_per_g: number;
  readonly protein_g_per_g: number;
  readonly carb_g_per_g: number;
  readonly fat_g_per_g: number;
  readonly slot_affinity: ReadonlyArray<MealSlotName>;
  readonly category: "protein" | "carb" | "fat" | "vegetable" | "fruit" | "misc";
}

export interface PlanContext {
  readonly spec: PlanSpec;
  readonly exercises: ReadonlyArray<ExerciseRow>;
  readonly foods: ReadonlyArray<FoodRow>;
}

// ---------- plan output ----------

export interface PlanExercise {
  readonly order: number;
  readonly exercise_id: string;
  readonly exercise_name: string;
  readonly category: LiftCategory;
  readonly movement_pattern: MovementPattern;
  readonly primary_muscles: ReadonlyArray<MusclePattern>;
  readonly sets: number;
  readonly reps_min: number;
  readonly reps_max: number;
  readonly rir_min: number;
  readonly rir_max: number;
  readonly rest_seconds: number;
  readonly prescription_unit: PrescriptionUnit;
  readonly unit_min?: number;
  readonly unit_max?: number;
  readonly tempo: string | null;
}

export interface PlanCardio {
  readonly modality: CardioPrescription["modality"];
  readonly minutes: number;
}

export interface PlanWorkoutDay {
  readonly weekday: string;
  readonly focus: string;
  readonly warmup: WarmupProtocol;
  readonly exercises: ReadonlyArray<PlanExercise>;
  readonly cardio?: PlanCardio;
  readonly estimated_minutes: number;
}

export interface PlanWeek {
  readonly week_index: number;          // 1-indexed
  readonly is_deload: boolean;
  readonly workout_days: ReadonlyArray<PlanWorkoutDay>;
  readonly weekly_volume_actual: { readonly [M in MusclePattern]: number };
}

export interface PlanMealItem {
  readonly food_id: string;
  readonly food_name: string;
  readonly grams: number;
  readonly kcal: number;
  readonly protein_g: number;
  readonly carb_g: number;
  readonly fat_g: number;
}

export interface PlanMealVariant {
  readonly items: ReadonlyArray<PlanMealItem>;
  readonly name?: string;
}

export interface PlanMeal {
  readonly slot: MealSlotName;
  readonly items: ReadonlyArray<PlanMealItem>;
  readonly variants: ReadonlyArray<PlanMealVariant>; // Phase 3: ≥3 alternatives
  readonly target_kcal: number;
  readonly target_protein_g: number;
  readonly target_carb_g: number;
  readonly target_fat_g: number;
}

export interface PlanNutritionDay {
  readonly weekday: string;
  readonly is_training_day: boolean;
  readonly meals: ReadonlyArray<PlanMeal>;
  readonly totals: { kcal: number; protein_g: number; carb_g: number; fat_g: number };
}

export interface Plan {
  readonly spec_seed: string;
  readonly horizon_weeks: number;
  readonly workout_weeks: ReadonlyArray<PlanWeek>;
  /** Convenience alias: workout days of week 1 (used by callers that don't care about multi-week). */
  readonly workout_days: ReadonlyArray<PlanWorkoutDay>;
  readonly nutrition_days: ReadonlyArray<PlanNutritionDay>;
}

// ---------- deterministic helpers ----------

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const ALL_MUSCLES: ReadonlyArray<MusclePattern> = [
  "chest", "back_lats", "back_upper", "shoulders_lateral", "shoulders_rear",
  "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "core",
];

// ---------- workout filling ----------

function isExerciseAllowed(
  ex: ExerciseRow,
  excludedPatterns: ReadonlyArray<MovementPattern>,
  excludedTags: ReadonlyArray<string>,
): boolean {
  if ((excludedPatterns as MovementPattern[]).includes(ex.movement_pattern)) return false;
  for (const t of excludedTags) {
    if ((ex.equipment_tags as string[]).includes(t)) return false;
  }
  return true;
}

function exerciseHitsMuscles(ex: ExerciseRow): ReadonlyArray<MusclePattern> {
  const primary = ex.primary_muscles;
  // Secondary muscles count as half a set; for volume targeting we'll
  // weight them at 0.5 when summing. For now, return both lists.
  return primary;
}

function deriveSets(category: LiftCategory, isDeload: boolean): number {
  let base: number;
  switch (category) {
    case "primary": base = 4; break;
    case "secondary": base = 3; break;
    case "accessory": base = 3; break;
    case "isolation": base = 3; break;
  }
  return isDeload ? Math.max(2, Math.round(base * 0.6)) : base;
}

function buildExercisePrescription(
  ex: ExerciseRow,
  intensity: IntensityTarget,
  order: number,
  isDeload: boolean,
): PlanExercise {
  const isTime = ex.prescription_unit === "time_seconds";
  const isDist = ex.prescription_unit === "distance_meters";
  return {
    order,
    exercise_id: ex.id,
    exercise_name: ex.name,
    category: ex.category,
    movement_pattern: ex.movement_pattern,
    primary_muscles: ex.primary_muscles,
    sets: deriveSets(ex.category, isDeload),
    reps_min: intensity.rep_range[0],
    reps_max: intensity.rep_range[1],
    rir_min: intensity.rir_target[0],
    rir_max: intensity.rir_target[1],
    rest_seconds: intensity.rest_seconds,
    prescription_unit: ex.prescription_unit,
    unit_min: isTime || isDist ? Math.max(20, ex.baseline_unit_amount ?? 30) : undefined,
    unit_max: isTime || isDist ? Math.max(30, (ex.baseline_unit_amount ?? 30) * 1.5) : undefined,
    tempo: null,
  };
}

function estimateMinutes(exercises: ReadonlyArray<PlanExercise>): number {
  let totalSec = 0;
  for (const e of exercises) totalSec += e.sets * (30 + e.rest_seconds);
  return Math.round(totalSec / 60);
}

function deriveDayFocus(exs: ReadonlyArray<PlanExercise>): string {
  if (exs.length === 0) return "Rest";
  const muscles = new Set<string>();
  for (const e of exs) for (const m of e.primary_muscles) muscles.add(m);
  return [...muscles].sort().slice(0, 4).join(" + ");
}

/** Sum sets per muscle across exercises (primary = 1×, secondary = 0.5×). */
function aggregateVolume(
  exercises: ReadonlyArray<PlanExercise>,
  catalogById: Map<string, ExerciseRow>,
): { readonly [M in MusclePattern]: number } {
  const out = {} as Record<MusclePattern, number>;
  for (const m of ALL_MUSCLES) out[m] = 0;
  for (const e of exercises) {
    const cat = catalogById.get(e.exercise_id);
    for (const m of e.primary_muscles) out[m] += e.sets;
    if (cat?.secondary_muscles) {
      for (const m of cat.secondary_muscles) out[m] += e.sets * 0.5;
    }
  }
  return out;
}

interface WeekContext {
  readonly week_index: number;
  readonly isDeload: boolean;
  readonly seed: number;
}

interface WeekState {
  readonly usedPrimaryIds: Set<string>;     // dedup across workout days in same week
  readonly volumeByMuscle: Record<MusclePattern, number>;
  readonly patternHitCount: Map<MovementPattern, number>;
}

// Per-day muscle/pattern targeting for split templates. Without these maps,
// fillContent picks exercises against weekly volume targets only, leading to
// incoherent muscle pairings on a given day (e.g. "chest + biceps + glutes"
// because those happened to be the muscles still below target). With them,
// each training day filters required patterns and accessory candidates to
// the muscles assigned by the split template.
const SPLIT_DAY_MUSCLES: Record<SplitDay, ReadonlyArray<MusclePattern>> = {
  push: ["chest", "shoulders_lateral", "shoulders_rear", "triceps", "core"],
  pull: ["back_lats", "back_upper", "biceps", "core"],
  legs: ["quads", "hamstrings", "glutes", "calves", "core"],
  upper: ["chest", "back_lats", "back_upper", "shoulders_lateral", "shoulders_rear", "biceps", "triceps", "core"],
  lower: ["quads", "hamstrings", "glutes", "calves", "core"],
  full_body: ["chest", "back_lats", "back_upper", "shoulders_lateral", "shoulders_rear",
    "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "core"],
};

const SPLIT_DAY_PATTERNS: Record<SplitDay, ReadonlyArray<MovementPattern>> = {
  // Core patterns are included on every split day — anti-extension and
  // anti-rotation are trained at the end of any session and aren't tied to a
  // specific upper/lower grouping. Without this, PPL/UL splits would miss
  // their weekly core minimum entirely.
  push: ["horizontal_press", "vertical_press", "core_anti_extension", "core_anti_rotation"],
  pull: ["horizontal_pull", "vertical_pull", "core_anti_extension", "core_anti_rotation"],
  legs: ["squat", "hinge", "lunge", "carry", "core_anti_extension", "core_anti_rotation"],
  upper: ["horizontal_press", "vertical_press", "horizontal_pull", "vertical_pull",
    "core_anti_extension", "core_anti_rotation"],
  lower: ["squat", "hinge", "lunge", "carry", "core_anti_extension", "core_anti_rotation"],
  full_body: [
    "horizontal_press", "vertical_press", "horizontal_pull", "vertical_pull",
    "squat", "hinge", "lunge", "carry",
    "core_anti_extension", "core_anti_rotation",
  ],
};

function newWeekState(): WeekState {
  const v = {} as Record<MusclePattern, number>;
  for (const m of ALL_MUSCLES) v[m] = 0;
  return {
    usedPrimaryIds: new Set(),
    volumeByMuscle: v,
    patternHitCount: new Map(),
  };
}

function fillWorkoutDayInWeek(
  spec: PlanSpec,
  allowed: ReadonlyArray<ExerciseRow>,
  weekday: string,
  dayIndex: number,
  weekCtx: WeekContext,
  weekState: WeekState,
  catalogById: Map<string, ExerciseRow>,
  splitDay: SplitDay,
): PlanWorkoutDay {
  const dayChosenIds = new Set<string>();
  const dayExercises: PlanExercise[] = [];

  // Day-scoped filters from the split template. Required patterns picked for
  // this day must be in the split's pattern set; accessory candidates must hit
  // a muscle in the split's muscle set. This is what turns "the engine picked
  // 5 random exercises against weekly volume" into "this day is a Push day."
  const splitPatterns = new Set<MovementPattern>(SPLIT_DAY_PATTERNS[splitDay]);
  const splitMuscles = new Set<MusclePattern>(SPLIT_DAY_MUSCLES[splitDay]);

  // Per-day exercise budget. Without this, Step 1 dumps every required-pattern
  // hit onto the first day of the week (because the "alreadyHit < min_per_week"
  // gate is week-scoped, so day 1 grabs them all). Capping per-day exercise
  // count forces the requirements to spread across days_per_week sessions,
  // which is what an actual coach does: a 60-min session is ~5-6 exercises,
  // not 10.
  //
  // Budget formula: roughly one exercise per ~8 minutes of session time
  // (warmup-share + working sets + rest), floored at 5 (short sessions still
  // need a main + accessory for each split muscle group) and capped at 9 (so
  // very long sessions don't bloat). For 60-min sessions this is 7, which
  // gives a push day room for 1 main press + 1 secondary press + 1 chest
  // accessory + 1 shoulder accessory + 1 triceps + 1 rear delt + 1 core.
  const dayExerciseBudget = Math.min(9, Math.max(5, Math.floor(spec.workout.session_minutes_target / 8)));

  // Step 1: one exercise per required movement pattern.
  // Inter-day dedup applies to primaries — same primary lift can't repeat in
  // the same week. We prefer higher-category exercises (primary > secondary >
  // accessory > isolation) so a compound row beats a curl when both technically
  // share the same `movement_pattern` tag.
  const CATEGORY_RANK: Record<LiftCategory, number> = {
    primary: 0, secondary: 1, accessory: 2, isolation: 3,
  };
  // Step 1 reserves room for at least one accessory in Step 2.
  const step1Budget = Math.max(3, dayExerciseBudget - 1);
  for (let i = 0; i < spec.workout.required_movement_patterns.length; i++) {
    if (dayExercises.length >= step1Budget) break;
    const req = spec.workout.required_movement_patterns[i];
    // Skip patterns that don't belong to this day's split assignment.
    if (!splitPatterns.has(req.pattern)) continue;
    // Skip this pattern if the weekly minimum is already met.
    const alreadyHit = weekState.patternHitCount.get(req.pattern) ?? 0;
    if (alreadyHit >= req.min_per_week) continue;
    let pool = allowed.filter((e) =>
      e.movement_pattern === req.pattern
      && !dayChosenIds.has(e.id)
      && !(e.category === "primary" && weekState.usedPrimaryIds.has(e.id))
    );
    if (pool.length === 0) continue;
    // Restrict to the highest available category for this pattern.
    const bestRank = Math.min(...pool.map((e) => CATEGORY_RANK[e.category]));
    pool = pool.filter((e) => CATEGORY_RANK[e.category] === bestRank);
    const seed = weekCtx.seed + dayIndex * 31 + i * 7;
    const picked = pool[seed % pool.length];
    dayChosenIds.add(picked.id);
    if (picked.category === "primary") weekState.usedPrimaryIds.add(picked.id);
    weekState.patternHitCount.set(
      picked.movement_pattern,
      (weekState.patternHitCount.get(picked.movement_pattern) ?? 0) + 1,
    );
    const intensity = spec.workout.intensity_by_category[picked.category];
    const planEx = buildExercisePrescription(picked, intensity, dayExercises.length, weekCtx.isDeload);
    dayExercises.push(planEx);
    // Track volume immediately
    for (const m of planEx.primary_muscles) weekState.volumeByMuscle[m] += planEx.sets;
    if (picked.secondary_muscles) {
      for (const m of picked.secondary_muscles) weekState.volumeByMuscle[m] += planEx.sets * 0.5;
    }
  }

  // Step 2: fill toward session_minutes_target with accessories that target
  // under-served muscles, stopping if no muscle remains under its target OR if
  // every candidate would push some muscle over its MAV. Also caps per-day
  // exercise count so this day does not bloat past dayExerciseBudget while
  // other days in the week still have nothing assigned.
  const targetMinutes = spec.workout.session_minutes_target;
  let iter = 0;
  // Muscles for which we've already tried this day and found zero candidates
  // in the catalog (e.g. shoulders_rear in catalogs whose loader never tags
  // any exercise primary=shoulders_rear). Without this set, the loop spins
  // 20 iterations re-picking the same dead-end muscle and the day ends empty.
  const noCandidateMuscles = new Set<MusclePattern>();
  const activeSplitMuscles = new Set(splitMuscles);
  while (
    dayExercises.length < dayExerciseBudget
    && estimateMinutes(dayExercises) < targetMinutes - 8
    && iter < 20
  ) {
    // Three-stage relaxation: first prefer muscles at <90% of target, then
    // <100%, then <MAV. Stops only when no muscle is still below MAV.
    const underServed =
      findMostUnderservedMuscle(spec, weekState, 0.9, activeSplitMuscles) ||
      findMostUnderservedMuscle(spec, weekState, 1.0, activeSplitMuscles) ||
      anyMuscleBelowMav(spec, weekState, activeSplitMuscles);
    if (!underServed) break;
    const candidates = allowed.filter((e) => {
      if (dayChosenIds.has(e.id)) return false;
      if (e.category === "primary") return false;
      if (!e.primary_muscles.includes(underServed)) return false;
      // Don't push any primary OR secondary muscle over its MAV. Secondary
      // muscles count at 0.5x in volume credit; we must account for that
      // here too, otherwise back_upper / glutes / hamstrings overshoot
      // because they pick up secondary credit from rows/squats/RDLs without
      // an MAV gate.
      const addedSets = deriveSets(e.category, weekCtx.isDeload);
      for (const m of e.primary_muscles) {
        const mav = spec.workout.volume_targets[m].mav;
        if (weekState.volumeByMuscle[m] + addedSets > mav) return false;
      }
      if (e.secondary_muscles) {
        const addedSecondary = addedSets * 0.5;
        for (const m of e.secondary_muscles) {
          const mav = spec.workout.volume_targets[m].mav;
          if (weekState.volumeByMuscle[m] + addedSecondary > mav) return false;
        }
      }
      return true;
    });
    if (candidates.length === 0) {
      // Remove this muscle from consideration for the rest of the day so the
      // loop doesn't keep selecting it. Without this, the loop spins on a
      // muscle the catalog can't satisfy and the day ends with zero exercises.
      noCandidateMuscles.add(underServed);
      activeSplitMuscles.delete(underServed);
      iter++;
      continue;
    }
    const seed = weekCtx.seed + dayIndex * 41 + iter * 11 + 17;
    const picked = candidates[seed % candidates.length];
    dayChosenIds.add(picked.id);
    const intensity = spec.workout.intensity_by_category[picked.category];
    const planEx = buildExercisePrescription(picked, intensity, dayExercises.length, weekCtx.isDeload);
    dayExercises.push(planEx);
    for (const m of planEx.primary_muscles) weekState.volumeByMuscle[m] += planEx.sets;
    if (picked.secondary_muscles) {
      for (const m of picked.secondary_muscles) weekState.volumeByMuscle[m] += planEx.sets * 0.5;
    }
    iter++;
  }

  // Cardio: only if spec says cardio after_lift OR either.
  let cardio: PlanCardio | undefined = undefined;
  if (spec.workout.cardio && spec.workout.cardio.placement !== "separate_day") {
    // Distribute cardio across the first N workout days of the week.
    const cardioDaysPerWeek = spec.workout.cardio.sessions_per_week;
    if (dayIndex < cardioDaysPerWeek) {
      cardio = {
        modality: spec.workout.cardio.modality,
        minutes: spec.workout.cardio.minutes_per_session,
      };
    }
  }

  return {
    weekday,
    focus: dayExercises.length === 0
      ? "Rest"
      : `${splitDayLabel(splitDay)} — ${deriveDayFocus(dayExercises)}`,
    warmup: spec.workout.warmup,
    exercises: dayExercises,
    cardio,
    estimated_minutes: estimateMinutes(dayExercises) + (cardio ? cardio.minutes : 0),
  };
}

function splitDayLabel(d: SplitDay): string {
  switch (d) {
    case "push": return "Push";
    case "pull": return "Pull";
    case "legs": return "Legs";
    case "upper": return "Upper";
    case "lower": return "Lower";
    case "full_body": return "Full Body";
  }
}

function anyMuscleBelowMav(
  spec: PlanSpec,
  state: WeekState,
  restrictTo?: ReadonlySet<MusclePattern>,
): MusclePattern | undefined {
  for (const m of ALL_MUSCLES) {
    if (restrictTo && !restrictTo.has(m)) continue;
    if (state.volumeByMuscle[m] < spec.workout.volume_targets[m].mav) return m;
  }
  return undefined;
}

function findMostUnderservedMuscle(
  spec: PlanSpec,
  state: WeekState,
  thresholdRatio: number = 1.0,
  restrictTo?: ReadonlySet<MusclePattern>,
): MusclePattern | undefined {
  let worst: MusclePattern | undefined;
  let worstDeficit = -Infinity;
  for (const m of ALL_MUSCLES) {
    if (restrictTo && !restrictTo.has(m)) continue;
    const target = spec.workout.volume_targets[m].target;
    const current = state.volumeByMuscle[m];
    const deficit = target - current;
    if (current < target * thresholdRatio && deficit > worstDeficit) {
      worst = m;
      worstDeficit = deficit;
    }
  }
  return worst;
}

function fillWorkoutWeek(
  spec: PlanSpec,
  exercises: ReadonlyArray<ExerciseRow>,
  weekIndex: number,
  baseSeed: number,
): PlanWeek {
  const allowed = exercises.filter((e) =>
    isExerciseAllowed(e, spec.workout.exclude_movement_patterns, spec.workout.exclude_exercise_tags)
  );
  const catalogById = new Map(exercises.map((e) => [e.id, e]));

  const isDeload = !!(spec.workout.deload && spec.workout.deload.week_index === weekIndex);
  const weekSeed = baseSeed ^ (weekIndex * 1009);
  const ctx: WeekContext = { week_index: weekIndex, isDeload, seed: weekSeed };
  const state = newWeekState();

  const workout_days: PlanWorkoutDay[] = [];
  let dayIdx = 0;
  for (const wd of WEEKDAYS) {
    if (spec.workout.calendar[wd] !== "workout") continue;
    const splitDay = spec.workout.split_template[dayIdx] ?? "full_body";
    const day = fillWorkoutDayInWeek(spec, allowed, wd, dayIdx, ctx, state, catalogById, splitDay);
    workout_days.push(day);
    dayIdx++;
  }

  return {
    week_index: weekIndex,
    is_deload: isDeload,
    workout_days,
    weekly_volume_actual: state.volumeByMuscle,
  };
}

// ---------- nutrition filling (Phase 3: variety + variants + carb cycling) ----------
//
// Algorithm:
//   1. Enumerate all valid (protein, carb, fat) triples from the catalog,
//      filtered against hard_exclude_tags.
//   2. For each meal slot on each day:
//      a. Score every triple by:
//         - Carb density fit (training day prefers high-carb-dense carbs;
//           rest day prefers lower).
//         - Slot-shape fit (snacks skip fat add; preworkout favors fast carbs).
//         - Repeat penalty: a triple already used N times this week is
//           penalized N × repeat_penalty.
//         - Weekly-minimum bonus: foods we still owe per weekly_food_minimums
//           get a bonus until satisfied.
//         - Deterministic seed-based jitter for tie-breaking.
//      b. The top-ranked triple becomes the default meal; ranks 2–4 become
//         variants the user can swap.
//   3. Track state across the week: tripleCount, foodAppearances. Hard-skip
//      triples that have hit max_repeats_of_template_per_week.

interface NutritionWeekState {
  readonly tripleCount: Map<string, number>;
  readonly foodAppearances: Map<string, number>;
}

function newNutritionWeekState(): NutritionWeekState {
  return { tripleCount: new Map(), foodAppearances: new Map() };
}

interface MealCandidate {
  readonly protein: FoodRow;
  readonly carb: FoodRow;
  readonly fat: FoodRow | null;
  readonly veg: FoodRow | null;
  readonly tripleKey: string;
  readonly score: number;
  readonly items: ReadonlyArray<PlanMealItem>;
}

function tripleKeyFor(p: FoodRow, c: FoodRow, f: FoodRow | null): string {
  return `${p.id}|${c.id}|${f?.id ?? "none"}`;
}

function makeItem(f: FoodRow, grams: number): PlanMealItem {
  const safeG = Math.max(5, Math.round(grams));
  return {
    food_id: f.id,
    food_name: f.name,
    grams: safeG,
    kcal: Math.round(safeG * f.kcal_per_g),
    protein_g: Math.round(safeG * f.protein_g_per_g * 10) / 10,
    carb_g: Math.round(safeG * f.carb_g_per_g * 10) / 10,
    fat_g: Math.round(safeG * f.fat_g_per_g * 10) / 10,
  };
}

function scoreTriple(
  protein: FoodRow,
  carb: FoodRow,
  fat: FoodRow | null,
  shape: SlotShape,
  spec: PlanSpec,
  isTraining: boolean,
  state: NutritionWeekState,
  seed: number,
): number {
  let score = 0;

  // Carb-density vs slot shape (Phase 3: visible diff between training/rest).
  if (shape.carb_density === "high" && carb.carb_g_per_g >= 0.20) score += 3;
  if (shape.carb_density === "low" && carb.carb_g_per_g < 0.15) score += 3;
  if (shape.carb_density === "medium") score += 1;
  // Extra training-day bonus for energy-dense carbs around the workout window.
  if (isTraining && carb.carb_g_per_g >= 0.25) score += 2;
  if (!isTraining && carb.tags.some((t) => /vegetable|leafy/.test(t))) score += 1;

  // Snack slot — don't include fat as a separate component.
  if (shape.is_snack && fat) score -= 1;

  // Weekly-minimum bonus: foods that we still owe per minimums get +N.
  for (const min of spec.nutrition.weekly_food_minimums) {
    const tag = min.tag;
    const targets = [protein, carb, fat].filter(Boolean) as FoodRow[];
    const matches = targets.some((f) =>
      f.id.includes(tag) ||
      f.name.toLowerCase().includes(tag) ||
      f.tags.some((t) => t === tag || t.includes(tag))
    );
    if (matches) {
      const appearances = countAppearancesByTag(state.foodAppearances, tag, targets);
      const deficit = Math.max(0, min.min_appearances - appearances);
      if (deficit > 0) score += 4 * deficit;
    }
  }

  // Repeat penalty: every prior use of this triple costs us.
  const key = tripleKeyFor(protein, carb, fat);
  const used = state.tripleCount.get(key) ?? 0;
  score -= 10 * used;

  // Deterministic jitter for tie-breaking.
  const jitter = ((seed ^ djb2(key)) >>> 0) / 0xffffffff * 0.5;
  score += jitter;
  return score;
}

function countAppearancesByTag(
  appearances: Map<string, number>,
  tag: string,
  candidates: FoodRow[],
): number {
  let n = 0;
  for (const [foodId, count] of appearances) {
    if (candidates.some((c) => c.id === foodId && (c.id.includes(tag) || c.name.toLowerCase().includes(tag) || c.tags.includes(tag)))) {
      n += count;
    }
  }
  return n;
}

function generateMealCandidates(
  shape: SlotShape,
  foods: ReadonlyArray<FoodRow>,
  spec: PlanSpec,
  targets: { kcal: number; protein: number; carb: number; fat: number },
  isTraining: boolean,
  state: NutritionWeekState,
  seed: number,
): MealCandidate[] {
  const allowed = foods.filter((f) =>
    !f.tags.some((t) => (spec.nutrition.hard_exclude_tags as string[]).includes(t))
  );
  if (allowed.length === 0) return [];

  const proteinPool = allowed.filter((f) => f.category === "protein" || f.protein_g_per_g >= 0.15);
  const carbPool = allowed.filter((f) => f.category === "carb" || (f.carb_g_per_g >= 0.15 && f.protein_g_per_g < 0.15));
  const fatPool = allowed.filter((f) => f.category === "fat" || (f.fat_g_per_g >= 0.30 && f.protein_g_per_g < 0.15));
  const vegPool = allowed.filter((f) => f.category === "vegetable" || f.category === "fruit");
  const veg = vegPool[seed % Math.max(1, vegPool.length)] || null;

  const candidates: MealCandidate[] = [];
  const maxRepeats = spec.nutrition.max_repeats_of_template_per_week;

  for (const p of proteinPool) {
    for (const c of carbPool) {
      const fatChoices = shape.is_snack ? [null] : (fatPool.length ? fatPool : [null]);
      for (const f of fatChoices) {
        const key = tripleKeyFor(p, c, f);
        if ((state.tripleCount.get(key) ?? 0) >= maxRepeats) continue;
        const items = buildItems(p, c, f, veg, shape, targets);
        const score = scoreTriple(p, c, f, shape, spec, isTraining, state, seed);
        candidates.push({ protein: p, carb: c, fat: f, veg, tripleKey: key, score, items });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

function buildItems(
  protein: FoodRow,
  carb: FoodRow,
  fat: FoodRow | null,
  veg: FoodRow | null,
  shape: SlotShape,
  targets: { kcal: number; protein: number; carb: number; fat: number },
): ReadonlyArray<PlanMealItem> {
  const items: PlanMealItem[] = [];
  items.push(makeItem(protein, Math.round((targets.protein / protein.protein_g_per_g) / 5) * 5 || 100));
  items.push(makeItem(carb, Math.round((targets.carb / Math.max(carb.carb_g_per_g, 0.05)) / 5) * 5 || 80));
  if (fat && !shape.is_snack) items.push(makeItem(fat, Math.round(targets.fat / Math.max(fat.fat_g_per_g, 0.1)) || 10));
  if (veg && !shape.is_snack) items.push(makeItem(veg, 100));
  return items;
}

function fillNutritionDay(
  spec: PlanSpec,
  foods: ReadonlyArray<FoodRow>,
  weekday: string,
  isTraining: boolean,
  dayIndex: number,
  baseSeed: number,
  state: NutritionWeekState,
): PlanNutritionDay {
  const dayMacros = isTraining ? spec.nutrition.training_day : spec.nutrition.rest_day;
  const meals: PlanMeal[] = [];

  for (let i = 0; i < dayMacros.slots.length; i++) {
    const shape = dayMacros.slots[i];
    const slotKcal = Math.round(dayMacros.kcal * shape.target_kcal_share);
    const slotProtein = Math.round(dayMacros.protein_g * shape.target_protein_share);
    const slotCarb = Math.round(dayMacros.carbs_g * shape.target_carb_share);
    const slotFat = Math.round(dayMacros.fat_g * shape.target_fat_share);
    const seed = baseSeed + dayIndex * 53 + i * 11;

    const candidates = generateMealCandidates(
      shape, foods, spec,
      { kcal: slotKcal, protein: slotProtein, carb: slotCarb, fat: slotFat },
      isTraining, state, seed,
    );
    const chosen = candidates[0];
    const variants: PlanMealVariant[] = candidates
      .slice(1, 4)
      .map((c) => ({ items: c.items }));

    if (chosen) {
      state.tripleCount.set(chosen.tripleKey, (state.tripleCount.get(chosen.tripleKey) ?? 0) + 1);
      for (const it of chosen.items) {
        state.foodAppearances.set(it.food_id, (state.foodAppearances.get(it.food_id) ?? 0) + 1);
      }
    }

    meals.push({
      slot: shape.slot,
      items: chosen?.items ?? [],
      variants,
      target_kcal: slotKcal,
      target_protein_g: slotProtein,
      target_carb_g: slotCarb,
      target_fat_g: slotFat,
    });
  }

  return {
    weekday,
    is_training_day: isTraining,
    meals,
    totals: meals.reduce(
      (acc, m) => {
        for (const it of m.items) {
          acc.kcal += it.kcal;
          acc.protein_g += it.protein_g;
          acc.carb_g += it.carb_g;
          acc.fat_g += it.fat_g;
        }
        return acc;
      },
      { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0 },
    ),
  };
}

// ---------- top-level entry ----------

export function fillContent(ctx: PlanContext): Plan {
  const spec = ctx.spec;
  const baseSeed = seedHexToNumber(spec.seed) ^ djb2(spec.plan_spec_version.toString());

  // Multi-week workouts
  const workout_weeks: PlanWeek[] = [];
  for (let w = 1; w <= spec.workout.horizon_weeks; w++) {
    workout_weeks.push(fillWorkoutWeek(spec, ctx.exercises, w, baseSeed));
  }

  // Nutrition: 7 days representing the training week. Weekly state tracks
  // triple counts + food appearances so variety enforcement spans the full week.
  const nutritionState = newNutritionWeekState();
  const nutrition_days: PlanNutritionDay[] = [];
  for (let i = 0; i < WEEKDAYS.length; i++) {
    const wd = WEEKDAYS[i];
    const isTraining = spec.workout.calendar[wd] === "workout";
    nutrition_days.push(fillNutritionDay(spec, ctx.foods, wd, isTraining, i, baseSeed, nutritionState));
  }

  return {
    spec_seed: spec.seed,
    horizon_weeks: spec.workout.horizon_weeks,
    workout_weeks,
    workout_days: workout_weeks[0]?.workout_days ?? [],
    nutrition_days,
  };
}
