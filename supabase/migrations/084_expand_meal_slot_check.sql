-- Migration 084: Expand meal_slot CHECK constraint to include scientific nutrition slots.
-- Root cause: scientificMealEngine.ts generates training-day slots 'pre-workout',
-- 'post-workout', and rest-day slot 'evening', but the existing constraint
-- only allowed ('breakfast', 'lunch', 'dinner', 'snack').
-- This caused plan generation to fail with:
--   "new row for relation user_nutrition_plan_meals violates check constraint
--    user_nutrition_plan_meals_meal_slot_check"
-- for any user who had preferred_proteins/carbs/fats selected (scientific path).

ALTER TABLE public.user_nutrition_plan_meals
  DROP CONSTRAINT IF EXISTS user_nutrition_plan_meals_meal_slot_check;

ALTER TABLE public.user_nutrition_plan_meals
  ADD CONSTRAINT user_nutrition_plan_meals_meal_slot_check
  CHECK (meal_slot IN (
    'breakfast',
    'lunch',
    'dinner',
    'snack',
    'pre-workout',
    'post-workout',
    'evening'
  ));
