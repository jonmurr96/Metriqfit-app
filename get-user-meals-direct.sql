-- Query meals directly for the specific user we saw earlier
SELECT 
    ml.id,
    ml.user_id,
    ml.meal_slot,
    ml.logged_at,
    ml.logged_at AT TIME ZONE 'America/Los_Angeles' as logged_at_pst,
    ml.created_at,
    COUNT(mli.id) as item_count
FROM meal_logs ml
LEFT JOIN meal_log_items mli ON mli.meal_log_id = ml.id
WHERE ml.user_id = '038345ec-713d-4432-83e0-b5b12d3ee5bc'
  AND ml.logged_at >= '2026-03-23T00:00:00'
  AND ml.logged_at < '2026-03-24T00:00:00'
GROUP BY ml.id, ml.user_id, ml.meal_slot, ml.logged_at, ml.created_at
ORDER BY ml.created_at DESC;
