-- Migration 083: Add 'v1_architect' to user_workout_plans.source_model allowed values.
-- The V1 Architect engine uses source_model = 'v1_architect', but the existing
-- CHECK constraint only allowed: 'generated', 'v2_template', 'custom_builder', 'legacy_template'.
-- This caused insertions from storeV1WorkoutPlan to silently fall back to the stripped payload,
-- resulting in source_model = 'generated' (default) and program_family_key = null.

ALTER TABLE public.user_workout_plans
  DROP CONSTRAINT IF EXISTS user_workout_plans_source_model_check;

ALTER TABLE public.user_workout_plans
  ADD CONSTRAINT user_workout_plans_source_model_check
  CHECK (source_model IN (
    'generated',
    'v2_template',
    'custom_builder',
    'legacy_template',
    'v1_architect'
  ));
