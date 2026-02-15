-- MetriqFit Program Expansion (Phase 2)
-- Adds curated exercises and expands public program families for browser + matching.

-- ===========================================
-- Curated exercise expansion (ex_176+)
-- ===========================================
INSERT INTO public.exercises (
  external_id,
  name,
  category,
  equipment_required,
  primary_muscle,
  pattern,
  difficulty,
  is_compound
)
VALUES
  ('ex_176', 'Air Bike Intervals', 'Cardio / Conditioning', ARRAY['cardio_machine'], 'conditioning', 'cardio', 'intermediate', false),
  ('ex_177', 'Rower Intervals', 'Cardio / Conditioning', ARRAY['cardio_machine'], 'conditioning', 'cardio', 'intermediate', false),
  ('ex_178', 'Sled Push', 'Cardio / Conditioning', ARRAY['machine'], 'conditioning', 'conditioning', 'intermediate', true),
  ('ex_179', 'Sled Pull', 'Cardio / Conditioning', ARRAY['machine'], 'conditioning', 'conditioning', 'intermediate', true),
  ('ex_180', 'Battle Rope Waves', 'Cardio / Conditioning', ARRAY['freeweight_or_machine'], 'conditioning', 'conditioning', 'beginner', false),
  ('ex_181', 'Bear Crawl', 'Cardio / Conditioning', ARRAY['bodyweight'], 'core', 'conditioning', 'beginner', true),
  ('ex_182', 'Step-Down', 'Lower Body', ARRAY['bodyweight'], 'quads', 'unilateral_lower', 'beginner', false),
  ('ex_183', 'Banded Terminal Knee Extension', 'Lower Body', ARRAY['band'], 'quads', 'knee_isolation', 'beginner', false),
  ('ex_184', 'Glute Bridge Iso Hold', 'Lower Body', ARRAY['bodyweight'], 'glutes', 'glute_isolation', 'beginner', false),
  ('ex_185', 'Scapular Wall Slide', 'Shoulders', ARRAY['bodyweight'], 'shoulders', 'shoulder_accessory', 'beginner', false),
  ('ex_186', 'Copenhagen Plank', 'Core', ARRAY['bodyweight'], 'core', 'anti_rotation', 'intermediate', false)
ON CONFLICT (external_id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  equipment_required = EXCLUDED.equipment_required,
  primary_muscle = EXCLUDED.primary_muscle,
  pattern = EXCLUDED.pattern,
  difficulty = EXCLUDED.difficulty,
  is_compound = EXCLUDED.is_compound;

-- ===========================================
-- Program template expansion
-- ===========================================
INSERT INTO public.workout_templates (
  external_id,
  name,
  description,
  difficulty,
  duration_weeks,
  days_per_week,
  equipment_required,
  goal_tags,
  target_audience,
  is_public
)
VALUES
  (
    'template_minimalist_fullbody_2',
    'Minimalist Full Body (2 Days)',
    'Low-friction full-body program focused on consistency and basic progression.',
    'beginner',
    8,
    2,
    ARRAY['bodyweight', 'dumbbell', 'band'],
    ARRAY['general_fitness', 'consistency', 'minimalist'],
    'Busy users and re-starters who need a simple, sustainable program',
    true
  ),
  (
    'template_athletic_performance_5',
    'Athletic Performance (5 Days)',
    'Strength, power, and conditioning blend designed for sport-style performance.',
    'intermediate',
    10,
    5,
    ARRAY['barbell', 'dumbbell', 'machine', 'bodyweight', 'cardio_machine'],
    ARRAY['athletic_performance', 'conditioning', 'strength'],
    'Intermediate lifters targeting athletic output and work capacity',
    true
  ),
  (
    'template_conditioning_hybrid_4',
    'Conditioning Hybrid (4 Days)',
    'Alternating strength and metcon days to improve fitness and body composition.',
    'intermediate',
    8,
    4,
    ARRAY['barbell', 'machine', 'bodyweight', 'cardio_machine', 'cable'],
    ARRAY['conditioning', 'fat_loss', 'general_fitness'],
    'Users wanting improved conditioning while retaining strength work',
    true
  ),
  (
    'template_calisthenics_foundation_4',
    'Calisthenics Foundation (4 Days)',
    'Bodyweight-focused movement quality, trunk control, and strength endurance.',
    'beginner',
    8,
    4,
    ARRAY['bodyweight'],
    ARRAY['calisthenics', 'general_fitness', 'mobility'],
    'Users preferring bodyweight-only training and skill development',
    true
  ),
  (
    'template_rehab_resilience_3',
    'Rehab & Resilience (3 Days)',
    'Reduced-load sessions emphasizing control, stability, and tissue tolerance.',
    'beginner',
    6,
    3,
    ARRAY['bodyweight', 'band', 'dumbbell'],
    ARRAY['rehab', 'injury_friendly', 'general_fitness'],
    'Users returning from injury or needing low-impact progression',
    true
  ),
  (
    'template_powerbuilding_advanced_5',
    'Advanced Powerbuilding (5 Days)',
    'Heavy compounds plus targeted hypertrophy sessions for advanced lifters.',
    'advanced',
    12,
    5,
    ARRAY['barbell', 'dumbbell', 'machine', 'cable'],
    ARRAY['powerbuilding', 'strength', 'hypertrophy'],
    'Advanced lifters balancing maximal strength and physique goals',
    true
  )
ON CONFLICT (external_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  difficulty = EXCLUDED.difficulty,
  duration_weeks = EXCLUDED.duration_weeks,
  days_per_week = EXCLUDED.days_per_week,
  equipment_required = EXCLUDED.equipment_required,
  goal_tags = EXCLUDED.goal_tags,
  target_audience = EXCLUDED.target_audience,
  is_public = EXCLUDED.is_public,
  updated_at = NOW();

-- ===========================================
-- Helper: upsert day + replace exercise rows
-- ===========================================
CREATE OR REPLACE FUNCTION public.seed_workout_template_day(
  p_template_external TEXT,
  p_day_number INTEGER,
  p_day_name TEXT,
  p_focus TEXT,
  p_estimated_duration_min INTEGER,
  p_exercises JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_template_id UUID;
  v_template_day_id UUID;
BEGIN
  SELECT id
  INTO v_template_id
  FROM public.workout_templates
  WHERE external_id = p_template_external;

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_external;
  END IF;

  INSERT INTO public.workout_template_days (
    template_id,
    day_number,
    name,
    focus,
    estimated_duration_min
  )
  VALUES (
    v_template_id,
    p_day_number,
    p_day_name,
    p_focus,
    p_estimated_duration_min
  )
  ON CONFLICT (template_id, day_number)
  DO UPDATE SET
    name = EXCLUDED.name,
    focus = EXCLUDED.focus,
    estimated_duration_min = EXCLUDED.estimated_duration_min
  RETURNING id INTO v_template_day_id;

  DELETE FROM public.workout_template_exercises
  WHERE template_day_id = v_template_day_id;

  INSERT INTO public.workout_template_exercises (
    template_day_id,
    exercise_id,
    order_index,
    sets_target,
    reps_min,
    reps_max,
    rest_seconds,
    notes
  )
  SELECT
    v_template_day_id,
    e.id,
    rows.ord::INTEGER,
    COALESCE((rows.item->>'sets_target')::INTEGER, 3),
    COALESCE((rows.item->>'reps_min')::INTEGER, 8),
    COALESCE((rows.item->>'reps_max')::INTEGER, 12),
    COALESCE((rows.item->>'rest_seconds')::INTEGER, 90),
    rows.item->>'notes'
  FROM jsonb_array_elements(p_exercises) WITH ORDINALITY AS rows(item, ord)
  JOIN public.exercises e
    ON e.external_id = rows.item->>'external_id'
  ORDER BY rows.ord;
END;
$$;

-- ===========================================
-- Seed template days/exercises
-- ===========================================
SELECT public.seed_workout_template_day(
  'template_minimalist_fullbody_2',
  1,
  'Minimal Full Body A',
  'Squat + Push + Pull + Core',
  45,
  '[
    {"external_id":"ex_039","sets_target":3,"reps_min":10,"reps_max":15,"rest_seconds":60,"notes":"Bodyweight warm progression"},
    {"external_id":"ex_058","sets_target":3,"reps_min":8,"reps_max":15,"rest_seconds":60,"notes":"Controlled tempo"},
    {"external_id":"ex_070","sets_target":3,"reps_min":10,"reps_max":12,"rest_seconds":75,"notes":"Neutral spine"},
    {"external_id":"ex_164","sets_target":3,"reps_min":8,"reps_max":12,"rest_seconds":45,"notes":"Core control"},
    {"external_id":"ex_161","sets_target":3,"reps_min":30,"reps_max":45,"rest_seconds":45,"notes":"Seconds hold"}
  ]'::jsonb
);

SELECT public.seed_workout_template_day(
  'template_minimalist_fullbody_2',
  2,
  'Minimal Full Body B',
  'Hinge + Vertical Push/Pull + Core',
  45,
  '[
    {"external_id":"ex_012","sets_target":3,"reps_min":8,"reps_max":12,"rest_seconds":75,"notes":"DB hinge"},
    {"external_id":"ex_129","sets_target":3,"reps_min":8,"reps_max":12,"rest_seconds":60,"notes":"Progress toward vertical push"},
    {"external_id":"ex_092","sets_target":3,"reps_min":8,"reps_max":12,"rest_seconds":60,"notes":"Bodyweight pull"},
    {"external_id":"ex_166","sets_target":3,"reps_min":10,"reps_max":15,"rest_seconds":45,"notes":"Core flexion"},
    {"external_id":"ex_162","sets_target":3,"reps_min":20,"reps_max":35,"rest_seconds":45,"notes":"Seconds hold"}
  ]'::jsonb
);

SELECT public.seed_workout_template_day(
  'template_athletic_performance_5',
  1,
  'Lower Power',
  'Power + acceleration',
  70,
  '[
    {"external_id":"ex_001","sets_target":5,"reps_min":3,"reps_max":6,"rest_seconds":150,"notes":"Primary lower strength"},
    {"external_id":"ex_017","sets_target":4,"reps_min":8,"reps_max":12,"rest_seconds":75,"notes":"Explosive hinge"},
    {"external_id":"ex_020","sets_target":3,"reps_min":10,"reps_max":14,"rest_seconds":75,"notes":"Unilateral control"},
    {"external_id":"ex_178","sets_target":6,"reps_min":15,"reps_max":25,"rest_seconds":60,"notes":"Meters/time intervals"},
    {"external_id":"ex_186","sets_target":3,"reps_min":20,"reps_max":35,"rest_seconds":45,"notes":"Seconds hold each side"}
  ]'::jsonb
);

SELECT public.seed_workout_template_day(
  'template_athletic_performance_5',
  2,
  'Upper Power',
  'Pressing and pulling power',
  65,
  '[
    {"external_id":"ex_048","sets_target":5,"reps_min":3,"reps_max":6,"rest_seconds":150,"notes":"Primary press"},
    {"external_id":"ex_068","sets_target":5,"reps_min":4,"reps_max":8,"rest_seconds":120,"notes":"Primary row"},
    {"external_id":"ex_111","sets_target":4,"reps_min":4,"reps_max":6,"rest_seconds":120,"notes":"Vertical power"},
    {"external_id":"ex_103","sets_target":3,"reps_min":12,"reps_max":20,"rest_seconds":60,"notes":"Scap health"},
    {"external_id":"ex_158","sets_target":4,"reps_min":20,"reps_max":30,"rest_seconds":60,"notes":"Meters/seconds carry"}
  ]'::jsonb
);

SELECT public.seed_workout_template_day(
  'template_athletic_performance_5',
  3,
  'Conditioning Engine',
  'Intervals and repeatability',
  45,
  '[
    {"external_id":"ex_176","sets_target":6,"reps_min":30,"reps_max":45,"rest_seconds":45,"notes":"Seconds on"},
    {"external_id":"ex_177","sets_target":6,"reps_min":30,"reps_max":45,"rest_seconds":45,"notes":"Seconds on"},
    {"external_id":"ex_180","sets_target":5,"reps_min":20,"reps_max":40,"rest_seconds":45,"notes":"Seconds work"},
    {"external_id":"ex_181","sets_target":4,"reps_min":20,"reps_max":40,"rest_seconds":45,"notes":"Meters/time"},
    {"external_id":"ex_173","sets_target":1,"reps_min":15,"reps_max":25,"rest_seconds":0,"notes":"Steady cool-down (minutes)"}
  ]'::jsonb
);

SELECT public.seed_workout_template_day(
  'template_athletic_performance_5',
  4,
  'Upper Volume',
  'Hypertrophy and posture',
  60,
  '[
    {"external_id":"ex_053","sets_target":4,"reps_min":8,"reps_max":12,"rest_seconds":90,"notes":"Upper chest bias"},
    {"external_id":"ex_084","sets_target":4,"reps_min":8,"reps_max":12,"rest_seconds":90,"notes":"Vertical pull"},
    {"external_id":"ex_120","sets_target":3,"reps_min":12,"reps_max":18,"rest_seconds":60,"notes":"Lateral delt"},
    {"external_id":"ex_148","sets_target":3,"reps_min":10,"reps_max":15,"rest_seconds":60,"notes":"Triceps volume"},
    {"external_id":"ex_140","sets_target":3,"reps_min":10,"reps_max":15,"rest_seconds":60,"notes":"Biceps/forearm"}
  ]'::jsonb
);

SELECT public.seed_workout_template_day(
  'template_athletic_performance_5',
  5,
  'Lower Volume',
  'Posterior + unilateral volume',
  60,
  '[
    {"external_id":"ex_010","sets_target":4,"reps_min":6,"reps_max":10,"rest_seconds":120,"notes":"Hinge volume"},
    {"external_id":"ex_023","sets_target":4,"reps_min":10,"reps_max":15,"rest_seconds":90,"notes":"Quad volume"},
    {"external_id":"ex_028","sets_target":3,"reps_min":10,"reps_max":15,"rest_seconds":75,"notes":"Hamstring isolation"},
    {"external_id":"ex_042","sets_target":4,"reps_min":10,"reps_max":20,"rest_seconds":60,"notes":"Calf development"},
    {"external_id":"ex_171","sets_target":3,"reps_min":10,"reps_max":16,"rest_seconds":45,"notes":"Anti-rotation core"}
  ]'::jsonb
);

SELECT public.seed_workout_template_day(
  'template_conditioning_hybrid_4',
  1,
  'Strength A',
  'Full-body strength emphasis',
  60,
  '[
    {"external_id":"ex_035","sets_target":4,"reps_min":6,"reps_max":10,"rest_seconds":120,"notes":"Machine-supported squat"},
    {"external_id":"ex_055","sets_target":4,"reps_min":8,"reps_max":12,"rest_seconds":90,"notes":"Horizontal press"},
    {"external_id":"ex_075","sets_target":4,"reps_min":8,"reps_max":12,"rest_seconds":90,"notes":"Horizontal pull"},
    {"external_id":"ex_161","sets_target":3,"reps_min":30,"reps_max":45,"rest_seconds":45,"notes":"Core brace"}
  ]'::jsonb
);

SELECT public.seed_workout_template_day(
  'template_conditioning_hybrid_4',
  2,
  'MetCon A',
  'Mixed modal conditioning',
  40,
  '[
    {"external_id":"ex_176","sets_target":6,"reps_min":25,"reps_max":40,"rest_seconds":40,"notes":"Seconds on"},
    {"external_id":"ex_180","sets_target":5,"reps_min":20,"reps_max":35,"rest_seconds":40,"notes":"Rope waves"},
    {"external_id":"ex_181","sets_target":4,"reps_min":20,"reps_max":35,"rest_seconds":40,"notes":"Bear crawl distance"},
    {"external_id":"ex_173","sets_target":1,"reps_min":12,"reps_max":20,"rest_seconds":0,"notes":"Minutes cooldown"}
  ]'::jsonb
);

SELECT public.seed_workout_template_day(
  'template_conditioning_hybrid_4',
  3,
  'Strength B',
  'Posterior chain + upper pull',
  60,
  '[
    {"external_id":"ex_007","sets_target":4,"reps_min":3,"reps_max":6,"rest_seconds":150,"notes":"Heavy hinge"},
    {"external_id":"ex_050","sets_target":4,"reps_min":6,"reps_max":10,"rest_seconds":120,"notes":"Incline press"},
    {"external_id":"ex_077","sets_target":4,"reps_min":8,"reps_max":12,"rest_seconds":90,"notes":"Machine row"},
    {"external_id":"ex_135","sets_target":3,"reps_min":12,"reps_max":18,"rest_seconds":45,"notes":"Shoulder accessory"}
  ]'::jsonb
);

SELECT public.seed_workout_template_day(
  'template_conditioning_hybrid_4',
  4,
  'MetCon B',
  'Work capacity and carries',
  40,
  '[
    {"external_id":"ex_177","sets_target":6,"reps_min":25,"reps_max":40,"rest_seconds":40,"notes":"Seconds on"},
    {"external_id":"ex_178","sets_target":5,"reps_min":15,"reps_max":25,"rest_seconds":45,"notes":"Meters/time"},
    {"external_id":"ex_179","sets_target":5,"reps_min":15,"reps_max":25,"rest_seconds":45,"notes":"Meters/time"},
    {"external_id":"ex_171","sets_target":3,"reps_min":12,"reps_max":16,"rest_seconds":45,"notes":"Trunk stability"}
  ]'::jsonb
);

SELECT public.seed_workout_template_day(
  'template_calisthenics_foundation_4',
  1,
  'Calisthenics Push',
  'Push chain and trunk control',
  50,
  '[
    {"external_id":"ex_058","sets_target":4,"reps_min":8,"reps_max":15,"rest_seconds":60,"notes":"Quality reps"},
    {"external_id":"ex_129","sets_target":4,"reps_min":6,"reps_max":12,"rest_seconds":60,"notes":"Vertical push progression"},
    {"external_id":"ex_157","sets_target":3,"reps_min":8,"reps_max":12,"rest_seconds":60,"notes":"Close-grip pressing"},
    {"external_id":"ex_161","sets_target":3,"reps_min":30,"reps_max":45,"rest_seconds":45,"notes":"Core brace"}
  ]'::jsonb
);

SELECT public.seed_workout_template_day(
  'template_calisthenics_foundation_4',
  2,
  'Calisthenics Pull',
  'Pull strength and grip endurance',
  50,
  '[
    {"external_id":"ex_079","sets_target":4,"reps_min":4,"reps_max":10,"rest_seconds":75,"notes":"Use assistance as needed"},
    {"external_id":"ex_092","sets_target":4,"reps_min":8,"reps_max":15,"rest_seconds":60,"notes":"Horizontal pull"},
    {"external_id":"ex_159","sets_target":4,"reps_min":20,"reps_max":45,"rest_seconds":45,"notes":"Seconds hold"},
    {"external_id":"ex_167","sets_target":3,"reps_min":8,"reps_max":12,"rest_seconds":45,"notes":"Core flexion"}
  ]'::jsonb
);

SELECT public.seed_workout_template_day(
  'template_calisthenics_foundation_4',
  3,
  'Calisthenics Legs',
  'Single-leg control and lower strength-endurance',
  50,
  '[
    {"external_id":"ex_039","sets_target":4,"reps_min":12,"reps_max":20,"rest_seconds":60,"notes":"Controlled depth"},
    {"external_id":"ex_040","sets_target":3,"reps_min":3,"reps_max":8,"rest_seconds":75,"notes":"Assisted pistol as needed"},
    {"external_id":"ex_020","sets_target":3,"reps_min":10,"reps_max":14,"rest_seconds":60,"notes":"Walking lunge"},
    {"external_id":"ex_045","sets_target":3,"reps_min":12,"reps_max":20,"rest_seconds":45,"notes":"Single-leg calf"},
    {"external_id":"ex_164","sets_target":3,"reps_min":10,"reps_max":14,"rest_seconds":45,"notes":"Core control"}
  ]'::jsonb
);

SELECT public.seed_workout_template_day(
  'template_calisthenics_foundation_4',
  4,
  'Calisthenics Control',
  'Movement quality and trunk stability',
  45,
  '[
    {"external_id":"ex_185","sets_target":3,"reps_min":10,"reps_max":16,"rest_seconds":45,"notes":"Scap mobility"},
    {"external_id":"ex_162","sets_target":3,"reps_min":25,"reps_max":40,"rest_seconds":45,"notes":"Seconds hold each side"},
    {"external_id":"ex_165","sets_target":3,"reps_min":10,"reps_max":14,"rest_seconds":45,"notes":"Cross-pattern stability"},
    {"external_id":"ex_166","sets_target":3,"reps_min":10,"reps_max":15,"rest_seconds":45,"notes":"Hip flexion strength"}
  ]'::jsonb
);

SELECT public.seed_workout_template_day(
  'template_rehab_resilience_3',
  1,
  'Resilience A',
  'Lower control and tolerance',
  40,
  '[
    {"external_id":"ex_182","sets_target":3,"reps_min":8,"reps_max":12,"rest_seconds":45,"notes":"Controlled eccentric"},
    {"external_id":"ex_183","sets_target":3,"reps_min":12,"reps_max":20,"rest_seconds":30,"notes":"Band TKE"},
    {"external_id":"ex_184","sets_target":3,"reps_min":20,"reps_max":40,"rest_seconds":30,"notes":"Seconds hold"},
    {"external_id":"ex_164","sets_target":3,"reps_min":8,"reps_max":12,"rest_seconds":30,"notes":"Core brace"}
  ]'::jsonb
);

SELECT public.seed_workout_template_day(
  'template_rehab_resilience_3',
  2,
  'Resilience B',
  'Upper stability and postural control',
  40,
  '[
    {"external_id":"ex_185","sets_target":3,"reps_min":10,"reps_max":16,"rest_seconds":30,"notes":"Scap patterning"},
    {"external_id":"ex_135","sets_target":3,"reps_min":12,"reps_max":18,"rest_seconds":30,"notes":"External rotation"},
    {"external_id":"ex_092","sets_target":3,"reps_min":8,"reps_max":12,"rest_seconds":45,"notes":"Bodyweight row"},
    {"external_id":"ex_162","sets_target":3,"reps_min":20,"reps_max":35,"rest_seconds":30,"notes":"Seconds hold"}
  ]'::jsonb
);

SELECT public.seed_workout_template_day(
  'template_rehab_resilience_3',
  3,
  'Resilience C',
  'Integrated low-impact strength',
  40,
  '[
    {"external_id":"ex_021","sets_target":3,"reps_min":8,"reps_max":12,"rest_seconds":45,"notes":"Reverse lunge control"},
    {"external_id":"ex_034","sets_target":3,"reps_min":10,"reps_max":15,"rest_seconds":45,"notes":"Glute activation"},
    {"external_id":"ex_171","sets_target":3,"reps_min":10,"reps_max":14,"rest_seconds":30,"notes":"Anti-rotation"},
    {"external_id":"ex_165","sets_target":3,"reps_min":10,"reps_max":14,"rest_seconds":30,"notes":"Motor control"}
  ]'::jsonb
);

SELECT public.seed_workout_template_day(
  'template_powerbuilding_advanced_5',
  1,
  'Squat Focus',
  'Lower max-strength emphasis',
  75,
  '[
    {"external_id":"ex_001","sets_target":5,"reps_min":3,"reps_max":5,"rest_seconds":180,"notes":"Top strength movement"},
    {"external_id":"ex_037","sets_target":4,"reps_min":3,"reps_max":6,"rest_seconds":150,"notes":"Secondary squat"},
    {"external_id":"ex_027","sets_target":3,"reps_min":10,"reps_max":15,"rest_seconds":75,"notes":"Quad hypertrophy"},
    {"external_id":"ex_042","sets_target":4,"reps_min":10,"reps_max":18,"rest_seconds":60,"notes":"Calves"},
    {"external_id":"ex_171","sets_target":3,"reps_min":10,"reps_max":14,"rest_seconds":45,"notes":"Core brace"}
  ]'::jsonb
);

SELECT public.seed_workout_template_day(
  'template_powerbuilding_advanced_5',
  2,
  'Upper Strength',
  'Heavy upper compounds',
  75,
  '[
    {"external_id":"ex_048","sets_target":5,"reps_min":3,"reps_max":5,"rest_seconds":180,"notes":"Primary press"},
    {"external_id":"ex_068","sets_target":5,"reps_min":4,"reps_max":6,"rest_seconds":150,"notes":"Primary row"},
    {"external_id":"ex_111","sets_target":4,"reps_min":3,"reps_max":6,"rest_seconds":150,"notes":"Overhead strength"},
    {"external_id":"ex_151","sets_target":3,"reps_min":8,"reps_max":12,"rest_seconds":75,"notes":"Triceps accessory"},
    {"external_id":"ex_140","sets_target":3,"reps_min":8,"reps_max":12,"rest_seconds":75,"notes":"Biceps accessory"}
  ]'::jsonb
);

SELECT public.seed_workout_template_day(
  'template_powerbuilding_advanced_5',
  3,
  'Deadlift Focus',
  'Posterior chain strength and overload',
  75,
  '[
    {"external_id":"ex_007","sets_target":5,"reps_min":2,"reps_max":4,"rest_seconds":180,"notes":"Primary hinge"},
    {"external_id":"ex_108","sets_target":4,"reps_min":3,"reps_max":6,"rest_seconds":150,"notes":"Overload hinge"},
    {"external_id":"ex_010","sets_target":4,"reps_min":6,"reps_max":10,"rest_seconds":120,"notes":"RDL volume"},
    {"external_id":"ex_103","sets_target":3,"reps_min":12,"reps_max":20,"rest_seconds":60,"notes":"Rear-delt/trap balance"},
    {"external_id":"ex_158","sets_target":3,"reps_min":20,"reps_max":35,"rest_seconds":60,"notes":"Grip and trunk carry"}
  ]'::jsonb
);

SELECT public.seed_workout_template_day(
  'template_powerbuilding_advanced_5',
  4,
  'Upper Hypertrophy',
  'Volume-driven upper body growth',
  65,
  '[
    {"external_id":"ex_053","sets_target":4,"reps_min":8,"reps_max":12,"rest_seconds":90,"notes":"Chest hypertrophy"},
    {"external_id":"ex_084","sets_target":4,"reps_min":8,"reps_max":12,"rest_seconds":90,"notes":"Lat hypertrophy"},
    {"external_id":"ex_120","sets_target":4,"reps_min":12,"reps_max":18,"rest_seconds":60,"notes":"Delts"},
    {"external_id":"ex_146","sets_target":3,"reps_min":10,"reps_max":15,"rest_seconds":60,"notes":"Cable curl"},
    {"external_id":"ex_148","sets_target":3,"reps_min":10,"reps_max":15,"rest_seconds":60,"notes":"Pushdown"}
  ]'::jsonb
);

SELECT public.seed_workout_template_day(
  'template_powerbuilding_advanced_5',
  5,
  'Lower Hypertrophy',
  'Lower-body volume and tissue tolerance',
  65,
  '[
    {"external_id":"ex_023","sets_target":4,"reps_min":10,"reps_max":15,"rest_seconds":90,"notes":"Leg press volume"},
    {"external_id":"ex_018","sets_target":3,"reps_min":8,"reps_max":12,"rest_seconds":75,"notes":"Unilateral lower"},
    {"external_id":"ex_029","sets_target":4,"reps_min":10,"reps_max":15,"rest_seconds":75,"notes":"Hamstring isolation"},
    {"external_id":"ex_032","sets_target":3,"reps_min":12,"reps_max":18,"rest_seconds":60,"notes":"Hip stability"},
    {"external_id":"ex_169","sets_target":3,"reps_min":10,"reps_max":16,"rest_seconds":45,"notes":"Core flexion"}
  ]'::jsonb
);

DROP FUNCTION IF EXISTS public.seed_workout_template_day(TEXT, INTEGER, TEXT, TEXT, INTEGER, JSONB);

DO $$
DECLARE
  template_count INTEGER;
  exercise_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count
  FROM public.workout_templates
  WHERE external_id IN (
    'template_minimalist_fullbody_2',
    'template_athletic_performance_5',
    'template_conditioning_hybrid_4',
    'template_calisthenics_foundation_4',
    'template_rehab_resilience_3',
    'template_powerbuilding_advanced_5'
  );

  SELECT COUNT(*) INTO exercise_count
  FROM public.exercises
  WHERE external_id IN ('ex_176','ex_177','ex_178','ex_179','ex_180','ex_181','ex_182','ex_183','ex_184','ex_185','ex_186');

  RAISE NOTICE 'Expanded templates present: %', template_count;
  RAISE NOTICE 'Curated exercises present: %', exercise_count;
END $$;
