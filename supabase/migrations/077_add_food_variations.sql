-- Migration: Add missing food variations for bulk/cut forms
-- Ensures we have both bulk (whole) and cut (lean) forms of popular proteins

-- =====================================================
-- EGG VARIATIONS
-- =====================================================

-- Egg whites (cut-appropriate lean protein)
INSERT INTO food_items (
  name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, 
  breakfast_score, lunch_dinner_score, preworkout_score, postworkout_score, evening_score,
  digestion_speed, fat_load, protein_leanness, formality, goal_form, variety_family
) VALUES (
  'Egg Whites, Large', 17, 4, 0.2, 0,
  2, 2, 3, 3, 2,
  'fast', 'low', 'high', 'neutral', 'cut_default', 'eggs'
) ON CONFLICT DO NOTHING;

INSERT INTO food_items (
  name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
  breakfast_score, lunch_dinner_score, preworkout_score, postworkout_score, evening_score,
  digestion_speed, fat_load, protein_leanness, formality, goal_form, variety_family
) VALUES (
  'Liquid Egg Whites (Carton)', 25, 5, 0, 0,
  2, 2, 3, 3, 2,
  'fast', 'low', 'high', 'neutral', 'cut_default', 'eggs'
) ON CONFLICT DO NOTHING;

-- =====================================================
-- CHICKEN VARIATIONS
-- =====================================================

-- Ground chicken (cut-appropriate lean form)
INSERT INTO food_items (
  name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
  breakfast_score, lunch_dinner_score, preworkout_score, postworkout_score, evening_score,
  digestion_speed, fat_load, protein_leanness, formality, goal_form, variety_family
) VALUES (
  'Ground Chicken, 93% Lean', 160, 23, 0, 7,
  0, 3, 3, 3, 2,
  'fast', 'low', 'high', 'savory_meal', 'cut_default', 'chicken'
) ON CONFLICT DO NOTHING;

-- Chicken thigh (bulk-appropriate with more fat)
INSERT INTO food_items (
  name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
  breakfast_score, lunch_dinner_score, preworkout_score, postworkout_score, evening_score,
  digestion_speed, fat_load, protein_leanness, formality, goal_form, variety_family
) VALUES (
  'Chicken Thigh, Skinless', 165, 26, 0, 7,
  0, 3, 2, 2, 3,
  'moderate', 'medium', 'medium', 'savory_meal', 'bulk_default', 'chicken'
) ON CONFLICT DO NOTHING;

-- =====================================================
-- BEEF VARIATIONS
-- =====================================================

-- Lean ground beef (cut-appropriate)
INSERT INTO food_items (
  name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
  breakfast_score, lunch_dinner_score, preworkout_score, postworkout_score, evening_score,
  digestion_speed, fat_load, protein_leanness, formality, goal_form, variety_family
) VALUES (
  'Ground Beef, 93% Lean', 170, 24, 0, 8,
  0, 3, 1, 2, 3,
  'moderate', 'low', 'high', 'savory_meal', 'cut_default', 'beef'
) ON CONFLICT DO NOTHING;

INSERT INTO food_items (
  name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
  breakfast_score, lunch_dinner_score, preworkout_score, postworkout_score, evening_score,
  digestion_speed, fat_load, protein_leanness, formality, goal_form, variety_family
) VALUES (
  'Ground Beef, 90% Lean', 185, 23, 0, 10,
  0, 3, 1, 2, 3,
  'moderate', 'medium', 'medium', 'savory_meal', 'cut_default', 'beef'
) ON CONFLICT DO NOTHING;

-- Regular ground beef (bulk-appropriate)
INSERT INTO food_items (
  name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
  breakfast_score, lunch_dinner_score, preworkout_score, postworkout_score, evening_score,
  digestion_speed, fat_load, protein_leanness, formality, goal_form, variety_family
) VALUES (
  'Ground Beef, 80% Lean', 250, 20, 0, 20,
  0, 3, 0, 1, 3,
  'slow', 'high', 'low', 'savory_meal', 'bulk_default', 'beef'
) ON CONFLICT DO NOTHING;

-- Lean beef cuts (cut-appropriate)
INSERT INTO food_items (
  name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
  breakfast_score, lunch_dinner_score, preworkout_score, postworkout_score, evening_score,
  digestion_speed, fat_load, protein_leanness, formality, goal_form, variety_family
) VALUES (
  'Beef Round Steak, Lean', 160, 28, 0, 5,
  0, 3, 1, 2, 3,
  'slow', 'low', 'high', 'savory_meal', 'cut_default', 'beef'
) ON CONFLICT DO NOTHING;

-- =====================================================
-- CARB VARIATIONS
-- =====================================================

-- Steel-cut oats (slower than rolled)
INSERT INTO food_items (
  name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
  breakfast_score, lunch_dinner_score, preworkout_score, postworkout_score, evening_score,
  carb_speed, digestion_speed, formality, variety_family
) VALUES (
  'Steel-Cut Oats, Cooked', 150, 5, 27, 2.5,
  3, 1, 1, 0, 2,
  'slow', 'slow', 'traditional_breakfast', 'oats'
) ON CONFLICT DO NOTHING;

-- White rice variations (fast carbs)
INSERT INTO food_items (
  name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
  breakfast_score, lunch_dinner_score, preworkout_score, postworkout_score, evening_score,
  carb_speed, digestion_speed, formality, variety_family
) VALUES (
  'Jasmine Rice, Cooked', 170, 3, 37, 0,
  0, 3, 3, 3, 2,
  'fast', 'fast', 'savory_meal', 'rice'
) ON CONFLICT DO NOTHING;

INSERT INTO food_items (
  name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
  breakfast_score, lunch_dinner_score, preworkout_score, postworkout_score, evening_score,
  carb_speed, digestion_speed, formality, variety_family
) VALUES (
  'Basmati Rice, Cooked', 165, 4, 35, 0.5,
  0, 3, 3, 3, 2,
  'fast', 'fast', 'savory_meal', 'rice'
) ON CONFLICT DO NOTHING;

-- Brown rice (moderate speed)
INSERT INTO food_items (
  name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
  breakfast_score, lunch_dinner_score, preworkout_score, postworkout_score, evening_score,
  carb_speed, digestion_speed, formality, variety_family
) VALUES (
  'Brown Rice, Cooked', 165, 4, 35, 1.5,
  0, 3, 2, 2, 3,
  'moderate', 'moderate', 'savory_meal', 'rice'
) ON CONFLICT DO NOTHING;

-- =====================================================
-- FAT VARIATIONS
-- =====================================================

-- Nut butters (breakfast-friendly fats)
INSERT INTO food_items (
  name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
  breakfast_score, lunch_dinner_score, preworkout_score, postworkout_score, evening_score,
  fat_load, formality, variety_family
) VALUES (
  'Peanut Butter, Natural', 190, 7, 7, 16,
  3, 2, 0, 0, 2,
  'high', 'traditional_breakfast', 'peanut_butter'
) ON CONFLICT DO NOTHING;

INSERT INTO food_items (
  name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
  breakfast_score, lunch_dinner_score, preworkout_score, postworkout_score, evening_score,
  fat_load, formality, variety_family
) VALUES (
  'Almond Butter, Natural', 195, 7, 6, 18,
  3, 2, 0, 0, 2,
  'high', 'traditional_breakfast', 'almond_butter'
) ON CONFLICT DO NOTHING;

-- Seeds
INSERT INTO food_items (
  name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
  breakfast_score, lunch_dinner_score, preworkout_score, postworkout_score, evening_score,
  fat_load, formality, variety_family
) VALUES (
  'Chia Seeds', 140, 5, 12, 9,
  2, 2, 0, 0, 2,
  'high', 'neutral', 'chia_seeds'
) ON CONFLICT DO NOTHING;

INSERT INTO food_items (
  name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
  breakfast_score, lunch_dinner_score, preworkout_score, postworkout_score, evening_score,
  fat_load, formality, variety_family
) VALUES (
  'Flaxseeds, Ground', 150, 5, 8, 12,
  2, 2, 0, 0, 2,
  'high', 'neutral', 'flaxseeds'
) ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Show newly added foods
SELECT 
  name,
  variety_family,
  goal_form,
  calories_per_100g,
  protein_per_100g,
  fat_per_100g
FROM food_items
WHERE name IN (
  'Egg Whites, Large',
  'Liquid Egg Whites (Carton)',
  'Ground Chicken, 93% Lean',
  'Chicken Thigh, Skinless',
  'Ground Beef, 93% Lean',
  'Ground Beef, 90% Lean',
  'Ground Beef, 80% Lean',
  'Beef Round Steak, Lean',
  'Steel-Cut Oats, Cooked',
  'Jasmine Rice, Cooked',
  'Basmati Rice, Cooked',
  'Brown Rice, Cooked',
  'Peanut Butter, Natural',
  'Almond Butter, Natural',
  'Chia Seeds',
  'Flaxseeds, Ground'
)
ORDER BY variety_family, name;
