-- ============================================================
-- Migration 065: Seed 150 Core Exercises (v2.1)
-- All exercises curated for accessibility + scientific validity
-- Popularity floor: Beginner ≥ 65, Intermediate ≥ 55, Advanced ≥ 45
-- ============================================================

-- Ensure columns referenced by the seed INSERT exist
-- (some may be absent on projects that existed before migration 064)
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS equipment     TEXT,
  ADD COLUMN IF NOT EXISTS muscle_groups TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cues          TEXT,
  ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Set a default on external_id so system exercise seeds don't need to supply it
ALTER TABLE exercises ALTER COLUMN external_id SET DEFAULT gen_random_uuid()::text;

-- Convert difficulty from TEXT (beginner/intermediate/advanced) to INTEGER (1-5) if needed.
-- The seed uses integer difficulty ratings; existing text values map to the midpoint of each tier.
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name = 'exercises' AND column_name = 'difficulty') = 'text' THEN
    ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_difficulty_check;
    ALTER TABLE exercises
      ALTER COLUMN difficulty TYPE INTEGER
      USING CASE difficulty
        WHEN 'beginner'     THEN 1
        WHEN 'intermediate' THEN 3
        WHEN 'advanced'     THEN 5
        ELSE NULL
      END;
    ALTER TABLE exercises ADD CONSTRAINT exercises_difficulty_check
      CHECK (difficulty BETWEEN 1 AND 5);
  END IF;
END
$$;

INSERT INTO exercises (name, category, movement_pattern, equipment, is_compound, muscle_groups,
  primary_muscles, secondary_muscles, split_tags, equipment_options, experience_min,
  difficulty, popularity_score, force_type, is_unilateral, requires_spotter,
  joint_stress_level, is_system_exercise, technique_compatibility, cues)
VALUES

-- ===== PUSH — CHEST COMPOUNDS =====
('Barbell Bench Press','strength','horizontal_push','barbell',TRUE,
  ARRAY['chest','triceps','front_delts'],ARRAY['chest'],ARRAY['triceps','front_delts'],
  ARRAY['push','upper','full_body','chest'],ARRAY['barbell','bench'],
  'beginner',2,98,'push',FALSE,TRUE,3,TRUE,
  ARRAY['drop_set','superset','tempo','pause_rep'],
  'Drive feet into floor, retract scapula. Bar to nipple line. Full ROM.'),

('Dumbbell Bench Press','strength','horizontal_push','dumbbell',TRUE,
  ARRAY['chest','triceps','front_delts'],ARRAY['chest'],ARRAY['triceps','front_delts'],
  ARRAY['push','upper','full_body','chest'],ARRAY['dumbbell','bench'],
  'beginner',1,95,'push',FALSE,FALSE,2,TRUE,
  ARRAY['drop_set','superset','tempo'],
  'Neutral spine. Lower DBs until slight stretch. Press up and slightly together.'),

('Incline Dumbbell Press','strength','horizontal_push','dumbbell',TRUE,
  ARRAY['chest','triceps','front_delts'],ARRAY['chest'],ARRAY['triceps','front_delts'],
  ARRAY['push','upper','chest'],ARRAY['dumbbell','bench'],
  'beginner',2,92,'push',FALSE,FALSE,2,TRUE,
  ARRAY['drop_set','superset','tempo'],
  'Bench 30-45 degrees. Control descent, elbows 45-75 degrees to torso.'),

('Incline Barbell Bench Press','strength','horizontal_push','barbell',TRUE,
  ARRAY['chest','triceps','front_delts'],ARRAY['chest'],ARRAY['triceps','front_delts'],
  ARRAY['push','upper','chest'],ARRAY['barbell','bench'],
  'intermediate',3,88,'push',FALSE,TRUE,3,TRUE,
  ARRAY['drop_set','superset'],
  'Bench 30-45 degrees. Bar path slightly below upper chest. Full ROM.'),

('Machine Chest Press','strength','horizontal_push','machine',TRUE,
  ARRAY['chest','triceps','front_delts'],ARRAY['chest'],ARRAY['triceps','front_delts'],
  ARRAY['push','upper','full_body','chest'],ARRAY['machine'],
  'beginner',1,88,'push',FALSE,FALSE,1,TRUE,
  ARRAY['drop_set','superset'],
  'Handles align with mid-chest. Full extension without locking elbows.'),

('Push-Up','strength','horizontal_push','bodyweight',TRUE,
  ARRAY['chest','triceps','front_delts'],ARRAY['chest'],ARRAY['triceps','front_delts','core'],
  ARRAY['push','upper','full_body'],ARRAY['bodyweight'],
  'beginner',1,97,'push',FALSE,FALSE,1,TRUE,
  ARRAY['superset','tempo','drop_set'],
  'Straight body, hands shoulder-width+. Lower chest to 1 inch floor. Full extension.'),

('Dips (Chest Focus)','strength','horizontal_push','bodyweight',TRUE,
  ARRAY['chest','triceps','front_delts'],ARRAY['chest'],ARRAY['triceps'],
  ARRAY['push','upper','chest'],ARRAY['bodyweight','dip_bars'],
  'intermediate',3,80,'push',FALSE,FALSE,3,TRUE,
  ARRAY['drop_set','superset'],
  'Lean forward 30 degrees for chest. Lower until upper arms parallel. Full extension.'),

-- ===== PUSH — CHEST ISOLATION =====
('Cable Fly (Low to High)','isolation','horizontal_push','cable',FALSE,
  ARRAY['chest'],ARRAY['chest'],ARRAY['front_delts'],
  ARRAY['push','upper','chest'],ARRAY['cable'],
  'beginner',2,88,'push',FALSE,FALSE,2,TRUE,
  ARRAY['drop_set','superset','tempo','myo_rep'],
  'Cables low. Slight forward lean. Hands together like hugging a tree. Feel stretch at extension.'),

('Cable Fly (High to Low)','isolation','horizontal_push','cable',FALSE,
  ARRAY['chest'],ARRAY['chest'],ARRAY['front_delts'],
  ARRAY['push','upper','chest'],ARRAY['cable'],
  'beginner',2,85,'push',FALSE,FALSE,2,TRUE,
  ARRAY['drop_set','superset','myo_rep'],
  'Cables high. Drive hands down and together. Squeeze at bottom.'),

('Pec Deck Machine','isolation','horizontal_push','machine',FALSE,
  ARRAY['chest'],ARRAY['chest'],ARRAY['front_delts'],
  ARRAY['push','upper','chest'],ARRAY['machine'],
  'beginner',1,88,'push',FALSE,FALSE,1,TRUE,
  ARRAY['drop_set','myo_rep'],
  'Elbows on pads, upper arm parallel to floor. Squeeze chest at peak.'),

('Dumbbell Fly (Flat)','isolation','horizontal_push','dumbbell',FALSE,
  ARRAY['chest'],ARRAY['chest'],ARRAY['front_delts'],
  ARRAY['push','upper','chest'],ARRAY['dumbbell','bench'],
  'beginner',2,82,'push',FALSE,FALSE,2,TRUE,
  ARRAY['drop_set','tempo'],
  'Slight elbow bend throughout. Lower until chest stretches. Arc motion, not press.'),

-- ===== PUSH — SHOULDERS =====
('Dumbbell Shoulder Press','strength','vertical_push','dumbbell',TRUE,
  ARRAY['front_delts','side_delts'],ARRAY['front_delts','side_delts'],ARRAY['triceps','traps'],
  ARRAY['push','upper','shoulders'],ARRAY['dumbbell'],
  'beginner',2,93,'push',FALSE,FALSE,2,TRUE,
  ARRAY['drop_set','superset'],
  'Elbows 90 degrees start. Press overhead without locking. Control descent.'),

('Barbell Overhead Press','strength','vertical_push','barbell',TRUE,
  ARRAY['front_delts','side_delts'],ARRAY['front_delts','side_delts'],ARRAY['triceps','traps','core'],
  ARRAY['push','upper','shoulders'],ARRAY['barbell'],
  'intermediate',3,88,'push',FALSE,FALSE,3,TRUE,
  ARRAY['drop_set','superset','pause_rep'],
  'Grip just outside shoulders. Press vertical path. Squeeze glutes for stability.'),

('Machine Shoulder Press','strength','vertical_push','machine',TRUE,
  ARRAY['front_delts','side_delts'],ARRAY['front_delts','side_delts'],ARRAY['triceps'],
  ARRAY['push','upper','shoulders'],ARRAY['machine'],
  'beginner',1,85,'push',FALSE,FALSE,1,TRUE,
  ARRAY['drop_set'],
  'Adjust seat so handles align with shoulders. Full ROM.'),

('Arnold Press','strength','vertical_push','dumbbell',TRUE,
  ARRAY['front_delts','side_delts','rear_delts'],ARRAY['front_delts','side_delts'],ARRAY['triceps'],
  ARRAY['push','upper','shoulders'],ARRAY['dumbbell'],
  'intermediate',3,80,'push',FALSE,FALSE,2,TRUE,
  ARRAY['superset'],
  'Start palms facing you, rotate to palms-forward as you press. Reverse on descent.'),

('Dumbbell Lateral Raise','isolation','isolation','dumbbell',FALSE,
  ARRAY['side_delts'],ARRAY['side_delts'],ARRAY['traps'],
  ARRAY['push','upper','shoulders'],ARRAY['dumbbell'],
  'beginner',1,95,'push',FALSE,FALSE,1,TRUE,
  ARRAY['drop_set','myo_rep','superset'],
  'Lead with elbows. Slight forward lean. Pinky slightly higher. Stop at shoulder height.'),

('Cable Lateral Raise','isolation','isolation','cable',FALSE,
  ARRAY['side_delts'],ARRAY['side_delts'],ARRAY['traps'],
  ARRAY['push','upper','shoulders'],ARRAY['cable'],
  'beginner',2,85,'push',TRUE,FALSE,1,TRUE,
  ARRAY['drop_set','myo_rep'],
  'Cable at hip height. Arm across body, raise to shoulder height. Constant tension.'),

('Machine Lateral Raise','isolation','isolation','machine',FALSE,
  ARRAY['side_delts'],ARRAY['side_delts'],ARRAY['traps'],
  ARRAY['push','upper','shoulders'],ARRAY['machine'],
  'beginner',1,82,'push',FALSE,FALSE,1,TRUE,
  ARRAY['drop_set','myo_rep'],
  'Align elbow with machine pivot. Full ROM. Control descent.'),

('Dumbbell Front Raise','isolation','isolation','dumbbell',FALSE,
  ARRAY['front_delts'],ARRAY['front_delts'],ARRAY['side_delts'],
  ARRAY['push','upper','shoulders'],ARRAY['dumbbell'],
  'beginner',1,78,'push',FALSE,FALSE,1,TRUE,
  ARRAY['superset','myo_rep'],
  'Slight elbow bend. Raise to eye level. Control. No momentum.'),

('Face Pull','isolation','horizontal_pull','cable',FALSE,
  ARRAY['rear_delts'],ARRAY['rear_delts'],ARRAY['rhomboids','traps'],
  ARRAY['push','pull','upper','shoulders'],ARRAY['cable'],
  'beginner',2,90,'pull',FALSE,FALSE,1,TRUE,
  ARRAY['myo_rep','superset'],
  'Rope at face height. Pull to forehead, hands wide, elbows high. External rotation. Light weight.'),

('Rear Delt Fly (Dumbbell)','isolation','isolation','dumbbell',FALSE,
  ARRAY['rear_delts'],ARRAY['rear_delts'],ARRAY['rhomboids'],
  ARRAY['push','pull','upper','shoulders'],ARRAY['dumbbell','bench'],
  'beginner',1,85,'pull',FALSE,FALSE,1,TRUE,
  ARRAY['myo_rep','superset','drop_set'],
  'Prone on incline bench or bent over. Lead with elbows. Squeeze rear delts.'),

('Rear Delt Fly (Pec Deck)','isolation','isolation','machine',FALSE,
  ARRAY['rear_delts'],ARRAY['rear_delts'],ARRAY['rhomboids'],
  ARRAY['push','pull','upper','shoulders'],ARRAY['machine'],
  'beginner',1,85,'pull',FALSE,FALSE,1,TRUE,
  ARRAY['myo_rep','drop_set'],
  'Reverse pec deck. Full arc to rear. Squeeze at end.'),

('Cable Rear Delt Fly','isolation','isolation','cable',FALSE,
  ARRAY['rear_delts'],ARRAY['rear_delts'],ARRAY['rhomboids'],
  ARRAY['push','pull','upper','shoulders'],ARRAY['cable'],
  'intermediate',2,78,'pull',FALSE,FALSE,1,TRUE,
  ARRAY['myo_rep','superset'],
  'Cables crossed at chest height. Pull apart in arc. Squeeze rear delts.'),

-- ===== PUSH — TRICEPS =====
('Tricep Pushdown (Rope)','isolation','isolation','cable',FALSE,
  ARRAY['triceps'],ARRAY['triceps'],ARRAY[]::TEXT[],
  ARRAY['push','upper','arms'],ARRAY['cable'],
  'beginner',1,95,'push',FALSE,FALSE,1,TRUE,
  ARRAY['drop_set','superset','myo_rep'],
  'Elbows pinned to sides. Spread rope at bottom. Full extension. Control return.'),

('Tricep Pushdown (Bar)','isolation','isolation','cable',FALSE,
  ARRAY['triceps'],ARRAY['triceps'],ARRAY[]::TEXT[],
  ARRAY['push','upper','arms'],ARRAY['cable'],
  'beginner',1,92,'push',FALSE,FALSE,1,TRUE,
  ARRAY['drop_set','superset','myo_rep'],
  'Elbows pinned. Full extension at bottom.'),

('Overhead Tricep Extension (Cable)','isolation','isolation','cable',FALSE,
  ARRAY['triceps'],ARRAY['triceps'],ARRAY[]::TEXT[],
  ARRAY['push','upper','arms'],ARRAY['cable'],
  'beginner',2,88,'push',FALSE,FALSE,2,TRUE,
  ARRAY['drop_set','superset'],
  'Cable behind head, rope grip. Elbows forward. Full extension overhead. Long head emphasis.'),

('Overhead Tricep Extension (Dumbbell)','isolation','isolation','dumbbell',FALSE,
  ARRAY['triceps'],ARRAY['triceps'],ARRAY[]::TEXT[],
  ARRAY['push','upper','arms'],ARRAY['dumbbell'],
  'beginner',1,85,'push',FALSE,FALSE,2,TRUE,
  ARRAY['drop_set'],
  'Both hands on one DB overhead. Elbows forward. Lower behind head. Full extension.'),

('Skull Crushers (EZ Bar)','isolation','isolation','ez_bar',FALSE,
  ARRAY['triceps'],ARRAY['triceps'],ARRAY[]::TEXT[],
  ARRAY['push','upper','arms'],ARRAY['ez_bar','bench'],
  'intermediate',3,82,'push',FALSE,FALSE,3,TRUE,
  ARRAY['drop_set','superset'],
  'Upper arms vertical, stationary. Lower to forehead. Full extension at top. Control descent.'),

('Skull Crushers (Dumbbell)','isolation','isolation','dumbbell',FALSE,
  ARRAY['triceps'],ARRAY['triceps'],ARRAY[]::TEXT[],
  ARRAY['push','upper','arms'],ARRAY['dumbbell','bench'],
  'beginner',2,80,'push',FALSE,FALSE,2,TRUE,
  ARRAY['drop_set'],
  'More natural wrist angle than EZ bar. DBs side by side. Full ROM.'),

('Close-Grip Bench Press','strength','horizontal_push','barbell',FALSE,
  ARRAY['triceps'],ARRAY['triceps'],ARRAY['chest','front_delts'],
  ARRAY['push','upper','arms'],ARRAY['barbell','bench'],
  'intermediate',3,80,'push',FALSE,TRUE,3,TRUE,
  ARRAY['drop_set','superset'],
  'Hands shoulder-width. Elbows tucked to sides. Tricep-dominant bench variation.'),

('Diamond Push-Up','isolation','horizontal_push','bodyweight',FALSE,
  ARRAY['triceps'],ARRAY['triceps'],ARRAY['chest'],
  ARRAY['push','upper','arms'],ARRAY['bodyweight'],
  'beginner',2,78,'push',FALSE,FALSE,2,TRUE,
  ARRAY['superset'],
  'Hands in diamond under chest. Elbows flare out naturally.'),

-- ===== PULL — BACK COMPOUNDS =====
('Lat Pulldown (Wide Grip)','strength','vertical_pull','cable',TRUE,
  ARRAY['lats'],ARRAY['lats'],ARRAY['biceps','rhomboids'],
  ARRAY['pull','upper','back'],ARRAY['cable','lat_machine'],
  'beginner',1,95,'pull',FALSE,FALSE,1,TRUE,
  ARRAY['drop_set','superset','tempo'],
  'Slight lean back, chest up. Pull to upper chest. Squeeze lats. Control return.'),

('Lat Pulldown (Close Grip)','strength','vertical_pull','cable',TRUE,
  ARRAY['lats'],ARRAY['lats'],ARRAY['biceps'],
  ARRAY['pull','upper','back'],ARRAY['cable','lat_machine'],
  'beginner',1,88,'pull',FALSE,FALSE,1,TRUE,
  ARRAY['drop_set','superset'],
  'More range of motion than wide grip. Full stretch at top.'),

('Lat Pulldown (Neutral Grip)','strength','vertical_pull','cable',TRUE,
  ARRAY['lats'],ARRAY['lats'],ARRAY['biceps','rhomboids'],
  ARRAY['pull','upper','back'],ARRAY['cable','lat_machine'],
  'beginner',1,85,'pull',FALSE,FALSE,1,TRUE,
  ARRAY['drop_set','superset'],
  'Neutral grip handles. Full stretch overhead. Squeeze lats throughout.'),

('Pull-Up','strength','vertical_pull','bodyweight',TRUE,
  ARRAY['lats'],ARRAY['lats'],ARRAY['biceps','rhomboids','core'],
  ARRAY['pull','upper','back'],ARRAY['bodyweight','pull_up_bar'],
  'intermediate',3,85,'pull',FALSE,FALSE,2,TRUE,
  ARRAY['weighted','drop_set','superset'],
  'Dead hang start. Pull until chin clears bar. No kipping. Slow eccentric.'),

('Chin-Up','strength','vertical_pull','bodyweight',TRUE,
  ARRAY['lats','biceps'],ARRAY['lats'],ARRAY['biceps','rhomboids'],
  ARRAY['pull','upper','back'],ARRAY['bodyweight','pull_up_bar'],
  'intermediate',2,85,'pull',FALSE,FALSE,2,TRUE,
  ARRAY['weighted','drop_set'],
  'Supinated grip. More bicep than pull-up. Dead hang to chin over bar.'),

('Assisted Pull-Up Machine','strength','vertical_pull','machine',TRUE,
  ARRAY['lats'],ARRAY['lats'],ARRAY['biceps','rhomboids'],
  ARRAY['pull','upper','back'],ARRAY['machine'],
  'beginner',1,80,'pull',FALSE,FALSE,1,TRUE,
  ARRAY['drop_set'],
  'Counterweight reduces difficulty. Aim to decrease assistance over time.'),

('Barbell Row (Bent Over)','strength','horizontal_pull','barbell',TRUE,
  ARRAY['rhomboids','lats'],ARRAY['rhomboids','lats'],ARRAY['biceps','rear_delts','erectors'],
  ARRAY['pull','upper','back'],ARRAY['barbell'],
  'intermediate',3,90,'pull',FALSE,FALSE,3,TRUE,
  ARRAY['drop_set','superset','pause_rep'],
  '45-degree torso angle. Bar close to body. Pull to lower chest. Squeeze at top.'),

('Dumbbell Row (Single Arm)','strength','horizontal_pull','dumbbell',TRUE,
  ARRAY['lats','rhomboids'],ARRAY['lats','rhomboids'],ARRAY['biceps','rear_delts'],
  ARRAY['pull','upper','back'],ARRAY['dumbbell','bench'],
  'beginner',1,95,'pull',TRUE,FALSE,1,TRUE,
  ARRAY['drop_set','superset'],
  'Knee and hand on bench. Row to hip not armpit. Full ROM — arm extends fully at bottom.'),

('Cable Row (Seated, Close Grip)','strength','horizontal_pull','cable',TRUE,
  ARRAY['rhomboids','lats'],ARRAY['rhomboids','lats'],ARRAY['biceps','rear_delts'],
  ARRAY['pull','upper','back'],ARRAY['cable'],
  'beginner',1,92,'pull',FALSE,FALSE,1,TRUE,
  ARRAY['drop_set','superset','tempo'],
  'Sit tall, chest up. Pull to lower sternum. Squeeze shoulder blades. Controlled return.'),

('Cable Row (Seated, Wide Grip)','strength','horizontal_pull','cable',TRUE,
  ARRAY['rhomboids'],ARRAY['rhomboids'],ARRAY['lats','rear_delts','biceps'],
  ARRAY['pull','upper','back'],ARRAY['cable'],
  'beginner',2,82,'pull',FALSE,FALSE,1,TRUE,
  ARRAY['superset'],
  'Wide bar, overhand. Pull to upper abs. Upper back focus.'),

('Machine Row','strength','horizontal_pull','machine',TRUE,
  ARRAY['rhomboids','lats'],ARRAY['rhomboids','lats'],ARRAY['biceps','rear_delts'],
  ARRAY['pull','upper','back'],ARRAY['machine'],
  'beginner',1,88,'pull',FALSE,FALSE,1,TRUE,
  ARRAY['drop_set','superset'],
  'Chest against pad. Pull handles to sides. Squeeze shoulder blades.'),

('Chest-Supported Row (Machine)','strength','horizontal_pull','machine',TRUE,
  ARRAY['rhomboids','lats'],ARRAY['rhomboids','lats'],ARRAY['biceps','rear_delts'],
  ARRAY['pull','upper','back'],ARRAY['machine'],
  'beginner',1,82,'pull',FALSE,FALSE,1,TRUE,
  ARRAY['drop_set','superset'],
  'Chest on pad removes lower back. Full ROM. Squeeze at peak contraction.'),

('T-Bar Row','strength','horizontal_pull','barbell',TRUE,
  ARRAY['rhomboids','lats'],ARRAY['rhomboids','lats'],ARRAY['biceps','erectors'],
  ARRAY['pull','upper','back'],ARRAY['barbell'],
  'intermediate',3,78,'pull',FALSE,FALSE,3,TRUE,
  ARRAY['superset'],
  'Straddle bar. Knees bent. Pull toward chest. Squeeze at top.'),

('Inverted Row','strength','horizontal_pull','bodyweight',TRUE,
  ARRAY['rhomboids','lats'],ARRAY['rhomboids','lats'],ARRAY['biceps','rear_delts'],
  ARRAY['pull','upper','back'],ARRAY['bodyweight'],
  'beginner',2,78,'pull',FALSE,FALSE,1,TRUE,
  ARRAY['superset','weighted'],
  'Bar at hip height. Hang below. Pull chest to bar. Straight body.'),

-- ===== PULL — BACK ISOLATION =====
('Straight Arm Pulldown','isolation','vertical_pull','cable',FALSE,
  ARRAY['lats'],ARRAY['lats'],ARRAY['core'],
  ARRAY['pull','upper','back'],ARRAY['cable'],
  'intermediate',2,80,'pull',FALSE,FALSE,2,TRUE,
  ARRAY['superset','myo_rep'],
  'Arms straight throughout. Pull bar from overhead to hips. Feel lat stretch and contraction.'),

('Barbell Shrug','isolation','isolation','barbell',FALSE,
  ARRAY['traps'],ARRAY['traps'],ARRAY[]::TEXT[],
  ARRAY['pull','upper','back'],ARRAY['barbell'],
  'beginner',1,85,'pull',FALSE,FALSE,2,TRUE,
  ARRAY['drop_set','myo_rep'],
  'Straight arms. Shrug straight up. 1 second hold. Do not roll shoulders.'),

('Dumbbell Shrug','isolation','isolation','dumbbell',FALSE,
  ARRAY['traps'],ARRAY['traps'],ARRAY[]::TEXT[],
  ARRAY['pull','upper','back'],ARRAY['dumbbell'],
  'beginner',1,88,'pull',FALSE,FALSE,2,TRUE,
  ARRAY['drop_set','myo_rep'],
  'Straight arms. Shrug directly up. Hold 1 second.'),

-- ===== PULL — BICEPS =====
('Barbell Curl','isolation','isolation','barbell',FALSE,
  ARRAY['biceps'],ARRAY['biceps'],ARRAY['brachialis'],
  ARRAY['pull','upper','arms'],ARRAY['barbell'],
  'beginner',1,95,'pull',FALSE,FALSE,2,TRUE,
  ARRAY['drop_set','superset','myo_rep','tempo'],
  'Elbows at sides. Full extension at bottom. Squeeze at top. Control descent.'),

('EZ Bar Curl','isolation','isolation','ez_bar',FALSE,
  ARRAY['biceps'],ARRAY['biceps'],ARRAY['brachialis'],
  ARRAY['pull','upper','arms'],ARRAY['ez_bar'],
  'beginner',1,90,'pull',FALSE,FALSE,1,TRUE,
  ARRAY['drop_set','superset','myo_rep'],
  'Less wrist strain than straight bar. Full ROM.'),

('Dumbbell Curl (Alternating)','isolation','isolation','dumbbell',FALSE,
  ARRAY['biceps'],ARRAY['biceps'],ARRAY['brachialis'],
  ARRAY['pull','upper','arms'],ARRAY['dumbbell'],
  'beginner',1,95,'pull',TRUE,FALSE,1,TRUE,
  ARRAY['drop_set','superset','myo_rep'],
  'Supinate wrist as you curl. Full extension. Full contraction. No swinging.'),

('Hammer Curl','isolation','isolation','dumbbell',FALSE,
  ARRAY['biceps'],ARRAY['brachialis'],ARRAY['biceps','forearms'],
  ARRAY['pull','upper','arms'],ARRAY['dumbbell'],
  'beginner',1,90,'pull',TRUE,FALSE,1,TRUE,
  ARRAY['drop_set','superset','myo_rep'],
  'Neutral grip (thumbs up). Targets brachialis. Adds arm thickness.'),

('Incline Dumbbell Curl','isolation','isolation','dumbbell',FALSE,
  ARRAY['biceps'],ARRAY['biceps'],ARRAY['brachialis'],
  ARRAY['pull','upper','arms'],ARRAY['dumbbell','bench'],
  'beginner',2,80,'pull',TRUE,FALSE,1,TRUE,
  ARRAY['superset','drop_set'],
  'Bench 45-60 degrees. Arms hang behind torso. Full stretch = full long head activation.'),

('Cable Curl (Bar)','isolation','isolation','cable',FALSE,
  ARRAY['biceps'],ARRAY['biceps'],ARRAY['brachialis'],
  ARRAY['pull','upper','arms'],ARRAY['cable'],
  'beginner',1,85,'pull',FALSE,FALSE,1,TRUE,
  ARRAY['drop_set','myo_rep','superset'],
  'Constant tension. Full ROM. Squeeze hard at top.'),

('Preacher Curl (Machine)','isolation','isolation','machine',FALSE,
  ARRAY['biceps'],ARRAY['biceps'],ARRAY[]::TEXT[],
  ARRAY['pull','upper','arms'],ARRAY['machine'],
  'beginner',1,82,'pull',FALSE,FALSE,1,TRUE,
  ARRAY['drop_set','myo_rep'],
  'Isolates bicep. Full extension critical. Squeeze at top.'),

('Preacher Curl (EZ Bar)','isolation','isolation','ez_bar',FALSE,
  ARRAY['biceps'],ARRAY['biceps'],ARRAY[]::TEXT[],
  ARRAY['pull','upper','arms'],ARRAY['ez_bar','preacher_bench'],
  'intermediate',2,80,'pull',FALSE,FALSE,2,TRUE,
  ARRAY['drop_set'],
  'Upper arm on pad at all times. Full extension. Do not let elbow lock.'),

('Concentration Curl','isolation','isolation','dumbbell',FALSE,
  ARRAY['biceps'],ARRAY['biceps'],ARRAY[]::TEXT[],
  ARRAY['pull','upper','arms'],ARRAY['dumbbell'],
  'beginner',1,78,'pull',TRUE,FALSE,1,TRUE,
  ARRAY['myo_rep'],
  'Elbow braced on inner thigh. Full ROM. Squeeze hard at top. Peak contraction focus.'),

-- ===== LEGS — QUAD COMPOUNDS =====
('Barbell Back Squat','strength','squat','barbell',TRUE,
  ARRAY['quads'],ARRAY['quads'],ARRAY['glutes','hamstrings','core','erectors'],
  ARRAY['legs','lower','full_body'],ARRAY['barbell','squat_rack'],
  'intermediate',4,92,'push',FALSE,FALSE,4,TRUE,
  ARRAY['pause_rep','tempo','cluster'],
  'Bar on traps. Brace core. Break at knees and hips simultaneously. Hip crease below knee. Drive through full foot.'),

('Goblet Squat','strength','squat','dumbbell',TRUE,
  ARRAY['quads'],ARRAY['quads'],ARRAY['glutes','core'],
  ARRAY['legs','lower','full_body'],ARRAY['dumbbell','kettlebell'],
  'beginner',2,88,'push',FALSE,FALSE,2,TRUE,
  ARRAY['tempo','pause_rep'],
  'DB at chest. Elbows between knees at bottom. Upright torso. Full depth. Best beginner squat.'),

('Leg Press','strength','squat','machine',TRUE,
  ARRAY['quads'],ARRAY['quads'],ARRAY['glutes','hamstrings'],
  ARRAY['legs','lower'],ARRAY['machine'],
  'beginner',1,95,'push',FALSE,FALSE,2,TRUE,
  ARRAY['drop_set','superset'],
  'Feet shoulder-width, mid-platform. Lower until 90 degrees knee. Do not lock. Full ROM.'),

('Hack Squat Machine','strength','squat','machine',TRUE,
  ARRAY['quads'],ARRAY['quads'],ARRAY['glutes'],
  ARRAY['legs','lower'],ARRAY['machine'],
  'beginner',2,82,'push',FALSE,FALSE,3,TRUE,
  ARRAY['drop_set','tempo'],
  'Back flat against pad. Feet mid-low platform. Full ROM. Knees track over toes.'),

('Bulgarian Split Squat','strength','lunge','dumbbell',TRUE,
  ARRAY['quads'],ARRAY['quads'],ARRAY['glutes','hamstrings'],
  ARRAY['legs','lower'],ARRAY['dumbbell','bench'],
  'beginner',3,85,'push',TRUE,FALSE,3,TRUE,
  ARRAY['tempo','drop_set'],
  'Rear foot elevated. Front foot forward enough. Lower straight down. Front knee tracks toes.'),

('Lunges (Dumbbell)','strength','lunge','dumbbell',TRUE,
  ARRAY['quads'],ARRAY['quads'],ARRAY['glutes','hamstrings'],
  ARRAY['legs','lower'],ARRAY['dumbbell'],
  'beginner',2,88,'push',TRUE,FALSE,2,TRUE,
  ARRAY['superset','tempo'],
  'Step forward. Lower back knee toward floor. Front knee over ankle. Push back to start.'),

('Smith Machine Squat','strength','squat','smith',TRUE,
  ARRAY['quads'],ARRAY['quads'],ARRAY['glutes'],
  ARRAY['legs','lower'],ARRAY['smith'],
  'beginner',2,78,'push',FALSE,FALSE,2,TRUE,
  ARRAY['drop_set'],
  'Walk feet forward slightly. Good for learning squat pattern.'),

('Step-Ups','strength','lunge','dumbbell',TRUE,
  ARRAY['quads'],ARRAY['quads'],ARRAY['glutes','hamstrings'],
  ARRAY['legs','lower'],ARRAY['dumbbell','bench'],
  'beginner',2,80,'push',TRUE,FALSE,2,TRUE,
  ARRAY['superset'],
  'Step onto bench. Drive through heel of lead leg. Full hip extension at top.'),

-- ===== LEGS — QUAD ISOLATION =====
('Leg Extension Machine','isolation','isolation','machine',FALSE,
  ARRAY['quads'],ARRAY['quads'],ARRAY[]::TEXT[],
  ARRAY['legs','lower'],ARRAY['machine'],
  'beginner',1,95,'push',FALSE,FALSE,2,TRUE,
  ARRAY['drop_set','myo_rep','superset'],
  'Knee aligns with pivot. Full extension. Pause 1 second at top. Slow descent.'),

-- ===== LEGS — HAMSTRING COMPOUNDS =====
('Romanian Deadlift (Barbell)','strength','hinge','barbell',TRUE,
  ARRAY['hamstrings'],ARRAY['hamstrings'],ARRAY['glutes','erectors'],
  ARRAY['legs','lower'],ARRAY['barbell'],
  'intermediate',3,90,'pull',FALSE,FALSE,3,TRUE,
  ARRAY['tempo','pause_rep'],
  'Soft knee bend. Push hips back, bar close to body. Feel stretch at mid-shin. Drive hips through.'),

('Romanian Deadlift (Dumbbell)','strength','hinge','dumbbell',TRUE,
  ARRAY['hamstrings'],ARRAY['hamstrings'],ARRAY['glutes','erectors'],
  ARRAY['legs','lower'],ARRAY['dumbbell'],
  'beginner',2,88,'pull',FALSE,FALSE,2,TRUE,
  ARRAY['tempo','superset'],
  'Same as barbell RDL. DBs hang naturally. Hip hinge focus.'),

('Conventional Deadlift','strength','hinge','barbell',TRUE,
  ARRAY['hamstrings'],ARRAY['hamstrings'],ARRAY['glutes','quads','erectors','traps'],
  ARRAY['legs','lower','full_body'],ARRAY['barbell'],
  'intermediate',4,88,'pull',FALSE,FALSE,5,TRUE,
  ARRAY['pause_rep','cluster'],
  'Bar over mid-foot. Hinge down, chest up, lats tight. Drive floor away. Lock hips and knees at top.'),

('Sumo Deadlift','strength','hinge','barbell',TRUE,
  ARRAY['hamstrings'],ARRAY['hamstrings'],ARRAY['glutes','quads','adductors','erectors'],
  ARRAY['legs','lower'],ARRAY['barbell'],
  'intermediate',4,80,'pull',FALSE,FALSE,4,TRUE,
  ARRAY['pause_rep'],
  'Wide stance, toes out. Bar inside legs. Drive knees out. More hip/glute than conventional.'),

('Good Morning','strength','hinge','barbell',TRUE,
  ARRAY['hamstrings'],ARRAY['hamstrings'],ARRAY['glutes','erectors'],
  ARRAY['legs','lower'],ARRAY['barbell'],
  'intermediate',3,70,'pull',FALSE,FALSE,4,TRUE,
  ARRAY['tempo'],
  'Bar on traps. Slight knee bend. Hinge forward until torso near parallel. Drive hips back up.'),

-- ===== LEGS — HAMSTRING ISOLATION =====
('Lying Leg Curl Machine','isolation','isolation','machine',FALSE,
  ARRAY['hamstrings'],ARRAY['hamstrings'],ARRAY['calves'],
  ARRAY['legs','lower'],ARRAY['machine'],
  'beginner',1,92,'pull',FALSE,FALSE,1,TRUE,
  ARRAY['drop_set','myo_rep','superset'],
  'Hips flat on pad. Curl to glutes. Squeeze at top. Slow 3-count descent.'),

('Seated Leg Curl Machine','isolation','isolation','machine',FALSE,
  ARRAY['hamstrings'],ARRAY['hamstrings'],ARRAY['calves'],
  ARRAY['legs','lower'],ARRAY['machine'],
  'beginner',1,90,'pull',FALSE,FALSE,1,TRUE,
  ARRAY['drop_set','myo_rep'],
  'Hits short head differently. Full ROM. Squeeze at peak.'),

('Nordic Hamstring Curl','isolation','hinge','bodyweight',FALSE,
  ARRAY['hamstrings'],ARRAY['hamstrings'],ARRAY[]::TEXT[],
  ARRAY['legs','lower'],ARRAY['bodyweight'],
  'advanced',5,65,'pull',FALSE,FALSE,3,TRUE,
  ARRAY['tempo'],
  'Feet anchored. Lower as slowly as possible. Catch with hands, push up. Extreme eccentric.'),

-- ===== LEGS — GLUTES =====
('Hip Thrust (Barbell)','strength','hinge','barbell',TRUE,
  ARRAY['glutes'],ARRAY['glutes'],ARRAY['hamstrings','quads'],
  ARRAY['legs','lower'],ARRAY['barbell','bench'],
  'beginner',2,88,'push',FALSE,FALSE,2,TRUE,
  ARRAY['drop_set','superset','pause_rep'],
  'Shoulders on bench, bar on hip crease. Drive hips up. Squeeze glutes at top.'),

('Hip Thrust (Dumbbell)','strength','hinge','dumbbell',TRUE,
  ARRAY['glutes'],ARRAY['glutes'],ARRAY['hamstrings'],
  ARRAY['legs','lower'],ARRAY['dumbbell','bench'],
  'beginner',1,85,'push',FALSE,FALSE,2,TRUE,
  ARRAY['drop_set','superset'],
  'DB on hips. Full extension, squeeze glutes at top.'),

('Hip Thrust (Machine)','strength','hinge','machine',TRUE,
  ARRAY['glutes'],ARRAY['glutes'],ARRAY['hamstrings'],
  ARRAY['legs','lower'],ARRAY['machine'],
  'beginner',1,82,'push',FALSE,FALSE,1,TRUE,
  ARRAY['drop_set'],
  'Consistent resistance curve. Full extension. Squeeze glutes.'),

('Cable Glute Kickback','isolation','isolation','cable',FALSE,
  ARRAY['glutes'],ARRAY['glutes'],ARRAY['hamstrings'],
  ARRAY['legs','lower'],ARRAY['cable'],
  'beginner',1,80,'push',TRUE,FALSE,1,TRUE,
  ARRAY['myo_rep','superset'],
  'Ankle attachment. Brace core. Kick back and up. Squeeze at top.'),

('Glute Bridge (Bodyweight)','strength','hinge','bodyweight',TRUE,
  ARRAY['glutes'],ARRAY['glutes'],ARRAY['hamstrings'],
  ARRAY['legs','lower','full_body'],ARRAY['bodyweight'],
  'beginner',1,85,'push',FALSE,FALSE,1,TRUE,
  ARRAY['superset','pause_rep'],
  'Feet flat, knees bent. Drive hips up. Squeeze glutes. Pause 2 seconds.'),

('Cable Pull-Through','strength','hinge','cable',TRUE,
  ARRAY['glutes'],ARRAY['glutes'],ARRAY['hamstrings','erectors'],
  ARRAY['legs','lower'],ARRAY['cable'],
  'intermediate',2,72,'pull',FALSE,FALSE,2,TRUE,
  ARRAY['superset'],
  'Cable between legs, face away. Hip hinge forward, rope between legs. Drive hips through.'),

-- ===== LEGS — CALVES =====
('Standing Calf Raise Machine','isolation','isolation','machine',FALSE,
  ARRAY['calves'],ARRAY['calves'],ARRAY[]::TEXT[],
  ARRAY['legs','lower'],ARRAY['machine'],
  'beginner',1,92,'push',FALSE,FALSE,1,TRUE,
  ARRAY['drop_set','myo_rep'],
  'Full ROM. Deep stretch at bottom, full contraction at top. 3-second descent. Hold 1 second at top.'),

('Seated Calf Raise Machine','isolation','isolation','machine',FALSE,
  ARRAY['calves'],ARRAY['calves'],ARRAY[]::TEXT[],
  ARRAY['legs','lower'],ARRAY['machine'],
  'beginner',1,90,'push',FALSE,FALSE,1,TRUE,
  ARRAY['drop_set','myo_rep'],
  'Targets soleus. Same ROM protocol. Full stretch critical.'),

('Leg Press Calf Raise','isolation','isolation','machine',FALSE,
  ARRAY['calves'],ARRAY['calves'],ARRAY[]::TEXT[],
  ARRAY['legs','lower'],ARRAY['machine'],
  'beginner',1,85,'push',FALSE,FALSE,1,TRUE,
  ARRAY['drop_set'],
  'Toes on edge of platform. Full ROM. Do not lock knees.'),

('Single-Leg Calf Raise (Bodyweight)','isolation','isolation','bodyweight',FALSE,
  ARRAY['calves'],ARRAY['calves'],ARRAY[]::TEXT[],
  ARRAY['legs','lower'],ARRAY['bodyweight'],
  'beginner',1,82,'push',TRUE,FALSE,1,TRUE,
  ARRAY['myo_rep'],
  'On edge of step. Full stretch at bottom. Full contraction at top. No bouncing.'),

-- ===== CORE =====
('Plank','isolation','core','bodyweight',FALSE,
  ARRAY['core'],ARRAY['core'],ARRAY['glutes','shoulders'],
  ARRAY['full_body','legs'],ARRAY['bodyweight'],
  'beginner',1,95,'static',FALSE,FALSE,1,TRUE,
  ARRAY['superset'],
  'Straight body head to heels. Squeeze glutes and abs. No hip sag. Breathe normally.'),

('Cable Crunch','isolation','core','cable',FALSE,
  ARRAY['core'],ARRAY['core'],ARRAY[]::TEXT[],
  ARRAY['full_body','legs','arms'],ARRAY['cable'],
  'beginner',2,85,'pull',FALSE,FALSE,1,TRUE,
  ARRAY['myo_rep','superset'],
  'Kneel at cable. Rope at head. Crunch elbows toward thighs. Abs — not hips.'),

('Ab Wheel Rollout','isolation','core','bodyweight',FALSE,
  ARRAY['core'],ARRAY['core'],ARRAY['lats','shoulders'],
  ARRAY['full_body','legs'],ARRAY['bodyweight','ab_wheel'],
  'intermediate',4,80,'push',FALSE,FALSE,2,TRUE,
  ARRAY['superset'],
  'On knees. Roll out until hips about to sag. Pull back with abs. No lower back hyperextension.'),

('Hanging Leg Raise','isolation','core','bodyweight',FALSE,
  ARRAY['core'],ARRAY['core'],ARRAY['hip_flexors'],
  ARRAY['full_body','legs'],ARRAY['bodyweight','pull_up_bar'],
  'intermediate',3,82,'pull',FALSE,FALSE,2,TRUE,
  ARRAY['superset'],
  'Dead hang. Raise legs to 90+ degrees. Control descent. No swing.'),

('Pallof Press','isolation','core','cable',FALSE,
  ARRAY['core'],ARRAY['core'],ARRAY['obliques'],
  ARRAY['full_body'],ARRAY['cable'],
  'intermediate',2,75,'push',FALSE,FALSE,1,TRUE,
  ARRAY['superset'],
  'Cable at chest height, stand perpendicular. Press out and resist rotation. Anti-rotation.'),

-- ===== FULL BODY / HINGE ALTERNATIVES =====
('Trap Bar Deadlift','strength','hinge','barbell',TRUE,
  ARRAY['quads','hamstrings'],ARRAY['quads','hamstrings'],ARRAY['glutes','erectors','traps'],
  ARRAY['legs','lower','full_body'],ARRAY['trap_bar'],
  'beginner',3,80,'pull',FALSE,FALSE,3,TRUE,
  ARRAY['pause_rep','tempo'],
  'Neutral grip. Sit into the lift. Upright torso. Drive floor away. Best beginner deadlift.'),

('Barbell Front Squat','strength','squat','barbell',TRUE,
  ARRAY['quads'],ARRAY['quads'],ARRAY['core','front_delts','upper_back'],
  ARRAY['legs','lower'],ARRAY['barbell','squat_rack'],
  'intermediate',4,70,'push',FALSE,FALSE,4,TRUE,
  ARRAY['pause_rep','tempo'],
  'Bar on front delts. Elbows high. Very upright torso. Extreme quad emphasis. Demands mobility.'),

-- ===== ADDITIONAL SHOULDERS =====
('Landmine Press','strength','vertical_push','barbell',TRUE,
  ARRAY['front_delts','side_delts'],ARRAY['front_delts'],ARRAY['triceps','upper_back'],
  ARRAY['push','upper','shoulders'],ARRAY['barbell'],
  'intermediate',3,65,'push',TRUE,FALSE,2,TRUE,
  ARRAY['superset'],
  'Bar in landmine. Hold at shoulder, press up and forward. Shoulder-friendly OHP alternative.'),

('Push Press','strength','vertical_push','barbell',TRUE,
  ARRAY['front_delts','side_delts'],ARRAY['front_delts','side_delts'],ARRAY['triceps','quads','core'],
  ARRAY['push','upper','shoulders'],ARRAY['barbell'],
  'intermediate',4,70,'push',FALSE,FALSE,3,TRUE,
  ARRAY['cluster'],
  'Slight knee dip, drive bar overhead with leg drive. More weight than strict press.'),

-- ===== BODYWEIGHT ALTERNATIVES =====
('Pike Push-Up','strength','vertical_push','bodyweight',TRUE,
  ARRAY['front_delts','side_delts'],ARRAY['front_delts'],ARRAY['triceps'],
  ARRAY['push','upper'],ARRAY['bodyweight'],
  'beginner',2,75,'push',FALSE,FALSE,2,TRUE,
  ARRAY['superset'],
  'Hips high, body inverted V. Lower head toward floor. Shoulder press alternative.'),

('Archer Push-Up','strength','horizontal_push','bodyweight',TRUE,
  ARRAY['chest'],ARRAY['chest'],ARRAY['triceps','front_delts'],
  ARRAY['push','upper'],ARRAY['bodyweight'],
  'intermediate',3,72,'push',TRUE,FALSE,2,TRUE,
  ARRAY['superset'],
  'Wide hands. Lower to one side, extending opposite arm. Harder than standard push-up.'),

('Australian Pull-Up','strength','horizontal_pull','bodyweight',TRUE,
  ARRAY['rhomboids','lats'],ARRAY['rhomboids','lats'],ARRAY['biceps'],
  ARRAY['pull','upper'],ARRAY['bodyweight'],
  'beginner',2,75,'pull',FALSE,FALSE,1,TRUE,
  ARRAY['superset'],
  'Bar at waist height. Hang below, body straight. Pull chest to bar. Stepping stone to pull-up.'),

('Band Face Pull','isolation','horizontal_pull','bands',FALSE,
  ARRAY['rear_delts'],ARRAY['rear_delts'],ARRAY['rhomboids'],
  ARRAY['push','pull','upper'],ARRAY['bands'],
  'beginner',1,75,'pull',FALSE,FALSE,1,TRUE,
  ARRAY['myo_rep','superset'],
  'Band at face height. Pull to forehead. External rotation. Cable face pull substitute.'),

('Single-Leg Romanian Deadlift','strength','hinge','dumbbell',TRUE,
  ARRAY['hamstrings'],ARRAY['hamstrings'],ARRAY['glutes','core'],
  ARRAY['legs','lower'],ARRAY['dumbbell'],
  'beginner',3,78,'pull',TRUE,FALSE,2,TRUE,
  ARRAY['superset'],
  'Balance on one leg. Hinge forward, weight hangs. Feel hamstring stretch. Builds symmetry.'),

('Glute Bridge Curl','isolation','hinge','bodyweight',FALSE,
  ARRAY['hamstrings'],ARRAY['hamstrings'],ARRAY['glutes'],
  ARRAY['legs','lower'],ARRAY['bodyweight'],
  'beginner',2,72,'pull',FALSE,FALSE,1,TRUE,
  ARRAY['superset'],
  'Heels on elevated surface. Bridge up then curl heels toward glutes. Home hamstring curl sub.'),

('Pistol Squat (Progression)','strength','squat','bodyweight',TRUE,
  ARRAY['quads'],ARRAY['quads'],ARRAY['glutes','core'],
  ARRAY['legs','lower'],ARRAY['bodyweight'],
  'advanced',5,65,'push',TRUE,FALSE,3,TRUE,
  ARRAY['superset'],
  'Single leg squat to full depth. Use counter balance at first. Extreme strength + mobility.')

ON CONFLICT DO NOTHING;
