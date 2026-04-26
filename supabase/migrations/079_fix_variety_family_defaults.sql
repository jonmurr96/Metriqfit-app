-- Migration: Fix variety_family defaults for all food items
-- Ensures every food has a proper variety_family for scientific meal generation

-- Update foods with null/empty variety_family based on their category and name

-- Proteins: Infer from category or name patterns
UPDATE food_items 
SET variety_family = CASE
  WHEN category ILIKE '%meat%' AND name ILIKE '%chicken%' THEN 'chicken'
  WHEN category ILIKE '%meat%' AND name ILIKE '%beef%' THEN 'beef'
  WHEN category ILIKE '%meat%' AND name ILIKE '%pork%' THEN 'pork'
  WHEN category ILIKE '%meat%' AND name ILIKE '%turkey%' THEN 'turkey'
  WHEN category ILIKE '%seafood%' OR name ILIKE '%fish%' OR name ILIKE '%salmon%' OR name ILIKE '%cod%' OR name ILIKE '%tilapia%' THEN 'fish'
  WHEN category ILIKE '%seafood%' AND (name ILIKE '%shrimp%' OR name ILIKE '%prawn%' OR name ILIKE '%scallop%' OR name ILIKE '%crab%') THEN 'shellfish'
  WHEN category ILIKE '%dairy%' AND (name ILIKE '%egg%' OR name ILIKE '%whole egg%') THEN 'eggs'
  WHEN name ILIKE '%egg white%' OR name ILIKE '%liquid egg%' THEN 'eggs'
  WHEN category ILIKE '%dairy%' AND (name ILIKE '%milk%' OR name ILIKE '%cheese%' OR name ILIKE '%yogurt%') THEN 'dairy'
  WHEN name ILIKE '%tofu%' OR name ILIKE '%tempeh%' THEN 'tofu_tempeh'
  WHEN name ILIKE '%protein powder%' OR name ILIKE '%whey%' OR name ILIKE '%casein%' THEN 'protein_powder'
  WHEN category ILIKE '%legume%' OR name ILIKE '%lentil%' OR name ILIKE '%bean%' OR name ILIKE '%chickpea%' THEN 'legumes'
  ELSE variety_family
END
WHERE variety_family IS NULL OR variety_family = '';

-- Carbs: Infer from category or name patterns
UPDATE food_items 
SET variety_family = CASE
  WHEN category ILIKE '%grain%' AND (name ILIKE '%rice%' OR name ILIKE '%white rice%') THEN 'rice'
  WHEN category ILIKE '%grain%' AND name ILIKE '%oats%' THEN 'oats'
  WHEN name ILIKE '%sweet potato%' OR name ILIKE '%yam%' THEN 'sweet_potato'
  WHEN name ILIKE '%potato%' AND name NOT ILIKE '%sweet%' THEN 'potato'
  WHEN name ILIKE '%quinoa%' THEN 'quinoa'
  WHEN name ILIKE '%pasta%' OR name ILIKE '%noodle%' OR name ILIKE '%spaghetti%' THEN 'pasta'
  WHEN name ILIKE '%bread%' OR name ILIKE '%bagel%' OR name ILIKE '%toast%' THEN 'bread'
  WHEN category ILIKE '%fruit%' OR (name ILIKE '%banana%' OR name ILIKE '%apple%' OR name ILIKE '%berry%' OR name ILIKE '%orange%') THEN 'fruit'
  ELSE variety_family
END
WHERE variety_family IS NULL OR variety_family = '';

-- Fats: Infer from category or name patterns
UPDATE food_items 
SET variety_family = CASE
  WHEN name ILIKE '%olive oil%' OR name ILIKE '%olive%' THEN 'olive_oil'
  WHEN name ILIKE '%almond%' OR name ILIKE '%almond butter%' THEN 'almonds'
  WHEN name ILIKE '%walnut%' THEN 'walnuts'
  WHEN name ILIKE '%avocado%' THEN 'avocado'
  WHEN name ILIKE '%peanut butter%' OR name ILIKE '%peanut%' THEN 'peanut_butter'
  WHEN name ILIKE '%chia seed%' THEN 'chia_seeds'
  WHEN name ILIKE '%coconut oil%' OR name ILIKE '%coconut%' THEN 'coconut_oil'
  WHEN category ILIKE '%dairy%' AND (name ILIKE '%cheese%' OR name ILIKE '%cheddar%' OR name ILIKE '%mozzarella%') THEN 'cheese'
  ELSE variety_family
END
WHERE variety_family IS NULL OR variety_family = '';

-- For any remaining foods, set a default based on highest macro content
UPDATE food_items 
SET variety_family = CASE
  WHEN protein_per_100g > 10 THEN 'protein_powder'  -- Generic protein
  WHEN carbs_per_100g > 20 THEN 'rice'  -- Generic carb
  WHEN fat_per_100g > 10 THEN 'olive_oil'  -- Generic fat
  ELSE 'other'
END
WHERE variety_family IS NULL OR variety_family = '';

-- Verify counts
SELECT 
  CASE 
    WHEN variety_family IN ('chicken', 'turkey', 'beef', 'pork', 'fish', 'shellfish', 'eggs', 'dairy', 'tofu_tempeh', 'protein_powder', 'legumes') THEN 'protein'
    WHEN variety_family IN ('rice', 'oats', 'sweet_potato', 'potato', 'quinoa', 'pasta', 'bread', 'fruit') THEN 'carb'
    WHEN variety_family IN ('olive_oil', 'almonds', 'walnuts', 'avocado', 'peanut_butter', 'chia_seeds', 'coconut_oil', 'cheese') THEN 'fat'
    ELSE 'other'
  END as food_type,
  COUNT(*) as count
FROM food_items
GROUP BY 1;
