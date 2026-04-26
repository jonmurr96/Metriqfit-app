-- Migration: Add carb and fat preferences to onboarding answers

-- Add columns for carb and fat selections (similar to preferred_proteins)
ALTER TABLE onboarding_answers ADD COLUMN IF NOT EXISTS preferred_carbs TEXT[] DEFAULT '{}';
ALTER TABLE onboarding_answers ADD COLUMN IF NOT EXISTS preferred_fats TEXT[] DEFAULT '{}';
ALTER TABLE onboarding_answers ADD COLUMN IF NOT EXISTS traditional_meals BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN onboarding_answers.preferred_carbs IS 'User-selected carb sources (3 items): rice, oats, sweet_potato, etc.';
COMMENT ON COLUMN onboarding_answers.preferred_fats IS 'User-selected fat sources (3 items): olive_oil, almonds, avocado, etc.';
COMMENT ON COLUMN onboarding_answers.traditional_meals IS 'Whether to prioritize culturally intuitive meal placements (default: true)';

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_onboarding_answers_carbs ON onboarding_answers USING GIN(preferred_carbs);
CREATE INDEX IF NOT EXISTS idx_onboarding_answers_fats ON onboarding_answers USING GIN(preferred_fats);

-- Verify columns exist
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'onboarding_answers'
AND column_name IN ('preferred_proteins', 'preferred_carbs', 'preferred_fats', 'traditional_meals')
ORDER BY column_name;
