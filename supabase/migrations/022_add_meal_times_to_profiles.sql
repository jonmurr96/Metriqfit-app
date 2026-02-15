-- Migration: Add meal_times to profiles table
-- Allows users to customize their meal schedule times

-- Add meal_times JSONB column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS meal_times JSONB DEFAULT '{
  "breakfast": "08:30",
  "lunch": "13:00",
  "dinner": "19:30",
  "snack": "anytime"
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN profiles.meal_times IS 'User meal schedule preferences in 24h format (HH:MM). Default: breakfast 08:30, lunch 13:00, dinner 19:30, snack anytime';

-- Create index for efficient queries (if we query by meal time in future)
CREATE INDEX IF NOT EXISTS idx_profiles_meal_times ON profiles USING GIN(meal_times);

-- Update RLS policies to allow users to update their own meal_times
-- (Existing policies should cover this since meal_times is part of profiles,
-- but let's ensure the update policy includes this column)

-- Verify the migration
SELECT 
  column_name, 
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'meal_times';
