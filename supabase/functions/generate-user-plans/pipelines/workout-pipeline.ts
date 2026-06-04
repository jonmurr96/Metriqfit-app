// Workout pipeline orchestration extracted from index.ts
// during Phase 0.5 monolith split (zero behavior change).
//
// Function bodies are byte-for-byte preserved; only `function` becomes `export function`.
// Types/constants are re-imported from index.ts (temporary partial cycle is intentional
// and will be resolved in Phase 1).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  selectExercisesForGeneratedSplitDay,
  type GeneratedSplitDayDefinition,
} from "../../../../lib/workout/generated-split-selection.ts";
import type {
  ActivationMode,
  AllowedWorkoutDaysResult,
  CurrentWorkoutPlanContext,
  GenerationMode,
  SelectedTemplate,
  SplitDefinition,
  UserContext,
  WorkoutGenerationConfig,
  WorkoutRegenerationRequest,
} from "../index.ts";
import {
  DAYS,
  MIN_DAY_FOCUS_MATCH_RATIO,
  STRICT_FOCUS_TAGS,
  WORKOUT_PREVIEW_NAME_PREFIX,
  WorkoutGenerationValidationError,
} from "../index.ts";
import {
  buildExercisePools,
  exerciseMatchesFocus,
  filterExercisesForConstraints,
  inferFocusTags,
  isEquipmentCompatible,
  isInjuryCompatible,
  pickReplacementExercise,
  scoreTemplateForContext,
} from "../helpers/workout-selection.ts";
import {
  clamp,
  formatDate,
  formatWeekdayLabel,
  matchesNamePreference,
  normalizeNameTerm,
  normalizeToken,
} from "../helpers/scalars.ts";
import {
  deleteWorkoutPlanTree,
  finalizeStoredWorkoutPlanActivation,
  insertWorkoutPlanDayWithFallback,
  insertWorkoutPlanWithFallback,
  seedWorkoutScheduleFromLayout,
  syncLegacyPlanDayScheduledDates,
  updateWorkoutPlanMetadataWithFallback,
  validateStoredWorkoutPlanCoherence,
} from "../db/workout-writers.ts";

export async function chooseTemplateFromCatalog(
  supabase: SupabaseClient,
  context: UserContext,
  opts: {
    strictDaysMatch: boolean;
    splitOverride?: string | null;
    programFamilyPreference?: string | null;
    trainingStylePreferences?: string[];
    progressionPreference?: string | null;
    strictTemplateSource?: boolean;
    excludeFamilyKey?: string | null;
  },
): Promise<{ template: SelectedTemplate | null; warnings: string[] }> {
  const warnings: string[] = [];
  const targetDays = context.onboarding.training_days_per_week;

  // 🔍 DIAGNOSTIC: Log template selection criteria
  console.log('🔍 Template selection criteria:', {
    targetDays,
    preferredSplit: context.onboarding.preferred_split_family,
    programFamilyPref: opts.programFamilyPreference,
    progression: opts.progressionPreference,
    trainingStyles: opts.trainingStylePreferences,
    strictDaysMatch: opts.strictDaysMatch,
    excludeFamily: opts.excludeFamilyKey,
  });

  let query = supabase
    .from("workout_program_templates_v2")
    .select(
      `
      id,name,description,days_per_week,difficulty,goal_tags,equipment_required,training_style_tags,progression_model,
      family:workout_program_families(external_key,display_name)
    `,
    )
    .eq("is_public", true);

  if (opts.strictDaysMatch) {
    query = query.eq("days_per_week", targetDays);
  }

  const { data: templates, error } = await query;
  if (error) {
    warnings.push(`Template catalog unavailable (${error.message}); using legacy split library.`);
    return { template: null, warnings };
  }

  let candidates = (templates || []) as any[];
  if (opts.excludeFamilyKey) {
    const excluded = normalizeToken(opts.excludeFamilyKey);
    candidates = candidates.filter((item) => normalizeToken(item.family?.external_key || "") !== excluded);
  }
  if (opts.splitOverride) {
    const override = normalizeToken(opts.splitOverride);
    candidates = candidates.filter((item) =>
      normalizeToken(item.name).includes(override)
      || normalizeToken(item.family?.external_key || "") === override
      || normalizeToken(item.id) === override,
    );
  }

  if (!candidates.length) {
    if (opts.strictTemplateSource) {
      warnings.push("No v2 template matched strict template selection constraints.");
    } else {
      warnings.push("No matching v2 template found; falling back to legacy generator.");
    }
    return { template: null, warnings };
  }

  const ranked = candidates
    .map((template) => {
      const scored = scoreTemplateForContext(template, context, opts);
      return { template, score: scored.score, rationale: scored.rationale };
    })
    .sort((a, b) => b.score - a.score);

  const selected = ranked[0];
  if (!selected || selected.score < -80) {
    warnings.push("Template fit score below threshold; falling back to legacy generator.");
    return { template: null, warnings };
  }

  // 🔍 DIAGNOSTIC: Log selected template
  console.log('🔍 Selected template:', {
    templateId: selected.template.id,
    templateName: selected.template.name,
    familyKey: selected.template.family?.external_key,
    daysPerWeek: selected.template.days_per_week,
    progressionModel: selected.template.progression_model,
    score: selected.score,
    rationale: selected.rationale,
    topThree: ranked.slice(0, 3).map(r => ({
      name: r.template.name,
      family: r.template.family?.external_key,
      score: r.score,
    })),
  });

  const { data: fullTemplate, error: fullError } = await supabase
    .from("workout_program_templates_v2")
    .select(
      `
      id,name,description,days_per_week,progression_model,goal_tags,training_style_tags,
      family:workout_program_families(external_key,display_name),
      days:workout_program_days_v2(
        id,sequence_index,day_type,name,focus,estimated_duration_min,
        blocks:workout_program_day_blocks_v2(
          id,order_index,block_type,title,config_json,
          exercises:workout_program_block_exercises_v2(
            id,order_index,exercise_id,sets_target,reps_min,reps_max,rest_seconds,tempo,technique_type,technique_config_json,set_style,rir_target_min,rir_target_max,rpe_target_min,rpe_target_max,pause_seconds,notes,
            exercise:exercises(id,name,category,equipment_required,primary_muscle,pattern,difficulty)
          )
        )
      )
    `,
    )
    .eq("id", selected.template.id)
    .single();

  if (fullError || !fullTemplate) {
    warnings.push(`Failed to load selected template details (${fullError?.message || "unknown"}).`);
    return { template: null, warnings };
  }

  const normalized: SelectedTemplate = {
    id: fullTemplate.id,
    name: fullTemplate.name,
    description: fullTemplate.description,
    days_per_week: fullTemplate.days_per_week,
    progression_model: fullTemplate.progression_model,
    goal_tags: fullTemplate.goal_tags || [],
    training_style_tags: fullTemplate.training_style_tags || [],
    family_key: (fullTemplate.family as any)?.[0]?.external_key || (fullTemplate.family as any)?.external_key || null,
    family_name: (fullTemplate.family as any)?.[0]?.display_name || (fullTemplate.family as any)?.display_name || null,
    score: selected.score,
    rationale: selected.rationale,
    days: (fullTemplate.days || [])
      .sort((a: any, b: any) => a.sequence_index - b.sequence_index)
      .map((day: any) => ({
        id: day.id,
        sequence_index: day.sequence_index,
        day_type: day.day_type,
        name: day.name,
        focus: day.focus,
        estimated_duration_min: day.estimated_duration_min,
        blocks: (day.blocks || [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((block: any) => ({
            id: block.id,
            order_index: block.order_index,
            block_type: block.block_type,
            title: block.title,
            config_json: block.config_json || {},
            exercises: (block.exercises || [])
              .sort((a: any, b: any) => a.order_index - b.order_index)
              .map((exercise: any) => ({
                ...exercise,
                technique_config_json: exercise.technique_config_json || {},
                exercise: exercise.exercise || null,
              })),
          })),
      })),
  };

  return { template: normalized, warnings };
}

export function applyWorkoutRegenerationToContext(
  context: UserContext,
  workoutRegeneration: WorkoutRegenerationRequest | null,
  currentPlanContext: CurrentWorkoutPlanContext | null,
) {
  const nextContext: UserContext = {
    ...context,
    onboarding: {
      ...context.onboarding,
    },
  };

  if (!workoutRegeneration) {
    return nextContext;
  }

  if (workoutRegeneration.days_per_week_override) {
    nextContext.onboarding.training_days_per_week = clamp(
      Number(workoutRegeneration.days_per_week_override),
      2,
      6,
    );
  } else if (workoutRegeneration.reason === "too_hard_to_recover" && currentPlanContext) {
    nextContext.onboarding.training_days_per_week = clamp(
      currentPlanContext.daysPerWeek - 1,
      2,
      6,
    );
  }

  if (workoutRegeneration.preferred_days_off?.length) {
    nextContext.onboarding.preferred_days_off = workoutRegeneration.preferred_days_off;
  }
  if (workoutRegeneration.equipment_access) {
    nextContext.onboarding.equipment_access = workoutRegeneration.equipment_access;
  }
  if (workoutRegeneration.injuries?.length) {
    nextContext.onboarding.injuries = workoutRegeneration.injuries;
  }
  if (workoutRegeneration.preferred_split_family) {
    nextContext.onboarding.preferred_split_family = workoutRegeneration.preferred_split_family;
  } else if (workoutRegeneration.keep_current_split && currentPlanContext?.familyKey) {
    nextContext.onboarding.preferred_split_family = currentPlanContext.familyKey;
  }
  if (workoutRegeneration.progression_preference) {
    nextContext.onboarding.progression_preference = workoutRegeneration.progression_preference;
  }
  if (workoutRegeneration.goal_emphasis) {
    nextContext.onboarding.session_emphasis = workoutRegeneration.goal_emphasis;
  }

  return nextContext;
}

export function buildWorkoutGenerationConfig(input: {
  generationMode: GenerationMode;
  activationMode: ActivationMode;
  workoutRegeneration: WorkoutRegenerationRequest | null;
  currentPlanContext: CurrentWorkoutPlanContext | null;
}) {
  const { generationMode, activationMode, workoutRegeneration, currentPlanContext } = input;
  const reason = workoutRegeneration?.reason || null;
  const avoidExerciseTerms = (workoutRegeneration?.avoid_exercise_names || [])
    .map((term: string) => normalizeNameTerm(term))
    .filter(Boolean);
  const keepExerciseTerms = (workoutRegeneration?.keep_exercise_names || [])
    .map((term: string) => normalizeNameTerm(term))
    .filter(Boolean);

  let excludeFamilyKey: string | null = null;
  if (
    generationMode === "regenerate"
    && !workoutRegeneration?.keep_current_split
    && currentPlanContext?.familyKey
    && (
      reason === "too_repetitive"
      || reason === "want_different_split"
      || reason === "not_seeing_results"
    )
  ) {
    excludeFamilyKey = currentPlanContext.familyKey;
  }

  let sessionDurationTargetMin = workoutRegeneration?.session_duration_target_min ?? null;
  let maxExercisesPerDay: number | null = null;
  if (sessionDurationTargetMin && sessionDurationTargetMin <= 50) {
    maxExercisesPerDay = 4;
  } else if (sessionDurationTargetMin && sessionDurationTargetMin <= 60) {
    maxExercisesPerDay = 5;
  } else if (reason === "too_hard_to_recover") {
    sessionDurationTargetMin = sessionDurationTargetMin ?? 55;
    maxExercisesPerDay = 4;
  }

  return {
    generationMode,
    activationMode,
    currentPlanContext,
    workoutRegeneration,
    sessionDurationTargetMin,
    maxExercisesPerDay,
    avoidExerciseTerms,
    keepExerciseTerms,
    excludeFamilyKey,
    minorRefinement: !!workoutRegeneration?.keep_current_split && !workoutRegeneration?.start_fresh,
  } satisfies WorkoutGenerationConfig;
}

export function getAllowedWorkoutDays(daysPerWeek: number, preferredDaysOff: string[]): AllowedWorkoutDaysResult {
  const rawDaysOff = (preferredDaysOff || [])
    .map((day) => day.toLowerCase())
    .filter((day) => day !== "no_preference" && DAYS.includes(day));

  const uniqueDaysOff = Array.from(new Set(rawDaysOff));
  const maxDaysOffAllowed = Math.max(0, 7 - daysPerWeek);
  const resolvedDaysOff = uniqueDaysOff.slice(0, maxDaysOffAllowed);
  const droppedDaysOff = uniqueDaysOff.slice(maxDaysOffAllowed);

  const blocked = new Set(resolvedDaysOff);
  const candidates = DAYS.filter((day) => !blocked.has(day));

  let allowedDays: string[] = [];
  if (candidates.length <= daysPerWeek) {
    allowedDays = candidates.slice(0, daysPerWeek);
  } else {
    const spread: string[] = [];
    const step = candidates.length / daysPerWeek;
    for (let i = 0; i < daysPerWeek; i += 1) {
      const index = Math.floor(i * step);
      spread.push(candidates[index]);
    }

    allowedDays = Array.from(new Set(spread));
    if (allowedDays.length < daysPerWeek) {
      for (const day of candidates) {
        if (!allowedDays.includes(day)) allowedDays.push(day);
        if (allowedDays.length >= daysPerWeek) break;
      }
    }
    allowedDays = allowedDays.slice(0, daysPerWeek);
  }

  let warning: string | undefined;
  if (droppedDaysOff.length > 0) {
    const keptLabel = resolvedDaysOff.length
      ? resolvedDaysOff.map(formatWeekdayLabel).join(", ")
      : "none";
    const ignoredLabel = droppedDaysOff.map(formatWeekdayLabel).join(", ");
    warning = `Preferred days off conflicted with ${daysPerWeek} training days/week. Kept: ${keptLabel}. Ignored: ${ignoredLabel}.`;
  }

  return {
    allowedDays,
    resolvedDaysOff,
    droppedDaysOff,
    warning,
  };
}

export function buildFocusFallbackPool(
  pool: UserContext["exercises"],
  focusTags: string[],
) {
  if (!focusTags.length) return pool;

  const pooledByTag = buildExercisePools(pool);
  const byId = new Map<string, UserContext["exercises"][number]>();

  for (const tag of focusTags) {
    for (const ex of (pooledByTag[tag] || [])) {
      if (exerciseMatchesFocus(ex, focusTags)) {
        byId.set(ex.id, ex);
      }
    }
  }

  for (const ex of pool) {
    if (exerciseMatchesFocus(ex, focusTags)) {
      byId.set(ex.id, ex);
    }
  }

  return Array.from(byId.values());
}

export async function storeWorkoutPlanFromTemplateV2(
  supabase: SupabaseClient,
  userId: string,
  runId: string,
  context: UserContext,
  template: SelectedTemplate,
  horizonDays: number,
  config: WorkoutGenerationConfig,
  dryRun: boolean = false
) {
  const warnings: string[] = [];
  const { data: maxVersionData } = await supabase
    .from("user_workout_plans")
    .select("version")
    .eq("user_id", userId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (maxVersionData?.version || 0) + 1;

  const workoutPlan = await insertWorkoutPlanWithFallback(supabase, {
    user_id: userId,
    generation_run_id: runId,
    version,
    is_active: false,
    lifecycle_state: config.activationMode === "preview" ? "preview" : "live",
    replaces_plan_id: config.currentPlanContext?.planId || null,
    source_model: "v2_template",
    program_template_v2_id: template.id,
    program_family_key: template.family_key,
    progression_model: template.progression_model,
    training_style_tags: template.training_style_tags || [],
    goal_tags: template.goal_tags || [],
    weekly_layout_json: null,
    name: `${config.activationMode === "preview" ? WORKOUT_PREVIEW_NAME_PREFIX : ""}MetriqFit ${template.name}`,
    description: template.description || "Template-driven plan aligned to onboarding preferences.",
    start_date: formatDate(new Date()),
    total_weeks: Math.max(4, Math.ceil(horizonDays / 7)),
    days_per_week: template.days_per_week,
  });

  const planId = workoutPlan.id;
  const dayRecords: Array<{
    id: string;
    day_number: number;
    name: string;
    focus: string | null;
    day_type: string;
    estimated_duration_min: number | null;
  }> = [];
  const filteredPool = filterExercisesForConstraints(
    context.exercises,
    context.onboarding.equipment_access,
    context.onboarding.injuries,
    config.avoidExerciseTerms,
  );
  const exercisePool = filteredPool.exercises.length ? filteredPool.exercises : context.exercises;
  const exerciseLookup = new Map(exercisePool.map((exercise) => [exercise.id, exercise]));
  warnings.push(...filteredPool.warnings);

  for (const day of template.days) {
    const dayFocusTags = inferFocusTags(day.name, day.focus);
    const strictDayFocusTags = dayFocusTags.filter((tag) => STRICT_FOCUS_TAGS.has(tag));
    const focusFallbackPool = buildFocusFallbackPool(exercisePool, strictDayFocusTags);

    const dayInsert = await insertWorkoutPlanDayWithFallback(supabase, {
      plan_id: planId,
      day_number: day.sequence_index,
      name: day.name,
      focus: day.focus,
      day_type: day.day_type || "workout",
      estimated_duration_min: config.sessionDurationTargetMin
        ? Math.min(day.estimated_duration_min ?? config.sessionDurationTargetMin, config.sessionDurationTargetMin)
        : (day.estimated_duration_min ?? null),
    });

    dayRecords.push({
      ...dayInsert,
      day_number: (dayInsert as any).day_number ?? day.sequence_index,
      name: (dayInsert as any).name ?? day.name,
      focus: (dayInsert as any).focus ?? (day.focus || null),
      day_type: day.day_type || "workout",
      estimated_duration_min: config.sessionDurationTargetMin
        ? Math.min(day.estimated_duration_min ?? config.sessionDurationTargetMin, config.sessionDurationTargetMin)
        : (day.estimated_duration_min ?? null),
    });

    let insertedForDay = 0;
    const usedExerciseIds = new Set<string>();
    const daySelections: Array<{ rowId: string; exerciseId: string; focusMatch: boolean }> = [];
    const blocks = (day.blocks || []).sort((a, b) => a.order_index - b.order_index);

    if (day.day_type === "workout") {
      for (const block of blocks) {
        const { data: blockInsert, error: blockError } = await supabase
          .from("user_workout_plan_blocks")
          .insert({
            plan_day_id: dayInsert.id,
            order_index: block.order_index,
            block_type: block.block_type || "normal",
            title: block.title || null,
            config_json: block.config_json || {},
          })
          .select("id")
          .single();

        if (blockError || !blockInsert) {
          throw new Error(`Failed to create workout block: ${blockError?.message || "unknown"}`);
        }

        const blockExercises = config.maxExercisesPerDay
          ? (block.exercises || []).slice(0, config.maxExercisesPerDay)
          : (block.exercises || []);

        for (const [exerciseIndex, exercise] of blockExercises.entries()) {
          const rawExercise = exercise.exercise as UserContext["exercises"][number] | null;
          let resolvedExerciseId = exercise.exercise_id;
          let replaced = false;
          const focusMismatch = !!rawExercise && dayFocusTags.length > 0 && !exerciseMatchesFocus(rawExercise, dayFocusTags);
          const seed = day.sequence_index * 31 + exerciseIndex;
          const shouldReplace = !rawExercise
            || !isEquipmentCompatible(rawExercise, context.onboarding.equipment_access)
            || !isInjuryCompatible(rawExercise, context.onboarding.injuries)
            || matchesNamePreference(rawExercise?.name, config.avoidExerciseTerms)
            || focusMismatch
            || usedExerciseIds.has(resolvedExerciseId);

          if (shouldReplace) {
            let replacement = pickReplacementExercise(
              rawExercise,
              exercisePool,
              context,
              seed,
              {
                focusTags: strictDayFocusTags.length ? strictDayFocusTags : dayFocusTags,
                avoidIds: Array.from(usedExerciseIds),
                strictFocus: strictDayFocusTags.length > 0,
                avoidTerms: config.avoidExerciseTerms,
                keepTerms: config.keepExerciseTerms,
              },
            );
            if (!replacement && strictDayFocusTags.length > 0) {
              replacement = pickReplacementExercise(
                rawExercise,
                focusFallbackPool,
                context,
                seed + 13,
                {
                  focusTags: strictDayFocusTags,
                  avoidIds: Array.from(usedExerciseIds),
                  strictFocus: true,
                  avoidTerms: config.avoidExerciseTerms,
                  keepTerms: config.keepExerciseTerms,
                },
              );
            }
            if (!replacement && strictDayFocusTags.length > 0) {
              replacement = pickReplacementExercise(
                rawExercise,
                exercisePool,
                context,
                seed + 17,
                {
                  focusTags: strictDayFocusTags,
                  avoidIds: [],
                  strictFocus: true,
                  avoidTerms: config.avoidExerciseTerms,
                  keepTerms: config.keepExerciseTerms,
                },
              );
            }
            if (!replacement && dayFocusTags.length > 0) {
              replacement = pickReplacementExercise(
                rawExercise,
                exercisePool,
                context,
                seed + 29,
                {
                  focusTags: dayFocusTags,
                  avoidIds: Array.from(usedExerciseIds),
                  strictFocus: false,
                  avoidTerms: config.avoidExerciseTerms,
                  keepTerms: config.keepExerciseTerms,
                },
              );
            }
            if (replacement && !usedExerciseIds.has(replacement.id)) {
              resolvedExerciseId = replacement.id;
              replaced = replacement.id !== exercise.exercise_id;
            }
          }

          if (usedExerciseIds.has(resolvedExerciseId)) {
            const uniqueReplacement = pickReplacementExercise(
              rawExercise,
              exercisePool,
              context,
              seed + 97,
              {
                focusTags: strictDayFocusTags.length ? strictDayFocusTags : dayFocusTags,
                avoidIds: Array.from(usedExerciseIds),
                strictFocus: strictDayFocusTags.length > 0,
                avoidTerms: config.avoidExerciseTerms,
                keepTerms: config.keepExerciseTerms,
              },
            );
            if (uniqueReplacement) {
              resolvedExerciseId = uniqueReplacement.id;
              replaced = true;
            } else if (strictDayFocusTags.length > 0) {
              const focusedDuplicate = pickReplacementExercise(
                rawExercise,
                focusFallbackPool,
                context,
                seed + 101,
                {
                  focusTags: strictDayFocusTags,
                  avoidIds: [],
                  strictFocus: true,
                  avoidTerms: config.avoidExerciseTerms,
                  keepTerms: config.keepExerciseTerms,
                },
              );
              if (focusedDuplicate) {
                resolvedExerciseId = focusedDuplicate.id;
                replaced = true;
              }
            }
          }

          const repsMin = clamp(Number(exercise.reps_min || 8), 1, 25);
          const repsMax = clamp(Number(exercise.reps_max || Math.max(10, repsMin)), repsMin, 30);
          const restSeconds = clamp(Number(exercise.rest_seconds || 90), 20, 300);
          const setsTarget = clamp(Number(exercise.sets_target || 3), 1, 8);

          const { data: insertedExercise, error: exerciseError } = await supabase
            .from("user_workout_plan_exercises")
            .insert({
              plan_day_id: dayInsert.id,
              block_id: blockInsert.id,
              exercise_id: resolvedExerciseId,
              order_index: exerciseIndex + 1,
              sets_target: setsTarget,
              reps_min: repsMin,
              reps_max: repsMax,
              rest_seconds: restSeconds,
              tempo: exercise.tempo || null,
              technique_type: exercise.technique_type || null,
              technique_config_json: exercise.technique_config_json || {},
              set_style: exercise.set_style || null,
              rir_target_min: exercise.rir_target_min,
              rir_target_max: exercise.rir_target_max,
              rpe_target_min: exercise.rpe_target_min,
              rpe_target_max: exercise.rpe_target_max,
              pause_seconds: exercise.pause_seconds,
              user_notes: replaced ? `${exercise.notes || ""} (Auto-replaced due to constraints)` : (exercise.notes || null),
              original_exercise_id: exercise.exercise_id,
            })
            .select("id, exercise_id")
            .single();

          if (exerciseError || !insertedExercise) {
            throw new Error(`Failed to insert template exercise: ${exerciseError.message}`);
          }

          usedExerciseIds.add(resolvedExerciseId);
          const selectedExercise = exerciseLookup.get(resolvedExerciseId);
          const focusMatch = strictDayFocusTags.length > 0
            ? !!selectedExercise && exerciseMatchesFocus(selectedExercise, strictDayFocusTags)
            : true;
          daySelections.push({
            rowId: insertedExercise.id,
            exerciseId: resolvedExerciseId,
            focusMatch,
          });

          if (replaced) {
            warnings.push(`Adjusted exercise selection in ${day.name} (${block.title || block.block_type}) for safety/focus alignment.`);
          }
          insertedForDay += 1;
        }
      }

      if (insertedForDay === 0) {
        const fallback = pickReplacementExercise(
          null,
          strictDayFocusTags.length > 0 ? focusFallbackPool : exercisePool,
          context,
          day.sequence_index * 101,
          {
            focusTags: strictDayFocusTags.length ? strictDayFocusTags : dayFocusTags,
            avoidIds: Array.from(usedExerciseIds),
            strictFocus: strictDayFocusTags.length > 0,
            avoidTerms: config.avoidExerciseTerms,
            keepTerms: config.keepExerciseTerms,
          },
        );
        if (fallback) {
          const { data: insertedFallback, error: fallbackError } = await supabase
            .from("user_workout_plan_exercises")
            .insert({
              plan_day_id: dayInsert.id,
              block_id: null,
              exercise_id: fallback.id,
              order_index: 1,
              sets_target: 3,
              reps_min: 8,
              reps_max: 12,
              rest_seconds: 90,
              tempo: null,
              technique_type: null,
              technique_config_json: {},
              set_style: "straight",
              user_notes: "Fallback exercise inserted to avoid empty workout day.",
              original_exercise_id: fallback.id,
            })
            .select("id, exercise_id")
            .single();
          if (fallbackError || !insertedFallback) {
            throw new Error(`Failed to insert fallback exercise: ${fallbackError?.message || "unknown"}`);
          }
          usedExerciseIds.add(fallback.id);
          daySelections.push({
            rowId: insertedFallback.id,
            exerciseId: fallback.id,
            focusMatch: strictDayFocusTags.length > 0
              ? exerciseMatchesFocus(fallback, strictDayFocusTags)
              : true,
          });
          insertedForDay += 1;
          warnings.push(`Inserted fallback exercise for ${day.name} because template block became empty.`);
        } else {
          throw new Error(`Workout day ${day.name} has no valid exercises after constraints.`);
        }
      }

      if (strictDayFocusTags.length > 0 && daySelections.length >= 3) {
        const minimumFocused = Math.ceil(daySelections.length * MIN_DAY_FOCUS_MATCH_RATIO);
        let focusedCount = daySelections.filter((selection) => selection.focusMatch).length;
        let remainingNeeded = Math.max(0, minimumFocused - focusedCount);

        if (remainingNeeded > 0) {
          for (const [index, selection] of daySelections.filter((entry) => !entry.focusMatch).entries()) {
            if (remainingNeeded <= 0) break;

            const currentExercise = exerciseLookup.get(selection.exerciseId) || null;
            const avoidIds = daySelections
              .filter((entry) => entry.rowId !== selection.rowId)
              .map((entry) => entry.exerciseId);

            let replacement = pickReplacementExercise(
              currentExercise,
              focusFallbackPool,
              context,
              day.sequence_index * 211 + index,
              {
                focusTags: strictDayFocusTags,
                avoidIds,
                strictFocus: true,
                avoidTerms: config.avoidExerciseTerms,
                keepTerms: config.keepExerciseTerms,
              },
            );

            if (!replacement) {
              replacement = pickReplacementExercise(
                currentExercise,
                focusFallbackPool,
                context,
                day.sequence_index * 223 + index,
                {
                  focusTags: strictDayFocusTags,
                  avoidIds: [],
                  strictFocus: true,
                  avoidTerms: config.avoidExerciseTerms,
                  keepTerms: config.keepExerciseTerms,
                },
              );
            }

            if (!replacement || !exerciseMatchesFocus(replacement, strictDayFocusTags)) {
              continue;
            }

            const { error: updateError } = await supabase
              .from("user_workout_plan_exercises")
              .update({
                exercise_id: replacement.id,
                user_notes: "Auto-adjusted to maintain day-focus coherence.",
              })
              .eq("id", selection.rowId);

            if (updateError) {
              continue;
            }

            selection.exerciseId = replacement.id;
            selection.focusMatch = true;
            focusedCount += 1;
            remainingNeeded = Math.max(0, minimumFocused - focusedCount);
            warnings.push(`Tuned ${day.name} to maintain >${Math.round(MIN_DAY_FOCUS_MATCH_RATIO * 100)}% day-focus exercise coherence.`);
          }
        }

        if (remainingNeeded > 0) {
          warnings.push(`Limited ${day.name} focus pool under current constraints; full day-focus quota could not be met.`);
        }
      }
    }
  }

  if (!dayRecords.length) {
    throw new Error("Selected template produced no workout days.");
  }

  const weeklyLayout = await seedWorkoutScheduleFromLayout(supabase, {
    planId,
    planDays: dayRecords.map((day) => ({
      id: day.id,
      dayType: day.day_type,
    })),
    daysPerWeek: template.days_per_week,
    preferredDaysOff: context.onboarding.preferred_days_off,
    horizonDays,
  });
  await updateWorkoutPlanMetadataWithFallback(supabase, planId, {
    source_model: "v2_template",
    program_template_v2_id: template.id,
    program_family_key: template.family_key,
    progression_model: template.progression_model,
    training_style_tags: template.training_style_tags || [],
    goal_tags: template.goal_tags || [],
    weekly_layout_json: weeklyLayout,
  });
  await syncLegacyPlanDayScheduledDates(supabase, dayRecords, weeklyLayout);

  const coherenceValidation = await validateStoredWorkoutPlanCoherence(supabase, {
    userId,
    planId,
    exercisePool,
    templateEquipment: Array.from(
      new Set(
        exercisePool.flatMap((exercise) => exercise.equipment_required || []).filter(Boolean),
      ),
    ),
    familyKey: template.family_key,
    goalTags: template.goal_tags || [],
  });
  warnings.push(...coherenceValidation.warnings);

  await finalizeStoredWorkoutPlanActivation(supabase, {
    userId,
    planId,
    activationMode: config.activationMode,
    currentPlanId: config.currentPlanContext?.planId || null,
  });

  const dedupedWarnings = Array.from(new Set(warnings));

  return {
    planId,
    warnings: dedupedWarnings,
    splitName: template.name,
    scheduleCount: horizonDays,
    selection: {
      source: "v2_template_catalog",
      template_id: template.id,
      family_key: template.family_key,
      family_name: template.family_name,
      score: template.score,
      rationale: template.rationale,
      progression_model: template.progression_model,
    },
  };
}

export async function storeWorkoutPlan(
  supabase: SupabaseClient,
  userId: string,
  runId: string,
  context: UserContext,
  split: SplitDefinition,
  horizonDays: number,
  config: WorkoutGenerationConfig,
  dryRun: boolean = false
) {
  const warnings: string[] = [];

  const { data: maxVersionData } = await supabase
    .from("user_workout_plans")
    .select("version")
    .eq("user_id", userId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const version = (maxVersionData?.version || 0) + 1;

  const workoutPlan = await insertWorkoutPlanWithFallback(supabase, {
    user_id: userId,
    generation_run_id: runId,
    version,
    is_active: false,
    lifecycle_state: config.activationMode === "preview" ? "preview" : "live",
    replaces_plan_id: config.currentPlanContext?.planId || null,
    source_model: "generated",
    program_template_v2_id: null,
    program_family_key: split.familyKey || split.key,
    progression_model: context.onboarding.progression_preference || null,
    training_style_tags: context.onboarding.technique_preferences || [],
    goal_tags: context.onboarding.goal_type ? [context.onboarding.goal_type] : [],
    weekly_layout_json: null,
    name: `${config.activationMode === "preview" ? WORKOUT_PREVIEW_NAME_PREFIX : ""}MetriqFit ${split.name}`,
    description: split.description,
    start_date: formatDate(new Date()),
    total_weeks: Math.max(4, Math.ceil(horizonDays / 7)),
    days_per_week: context.onboarding.training_days_per_week,
  });

  const planId = workoutPlan.id;
  const targetDaysPerWeek = context.onboarding.training_days_per_week;
  const exerciseFilterResult = filterExercisesForConstraints(
    context.exercises,
    context.onboarding.equipment_access,
    context.onboarding.injuries,
    config.avoidExerciseTerms,
  );
  warnings.push(...exerciseFilterResult.warnings);

  const exerciseSource = exerciseFilterResult.exercises.length ? exerciseFilterResult.exercises : context.exercises;
  const dayRecords: Array<{
    id: string;
    day_number: number;
    name: string;
    focus: string | null;
    day_type: string;
    estimated_duration_min: number | null;
  }> = [];

  for (const [index, day] of split.days.entries()) {
    const dayInsert = await insertWorkoutPlanDayWithFallback(supabase, {
      plan_id: planId,
      day_number: index + 1,
      name: day.name,
      focus: day.focus,
      day_type: "workout",
      estimated_duration_min: config.sessionDurationTargetMin || 60,
    });

    dayRecords.push({
      ...dayInsert,
      day_number: (dayInsert as any).day_number ?? (index + 1),
      name: (dayInsert as any).name ?? day.name,
      focus: (dayInsert as any).focus ?? (day.focus || null),
      day_type: "workout",
      estimated_duration_min: config.sessionDurationTargetMin || 60,
    });

    const selection = selectExercisesForGeneratedSplitDay({
      day: {
        ...day,
        targetExercises: config.maxExercisesPerDay
          ? Math.min(config.maxExercisesPerDay, Number(day.targetExercises || config.maxExercisesPerDay))
          : day.targetExercises,
        minExercises: config.maxExercisesPerDay
          ? Math.min(config.maxExercisesPerDay, Number(day.minExercises || Math.min(4, config.maxExercisesPerDay)))
          : day.minExercises,
        minPrimaryExercises: config.maxExercisesPerDay
          ? Math.min(config.maxExercisesPerDay, Number(day.minPrimaryExercises || Math.min(3, config.maxExercisesPerDay)))
          : day.minPrimaryExercises,
      } as GeneratedSplitDayDefinition,
      familyKey: split.familyKey || split.key,
      dayIndex: index + 1,
      daysPerWeek: split.frequency,
      exercises: exerciseSource,
      keepTerms: config.keepExerciseTerms,
      avoidTerms: config.avoidExerciseTerms,
    });

    warnings.push(...selection.warnings.map((warning) => `${day.name}: ${warning}`));

    if (selection.exercises.length < selection.minExercises || selection.primaryExerciseCount < selection.minPrimaryExercises) {
      await deleteWorkoutPlanTree(supabase, planId);
      throw new WorkoutGenerationValidationError(
        `Workout day "${day.name}" could not be filled coherently with the current constraints.`,
        warnings,
      );
    }

    const exerciseInsert = selection.exercises.map((exercise, exerciseIndex) => ({
      plan_day_id: dayInsert.id,
      exercise_id: exercise.id,
      order_index: exerciseIndex + 1,
      sets_target: day.sets,
      reps_min: day.repRange[0],
      reps_max: day.repRange[1],
      rest_seconds: day.restSeconds,
      tempo: day.tempo || null,
      user_notes: day.cue || null,
    }));

    const { error: exerciseError } = await supabase
      .from("user_workout_plan_exercises")
      .insert(exerciseInsert);

    if (exerciseError) {
      throw new Error(`Failed to insert plan exercises: ${exerciseError.message}`);
    }
  }

  const daySelection = getAllowedWorkoutDays(targetDaysPerWeek, context.onboarding.preferred_days_off);
  if (daySelection.warning) warnings.push(daySelection.warning);

  const weeklyLayout = await seedWorkoutScheduleFromLayout(supabase, {
    planId,
    planDays: dayRecords.map((day) => ({
      id: day.id,
      dayType: day.day_type,
    })),
    daysPerWeek: targetDaysPerWeek,
    preferredDaysOff: context.onboarding.preferred_days_off,
    horizonDays,
  });
  await updateWorkoutPlanMetadataWithFallback(supabase, planId, {
    source_model: "generated",
    program_template_v2_id: null,
    program_family_key: split.familyKey || split.key,
    progression_model: context.onboarding.progression_preference || null,
    training_style_tags: context.onboarding.technique_preferences || [],
    goal_tags: context.onboarding.goal_type ? [context.onboarding.goal_type] : [],
    weekly_layout_json: weeklyLayout,
  });
  await syncLegacyPlanDayScheduledDates(supabase, dayRecords, weeklyLayout);

  const coherenceValidation = await validateStoredWorkoutPlanCoherence(supabase, {
    userId,
    planId,
    exercisePool: exerciseSource,
    familyKey: split.familyKey || split.key,
    goalTags: context.onboarding.goal_type ? [context.onboarding.goal_type] : [],
  });
  warnings.push(...coherenceValidation.warnings);

  await finalizeStoredWorkoutPlanActivation(supabase, {
    userId,
    planId,
    activationMode: config.activationMode,
    currentPlanId: config.currentPlanContext?.planId || null,
  });

  return {
    planId,
    plan: split.days,
    warnings: Array.from(new Set(warnings)),
    splitName: split.name,
    scheduleCount: horizonDays,
  };
}
