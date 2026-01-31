-- MetriqFit Workout Templates Seed Data
-- Migration 008: Seed 4 starter workout templates
-- Purpose: Provide users with proven programs for different experience levels and goals
-- ===========================================
-- SEED WORKOUT TEMPLATES (4 programs)
-- ===========================================
-- Template 1: Push Pull Legs - Beginner (3 days/week)
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
VALUES (
        'template_ppl_beginner',
        'Push Pull Legs - Beginner',
        'A classic 3-day split focusing on compound movements. Perfect for beginners building strength and muscle. Each workout targets specific muscle groups with proven exercises.',
        'beginner',
        12,
        3,
        ARRAY ['barbell', 'dumbbell', 'machine', 'cable'],
        ARRAY ['muscle_building', 'strength', 'beginner_friendly'],
        'Beginners with 0-6 months training experience',
        true
    )
RETURNING id INTO @template_ppl_beginner_id;
-- Template 2: Upper Lower - Intermediate (4 days/week)
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
VALUES (
        'template_ul_intermediate',
        'Upper Lower Split - Intermediate',
        'A 4-day split alternating between upper and lower body. Combines power and hypertrophy work for balanced strength and muscle gains.',
        'intermediate',
        12,
        4,
        ARRAY ['barbell', 'dumbbell', 'machine', 'cable'],
        ARRAY ['hypertrophy', 'strength', 'muscle_building'],
        'Intermediate lifters with 6-24 months experience',
        true
    );
-- Template 3: Full Body Strength - Beginner (3 days/week)
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
VALUES (
        'template_fullbody_beginner',
        'Full Body Strength - Beginner',
        'Focus on the big 3 lifts (squat, bench, deadlift) with accessories. Linear progression program for building foundational strength.',
        'beginner',
        12,
        3,
        ARRAY ['barbell', 'dumbbell', 'machine'],
        ARRAY ['strength', 'powerlifting', 'beginner_friendly'],
        'Beginners focused on strength development',
        true
    );
-- Template 4: 5-Day Bodybuilding Split - Advanced (5 days/week)
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
VALUES (
        'template_bro_split_advanced',
        '5-Day Bodybuilding Split - Advanced',
        'High-volume bodybuilding split isolating each muscle group. Focuses on muscle hypertrophy with varied angles and intensity techniques.',
        'advanced',
        12,
        5,
        ARRAY ['barbell', 'dumbbell', 'machine', 'cable'],
        ARRAY ['hypertrophy', 'bodybuilding', 'muscle_building'],
        'Advanced lifters with 2+ years experience',
        true
    );
-- ===========================================
-- TEMPLATE 1: PUSH PULL LEGS - BEGINNER
-- ===========================================
-- Day 1: Push (Chest, Shoulders, Triceps)
WITH template AS (
    SELECT id
    FROM public.workout_templates
    WHERE external_id = 'template_ppl_beginner'
)
INSERT INTO public.workout_template_days (
        template_id,
        day_number,
        name,
        focus,
        estimated_duration_min
    )
SELECT id,
    1,
    'Push Day',
    'Chest, Front Delts, Triceps',
    60
FROM template;
WITH template_day AS (
    SELECT id
    FROM public.workout_template_days wtd
        JOIN public.workout_templates wt ON wtd.template_id = wt.id
    WHERE wt.external_id = 'template_ppl_beginner'
        AND wtd.day_number = 1
)
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
SELECT td.id,
    e.id,
    row_number() OVER (),
    sets,
    reps_min,
    reps_max,
    rest_sec,
    notes
FROM template_day td
    CROSS JOIN (
        VALUES (
                'ex_048',
                4,
                6,
                8,
                120,
                'Main compound - focus on progressive overload'
            ),
            (
                'ex_053',
                3,
                8,
                12,
                90,
                'Upper chest development'
            ),
            (
                'ex_055',
                3,
                8,
                12,
                90,
                'Front delts and triceps'
            ),
            (
                'ex_065',
                3,
                10,
                15,
                60,
                'Chest isolation - squeeze at peak'
            ),
            (
                'ex_148',
                3,
                10,
                15,
                60,
                'Triceps isolation with rope'
            ),
            ('ex_120', 3, 12, 15, 60, 'Side delt isolation')
    ) AS v(
        external_id,
        sets,
        reps_min,
        reps_max,
        rest_sec,
        notes
    )
    JOIN public.exercises e ON e.external_id = v.external_id;
-- Day 2: Pull (Back, Biceps)
WITH template AS (
    SELECT id
    FROM public.workout_templates
    WHERE external_id = 'template_ppl_beginner'
)
INSERT INTO public.workout_template_days (
        template_id,
        day_number,
        name,
        focus,
        estimated_duration_min
    )
SELECT id,
    2,
    'Pull Day',
    'Back, Rear Delts, Biceps',
    60
FROM template;
WITH template_day AS (
    SELECT id
    FROM public.workout_template_days wtd
        JOIN public.workout_templates wt ON wtd.template_id = wt.id
    WHERE wt.external_id = 'template_ppl_beginner'
        AND wtd.day_number = 2
)
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
SELECT td.id,
    e.id,
    row_number() OVER (),
    sets,
    reps_min,
    reps_max,
    rest_sec,
    notes
FROM template_day td
    CROSS JOIN (
        VALUES (
                'ex_084',
                4,
                6,
                10,
                90,
                'Vertical pull - main back builder'
            ),
            (
                'ex_075',
                3,
                8,
                12,
                90,
                'Horizontal pull for thickness'
            ),
            ('ex_070', 3, 8, 12, 90, 'Unilateral back work'),
            (
                'ex_103',
                3,
                10,
                15,
                60,
                'Rear delt and upper back'
            ),
            ('ex_139', 3, 10, 12, 60, 'Biceps mass builder'),
            (
                'ex_140',
                3,
                10,
                15,
                60,
                'Brachialis and forearm development'
            )
    ) AS v(
        external_id,
        sets,
        reps_min,
        reps_max,
        rest_sec,
        notes
    )
    JOIN public.exercises e ON e.external_id = v.external_id;
-- Day 3: Legs (Quads, Hamstrings, Glutes, Calves)
WITH template AS (
    SELECT id
    FROM public.workout_templates
    WHERE external_id = 'template_ppl_beginner'
)
INSERT INTO public.workout_template_days (
        template_id,
        day_number,
        name,
        focus,
        estimated_duration_min
    )
SELECT id,
    3,
    'Leg Day',
    'Quads, Hamstrings, Glutes, Calves',
    60
FROM template;
WITH template_day AS (
    SELECT id
    FROM public.workout_template_days wtd
        JOIN public.workout_templates wt ON wtd.template_id = wt.id
    WHERE wt.external_id = 'template_ppl_beginner'
        AND wtd.day_number = 3
)
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
SELECT td.id,
    e.id,
    row_number() OVER (),
    sets,
    reps_min,
    reps_max,
    rest_sec,
    notes
FROM template_day td
    CROSS JOIN (
        VALUES (
                'ex_001',
                4,
                6,
                8,
                150,
                'King of leg exercises - progressive overload'
            ),
            (
                'ex_010',
                3,
                8,
                12,
                90,
                'Hamstring and glute focus'
            ),
            (
                'ex_023',
                3,
                10,
                15,
                90,
                'Quad isolation without spinal loading'
            ),
            ('ex_028', 3, 10, 15, 60, 'Hamstring isolation'),
            (
                'ex_018',
                3,
                8,
                12,
                60,
                'Unilateral quad and glute work'
            ),
            ('ex_042', 4, 12, 15, 60, 'Calf development')
    ) AS v(
        external_id,
        sets,
        reps_min,
        reps_max,
        rest_sec,
        notes
    )
    JOIN public.exercises e ON e.external_id = v.external_id;
-- ===========================================
-- TEMPLATE 2: UPPER LOWER - INTERMEDIATE
-- ===========================================
-- Day 1: Upper Power
WITH template AS (
    SELECT id
    FROM public.workout_templates
    WHERE external_id = 'template_ul_intermediate'
)
INSERT INTO public.workout_template_days (
        template_id,
        day_number,
        name,
        focus,
        estimated_duration_min
    )
SELECT id,
    1,
    'Upper Power',
    'Heavy compound lifts, lower reps',
    75
FROM template;
WITH template_day AS (
    SELECT id
    FROM public.workout_template_days wtd
        JOIN public.workout_templates wt ON wtd.template_id = wt.id
    WHERE wt.external_id = 'template_ul_intermediate'
        AND wtd.day_number = 1
)
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
SELECT td.id,
    e.id,
    row_number() OVER (),
    sets,
    reps_min,
    reps_max,
    rest_sec,
    notes
FROM template_day td
    CROSS JOIN (
        VALUES (
                'ex_048',
                5,
                3,
                5,
                180,
                'Heavy bench - strength focus'
            ),
            (
                'ex_068',
                4,
                5,
                8,
                120,
                'Heavy rows for back thickness'
            ),
            (
                'ex_111',
                4,
                5,
                8,
                120,
                'Overhead strength builder'
            ),
            ('ex_050', 3, 6, 8, 120, 'Upper chest power'),
            (
                'ex_079',
                3,
                5,
                8,
                120,
                'Weighted pull-ups if possible'
            )
    ) AS v(
        external_id,
        sets,
        reps_min,
        reps_max,
        rest_sec,
        notes
    )
    JOIN public.exercises e ON e.external_id = v.external_id;
-- Day 2: Lower Power
WITH template AS (
    SELECT id
    FROM public.workout_templates
    WHERE external_id = 'template_ul_intermediate'
)
INSERT INTO public.workout_template_days (
        template_id,
        day_number,
        name,
        focus,
        estimated_duration_min
    )
SELECT id,
    2,
    'Lower Power',
    'Heavy squats and deadlifts',
    75
FROM template;
WITH template_day AS (
    SELECT id
    FROM public.workout_template_days wtd
        JOIN public.workout_templates wt ON wtd.template_id = wt.id
    WHERE wt.external_id = 'template_ul_intermediate'
        AND wtd.day_number = 2
)
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
SELECT td.id,
    e.id,
    row_number() OVER (),
    sets,
    reps_min,
    reps_max,
    rest_sec,
    notes
FROM template_day td
    CROSS JOIN (
        VALUES (
                'ex_001',
                5,
                3,
                5,
                180,
                'Heavy back squat for strength'
            ),
            (
                'ex_010',
                4,
                6,
                8,
                120,
                'Romanian deadlift for posterior chain'
            ),
            (
                'ex_023',
                3,
                8,
                12,
                90,
                'Leg press for quad volume'
            ),
            ('ex_013', 3, 8, 12, 90, 'Glute focus'),
            ('ex_042', 4, 10, 12, 60, 'Calf training')
    ) AS v(
        external_id,
        sets,
        reps_min,
        reps_max,
        rest_sec,
        notes
    )
    JOIN public.exercises e ON e.external_id = v.external_id;
-- Day 3: Upper Hypertrophy
WITH template AS (
    SELECT id
    FROM public.workout_templates
    WHERE external_id = 'template_ul_intermediate'
)
INSERT INTO public.workout_template_days (
        template_id,
        day_number,
        name,
        focus,
        estimated_duration_min
    )
SELECT id,
    3,
    'Upper Hypertrophy',
    'Volume work, 8-15 reps',
    75
FROM template;
WITH template_day AS (
    SELECT id
    FROM public.workout_template_days wtd
        JOIN public.workout_templates wt ON wtd.template_id = wt.id
    WHERE wt.external_id = 'template_ul_intermediate'
        AND wtd.day_number = 3
)
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
SELECT td.id,
    e.id,
    row_number() OVER (),
    sets,
    reps_min,
    reps_max,
    rest_sec,
    notes
FROM template_day td
    CROSS JOIN (
        VALUES (
                'ex_053',
                4,
                8,
                12,
                90,
                'Incline DB press for chest'
            ),
            (
                'ex_084',
                4,
                8,
                12,
                90,
                'Lat pulldown for back width'
            ),
            (
                'ex_114',
                3,
                10,
                12,
                75,
                'Dumbbell shoulder press'
            ),
            (
                'ex_065',
                3,
                12,
                15,
                60,
                'Chest flyes for stretch'
            ),
            ('ex_103', 3, 12, 15, 60, 'Rear delts'),
            ('ex_139', 3, 10, 12, 60, 'Bicep curls'),
            ('ex_148', 3, 10, 12, 60, 'Tricep pushdowns')
    ) AS v(
        external_id,
        sets,
        reps_min,
        reps_max,
        rest_sec,
        notes
    )
    JOIN public.exercises e ON e.external_id = v.external_id;
-- Day 4: Lower Hypertrophy
WITH template AS (
    SELECT id
    FROM public.workout_templates
    WHERE external_id = 'template_ul_intermediate'
)
INSERT INTO public.workout_template_days (
        template_id,
        day_number,
        name,
        focus,
        estimated_duration_min
    )
SELECT id,
    4,
    'Lower Hypertrophy',
    'Volume leg work',
    75
FROM template;
WITH template_day AS (
    SELECT id
    FROM public.workout_template_days wtd
        JOIN public.workout_templates wt ON wtd.template_id = wt.id
    WHERE wt.external_id = 'template_ul_intermediate'
        AND wtd.day_number = 4
)
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
SELECT td.id,
    e.id,
    row_number() OVER (),
    sets,
    reps_min,
    reps_max,
    rest_sec,
    notes
FROM template_day td
    CROSS JOIN (
        VALUES ('ex_003', 4, 8, 10, 120, 'Front squat for quads'),
            ('ex_010', 4, 10, 12, 90, 'RDL for hamstrings'),
            (
                'ex_018',
                3,
                10,
                12,
                75,
                'Bulgarian split squats'
            ),
            ('ex_027', 3, 12, 15, 60, 'Leg extensions'),
            ('ex_028', 3, 12, 15, 60, 'Leg curls'),
            ('ex_043', 4, 15, 20, 45, 'Seated calf raises')
    ) AS v(
        external_id,
        sets,
        reps_min,
        reps_max,
        rest_sec,
        notes
    )
    JOIN public.exercises e ON e.external_id = v.external_id;
-- ===========================================
-- TEMPLATE 3: FULL BODY STRENGTH - BEGINNER
-- ===========================================
-- Day 1: Squat Focus
WITH template AS (
    SELECT id
    FROM public.workout_templates
    WHERE external_id = 'template_fullbody_beginner'
)
INSERT INTO public.workout_template_days (
        template_id,
        day_number,
        name,
        focus,
        estimated_duration_min
    )
SELECT id,
    1,
    'Squat Focus',
    'Lower body emphasis with upper accessories',
    60
FROM template;
WITH template_day AS (
    SELECT id
    FROM public.workout_template_days wtd
        JOIN public.workout_templates wt ON wtd.template_id = wt.id
    WHERE wt.external_id = 'template_fullbody_beginner'
        AND wtd.day_number = 1
)
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
SELECT td.id,
    e.id,
    row_number() OVER (),
    sets,
    reps_min,
    reps_max,
    rest_sec,
    notes
FROM template_day td
    CROSS JOIN (
        VALUES (
                'ex_001',
                5,
                5,
                5,
                180,
                'Main lift - linear progression'
            ),
            ('ex_048', 3, 8, 10, 120, 'Upper body compound'),
            ('ex_070', 3, 8, 10, 90, 'Back accessory'),
            ('ex_028', 3, 10, 12, 60, 'Ham accessory'),
            ('ex_042', 3, 12, 15, 60, 'Calves')
    ) AS v(
        external_id,
        sets,
        reps_min,
        reps_max,
        rest_sec,
        notes
    )
    JOIN public.exercises e ON e.external_id = v.external_id;
-- Day 2: Bench Focus
WITH template AS (
    SELECT id
    FROM public.workout_templates
    WHERE external_id = 'template_fullbody_beginner'
)
INSERT INTO public.workout_template_days (
        template_id,
        day_number,
        name,
        focus,
        estimated_duration_min
    )
SELECT id,
    2,
    'Bench Focus',
    'Upper body emphasis with lower accessories',
    60
FROM template;
WITH template_day AS (
    SELECT id
    FROM public.workout_template_days wtd
        JOIN public.workout_templates wt ON wtd.template_id = wt.id
    WHERE wt.external_id = 'template_fullbody_beginner'
        AND wtd.day_number = 2
)
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
SELECT td.id,
    e.id,
    row_number() OVER (),
    sets,
    reps_min,
    reps_max,
    rest_sec,
    notes
FROM template_day td
    CROSS JOIN (
        VALUES (
                'ex_048',
                5,
                5,
                5,
                180,
                'Main lift - linear progression'
            ),
            ('ex_001', 3, 8, 10, 120, 'Squat volume work'),
            ('ex_111', 3, 8, 10, 90, 'Overhead pressing'),
            ('ex_139', 3, 10, 12, 60, 'Biceps'),
            ('ex_148', 3, 10, 12, 60, 'Triceps')
    ) AS v(
        external_id,
        sets,
        reps_min,
        reps_max,
        rest_sec,
        notes
    )
    JOIN public.exercises e ON e.external_id = v.external_id;
-- Day 3: Deadlift Focus
WITH template AS (
    SELECT id
    FROM public.workout_templates
    WHERE external_id = 'template_fullbody_beginner'
)
INSERT INTO public.workout_template_days (
        template_id,
        day_number,
        name,
        focus,
        estimated_duration_min
    )
SELECT id,
    3,
    'Deadlift Focus',
    'Posterior chain with balanced accessories',
    60
FROM template;
WITH template_day AS (
    SELECT id
    FROM public.workout_template_days wtd
        JOIN public.workout_templates wt ON wtd.template_id = wt.id
    WHERE wt.external_id = 'template_fullbody_beginner'
        AND wtd.day_number = 3
)
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
SELECT td.id,
    e.id,
    row_number() OVER (),
    sets,
    reps_min,
    reps_max,
    rest_sec,
    notes
FROM template_day td
    CROSS JOIN (
        VALUES (
                'ex_007',
                5,
                5,
                5,
                180,
                'Main lift - linear progression'
            ),
            (
                'ex_050',
                3,
                8,
                10,
                120,
                'Incline bench accessory'
            ),
            ('ex_084', 3, 8, 10, 90, 'Lat pulldown'),
            ('ex_023', 3, 10, 12, 90, 'Leg press volume'),
            ('ex_042', 3, 12, 15, 60, 'Calves')
    ) AS v(
        external_id,
        sets,
        reps_min,
        reps_max,
        rest_sec,
        notes
    )
    JOIN public.exercises e ON e.external_id = v.external_id;
-- ===========================================
-- TEMPLATE 4: 5-DAY BODYBUILDING SPLIT
-- ===========================================
-- Day 1: Chest & Triceps
WITH template AS (
    SELECT id
    FROM public.workout_templates
    WHERE external_id = 'template_bro_split_advanced'
)
INSERT INTO public.workout_template_days (
        template_id,
        day_number,
        name,
        focus,
        estimated_duration_min
    )
SELECT id,
    1,
    'Chest & Triceps',
    'Chest emphasis with tricep isolation',
    75
FROM template;
WITH template_day AS (
    SELECT id
    FROM public.workout_template_days wtd
        JOIN public.workout_templates wt ON wtd.template_id = wt.id
    WHERE wt.external_id = 'template_bro_split_advanced'
        AND wtd.day_number = 1
)
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
SELECT td.id,
    e.id,
    row_number() OVER (),
    sets,
    reps_min,
    reps_max,
    rest_sec,
    notes
FROM template_day td
    CROSS JOIN (
        VALUES ('ex_048', 4, 6, 8, 120, 'Flat barbell bench'),
            ('ex_053', 4, 8, 10, 90, 'Incline DB press'),
            ('ex_065', 3, 10, 12, 60, 'Cable flyes mid'),
            (
                'ex_062',
                3,
                12,
                15,
                60,
                'Cable flyes low-to-high'
            ),
            (
                'ex_051',
                4,
                8,
                10,
                90,
                'Close-grip bench for triceps'
            ),
            (
                'ex_150',
                3,
                10,
                12,
                60,
                'Overhead cable extension'
            ),
            ('ex_152', 3, 10, 12, 60, 'Skull crushers')
    ) AS v(
        external_id,
        sets,
        reps_min,
        reps_max,
        rest_sec,
        notes
    )
    JOIN public.exercises e ON e.external_id = v.external_id;
-- Day 2: Back & Biceps
WITH template AS (
    SELECT id
    FROM public.workout_templates
    WHERE external_id = 'template_bro_split_advanced'
)
INSERT INTO public.workout_template_days (
        template_id,
        day_number,
        name,
        focus,
        estimated_duration_min
    )
SELECT id,
    2,
    'Back & Biceps',
    'Back width and thickness with bicep work',
    75
FROM template;
WITH template_day AS (
    SELECT id
    FROM public.workout_template_days wtd
        JOIN public.workout_templates wt ON wtd.template_id = wt.id
    WHERE wt.external_id = 'template_bro_split_advanced'
        AND wtd.day_number = 2
)
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
SELECT td.id,
    e.id,
    row_number() OVER (),
    sets,
    reps_min,
    reps_max,
    rest_sec,
    notes
FROM template_day td
    CROSS JOIN (
        VALUES ('ex_079', 4, 6, 10, 120, 'Pull-ups for width'),
            (
                'ex_068',
                4,
                8,
                10,
                90,
                'Barbell rows for thickness'
            ),
            ('ex_075', 3, 10, 12, 75, 'Cable rows'),
            ('ex_070', 3, 10, 12, 75, 'DB rows'),
            ('ex_098', 3, 12, 15, 60, 'Barbell shrugs'),
            ('ex_138', 4, 8, 12, 60, 'Barbell curls'),
            ('ex_142', 3, 10, 12, 60, 'Incline DB curls'),
            ('ex_140', 3, 12, 15, 60, 'Hammer curls')
    ) AS v(
        external_id,
        sets,
        reps_min,
        reps_max,
        rest_sec,
        notes
    )
    JOIN public.exercises e ON e.external_id = v.external_id;
-- Day 3: Shoulders
WITH template AS (
    SELECT id
    FROM public.workout_templates
    WHERE external_id = 'template_bro_split_advanced'
)
INSERT INTO public.workout_template_days (
        template_id,
        day_number,
        name,
        focus,
        estimated_duration_min
    )
SELECT id,
    3,
    'Shoulders',
    'All three delt heads',
    75
FROM template;
WITH template_day AS (
    SELECT id
    FROM public.workout_template_days wtd
        JOIN public.workout_templates wt ON wtd.template_id = wt.id
    WHERE wt.external_id = 'template_bro_split_advanced'
        AND wtd.day_number = 3
)
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
SELECT td.id,
    e.id,
    row_number() OVER (),
    sets,
    reps_min,
    reps_max,
    rest_sec,
    notes
FROM template_day td
    CROSS JOIN (
        VALUES ('ex_111', 4, 6, 8, 120, 'Standing OHP'),
            ('ex_114', 4, 8, 10, 90, 'Seated DB press'),
            ('ex_120', 4, 10, 15, 60, 'Lateral raises'),
            ('ex_123', 3, 10, 15, 60, 'Front raises'),
            ('ex_103', 4, 12, 15, 60, 'Face pulls'),
            (
                'ex_107',
                3,
                12,
                15,
                60,
                'Bent-over rear delt flyes'
            ),
            ('ex_098', 3, 12, 15, 60, 'Shrugs')
    ) AS v(
        external_id,
        sets,
        reps_min,
        reps_max,
        rest_sec,
        notes
    )
    JOIN public.exercises e ON e.external_id = v.external_id;
-- Day 4: Legs
WITH template AS (
    SELECT id
    FROM public.workout_templates
    WHERE external_id = 'template_bro_split_advanced'
)
INSERT INTO public.workout_template_days (
        template_id,
        day_number,
        name,
        focus,
        estimated_duration_min
    )
SELECT id,
    4,
    'Legs',
    'Quad, hamstring, and glute hypertrophy',
    90
FROM template;
WITH template_day AS (
    SELECT id
    FROM public.workout_template_days wtd
        JOIN public.workout_templates wt ON wtd.template_id = wt.id
    WHERE wt.external_id = 'template_bro_split_advanced'
        AND wtd.day_number = 4
)
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
SELECT td.id,
    e.id,
    row_number() OVER (),
    sets,
    reps_min,
    reps_max,
    rest_sec,
    notes
FROM template_day td
    CROSS JOIN (
        VALUES ('ex_001', 4, 6, 8, 150, 'Back squat'),
            ('ex_010', 4, 8, 10, 120, 'Romanian deadlifts'),
            ('ex_023', 4, 10, 15, 90, 'Leg press'),
            ('ex_027', 3, 12, 15, 60, 'Leg extensions'),
            ('ex_028', 3, 12, 15, 60, 'Lying leg curls'),
            (
                'ex_018',
                3,
                10,
                12,
                75,
                'Bulgarian split squats'
            ),
            ('ex_042', 4, 12, 15, 60, 'Standing calf raises'),
            ('ex_043', 4, 15, 20, 45, 'Seated calf raises')
    ) AS v(
        external_id,
        sets,
        reps_min,
        reps_max,
        rest_sec,
        notes
    )
    JOIN public.exercises e ON e.external_id = v.external_id;
-- Day 5: Arms & Abs
WITH template AS (
    SELECT id
    FROM public.workout_templates
    WHERE external_id = 'template_bro_split_advanced'
)
INSERT INTO public.workout_template_days (
        template_id,
        day_number,
        name,
        focus,
        estimated_duration_min
    )
SELECT id,
    5,
    'Arms & Abs',
    'Arm specialization and core',
    60
FROM template;
WITH template_day AS (
    SELECT id
    FROM public.workout_template_days wtd
        JOIN public.workout_templates wt ON wtd.template_id = wt.id
    WHERE wt.external_id = 'template_bro_split_advanced'
        AND wtd.day_number = 5
)
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
SELECT td.id,
    e.id,
    row_number() OVER (),
    sets,
    reps_min,
    reps_max,
    rest_sec,
    notes
FROM template_day td
    CROSS JOIN (
        VALUES ('ex_138', 4, 8, 10, 75, 'Barbell curls'),
            ('ex_148', 4, 10, 12, 75, 'Cable pushdowns'),
            ('ex_142', 3, 10, 12, 60, 'Incline DB curls'),
            ('ex_152', 3, 10, 12, 60, 'Skull crushers'),
            ('ex_143', 3, 12, 15, 60, 'Concentration curls'),
            ('ex_150', 3, 12, 15, 60, 'Overhead extensions'),
            ('ex_169', 3, 12, 15, 60, 'Cable crunches'),
            ('ex_167', 3, 10, 15, 60, 'Hanging leg raises')
    ) AS v(
        external_id,
        sets,
        reps_min,
        reps_max,
        rest_sec,
        notes
    )
    JOIN public.exercises e ON e.external_id = v.external_id;
-- Verify counts
DO $$
DECLARE template_count INTEGER;
day_count INTEGER;
exercise_count INTEGER;
BEGIN
SELECT COUNT(*) INTO template_count
FROM public.workout_templates
WHERE external_id LIKE 'template%';
SELECT COUNT(*) INTO day_count
FROM public.workout_template_days wtd
    JOIN public.workout_templates wt ON wtd.template_id = wt.id
WHERE wt.external_id LIKE 'template%';
SELECT COUNT(*) INTO exercise_count
FROM public.workout_template_exercises wte
    JOIN public.workout_template_days wtd ON wte.template_day_id = wtd.id
    JOIN public.workout_templates wt ON wtd.template_id = wt.id
WHERE wt.external_id LIKE 'template%';
RAISE NOTICE 'Seeded % workout templates',
template_count;
RAISE NOTICE 'Created % template days',
day_count;
RAISE NOTICE 'Created % template exercises',
exercise_count;
IF template_count < 4 THEN RAISE WARNING 'Expected 4 templates, but only % were inserted',
template_count;
END IF;
END $$;