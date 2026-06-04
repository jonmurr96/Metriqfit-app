// Workout split / exercise selection helpers extracted from index.ts
// during Phase 0.5 monolith split (zero behavior change).
//
// Pure / I/O-free. Types are re-imported from index.ts where applicable
// (temporary partial cycle is intentional and will be resolved in Phase 1).

import {
  exerciseMatchesWorkoutFocus,
  inferWorkoutFocusTags,
  type WorkoutFocusTag,
} from "../../../../lib/workout/programMappingRules.ts";
import type {
  SplitDefinition,
  UserContext,
  WorkoutDayTemplate,
} from "../index.ts";
import { deterministicPick } from "./food.ts";
import { matchesNamePreference, normalizeToken } from "./scalars.ts";

export const EQUIPMENT_ALLOWLISTS: Record<string, string[] | null> = {
  full_gym: null,
  dumbbells_only: ["dumbbell", "bodyweight", "none"],
  dumbbells_plus_bench: ["dumbbell", "bench", "bodyweight", "none"],
  bodyweight_only: ["bodyweight", "none"],
  other: null,
};

export const INJURY_KEYWORD_BLOCKLIST: Record<string, string[]> = {
  shoulders: ["overhead", "military press", "upright row", "shoulder press"],
  knees: ["squat", "lunge", "leg press", "jump", "plyo"],
  back: ["deadlift", "good morning", "bent-over", "hinge"],
  wrists: ["curl", "extension", "dip", "press"],
  elbows: ["extension", "skull", "triceps", "curl"],
  neck: ["shrug", "neck"],
  hips: ["deep squat", "lunge", "split squat", "hinge"],
  ankles: ["jump", "calf raise", "running", "sprint"],
};

export function adaptSplitToFrequency(split: SplitDefinition, targetDaysPerWeek: number): SplitDefinition {
  if (targetDaysPerWeek <= 0) return split;
  if (split.frequency === targetDaysPerWeek && split.days.length === targetDaysPerWeek) return split;

  const sourceDays = split.days;
  const adaptedDays: WorkoutDayTemplate[] = [];

  if (targetDaysPerWeek <= sourceDays.length) {
    const step = sourceDays.length / targetDaysPerWeek;
    for (let i = 0; i < targetDaysPerWeek; i += 1) {
      const source = sourceDays[Math.floor(i * step)];
      adaptedDays.push({
        ...source,
        key: `${source.key}_d${i + 1}`,
      });
    }
  } else {
    for (let i = 0; i < targetDaysPerWeek; i += 1) {
      const source = sourceDays[i % sourceDays.length];
      const cycle = Math.floor(i / sourceDays.length) + 1;
      adaptedDays.push({
        ...source,
        key: `${source.key}_c${cycle}_d${i + 1}`,
        name: cycle > 1 ? `${source.name} (${cycle})` : source.name,
      });
    }
  }

  return {
    ...split,
    frequency: targetDaysPerWeek,
    name: `${split.name} • ${targetDaysPerWeek} days`,
    description: `${split.description} Adapted to exactly ${targetDaysPerWeek} training days/week.`,
    days: adaptedDays,
  };
}

export function scoreSplitForContext(split: SplitDefinition, context: UserContext, strictDaysMatch: boolean) {
  const onboarding = context.onboarding;
  let score = 0;

  if (split.recommendedFor === onboarding.experience_level) score += 25;
  if (split.frequency === onboarding.training_days_per_week) score += strictDaysMatch ? 60 : 25;
  else score -= strictDaysMatch ? 40 : Math.abs(split.frequency - onboarding.training_days_per_week) * 8;

  if (onboarding.goal_type === "increase_endurance" || onboarding.goal_type === "lose_weight" || onboarding.goal_type === "get_fitter") {
    if (split.frequency >= 4) score += 12;
  }

  if (onboarding.goal_type === "gain_weight" || onboarding.goal_type === "build_muscle" || onboarding.goal_type === "recomp") {
    if (split.days.some((day) => day.tags.includes("legs")) && split.days.some((day) => day.tags.includes("back"))) score += 10;
  }

  if (onboarding.injuries.includes("back")) {
    const lowerHeavy = split.days.filter((day) => day.tags.includes("hamstrings") || day.tags.includes("legs")).length;
    score -= lowerHeavy * 2;
  }

  if (onboarding.injuries.includes("shoulders")) {
    const shoulderDays = split.days.filter((day) => day.tags.includes("shoulders")).length;
    score -= shoulderDays * 2;
  }

  return score;
}

export function chooseSplit(
  context: UserContext,
  splitLibrary: SplitDefinition[],
  splitOverride?: string | null,
  strictDaysMatch = true,
  excludeSplitKey?: string | null,
): SplitDefinition {
  const targetDays = context.onboarding.training_days_per_week;

  if (splitOverride) {
    const normalizedOverride = normalizeToken(splitOverride);
    const match = splitLibrary.find((split) =>
      split.key === splitOverride
      || split.name.toLowerCase() === splitOverride.toLowerCase()
      || normalizeToken(split.familyKey || "") === normalizedOverride
    );
    if (match) return adaptSplitToFrequency(match, targetDays);
  }

  let candidates = splitLibrary.slice();
  if (excludeSplitKey) {
    const normalizedExclude = normalizeToken(excludeSplitKey);
    candidates = candidates.filter((split) =>
      split.key !== excludeSplitKey
      && normalizeToken(split.familyKey || "") !== normalizedExclude
      && normalizeToken(split.key) !== normalizedExclude
    );
  }
  if (strictDaysMatch) {
    const exact = candidates.filter((split) => split.frequency === targetDays);
    if (exact.length) candidates = exact;
  }

  const ranked = candidates
    .map((split) => ({ split, score: scoreSplitForContext(split, context, strictDaysMatch) }))
    .sort((a, b) => b.score - a.score);

  const selected = ranked[0]?.split || splitLibrary[0];
  return adaptSplitToFrequency(selected, targetDays);
}

export function normalizeEquipmentTag(tag: string) {
  return normalizeToken(tag).replaceAll(" ", "_");
}

export function isEquipmentCompatible(
  exercise: UserContext["exercises"][number],
  equipmentAccess: string,
) {
  const allowlist = EQUIPMENT_ALLOWLISTS[equipmentAccess] || null;
  if (!allowlist || !exercise.equipment_required?.length) return true;

  const allowedSet = new Set(allowlist.map((item) => normalizeEquipmentTag(item)));
  const normalizedExerciseEquipment = exercise.equipment_required.map((item) => normalizeEquipmentTag(item));
  return normalizedExerciseEquipment.every((item) => allowedSet.has(item));
}

export function isInjuryCompatible(
  exercise: UserContext["exercises"][number],
  injuries: string[],
) {
  if (!injuries.length || injuries.includes("none")) return true;

  const descriptor = `${exercise.name} ${exercise.pattern || ""} ${exercise.primary_muscle || ""} ${exercise.category}`.toLowerCase();
  for (const injury of injuries) {
    if (!injury || injury === "none" || injury === "other") continue;
    const blockedKeywords = INJURY_KEYWORD_BLOCKLIST[injury] || [];
    if (blockedKeywords.some((keyword) => descriptor.includes(keyword))) {
      return false;
    }
  }
  return true;
}

export function filterExercisesForConstraints(
  exercises: UserContext["exercises"],
  equipmentAccess: string,
  injuries: string[],
  avoidExerciseTerms: string[] = [],
) {
  const equipmentFiltered = exercises.filter((exercise) => isEquipmentCompatible(exercise, equipmentAccess));
  const injuryFiltered = equipmentFiltered.filter((exercise) => isInjuryCompatible(exercise, injuries));
  const preferenceFiltered = avoidExerciseTerms.length
    ? injuryFiltered.filter((exercise) => !matchesNamePreference(exercise.name, avoidExerciseTerms))
    : injuryFiltered;
  const warnings: string[] = [];

  if (!equipmentFiltered.length) {
    warnings.push("No exercises matched equipment constraints; falling back to full catalog.");
    return { exercises, warnings };
  }

  if (!injuryFiltered.length) {
    warnings.push("Injury constraints removed all matched exercises; falling back to equipment-compatible set.");
    return { exercises: equipmentFiltered, warnings };
  }

  if (avoidExerciseTerms.length && !preferenceFiltered.length) {
    warnings.push("Avoided exercise preferences removed the full pool; falling back to injury-compatible matches.");
    return { exercises: injuryFiltered, warnings };
  }

  if (preferenceFiltered.length < 25) {
    warnings.push("Limited exercise pool after equipment/injury filtering; variety may be reduced.");
  }

  return {
    exercises: preferenceFiltered,
    warnings,
  };
}

export function goalTagsForContext(goalType: string) {
  const map: Record<string, string[]> = {
    lose_weight: ["fat_loss", "conditioning", "general_fitness"],
    gain_weight: ["hypertrophy", "muscle_building", "strength"],
    build_muscle: ["hypertrophy", "muscle_building", "strength"],
    maintain_weight: ["general_fitness", "consistency", "balanced"],
    recomp: ["recomp", "hypertrophy", "strength"],
    increase_endurance: ["endurance", "conditioning", "athletic_performance"],
    general_fitness: ["general_fitness", "consistency", "beginner_friendly"],
    get_fitter: ["general_fitness", "consistency", "balanced", "conditioning"],
  };
  return map[goalType] || ["general_fitness"];
}

export function expandEquipmentAccess(equipmentAccess: string) {
  const allowlist = EQUIPMENT_ALLOWLISTS[equipmentAccess] || null;
  if (!allowlist) return null;
  return new Set(allowlist.map((item) => normalizeEquipmentTag(item)));
}

export function isTemplateEquipmentCompatible(templateEquipment: string[] | null | undefined, equipmentAccess: string) {
  const allowed = expandEquipmentAccess(equipmentAccess);
  if (!allowed || !templateEquipment?.length) return true;
  const normalized = templateEquipment.map((item) => normalizeEquipmentTag(item));
  return normalized.every((item) => allowed.has(item));
}

export function scoreTemplateForContext(
  template: any,
  context: UserContext,
  opts: {
    strictDaysMatch: boolean;
    programFamilyPreference?: string | null;
    trainingStylePreferences?: string[];
    progressionPreference?: string | null;
  },
) {
  const rationale: string[] = [];
  let score = 0;

  const daysPerWeek = Number(template.days_per_week || 0);
  if (daysPerWeek === context.onboarding.training_days_per_week) {
    score += 55;
    rationale.push("Exact match on requested training days/week.");
  } else if (opts.strictDaysMatch) {
    score -= 200;
    rationale.push("Penalized due to strict days/week mismatch.");
  } else {
    score -= Math.abs(daysPerWeek - context.onboarding.training_days_per_week) * 12;
  }

  const goalTags = new Set(goalTagsForContext(context.onboarding.goal_type));
  const templateGoalTags: string[] = (template.goal_tags || []).map((tag: string) => normalizeToken(tag).replaceAll(" ", "_"));
  const goalMatches = templateGoalTags.filter((tag) => goalTags.has(tag));
  if (goalMatches.length) {
    score += 28;
    rationale.push(`Goal alignment via tags: ${goalMatches.join(", ")}.`);
  } else {
    score -= 12;
  }

  const difficulty = normalizeToken(template.difficulty || "");
  if (difficulty && difficulty === context.onboarding.experience_level) {
    score += 20;
    rationale.push("Experience level aligned.");
  } else if (difficulty) {
    score -= 6;
  }

  if (isTemplateEquipmentCompatible(template.equipment_required, context.onboarding.equipment_access)) {
    score += 22;
  } else {
    score -= 28;
    rationale.push("Equipment mismatch penalty applied.");
  }

  const requestedFamily = normalizeToken(opts.programFamilyPreference || context.onboarding.preferred_split_family || "");
  const familyKey = normalizeToken(template.family?.external_key || "");
  if (requestedFamily && requestedFamily !== "no_preference") {
    if (requestedFamily === familyKey) {
      score += 30;
      rationale.push("Matched preferred split family.");
    } else {
      // 🔧 FIX: Increase penalty for split mismatch when explicitly requested
      // If user explicitly requested a split family (via opts.programFamilyPreference),
      // apply a much stronger penalty to ensure we respect their preference
      const explicitRequest = !!opts.programFamilyPreference;
      const penalty = explicitRequest ? -50 : -4;
      score += penalty;
      if (explicitRequest) {
        rationale.push(`Strong penalty for split mismatch (requested: ${requestedFamily}, template: ${familyKey}).`);
      }
    }
  }

  const preferredStyles = (opts.trainingStylePreferences || context.onboarding.technique_preferences || [])
    .map((tag) => normalizeToken(tag).replaceAll(" ", "_"))
    .filter(Boolean);
  if (preferredStyles.length) {
    const templateStyles = ((template.training_style_tags || []) as string[])
      .map((tag) => normalizeToken(tag).replaceAll(" ", "_"));
    const overlap = preferredStyles.filter((pref) => templateStyles.includes(pref));
    score += overlap.length * 5;
    if (overlap.length) rationale.push(`Style overlap: ${overlap.join(", ")}.`);
  }

  const requestedProgression = normalizeToken(opts.progressionPreference || context.onboarding.progression_preference || "");
  if (requestedProgression && requestedProgression !== "no_preference") {
    const progressionModel = normalizeToken(template.progression_model || "");
    if (progressionModel.includes(requestedProgression)) {
      score += 10;
      rationale.push("Matched progression preference.");
    } else if (opts.progressionPreference) {
      // 🔧 FIX: Apply penalty when explicitly requested progression doesn't match
      score -= 25;
      rationale.push(`Penalty for progression mismatch (requested: ${requestedProgression}, template: ${progressionModel}).`);
    }
  }

  const emphasis = normalizeToken(context.onboarding.session_emphasis || "");
  if (emphasis && emphasis !== "no_preference") {
    const templateStyles = ((template.training_style_tags || []) as string[]).map((tag) => normalizeToken(tag));
    if (templateStyles.some((tag) => tag.includes(emphasis))) score += 6;
  }

  return { score, rationale };
}

export function buildExercisePools(exercises: UserContext["exercises"]) {
  const byTag: Record<string, UserContext["exercises"]> = {
    chest: [],
    back: [],
    shoulders: [],
    arms: [],
    legs: [],
    glutes: [],
    hamstrings: [],
    core: [],
  };

  for (const ex of exercises) {
    const muscle = (ex.primary_muscle || "").toLowerCase();
    const name = ex.name.toLowerCase();
    const category = ex.category.toLowerCase();

    if (muscle.includes("chest") || category.includes("chest") || name.includes("press")) byTag.chest.push(ex);
    if (muscle.includes("back") || category.includes("back") || name.includes("row") || name.includes("pull")) byTag.back.push(ex);
    if (muscle.includes("shoulder") || category.includes("shoulder") || name.includes("shoulder")) byTag.shoulders.push(ex);
    if (muscle.includes("biceps") || muscle.includes("triceps") || category.includes("arms")) byTag.arms.push(ex);
    if (muscle.includes("quad") || muscle.includes("leg") || category.includes("legs")) byTag.legs.push(ex);
    if (muscle.includes("glute")) byTag.glutes.push(ex);
    if (muscle.includes("hamstring")) byTag.hamstrings.push(ex);
    if (muscle.includes("core") || muscle.includes("ab") || category.includes("core")) byTag.core.push(ex);
  }

  return byTag;
}

export function pickExercisesForDay(
  day: WorkoutDayTemplate,
  exercisePools: ReturnType<typeof buildExercisePools>,
  fallbackExercises: UserContext["exercises"],
  daySeed: number,
  options: {
    maxExercises?: number | null;
    avoidTerms?: string[];
    keepTerms?: string[];
  } = {},
): Array<{
  exercise_id: string;
  order_index: number;
  sets_target: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number;
  tempo: string | null;
  user_notes: string | null;
}> {
  const selected: UserContext["exercises"] = [];
  const maxExercises = Math.max(1, Math.min(7, Number(options.maxExercises || 6)));
  const avoidTerms = options.avoidTerms || [];
  const keepTerms = options.keepTerms || [];
  for (const [idx, tag] of day.tags.entries()) {
    const pool = (exercisePools[tag] || []).filter((exercise) => !matchesNamePreference(exercise.name, avoidTerms));
    const preferredPool = keepTerms.length
      ? pool.filter((exercise) => matchesNamePreference(exercise.name, keepTerms))
      : [];
    const pick = deterministicPick(preferredPool.length ? preferredPool : pool, daySeed + idx * 13);
    if (pick && !selected.some((s) => s.id === pick.id)) selected.push(pick);
  }

  const fallbackPool = fallbackExercises.filter((exercise) => !matchesNamePreference(exercise.name, avoidTerms));

  while (selected.length < maxExercises) {
    const prioritized = keepTerms.length
      ? fallbackPool.filter((exercise) => matchesNamePreference(exercise.name, keepTerms) && !selected.some((item) => item.id === exercise.id))
      : [];
    const fallback = deterministicPick(prioritized.length ? prioritized : fallbackPool, daySeed + selected.length * 7);
    if (!fallback) break;
    if (!selected.some((s) => s.id === fallback.id)) selected.push(fallback);
    if (selected.length >= fallbackPool.length) break;
  }

  return selected.slice(0, maxExercises).map((exercise, index) => ({
    exercise_id: exercise.id,
    order_index: index,
    sets_target: day.sets,
    reps_min: day.repRange[0],
    reps_max: day.repRange[1],
    rest_seconds: day.restSeconds,
    tempo: day.tempo || null,
    user_notes: day.cue || null,
  }));
}

export function exerciseMatchesFocus(exercise: UserContext["exercises"][number], focusTags: string[]) {
  if (!focusTags.length) return true;
  return exerciseMatchesWorkoutFocus(exercise, focusTags as WorkoutFocusTag[]);
}

type ReplacementOptions = {
  focusTags?: string[];
  avoidIds?: string[];
  strictFocus?: boolean;
  avoidTerms?: string[];
  keepTerms?: string[];
};

export function pickReplacementExercise(
  original: UserContext["exercises"][number] | null,
  pool: UserContext["exercises"],
  context: UserContext,
  seed: number,
  options: ReplacementOptions = {},
) {
  if (!pool.length) return null;
  const focusTags = options.focusTags || [];
  const avoidIds = new Set(options.avoidIds || []);
  const avoidTerms = options.avoidTerms || [];
  const keepTerms = options.keepTerms || [];

  const compatiblePool = pool.filter((exercise) =>
    isEquipmentCompatible(exercise, context.onboarding.equipment_access)
    && isInjuryCompatible(exercise, context.onboarding.injuries),
  );
  const source = (compatiblePool.length ? compatiblePool : pool)
    .filter((exercise) => !avoidIds.has(exercise.id))
    .filter((exercise) => !matchesNamePreference(exercise.name, avoidTerms));
  if (!source.length) return null;

  const focusFiltered = focusTags.length
    ? source.filter((exercise) => exerciseMatchesFocus(exercise, focusTags))
    : source;
  const candidatePool = options.strictFocus ? focusFiltered : (focusFiltered.length ? focusFiltered : source);
  if (!candidatePool.length) return null;

  const preferredPool = keepTerms.length
    ? candidatePool.filter((exercise) => matchesNamePreference(exercise.name, keepTerms))
    : [];
  const weightedPool = preferredPool.length ? preferredPool : candidatePool;
  // Sort by popularity before picking to avoid obscure variations
  const sortedWeightedPool = [...weightedPool].sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));

  if (!original) {
    return deterministicPick(sortedWeightedPool.slice(0, 5), seed);
  }

  const pattern = normalizeToken(original.pattern || "");
  if (pattern) {
    const samePattern = sortedWeightedPool.filter((item) => normalizeToken(item.pattern || "") === pattern);
    if (samePattern.length) return deterministicPick(samePattern.slice(0, 3), seed);
  }

  const primaryMuscle = normalizeToken(original.primary_muscle || "");
  const category = normalizeToken(original.category || "");
  const sameMuscle = sortedWeightedPool.filter((item) => normalizeToken(item.primary_muscle || "") === primaryMuscle);
  if (sameMuscle.length) return deterministicPick(sameMuscle.slice(0, 3), seed + 5);

  const sameCategory = sortedWeightedPool.filter((item) => normalizeToken(item.category || "") === category);
  if (sameCategory.length) return deterministicPick(sameCategory.slice(0, 5), seed + 11);

  return deterministicPick(sortedWeightedPool.slice(0, 5), seed + 19);
}

export function inferFocusTags(dayName: string, dayFocus: string | null): WorkoutFocusTag[] {
  return inferWorkoutFocusTags(dayName, dayFocus);
}
