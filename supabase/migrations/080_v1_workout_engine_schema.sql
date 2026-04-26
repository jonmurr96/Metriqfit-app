-- Migration 080: V1 Workout Engine Schema
-- Freezes canonical enums from types.ts and scaffolds core architecture.

-- 1. ENUMS (Mirroring V1 Engine Types)
CREATE TYPE experience_level AS ENUM ('Beginner', 'Intermediate', 'Advanced');
CREATE TYPE goal_bucket AS ENUM ('Hypertrophy', 'FatLoss', 'Strength', 'GenFitness', 'Recomp', 'Athletic');
CREATE TYPE training_style AS ENUM ('FullBody', 'UpperLower', 'PPL', 'BroSplit', 'Auto');
CREATE TYPE lift_comfort AS ENUM ('BarbellAdv', 'BarbellBasic', 'MachineDB', 'NoBarbell');
CREATE TYPE session_environment AS ENUM ('Commercial', 'AptHotel', 'Home', 'Bodyweight');
CREATE TYPE progression_model AS ENUM ('Linear_Load', 'Double_Progression', 'Step', 'Rep_Goal', 'Top_Set_Backoff', 'Mechanical_BW', 'Tempo', 'Density');
CREATE TYPE day_type AS ENUM ('UpperStrength', 'UpperHypertrophy', 'LowerStrength', 'LowerHypertrophy', 'Push', 'Pull', 'Legs', 'FullBodyStrength', 'FullBodyGenFit', 'Conditioning', 'Recovery');
CREATE TYPE slot_archetype AS ENUM ('PrimeCompound', 'SecondaryCompound', 'Isolation', 'Finisher');
CREATE TYPE fatigue_cost AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE setup_complexity AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE exercise_tier AS ENUM ('T1', 'T2', 'T3', 'T4A', 'T4B');
CREATE TYPE equipment_category AS ENUM ('Barbell', 'DB', 'Machine', 'Cable', 'BW', 'Misc');
CREATE TYPE replacement_group AS ENUM (
  'Primary_Bilateral_Squat', 'Primary_Bilateral_Hinge', 'Primary_Horizontal_Press',
  'Primary_Vertical_Press', 'Primary_Horizontal_Pull', 'Primary_Vertical_Pull',
  'Unilateral_Squat_Lunge', 'Unilateral_Hinge', 'Isolation_Chest_Fly',
  'Isolation_Lateral_Delt', 'Isolation_Bicep_Flexion', 'Isolation_Tricep_Extension',
  'Isolation_Hamstring_Curl', 'Isolation_Quad_Extension', 'Isolation_Calf_Raise',
  'Trunk_Flexion', 'Trunk_Anti_Extension', 'Conditioning_Metabolic_Finisher'
);
CREATE TYPE movement_pattern AS ENUM ('Squat', 'Hinge', 'HPress', 'VPress', 'HPull', 'VPull', 'Iso', 'Core', 'Cond');

-- 2. TABLES

-- Onboarding Profiles V1
CREATE TABLE v1_onboarding_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  experience_level experience_level NOT NULL,
  primary_goal goal_bucket NOT NULL,
  secondary_goal goal_bucket,
  days_per_week INT NOT NULL CHECK (days_per_week >= 2 AND days_per_week <= 6),
  preferred_style training_style NOT NULL,
  lift_comfort lift_comfort NOT NULL,
  environment session_environment NOT NULL,
  contraindications TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Plan Families V1
CREATE TABLE v1_plan_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  goal_bucket goal_bucket NOT NULL,
  training_style training_style NOT NULL,
  days_per_week INT NOT NULL,
  lift_comfort lift_comfort NOT NULL,
  environment session_environment NOT NULL,
  progression_model progression_model NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Templates V1
CREATE TABLE v1_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES v1_plan_families(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  block_number INT NOT NULL DEFAULT 1,
  difficulty_score INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workout Days V1
CREATE TABLE v1_workout_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES v1_templates(id) ON DELETE CASCADE NOT NULL,
  day_number INT NOT NULL,
  day_type day_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Template Slots V1
CREATE TABLE v1_template_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_day_id UUID REFERENCES v1_workout_days(id) ON DELETE CASCADE NOT NULL,
  order_index INT NOT NULL,
  architectural_group replacement_group NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  archetype slot_archetype NOT NULL,
  progression_model progression_model NOT NULL,
  sets INT NOT NULL,
  reps_min INT NOT NULL,
  reps_max INT NOT NULL,
  target_rpe NUMERIC NOT NULL,
  rest_seconds INT NOT NULL,
  timer_cap_seconds INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exercises V1
CREATE TABLE v1_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  movement_pattern movement_pattern NOT NULL,
  architectural_group replacement_group NOT NULL,
  equipment_category equipment_category NOT NULL,
  is_unilateral BOOLEAN NOT NULL DEFAULT false,
  setup_complexity setup_complexity NOT NULL,
  fatigue_cost fatigue_cost NOT NULL,
  tier exercise_tier NOT NULL,
  progression_types progression_model[] NOT NULL,
  contraindications TEXT[] DEFAULT '{}'::TEXT[],
  estimated_duration_seconds INT NOT NULL DEFAULT 45,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Configurations
ALTER TABLE v1_onboarding_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE v1_plan_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE v1_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE v1_workout_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE v1_template_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE v1_exercises ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own profiles
CREATE POLICY "Users can manage their own profiles" 
ON v1_onboarding_profiles FOR ALL TO authenticated 
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Everything else is read-only for now until deeper user-assigned tables are scaffolded
CREATE POLICY "Public Read All Plan Families" ON v1_plan_families FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public Read All Templates" ON v1_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public Read All Workout Days" ON v1_workout_days FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public Read All Template Slots" ON v1_template_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public Read All Exercises" ON v1_exercises FOR SELECT TO authenticated USING (true);
