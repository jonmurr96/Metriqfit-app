/**
 * progression-tracker.ts
 *
 * Progressive Overload Tracking System for Sprint 4
 * 
 * Tracks user's performance over time and provides recommendations for:
 * - When to increase weight
 * - When to add reps
 * - When to add sets
 * - Progression rate analysis
 * 
 * Based on scientific principles of strength and hypertrophy progression.
 */

import type { LoggingSet } from './logging-state.ts';
import type { ProgramExercise } from './programMappingRules.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExercisePerformance = {
  exerciseId: string;
  exerciseName: string;
  date: Date;
  sets: LoggingSet[];
  /** Estimated 1RM based on performance */
  estimated1RM: number | null;
  /** Volume load (weight × reps across all sets) */
  totalVolume: number;
  /** Best set (highest weight) */
  bestSet: { weight: number; reps: number } | null;
  /** Average RPE across working sets */
  averageRPE: number | null;
};

export type ProgressionTrend = {
  exerciseId: string;
  exerciseName: string;
  /** Time period in weeks */
  periodWeeks: number;
  /** Whether user is progressing */
  isProgressing: boolean;
  /** Progression rate (strength gain per week) */
  progressionRate: number;
  /** Volume trend (volume change per week) */
  volumeTrend: number;
  /** Recent performances */
  recentPerformances: ExercisePerformance[];
  /** Benchmark comparison */
  vsBenchmark: 'above' | 'on_track' | 'below';
  /** Specific recommendation */
  recommendation: ProgressionRecommendation;
};

export type ProgressionRecommendation = {
  action: 'increase_weight' | 'add_rep' | 'add_set' | 'maintain' | 'deload' | 'change_exercise';
  reason: string;
  /** Specific guidance */
  guidance: string;
  /** Confidence in recommendation */
  confidence: 'high' | 'medium' | 'low';
  /** Target for next session */
  target?: {
    weight?: number;
    reps?: number;
    sets?: number;
    rpe?: number;
  };
};

export type ProgressionContext = {
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  primaryGoal: 'strength' | 'hypertrophy' | 'general_fitness';
  /** Minimum weeks of data needed for recommendations */
  minDataWeeks?: number;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Expected weekly progression rates by experience level */
const EXPECTED_WEEKLY_PROGRESSION: Record<string, Record<string, number>> = {
  beginner: { strength: 0.025, hypertrophy: 0.015 }, // 2.5% strength, 1.5% hypertrophy
  intermediate: { strength: 0.01, hypertrophy: 0.008 }, // 1% strength, 0.8% hypertrophy
  advanced: { strength: 0.005, hypertrophy: 0.004 }, // 0.5% strength, 0.4% hypertrophy
};

/** RPE targets by goal */
const RPE_TARGETS: Record<string, number> = {
  strength: 8.5,    // Heavy, 1-2 reps in reserve
  hypertrophy: 8,   // Moderate-heavy, 2 reps in reserve
  general_fitness: 7, // Moderate, 3 reps in reserve
};

/** Minimum sessions before recommendations */
const MIN_SESSIONS_FOR_RECOMMENDATION = 3;

/** Stagnation threshold (weeks without progress) */
const STAGNATION_THRESHOLD_WEEKS = 2;

// ---------------------------------------------------------------------------
// 1RM Estimation
// ---------------------------------------------------------------------------

/**
 * Estimate 1RM using Epley formula
 * 1RM = weight × (1 + reps/30)
 */
export function estimate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps > 12) return weight * (1 + 12 / 30); // Less accurate above 12 reps
  return weight * (1 + reps / 30);
}

/**
 * Calculate estimated 1RM from a set of logged sets
 */
export function calculateEstimated1RM(sets: LoggingSet[]): number | null {
  const workingSets = sets.filter((s) => !s.is_warmup && s.weight_lb && s.reps);
  if (workingSets.length === 0) return null;
  
  // Use the set with highest estimated 1RM
  const estimated1RMs = workingSets.map((s) => estimate1RM(s.weight_lb || 0, s.reps));
  return Math.max(...estimated1RMs);
}

// ---------------------------------------------------------------------------
// Performance Analysis
// ---------------------------------------------------------------------------

/**
 * Analyze a single exercise performance
 */
export function analyzePerformance(
  exerciseId: string,
  exerciseName: string,
  date: Date,
  sets: LoggingSet[]
): ExercisePerformance {
  const workingSets = sets.filter((s) => !s.is_warmup);
  
  const totalVolume = workingSets.reduce(
    (sum, s) => sum + (s.weight_lb || 0) * s.reps,
    0
  );
  
  const bestSet = workingSets.reduce((best, s) => {
    if (!s.weight_lb) return best;
    if (!best || s.weight_lb > best.weight) {
      return { weight: s.weight_lb, reps: s.reps };
    }
    return best;
  }, null as { weight: number; reps: number } | null);
  
  const rpeValues = workingSets
    .map((s) => s.rpe)
    .filter((rpe): rpe is number => rpe !== null && rpe !== undefined);
  
  const averageRPE = rpeValues.length > 0
    ? rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length
    : null;
  
  return {
    exerciseId,
    exerciseName,
    date,
    sets,
    estimated1RM: calculateEstimated1RM(sets),
    totalVolume,
    bestSet,
    averageRPE,
  };
}

// ---------------------------------------------------------------------------
// Trend Analysis
// ---------------------------------------------------------------------------

/**
 * Calculate linear regression slope
 */
function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;
  
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return slope;
}

/**
 * Analyze progression trend for an exercise
 */
export function analyzeProgressionTrend(
  exerciseId: string,
  exerciseName: string,
  performances: ExercisePerformance[],
  context: ProgressionContext
): ProgressionTrend {
  const sorted = [...performances].sort((a, b) => a.date.getTime() - b.date.getTime());
  const periodWeeks = sorted.length > 0
    ? Math.ceil(
        (sorted[sorted.length - 1].date.getTime() - sorted[0].date.getTime()) / 
        (1000 * 60 * 60 * 24 * 7)
      )
    : 0;
  
  if (sorted.length < MIN_SESSIONS_FOR_RECOMMENDATION) {
    return {
      exerciseId,
      exerciseName,
      periodWeeks,
      isProgressing: false,
      progressionRate: 0,
      volumeTrend: 0,
      recentPerformances: sorted,
      vsBenchmark: 'on_track',
      recommendation: {
        action: 'maintain',
        reason: 'Insufficient data for progression analysis',
        guidance: 'Continue with current weights for at least 3 sessions before adjusting',
        confidence: 'low',
      },
    };
  }
  
  // Analyze 1RM trend
  const oneRMs = sorted.map((p) => p.estimated1RM).filter((v): v is number => v !== null);
  const oneRMTrend = calculateTrend(oneRMs);
  const progressionRate = periodWeeks > 0 ? oneRMTrend / periodWeeks : 0;
  
  // Analyze volume trend
  const volumes = sorted.map((p) => p.totalVolume);
  const volumeTrend = calculateTrend(volumes);
  
  // Determine if progressing
  const isProgressing = progressionRate > 0.5; // 0.5 lbs/week minimum
  
  // Compare to expected progression
  const expectedRate = EXPECTED_WEEKLY_PROGRESSION[context.experienceLevel]?.[context.primaryGoal] || 0.01;
  const vsBenchmark = progressionRate >= expectedRate ? 'above' : 
                      progressionRate >= expectedRate * 0.5 ? 'on_track' : 'below';
  
  // Generate recommendation
  const recommendation = generateProgressionRecommendation(
    sorted,
    isProgressing,
    vsBenchmark,
    context
  );
  
  return {
    exerciseId,
    exerciseName,
    periodWeeks,
    isProgressing,
    progressionRate,
    volumeTrend,
    recentPerformances: sorted,
    vsBenchmark,
    recommendation,
  };
}

// ---------------------------------------------------------------------------
// Recommendation Engine
// ---------------------------------------------------------------------------

function generateProgressionRecommendation(
  performances: ExercisePerformance[],
  isProgressing: boolean,
  vsBenchmark: ProgressionTrend['vsBenchmark'],
  context: ProgressionContext
): ProgressionRecommendation {
  const latest = performances[performances.length - 1];
  const previous = performances.length > 1 ? performances[performances.length - 2] : null;
  
  const rpeTarget = RPE_TARGETS[context.primaryGoal];
  const currentRPE = latest.averageRPE;
  
  // Case 1: Stagnant for 2+ sessions with low RPE
  if (!isProgressing && currentRPE && currentRPE < rpeTarget - 1 && performances.length >= 3) {
    return {
      action: 'increase_weight',
      reason: 'Performance stagnant but effort level is low',
      guidance: `Increase weight by 5-10 lbs (or 2.5-5 kg). Current RPE (${currentRPE.toFixed(1)}) is below target (${rpeTarget})`,
      confidence: 'high',
      target: {
        weight: latest.bestSet ? latest.bestSet.weight + 5 : undefined,
        rpe: rpeTarget,
      },
    };
  }
  
  // Case 2: Progressing well, maintain current approach
  if (isProgressing && vsBenchmark === 'above') {
    return {
      action: 'maintain',
      reason: 'Progressing above expected rate',
      guidance: 'Continue with current progression. Add weight when you can complete all sets at target reps with good form.',
      confidence: 'high',
    };
  }
  
  // Case 3: Below benchmark but progressing
  if (isProgressing && vsBenchmark === 'below') {
    return {
      action: 'add_rep',
      reason: 'Progressing but below target rate',
      guidance: 'Add 1-2 reps to your working sets before increasing weight. Focus on form and mind-muscle connection.',
      confidence: 'medium',
      target: {
        reps: latest.bestSet ? latest.bestSet.reps + 1 : undefined,
      },
    };
  }
  
  // Case 4: Stagnant with high RPE
  if (!isProgressing && currentRPE && currentRPE >= rpeTarget + 0.5) {
    // Check if volume is too high
    const recentVolumes = performances.slice(-3).map((p) => p.totalVolume);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    
    if (avgVolume > latest.totalVolume * 1.1) {
      return {
        action: 'deload',
        reason: 'Stagnant despite high effort - potential overreaching',
        guidance: 'Reduce volume by 40% for 1 week. Use this time to recover and return stronger.',
        confidence: 'medium',
        target: {
          sets: Math.max(2, Math.floor(performances[0].sets.length * 0.6)),
          rpe: rpeTarget - 1,
        },
      };
    }
    
    return {
      action: 'maintain',
      reason: 'Stagnant at high effort - may need recovery',
      guidance: 'Maintain current weight. Focus on recovery (sleep, nutrition, stress). Consider a deload next week if no improvement.',
      confidence: 'medium',
    };
  }
  
  // Case 5: New exercise or insufficient data
  if (performances.length < 3) {
    return {
      action: 'maintain',
      reason: 'Learning the movement pattern',
      guidance: 'Focus on perfecting form. Add weight only when you can complete all sets with excellent technique.',
      confidence: 'medium',
    };
  }
  
  // Default: maintain
  return {
    action: 'maintain',
    reason: 'Stable performance within normal range',
    guidance: 'Continue with current weights. Progress when you can exceed target reps on all sets.',
    confidence: 'medium',
  };
}

// ---------------------------------------------------------------------------
// Volume Progression
// ---------------------------------------------------------------------------

export type VolumeProgressionRecommendation = {
  currentSets: number;
  recommendedSets: number;
  reason: string;
  timing: 'this_week' | 'next_week' | 'next_cycle';
};

/**
 * Recommend volume changes based on recovery and performance
 */
export function recommendVolumeProgression(
  exerciseId: string,
  performances: ExercisePerformance[],
  context: ProgressionContext
): VolumeProgressionRecommendation | null {
  if (performances.length < 4) return null;
  
  const recent = performances.slice(-4);
  const avgRPE = recent.reduce((sum, p) => sum + (p.averageRPE || 0), 0) / recent.length;
  const recoveryRate = calculateTrend(recent.map((p) => p.totalVolume));
  
  const currentSets = recent[0].sets.filter((s) => !s.is_warmup).length;
  
  // If recovering well and RPE is manageable, can add volume
  if (recoveryRate > 0 && avgRPE < RPE_TARGETS[context.primaryGoal]) {
    if (currentSets < 5) {
      return {
        currentSets,
        recommendedSets: currentSets + 1,
        reason: 'Recovering well with manageable effort',
        timing: 'next_week',
      };
    }
  }
  
  // If struggling to recover, reduce volume
  if (recoveryRate < 0 && avgRPE > RPE_TARGETS[context.primaryGoal] + 1) {
    if (currentSets > 3) {
      return {
        currentSets,
        recommendedSets: currentSets - 1,
        reason: 'High fatigue and poor recovery',
        timing: 'this_week',
      };
    }
  }
  
  return null;
}

// ---------------------------------------------------------------------------
// Plateau Detection
// ---------------------------------------------------------------------------

export type PlateauStatus = {
  isPlateaued: boolean;
  plateauWeeks: number;
  severity: 'mild' | 'moderate' | 'severe';
  recommendedAction: string;
};

/**
 * Detect if user has plateaued on an exercise
 */
export function detectPlateau(
  performances: ExercisePerformance[],
  weeksToCheck: number = 3
): PlateauStatus {
  if (performances.length < weeksToCheck) {
    return { isPlateaued: false, plateauWeeks: 0, severity: 'mild', recommendedAction: 'continue' };
  }
  
  const recent = performances.slice(-weeksToCheck);
  const oneRMs = recent.map((p) => p.estimated1RM).filter((v): v is number => v !== null);
  
  if (oneRMs.length < weeksToCheck) {
    return { isPlateaued: false, plateauWeeks: 0, severity: 'mild', recommendedAction: 'continue' };
  }
  
  // Check if 1RMs are essentially flat (within 2% variance)
  const max1RM = Math.max(...oneRMs);
  const min1RM = Math.min(...oneRMs);
  const variance = (max1RM - min1RM) / max1RM;
  
  if (variance < 0.02) {
    const severity: PlateauStatus['severity'] = weeksToCheck >= 4 ? 'severe' : 
                                                weeksToCheck >= 3 ? 'moderate' : 'mild';
    return {
      isPlateaued: true,
      plateauWeeks: weeksToCheck,
      severity,
      recommendedAction: severity === 'severe' ? 'change_exercise' : 'deload',
    };
  }
  
  return { isPlateaued: false, plateauWeeks: 0, severity: 'mild', recommendedAction: 'continue' };
}

// ---------------------------------------------------------------------------
// Summary Analysis
// ---------------------------------------------------------------------------

export type OverallProgressionSummary = {
  exercisesAnalyzed: number;
  exercisesProgressing: number;
  exercisesPlateaued: number;
  exercisesNeedAttention: number;
  overallTrend: 'improving' | 'stable' | 'declining';
  recommendations: string[];
};

/**
 * Generate overall progression summary
 */
export function generateProgressionSummary(
  trends: ProgressionTrend[]
): OverallProgressionSummary {
  const progressing = trends.filter((t) => t.isProgressing).length;
  const plateaued = trends.filter((t) => detectPlateau(t.recentPerformances).isPlateaued).length;
  const needAttention = trends.filter((t) => t.vsBenchmark === 'below').length;
  
  const avgProgressionRate = trends.reduce((sum, t) => sum + t.progressionRate, 0) / trends.length;
  
  const overallTrend: OverallProgressionSummary['overallTrend'] = 
    avgProgressionRate > 0.5 ? 'improving' : 
    avgProgressionRate > -0.5 ? 'stable' : 'declining';
  
  const recommendations: string[] = [];
  
  if (progressing / trends.length > 0.7) {
    recommendations.push('Great progress! Most exercises showing improvement.');
  }
  
  if (plateaued > 0) {
    recommendations.push(`${plateaued} exercise(s) plateaued. Consider deload or exercise variation.`);
  }
  
  if (needAttention > trends.length * 0.3) {
    recommendations.push('Multiple exercises below target. Review recovery, nutrition, and stress.');
  }
  
  return {
    exercisesAnalyzed: trends.length,
    exercisesProgressing: progressing,
    exercisesPlateaued: plateaued,
    exercisesNeedAttention: needAttention,
    overallTrend,
    recommendations,
  };
}
