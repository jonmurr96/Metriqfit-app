-- Migration: Populate food metadata scores for scientific meal generation
-- Based on sports nutrition principles and cultural meal appropriateness

-- =====================================================
-- PROTEINS
-- =====================================================

-- Whole Eggs: Perfect breakfast food, moderate digestion
UPDATE food_items SET 
  breakfast_score = 3, lunch_dinner_score = 1, preworkout_score = 1, postworkout_score = 1, evening_score = 2,
  digestion_speed = 'moderate', fat_load = 'medium', protein_leanness = 'medium',
  formality = 'traditional_breakfast', goal_form = 'both', variety_family = 'eggs'
WHERE name ILIKE '%egg%' 
  AND name NOT ILIKE '%white%'
  AND calories_per_100g BETWEEN 60 AND 80;

-- Egg Whites: Lean protein tool, great for pre/post workout and evening
UPDATE food_items SET 
  breakfast_score = 2, lunch_dinner_score = 2, preworkout_score = 3, postworkout_score = 3, evening_score = 2,
  digestion_speed = 'fast', fat_load = 'low', protein_leanness = 'high',
  formality = 'neutral', goal_form = 'cut_default', variety_family = 'eggs'
WHERE name ILIKE '%egg white%' OR name ILIKE '%liquid egg%';

-- Chicken Breast: Savory meal protein, excellent for pre/post workout
UPDATE food_items SET 
  breakfast_score = 0, lunch_dinner_score = 3, preworkout_score = 3, postworkout_score = 3, evening_score = 2,
  digestion_speed = 'moderate', fat_load = 'low', protein_leanness = 'high',
  formality = 'savory_meal', goal_form = 'bulk_default', variety_family = 'chicken'
WHERE name ILIKE '%chicken breast%' OR name ILIKE '%chicken thigh%';

-- Ground Chicken: Lean form, fast digesting, good for all meals except breakfast
UPDATE food_items SET 
  breakfast_score = 0, lunch_dinner_score = 3, preworkout_score = 3, postworkout_score = 3, evening_score = 2,
  digestion_speed = 'fast', fat_load = 'low', protein_leanness = 'high',
  formality = 'savory_meal', goal_form = 'cut_default', variety_family = 'chicken'
WHERE name ILIKE '%ground chicken%' OR name ILIKE '%chicken mince%';

-- Beef Steak: Satisfying dinner protein, slower digestion
UPDATE food_items SET 
  breakfast_score = 0, lunch_dinner_score = 3, preworkout_score = 1, postworkout_score = 2, evening_score = 3,
  digestion_speed = 'slow', fat_load = 'medium', protein_leanness = 'medium',
  formality = 'savory_meal', goal_form = 'bulk_default', variety_family = 'beef'
WHERE name ILIKE '%beef steak%' 
   OR name ILIKE '%sirloin%' 
   OR name ILIKE '%ribeye%'
   OR name ILIKE '%tenderloin%';

-- Lean Beef Cuts: Cut-appropriate form
UPDATE food_items SET 
  breakfast_score = 0, lunch_dinner_score = 3, preworkout_score = 1, postworkout_score = 2, evening_score = 3,
  digestion_speed = 'slow', fat_load = 'low', protein_leanness = 'high',
  formality = 'savory_meal', goal_form = 'cut_default', variety_family = 'beef'
WHERE name ILIKE '%beef round%' 
   OR name ILIKE '%beef tenderloin%'
   OR name ILIKE '%lean beef%';

-- Ground Beef: Versatile, good for lunch/dinner
UPDATE food_items SET 
  breakfast_score = 0, lunch_dinner_score = 3, preworkout_score = 1, postworkout_score = 2, evening_score = 3,
  digestion_speed = 'slow', fat_load = 'medium', protein_leanness = 'medium',
  formality = 'savory_meal', goal_form = 'bulk_default', variety_family = 'beef'
WHERE name ILIKE '%ground beef%' 
   OR name ILIKE '%beef mince%'
   OR name ILIKE '%hamburger%';

-- Lean Ground Beef: Cut-appropriate
UPDATE food_items SET 
  breakfast_score = 0, lunch_dinner_score = 3, preworkout_score = 1, postworkout_score = 2, evening_score = 3,
  digestion_speed = 'moderate', fat_load = 'low', protein_leanness = 'high',
  formality = 'savory_meal', goal_form = 'cut_default', variety_family = 'beef'
WHERE name ILIKE '%lean ground beef%' 
   OR name ILIKE '%ground beef 90%'
   OR name ILIKE '%ground beef 93%';

-- Turkey: Similar to chicken
UPDATE food_items SET 
  breakfast_score = 1, lunch_dinner_score = 3, preworkout_score = 3, postworkout_score = 3, evening_score = 2,
  digestion_speed = 'moderate', fat_load = 'low', protein_leanness = 'high',
  formality = 'savory_meal', goal_form = 'both', variety_family = 'turkey'
WHERE name ILIKE '%turkey breast%' OR name ILIKE '%turkey cutlet%';

-- Ground Turkey: Lean alternative
UPDATE food_items SET 
  breakfast_score = 0, lunch_dinner_score = 3, preworkout_score = 3, postworkout_score = 3, evening_score = 2,
  digestion_speed = 'fast', fat_load = 'low', protein_leanness = 'high',
  formality = 'savory_meal', goal_form = 'cut_default', variety_family = 'turkey'
WHERE name ILIKE '%ground turkey%';

-- Fish (White fish like cod, tilapia): Lean, fast
UPDATE food_items SET 
  breakfast_score = 0, lunch_dinner_score = 3, preworkout_score = 3, postworkout_score = 3, evening_score = 2,
  digestion_speed = 'fast', fat_load = 'low', protein_leanness = 'high',
  formality = 'savory_meal', goal_form = 'cut_default', variety_family = 'fish'
WHERE name ILIKE '%cod%' 
   OR name ILIKE '%tilapia%'
   OR name ILIKE '%halibut%'
   OR name ILIKE '%flounder%';

-- Salmon: Healthy fats, moderate digestion
UPDATE food_items SET 
  breakfast_score = 0, lunch_dinner_score = 3, preworkout_score = 1, postworkout_score = 2, evening_score = 3,
  digestion_speed = 'moderate', fat_load = 'medium', protein_leanness = 'medium',
  formality = 'savory_meal', goal_form = 'bulk_default', variety_family = 'fish'
WHERE name ILIKE '%salmon%';

-- Tuna: Lean, fast
UPDATE food_items SET 
  breakfast_score = 0, lunch_dinner_score = 3, preworkout_score = 3, postworkout_score = 3, evening_score = 2,
  digestion_speed = 'fast', fat_load = 'low', protein_leanness = 'high',
  formality = 'savory_meal', goal_form = 'cut_default', variety_family = 'fish'
WHERE name ILIKE '%tuna%' AND name NOT ILIKE '%casserole%';

-- Pork: Moderate fat, savory
UPDATE food_items SET 
  breakfast_score = 0, lunch_dinner_score = 3, preworkout_score = 1, postworkout_score = 2, evening_score = 3,
  digestion_speed = 'moderate', fat_load = 'medium', protein_leanness = 'medium',
  formality = 'savory_meal', goal_form = 'bulk_default', variety_family = 'pork'
WHERE name ILIKE '%pork chop%' OR name ILIKE '%pork tenderloin%';

-- Bacon/Sausage: Traditional breakfast proteins
UPDATE food_items SET 
  breakfast_score = 3, lunch_dinner_score = 2, preworkout_score = 0, postworkout_score = 0, evening_score = 1,
  digestion_speed = 'slow', fat_load = 'high', protein_leanness = 'low',
  formality = 'traditional_breakfast', goal_form = 'bulk_default', variety_family = 'pork'
WHERE name ILIKE '%bacon%' OR name ILIKE '%sausage%';

-- Shellfish: Lean, fast
UPDATE food_items SET 
  breakfast_score = 0, lunch_dinner_score = 3, preworkout_score = 3, postworkout_score = 3, evening_score = 2,
  digestion_speed = 'fast', fat_load = 'low', protein_leanness = 'high',
  formality = 'savory_meal', goal_form = 'cut_default', variety_family = 'shellfish'
WHERE name ILIKE '%shrimp%' 
   OR name ILIKE '%prawn%'
   OR name ILIKE '%scallop%'
   OR name ILIKE '%crab%';

-- Greek Yogurt: Breakfast-friendly protein
UPDATE food_items SET 
  breakfast_score = 3, lunch_dinner_score = 1, preworkout_score = 2, postworkout_score = 2, evening_score = 2,
  digestion_speed = 'moderate', fat_load = 'low', protein_leanness = 'high',
  formality = 'traditional_breakfast', goal_form = 'cut_default', variety_family = 'dairy'
WHERE name ILIKE '%greek yogurt%' OR name ILIKE '%greek yoghurt%';

-- Cottage Cheese: Slow protein, good for evening
UPDATE food_items SET 
  breakfast_score = 2, lunch_dinner_score = 1, preworkout_score = 0, postworkout_score = 1, evening_score = 3,
  digestion_speed = 'slow', fat_load = 'low', protein_leanness = 'high',
  formality = 'neutral', goal_form = 'cut_default', variety_family = 'dairy'
WHERE name ILIKE '%cottage cheese%';

-- Tofu: Neutral, versatile
UPDATE food_items SET 
  breakfast_score = 1, lunch_dinner_score = 2, preworkout_score = 2, postworkout_score = 2, evening_score = 2,
  digestion_speed = 'moderate', fat_load = 'low', protein_leanness = 'medium',
  formality = 'neutral', goal_form = 'both', variety_family = 'tofu_tempeh'
WHERE name ILIKE '%tofu%';

-- Tempeh: Similar to tofu
UPDATE food_items SET 
  breakfast_score = 1, lunch_dinner_score = 2, preworkout_score = 2, postworkout_score = 2, evening_score = 2,
  digestion_speed = 'moderate', fat_load = 'medium', protein_leanness = 'medium',
  formality = 'neutral', goal_form = 'both', variety_family = 'tofu_tempeh'
WHERE name ILIKE '%tempeh%';

-- Protein Powder: Post-workout and anytime
UPDATE food_items SET 
  breakfast_score = 2, lunch_dinner_score = 2, preworkout_score = 3, postworkout_score = 3, evening_score = 2,
  digestion_speed = 'fast', fat_load = 'low', protein_leanness = 'high',
  formality = 'neutral', goal_form = 'both', variety_family = 'protein_powder'
WHERE name ILIKE '%protein powder%' 
   OR name ILIKE '%whey%'
   OR name ILIKE '%casein%';

-- =====================================================
-- CARBOHYDRATES
-- =====================================================

-- Oats: Perfect breakfast carb
UPDATE food_items SET 
  breakfast_score = 3, lunch_dinner_score = 1, preworkout_score = 2, postworkout_score = 1, evening_score = 2,
  carb_speed = 'slow', digestion_speed = 'slow',
  formality = 'traditional_breakfast', variety_family = 'oats'
WHERE name ILIKE '%oat%' AND name NOT ILIKE '%barley%';

-- White Rice: Fast carb, great for pre/post workout
UPDATE food_items SET 
  breakfast_score = 0, lunch_dinner_score = 3, preworkout_score = 3, postworkout_score = 3, evening_score = 2,
  carb_speed = 'fast', digestion_speed = 'fast',
  formality = 'savory_meal', variety_family = 'rice'
WHERE name ILIKE '%white rice%' 
   OR name ILIKE '%jasmine rice%'
   OR name ILIKE '%basmati rice%';

-- Brown Rice: Slower than white
UPDATE food_items SET 
  breakfast_score = 0, lunch_dinner_score = 3, preworkout_score = 2, postworkout_score = 2, evening_score = 3,
  carb_speed = 'moderate', digestion_speed = 'moderate',
  formality = 'savory_meal', variety_family = 'rice'
WHERE name ILIKE '%brown rice%';

-- Sweet Potato: Slow carb, good for evening
UPDATE food_items SET 
  breakfast_score = 1, lunch_dinner_score = 3, preworkout_score = 2, postworkout_score = 2, evening_score = 3,
  carb_speed = 'slow', digestion_speed = 'slow',
  formality = 'savory_meal', variety_family = 'sweet_potato'
WHERE name ILIKE '%sweet potato%' OR name ILIKE '%yam%';

-- Regular Potato: Moderate
UPDATE food_items SET 
  breakfast_score = 0, lunch_dinner_score = 3, preworkout_score = 2, postworkout_score = 2, evening_score = 2,
  carb_speed = 'moderate', digestion_speed = 'moderate',
  formality = 'savory_meal', variety_family = 'potato'
WHERE name ILIKE '%potato%' AND name NOT ILIKE '%sweet%';

-- Quinoa: Slow, complete protein
UPDATE food_items SET 
  breakfast_score = 1, lunch_dinner_score = 3, preworkout_score = 1, postworkout_score = 2, evening_score = 3,
  carb_speed = 'slow', digestion_speed = 'slow',
  formality = 'savory_meal', variety_family = 'quinoa'
WHERE name ILIKE '%quinoa%';

-- Pasta: Fast carb
UPDATE food_items SET 
  breakfast_score = 0, lunch_dinner_score = 3, preworkout_score = 2, postworkout_score = 2, evening_score = 2,
  carb_speed = 'fast', digestion_speed = 'fast',
  formality = 'savory_meal', variety_family = 'pasta'
WHERE name ILIKE '%pasta%' 
   OR name ILIKE '%spaghetti%'
   OR name ILIKE '%fettuccine%';

-- Bread: Breakfast and anytime
UPDATE food_items SET 
  breakfast_score = 2, lunch_dinner_score = 2, preworkout_score = 2, postworkout_score = 2, evening_score = 1,
  carb_speed = 'fast', digestion_speed = 'fast',
  formality = 'neutral', variety_family = 'bread'
WHERE name ILIKE '%bread%' OR name ILIKE '%toast%';

-- Banana: Fast carb, good pre-workout
UPDATE food_items SET 
  breakfast_score = 3, lunch_dinner_score = 2, preworkout_score = 3, postworkout_score = 3, evening_score = 1,
  carb_speed = 'fast', digestion_speed = 'fast',
  formality = 'traditional_breakfast', variety_family = 'fruit'
WHERE name ILIKE '%banana%';

-- Berries: Slow carb, good for breakfast/evening
UPDATE food_items SET 
  breakfast_score = 3, lunch_dinner_score = 2, preworkout_score = 1, postworkout_score = 1, evening_score = 2,
  carb_speed = 'slow', digestion_speed = 'slow',
  formality = 'traditional_breakfast', variety_family = 'fruit'
WHERE name ILIKE '%berry%' 
   OR name ILIKE '%strawberry%'
   OR name ILIKE '%blueberry%'
   OR name ILIKE '%raspberry%';

-- Apple: Slow, anytime
UPDATE food_items SET 
  breakfast_score = 2, lunch_dinner_score = 2, preworkout_score = 1, postworkout_score = 1, evening_score = 2,
  carb_speed = 'slow', digestion_speed = 'slow',
  formality = 'neutral', variety_family = 'fruit'
WHERE name ILIKE '%apple%';

-- =====================================================
-- FATS
-- =====================================================

-- Almonds: Breakfast-friendly nuts
UPDATE food_items SET 
  breakfast_score = 2, lunch_dinner_score = 2, preworkout_score = 0, postworkout_score = 0, evening_score = 2,
  fat_load = 'high',
  formality = 'neutral', variety_family = 'almonds'
WHERE name ILIKE '%almond%' AND name NOT ILIKE '%flour%' AND name NOT ILIKE '%milk%';

-- Walnuts: Omega-3 rich
UPDATE food_items SET 
  breakfast_score = 2, lunch_dinner_score = 2, preworkout_score = 0, postworkout_score = 0, evening_score = 2,
  fat_load = 'high',
  formality = 'neutral', variety_family = 'walnuts'
WHERE name ILIKE '%walnut%';

-- Olive Oil: Savory meal fat
UPDATE food_items SET 
  breakfast_score = 0, lunch_dinner_score = 3, preworkout_score = 0, postworkout_score = 0, evening_score = 2,
  fat_load = 'high',
  formality = 'savory_meal', variety_family = 'olive_oil'
WHERE name ILIKE '%olive oil%';

-- Avocado: Versatile, healthy fat
UPDATE food_items SET 
  breakfast_score = 1, lunch_dinner_score = 3, preworkout_score = 0, postworkout_score = 0, evening_score = 3,
  fat_load = 'high',
  formality = 'neutral', variety_family = 'avocado'
WHERE name ILIKE '%avocado%';

-- Peanut Butter: Breakfast/snack friendly
UPDATE food_items SET 
  breakfast_score = 3, lunch_dinner_score = 2, preworkout_score = 0, postworkout_score = 0, evening_score = 2,
  fat_load = 'high',
  formality = 'traditional_breakfast', variety_family = 'peanut_butter'
WHERE name ILIKE '%peanut butter%';

-- Almond Butter: Similar to PB
UPDATE food_items SET 
  breakfast_score = 3, lunch_dinner_score = 2, preworkout_score = 0, postworkout_score = 0, evening_score = 2,
  fat_load = 'high',
  formality = 'traditional_breakfast', variety_family = 'almond_butter'
WHERE name ILIKE '%almond butter%';

-- Chia Seeds: Neutral, healthy
UPDATE food_items SET 
  breakfast_score = 2, lunch_dinner_score = 2, preworkout_score = 0, postworkout_score = 0, evening_score = 2,
  fat_load = 'high',
  formality = 'neutral', variety_family = 'chia_seeds'
WHERE name ILIKE '%chia seed%';

-- Coconut Oil: Cooking fat
UPDATE food_items SET 
  breakfast_score = 0, lunch_dinner_score = 3, preworkout_score = 0, postworkout_score = 0, evening_score = 2,
  fat_load = 'high',
  formality = 'savory_meal', variety_family = 'coconut_oil'
WHERE name ILIKE '%coconut oil%';

-- Butter: Cooking fat
UPDATE food_items SET 
  breakfast_score = 1, lunch_dinner_score = 3, preworkout_score = 0, postworkout_score = 0, evening_score = 2,
  fat_load = 'high',
  formality = 'savory_meal', variety_family = 'butter'
WHERE name ILIKE '%butter%' AND name NOT ILIKE '%peanut%' AND name NOT ILIKE '%almond%';

-- Cheese: Savory meal
UPDATE food_items SET 
  breakfast_score = 1, lunch_dinner_score = 3, preworkout_score = 0, postworkout_score = 0, evening_score = 2,
  fat_load = 'medium',
  formality = 'savory_meal', variety_family = 'cheese'
WHERE name ILIKE '%cheese%' AND name NOT ILIKE '%cottage%';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Show summary of classified food_items
SELECT 
  variety_family,
  COUNT(*) as total,
  AVG(breakfast_score) as avg_breakfast,
  AVG(preworkout_score) as avg_preworkout,
  AVG(postworkout_score) as avg_postworkout
FROM food_items
WHERE variety_family IS NOT NULL
GROUP BY variety_family
ORDER BY variety_family;
