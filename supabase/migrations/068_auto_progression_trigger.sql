-- ============================================================
-- Migration 068: Auto-Progression Trigger (Rep-Range Ceiling)
-- ============================================================
-- When a user logs a working set at or above their reps_max
-- target in 2+ distinct sessions within the last 21 days,
-- automatically insert an `increase_weight` recommendation
-- so the UI can surface a progression prompt.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Ensure exercise_progressions has the columns we'll update
-- ------------------------------------------------------------
ALTER TABLE exercise_progressions
  ADD COLUMN IF NOT EXISTS sessions_at_current_weight INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ready_for_progression       BOOLEAN   DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_performed_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS best_reps                   INTEGER,
  ADD COLUMN IF NOT EXISTS best_weight_kg              NUMERIC(6,2);

-- ------------------------------------------------------------
-- 2. Trigger function: fires after every workout set insert
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_check_progression()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id            UUID;
  v_exercise_id        UUID;
  v_reps_max           INTEGER;
  v_reps_min           INTEGER;
  v_plan_exercise_id   UUID;
  v_plan_id            UUID;
  v_sessions_at_top    INTEGER;
  v_weight_kg          NUMERIC;
BEGIN
  -- Skip warmup sets — only analyse working sets
  IF NEW.is_warmup = TRUE THEN RETURN NEW; END IF;

  -- Resolve session_exercise → user + exercise + rep targets
  SELECT
    ws.user_id,
    se.exercise_id,
    se.reps_max,
    se.reps_min,
    se.plan_exercise_id
  INTO v_user_id, v_exercise_id, v_reps_max, v_reps_min, v_plan_exercise_id
  FROM   session_exercises se
  JOIN   workout_sessions  ws ON ws.id = se.session_id
  WHERE  se.id = NEW.session_exercise_id;

  -- Can't proceed without user or a rep ceiling
  IF v_user_id IS NULL OR v_reps_max IS NULL THEN RETURN NEW; END IF;

  -- Resolve plan_id from the plan exercise (may be NULL for template sessions)
  IF v_plan_exercise_id IS NOT NULL THEN
    SELECT uwpe.plan_day_id
    INTO   v_plan_id
    FROM   user_workout_plan_exercises uwpe
    JOIN   user_workout_plan_days uwpd ON uwpd.id = uwpe.plan_day_id
    WHERE  uwpe.id = v_plan_exercise_id
    LIMIT  1;

    -- plan_id lives on user_workout_plan_days; grab it
    SELECT uwpd.plan_id
    INTO   v_plan_id
    FROM   user_workout_plan_exercises uwpe
    JOIN   user_workout_plan_days uwpd ON uwpd.id = uwpe.plan_day_id
    WHERE  uwpe.id = v_plan_exercise_id
    LIMIT  1;
  END IF;

  -- Convert lbs → kg for exercise_progressions (stored in kg)
  v_weight_kg := CASE
    WHEN NEW.weight_lb IS NOT NULL AND NEW.weight_lb > 0
    THEN ROUND((NEW.weight_lb / 2.20462)::NUMERIC, 2)
    ELSE NULL
  END;

  -- --------------------------------------------------------
  -- Update exercise_progressions row (upsert)
  -- Tracks running best + session count for this exercise
  -- --------------------------------------------------------
  INSERT INTO exercise_progressions
    (user_id, exercise_id, last_performed_at,
     best_reps, best_weight_kg,
     sessions_at_current_weight, ready_for_progression)
  VALUES
    (v_user_id, v_exercise_id, NOW(),
     NEW.reps, v_weight_kg,
     1, FALSE)
  ON CONFLICT (user_id, exercise_id) DO UPDATE SET
    last_performed_at           = NOW(),
    best_reps                   = GREATEST(exercise_progressions.best_reps, NEW.reps),
    best_weight_kg              = GREATEST(exercise_progressions.best_weight_kg, EXCLUDED.best_weight_kg),
    sessions_at_current_weight  = exercise_progressions.sessions_at_current_weight + 1,
    updated_at                  = NOW();

  -- --------------------------------------------------------
  -- Progression gate: did this set hit the rep ceiling?
  -- --------------------------------------------------------
  IF NEW.reps < v_reps_max THEN RETURN NEW; END IF;

  -- Count distinct completed sessions in last 21 days where
  -- the user logged ≥1 working set at reps_max for this exercise
  SELECT COUNT(DISTINCT ws2.id)
  INTO   v_sessions_at_top
  FROM   workout_sets         wset2
  JOIN   session_exercises    se2  ON se2.id  = wset2.session_exercise_id
  JOIN   workout_sessions     ws2  ON ws2.id  = se2.session_id
  WHERE  ws2.user_id       = v_user_id
    AND  se2.exercise_id   = v_exercise_id
    AND  wset2.is_warmup   = FALSE
    AND  wset2.reps        >= COALESCE(se2.reps_max, 9999)
    AND  ws2.finished_at   IS NOT NULL
    AND  ws2.started_at    > NOW() - INTERVAL '21 days';

  -- Require 2+ sessions — one lonely peak could be a fluke
  IF v_sessions_at_top < 2 THEN RETURN NEW; END IF;

  -- --------------------------------------------------------
  -- Dedup guard: skip if a pending increase_weight rec
  -- already exists for this exercise in the last 7 days
  -- --------------------------------------------------------
  IF EXISTS (
    SELECT 1
    FROM   workout_adaptation_recommendations
    WHERE  user_id              = v_user_id
      AND  recommendation_type  = 'increase_weight'
      AND  (payload_json->>'exercise_id') = v_exercise_id::TEXT
      AND  status               = 'pending'
      AND  created_at           > NOW() - INTERVAL '7 days'
  ) THEN
    RETURN NEW;
  END IF;

  -- --------------------------------------------------------
  -- Insert the progression recommendation
  -- --------------------------------------------------------
  INSERT INTO workout_adaptation_recommendations
    (user_id, plan_id, recommendation_type, payload_json, rationale, status)
  VALUES (
    v_user_id,
    v_plan_id,
    'increase_weight',
    jsonb_build_object(
      'exercise_id',       v_exercise_id,
      'sessions_at_top',   v_sessions_at_top,
      'current_reps_max',  v_reps_max,
      'current_reps_min',  v_reps_min,
      'auto_triggered',    TRUE
    ),
    'You''ve hit ' || v_reps_max || ' reps on this exercise in '
      || v_sessions_at_top
      || ' recent sessions — time to add weight and keep progressing.',
    'pending'
  );

  -- Mark ready_for_progression in exercise_progressions
  UPDATE exercise_progressions
     SET ready_for_progression = TRUE, updated_at = NOW()
   WHERE user_id = v_user_id AND exercise_id = v_exercise_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- 3. Attach trigger to workout_sets (after insert)
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_auto_progression ON workout_sets;

CREATE TRIGGER trg_auto_progression
  AFTER INSERT ON workout_sets
  FOR EACH ROW
  EXECUTE FUNCTION auto_check_progression();

-- ------------------------------------------------------------
-- 4. Grant execute
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION auto_check_progression() TO authenticated;
