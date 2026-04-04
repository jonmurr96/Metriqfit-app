-- ============================================================
-- Migration 067: Deload Week Schedule Support
-- ============================================================
-- Adds non-destructive deload flags to user_workout_plan_schedule
-- so a deload week is applied per-session without permanently
-- mutating user_workout_plan_exercises sets_target values.
-- ============================================================

-- 1. Deload flags on schedule entries
ALTER TABLE user_workout_plan_schedule
  ADD COLUMN IF NOT EXISTS is_deload_week   BOOLEAN       DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS volume_multiplier NUMERIC(4,2) DEFAULT 1.00
    CHECK (volume_multiplier > 0 AND volume_multiplier <= 1);

-- 2. Index for fast deload-week lookups
CREATE INDEX IF NOT EXISTS idx_schedule_deload
  ON user_workout_plan_schedule (plan_id, is_deload_week)
  WHERE is_deload_week = TRUE;

-- 3. Add schedule_id back-link on workout_sessions (if missing from 027)
ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS schedule_id UUID
    REFERENCES user_workout_plan_schedule(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workout_sessions_schedule_id
  ON workout_sessions (schedule_id)
  WHERE schedule_id IS NOT NULL;
