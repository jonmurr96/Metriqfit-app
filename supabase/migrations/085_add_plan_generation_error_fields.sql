alter table public.plan_generation_runs
  add column if not exists error_step text,
  add column if not exists error_code text,
  add column if not exists error_context jsonb;
