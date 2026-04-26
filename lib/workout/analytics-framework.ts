/**
 * analytics-framework.ts
 *
 * Analytics & Performance Tracking
 * Part of Phase 5: Testing & Validation
 *
 * Tracks program effectiveness, user engagement, and performance metrics.
 * Provides insights for continuous improvement.
 */

import type { ExperienceLevel, PrimaryGoal } from './training-profile.ts';
import type { PeriodizedProgram, WeekPlan } from './periodization-integration.ts';
import type { ProgramWithRecovery, RecoveryMetric } from './recovery-system.ts';

// ---------------------------------------------------------------------------
// Analytics Types
// ---------------------------------------------------------------------------

export type ProgramMetrics = {
  programId: string;
  userId: string;
  createdAt: string;
  completedAt?: string;
  status: 'active' | 'completed' | 'abandoned';

  // Engagement
  totalWorkoutsPlanned: number;
  totalWorkoutsCompleted: number;
  completionRate: number;
  averageSessionsPerWeek: number;
  adherenceScore: number; // 0-100

  // Performance
  startingWeights: Record<string, number>;
  currentWeights: Record<string, number>;
  strengthImprovements: Record<string, number>; // Percentage
  volumeProgression: number[]; // Weekly volume

  // Recovery
  averageRecoveryScore: number;
  recoveryTrend: 'improving' | 'stable' | 'declining';
  deloadsTriggered: number;
  overreachingEvents: number;

  // Time
  averageWorkoutDuration: number;
  totalTimeInvested: number; // minutes
  restDayAdherence: number;
};

export type UserEngagementMetrics = {
  userId: string;
  totalPrograms: number;
  totalWorkoutsCompleted: number;
  lifetimeVolume: number; // Total lbs moved
  currentStreak: number; // Days
  longestStreak: number;
  favoriteExercises: string[];
  weakestAreas: string[];
  preferredWorkoutTime: string;
  checkInFrequency: number; // Percentage
};

export type CohortMetrics = {
  cohortId: string;
  definition: {
    experienceLevel?: ExperienceLevel;
    primaryGoal?: PrimaryGoal;
    dateRange: { start: string; end: string };
  };
  userCount: number;
  averageCompletionRate: number;
  averageAdherenceScore: number;
  averageStrengthGain: number;
  churnRate: number;
  topPerformingExercises: string[];
  commonDropOffWeek: number;
};

export type PerformanceInsight = {
  type: 'strength' | 'volume' | 'recovery' | 'engagement';
  title: string;
  description: string;
  metric: number;
  percentile: number; // vs cohort
  trend: 'up' | 'down' | 'stable';
  recommendation: string;
};

// ---------------------------------------------------------------------------
// Program Analytics
// ---------------------------------------------------------------------------

export function calculateProgramMetrics(
  program: ProgramWithRecovery,
  completedWorkouts: Array<{ week: number; day: number; date: string }>
): ProgramMetrics {
  const weeksCompleted = program.currentWeek - 1;
  const totalPlanned = program.totalWeeks * program.profile.daysPerWeek;
  const totalCompleted = completedWorkouts.length;

  // Calculate completion rate
  const completionRate = totalPlanned > 0 ? (totalCompleted / totalPlanned) * 100 : 0;

  // Calculate adherence score (weighted by recent activity)
  const adherenceScore = Math.min(100, completionRate * (weeksCompleted / program.totalWeeks));

  // Calculate average recovery score
  const recoveryScores = program.recoveryTracking.scores;
  const averageRecoveryScore =
    recoveryScores.length > 0
      ? recoveryScores.reduce((sum, s) => sum + s.overall, 0) / recoveryScores.length
      : 50;

  // Determine recovery trend
  let recoveryTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (recoveryScores.length >= 3) {
    const recent = recoveryScores.slice(-3);
    const avgRecent = recent.reduce((sum, s) => sum + s.overall, 0) / 3;
    const avgPrevious =
      recoveryScores.slice(-6, -3).reduce((sum, s) => sum + s.overall, 0) / 3 || avgRecent;

    if (avgRecent > avgPrevious + 5) recoveryTrend = 'improving';
    else if (avgRecent < avgPrevious - 5) recoveryTrend = 'declining';
  }

  // Extract weight progression
  const { startingWeights, currentWeights, strengthImprovements } = extractWeightProgression(
    program,
    completedWorkouts
  );

  // Calculate volume progression
  const volumeProgression = calculateVolumeProgression(program, completedWorkouts);

  return {
    programId: program.programId,
    userId: program.userId,
    createdAt: new Date().toISOString(),
    status: weeksCompleted >= program.totalWeeks ? 'completed' : 'active',

    totalWorkoutsPlanned: totalPlanned,
    totalWorkoutsCompleted: totalCompleted,
    completionRate,
    averageSessionsPerWeek: weeksCompleted > 0 ? totalCompleted / weeksCompleted : 0,
    adherenceScore,

    startingWeights,
    currentWeights,
    strengthImprovements,
    volumeProgression,

    averageRecoveryScore,
    recoveryTrend,
    deloadsTriggered: countDeloads(program),
    overreachingEvents: countOverreachingEvents(program),

    averageWorkoutDuration: calculateAverageWorkoutDuration(program),
    totalTimeInvested: calculateTotalTime(program, completedWorkouts),
    restDayAdherence: calculateRestDayAdherence(program, completedWorkouts),
  };
}

function extractWeightProgression(
  program: ProgramWithRecovery,
  completedWorkouts: Array<{ week: number; day: number }>
): {
  startingWeights: Record<string, number>;
  currentWeights: Record<string, number>;
  strengthImprovements: Record<string, number>;
} {
  const startingWeights: Record<string, number> = {};
  const currentWeights: Record<string, number> = {};

  // Scan all weeks for exercise weights
  program.weeks.forEach((week) => {
    week.days.forEach((day) => {
      day.exercises.forEach((ex) => {
        if (ex.weight && ex.weight > 0) {
          const name = ex.exerciseName;
          if (!startingWeights[name]) {
            startingWeights[name] = ex.weight;
          }
          currentWeights[name] = ex.weight;
        }
      });
    });
  });

  // Calculate improvements
  const strengthImprovements: Record<string, number> = {};
  Object.keys(currentWeights).forEach((exercise) => {
    const start = startingWeights[exercise];
    const current = currentWeights[exercise];
    if (start && current) {
      strengthImprovements[exercise] = ((current - start) / start) * 100;
    }
  });

  return { startingWeights, currentWeights, strengthImprovements };
}

function calculateVolumeProgression(
  program: ProgramWithRecovery,
  completedWorkouts: Array<{ week: number; day: number }>
): number[] {
  const weeklyVolume: number[] = [];

  program.weeks.forEach((week, weekIndex) => {
    const weekWorkouts = completedWorkouts.filter((w) => w.week === weekIndex + 1);
    let weekVolume = 0;

    weekWorkouts.forEach((workout) => {
      const day = week.days[workout.day];
      if (day) {
        day.exercises.forEach((ex) => {
          const weight = ex.weight || 0;
          const sets = ex.sets;
          const reps = parseInt(ex.reps.split('-')[0]) || 10;
          weekVolume += weight * sets * reps;
        });
      }
    });

    weeklyVolume.push(weekVolume);
  });

  return weeklyVolume;
}

function countDeloads(program: ProgramWithRecovery): number {
  return program.weeks.filter((w) => w.isDeload).length;
}

function countOverreachingEvents(program: ProgramWithRecovery): number {
  // Count instances of poor/critical recovery
  return program.recoveryTracking.scores.filter(
    (s) => s.status === 'poor' || s.status === 'critical'
  ).length;
}

function calculateAverageWorkoutDuration(program: ProgramWithRecovery): number {
  const allDurations = program.weeks.flatMap((w) => w.days.map((d) => d.estimatedDuration));
  return allDurations.length > 0
    ? allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length
    : 0;
}

function calculateTotalTime(
  program: ProgramWithRecovery,
  completedWorkouts: Array<{ week: number; day: number }>
): number {
  let total = 0;

  completedWorkouts.forEach((workout) => {
    const week = program.weeks[workout.week - 1];
    if (week) {
      const day = week.days[workout.day];
      if (day) {
        total += day.estimatedDuration;
      }
    }
  });

  return total;
}

function calculateRestDayAdherence(
  program: ProgramWithRecovery,
  completedWorkouts: Array<{ week: number; day: number; date: string }>
): number {
  // Simplified - assumes proper rest if not overreached
  const overreachingEvents = countOverreachingEvents(program);
  const totalWeeks = program.currentWeek;

  if (totalWeeks === 0) return 100;

  return Math.max(0, 100 - (overreachingEvents / totalWeeks) * 20);
}

// ---------------------------------------------------------------------------
// User Engagement Analytics
// ---------------------------------------------------------------------------

export function calculateUserEngagement(
  userId: string,
  allPrograms: ProgramWithRecovery[],
  completedWorkouts: Array<{ programId: string; week: number; day: number; date: string }>
): UserEngagementMetrics {
  // Calculate streaks
  const { currentStreak, longestStreak } = calculateStreaks(completedWorkouts);

  // Calculate lifetime volume
  const lifetimeVolume = allPrograms.reduce((sum, program) => {
    const programWorkouts = completedWorkouts.filter((w) => w.programId === program.programId);
    return sum + calculateTotalTime(program, programWorkouts);
  }, 0);

  // Find favorite exercises
  const exerciseFrequency: Record<string, number> = {};
  allPrograms.forEach((program) => {
    program.weeks.forEach((week) => {
      week.days.forEach((day) => {
        day.exercises.forEach((ex) => {
          exerciseFrequency[ex.exerciseName] = (exerciseFrequency[ex.exerciseName] || 0) + 1;
        });
      });
    });
  });

  const favoriteExercises = Object.entries(exerciseFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  // Identify weakest areas (lowest volume muscles)
  const muscleVolume: Record<string, number> = {};
  allPrograms.forEach((program) => {
    program.weeks.forEach((week) => {
      week.days.forEach((day) => {
        day.exercises.forEach((ex) => {
          const muscle = ex.slot.pattern; // Simplified
          muscleVolume[muscle] = (muscleVolume[muscle] || 0) + ex.sets;
        });
      });
    });
  });

  const weakestAreas = Object.entries(muscleVolume)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([name]) => name);

  // Calculate check-in frequency
  const totalCheckIns = allPrograms.reduce(
    (sum, p) => sum + p.recoveryTracking.metrics.length,
    0
  );
  const expectedCheckIns = allPrograms.reduce((sum, p) => sum + p.totalWeeks * 7, 0);
  const checkInFrequency = expectedCheckIns > 0 ? (totalCheckIns / expectedCheckIns) * 100 : 0;

  return {
    userId,
    totalPrograms: allPrograms.length,
    totalWorkoutsCompleted: completedWorkouts.length,
    lifetimeVolume,
    currentStreak,
    longestStreak,
    favoriteExercises,
    weakestAreas,
    preferredWorkoutTime: inferPreferredWorkoutTime(completedWorkouts),
    checkInFrequency,
  };
}

function calculateStreaks(
  completedWorkouts: Array<{ date: string }>
): { currentStreak: number; longestStreak: number } {
  if (completedWorkouts.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Sort by date
  const sorted = [...completedWorkouts].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const today = new Date();
  const lastWorkout = new Date(sorted[sorted.length - 1].date);
  const daysSinceLastWorkout = Math.floor(
    (today.getTime() - lastWorkout.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Check if streak is still active (within 2 days)
  if (daysSinceLastWorkout <= 2) {
    currentStreak = 1;
  }

  // Calculate longest streak
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].date);
    const curr = new Date(sorted[i].date);
    const diff = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diff <= 2) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak + 1);
      tempStreak = 0;
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak + 1);

  return { currentStreak, longestStreak };
}

function inferPreferredWorkoutTime(
  completedWorkouts: Array<{ date: string }>
): string {
  if (completedWorkouts.length === 0) return 'unknown';

  // This would typically use actual workout timestamps
  // For now, return a placeholder
  return 'varies';
}

// ---------------------------------------------------------------------------
// Performance Insights
// ---------------------------------------------------------------------------

export function generatePerformanceInsights(
  programMetrics: ProgramMetrics,
  cohortMetrics?: CohortMetrics
): PerformanceInsight[] {
  const insights: PerformanceInsight[] = [];

  // Completion rate insight
  if (programMetrics.completionRate < 70) {
    insights.push({
      type: 'engagement',
      title: 'Completion Rate Below Average',
      description: `You've completed ${programMetrics.completionRate.toFixed(0)}% of planned workouts.`,
      metric: programMetrics.completionRate,
      percentile: cohortMetrics
        ? (programMetrics.completionRate / cohortMetrics.averageCompletionRate) * 50
        : 50,
      trend: programMetrics.completionRate > 50 ? 'up' : 'down',
      recommendation: 'Try scheduling workouts at consistent times to build habit.',
    });
  }

  // Strength gain insight
  const avgStrengthGain =
    Object.values(programMetrics.strengthImprovements).reduce((sum, g) => sum + g, 0) /
    (Object.values(programMetrics.strengthImprovements).length || 1);

  if (avgStrengthGain > 5) {
    insights.push({
      type: 'strength',
      title: 'Excellent Strength Progress',
      description: `Average strength increase of ${avgStrengthGain.toFixed(1)}% across exercises.`,
      metric: avgStrengthGain,
      percentile: 85,
      trend: 'up',
      recommendation: 'Consider increasing volume to continue progress.',
    });
  }

  // Recovery insight
  if (programMetrics.averageRecoveryScore < 60) {
    insights.push({
      type: 'recovery',
      title: 'Recovery Needs Attention',
      description: `Average recovery score of ${programMetrics.averageRecoveryScore.toFixed(0)}/100.`,
      metric: programMetrics.averageRecoveryScore,
      percentile: 30,
      trend: programMetrics.recoveryTrend === 'improving' ? 'up' : 'down',
      recommendation: 'Prioritize sleep (8+ hours) and consider a deload week.',
    });
  }

  // Volume progression insight
  const volumeGrowth = calculateVolumeGrowth(programMetrics.volumeProgression);
  if (volumeGrowth > 20) {
    insights.push({
      type: 'volume',
      title: 'Impressive Volume Progression',
      description: `Training volume increased ${volumeGrowth.toFixed(0)}% over the program.`,
      metric: volumeGrowth,
      percentile: 90,
      trend: 'up',
      recommendation: 'Great work! Your work capacity is improving significantly.',
    });
  }

  return insights;
}

function calculateVolumeGrowth(volumeProgression: number[]): number {
  if (volumeProgression.length < 2) return 0;

  const firstWeek = volumeProgression[0];
  const lastWeek = volumeProgression[volumeProgression.length - 1];

  if (firstWeek === 0) return 0;

  return ((lastWeek - firstWeek) / firstWeek) * 100;
}

// ---------------------------------------------------------------------------
// Cohort Analysis
// ---------------------------------------------------------------------------

export function calculateCohortMetrics(
  cohortId: string,
  programs: ProgramMetrics[],
  definition: CohortMetrics['definition']
): CohortMetrics {
  const userCount = new Set(programs.map((p) => p.userId)).size;

  const completionRates = programs.map((p) => p.completionRate);
  const averageCompletionRate =
    completionRates.reduce((sum, r) => sum + r, 0) / (completionRates.length || 1);

  const adherenceScores = programs.map((p) => p.adherenceScore);
  const averageAdherenceScore =
    adherenceScores.reduce((sum, s) => sum + s, 0) / (adherenceScores.length || 1);

  // Calculate churn (abandoned programs)
  const churnRate =
    (programs.filter((p) => p.status === 'abandoned').length / programs.length) * 100;

  // Find common drop-off week
  const dropOffWeeks = programs
    .filter((p) => p.status === 'abandoned')
    .map((p) => Math.floor(p.totalWorkoutsCompleted / p.averageSessionsPerWeek));

  const commonDropOffWeek =
    dropOffWeeks.length > 0
      ? mode(dropOffWeeks)
      : Math.floor(programs[0]?.totalWeeks || 12) / 2;

  // Calculate average strength gain
  const allGains = programs.flatMap((p) => Object.values(p.strengthImprovements));
  const averageStrengthGain =
    allGains.reduce((sum, g) => sum + g, 0) / (allGains.length || 1);

  return {
    cohortId,
    definition,
    userCount,
    averageCompletionRate,
    averageAdherenceScore,
    averageStrengthGain,
    churnRate,
    topPerformingExercises: [], // Would need exercise-level tracking
    commonDropOffWeek,
  };
}

function mode(arr: number[]): number {
  const counts: Record<number, number> = {};
  arr.forEach((num) => {
    counts[num] = (counts[num] || 0) + 1;
  });

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as unknown as number;
}

// ---------------------------------------------------------------------------
// Export Analytics Functions
// ---------------------------------------------------------------------------

export const Analytics = {
  program: calculateProgramMetrics,
  user: calculateUserEngagement,
  insights: generatePerformanceInsights,
  cohort: calculateCohortMetrics,
};
