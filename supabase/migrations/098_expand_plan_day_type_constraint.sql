-- 098_expand_plan_day_type_constraint.sql
-- The user_workout_plan_days.day_type check constraint was limited to 5 legacy
-- values ('workout', 'rest', 'conditioning', 'recovery', 'active_recovery').
-- The V1 architect now stores semantic day types (Push, Pull, Legs,
-- UpperHypertrophy, ChestAndTriceps, etc.).  This migration drops the
-- over-restrictive constraint and replaces it with a broader one that includes
-- all DayType enum values used by the engine.

ALTER TABLE user_workout_plan_days
  DROP CONSTRAINT IF EXISTS user_workout_plan_days_day_type_check;

ALTER TABLE user_workout_plan_days
  ADD CONSTRAINT user_workout_plan_days_day_type_check
  CHECK (day_type = ANY (ARRAY[
    -- Legacy / infrastructure types
    'workout', 'rest', 'conditioning', 'recovery', 'active_recovery',
    -- V1 engine semantic types (DayType enum)
    'UpperStrength', 'UpperHypertrophy',
    'LowerStrength', 'LowerHypertrophy',
    'Push', 'Pull', 'Legs',
    'FullBodyStrength', 'FullBodyHypertrophy', 'FullBodyGenFit',
    'Conditioning', 'Recovery',
    -- Bro Split / PPL dedicated muscle-group types
    'ChestAndTriceps', 'BackAndBiceps', 'ShoulderDay', 'ArmsDay'
  ]::text[]));
