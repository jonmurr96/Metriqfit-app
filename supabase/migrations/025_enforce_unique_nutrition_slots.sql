-- Prevent duplicate meal slots on the same day for a single nutrition plan.
-- This aligns storage guarantees with onboarding/edit assumptions.

-- 1) Deduplicate existing rows by keeping the oldest row per (plan_id, day_of_week, meal_slot).
WITH ranked_meals AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY plan_id, day_of_week, meal_slot
      ORDER BY created_at ASC, id ASC
    ) AS row_rank
  FROM public.user_nutrition_plan_meals
  WHERE day_of_week IS NOT NULL
)
DELETE FROM public.user_nutrition_plan_meals m
USING ranked_meals r
WHERE m.id = r.id
  AND r.row_rank > 1;

-- 2) Enforce uniqueness at the database layer.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_nutrition_slot_per_day
  ON public.user_nutrition_plan_meals (plan_id, day_of_week, meal_slot)
  WHERE day_of_week IS NOT NULL;
