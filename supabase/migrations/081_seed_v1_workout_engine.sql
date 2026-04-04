-- Migration 081: Seed V1 Workout Engine Data
-- Auto-generated from strictly typed TypeScript seeds to enforce exact schema matching.

-- 1. EXERCISES
INSERT INTO v1_exercises (external_id, name, movement_pattern, architectural_group, equipment_category, is_unilateral, setup_complexity, fatigue_cost, tier, progression_types, estimated_duration_seconds) VALUES
('ex_bb_back_squat', 'Barbell Back Squat', 'Squat', 'Primary_Bilateral_Squat', 'Barbell', false, 'High', 'High', 'T1', '{Linear_Load,Double_Progression,Top_Set_Backoff}', 60),
('ex_leg_press', 'Leg Press', 'Squat', 'Primary_Bilateral_Squat', 'Machine', false, 'Low', 'Medium', 'T1', '{Double_Progression,Linear_Load}', 45),
('ex_goblet_squat', 'Goblet Squat', 'Squat', 'Primary_Bilateral_Squat', 'DB', false, 'Low', 'Medium', 'T1', '{Double_Progression}', 45),
('ex_bb_deadlift', 'Barbell Deadlift', 'Hinge', 'Primary_Bilateral_Hinge', 'Barbell', false, 'High', 'High', 'T1', '{Linear_Load,Top_Set_Backoff}', 60),
('ex_bb_flat_bench', 'Barbell Bench Press', 'HPress', 'Primary_Horizontal_Press', 'Barbell', false, 'Medium', 'Medium', 'T1', '{Linear_Load,Double_Progression}', 60),
('ex_db_flat_bench', 'DB Flat Bench Press', 'HPress', 'Primary_Horizontal_Press', 'DB', false, 'Medium', 'Medium', 'T1', '{Double_Progression}', 60),
('ex_lat_pulldown', 'Lat Pulldown', 'VPull', 'Primary_Vertical_Pull', 'Cable', false, 'Low', 'Medium', 'T1', '{Double_Progression}', 45),
('ex_pull_up', 'Pull-Up', 'VPull', 'Primary_Vertical_Pull', 'BW', false, 'Medium', 'Medium', 'T1', '{Mechanical_BW,Rep_Goal}', 45),
('ex_cable_curl', 'Cable Bicep Curl', 'Iso', 'Isolation_Bicep_Flexion', 'Cable', false, 'Low', 'Low', 'T2', '{Double_Progression}', 30),
('ex_crunch', 'Basic Crunch', 'Core', 'Trunk_Flexion', 'BW', false, 'Low', 'Low', 'T1', '{Rep_Goal}', 30)
ON CONFLICT (external_id) DO NOTHING;

-- 2. PLAN FAMILIES
INSERT INTO v1_plan_families (external_id, name, goal_bucket, training_style, days_per_week, lift_comfort, environment, progression_model) VALUES
('fam_beginner_fullbody_v1', 'Beginner Full Body v1', 'GenFitness', 'FullBody', 3, 'BarbellAdv', 'Commercial', 'Linear_Load'),
('fam_longevity_upper_lower_v1', 'General Fitness Upper/Lower (Longevity Bias) v1', 'GenFitness', 'UpperLower', 4, 'MachineDB', 'Commercial', 'Double_Progression'),
('fam_hypertrophy_ppl_v1', 'Hypertrophy PPL v1', 'Hypertrophy', 'PPL', 6, 'BarbellAdv', 'Commercial', 'Double_Progression')
ON CONFLICT (external_id) DO NOTHING;

-- 3. TEMPLATES, DAYS, AND SLOTS
DO $$
DECLARE
  _family_id UUID;
  _template_id UUID;
  _day_id UUID;
BEGIN

  SELECT id INTO _family_id FROM v1_plan_families WHERE external_id = 'fam_beginner_fullbody_v1';
  IF _family_id IS NULL THEN
    RAISE EXCEPTION 'Family fam_beginner_fullbody_v1 not found';
  END IF;

  INSERT INTO v1_templates (family_id, external_id, name, block_number, difficulty_score)
  VALUES (_family_id, 'tpl_beginner_fullbody_v1_blk1', 'Beginner Full Body Phase 1', 1, 2)
  ON CONFLICT (external_id) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO _template_id;

  INSERT INTO v1_workout_days (template_id, day_number, day_type)
  VALUES (_template_id, 1, 'FullBodyStrength')
  RETURNING id INTO _day_id;

  INSERT INTO v1_template_slots (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)
  VALUES
  (_day_id, 0, 'Primary_Bilateral_Squat', true, 'PrimeCompound', 'Linear_Load', 3, 8, 10, 7, 120),
  (_day_id, 1, 'Primary_Horizontal_Press', true, 'SecondaryCompound', 'Linear_Load', 3, 8, 10, 7, 120),
  (_day_id, 2, 'Primary_Horizontal_Pull', true, 'SecondaryCompound', 'Linear_Load', 3, 10, 12, 8, 90),
  (_day_id, 3, 'Trunk_Flexion', true, 'Finisher', 'Rep_Goal', 3, 12, 15, 8, 60);

END
$$;
