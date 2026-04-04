-- Migration 082: V1 Workout Engine Tracking schemas
-- Creates missing tables for Mechanic dynamic subs and Validator tracking according to the implementation plan

-- Exercise Substitutions V1
-- Allows the Mechanic to substitute blocked or highly-fatigued exercises
CREATE TABLE v1_exercise_substitutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID REFERENCES v1_exercises(id) ON DELETE CASCADE NOT NULL,
    substitute_exercise_id UUID REFERENCES v1_exercises(id) ON DELETE CASCADE NOT NULL,
    preference_rank INT NOT NULL DEFAULT 1,
    restriction_reason TEXT,
    is_global BOOLEAN NOT NULL DEFAULT true,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(exercise_id, substitute_exercise_id, user_id)
);

-- User Movement Tracks V1
-- Used by Validator and Librarian to look at past maxes and progress
CREATE TABLE v1_user_movement_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    exercise_id UUID REFERENCES v1_exercises(id) ON DELETE CASCADE NOT NULL,
    estimated_1rm NUMERIC,
    recent_max_reps INT,
    recent_load NUMERIC,
    last_performed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, exercise_id)
);

-- Adaptation History V1
-- Long-term tracking for which blocks a user has run
CREATE TABLE v1_adaptation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    template_id UUID REFERENCES v1_templates(id) ON DELETE CASCADE NOT NULL,
    block_number INT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    completion_status TEXT NOT NULL DEFAULT 'in_progress',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE v1_exercise_substitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE v1_user_movement_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE v1_adaptation_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public Read All Global Exercise Subs" 
ON v1_exercise_substitutions FOR SELECT TO authenticated 
USING (is_global = true OR user_id = auth.uid());

CREATE POLICY "Users govern own movement tracks"
ON v1_user_movement_tracks FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users govern own adaptation history"
ON v1_adaptation_history FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
