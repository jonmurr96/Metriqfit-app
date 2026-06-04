-- Phase 5 (v3 engine) — extend the source_model check constraint on
-- user_workout_plans to allow 'v3_deterministic', the value the V3 writers
-- use to tag plans produced by the deterministic engine.

ALTER TABLE public.user_workout_plans
  DROP CONSTRAINT IF EXISTS user_workout_plans_source_model_check;

ALTER TABLE public.user_workout_plans
  ADD CONSTRAINT user_workout_plans_source_model_check
  CHECK (source_model = ANY (ARRAY[
    'generated'::text,
    'v2_template'::text,
    'custom_builder'::text,
    'legacy_template'::text,
    'v1_architect'::text,
    'v3_deterministic'::text
  ]));
