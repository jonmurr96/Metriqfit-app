alter table public.user_workout_plan_exercises
  drop constraint if exists user_workout_plan_exercises_technique_type_check;

alter table public.user_workout_plan_exercises
  add constraint user_workout_plan_exercises_technique_type_check
  check (
    technique_type is null
    or technique_type in (
      'straight_set',
      'tempo',
      'pause_reps',
      'superset',
      'giant_set',
      'drop_set',
      'rest_pause',
      'amrap',
      'warmup_protocol',
      'cluster',
      'cluster_set',
      'failure_set',
      'pyramid_set'
    )
  );
