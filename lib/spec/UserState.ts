// UserState v1 — canonical, normalized snapshot of a user that drives plan generation.
//
// Phase 0 scope: deterministic-from-onboarding only. Adherence + measurements will be
// added as UserState v2 in Phase 6 (see plan_engine_v3 design).
//
// Rules enforced here (locked by the v3 plan):
//   1. Alignment: every field that affects generation is present and normalized.
//   2. Determinism: canonicalize(state) -> stable bytes -> stable hash -> stable seed.
//      Two users with identical normalized state get identical seeds and identical plans.
//   3. Privacy: PII (names, user id, contact) is excluded from the canonical form so
//      the seed is purely a function of plan-relevant signals.

export const USER_STATE_VERSION = 1 as const;
export type UserStateVersion = typeof USER_STATE_VERSION;

// -------- Onboarding domain enums --------
// These are exhaustive of what the live onboarding emits today. Anything not in
// the union below is mapped to `unknown` during normalization so the engine never
// branches on an unexpected string.

export type Sex = "male" | "female";
export type GoalType =
  | "lose_weight"
  | "gain_muscle"
  | "maintain"
  | "recomp"
  | "performance";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type ActivityLevel =
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active"
  | "extra_active";
export type EquipmentAccess =
  | "full_gym"
  | "home_gym"
  | "bodyweight_only"
  | "minimal_equipment"
  | "other";
export type DietaryPreference =
  | "anything"
  | "vegetarian"
  | "vegan"
  | "pescatarian"
  | "keto"
  | "paleo"
  | "mediterranean"
  | "other";
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type MealsPerDay = 3 | 4 | 5 | 6;
export type SessionEmphasis =
  | "strength"
  | "hypertrophy"
  | "endurance"
  | "athletic"
  | "general"
  | null;
export type CarbTolerance =
  | "energized_satiated"
  | "carb_sensitive"
  | "high_carb_loving"
  | null;
export type CookingLevel = "minimal" | "basic" | "intermediate" | "advanced" | null;

// Discrete buckets we coerce free-text time fields into so the seed is stable.
export type WakeWindow = "before_5am" | "5_6am" | "6_7am" | "7_8am" | "after_8am";
export type FirstMealDelay = "immediate" | "30min" | "1hr" | "2hr" | "fasted_skip";
export type LastMealBeforeBed = "2hrs" | "3hrs" | "4hrs" | "no_preference";
export type TrainingTimeWindow =
  | "early_morning"
  | "morning"
  | "midday"
  | "afternoon"
  | "evening"
  | "night"
  | "no_training";

// -------- Canonical UserState --------
//
// Fields are alphabetized within each block. The canonicalization step below
// emits keys in *exactly* this order so JSON stringification is reproducible
// across Node, Deno, and any future runtime.

export interface UserState {
  readonly state_version: UserStateVersion;

  // Identity-relevant biometrics (drive science tables)
  readonly age_years: number;                 // computed from dob; integer
  readonly sex: Sex;
  readonly height_cm: number;                 // converted from ft/in; integer cm
  readonly current_weight_kg: number;         // converted from lb; one decimal
  readonly target_weight_kg: number | null;   // null when target_weight_enabled is false
  readonly target_date_iso: string | null;    // YYYY-MM-DD or null

  // Goal + lifestyle
  readonly goal_type: GoalType;
  readonly goal_timeline_weeks: number | null;
  readonly experience_level: ExperienceLevel;
  readonly activity_level: ActivityLevel;
  readonly sleep_hours: number | null;        // for recovery proxy; null until Phase 7
  readonly step_target_daily: number | null;  // avg_steps when step_tracking==true, else null

  // Training schedule
  readonly training_days: ReadonlyArray<Weekday>;       // sorted in weekday order, deduped
  readonly training_days_per_week: number;
  readonly preferred_days_off: ReadonlyArray<Weekday>;  // sorted, deduped
  readonly minutes_per_workout: number;       // integer minutes
  readonly training_time: TrainingTimeWindow;

  // Training preferences
  readonly preferred_split_family: string | null;
  readonly session_emphasis: SessionEmphasis;
  readonly progression_preference: string | null;
  readonly technique_preferences: ReadonlyArray<string>; // sorted, lowercased
  readonly training_style_preferences: ReadonlyArray<string>; // sorted, lowercased

  // Equipment + injuries
  readonly equipment_access: EquipmentAccess;
  readonly equipment_other_text: string | null;
  readonly injuries: ReadonlyArray<string>;   // sorted, lowercased, "none" removed if other entries exist
  readonly injuries_other_text: string | null;

  // Nutrition preferences
  readonly meals_per_day: MealsPerDay;
  readonly traditional_meals: boolean;
  readonly dietary_preference: DietaryPreference;
  readonly dietary_preference_other_text: string | null;
  readonly allergies_exclusions: ReadonlyArray<string>; // sorted, lowercased, "none" removed if others exist
  readonly allergies_other_text: string | null;
  readonly refused_foods: ReadonlyArray<string>;        // sorted, lowercased
  readonly refused_foods_other_text: string | null;
  readonly carb_tolerance: CarbTolerance;
  readonly cooking_level: CookingLevel;
  readonly preferred_proteins: ReadonlyArray<string>;   // sorted, lowercased
  readonly preferred_carbs: ReadonlyArray<string>;      // sorted, lowercased
  readonly preferred_fats: ReadonlyArray<string>;       // sorted, lowercased

  // Meal timing
  readonly wake_time: WakeWindow;
  readonly first_meal_delay: FirstMealDelay;
  readonly last_meal_before_bed: LastMealBeforeBed;

  // Prep / planning toggles (kept for Phase 6+; not used by engine in v1)
  readonly prep_mode_enabled: boolean;
  readonly prep_phase: string | null;
  readonly prep_discipline: string | null;
  readonly prep_auto_adjust_enabled: boolean;
}

// Subset of UserState that actually affects v1 plan content. Used as the source
// material for the seed hash so cosmetic / future-only fields don't perturb the
// seed if their presence in onboarding shifts.
export const PLAN_RELEVANT_KEYS: ReadonlyArray<keyof UserState> = [
  "state_version",
  "age_years",
  "sex",
  "height_cm",
  "current_weight_kg",
  "target_weight_kg",
  "target_date_iso",
  "goal_type",
  "goal_timeline_weeks",
  "experience_level",
  "activity_level",
  "sleep_hours",
  "step_target_daily",
  "training_days",
  "training_days_per_week",
  "preferred_days_off",
  "minutes_per_workout",
  "training_time",
  "preferred_split_family",
  "session_emphasis",
  "progression_preference",
  "technique_preferences",
  "training_style_preferences",
  "equipment_access",
  "injuries",
  "meals_per_day",
  "traditional_meals",
  "dietary_preference",
  "allergies_exclusions",
  "refused_foods",
  "carb_tolerance",
  "cooking_level",
  "preferred_proteins",
  "preferred_carbs",
  "preferred_fats",
  "wake_time",
  "first_meal_delay",
  "last_meal_before_bed",
] as const;

// -------- Normalization helpers --------

const LBS_TO_KG = 0.45359237;
const IN_TO_CM = 2.54;
const WEEKDAY_ORDER: Record<Weekday, number> = {
  mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6,
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function asLowerSortedUnique(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  for (const v of values) {
    if (typeof v !== "string") continue;
    const s = v.trim().toLowerCase();
    if (s) seen.add(s);
  }
  return Array.from(seen).sort();
}

function dropNoneIfOthersPresent(values: string[]): string[] {
  return values.length > 1 ? values.filter((v) => v !== "none") : values;
}

function sortWeekdays(values: unknown): Weekday[] {
  if (!Array.isArray(values)) return [];
  const valid = new Set<Weekday>();
  for (const v of values) {
    if (typeof v !== "string") continue;
    const s = v.trim().toLowerCase() as Weekday;
    if (s in WEEKDAY_ORDER) valid.add(s);
  }
  return Array.from(valid).sort((a, b) => WEEKDAY_ORDER[a] - WEEKDAY_ORDER[b]);
}

function ageFromDob(dob: string | null | undefined, today: Date = new Date()): number {
  if (!dob || typeof dob !== "string") return 0;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return 0;
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const m = today.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < birth.getUTCDate())) age -= 1;
  return clamp(age, 0, 120);
}

function asInt(n: unknown, fallback: number): number {
  const v = typeof n === "string" ? Number(n) : n;
  return Number.isFinite(v) ? Math.round(v as number) : fallback;
}

function asFloat1(n: unknown, fallback: number): number {
  const v = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(v)) return fallback;
  return Math.round((v as number) * 10) / 10;
}

function coerceEnum<T extends string>(value: unknown, options: ReadonlyArray<T>, fallback: T): T {
  if (typeof value !== "string") return fallback;
  const v = value.trim().toLowerCase();
  return (options as ReadonlyArray<string>).includes(v) ? (v as T) : fallback;
}

function coerceOptionalEnum<T extends string>(
  value: unknown,
  options: ReadonlyArray<T>,
): T | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return (options as ReadonlyArray<string>).includes(v) ? (v as T) : null;
}

// -------- Build canonical UserState from raw onboarding JSON --------

export function buildUserState(raw: Record<string, unknown>, now: Date = new Date()): UserState {
  const heightFt = asInt(raw.height_ft, 0);
  const heightIn = asInt(raw.height_in, 0);
  const height_cm = Math.round((heightFt * 12 + heightIn) * IN_TO_CM);

  const current_weight_kg = asFloat1(
    Number(raw.current_weight_lb ?? 0) * LBS_TO_KG,
    0,
  );

  const targetEnabled = raw.target_weight_enabled === true;
  const target_weight_kg = targetEnabled
    ? asFloat1(Number(raw.target_weight_lb ?? 0) * LBS_TO_KG, 0)
    : null;

  const target_date_iso = (() => {
    const v = raw.target_date;
    if (typeof v !== "string") return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  })();

  const injuriesRaw = dropNoneIfOthersPresent(asLowerSortedUnique(raw.injuries));
  const allergiesRaw = dropNoneIfOthersPresent(asLowerSortedUnique(raw.allergies_exclusions));

  return {
    state_version: USER_STATE_VERSION,
    age_years: ageFromDob(typeof raw.dob === "string" ? raw.dob : null, now),
    sex: coerceEnum<Sex>(raw.sex, ["male", "female"], "male"),
    height_cm,
    current_weight_kg,
    target_weight_kg,
    target_date_iso,

    goal_type: coerceEnum<GoalType>(
      raw.goal_type,
      ["lose_weight", "gain_muscle", "maintain", "recomp", "performance"],
      "maintain",
    ),
    goal_timeline_weeks: (() => {
      const v = raw.goal_timeline;
      if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
      if (typeof v === "string") {
        const n = Number(v);
        if (Number.isFinite(n)) return Math.round(n);
      }
      return null;
    })(),
    experience_level: coerceEnum<ExperienceLevel>(
      raw.experience_level,
      ["beginner", "intermediate", "advanced"],
      "beginner",
    ),
    activity_level: coerceEnum<ActivityLevel>(
      raw.activity_level,
      ["sedentary", "lightly_active", "moderately_active", "very_active", "extra_active"],
      "moderately_active",
    ),
    sleep_hours: (() => {
      const v = raw.sleep_hours;
      if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
      return null;
    })(),
    step_target_daily: (() => {
      if (raw.step_tracking !== true) return null;
      const v = raw.avg_steps;
      if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
      return null;
    })(),

    training_days: sortWeekdays(raw.training_days),
    training_days_per_week: clamp(asInt(raw.training_days_per_week, 3), 1, 7),
    preferred_days_off: sortWeekdays(raw.preferred_days_off),
    minutes_per_workout: clamp(asInt(raw.minutes_per_workout, 60), 10, 240),
    training_time: coerceEnum<TrainingTimeWindow>(
      raw.training_time,
      ["early_morning", "morning", "midday", "afternoon", "evening", "night", "no_training"],
      "no_training",
    ),

    preferred_split_family: typeof raw.preferred_split_family === "string"
      ? raw.preferred_split_family.trim().toLowerCase() || null
      : null,
    session_emphasis: coerceOptionalEnum<NonNullable<SessionEmphasis>>(
      raw.session_emphasis,
      ["strength", "hypertrophy", "endurance", "athletic", "general"],
    ),
    progression_preference: typeof raw.progression_preference === "string"
      ? raw.progression_preference.trim().toLowerCase() || null
      : null,
    technique_preferences: asLowerSortedUnique(raw.technique_preferences),
    training_style_preferences: asLowerSortedUnique(
      // Some onboarding versions used `training_style_preferences`, others
      // `training_style_tags`. Accept either.
      raw.training_style_preferences ?? (raw as any).training_style_tags,
    ),

    equipment_access: coerceEnum<EquipmentAccess>(
      raw.equipment_access,
      ["full_gym", "home_gym", "bodyweight_only", "minimal_equipment", "other"],
      "full_gym",
    ),
    equipment_other_text: typeof raw.equipment_other_text === "string"
      ? raw.equipment_other_text.trim() || null
      : null,
    injuries: injuriesRaw,
    injuries_other_text: typeof raw.injuries_other_text === "string"
      ? raw.injuries_other_text.trim() || null
      : null,

    meals_per_day: (() => {
      const v = asInt(raw.meals_per_day, 4);
      return clamp(v, 3, 6) as MealsPerDay;
    })(),
    traditional_meals: raw.traditional_meals === true,
    dietary_preference: coerceEnum<DietaryPreference>(
      raw.dietary_preference,
      ["anything", "vegetarian", "vegan", "pescatarian", "keto", "paleo", "mediterranean", "other"],
      "anything",
    ),
    dietary_preference_other_text: typeof raw.dietary_preference_other_text === "string"
      ? raw.dietary_preference_other_text.trim() || null
      : null,
    allergies_exclusions: allergiesRaw,
    allergies_other_text: typeof raw.allergies_other_text === "string"
      ? raw.allergies_other_text.trim() || null
      : null,
    refused_foods: asLowerSortedUnique(raw.refused_foods),
    refused_foods_other_text: typeof raw.refused_foods_other_text === "string"
      ? raw.refused_foods_other_text.trim() || null
      : null,
    carb_tolerance: coerceOptionalEnum<NonNullable<CarbTolerance>>(
      raw.carb_tolerance,
      ["energized_satiated", "carb_sensitive", "high_carb_loving"],
    ),
    cooking_level: coerceOptionalEnum<NonNullable<CookingLevel>>(
      raw.cooking_level,
      ["minimal", "basic", "intermediate", "advanced"],
    ),
    preferred_proteins: asLowerSortedUnique(raw.preferred_proteins),
    preferred_carbs: asLowerSortedUnique(raw.preferred_carbs),
    preferred_fats: asLowerSortedUnique(raw.preferred_fats),

    wake_time: coerceEnum<WakeWindow>(
      raw.wake_time,
      ["before_5am", "5_6am", "6_7am", "7_8am", "after_8am"],
      "6_7am",
    ),
    first_meal_delay: coerceEnum<FirstMealDelay>(
      raw.first_meal_delay,
      ["immediate", "30min", "1hr", "2hr", "fasted_skip"],
      "immediate",
    ),
    last_meal_before_bed: coerceEnum<LastMealBeforeBed>(
      raw.last_meal_before_bed,
      ["2hrs", "3hrs", "4hrs", "no_preference"],
      "2hrs",
    ),

    prep_mode_enabled: raw.prep_mode_enabled === true,
    prep_phase: typeof raw.prep_phase === "string" ? raw.prep_phase.trim().toLowerCase() || null : null,
    prep_discipline: typeof raw.prep_discipline === "string"
      ? raw.prep_discipline.trim().toLowerCase() || null
      : null,
    prep_auto_adjust_enabled: raw.prep_auto_adjust_enabled === true,
  };
}

// -------- Canonical JSON (stable byte sequence) --------

// JSON.stringify on objects doesn't guarantee key order across runtimes for arbitrary
// objects, so we sort keys ourselves and emit a deterministic encoding.
export function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("non-finite number in canonical JSON");
    return JSON.stringify(value);
  }
  if (typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`);
    return `{${parts.join(",")}}`;
  }
  throw new Error(`unsupported value in canonical JSON: ${typeof value}`);
}

// Plan-relevant projection of UserState — only keys in PLAN_RELEVANT_KEYS.
export function planRelevantProjection(state: UserState): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of PLAN_RELEVANT_KEYS) {
    out[k as string] = (state as unknown as Record<string, unknown>)[k as string] ?? null;
  }
  return out;
}

// -------- Deterministic seed (FNV-1a 64-bit over canonical bytes) --------
//
// We use FNV-1a 64-bit instead of crypto.subtle.digest because Layer 2 needs a
// *number* seed for index arithmetic and we want the helper to be sync + cheap.
// 64 bits is plenty for picking among catalogs of ≤2^32 items.

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;

export function fnv1a64Hex(input: string): string {
  let hash = FNV_OFFSET;
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i) & 0xff);
    hash = BigInt.asUintN(64, hash * FNV_PRIME);
  }
  return hash.toString(16).padStart(16, "0");
}

// The official seed function for the v3 engine. Call this once at the top of
// Layer 1; everything downstream (Layer 2's deterministicPick, variant order,
// rotation tables) takes this seed as input.
export function buildUserStateSeed(state: UserState): string {
  return fnv1a64Hex(canonicalJson(planRelevantProjection(state)));
}

// Convenience for runtime code paths that prefer a numeric seed.
export function seedHexToNumber(seedHex: string): number {
  // Bottom 31 bits for a positive int32-safe value.
  const big = BigInt("0x" + seedHex);
  return Number(BigInt.asUintN(31, big));
}
