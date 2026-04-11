-- Migration 087: Seed 2-day specialized plan families and templates
-- ─────────────────────────────────────────────────────────────────────────────
-- Depends on:
--   • 080_v1_workout_engine_schema.sql  — table definitions
--   • 086_add_day_type_fullbodyhypertrophy.sql — FullBodyHypertrophy enum value
--
-- Purpose:
-- Seeds three goal-specific, handcrafted 2-day plan families and their matching
-- templates. These replace generic algorithmic 2-day fallbacks and are the
-- authoritative live paths routed by v1_librarian_router.ts when daysPerWeek === 2.
--
-- Families seeded:
--   fam_minimalist_2_day_strength   → Strength  / BarbellAdv  / Linear_Load
--   fam_minimalist_2_day_aesthetics → Hypertrophy / MachineDB / Double_Progression
--   fam_minimalist_2_day_athletic   → Athletic  / MachineDB   / Double_Progression
--
-- Templates seeded:
--   tmp_minimalist_2_day_strength_v1   — 2 days, FullBodyStrength
--   tmp_minimalist_2_day_aesthetics_v1 — 2 days, FullBodyHypertrophy
--   tmp_minimalist_2_day_athletic_v1   — 2 days, FullBodyGenFit (placeholder; TODO: FullBodyAthletic)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Plan Families ─────────────────────────────────────────────────────────────
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
    'Linear_Load'
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

-- ── Templates, Days, and Slots ─────────────────────────────────────────────────
DO $$
DECLARE
  _family_id   UUID;
  _template_id UUID;
  _day_id      UUID;
BEGIN

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEMPLATE 1: tmp_minimalist_2_day_strength_v1
  -- Day A: Squat / Bench — Linear_Load 3x5 (accumulation)
  -- Day B: Deadlift / OHP — Top_Set_Backoff 3x3-5 (intensity variation)
  -- Mirrors intensity cycling of the 3-day strength family (house style).
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO _family_id FROM v1_plan_families WHERE external_id = 'fam_minimalist_2_day_strength';
  IF _family_id IS NULL THEN
    RAISE EXCEPTION 'Family fam_minimalist_2_day_strength not found';
  END IF;

  INSERT INTO v1_templates (family_id, external_id, name, block_number, difficulty_score)
  VALUES (_family_id, 'tmp_minimalist_2_day_strength_v1', 'Minimalist Strength 2-Day', 1, 6)
  ON CONFLICT (external_id) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO _template_id;

  -- Day A: Squat + Bench (Linear_Load)
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 1, 'FullBodyStrength')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Bilateral_Squat',  true,  'PrimeCompound',     'Linear_Load',        3, 5,  5,  9, 180),
    (_day_id, 1, 'Primary_Horizontal_Press', true,  'PrimeCompound',     'Linear_Load',        3, 5,  5,  9, 180),
    (_day_id, 2, 'Primary_Horizontal_Pull',  true,  'SecondaryCompound', 'Double_Progression', 3, 6,  8,  8, 120),
    (_day_id, 3, 'Isolation_Bicep_Flexion',  false, 'Isolation',         'Double_Progression', 3, 10, 15, 8,  90);

  -- Day B: Deadlift + OHP (Top_Set_Backoff)
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 2, 'FullBodyStrength')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Bilateral_Hinge',  true,  'PrimeCompound',     'Top_Set_Backoff',    3, 3,  5,  9, 180),
    (_day_id, 1, 'Primary_Vertical_Press',   true,  'PrimeCompound',     'Top_Set_Backoff',    3, 3,  5,  9, 180),
    (_day_id, 2, 'Primary_Vertical_Pull',    true,  'SecondaryCompound', 'Double_Progression', 3, 6,  8,  8, 120),
    (_day_id, 3, 'Trunk_Flexion',            false, 'Isolation',         'Rep_Goal',           3, 15, 25, 8,  60);


  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEMPLATE 2: tmp_minimalist_2_day_aesthetics_v1
  -- Full Body A/B — FullBodyHypertrophy, Double_Progression throughout.
  -- 2-day full body beats upper/lower at this frequency (hits each region 2x/wk).
  -- Day A: anterior chain emphasis (Squat / HPress / VPull)
  -- Day B: posterior chain emphasis (Hinge / VPress / HPull + Lunge)
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO _family_id FROM v1_plan_families WHERE external_id = 'fam_minimalist_2_day_aesthetics';
  IF _family_id IS NULL THEN
    RAISE EXCEPTION 'Family fam_minimalist_2_day_aesthetics not found';
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
    (_day_id, 0, 'Primary_Bilateral_Squat',  true,  'PrimeCompound',     'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 1, 'Primary_Horizontal_Press', true,  'PrimeCompound',     'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 2, 'Primary_Vertical_Pull',    true,  'SecondaryCompound', 'Double_Progression', 3, 10, 15, 9,  90),
    (_day_id, 3, 'Isolation_Lateral_Delt',   false, 'Isolation',         'Double_Progression', 3, 12, 20, 9,  60),
    (_day_id, 4, 'Isolation_Calf_Raise',     false, 'Isolation',         'Double_Progression', 3, 12, 20, 9,  60);

  -- Day B: posterior chain
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 2, 'FullBodyHypertrophy')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Bilateral_Hinge',  true,  'PrimeCompound',     'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 1, 'Primary_Vertical_Press',   true,  'PrimeCompound',     'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 2, 'Primary_Horizontal_Pull',  true,  'SecondaryCompound', 'Double_Progression', 3, 10, 15, 9,  90),
    (_day_id, 3, 'Unilateral_Squat_Lunge',   true,  'SecondaryCompound', 'Double_Progression', 3, 10, 15, 9,  90),
    (_day_id, 4, 'Isolation_Hamstring_Curl', false, 'Isolation',         'Double_Progression', 3, 12, 15, 9,  60);


  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEMPLATE 3: tmp_minimalist_2_day_athletic_v1
  -- Full Body A/B — FullBodyGenFit (intentional placeholder).
  -- TODO: update day_type to FullBodyAthletic once that enum value is added.
  -- Day A: unilateral lower / horizontal push-pull / anti-extension core / finisher
  -- Day B: bilateral hinge / vertical push-pull / flexion core / finisher
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO _family_id FROM v1_plan_families WHERE external_id = 'fam_minimalist_2_day_athletic';
  IF _family_id IS NULL THEN
    RAISE EXCEPTION 'Family fam_minimalist_2_day_athletic not found';
  END IF;

  INSERT INTO v1_templates (family_id, external_id, name, block_number, difficulty_score)
  VALUES (_family_id, 'tmp_minimalist_2_day_athletic_v1', 'Minimalist Athletic 2-Day', 1, 5)
  ON CONFLICT (external_id) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO _template_id;

  -- Day A: unilateral + horizontal + anti-extension + finisher
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 1, 'FullBodyGenFit')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Unilateral_Squat_Lunge',         true,  'PrimeCompound',     'Double_Progression', 3, 6,  8,  7, 120),
    (_day_id, 1, 'Primary_Horizontal_Press',        true,  'PrimeCompound',     'Double_Progression', 3, 6,  8,  8, 120),
    (_day_id, 2, 'Primary_Horizontal_Pull',         true,  'SecondaryCompound', 'Double_Progression', 3, 8,  12, 8,  90),
    (_day_id, 3, 'Trunk_Anti_Extension',            false, 'Isolation',         'Rep_Goal',           3, 30, 60, 8,  60),
    (_day_id, 4, 'Conditioning_Metabolic_Finisher', false, 'Isolation',         'Density',            1, 1,  1,  9,   0);

  -- Day B: bilateral hinge + vertical + flexion core + finisher
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 2, 'FullBodyGenFit')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Bilateral_Hinge',         true,  'PrimeCompound',     'Double_Progression', 3, 5,  8,  7, 180),
    (_day_id, 1, 'Primary_Vertical_Press',          true,  'PrimeCompound',     'Double_Progression', 3, 6,  8,  8, 120),
    (_day_id, 2, 'Primary_Vertical_Pull',           true,  'SecondaryCompound', 'Double_Progression', 3, 8,  12, 8,  90),
    (_day_id, 3, 'Trunk_Flexion',                   false, 'Isolation',         'Rep_Goal',           3, 15, 20, 8,  60),
    (_day_id, 4, 'Conditioning_Metabolic_Finisher', false, 'Isolation',         'Density',            1, 1,  1,  9,   0);

END
$$;
