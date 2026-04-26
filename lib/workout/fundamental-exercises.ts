/**
 * fundamental-exercises.ts
 * 
 * Strict exercise database for program generation.
 * Only fundamental, high-ROI exercises allowed.
 * No redundant variations - max 1-2 per movement pattern.
 */

import type { PatternSlot } from './exerciseClassification.ts';
import type { ExperienceLevel } from './training-profile.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight';

export type ExerciseComplexity = 'foundational' | 'intermediate' | 'advanced';

export interface FundamentalExercise {
  id: string;
  name: string;
  pattern: PatternSlot;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: Equipment[];
  complexity: ExerciseComplexity;
  unilateral: boolean;
  coachingCue: string;
  // Programmatic rules
  maxPerSession: number;
  // Experience-appropriate variations
  beginnerVariation?: string;
  advancedVariation?: string;
}

// ---------------------------------------------------------------------------
// Squat Pattern Exercises
// ---------------------------------------------------------------------------

const SQUAT_EXERCISES: FundamentalExercise[] = [
  {
    id: 'back_squat',
    name: 'Back Squat',
    pattern: 'compound_squat',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings', 'core', 'lower_back'],
    equipment: ['barbell'],
    complexity: 'intermediate',
    unilateral: false,
    coachingCue: 'Brace core, drive through mid-foot, keep chest up',
    maxPerSession: 1,
    beginnerVariation: 'Goblet Squat',
  },
  {
    id: 'front_squat',
    name: 'Front Squat',
    pattern: 'compound_squat',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['upper_back', 'core'],
    equipment: ['barbell'],
    complexity: 'advanced',
    unilateral: false,
    coachingCue: 'Elbows high, torso upright, knees track over toes',
    maxPerSession: 1,
  },
  {
    id: 'goblet_squat',
    name: 'Goblet Squat',
    pattern: 'compound_squat',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['core'],
    equipment: ['dumbbell'],
    complexity: 'foundational',
    unilateral: false,
    coachingCue: 'Hold weight at chest, squat between legs, keep torso upright',
    maxPerSession: 1,
    advancedVariation: 'Back Squat',
  },
  {
    id: 'leg_press',
    name: 'Leg Press',
    pattern: 'compound_squat',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings'],
    equipment: ['machine'],
    complexity: 'foundational',
    unilateral: false,
    coachingCue: 'Full range of motion, don\'t lock knees at top',
    maxPerSession: 1,
  },
  {
    id: 'hack_squat',
    name: 'Hack Squat',
    pattern: 'compound_squat',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings'],
    equipment: ['machine'],
    complexity: 'intermediate',
    unilateral: false,
    coachingCue: 'Shoulders back against pad, full depth, controlled tempo',
    maxPerSession: 1,
  },
];

// ---------------------------------------------------------------------------
// Hinge Pattern Exercises
// ---------------------------------------------------------------------------

const HINGE_EXERCISES: FundamentalExercise[] = [
  {
    id: 'deadlift',
    name: 'Deadlift',
    pattern: 'compound_hinge',
    primaryMuscles: ['hamstrings', 'glutes', 'lower_back'],
    secondaryMuscles: ['traps', 'lats', 'forearms'],
    equipment: ['barbell'],
    complexity: 'intermediate',
    unilateral: false,
    coachingCue: 'Hinge at hips, keep bar close, drive through heels',
    maxPerSession: 1,
  },
  {
    id: 'romanian_deadlift',
    name: 'Romanian Deadlift',
    pattern: 'compound_hinge',
    primaryMuscles: ['hamstrings', 'glutes'],
    secondaryMuscles: ['lower_back', 'traps'],
    equipment: ['barbell', 'dumbbell'],
    complexity: 'intermediate',
    unilateral: false,
    coachingCue: 'Soft knee bend, push hips back, feel hamstring stretch',
    maxPerSession: 1,
  },
  {
    id: 'hip_thrust',
    name: 'Hip Thrust',
    pattern: 'hip_thrust',
    primaryMuscles: ['glutes'],
    secondaryMuscles: ['hamstrings', 'core'],
    equipment: ['barbell', 'machine'],
    complexity: 'foundational',
    unilateral: false,
    coachingCue: 'Chin tucked, drive through heels, squeeze glutes at top',
    maxPerSession: 1,
  },
];

// ---------------------------------------------------------------------------
// Single Leg Exercises
// ---------------------------------------------------------------------------

const SINGLE_LEG_EXERCISES: FundamentalExercise[] = [
  {
    id: 'bulgarian_split_squat',
    name: 'Bulgarian Split Squat',
    pattern: 'single_leg',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings', 'core'],
    equipment: ['dumbbell', 'barbell'],
    complexity: 'intermediate',
    unilateral: true,
    coachingCue: 'Torso slightly forward, knee tracks over toes, full depth',
    maxPerSession: 1,
  },
  {
    id: 'walking_lunge',
    name: 'Walking Lunge',
    pattern: 'single_leg',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings', 'calves'],
    equipment: ['dumbbell'],
    complexity: 'foundational',
    unilateral: true,
    coachingCue: 'Step forward, back knee toward ground, drive through front heel',
    maxPerSession: 1,
  },
  {
    id: 'leg_extension',
    name: 'Leg Extension',
    pattern: 'leg_extension',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: [],
    equipment: ['machine'],
    complexity: 'foundational',
    unilateral: false,
    coachingCue: 'Controlled tempo, squeeze at top, don\'t hyperextend knees',
    maxPerSession: 1,
  },
  {
    id: 'leg_curl',
    name: 'Leg Curl',
    pattern: 'leg_curl',
    primaryMuscles: ['hamstrings'],
    secondaryMuscles: [],
    equipment: ['machine'],
    complexity: 'foundational',
    unilateral: false,
    coachingCue: 'Keep hips down, squeeze hamstrings, control the negative',
    maxPerSession: 1,
  },
  {
    id: 'calf_raise',
    name: 'Calf Raise',
    pattern: 'calf',
    primaryMuscles: ['calves'],
    secondaryMuscles: [],
    equipment: ['machine', 'dumbbell', 'bodyweight'],
    complexity: 'foundational',
    unilateral: false,
    coachingCue: 'Full range of motion, pause at stretch and contraction',
    maxPerSession: 2,
  },
];

// ---------------------------------------------------------------------------
// Horizontal Push Exercises
// ---------------------------------------------------------------------------

const HORIZONTAL_PUSH_EXERCISES: FundamentalExercise[] = [
  {
    id: 'barbell_bench_press',
    name: 'Barbell Bench Press',
    pattern: 'horizontal_push',
    primaryMuscles: ['chest', 'front_delts'],
    secondaryMuscles: ['triceps'],
    equipment: ['barbell'],
    complexity: 'intermediate',
    unilateral: false,
    coachingCue: 'Retract shoulder blades, touch chest, drive feet into floor',
    maxPerSession: 1,
  },
  {
    id: 'dumbbell_bench_press',
    name: 'Dumbbell Bench Press',
    pattern: 'horizontal_push',
    primaryMuscles: ['chest', 'front_delts'],
    secondaryMuscles: ['triceps'],
    equipment: ['dumbbell'],
    complexity: 'foundational',
    unilateral: false,
    coachingCue: 'Natural grip path, stretch at bottom, squeeze at top',
    maxPerSession: 1,
  },
  {
    id: 'incline_barbell_press',
    name: 'Incline Barbell Press',
    pattern: 'horizontal_push',
    primaryMuscles: ['upper_chest', 'front_delts'],
    secondaryMuscles: ['triceps'],
    equipment: ['barbell'],
    complexity: 'intermediate',
    unilateral: false,
    coachingCue: '30-45° incline, touch upper chest, controlled eccentric',
    maxPerSession: 1,
  },
  {
    id: 'incline_dumbbell_press',
    name: 'Incline Dumbbell Press',
    pattern: 'horizontal_push',
    primaryMuscles: ['upper_chest', 'front_delts'],
    secondaryMuscles: ['triceps'],
    equipment: ['dumbbell'],
    complexity: 'intermediate',
    unilateral: false,
    coachingCue: 'Dumbbells to sides of chest, greater range than barbell',
    maxPerSession: 1,
  },
  {
    id: 'push_up',
    name: 'Push-Up',
    pattern: 'horizontal_push',
    primaryMuscles: ['chest', 'front_delts'],
    secondaryMuscles: ['triceps', 'core'],
    equipment: ['bodyweight'],
    complexity: 'foundational',
    unilateral: false,
    coachingCue: 'Body straight line, chest to floor, full range of motion',
    maxPerSession: 1,
    advancedVariation: 'Weighted Push-Up or Dip',
  },
];

// ---------------------------------------------------------------------------
// Horizontal Pull Exercises
// ---------------------------------------------------------------------------

const HORIZONTAL_PULL_EXERCISES: FundamentalExercise[] = [
  {
    id: 'barbell_row',
    name: 'Barbell Row',
    pattern: 'horizontal_pull',
    primaryMuscles: ['lats', 'rhomboids', 'traps'],
    secondaryMuscles: ['biceps', 'lower_back'],
    equipment: ['barbell'],
    complexity: 'intermediate',
    unilateral: false,
    coachingCue: 'Hinge position, pull to lower chest, squeeze shoulder blades',
    maxPerSession: 1,
  },
  {
    id: 'dumbbell_row',
    name: 'Dumbbell Row',
    pattern: 'horizontal_pull',
    primaryMuscles: ['lats', 'rhomboids'],
    secondaryMuscles: ['biceps', 'rear_delts'],
    equipment: ['dumbbell'],
    complexity: 'foundational',
    unilateral: true,
    coachingCue: 'Support with hand, pull to hip, squeeze lat at top',
    maxPerSession: 1,
  },
  {
    id: 'cable_row',
    name: 'Cable Row',
    pattern: 'horizontal_pull',
    primaryMuscles: ['lats', 'rhomboids', 'traps'],
    secondaryMuscles: ['biceps'],
    equipment: ['cable'],
    complexity: 'foundational',
    unilateral: false,
    coachingCue: 'Sit tall, pull to mid-torso, squeeze shoulder blades together',
    maxPerSession: 1,
  },
  {
    id: 'chest_supported_row',
    name: 'Chest-Supported Row',
    pattern: 'horizontal_pull',
    primaryMuscles: ['lats', 'rhomboids'],
    secondaryMuscles: ['biceps', 'rear_delts'],
    equipment: ['machine', 'dumbbell'],
    complexity: 'foundational',
    unilateral: false,
    coachingCue: 'Chest against pad, eliminate momentum, squeeze back muscles',
    maxPerSession: 1,
  },
];

// ---------------------------------------------------------------------------
// Vertical Push Exercises
// ---------------------------------------------------------------------------

const VERTICAL_PUSH_EXERCISES: FundamentalExercise[] = [
  {
    id: 'overhead_press',
    name: 'Overhead Press',
    pattern: 'vertical_push',
    primaryMuscles: ['front_delts', 'side_delts'],
    secondaryMuscles: ['triceps', 'core'],
    equipment: ['barbell'],
    complexity: 'intermediate',
    unilateral: false,
    coachingCue: 'Brace core, press in straight line, head through at top',
    maxPerSession: 1,
  },
  {
    id: 'dumbbell_overhead_press',
    name: 'Dumbbell Overhead Press',
    pattern: 'vertical_push',
    primaryMuscles: ['front_delts', 'side_delts'],
    secondaryMuscles: ['triceps'],
    equipment: ['dumbbell'],
    complexity: 'foundational',
    unilateral: false,
    coachingCue: 'Neutral grip at bottom, rotate to pronated at top',
    maxPerSession: 1,
  },
];

// ---------------------------------------------------------------------------
// Vertical Pull Exercises
// ---------------------------------------------------------------------------

const VERTICAL_PULL_EXERCISES: FundamentalExercise[] = [
  {
    id: 'pull_up',
    name: 'Pull-Up',
    pattern: 'vertical_pull',
    primaryMuscles: ['lats', 'biceps'],
    secondaryMuscles: ['rhomboids', 'traps'],
    equipment: ['bodyweight'],
    complexity: 'intermediate',
    unilateral: false,
    coachingCue: 'Start from dead hang, pull chest to bar, controlled descent',
    maxPerSession: 1,
    beginnerVariation: 'Lat Pulldown or Assisted Pull-Up',
  },
  {
    id: 'chin_up',
    name: 'Chin-Up',
    pattern: 'vertical_pull',
    primaryMuscles: ['lats', 'biceps'],
    secondaryMuscles: ['rhomboids'],
    equipment: ['bodyweight'],
    complexity: 'intermediate',
    unilateral: false,
    coachingCue: 'Supinated grip, more bicep emphasis than pull-up',
    maxPerSession: 1,
  },
  {
    id: 'lat_pulldown',
    name: 'Lat Pulldown',
    pattern: 'vertical_pull',
    primaryMuscles: ['lats', 'biceps'],
    secondaryMuscles: ['rhomboids'],
    equipment: ['machine', 'cable'],
    complexity: 'foundational',
    unilateral: false,
    coachingCue: 'Lean back slightly, pull to upper chest, squeeze lats',
    maxPerSession: 1,
  },
];

// ---------------------------------------------------------------------------
// Chest Accessory Exercises
// ---------------------------------------------------------------------------

const CHEST_ACCESSORY_EXERCISES: FundamentalExercise[] = [
  {
    id: 'cable_fly',
    name: 'Cable Fly',
    pattern: 'chest_fly',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['front_delts'],
    equipment: ['cable'],
    complexity: 'intermediate',
    unilateral: false,
    coachingCue: 'Slight bend in elbows, arc motion, squeeze at contraction',
    maxPerSession: 1,
  },
  {
    id: 'dumbbell_fly',
    name: 'Dumbbell Fly',
    pattern: 'chest_fly',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['front_delts'],
    equipment: ['dumbbell'],
    complexity: 'intermediate',
    unilateral: false,
    coachingCue: 'Soft elbows, deep stretch, hug a barrel motion',
    maxPerSession: 1,
  },
];

// ---------------------------------------------------------------------------
// Shoulder Accessory Exercises
// ---------------------------------------------------------------------------

const SHOULDER_ACCESSORY_EXERCISES: FundamentalExercise[] = [
  {
    id: 'lateral_raise',
    name: 'Lateral Raise',
    pattern: 'shoulder_raise',
    primaryMuscles: ['side_delts'],
    secondaryMuscles: ['traps'],
    equipment: ['dumbbell', 'cable'],
    complexity: 'foundational',
    unilateral: false,
    coachingCue: 'Slight forward lean, lead with elbows, control the negative',
    maxPerSession: 1,
  },
  {
    id: 'face_pull',
    name: 'Face Pull',
    pattern: 'rear_delt',
    primaryMuscles: ['rear_delts', 'rhomboids'],
    secondaryMuscles: ['traps'],
    equipment: ['cable'],
    complexity: 'foundational',
    unilateral: false,
    coachingCue: 'Pull to face level, external rotation at end, squeeze rear delts',
    maxPerSession: 1,
  },
  {
    id: 'reverse_fly',
    name: 'Reverse Fly',
    pattern: 'rear_delt',
    primaryMuscles: ['rear_delts'],
    secondaryMuscles: ['traps', 'rhomboids'],
    equipment: ['dumbbell', 'machine'],
    complexity: 'foundational',
    unilateral: false,
    coachingCue: 'Bent over position, soft elbows, squeeze rear delts',
    maxPerSession: 1,
  },
];

// ---------------------------------------------------------------------------
// Arm Exercises
// ---------------------------------------------------------------------------

const ARM_EXERCISES: FundamentalExercise[] = [
  {
    id: 'barbell_curl',
    name: 'Barbell Curl',
    pattern: 'bicep_curl',
    primaryMuscles: ['biceps'],
    secondaryMuscles: ['forearms'],
    equipment: ['barbell'],
    complexity: 'foundational',
    unilateral: false,
    coachingCue: 'Elbows fixed at sides, full range, no swinging',
    maxPerSession: 1,
  },
  {
    id: 'dumbbell_curl',
    name: 'Dumbbell Curl',
    pattern: 'bicep_curl',
    primaryMuscles: ['biceps'],
    secondaryMuscles: ['forearms'],
    equipment: ['dumbbell'],
    complexity: 'foundational',
    unilateral: false,
    coachingCue: 'Supinated grip, rotate outward at top, squeeze biceps',
    maxPerSession: 1,
  },
  {
    id: 'hammer_curl',
    name: 'Hammer Curl',
    pattern: 'bicep_curl',
    primaryMuscles: ['biceps', 'brachialis'],
    secondaryMuscles: ['forearms'],
    equipment: ['dumbbell'],
    complexity: 'foundational',
    unilateral: false,
    coachingCue: 'Neutral grip, targets brachialis and forearms more',
    maxPerSession: 1,
  },
  {
    id: 'tricep_pushdown',
    name: 'Tricep Pushdown',
    pattern: 'tricep_ext',
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
    equipment: ['cable'],
    complexity: 'foundational',
    unilateral: false,
    coachingCue: 'Elbows locked at sides, full extension, controlled return',
    maxPerSession: 1,
  },
  {
    id: 'overhead_extension',
    name: 'Overhead Tricep Extension',
    pattern: 'tricep_ext',
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
    equipment: ['dumbbell', 'cable'],
    complexity: 'foundational',
    unilateral: false,
    coachingCue: 'Elbows pointing up, lower weight behind head, extend fully',
    maxPerSession: 1,
  },
  {
    id: 'close_grip_bench',
    name: 'Close-Grip Bench Press',
    pattern: 'tricep_ext',
    primaryMuscles: ['triceps'],
    secondaryMuscles: ['chest', 'front_delts'],
    equipment: ['barbell'],
    complexity: 'intermediate',
    unilateral: false,
    coachingCue: 'Shoulder-width grip, keep elbows tucked, press through triceps',
    maxPerSession: 1,
  },
];

// ---------------------------------------------------------------------------
// Core Exercises
// ---------------------------------------------------------------------------

const CORE_EXERCISES: FundamentalExercise[] = [
  {
    id: 'plank',
    name: 'Plank',
    pattern: 'core',
    primaryMuscles: ['core', 'transverse_abdominis'],
    secondaryMuscles: ['shoulders'],
    equipment: ['bodyweight'],
    complexity: 'foundational',
    unilateral: false,
    coachingCue: 'Body straight line, brace abs, breathe normally',
    maxPerSession: 1,
  },
  {
    id: 'dead_bug',
    name: 'Dead Bug',
    pattern: 'core',
    primaryMuscles: ['core', 'transverse_abdominis'],
    secondaryMuscles: [],
    equipment: ['bodyweight'],
    complexity: 'foundational',
    unilateral: true,
    coachingCue: 'Lower back pressed to floor, opposite arm/leg extend',
    maxPerSession: 1,
  },
  {
    id: 'pallof_press',
    name: 'Pallof Press',
    pattern: 'core',
    primaryMuscles: ['obliques', 'core'],
    secondaryMuscles: [],
    equipment: ['cable'],
    complexity: 'foundational',
    unilateral: true,
    coachingCue: 'Resist rotation, press straight out, maintain posture',
    maxPerSession: 1,
  },
  {
    id: 'ab_wheel',
    name: 'Ab Wheel Rollout',
    pattern: 'core',
    primaryMuscles: ['core', 'transverse_abdominis'],
    secondaryMuscles: ['lats'],
    equipment: ['bodyweight'],
    complexity: 'intermediate',
    unilateral: false,
    coachingCue: 'Don\'t let lower back arch, controlled rollout and return',
    maxPerSession: 1,
  },
  {
    id: 'hanging_leg_raise',
    name: 'Hanging Leg Raise',
    pattern: 'core',
    primaryMuscles: ['core', 'hip_flexors'],
    secondaryMuscles: [],
    equipment: ['bodyweight'],
    complexity: 'intermediate',
    unilateral: false,
    coachingCue: 'Control swinging, lift legs to at least parallel',
    maxPerSession: 1,
  },
];

// ---------------------------------------------------------------------------
// Master Exercise Database
// ---------------------------------------------------------------------------

export const FUNDAMENTAL_EXERCISES: FundamentalExercise[] = [
  ...SQUAT_EXERCISES,
  ...HINGE_EXERCISES,
  ...SINGLE_LEG_EXERCISES,
  ...HORIZONTAL_PUSH_EXERCISES,
  ...HORIZONTAL_PULL_EXERCISES,
  ...VERTICAL_PUSH_EXERCISES,
  ...VERTICAL_PULL_EXERCISES,
  ...CHEST_ACCESSORY_EXERCISES,
  ...SHOULDER_ACCESSORY_EXERCISES,
  ...ARM_EXERCISES,
  ...CORE_EXERCISES,
];

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

export function getExercisesByPattern(pattern: PatternSlot): FundamentalExercise[] {
  return FUNDAMENTAL_EXERCISES.filter(e => e.pattern === pattern);
}

export function getExercisesByComplexity(maxComplexity: ExerciseComplexity): FundamentalExercise[] {
  const complexityOrder = ['foundational', 'intermediate', 'advanced'];
  const maxIndex = complexityOrder.indexOf(maxComplexity);
  return FUNDAMENTAL_EXERCISES.filter(e => 
    complexityOrder.indexOf(e.complexity) <= maxIndex
  );
}

export function getExperienceAppropriateExercise(
  exerciseId: string,
  experience: ExperienceLevel
): FundamentalExercise | null {
  const exercise = FUNDAMENTAL_EXERCISES.find(e => e.id === exerciseId);
  if (!exercise) return null;
  
  // If beginner and has beginner variation, return that instead
  if (experience === 'beginner' && exercise.beginnerVariation) {
    return FUNDAMENTAL_EXERCISES.find(e => e.name === exercise.beginnerVariation) || exercise;
  }
  
  return exercise;
}

export function getExercisesForProgram(
  patterns: PatternSlot[],
  experience: ExperienceLevel,
  maxPerPattern: number = 1
): Map<PatternSlot, FundamentalExercise[]> {
  const result = new Map<PatternSlot, FundamentalExercise[]>();
  
  for (const pattern of patterns) {
    const exercises = getExercisesByPattern(pattern)
      .filter(e => {
        // Filter by complexity based on experience
        if (experience === 'beginner') return e.complexity === 'foundational';
        if (experience === 'intermediate') return ['foundational', 'intermediate'].includes(e.complexity);
        return true; // advanced gets all
      });
    
    result.set(pattern, exercises.slice(0, maxPerPattern));
  }
  
  return result;
}

// ---------------------------------------------------------------------------
// Program Builder Rules
// ---------------------------------------------------------------------------

export interface SessionRules {
  maxHorizontalPush: number;
  maxHorizontalPull: number;
  maxVerticalPush: number;
  maxVerticalPull: number;
  maxSquat: number;
  maxHinge: number;
  requiresUnilateral: boolean;
  requiresCore: boolean;
  minPushPullRatio: number; // 1 = 1:1, 0.5 = 2:1 acceptable
}

export const DEFAULT_SESSION_RULES: SessionRules = {
  maxHorizontalPush: 1,
  maxHorizontalPull: 1,
  maxVerticalPush: 1,
  maxVerticalPull: 1,
  maxSquat: 1,
  maxHinge: 1,
  requiresUnilateral: true,
  requiresCore: true,
  minPushPullRatio: 0.8, // At least 0.8:1 pull to push (slight pull emphasis OK)
};

export function validateSessionBalance(
  exercises: FundamentalExercise[],
  rules: SessionRules = DEFAULT_SESSION_RULES
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Count patterns
  const counts = {
    horizontal_push: 0,
    horizontal_pull: 0,
    vertical_push: 0,
    vertical_pull: 0,
    compound_squat: 0,
    compound_hinge: 0,
  };
  
  for (const ex of exercises) {
    if (counts[ex.pattern as keyof typeof counts] !== undefined) {
      counts[ex.pattern as keyof typeof counts]++;
    }
  }
  
  // Check limits
  if (counts.horizontal_push > rules.maxHorizontalPush) {
    errors.push(`Too many horizontal pushes: ${counts.horizontal_push} (max ${rules.maxHorizontalPush})`);
  }
  if (counts.horizontal_pull > rules.maxHorizontalPull) {
    errors.push(`Too many horizontal pulls: ${counts.horizontal_pull} (max ${rules.maxHorizontalPull})`);
  }
  if (counts.vertical_push > rules.maxVerticalPush) {
    errors.push(`Too many vertical pushes: ${counts.vertical_push} (max ${rules.maxVerticalPush})`);
  }
  if (counts.vertical_pull > rules.maxVerticalPull) {
    errors.push(`Too many vertical pulls: ${counts.vertical_pull} (max ${rules.maxVerticalPull})`);
  }
  if (counts.compound_squat > rules.maxSquat) {
    errors.push(`Too many squat patterns: ${counts.compound_squat} (max ${rules.maxSquat})`);
  }
  if (counts.compound_hinge > rules.maxHinge) {
    errors.push(`Too many hinge patterns: ${counts.compound_hinge} (max ${rules.maxHinge})`);
  }
  
  // Check push:pull ratio
  const totalPush = counts.horizontal_push + counts.vertical_push;
  const totalPull = counts.horizontal_pull + counts.vertical_pull;
  if (totalPush > 0 && totalPull / totalPush < rules.minPushPullRatio) {
    errors.push(`Push:Pull ratio imbalanced: ${totalPush}:${totalPull} (need at least ${rules.minPushPullRatio}:1)`);
  }
  
  // Check unilateral
  if (rules.requiresUnilateral && !exercises.some(e => e.unilateral)) {
    errors.push('Session requires at least one unilateral exercise');
  }
  
  // Check core
  if (rules.requiresCore && !exercises.some(e => e.pattern === 'core')) {
    errors.push('Session requires at least one core exercise');
  }
  
  return { valid: errors.length === 0, errors };
}
