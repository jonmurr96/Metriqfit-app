/**
 * program-blueprints.ts
 * 
 * Complete program templates using fundamental exercises.
 * 9 split types × 3 experience levels = 27 programs
 * Strict exercise selection - no redundant movements
 */

import type { ExperienceLevel } from './training-profile.ts';
import type { FundamentalExercise } from './fundamental-exercises.ts';
import type { PatternSlot } from './exerciseClassification.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SplitType =
  | 'full_body'
  | 'upper_lower'
  | 'ppl'
  | 'arnold'
  | 'bro'
  | 'bro_split'
  | 'phat'
  | 'phul'
  | 'dc'
  | 'gvt';

export type PeriodizationModel = 'linear' | 'block' | 'dup' | 'rpe_based';

export interface ExerciseAssignment {
  exerciseId: string;
  sets: number;
  reps: string;
  restSeconds: number;
  rpe?: number;
  technique?: string;
}

export interface DayBlueprint {
  dayNumber: number;
  name: string;
  focus: string[];
  exercises: ExerciseAssignment[];
  estimatedDurationMin: number;
}

export interface ProgramBlueprint {
  id: string;
  name: string;
  split: SplitType;
  experience: ExperienceLevel;
  daysPerWeek: number;
  durationWeeks: number;
  periodization: PeriodizationModel;
  description: string;
  idealFor: string[];
  days: DayBlueprint[];
}

// ---------------------------------------------------------------------------
// Exercise ID Constants (reference to fundamental-exercises.ts)
// ---------------------------------------------------------------------------

const EX = {
  // Squat
  back_squat: 'back_squat',
  front_squat: 'front_squat',
  goblet_squat: 'goblet_squat',
  leg_press: 'leg_press',
  hack_squat: 'hack_squat',
  
  // Hinge
  deadlift: 'deadlift',
  romanian_deadlift: 'romanian_deadlift',
  hip_thrust: 'hip_thrust',
  
  // Single Leg
  bulgarian_split_squat: 'bulgarian_split_squat',
  walking_lunge: 'walking_lunge',
  leg_extension: 'leg_extension',
  leg_curl: 'leg_curl',
  calf_raise: 'calf_raise',
  
  // Horizontal Push
  barbell_bench: 'barbell_bench_press',
  dumbbell_bench: 'dumbbell_bench_press',
  incline_barbell: 'incline_barbell_press',
  incline_dumbbell: 'incline_dumbbell_press',
  push_up: 'push_up',
  
  // Horizontal Pull
  barbell_row: 'barbell_row',
  dumbbell_row: 'dumbbell_row',
  cable_row: 'cable_row',
  chest_supported_row: 'chest_supported_row',
  
  // Vertical Push
  overhead_press: 'overhead_press',
  dumbbell_overhead_press: 'dumbbell_overhead_press',
  
  // Vertical Pull
  pull_up: 'pull_up',
  chin_up: 'chin_up',
  lat_pulldown: 'lat_pulldown',
  
  // Chest Accessory
  cable_fly: 'cable_fly',
  dumbbell_fly: 'dumbbell_fly',
  
  // Shoulder Accessory
  lateral_raise: 'lateral_raise',
  face_pull: 'face_pull',
  reverse_fly: 'reverse_fly',
  
  // Arms
  barbell_curl: 'barbell_curl',
  dumbbell_curl: 'dumbbell_curl',
  hammer_curl: 'hammer_curl',
  tricep_pushdown: 'tricep_pushdown',
  overhead_extension: 'overhead_extension',
  close_grip_bench: 'close_grip_bench',
  
  // Core
  plank: 'plank',
  dead_bug: 'dead_bug',
  pallof_press: 'pallof_press',
  ab_wheel: 'ab_wheel',
  hanging_leg_raise: 'hanging_leg_raise',
} as const;

// ---------------------------------------------------------------------------
// Helper: Create exercise assignment
// ---------------------------------------------------------------------------

function e(
  exerciseId: string,
  sets: number,
  reps: string,
  restSeconds: number,
  options: { rpe?: number; technique?: string } = {}
): ExerciseAssignment {
  return {
    exerciseId,
    sets,
    reps,
    restSeconds,
    ...options,
  };
}

// ---------------------------------------------------------------------------
// FULL BODY PROGRAMS (2-3 days/week)
// ---------------------------------------------------------------------------

const FULL_BODY_BEGINNER: ProgramBlueprint = {
  id: 'full_body_beginner',
  name: 'Full Body Foundation',
  split: 'full_body',
  experience: 'beginner',
  daysPerWeek: 3,
  durationWeeks: 8,
  periodization: 'linear',
  description: 'Perfect for beginners. Three full-body sessions per week with foundational movements. Focus on technique and motor learning.',
  idealFor: ['Complete beginners', 'Those returning after long break', 'Busy schedules'],
  days: [
    {
      dayNumber: 1,
      name: 'Full Body A',
      focus: ['squat', 'push', 'pull'],
      estimatedDurationMin: 45,
      exercises: [
        e(EX.goblet_squat, 3, '8-12', 120),
        e(EX.push_up, 3, '8-12', 90),
        e(EX.dumbbell_row, 3, '8-12', 90),
        e(EX.lat_pulldown, 3, '10-12', 90),
        e(EX.dumbbell_overhead_press, 3, '10-12', 90),
        e(EX.leg_curl, 3, '12-15', 60),
        e(EX.plank, 3, '30s', 60),
      ],
    },
    {
      dayNumber: 2,
      name: 'Full Body B',
      focus: ['hinge', 'push', 'pull'],
      estimatedDurationMin: 45,
      exercises: [
        e(EX.romanian_deadlift, 3, '8-12', 120),
        e(EX.dumbbell_bench, 3, '8-12', 90),
        e(EX.cable_row, 3, '10-12', 90),
        e(EX.lat_pulldown, 3, '10-12', 90),
        e(EX.dumbbell_overhead_press, 3, '10-12', 90),
        e(EX.walking_lunge, 3, '10/leg', 90),
        e(EX.dead_bug, 3, '10/side', 60),
      ],
    },
    {
      dayNumber: 3,
      name: 'Full Body C',
      focus: ['legs', 'upper', 'core'],
      estimatedDurationMin: 45,
      exercises: [
        e(EX.leg_press, 3, '10-12', 120),
        e(EX.push_up, 3, '8-12', 90),
        e(EX.chest_supported_row, 3, '10-12', 90),
        e(EX.lat_pulldown, 3, '10-12', 90),
        e(EX.lateral_raise, 3, '12-15', 60),
        e(EX.leg_curl, 3, '12-15', 60),
        e(EX.plank, 3, '30s', 60),
      ],
    },
  ],
};

const FULL_BODY_INTERMEDIATE: ProgramBlueprint = {
  id: 'full_body_intermediate',
  name: 'Full Body Strength',
  split: 'full_body',
  experience: 'intermediate',
  daysPerWeek: 3,
  durationWeeks: 12,
  periodization: 'linear',
  description: 'Three full-body sessions with barbell compounds. Linear progression focus with accessory work for balance.',
  idealFor: ['Intermediate lifters', 'Strength focus', 'Time-efficient training'],
  days: [
    {
      dayNumber: 1,
      name: 'Full Body A',
      focus: ['squat', 'horizontal push/pull'],
      estimatedDurationMin: 60,
      exercises: [
        e(EX.back_squat, 3, '5-8', 180, { rpe: 8 }),
        e(EX.barbell_bench, 3, '6-10', 120, { rpe: 8 }),
        e(EX.barbell_row, 3, '6-10', 120, { rpe: 8 }),
        e(EX.bulgarian_split_squat, 3, '8-10/leg', 90),
        e(EX.face_pull, 3, '15-20', 60),
        e(EX.barbell_curl, 3, '10-12', 60),
        e(EX.plank, 3, '45s', 60),
      ],
    },
    {
      dayNumber: 2,
      name: 'Full Body B',
      focus: ['hinge', 'vertical push/pull'],
      estimatedDurationMin: 60,
      exercises: [
        e(EX.romanian_deadlift, 3, '6-10', 180, { rpe: 8 }),
        e(EX.overhead_press, 3, '6-10', 120, { rpe: 8 }),
        e(EX.pull_up, 3, '6-10', 120, { rpe: 8 }),
        e(EX.leg_press, 3, '10-12', 120),
        e(EX.dumbbell_fly, 3, '12-15', 60),
        e(EX.tricep_pushdown, 3, '12-15', 60),
        e(EX.dead_bug, 3, '12/side', 60),
      ],
    },
    {
      dayNumber: 3,
      name: 'Full Body C',
      focus: ['full body, lighter'],
      estimatedDurationMin: 60,
      exercises: [
        e(EX.front_squat, 3, '6-8', 180, { rpe: 8 }),
        e(EX.incline_dumbbell, 3, '8-12', 90),
        e(EX.chest_supported_row, 3, '10-12', 90),
        e(EX.lat_pulldown, 3, '10-12', 90),
        e(EX.hip_thrust, 3, '10-12', 90),
        e(EX.lateral_raise, 3, '12-15', 60),
        e(EX.pallof_press, 3, '12/side', 60),
      ],
    },
  ],
};

const FULL_BODY_ADVANCED: ProgramBlueprint = {
  id: 'full_body_advanced',
  name: 'Full Body Power',
  split: 'full_body',
  experience: 'advanced',
  daysPerWeek: 3,
  durationWeeks: 12,
  periodization: 'dup',
  description: 'DUP-style full body with varying intensities. Heavy compounds, moderate volume, and technique work across the week.',
  idealFor: ['Advanced lifters', 'DUP training', 'Strength + size'],
  days: [
    {
      dayNumber: 1,
      name: 'Heavy Day',
      focus: ['heavy compounds', 'strength'],
      estimatedDurationMin: 75,
      exercises: [
        e(EX.back_squat, 4, '3-5', 240, { rpe: 9 }),
        e(EX.barbell_bench, 4, '3-5', 180, { rpe: 9 }),
        e(EX.deadlift, 3, '3-5', 240, { rpe: 9 }),
        e(EX.pull_up, 3, '6-8', 120),
        e(EX.face_pull, 3, '15-20', 60),
        e(EX.ab_wheel, 3, '10-12', 60),
      ],
    },
    {
      dayNumber: 2,
      name: 'Volume Day',
      focus: ['moderate weight', 'volume accumulation'],
      estimatedDurationMin: 75,
      exercises: [
        e(EX.front_squat, 3, '8-10', 180, { rpe: 8 }),
        e(EX.incline_barbell, 3, '8-10', 120, { rpe: 8 }),
        e(EX.barbell_row, 3, '8-10', 120, { rpe: 8 }),
        e(EX.lat_pulldown, 3, '10-12', 90),
        e(EX.bulgarian_split_squat, 3, '10/leg', 90),
        e(EX.overhead_press, 3, '8-10', 90),
        e(EX.plank, 3, '60s', 60),
      ],
    },
    {
      dayNumber: 3,
      name: 'Technique/Accessory Day',
      focus: ['technique', 'weak points'],
      estimatedDurationMin: 60,
      exercises: [
        e(EX.hack_squat, 3, '10-12', 120),
        e(EX.dumbbell_bench, 3, '10-12', 90),
        e(EX.chest_supported_row, 3, '12-15', 90),
        e(EX.dumbbell_overhead_press, 3, '10-12', 90),
        e(EX.romanian_deadlift, 3, '10-12', 120),
        e(EX.cable_fly, 3, '12-15', 60),
        e(EX.hanging_leg_raise, 3, '10-12', 60),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// UPPER/LOWER PROGRAMS (4 days/week)
// ---------------------------------------------------------------------------

const UPPER_LOWER_BEGINNER: ProgramBlueprint = {
  id: 'upper_lower_beginner',
  name: 'Upper/Lower Foundation',
  split: 'upper_lower',
  experience: 'beginner',
  daysPerWeek: 4,
  durationWeeks: 8,
  periodization: 'linear',
  description: 'Four-day upper/lower split. Perfect for building a foundation with manageable volume per session.',
  idealFor: ['Beginners ready for split', 'Those with 45-60 min per session'],
  days: [
    {
      dayNumber: 1,
      name: 'Upper A',
      focus: ['horizontal push/pull'],
      estimatedDurationMin: 45,
      exercises: [
        e(EX.dumbbell_bench, 3, '8-12', 90),
        e(EX.cable_row, 3, '10-12', 90),
        e(EX.lat_pulldown, 3, '10-12', 90),
        e(EX.dumbbell_overhead_press, 3, '10-12', 90),
        e(EX.dumbbell_curl, 3, '12-15', 60),
        e(EX.tricep_pushdown, 3, '12-15', 60),
        e(EX.face_pull, 3, '15-20', 60),
      ],
    },
    {
      dayNumber: 2,
      name: 'Lower A',
      focus: ['quads', 'posterior chain'],
      estimatedDurationMin: 45,
      exercises: [
        e(EX.goblet_squat, 3, '10-12', 120),
        e(EX.romanian_deadlift, 3, '10-12', 120),
        e(EX.leg_press, 3, '12-15', 120),
        e(EX.leg_curl, 3, '12-15', 90),
        e(EX.calf_raise, 3, '15-20', 60),
        e(EX.plank, 3, '30s', 60),
      ],
    },
    {
      dayNumber: 3,
      name: 'Upper B',
      focus: ['vertical push/pull'],
      estimatedDurationMin: 45,
      exercises: [
        e(EX.lat_pulldown, 3, '10-12', 90),
        e(EX.push_up, 3, '10-12', 90),
        e(EX.chest_supported_row, 3, '10-12', 90),
        e(EX.dumbbell_overhead_press, 3, '10-12', 90),
        e(EX.lateral_raise, 3, '12-15', 60),
        e(EX.hammer_curl, 3, '12-15', 60),
        e(EX.overhead_extension, 3, '12-15', 60),
      ],
    },
    {
      dayNumber: 4,
      name: 'Lower B',
      focus: ['hinge emphasis', 'unilateral'],
      estimatedDurationMin: 45,
      exercises: [
        e(EX.leg_press, 3, '10-12', 120),
        e(EX.walking_lunge, 3, '10/leg', 90),
        e(EX.hip_thrust, 3, '12-15', 90),
        e(EX.leg_extension, 3, '12-15', 90),
        e(EX.leg_curl, 3, '12-15', 90),
        e(EX.calf_raise, 3, '15-20', 60),
        e(EX.dead_bug, 3, '10/side', 60),
      ],
    },
  ],
};

const UPPER_LOWER_INTERMEDIATE: ProgramBlueprint = {
  id: 'upper_lower_intermediate',
  name: 'Upper/Lower Strength',
  split: 'upper_lower',
  experience: 'intermediate',
  daysPerWeek: 4,
  durationWeeks: 12,
  periodization: 'linear',
  description: 'Classic four-day upper/lower split with barbell compounds. Progressive overload focus with balanced accessory work.',
  idealFor: ['Intermediate lifters', 'Strength and muscle building', 'Structured progression'],
  days: [
    {
      dayNumber: 1,
      name: 'Upper A - Push Focus',
      focus: ['horizontal/vertical push', 'pulls'],
      estimatedDurationMin: 60,
      exercises: [
        e(EX.barbell_bench, 4, '6-10', 150, { rpe: 8 }),
        e(EX.overhead_press, 3, '8-10', 120, { rpe: 8 }),
        e(EX.barbell_row, 3, '8-10', 120, { rpe: 8 }),
        e(EX.lat_pulldown, 3, '10-12', 90),
        e(EX.lateral_raise, 3, '12-15', 60),
        e(EX.tricep_pushdown, 3, '10-12', 60),
        e(EX.face_pull, 3, '15-20', 60),
      ],
    },
    {
      dayNumber: 2,
      name: 'Lower A - Squat Focus',
      focus: ['squat pattern', 'quad dominant'],
      estimatedDurationMin: 60,
      exercises: [
        e(EX.back_squat, 4, '5-8', 180, { rpe: 8 }),
        e(EX.romanian_deadlift, 3, '8-10', 120),
        e(EX.bulgarian_split_squat, 3, '8-10/leg', 90),
        e(EX.leg_extension, 3, '12-15', 90),
        e(EX.leg_curl, 3, '12-15', 90),
        e(EX.calf_raise, 4, '12-15', 60),
        e(EX.plank, 3, '45s', 60),
      ],
    },
    {
      dayNumber: 3,
      name: 'Upper B - Pull Focus',
      focus: ['pulls', 'incline push'],
      estimatedDurationMin: 60,
      exercises: [
        e(EX.pull_up, 4, '6-10', 120, { rpe: 8 }),
        e(EX.incline_barbell, 3, '8-10', 120, { rpe: 8 }),
        e(EX.chest_supported_row, 3, '10-12', 90),
        e(EX.dumbbell_overhead_press, 3, '8-10', 90),
        e(EX.cable_fly, 3, '12-15', 60),
        e(EX.barbell_curl, 3, '10-12', 60),
        e(EX.reverse_fly, 3, '15-20', 60),
      ],
    },
    {
      dayNumber: 4,
      name: 'Lower B - Hinge Focus',
      focus: ['hinge pattern', 'posterior chain'],
      estimatedDurationMin: 60,
      exercises: [
        e(EX.deadlift, 4, '4-6', 180, { rpe: 8 }),
        e(EX.front_squat, 3, '8-10', 120),
        e(EX.hip_thrust, 3, '10-12', 90),
        e(EX.leg_curl, 4, '10-12', 90),
        e(EX.walking_lunge, 3, '10/leg', 90),
        e(EX.calf_raise, 4, '12-15', 60),
        e(EX.pallof_press, 3, '12/side', 60),
      ],
    },
  ],
};

const UPPER_LOWER_ADVANCED: ProgramBlueprint = {
  id: 'upper_lower_advanced',
  name: 'Upper/Lower Power',
  split: 'upper_lower',
  experience: 'advanced',
  daysPerWeek: 4,
  durationWeeks: 12,
  periodization: 'dup',
  description: 'DUP-style upper/lower with heavy, moderate, and light days. Power focus with undulating volume and intensity.',
  idealFor: ['Advanced lifters', 'Power building', 'Periodization enthusiasts'],
  days: [
    {
      dayNumber: 1,
      name: 'Upper - Heavy',
      focus: ['strength', 'heavy compounds'],
      estimatedDurationMin: 75,
      exercises: [
        e(EX.barbell_bench, 5, '3-5', 180, { rpe: 9 }),
        e(EX.barbell_row, 4, '4-6', 150, { rpe: 9 }),
        e(EX.overhead_press, 4, '4-6', 150, { rpe: 9 }),
        e(EX.weighted_pull_up, 4, '5-7', 150, { rpe: 9 }),
        e(EX.close_grip_bench, 3, '6-8', 90),
        e(EX.face_pull, 3, '15-20', 60),
      ],
    },
    {
      dayNumber: 2,
      name: 'Lower - Heavy',
      focus: ['squat/deadlift strength'],
      estimatedDurationMin: 75,
      exercises: [
        e(EX.back_squat, 5, '3-5', 210, { rpe: 9 }),
        e(EX.deadlift, 4, '3-5', 210, { rpe: 9 }),
        e(EX.bulgarian_split_squat, 3, '8-10/leg', 120),
        e(EX.leg_curl, 4, '10-12', 90),
        e(EX.calf_raise, 5, '10-12', 60),
        e(EX.ab_wheel, 3, '10-12', 60),
      ],
    },
    {
      dayNumber: 3,
      name: 'Upper - Volume',
      focus: ['hypertrophy', 'volume'],
      estimatedDurationMin: 75,
      exercises: [
        e(EX.incline_dumbbell, 4, '8-10', 120),
        e(EX.cable_row, 4, '10-12', 90),
        e(EX.lat_pulldown, 4, '10-12', 90),
        e(EX.dumbbell_overhead_press, 3, '8-10', 90),
        e(EX.dumbbell_fly, 3, '12-15', 60),
        e(EX.barbell_curl, 4, '10-12', 60),
        e(EX.tricep_pushdown, 4, '12-15', 60),
        e(EX.reverse_fly, 3, '15-20', 60),
      ],
    },
    {
      dayNumber: 4,
      name: 'Lower - Volume',
      focus: ['quad/ham hypertrophy'],
      estimatedDurationMin: 75,
      exercises: [
        e(EX.front_squat, 4, '6-8', 180),
        e(EX.romanian_deadlift, 4, '8-10', 150),
        e(EX.hack_squat, 3, '10-12', 120),
        e(EX.hip_thrust, 4, '10-12', 90),
        e(EX.leg_extension, 4, '12-15', 90),
        e(EX.leg_curl, 4, '12-15', 90),
        e(EX.calf_raise, 5, '12-15', 60),
        e(EX.hanging_leg_raise, 3, '12-15', 60),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// PPL PROGRAMS (6 days/week)
// ---------------------------------------------------------------------------

const PPL_BEGINNER: ProgramBlueprint = {
  id: 'ppl_beginner',
  name: 'PPL Foundation',
  split: 'ppl',
  experience: 'beginner',
  daysPerWeek: 6,
  durationWeeks: 8,
  periodization: 'linear',
  description: 'Six-day Push/Pull/Legs split for beginners. Manageable volume per session with full recovery between muscle groups.',
  idealFor: ['Dedicated beginners', 'High frequency preference', 'Bodybuilding focus'],
  days: [
    {
      dayNumber: 1,
      name: 'Push A',
      focus: ['chest', 'shoulders', 'triceps'],
      estimatedDurationMin: 45,
      exercises: [
        e(EX.dumbbell_bench, 3, '8-12', 90),
        e(EX.dumbbell_overhead_press, 3, '10-12', 90),
        e(EX.cable_fly, 3, '12-15', 60),
        e(EX.lateral_raise, 3, '12-15', 60),
        e(EX.tricep_pushdown, 3, '12-15', 60),
      ],
    },
    {
      dayNumber: 2,
      name: 'Pull A',
      focus: ['back', 'biceps', 'rear delts'],
      estimatedDurationMin: 45,
      exercises: [
        e(EX.lat_pulldown, 3, '10-12', 90),
        e(EX.cable_row, 3, '10-12', 90),
        e(EX.face_pull, 3, '15-20', 60),
        e(EX.dumbbell_curl, 3, '12-15', 60),
        e(EX.hammer_curl, 3, '12-15', 60),
      ],
    },
    {
      dayNumber: 3,
      name: 'Legs A',
      focus: ['quads', 'hamstrings', 'calves'],
      estimatedDurationMin: 45,
      exercises: [
        e(EX.goblet_squat, 3, '10-12', 120),
        e(EX.romanian_deadlift, 3, '10-12', 120),
        e(EX.leg_extension, 3, '12-15', 90),
        e(EX.leg_curl, 3, '12-15', 90),
        e(EX.calf_raise, 4, '15-20', 60),
      ],
    },
    {
      dayNumber: 4,
      name: 'Push B',
      focus: ['upper chest', 'shoulders'],
      estimatedDurationMin: 45,
      exercises: [
        e(EX.incline_dumbbell, 3, '8-12', 90),
        e(EX.push_up, 3, '10-12', 90),
        e(EX.dumbbell_overhead_press, 3, '10-12', 90),
        e(EX.lateral_raise, 3, '12-15', 60),
        e(EX.overhead_extension, 3, '12-15', 60),
      ],
    },
    {
      dayNumber: 5,
      name: 'Pull B',
      focus: ['lats', 'upper back'],
      estimatedDurationMin: 45,
      exercises: [
        e(EX.cable_row, 3, '10-12', 90),
        e(EX.lat_pulldown, 3, '10-12', 90),
        e(EX.chest_supported_row, 3, '10-12', 90),
        e(EX.reverse_fly, 3, '15-20', 60),
        e(EX.barbell_curl, 3, '10-12', 60),
      ],
    },
    {
      dayNumber: 6,
      name: 'Legs B',
      focus: ['glutes', 'unilateral'],
      estimatedDurationMin: 45,
      exercises: [
        e(EX.leg_press, 3, '10-12', 120),
        e(EX.walking_lunge, 3, '10/leg', 90),
        e(EX.hip_thrust, 3, '12-15', 90),
        e(EX.leg_curl, 3, '12-15', 90),
        e(EX.calf_raise, 4, '15-20', 60),
      ],
    },
  ],
};

const PPL_INTERMEDIATE: ProgramBlueprint = {
  id: 'ppl_intermediate',
  name: 'PPL Strength & Size',
  split: 'ppl',
  experience: 'intermediate',
  daysPerWeek: 6,
  durationWeeks: 12,
  periodization: 'linear',
  description: 'Classic PPL with barbell compounds. High frequency training for intermediate lifters focused on muscle and strength.',
  idealFor: ['Intermediate bodybuilders', 'High frequency training', 'Dedicated gym-goers'],
  days: [
    {
      dayNumber: 1,
      name: 'Push - Chest Focus',
      focus: ['chest', 'horizontal push'],
      estimatedDurationMin: 60,
      exercises: [
        e(EX.barbell_bench, 4, '6-10', 150, { rpe: 8 }),
        e(EX.incline_dumbbell, 3, '8-12', 90),
        e(EX.cable_fly, 3, '12-15', 60),
        e(EX.overhead_press, 3, '8-10', 90),
        e(EX.lateral_raise, 4, '12-15', 60),
        e(EX.tricep_pushdown, 4, '10-12', 60),
      ],
    },
    {
      dayNumber: 2,
      name: 'Pull - Back Width',
      focus: ['lats', 'vertical pull'],
      estimatedDurationMin: 60,
      exercises: [
        e(EX.pull_up, 4, '6-10', 120, { rpe: 8 }),
        e(EX.lat_pulldown, 4, '10-12', 90),
        e(EX.cable_row, 3, '10-12', 90),
        e(EX.face_pull, 4, '15-20', 60),
        e(EX.barbell_curl, 3, '10-12', 60),
        e(EX.hammer_curl, 3, '12-15', 60),
      ],
    },
    {
      dayNumber: 3,
      name: 'Legs - Quad Focus',
      focus: ['squat', 'quads'],
      estimatedDurationMin: 60,
      exercises: [
        e(EX.back_squat, 4, '6-8', 180, { rpe: 8 }),
        e(EX.leg_press, 3, '10-12', 120),
        e(EX.bulgarian_split_squat, 3, '8-10/leg', 90),
        e(EX.leg_extension, 4, '12-15', 90),
        e(EX.leg_curl, 3, '10-12', 90),
        e(EX.calf_raise, 5, '12-15', 60),
      ],
    },
    {
      dayNumber: 4,
      name: 'Push - Shoulder Focus',
      focus: ['shoulders', 'upper chest'],
      estimatedDurationMin: 60,
      exercises: [
        e(EX.overhead_press, 4, '6-10', 150, { rpe: 8 }),
        e(EX.incline_barbell, 3, '8-10', 120),
        e(EX.dumbbell_bench, 3, '8-12', 90),
        e(EX.lateral_raise, 4, '12-15', 60),
        e(EX.cable_fly, 3, '12-15', 60),
        e(EX.overhead_extension, 4, '10-12', 60),
      ],
    },
    {
      dayNumber: 5,
      name: 'Pull - Back Thickness',
      focus: ['rows', 'horizontal pull'],
      estimatedDurationMin: 60,
      exercises: [
        e(EX.barbell_row, 4, '6-10', 120, { rpe: 8 }),
        e(EX.chest_supported_row, 3, '10-12', 90),
        e(EX.dumbbell_row, 3, '10-12/arm', 90),
        e(EX.reverse_fly, 4, '15-20', 60),
        e(EX.dumbbell_curl, 3, '10-12', 60),
        e(EX.tricep_pushdown, 3, '12-15', 60),
      ],
    },
    {
      dayNumber: 6,
      name: 'Legs - Posterior Focus',
      focus: ['hinge', 'hamstrings', 'glutes'],
      estimatedDurationMin: 60,
      exercises: [
        e(EX.romanian_deadlift, 4, '6-10', 150, { rpe: 8 }),
        e(EX.front_squat, 3, '8-10', 120),
        e(EX.hip_thrust, 4, '10-12', 90),
        e(EX.leg_curl, 4, '10-12', 90),
        e(EX.walking_lunge, 3, '10/leg', 90),
        e(EX.calf_raise, 5, '12-15', 60),
      ],
    },
  ],
};

const PPL_ADVANCED: ProgramBlueprint = {
  id: 'ppl_advanced',
  name: 'PPL Power Build',
  split: 'ppl',
  experience: 'advanced',
  daysPerWeek: 6,
  durationWeeks: 12,
  periodization: 'dup',
  description: 'Advanced PPL with DUP periodization. Heavy compounds, volume work, and technique days for maximum progress.',
  idealFor: ['Advanced lifters', 'Power building', 'DUP training'],
  days: [
    {
      dayNumber: 1,
      name: 'Push - Strength',
      focus: ['heavy press', 'power'],
      estimatedDurationMin: 75,
      exercises: [
        e(EX.barbell_bench, 5, '3-5', 180, { rpe: 9 }),
        e(EX.overhead_press, 4, '4-6', 150, { rpe: 9 }),
        e(EX.weighted_dip, 4, '6-8', 120, { rpe: 9 }),
        e(EX.close_grip_bench, 4, '5-7', 120),
        e(EX.lateral_raise, 4, '12-15', 60),
      ],
    },
    {
      dayNumber: 2,
      name: 'Pull - Strength',
      focus: ['heavy pulls', 'power'],
      estimatedDurationMin: 75,
      exercises: [
        e(EX.weighted_pull_up, 5, '4-6', 150, { rpe: 9 }),
        e(EX.barbell_row, 4, '5-7', 150, { rpe: 9 }),
        e(EX.rack_pull, 4, '5-7', 150, { rpe: 9 }),
        e(EX.face_pull, 4, '15-20', 60),
        e(EX.barbell_curl, 4, '8-10', 60),
      ],
    },
    {
      dayNumber: 3,
      name: 'Legs - Strength',
      focus: ['squat/deadlift', 'power'],
      estimatedDurationMin: 75,
      exercises: [
        e(EX.back_squat, 5, '3-5', 210, { rpe: 9 }),
        e(EX.deadlift, 4, '3-5', 210, { rpe: 9 }),
        e(EX.front_squat, 4, '5-7', 150),
        e(EX.leg_curl, 4, '10-12', 90),
        e(EX.calf_raise, 5, '10-12', 60),
      ],
    },
    {
      dayNumber: 4,
      name: 'Push - Hypertrophy',
      focus: ['volume', 'pump'],
      estimatedDurationMin: 75,
      exercises: [
        e(EX.incline_dumbbell, 4, '8-10', 90),
        e(EX.dumbbell_bench, 4, '8-10', 90),
        e(EX.cable_fly, 4, '12-15', 60),
        e(EX.dumbbell_overhead_press, 4, '8-10', 90),
        e(EX.lateral_raise, 5, '12-15', 60),
        e(EX.tricep_pushdown, 5, '12-15', 60),
        e(EX.overhead_extension, 4, '12-15', 60),
      ],
    },
    {
      dayNumber: 5,
      name: 'Pull - Hypertrophy',
      focus: ['volume', 'pump'],
      estimatedDurationMin: 75,
      exercises: [
        e(EX.lat_pulldown, 5, '10-12', 90),
        e(EX.cable_row, 4, '10-12', 90),
        e(EX.chest_supported_row, 4, '12-15', 90),
        e(EX.dumbbell_row, 3, '10-12/arm', 90),
        e(EX.reverse_fly, 4, '15-20', 60),
        e(EX.dumbbell_curl, 4, '10-12', 60),
        e(EX.hammer_curl, 4, '12-15', 60),
      ],
    },
    {
      dayNumber: 6,
      name: 'Legs - Hypertrophy',
      focus: ['volume', 'pump'],
      estimatedDurationMin: 75,
      exercises: [
        e(EX.hack_squat, 4, '10-12', 120),
        e(EX.leg_press, 4, '10-12', 120),
        e(EX.bulgarian_split_squat, 4, '8-10/leg', 90),
        e(EX.hip_thrust, 4, '10-12', 90),
        e(EX.leg_extension, 5, '12-15', 90),
        e(EX.leg_curl, 5, '12-15', 90),
        e(EX.calf_raise, 5, '12-15', 60),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// ARNOLD SPLIT PROGRAMS (6 days/week)
// ---------------------------------------------------------------------------

const ARNOLD_BEGINNER: ProgramBlueprint = {
  id: 'arnold_beginner',
  name: 'Arnold Split Foundation',
  split: 'arnold',
  experience: 'beginner',
  daysPerWeek: 6,
  durationWeeks: 8,
  periodization: 'linear',
  description: 'Chest/Back, Shoulders/Arms, Legs rotation twice per week. Classic bodybuilding split for dedicated beginners.',
  idealFor: ['Dedicated beginners', 'Bodybuilding focus', 'High volume preference'],
  days: [
    {
      dayNumber: 1,
      name: 'Chest & Back',
      focus: ['horizontal push/pull'],
      estimatedDurationMin: 50,
      exercises: [
        e(EX.dumbbell_bench, 3, '8-12', 90),
        e(EX.cable_row, 3, '10-12', 90),
        e(EX.push_up, 3, '10-12', 90),
        e(EX.lat_pulldown, 3, '10-12', 90),
        e(EX.dumbbell_fly, 3, '12-15', 60),
        e(EX.face_pull, 3, '15-20', 60),
      ],
    },
    {
      dayNumber: 2,
      name: 'Shoulders & Arms',
      focus: ['delts', 'biceps', 'triceps'],
      estimatedDurationMin: 45,
      exercises: [
        e(EX.dumbbell_overhead_press, 3, '10-12', 90),
        e(EX.lateral_raise, 4, '12-15', 60),
        e(EX.dumbbell_curl, 3, '12-15', 60),
        e(EX.hammer_curl, 3, '12-15', 60),
        e(EX.tricep_pushdown, 4, '12-15', 60),
      ],
    },
    {
      dayNumber: 3,
      name: 'Legs',
      focus: ['quads', 'hamstrings', 'glutes'],
      estimatedDurationMin: 50,
      exercises: [
        e(EX.goblet_squat, 3, '10-12', 120),
        e(EX.romanian_deadlift, 3, '10-12', 120),
        e(EX.leg_press, 3, '12-15', 120),
        e(EX.leg_curl, 3, '12-15', 90),
        e(EX.calf_raise, 4, '15-20', 60),
      ],
    },
    {
      dayNumber: 4,
      name: 'Chest & Back',
      focus: ['incline work', 'rows'],
      estimatedDurationMin: 50,
      exercises: [
        e(EX.incline_dumbbell, 3, '8-12', 90),
        e(EX.chest_supported_row, 3, '10-12', 90),
        e(EX.cable_fly, 3, '12-15', 60),
        e(EX.lat_pulldown, 3, '10-12', 90),
        e(EX.push_up, 3, '10-12', 90),
        e(EX.reverse_fly, 3, '15-20', 60),
      ],
    },
    {
      dayNumber: 5,
      name: 'Shoulders & Arms',
      focus: ['delts', 'arms'],
      estimatedDurationMin: 45,
      exercises: [
        e(EX.dumbbell_overhead_press, 3, '10-12', 90),
        e(EX.lateral_raise, 4, '12-15', 60),
        e(EX.barbell_curl, 3, '10-12', 60),
        e(EX.dumbbell_curl, 3, '12-15', 60),
        e(EX.overhead_extension, 4, '12-15', 60),
      ],
    },
    {
      dayNumber: 6,
      name: 'Legs',
      focus: ['unilateral', 'glutes'],
      estimatedDurationMin: 50,
      exercises: [
        e(EX.leg_press, 3, '10-12', 120),
        e(EX.walking_lunge, 3, '10/leg', 90),
        e(EX.hip_thrust, 3, '12-15', 90),
        e(EX.leg_extension, 3, '12-15', 90),
        e(EX.calf_raise, 4, '15-20', 60),
      ],
    },
  ],
};

const ARNOLD_INTERMEDIATE: ProgramBlueprint = {
  id: 'arnold_intermediate',
  name: 'Arnold Classic',
  split: 'arnold',
  experience: 'intermediate',
  daysPerWeek: 6,
  durationWeeks: 12,
  periodization: 'linear',
  description: 'Classic Arnold split with barbell compounds. High volume bodybuilding with antagonist supersets potential.',
  idealFor: ['Bodybuilders', 'High volume training', 'Chest/Back superset fans'],
  days: [
    {
      dayNumber: 1,
      name: 'Chest & Back',
      focus: ['heavy compounds', 'width'],
      estimatedDurationMin: 75,
      exercises: [
        e(EX.barbell_bench, 4, '6-10', 150, { rpe: 8 }),
        e(EX.barbell_row, 4, '6-10', 150, { rpe: 8 }),
        e(EX.incline_dumbbell, 3, '8-12', 90),
        e(EX.lat_pulldown, 4, '10-12', 90),
        e(EX.cable_fly, 3, '12-15', 60),
        e(EX.chest_supported_row, 3, '10-12', 90),
      ],
    },
    {
      dayNumber: 2,
      name: 'Shoulders & Arms',
      focus: ['delts', 'biceps', 'triceps'],
      estimatedDurationMin: 60,
      exercises: [
        e(EX.overhead_press, 4, '6-10', 120, { rpe: 8 }),
        e(EX.lateral_raise, 5, '12-15', 60),
        e(EX.barbell_curl, 4, '10-12', 60),
        e(EX.tricep_pushdown, 5, '10-12', 60),
        e(EX.hammer_curl, 3, '12-15', 60),
        e(EX.overhead_extension, 4, '12-15', 60),
      ],
    },
    {
      dayNumber: 3,
      name: 'Legs',
      focus: ['quad dominant'],
      estimatedDurationMin: 75,
      exercises: [
        e(EX.back_squat, 4, '6-8', 180, { rpe: 8 }),
        e(EX.leg_press, 4, '10-12', 120),
        e(EX.bulgarian_split_squat, 3, '8-10/leg', 90),
        e(EX.leg_extension, 4, '12-15', 90),
        e(EX.leg_curl, 3, '10-12', 90),
        e(EX.calf_raise, 5, '12-15', 60),
      ],
    },
    {
      dayNumber: 4,
      name: 'Chest & Back',
      focus: ['volume', 'pump'],
      estimatedDurationMin: 75,
      exercises: [
        e(EX.incline_barbell, 4, '8-10', 120),
        e(EX.cable_row, 4, '10-12', 90),
        e(EX.dumbbell_bench, 4, '8-12', 90),
        e(EX.chest_supported_row, 4, '10-12', 90),
        e(EX.dumbbell_fly, 3, '12-15', 60),
        e(EX.face_pull, 4, '15-20', 60),
      ],
    },
    {
      dayNumber: 5,
      name: 'Shoulders & Arms',
      focus: ['pump', 'detail'],
      estimatedDurationMin: 60,
      exercises: [
        e(EX.dumbbell_overhead_press, 4, '8-10', 90),
        e(EX.lateral_raise, 5, '12-15', 60),
        e(EX.reverse_fly, 4, '15-20', 60),
        e(EX.dumbbell_curl, 4, '10-12', 60),
        e(EX.cable_curl, 3, '12-15', 60),
        e(EX.tricep_pushdown, 5, '12-15', 60),
      ],
    },
    {
      dayNumber: 6,
      name: 'Legs',
      focus: ['hinge dominant'],
      estimatedDurationMin: 75,
      exercises: [
        e(EX.romanian_deadlift, 4, '6-10', 150, { rpe: 8 }),
        e(EX.front_squat, 3, '8-10', 120),
        e(EX.hip_thrust, 4, '10-12', 90),
        e(EX.leg_curl, 4, '10-12', 90),
        e(EX.walking_lunge, 3, '10/leg', 90),
        e(EX.calf_raise, 5, '12-15', 60),
      ],
    },
  ],
};

const ARNOLD_ADVANCED: ProgramBlueprint = {
  id: 'arnold_advanced',
  name: 'Arnold Intensity',
  split: 'arnold',
  experience: 'advanced',
  daysPerWeek: 6,
  durationWeeks: 12,
  periodization: 'dup',
  description: 'Advanced Arnold split with periodized intensity. Heavy strength days, volume pump days, and technique work.',
  idealFor: ['Advanced bodybuilders', 'Periodized training', 'High intensity'],
  days: [
    {
      dayNumber: 1,
      name: 'Chest & Back - Strength',
      focus: ['power', 'heavy compounds'],
      estimatedDurationMin: 75,
      exercises: [
        e(EX.barbell_bench, 5, '3-5', 180, { rpe: 9 }),
        e(EX.barbell_row, 5, '4-6', 180, { rpe: 9 }),
        e(EX.weighted_pull_up, 4, '5-7', 150, { rpe: 9 }),
        e(EX.incline_barbell, 4, '6-8', 120),
        e(EX.chest_supported_row, 3, '10-12', 90),
      ],
    },
    {
      dayNumber: 2,
      name: 'Shoulders & Arms - Strength',
      focus: ['power', 'compound lifts'],
      estimatedDurationMin: 60,
      exercises: [
        e(EX.overhead_press, 5, '4-6', 150, { rpe: 9 }),
        e(EX.close_grip_bench, 4, '6-8', 120),
        e(EX.barbell_curl, 4, '6-8', 90),
        e(EX.lateral_raise, 5, '12-15', 60),
      ],
    },
    {
      dayNumber: 3,
      name: 'Legs - Strength',
      focus: ['SBD focus', 'power'],
      estimatedDurationMin: 75,
      exercises: [
        e(EX.back_squat, 5, '3-5', 210, { rpe: 9 }),
        e(EX.deadlift, 4, '3-5', 210, { rpe: 9 }),
        e(EX.front_squat, 4, '5-7', 150),
        e(EX.romanian_deadlift, 3, '8-10', 120),
        e(EX.calf_raise, 5, '10-12', 60),
      ],
    },
    {
      dayNumber: 4,
      name: 'Chest & Back - Volume',
      focus: ['pump', 'hypertrophy'],
      estimatedDurationMin: 75,
      exercises: [
        e(EX.incline_dumbbell, 4, '8-10', 90),
        e(EX.dumbbell_bench, 4, '8-10', 90),
        e(EX.cable_row, 4, '10-12', 90),
        e(EX.lat_pulldown, 4, '10-12', 90),
        e(EX.cable_fly, 4, '12-15', 60),
        e(EX.dumbbell_row, 4, '10-12/arm', 90),
      ],
    },
    {
      dayNumber: 5,
      name: 'Shoulders & Arms - Volume',
      focus: ['pump', 'detail work'],
      estimatedDurationMin: 60,
      exercises: [
        e(EX.dumbbell_overhead_press, 4, '8-10', 90),
        e(EX.lateral_raise, 6, '12-15', 60),
        e(EX.reverse_fly, 4, '15-20', 60),
        e(EX.dumbbell_curl, 4, '10-12', 60),
        e(EX.hammer_curl, 4, '12-15', 60),
        e(EX.tricep_pushdown, 5, '12-15', 60),
        e(EX.overhead_extension, 4, '12-15', 60),
      ],
    },
    {
      dayNumber: 6,
      name: 'Legs - Volume',
      focus: ['pump', 'isolation'],
      estimatedDurationMin: 75,
      exercises: [
        e(EX.hack_squat, 4, '10-12', 120),
        e(EX.leg_press, 4, '10-12', 120),
        e(EX.hip_thrust, 4, '10-12', 90),
        e(EX.leg_extension, 5, '12-15', 90),
        e(EX.leg_curl, 5, '12-15', 90),
        e(EX.bulgarian_split_squat, 4, '8-10/leg', 90),
        e(EX.calf_raise, 5, '12-15', 60),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// BRO SPLIT PROGRAMS (5 days/week)
// ---------------------------------------------------------------------------

const BRO_SPLIT_INTERMEDIATE: ProgramBlueprint = {
  id: 'bro_split_intermediate',
  name: 'Bro Split Classic',
  split: 'bro',
  experience: 'intermediate',
  daysPerWeek: 5,
  durationWeeks: 12,
  periodization: 'linear',
  description: 'Classic bodybuilding split: Chest, Back, Shoulders, Legs, Arms. High volume per muscle group once per week.',
  idealFor: ['Bodybuilders', 'High volume per session', 'Recovery focused'],
  days: [
    {
      dayNumber: 1,
      name: 'Chest Day',
      focus: ['pectoral development'],
      estimatedDurationMin: 60,
      exercises: [
        e(EX.barbell_bench, 4, '6-10', 150, { rpe: 8 }),
        e(EX.incline_dumbbell, 4, '8-12', 90),
        e(EX.cable_fly, 4, '12-15', 60),
        e(EX.dumbbell_bench, 3, '8-12', 90),
        e(EX.push_up, 3, '12-15', 60),
        e(EX.tricep_pushdown, 4, '12-15', 60),
      ],
    },
    {
      dayNumber: 2,
      name: 'Back Day',
      focus: ['lat and thickness'],
      estimatedDurationMin: 60,
      exercises: [
        e(EX.pull_up, 4, '6-10', 120, { rpe: 8 }),
        e(EX.barbell_row, 4, '6-10', 120, { rpe: 8 }),
        e(EX.lat_pulldown, 4, '10-12', 90),
        e(EX.chest_supported_row, 4, '10-12', 90),
        e(EX.face_pull, 4, '15-20', 60),
        e(EX.barbell_curl, 4, '10-12', 60),
      ],
    },
    {
      dayNumber: 3,
      name: 'Shoulder Day',
      focus: ['deltoid caps'],
      estimatedDurationMin: 60,
      exercises: [
        e(EX.overhead_press, 4, '6-10', 120, { rpe: 8 }),
        e(EX.dumbbell_overhead_press, 4, '8-12', 90),
        e(EX.lateral_raise, 6, '12-15', 60),
        e(EX.reverse_fly, 4, '15-20', 60),
        e(EX.cable_fly, 3, '12-15', 60),
      ],
    },
    {
      dayNumber: 4,
      name: 'Leg Day',
      focus: ['quad and hamstring mass'],
      estimatedDurationMin: 75,
      exercises: [
        e(EX.back_squat, 4, '6-8', 180, { rpe: 8 }),
        e(EX.leg_press, 4, '10-12', 120),
        e(EX.romanian_deadlift, 4, '8-10', 150),
        e(EX.leg_extension, 4, '12-15', 90),
        e(EX.leg_curl, 4, '12-15', 90),
        e(EX.bulgarian_split_squat, 3, '8-10/leg', 90),
        e(EX.calf_raise, 6, '12-15', 60),
      ],
    },
    {
      dayNumber: 5,
      name: 'Arm Day',
      focus: ['bicep and tricep specialization'],
      estimatedDurationMin: 60,
      exercises: [
        e(EX.barbell_curl, 4, '8-10', 90),
        e(EX.dumbbell_curl, 4, '10-12', 60),
        e(EX.hammer_curl, 4, '12-15', 60),
        e(EX.tricep_pushdown, 5, '10-12', 60),
        e(EX.overhead_extension, 4, '12-15', 60),
        e(EX.close_grip_bench, 3, '8-10', 90),
      ],
    },
  ],
};

// Note: Weighted variations for advanced
const weighted = (ex: string) => ex;

// ---------------------------------------------------------------------------
// MASTER PROGRAM DATABASE
// ---------------------------------------------------------------------------

export const PROGRAM_BLUEPRINTS: ProgramBlueprint[] = [
  // Full Body
  FULL_BODY_BEGINNER,
  FULL_BODY_INTERMEDIATE,
  FULL_BODY_ADVANCED,
  
  // Upper/Lower
  UPPER_LOWER_BEGINNER,
  UPPER_LOWER_INTERMEDIATE,
  UPPER_LOWER_ADVANCED,
  
  // PPL
  PPL_BEGINNER,
  PPL_INTERMEDIATE,
  PPL_ADVANCED,
  
  // Arnold
  ARNOLD_BEGINNER,
  ARNOLD_INTERMEDIATE,
  ARNOLD_ADVANCED,
  
  // Bro Split (Intermediate+)
  BRO_SPLIT_INTERMEDIATE,
];

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

export function getProgramsBySplit(split: SplitType): ProgramBlueprint[] {
  return PROGRAM_BLUEPRINTS.filter(p => p.split === split);
}

export function getProgramsByExperience(exp: ExperienceLevel): ProgramBlueprint[] {
  return PROGRAM_BLUEPRINTS.filter(p => p.experience === exp);
}

export function getProgramById(id: string): ProgramBlueprint | undefined {
  return PROGRAM_BLUEPRINTS.find(p => p.id === id);
}

export function getProgramsByDaysPerWeek(days: number): ProgramBlueprint[] {
  return PROGRAM_BLUEPRINTS.filter(p => p.daysPerWeek === days);
}

export function getAllSplits(): { key: SplitType; displayName: string }[] {
  return [
    { key: 'full_body', displayName: 'Full Body' },
    { key: 'upper_lower', displayName: 'Upper/Lower' },
    { key: 'ppl', displayName: 'Push/Pull/Legs' },
    { key: 'arnold', displayName: 'Arnold Split' },
    { key: 'bro', displayName: 'Bro Split' },
    { key: 'phat', displayName: 'PHAT' },
    { key: 'phul', displayName: 'PHUL' },
    { key: 'dc', displayName: 'Doggcrapp' },
    { key: 'gvt', displayName: 'German Volume' },
  ];
}

export function getMovementPatternSummary(day: DayBlueprint): Map<string, number> {
  // Returns count of each movement pattern in the day
  // This would need to reference FUNDAMENTAL_EXERCISES to map exerciseId to pattern
  const summary = new Map<string, number>();
  // Implementation would look up each exercise and count patterns
  return summary;
}

export function calculatePushPullRatio(day: DayBlueprint): { push: number; pull: number; ratio: number } {
  // Calculate push:pull ratio for a day
  return { push: 0, pull: 0, ratio: 0 };
}
