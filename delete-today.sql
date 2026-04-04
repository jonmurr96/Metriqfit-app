-- Delete all meal log items for today
DELETE FROM meal_log_items 
WHERE meal_log_id IN (
  SELECT id FROM meal_logs 
  WHERE logged_at >= '2026-03-23T00:00:00' 
  AND logged_at < '2026-03-24T00:00:00'
);

-- Delete all meal logs for today
DELETE FROM meal_logs 
WHERE logged_at >= '2026-03-23T00:00:00' 
AND logged_at < '2026-03-24T00:00:00';

-- Verify deletion
SELECT COUNT(*) as remaining_meals FROM meal_logs 
WHERE logged_at >= '2026-03-23T00:00:00' 
AND logged_at < '2026-03-24T00:00:00';
