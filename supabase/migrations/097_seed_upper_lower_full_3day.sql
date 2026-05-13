-- 097_seed_upper_lower_full_3day.sql
-- Seeds a 3-day Upper / Lower / Full Body hybrid family.
--
-- Rationale: 3-day PPL cycles awkwardly into 4 days; 3-day Upper/Lower leaves
-- a wasted slot. The U/L/Full triad solves both: upper body and lower body each
-- hit 2×/week across three sessions, and the full-body day fills the frequency
-- gap cleanly.
--
--   Day 1 Upper  — horizontal press prime + vertical pull + lateral delt + bicep
--   Day 2 Lower  — squat + hinge + unilateral + hamstring curl + calf
--   Day 3 Full   — vertical press + horizontal pull + unilateral hinge + tricep + core
--
-- Muscle frequency across the week:
--   Chest      2× (Upper + Full)
--   Back       2× (Upper + Full)
--   Legs       2× (Lower + Full)
--   Shoulders  2× (Upper + Full)
--   Arms       2× (Upper + Full)
--
-- Depends on:
--   • 080_v1_workout_engine_schema.sql
--   • 086_add_day_type_fullbodyhypertrophy.sql — FullBodyHypertrophy enum value

INSERT INTO v1_plan_families (external_id, name, goal_bucket, training_style, days_per_week, lift_comfort, environment, progression_model)
VALUES (
  'fam_upper_lower_full_3day',
  'Upper / Lower / Full (3-Day)',
  'Hypertrophy',
  'UpperLower',
  3,
  'MachineDB',
  'Commercial',
  'Double_Progression'
)
ON CONFLICT (external_id) DO NOTHING;

DO $$
DECLARE
  _family_id   UUID;
  _template_id UUID;
  _day_id      UUID;
BEGIN
  SELECT id INTO _family_id FROM v1_plan_families WHERE external_id = 'fam_upper_lower_full_3day';
  IF _family_id IS NULL THEN RAISE EXCEPTION 'Family fam_upper_lower_full_3day not found'; END IF;

  INSERT INTO v1_templates (family_id, external_id, name, block_number, difficulty_score)
  VALUES (_family_id, 'tmp_upper_lower_full_3day_v1', 'Upper / Lower / Full 3-Day', 1, 4)
  ON CONFLICT (external_id) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO _template_id;

  -- ── Day 1: Upper (horizontal press prime) ─────────────────────────────────
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 1, 'UpperHypertrophy')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Horizontal_Press',   true,  'PrimeCompound',     'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 1, 'Primary_Vertical_Pull',       true,  'PrimeCompound',     'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 2, 'Isolation_Lateral_Delt',      false, 'Isolation',         'Double_Progression', 3, 12, 20, 9,  60),
    (_day_id, 3, 'Isolation_Bicep_Flexion',     false, 'Isolation',         'Double_Progression', 3, 10, 15, 9,  60),
    (_day_id, 4, 'Trunk_Anti_Extension',        false, 'Isolation',         'Rep_Goal',           2, 30, 45, 8,  60);

  -- ── Day 2: Lower ──────────────────────────────────────────────────────────
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 2, 'LowerHypertrophy')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Bilateral_Squat',   true,  'PrimeCompound',     'Double_Progression', 4, 6,  10, 8, 150),
    (_day_id, 1, 'Primary_Bilateral_Hinge',   true,  'PrimeCompound',     'Double_Progression', 3, 6,  10, 8, 150),
    (_day_id, 2, 'Unilateral_Squat_Lunge',    true,  'SecondaryCompound', 'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 3, 'Isolation_Hamstring_Curl',  false, 'Isolation',         'Double_Progression', 3, 12, 15, 9,  75),
    (_day_id, 4, 'Isolation_Calf_Raise',      false, 'Isolation',         'Double_Progression', 3, 15, 25, 9,  60);

  -- ── Day 3: Full Body (vertical press prime — balances Day 1 horizontal) ───
  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 3, 'FullBodyHypertrophy')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots
    (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
    (_day_id, 0, 'Primary_Vertical_Press',     true,  'PrimeCompound',     'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 1, 'Primary_Horizontal_Pull',    true,  'PrimeCompound',     'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 2, 'Unilateral_Hinge',           true,  'SecondaryCompound', 'Double_Progression', 3, 8,  12, 8, 120),
    (_day_id, 3, 'Isolation_Tricep_Extension', false, 'Isolation',         'Double_Progression', 3, 10, 15, 9,  60),
    (_day_id, 4, 'Trunk_Flexion',              false, 'Isolation',         'Rep_Goal',           2, 15, 25, 8,  60);

END;
$$;
