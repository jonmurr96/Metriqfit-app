-- AI Prep Coach (Elite): cycles + adjustment audit trail.

create table if not exists public.prep_coach_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  discipline text not null check (discipline in ('bodybuilding', 'powerlifting')),
  phase text not null check (phase in ('cut', 'bulk')),
  auto_adjust_enabled boolean not null default false,
  source_onboarding_snapshot jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_prep_coach_cycles_user_active_unique
  on public.prep_coach_cycles(user_id)
  where is_active = true;

create index if not exists idx_prep_coach_cycles_user_created
  on public.prep_coach_cycles(user_id, created_at desc);

create table if not exists public.prep_coach_adjustment_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid references public.prep_coach_cycles(id) on delete set null,
  measurement_id uuid references public.user_measurements(id) on delete set null,
  source text not null default 'weekly_check_in' check (source in ('weekly_check_in')),
  before_target_snapshot jsonb not null default '{}'::jsonb,
  after_target_snapshot jsonb not null default '{}'::jsonb,
  before_nutrition_plan_id uuid references public.user_nutrition_plans(id) on delete set null,
  after_nutrition_plan_id uuid references public.user_nutrition_plans(id) on delete set null,
  before_nutrition_plan_version integer,
  after_nutrition_plan_version integer,
  applied_workout_adjustment_ids jsonb not null default '[]'::jsonb,
  coach_summary text,
  status text not null check (status in ('applied', 'recommended', 'reverted', 'failed')),
  error_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_prep_adjustment_events_user_created
  on public.prep_coach_adjustment_events(user_id, created_at desc);

create index if not exists idx_prep_adjustment_events_cycle
  on public.prep_coach_adjustment_events(cycle_id, created_at desc);

alter table public.prep_coach_cycles enable row level security;
alter table public.prep_coach_adjustment_events enable row level security;

drop policy if exists "Users can manage own prep coach cycles" on public.prep_coach_cycles;
create policy "Users can manage own prep coach cycles"
  on public.prep_coach_cycles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own prep coach adjustment events" on public.prep_coach_adjustment_events;
create policy "Users can manage own prep coach adjustment events"
  on public.prep_coach_adjustment_events
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists trg_prep_coach_cycles_updated_at on public.prep_coach_cycles;
create trigger trg_prep_coach_cycles_updated_at
before update on public.prep_coach_cycles
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_prep_adjustment_events_updated_at on public.prep_coach_adjustment_events;
create trigger trg_prep_adjustment_events_updated_at
before update on public.prep_coach_adjustment_events
for each row execute function public.set_updated_at_timestamp();
