-- ============================================================
-- Migration 088: Specialized 4-Day Templates
-- Adds Power_Dynamic_Primer + Trunk_Rotational_Anti_Rotation
-- to the replacement_group enum, seeds new exercises and the
-- four 4-day specialized templates (Athletic, FatLoss,
-- DB-Only, Bodyweight Skill).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. EXTEND THE ENUM
-- ─────────────────────────────────────────────────────────────
ALTER TYPE replacement_group ADD VALUE IF NOT EXISTS 'Power_Dynamic_Primer';
ALTER TYPE replacement_group ADD VALUE IF NOT EXISTS 'Trunk_Rotational_Anti_Rotation';

-- ─────────────────────────────────────────────────────────────
-- 2. SEED NEW EXERCISES
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.v1_exercises (
  external_id, name, movement_pattern, architectural_group,
  equipment_category, is_unilateral, setup_complexity, fatigue_cost,
  tier, progression_types, contraindications, estimated_duration_seconds
) VALUES
  ('ex_bw_box_jump',       'Box Jump',           'Cond', 'Power_Dynamic_Primer',          'BW',   false, 'Low', 'Medium', 'T1', '{Rep_Goal}', '{}', 45),
  ('ex_med_ball_slam',     'Medicine Ball Slam', 'Cond', 'Power_Dynamic_Primer',          'Misc', false, 'Low', 'Low',    'T1', '{Rep_Goal}', '{}', 30),
  ('ex_cable_pallof_press','Pallof Press',        'Core', 'Trunk_Rotational_Anti_Rotation','Cable',true,  'Low', 'Low',    'T1', '{Tempo,Rep_Goal}', '{}', 45),
  ('ex_db_russian_twist',  'DB Russian Twist',   'Core', 'Trunk_Rotational_Anti_Rotation','DB',   false, 'Low', 'Low',    'T2', '{Rep_Goal}', '{}', 45)
ON CONFLICT (external_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 3. SEED / UPSERT PLAN FAMILIES (4-day specialized)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.v1_plan_families (
  external_id, name, goal_bucket, training_style, days_per_week,
  lift_comfort, environment, progression_model
) VALUES
  ('fam_athletic_ul', 'Athletic Performance UL (4-Day)', 'Athletic', 'UpperLower', 4, 'BarbellAdv', 'Commercial', 'Double_Progression'),
  ('fam_fatloss_ul', 'Metabolic Fat Loss UL (4-Day)', 'FatLoss', 'UpperLower', 4, 'MachineDB', 'Commercial', 'Double_Progression'),
  ('fam_db_only_ul', 'DB-Only Performance UL (4-Day)', 'Hypertrophy', 'UpperLower', 4, 'MachineDB', 'AptHotel', 'Double_Progression'),
  ('fam_bw_skill_ul', 'Bodyweight Skill UL (4-Day)', 'GenFitness', 'UpperLower', 4, 'NoBarbell', 'Bodyweight', 'Mechanical_BW')
ON CONFLICT (external_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 4. SEED TEMPLATES + DAYS + SLOTS
-- ─────────────────────────────────────────────────────────────

-- ── 4A. Athletic Performance UL ────────────────────────────
DO $$
DECLARE
  _family_id UUID;
  _tpl_id UUID;
  _day_id UUID;
BEGIN
  SELECT id INTO _family_id FROM public.v1_plan_families WHERE external_id = 'fam_athletic_ul';
  IF _family_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.v1_templates (family_id, external_id, name, block_number, difficulty_score)
  VALUES (_family_id, 'tmp_athletic_ul_v1', 'Athletic Performance Upper/Lower', 1, 6)
  ON CONFLICT (external_id) DO NOTHING
  RETURNING id INTO _tpl_id;

  IF _tpl_id IS NULL THEN
    SELECT id INTO _tpl_id FROM public.v1_templates WHERE external_id = 'tmp_athletic_ul_v1';
    RETURN; -- already seeded, skip
  END IF;

  -- Day 1 – Lower: Power + Bilateral Squat
  INSERT INTO public.v1_workout_days (template_id, day_number, day_type)
  VALUES (_tpl_id, 1, 'LowerStrength')
  RETURNING id INTO _day_id;

  INSERT INTO public.v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Power_Dynamic_Primer',       true,  'PrimeCompound',     'Rep_Goal',    3, 3,  5,  7, 120),
    (_day_id, 1, 'Primary_Bilateral_Squat',    true,  'PrimeCompound',     'Linear_Load', 3, 5,  5,  8, 180),
    (_day_id, 2, 'Unilateral_Squat_Lunge',     true,  'SecondaryCompound', 'Double_Progression', 3, 8, 10, 8, 90),
    (_day_id, 3, 'Trunk_Rotational_Anti_Rotation', false, 'Isolation',     'Rep_Goal',    3, 10, 15, 7,  60);

  -- Day 2 – Upper: Horizontal + Anti-Ext
  INSERT INTO public.v1_workout_days (template_id, day_number, day_type)
  VALUES (_tpl_id, 2, 'UpperStrength')
  RETURNING id INTO _day_id;

  INSERT INTO public.v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Horizontal_Press', true,  'PrimeCompound',     'Double_Progression', 3, 6,  8,  8, 120),
    (_day_id, 1, 'Primary_Vertical_Pull',    true,  'PrimeCompound',     'Double_Progression', 3, 6,  8,  8, 120),
    (_day_id, 2, 'Primary_Vertical_Press',   true,  'SecondaryCompound', 'Double_Progression', 3, 10, 12, 8, 90),
    (_day_id, 3, 'Trunk_Anti_Extension',     false, 'Isolation',         'Rep_Goal',    3, 30, 60, 7,  60);

  -- Day 3 – Lower: Bilateral Hinge + Conditioning
  INSERT INTO public.v1_workout_days (template_id, day_number, day_type)
  VALUES (_tpl_id, 3, 'LowerStrength')
  RETURNING id INTO _day_id;

  INSERT INTO public.v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Bilateral_Hinge',           true,  'PrimeCompound', 'Linear_Load', 3, 5,  5,  8, 180),
    (_day_id, 1, 'Isolation_Hamstring_Curl',           false, 'Isolation',     'Double_Progression', 3, 12, 15, 9, 60),
    (_day_id, 2, 'Conditioning_Metabolic_Finisher',   true,  'Finisher',      'Density',     3, 10, 20, 9,  60);

  -- Day 4 – Upper: Vertical/Horizontal Mixed
  INSERT INTO public.v1_workout_days (template_id, day_number, day_type)
  VALUES (_tpl_id, 4, 'UpperStrength')
  RETURNING id INTO _day_id;

  INSERT INTO public.v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Horizontal_Pull',  true,  'PrimeCompound',     'Double_Progression', 3, 8,  10, 8, 90),
    (_day_id, 1, 'Primary_Horizontal_Press', true,  'SecondaryCompound', 'Double_Progression', 3, 10, 12, 8, 90),
    (_day_id, 2, 'Isolation_Lateral_Delt',   false, 'Isolation',         'Double_Progression', 3, 12, 15, 8, 60);
END$$;

-- ── 4B. Fat Loss UL ────────────────────────────────────────

DO $$
DECLARE
  _family_id UUID;
  _tpl_id UUID;
  _day_id UUID;
BEGIN
  SELECT id INTO _family_id FROM public.v1_plan_families WHERE external_id = 'fam_fatloss_ul';
  IF _family_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.v1_templates (family_id, external_id, name, block_number, difficulty_score)
  VALUES (_family_id, 'tmp_fatloss_ul_v1', 'Fat Loss Upper/Lower', 1, 6)
  ON CONFLICT (external_id) DO NOTHING
  RETURNING id INTO _tpl_id;

  IF _tpl_id IS NULL THEN
    SELECT id INTO _tpl_id FROM public.v1_templates WHERE external_id = 'tmp_fatloss_ul_v1';
    RETURN;
  END IF;

  -- Day 1 – Lower A
  INSERT INTO public.v1_workout_days (template_id, day_number, day_type)
  VALUES (_tpl_id, 1, 'LowerHypertrophy')
  RETURNING id INTO _day_id;

  INSERT INTO public.v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Bilateral_Squat',  true,  'PrimeCompound',     'Double_Progression', 3, 10, 12, 8, 60),
    (_day_id, 1, 'Primary_Bilateral_Hinge',  true,  'SecondaryCompound', 'Double_Progression', 3, 12, 15, 8, 60),
    (_day_id, 2, 'Trunk_Flexion',            false, 'Isolation',         'Rep_Goal',    3, 15, 20, 7,  45);

  -- Day 2 – Upper A
  INSERT INTO public.v1_workout_days (template_id, day_number, day_type)
  VALUES (_tpl_id, 2, 'UpperHypertrophy')
  RETURNING id INTO _day_id;

  INSERT INTO public.v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Horizontal_Press',          true, 'PrimeCompound', 'Double_Progression', 3, 10, 12, 8, 60),
    (_day_id, 1, 'Primary_Horizontal_Pull',            true, 'PrimeCompound', 'Double_Progression', 3, 10, 12, 8, 60),
    (_day_id, 2, 'Conditioning_Metabolic_Finisher',   true, 'Finisher',      'Density',     3, 15, 25, 8,  45);

  -- Day 3 – Lower B
  INSERT INTO public.v1_workout_days (template_id, day_number, day_type)
  VALUES (_tpl_id, 3, 'LowerHypertrophy')
  RETURNING id INTO _day_id;

  INSERT INTO public.v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Bilateral_Hinge',  true,  'PrimeCompound',     'Double_Progression', 3, 10, 12, 8, 60),
    (_day_id, 1, 'Unilateral_Squat_Lunge',   true,  'SecondaryCompound', 'Double_Progression', 3, 12, 15, 8, 60),
    (_day_id, 2, 'Isolation_Hamstring_Curl', false, 'Isolation',         'Double_Progression', 3, 12, 15, 8, 45);

  -- Day 4 – Upper B
  INSERT INTO public.v1_workout_days (template_id, day_number, day_type)
  VALUES (_tpl_id, 4, 'UpperHypertrophy')
  RETURNING id INTO _day_id;

  INSERT INTO public.v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Vertical_Press',  true,  'PrimeCompound', 'Double_Progression', 3, 10, 12, 8, 60),
    (_day_id, 1, 'Primary_Vertical_Pull',   true,  'PrimeCompound', 'Double_Progression', 3, 10, 12, 8, 60),
    (_day_id, 2, 'Isolation_Bicep_Flexion', false, 'Isolation',     'Double_Progression', 3, 12, 15, 8, 45);
END$$;

-- ── 4C. DB-Only UL ─────────────────────────────────────────

DO $$
DECLARE
  _family_id UUID;
  _tpl_id UUID;
  _day_id UUID;
BEGIN
  SELECT id INTO _family_id FROM public.v1_plan_families WHERE external_id = 'fam_db_only_ul';
  IF _family_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.v1_templates (family_id, external_id, name, block_number, difficulty_score)
  VALUES (_family_id, 'tmp_db_only_ul_v1', 'DB-Only Upper/Lower', 1, 6)
  ON CONFLICT (external_id) DO NOTHING
  RETURNING id INTO _tpl_id;

  IF _tpl_id IS NULL THEN
    SELECT id INTO _tpl_id FROM public.v1_templates WHERE external_id = 'tmp_db_only_ul_v1';
    RETURN;
  END IF;

  -- Day 1 – Lower A
  INSERT INTO public.v1_workout_days (template_id, day_number, day_type)
  VALUES (_tpl_id, 1, 'LowerHypertrophy')
  RETURNING id INTO _day_id;

  INSERT INTO public.v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Bilateral_Squat',  true,  'SecondaryCompound', 'Double_Progression', 3, 10, 12, 8, 90),
    (_day_id, 1, 'Primary_Bilateral_Hinge',  true,  'SecondaryCompound', 'Double_Progression', 3, 10, 12, 8, 90),
    (_day_id, 2, 'Isolation_Calf_Raise',     false, 'Isolation',         'Double_Progression', 3, 12, 15, 8, 60);

  -- Day 2 – Upper A
  INSERT INTO public.v1_workout_days (template_id, day_number, day_type)
  VALUES (_tpl_id, 2, 'UpperHypertrophy')
  RETURNING id INTO _day_id;

  INSERT INTO public.v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Horizontal_Press', true,  'SecondaryCompound', 'Double_Progression', 3, 10, 12, 8, 90),
    (_day_id, 1, 'Primary_Horizontal_Pull',  true,  'SecondaryCompound', 'Double_Progression', 3, 10, 12, 8, 90),
    (_day_id, 2, 'Isolation_Lateral_Delt',  false, 'Isolation',         'Double_Progression', 3, 12, 15, 8, 60);

  -- Day 3 – Lower B
  INSERT INTO public.v1_workout_days (template_id, day_number, day_type)
  VALUES (_tpl_id, 3, 'LowerHypertrophy')
  RETURNING id INTO _day_id;

  INSERT INTO public.v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Bilateral_Hinge',  true,  'SecondaryCompound', 'Double_Progression', 3, 10, 12, 8, 90),
    (_day_id, 1, 'Unilateral_Squat_Lunge',   true,  'SecondaryCompound', 'Double_Progression', 3, 10, 12, 8, 90),
    (_day_id, 2, 'Trunk_Flexion',            false, 'Isolation',         'Rep_Goal',    3, 15, 20, 7,  45);

  -- Day 4 – Upper B
  INSERT INTO public.v1_workout_days (template_id, day_number, day_type)
  VALUES (_tpl_id, 4, 'UpperHypertrophy')
  RETURNING id INTO _day_id;

  INSERT INTO public.v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Vertical_Press',  true,  'SecondaryCompound', 'Double_Progression', 3, 10, 12, 8, 90),
    (_day_id, 1, 'Primary_Vertical_Pull',   true,  'SecondaryCompound', 'Double_Progression', 3, 10, 12, 8, 90),
    (_day_id, 2, 'Isolation_Bicep_Flexion', false, 'Isolation',         'Double_Progression', 3, 12, 15, 8, 60);
END$$;

-- ── 4D. Bodyweight Skill UL ────────────────────────────────

DO $$
DECLARE
  _family_id UUID;
  _tpl_id UUID;
  _day_id UUID;
BEGIN
  SELECT id INTO _family_id FROM public.v1_plan_families WHERE external_id = 'fam_bw_skill_ul';
  IF _family_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.v1_templates (family_id, external_id, name, block_number, difficulty_score)
  VALUES (_family_id, 'tmp_bw_skill_ul_v1', 'Bodyweight Skill Upper/Lower', 1, 6)
  ON CONFLICT (external_id) DO NOTHING
  RETURNING id INTO _tpl_id;

  IF _tpl_id IS NULL THEN
    SELECT id INTO _tpl_id FROM public.v1_templates WHERE external_id = 'tmp_bw_skill_ul_v1';
    RETURN;
  END IF;

  -- Day 1 – Lower A: Explosive + Squat
  INSERT INTO public.v1_workout_days (template_id, day_number, day_type)
  VALUES (_tpl_id, 1, 'LowerStrength')
  RETURNING id INTO _day_id;

  INSERT INTO public.v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Power_Dynamic_Primer',     true,  'PrimeCompound', 'Rep_Goal',        3, 5,  8,  7, 90),
    (_day_id, 1, 'Primary_Bilateral_Squat',  true,  'PrimeCompound', 'Mechanical_BW',   3, 10, 20, 8, 90),
    (_day_id, 2, 'Trunk_Anti_Extension',     false, 'Isolation',     'Rep_Goal',        3, 30, 60, 7, 60);

  -- Day 2 – Upper A: Press/Pull Skill
  INSERT INTO public.v1_workout_days (template_id, day_number, day_type)
  VALUES (_tpl_id, 2, 'UpperStrength')
  RETURNING id INTO _day_id;

  INSERT INTO public.v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Horizontal_Press',          true,  'PrimeCompound', 'Mechanical_BW', 3, 8,  12, 8, 90),
    (_day_id, 1, 'Primary_Vertical_Pull',             true,  'PrimeCompound', 'Mechanical_BW', 3, 6,  10, 9, 120),
    (_day_id, 2, 'Trunk_Rotational_Anti_Rotation',    false, 'Isolation',     'Rep_Goal',      3, 10, 15, 7, 45);

  -- Day 3 – Lower B: Hinge + Unilateral
  INSERT INTO public.v1_workout_days (template_id, day_number, day_type)
  VALUES (_tpl_id, 3, 'LowerStrength')
  RETURNING id INTO _day_id;

  INSERT INTO public.v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Bilateral_Hinge',         true,  'SecondaryCompound', 'Mechanical_BW', 3, 10, 15, 8, 90),
    (_day_id, 1, 'Unilateral_Squat_Lunge',           true,  'SecondaryCompound', 'Mechanical_BW', 3, 8,  12, 8, 90),
    (_day_id, 2, 'Conditioning_Metabolic_Finisher',  true,  'Finisher',          'Density',       3, 1,  1,  9, 60);

  -- Day 4 – Upper B: OHP/Pull Skill
  INSERT INTO public.v1_workout_days (template_id, day_number, day_type)
  VALUES (_tpl_id, 4, 'UpperStrength')
  RETURNING id INTO _day_id;

  INSERT INTO public.v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Vertical_Press',  true,  'PrimeCompound',     'Mechanical_BW', 3, 5,  10, 9, 120),
    (_day_id, 1, 'Primary_Horizontal_Pull', true,  'SecondaryCompound', 'Mechanical_BW', 3, 10, 15, 8, 90),
    (_day_id, 2, 'Trunk_Flexion',           false, 'Isolation',         'Rep_Goal',      3, 15, 25, 7, 45);
END$$;
