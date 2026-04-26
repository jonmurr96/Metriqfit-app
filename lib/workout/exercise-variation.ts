/**
 * exercise-variation.ts
 *
 * Exercise Variation & Rotation System for Sprint 4
 * 
 * Prevents accommodation by intelligently rotating exercises every 3-4 weeks.
 * Maintains training stimulus while providing movement variety.
 * 
 * Design principles:
 * 1. Keep core compound lifts stable (squat, bench, deadlift patterns)
 * 2. Rotate accessory exercises to prevent accommodation
 * 3. Maintain same movement pattern and muscle group
 * 4. Respect equipment access and injury constraints
 * 5. Track exercise history to avoid excessive repetition
 */

import type { ProgramExercise } from './programMappingRules.ts';
import type { PoolExercise } from './exercise-pool.ts';
import { classifyExercise, type PatternSlot } from './exerciseClassification.ts';
import { buildExerciseMetadata, type ExercisePriorityContext } from './exercise-priority.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VariationRule = {
  /** Pattern slot this rule applies to */
  patternSlot: PatternSlot;
  /** Primary muscle group */
  primaryMuscle: string;
  /** How often to rotate (in weeks) */
  rotationWeeks: number;
  /** Whether this is a core lift (keep stable) */
  isCoreLift: boolean;
  /** Variation strategy */
  strategy: 'stable' | 'rotate_grip' | 'rotate_equipment' | 'rotate_angle' | 'rotate_fully';
  /** Exercise families that can substitute for each other */
  equivalentFamilies: string[];
};

export type ExerciseHistory = {
  exerciseId: string;
  exerciseName: string;
  firstUsed: Date;
  lastUsed: Date;
  weeksUsed: number;
  totalSessions: number;
  averagePerformance?: number; // 0-100 score based on progression
};

export type VariationContext = {
  /** Current week in mesocycle (1-12 typically) */
  currentWeek: number;
  /** Total weeks in current mesocycle */
  mesocycleWeeks: number;
  /** User's exercise history */
  exerciseHistory: ExerciseHistory[];
  /** Equipment access */
  equipmentAccess: string;
  /** Injuries to respect */
  injuries?: string[];
  /** Whether user wants more variety */
  prefersVariety?: boolean;
};

export type VariationRecommendation = {
  currentExercise: ProgramExercise;
  shouldVary: boolean;
  reason: string;
  suggestedAlternatives: PoolExercise[];
  variationType: 'grip' | 'equipment' | 'angle' | 'exercise' | 'none';
  confidence: 'high' | 'medium' | 'low';
};

// ---------------------------------------------------------------------------
// Core Lift Stability Rules
// ---------------------------------------------------------------------------

/**
 * Core lifts that should remain stable across mesocycles
 * (to track long-term progression)
 */
const CORE_LIFT_PATTERNS: PatternSlot[] = [
  'compound_squat',
  'compound_hinge',
  'horizontal_push',
  'horizontal_pull',
  'vertical_push',
  'vertical_pull',
];

/**
 * Accessory patterns that benefit from rotation
 */
const ROTATABLE_PATTERNS: PatternSlot[] = [
  'chest_fly',
  'shoulder_raise',
  'rear_delt',
  'bicep_curl',
  'tricep_ext',
  'leg_extension',
  'leg_curl',
  'calf',
  'core',
  'single_leg',
  'hip_thrust',
];

// ---------------------------------------------------------------------------
// Variation Strategies by Pattern
// ---------------------------------------------------------------------------

const VARIATION_STRATEGIES: Record<PatternSlot, { rotationWeeks: number; strategies: string[] }> = {
  compound_squat: { rotationWeeks: 8, strategies: ['stable', 'equipment'] },
  compound_hinge: { rotationWeeks: 8, strategies: ['stable', 'equipment'] },
  horizontal_push: { rotationWeeks: 6, strategies: ['stable', 'angle', 'grip'] },
  horizontal_pull: { rotationWeeks: 4, strategies: ['equipment', 'grip'] },
  vertical_push: { rotationWeeks: 6, strategies: ['stable', 'equipment'] },
  vertical_pull: { rotationWeeks: 4, strategies: ['equipment', 'grip'] },
  incline_push: { rotationWeeks: 4, strategies: ['angle', 'equipment'] },
  dip: { rotationWeeks: 6, strategies: ['stable'] },
  fly: { rotationWeeks: 3, strategies: ['equipment', 'angle'] },
  chest_fly: { rotationWeeks: 3, strategies: ['equipment'] },
  shoulder_raise: { rotationWeeks: 3, strategies: ['equipment', 'angle'] },
  rear_delt: { rotationWeeks: 3, strategies: ['equipment'] },
  bicep_curl: { rotationWeeks: 3, strategies: ['equipment', 'grip'] },
  tricep_ext: { rotationWeeks: 3, strategies: ['equipment', 'angle'] },
  leg_extension: { rotationWeeks: 4, strategies: ['stable'] },
  leg_curl: { rotationWeeks: 4, strategies: ['stable'] },
  calf: { rotationWeeks: 4, strategies: ['equipment'] },
  single_leg: { rotationWeeks: 4, strategies: ['exercise'] },
  hip_thrust: { rotationWeeks: 4, strategies: ['equipment'] },
  carry: { rotationWeeks: 3, strategies: ['exercise'] },
  core: { rotationWeeks: 2, strategies: ['exercise'] },
  conditioning: { rotationWeeks: 2, strategies: ['exercise'] },
  unknown: { rotationWeeks: 4, strategies: ['exercise'] },
};

// ---------------------------------------------------------------------------
// Equipment-Based Variations
// ---------------------------------------------------------------------------

const EQUIPMENT_VARIATIONS: Record<string, string[]> = {
  'barbell_bench_press': ['Dumbbell Bench Press', 'Machine Chest Press', 'Cable Chest Press'],
  'dumbbell_bench_press': ['Barbell Bench Press', 'Machine Chest Press', 'Cable Chest Press'],
  'barbell_row': ['Dumbbell Row', 'Machine Row', 'Cable Row', 'Chest Supported Row'],
  'dumbbell_row': ['Barbell Row', 'Machine Row', 'Cable Row'],
  'barbell_curl': ['Dumbbell Curl', 'Cable Curl', 'Machine Curl', 'EZ Bar Curl'],
  'dumbbell_curl': ['Barbell Curl', 'Cable Curl', 'Machine Curl'],
  'skull_crusher': ['Tricep Pushdown', 'Overhead Extension', 'Cable Kickback'],
  'tricep_pushdown': ['Skull Crusher', 'Overhead Extension', 'Close Grip Bench'],
  'lateral_raise': ['Cable Lateral Raise', 'Machine Lateral Raise', 'Lean Away Raise'],
  'leg_extension': ['Single Leg Extension', 'Hack Squat', 'Leg Press (feet low)'],
  'leg_curl': ['Seated Leg Curl', 'Single Leg Curl'],
};

// ---------------------------------------------------------------------------
// Grip Variations
// ---------------------------------------------------------------------------

const GRIP_VARIATIONS: Record<string, string[]> = {
  'barbell_bench_press': ['Close Grip Bench Press', 'Wide Grip Bench Press'],
  'lat_pulldown': ['Close Grip Pulldown', 'Wide Grip Pulldown', 'Neutral Grip Pulldown'],
  'barbell_row': ['Underhand Row', 'Overhand Row'],
  'barbell_curl': ['Hammer Curl', 'Reverse Curl'],
};

// ---------------------------------------------------------------------------
// Angle Variations
// ---------------------------------------------------------------------------

const ANGLE_VARIATIONS: Record<string, string[]> = {
  'bench_press': ['Incline Press', 'Decline Press'],
  'dumbbell_press': ['Incline Dumbbell Press', 'Flat Dumbbell Press'],
  'lateral_raise': ['Low Cable Raise', 'High Cable Raise'],
  'chest_fly': ['Low Cable Fly', 'High Cable Fly', 'Incline Fly'],
};

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function getExerciseHistory(
  exerciseId: string,
  history: ExerciseHistory[]
): ExerciseHistory | undefined {
  return history.find((h) => h.exerciseId === exerciseId);
}

function weeksSinceLastUsed(history: ExerciseHistory | undefined): number {
  if (!history) return Infinity;
  const lastUsed = new Date(history.lastUsed);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - lastUsed.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
}

// ---------------------------------------------------------------------------
// Core Logic
// ---------------------------------------------------------------------------

/**
 * Determine if an exercise should be varied based on usage history
 */
export function shouldVaryExercise(
  exercise: ProgramExercise,
  context: VariationContext
): { shouldVary: boolean; reason: string; variationType: VariationRecommendation['variationType'] } {
  const classification = classifyExercise(exercise);
  const pattern = classification.patternSlot;
  const strategy = VARIATION_STRATEGIES[pattern];
  
  if (!strategy) {
    return { shouldVary: false, reason: 'Unknown pattern', variationType: 'none' };
  }
  
  // Core lifts stay stable longer
  if (CORE_LIFT_PATTERNS.includes(pattern) && !context.prefersVariety) {
    // Still check if it's been too long
    const history = getExerciseHistory(exercise.id, context.exerciseHistory);
    const weeksUsed = history?.weeksUsed || 0;
    
    if (weeksUsed >= strategy.rotationWeeks * 1.5) {
      return {
        shouldVary: true,
        reason: `Core lift used for ${weeksUsed} weeks, time for variation`,
        variationType: 'equipment',
      };
    }
    
    return { shouldVary: false, reason: 'Core lift - maintaining for progression tracking', variationType: 'none' };
  }
  
  // Check rotation schedule
  const history = getExerciseHistory(exercise.id, context.exerciseHistory);
  const weeksUsed = history?.weeksUsed || 0;
  const weeksSince = weeksSinceLastUsed(history);
  
  if (weeksUsed >= strategy.rotationWeeks) {
    return {
      shouldVary: true,
      reason: `Exercise used for ${weeksUsed} weeks, time for rotation`,
      variationType: 'exercise',
    };
  }
  
  if (weeksSince < 2 && weeksUsed >= strategy.rotationWeeks * 0.75) {
    return {
      shouldVary: true,
      reason: `Exercise approaching accommodation threshold`,
      variationType: 'equipment',
    };
  }
  
  // User prefers variety
  if (context.prefersVariety && weeksUsed >= Math.max(2, strategy.rotationWeeks * 0.5)) {
    return {
      shouldVary: true,
      reason: 'User prefers exercise variety',
      variationType: 'grip',
    };
  }
  
  return { shouldVary: false, reason: 'Within normal rotation period', variationType: 'none' };
}

/**
 * Get variation candidates for an exercise
 */
export function getVariationCandidates(
  exercise: ProgramExercise,
  pool: PoolExercise[],
  variationType: VariationRecommendation['variationType'],
  context: ExercisePriorityContext
): PoolExercise[] {
  const classification = classifyExercise(exercise);
  const pattern = classification.patternSlot;
  const nameKey = normalizeName(exercise.name || '');
  
  let candidates: PoolExercise[] = [];
  
  switch (variationType) {
    case 'equipment': {
      // Find same pattern, different equipment
      candidates = pool.filter((ex) => {
        if (ex.id === exercise.id) return false;
        const meta = buildExerciseMetadata(ex, context);
        return meta.patternSlot === pattern && 
               ex.primary_muscle === exercise.primary_muscle;
      });
      break;
    }
    
    case 'grip': {
      // Check for specific grip variations
      const gripAlts = GRIP_VARIATIONS[nameKey] || [];
      candidates = pool.filter((ex) => 
        gripAlts.some((alt) => 
          normalizeName(ex.name).includes(normalizeName(alt))
        )
      );
      break;
    }
    
    case 'angle': {
      // Check for angle variations
      const angleAlts = ANGLE_VARIATIONS[nameKey] || [];
      candidates = pool.filter((ex) => 
        angleAlts.some((alt) => 
          normalizeName(ex.name).includes(normalizeName(alt))
        )
      );
      break;
    }
    
    case 'exercise': {
      // Full exercise rotation - same pattern and muscle
      candidates = pool.filter((ex) => {
        if (ex.id === exercise.id) return false;
        const meta = buildExerciseMetadata(ex, context);
        return meta.patternSlot === pattern && 
               ex.primary_muscle === exercise.primary_muscle &&
               meta.tier !== 'specialty_only' &&
               meta.tier !== 'uncommon';
      });
      break;
    }
    
    default:
      return [];
  }
  
  // Score and sort candidates
  const scored = candidates.map((ex) => ({
    exercise: ex,
    score: buildExerciseMetadata(ex, context).compositeScore,
  }));
  
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.exercise).slice(0, 5);
}

/**
 * Get complete variation recommendation for an exercise
 */
export function getVariationRecommendation(
  exercise: ProgramExercise,
  context: VariationContext,
  pool: PoolExercise[],
  priorityContext: ExercisePriorityContext
): VariationRecommendation {
  const varyCheck = shouldVaryExercise(exercise, context);
  
  if (!varyCheck.shouldVary) {
    return {
      currentExercise: exercise,
      shouldVary: false,
      reason: varyCheck.reason,
      suggestedAlternatives: [],
      variationType: 'none',
      confidence: 'high',
    };
  }
  
  const alternatives = getVariationCandidates(
    exercise,
    pool,
    varyCheck.variationType,
    priorityContext
  );
  
  return {
    currentExercise: exercise,
    shouldVary: true,
    reason: varyCheck.reason,
    suggestedAlternatives: alternatives,
    variationType: varyCheck.variationType,
    confidence: alternatives.length > 0 ? 'high' : 'low',
  };
}

// ---------------------------------------------------------------------------
// Mesocycle Planning
// ---------------------------------------------------------------------------

export type MesocyclePlan = {
  week: number;
  volumeModifier: number; // 0.8 = -20%, 1.0 = base, 1.2 = +20%
  intensityModifier: number; // RPE target adjustment
  variationLevel: 'stable' | 'moderate' | 'high';
  deload: boolean;
};

/**
 * Generate a periodized mesocycle plan
 */
export function generateMesocyclePlan(
  weeks: number,
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
): MesocyclePlan[] {
  const plans: MesocyclePlan[] = [];
  
  // Accumulation weeks (weeks 1-3 or 1-4)
  const accumulationWeeks = experienceLevel === 'beginner' ? 3 : 4;
  
  for (let week = 1; week <= weeks; week++) {
    const isDeload = week % (accumulationWeeks + 1) === 0;
    const accumulationPhase = ((week - 1) % (accumulationWeeks + 1)) + 1;
    
    if (isDeload) {
      plans.push({
        week,
        volumeModifier: 0.6,
        intensityModifier: -1, // Lower RPE by 1
        variationLevel: 'stable',
        deload: true,
      });
    } else {
      // Progressive volume increase during accumulation
      const volumeProgression = 1 + (accumulationPhase - 1) * 0.1; // 1.0, 1.1, 1.2, 1.3
      
      plans.push({
        week,
        volumeModifier: Math.min(volumeProgression, 1.3),
        intensityModifier: 0,
        variationLevel: accumulationPhase >= 3 ? 'moderate' : 'stable',
        deload: false,
      });
    }
  }
  
  return plans;
}

// ---------------------------------------------------------------------------
// Exercise History Tracking
// ---------------------------------------------------------------------------

/**
 * Update exercise history after a workout session
 */
export function updateExerciseHistory(
  currentHistory: ExerciseHistory[],
  exercisesUsed: Array<{ id: string; name: string; performance?: number }>,
  sessionDate: Date
): ExerciseHistory[] {
  const history = new Map(currentHistory.map((h) => [h.exerciseId, { ...h }]));
  
  exercisesUsed.forEach((ex) => {
    const existing = history.get(ex.id);
    
    if (existing) {
      existing.lastUsed = sessionDate;
      existing.totalSessions += 1;
      existing.weeksUsed = Math.ceil(
        (sessionDate.getTime() - new Date(existing.firstUsed).getTime()) / 
        (1000 * 60 * 60 * 24 * 7)
      );
      if (ex.performance !== undefined) {
        // Rolling average of performance
        existing.averagePerformance = 
          ((existing.averagePerformance || ex.performance) + ex.performance) / 2;
      }
    } else {
      history.set(ex.id, {
        exerciseId: ex.id,
        exerciseName: ex.name,
        firstUsed: sessionDate,
        lastUsed: sessionDate,
        weeksUsed: 1,
        totalSessions: 1,
        averagePerformance: ex.performance,
      });
    }
  });
  
  return Array.from(history.values());
}

/**
 * Get exercises that need variation based on history
 */
export function getExercisesNeedingVariation(
  currentExercises: ProgramExercise[],
  history: ExerciseHistory[],
  currentWeek: number
): ProgramExercise[] {
  return currentExercises.filter((ex) => {
    const exHistory = getExerciseHistory(ex.id, history);
    if (!exHistory) return false;
    
    const classification = classifyExercise(ex);
    const strategy = VARIATION_STRATEGIES[classification.patternSlot];
    
    if (!strategy) return false;
    
    return exHistory.weeksUsed >= strategy.rotationWeeks;
  });
}
