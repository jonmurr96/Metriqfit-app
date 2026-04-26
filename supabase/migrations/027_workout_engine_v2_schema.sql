-- MetriqFit Workout Engine V2 schema
-- Adds program-family catalog, structured training techniques, import/adaptation pipelines,
-- migration job audit tables, and execution-model extensions.

create extension if not exists pgcrypto;

-- Reuse global updated_at helper if missing.
create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================
-- Program catalog v2
-- =====================================================
create table if not exists public.workout_program_families (
  id uuid primary key default gen_random_uuid(),
  external_key text not null unique,
  display_name text not null,
  description text,
  difficulty_bands text[] not null default '{}'::text[],
  goal_tags text[] not null default '{}'::text[],
  equipment_profile text[] not null default '{}'::text[],
  training_style_tags text[] not null default '{}'::text[],
  target_audience text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_program_templates_v2 (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.workout_program_families(id) on delete cascade,
  external_id text not null unique,
  name text not null,
  description text,
  progression_model text not null default 'linear'
    check (progression_model in ('linear', 'undulating', 'block', 'conjugate', 'custom')),
  source_type text not null default 'manual'
    check (source_type in ('manual', 'ai', 'imported', 'hybrid')),
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  duration_weeks integer,
  days_per_week integer not null check (days_per_week between 1 and 7),
  goal_tags text[] not null default '{}'::text[],
  equipment_required text[] not null default '{}'::text[],
  training_style_tags text[] not null default '{}'::text[],
  volume_profile text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_program_days_v2 (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_program_templates_v2(id) on delete cascade,
  sequence_index integer not null check (sequence_index >= 1),
  day_type text not null default 'workout'
    check (day_type in ('workout', 'rest', 'conditioning', 'recovery')),
  name text not null,
  focus text,
  estimated_duration_min integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(template_id, sequence_index)
);

create table if not exists public.workout_program_day_blocks_v2 (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.workout_program_days_v2(id) on delete cascade,
  order_index integer not null check (order_index >= 1),
  block_type text not null default 'normal'
    check (block_type in ('normal', 'superset', 'giant_set', 'drop_set', 'rest_pause', 'amrap', 'warmup_protocol')),
  title text,
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(day_id, order_index)
);

create table if not exists public.workout_program_block_exercises_v2 (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.workout_program_day_blocks_v2(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  order_index integer not null check (order_index >= 1),
  sets_target integer not null default 3 check (sets_target between 1 and 20),
  reps_min integer not null default 8 check (reps_min between 1 and 100),
  reps_max integer not null default 12 check (reps_max between 1 and 100),
  rest_seconds integer default 90 check (rest_seconds between 0 and 600),
  tempo text,
  technique_type text
    check (technique_type in ('tempo', 'pause_reps', 'superset', 'giant_set', 'drop_set', 'rest_pause', 'amrap', 'warmup_protocol')),
  technique_config_json jsonb not null default '{}'::jsonb,
  set_style text default 'straight'
    check (set_style in ('straight', 'top_backoff', 'wave', 'pyramid', 'density')),
  rir_target_min numeric,
  rir_target_max numeric,
  rpe_target_min numeric,
  rpe_target_max numeric,
  pause_seconds integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_program_block_exercises_v2_rep_range check (reps_max >= reps_min),
  unique(block_id, order_index)
);

-- =====================================================
-- User workout block model (for builder + per-user techniques)
-- =====================================================
create table if not exists public.user_workout_plan_blocks (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null references public.user_workout_plan_days(id) on delete cascade,
  order_index integer not null check (order_index >= 1),
  block_type text not null default 'normal'
    check (block_type in ('normal', 'superset', 'giant_set', 'drop_set', 'rest_pause', 'amrap', 'warmup_protocol')),
  title text,
  config_json jsonb not null default '{}'::jsonb,
  is_user_modified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plan_day_id, order_index)
);

alter table public.user_workout_plan_exercises
  add column if not exists block_id uuid,
  add column if not exists technique_type text,
  add column if not exists technique_config_json jsonb not null default '{}'::jsonb,
  add column if not exists set_style text,
  add column if not exists rir_target_min numeric,
  add column if not exists rir_target_max numeric,
  add column if not exists rpe_target_min numeric,
  add column if not exists rpe_target_max numeric,
  add column if not exists pause_seconds integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_workout_plan_exercises_block_id_fkey'
  ) then
    alter table public.user_workout_plan_exercises
      add constraint user_workout_plan_exercises_block_id_fkey
      foreign key (block_id)
      references public.user_workout_plan_blocks(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_workout_plan_exercises_technique_type_check'
  ) then
    alter table public.user_workout_plan_exercises
      add constraint user_workout_plan_exercises_technique_type_check
      check (technique_type is null or technique_type in ('tempo', 'pause_reps', 'superset', 'giant_set', 'drop_set', 'rest_pause', 'amrap', 'warmup_protocol'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_workout_plan_exercises_set_style_check'
  ) then
    alter table public.user_workout_plan_exercises
      add constraint user_workout_plan_exercises_set_style_check
      check (set_style is null or set_style in ('straight', 'top_backoff', 'wave', 'pyramid', 'density'));
  end if;
end $$;

-- =====================================================
-- Session execution extensions
-- =====================================================
alter table public.session_exercises
  add column if not exists sets_target integer not null default 3,
  add column if not exists plan_exercise_id uuid,
  add column if not exists technique_snapshot_json jsonb not null default '{}'::jsonb;

alter table public.workout_sets
  add column if not exists set_type text,
  add column if not exists rir numeric,
  add column if not exists tempo_actual text,
  add column if not exists is_amrap boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'session_exercises_plan_exercise_id_fkey'
  ) then
    alter table public.session_exercises
      add constraint session_exercises_plan_exercise_id_fkey
      foreign key (plan_exercise_id)
      references public.user_workout_plan_exercises(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'session_exercises_sets_target_check'
  ) then
    alter table public.session_exercises
      add constraint session_exercises_sets_target_check
      check (sets_target between 1 and 30);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'workout_sets_set_type_check'
  ) then
    alter table public.workout_sets
      add constraint workout_sets_set_type_check
      check (set_type is null or set_type in ('straight', 'warmup', 'drop', 'rest_pause', 'amrap', 'backoff'));
  end if;
end $$;

update public.workout_sets
set set_type = case when is_warmup then 'warmup' else 'straight' end
where set_type is null;

-- =====================================================
-- Import pipeline tables
-- =====================================================
create table if not exists public.workout_import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'parsing', 'needs_mapping', 'validated', 'failed', 'activated')),
  source_type text not null check (source_type in ('text', 'json', 'csv')),
  source_payload text,
  normalized_plan_json jsonb,
  validation_summary_json jsonb,
  unresolved_mappings_json jsonb,
  error_message text,
  activated_plan_id uuid references public.user_workout_plans(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.workout_import_staging_rows (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.workout_import_jobs(id) on delete cascade,
  line_number integer,
  raw_line text,
  parsed_json jsonb,
  warnings_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_import_mapping_decisions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.workout_import_jobs(id) on delete cascade,
  source_exercise_name text not null,
  mapped_exercise_id uuid references public.exercises(id) on delete set null,
  confidence numeric,
  decided_by text not null default 'user' check (decided_by in ('system', 'user')),
  created_at timestamptz not null default now()
);

create table if not exists public.workout_import_errors (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.workout_import_jobs(id) on delete cascade,
  code text not null,
  message text not null,
  context_json jsonb not null default '{}'::jsonb,
  severity text not null default 'error' check (severity in ('warning', 'error')),
  created_at timestamptz not null default now()
);

-- =====================================================
-- Adaptive programming tables
-- =====================================================
create table if not exists public.workout_adaptation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.user_workout_plans(id) on delete cascade,
  schedule_id uuid references public.user_workout_plan_schedule(id) on delete set null,
  event_type text not null,
  metrics_json jsonb not null default '{}'::jsonb,
  recommended_changes_json jsonb not null default '{}'::jsonb,
  status text not null default 'detected' check (status in ('detected', 'applied', 'ignored')),
  created_at timestamptz not null default now(),
  applied_at timestamptz
);

create table if not exists public.workout_adaptation_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.user_workout_plans(id) on delete cascade,
  recommendation_type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  rationale text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'expired')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.workout_readiness_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  sleep_hours numeric,
  soreness integer,
  stress integer,
  energy integer,
  readiness_score numeric,
  notes_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, log_date)
);

-- =====================================================
-- Migration job/audit tables
-- =====================================================
create table if not exists public.workout_plan_migration_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  cursor_user_id uuid,
  total_processed integer not null default 0,
  total_success integer not null default 0,
  total_failed integer not null default 0,
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_plan_migration_audit (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.workout_plan_migration_jobs(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  old_plan_id uuid references public.user_workout_plans(id) on delete set null,
  new_plan_id uuid references public.user_workout_plans(id) on delete set null,
  status text not null check (status in ('success', 'failed', 'skipped')),
  error_message text,
  migration_payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =====================================================
-- Indexes
-- =====================================================
create index if not exists idx_workout_program_families_active on public.workout_program_families(is_active);
create index if not exists idx_workout_program_templates_v2_family on public.workout_program_templates_v2(family_id);
create index if not exists idx_workout_program_templates_v2_public on public.workout_program_templates_v2(is_public) where is_public = true;
create index if not exists idx_workout_program_days_v2_template on public.workout_program_days_v2(template_id, sequence_index);
create index if not exists idx_workout_program_day_blocks_v2_day on public.workout_program_day_blocks_v2(day_id, order_index);
create index if not exists idx_workout_program_block_exercises_v2_block on public.workout_program_block_exercises_v2(block_id, order_index);

create index if not exists idx_user_workout_plan_blocks_day on public.user_workout_plan_blocks(plan_day_id, order_index);
create index if not exists idx_user_workout_plan_exercises_block on public.user_workout_plan_exercises(block_id);
create index if not exists idx_session_exercises_plan_ex on public.session_exercises(plan_exercise_id);
create index if not exists idx_workout_sets_set_type on public.workout_sets(set_type);

create index if not exists idx_workout_import_jobs_user on public.workout_import_jobs(user_id, created_at desc);
create index if not exists idx_workout_import_jobs_status on public.workout_import_jobs(status);
create index if not exists idx_workout_import_staging_rows_job on public.workout_import_staging_rows(job_id, line_number);
create index if not exists idx_workout_import_mapping_decisions_job on public.workout_import_mapping_decisions(job_id);
create index if not exists idx_workout_import_errors_job on public.workout_import_errors(job_id);

create index if not exists idx_workout_adaptation_events_user on public.workout_adaptation_events(user_id, created_at desc);
create index if not exists idx_workout_adaptation_events_plan on public.workout_adaptation_events(plan_id, created_at desc);
create index if not exists idx_workout_adaptation_recommendations_user on public.workout_adaptation_recommendations(user_id, status, created_at desc);
create index if not exists idx_workout_readiness_daily_user_date on public.workout_readiness_daily(user_id, log_date desc);

create index if not exists idx_workout_plan_migration_jobs_status on public.workout_plan_migration_jobs(status, created_at desc);
create index if not exists idx_workout_plan_migration_audit_user on public.workout_plan_migration_audit(user_id, created_at desc);
create index if not exists idx_workout_plan_migration_audit_old_plan on public.workout_plan_migration_audit(old_plan_id);

-- =====================================================
-- RLS policies
-- =====================================================
alter table public.workout_program_families enable row level security;
alter table public.workout_program_templates_v2 enable row level security;
alter table public.workout_program_days_v2 enable row level security;
alter table public.workout_program_day_blocks_v2 enable row level security;
alter table public.workout_program_block_exercises_v2 enable row level security;

alter table public.user_workout_plan_blocks enable row level security;
alter table public.workout_import_jobs enable row level security;
alter table public.workout_import_staging_rows enable row level security;
alter table public.workout_import_mapping_decisions enable row level security;
alter table public.workout_import_errors enable row level security;
alter table public.workout_adaptation_events enable row level security;
alter table public.workout_adaptation_recommendations enable row level security;
alter table public.workout_readiness_daily enable row level security;
alter table public.workout_plan_migration_jobs enable row level security;
alter table public.workout_plan_migration_audit enable row level security;

-- Catalog read access
drop policy if exists "Anyone can view active workout program families" on public.workout_program_families;
create policy "Anyone can view active workout program families"
  on public.workout_program_families
  for select
  using (is_active = true);

drop policy if exists "Anyone can view public workout templates v2" on public.workout_program_templates_v2;
create policy "Anyone can view public workout templates v2"
  on public.workout_program_templates_v2
  for select
  using (is_public = true);

drop policy if exists "Anyone can view workout program days v2" on public.workout_program_days_v2;
create policy "Anyone can view workout program days v2"
  on public.workout_program_days_v2
  for select
  using (
    exists (
      select 1
      from public.workout_program_templates_v2 t
      where t.id = template_id
        and t.is_public = true
    )
  );

drop policy if exists "Anyone can view workout program day blocks v2" on public.workout_program_day_blocks_v2;
create policy "Anyone can view workout program day blocks v2"
  on public.workout_program_day_blocks_v2
  for select
  using (
    exists (
      select 1
      from public.workout_program_days_v2 d
      join public.workout_program_templates_v2 t on t.id = d.template_id
      where d.id = day_id
        and t.is_public = true
    )
  );

drop policy if exists "Anyone can view workout program block exercises v2" on public.workout_program_block_exercises_v2;
create policy "Anyone can view workout program block exercises v2"
  on public.workout_program_block_exercises_v2
  for select
  using (
    exists (
      select 1
      from public.workout_program_day_blocks_v2 b
      join public.workout_program_days_v2 d on d.id = b.day_id
      join public.workout_program_templates_v2 t on t.id = d.template_id
      where b.id = block_id
        and t.is_public = true
    )
  );

drop policy if exists "Users can manage own workout plan blocks" on public.user_workout_plan_blocks;
create policy "Users can manage own workout plan blocks"
  on public.user_workout_plan_blocks
  for all
  using (
    exists (
      select 1
      from public.user_workout_plan_days d
      join public.user_workout_plans p on p.id = d.plan_id
      where d.id = plan_day_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Users can manage own workout import jobs" on public.workout_import_jobs;
create policy "Users can manage own workout import jobs"
  on public.workout_import_jobs
  for all
  using (user_id = auth.uid());

drop policy if exists "Users can manage own workout import staging rows" on public.workout_import_staging_rows;
create policy "Users can manage own workout import staging rows"
  on public.workout_import_staging_rows
  for all
  using (
    exists (
      select 1 from public.workout_import_jobs j
      where j.id = job_id
        and j.user_id = auth.uid()
    )
  );

drop policy if exists "Users can manage own workout import mapping decisions" on public.workout_import_mapping_decisions;
create policy "Users can manage own workout import mapping decisions"
  on public.workout_import_mapping_decisions
  for all
  using (
    exists (
      select 1 from public.workout_import_jobs j
      where j.id = job_id
        and j.user_id = auth.uid()
    )
  );

drop policy if exists "Users can manage own workout import errors" on public.workout_import_errors;
create policy "Users can manage own workout import errors"
  on public.workout_import_errors
  for all
  using (
    exists (
      select 1 from public.workout_import_jobs j
      where j.id = job_id
        and j.user_id = auth.uid()
    )
  );

drop policy if exists "Users can manage own workout adaptation events" on public.workout_adaptation_events;
create policy "Users can manage own workout adaptation events"
  on public.workout_adaptation_events
  for all
  using (user_id = auth.uid());

drop policy if exists "Users can manage own workout adaptation recommendations" on public.workout_adaptation_recommendations;
create policy "Users can manage own workout adaptation recommendations"
  on public.workout_adaptation_recommendations
  for all
  using (user_id = auth.uid());

drop policy if exists "Users can manage own workout readiness rows" on public.workout_readiness_daily;
create policy "Users can manage own workout readiness rows"
  on public.workout_readiness_daily
  for all
  using (user_id = auth.uid());

drop policy if exists "Users can view own workout migration audit" on public.workout_plan_migration_audit;
create policy "Users can view own workout migration audit"
  on public.workout_plan_migration_audit
  for select
  using (user_id = auth.uid());

-- updated_at triggers
drop trigger if exists trg_workout_program_families_updated_at on public.workout_program_families;
create trigger trg_workout_program_families_updated_at
  before update on public.workout_program_families
  for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_workout_program_templates_v2_updated_at on public.workout_program_templates_v2;
create trigger trg_workout_program_templates_v2_updated_at
  before update on public.workout_program_templates_v2
  for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_workout_program_days_v2_updated_at on public.workout_program_days_v2;
create trigger trg_workout_program_days_v2_updated_at
  before update on public.workout_program_days_v2
  for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_workout_program_day_blocks_v2_updated_at on public.workout_program_day_blocks_v2;
create trigger trg_workout_program_day_blocks_v2_updated_at
  before update on public.workout_program_day_blocks_v2
  for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_workout_program_block_exercises_v2_updated_at on public.workout_program_block_exercises_v2;
create trigger trg_workout_program_block_exercises_v2_updated_at
  before update on public.workout_program_block_exercises_v2
  for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_user_workout_plan_blocks_updated_at on public.user_workout_plan_blocks;
create trigger trg_user_workout_plan_blocks_updated_at
  before update on public.user_workout_plan_blocks
  for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_workout_import_jobs_updated_at on public.workout_import_jobs;
create trigger trg_workout_import_jobs_updated_at
  before update on public.workout_import_jobs
  for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_workout_readiness_daily_updated_at on public.workout_readiness_daily;
create trigger trg_workout_readiness_daily_updated_at
  before update on public.workout_readiness_daily
  for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_workout_plan_migration_jobs_updated_at on public.workout_plan_migration_jobs;
create trigger trg_workout_plan_migration_jobs_updated_at
  before update on public.workout_plan_migration_jobs
  for each row execute function public.set_updated_at_timestamp();
