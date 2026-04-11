-- Migration 086: Add FullBodyHypertrophy day_type + seed 2-day specialized plan families & templates
-- Purpose: Extend day_type enum with missing FullBodyHypertrophy value, then seed the three new
--          handcrafted 2-day plan families (strength, aesthetics, athletic) and their templates.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────

-- Step 1: Extend day_type enum
-- FullBodyHypertrophy exists in the TypeScript enum but was missing from the Postgres enum.
-- This must run before any slot INSERT that references it.
ALTER TYPE day_type ADD VALUE IF NOT EXISTS 'FullBodyHypertrophy';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- Step 2: Seed Plan Families
-- These three families are the goal-specific 2-day curated paths. They intentionally replace the
-- legacy generic 2-day families (fam_hyp_2_day, fam_str_2_day, fam_gen_2_day) in live routing.
-- ─────────────────────────────────────────────────────────────────────────────────────────────────
INSERT INTO v1_plan_families (external_id, name, goal_bucket, training_style, days_per_week, lift_comfort, environment, progression_model)
VALUES
  (
    'fam_minimalist_2_day_strength',
    'Minimalist Strength 2-Day',
    'Strength',
    'FullBody',
    2,
    'BarbellAdv',
    'Commercial',
    'Linear_Load'          -- dominant model for this family
  ),
  (
    'fam_minimalist_2_day_aesthetics',
    'Minimalist Aesthetics 2-Day',
    'Hypertrophy',
    'FullBody',
    2,
    'MachineDB',
    'Commercial',
    'Double_Progression'
  ),
  (
    'fam_minimalist_2_day_athletic',
    'Minimalist Athletic 2-Day',
    'Athletic',
    'FullBody',
    2,
    'MachineDB',
    'Commercial',
    'Double_Progression'
  )
ON CONFLICT (external_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────
-- Step 3: Seed Templates, Days, and Slots (PL/pgSQL block for UUID chaining)
-- ─────────────────────────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  _family_id   UUID;
  _template_id UUID;
  _day_id      UUID;
BEGIN

  -- ═══════════════════════════════════════════════════════════════════════
  -- FAMILY 1: fam_minimalist_2_day_strength
  -- Template: tmp_minimalist_2_day_strength_v1
  -- Day A: Squat / Bench — Linear_Load 3x5 (strength accumulation)
  -- Day B: Deadlift / OHP — Top_Set_Backoff 3x3-5 (intensity variation)
  -- ═══════════════════════════════════════════════════════════════════════
  SELECT id INTO _family_id FROM v1_plan_families WHERE external_id = 'fam_minimalist_2_day_strength';
  IF _family_id IS NULL THEN
    RAISE EXCEPTION 'Family fam_minimalist_2_day_strength not found — check Step 2';
  END IF;

  INSERT INTO v1_templates (family_id, external_id, name, block_number, difficulty_score)
  VALUES (_family_id, 'tmp_minimalist_2_day_strength_v1', 'Minimalist Strength 2-Day', 1, 6)
  ON CONFLICT (external_id) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO _template_id;

  -- Day A: Squat / Bench emphasis — linear load
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 1, 'FullBodyStrength')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Bilateral_Squat',   true,  'PrimeCompound',     'Linear_Load',       3, 5,  5,  9, 180),
    (_day_id, 1, 'Primary_Horizontal_Press',  true,  'PrimeCompound',     'Linear_Load',       3, 5,  5,  9, 180),
    (_day_id, 2, 'Primary_Horizontal_Pull',   true,  'SecondaryCompound', 'Double_Progression',3, 6,  8,  8, 120),
    (_day_id, 3, 'Isolation_Bicep_Flexion',   false, 'Isolation',         'Double_Progression',3, 10, 15, 8,  90);

  -- Day B: Deadlift / OHP emphasis — top set + backoff
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 2, 'FullBodyStrength')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Bilateral_Hinge',   true,  'PrimeCompound',     'Top_Set_Backoff',   3, 3,  5,  9, 180),
    (_day_id, 1, 'Primary_Vertical_Press',    true,  'PrimeCompound',     'Top_Set_Backoff',   3, 3,  5,  9, 180),
    (_day_id, 2, 'Primary_Vertical_Pull',     true,  'SecondaryCompound', 'Double_Progression',3, 6,  8,  8, 120),
    (_day_id, 3, 'Trunk_Flexion',             false, 'Isolation',         'Rep_Goal',          3, 15, 25, 8,  60);


  -- ═══════════════════════════════════════════════════════════════════════
  -- FAMILY 2: fam_minimalist_2_day_aesthetics
  -- Template: tmp_minimalist_2_day_aesthetics_v1
  -- Full Body A/B — FullBodyHypertrophy, Double_Progression throughout
  -- Day A: Squat / HPress / VPull — slightly more anterior chain
  -- Day B: Hinge / VPress / HPull + Lunge — slightly more posterior chain
  -- ═══════════════════════════════════════════════════════════════════════
  SELECT id INTO _family_id FROM v1_plan_families WHERE external_id = 'fam_minimalist_2_day_aesthetics';
  IF _family_id IS NULL THEN
    RAISE EXCEPTION 'Family fam_minimalist_2_day_aesthetics not found — check Step 2';
  END IF;

  INSERT INTO v1_templates (family_id, external_id, name, block_number, difficulty_score)
  VALUES (_family_id, 'tmp_minimalist_2_day_aesthetics_v1', 'Minimalist Aesthetics 2-Day', 1, 5)
  ON CONFLICT (external_id) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO _template_id;

  -- Day A: anterior chain
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 1, 'FullBodyHypertrophy')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Bilateral_Squat',   true,  'PrimeCompound',     'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 1, 'Primary_Horizontal_Press',  true,  'PrimeCompound',     'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 2, 'Primary_Vertical_Pull',     true,  'SecondaryCompound', 'Double_Progression', 3, 10, 15, 9,  90),
    (_day_id, 3, 'Isolation_Lateral_Delt',    false, 'Isolation',         'Double_Progression', 3, 12, 20, 9,  60),
    (_day_id, 4, 'Isolation_Calf_Raise',      false, 'Isolation',         'Double_Progression', 3, 12, 20, 9,  60);

  -- Day B: posterior chain
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 2, 'FullBodyHypertrophy')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Bilateral_Hinge',   true,  'PrimeCompound',     'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 1, 'Primary_Vertical_Press',    true,  'PrimeCompound',     'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 2, 'Primary_Horizontal_Pull',   true,  'SecondaryCompound', 'Double_Progression', 3, 10, 15, 9,  90),
    (_day_id, 3, 'Unilateral_Squat_Lunge',    true,  'SecondaryCompound', 'Double_Progression', 3, 10, 15, 9,  90),
    (_day_id, 4, 'Isolation_Hamstring_Curl',  false, 'Isolation',         'Double_Progression', 3, 12, 15, 9,  60);


  -- ═══════════════════════════════════════════════════════════════════════
  -- FAMILY 3: fam_minimalist_2_day_athletic
  -- Template: tmp_minimalist_2_day_athletic_v1
  -- Full Body A/B — FullBodyGenFit (intentional: no FullBodyAthletic enum yet)
  -- Day A: Unilateral lower / HPress / HPull + core + conditioning finisher
  -- Day B: Bilateral hinge / VPress / VPull + core + conditioning finisher
  -- ═══════════════════════════════════════════════════════════════════════
  SELECT id INTO _family_id FROM v1_plan_families WHERE external_id = 'fam_minimalist_2_day_athletic';
  IF _family_id IS NULL THEN
    RAISE EXCEPTION 'Family fam_minimalist_2_day_athletic not found — check Step 2';
  END IF;

  INSERT INTO v1_templates (family_id, external_id, name, block_number, difficulty_score)
  VALUES (_family_id, 'tmp_minimalist_2_day_athletic_v1', 'Minimalist Athletic 2-Day', 1, 5)
  ON CONFLICT (external_id) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO _template_id;

  -- Day A: unilateral power + horizontal + core anti-extension + finisher
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 1, 'FullBodyGenFit')  -- TODO: update to FullBodyAthletic when enum is added
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Unilateral_Squat_Lunge',             true,  'PrimeCompound',     'Double_Progression', 3, 6,  8,  7, 120),
    (_day_id, 1, 'Primary_Horizontal_Press',            true,  'PrimeCompound',     'Double_Progression', 3, 6,  8,  8, 120),
    (_day_id, 2, 'Primary_Horizontal_Pull',             true,  'SecondaryCompound', 'Double_Progression', 3, 8,  12, 8,  90),
    (_day_id, 3, 'Trunk_Anti_Extension',                false, 'Isolation',         'Rep_Goal',           3, 30, 60, 8,  60),
    (_day_id, 4, 'Conditioning_Metabolic_Finisher',     false, 'Isolation',         'Density',            1, 1,  1,  9,   0);

  -- Day B: bilateral hinge + vertical push/pull + core flexion + finisher
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 2, 'FullBodyGenFit')  -- TODO: update to FullBodyAthletic when enum is added
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Bilateral_Hinge',             true,  'PrimeCompound',     'Double_Progression', 3, 5,  8,  7, 180),
    (_day_id, 1, 'Primary_Vertical_Press',              true,  'PrimeCompound',     'Double_Progression', 3, 6,  8,  8, 120),
    (_day_id, 2, 'Primary_Vertical_Pull',               true,  'SecondaryCompound', 'Double_Progression', 3, 8,  12, 8,  90),
    (_day_id, 3, 'Trunk_Flexion',                       false, 'Isolation',         'Rep_Goal',           3, 15, 20, 8,  60),
    (_day_id, 4, 'Conditioning_Metabolic_Finisher',     false, 'Isolation',         'Density',            1, 1,  1,  9,   0);

END
$$;
