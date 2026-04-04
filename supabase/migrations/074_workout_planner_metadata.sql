alter table public.user_workout_plans
  add column if not exists planner_metadata_json jsonb;

create index if not exists idx_user_workout_plans_planner_metadata_gin
  on public.user_workout_plans
  using gin (planner_metadata_json);

notify pgrst, 'reload schema';
