-- Migration 065: Seed core exercise library
-- System exercises only (organization_id = NULL)
-- popularity_score: 1-100 (higher = more universally known/accessible)
-- difficulty: 1-5 (1=simple, 5=highly technical)
-- experience_min: 'beginner' | 'intermediate' | 'advanced'
-- joint_stress_level: 1-5 (1=low, 5=high)

INSERT INTO exercises (
  name, category, movement_pattern, equipment, is_compound,
  muscle_groups, primary_muscles, secondary_muscles,
  split_tags, equipment_options, experience_min, difficulty,
  popularity_score, force_type, is_unilateral, requires_spotter,
  joint_stress_level, is_system_exercise, technique_compatibility, cues
) VALUES

-- ============================================================
-- PUSH — CHEST COMPOUNDS
-- ============================================================
('Barbell Bench Press', 'strength', 'horizontal_push', 'barbell', TRUE,
  ARRAY['chest','triceps','front_delts'], ARRAY['chest'], ARRAY['triceps','front_delts'],
  ARRAY['push','upper','full_body','chest'], ARRAY['barbell','bench'],
  'beginner', 2, 99, 'push', FALSE, TRUE, 3, TRUE,
  ARRAY['drop_set','superset','tempo','pause_rep','rest_pause'],
  'Retract scapula and drive into bench. Bar to nipple line. Full ROM. Drive feet into floor.'),

('Dumbbell Bench Press', 'strength', 'horizontal_push', 'dumbbell', TRUE,
  ARRAY['chest','triceps','front_delts'], ARRAY['chest'], ARRAY['triceps','front_delts'],
  ARRAY['push','upper','full_body','chest'], ARRAY['dumbbell','bench'],
  'beginner', 2, 96, 'push', FALSE, FALSE, 2, TRUE,
  ARRAY['drop_set','superset','tempo','mechanical_drop_set'],
  'Greater stretch at bottom than barbell. Neutral or pronated grip. Touch plates lightly at top.'),

('Incline Barbell Bench Press', 'strength', 'incline_push', 'barbell', TRUE,
  ARRAY['chest','triceps','front_delts'], ARRAY['chest'], ARRAY['triceps','front_delts'],
  ARRAY['push','upper','chest'], ARRAY['barbell','bench'],
  'beginner', 3, 90, 'push', FALSE, TRUE, 3, TRUE,
  ARRAY['drop_set','superset','tempo'],
  '30–45° incline. Bar to upper chest. Elbows 45–75° from torso. Full ROM.'),

('Incline Dumbbell Press', 'strength', 'incline_push', 'dumbbell', TRUE,
  ARRAY['chest','triceps','front_delts'], ARRAY['chest'], ARRAY['triceps','front_delts'],
  ARRAY['push','upper','chest'], ARRAY['dumbbell','bench'],
  'beginner', 2, 92, 'push', FALSE, FALSE, 2, TRUE,
  ARRAY['drop_set','superset','tempo','mechanical_drop_set'],
  '30–45° incline. Deep stretch at bottom. Squeeze at top without locking out.'),

('Cable Chest Fly', 'hypertrophy', 'fly', 'cable', FALSE,
  ARRAY['chest','front_delts'], ARRAY['chest'], ARRAY['front_delts'],
  ARRAY['push','upper','chest'], ARRAY['cable'],
  'beginner', 2, 85, 'push', FALSE, FALSE, 2, TRUE,
  ARRAY['drop_set','superset','myo_rep','tempo'],
  'Slight bend in elbows throughout. Squeeze chest at midline. Control the eccentric.'),

('Pec Deck / Machine Fly', 'hypertrophy', 'fly', 'machine', FALSE,
  ARRAY['chest','front_delts'], ARRAY['chest'], ARRAY['front_delts'],
  ARRAY['push','upper','chest'], ARRAY['machine'],
  'beginner', 1, 88, 'push', FALSE, FALSE, 1, TRUE,
  ARRAY['drop_set','superset','myo_rep','rest_pause'],
  'Elbows in line with shoulders. Full squeeze at midpoint. Slow eccentric 3–4 seconds.'),

('Chest Dip', 'strength', 'dip', 'bodyweight', TRUE,
  ARRAY['chest','triceps','front_delts'], ARRAY['chest'], ARRAY['triceps','front_delts'],
  ARRAY['push','upper','chest'], ARRAY['bodyweight','dip_bar'],
  'intermediate', 3, 82, 'push', FALSE, FALSE, 3, TRUE,
  ARRAY['weighted','drop_set','superset'],
  'Lean forward 20–30° for chest emphasis. Full depth, elbows flare slightly. Control descent.'),

('Push-Up', 'strength', 'horizontal_push', 'bodyweight', TRUE,
  ARRAY['chest','triceps','front_delts'], ARRAY['chest'], ARRAY['triceps','front_delts'],
  ARRAY['push','upper','full_body','chest'], ARRAY['bodyweight'],
  'beginner', 1, 95, 'push', FALSE, FALSE, 1, TRUE,
  ARRAY['superset','tempo','mechanical_drop_set'],
  'Hands slightly wider than shoulders. Full ROM chest to floor. Hollow body position.'),

-- ============================================================
-- PUSH — SHOULDER COMPOUNDS
-- ============================================================
('Barbell Overhead Press', 'strength', 'vertical_push', 'barbell', TRUE,
  ARRAY['front_delts','side_delts','triceps','upper_traps'], ARRAY['front_delts','side_delts'], ARRAY['triceps','upper_traps'],
  ARRAY['push','upper','shoulders'], ARRAY['barbell'],
  'beginner', 3, 92, 'push', FALSE, FALSE, 3, TRUE,
  ARRAY['drop_set','superset','tempo','pause_rep'],
  'Bar starts at clavicle. Press straight up — head back, then forward. Full lockout. Brace core.'),

('Dumbbell Overhead Press', 'strength', 'vertical_push', 'dumbbell', TRUE,
  ARRAY['front_delts','side_delts','triceps'], ARRAY['front_delts','side_delts'], ARRAY['triceps'],
  ARRAY['push','upper','shoulders'], ARRAY['dumbbell'],
  'beginner', 2, 94, 'push', FALSE, FALSE, 2, TRUE,
  ARRAY['drop_set','superset','tempo','mechanical_drop_set'],
  'Neutral or pronated grip. Press up and in. Full ROM — shoulder height to lockout.'),

('Arnold Press', 'hypertrophy', 'vertical_push', 'dumbbell', TRUE,
  ARRAY['front_delts','side_delts','rear_delts','triceps'], ARRAY['front_delts','side_delts'], ARRAY['rear_delts','triceps'],
  ARRAY['push','upper','shoulders'], ARRAY['dumbbell'],
  'intermediate', 3, 80, 'push', FALSE, FALSE, 3, TRUE,
  ARRAY['superset','drop_set'],
  'Rotate palms from facing you to facing out during press. Controlled rotation throughout.'),

('Machine Shoulder Press', 'strength', 'vertical_push', 'machine', TRUE,
  ARRAY['front_delts','side_delts','triceps'], ARRAY['front_delts','side_delts'], ARRAY['triceps'],
  ARRAY['push','upper','shoulders'], ARRAY['machine'],
  'beginner', 1, 86, 'push', FALSE, FALSE, 2, TRUE,
  ARRAY['drop_set','superset','myo_rep','rest_pause'],
  'Adjust seat so handles align with shoulders. Full ROM. Controlled descent.'),

-- ============================================================
-- PUSH — SHOULDER ISOLATION
-- ============================================================
('Dumbbell Lateral Raise', 'hypertrophy', 'isolation', 'dumbbell', FALSE,
  ARRAY['side_delts','upper_traps'], ARRAY['side_delts'], ARRAY['upper_traps'],
  ARRAY['push','upper','shoulders'], ARRAY['dumbbell'],
  'beginner', 1, 95, 'push', FALSE, FALSE, 1, TRUE,
  ARRAY['drop_set','myo_rep','superset','rest_pause'],
  'Lead with elbows. Pinky slightly higher. Stop at shoulder height. Slight forward lean.'),

('Cable Lateral Raise', 'hypertrophy', 'isolation', 'cable', FALSE,
  ARRAY['side_delts'], ARRAY['side_delts'], ARRAY['upper_traps'],
  ARRAY['push','upper','shoulders'], ARRAY['cable'],
  'beginner', 2, 82, 'push', TRUE, FALSE, 1, TRUE,
  ARRAY['drop_set','myo_rep','superset'],
  'Cable at wrist height. Cross body or ipsilateral. Constant tension throughout arc.'),

('Machine Lateral Raise', 'hypertrophy', 'isolation', 'machine', FALSE,
  ARRAY['side_delts'], ARRAY['side_delts'], ARRAY['upper_traps'],
  ARRAY['push','upper','shoulders'], ARRAY['machine'],
  'beginner', 1, 78, 'push', FALSE, FALSE, 1, TRUE,
  ARRAY['drop_set','myo_rep','rest_pause'],
  'Pad on lower tricep, not elbow. Lead elbows. Full contraction at top.'),

('Dumbbell Front Raise', 'hypertrophy', 'isolation', 'dumbbell', FALSE,
  ARRAY['front_delts'], ARRAY['front_delts'], ARRAY['side_delts'],
  ARRAY['push','upper','shoulders'], ARRAY['dumbbell'],
  'beginner', 1, 75, 'push', FALSE, FALSE, 1, TRUE,
  ARRAY['superset','drop_set'],
  'Slight bend in elbow. Raise to eye level. Alternate or bilateral. Avoid swinging.'),

-- ============================================================
-- PUSH — REAR DELTS
-- ============================================================
('Face Pull', 'hypertrophy', 'isolation', 'cable', FALSE,
  ARRAY['rear_delts','upper_traps','rotator_cuff'], ARRAY['rear_delts'], ARRAY['upper_traps','rotator_cuff'],
  ARRAY['push','pull','upper','shoulders'], ARRAY['cable'],
  'beginner', 2, 88, 'pull', FALSE, FALSE, 1, TRUE,
  ARRAY['superset','myo_rep','drop_set'],
  'Rope at eye level. Pull to forehead, elbows flare up and out. External rotate fully at end.'),

('Reverse Pec Deck', 'hypertrophy', 'isolation', 'machine', FALSE,
  ARRAY['rear_delts','upper_traps'], ARRAY['rear_delts'], ARRAY['upper_traps'],
  ARRAY['push','pull','upper','shoulders'], ARRAY['machine'],
  'beginner', 1, 80, 'pull', FALSE, FALSE, 1, TRUE,
  ARRAY['drop_set','myo_rep','superset','rest_pause'],
  'Chest on pad. Arms parallel to floor. Lead with elbows back. Squeeze rear delts at end.'),

('Dumbbell Rear Delt Fly', 'hypertrophy', 'isolation', 'dumbbell', FALSE,
  ARRAY['rear_delts','upper_traps'], ARRAY['rear_delts'], ARRAY['upper_traps'],
  ARRAY['push','pull','upper','shoulders'], ARRAY['dumbbell'],
  'beginner', 2, 78, 'pull', FALSE, FALSE, 1, TRUE,
  ARRAY['drop_set','superset','myo_rep'],
  'Hinge forward 70°. Slight bend in elbows. Lead with elbows back, not hands.'),

('Band Pull Apart', 'hypertrophy', 'isolation', 'band', FALSE,
  ARRAY['rear_delts','rotator_cuff'], ARRAY['rear_delts'], ARRAY['rotator_cuff'],
  ARRAY['push','pull','upper','shoulders'], ARRAY['band','bodyweight'],
  'beginner', 1, 65, 'pull', FALSE, FALSE, 1, TRUE,
  ARRAY['superset','myo_rep'],
  'Arms at shoulder height. Pull band to chest. Squeeze rear delts. Full width.'),

-- ============================================================
-- PUSH — TRICEPS
-- ============================================================
('Close Grip Bench Press', 'strength', 'horizontal_push', 'barbell', TRUE,
  ARRAY['triceps','chest','front_delts'], ARRAY['triceps'], ARRAY['chest','front_delts'],
  ARRAY['push','upper','triceps'], ARRAY['barbell','bench'],
  'intermediate', 3, 82, 'push', FALSE, TRUE, 3, TRUE,
  ARRAY['drop_set','superset','tempo'],
  'Hands shoulder-width. Elbows tucked, not flared. Full ROM. Bar to lower chest.'),

('Cable Tricep Pushdown', 'hypertrophy', 'isolation', 'cable', FALSE,
  ARRAY['triceps'], ARRAY['triceps'], ARRAY['front_delts'],
  ARRAY['push','upper','triceps'], ARRAY['cable'],
  'beginner', 1, 94, 'push', FALSE, FALSE, 1, TRUE,
  ARRAY['drop_set','superset','myo_rep','rest_pause'],
  'Elbows pinned to sides. Full extension at bottom. Bar/rope — both work. Control up.'),

('Overhead Tricep Extension', 'hypertrophy', 'isolation', 'dumbbell', FALSE,
  ARRAY['triceps'], ARRAY['triceps'], ARRAY[]::TEXT[],
  ARRAY['push','upper','triceps'], ARRAY['dumbbell','cable','ez_bar'],
  'beginner', 2, 85, 'push', FALSE, FALSE, 2, TRUE,
  ARRAY['drop_set','superset','myo_rep'],
  'Elbows point up, not out. Full stretch at bottom. Squeeze at top. Great long head stretch.'),

('Skull Crusher', 'hypertrophy', 'isolation', 'barbell', FALSE,
  ARRAY['triceps'], ARRAY['triceps'], ARRAY[]::TEXT[],
  ARRAY['push','upper','triceps'], ARRAY['barbell','ez_bar','dumbbell'],
  'intermediate', 3, 84, 'push', FALSE, FALSE, 3, TRUE,
  ARRAY['superset','drop_set','tempo'],
  'Lower bar to forehead or behind. Keep elbows stationary. Full extension. Use EZ bar for wrist comfort.'),

('Tricep Dip', 'strength', 'dip', 'bodyweight', FALSE,
  ARRAY['triceps','chest','front_delts'], ARRAY['triceps'], ARRAY['chest','front_delts'],
  ARRAY['push','upper','triceps'], ARRAY['bodyweight','dip_bar','bench'],
  'beginner', 2, 80, 'push', FALSE, FALSE, 2, TRUE,
  ARRAY['weighted','superset','drop_set'],
  'Upright torso for tricep focus. Full depth. Elbows track back. Can add weight with belt.'),

('Diamond Push-Up', 'hypertrophy', 'horizontal_push', 'bodyweight', FALSE,
  ARRAY['triceps','chest'], ARRAY['triceps'], ARRAY['chest'],
  ARRAY['push','upper','triceps'], ARRAY['bodyweight'],
  'intermediate', 2, 68, 'push', FALSE, FALSE, 2, TRUE,
  ARRAY['superset','myo_rep','drop_set'],
  'Hands form diamond under chest. Elbows track back not out. Full ROM.'),

-- ============================================================
-- PULL — BACK COMPOUNDS (HORIZONTAL)
-- ============================================================
('Barbell Row', 'strength', 'horizontal_pull', 'barbell', TRUE,
  ARRAY['lats','mid_traps','rear_delts','biceps'], ARRAY['lats','mid_traps'], ARRAY['rear_delts','biceps'],
  ARRAY['pull','upper','full_body','back'], ARRAY['barbell'],
  'beginner', 3, 92, 'pull', FALSE, FALSE, 3, TRUE,
  ARRAY['drop_set','superset','tempo','pause_rep'],
  'Hip hinge ~45°. Pull to lower sternum. Drive elbows back, not up. Retract scapula at top.'),

('Dumbbell Row', 'strength', 'horizontal_pull', 'dumbbell', TRUE,
  ARRAY['lats','mid_traps','rear_delts','biceps'], ARRAY['lats'], ARRAY['mid_traps','rear_delts','biceps'],
  ARRAY['pull','upper','back'], ARRAY['dumbbell'],
  'beginner', 2, 91, 'pull', TRUE, FALSE, 2, TRUE,
  ARRAY['drop_set','superset','tempo','myo_rep'],
  'Support on bench. Pull to hip, not shoulder. Elbow drives back and up. Full stretch at bottom.'),

('Seated Cable Row', 'strength', 'horizontal_pull', 'cable', TRUE,
  ARRAY['lats','mid_traps','rear_delts','biceps'], ARRAY['lats','mid_traps'], ARRAY['rear_delts','biceps'],
  ARRAY['pull','upper','back'], ARRAY['cable'],
  'beginner', 2, 90, 'pull', FALSE, FALSE, 2, TRUE,
  ARRAY['drop_set','superset','tempo','rest_pause'],
  'Sit tall, slight torso lean. Row to navel. Squeeze scapula at end. Full stretch forward.'),

('T-Bar Row', 'strength', 'horizontal_pull', 'barbell', TRUE,
  ARRAY['lats','mid_traps','rear_delts','biceps'], ARRAY['lats','mid_traps'], ARRAY['rear_delts','biceps'],
  ARRAY['pull','upper','back'], ARRAY['barbell','machine'],
  'intermediate', 3, 80, 'pull', FALSE, FALSE, 3, TRUE,
  ARRAY['drop_set','superset'],
  'Wide grip for lats, narrow for mid back. Pull to chest. Drive elbows not hands.'),

('Chest Supported Row', 'hypertrophy', 'horizontal_pull', 'machine', TRUE,
  ARRAY['lats','mid_traps','rear_delts','biceps'], ARRAY['mid_traps','lats'], ARRAY['rear_delts','biceps'],
  ARRAY['pull','upper','back'], ARRAY['machine','dumbbell'],
  'beginner', 2, 78, 'pull', FALSE, FALSE, 1, TRUE,
  ARRAY['drop_set','superset','myo_rep','rest_pause'],
  'Chest on pad eliminates momentum. Drive elbows back and up. Full contraction.'),

('Meadows Row', 'hypertrophy', 'horizontal_pull', 'barbell', TRUE,
  ARRAY['lats','mid_traps','rear_delts','biceps'], ARRAY['lats'], ARRAY['mid_traps','rear_delts','biceps'],
  ARRAY['pull','upper','back'], ARRAY['barbell'],
  'intermediate', 3, 58, 'pull', TRUE, FALSE, 2, TRUE,
  ARRAY['superset','drop_set'],
  'Straddle landmine. Pull to hip with elbow flaring slightly. Long pull arc targets lats.'),

-- ============================================================
-- PULL — BACK COMPOUNDS (VERTICAL)
-- ============================================================
('Pull-Up', 'strength', 'vertical_pull', 'bodyweight', TRUE,
  ARRAY['lats','biceps','rear_delts'], ARRAY['lats'], ARRAY['biceps','rear_delts'],
  ARRAY['pull','upper','full_body','back'], ARRAY['bodyweight','pull_up_bar'],
  'intermediate', 3, 95, 'pull', FALSE, FALSE, 2, TRUE,
  ARRAY['weighted','superset','drop_set','mechanical_drop_set'],
  'Full dead hang at bottom. Chin over bar. Depress and retract scapula before pulling.'),

('Lat Pulldown', 'strength', 'vertical_pull', 'cable', TRUE,
  ARRAY['lats','biceps','rear_delts'], ARRAY['lats'], ARRAY['biceps','rear_delts'],
  ARRAY['pull','upper','back'], ARRAY['cable'],
  'beginner', 2, 95, 'pull', FALSE, FALSE, 2, TRUE,
  ARRAY['drop_set','superset','tempo','rest_pause'],
  'Slight torso lean back. Pull to upper chest. Drive elbows down and back. Full stretch at top.'),

('Wide Grip Lat Pulldown', 'hypertrophy', 'vertical_pull', 'cable', TRUE,
  ARRAY['lats','biceps','rear_delts'], ARRAY['lats'], ARRAY['biceps','rear_delts'],
  ARRAY['pull','upper','back'], ARRAY['cable'],
  'beginner', 2, 88, 'pull', FALSE, FALSE, 2, TRUE,
  ARRAY['drop_set','superset','tempo'],
  'Wider grip emphasizes outer lats. Same mechanics — drive elbows down. Full hang at top.'),

('Machine Row', 'strength', 'horizontal_pull', 'machine', TRUE,
  ARRAY['lats','mid_traps','rear_delts','biceps'], ARRAY['lats','mid_traps'], ARRAY['rear_delts','biceps'],
  ARRAY['pull','upper','back'], ARRAY['machine'],
  'beginner', 1, 84, 'pull', FALSE, FALSE, 1, TRUE,
  ARRAY['drop_set','superset','myo_rep','rest_pause'],
  'Chest on pad. Pull handles to lower ribs. Squeeze shoulder blades. Slow eccentric.'),

-- ============================================================
-- PULL — LAT ISOLATION
-- ============================================================
('Straight Arm Pulldown', 'hypertrophy', 'isolation', 'cable', FALSE,
  ARRAY['lats','teres_major'], ARRAY['lats'], ARRAY['teres_major'],
  ARRAY['pull','upper','back'], ARRAY['cable'],
  'intermediate', 2, 75, 'pull', FALSE, FALSE, 1, TRUE,
  ARRAY['superset','myo_rep','drop_set'],
  'Slight forward lean. Arms nearly straight. Pull bar to hips in arc. Squeeze lats at bottom.'),

('Cable Pullover', 'hypertrophy', 'isolation', 'cable', FALSE,
  ARRAY['lats','chest','teres_major'], ARRAY['lats'], ARRAY['chest','teres_major'],
  ARRAY['pull','push','upper','back'], ARRAY['cable'],
  'intermediate', 2, 60, 'pull', FALSE, FALSE, 2, TRUE,
  ARRAY['superset','myo_rep'],
  'Lie on bench or kneel. Arms sweep arc from overhead to hips. Lats control the movement.'),

('Neutral Grip Lat Pulldown', 'hypertrophy', 'vertical_pull', 'cable', TRUE,
  ARRAY['lats','biceps'], ARRAY['lats'], ARRAY['biceps'],
  ARRAY['pull','upper','back'], ARRAY['cable'],
  'beginner', 2, 80, 'pull', FALSE, FALSE, 1, TRUE,
  ARRAY['drop_set','superset','tempo'],
  'Handles shoulder-width, palms facing in. Greater bicep and lower lat recruitment.'),

-- ============================================================
-- PULL — BICEPS
-- ============================================================
('Barbell Curl', 'hypertrophy', 'isolation', 'barbell', FALSE,
  ARRAY['biceps','brachialis'], ARRAY['biceps'], ARRAY['brachialis'],
  ARRAY['pull','upper','biceps'], ARRAY['barbell','ez_bar'],
  'beginner', 1, 96, 'pull', FALSE, FALSE, 1, TRUE,
  ARRAY['drop_set','superset','tempo','myo_rep','rest_pause','cheat_rep'],
  'Elbows at sides, don't swing. Full ROM. Supinate at top. EZ bar for wrist comfort.'),

('Dumbbell Curl', 'hypertrophy', 'isolation', 'dumbbell', FALSE,
  ARRAY['biceps','brachialis'], ARRAY['biceps'], ARRAY['brachialis'],
  ARRAY['pull','upper','biceps'], ARRAY['dumbbell'],
  'beginner', 1, 95, 'pull', TRUE, FALSE, 1, TRUE,
  ARRAY['drop_set','superset','tempo','myo_rep','mechanical_drop_set'],
  'Alternate or bilateral. Supinate as you curl. Full extension at bottom. Don't swing.'),

('Hammer Curl', 'hypertrophy', 'isolation', 'dumbbell', FALSE,
  ARRAY['brachialis','biceps','brachioradialis'], ARRAY['brachialis'], ARRAY['biceps','brachioradialis'],
  ARRAY['pull','upper','biceps'], ARRAY['dumbbell'],
  'beginner', 1, 90, 'pull', TRUE, FALSE, 1, TRUE,
  ARRAY['drop_set','superset','myo_rep'],
  'Neutral grip throughout. Great for brachialis and forearm thickness. Keep elbows fixed.'),

('Incline Dumbbell Curl', 'hypertrophy', 'isolation', 'dumbbell', FALSE,
  ARRAY['biceps','brachialis'], ARRAY['biceps'], ARRAY['brachialis'],
  ARRAY['pull','upper','biceps'], ARRAY['dumbbell'],
  'intermediate', 2, 76, 'pull', TRUE, FALSE, 2, TRUE,
  ARRAY['drop_set','superset','tempo','myo_rep'],
  'Seat inclined 45–60°. Arms hang freely behind torso — maximum long head stretch. No swinging.'),

('Preacher Curl', 'hypertrophy', 'isolation', 'barbell', FALSE,
  ARRAY['biceps'], ARRAY['biceps'], ARRAY['brachialis'],
  ARRAY['pull','upper','biceps'], ARRAY['barbell','dumbbell','ez_bar','cable'],
  'beginner', 2, 80, 'pull', FALSE, FALSE, 2, TRUE,
  ARRAY['drop_set','superset','myo_rep'],
  'Arm pressed against pad. Don't let elbow hyperextend at bottom. Squeeze hard at top.'),

('Cable Curl', 'hypertrophy', 'isolation', 'cable', FALSE,
  ARRAY['biceps','brachialis'], ARRAY['biceps'], ARRAY['brachialis'],
  ARRAY['pull','upper','biceps'], ARRAY['cable'],
  'beginner', 1, 84, 'pull', FALSE, FALSE, 1, TRUE,
  ARRAY['drop_set','superset','myo_rep','rest_pause'],
  'Constant tension throughout. Low pulley or cable crossover. Full ROM supination.'),

('Machine Curl', 'hypertrophy', 'isolation', 'machine', FALSE,
  ARRAY['biceps'], ARRAY['biceps'], ARRAY['brachialis'],
  ARRAY['pull','upper','biceps'], ARRAY['machine'],
  'beginner', 1, 72, 'pull', FALSE, FALSE, 1, TRUE,
  ARRAY['drop_set','myo_rep','rest_pause'],
  'Pad supports upper arm. Pure bicep isolation. Great for drop sets and failure work.'),

-- ============================================================
-- LEGS — QUAD COMPOUNDS
-- ============================================================
('Barbell Back Squat', 'strength', 'squat', 'barbell', TRUE,
  ARRAY['quads','glutes','hamstrings','core'], ARRAY['quads','glutes'], ARRAY['hamstrings','core'],
  ARRAY['legs','full_body','quads'], ARRAY['barbell'],
  'beginner', 4, 99, 'push', FALSE, TRUE, 4, TRUE,
  ARRAY['pause_rep','tempo','drop_set'],
  'Bar on upper traps (high bar) or rear delts (low bar). Brace core, knees track toes. Hit parallel minimum.'),

('Front Squat', 'strength', 'squat', 'barbell', TRUE,
  ARRAY['quads','glutes','core'], ARRAY['quads'], ARRAY['glutes','core'],
  ARRAY['legs','full_body','quads'], ARRAY['barbell'],
  'intermediate', 5, 80, 'push', FALSE, FALSE, 4, TRUE,
  ARRAY['tempo','pause_rep'],
  'Bar on front delts. Elbows high. Very upright torso. Greater quad demand than back squat.'),

('Hack Squat', 'hypertrophy', 'squat', 'machine', TRUE,
  ARRAY['quads','glutes'], ARRAY['quads'], ARRAY['glutes'],
  ARRAY['legs','quads'], ARRAY['machine'],
  'beginner', 2, 82, 'push', FALSE, FALSE, 3, TRUE,
  ARRAY['drop_set','superset','pause_rep','tempo'],
  'Feet shoulder-width or closer for quad emphasis. Full depth. Control descent. Drive through heels.'),

('Leg Press', 'strength', 'squat', 'machine', TRUE,
  ARRAY['quads','glutes','hamstrings'], ARRAY['quads','glutes'], ARRAY['hamstrings'],
  ARRAY['legs','quads','full_body'], ARRAY['machine'],
  'beginner', 1, 95, 'push', FALSE, FALSE, 3, TRUE,
  ARRAY['drop_set','superset','pause_rep','rest_pause','mechanical_drop_set'],
  'Feet shoulder-width at mid-platform. Don't lock knees at top. Full depth. Don't let hips rise.'),

('Bulgarian Split Squat', 'hypertrophy', 'squat', 'dumbbell', TRUE,
  ARRAY['quads','glutes','hamstrings'], ARRAY['quads','glutes'], ARRAY['hamstrings'],
  ARRAY['legs','quads','glutes'], ARRAY['dumbbell','barbell','bodyweight'],
  'intermediate', 3, 80, 'push', TRUE, FALSE, 3, TRUE,
  ARRAY['drop_set','superset','tempo'],
  'Rear foot elevated on bench. Step far enough forward so front shin stays vertical. Knee to floor.'),

('Goblet Squat', 'hypertrophy', 'squat', 'dumbbell', TRUE,
  ARRAY['quads','glutes','core'], ARRAY['quads'], ARRAY['glutes','core'],
  ARRAY['legs','quads','full_body'], ARRAY['dumbbell','kettlebell'],
  'beginner', 1, 75, 'push', FALSE, FALSE, 2, TRUE,
  ARRAY['superset','tempo','pause_rep'],
  'Hold weight at chest. Elbows between knees at bottom. Great for teaching squat pattern.'),

('Dumbbell Lunge', 'hypertrophy', 'lunge', 'dumbbell', TRUE,
  ARRAY['quads','glutes','hamstrings'], ARRAY['quads','glutes'], ARRAY['hamstrings'],
  ARRAY['legs','quads','glutes'], ARRAY['dumbbell','bodyweight','barbell'],
  'beginner', 2, 88, 'push', TRUE, FALSE, 3, TRUE,
  ARRAY['superset','drop_set'],
  'Step long enough so front shin vertical. Back knee to just above floor. Keep torso upright.'),

('Leg Extension', 'hypertrophy', 'isolation', 'machine', FALSE,
  ARRAY['quads'], ARRAY['quads'], ARRAY[]::TEXT[],
  ARRAY['legs','quads'], ARRAY['machine'],
  'beginner', 1, 90, 'push', FALSE, FALSE, 2, TRUE,
  ARRAY['drop_set','superset','myo_rep','rest_pause','blood_flow_restriction'],
  'Full extension, hold 1 second. Slow eccentric 3 seconds. Don't let plates touch at bottom.'),

-- ============================================================
-- LEGS — HAMSTRING COMPOUNDS
-- ============================================================
('Romanian Deadlift', 'strength', 'hip_hinge', 'barbell', TRUE,
  ARRAY['hamstrings','glutes','lower_back'], ARRAY['hamstrings','glutes'], ARRAY['lower_back'],
  ARRAY['legs','hamstrings','full_body'], ARRAY['barbell','dumbbell'],
  'beginner', 3, 92, 'pull', FALSE, FALSE, 3, TRUE,
  ARRAY['tempo','drop_set','superset','pause_rep'],
  'Push hips back not down. Bar close to legs. Feel hamstring stretch. Neutral spine throughout.'),

('Conventional Deadlift', 'strength', 'hip_hinge', 'barbell', TRUE,
  ARRAY['hamstrings','glutes','lower_back','traps','quads'], ARRAY['hamstrings','glutes'], ARRAY['lower_back','traps'],
  ARRAY['legs','hamstrings','full_body','back'], ARRAY['barbell'],
  'intermediate', 4, 97, 'pull', FALSE, FALSE, 5, TRUE,
  ARRAY['tempo','pause_rep'],
  'Bar over midfoot. Hip hinge to bar. Drive floor away. Lock hips and knees simultaneously.'),

('Stiff Leg Deadlift', 'hypertrophy', 'hip_hinge', 'barbell', TRUE,
  ARRAY['hamstrings','glutes','lower_back'], ARRAY['hamstrings'], ARRAY['glutes','lower_back'],
  ARRAY['legs','hamstrings'], ARRAY['barbell','dumbbell'],
  'beginner', 3, 76, 'pull', FALSE, FALSE, 3, TRUE,
  ARRAY['tempo','superset'],
  'Legs straighter than RDL. Greater hamstring stretch. Don't round lower back. Feel the stretch.'),

('Lying Leg Curl', 'hypertrophy', 'isolation', 'machine', FALSE,
  ARRAY['hamstrings'], ARRAY['hamstrings'], ARRAY['calves'],
  ARRAY['legs','hamstrings'], ARRAY['machine'],
  'beginner', 1, 90, 'pull', FALSE, FALSE, 1, TRUE,
  ARRAY['drop_set','superset','myo_rep','rest_pause'],
  'Curl to glutes. Don't let hips rise. Plantarflex (point toes) for greater hamstring recruitment.'),

('Seated Leg Curl', 'hypertrophy', 'isolation', 'machine', FALSE,
  ARRAY['hamstrings'], ARRAY['hamstrings'], ARRAY['calves'],
  ARRAY['legs','hamstrings'], ARRAY['machine'],
  'beginner', 1, 85, 'pull', FALSE, FALSE, 1, TRUE,
  ARRAY['drop_set','superset','myo_rep','rest_pause'],
  'Seated position creates more stretch at proximal end. Greater hamstring growth stimulus.'),

('Nordic Hamstring Curl', 'strength', 'hip_hinge', 'bodyweight', FALSE,
  ARRAY['hamstrings'], ARRAY['hamstrings'], ARRAY['glutes'],
  ARRAY['legs','hamstrings'], ARRAY['bodyweight'],
  'advanced', 5, 55, 'pull', FALSE, FALSE, 3, TRUE,
  ARRAY['tempo'],
  'Anchor feet. Lower body slowly using hamstrings only. Use hands to help at bottom. Very advanced.'),

-- ============================================================
-- LEGS — GLUTES
-- ============================================================
('Barbell Hip Thrust', 'hypertrophy', 'hip_thrust', 'barbell', TRUE,
  ARRAY['glutes','hamstrings'], ARRAY['glutes'], ARRAY['hamstrings'],
  ARRAY['legs','glutes','full_body'], ARRAY['barbell','machine'],
  'beginner', 2, 90, 'push', FALSE, FALSE, 2, TRUE,
  ARRAY['drop_set','superset','tempo','pause_rep'],
  'Upper back on bench, bar over hips. Drive hips to ceiling. Squeeze glutes at top. Don't hyperextend back.'),

('Glute Bridge', 'hypertrophy', 'hip_thrust', 'bodyweight', FALSE,
  ARRAY['glutes','hamstrings'], ARRAY['glutes'], ARRAY['hamstrings'],
  ARRAY['legs','glutes'], ARRAY['bodyweight','dumbbell','barbell'],
  'beginner', 1, 80, 'push', FALSE, FALSE, 1, TRUE,
  ARRAY['superset','tempo','pause_rep'],
  'Feet flat, heels close to glutes. Drive hips up. Squeeze glutes hard at top. Can add weight.'),

('Cable Kickback', 'hypertrophy', 'isolation', 'cable', FALSE,
  ARRAY['glutes'], ARRAY['glutes'], ARRAY['hamstrings'],
  ARRAY['legs','glutes'], ARRAY['cable','machine'],
  'beginner', 1, 72, 'push', TRUE, FALSE, 1, TRUE,
  ARRAY['drop_set','superset','myo_rep'],
  'Keep hips still. Drive heel back and up. Squeeze glute at end. Don't arch lower back excessively.'),

('Sumo Squat', 'hypertrophy', 'squat', 'dumbbell', TRUE,
  ARRAY['glutes','inner_quads','adductors'], ARRAY['glutes'], ARRAY['inner_quads','adductors'],
  ARRAY['legs','glutes','quads'], ARRAY['dumbbell','barbell','kettlebell'],
  'beginner', 2, 70, 'push', FALSE, FALSE, 2, TRUE,
  ARRAY['superset','tempo','pause_rep'],
  'Wide stance, toes flared 45°. Hold weight between legs. Drive knees out, sit into hips.'),

-- ============================================================
-- LEGS — CALVES
-- ============================================================
('Standing Calf Raise', 'hypertrophy', 'isolation', 'machine', FALSE,
  ARRAY['calves','soleus'], ARRAY['calves'], ARRAY['soleus'],
  ARRAY['legs','calves'], ARRAY['machine','bodyweight','dumbbell'],
  'beginner', 1, 90, 'push', FALSE, FALSE, 1, TRUE,
  ARRAY['drop_set','superset','myo_rep','rest_pause'],
  'Full stretch at bottom. Slow 3s up, hold 1s, 3s down. Straight leg = gastrocnemius dominant.'),

('Seated Calf Raise', 'hypertrophy', 'isolation', 'machine', FALSE,
  ARRAY['soleus','calves'], ARRAY['soleus'], ARRAY['calves'],
  ARRAY['legs','calves'], ARRAY['machine','dumbbell'],
  'beginner', 1, 82, 'push', FALSE, FALSE, 1, TRUE,
  ARRAY['drop_set','superset','myo_rep'],
  'Knees bent = soleus dominant. Full ROM. Slow stretch at bottom. Hold contraction at top.'),

('Leg Press Calf Raise', 'hypertrophy', 'isolation', 'machine', FALSE,
  ARRAY['calves','soleus'], ARRAY['calves'], ARRAY['soleus'],
  ARRAY['legs','calves'], ARRAY['machine'],
  'beginner', 1, 75, 'push', FALSE, FALSE, 1, TRUE,
  ARRAY['drop_set','superset','myo_rep','rest_pause'],
  'Feet at bottom of platform. Full plantar to dorsiflexion. High reps work well here.'),

-- ============================================================
-- FULL BODY / COMPOUNDS
-- ============================================================
('Conventional Deadlift', 'strength', 'hip_hinge', 'barbell', TRUE,
  ARRAY['hamstrings','glutes','lower_back','traps','lats','quads'], ARRAY['hamstrings','glutes'], ARRAY['lower_back','traps'],
  ARRAY['full_body','legs','back','hamstrings'], ARRAY['barbell'],
  'beginner', 4, 98, 'pull', FALSE, FALSE, 5, TRUE,
  ARRAY['tempo','pause_rep'],
  'Bar over midfoot. Hip-width stance. Hinge to bar. Brace hard. Push floor away. Lock out simultaneously.'),

('Trap Bar Deadlift', 'strength', 'hip_hinge', 'barbell', TRUE,
  ARRAY['quads','hamstrings','glutes','lower_back','traps'], ARRAY['quads','hamstrings'], ARRAY['glutes','lower_back'],
  ARRAY['full_body','legs','back'], ARRAY['barbell'],
  'beginner', 3, 78, 'pull', FALSE, FALSE, 4, TRUE,
  ARRAY['drop_set','tempo'],
  'More quad-dominant than conventional. Neutral grip. Easier to learn. Drive through whole foot.'),

('Kettlebell Swing', 'strength', 'hip_hinge', 'kettlebell', TRUE,
  ARRAY['hamstrings','glutes','lower_back','core'], ARRAY['hamstrings','glutes'], ARRAY['core','lower_back'],
  ARRAY['full_body','legs','conditioning'], ARRAY['kettlebell'],
  'intermediate', 3, 78, 'pull', FALSE, FALSE, 3, TRUE,
  ARRAY['superset'],
  'Hip drive not squat. Hinge and snap hips. Bell floats to chest height. Brace at top.'),

('Power Clean', 'strength', 'hip_hinge', 'barbell', TRUE,
  ARRAY['quads','hamstrings','glutes','traps','core'], ARRAY['quads','hamstrings'], ARRAY['glutes','traps'],
  ARRAY['full_body','legs','conditioning'], ARRAY['barbell'],
  'advanced', 5, 68, 'pull', FALSE, FALSE, 4, TRUE,
  ARRAY[]::TEXT[],
  'Explosive triple extension. Catch in front rack. Requires coaching. Athletic foundation movement.'),

('Dumbbell Thruster', 'strength', 'squat', 'dumbbell', TRUE,
  ARRAY['quads','glutes','shoulders','triceps','core'], ARRAY['quads','shoulders'], ARRAY['glutes','triceps'],
  ARRAY['full_body','conditioning'], ARRAY['dumbbell','barbell'],
  'intermediate', 3, 65, 'push', FALSE, FALSE, 3, TRUE,
  ARRAY['superset'],
  'Squat then press in one fluid motion. Maintain brace throughout. Great conditioning finisher.'),

-- ============================================================
-- CORE
-- ============================================================
('Plank', 'core', 'isometric', 'bodyweight', FALSE,
  ARRAY['core','abs','lower_back'], ARRAY['core'], ARRAY['lower_back'],
  ARRAY['core','full_body'], ARRAY['bodyweight'],
  'beginner', 1, 92, 'isometric', FALSE, FALSE, 1, TRUE,
  ARRAY['superset'],
  'Elbows under shoulders. Hollow body. Don't let hips sag or rise. Breathe normally.'),

('Ab Wheel Rollout', 'core', 'anti_extension', 'bodyweight', FALSE,
  ARRAY['abs','core','lats'], ARRAY['abs'], ARRAY['core','lats'],
  ARRAY['core'], ARRAY['bodyweight'],
  'intermediate', 3, 75, 'isometric', FALSE, FALSE, 2, TRUE,
  ARRAY['superset'],
  'From knees or feet. Roll out until hips about to break. Pull back with lats and abs.'),

('Hanging Leg Raise', 'core', 'flexion', 'bodyweight', FALSE,
  ARRAY['abs','hip_flexors'], ARRAY['abs'], ARRAY['hip_flexors'],
  ARRAY['core'], ARRAY['bodyweight','pull_up_bar'],
  'intermediate', 3, 78, 'pull', FALSE, FALSE, 1, TRUE,
  ARRAY['superset'],
  'Dead hang start. Curl pelvis toward ribs — don't just lift legs. Control descent.'),

('Cable Crunch', 'hypertrophy', 'flexion', 'cable', FALSE,
  ARRAY['abs'], ARRAY['abs'], ARRAY[]::TEXT[],
  ARRAY['core'], ARRAY['cable'],
  'beginner', 2, 76, 'pull', FALSE, FALSE, 1, TRUE,
  ARRAY['drop_set','superset','myo_rep'],
  'Kneel at cable. Pull elbows to knees — round spine fully. Weight through abs not arms.'),

('Dead Bug', 'core', 'isometric', 'bodyweight', FALSE,
  ARRAY['core','abs','lower_back'], ARRAY['core'], ARRAY['lower_back'],
  ARRAY['core'], ARRAY['bodyweight'],
  'beginner', 1, 60, 'isometric', FALSE, FALSE, 1, TRUE,
  ARRAY['superset'],
  'Extend opposite arm/leg. Press lower back into floor throughout. Slow and controlled.'),

('Russian Twist', 'core', 'rotation', 'bodyweight', FALSE,
  ARRAY['obliques','abs'], ARRAY['obliques'], ARRAY['abs'],
  ARRAY['core'], ARRAY['bodyweight','dumbbell','medicine_ball'],
  'beginner', 1, 72, 'rotation', FALSE, FALSE, 1, TRUE,
  ARRAY['superset','drop_set'],
  'Feet elevated or on floor. Rotate through full range. Add weight when easy.'),

-- ============================================================
-- BACK — TRAP / UPPER BACK
-- ============================================================
('Barbell Shrug', 'hypertrophy', 'isolation', 'barbell', FALSE,
  ARRAY['upper_traps'], ARRAY['upper_traps'], ARRAY['mid_traps'],
  ARRAY['pull','upper','back'], ARRAY['barbell','dumbbell'],
  'beginner', 1, 85, 'pull', FALSE, FALSE, 2, TRUE,
  ARRAY['drop_set','superset','myo_rep'],
  'Shrug straight up, hold 2s. Don't roll shoulders. Heavy loads acceptable.'),

('Dumbbell Shrug', 'hypertrophy', 'isolation', 'dumbbell', FALSE,
  ARRAY['upper_traps'], ARRAY['upper_traps'], ARRAY['mid_traps'],
  ARRAY['pull','upper','back'], ARRAY['dumbbell'],
  'beginner', 1, 82, 'pull', FALSE, FALSE, 2, TRUE,
  ARRAY['drop_set','superset','myo_rep'],
  'Hold dumbbells at sides. Elevate shoulders straight up. Hold peak contraction 1–2 seconds.'),

-- ============================================================
-- ADDITIONAL COMPOUNDS — PPL / ARNOLD / PHUL
-- ============================================================
('Incline Cable Fly', 'hypertrophy', 'fly', 'cable', FALSE,
  ARRAY['chest','front_delts'], ARRAY['chest'], ARRAY['front_delts'],
  ARRAY['push','upper','chest'], ARRAY['cable'],
  'intermediate', 2, 72, 'push', FALSE, FALSE, 2, TRUE,
  ARRAY['drop_set','superset','myo_rep'],
  'Bench at 30–45°. Cables below. Arc up and together. Squeeze at top.'),

('Low Cable Fly', 'hypertrophy', 'fly', 'cable', FALSE,
  ARRAY['chest','front_delts'], ARRAY['chest'], ARRAY['front_delts'],
  ARRAY['push','upper','chest'], ARRAY['cable'],
  'beginner', 2, 70, 'push', FALSE, FALSE, 1, TRUE,
  ARRAY['drop_set','superset','myo_rep'],
  'Cables at ankle height. Arc up — emphasizes upper chest fibers.'),

('Dumbbell Pullover', 'hypertrophy', 'isolation', 'dumbbell', FALSE,
  ARRAY['lats','chest','teres_major'], ARRAY['lats'], ARRAY['chest','teres_major'],
  ARRAY['pull','push','upper','back'], ARRAY['dumbbell'],
  'beginner', 2, 70, 'pull', FALSE, FALSE, 2, TRUE,
  ARRAY['superset','myo_rep'],
  'Lie perpendicular to bench. Arc dumbbell from hips overhead. Feel lats stretch fully.'),

('Seated Row (Neutral Grip)', 'strength', 'horizontal_pull', 'cable', TRUE,
  ARRAY['lats','mid_traps','biceps'], ARRAY['lats','mid_traps'], ARRAY['biceps'],
  ARRAY['pull','upper','back'], ARRAY['cable'],
  'beginner', 2, 86, 'pull', FALSE, FALSE, 1, TRUE,
  ARRAY['drop_set','superset','tempo'],
  'V-bar or neutral handles. Row to navel. Squeeze mid-back. Full stretch forward.'),

('Chin-Up', 'strength', 'vertical_pull', 'bodyweight', TRUE,
  ARRAY['lats','biceps','rear_delts'], ARRAY['lats','biceps'], ARRAY['rear_delts'],
  ARRAY['pull','upper','back','biceps'], ARRAY['bodyweight','pull_up_bar'],
  'intermediate', 3, 90, 'pull', FALSE, FALSE, 2, TRUE,
  ARRAY['weighted','superset','drop_set'],
  'Supinated (underhand) grip. Greater bicep recruitment than pull-up. Chin over bar.'),

('Pendlay Row', 'strength', 'horizontal_pull', 'barbell', TRUE,
  ARRAY['lats','mid_traps','rear_delts','biceps'], ARRAY['lats','mid_traps'], ARRAY['rear_delts'],
  ARRAY['pull','upper','back'], ARRAY['barbell'],
  'intermediate', 4, 65, 'pull', FALSE, FALSE, 3, TRUE,
  ARRAY['superset'],
  'Horizontal torso. Dead stop on floor each rep. Explosive concentric. Strict form.'),

('Reverse Curl', 'hypertrophy', 'isolation', 'barbell', FALSE,
  ARRAY['brachialis','brachioradialis','biceps'], ARRAY['brachialis'], ARRAY['biceps','brachioradialis'],
  ARRAY['pull','upper','biceps'], ARRAY['barbell','dumbbell','ez_bar'],
  'beginner', 2, 60, 'pull', FALSE, FALSE, 1, TRUE,
  ARRAY['superset','drop_set'],
  'Overhand grip. Curl to chin. Targets brachialis and forearms heavily.'),

('Concentration Curl', 'hypertrophy', 'isolation', 'dumbbell', FALSE,
  ARRAY['biceps'], ARRAY['biceps'], ARRAY[]::TEXT[],
  ARRAY['pull','upper','biceps'], ARRAY['dumbbell'],
  'beginner', 1, 75, 'pull', TRUE, FALSE, 1, TRUE,
  ARRAY['drop_set','myo_rep','superset'],
  'Elbow braced against inner thigh. Curl to shoulder. Peak contraction. Full extension.'),

-- ============================================================
-- LEGS — ADDITIONAL
-- ============================================================
('Walking Lunge', 'hypertrophy', 'lunge', 'dumbbell', TRUE,
  ARRAY['quads','glutes','hamstrings','core'], ARRAY['quads','glutes'], ARRAY['hamstrings'],
  ARRAY['legs','quads','glutes'], ARRAY['dumbbell','barbell','bodyweight'],
  'beginner', 2, 80, 'push', TRUE, FALSE, 3, TRUE,
  ARRAY['superset'],
  'Step and lower back knee to floor. Drive through front heel to rise. Keep torso upright.'),

('Step-Up', 'hypertrophy', 'lunge', 'dumbbell', TRUE,
  ARRAY['quads','glutes'], ARRAY['quads','glutes'], ARRAY['hamstrings'],
  ARRAY['legs','quads','glutes'], ARRAY['dumbbell','bodyweight','barbell'],
  'beginner', 2, 65, 'push', TRUE, FALSE, 2, TRUE,
  ARRAY['superset'],
  'Step height at or above knee. Drive through heel on box. Don't push off back foot.'),

('Sissy Squat', 'hypertrophy', 'squat', 'bodyweight', FALSE,
  ARRAY['quads'], ARRAY['quads'], ARRAY['hip_flexors'],
  ARRAY['legs','quads'], ARRAY['bodyweight','machine'],
  'advanced', 4, 55, 'push', FALSE, FALSE, 4, TRUE,
  ARRAY['myo_rep','drop_set'],
  'Lean back, knees track far forward. Extreme quad stretch. Very high patellar tendon stress.'),

('Smith Machine Squat', 'hypertrophy', 'squat', 'machine', TRUE,
  ARRAY['quads','glutes'], ARRAY['quads'], ARRAY['glutes'],
  ARRAY['legs','quads','full_body'], ARRAY['machine'],
  'beginner', 2, 78, 'push', FALSE, FALSE, 3, TRUE,
  ARRAY['drop_set','superset','pause_rep'],
  'Feet slightly forward. Fixed path guides bar. Good option for learners or rehab.'),

('Sumo Deadlift', 'strength', 'hip_hinge', 'barbell', TRUE,
  ARRAY['glutes','adductors','hamstrings','quads'], ARRAY['glutes','adductors'], ARRAY['hamstrings','quads'],
  ARRAY['legs','full_body','glutes'], ARRAY['barbell'],
  'intermediate', 4, 72, 'pull', FALSE, FALSE, 4, TRUE,
  ARRAY['tempo','pause_rep'],
  'Wide stance, toes flared. Grip inside legs. Drive knees out. Hips descend more than conventional.'),

('Calf Raise (Single Leg)', 'hypertrophy', 'isolation', 'bodyweight', FALSE,
  ARRAY['calves','soleus'], ARRAY['calves'], ARRAY['soleus'],
  ARRAY['legs','calves'], ARRAY['bodyweight','dumbbell'],
  'beginner', 2, 70, 'push', TRUE, FALSE, 1, TRUE,
  ARRAY['superset','myo_rep'],
  'On step edge for full ROM. Hold dumbbell if needed. Full plantarflex-dorsiflex.'),

-- ============================================================
-- SHOULDERS — ADDITIONAL
-- ============================================================
('Upright Row', 'hypertrophy', 'vertical_pull', 'barbell', FALSE,
  ARRAY['side_delts','upper_traps','biceps'], ARRAY['side_delts','upper_traps'], ARRAY['biceps'],
  ARRAY['pull','push','upper','shoulders'], ARRAY['barbell','dumbbell','cable'],
  'intermediate', 2, 68, 'pull', FALSE, FALSE, 3, TRUE,
  ARRAY['superset','drop_set'],
  'Wide grip reduces impingement. Lead with elbows. Only to chin height. Avoid if shoulder issues.'),

('Landmine Press', 'hypertrophy', 'incline_push', 'barbell', TRUE,
  ARRAY['front_delts','upper_chest','triceps'], ARRAY['front_delts'], ARRAY['upper_chest','triceps'],
  ARRAY['push','upper','shoulders','chest'], ARRAY['barbell'],
  'intermediate', 3, 60, 'push', TRUE, FALSE, 2, TRUE,
  ARRAY['superset'],
  'Kneeling or standing. Unilateral or bilateral. Arc press. Great shoulder health option.'),

-- ============================================================
-- BACK — ADDITIONAL ROWS
-- ============================================================
('Inverted Row', 'strength', 'horizontal_pull', 'bodyweight', TRUE,
  ARRAY['lats','mid_traps','rear_delts','biceps'], ARRAY['mid_traps','lats'], ARRAY['rear_delts','biceps'],
  ARRAY['pull','upper','back'], ARRAY['bodyweight'],
  'beginner', 2, 65, 'pull', FALSE, FALSE, 1, TRUE,
  ARRAY['superset','mechanical_drop_set'],
  'Feet elevated = harder. Pull chest to bar. Squeeze shoulder blades. Full arm extension.'),

('Low Row Machine', 'hypertrophy', 'horizontal_pull', 'machine', TRUE,
  ARRAY['lats','mid_traps','biceps'], ARRAY['lats'], ARRAY['mid_traps','biceps'],
  ARRAY['pull','upper','back'], ARRAY['machine'],
  'beginner', 1, 80, 'pull', FALSE, FALSE, 1, TRUE,
  ARRAY['drop_set','superset','myo_rep','rest_pause'],
  'Chest on pad. Row to lower chest. Drive elbows back. Full extension at end.'),

-- ============================================================
-- TRICEPS — ADDITIONAL
-- ============================================================
('Cable Overhead Tricep Extension', 'hypertrophy', 'isolation', 'cable', FALSE,
  ARRAY['triceps'], ARRAY['triceps'], ARRAY[]::TEXT[],
  ARRAY['push','upper','triceps'], ARRAY['cable'],
  'beginner', 2, 78, 'push', FALSE, FALSE, 1, TRUE,
  ARRAY['drop_set','superset','myo_rep'],
  'Cable behind you, rope overhead. Elbows point up. Full extension. Long head stretch.'),

('Tricep Kickback', 'hypertrophy', 'isolation', 'dumbbell', FALSE,
  ARRAY['triceps'], ARRAY['triceps'], ARRAY[]::TEXT[],
  ARRAY['push','upper','triceps'], ARRAY['dumbbell','cable'],
  'beginner', 1, 75, 'push', TRUE, FALSE, 1, TRUE,
  ARRAY['superset','myo_rep','drop_set'],
  'Hinge at hips. Upper arm parallel to floor. Extend fully. Squeeze tricep at lockout.');

-- Update any duplicate name entries (Conventional Deadlift was inserted twice with different split_tags)
-- Keep the version with more complete muscle data
DELETE FROM exercises a USING exercises b
WHERE a.id > b.id AND a.name = b.name AND a.is_system_exercise = TRUE;

-- Verify seed count
DO $$
DECLARE
  ex_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO ex_count FROM exercises WHERE is_system_exercise = TRUE;
  RAISE NOTICE 'Seeded % system exercises', ex_count;
END $$;
