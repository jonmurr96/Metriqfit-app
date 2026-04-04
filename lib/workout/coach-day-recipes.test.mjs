import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COACH_DAY_RECIPE_VERSION,
  resolveCoachDayRecipe,
} from './coach-day-recipes.ts';

test('coach day recipe resolves authored upper/lower day recipes', () => {
  const recipe = resolveCoachDayRecipe({
    familyKey: 'upper_lower_4',
    dayKey: 'upper_a',
    dayName: 'Upper A',
    focus: 'Push and pull balance',
  });

  assert.equal(recipe.recipeVersion, COACH_DAY_RECIPE_VERSION);
  assert.equal(recipe.recipeId, 'upper_lower_4:upper_a');
  assert.equal(recipe.goal, 'Balanced upper body with staple press and pull anchors');
  assert.deepEqual(
    recipe.slots.map((slot) => slot.slot),
    ['horizontal_push', 'vertical_pull', 'horizontal_pull', 'vertical_push', 'tricep_ext', 'bicep_curl'],
  );
});

test('coach day recipe keeps progression-only statuses off standard hypertrophy accessory days', () => {
  const recipe = resolveCoachDayRecipe({
    familyKey: 'upper_lower_5',
    dayKey: 'ul5_upper_b',
    dayName: 'Upper B',
    focus: 'Hypertrophy + Posture',
  });

  const verticalOrPullSlots = recipe.slots.filter((slot) => ['horizontal_pull', 'horizontal_push', 'rear_delt'].includes(slot.slot));
  for (const slot of verticalOrPullSlots) {
    assert.deepEqual(slot.allowedStatuses, ['approved_default', 'approved_alternate']);
  }
});

test('coach day recipe falls back to a deterministic conservative recipe when a split day is unknown', () => {
  const recipe = resolveCoachDayRecipe({
    familyKey: 'mystery_family',
    dayKey: 'mystery_upper',
    dayName: 'Mystery Upper',
    focus: 'Upper body work',
  });

  assert.equal(recipe.recipeId, 'fallback:upper');
  assert.ok(recipe.slots.length >= 4);
  assert.ok(recipe.fallbackReason);
});
