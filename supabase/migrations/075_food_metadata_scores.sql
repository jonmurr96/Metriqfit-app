-- Migration: Add food metadata scores for scientific meal generation
-- Purpose: Enable context-aware meal placement with workout priority

-- Add scoring columns (0-3 scale for each meal context)
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS breakfast_score INTEGER CHECK (breakfast_score BETWEEN 0 AND 3);
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS lunch_dinner_score INTEGER CHECK (lunch_dinner_score BETWEEN 0 AND 3);
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS preworkout_score INTEGER CHECK (preworkout_score BETWEEN 0 AND 3);
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS postworkout_score INTEGER CHECK (postworkout_score BETWEEN 0 AND 3);
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS evening_score INTEGER CHECK (evening_score BETWEEN 0 AND 3);

-- Add digestion and nutritional characteristics
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS digestion_speed VARCHAR(20); -- 'slow', 'moderate', 'fast'
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS fat_load VARCHAR(20); -- 'low', 'medium', 'high'
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS carb_speed VARCHAR(20); -- 'slow', 'moderate', 'fast'
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS protein_leanness VARCHAR(20); -- 'low', 'medium', 'high'

-- Add formality and goal-based preferences
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS formality VARCHAR(30); -- 'traditional_breakfast', 'neutral', 'savory_meal'
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS goal_form VARCHAR(20); -- 'bulk_default', 'cut_default', 'both'

-- Add variety family for grouping (e.g., 'chicken', 'beef', 'rice')
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS variety_family VARCHAR(50);

-- Add comments for documentation
COMMENT ON COLUMN food_items.breakfast_score IS 'Score 0-3 for breakfast appropriateness';
COMMENT ON COLUMN food_items.lunch_dinner_score IS 'Score 0-3 for lunch/dinner appropriateness';
COMMENT ON COLUMN food_items.preworkout_score IS 'Score 0-3 for pre-workout suitability';
COMMENT ON COLUMN food_items.postworkout_score IS 'Score 0-3 for post-workout recovery';
COMMENT ON COLUMN food_items.evening_score IS 'Score 0-3 for evening/snack suitability';
COMMENT ON COLUMN food_items.digestion_speed IS 'How fast food digests: slow/moderate/fast';
COMMENT ON COLUMN food_items.fat_load IS 'Fat content level: low/medium/high';
COMMENT ON COLUMN food_items.carb_speed IS 'Carb digestion speed: slow/moderate/fast';
COMMENT ON COLUMN food_items.protein_leanness IS 'Protein leanness: low/medium/high';
COMMENT ON COLUMN food_items.formality IS 'Cultural meal context: traditional_breakfast/neutral/savory_meal';
COMMENT ON COLUMN food_items.goal_form IS 'Best for bulk/cut: bulk_default/cut_default/both';
COMMENT ON COLUMN food_items.variety_family IS 'Food group for variety tracking: chicken/beef/eggs/rice/etc';

-- Create index for efficient variety_family lookups
CREATE INDEX IF NOT EXISTS idx_food_items_variety_family ON food_items(variety_family);

-- Create index for meal context scoring lookups
CREATE INDEX IF NOT EXISTS idx_food_items_breakfast_score ON food_items(breakfast_score) WHERE breakfast_score > 0;
CREATE INDEX IF NOT EXISTS idx_food_items_preworkout_score ON food_items(preworkout_score) WHERE preworkout_score > 0;
CREATE INDEX IF NOT EXISTS idx_food_items_postworkout_score ON food_items(postworkout_score) WHERE postworkout_score > 0;
