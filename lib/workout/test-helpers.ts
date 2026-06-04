/**
 * test-helpers.ts
 *
 * Testing utilities and mock data generators for Sprint 5
 * 
 * Provides:
 * - Mock exercise generators
 * - Mock user profile generators
 * - Test fixtures for common scenarios
 * - Assertion helpers
 */

import type { ProgramExercise } from './programMappingRules.ts';
import type { PoolExercise, RawExerciseRow } from './exercise-pool.ts';
import type { 
  ExperienceLevel, 
  PrimaryGoal, 
  RecoveryBurden,
  UserTrainingProfile,
} from './training-profile.ts';
import type { PatternSlot } from './exerciseClassification.ts';

// ---------------------------------------------------------------------------
// Mock Exercise Generators
// ---------------------------------------------------------------------------

export function createMockExercise(overrides: Partial<PoolExercise> = {}): PoolExercise {
  return {
    id: `ex_${Math.random().toString(36).substr(2, 9)}`,
    name: 'Barbell Bench Press',
    category: 'Chest',
    difficulty: '3',
    primary_muscle: 'chest',
    pattern: 'horizontal_push',
    equipment_required: ['barbell'],
    primary_muscles: ['chest', 'front_delts', 'triceps'],
    split_tags: ['push', 'chest', 'upper'],
    equipment_options: ['barbell'],
    popularity_score: 95,
    experience_min: 'beginner',
    is_compound: true,
    technique_compatibility: ['standard', 'paused'],
    joint_stress_level: 2,
    cues: 'Keep elbows tucked, drive through feet',
    exercise_tier: 'very_common',
    ...overrides,
  };
}

export function createMockExerciseByPattern(
  pattern: string,
  overrides: Partial<PoolExercise> = {}
): PoolExercise {
  const patternDefaults: Record<string, Partial<PoolExercise>> = {
    compound_squat: {
      name: 'Barbell Back Squat',
      primary_muscle: 'quads',
      pattern: 'compound_squat',
      is_compound: true,
    },
    compound_hinge: {
      name: 'Barbell Deadlift',
      primary_muscle: 'hamstrings',
      pattern: 'compound_hinge',
      is_compound: true,
    },
    horizontal_push: {
      name: 'Barbell Bench Press',
      primary_muscle: 'chest',
      pattern: 'horizontal_push',
      is_compound: true,
    },
    horizontal_pull: {
      name: 'Barbell Row',
      primary_muscle: 'back',
      pattern: 'horizontal_pull',
      is_compound: true,
    },
    vertical_push: {
      name: 'Overhead Press',
      primary_muscle: 'shoulders',
      pattern: 'vertical_push',
      is_compound: true,
    },
    vertical_pull: {
      name: 'Lat Pulldown',
      primary_muscle: 'lats',
      pattern: 'vertical_pull',
      is_compound: true,
    },
    incline_push: {
      name: 'Incline Bench Press',
      primary_muscle: 'chest',
      pattern: 'incline_push',
      is_compound: true,
    },
    dip: {
      name: 'Chest Dip',
      primary_muscle: 'chest',
      pattern: 'dip',
      is_compound: true,
    },
    fly: {
      name: 'Dumbbell Fly',
      primary_muscle: 'chest',
      pattern: 'fly',
      is_compound: false,
    },
    chest_fly: {
      name: 'Cable Fly',
      primary_muscle: 'chest',
      pattern: 'chest_fly',
      is_compound: false,
    },
    shoulder_raise: {
      name: 'Lateral Raise',
      primary_muscle: 'shoulders',
      pattern: 'shoulder_raise',
      is_compound: false,
    },
    rear_delt: {
      name: 'Face Pull',
      primary_muscle: 'rear_delts',
      pattern: 'rear_delt',
      is_compound: false,
    },
    bicep_curl: {
      name: 'Barbell Curl',
      primary_muscle: 'biceps',
      pattern: 'bicep_curl',
      is_compound: false,
    },
    tricep_ext: {
      name: 'Tricep Pushdown',
      primary_muscle: 'triceps',
      pattern: 'tricep_ext',
      is_compound: false,
    },
    leg_extension: {
      name: 'Leg Extension',
      primary_muscle: 'quads',
      pattern: 'leg_extension',
      is_compound: false,
    },
    leg_curl: {
      name: 'Leg Curl',
      primary_muscle: 'hamstrings',
      pattern: 'leg_curl',
      is_compound: false,
    },
    calf: {
      name: 'Standing Calf Raise',
      primary_muscle: 'calves',
      pattern: 'calf',
      is_compound: false,
    },
    single_leg: {
      name: 'Bulgarian Split Squat',
      primary_muscle: 'quads',
      pattern: 'single_leg',
      is_compound: true,
    },
    hip_thrust: {
      name: 'Hip Thrust',
      primary_muscle: 'glutes',
      pattern: 'hip_thrust',
      is_compound: true,
    },
    carry: {
      name: 'Farmer Walk',
      primary_muscle: 'traps',
      pattern: 'carry',
      is_compound: true,
    },
    core: {
      name: 'Plank',
      primary_muscle: 'abs',
      pattern: 'core',
      is_compound: false,
    },
    conditioning: {
      name: 'Burpees',
      primary_muscle: 'full_body',
      pattern: 'conditioning',
      is_compound: true,
    },
    unknown: {
      name: 'Unknown Exercise',
      primary_muscle: 'unknown',
      pattern: 'unknown',
      is_compound: false,
    },
  };

  return createMockExercise({
    ...(patternDefaults[pattern] || patternDefaults.unknown),
    ...overrides,
  });
}

export function createMockExercisePool(
  count: number,
  patterns: PatternSlot[] = []
): PoolExercise[] {
  const pool: PoolExercise[] = [];
  const defaultPatterns: PatternSlot[] = [
    'compound_squat', 'compound_hinge', 'horizontal_push', 'horizontal_pull',
    'vertical_push', 'vertical_pull', 'chest_fly', 'shoulder_raise', 'rear_delt',
    'bicep_curl', 'tricep_ext', 'leg_extension', 'leg_curl', 'calf',
  ];

  const patternsToUse = patterns.length > 0 ? patterns : defaultPatterns;

  for (let i = 0; i < count; i++) {
    const pattern = patternsToUse[i % patternsToUse.length];
    pool.push(createMockExerciseByPattern(pattern, {
      id: `ex_${i}`,
      popularity_score: 50 + Math.random() * 50,
    }));
  }

  return pool;
}

// ---------------------------------------------------------------------------
// Mock User Profile Generators
// ---------------------------------------------------------------------------

export function createMockTrainingProfile(
  overrides: Partial<UserTrainingProfile> = {}
): UserTrainingProfile {
  return {
    daysPerWeek: 4,
    experienceLevel: 'intermediate',
    primaryGoal: 'build_muscle',
    equipmentAccess: 'full_gym',
    injuries: [],
    preferredSplitFamily: null,
    techniquePreferences: [],
    progressionPreference: null,
    sessionEmphasis: null,
    sessionDurationMin: 60,
    maxExercisesPerDay: 6,
    trainingStylePreference: 'balanced',
    recoveryBurden: 'moderate',
    bodyFocusPreferences: [],
    activityLevel: 'moderately_active',
    prefersBodybuildingStyle: false,
    limitedEquipment: false,
    ...overrides,
  };
}

export function createBeginnerProfile(): UserTrainingProfile {
  return createMockTrainingProfile({
    experienceLevel: 'beginner',
    daysPerWeek: 3,
    recoveryBurden: 'high',
    maxExercisesPerDay: 5,
  });
}

export function createAdvancedBodybuilderProfile(): UserTrainingProfile {
  return createMockTrainingProfile({
    experienceLevel: 'advanced',
    daysPerWeek: 6,
    primaryGoal: 'build_muscle',
    trainingStylePreference: 'bodybuilding',
    recoveryBurden: 'low',
    maxExercisesPerDay: 8,
    prefersBodybuildingStyle: true,
  });
}

export function createInjuredProfile(injuries: string[]): UserTrainingProfile {
  return createMockTrainingProfile({
    injuries,
    recoveryBurden: 'high',
  });
}

export function createLimitedEquipmentProfile(
  equipment: 'dumbbells_only' | 'bodyweight_only'
): UserTrainingProfile {
  return createMockTrainingProfile({
    equipmentAccess: equipment,
    limitedEquipment: true,
  });
}

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

export const TEST_FIXTURES = {
  // Common exercise sets
  exercises: {
    squat: createMockExerciseByPattern('compound_squat', { 
      id: 'squat_1', 
      name: 'Barbell Squat',
      popularity_score: 98 
    }),
    deadlift: createMockExerciseByPattern('compound_hinge', { 
      id: 'deadlift_1', 
      name: 'Barbell Deadlift',
      popularity_score: 98 
    }),
    bench: createMockExerciseByPattern('horizontal_push', { 
      id: 'bench_1', 
      name: 'Barbell Bench Press',
      popularity_score: 97 
    }),
    row: createMockExerciseByPattern('horizontal_pull', { 
      id: 'row_1', 
      name: 'Barbell Row',
      popularity_score: 92 
    }),
    overhead: createMockExerciseByPattern('vertical_push', { 
      id: 'ohp_1', 
      name: 'Overhead Press',
      popularity_score: 88 
    }),
    pulldown: createMockExerciseByPattern('vertical_pull', { 
      id: 'pulldown_1', 
      name: 'Lat Pulldown',
      popularity_score: 90 
    }),
    // Knee conflict exercises
    sissySquat: createMockExercise({
      id: 'sissy_1',
      name: 'Sissy Squat',
      pattern: 'single_leg',
      popularity_score: 45,
    }),
    // Back conflict exercises
    goodMorning: createMockExercise({
      id: 'gm_1',
      name: 'Good Morning',
      pattern: 'compound_hinge',
      popularity_score: 55,
    }),
    // Specialty/novelty
    zercher: createMockExercise({
      id: 'zercher_1',
      name: 'Zercher Squat',
      pattern: 'compound_squat',
      popularity_score: 25,
    }),
  },

  // User profiles
  profiles: {
    beginner: createBeginnerProfile(),
    intermediate: createMockTrainingProfile(),
    advancedBodybuilder: createAdvancedBodybuilderProfile(),
    kneeInjury: createInjuredProfile(['knee pain']),
    backInjury: createInjuredProfile(['lower back pain']),
    dumbbellsOnly: createLimitedEquipmentProfile('dumbbells_only'),
  },

  // Common split configurations
  splits: {
    fullBody3: {
      familyKey: 'full_body_beginner_3',
      daysPerWeek: 3,
    },
    upperLower4: {
      familyKey: 'upper_lower_4',
      daysPerWeek: 4,
    },
    ppl6: {
      familyKey: 'ppl_6',
      daysPerWeek: 6,
    },
  },
};

// ---------------------------------------------------------------------------
// Assertion Helpers
// ---------------------------------------------------------------------------

export function assertExerciseMatchesPattern(
  exercise: ProgramExercise,
  pattern: PatternSlot
): boolean {
  return exercise.pattern === pattern;
}

export function assertPlanHasPatternCoverage(
  exercises: ProgramExercise[],
  requiredPatterns: PatternSlot[]
): { covered: PatternSlot[]; missing: PatternSlot[] } {
  const covered = new Set<PatternSlot>();
  
  exercises.forEach((ex) => {
    if (ex.pattern && requiredPatterns.includes(ex.pattern as PatternSlot)) {
      covered.add(ex.pattern as PatternSlot);
    }
  });

  return {
    covered: Array.from(covered),
    missing: requiredPatterns.filter((p) => !covered.has(p)),
  };
}

export function assertNoInjuryConflicts(
  exercises: ProgramExercise[],
  injuries: string[],
  isConflictFn: (ex: ProgramExercise, injury: string) => boolean
): { conflicts: Array<{ exercise: ProgramExercise; injury: string }> } {
  const conflicts: Array<{ exercise: ProgramExercise; injury: string }> = [];

  exercises.forEach((ex) => {
    injuries.forEach((injury) => {
      if (isConflictFn(ex, injury)) {
        conflicts.push({ exercise: ex, injury });
      }
    });
  });

  return { conflicts };
}

export function assertVolumeWithinLandmarks(
  muscleVolumes: Record<string, number>,
  experienceLevel: ExperienceLevel,
  recoveryBurden: RecoveryBurden
): { violations: string[] } {
  // This would import from volume-landmarks.ts
  // Placeholder for now
  return { violations: [] };
}

// ---------------------------------------------------------------------------
// Performance Measurement
// ---------------------------------------------------------------------------

export function measureExecutionTime<T>(
  fn: () => T,
  iterations: number = 1
): { result: T; averageMs: number } {
  const times: number[] = [];
  let result: T;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    result = fn();
    const end = performance.now();
    times.push(end - start);
  }

  const averageMs = times.reduce((a, b) => a + b, 0) / times.length;
  return { result: result!, averageMs };
}

export function createLargeExercisePool(size: number): PoolExercise[] {
  const pool: PoolExercise[] = [];
  const patterns: string[] = [
    'compound_squat', 'compound_hinge', 'horizontal_push', 'horizontal_pull',
    'vertical_push', 'vertical_pull', 'incline_push', 'chest_fly', 'shoulder_raise',
    'rear_delt', 'bicep_curl', 'tricep_ext', 'leg_extension', 'leg_curl', 'calf',
  ];

  for (let i = 0; i < size; i++) {
    const pattern = patterns[i % patterns.length];
    const baseName = pattern.replace(/_/g, ' ');
    pool.push(createMockExerciseByPattern(pattern, {
      id: `ex_${i}`,
      name: `${baseName} ${Math.floor(i / patterns.length) + 1}`,
      popularity_score: Math.random() * 100,
    }));
  }

  return pool;
}

// ---------------------------------------------------------------------------
// Test Scenarios
// ---------------------------------------------------------------------------

export const TEST_SCENARIOS = {
  // Edge case: Empty exercise pool
  emptyPool: {
    description: 'Empty exercise pool',
    pool: [],
    profile: createMockTrainingProfile(),
    expectedBehavior: 'Graceful fallback or error',
  },

  // Edge case: All exercises conflict with injuries
  allConflicts: {
    description: 'All available exercises conflict with user injuries',
    pool: [TEST_FIXTURES.exercises.sissySquat],
    profile: createInjuredProfile(['knees']),
    expectedBehavior: 'Returns empty selection or fallback',
  },

  // Edge case: Very high exercise count
  largePool: {
    description: 'Exercise pool with 1000+ exercises',
    pool: createLargeExercisePool(1000),
    profile: createMockTrainingProfile(),
    expectedBehavior: 'Completes within acceptable time',
  },

  // Edge case: Conflicting constraints
  conflictingConstraints: {
    description: 'High recovery burden + 6-day split selection',
    profile: createMockTrainingProfile({
      experienceLevel: 'beginner',
      daysPerWeek: 6,
      recoveryBurden: 'high',
    }),
    expectedBehavior: 'Override required flag set',
  },

  // Standard case: Typical user
  typicalUser: {
    description: 'Typical intermediate user, 4-day upper/lower',
    pool: createMockExercisePool(50),
    profile: createMockTrainingProfile(),
    split: 'upper_lower_4',
    expectedBehavior: 'Valid plan generated',
  },

  // Stress test: Multiple injuries
  multipleInjuries: {
    description: 'User with knee, back, and shoulder injuries',
    profile: createInjuredProfile(['knee pain', 'back pain', 'shoulder pain']),
    expectedBehavior: 'Plan excludes all conflicting exercises',
  },
};
