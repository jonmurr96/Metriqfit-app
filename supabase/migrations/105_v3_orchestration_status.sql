-- V3 orchestration prep: make generation runs stage-aware and pollable.
-- This keeps V3 disabled as the live default, but gives the future async
-- worker flow a stable DB contract.

ALTER TABLE public.plan_generation_runs
  ADD COLUMN IF NOT EXISTS orchestration_status text,
  ADD COLUMN IF NOT EXISTS current_stage text,
  ADD COLUMN IF NOT EXISTS stage_history_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS queued_at timestamptz,
  ADD COLUMN IF NOT EXISTS stage_updated_at timestamptz;

UPDATE public.plan_generation_runs
SET orchestration_status = CASE
    WHEN status = 'pending' THEN 'queued'
    WHEN status = 'success' THEN 'success'
    WHEN status = 'validation_failed' THEN 'validation_failed'
    WHEN status = 'failed' THEN 'failed'
    ELSE status
  END,
  current_stage = COALESCE(current_stage, CASE
    WHEN status = 'pending' THEN 'queued'
    WHEN status = 'success' THEN 'complete'
    WHEN status = 'validation_failed' THEN 'validation_failed'
    WHEN status = 'failed' THEN 'failed'
    ELSE status
  END),
  queued_at = COALESCE(queued_at, created_at),
  stage_updated_at = COALESCE(stage_updated_at, completed_at, created_at)
WHERE orchestration_status IS NULL
   OR current_stage IS NULL
   OR queued_at IS NULL
   OR stage_updated_at IS NULL;

ALTER TABLE public.plan_generation_runs
  DROP CONSTRAINT IF EXISTS plan_generation_runs_orchestration_status_check;

ALTER TABLE public.plan_generation_runs
  ADD CONSTRAINT plan_generation_runs_orchestration_status_check
  CHECK (orchestration_status IS NULL OR orchestration_status = ANY (ARRAY[
    'queued'::text,
    'running'::text,
    'success'::text,
    'failed'::text,
    'validation_failed'::text,
    'cancelled'::text
  ]));

CREATE INDEX IF NOT EXISTS idx_plan_generation_runs_orchestration
  ON public.plan_generation_runs(user_id, orchestration_status, created_at DESC);

COMMENT ON COLUMN public.plan_generation_runs.orchestration_status IS
  'Async-ready generation status independent from the legacy status enum.';
COMMENT ON COLUMN public.plan_generation_runs.current_stage IS
  'Current orchestrator stage, e.g. context_load, spec_build, content_fill, validation, persistence.';
COMMENT ON COLUMN public.plan_generation_runs.stage_history_json IS
  'Ordered generation stage events for polling, diagnostics, and support.';
