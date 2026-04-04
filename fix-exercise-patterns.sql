-- Fix exercise patterns to match what the workout generation expects
-- The generated-split-selection.ts expects patterns like 'tricep_ext', 'bicep_curl'
-- but the database has 'triceps', 'biceps'

-- Update triceps exercises to use 'tricep_ext' pattern
UPDATE exercises
SET pattern = 'tricep_ext'
WHERE pattern = 'triceps'
  AND category = 'Arms / Grip';

-- Update biceps exercises to use 'bicep_curl' pattern  
UPDATE exercises
SET pattern = 'bicep_curl'
WHERE pattern = 'biceps'
  AND category = 'Arms / Grip';

-- Update chest isolation exercises to use 'chest_fly' pattern
UPDATE exercises
SET pattern = 'chest_fly'
WHERE pattern = 'chest_isolation';

-- Update rear delt isolation exercises to use 'rear_delt' pattern
UPDATE exercises
SET pattern = 'rear_delt'
WHERE pattern = 'rear_delt_isolation';

-- Update shoulder accessory exercises that are lateral raises to use 'shoulder_raise' pattern
UPDATE exercises
SET pattern = 'shoulder_raise'
WHERE pattern = 'shoulder_accessory'
  AND (name ILIKE '%lateral raise%' 
       OR name ILIKE '%side raise%' 
       OR name ILIKE '%front raise%'
       OR name ILIKE '%upright row%');

-- Verify the changes
SELECT pattern, COUNT(*) 
FROM exercises 
WHERE pattern IN ('tricep_ext', 'bicep_curl', 'chest_fly', 'rear_delt', 'shoulder_raise')
GROUP BY pattern;
