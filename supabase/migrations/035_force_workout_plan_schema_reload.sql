alter table public.user_workout_plans
  add column if not exists source_model text not null default 'generated',
  add column if not exists program_template_v2_id uuid,
  add column if not exists program_family_key text,
  add column if not exists progression_model text,
  add column if not exists training_style_tags text[] not null default '{}'::text[],
  add column if not exists goal_tags text[] not null default '{}'::text[],
  add column if not exists weekly_layout_json jsonb,
  add column if not exists lifecycle_state text not null default 'live',
  add column if not exists replaces_plan_id uuid;

alter table public.user_workout_plan_days
  add column if not exists day_type text not null default 'workout',
  add column if not exists estimated_duration_min integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_workout_plans_program_template_v2_id_fkey'
  ) then
    alter table public.user_workout_plans
      add constraint user_workout_plans_program_template_v2_id_fkey
      foreign key (program_template_v2_id)
      references public.workout_program_templates_v2(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_workout_plans_source_model_check'
  ) then
    alter table public.user_workout_plans
      add constraint user_workout_plans_source_model_check
      check (source_model in ('generated', 'v2_template', 'custom_builder', 'legacy_template'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_workout_plans_lifecycle_state_check'
  ) then
    alter table public.user_workout_plans
      add constraint user_workout_plans_lifecycle_state_check
      check (lifecycle_state in ('live', 'archived', 'preview'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_workout_plans_replaces_plan_id_fkey'
  ) then
    alter table public.user_workout_plans
      add constraint user_workout_plans_replaces_plan_id_fkey
      foreign key (replaces_plan_id)
      references public.user_workout_plans(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_workout_plan_days_day_type_check'
  ) then
    alter table public.user_workout_plan_days
      add constraint user_workout_plan_days_day_type_check
      check (day_type in ('workout', 'rest', 'conditioning', 'recovery', 'active_recovery'));
  end if;
end $$;

create index if not exists idx_user_workout_plans_program_template_v2
  on public.user_workout_plans(program_template_v2_id);

create index if not exists idx_user_workout_plans_program_family_key
  on public.user_workout_plans(program_family_key);

create index if not exists idx_user_workout_plans_lifecycle_state
  on public.user_workout_plans(user_id, lifecycle_state);

create index if not exists idx_user_workout_plans_replaces_plan_id
  on public.user_workout_plans(replaces_plan_id);

notify pgrst, 'reload schema';
