-- Workout logging snapshot metadata for active-session fast logger.
-- Keeps reps/rest targets stable for in-progress sessions.

alter table public.session_exercises
  add column if not exists reps_min integer,
  add column if not exists reps_max integer,
  add column if not exists rest_seconds integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'session_exercises_rep_range_check'
  ) then
    alter table public.session_exercises
      add constraint session_exercises_rep_range_check
      check (
        reps_min is null
        or reps_max is null
        or reps_max >= reps_min
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'session_exercises_rest_seconds_check'
  ) then
    alter table public.session_exercises
      add constraint session_exercises_rest_seconds_check
      check (
        rest_seconds is null
        or rest_seconds between 0 and 600
      );
  end if;
end $$;
