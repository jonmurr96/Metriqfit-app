-- MetriqFit Workout Engine V2 seed catalog
-- Seeds 20+ family templates, including Bro + Arnold, and adds
-- deterministic day/block/exercise structures with technique metadata.

insert into public.workout_program_families (
  external_key,
  display_name,
  description,
  difficulty_bands,
  goal_tags,
  equipment_profile,
  training_style_tags,
  target_audience,
  is_active
)
values
  ('bro_split_5', 'Bro Split (5 Days)', 'Classic bodybuilding single-muscle emphasis split.', array['intermediate','advanced'], array['hypertrophy','bodybuilding'], array['barbell','dumbbell','machine','cable'], array['drop_set','tempo','amrap'], 'Bodybuilding-focused lifters', true),
  ('arnold_split_6', 'Arnold Split (6 Days)', 'Chest/back + shoulders/arms + legs repeated weekly.', array['intermediate','advanced'], array['hypertrophy','bodybuilding'], array['barbell','dumbbell','machine','cable'], array['superset','giant_set','drop_set'], 'High-frequency physique athletes', true),
  ('ppl_3', 'Push Pull Legs (3 Days)', 'Efficient PPL for foundational progression.', array['beginner','intermediate'], array['strength','hypertrophy','general_fitness'], array['barbell','dumbbell','machine'], array['tempo','pause_reps'], 'Users wanting simple structure', true),
  ('ppl_6', 'Push Pull Legs (6 Days)', 'High-volume PPL repeated twice per week.', array['intermediate','advanced'], array['hypertrophy','strength'], array['barbell','dumbbell','machine','cable'], array['drop_set','rest_pause'], 'Advanced volume-focused users', true),
  ('ppl_ul_hybrid_5', 'PPL + UL Hybrid (5 Days)', 'Push/pull/legs with upper/lower volume bridge.', array['intermediate'], array['hypertrophy','recomp'], array['barbell','dumbbell','machine'], array['tempo','superset'], 'Users wanting hybrid training variety', true),
  ('upper_lower_4', 'Upper/Lower (4 Days)', 'Balanced 4-day upper/lower structure.', array['beginner','intermediate'], array['strength','hypertrophy','general_fitness'], array['barbell','dumbbell','machine'], array['pause_reps','tempo'], 'Most users seeking structure and recovery', true),
  ('upper_lower_5', 'Upper/Lower (5 Days)', '5-day upper/lower with focused extra volume day.', array['intermediate','advanced'], array['strength','hypertrophy'], array['barbell','dumbbell','machine'], array['rest_pause','drop_set'], 'Users needing extra weak-point work', true),
  ('phul_4', 'PHUL (4 Days)', 'Power/Hypertrophy upper-lower split.', array['intermediate'], array['strength','hypertrophy'], array['barbell','dumbbell','machine'], array['pause_reps','amrap'], 'Intermediate users transitioning to advanced', true),
  ('phat_5', 'PHAT (5 Days)', 'Power + hypertrophy adaptive training.', array['advanced'], array['strength','hypertrophy','powerbuilding'], array['barbell','dumbbell','machine','cable'], array['drop_set','rest_pause','superset'], 'Advanced users with high work capacity', true),
  ('full_body_beginner_3', 'Full Body Beginner (3 Days)', 'Simple full-body progression for adherence.', array['beginner'], array['general_fitness','strength'], array['bodyweight','dumbbell','machine'], array['tempo','pause_reps'], 'New users and returners', true),
  ('full_body_strength_3', 'Full Body Strength (3 Days)', 'Compound-centric strength progression.', array['intermediate'], array['strength'], array['barbell','dumbbell'], array['pause_reps','amrap'], 'Strength-driven users with limited days', true),
  ('powerbuilding_5', 'Powerbuilding (5 Days)', 'Hybrid powerlifting + bodybuilding split.', array['intermediate','advanced'], array['powerbuilding','strength','hypertrophy'], array['barbell','dumbbell','machine'], array['drop_set','rest_pause','tempo'], 'Users balancing aesthetics and strength', true),
  ('novice_linear_strength_3', 'Novice Linear Strength (3 Days)', 'Linear load progression for novice lifters.', array['beginner'], array['strength'], array['barbell','dumbbell'], array['pause_reps'], 'Novice lifters building foundational strength', true),
  ('five_three_one_variant_4', '5/3/1 Variant (4 Days)', 'Main-lift progression with accessory volume.', array['intermediate','advanced'], array['strength'], array['barbell','dumbbell','machine'], array['amrap','pause_reps'], 'Users familiar with percentage progressions', true),
  ('conjugate_4', 'Conjugate (4 Days)', 'Max effort + dynamic effort conjugate split.', array['advanced'], array['strength','power'], array['barbell','band','machine'], array['amrap','rest_pause'], 'Advanced strength athletes', true),
  ('athletic_performance_5', 'Athletic Performance (5 Days)', 'Power, speed, conditioning blend.', array['intermediate'], array['athletic_performance','conditioning'], array['barbell','dumbbell','bodyweight','cardio_machine'], array['superset','amrap'], 'Users training for sport-like output', true),
  ('conditioning_hybrid_4', 'Conditioning Hybrid (4 Days)', 'Strength + engine intervals.', array['intermediate'], array['fat_loss','conditioning','general_fitness'], array['barbell','bodyweight','cardio_machine'], array['giant_set','amrap'], 'Users prioritizing conditioning and composition', true),
  ('calisthenics_foundation_4', 'Calisthenics Foundation (4 Days)', 'Bodyweight progression and trunk control.', array['beginner','intermediate'], array['calisthenics','general_fitness'], array['bodyweight','band'], array['tempo','pause_reps'], 'Bodyweight-preferring users', true),
  ('rehab_resilience_3', 'Rehab & Resilience (3 Days)', 'Low-impact control and tissue tolerance.', array['beginner'], array['injury_friendly','mobility','general_fitness'], array['bodyweight','band','dumbbell'], array['tempo','pause_reps'], 'Users with limitations or recovery needs', true),
  ('minimalist_full_body_2', 'Minimalist Full Body (2 Days)', 'Low-friction consistency-first training.', array['beginner'], array['minimalist','consistency'], array['bodyweight','dumbbell','band'], array['tempo'], 'Busy users needing low-friction adherence', true),
  ('home_dumbbell_4', 'Home Dumbbell (4 Days)', 'Home-based dumbbell-only split.', array['beginner','intermediate'], array['general_fitness','hypertrophy'], array['dumbbell','bench','bodyweight'], array['superset','tempo'], 'Home gym users', true),
  ('bodyweight_only_3', 'Bodyweight Only (3 Days)', 'No-equipment functional strength plan.', array['beginner','intermediate'], array['general_fitness','calisthenics'], array['bodyweight'], array['tempo','amrap'], 'Users with zero equipment', true),
  ('glute_focus_4', 'Glute Focus (4 Days)', 'Lower-body emphasis with glute specialization.', array['beginner','intermediate'], array['hypertrophy','recomp'], array['barbell','dumbbell','machine'], array['drop_set','pause_reps'], 'Users prioritizing glute development', true),
  ('general_fitness_beginner_3', 'General Fitness Beginner (3 Days)', 'Balanced resistance and conditioning entry plan.', array['beginner'], array['general_fitness','fat_loss'], array['bodyweight','dumbbell','machine'], array['superset','tempo'], 'Entry-level users building baseline fitness', true)
on conflict (external_key) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  difficulty_bands = excluded.difficulty_bands,
  goal_tags = excluded.goal_tags,
  equipment_profile = excluded.equipment_profile,
  training_style_tags = excluded.training_style_tags,
  target_audience = excluded.target_audience,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.workout_program_templates_v2 (
  family_id,
  external_id,
  name,
  description,
  progression_model,
  source_type,
  difficulty,
  duration_weeks,
  days_per_week,
  goal_tags,
  equipment_required,
  training_style_tags,
  volume_profile,
  is_public
)
select
  f.id,
  'template_v2_' || f.external_key,
  f.display_name,
  f.description,
  case
    when f.external_key in ('five_three_one_variant_4', 'novice_linear_strength_3') then 'linear'
    when f.external_key in ('conjugate_4', 'phat_5') then 'conjugate'
    when f.external_key in ('powerbuilding_5', 'arnold_split_6', 'bro_split_5') then 'block'
    else 'undulating'
  end,
  'manual',
  case
    when 'beginner' = any(f.difficulty_bands) then 'beginner'
    when 'intermediate' = any(f.difficulty_bands) then 'intermediate'
    else 'advanced'
  end,
  case
    when f.external_key in ('minimalist_full_body_2', 'rehab_resilience_3') then 6
    when f.external_key in ('novice_linear_strength_3', 'full_body_beginner_3') then 8
    else 12
  end,
  case
    when f.external_key like '%_2' then 2
    when f.external_key like '%_3' then 3
    when f.external_key like '%_4' then 4
    when f.external_key like '%_5' then 5
    when f.external_key like '%_6' then 6
    else 4
  end,
  f.goal_tags,
  f.equipment_profile,
  f.training_style_tags,
  case
    when f.external_key in ('phat_5', 'arnold_split_6', 'ppl_6') then 'high'
    when f.external_key in ('minimalist_full_body_2', 'rehab_resilience_3') then 'low'
    else 'moderate'
  end,
  true
from public.workout_program_families f
where f.is_active = true
on conflict (external_id) do update set
  family_id = excluded.family_id,
  name = excluded.name,
  description = excluded.description,
  progression_model = excluded.progression_model,
  source_type = excluded.source_type,
  difficulty = excluded.difficulty,
  duration_weeks = excluded.duration_weeks,
  days_per_week = excluded.days_per_week,
  goal_tags = excluded.goal_tags,
  equipment_required = excluded.equipment_required,
  training_style_tags = excluded.training_style_tags,
  volume_profile = excluded.volume_profile,
  is_public = excluded.is_public,
  updated_at = now();

create or replace function public.seed_workout_template_v2_structure(
  p_template_id uuid,
  p_days integer,
  p_family_key text
)
returns void
language plpgsql
as $$
declare
  v_day_id uuid;
  v_block_id uuid;
  v_block_type text;
  v_technique text;
  v_ex_ids uuid[];
  v_ex_count integer;
  d integer;
  e integer;
  v_name text;
  v_focus text;
  v_sets integer;
  v_reps_min integer;
  v_reps_max integer;
  v_rest integer;
begin
  select array_agg(id order by external_id)
  into v_ex_ids
  from public.exercises
  where external_id in (
    'ex_001','ex_002','ex_003','ex_004','ex_005','ex_006','ex_007','ex_008','ex_009','ex_010',
    'ex_011','ex_012','ex_013','ex_014','ex_015','ex_016','ex_017','ex_018','ex_019','ex_020',
    'ex_021','ex_022','ex_023','ex_024','ex_025','ex_026','ex_027','ex_028','ex_029','ex_030'
  );

  v_ex_count := coalesce(array_length(v_ex_ids, 1), 0);
  if v_ex_count = 0 then
    return;
  end if;

  delete from public.workout_program_days_v2 where template_id = p_template_id;

  for d in 1..p_days loop
    v_name := case
      when p_family_key = 'bro_split_5' then (array['Chest','Back','Shoulders','Legs','Arms'])[d]
      when p_family_key = 'arnold_split_6' then (array['Chest + Back A','Shoulders + Arms A','Legs A','Chest + Back B','Shoulders + Arms B','Legs B'])[d]
      when p_family_key in ('ppl_3','ppl_6') then (array['Push','Pull','Legs','Push 2','Pull 2','Legs 2'])[d]
      when p_family_key in ('upper_lower_4','upper_lower_5') then (array['Upper A','Lower A','Upper B','Lower B','Accessory'])[d]
      when p_family_key = 'phul_4' then (array['Upper Power','Lower Power','Upper Hypertrophy','Lower Hypertrophy'])[d]
      when p_family_key = 'phat_5' then (array['Upper Power','Lower Power','Back + Shoulders','Lower Hypertrophy','Chest + Arms'])[d]
      else 'Day ' || d
    end;

    v_focus := case
      when v_name ilike '%push%' or v_name ilike '%chest%' then 'Horizontal/vertical pressing + accessories'
      when v_name ilike '%pull%' or v_name ilike '%back%' then 'Posterior chain and pulling volume'
      when v_name ilike '%leg%' or v_name ilike '%lower%' then 'Lower body strength and hypertrophy'
      when v_name ilike '%arm%' then 'Arm specialization and pump work'
      when v_name ilike '%upper%' then 'Balanced upper body stimulus'
      else 'Balanced full-body stimulus'
    end;

    insert into public.workout_program_days_v2 (
      template_id,
      sequence_index,
      day_type,
      name,
      focus,
      estimated_duration_min
    )
    values (
      p_template_id,
      d,
      'workout',
      v_name,
      v_focus,
      case when p_days >= 5 then 70 else 60 end
    )
    returning id into v_day_id;

    v_block_type := case
      when mod(d, 6) = 2 then 'superset'
      when mod(d, 6) = 3 then 'drop_set'
      when mod(d, 6) = 4 then 'giant_set'
      when mod(d, 6) = 5 then 'rest_pause'
      when mod(d, 6) = 0 then 'amrap'
      else 'normal'
    end;

    insert into public.workout_program_day_blocks_v2 (
      day_id,
      order_index,
      block_type,
      title,
      config_json
    )
    values (
      v_day_id,
      1,
      v_block_type,
      case
        when v_block_type = 'superset' then 'Primary Superset Block'
        when v_block_type = 'drop_set' then 'Primary Drop-Set Block'
        when v_block_type = 'giant_set' then 'Primary Giant-Set Block'
        when v_block_type = 'rest_pause' then 'Primary Rest-Pause Block'
        when v_block_type = 'amrap' then 'Primary AMRAP Block'
        else 'Primary Straight-Set Block'
      end,
      jsonb_build_object(
        'family_key', p_family_key,
        'block_type', v_block_type,
        'auto_seeded', true
      )
    )
    returning id into v_block_id;

    for e in 1..5 loop
      v_technique := case
        when v_block_type = 'superset' then 'superset'
        when v_block_type = 'drop_set' and e = 5 then 'drop_set'
        when v_block_type = 'giant_set' then 'giant_set'
        when v_block_type = 'rest_pause' and e >= 4 then 'rest_pause'
        when v_block_type = 'amrap' and e = 5 then 'amrap'
        when e = 1 then 'tempo'
        when e = 2 then 'pause_reps'
        else null
      end;

      v_sets := case
        when v_technique = 'amrap' then 1
        when v_technique = 'drop_set' then 4
        else 3
      end;

      v_reps_min := case
        when v_technique = 'amrap' then 8
        when v_technique = 'pause_reps' then 5
        else 6
      end;

      v_reps_max := case
        when v_technique = 'amrap' then 20
        when v_technique = 'drop_set' then 12
        else 12
      end;

      v_rest := case
        when v_block_type in ('superset', 'giant_set') then 45
        when v_technique = 'amrap' then 120
        else 90
      end;

      insert into public.workout_program_block_exercises_v2 (
        block_id,
        exercise_id,
        order_index,
        sets_target,
        reps_min,
        reps_max,
        rest_seconds,
        tempo,
        technique_type,
        technique_config_json,
        set_style,
        rir_target_min,
        rir_target_max,
        rpe_target_min,
        rpe_target_max,
        pause_seconds,
        notes
      )
      values (
        v_block_id,
        v_ex_ids[((d + e - 2) % v_ex_count) + 1],
        e,
        v_sets,
        v_reps_min,
        v_reps_max,
        v_rest,
        case when v_technique = 'tempo' then '3-1-1' else null end,
        v_technique,
        jsonb_build_object(
          'seeded', true,
          'technique', coalesce(v_technique, 'straight'),
          'pair_id', case when v_block_type = 'superset' and e <= 4 then ceil(e::numeric / 2)::int else null end
        ),
        case when v_technique in ('drop_set', 'rest_pause') then 'pyramid' else 'straight' end,
        case when v_technique in ('amrap', 'rest_pause') then null else 1 end,
        case when v_technique in ('amrap', 'rest_pause') then null else 3 end,
        case when v_technique = 'amrap' then 8 else 7 end,
        case when v_technique = 'amrap' then 10 else 9 end,
        case when v_technique = 'pause_reps' then 2 else null end,
        case
          when v_technique = 'drop_set' then 'Final set includes controlled drop set.'
          when v_technique = 'rest_pause' then 'Cluster short breaths to extend effort safely.'
          when v_technique = 'amrap' then 'Stop at technical failure, maintain form.'
          when v_technique = 'pause_reps' then 'Pause in hardest range to increase control.'
          when v_technique = 'tempo' then 'Use controlled eccentric and intentful concentric.'
          else 'Execute with stable form and full range.'
        end
      );
    end loop;
  end loop;
end;
$$;

-- Seed structure for every v2 template.
do $$
declare
  rec record;
begin
  for rec in
    select t.id, t.days_per_week, f.external_key
    from public.workout_program_templates_v2 t
    join public.workout_program_families f on f.id = t.family_id
    where t.external_id like 'template_v2_%'
  loop
    perform public.seed_workout_template_v2_structure(rec.id, rec.days_per_week, rec.external_key);
  end loop;
end $$;

drop function if exists public.seed_workout_template_v2_structure(uuid, integer, text);
