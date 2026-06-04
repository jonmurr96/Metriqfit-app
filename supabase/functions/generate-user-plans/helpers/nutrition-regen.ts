// Nutrition regeneration context transformer extracted from index.ts
// during Phase 0.5 monolith split (zero behavior change).
//
// Pure function. Types are re-imported from index.ts.

import type {
  NutritionRegenerationRequest,
  UserContext,
} from "../index.ts";

export function applyNutritionRegenerationToContext(
  context: UserContext,
  nutritionRegeneration: NutritionRegenerationRequest | null,
) {
  const nextContext: UserContext = {
    ...context,
    onboarding: {
      ...context.onboarding,
    },
  };

  if (!nutritionRegeneration) {
    return nextContext;
  }

  if (nutritionRegeneration.dietary_preference_override) {
    nextContext.onboarding.dietary_preference = nutritionRegeneration.dietary_preference_override;
  }
  if (nutritionRegeneration.allergies?.length) {
    nextContext.onboarding.allergies_exclusions = nutritionRegeneration.allergies;
  }
  if (nutritionRegeneration.refused_foods?.length) {
    nextContext.onboarding.refused_foods = nutritionRegeneration.refused_foods;
  }
  if (nutritionRegeneration.preferred_proteins?.length) {
    nextContext.onboarding.preferred_proteins = nutritionRegeneration.preferred_proteins;
  }
  if (nutritionRegeneration.preferred_carbs?.length) {
    nextContext.onboarding.preferred_carbs = nutritionRegeneration.preferred_carbs;
  }
  if (nutritionRegeneration.preferred_fats?.length) {
    nextContext.onboarding.preferred_fats = nutritionRegeneration.preferred_fats;
  }

  return nextContext;
}
