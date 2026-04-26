import test from 'node:test';
import assert from 'node:assert/strict';

import {
  NUTRITION_PREVIEW_NAME_PREFIX,
  isPreviewNutritionPlanRecord,
  normalizePreviewNutritionPlanName,
} from './plan-lifecycle.ts';

test('isPreviewNutritionPlanRecord detects preview lifecycle rows', () => {
  assert.equal(
    isPreviewNutritionPlanRecord({
      lifecycle_state: 'preview',
      name: 'MetriqFit Adaptive Nutrition Plan',
    }),
    true,
  );
});

test('isPreviewNutritionPlanRecord falls back to preview naming for older rows', () => {
  assert.equal(
    isPreviewNutritionPlanRecord({
      name: `${NUTRITION_PREVIEW_NAME_PREFIX}MetriqFit Adaptive Nutrition Plan`,
    }),
    true,
  );
});

test('normalizePreviewNutritionPlanName strips the preview prefix once', () => {
  assert.equal(
    normalizePreviewNutritionPlanName(`${NUTRITION_PREVIEW_NAME_PREFIX}MetriqFit Adaptive Nutrition Plan`),
    'MetriqFit Adaptive Nutrition Plan',
  );
});
