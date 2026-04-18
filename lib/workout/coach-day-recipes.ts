import type { PatternSlot } from './exerciseClassification.ts';
import type { CoachExerciseStatus } from './coach-exercise-catalog.ts';

export type CoachRecipeSlot = {
  slot: PatternSlot;
  priority: 1 | 2 | 3;
  allowedStatuses: CoachExerciseStatus[];
  sets?: number;
  repRange?: [number, number];
  restSeconds?: number;
};

export type CoachDayRecipe = {
  recipeVersion: string;
  recipeId: string;
  goal: string;
  slots: CoachRecipeSlot[];
  fallbackReason: string | null;
};

type ResolveCoachDayRecipeInput = {
  familyKey: string | null | undefined;
  dayKey: string;
  dayName: string;
  focus?: string | null;
  slots?: Array<{
    slot: PatternSlot;
    priority: 1 | 2 | 3;
    sets?: number;
    repRange?: [number, number];
    restSeconds?: number;
  }> | null;
};

export const COACH_DAY_RECIPE_VERSION = 'coach_day_recipes_v1';

const DEFAULT_ALLOWED_STATUSES: CoachExerciseStatus[] = ['approved_default', 'approved_alternate'];
const PROGRESSION_ALLOWED_STATUSES: CoachExerciseStatus[] = ['approved_default', 'approved_alternate', 'approved_progression'];

const GOAL_OVERRIDES: Record<string, string> = {
  'upper_lower_4:upper_a': 'Balanced upper body with staple press and pull anchors',
  'upper_lower_4:lower_a': 'Lower body base with squat and hinge anchors',
  'upper_lower_4:upper_b': 'Upper hypertrophy with posture-support accessories',
  'upper_lower_4:lower_b': 'Lower hypertrophy with stable unilateral and posterior-chain support',
  'upper_lower_5:ul5_upper_b': 'Upper hypertrophy and posture support built around staple push-pull work',
};

const EXPLICIT_SLOT_OVERRIDES: Record<string, PatternSlot[]> = {
  'upper_lower_4:upper_a': ['horizontal_push', 'vertical_pull', 'horizontal_pull', 'vertical_push', 'tricep_ext', 'bicep_curl'],
};

const PROGRESSION_RECIPES = new Set([
  'phul_4:upper_power',
  'phul_4:lower_power',
  'phat_5:phat_upper_power',
  'phat_5:phat_lower_power',
  'powerbuilding_5:upper_power',
  'powerbuilding_5:lower_power',
]);

function buildRecipeSlots(recipeId: string, slots: Array<{
  slot: PatternSlot;
  priority: 1 | 2 | 3;
  sets?: number;
  repRange?: [number, number];
  restSeconds?: number;
}>): CoachRecipeSlot[] {
  const allowProgression = PROGRESSION_RECIPES.has(recipeId);
  return slots.map((slot) => ({
    ...slot,
    allowedStatuses:
      allowProgression && ['horizontal_push', 'vertical_pull', 'compound_squat', 'compound_hinge'].includes(slot.slot)
        ? PROGRESSION_ALLOWED_STATUSES
        : DEFAULT_ALLOWED_STATUSES,
  }));
}

function fallbackGoal(dayName: string, focus?: string | null) {
  const descriptor = `${dayName} ${focus || ''}`.toLowerCase();
  if (descriptor.includes('chest')) {
    return 'Conservative chest-focused session with staple press work and simple accessories';
  }
  if (descriptor.includes('back')) {
    return 'Conservative back-focused session with staple row and pulldown structure';
  }
  if (descriptor.includes('shoulder')) {
    return 'Conservative shoulder-focused session with staple pressing and delt accessories';
  }
  if (descriptor.includes('arm')) {
    return 'Conservative arms-focused session with standard curls, pushdowns, and light shoulder support';
  }
  if (descriptor.includes('upper') || descriptor.includes('push') || descriptor.includes('pull')) {
    return 'Conservative upper body session with staple press and pull structure';
  }
  if (descriptor.includes('lower') || descriptor.includes('legs')) {
    return 'Conservative lower body session with staple squat, hinge, and leg accessory structure';
  }
  return 'Conservative full-body session built around staple movement patterns';
}

function fallbackSlotsFor(input: ResolveCoachDayRecipeInput): PatternSlot[] {
  const descriptor = `${input.dayName} ${input.focus || ''}`.toLowerCase();
  if (descriptor.includes('chest')) return ['horizontal_push', 'horizontal_push', 'chest_fly', 'shoulder_raise', 'tricep_ext'];
  if (descriptor.includes('back')) return ['vertical_pull', 'horizontal_pull', 'horizontal_pull', 'rear_delt', 'bicep_curl'];
  if (descriptor.includes('shoulder')) return ['vertical_push', 'shoulder_raise', 'rear_delt', 'tricep_ext'];
  if (descriptor.includes('arm')) return ['bicep_curl', 'tricep_ext', 'bicep_curl', 'tricep_ext', 'rear_delt'];
  if (descriptor.includes('push')) return ['horizontal_push', 'vertical_push', 'chest_fly', 'shoulder_raise', 'tricep_ext'];
  if (descriptor.includes('pull')) return ['vertical_pull', 'horizontal_pull', 'rear_delt', 'bicep_curl', 'core'];
  if (descriptor.includes('lower') || descriptor.includes('legs')) return ['compound_squat', 'compound_hinge', 'single_leg', 'leg_curl', 'calf'];
  if (descriptor.includes('upper')) return ['horizontal_push', 'vertical_pull', 'horizontal_pull', 'vertical_push', 'rear_delt', 'bicep_curl'];
  return ['compound_squat', 'horizontal_push', 'vertical_pull', 'single_leg'];
}

export function resolveCoachDayRecipe(input: ResolveCoachDayRecipeInput): CoachDayRecipe {
  const familyKey = String(input.familyKey || '').trim() || 'fallback';
  const recipeId = `${familyKey}:${input.dayKey}`;
  const explicitGoal = GOAL_OVERRIDES[recipeId];

  const explicitSlots = EXPLICIT_SLOT_OVERRIDES[recipeId]?.map((slot, index) => ({
    slot,
    priority: index < 2 ? 1 : index < 4 ? 2 : 3,
  })) as Array<{ slot: PatternSlot; priority: 1 | 2 | 3 }> | undefined;

  if (explicitSlots?.length) {
    return {
      recipeVersion: COACH_DAY_RECIPE_VERSION,
      recipeId,
      goal: explicitGoal || fallbackGoal(input.dayName, input.focus),
      slots: buildRecipeSlots(recipeId, explicitSlots),
      fallbackReason: null,
    };
  }

  if (input.slots?.length) {
    return {
      recipeVersion: COACH_DAY_RECIPE_VERSION,
      recipeId,
      goal: explicitGoal || fallbackGoal(input.dayName, input.focus),
      slots: buildRecipeSlots(recipeId, input.slots),
      fallbackReason: null,
    };
  }

  const fallbackSlots = fallbackSlotsFor(input).map((slot, index) => ({
    slot,
    priority: index < 2 ? 1 : index < 4 ? 2 : 3,
  })) as Array<{ slot: PatternSlot; priority: 1 | 2 | 3 }>;

  const fallbackId = input.dayName.toLowerCase().includes('upper') || String(input.focus || '').toLowerCase().includes('upper')
    ? 'fallback:upper'
    : input.dayName.toLowerCase().includes('chest')
      ? 'fallback:chest'
      : input.dayName.toLowerCase().includes('back')
        ? 'fallback:back'
        : input.dayName.toLowerCase().includes('shoulder')
          ? 'fallback:shoulders'
          : input.dayName.toLowerCase().includes('arm')
            ? 'fallback:arms'
    : input.dayName.toLowerCase().includes('lower') || String(input.focus || '').toLowerCase().includes('legs')
      ? 'fallback:lower'
      : 'fallback:general';

  return {
    recipeVersion: COACH_DAY_RECIPE_VERSION,
    recipeId: fallbackId,
    goal: explicitGoal || fallbackGoal(input.dayName, input.focus),
    slots: buildRecipeSlots(fallbackId, fallbackSlots),
    fallbackReason: `No authored recipe found for ${recipeId}; using conservative fallback recipe.`,
  };
}
