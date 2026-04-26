/**
 * recovery-integration.ts
 *
 * Phase 4 Integration: Recovery Management
 *
 * Integrates recovery tracking and optimization with the periodization system.
 * Provides real-time recovery monitoring and auto-adjustments to training.
 */

import type { ExperienceLevel, PrimaryGoal } from './training-profile.ts';
import type { PeriodizedProgram, WeekPlan } from './periodization-integration.ts';
import {
  type RecoveryMetric,
  type RecoveryScore,
  type RestDayPlacement,
  type ActiveRecoverySession,
  type OverreachingStatus,
  type RecoveryRecommendation,
  type RecoverySummary,
  calculateRecoveryScore,
  optimizeRestDays,
  getActiveRecoverySession,
  detectOverreaching,
  generateRecoveryRecommendations,
  generateRecoverySummary,
  getNutritionTiming,
  generateSleepProtocol,
} from './recovery-management.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProgramWithRecovery = PeriodizedProgram & {
  recoveryTracking: {
    metrics: RecoveryMetric[];
    scores: RecoveryScore[];
    currentScore: RecoveryScore | null;
    overreachingStatus: OverreachingStatus;
  };
  adjustments: {
    volumeReduction: number; // 0-1 (0 = no reduction)
    intensityCap: number | null; // Max RPE allowed
    forcedRestDays: number[];
    autoDeloadTriggered: boolean;
  };
};

export type RecoveryAlert = {
  level: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  actions: string[];
  timestamp: string;
};

export type DailyCheckIn = {
  date: string;
  metrics: RecoveryMetric;
  score: RecoveryScore;
  recommendation: string;
  trainingAdjusted: boolean;
  alerts: RecoveryAlert[];
};

// ---------------------------------------------------------------------------
// Program Enhancement with Recovery
// ---------------------------------------------------------------------------

export function enhanceProgramWithRecovery(
  program: PeriodizedProgram,
  initialMetrics?: RecoveryMetric[]
): ProgramWithRecovery {
  const metrics = initialMetrics || [];

  // Calculate initial recovery state
  const currentScore =
    metrics.length > 0
      ? calculateRecoveryScore(
          metrics,
          program.progressionState.performanceHistory,
          program.profile.experienceLevel
        )
      : null;

  const overreachingStatus = detectOverreaching(
    metrics,
    program.progressionState.performanceHistory,
    program.profile.experienceLevel
  );

  // Determine adjustments needed
  const adjustments = calculateRecoveryAdjustments(
    currentScore,
    overreachingStatus,
    program
  );

  return {
    ...program,
    recoveryTracking: {
      metrics,
      scores: currentScore ? [currentScore] : [],
      currentScore,
      overreachingStatus,
    },
    adjustments,
  };
}

function calculateRecoveryAdjustments(
  score: RecoveryScore | null,
  overreaching: OverreachingStatus,
  program: PeriodizedProgram
): ProgramWithRecovery['adjustments'] {
  const adjustments: ProgramWithRecovery['adjustments'] = {
    volumeReduction: 0,
    intensityCap: null,
    forcedRestDays: [],
    autoDeloadTriggered: false,
  };

  if (!score) return adjustments;

  // Critical recovery status
  if (score.status === 'critical' || overreaching.state === 'overtrained') {
    adjustments.volumeReduction = 0.75; // 75% reduction
    adjustments.intensityCap = 7; // Max RPE 7
    adjustments.autoDeloadTriggered = true;
    return adjustments;
  }

  // Poor recovery or overreached
  if (score.status === 'poor' || overreaching.state === 'overreached') {
    adjustments.volumeReduction = 0.5; // 50% reduction
    adjustments.intensityCap = 7.5; // Max RPE 7.5
    adjustments.autoDeloadTriggered = true;
    return adjustments;
  }

  // Fair recovery - moderate adjustments
  if (score.status === 'fair') {
    adjustments.volumeReduction = 0.2; // 20% reduction

    // Cap intensity if nervous system is struggling
    if (score.nervousSystem < 50) {
      adjustments.intensityCap = 8;
    }
  }

  // Sleep-specific adjustments
  if (score.sleep < 50) {
    adjustments.forcedRestDays.push(getTomorrowDayOfWeek());
  }

  return adjustments;
}

function getTomorrowDayOfWeek(): number {
  return (new Date().getDay() + 1) % 7;
}

// ---------------------------------------------------------------------------
// Daily Recovery Check-In
// ---------------------------------------------------------------------------

export function processDailyCheckIn(
  program: ProgramWithRecovery,
  metric: RecoveryMetric
): { program: ProgramWithRecovery; checkIn: DailyCheckIn } {
  const updatedMetrics = [...program.recoveryTracking.metrics, metric];

  // Calculate new recovery score
  const newScore = calculateRecoveryScore(
    updatedMetrics,
    program.progressionState.performanceHistory,
    program.profile.experienceLevel
  );

  // Check overreaching status
  const overreachingStatus = detectOverreaching(
    updatedMetrics,
    program.progressionState.performanceHistory,
    program.profile.experienceLevel
  );

  // Generate alerts
  const alerts = generateRecoveryAlerts(newScore, overreachingStatus, program);

  // Determine if training needs adjustment
  const trainingAdjusted = shouldAdjustTraining(newScore, overreachingStatus);

  // Calculate new adjustments
  const newAdjustments = calculateRecoveryAdjustments(
    newScore,
    overreachingStatus,
    program
  );

  // Generate recommendation
  const recommendation = generateDailyRecommendation(
    newScore,
    overreachingStatus,
    program.profile.primaryGoal
  );

  const updatedProgram: ProgramWithRecovery = {
    ...program,
    recoveryTracking: {
      metrics: updatedMetrics,
      scores: [...program.recoveryTracking.scores, newScore],
      currentScore: newScore,
      overreachingStatus,
    },
    adjustments: newAdjustments,
  };

  const checkIn: DailyCheckIn = {
    date: metric.date,
    metrics: metric,
    score: newScore,
    recommendation,
    trainingAdjusted,
    alerts,
  };

  return { program: updatedProgram, checkIn };
}

function generateRecoveryAlerts(
  score: RecoveryScore,
  overreaching: OverreachingStatus,
  program: ProgramWithRecovery
): RecoveryAlert[] {
  const alerts: RecoveryAlert[] = [];

  // Critical alerts
  if (overreaching.state === 'overtrained') {
    alerts.push({
      level: 'critical',
      title: 'Overtraining Detected',
      message:
        'You are in a state of overtraining. Training has been suspended. Please consult a sports medicine professional.',
      actions: ['Schedule doctor appointment', 'Begin complete rest protocol', 'Monitor for 7+ days'],
      timestamp: new Date().toISOString(),
    });
  } else if (overreaching.state === 'overreached' && !overreaching.functional) {
    alerts.push({
      level: 'critical',
      title: 'Non-Functional Overreaching',
      message: 'You are overreached and not recovering. A mandatory deload is in effect.',
      actions: ['Reduce all volume by 50%', 'Cap intensity at RPE 7', 'Add 2 rest days this week'],
      timestamp: new Date().toISOString(),
    });
  }

  // Warning alerts
  if (overreaching.state === 'overreached' && overreaching.functional) {
    alerts.push({
      level: 'warning',
      title: 'Functional Overreaching',
      message:
        'You are pushing your limits. This can be beneficial if followed by proper recovery.',
      actions: ['Schedule deload next week', 'Prioritize sleep 9+ hours', 'Add active recovery'],
      timestamp: new Date().toISOString(),
    });
  }

  if (score.status === 'poor') {
    alerts.push({
      level: 'warning',
      title: 'Poor Recovery Status',
      message: `Your recovery score is ${score.overall}/100. Training adjustments recommended.`,
      actions: ['Reduce volume 20%', 'Review sleep hygiene', 'Check nutrition timing'],
      timestamp: new Date().toISOString(),
    });
  }

  // Info alerts for specific metrics
  if (score.sleep < 60) {
    alerts.push({
      level: 'warning',
      title: 'Sleep Quality Low',
      message: 'Your sleep score indicates poor recovery at night.',
      actions: ['Set consistent bedtime', 'Eliminate screens 1 hour before bed', 'Consider magnesium'],
      timestamp: new Date().toISOString(),
    });
  }

  if (score.muscleRecovery < 60) {
    alerts.push({
      level: 'info',
      title: 'Elevated Muscle Soreness',
      message: 'Your muscles need more time to recover.',
      actions: ['Add foam rolling session', 'Increase protein intake', 'Consider contrast therapy'],
      timestamp: new Date().toISOString(),
    });
  }

  if (score.nervousSystem < 60) {
    alerts.push({
      level: 'info',
      title: 'Nervous System Fatigue',
      message: 'Your CNS is showing signs of fatigue.',
      actions: ['Practice box breathing', 'Reduce caffeine', 'Add meditation'],
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
}

function shouldAdjustTraining(score: RecoveryScore, overreaching: OverreachingStatus): boolean {
  if (overreaching.state === 'overtrained') return true;
  if (overreaching.state === 'overreached') return true;
  if (score.status === 'poor' || score.status === 'critical') return true;
  if (score.sleep < 50) return true;
  return false;
}

function generateDailyRecommendation(
  score: RecoveryScore,
  overreaching: OverreachingStatus,
  goal: PrimaryGoal
): string {
  if (overreaching.state === 'overtrained') {
    return 'TRAINING SUSPENDED: Complete rest required. Focus on sleep, nutrition, and stress reduction.';
  }

  if (overreaching.state === 'overreached') {
    return 'DELOAD ACTIVE: Training volume reduced 50%. Prioritize recovery activities.';
  }

  if (score.status === 'poor') {
    return 'RECOVERY FOCUSED: Consider reducing volume 20% today. Prioritize sleep tonight.';
  }

  if (score.status === 'fair') {
    if (score.sleep < 60) {
      return 'SLEEP PRIORITY: Your sleep needs attention. Aim for 8+ hours tonight.';
    }
    if (score.muscleRecovery < 60) {
      return 'ACTIVE RECOVERY: Light cardio or stretching recommended to aid muscle recovery.';
    }
    return 'PROCEED WITH CAUTION: Monitor how you feel during warm-up sets.';
  }

  if (score.status === 'good') {
    return 'READY TO TRAIN: Recovery looks good. Proceed with planned workout.';
  }

  return 'OPTIMAL: Excellent recovery status. Ideal conditions for a great workout!';
}

// ---------------------------------------------------------------------------
// Week Plan Adjustment Based on Recovery
// ---------------------------------------------------------------------------

export function adjustWeekPlanForRecovery(
  weekPlan: WeekPlan,
  program: ProgramWithRecovery
): WeekPlan {
  const { adjustments, recoveryTracking } = program;

  if (!adjustments.autoDeloadTriggered && adjustments.volumeReduction === 0) {
    return weekPlan; // No adjustments needed
  }

  const adjustedDays = weekPlan.days.map((day) => {
    const adjustedExercises = day.exercises.map((ex) => {
      // Apply volume reduction
      const adjustedSets = Math.max(
        1,
        Math.round(ex.sets * (1 - adjustments.volumeReduction))
      );

      // Apply intensity cap
      let adjustedRpe = ex.targetRPE;
      if (adjustments.intensityCap !== null) {
        adjustedRpe = Math.min(ex.targetRPE, adjustments.intensityCap);
      }

      return {
        ...ex,
        sets: adjustedSets,
        targetRPE: adjustedRpe,
        progressionNote: `${ex.progressionNote || ''} (Adjusted for recovery: ${Math.round(
          adjustments.volumeReduction * 100
        )}% volume reduction)`,
      };
    });

    return {
      ...day,
      exercises: adjustedExercises,
      totalSets: adjustedExercises.reduce((sum, e) => sum + e.sets, 0),
    };
  });

  return {
    ...weekPlan,
    days: adjustedDays,
    notes: [
      ...weekPlan.notes,
      `⚠️ Recovery-based adjustments applied: ${Math.round(
        adjustments.volumeReduction * 100
      )}% volume reduction`,
      ...(adjustments.intensityCap
        ? [`Intensity capped at RPE ${adjustments.intensityCap}`]
        : []),
      ...(recoveryTracking.overreachingStatus.state !== 'adequate'
        ? [`Overreaching status: ${recoveryTracking.overreachingStatus.state}`]
        : []),
    ],
  };
}

// ---------------------------------------------------------------------------
// Rest Day Management
// ---------------------------------------------------------------------------

export function getRestDayRecommendations(
  program: ProgramWithRecovery
): {
  placements: RestDayPlacement[];
  activeRecovery: ActiveRecoverySession | null;
  nutritionTiming: ReturnType<typeof getNutritionTiming>;
} {
  const trainingDays = getTrainingDaysFromProgram(program);
  const daysPerWeek = program.profile.daysPerWeek;

  const placements = optimizeRestDays(
    daysPerWeek,
    trainingDays,
    program.recoveryTracking.scores,
    program.profile.experienceLevel
  );

  const activeRecovery = program.recoveryTracking.currentScore
    ? getActiveRecoverySession(
        program.recoveryTracking.currentScore,
        false,
        program.profile.primaryGoal
      )
    : null;

  const nutritionTiming = getNutritionTiming(
    'rest_day',
    'morning',
    program.profile.primaryGoal
  );

  return { placements, activeRecovery, nutritionTiming };
}

function getTrainingDaysFromProgram(program: ProgramWithRecovery): number[] {
  // Simplified - assumes standard distribution
  const daysPerWeek = program.profile.daysPerWeek;
  const allDays = [1, 2, 3, 4, 5]; // Mon-Fri default

  if (daysPerWeek === 3) return [1, 3, 5]; // Mon/Wed/Fri
  if (daysPerWeek === 4) return [1, 2, 4, 5]; // Mon/Tue/Thu/Fri
  if (daysPerWeek === 5) return [1, 2, 3, 4, 5]; // Mon-Fri
  if (daysPerWeek === 6) return [1, 2, 3, 4, 5, 6]; // Mon-Sat

  return allDays.slice(0, daysPerWeek);
}

// ---------------------------------------------------------------------------
// Recovery Summary for Display
// ---------------------------------------------------------------------------

export type EnhancedProgramSummary = {
  programOverview: {
    name: string;
    currentWeek: number;
    totalWeeks: number;
    protocol: string;
  };
  recoveryStatus: {
    currentScore: number;
    status: string;
    trend: string;
    overreachingState: string;
  };
  today: {
    recommendation: string;
    alerts: RecoveryAlert[];
    trainingAdjusted: boolean;
  };
  adjustments: {
    volumeReduction: string;
    intensityCap: string | null;
    autoDeload: boolean;
  };
  recommendations: RecoveryRecommendation[];
  restDays: RestDayPlacement[];
};

export function generateEnhancedSummary(program: ProgramWithRecovery): EnhancedProgramSummary {
  const currentScore = program.recoveryTracking.currentScore;
  const overreaching = program.recoveryTracking.overreachingStatus;

  const recommendations = generateRecoveryRecommendations(
    currentScore || {
      overall: 50,
      sleep: 50,
      muscleRecovery: 50,
      nervousSystem: 50,
      hydration: 50,
      timestamp: new Date().toISOString(),
      trend: 'stable',
      status: 'fair',
    },
    overreaching,
    program.profile.primaryGoal,
    program.profile.experienceLevel
  );

  const { placements: restDays } = getRestDayRecommendations(program);

  return {
    programOverview: {
      name: program.programId,
      currentWeek: program.currentWeek,
      totalWeeks: program.totalWeeks,
      protocol: program.protocol.name,
    },
    recoveryStatus: {
      currentScore: currentScore?.overall || 50,
      status: currentScore?.status || 'fair',
      trend: currentScore?.trend || 'stable',
      overreachingState: overreaching.state,
    },
    today: {
      recommendation: generateDailyRecommendation(
        currentScore || {
          overall: 50,
          sleep: 50,
          muscleRecovery: 50,
          nervousSystem: 50,
          hydration: 50,
          timestamp: new Date().toISOString(),
          trend: 'stable',
          status: 'fair',
        },
        overreaching,
        program.profile.primaryGoal
      ),
      alerts: [], // Would be populated from recent check-ins
      trainingAdjusted: program.adjustments.autoDeloadTriggered || program.adjustments.volumeReduction > 0,
    },
    adjustments: {
      volumeReduction: `${Math.round(program.adjustments.volumeReduction * 100)}%`,
      intensityCap: program.adjustments.intensityCap ? `RPE ${program.adjustments.intensityCap}` : null,
      autoDeload: program.adjustments.autoDeloadTriggered,
    },
    recommendations,
    restDays,
  };
}

// ---------------------------------------------------------------------------
// Export Recovery System
// ---------------------------------------------------------------------------

export const RecoverySystem = {
  // Core functions
  enhanceProgramWithRecovery,
  processDailyCheckIn,
  adjustWeekPlanForRecovery,
  getRestDayRecommendations,
  generateEnhancedSummary,

  // Re-exports for convenience
  calculateRecoveryScore,
  optimizeRestDays,
  getActiveRecoverySession,
  detectOverreaching,
  generateRecoveryRecommendations,
  generateRecoverySummary,
  getNutritionTiming,
  generateSleepProtocol,
};
