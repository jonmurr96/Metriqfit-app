-- ============================================================
-- Migration 066: Auto-Progression + Deload Trigger System
-- ============================================================
-- Fires after a workout session is marked completed.
-- Updates current_week on the user's plan and inserts a
-- deload_microcycle recommendation at weeks 4, 8, and 12.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Ensure user_workout_plans has current_week column
-- ------------------------------------------------------------
ALTER TABLE user_workout_plans
  ADD COLUMN IF NOT EXISTS current_week INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------
-- 2. Ensure workout_adaptation_recommendations has plan_id
-- ------------------------------------------------------------
ALTER TABLE workout_adaptation_recommendations
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES user_workout_plans(id) ON DELETE CASCADE;

-- Index to speed up pending-deload lookups
CREATE INDEX IF NOT EXISTS idx_war_plan_type_status
  ON workout_adaptation_recommendations (plan_id, recommendation_type, status)
  WHERE status = 'pending';

-- ------------------------------------------------------------
-- 3. Auto-deload trigger function
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_trigger_deload()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_id            UUID;
  v_plan_start         DATE;
  v_current_week       INTEGER;
  v_previous_week      INTEGER;
  v_existing_count     INTEGER;
  v_reduce_pct         INTEGER;
BEGIN
  -- Only act on newly-completed workout sessions
  IF NEW.status IS DISTINCT FROM 'completed' THEN RETURN NEW; END IF;
  IF OLD.status = 'completed'                THEN RETURN NEW; END IF;
  IF NEW.session_type IS DISTINCT FROM 'workout' THEN RETURN NEW; END IF;

  v_plan_id := NEW.plan_id;
  IF v_plan_id IS NULL THEN RETURN NEW; END IF;

  -- Fetch active plan start date
  SELECT start_date
    INTO v_plan_start
    FROM user_workout_plans
   WHERE id = v_plan_id
     AND is_active = TRUE;

  IF v_plan_start IS NULL THEN RETURN NEW; END IF;

  -- Compute current week (1-indexed, minimum 1)
  v_current_week := GREATEST(1, FLOOR((CURRENT_DATE - v_plan_start)::INTEGER / 7) + 1);

  -- Grab what week the plan thinks it's on
  SELECT COALESCE(current_week, 1)
    INTO v_previous_week
    FROM user_workout_plans
   WHERE id = v_plan_id;

  -- Keep current_week up to date (only advance, never go back)
  IF v_current_week > v_previous_week THEN
    UPDATE user_workout_plans
       SET current_week = v_current_week,
           updated_at   = NOW()
     WHERE id = v_plan_id;
  END IF;

  -- Deload trigger: week 4, 8, or 12, first time we cross that boundary
  IF v_current_week IN (4, 8, 12) AND v_previous_week < v_current_week THEN

    -- Guard: skip if a pending deload already exists for this plan in the last 7 days
    SELECT COUNT(*)
      INTO v_existing_count
      FROM workout_adaptation_recommendations
     WHERE plan_id             = v_plan_id
       AND recommendation_type = 'deload_microcycle'
       AND status              = 'pending'
       AND created_at          > NOW() - INTERVAL '7 days';

    IF v_existing_count = 0 THEN

      v_reduce_pct := CASE
        WHEN v_current_week =  4 THEN 20
        WHEN v_current_week =  8 THEN 25
        WHEN v_current_week = 12 THEN 30
        ELSE 20
      END;

      INSERT INTO workout_adaptation_recommendations
        (user_id, plan_id, recommendation_type, payload_json, rationale, status)
      SELECT
        uwp.user_id,
        v_plan_id,
        'deload_microcycle',
        jsonb_build_object(
          'trigger_week',          v_current_week,
          'reduce_volume_percent', v_reduce_pct,
          'auto_triggered',        TRUE
        ),
        'Week ' || v_current_week || ' deload — scheduled recovery week to consolidate gains and reduce fatigue accumulation. Volume reduced by ' || v_reduce_pct || '%.',
        'pending'
      FROM user_workout_plans uwp
     WHERE uwp.id = v_plan_id;

    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- 4. Attach trigger to user_workout_plan_schedule
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_auto_deload ON user_workout_plan_schedule;

CREATE TRIGGER trg_auto_deload
  AFTER UPDATE OF status
  ON user_workout_plan_schedule
  FOR EACH ROW
  EXECUTE FUNCTION auto_trigger_deload();

-- ------------------------------------------------------------
-- 5. Grant execute to authenticated role (SECURITY DEFINER
--    runs as owner, but explicit grant is best practice)
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION auto_trigger_deload() TO authenticated;
