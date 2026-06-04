-- Phase 5 (v3 engine) — extend the planner_mode check constraint on
-- plan_generation_runs to allow 'deterministic_v3', the value the V3
-- pipeline writes to identify its runs.

ALTER TABLE public.plan_generation_runs
  DROP CONSTRAINT IF EXISTS plan_generation_runs_planner_mode_check;

ALTER TABLE public.plan_generation_runs
  ADD CONSTRAINT plan_generation_runs_planner_mode_check
  CHECK (planner_mode = ANY (ARRAY['deterministic'::text, 'ai'::text, 'hybrid'::text, 'deterministic_v3'::text]));
