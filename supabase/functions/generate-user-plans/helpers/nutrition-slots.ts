// Nutrition slot helpers, extracted from index.ts during Phase 0.5 monolith split
// (zero behavior change). Pure / I/O-free. The single non-pure helper is
// `resolveNutritionMealSlots`, which reads computed UserContext + regeneration
// hints — still no DB, no global state.
//
// Constants `SLOT_ORDER` and `SLOT_RATIO` are the canonical reference for the
// legacy nutrition path; the scientific path overrides them.

import type {
  CurrentNutritionPlanContext,
  NutritionMealSlot,
  NutritionRegenerationRequest,
  UserContext,
} from "../index.ts";
import { clamp } from "./scalars.ts";
import {
  recommendMealFrequency,
  resolveMealFrequencyChoice,
} from "../../../../lib/nutrition/meal-frequency.ts";

export const SLOT_ORDER: NutritionMealSlot[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

export const SLOT_RATIO: Record<string, number> = {
  breakfast: 0.25,
  lunch: 0.3,
  dinner: 0.3,
  snack: 0.15,
};

export function normalizeNutritionSlots(
  slots: NutritionMealSlot[] | null | undefined,
) {
  const unique = Array.from(new Set((slots || []).filter(Boolean)));
  const ordered = SLOT_ORDER.filter((slot) => unique.includes(slot));
  return ordered.length ? ordered : [...SLOT_ORDER];
}

export function buildNutritionSlotRatio(
  slots: NutritionMealSlot[],
) {
  const normalizedSlots = normalizeNutritionSlots(slots);
  const total = normalizedSlots.reduce((sum, slot) => sum + (SLOT_RATIO[slot] || 0), 0) || 1;
  return normalizedSlots.reduce<Record<string, number>>((acc, slot) => {
    acc[slot] = (SLOT_RATIO[slot] || 0) / total;
    return acc;
  }, {});
}

export function resolveNutritionMealSlots(
  context: UserContext,
  nutritionRegeneration: NutritionRegenerationRequest | null,
  currentPlanContext: CurrentNutritionPlanContext | null,
) {
  if (nutritionRegeneration?.keep_meal_slots && !nutritionRegeneration.start_fresh && currentPlanContext?.mealSlots?.length) {
    return currentPlanContext.mealSlots;
  }

  const mealsPerDayOverride = Number(nutritionRegeneration?.meals_per_day_override || 0);
  if (Number.isFinite(mealsPerDayOverride) && mealsPerDayOverride > 0) {
    return normalizeNutritionSlots(SLOT_ORDER.slice(0, clamp(mealsPerDayOverride, 1, SLOT_ORDER.length)));
  }

  const mealFrequencyRecommendation = recommendMealFrequency({
    goalType: context.onboarding.goal_type,
    calories: context.targets.calories,
    proteinGrams: context.targets.protein_g,
  });

  const resolvedMealsPerDay = resolveMealFrequencyChoice(context.onboarding.meals_per_day, mealFrequencyRecommendation);
  const mealCount = clamp(
    resolvedMealsPerDay === '5_plus' ? 5 : Number(resolvedMealsPerDay),
    1,
    SLOT_ORDER.length,
  );

  return normalizeNutritionSlots(SLOT_ORDER.slice(0, mealCount));
}
