import assert from 'node:assert/strict';
import test from 'node:test';

import { buildNutritionPlanDiff } from './plan-regeneration-diff.ts';

function makeVariant(overrides = {}) {
  return {
    id: 'variant-default',
    name: 'Chicken Rice Bowl',
    items: [
      { item_name: 'Chicken Breast', grams: 180, calories: 280, protein: 52, carbs: 0, fat: 6 },
      { item_name: 'Rice', grams: 200, calories: 260, protein: 5, carbs: 56, fat: 1 },
    ],
    ...overrides,
  };
}

function makeMeal(overrides = {}) {
  const selectedVariant = overrides.selected_variant || makeVariant();
  return {
    id: 'meal-1',
    meal_slot: 'lunch',
    name: 'Lunch',
    target_calories: 600,
    target_protein: 45,
    target_carbs: 55,
    target_fat: 18,
    selected_variant: selectedVariant,
    ...overrides,
  };
}

function makeDay(dayOfWeek, overrides = {}) {
  return {
    dayOfWeek,
    meals: [
      makeMeal({
        id: `meal-${dayOfWeek}-1`,
        meal_slot: 'breakfast',
        name: 'Breakfast',
        selected_variant: makeVariant({
          id: `variant-${dayOfWeek}-breakfast`,
          name: 'Greek Yogurt Bowl',
          items: [
            { item_name: 'Greek Yogurt', grams: 250, calories: 170, protein: 28, carbs: 10, fat: 0 },
            { item_name: 'Granola', grams: 60, calories: 250, protein: 6, carbs: 38, fat: 8 },
          ],
        }),
      }),
      makeMeal({
        id: `meal-${dayOfWeek}-2`,
        meal_slot: 'lunch',
        name: 'Lunch',
      }),
      makeMeal({
        id: `meal-${dayOfWeek}-3`,
        meal_slot: 'dinner',
        name: 'Dinner',
        selected_variant: makeVariant({
          id: `variant-${dayOfWeek}-dinner`,
          name: 'Salmon Potato Plate',
          items: [
            { item_name: 'Salmon', grams: 180, calories: 320, protein: 34, carbs: 0, fat: 20 },
            { item_name: 'Potato', grams: 240, calories: 180, protein: 5, carbs: 42, fat: 0 },
          ],
        }),
      }),
    ],
    totals: { calories: 1800, protein: 135, carbs: 160, fat: 52 },
    targets: { calories: 1900, protein: 145, carbs: 165, fat: 55 },
    delta: { calories: -100, protein: -10, carbs: -5, fat: -3 },
    ...overrides,
  };
}

function makePlan(overrides = {}) {
  return {
    id: 'plan-live',
    name: 'Nutrition Plan',
    days: [0, 1, 2].map((day) => makeDay(day)),
    ...overrides,
  };
}

test('identical nutrition plan is treated as a no-op preview', () => {
  const currentPlan = makePlan();
  const previewPlan = makePlan({ id: 'plan-preview' });

  const diff = buildNutritionPlanDiff({ currentPlan, previewPlan });

  assert.equal(diff.changedDayCount, 0);
  assert.equal(diff.changedMealCount, 0);
  assert.equal(diff.changedSlotCount, 0);
  assert.equal(diff.macroDeltaDays.length, 0);
  assert.equal(diff.isMateriallyDifferent, false);
});

test('meal replacements, slot changes, and macro shifts produce a material preview', () => {
  const currentPlan = makePlan();
  const previewPlan = makePlan({
    id: 'plan-preview',
    days: [
      makeDay(0, {
        meals: [
          makeMeal({
            id: 'meal-0-1',
            meal_slot: 'breakfast',
            name: 'Breakfast',
            selected_variant: makeVariant({
              id: 'variant-0-breakfast',
              name: 'Egg White Oats',
              items: [
                { item_name: 'Egg Whites', grams: 220, calories: 110, protein: 23, carbs: 2, fat: 0 },
                { item_name: 'Oats', grams: 80, calories: 300, protein: 10, carbs: 54, fat: 6 },
              ],
            }),
          }),
          makeMeal({
            id: 'meal-0-2',
            meal_slot: 'snack',
            name: 'Snack',
            selected_variant: makeVariant({
              id: 'variant-0-snack',
              name: 'Protein Shake',
              items: [
                { item_name: 'Whey', grams: 40, calories: 160, protein: 30, carbs: 4, fat: 2 },
              ],
            }),
          }),
          makeMeal({
            id: 'meal-0-3',
            meal_slot: 'dinner',
            name: 'Dinner',
            selected_variant: makeVariant({
              id: 'variant-0-dinner',
              name: 'Steak Sweet Potato Plate',
              items: [
                { item_name: 'Sirloin Steak', grams: 190, calories: 360, protein: 42, carbs: 0, fat: 18 },
                { item_name: 'Sweet Potato', grams: 260, calories: 220, protein: 4, carbs: 52, fat: 0 },
              ],
            }),
          }),
        ],
        totals: { calories: 1950, protein: 150, carbs: 145, fat: 48 },
        delta: { calories: 50, protein: 5, carbs: -20, fat: -7 },
      }),
      makeDay(1),
      makeDay(2),
    ],
  });

  const diff = buildNutritionPlanDiff({ currentPlan, previewPlan });

  assert.equal(diff.changedDayCount, 1);
  assert.ok(diff.changedMealCount >= 2);
  assert.ok(diff.changedSlotCount >= 1);
  assert.equal(diff.isMateriallyDifferent, true);
  assert.ok(diff.replacedMealNames.some((entry) => entry.currentMealName === 'Lunch'));
  assert.ok(diff.changeSummary.some((entry) => /meal slots/i.test(entry)));
  assert.ok(diff.changeSummary.some((entry) => /macro/i.test(entry)));
});

test('ingredient level changes are recorded when the meal name is stable', () => {
  const currentPlan = makePlan();
  const previewPlan = makePlan({
    id: 'plan-preview',
    days: [
      makeDay(0, {
        meals: [
          makeMeal({
            id: 'meal-0-1',
            meal_slot: 'breakfast',
            name: 'Breakfast',
            selected_variant: makeVariant({
              id: 'variant-0-breakfast',
              name: 'Greek Yogurt Bowl',
              items: [
                { item_name: 'Greek Yogurt', grams: 250, calories: 170, protein: 28, carbs: 10, fat: 0 },
                { item_name: 'Blueberries', grams: 110, calories: 62, protein: 1, carbs: 15, fat: 0 },
              ],
            }),
          }),
          makeMeal({
            id: 'meal-0-2',
            meal_slot: 'lunch',
            name: 'Lunch',
          }),
          makeMeal({
            id: 'meal-0-3',
            meal_slot: 'dinner',
            name: 'Dinner',
            selected_variant: makeVariant({
              id: 'variant-0-dinner',
              name: 'Salmon Potato Plate',
              items: [
                { item_name: 'Salmon', grams: 180, calories: 320, protein: 34, carbs: 0, fat: 20 },
                { item_name: 'Potato', grams: 240, calories: 180, protein: 5, carbs: 42, fat: 0 },
              ],
            }),
          }),
        ],
      }),
      makeDay(1),
      makeDay(2),
    ],
  });

  const diff = buildNutritionPlanDiff({ currentPlan, previewPlan });

  assert.equal(diff.changedDayCount, 1);
  assert.ok(diff.ingredientChanges.length >= 1);
  assert.match(diff.ingredientChanges[0].summary, /granola|blueberries/i);
  assert.equal(diff.isMateriallyDifferent, true);
});
