-- V1 Workout Plan Activation Repair Script
-- This script identifies and repairs V1 workout plans that were stored
-- with lifecycle_state = 'live' but is_active = false

-- =====================================================
-- STEP 1: Identify affected plans
-- =====================================================

-- Find V1 plans stored as 'live' but not activated
SELECT 
    uwp.id as plan_id,
    uwp.user_id,
    uwp.created_at,
    uwp.is_active,
    uwp.lifecycle_state,
    uwp.source_model,
    uwp.name,
    (
        SELECT COUNT(*) 
        FROM user_workout_plan_days uwpd 
        WHERE uwpd.plan_id = uwp.id
    ) as day_count,
    (
        SELECT COUNT(*) 
        FROM user_workout_plan_schedule uwps 
        WHERE uwps.plan_id = uwp.id
    ) as schedule_count
FROM user_workout_plans uwp
WHERE uwp.source_model = 'v1_architect'
  AND uwp.lifecycle_state = 'live'
  AND uwp.is_active = false
ORDER BY uwp.created_at DESC;

-- =====================================================
-- STEP 2: Count affected users
-- =====================================================

SELECT 
    COUNT(DISTINCT user_id) as affected_users,
    COUNT(*) as affected_plans
FROM user_workout_plans
WHERE source_model = 'v1_architect'
  AND lifecycle_state = 'live'
  AND is_active = false;

-- =====================================================
-- STEP 3: Repair strategy options
-- =====================================================

-- OPTION A: Activate the most recent V1 plan per user
-- (if they have no currently active workout plan)

-- First, verify which users have no active workout plan
WITH users_with_no_active_plan AS (
    SELECT DISTINCT uwp.user_id
    FROM user_workout_plans uwp
    WHERE uwp.source_model = 'v1_architect'
      AND uwp.lifecycle_state = 'live'
      AND uwp.is_active = false
      AND NOT EXISTS (
          SELECT 1 
          FROM user_workout_plans active
          WHERE active.user_id = uwp.user_id
            AND active.is_active = true
      )
)
SELECT 
    uwp.user_id,
    uwp.id as plan_id,
    uwp.created_at
FROM user_workout_plans uwp
INNER JOIN users_with_no_active_plan u ON u.user_id = uwp.user_id
WHERE uwp.source_model = 'v1_architect'
  AND uwp.lifecycle_state = 'live'
  AND uwp.is_active = false
  AND uwp.created_at = (
      SELECT MAX(created_at)
      FROM user_workout_plans sub
      WHERE sub.user_id = uwp.user_id
        AND sub.source_model = 'v1_architect'
        AND sub.lifecycle_state = 'live'
        AND sub.is_active = false
  );

-- =====================================================
-- STEP 4: Execute repair (RUN ONLY AFTER VERIFYING STEP 3)
-- =====================================================

-- BEGIN TRANSACTION;

-- Archive any existing active plans for affected users
-- UPDATE user_workout_plans
-- SET 
--     is_active = false,
--     lifecycle_state = 'archived',
--     updated_at = NOW()
-- WHERE is_active = true
--   AND user_id IN (
--       SELECT DISTINCT user_id
--       FROM user_workout_plans
--       WHERE source_model = 'v1_architect'
--         AND lifecycle_state = 'live'
--         AND is_active = false
--   );

-- Activate the most recent V1 plan per user
-- UPDATE user_workout_plans
-- SET 
--     is_active = true,
--     lifecycle_state = 'live',
--     replaces_plan_id = NULL,
--     updated_at = NOW()
-- WHERE id IN (
--     SELECT latest_plan.id
--     FROM (
--         SELECT 
--             uwp.id,
--             uwp.user_id,
--             ROW_NUMBER() OVER (
--                 PARTITION BY uwp.user_id 
--                 ORDER BY uwp.created_at DESC
--             ) as rn
--         FROM user_workout_plans uwp
--         WHERE uwp.source_model = 'v1_architect'
--           AND uwp.lifecycle_state = 'live'
--           AND uwp.is_active = false
--     ) latest_plan
--     WHERE latest_plan.rn = 1
-- );

-- COMMIT;

-- =====================================================
-- STEP 5: Verify repair
-- =====================================================

-- Check for any remaining unactivated V1 plans
-- SELECT 
--     COUNT(*) as remaining_inactive_v1_plans
-- FROM user_workout_plans
-- WHERE source_model = 'v1_architect'
--   AND lifecycle_state = 'live'
--   AND is_active = false;

-- Check activated plans
-- SELECT 
--     COUNT(*) as now_active_v1_plans
-- FROM user_workout_plans
-- WHERE source_model = 'v1_architect'
--   AND lifecycle_state = 'live'
--   AND is_active = true
--   AND updated_at > NOW() - INTERVAL '1 hour';
