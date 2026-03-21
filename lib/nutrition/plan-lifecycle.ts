export type NutritionPlanLifecycleLike = {
  lifecycle_state?: string | null;
  name?: string | null;
};

export const NUTRITION_PREVIEW_NAME_PREFIX = 'Preview · ';

export function isPreviewNutritionPlanRecord(plan: NutritionPlanLifecycleLike | null | undefined) {
  if (!plan) return false;
  if (plan.lifecycle_state === 'preview') return true;
  return typeof plan.name === 'string' && plan.name.startsWith(NUTRITION_PREVIEW_NAME_PREFIX);
}

export function normalizePreviewNutritionPlanName(name: string | null | undefined) {
  const raw = String(name || '');
  return raw.startsWith(NUTRITION_PREVIEW_NAME_PREFIX)
    ? raw.slice(NUTRITION_PREVIEW_NAME_PREFIX.length)
    : raw;
}
