-- 096_seed_ppl_brosplit_templates.sql
-- Seeds four new muscle-group-focused plan families and their templates:
--
--   fam_ppl_3day         → PPL 3-day (Hypertrophy, Intermediate)
--   fam_ppl_6day         → PPL 6-day (Hypertrophy, Advanced)
--   fam_brosplit_4day    → Bro Split 4-day — Chest/Triceps · Back/Biceps · Shoulders · Legs
--   fam_brosplit_5day    → Bro Split 5-day — above + dedicated Arms day
--
-- Depends on:
--   • 080_v1_workout_engine_schema.sql — table definitions
--   • 095_add_brosplit_ppl_day_types.sql — new day_type values

-- ── Plan Families ──────────────────────────────────────────────────────────────
INSERT INTO v1_plan_families (external_id, name, goal_bucket, training_style, days_per_week, lift_comfort, environment, progression_model)
VALUES
  (
    'fam_ppl_3day',
    'Push / Pull / Legs (3-Day)',
    'Hypertrophy',
    'PPL',
    3,
    'BarbellBasic',
    'Commercial',
    'Double_Progression'
  ),
  (
    'fam_ppl_6day',
    'Push / Pull / Legs (6-Day)',
    'Hypertrophy',
    'PPL',
    6,
    'BarbellBasic',
    'Commercial',
    'Double_Progression'
  ),
  (
    'fam_brosplit_4day',
    'Bro Split (4-Day)',
    'Hypertrophy',
    'BroSplit',
    4,
    'BarbellBasic',
    'Commercial',
    'Double_Progression'
  ),
  (
    'fam_brosplit_5day',
    'Bro Split (5-Day)',
    'Hypertrophy',
    'BroSplit',
    5,
    'BarbellBasic',
    'Commercial',
    'Double_Progression'
  )
ON CONFLICT (external_id) DO NOTHING;

-- ── Templates, Days, and Slots ─────────────────────────────────────────────────
DO $$
DECLARE
  _family_id   UUID;
  _template_id UUID;
  _day_id      UUID;
BEGIN

  -- ═══════════════════════════════════════════════════════════════════════════
  -- FAMILY: fam_ppl_3day
  -- Push → Chest, Shoulders, Triceps
  -- Pull → Back (horizontal + vertical), Biceps
  -- Legs → Quads, Hamstrings, Glutes, Calves
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO _family_id FROM v1_plan_families WHERE external_id = 'fam_ppl_3day';
  IF _family_id IS NULL THEN RAISE EXCEPTION 'Family fam_ppl_3day not found'; END IF;

  INSERT INTO v1_templates (family_id, external_id, name, block_number, difficulty_score)
  VALUES (_family_id, 'tmp_ppl_3day_v1', 'Push / Pull / Legs 3-Day', 1, 5)
  ON CONFLICT (external_id) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO _template_id;

  -- Day 1: Push
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 1, 'Push')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Horizontal_Press',    true,  'PrimeCompound',     'Double_Progression', 3, 6,  10, 8, 120),
    (_day_id, 1, 'Primary_Vertical_Press',      true,  'PrimeCompound',     'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 2, 'Isolation_Chest_Fly',         false, 'Isolation',         'Double_Progression', 3, 10, 15, 9,  75),
    (_day_id, 3, 'Isolation_Lateral_Delt',      false, 'Isolation',         'Double_Progression', 3, 12, 20, 9,  60),
    (_day_id, 4, 'Isolation_Tricep_Extension',  false, 'Isolation',         'Double_Progression', 3, 10, 15, 9,  60);

  -- Day 2: Pull
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 2, 'Pull')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Vertical_Pull',    true,  'PrimeCompound',     'Double_Progression', 3, 6,  10, 8, 120),
    (_day_id, 1, 'Primary_Horizontal_Pull',  true,  'PrimeCompound',     'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 2, 'Isolation_Bicep_Flexion',  false, 'Isolation',         'Double_Progression', 3, 10, 15, 9,  60),
    (_day_id, 3, 'Isolation_Hamstring_Curl', false, 'Isolation',         'Double_Progression', 2, 12, 15, 8,  60);

  -- Day 3: Legs
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 3, 'Legs')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Bilateral_Squat',   true,  'PrimeCompound',     'Double_Progression', 4, 6,  10, 8, 150),
    (_day_id, 1, 'Primary_Bilateral_Hinge',   true,  'PrimeCompound',     'Double_Progression', 3, 6,  10, 8, 150),
    (_day_id, 2, 'Unilateral_Squat_Lunge',    true,  'SecondaryCompound', 'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 3, 'Isolation_Hamstring_Curl',  false, 'Isolation',         'Double_Progression', 3, 12, 15, 8,  75),
    (_day_id, 4, 'Isolation_Calf_Raise',      false, 'Isolation',         'Double_Progression', 3, 15, 25, 9,  60);


  -- ═══════════════════════════════════════════════════════════════════════════
  -- FAMILY: fam_ppl_6day
  -- Two rounds of Push/Pull/Legs per week (A + B variations)
  -- Push A: horizontal emphasis; Push B: vertical emphasis
  -- Pull A: vertical pull prime; Pull B: horizontal pull prime
  -- Legs A: quad dominant; Legs B: hinge dominant
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO _family_id FROM v1_plan_families WHERE external_id = 'fam_ppl_6day';
  IF _family_id IS NULL THEN RAISE EXCEPTION 'Family fam_ppl_6day not found'; END IF;

  INSERT INTO v1_templates (family_id, external_id, name, block_number, difficulty_score)
  VALUES (_family_id, 'tmp_ppl_6day_v1', 'Push / Pull / Legs 6-Day', 1, 7)
  ON CONFLICT (external_id) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO _template_id;

  -- Day 1: Push A (horizontal prime)
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 1, 'Push')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Horizontal_Press',   true,  'PrimeCompound',     'Double_Progression', 4, 5,  8,  8, 150),
    (_day_id, 1, 'Primary_Vertical_Press',     true,  'SecondaryCompound', 'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 2, 'Isolation_Chest_Fly',        false, 'Isolation',         'Double_Progression', 3, 10, 15, 9,  75),
    (_day_id, 3, 'Isolation_Lateral_Delt',     false, 'Isolation',         'Double_Progression', 3, 15, 20, 9,  60),
    (_day_id, 4, 'Isolation_Tricep_Extension', false, 'Isolation',         'Double_Progression', 3, 10, 15, 9,  60);

  -- Day 2: Pull A (vertical pull prime)
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 2, 'Pull')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Vertical_Pull',    true,  'PrimeCompound',     'Double_Progression', 4, 5,  8,  8, 150),
    (_day_id, 1, 'Primary_Horizontal_Pull',  true,  'SecondaryCompound', 'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 2, 'Isolation_Bicep_Flexion',  false, 'Isolation',         'Double_Progression', 3, 10, 15, 9,  60),
    (_day_id, 3, 'Isolation_Hamstring_Curl', false, 'Isolation',         'Double_Progression', 2, 12, 15, 8,  60);

  -- Day 3: Legs A (squat dominant)
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 3, 'Legs')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Bilateral_Squat',  true,  'PrimeCompound',     'Double_Progression', 4, 5,  8,  8, 180),
    (_day_id, 1, 'Unilateral_Squat_Lunge',   true,  'SecondaryCompound', 'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 2, 'Isolation_Hamstring_Curl', false, 'Isolation',         'Double_Progression', 3, 12, 15, 9,  75),
    (_day_id, 3, 'Isolation_Calf_Raise',     false, 'Isolation',         'Double_Progression', 3, 15, 25, 9,  60),
    (_day_id, 4, 'Trunk_Flexion',            false, 'Isolation',         'Rep_Goal',           3, 15, 25, 8,  60);

  -- Day 4: Push B (vertical prime)
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 4, 'Push')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Vertical_Press',     true,  'PrimeCompound',     'Double_Progression', 4, 6,  10, 8, 150),
    (_day_id, 1, 'Primary_Horizontal_Press',   true,  'SecondaryCompound', 'Double_Progression', 3, 10, 15, 8, 120),
    (_day_id, 2, 'Isolation_Lateral_Delt',     false, 'Isolation',         'Double_Progression', 3, 15, 20, 9,  60),
    (_day_id, 3, 'Isolation_Chest_Fly',        false, 'Isolation',         'Double_Progression', 3, 12, 15, 9,  75),
    (_day_id, 4, 'Isolation_Tricep_Extension', false, 'Isolation',         'Double_Progression', 3, 10, 15, 9,  60);

  -- Day 5: Pull B (horizontal pull prime)
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 5, 'Pull')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Horizontal_Pull',  true,  'PrimeCompound',     'Double_Progression', 4, 6,  10, 8, 150),
    (_day_id, 1, 'Primary_Vertical_Pull',    true,  'SecondaryCompound', 'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 2, 'Isolation_Bicep_Flexion',  false, 'Isolation',         'Double_Progression', 3, 10, 15, 9,  60),
    (_day_id, 3, 'Isolation_Lateral_Delt',   false, 'Isolation',         'Double_Progression', 2, 15, 20, 9,  60);

  -- Day 6: Legs B (hinge dominant)
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 6, 'Legs')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Bilateral_Hinge',  true,  'PrimeCompound',     'Double_Progression', 4, 4,  6,  8, 180),
    (_day_id, 1, 'Unilateral_Hinge',         true,  'SecondaryCompound', 'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 2, 'Primary_Bilateral_Squat',  true,  'SecondaryCompound', 'Double_Progression', 3, 8,  12, 8, 150),
    (_day_id, 3, 'Isolation_Hamstring_Curl', false, 'Isolation',         'Double_Progression', 3, 12, 15, 9,  75),
    (_day_id, 4, 'Isolation_Calf_Raise',     false, 'Isolation',         'Double_Progression', 3, 15, 25, 9,  60);


  -- ═══════════════════════════════════════════════════════════════════════════
  -- FAMILY: fam_brosplit_4day
  -- Day 1: Chest + Triceps
  -- Day 2: Back + Biceps
  -- Day 3: Shoulder Day (overhead + rear delt + lateral)
  -- Day 4: Legs
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO _family_id FROM v1_plan_families WHERE external_id = 'fam_brosplit_4day';
  IF _family_id IS NULL THEN RAISE EXCEPTION 'Family fam_brosplit_4day not found'; END IF;

  INSERT INTO v1_templates (family_id, external_id, name, block_number, difficulty_score)
  VALUES (_family_id, 'tmp_brosplit_4day_v1', 'Bro Split 4-Day', 1, 6)
  ON CONFLICT (external_id) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO _template_id;

  -- Day 1: Chest + Triceps
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 1, 'ChestAndTriceps')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Horizontal_Press',   true,  'PrimeCompound',     'Double_Progression', 4, 6,  10, 8, 150),
    (_day_id, 1, 'Primary_Vertical_Press',     true,  'SecondaryCompound', 'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 2, 'Isolation_Chest_Fly',        true,  'Isolation',         'Double_Progression', 3, 10, 15, 9,  75),
    (_day_id, 3, 'Isolation_Tricep_Extension', true,  'Isolation',         'Double_Progression', 3, 10, 15, 9,  75),
    (_day_id, 4, 'Trunk_Anti_Extension',       false, 'Isolation',         'Rep_Goal',           2, 30, 45, 8,  60);

  -- Day 2: Back + Biceps
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 2, 'BackAndBiceps')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Vertical_Pull',    true,  'PrimeCompound',     'Double_Progression', 4, 5,  8,  8, 150),
    (_day_id, 1, 'Primary_Horizontal_Pull',  true,  'PrimeCompound',     'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 2, 'Isolation_Bicep_Flexion',  true,  'Isolation',         'Double_Progression', 3, 10, 15, 9,  75),
    (_day_id, 3, 'Unilateral_Hinge',         false, 'SecondaryCompound', 'Double_Progression', 3, 10, 15, 8,  90);

  -- Day 3: Shoulder Day (combination approach: overhead + rear delt + lateral)
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 3, 'ShoulderDay')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Vertical_Press',   true,  'PrimeCompound',     'Double_Progression', 4, 6,  10, 8, 150),
    (_day_id, 1, 'Isolation_Lateral_Delt',   true,  'Isolation',         'Double_Progression', 4, 12, 20, 9,  60),
    (_day_id, 2, 'Primary_Horizontal_Pull',  true,  'SecondaryCompound', 'Double_Progression', 3, 12, 15, 8, 90),
    (_day_id, 3, 'Isolation_Tricep_Extension',false,'Isolation',          'Double_Progression', 3, 10, 15, 9,  60),
    (_day_id, 4, 'Trunk_Flexion',            false, 'Isolation',         'Rep_Goal',           2, 15, 25, 8,  60);

  -- Day 4: Legs
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 4, 'Legs')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Bilateral_Squat',  true,  'PrimeCompound',     'Double_Progression', 4, 6,  10, 8, 180),
    (_day_id, 1, 'Primary_Bilateral_Hinge',  true,  'PrimeCompound',     'Double_Progression', 3, 6,  10, 8, 180),
    (_day_id, 2, 'Unilateral_Squat_Lunge',   true,  'SecondaryCompound', 'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 3, 'Isolation_Hamstring_Curl', false, 'Isolation',         'Double_Progression', 3, 12, 15, 9,  75),
    (_day_id, 4, 'Isolation_Calf_Raise',     false, 'Isolation',         'Double_Progression', 3, 15, 25, 9,  60);


  -- ═══════════════════════════════════════════════════════════════════════════
  -- FAMILY: fam_brosplit_5day
  -- Day 1: Chest + Triceps
  -- Day 2: Back + Biceps
  -- Day 3: Shoulder Day
  -- Day 4: Legs
  -- Day 5: Arms (dedicated bicep + tricep volume day)
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO _family_id FROM v1_plan_families WHERE external_id = 'fam_brosplit_5day';
  IF _family_id IS NULL THEN RAISE EXCEPTION 'Family fam_brosplit_5day not found'; END IF;

  INSERT INTO v1_templates (family_id, external_id, name, block_number, difficulty_score)
  VALUES (_family_id, 'tmp_brosplit_5day_v1', 'Bro Split 5-Day', 1, 7)
  ON CONFLICT (external_id) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO _template_id;

  -- Day 1: Chest + Triceps
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 1, 'ChestAndTriceps')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Horizontal_Press',   true,  'PrimeCompound',     'Double_Progression', 4, 6,  10, 8, 150),
    (_day_id, 1, 'Primary_Vertical_Press',     true,  'SecondaryCompound', 'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 2, 'Isolation_Chest_Fly',        true,  'Isolation',         'Double_Progression', 3, 10, 15, 9,  75),
    (_day_id, 3, 'Isolation_Tricep_Extension', true,  'Isolation',         'Double_Progression', 3, 10, 15, 9,  75),
    (_day_id, 4, 'Trunk_Anti_Extension',       false, 'Isolation',         'Rep_Goal',           2, 30, 45, 8,  60);

  -- Day 2: Back + Biceps
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 2, 'BackAndBiceps')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Vertical_Pull',    true,  'PrimeCompound',     'Double_Progression', 4, 5,  8,  8, 150),
    (_day_id, 1, 'Primary_Horizontal_Pull',  true,  'PrimeCompound',     'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 2, 'Isolation_Bicep_Flexion',  true,  'Isolation',         'Double_Progression', 3, 10, 15, 9,  75),
    (_day_id, 3, 'Unilateral_Hinge',         false, 'SecondaryCompound', 'Double_Progression', 3, 10, 15, 8,  90);

  -- Day 3: Shoulder Day
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 3, 'ShoulderDay')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Vertical_Press',    true,  'PrimeCompound',     'Double_Progression', 4, 6,  10, 8, 150),
    (_day_id, 1, 'Isolation_Lateral_Delt',    true,  'Isolation',         'Double_Progression', 4, 12, 20, 9,  60),
    (_day_id, 2, 'Primary_Horizontal_Pull',   true,  'SecondaryCompound', 'Double_Progression', 3, 12, 15, 8,  90),
    (_day_id, 3, 'Trunk_Flexion',             false, 'Isolation',         'Rep_Goal',           3, 15, 25, 8,  60);

  -- Day 4: Legs
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 4, 'Legs')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Bilateral_Squat',  true,  'PrimeCompound',     'Double_Progression', 4, 6,  10, 8, 180),
    (_day_id, 1, 'Primary_Bilateral_Hinge',  true,  'PrimeCompound',     'Double_Progression', 3, 6,  10, 8, 180),
    (_day_id, 2, 'Unilateral_Squat_Lunge',   true,  'SecondaryCompound', 'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 3, 'Isolation_Hamstring_Curl', false, 'Isolation',         'Double_Progression', 3, 12, 15, 9,  75),
    (_day_id, 4, 'Isolation_Calf_Raise',     false, 'Isolation',         'Double_Progression', 3, 15, 25, 9,  60);

  -- Day 5: Arms (dedicated bicep + tricep volume)
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 5, 'ArmsDay')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Isolation_Bicep_Flexion',   true,  'Isolation', 'Double_Progression', 4, 8,  12, 9,  75),
    (_day_id, 1, 'Isolation_Tricep_Extension', true, 'Isolation', 'Double_Progression', 4, 8,  12, 9,  75),
    (_day_id, 2, 'Primary_Horizontal_Pull',    true,  'SecondaryCompound', 'Double_Progression', 3, 10, 15, 8, 90),
    (_day_id, 3, 'Isolation_Lateral_Delt',    false, 'Isolation', 'Double_Progression', 3, 15, 20, 9,  60),
    (_day_id, 4, 'Trunk_Flexion',             false, 'Isolation', 'Rep_Goal',           2, 15, 20, 8,  60);

END;
$$;
