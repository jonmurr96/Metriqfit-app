/**
 * exercise-complexity.ts
 *
 * Exercise Complexity Classification System
 * Part of Phase 1: Foundation
 *
 * Categorizes exercises by technical difficulty and learning curve.
 * Used to filter exercises appropriate for user's experience level.
 */

import type { EquipmentAccess } from './training-profile.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExerciseComplexity = 'foundational' | 'intermediate' | 'advanced';

export type ComplexityMetadata = {
  complexity: ExerciseComplexity;
  learningCurve: 'fast' | 'moderate' | 'slow';
  injuryRisk: 'low' | 'moderate' | 'high';
  requiresSpotter: boolean;
  setupDifficulty: 'easy' | 'moderate' | 'hard';
  motorControlDemand: 'low' | 'moderate' | 'high' | 'very high';
};

// ---------------------------------------------------------------------------
// Complexity Rules by Experience Level
// ---------------------------------------------------------------------------

export const COMPLEXITY_RULES: Record<
  string,
  { allowed: ExerciseComplexity[]; rationale: string }
> = {
  beginner: {
    allowed: ['foundational'],
    rationale:
      'Beginners need exercises with predictable movement patterns to master technique before adding complexity',
  },
  intermediate: {
    allowed: ['foundational', 'intermediate'],
    rationale:
      'Intermediates can handle more complex movements but should still prioritize fundamentals',
  },
  advanced: {
    allowed: ['foundational', 'intermediate', 'advanced'],
    rationale:
      'Advanced trainees have the motor control and body awareness for complex movements',
  },
};

// ---------------------------------------------------------------------------
// Exercise Complexity Database
// ---------------------------------------------------------------------------

export const EXERCISE_COMPLEXITY_MAP: Record<string, ComplexityMetadata> = {
  // ==================== FOUNDATIONAL (Everyone) ====================

  // Compound Lower
  'Barbell Squat': {
    complexity: 'foundational',
    learningCurve: 'moderate',
    injuryRisk: 'moderate',
    requiresSpotter: true,
    setupDifficulty: 'easy',
    motorControlDemand: 'moderate',
  },
  'Goblet Squat': {
    complexity: 'foundational',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'low',
  },
  'Leg Press': {
    complexity: 'foundational',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'low',
  },
  'Barbell Deadlift': {
    complexity: 'foundational',
    learningCurve: 'moderate',
    injuryRisk: 'moderate',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'moderate',
  },
  'Trap Bar Deadlift': {
    complexity: 'foundational',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'low',
  },
  'Romanian Deadlift': {
    complexity: 'foundational',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'moderate',
  },
  'Leg Curl': {
    complexity: 'foundational',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'low',
  },
  'Leg Extension': {
    complexity: 'foundational',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'low',
  },

  // Compound Upper - Push
  'Barbell Bench Press': {
    complexity: 'foundational',
    learningCurve: 'moderate',
    injuryRisk: 'moderate',
    requiresSpotter: true,
    setupDifficulty: 'easy',
    motorControlDemand: 'moderate',
  },
  'Dumbbell Bench Press': {
    complexity: 'foundational',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'moderate',
  },
  'Overhead Press': {
    complexity: 'foundational',
    learningCurve: 'moderate',
    injuryRisk: 'moderate',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'moderate',
  },
  'Dumbbell Overhead Press': {
    complexity: 'foundational',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'moderate',
  },

  // Compound Upper - Pull
  'Lat Pulldown': {
    complexity: 'foundational',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'low',
  },
  'Cable Row': {
    complexity: 'foundational',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'low',
  },
  'Dumbbell Row': {
    complexity: 'foundational',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'moderate',
  },
  'Barbell Row': {
    complexity: 'foundational',
    learningCurve: 'moderate',
    injuryRisk: 'moderate',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'moderate',
  },

  // Isolation
  'Dumbbell Curl': {
    complexity: 'foundational',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'low',
  },
  'Barbell Curl': {
    complexity: 'foundational',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'low',
  },
  'Tricep Pushdown': {
    complexity: 'foundational',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'low',
  },
  'Lateral Raise': {
    complexity: 'foundational',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'low',
  },
  'Calf Raise': {
    complexity: 'foundational',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'low',
  },
  'Face Pull': {
    complexity: 'foundational',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'low',
  },

  // Core
  'Plank': {
    complexity: 'foundational',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'low',
  },
  'Dead Bug': {
    complexity: 'foundational',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'moderate',
  },
  'Cable Crunch': {
    complexity: 'foundational',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'low',
  },

  // ==================== INTERMEDIATE ====================

  // Compound Lower
  'Bulgarian Split Squat': {
    complexity: 'intermediate',
    learningCurve: 'moderate',
    injuryRisk: 'moderate',
    requiresSpotter: false,
    setupDifficulty: 'moderate',
    motorControlDemand: 'high',
  },
  'Hip Thrust': {
    complexity: 'intermediate',
    learningCurve: 'moderate',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'moderate',
    motorControlDemand: 'moderate',
  },
  'Split Squat': {
    complexity: 'intermediate',
    learningCurve: 'moderate',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'moderate',
  },
  'Reverse Lunge': {
    complexity: 'intermediate',
    learningCurve: 'moderate',
    injuryRisk: 'moderate',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'moderate',
  },
  'Good Morning': {
    complexity: 'intermediate',
    learningCurve: 'moderate',
    injuryRisk: 'moderate',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'moderate',
  },
  'Leg Press (Narrow)': {
    complexity: 'intermediate',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'moderate',
  },

  // Compound Upper
  'Incline Dumbbell Press': {
    complexity: 'intermediate',
    learningCurve: 'moderate',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'moderate',
  },
  'Incline Barbell Press': {
    complexity: 'intermediate',
    learningCurve: 'moderate',
    injuryRisk: 'moderate',
    requiresSpotter: true,
    setupDifficulty: 'moderate',
    motorControlDemand: 'moderate',
  },
  'Dips': {
    complexity: 'intermediate',
    learningCurve: 'moderate',
    injuryRisk: 'moderate',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'moderate',
  },
  'Pull-ups': {
    complexity: 'intermediate',
    learningCurve: 'moderate',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'high',
  },
  'Seated Cable Row (Wide)': {
    complexity: 'intermediate',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'moderate',
  },

  // Isolation
  'Incline Dumbbell Curl': {
    complexity: 'intermediate',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'low',
  },
  'Skullcrushers': {
    complexity: 'intermediate',
    learningCurve: 'moderate',
    injuryRisk: 'moderate',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'moderate',
  },
  'Cable Fly': {
    complexity: 'intermediate',
    learningCurve: 'moderate',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'moderate',
    motorControlDemand: 'moderate',
  },
  'Rear Delt Fly': {
    complexity: 'intermediate',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'low',
  },
  'Pec Deck': {
    complexity: 'intermediate',
    learningCurve: 'fast',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'low',
  },

  // Core
  'Hanging Leg Raise': {
    complexity: 'intermediate',
    learningCurve: 'moderate',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'moderate',
  },
  'Ab Wheel Rollout': {
    complexity: 'intermediate',
    learningCurve: 'moderate',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'high',
  },
  'Pallof Press': {
    complexity: 'intermediate',
    learningCurve: 'moderate',
    injuryRisk: 'low',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'moderate',
  },

  // ==================== ADVANCED ====================

  // Compound Lower
  'Front Squat': {
    complexity: 'advanced',
    learningCurve: 'slow',
    injuryRisk: 'moderate',
    requiresSpotter: true,
    setupDifficulty: 'moderate',
    motorControlDemand: 'high',
  },
  'Box Squat': {
    complexity: 'advanced',
    learningCurve: 'slow',
    injuryRisk: 'moderate',
    requiresSpotter: true,
    setupDifficulty: 'moderate',
    motorControlDemand: 'high',
  },
  'Sumo Deadlift': {
    complexity: 'advanced',
    learningCurve: 'slow',
    injuryRisk: 'moderate',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'high',
  },
  'Deficit Deadlift': {
    complexity: 'advanced',
    learningCurve: 'slow',
    injuryRisk: 'high',
    requiresSpotter: false,
    setupDifficulty: 'moderate',
    motorControlDemand: 'high',
  },
  'Pistol Squat': {
    complexity: 'advanced',
    learningCurve: 'slow',
    injuryRisk: 'moderate',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'very high',
  },
  'Barbell One-Arm Side Deadlift': {
    complexity: 'advanced',
    learningCurve: 'slow',
    injuryRisk: 'high',
    requiresSpotter: false,
    setupDifficulty: 'hard',
    motorControlDemand: 'very high',
  },

  // Compound Upper
  'Snatch': {
    complexity: 'advanced',
    learningCurve: 'slow',
    injuryRisk: 'high',
    requiresSpotter: false,
    setupDifficulty: 'hard',
    motorControlDemand: 'very high',
  },
  'Clean and Jerk': {
    complexity: 'advanced',
    learningCurve: 'slow',
    injuryRisk: 'high',
    requiresSpotter: false,
    setupDifficulty: 'hard',
    motorControlDemand: 'very high',
  },
  'Muscle-Up': {
    complexity: 'advanced',
    learningCurve: 'slow',
    injuryRisk: 'moderate',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'very high',
  },
  'Handstand Push-up': {
    complexity: 'advanced',
    learningCurve: 'slow',
    injuryRisk: 'high',
    requiresSpotter: true,
    setupDifficulty: 'hard',
    motorControlDemand: 'very high',
  },
  'Single-Arm Overhead Press': {
    complexity: 'advanced',
    learningCurve: 'moderate',
    injuryRisk: 'moderate',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'high',
  },

  // Isolation
  'Sissy Squat': {
    complexity: 'advanced',
    learningCurve: 'moderate',
    injuryRisk: 'high',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'high',
  },
  'Jefferson Curl': {
    complexity: 'advanced',
    learningCurve: 'slow',
    injuryRisk: 'high',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'high',
  },

  // Core
  'Turkish Get-Up': {
    complexity: 'advanced',
    learningCurve: 'slow',
    injuryRisk: 'moderate',
    requiresSpotter: false,
    setupDifficulty: 'moderate',
    motorControlDemand: 'very high',
  },
  'Dragon Flag': {
    complexity: 'advanced',
    learningCurve: 'slow',
    injuryRisk: 'moderate',
    requiresSpotter: false,
    setupDifficulty: 'easy',
    motorControlDemand: 'very high',
  },
  'Human Flag': {
    complexity: 'advanced',
    learningCurve: 'slow',
    injuryRisk: 'high',
    requiresSpotter: true,
    setupDifficulty: 'hard',
    motorControlDemand: 'very high',
  },
};

// ---------------------------------------------------------------------------
// Equipment-Based Complexity Adjustments
// ---------------------------------------------------------------------------

/**
 * Some exercises change complexity based on available equipment
 */
export function getAdjustedComplexity(
  exerciseName: string,
  equipmentAccess: EquipmentAccess
): ExerciseComplexity {
  const baseComplexity = EXERCISE_COMPLEXITY_MAP[exerciseName]?.complexity;
  if (!baseComplexity) return 'foundational';

  // Smith machine exercises are easier when that's all you have
  if (exerciseName.includes('Smith') || exerciseName.includes('Machine')) {
    if ((equipmentAccess as string) === 'smith_machine') {
      // Smith machine becomes foundational if that's your primary equipment
      return 'foundational';
    }
    if (equipmentAccess === 'full_gym') {
      // With full gym, prefer free weights - smith is less ideal
      return 'intermediate';
    }
  }

  // Trap bar deadlift is easier than barbell deadlift
  if (exerciseName === 'Trap Bar Deadlift' && equipmentAccess === 'full_gym') {
    return 'foundational';
  }

  return baseComplexity;
}

// ---------------------------------------------------------------------------
// Complexity Filtering Functions
// ---------------------------------------------------------------------------

export function isExerciseAllowedForExperience(
  exerciseName: string,
  experienceLevel: string,
  equipmentAccess: EquipmentAccess = 'full_gym'
): { allowed: boolean; reason?: string } {
  const complexity = getAdjustedComplexity(exerciseName, equipmentAccess);
  const rules = COMPLEXITY_RULES[experienceLevel];

  if (!rules) {
    return { allowed: true };
  }

  if (rules.allowed.includes(complexity)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `${exerciseName} is a ${complexity} exercise, but ${experienceLevel}s should focus on ${rules.allowed.join(' and ')} exercises. ${rules.rationale}`,
  };
}

export function filterExercisesByComplexity(
  exerciseNames: string[],
  experienceLevel: string,
  equipmentAccess: EquipmentAccess = 'full_gym'
): {
  allowed: string[];
  filtered: Array<{ name: string; reason: string }>;
} {
  const allowed: string[] = [];
  const filtered: Array<{ name: string; reason: string }> = [];

  for (const name of exerciseNames) {
    const result = isExerciseAllowedForExperience(name, experienceLevel, equipmentAccess);
    if (result.allowed) {
      allowed.push(name);
    } else {
      filtered.push({ name, reason: result.reason! });
    }
  }

  return { allowed, filtered };
}

// ---------------------------------------------------------------------------
// Smith Machine Policy
// ---------------------------------------------------------------------------

/**
 * Smith machine policy:
 * - Marked as intermediate complexity when full gym available
 * - Use only when limited equipment OR user explicitly prefers machines
 * - Prefer barbell/dumbbell when full gym available
 */
export function shouldAvoidSmithMachine(
  exerciseName: string,
  equipmentAccess: EquipmentAccess,
  userPrefersMachines: boolean = false
): boolean {
  const isSmithExercise =
    exerciseName.toLowerCase().includes('smith') ||
    exerciseName.toLowerCase().includes('machine');

  if (!isSmithExercise) return false;

  // If user prefers machines, allow them
  if (userPrefersMachines) return false;

  // If limited equipment, smith machine might be necessary
  if (equipmentAccess !== 'full_gym') return false;

  // With full gym, prefer free weights
  return true;
}

// ---------------------------------------------------------------------------
// Beginner-Friendly Exercise Recommendations
// ---------------------------------------------------------------------------

export const BEGINNER_EXERCISE_PRIORITIES: Record<string, string[]> = {
  compound_squat: ['Goblet Squat', 'Leg Press', 'Barbell Squat'],
  compound_hinge: ['Romanian Deadlift', 'Trap Bar Deadlift', 'Barbell Deadlift'],
  horizontal_push: ['Dumbbell Bench Press', 'Barbell Bench Press'],
  horizontal_pull: ['Cable Row', 'Dumbbell Row', 'Barbell Row'],
  vertical_push: ['Dumbbell Overhead Press', 'Overhead Press'],
  vertical_pull: ['Lat Pulldown', 'Pull-ups'],
  single_leg: ['Split Squat', 'Bulgarian Split Squat', 'Reverse Lunge'],
  bicep_curl: ['Dumbbell Curl', 'Barbell Curl'],
  tricep_ext: ['Tricep Pushdown', 'Skullcrushers'],
  core: ['Plank', 'Dead Bug', 'Cable Crunch'],
  rear_delt: ['Face Pull', 'Rear Delt Fly'],
  calf: ['Calf Raise'],
};

// ---------------------------------------------------------------------------
// Complexity Scoring for Exercise Selection
// ---------------------------------------------------------------------------

export function getComplexityScore(
  exerciseName: string,
  experienceLevel: string
): number {
  const metadata = EXERCISE_COMPLEXITY_MAP[exerciseName];
  if (!metadata) return 50; // Default score

  const complexity = metadata.complexity;

  // Score based on alignment with experience level
  switch (experienceLevel) {
    case 'beginner':
      if (complexity === 'foundational') return 100;
      if (complexity === 'intermediate') return 20;
      return 0;
    case 'intermediate':
      if (complexity === 'foundational') return 80;
      if (complexity === 'intermediate') return 100;
      return 30;
    case 'advanced':
      if (complexity === 'foundational') return 60;
      if (complexity === 'intermediate') return 80;
      return 100;
    default:
      return 50;
  }
}
