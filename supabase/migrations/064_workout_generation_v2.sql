-- ============================================================
-- Migration 064: Workout Generation Engine v2.1
-- Adds missing exercise columns, GIN indexes, and new tables:
--   user_profiles, user_programs, workout_sessions, exercise_progressions
-- All DDL uses IF NOT EXISTS for safety.
-- ============================================================

-- ----------------------------------------------------------
-- 1. Extend exercises table
-- ----------------------------------------------------------
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS aliases              TEXT[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS difficulty           INTEGER   CHECK (difficulty BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS primary_muscles      TEXT[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS secondary_muscles    TEXT[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS split_tags           TEXT[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS equipment_options    TEXT[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS technique_compatibility TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS alternative_exercise_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS experience_min       TEXT      DEFAULT 'beginner'
    CHECK (experience_min IN ('beginner','intermediate','advanced')),
  ADD COLUMN IF NOT EXISTS popularity_score     INTEGER   DEFAULT 50
    CHECK (popularity_score BETWEEN 1 AND 100),
  ADD COLUMN IF NOT EXISTS force_type           TEXT      CHECK (force_type IN ('push','pull','static')),
  ADD COLUMN IF NOT EXISTS is_unilateral        BOOLEAN   DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_spotter     BOOLEAN   DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS joint_stress_level   INTEGER   DEFAULT 2
    CHECK (joint_stress_level BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS beginner_progression_of UUID  REFERENCES exercises(id),
  ADD COLUMN IF NOT EXISTS is_system_exercise   BOOLEAN   DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS media_source         TEXT      DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS movement_pattern     TEXT,
  ADD COLUMN IF NOT EXISTS created_by           UUID      REFERENCES auth.users(id) ON DELETE SET NULL;

-- ----------------------------------------------------------
-- 2. GIN indexes on array columns (CRITICAL for query perf)
-- ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_exercises_split_tags
  ON exercises USING GIN(split_tags);

CREATE INDEX IF NOT EXISTS idx_exercises_equipment_options
  ON exercises USING GIN(equipment_options);

CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscles
  ON exercises USING GIN(primary_muscles);

CREATE INDEX IF NOT EXISTS idx_exercises_technique_compat
  ON exercises USING GIN(technique_compatibility);

CREATE INDEX IF NOT EXISTS idx_exercises_popularity
  ON exercises (popularity_score DESC);

CREATE INDEX IF NOT EXISTS idx_exercises_experience_difficulty
  ON exercises (experience_min, difficulty);

-- ----------------------------------------------------------
-- 3. user_profiles (self-serve onboarding — NOT client_onboarding)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Goal & Training
  primary_goal            TEXT CHECK (primary_goal IN ('lose_fat','build_muscle','maintain','performance','wellness')),
  secondary_goal          TEXT,
  experience_level        TEXT CHECK (experience_level IN ('beginner','intermediate','advanced')),
  training_age_years      NUMERIC(4,1),
  days_per_week           INTEGER CHECK (days_per_week BETWEEN 2 AND 7),
  training_days           TEXT[]    DEFAULT '{}',
  rest_days               TEXT[]    DEFAULT '{}',
  session_length_min      INTEGER   CHECK (session_length_min IN (30,45,60,75,90)),
  preferred_split         TEXT,

  -- Equipment
  equipment_type          TEXT CHECK (equipment_type IN ('full_gym','home','bodyweight','travel')),
  specific_equipment      TEXT[]    DEFAULT '{}',

  -- Body Stats
  age                     INTEGER,
  biological_sex          TEXT CHECK (biological_sex IN ('male','female','prefer_not_to_say')),
  height_cm               NUMERIC(5,1),
  weight_kg               NUMERIC(5,1),
  goal_weight_kg          NUMERIC(5,1),
  body_fat_estimate       TEXT,

  -- Recovery Factors (used to scale volume)
  activity_level          TEXT CHECK (activity_level IN ('sedentary','lightly_active','moderately_active','very_active')),
  avg_sleep_hours         NUMERIC(3,1),
  stress_level            INTEGER CHECK (stress_level BETWEEN 1 AND 10),
  job_physical_demand     TEXT CHECK (job_physical_demand IN ('desk','light','moderate','heavy')),

  -- Preferences
  priority_muscles        TEXT[]    DEFAULT '{}',
  lagging_muscles         TEXT[]    DEFAULT '{}',
  exercises_to_avoid      TEXT[]    DEFAULT '{}',
  preferred_exercises     TEXT[]    DEFAULT '{}',
  injuries                TEXT,
  movement_restrictions   TEXT,

  -- Metadata
  onboarding_completed    BOOLEAN   DEFAULT FALSE,
  onboarding_completed_at TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own their profile" ON user_profiles;
CREATE POLICY "Users own their profile"
  ON user_profiles FOR ALL
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------
-- 4. user_programs (self-serve — separate from client_programs)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_programs (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  name                        TEXT NOT NULL,
  split_type                  TEXT NOT NULL,
  goal                        TEXT NOT NULL,
  experience_level            TEXT NOT NULL,
  training_days               TEXT[]    DEFAULT '{}',
  rest_days                   TEXT[]    DEFAULT '{}',

  -- Duration
  total_weeks                 INTEGER   DEFAULT 12,
  current_week                INTEGER   DEFAULT 1,
  started_at                  DATE,
  expected_end_at             DATE,

  -- Program Data
  full_program_json           JSONB     NOT NULL,
  generation_profile_snapshot JSONB,

  -- Versioning & Traceability
  schema_version              TEXT      DEFAULT 'v2.1',
  ai_prompt_version           TEXT,
  generation_method           TEXT CHECK (generation_method IN ('ai_refined','rule_based')),

  -- Status
  is_active                   BOOLEAN   DEFAULT TRUE,
  is_completed                BOOLEAN   DEFAULT FALSE,

  -- Quality Metrics
  push_pull_ratio             NUMERIC(4,2),
  substitution_count          INTEGER   DEFAULT 0,
  sessions_completed          INTEGER   DEFAULT 0,
  exercises_skipped_count     INTEGER   DEFAULT 0,

  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own their programs" ON user_programs;
CREATE POLICY "Users own their programs"
  ON user_programs FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_programs_user_active
  ON user_programs(user_id, is_active);

-- ----------------------------------------------------------
-- 5. workout_sessions (drives auto-progression)
-- ----------------------------------------------------------
-- workout_sessions: create if new, or patch all v2 columns if table already exists
CREATE TABLE IF NOT EXISTS workout_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add each v2 column idempotently — safe whether table was just created or pre-existed
ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS program_id         UUID REFERENCES user_programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS day_type           TEXT,
  ADD COLUMN IF NOT EXISTS week_number        INTEGER,
  ADD COLUMN IF NOT EXISTS day_of_week        TEXT,
  ADD COLUMN IF NOT EXISTS started_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_min       INTEGER,
  ADD COLUMN IF NOT EXISTS is_completed       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS completion_percent INTEGER,
  ADD COLUMN IF NOT EXISTS rpe_overall        INTEGER,
  ADD COLUMN IF NOT EXISTS energy_level       INTEGER,
  ADD COLUMN IF NOT EXISTS notes              TEXT,
  ADD COLUMN IF NOT EXISTS sets_log           JSONB;

ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own their sessions" ON workout_sessions;
CREATE POLICY "Users own their sessions"
  ON workout_sessions FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_program
  ON workout_sessions(user_id, program_id);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_completed_at
  ON workout_sessions(user_id, completed_at DESC);

-- ----------------------------------------------------------
-- 6. exercise_progressions (per-user weight/reps tracking)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS exercise_progressions (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                      UUID REFERENCES auth.users(id),
  exercise_id                  UUID REFERENCES exercises(id),

  -- Best performance ever
  best_weight_kg               NUMERIC(6,2),
  best_reps                    INTEGER,
  estimated_1rm                NUMERIC(6,2),

  -- Current program working weight
  current_working_weight_kg    NUMERIC(6,2),
  current_rep_range            TEXT,
  sessions_at_current_weight   INTEGER DEFAULT 0,
  ready_for_progression        BOOLEAN DEFAULT FALSE,

  -- History
  last_performed_at            TIMESTAMPTZ,
  total_sessions               INTEGER DEFAULT 0,

  updated_at                   TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, exercise_id)
);

ALTER TABLE exercise_progressions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own their progressions" ON exercise_progressions;
CREATE POLICY "Users own their progressions"
  ON exercise_progressions FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_exercise_progressions_user
  ON exercise_progressions(user_id);

-- ----------------------------------------------------------
-- 7. RLS for exercises (system vs. user-created)
-- ----------------------------------------------------------
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System exercises readable by all" ON exercises;
CREATE POLICY "System exercises readable by all"
  ON exercises FOR SELECT
  USING (auth.role() = 'authenticated' AND is_system_exercise = TRUE);

DROP POLICY IF EXISTS "Users CRUD own exercises" ON exercises;
CREATE POLICY "Users CRUD own exercises"
  ON exercises FOR ALL
  USING (auth.uid()::text = (created_by::text) AND is_system_exercise = FALSE);
