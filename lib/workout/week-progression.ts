/**
 * week-progression.ts
 *
 * Week-to-Week Progression Tracker
 * Part of Phase 3: Periodization System
 *
 * Tracks training history, manages progression recommendations,
 * and handles week-to-week adjustments based on performance.
 */

import type { ExperienceLevel, PrimaryGoal } from './training-profile.ts';
import type { DayRecipe, ExerciseSlot } from './exercise-recipes-by-experience.ts';
import {
  type PeriodizationConfig,
  type ProgressionRecommendation,
  type WeekStructure,
  getPeriodizationConfig,
  getCurrentWeekStructure,
  advanceWeek,
  isDeloadWeek,
  shouldDeload,
  calculateProgression,
  applyWeekAdjustments,
  PROGRESSIVE_OVERLOAD_PROTOCOLS,
  DELOAD_STRATEGIES,
  type ProgressiveOverloadProtocol,
} from './periodization-models.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExercisePerformance = {
  exerciseName: string;
  pattern: string;
  weekNumber: number;
  dayNumber: number;
  sets: number;
  reps: number[]; // Reps per set
  weight: number;
  rpe: number[]; // RPE per set
  notes?: string;
  completed: boolean;
};

export type WeekPerformance = {
  weekNumber: number;
  blockName: string;
  exercises: ExercisePerformance[];
  fatigueLevel: 'low' | 'moderate' | 'high';
  motivationLevel: 'low' | 'moderate' | 'high';
  sleepQuality: 'poor' | 'fair' | 'good' | 'excellent';
  averageRPE: number;
  totalVolume: number; // Sets × Reps × Weight
  deloadTriggered: boolean;
};

export type ProgressionState = {
  userId: string;
  programId: string;
  currentWeek: number;
  periodizationConfig: PeriodizationConfig;
  performanceHistory: WeekPerformance[];
  protocol: ProgressiveOverloadProtocol;
  nextWeekAdjustments: Map<string, ProgressionRecommendation>; // exerciseName -> recommendation
};

export type WeekPlan = {
  weekNumber: number;
  blockFocus: string;
  isDeload: boolean;
  days: DayPlan[];
  volumeMultiplier: number;
  targetRPE: number;
  notes: string[];
};

export type DayPlan = {
  dayIndex: number;
  dayName: string;
  exercises: ExercisePlan[];
  totalSets: number;
  estimatedDuration: number;
};

export type ExercisePlan = {
  slot: ExerciseSlot;
  exerciseName: string;
  sets: number;
  reps: string;
  targetRPE: number;
  weight?: number; // Suggested weight
  progressionNote?: string;
  previousPerformance?: ExercisePerformance;
};

// ---------------------------------------------------------------------------
// Progression State Management
// ---------------------------------------------------------------------------

export function initializeProgression(
  userId: string,
  programId: string,
  experienceLevel: ExperienceLevel,
  goal: PrimaryGoal,
  weeks: number
): ProgressionState {
  // Select appropriate protocol
  const protocol = selectProtocol(experienceLevel, goal);

  return {
    userId,
    programId,
    currentWeek: 1,
    periodizationConfig: getPeriodizationConfig(experienceLevel, goal, weeks),
    performanceHistory: [],
    protocol,
    nextWeekAdjustments: new Map(),
  };
}

function selectProtocol(experienceLevel: ExperienceLevel, goal: PrimaryGoal): ProgressiveOverloadProtocol {
  // Default protocol selection
  if (experienceLevel === 'beginner') {
    return PROGRESSIVE_OVERLOAD_PROTOCOLS.find((p) => p.name === 'Linear Weight Addition')!;
  }

  if (goal === 'build_strength') {
    return PROGRESSIVE_OVERLOAD_PROTOCOLS.find((p) => p.name === 'APRE (Autoregulated)')!;
  }

  if (experienceLevel === 'advanced') {
    return PROGRESSIVE_OVERLOAD_PROTOCOLS.find((p) => p.name === 'RPE-Based')!;
  }

  return PROGRESSIVE_OVERLOAD_PROTOCOLS.find((p) => p.name === 'Double Progression')!;
}

// ---------------------------------------------------------------------------
// Week Plan Generation
// ---------------------------------------------------------------------------

export function generateWeekPlan(
  state: ProgressionState,
  baseRecipes: DayRecipe[]
): { plan: WeekPlan; updatedState: ProgressionState } {
  const config = state.periodizationConfig;
  const weekStructure = getCurrentWeekStructure(config);

  if (!weekStructure) {
    throw new Error('Invalid periodization state - no current week structure');
  }

  const notes: string[] = [];
  const isDeload = isDeloadWeek(config);

  if (isDeload) {
    notes.push('📉 Deload week - reduced volume and intensity');
    notes.push(`Volume reduced to ${Math.round(weekStructure.volumeMultiplier * 100)}%`);
  }

  // Check if we need to auto-trigger deload based on fatigue
  const lastWeek = state.performanceHistory[state.performanceHistory.length - 1];
  if (lastWeek && shouldDeload(config, [lastWeek.fatigueLevel, `RPE ${lastWeek.averageRPE}`])) {
    notes.push('⚠️ Auto-triggered deload based on fatigue indicators');
  }

  // Generate day plans
  const days: DayPlan[] = baseRecipes.map((recipe, dayIndex) => {
    const exercises: ExercisePlan[] = recipe.slots.map((slot, slotIndex) => {
      // Apply week adjustments to slot
      const adjusted = applyWeekAdjustments(
        slot.sets,
        slot.reps,
        slot.rpe || 8,
        weekStructure
      );

      // Get progression recommendation for this exercise
      const exerciseKey = `${recipe.name}-${slot.pattern}`;
      const recommendation = state.nextWeekAdjustments.get(exerciseKey);

      // Find previous performance
      const previousPerformance = findPreviousPerformance(
        state.performanceHistory,
        slot.pattern,
        state.currentWeek
      );

      // Calculate suggested weight
      const suggestedWeight = recommendation?.weightChange
        ? (previousPerformance?.weight || 0) + recommendation.weightChange
        : previousPerformance?.weight;

      return {
        slot,
        exerciseName: slot.pattern, // Will be filled by catalog
        sets: adjusted.sets,
        reps: adjusted.reps,
        targetRPE: adjusted.rpe,
        weight: suggestedWeight,
        progressionNote: recommendation?.reason || adjusted.notes.join(', '),
        previousPerformance,
      };
    });

    return {
      dayIndex,
      dayName: recipe.name,
      exercises,
      totalSets: exercises.reduce((sum, e) => sum + e.sets, 0),
      estimatedDuration: estimateDuration(exercises),
    };
  });

  const plan: WeekPlan = {
    weekNumber: state.currentWeek,
    blockFocus: config.blocks[config.currentBlockIndex]?.name || 'General',
    isDeload,
    days,
    volumeMultiplier: weekStructure.volumeMultiplier,
    targetRPE: weekStructure.intensityTarget,
    notes,
  };

  return { plan, updatedState: state };
}

function findPreviousPerformance(
  history: WeekPerformance[],
  pattern: string,
  currentWeek: number
): ExercisePerformance | undefined {
  // Search backwards through history for same pattern
  for (let i = history.length - 1; i >= 0; i--) {
    const week = history[i];
    const match = week.exercises.find((e) => e.pattern === pattern);
    if (match) return match;
  }
  return undefined;
}

function estimateDuration(exercises: ExercisePlan[]): number {
  let duration = 10; // Warmup

  exercises.forEach((ex) => {
    // Work sets time
    duration += ex.sets * 45; // 45 seconds per set

    // Rest time
    const restPerSet = ex.slot.restSeconds || 90;
    duration += ex.sets * restPerSet;
  });

  duration += 5; // Cooldown

  return Math.round(duration / 60); // Convert to minutes
}

// ---------------------------------------------------------------------------
// Performance Recording
// ---------------------------------------------------------------------------

export function recordWeekPerformance(
  state: ProgressionState,
  performance: Omit<WeekPerformance, 'weekNumber' | 'blockName'>
): ProgressionState {
  const config = state.periodizationConfig;
  const block = config.blocks[config.currentBlockIndex];

  const weekPerformance: WeekPerformance = {
    weekNumber: state.currentWeek,
    blockName: block?.name || 'Unknown',
    ...performance,
  };

  // Calculate next week adjustments based on performance
  const nextAdjustments = calculateNextWeekAdjustments(
    state.protocol,
    weekPerformance,
    config
  );

  // Advance to next week
  const newConfig = advanceWeek(config);

  return {
    ...state,
    currentWeek: state.currentWeek + 1,
    periodizationConfig: newConfig,
    performanceHistory: [...state.performanceHistory, weekPerformance],
    nextWeekAdjustments: nextAdjustments,
  };
}

function calculateNextWeekAdjustments(
  protocol: ProgressiveOverloadProtocol,
  performance: WeekPerformance,
  config: PeriodizationConfig
): Map<string, ProgressionRecommendation> {
  const adjustments = new Map<string, ProgressionRecommendation>();

  // Don't progress during deload
  if (performance.deloadTriggered) {
    performance.exercises.forEach((ex) => {
      adjustments.set(`${performance.blockName}-${ex.pattern}`, {
        action: 'maintain',
        reason: 'Deload week - maintaining loads',
      });
    });
    return adjustments;
  }

  // Calculate progression for each exercise
  performance.exercises.forEach((ex) => {
    if (!ex.completed) return;

    const avgRpe = ex.rpe.reduce((a, b) => a + b, 0) / ex.rpe.length;
    const avgReps = ex.reps.reduce((a, b) => a + b, 0) / ex.reps.length;
    const targetRpe = config.deloadStrategy.intensityReduction + 7; // Approximate

    const recommendation = calculateProgression(
      protocol,
      {
        weight: ex.weight,
        reps: Math.round(avgReps),
        sets: ex.sets,
        targetReps: 10, // Default target
        rpe: avgRpe,
      },
      targetRpe
    );

    adjustments.set(`${performance.blockName}-${ex.pattern}`, recommendation);
  });

  return adjustments;
}

// ---------------------------------------------------------------------------
// Fatigue & Recovery Monitoring
// ---------------------------------------------------------------------------

export type FatigueAssessment = {
  level: 'low' | 'moderate' | 'high';
  score: number; // 0-100
  indicators: string[];
  recommendations: string[];
};

export function assessFatigue(
  recentPerformance: WeekPerformance[],
  currentConfig: PeriodizationConfig
): FatigueAssessment {
  const indicators: string[] = [];
  let score = 50; // Base score

  if (recentPerformance.length === 0) {
    return { level: 'low', score: 50, indicators: [], recommendations: [] };
  }

  const lastWeek = recentPerformance[recentPerformance.length - 1];

  // RPE trending up
  const avgRPE = lastWeek.averageRPE;
  if (avgRPE > 9) {
    score += 20;
    indicators.push('Very high RPE (>9)');
  } else if (avgRPE > 8.5) {
    score += 10;
    indicators.push('High RPE (>8.5)');
  }

  // Self-reported fatigue
  if (lastWeek.fatigueLevel === 'high') {
    score += 20;
    indicators.push('Self-reported high fatigue');
  } else if (lastWeek.fatigueLevel === 'moderate') {
    score += 10;
    indicators.push('Self-reported moderate fatigue');
  }

  // Sleep quality
  if (lastWeek.sleepQuality === 'poor') {
    score += 15;
    indicators.push('Poor sleep quality');
  } else if (lastWeek.sleepQuality === 'fair') {
    score += 5;
    indicators.push('Fair sleep quality');
  }

  // Motivation
  if (lastWeek.motivationLevel === 'low') {
    score += 10;
    indicators.push('Low motivation');
  }

  // Check for performance drop
  if (recentPerformance.length >= 2) {
    const prevWeek = recentPerformance[recentPerformance.length - 2];
    if (lastWeek.totalVolume < prevWeek.totalVolume * 0.9) {
      score += 10;
      indicators.push('Volume dropped >10%');
    }
  }

  // Determine level
  let level: 'low' | 'moderate' | 'high';
  if (score >= 70) level = 'high';
  else if (score >= 40) level = 'moderate';
  else level = 'low';

  // Generate recommendations
  const recommendations: string[] = [];

  if (level === 'high') {
    recommendations.push('🛑 Consider taking a deload week immediately');
    recommendations.push('💤 Prioritize sleep - aim for 8+ hours');
    recommendations.push('🍽️ Ensure adequate nutrition and hydration');
    recommendations.push('🧘 Add light cardio or stretching on rest days');
  } else if (level === 'moderate') {
    recommendations.push('⚠️ Monitor fatigue - take extra rest if needed');
    recommendations.push('💤 Aim for 7-8 hours of sleep');
    recommendations.push('📉 Consider reducing volume by 10% next week');
  } else {
    recommendations.push('✅ Fatigue levels normal - continue as planned');
  }

  return {
    level,
    score: Math.min(100, score),
    indicators,
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// Deload Management
// ---------------------------------------------------------------------------

export function generateDeloadPlan(
  baseRecipes: DayRecipe[],
  strategy: (typeof DELOAD_STRATEGIES)['beginner'],
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
): WeekPlan {
  const volumeMultiplier = 1 - strategy.volumeReduction;
  const rpeReduction = strategy.intensityReduction;

  const days: DayPlan[] = baseRecipes.map((recipe, dayIndex) => {
    const exercises: ExercisePlan[] = recipe.slots.map((slot) => ({
      slot,
      exerciseName: slot.pattern,
      sets: Math.max(2, Math.round(slot.sets * volumeMultiplier)),
      reps: slot.reps.includes('-') ? '12-15' : `${parseInt(slot.reps) + 2}`,
      targetRPE: Math.max(6, (slot.rpe || 8) - rpeReduction),
      progressionNote: 'Deload week - lighter loads, focus on technique',
    }));

    return {
      dayIndex,
      dayName: `${recipe.name} (Deload)`,
      exercises,
      totalSets: exercises.reduce((sum, e) => sum + e.sets, 0),
      estimatedDuration: estimateDuration(exercises) - 10, // Faster deload sessions
    };
  });

  return {
    weekNumber: 0, // Special deload week
    blockFocus: 'Deload/Recovery',
    isDeload: true,
    days,
    volumeMultiplier,
    targetRPE: 7,
    notes: [
      '📉 Deload Week - Active Recovery',
      `Volume reduced to ${Math.round(volumeMultiplier * 100)}%`,
      `RPE target reduced by ${rpeReduction}`,
      'Focus on technique and movement quality',
      'Prepare for next training block',
    ],
  };
}

// ---------------------------------------------------------------------------
// Performance Summary
// ---------------------------------------------------------------------------

export type PerformanceSummary = {
  totalWeeks: number;
  totalWorkouts: number;
  totalVolume: number;
  averageRPE: number;
  bestLifts: Array<{ exercise: string; weight: number; week: number }>;
  consistency: number; // % of planned workouts completed
  progression: 'excellent' | 'good' | 'average' | 'below_average';
  recommendations: string[];
};

export function generatePerformanceSummary(
  history: WeekPerformance[],
  experienceLevel: ExperienceLevel
): PerformanceSummary {
  if (history.length === 0) {
    return {
      totalWeeks: 0,
      totalWorkouts: 0,
      totalVolume: 0,
      averageRPE: 0,
      bestLifts: [],
      consistency: 0,
      progression: 'average',
      recommendations: ['Start your first week to see progress tracking'],
    };
  }

  const totalWeeks = history.length;
  const totalWorkouts = history.reduce((sum, w) => sum + w.exercises.filter((e) => e.completed).length, 0);
  const totalVolume = history.reduce((sum, w) => sum + w.totalVolume, 0);
  const averageRPE =
    history.reduce((sum, w) => sum + w.averageRPE, 0) / history.length;

  // Find best lifts
  const exerciseMaxes = new Map<string, { weight: number; week: number }>();
  history.forEach((week) => {
    week.exercises.forEach((ex) => {
      if (ex.completed && ex.weight > 0) {
        const current = exerciseMaxes.get(ex.exerciseName);
        if (!current || ex.weight > current.weight) {
          exerciseMaxes.set(ex.exerciseName, { weight: ex.weight, week: week.weekNumber });
        }
      }
    });
  });

  const bestLifts = Array.from(exerciseMaxes.entries())
    .map(([exercise, data]) => ({ exercise, ...data }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);

  // Calculate consistency
  const plannedWorkouts = totalWeeks * 4; // Assuming 4 days/week
  const consistency = Math.round((totalWorkouts / plannedWorkouts) * 100);

  // Determine progression rating
  let progression: 'excellent' | 'good' | 'average' | 'below_average';
  if (consistency >= 90 && averageRPE <= 8) progression = 'excellent';
  else if (consistency >= 75 && averageRPE <= 8.5) progression = 'good';
  else if (consistency >= 60) progression = 'average';
  else progression = 'below_average';

  // Generate recommendations
  const recommendations: string[] = [];

  if (consistency < 75) {
    recommendations.push('📅 Focus on consistency - aim for at least 3-4 workouts per week');
  }

  if (averageRPE > 9) {
    recommendations.push('⚠️ Training intensity too high - consider deload or reducing loads');
  }

  if (totalWeeks >= 4 && progression !== 'excellent') {
    recommendations.push('📈 Review exercise selection - ensure progressive overload is occurring');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Great progress! Keep following the program');
    if (experienceLevel === 'intermediate' || experienceLevel === 'advanced') {
      recommendations.push('💪 Consider testing 1RM or rep maxes to quantify strength gains');
    }
  }

  return {
    totalWeeks,
    totalWorkouts,
    totalVolume,
    averageRPE,
    bestLifts,
    consistency,
    progression,
    recommendations,
  };
}
