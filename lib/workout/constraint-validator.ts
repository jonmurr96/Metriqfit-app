/**
 * constraint-validator.ts
 *
 * Constraint Validation Utilities for Sprint 5
 * 
 * Provides comprehensive validation of all plan constraints:
 * - Hard constraints (must be satisfied)
 * - Soft constraints (warnings if violated)
 * - Dependency chains between constraints
 * - Performance impact of constraints
 */

import type { ProgramExercise } from './programMappingRules.ts';
import type { PoolExercise } from './exercise-pool.ts';
import type { UserTrainingProfile } from './training-profile.ts';
import type { ExperienceLevel, EquipmentAccess } from './training-profile.ts';

// ---------------------------------------------------------------------------
// Constraint Types
// ---------------------------------------------------------------------------

export type ConstraintSeverity = 'error' | 'warning' | 'info';

export type ConstraintCheck = {
  name: string;
  passed: boolean;
  severity: ConstraintSeverity;
  message: string;
  details?: Record<string, unknown>;
};

export type ValidationResult = {
  valid: boolean;
  checks: ConstraintCheck[];
  errors: ConstraintCheck[];
  warnings: ConstraintCheck[];
  info: ConstraintCheck[];
  summary: string;
};

export type HardConstraint =
  | 'equipment_match'
  | 'experience_level'
  | 'injury_safety'
  | 'max_exercises_per_day'
  | 'max_session_duration';

export type SoftConstraint =
  | 'pattern_coverage'
  | 'muscle_balance'
  | 'volume_landmarks'
  | 'variety'
  | 'preference_match';

// ---------------------------------------------------------------------------
// Equipment Constraints
// ---------------------------------------------------------------------------

const EQUIPMENT_HIERARCHY: Record<string, string[]> = {
  full_gym: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'],
  barbell_rack: ['barbell', 'dumbbell', 'bodyweight'],
  dumbbells_only: ['dumbbell', 'bodyweight'],
  cables_machines: ['cable', 'machine', 'bodyweight'],
  bodyweight_only: ['bodyweight'],
  home_gym: ['dumbbell', 'bodyweight'],
  smith_machine: ['smith_machine', 'dumbbell', 'bodyweight'],
  kettlebells: ['kettlebell', 'bodyweight'],
  suspension: ['suspension', 'bodyweight'],
};

export function validateEquipmentCompatibility(
  exercise: PoolExercise,
  equipmentAccess: EquipmentAccess
): ConstraintCheck {
  const allowedEquipment = EQUIPMENT_HIERARCHY[equipmentAccess] || [];
  const exerciseEquipment = exercise.equipment_options || [];

  // Check if exercise can be performed with available equipment
  const hasValidOption = exerciseEquipment.some((eq) =>
    allowedEquipment.includes(eq)
  );

  if (hasValidOption) {
    return {
      name: 'equipment_match',
      passed: true,
      severity: 'info',
      message: `${exercise.name} is compatible with ${equipmentAccess}`,
    };
  }

  // Check for acceptable substitutions
  const canSubstitute = exerciseEquipment.some((eq) => {
    // Some equipment can substitute for others
    const substitutions: Record<string, string[]> = {
      barbell: ['dumbbell'],
      dumbbell: ['machine'],
      machine: ['cable'],
    };

    const subs = substitutions[eq] || [];
    return subs.some((sub) => allowedEquipment.includes(sub));
  });

  if (canSubstitute) {
    return {
      name: 'equipment_match',
      passed: true,
      severity: 'warning',
      message: `${exercise.name} requires equipment substitution`,
      details: { canSubstitute: true },
    };
  }

  return {
    name: 'equipment_match',
    passed: false,
    severity: 'error',
    message: `${exercise.name} requires ${exerciseEquipment.join(' or ')}, not available with ${equipmentAccess}`,
    details: { required: exerciseEquipment, available: allowedEquipment },
  };
}

// ---------------------------------------------------------------------------
// Experience Level Constraints
// ---------------------------------------------------------------------------

const COMPLEXITY_LIMITS: Record<ExperienceLevel, number> = {
  beginner: 2, // Simple to medium
  intermediate: 3, // Up to high complexity
  advanced: 3, // All complexities
};

export function validateExperienceLevel(
  exercise: PoolExercise,
  experienceLevel: ExperienceLevel
): ConstraintCheck {
  const difficulty = typeof exercise.difficulty === 'number'
    ? exercise.difficulty
    : parseInt(String(exercise.difficulty || '1'), 10);
  const maxDifficulty = COMPLEXITY_LIMITS[experienceLevel];

  if (difficulty <= maxDifficulty) {
    return {
      name: 'experience_level',
      passed: true,
      severity: 'info',
      message: `${exercise.name} is appropriate for ${experienceLevel}`,
    };
  }

  // Check if there's a beginner-friendly alternative
  const isNovelty = (exercise.popularity_score || 0) < 40;

  if (isNovelty) {
    return {
      name: 'experience_level',
      passed: false,
      severity: 'warning',
      message: `${exercise.name} is advanced and low-popularity. Consider a more standard alternative.`,
      details: { difficulty, maxAllowed: maxDifficulty, popularity: exercise.popularity_score },
    };
  }

  return {
    name: 'experience_level',
    passed: false,
    severity: 'error',
    message: `${exercise.name} is too complex for ${experienceLevel} (difficulty: ${difficulty})`,
    details: { difficulty, maxAllowed: maxDifficulty },
  };
}

// ---------------------------------------------------------------------------
// Session Duration Constraints
// ---------------------------------------------------------------------------

const EXERCISE_DURATION_MINUTES: Record<string, number> = {
  compound_squat: 4,
  compound_hinge: 4,
  horizontal_push: 3.5,
  horizontal_pull: 3.5,
  vertical_push: 3,
  vertical_pull: 3,
  incline_push: 3.5,
  chest_fly: 2.5,
  shoulder_raise: 2,
  rear_delt: 2,
  bicep_curl: 2,
  tricep_ext: 2,
  leg_extension: 2.5,
  leg_curl: 2.5,
  calf: 2,
  single_leg: 3,
  hip_thrust: 3,
  carry: 3,
  core: 2,
  conditioning: 2.5,
  unknown: 2.5,
};

export function validateSessionDuration(
  exercises: ProgramExercise[],
  sessionDurationMin: number,
  includeWarmup: boolean = true
): ConstraintCheck {
  let estimatedMinutes = includeWarmup ? 5 : 0; // Warmup

  for (const ex of exercises) {
    const baseDuration = EXERCISE_DURATION_MINUTES[ex.pattern || 'unknown'] || 2.5;
    estimatedMinutes += baseDuration;
  }

  // Add rest between exercises (estimated)
  estimatedMinutes += (exercises.length - 1) * 0.5;

  if (estimatedMinutes <= sessionDurationMin) {
    return {
      name: 'max_session_duration',
      passed: true,
      severity: 'info',
      message: `Estimated ${estimatedMinutes}min fits within ${sessionDurationMin}min session`,
      details: { estimatedMinutes, allowedMinutes: sessionDurationMin },
    };
  }

  const overage = estimatedMinutes - sessionDurationMin;
  const severity = overage > 10 ? 'error' : 'warning';

  return {
    name: 'max_session_duration',
    passed: severity === 'warning',
    severity,
    message: `Estimated ${estimatedMinutes}min exceeds ${sessionDurationMin}min session by ${overage}min`,
    details: { estimatedMinutes, allowedMinutes: sessionDurationMin, overage },
  };
}

// ---------------------------------------------------------------------------
// Exercise Count Constraints
// ---------------------------------------------------------------------------

export function validateExerciseCount(
  exerciseCount: number,
  maxExercises: number
): ConstraintCheck {
  if (exerciseCount <= maxExercises) {
    return {
      name: 'max_exercises_per_day',
      passed: true,
      severity: 'info',
      message: `${exerciseCount} exercises within limit of ${maxExercises}`,
      details: { count: exerciseCount, limit: maxExercises },
    };
  }

  return {
    name: 'max_exercises_per_day',
    passed: false,
    severity: 'error',
    message: `${exerciseCount} exercises exceeds limit of ${maxExercises}`,
    details: { count: exerciseCount, limit: maxExercises, overage: exerciseCount - maxExercises },
  };
}

// ---------------------------------------------------------------------------
// Injury Safety Constraints
// ---------------------------------------------------------------------------

export function validateInjurySafety(
  exercise: PoolExercise,
  injuries: string[],
  isSafeFn: (ex: PoolExercise, injuries: string[]) => boolean
): ConstraintCheck {
  if (injuries.length === 0) {
    return {
      name: 'injury_safety',
      passed: true,
      severity: 'info',
      message: 'No injuries to check against',
    };
  }

  const isSafe = isSafeFn(exercise, injuries);

  if (isSafe) {
    return {
      name: 'injury_safety',
      passed: true,
      severity: 'info',
      message: `${exercise.name} is safe for current injury profile`,
    };
  }

  return {
    name: 'injury_safety',
    passed: false,
    severity: 'error',
    message: `${exercise.name} conflicts with current injury profile`,
    details: { exercise: exercise.name, injuries },
  };
}

// ---------------------------------------------------------------------------
// Pattern Coverage Constraints
// ---------------------------------------------------------------------------

const MIN_PATTERN_COVERAGE = 0.6; // At least 60% of expected patterns

export function validatePatternCoverage(
  exercises: ProgramExercise[],
  expectedPatterns: string[],
  minCoverage: number = MIN_PATTERN_COVERAGE
): ConstraintCheck {
  const coveredPatterns = new Set(
    exercises.filter((e) => e.pattern).map((e) => e.pattern!)
  );

  const covered = expectedPatterns.filter((p) => coveredPatterns.has(p));
  const coverage = expectedPatterns.length > 0
    ? covered.length / expectedPatterns.length
    : 1;

  if (coverage >= minCoverage) {
    return {
      name: 'pattern_coverage',
      passed: true,
      severity: 'info',
      message: `Pattern coverage: ${(coverage * 100).toFixed(0)}% (${covered.length}/${expectedPatterns.length})`,
      details: { covered, missing: expectedPatterns.filter((p) => !coveredPatterns.has(p)) },
    };
  }

  return {
    name: 'pattern_coverage',
    passed: false,
    severity: 'warning',
    message: `Low pattern coverage: ${(coverage * 100).toFixed(0)}% (${covered.length}/${expectedPatterns.length})`,
    details: { covered, missing: expectedPatterns.filter((p) => !coveredPatterns.has(p)) },
  };
}

// ---------------------------------------------------------------------------
// Muscle Balance Constraints
// ---------------------------------------------------------------------------

const ANTAGONIST_PAIRS = [
  ['chest', 'back'],
  ['quads', 'hamstrings'],
  ['biceps', 'triceps'],
  ['abs', 'lower_back'],
];

export function validateMuscleBalance(
  muscleVolumes: Record<string, number>
): ConstraintCheck {
  const imbalances: string[] = [];

  for (const [agonist, antagonist] of ANTAGONIST_PAIRS) {
    const agVol = muscleVolumes[agonist] || 0;
    const antVol = muscleVolumes[antagonist] || 0;

    if (agVol === 0 && antVol === 0) continue;

    const maxVol = Math.max(agVol, antVol);
    const minVol = Math.min(agVol, antVol);

    if (maxVol > 0 && minVol / maxVol < 0.5) {
      const larger = agVol > antVol ? agonist : antagonist;
      const smaller = agVol > antVol ? antagonist : agonist;
      imbalances.push(`${larger} (${maxVol} sets) >> ${smaller} (${minVol} sets)`);
    }
  }

  if (imbalances.length === 0) {
    return {
      name: 'muscle_balance',
      passed: true,
      severity: 'info',
      message: 'Antagonist muscle groups are balanced',
    };
  }

  return {
    name: 'muscle_balance',
    passed: false,
    severity: 'warning',
    message: `Muscle imbalances detected: ${imbalances.join('; ')}`,
    details: { imbalances },
  };
}

// ---------------------------------------------------------------------------
// Comprehensive Validation
// ---------------------------------------------------------------------------

export function validatePlan(
  context: {
    exercises: ProgramExercise[];
    pool: PoolExercise[];
    profile: UserTrainingProfile;
    expectedPatterns?: string[];
    muscleVolumes?: Record<string, number>;
    isExerciseSafeFn?: (ex: PoolExercise, injuries: string[]) => boolean;
  }
): ValidationResult {
  const checks: ConstraintCheck[] = [];

  // Hard constraints
  checks.push(validateExerciseCount(context.exercises.length, context.profile.maxExercisesPerDay));
  checks.push(validateSessionDuration(context.exercises, context.profile.sessionDurationMin ?? 60));

  // Check each exercise
  for (const ex of context.exercises) {
    const poolEx = context.pool.find((p) => p.id === ex.id);
    if (poolEx) {
      checks.push(validateEquipmentCompatibility(poolEx, context.profile.equipmentAccess));
      checks.push(validateExperienceLevel(poolEx, context.profile.experienceLevel));
      
      if (context.isExerciseSafeFn) {
        checks.push(validateInjurySafety(poolEx, context.profile.injuries, context.isExerciseSafeFn));
      }
    }
  }

  // Soft constraints
  if (context.expectedPatterns) {
    checks.push(validatePatternCoverage(context.exercises, context.expectedPatterns));
  }

  if (context.muscleVolumes) {
    checks.push(validateMuscleBalance(context.muscleVolumes));
  }

  // Categorize
  const errors = checks.filter((c) => c.severity === 'error');
  const warnings = checks.filter((c) => c.severity === 'warning');
  const info = checks.filter((c) => c.severity === 'info');

  // Generate summary
  const failedCount = checks.filter((c) => !c.passed).length;
  let summary: string;

  if (errors.length > 0) {
    summary = `Invalid: ${errors.length} error(s), ${warnings.length} warning(s)`;
  } else if (warnings.length > 0) {
    summary = `Valid with warnings: ${warnings.length} issue(s) to review`;
  } else {
    summary = `Valid: All ${checks.length} constraints passed`;
  }

  return {
    valid: errors.length === 0,
    checks,
    errors,
    warnings,
    info,
    summary,
  };
}

// ---------------------------------------------------------------------------
// Constraint Impact Analysis
// ---------------------------------------------------------------------------

export function analyzeConstraintImpact(
  constraintName: string,
  exercises: PoolExercise[]
): { remainingCount: number; impactPercentage: number } {
  // This would filter exercises based on the constraint
  // Placeholder implementation
  const remainingCount = exercises.length;
  return {
    remainingCount,
    impactPercentage: 0,
  };
}
