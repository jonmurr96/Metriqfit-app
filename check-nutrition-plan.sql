-- Check nutrition plan meals
SELECT 
    np.id as plan_id,
    np.is_active,
    npm.id as meal_id,
    npm.meal_slot,
    npm.name,
    npm.target_calories,
    npm.target_protein,
    npm.target_carbs,
    npm.target_fat
FROM user_nutrition_plans np
LEFT JOIN user_nutrition_plan_meals npm ON npm.plan_id = np.id
WHERE np.is_active = true
ORDER BY npm.meal_slot
LIMIT 10;
