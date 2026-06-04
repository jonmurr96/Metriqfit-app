-- Phase 5 (v3 engine) — record validator output and engine spec hash on
-- every plan_generation_runs row so we can audit V3 plans after the fact.
--
-- diagnostics_json: arbitrary structured payload from the V3 pipeline
--   (validation result, violation summary, retry attempts, catalog sizes).
-- spec_seed_hex: the deterministic 64-bit FNV-1a seed derived from
--   UserState — pinning this lets us replay any past V3 run byte-for-byte
--   against the same content catalogs.
-- generation_version: existing INTEGER column from migration 021 captures
--   1/2; V3 stores 3 here. (No schema change needed — documented for
--   reviewers reading this migration in isolation.)

ALTER TABLE public.plan_generation_runs
  ADD COLUMN IF NOT EXISTS diagnostics_json JSONB,
  ADD COLUMN IF NOT EXISTS spec_seed_hex TEXT;

COMMENT ON COLUMN public.plan_generation_runs.diagnostics_json IS
  'V3 engine diagnostics: validator result, violation summary, attempts, catalog sizes.';
COMMENT ON COLUMN public.plan_generation_runs.spec_seed_hex IS
  '64-bit FNV-1a seed (hex) derived from the canonical UserState for this V3 run.';
