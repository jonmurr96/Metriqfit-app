// V3 pipeline — Layer 1 (buildPlanSpec) + Layer 2 (fillContent) wired into
// the Supabase edge function. Loads onboarding + targets from DB, derives the
// PlanSpec deterministically, fills content, and returns the spec+plan as the
// response. DB write integration follows in a later phase; this exposes V3
// to clients for review without disturbing V1/V2 stored plans.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { buildUserState } from "../../../../lib/spec/UserState.ts";
import { buildPlanSpec } from "../../../../lib/spec/buildPlanSpec.ts";
import {
  fillContent,
  type ExerciseRow,
  type FoodRow,
} from "../../../../lib/spec/fillContent.ts";
import {
  validatePlan,
  type ValidationResult,
} from "../../../../lib/spec/validatePlan.ts";
import { writeV3Plans } from "../db/v3-writers.ts";
import { updateGenerationRunStage, updateGenerationRunV3 } from "../db/generation-runs.ts";
import type { LiftCategory, MovementPattern, PrescriptionUnit, MusclePattern } from "../../../../lib/spec/PlanSpec.ts";

export interface V3Result {
  readonly user_id: string;
  readonly spec: ReturnType<typeof buildPlanSpec>;
  readonly plan: ReturnType<typeof fillContent>;
  readonly validation: ValidationResult;
  readonly diagnostics: {
    readonly exercises_loaded: number;
    readonly foods_loaded: number;
    readonly onboarding_loaded: boolean;
    readonly targets_loaded: boolean;
    readonly attempts: number;
    readonly validation_passed: boolean;
    readonly violation_summary: ReadonlyArray<{ check: string; severity: string; count: number }>;
    readonly persistence?: {
      readonly workout_plan_id: string | null;
      readonly nutrition_plan_id: string | null;
      readonly warnings: ReadonlyArray<string>;
    };
  };
}

export interface V3PipelineOptions {
  readonly runId?: string;
  readonly persist?: boolean;
  readonly activate?: boolean;
}

const MAX_VALIDATION_ATTEMPTS = 2;

export async function runV3Pipeline(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
  options: V3PipelineOptions = {},
): Promise<V3Result> {
  const markStage = async (stage: string, details?: Record<string, unknown>) => {
    if (!options.runId) return;
    await updateGenerationRunStage(supabase, options.runId, {
      stage,
      orchestrationStatus: "running",
      details,
    });
  };

  await markStage("context_load");

  // 1) Load onboarding
  const { data: onboardingRow, error: onbErr } = await supabase
    .from("onboarding_answers")
    .select("answers")
    .eq("user_id", userId)
    .maybeSingle();
  if (onbErr) throw new Error(`load onboarding: ${onbErr.message}`);
  if (!onboardingRow?.answers) {
    throw new Error("No onboarding answers found for user — cannot generate V3 plan");
  }

  // 2) Build canonical UserState
  await markStage("user_state_build");
  const state = buildUserState(onboardingRow.answers as Record<string, unknown>, now);

  // 3) Load catalogs
  await markStage("catalog_load");
  const [exercisesData, foodsData] = await Promise.all([
    loadExerciseCatalog(supabase),
    loadFoodCatalog(supabase),
  ]);

  // 4) Layer 1
  await markStage("spec_build", {
    exercises_loaded: exercisesData.length,
    foods_loaded: foodsData.length,
  });
  const spec = buildPlanSpec({ state, now });

  // 5) Layer 2 + Layer 3 with bounded retry on validation failure.
  //
  // Retry strategy: fillContent is deterministic under (spec, catalogs, seed),
  // so a second call with the same inputs produces an identical plan and would
  // not help. The retry exists for future content-stage stochasticity (e.g.
  // catalog refresh between attempts in a longer pipeline) and as an explicit
  // signal in diagnostics that the engine made multiple attempts. For now, a
  // failed validation still returns the latest plan so the consumer can decide
  // (gate the write, write with diagnostics_json, or surface the violations
  // to the client).
  await markStage("content_fill", { attempt: 1 });
  let plan = fillContent({ spec, exercises: exercisesData, foods: foodsData });
  await markStage("validation", { attempt: 1 });
  let validation = validatePlan(plan, spec);
  let attempts = 1;
  while (!validation.passed && attempts < MAX_VALIDATION_ATTEMPTS) {
    await markStage("content_fill", { attempt: attempts + 1 });
    plan = fillContent({ spec, exercises: exercisesData, foods: foodsData });
    await markStage("validation", { attempt: attempts + 1 });
    validation = validatePlan(plan, spec);
    attempts += 1;
  }

  const violationSummary = summarizeViolations(validation);

  // 6) Optional persistence — only when the caller passed a runId.
  let persistence: V3Result["diagnostics"]["persistence"] | undefined;
  if (options.persist && options.runId && validation.passed) {
    await markStage("persistence", { activate: options.activate ?? validation.passed });
    try {
      const writeResult = await writeV3Plans(supabase, userId, options.runId, spec, plan, {
        activate: options.activate ?? validation.passed,
      });
      persistence = {
        workout_plan_id: writeResult.workoutPlanId,
        nutrition_plan_id: writeResult.nutritionPlanId,
        warnings: writeResult.warnings,
      };
    } catch (err) {
      await updateGenerationRunStage(supabase, options.runId, {
        stage: "persistence_failed",
        orchestrationStatus: "failed",
        details: { message: (err as Error).message },
      });
      throw new Error(`V3 persistence failed: ${(err as Error).message}`);
    }
  } else if (options.persist && options.runId && !validation.passed) {
    persistence = {
      workout_plan_id: null,
      nutrition_plan_id: null,
      warnings: ["V3 validation failed; plans were not persisted."],
    };
    await updateGenerationRunStage(supabase, options.runId, {
      stage: "validation_failed",
      orchestrationStatus: "validation_failed",
      details: { violation_summary: violationSummary },
    });

    // Update plan_generation_runs with diagnostics + spec seed regardless of
    // persistence outcome — we always want the audit trail.
  }
  if (options.persist && options.runId) {
    await updateGenerationRunV3(supabase, options.runId, {
      status: validation.passed ? "success" : "validation_failed",
      diagnostics: {
        attempts,
        validation_passed: validation.passed,
        violation_summary: violationSummary,
        violations: validation.violations,
        validator_diagnostics: validation.diagnostics,
        exercises_loaded: exercisesData.length,
        foods_loaded: foodsData.length,
        persistence,
      },
      specSeedHex: spec.seed,
      validationErrors: validation.violations
        .filter((v) => v.severity === "error")
        .map((v) => `${v.check}:${v.field}`),
      warnings: validation.violations
        .filter((v) => v.severity === "warning")
        .map((v) => `${v.check}:${v.field}`),
    });
  }

  return {
    user_id: userId,
    spec,
    plan,
    validation,
    diagnostics: {
      exercises_loaded: exercisesData.length,
      foods_loaded: foodsData.length,
      onboarding_loaded: true,
      targets_loaded: false,
      attempts,
      validation_passed: validation.passed,
      violation_summary: violationSummary,
      persistence,
    },
  };
}

function summarizeViolations(
  v: ValidationResult,
): ReadonlyArray<{ check: string; severity: string; count: number }> {
  const counts = new Map<string, { check: string; severity: string; count: number }>();
  for (const violation of v.violations) {
    const key = `${violation.severity}:${violation.check}`;
    const prev = counts.get(key);
    if (prev) prev.count += 1;
    else counts.set(key, { check: violation.check, severity: violation.severity, count: 1 });
  }
  return [...counts.values()].sort((a, b) =>
    a.severity === b.severity ? a.check.localeCompare(b.check) : a.severity.localeCompare(b.severity),
  );
}

// -------- catalog loaders --------
//
// We map the live DB schema (exercises, food_items) into the typed catalog
// rows fillContent expects. Mapping is heuristic for Phase 1; Phase 2 will
// extend the DB schema with explicit movement_pattern / category columns.

async function loadExerciseCatalog(supabase: SupabaseClient): Promise<ExerciseRow[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, primary_muscle, primary_muscles, muscle_groups, secondary_muscles, equipment, equipment_required, split_tags, is_system_exercise, movement_pattern, is_compound, category")
    .order("id");
  if (error) throw new Error(`load exercises: ${error.message}`);
  return (data || [])
    .filter((r: any) => r.is_system_exercise !== false)
    .map((r: any) => mapExerciseRow(r))
    .filter((r): r is ExerciseRow => r !== null);
}

function mapExerciseRow(r: any): ExerciseRow | null {
  const name: string = String(r.name || "");
  const lower = name.toLowerCase();

  // Exclude non-strength rows: stretches, mobility, warmups, foam rolling,
  // SMR, breathing drills. These pollute the catalog when V3 picks them as
  // "accessory" candidates against an underserved muscle.
  if (isNonStrengthExercise(lower)) return null;

  const splitTags: string[] = Array.isArray(r.split_tags) ? r.split_tags.map(String) : [];
  const equipment = String(r.equipment || r.equipment_required || "bodyweight").toLowerCase();
  const dbMuscleStrings: string[] = [
    String(r.primary_muscle || "").toLowerCase(),
    ...(Array.isArray(r.primary_muscles) ? r.primary_muscles.map((s: unknown) => String(s).toLowerCase()) : []),
    ...(Array.isArray(r.muscle_groups) ? r.muscle_groups.map((s: unknown) => String(s).toLowerCase()) : []),
  ].filter(Boolean);
  const dbSecondaryStrings: string[] = Array.isArray(r.secondary_muscles)
    ? r.secondary_muscles.map((s: unknown) => String(s).toLowerCase())
    : [];
  const dbMuscleRaw = dbMuscleStrings.join(" ");

  const movement = inferMovementPattern(lower, dbMuscleRaw);
  if (!movement) return null;

  const primaryMuscles = inferMuscles(dbMuscleRaw, lower, movement);
  if (primaryMuscles.length === 0) return null;
  const secondaryMuscles = inferSecondaryMuscles(dbSecondaryStrings.join(" "), lower, movement, primaryMuscles);

  const isCompound = r.is_compound === true || r.is_compound === "true";

  return {
    id: String(r.id),
    name,
    movement_pattern: movement,
    primary_muscles: primaryMuscles,
    secondary_muscles: secondaryMuscles,
    equipment_tags: [equipment, ...splitTags],
    category: inferLiftCategory(lower, movement, equipment, isCompound),
    prescription_unit: inferPrescriptionUnit(lower),
    baseline_unit_amount: inferBaselineUnit(lower),
  };
}

// ----- classification helpers -----
//
// Priority order matters: more-specific patterns must be checked before
// less-specific ones. "cable bench row" is a row, not a press, so "row"
// must beat "bench" — but only when the name clearly has "row" in it.
// Similarly, "triceps extension" must beat "extension" generic, and
// "rear delt fly" must beat the generic "fly" → horizontal_press rule.

function isNonStrengthExercise(name: string): boolean {
  // Stretches, mobility drills, yoga poses, and circle/dynamic warmups land
  // in some catalog rows. They have no place in a strength-volume
  // calculation and they confuse downstream UI. We also exclude rare
  // unilateral / unfamiliar variants the engine can't progress on
  // ("kneeling jump squat", "posterior step to overhead reach", etc.).
  return /(\bstretch\b|stretching|\bmobility\b|foam roll|foam roller|\bsmr\b|self.?myofascial|active release|\brelease\b|warm.?up drill|cool.?down|cooldown|breathing drill|activation drill|primer\b|yoga|\bpose\b|\bcircles?\b|ankle (circle|rotation|pump)|wrist (circle|rotation)|hip (circle|rotation)|shoulder (circle|rotation|dislocate)|neck (circle|rotation)|jumping jack|\bjump\b|jumping|plyo|plyometric|reach\b|\bbreath|cat.cow|child.s pose|downward dog|upward dog|cobra|pigeon|seated forward|standing forward|hamstring stretch|quad stretch|hip flexor stretch|cross.?body stretch|chest stretch|tricep stretch|bicep stretch|wall slide|wall angel|scapular wall slide|world.?s greatest|inchworm|cossack|toe touch|leg swing|arm swing|hand walk)/.test(name);
}

function inferMovementPattern(name: string, muscleRaw: string): MovementPattern | null {
  // --- Core ---
  if (/(plank|hollow hold|dead ?bug|ab.?wheel|ab roll|ab roller|stir the pot|bird ?dog)/.test(name)) return "core_anti_extension";
  if (/(pallof|wood.?chop|anti.?rotation|russian twist|side bend|cable chop|landmine twist|landmine rotation)/.test(name)) return "core_anti_rotation";

  // --- Carry ---
  if (/(farmer|farmers|farmer's|suitcase carry|carry|prowler push|sled push|sled drag|yoke walk)/.test(name)) return "carry";

  // --- Rear-delt / face pull / reverse fly → horizontal_pull (rear delt train) ---
  if (/(rear.?delt|rear deltoid|reverse fly|reverse flye|face pull|y.?raise|t.?raise|w.?raise|prone reverse)/.test(name)) return "horizontal_pull";

  // --- Shrugs (traps) → horizontal_pull ---
  if (/\bshrug\b/.test(name)) return "horizontal_pull";

  // --- Lateral / front raises (shoulders) → vertical_press ---
  if (/(lateral raise|side raise|side delt raise|cable lateral|front raise|front delt raise)/.test(name)) return "vertical_press";

  // --- Triceps work → vertical_press (isolation) ---
  if (/(triceps|tricep|skull ?crusher|push.?down|kick.?back|jm press|french press|tate press)/.test(name)) return "vertical_press";

  // --- Curls (biceps) → horizontal_pull (isolation) ---
  if (/\bcurl\b/.test(name) && !/leg curl|hamstring curl/.test(name)) return "horizontal_pull";

  // --- Hamstring/leg curls → hinge isolation ---
  if (/(leg curl|hamstring curl|nordic curl)/.test(name)) return "hinge";

  // --- Glute isolation → hinge ---
  if (/(hip thrust|glute bridge|hip extension|reverse hyper|back extension|hyperextension|45.degree back ext|good morning|kettlebell swing|kb swing|swing)/.test(name)) return "hinge";

  // --- Rows (back) — must come before "bench" to catch "bench row" rows ---
  if (/\brow(s|ing)?\b|face pull/.test(name)) return "horizontal_pull";

  // --- Vertical pulls (back lats) ---
  if (/(pull.?up|chin.?up|pull.?down|lat ?pull|pullover)/.test(name)) return "vertical_pull";

  // --- Vertical presses (shoulders) — must come before "bench" so OHP wins ---
  if (/(overhead press|shoulder press|military press|push press|arnold press|z press|landmine press|pike push.?up)/.test(name)) return "vertical_press";

  // --- Horizontal presses (chest) ---
  // "Floor press" is a chest exercise (incline bench variant), not vertical.
  if (/(bench press|chest press|incline press|decline press|incline (db|barbell|machine) press|floor press|push.?up|fly|flye|pec deck|chest dip|tricep dip(?! row)|\bdips?\b(?! row)|svend press)/.test(name)) return "horizontal_press";

  // --- Hinge (posterior chain) ---
  if (/(dead.?lift|romanian|rdl|stiff.?leg|trap bar deadlift)/.test(name)) return "hinge";

  // --- Squats (quads) ---
  if (/(back squat|front squat|goblet squat|zercher|hack squat|sissy squat|pendulum squat|belt squat|leg press|safety bar squat|\bsquats?\b)/.test(name)) return "squat";

  // --- Lunges ---
  if (/(lunge|split squat|step.?up|bulgarian)/.test(name)) return "lunge";

  // --- Calves → grouped with squat day ---
  if (/(calf raise|calf press|seated calf|standing calf|donkey calf)/.test(name)) return "squat";

  // --- Quads/hams isolation ---
  if (/leg extension/.test(name)) return "squat";

  // --- Glute kickback / abductor ---
  if (/(abduction|adduction|side leg|outer thigh|inner thigh|glute kick|glute kickback|cable kick)/.test(name)) return "hinge";

  // --- Fallback by primary muscle string from DB ---
  if (/(chest|pec|pectoral)/.test(muscleRaw)) return "horizontal_press";
  if (/(lat\b|lats|upper back|trapezius|traps|rhomboid|back\b)/.test(muscleRaw)) return "horizontal_pull";
  if (/(rear delt|posterior delt)/.test(muscleRaw)) return "horizontal_pull";
  if (/(shoulder|deltoid|delt)/.test(muscleRaw)) return "vertical_press";
  if (/(quad|quadriceps)/.test(muscleRaw)) return "squat";
  if (/(hamstring|posterior chain)/.test(muscleRaw)) return "hinge";
  if (/(glute|glutes|gluteal)/.test(muscleRaw)) return "hinge";
  if (/(calf|calves|gastrocnemius|soleus)/.test(muscleRaw)) return "squat";
  if (/(bicep)/.test(muscleRaw)) return "horizontal_pull";
  if (/(tricep)/.test(muscleRaw)) return "vertical_press";
  if (/(abs|abdominal|core|obliques?)/.test(muscleRaw)) return "core_anti_extension";

  return null;
}

function inferMuscles(muscleRaw: string, name: string, movement: MovementPattern): MusclePattern[] {
  const out = new Set<MusclePattern>();

  // --- Direct name-based primaries (highest priority) ---
  // Rear delts only fire via name keywords; DB rarely tags them.
  if (/(rear.?delt|rear deltoid|reverse fly|reverse flye|face pull|y.?raise|t.?raise|w.?raise|prone reverse)/.test(name)) out.add("shoulders_rear");
  if (/(lateral raise|side raise|side delt|cable lateral|front raise)/.test(name)) out.add("shoulders_lateral");
  if (/\bshrug\b/.test(name)) out.add("back_upper");
  if (/(triceps|tricep|skull ?crusher|push.?down|kick.?back|jm press|french press|tate press)/.test(name)) out.add("triceps");
  if (/\bcurl\b/.test(name) && !/leg curl|hamstring curl/.test(name)) out.add("biceps");
  if (/(leg curl|hamstring curl|nordic curl)/.test(name)) out.add("hamstrings");
  if (/(hip thrust|glute bridge|hip extension|glute kick|cable kick|reverse hyper)/.test(name)) out.add("glutes");
  if (/(back extension|hyperextension|good morning)/.test(name)) out.add("hamstrings");
  if (/(calf raise|calf press|seated calf|standing calf|donkey calf)/.test(name)) out.add("calves");
  if (/leg extension/.test(name)) out.add("quads");

  // --- Movement-pattern defaults ---
  if (out.size === 0) {
    switch (movement) {
      case "horizontal_press": out.add("chest"); break;
      case "vertical_press": out.add("shoulders_lateral"); break;
      case "horizontal_pull": out.add("back_upper"); break;
      case "vertical_pull": out.add("back_lats"); break;
      case "squat": out.add("quads"); break;
      case "hinge": out.add("hamstrings"); break;
      case "lunge": out.add("quads"); break;
      case "carry": out.add("core"); break;
      case "core_anti_extension":
      case "core_anti_rotation": out.add("core"); break;
    }
  }

  // --- Layer in DB muscle hints when present (don't overwrite specific name-based tags) ---
  if (/(chest|pec|pectoral)/.test(muscleRaw)) out.add("chest");
  if (/(\blats?\b|latissimus)/.test(muscleRaw)) out.add("back_lats");
  if (/(upper back|trapezius|\btraps\b|rhomboid)/.test(muscleRaw)) out.add("back_upper");
  if (/(rear delt|posterior delt)/.test(muscleRaw)) out.add("shoulders_rear");
  if (/(side delt|lateral delt|medial delt)/.test(muscleRaw)) out.add("shoulders_lateral");
  if (/(front delt|anterior delt)/.test(muscleRaw)) out.add("shoulders_lateral");
  if (/(\bquad\b|quads|quadriceps)/.test(muscleRaw)) out.add("quads");
  if (/(hamstring)/.test(muscleRaw)) out.add("hamstrings");
  if (/(glute|gluteal)/.test(muscleRaw)) out.add("glutes");
  if (/(calf|calves|gastrocnemius|soleus)/.test(muscleRaw)) out.add("calves");
  if (/(bicep)/.test(muscleRaw)) out.add("biceps");
  if (/(tricep)/.test(muscleRaw)) out.add("triceps");
  if (/(abs|abdominal|\bcore\b|obliques?)/.test(muscleRaw)) out.add("core");

  return [...out];
}

function inferSecondaryMuscles(
  dbSecondary: string,
  name: string,
  movement: MovementPattern,
  primary: ReadonlyArray<MusclePattern>,
): MusclePattern[] {
  const primarySet = new Set(primary);
  const out = new Set<MusclePattern>();

  // DB-provided secondaries
  if (/(chest|pec)/.test(dbSecondary)) out.add("chest");
  if (/(lats?\b|latissimus)/.test(dbSecondary)) out.add("back_lats");
  if (/(upper back|traps|trapezius|rhomboid)/.test(dbSecondary)) out.add("back_upper");
  if (/(rear delt|posterior delt)/.test(dbSecondary)) out.add("shoulders_rear");
  if (/(side delt|lateral delt)/.test(dbSecondary)) out.add("shoulders_lateral");
  if (/(front delt|anterior delt|shoulder)/.test(dbSecondary)) out.add("shoulders_lateral");
  if (/(quad|quadriceps)/.test(dbSecondary)) out.add("quads");
  if (/(hamstring)/.test(dbSecondary)) out.add("hamstrings");
  if (/(glute)/.test(dbSecondary)) out.add("glutes");
  if (/(calf|calves)/.test(dbSecondary)) out.add("calves");
  if (/(bicep)/.test(dbSecondary)) out.add("biceps");
  if (/(tricep)/.test(dbSecondary)) out.add("triceps");
  if (/(abs|abdominal|core|obliques?)/.test(dbSecondary)) out.add("core");

  // Movement-pattern-implied secondaries
  if (movement === "horizontal_press") { out.add("triceps"); out.add("shoulders_lateral"); }
  if (movement === "vertical_press" && primarySet.has("shoulders_lateral")) out.add("triceps");
  if (movement === "horizontal_pull" || movement === "vertical_pull") {
    out.add("biceps");
    if (!primarySet.has("back_upper")) out.add("back_upper");
  }
  if (movement === "squat") { out.add("glutes"); out.add("hamstrings"); }
  if (movement === "hinge") { out.add("glutes"); out.add("back_upper"); }
  if (movement === "lunge") { out.add("glutes"); out.add("hamstrings"); out.add("core"); }
  if (movement === "carry") { out.add("back_upper"); }

  // Remove anything already in primaries.
  for (const m of primarySet) out.delete(m);
  return [...out];
}

function inferLiftCategory(name: string, movement: MovementPattern, equipment: string, isCompound: boolean): LiftCategory {
  // Isolation: single-joint movements.
  if (/(curl|leg extension|leg curl|raise|fly|flye|pec deck|push.?down|kick.?back|skull.?crusher|french press|tate press|calf raise|calf press|abduction|adduction|hip thrust|glute bridge|hip extension|back extension|hyperextension|shrug|pallof|wood.?chop|russian twist|side bend)/.test(name)) {
    return "isolation";
  }
  if (movement === "core_anti_extension" || movement === "core_anti_rotation") return "isolation";

  // Primary: heavy barbell compounds.
  if (/barbell/.test(equipment) || /barbell/.test(name)) {
    if (/(bench press|squat|deadlift|romanian|overhead press|shoulder press|military press|press)/.test(name) && !/dumbbell|machine|cable|smith/.test(name)) {
      return "primary";
    }
    if (/(row)/.test(name) && !/dumbbell|machine|cable/.test(name)) return "primary";
    if (/(clean|snatch|push press|jerk)/.test(name)) return "primary";
  }

  // Secondary: compound movements with non-barbell load.
  if (isCompound) return "secondary";
  if (/(dumbbell|machine|cable|smith|trap bar)/.test(equipment) || /(dumbbell|machine|cable|smith|trap bar)/.test(name)) {
    if (/(press|row|squat|deadlift|lunge|leg press|chin|pull)/.test(name)) return "secondary";
  }
  if (/(pull.?up|chin.?up|dip|push.?up)/.test(name)) return "accessory";
  if (movement === "carry") return "secondary";
  if (movement === "lunge") return "secondary";

  return "accessory";
}

function inferPrescriptionUnit(name: string): PrescriptionUnit {
  if (/plank|hollow hold|wall sit|dead ?bug.*hold|side plank/.test(name)) return "time_seconds";
  if (/carry|farmer|sprint|run|walk \d+m|prowler|sled/.test(name)) return "distance_meters";
  return "reps";
}

function inferBaselineUnit(name: string): number | undefined {
  if (/plank|hollow hold|side plank/.test(name)) return 30;
  if (/carry|farmer|prowler|sled/.test(name)) return 20;
  return undefined;
}

async function loadFoodCatalog(supabase: SupabaseClient): Promise<FoodRow[]> {
  const { data, error } = await supabase
    .from("food_items")
    .select(
      "id, name, category, variety_family, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g",
    )
    .order("id")
    .limit(500);
  if (error) throw new Error(`load food_items: ${error.message}`);
  return (data || []).map((r: any) => mapFoodRow(r));
}

function mapFoodRow(r: any): FoodRow {
  const name = String(r.name || "");
  const category = String(r.category || "").toLowerCase();
  const family = String(r.variety_family || "").toLowerCase();
  const tags = synthesizeFoodTags(name, category, family);
  const cal = Number(r.calories_per_100g || 0) / 100;
  const pro = Number(r.protein_per_100g || 0) / 100;
  const carb = Number(r.carbs_per_100g || 0) / 100;
  const fat = Number(r.fat_per_100g || 0) / 100;
  return {
    id: String(r.id),
    name,
    tags,
    kcal_per_g: cal,
    protein_g_per_g: pro,
    carb_g_per_g: carb,
    fat_g_per_g: fat,
    slot_affinity: [],
    category: inferFoodCategory(pro, carb, fat, tags),
  };
}

// food_items has no tags[] column; synthesize the dietary/allergy tags the V3
// engine relies on (meat/dairy/eggs/fish/shellfish/soy/nut/gluten/leafy_green/
// cruciferous etc.) from the food name + category. This is a best-effort
// mapping. It will mis-tag exotic foods but is sufficient for the deterministic
// engine's hard-exclude filters; the validator will surface anything that
// leaks through.
function synthesizeFoodTags(name: string, category: string, family: string): string[] {
  const n = name.toLowerCase();
  const t = new Set<string>();
  if (family) t.add(family);
  if (category) t.add(category);

  // Proteins
  if (/(beef|steak|burger|lamb|pork|bacon|sausage|ham|veal|venison)/.test(n)) { t.add("meat"); }
  if (/(chicken|turkey|duck|poultry)/.test(n)) { t.add("meat"); t.add("poultry"); }
  if (/(fish|salmon|tuna|cod|tilapia|halibut|sardine|anchovy|trout|mackerel)/.test(n)) { t.add("fish"); }
  if (/(shrimp|prawn|crab|lobster|scallop|clam|mussel|oyster|squid|octopus)/.test(n)) { t.add("shellfish"); t.add("fish"); }
  if (/\beggs?\b/.test(n)) t.add("eggs");
  if (/(milk|cheese|yogurt|yoghurt|kefir|cream|butter|cottage|whey|casein)/.test(n)) t.add("dairy");
  if (/(tofu|tempeh|edamame|soy|soybean)/.test(n)) { t.add("soy"); if (n.includes("tofu")) t.add("tofu"); if (n.includes("tempeh")) t.add("tempeh"); }
  if (/(lentil|chickpea|garbanzo|bean|legume|pea\b)/.test(n)) t.add("legume");
  // Nuts & seeds
  if (/(almond|cashew|walnut|pecan|hazelnut|pistachio|macadamia|peanut|brazil nut)/.test(n)) t.add("nut");
  if (/(chia|flax|sesame|sunflower|pumpkin) seed/.test(n)) t.add("seed");
  // Carbs
  if (/(bread|pasta|wheat|barley|rye|cracker|cereal|noodle|tortilla|bagel|muffin)/.test(n)) { t.add("gluten"); t.add("grain"); }
  if (/(rice|quinoa|oat|millet|sorghum|buckwheat|corn|polenta)/.test(n)) t.add("grain");
  if (/(potato|sweet potato|yam|cassava)/.test(n)) t.add("root");
  // Produce
  if (/(broccoli|cauliflower|brussels|cabbage|kale|bok choy|arugula|collard)/.test(n)) { t.add("cruciferous"); t.add("vegetable"); t.add("leafy_green"); }
  if (/(spinach|lettuce|romaine|chard|kale|arugula|collard|microgreen|watercress)/.test(n)) { t.add("leafy_green"); t.add("vegetable"); }
  if (/(carrot|bell pepper|pepper|tomato|cucumber|zucchini|squash|eggplant|onion|garlic|leek|celery|asparagus|beet|radish|mushroom)/.test(n)) t.add("vegetable");
  if (n.includes("mushroom")) t.add("mushrooms");
  if (/(apple|banana|berry|orange|grape|melon|peach|pear|plum|cherry|mango|pineapple|kiwi|fig|date|raisin|watermelon|cantaloupe)/.test(n)) t.add("fruit");
  // Fats
  if (/(oil|ghee|lard|tallow)/.test(n)) t.add("oil");
  if (/avocado/.test(n)) t.add("fat");
  // Sweetener / flavor
  if (/(sugar|syrup|honey|stevia|sweetener)/.test(n)) t.add("sweetener");
  // Category coercions
  if (category === "protein") {
    if (![...t].some((x) => ["meat", "fish", "eggs", "dairy", "soy", "legume"].includes(x))) {
      t.add("protein_other");
    }
  }
  if (category === "fruits") t.add("fruit");
  if (category === "vegetables") t.add("vegetable");
  if (category === "grains") t.add("grain");
  if (category === "nuts") t.add("nut");
  if (category === "dairy") t.add("dairy");
  if (category === "fats") t.add("fat");
  return [...t].sort();
}

function inferFoodCategory(
  pro: number,
  carb: number,
  fat: number,
  tags: ReadonlyArray<string>,
): FoodRow["category"] {
  if (tags.some((t) => /vegetable|veg|leafy/.test(t))) return "vegetable";
  if (tags.some((t) => /fruit|berry/.test(t))) return "fruit";
  if (pro >= 0.15) return "protein";
  if (fat >= 0.30) return "fat";
  if (carb >= 0.15) return "carb";
  return "misc";
}
