-- Workout mapping remediation jobs/audit
-- Tracks template and active-plan audit/remediation runs.

create table if not exists public.workout_mapping_remediation_jobs (
  id uuid primary key default gen_random_uuid(),
  operation text not null check (operation in ('audit_templates', 'remediate_templates', 'audit_active_plans', 'migrate_active_plans')),
  scope text check (scope in ('v1', 'v2', 'both')),
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  dry_run boolean not null default true,
  cursor text,
  batch_size integer not null default 50,
  processed integer not null default 0,
  changed integer not null default 0,
  skipped integer not null default 0,
  failed integer not null default 0,
  summary_json jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_mapping_remediation_audit (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.workout_mapping_remediation_jobs(id) on delete set null,
  entity_type text not null check (entity_type in ('template_v1', 'template_v2', 'plan')),
  entity_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  day_id uuid,
  day_name text,
  row_id uuid,
  operation text not null check (operation in ('audit', 'remediate', 'migrate')),
  status text not null check (status in ('changed', 'skipped', 'failed', 'audit_only')),
  violation_types text[] not null default '{}'::text[],
  before_json jsonb not null default '{}'::jsonb,
  after_json jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_workout_mapping_remediation_jobs_status
  on public.workout_mapping_remediation_jobs(status, created_at desc);

create index if not exists idx_workout_mapping_remediation_audit_job
  on public.workout_mapping_remediation_audit(job_id, created_at desc);

create index if not exists idx_workout_mapping_remediation_audit_entity
  on public.workout_mapping_remediation_audit(entity_type, entity_id, created_at desc);

create index if not exists idx_workout_mapping_remediation_audit_user
  on public.workout_mapping_remediation_audit(user_id, created_at desc);

create index if not exists idx_workout_mapping_remediation_audit_day
  on public.workout_mapping_remediation_audit(day_id, created_at desc);

alter table public.workout_mapping_remediation_jobs enable row level security;
alter table public.workout_mapping_remediation_audit enable row level security;

drop policy if exists "Users can view own mapping remediation audit" on public.workout_mapping_remediation_audit;
create policy "Users can view own mapping remediation audit"
  on public.workout_mapping_remediation_audit
  for select
  using (auth.uid() = user_id);

-- Keep jobs service-role only for now.

create or replace function public.set_updated_at_timestamp_workout_mapping_remediation_jobs()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_workout_mapping_remediation_jobs_updated_at on public.workout_mapping_remediation_jobs;
create trigger trg_workout_mapping_remediation_jobs_updated_at
  before update on public.workout_mapping_remediation_jobs
  for each row
  execute function public.set_updated_at_timestamp_workout_mapping_remediation_jobs();
