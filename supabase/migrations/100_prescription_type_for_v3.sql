-- Phase 1 (v3 engine) — add prescription_type column to
-- user_workout_plan_exercises so plans can prescribe duration/distance work
-- (planks, carries, etc.) without abusing the reps_min/reps_max fields.
--
-- See the V1 generator bug we hit on 2026-05-28 where the plank ended up
-- prescribed as "22-47 reps" because the seeds encoded time-under-tension in
-- the reps columns and the FatLoss tweak shifted them by +2.

ALTER TABLE public.user_workout_plan_exercises
  ADD COLUMN IF NOT EXISTS prescription_type text
    NOT NULL DEFAULT 'reps'
    CHECK (prescription_type IN ('reps', 'time_seconds', 'distance_meters'));

-- Provide explicit min/max for non-rep prescriptions, so the UI can render
-- e.g. "3 × 30–60 s" for plank without re-using reps_min/reps_max.
ALTER TABLE public.user_workout_plan_exercises
  ADD COLUMN IF NOT EXISTS unit_amount_min numeric,
  ADD COLUMN IF NOT EXISTS unit_amount_max numeric;

COMMENT ON COLUMN public.user_workout_plan_exercises.prescription_type IS
  'reps | time_seconds | distance_meters. When != reps, unit_amount_min/max carry the prescription and reps_min/reps_max are ignored.';
