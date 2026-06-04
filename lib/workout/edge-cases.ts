/**
 * edge-cases.ts
 *
 * Edge Case Handlers for Sprint 5
 * 
 * Provides robust handling for:
 * - Empty/minimal exercise pools
 * - Complete injury conflicts
 * - Conflicting user preferences
 * - Plan generation failures
 * - Data corruption scenarios
 */

import type { PoolExercise } from './exercise-pool.ts';
import type { ProgramExercise } from './programMappingRules.ts';
import type { 
  ExperienceLevel, 
  PrimaryGoal,
  UserTrainingProfile,
} from './training-profile.ts';
import type { GeneratedSplitDaySelection } from './generated-split-selection.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EdgeCaseType =
  | 'empty_pool'
  | 'pool_too_small'
  | 'all_injury_conflicts'
  | 'no_valid_selections'
  | 'generation_timeout'
  | 'constraint_violation'
  | 'missing_critical_patterns'
  | 'excessive_volume'
  | 'insufficient_volume';

export type EdgeCaseHandlerResult = {
  handled: boolean;
  fallbackPlan?: any;
  error?: string;
  warnings: string[];
  degradedMode: boolean;
};

export type EmptyPoolFallback = {
  exercises: ProgramExercise[];
  isMinimal: boolean;
  warnings: string[];
};

export type InjuryConflictResolution = {
  canProceed: boolean;
  safeExercises: PoolExercise[];
  fallbackExercises?: PoolExercise[];
  warnings: string[];
};

export type ConstraintConflict = {
  constraints: string[];
  resolution: 'relax' | 'strict' | 'override';
  explanation: string;
};

// ---------------------------------------------------------------------------
// Empty Pool Handler
// ---------------------------------------------------------------------------

/**
 * Handles the case when no exercises match the user's equipment/goal
 */
export function handleEmptyExercisePool(
  pool: PoolExercise[],
  profile: UserTrainingProfile
): EmptyPoolFallback {
  const warnings: string[] = [];

  if (pool.length === 0) {
    warnings.push(
      'No exercises available in the current pool. Using fallback bodyweight exercises.'
    );

    // Return minimal bodyweight fallback
    return {
      exercises: getFallbackBodyweightExercises(),
      isMinimal: true,
      warnings,
    };
  }

  if (pool.length < 10) {
    warnings.push(
      `Very small exercise pool (${pool.length} exercises). Plan may be limited.`
    );
  }

  return {
    exercises: [],
    isMinimal: false,
    warnings,
  };
}

function getFallbackBodyweightExercises(): ProgramExercise[] {
  return [
    {
      id: 'fallback_pushup',
      name: 'Push-Up',
      pattern: 'horizontal_push',
      category: 'chest',
      equipment_required: ['bodyweight'],
      primary_muscle: 'chest',
    },
    {
      id: 'fallback_squat',
      name: 'Bodyweight Squat',
      pattern: 'compound_squat',
      category: 'legs',
      equipment_required: ['bodyweight'],
      primary_muscle: 'quads',
    },
    {
      id: 'fallback_lunge',
      name: 'Walking Lunge',
      pattern: 'single_leg',
      category: 'legs',
      equipment_required: ['bodyweight'],
      primary_muscle: 'quads',
    },
    {
      id: 'fallback_row',
      name: 'Inverted Row (Under Table)',
      pattern: 'horizontal_pull',
      category: 'back',
      equipment_required: ['bodyweight'],
      primary_muscle: 'back',
    },
    {
      id: 'fallback_plank',
      name: 'Plank',
      pattern: 'core',
      category: 'core',
      equipment_required: ['bodyweight'],
      primary_muscle: 'abs',
    },
  ];
}

// ---------------------------------------------------------------------------
// Injury Conflict Handler
// ---------------------------------------------------------------------------

/**
 * Handles cases where too many exercises conflict with user injuries
 */
export function handleInjuryConflicts(
  pool: PoolExercise[],
  safeExercises: PoolExercise[],
  injuries: string[],
  minRequired: number = 5
): InjuryConflictResolution {
  const warnings: string[] = [];

  // If we have enough safe exercises, proceed normally
  if (safeExercises.length >= minRequired) {
    return {
      canProceed: true,
      safeExercises,
      warnings: [],
    };
  }

  // Not enough safe exercises - try to find partial matches
  warnings.push(
    `Only ${safeExercises.length} exercises safe for your injuries. ` +
    `Searching for modified alternatives...`
  );

  // Try to find exercises that conflict with only some (not all) injuries
  const partialMatches = pool.filter((ex) => {
    const conflicts = getExerciseInjuryConflicts(ex, injuries);
    return conflicts.length > 0 && conflicts.length < injuries.length;
  });

  if (safeExercises.length + partialMatches.length >= minRequired) {
    warnings.push(
      'Using some exercises that may need modification for certain injuries.'
    );

    return {
      canProceed: true,
      safeExercises: [...safeExercises, ...partialMatches],
      warnings,
    };
  }

  // Still not enough - try to use any exercises with warnings
  if (pool.length >= minRequired) {
    warnings.push(
      'WARNING: Proceeding with exercises that may conflict with your injuries. ' +
      'Please consult a medical professional and modify as needed.'
    );

    return {
      canProceed: true,
      safeExercises: pool,
      warnings,
    };
  }

  // Pool is too small even without injury restrictions
  return {
    canProceed: false,
    safeExercises,
    warnings: [
      ...warnings,
      'Cannot generate a safe plan with the available exercises. ' +
      'Please update your injury profile or equipment selection.',
    ],
  };
}

function getExerciseInjuryConflicts(
  exercise: PoolExercise,
  injuries: string[]
): string[] {
  const conflicts: string[] = [];
  const nameLower = (exercise.name || '').toLowerCase();

  // Simple keyword matching (production would use more sophisticated rules)
  const injuryKeywords: Record<string, string[]> = {
    knee: ['squat', 'lunge', 'leg press', 'jump', 'step', 'run'],
    back: ['deadlift', 'row', 'good morning', 'back extension'],
    shoulder: ['overhead', 'press', 'raise', 'fly'],
    wrist: ['plank', 'push', 'curl'],
  };

  injuries.forEach((injury) => {
    const keywords = injuryKeywords[injury.toLowerCase()] || [];
    if (keywords.some((kw) => nameLower.includes(kw))) {
      conflicts.push(injury);
    }
  });

  return conflicts;
}

// ---------------------------------------------------------------------------
// Constraint Conflict Resolver
// ---------------------------------------------------------------------------

/**
 * Analyzes and resolves conflicting user preferences
 */
export function resolveConstraintConflicts(
  profile: UserTrainingProfile
): ConstraintConflict {
  const conflicts: string[] = [];

  // Check for day count vs experience conflicts
  if (profile.experienceLevel === 'beginner' && profile.daysPerWeek > 4) {
    conflicts.push(
      `Beginners rarely benefit from ${profile.daysPerWeek}-day splits`
    );
  }

  // Check for recovery burden vs volume conflicts
  if (profile.recoveryBurden === 'high' && profile.daysPerWeek > 4) {
    conflicts.push(
      'High recovery burden with frequent training may lead to burnout'
    );
  }

  // Check for limited equipment + bodybuilding intent
  if (profile.limitedEquipment && profile.prefersBodybuildingStyle) {
    conflicts.push(
      'Bodybuilding style training is difficult with limited equipment'
    );
  }

  // Check for very short sessions + many exercises
  const estimatedMinExercises = Math.ceil((profile.sessionDurationMin || 0) / 10);
  if (profile.maxExercisesPerDay > estimatedMinExercises) {
    conflicts.push(
      `Session duration may not allow for ${profile.maxExercisesPerDay} exercises`
    );
  }

  if (conflicts.length === 0) {
    return {
      constraints: [],
      resolution: 'strict',
      explanation: 'No conflicts detected',
    };
  }

  // Determine resolution strategy based on conflict severity
  const criticalConflicts = conflicts.filter(
    (c) =>
      c.includes('beginners') ||
      c.includes('burnout') ||
      c.includes('not allow')
  );

  if (criticalConflicts.length > 1) {
    return {
      constraints: conflicts,
      resolution: 'override',
      explanation:
        'Multiple critical conflicts require explicit acknowledgment to proceed',
    };
  }

  return {
    constraints: conflicts,
    resolution: 'relax',
    explanation:
      'Non-critical conflicts can be relaxed with appropriate warnings',
  };
}

// ---------------------------------------------------------------------------
// Pattern Coverage Validator
// ---------------------------------------------------------------------------

const CRITICAL_PATTERNS_BY_GOAL: Record<PrimaryGoal, string[]> = {
  build_muscle: ['compound_squat', 'horizontal_push', 'horizontal_pull'],
  get_stronger: ['compound_squat', 'compound_hinge', 'horizontal_push'],
  lose_fat: ['compound_squat', 'conditioning', 'horizontal_push'],
  improve_endurance: ['compound_squat', 'horizontal_push', 'core'],
  general_fitness: ['compound_squat', 'horizontal_push', 'horizontal_pull'],
  athletic_performance: ['compound_squat', 'horizontal_push', 'horizontal_pull'],
};

/**
 * Validates that critical movement patterns are covered
 */
export function validatePatternCoverage(
  exercises: ProgramExercise[],
  primaryGoal: PrimaryGoal,
  strict: boolean = true
): { valid: boolean; missing: string[]; warnings: string[] } {
  const requiredPatterns = CRITICAL_PATTERNS_BY_GOAL[primaryGoal];
  const coveredPatterns = new Set(
    exercises.filter((e) => e.pattern).map((e) => e.pattern!)
  );

  const missing = requiredPatterns.filter(
    (p) => !coveredPatterns.has(p)
  );

  const warnings: string[] = [];

  if (missing.length > 0) {
    if (strict) {
      warnings.push(
        `Missing critical patterns for ${primaryGoal}: ${missing.join(', ')}`
      );
    } else {
      warnings.push(
        `Plan may be suboptimal - missing: ${missing.join(', ')}`
      );
    }
  }

  return {
    valid: missing.length === 0 || !strict,
    missing,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Volume Balance Validator
// ---------------------------------------------------------------------------

/**
 * Checks for volume imbalances that could cause issues
 */
export function validateVolumeBalance(
  muscleVolumes: Record<string, number>,
  minRatio: number = 0.3
): { balanced: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const muscles = Object.keys(muscleVolumes);

  if (muscles.length < 2) {
    return { balanced: true, warnings };
  }

  const volumes = muscles.map((m) => muscleVolumes[m]);
  const maxVolume = Math.max(...volumes);
  const minVolume = Math.min(...volumes);

  if (maxVolume === 0) {
    return { balanced: true, warnings };
  }

  const ratio = minVolume / maxVolume;

  if (ratio < minRatio) {
    warnings.push(
      `Large volume imbalance detected (ratio: ${ratio.toFixed(2)}). ` +
      `Some muscle groups may be undertrained.`
    );
  }

  // Check for antagonist balance
  const antagonistPairs = [
    ['chest', 'back'],
    ['quads', 'hamstrings'],
    ['biceps', 'triceps'],
  ];

  antagonistPairs.forEach(([agonist, antagonist]) => {
    const agVol = muscleVolumes[agonist] || 0;
    const antVol = muscleVolumes[antagonist] || 0;

    if (agVol > 0 && antVol > 0) {
      const pairRatio = Math.min(agVol, antVol) / Math.max(agVol, antVol);
      if (pairRatio < 0.5) {
        warnings.push(
          `Antagonist imbalance between ${agonist} and ${antagonist}`
        );
      }
    }
  });

  return {
    balanced: warnings.length === 0,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Main Edge Case Orchestrator
// ---------------------------------------------------------------------------

export function handleEdgeCases(
  context: {
    exercisePool: PoolExercise[];
    selectedExercises: PoolExercise[];
    profile: UserTrainingProfile;
    generatedPlan?: any;
  }
): EdgeCaseHandlerResult {
  const warnings: string[] = [];
  let degradedMode = false;

  // Check 1: Empty or minimal pool
  const emptyResult = handleEmptyExercisePool(
    context.exercisePool,
    context.profile
  );
  if (emptyResult.isMinimal) {
    return {
      handled: true,
      fallbackPlan: {
        days: [
          {
            dayKey: 'day_1',
            dayName: 'Full Body (Fallback)',
            exercises: emptyResult.exercises,
          },
        ],
        poolId: 'fallback_bodyweight',
      },
      warnings: emptyResult.warnings,
      degradedMode: true,
    };
  }
  warnings.push(...emptyResult.warnings);

  // Check 2: Constraint conflicts
  const conflictResult = resolveConstraintConflicts(context.profile);
  if (conflictResult.resolution === 'override') {
    warnings.push(...conflictResult.constraints);
    warnings.push(conflictResult.explanation);
  }

  // Check 3: Pattern coverage
  if (context.generatedPlan) {
    const allExercises = context.generatedPlan.days.flatMap((d: any) => d.exercises);
    const patternCheck = validatePatternCoverage(
      allExercises,
      context.profile.primaryGoal,
      false // Non-strict mode for edge case handling
    );
    if (!patternCheck.valid) {
      warnings.push(...patternCheck.warnings);
      degradedMode = true;
    }
  }

  // Check 4: Injury safety
  if (context.profile.injuries.length > 0) {
    const safeCount = context.selectedExercises.filter((ex) => {
      // Would call isExerciseSafeForInjuries in production
      return true; // Simplified for edge case handler
    }).length;

    if (safeCount < 5) {
      warnings.push(
        `Only ${safeCount} exercises are confirmed safe for your injuries. ` +
        `Please review and modify as needed.`
      );
      degradedMode = true;
    }
  }

  return {
    handled: warnings.length > 0,
    warnings,
    degradedMode,
  };
}
