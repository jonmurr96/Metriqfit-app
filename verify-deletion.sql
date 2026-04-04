-- Verify meals are deleted
SELECT 
    COUNT(*) as total_meals,
    SUM(CASE WHEN logged_at >= '2026-03-23T00:00:00' AND logged_at < '2026-03-24T00:00:00' THEN 1 ELSE 0 END) as todays_meals
FROM meal_logs;

-- Get total calories for today
SELECT 
    COALESCE(SUM(mli.calories), 0) as total_calories_today
FROM meal_logs ml
LEFT JOIN meal_log_items mli ON mli.meal_log_id = ml.id
WHERE ml.logged_at >= '2026-03-23T00:00:00' 
AND ml.logged_at < '2026-03-24T00:00:00';
