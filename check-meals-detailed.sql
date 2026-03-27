-- Get ALL meal logs with details
SELECT 
    ml.id,
    ml.user_id,
    ml.meal_slot,
    ml.logged_at AT TIME ZONE 'America/Los_Angeles' as logged_at_pst,
    COUNT(mli.id) as items,
    SUM(mli.calories) as calories
FROM meal_logs ml
LEFT JOIN meal_log_items mli ON mli.meal_log_id = ml.id
WHERE ml.logged_at >= NOW() - INTERVAL '48 hours'
GROUP BY ml.id, ml.user_id, ml.meal_slot, ml.logged_at
ORDER BY ml.logged_at DESC;
