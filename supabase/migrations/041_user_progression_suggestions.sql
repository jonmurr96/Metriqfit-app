-- Migration: Progressive Overload Suggestion Tracking
-- Created: 2025-03-21
-- Purpose: Track AI-driven progression recommendations for weight/rep increases

-- Create user_progression_suggestions table
CREATE TABLE user_progression_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  session_exercise_id UUID REFERENCES session_exercises(id) ON DELETE SET NULL,

  -- Suggestion details
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('increase_weight', 'increase_reps', 'maintain', 'deload')),

  -- Previous performance snapshot
  previous_weight_lb NUMERIC(6,2),
  previous_reps INTEGER,
  previous_rpe NUMERIC(3,1),
  previous_volume_lb NUMERIC(10,2),

  -- Recommended next step
  suggested_weight_lb NUMERIC(6,2),
  suggested_reps INTEGER,

  -- Reasoning
  rationale TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  readiness_score INTEGER CHECK (readiness_score >= 0 AND readiness_score <= 100),

  -- Lifecycle tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'dismissed', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

  -- Metadata
  analysis_window_sessions INTEGER, -- how many sessions were analyzed
  last_session_date TIMESTAMPTZ,

  CONSTRAINT valid_suggestion_weights CHECK (
    (suggestion_type = 'increase_weight' AND suggested_weight_lb IS NOT NULL) OR
    (suggestion_type = 'increase_reps' AND suggested_reps IS NOT NULL) OR
    (suggestion_type IN ('maintain', 'deload'))
  )
);

-- Indexes for performance
CREATE INDEX idx_progression_suggestions_user_pending ON user_progression_suggestions(user_id, status) WHERE status = 'pending';
CREATE INDEX idx_progression_suggestions_exercise ON user_progression_suggestions(exercise_id);
CREATE INDEX idx_progression_suggestions_created_at ON user_progression_suggestions(created_at DESC);
CREATE INDEX idx_progression_suggestions_expires_at ON user_progression_suggestions(expires_at) WHERE status = 'pending';

-- RLS Policies
ALTER TABLE user_progression_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progression suggestions"
  ON user_progression_suggestions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own progression suggestions"
  ON user_progression_suggestions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert progression suggestions"
  ON user_progression_suggestions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Auto-expire suggestions after 7 days (cleanup function)
CREATE OR REPLACE FUNCTION expire_old_progression_suggestions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_progression_suggestions
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$;

-- Comment for documentation
COMMENT ON TABLE user_progression_suggestions IS 'Tracks AI-generated progressive overload suggestions for exercises based on performance trends';
COMMENT ON COLUMN user_progression_suggestions.readiness_score IS 'Algorithmic confidence score 0-100 indicating user readiness to progress';
COMMENT ON COLUMN user_progression_suggestions.analysis_window_sessions IS 'Number of recent sessions analyzed to generate this suggestion (typically 3-5)';
