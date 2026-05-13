ALTER TABLE public.user_targets
  ADD COLUMN IF NOT EXISTS day_type_targets_json JSONB,
  ADD COLUMN IF NOT EXISTS target_diagnostics_json JSONB;
