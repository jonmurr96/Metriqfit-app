-- 089_paywall_completion_tracking.sql
-- Adds explicit paywall completion tracking and mid-onboarding resume support.
-- paywall_completed_at: set when user makes a plan selection (free or paid) on the paywall.
-- last_onboarding_step: the route segment the user should resume to on next launch.

ALTER TABLE onboarding_answers
  ADD COLUMN IF NOT EXISTS paywall_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_onboarding_step TEXT;

-- Backfill existing users who already passed through the paywall.
-- Any user with a subscriptions row is treated as having completed the paywall
-- (covers both legitimate paid users and any who were bypassed by the RC auto-sync bug).
UPDATE onboarding_answers oa
SET paywall_completed_at = COALESCE(
  (SELECT s.created_at
   FROM subscriptions s
   WHERE s.user_id = oa.user_id
   ORDER BY s.created_at ASC
   LIMIT 1),
  NOW()
)
WHERE oa.paywall_completed_at IS NULL
  AND EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = oa.user_id);
