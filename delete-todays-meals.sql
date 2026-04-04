-- WARNING: This will delete all meals logged today (March 23, 2026)
-- Only run this if you want to clear today's data and start fresh

DELETE FROM meal_log_items 
WHERE meal_log_id IN (
  SELECT id FROM meal_logs 
  WHERE logged_at >= '2026-03-23T00:00:00' 
  AND logged_at < '2026-03-24T00:00:00'
);

DELETE FROM meal_logs 
WHERE logged_at >= '2026-03-23T00:00:00' 
AND logged_at < '2026-03-24T00:00:00';

-- Return deleted count
SELECT COUNT(*) as meals_deleted FROM meal_logs 
WHERE logged_at >= '2026-03-23T00:00:00' 
AND logged_at < '2026-03-24T00:00:00';
