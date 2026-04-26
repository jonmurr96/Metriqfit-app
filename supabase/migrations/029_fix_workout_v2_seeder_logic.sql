-- MetriqFit Workout Engine V2 Pattern-Aware Seeder Fix
-- Replaces the 'dumb' rotation seeder with a logic that understands day focus.

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
  v_day_name text;
  v_focus text;
  v_sets integer;
  v_reps_min integer;
  v_reps_max integer;
  v_rest integer;
  v_slot_pattern text;
  v_ex_id uuid;
  d integer;
  e integer;
begin
  -- Clear existing days for this template
  delete from public.workout_program_days_v2 where template_id = p_template_id;

  for d in 1..p_days loop
    -- Determine Day Name/Focus
    v_day_name := case
      when p_family_key = 'bro_split_5' then (array['Chest','Back','Shoulders','Legs','Arms'])[d]
      when p_family_key = 'arnold_split_6' then (array['Chest + Back A','Shoulders + Arms A','Legs A','Chest + Back B','Shoulders + Arms B','Legs B'])[d]
      when p_family_key in ('ppl_3','ppl_6') then (array['Push','Pull','Legs','Push 2','Pull 2','Legs 2'])[d]
      when p_family_key in ('upper_lower_4','upper_lower_5') then (array['Upper A','Lower A','Upper B','Lower B','Accessory'])[d]
      when p_family_key = 'phul_4' then (array['Upper Power','Lower Power','Upper Hypertrophy','Lower Hypertrophy'])[d]
      when p_family_key = 'phat_5' then (array['Upper Power','Lower Power','Back + Shoulders','Lower Hypertrophy','Chest + Arms'])[d]
      else 'Day ' || d
    end;

    v_focus := case
      when v_day_name ilike '%push%' or v_day_name ilike '%chest%' or v_day_name ilike '%shoulder%' then 'Push'
      when v_day_name ilike '%pull%' or v_day_name ilike '%back%' then 'Pull'
      when v_day_name ilike '%leg%' or v_day_name ilike '%lower%' then 'Lower'
      when v_day_name ilike '%arm%' then 'Arms'
      when v_day_name ilike '%upper%' then 'Upper'
      else 'Full Body'
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
      v_day_name,
      v_focus || ' stimulus',
      case when p_days >= 5 then 70 else 60 end
    )
    returning id into v_day_id;

    -- Block Logic
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

    -- Exercise Selection Loop (5 exercises per day)
    for e in 1..5 loop
      -- 1. Determine the pattern for this slot based on the focus
      v_slot_pattern := case
        when v_focus = 'Full Body' then
          case e
            when 1 then 'squat'
            when 2 then 'hinge'
            when 3 then 'horizontal_push'
            when 4 then 'horizontal_pull'
            else 'core'
          end
        when v_focus = 'Upper' then
          case e
            when 1 then 'horizontal_push'
            when 2 then 'horizontal_pull'
            when 3 then 'vertical_push'
            when 4 then 'vertical_pull'
            else 'core'
          end
        when v_focus = 'Lower' then
          case e
            when 1 then 'squat'
            when 2 then 'hinge'
            when 3 then 'unilateral_lower'
            when 4 then 'calves'
            else 'core'
          end
        when v_focus = 'Push' then
          case e
            when 1 then 'horizontal_push'
            when 2 then 'vertical_push'
            when 3 then 'horizontal_push'
            when 4 then 'tricep_ext'
            else 'lateral_raise'
          end
        when v_focus = 'Pull' then
          case e
            when 1 then 'horizontal_pull'
            when 2 then 'vertical_pull'
            when 3 then 'horizontal_pull'
            when 4 then 'bicep_curl'
            else 'rear_delt'
          end
        when v_focus = 'Arms' then
          case e
            when 1 then 'bicep_curl'
            when 2 then 'tricep_ext'
            when 3 then 'biceps'
            when 4 then 'tricep_ext'
            else 'core'
          end
        else 'squat' -- Default
      end;

      -- 2. Pick an exercise matching the pattern
      -- If specific pattern not found, fallback to anything in that general region
      select id into v_ex_id
      from public.exercises
      where 
        (pattern = v_slot_pattern)
        OR (v_slot_pattern = 'core' and pattern in ('anti_extension','anti_rotation','spinal_flexion','hip_flexion','rotation'))
        OR (v_slot_pattern = 'horizontal_push' and pattern = 'chest_fly' and e > 2)
        OR (v_slot_pattern = 'horizontal_pull' and pattern = 'shrug' and e > 2)
      order by (case when pattern = v_slot_pattern then 0 else 1 end), random()
      limit 1;

      -- Final desperate fallback if nothing found
      if v_ex_id is null then
        select id into v_ex_id from public.exercises order by random() limit 1;
      end if;

      -- 3. Determine Technique/Sets/Reps
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

      -- 4. Insert Exercise
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
        v_ex_id,
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
        'Balanced focus on ' || replace(v_slot_pattern, '_', ' ')
      );
    end loop;
  end loop;
end;
$$;

-- Trigger Re-Seeding for all v2 templates
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
