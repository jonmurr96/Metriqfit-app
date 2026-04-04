/**
 * deload-detection.ts
 *
 * Deload Detection & Recommendation System for Sprint 4
 * 
 * Automatically detects when a user needs a deload week based on:
 * - Performance stagnation or decline
 * - Elevated RPE despite maintained performance
 * - Accumulated fatigue markers
 * - Time since last deload
 * 
 * Scientific basis: General Adaptation Syndrome (GAS) and
 * autoregulation principles from Mike Tuchscherer, Eric Helms.
 */

import type { ExercisePerformance, ProgressionTrend } from './progression-tracker.ts';
import type { WeeklyVolumeAnalysis } from './volume-landmarks.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DeloadTrigger = 
  | 'performance_decline'
  | 'elevated_rpe'
  | 'volume_accumulation'
  | 'time_based'
  | 'fatigue_markers'
  | 'recovery_poor';

export type DeloadRecommendation = {
  recommended: boolean;
  urgency: 'immediate' | 'this_week' | 'next_week' | 'not_needed';
  triggers: DeloadTrigger[];
  confidence: 'high' | 'medium' | 'low';
  reasoning: string[];
  deloadPlan: DeloadPlan;
  metrics: DeloadMetrics;
};

export type DeloadPlan = {
  /** Volume reduction (0.6 = 40% reduction) */
  volumeModifier: number;
  /** Intensity reduction (RPE reduction) */
  intensityModifier: number;
  /** Duration in weeks */
  durationWeeks: number;
  /** Exercise variation strategy */
  variationStrategy: 'keep_same' | 'reduce_compounds' | 'change_all';
  /** Specific guidance */
  guidance: string[];
};

export type DeloadMetrics = {
  weeksSinceLastDeload: number;
  performanceTrend: 'improving' | 'stable' | 'declining';
  averageRPE: number | null;
  rpeTrend: 'increasing' | 'stable' | 'decreasing';
  fatigueScore: number; // 0-100
  recoveryCapacity: 'high' | 'moderate' | 'low';
};

export type FatigueMarkers = {
  /** Sleep quality (1-10, higher is better) */
  sleepQuality?: number;
  /** Motivation level (1-10) */
  motivation?: number;
  /** Appetite (1-10) */
  appetite?: number;
  /** General energy (1-10) */
  energy?: number;
  /** Muscle soreness duration (days) */
  sorenessDuration?: number;
  /** Resting heart rate elevation (bpm above normal) */
  rhrElevation?: number;
};

export type DeloadContext = {
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  weeksSinceLastDeload: number;
  currentWeekInMesocycle: number;
  mesocycleLength: number;
  /** Recent exercise performances */
  recentPerformances: ExercisePerformance[];
  /** Recent progression trends */
  progressionTrends: ProgressionTrend[];
  /** Volume analysis */
  volumeAnalysis: WeeklyVolumeAnalysis | null;
  /** Optional fatigue markers from user */
  fatigueMarkers?: FatigueMarkers;
  /** Last deload date */
  lastDeloadDate?: Date;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum weeks between deloads */
const MIN_WEEKS_BETWEEN_DELOADS = 3;

/** Maximum weeks before forced deload recommendation */
const MAX_WEEKS_WITHOUT_DELOAD = {
  beginner: 8,
  intermediate: 6,
  advanced: 5,
};

/** Deload volume modifiers by experience level */
const DELOAD_VOLUME_MODIFIER = {
  beginner: 0.7,    // 30% reduction
  intermediate: 0.6, // 40% reduction
  advanced: 0.5,    // 50% reduction
};

/** RPE thresholds for deload triggers */
const RPE_THRESHOLDS = {
  elevated: 9,      // RPE 9+ consistently
  very_high: 9.5,   // RPE 9.5+ (immediate concern)
};

/** Performance decline threshold (3+ weeks of decline) */
const PERFORMANCE_DECLINE_WEEKS = 3;

// ---------------------------------------------------------------------------
// Core Detection Logic
// ---------------------------------------------------------------------------

/**
 * Calculate fatigue score based on multiple factors
 * Returns 0-100 where higher = more fatigued
 */
export function calculateFatigueScore(context: DeloadContext): number {
  let score = 0;
  const maxScore = 100;
  
  // 1. Time since last deload (20% of score)
  const weeksSince = context.weeksSinceLastDeload;
  const maxWeeks = MAX_WEEKS_WITHOUT_DELOAD[context.experienceLevel];
  score += Math.min((weeksSince / maxWeeks) * 20, 20);
  
  // 2. Performance trend (25% of score)
  const decliningExercises = context.progressionTrends.filter(
    (t) => !t.isProgressing && t.vsBenchmark === 'below'
  ).length;
  const totalExercises = context.progressionTrends.length;
  if (totalExercises > 0) {
    score += (decliningExercises / totalExercises) * 25;
  }
  
  // 3. RPE elevation (25% of score)
  const recentRPEs = context.recentPerformances
    .map((p) => p.averageRPE)
    .filter((rpe): rpe is number => rpe !== null);
  
  if (recentRPEs.length > 0) {
    const avgRPE = recentRPEs.reduce((a, b) => a + b, 0) / recentRPEs.length;
    if (avgRPE >= RPE_THRESHOLDS.elevated) {
      score += 25;
    } else if (avgRPE >= 8.5) {
      score += 15;
    } else if (avgRPE >= 8) {
      score += 5;
    }
  }
  
  // 4. Volume/recovery analysis (20% of score)
  if (context.volumeAnalysis) {
    if (context.volumeAnalysis.recoveryRisk === 'high') {
      score += 20;
    } else if (context.volumeAnalysis.recoveryRisk === 'moderate') {
      score += 10;
    }
  }
  
  // 5. Fatigue markers (10% of score)
  if (context.fatigueMarkers) {
    const markers = context.fatigueMarkers;
    
    if (markers.sleepQuality !== undefined && markers.sleepQuality < 5) {
      score += 3;
    }
    if (markers.motivation !== undefined && markers.motivation < 5) {
      score += 2;
    }
    if (markers.energy !== undefined && markers.energy < 5) {
      score += 3;
    }
    if (markers.sorenessDuration !== undefined && markers.sorenessDuration > 3) {
      score += 2;
    }
  }
  
  return Math.min(Math.round(score), maxScore);
}

/**
 * Determine recovery capacity based on fatigue score
 */
function determineRecoveryCapacity(fatigueScore: number): DeloadMetrics['recoveryCapacity'] {
  if (fatigueScore >= 70) return 'low';
  if (fatigueScore >= 40) return 'moderate';
  return 'high';
}

/**
 * Analyze performance trend direction
 */
function analyzePerformanceTrend(trends: ProgressionTrend[]): DeloadMetrics['performanceTrend'] {
  const progressing = trends.filter((t) => t.isProgressing).length;
  const ratio = trends.length > 0 ? progressing / trends.length : 0;
  
  if (ratio >= 0.6) return 'improving';
  if (ratio >= 0.3) return 'stable';
  return 'declining';
}

/**
 * Analyze RPE trend over time
 */
function analyzeRPETrend(performances: ExercisePerformance[]): DeloadMetrics['rpeTrend'] {
  if (performances.length < 3) return 'stable';
  
  const recent = performances.slice(-3);
  const rpes = recent.map((p) => p.averageRPE).filter((r): r is number => r !== null);
  
  if (rpes.length < 3) return 'stable';
  
  // Simple trend: compare first half to second half
  const firstAvg = rpes.slice(0, Math.floor(rpes.length / 2)).reduce((a, b) => a + b, 0) / 
                   Math.floor(rpes.length / 2);
  const secondAvg = rpes.slice(Math.floor(rpes.length / 2)).reduce((a, b) => a + b, 0) / 
                    (rpes.length - Math.floor(rpes.length / 2));
  
  const diff = secondAvg - firstAvg;
  
  if (diff > 0.5) return 'increasing';
  if (diff < -0.5) return 'decreasing';
  return 'stable';
}

// ---------------------------------------------------------------------------
// Trigger Detection
// ---------------------------------------------------------------------------

function detectTriggers(context: DeloadContext, metrics: DeloadMetrics): DeloadTrigger[] {
  const triggers: DeloadTrigger[] = [];
  
  // 1. Time-based trigger
  const maxWeeks = MAX_WEEKS_WITHOUT_DELOAD[context.experienceLevel];
  if (context.weeksSinceLastDeload >= maxWeeks) {
    triggers.push('time_based');
  }
  
  // 2. Performance decline trigger
  if (metrics.performanceTrend === 'declining' && context.weeksSinceLastDeload >= 4) {
    triggers.push('performance_decline');
  }
  
  // 3. Elevated RPE trigger
  if (metrics.rpeTrend === 'increasing' && metrics.averageRPE && metrics.averageRPE >= RPE_THRESHOLDS.elevated) {
    triggers.push('elevated_rpe');
  }
  
  // 4. Volume accumulation trigger
  if (context.volumeAnalysis?.recoveryRisk === 'high') {
    triggers.push('volume_accumulation');
  }
  
  // 5. Fatigue markers trigger
  if (context.fatigueMarkers) {
    const markers = context.fatigueMarkers;
    const lowMarkers = [
      markers.sleepQuality,
      markers.motivation,
      markers.appetite,
      markers.energy,
    ].filter((m) => m !== undefined && m < 5).length;
    
    if (lowMarkers >= 2) {
      triggers.push('fatigue_markers');
    }
    
    if (markers.sorenessDuration && markers.sorenessDuration > 4) {
      triggers.push('recovery_poor');
    }
  }
  
  return triggers;
}

// ---------------------------------------------------------------------------
// Deload Plan Generation
// ---------------------------------------------------------------------------

function generateDeloadPlan(
  context: DeloadContext,
  metrics: DeloadMetrics,
  triggers: DeloadTrigger[]
): DeloadPlan {
  const experience = context.experienceLevel;
  const baseVolumeMod = DELOAD_VOLUME_MODIFIER[experience];
  
  // Adjust based on severity
  let volumeModifier = baseVolumeMod;
  if (metrics.fatigueScore >= 80) {
    volumeModifier = Math.max(0.4, baseVolumeMod - 0.1);
  }
  
  // Intensity modifier (RPE reduction)
  const intensityModifier = metrics.averageRPE && metrics.averageRPE > 8.5 ? -1.5 : -1;
  
  // Duration (usually 1 week, but could be 2 for very fatigued)
  const durationWeeks = metrics.fatigueScore >= 85 ? 2 : 1;
  
  // Variation strategy
  let variationStrategy: DeloadPlan['variationStrategy'] = 'keep_same';
  if (triggers.includes('performance_decline')) {
    variationStrategy = 'reduce_compounds';
  }
  
  // Guidance
  const guidance: string[] = [
    `Reduce volume to ${Math.round(volumeModifier * 100)}% of current (from ${context.volumeAnalysis?.totalWeeklySets || 'N/A'} to ~${Math.round((context.volumeAnalysis?.totalWeeklySets || 0) * volumeModifier)} total sets)`,
    `Reduce intensity: target RPE ${(RPE_THRESHOLDS.elevated + intensityModifier).toFixed(1)} instead of current average`,
    'Focus on recovery: prioritize sleep (8+ hours), nutrition, and stress management',
  ];
  
  if (durationWeeks > 1) {
    guidance.push('Extended deload: Take 2 weeks to fully recover');
  }
  
  if (variationStrategy === 'reduce_compounds') {
    guidance.push('Reduce load on heavy compounds: cut weight by 10-15% and use 2-3 fewer sets');
  }
  
  guidance.push('Resume normal training when motivation and energy return');
  
  return {
    volumeModifier,
    intensityModifier,
    durationWeeks,
    variationStrategy,
    guidance,
  };
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Generate deload recommendation based on current context
 */
export function generateDeloadRecommendation(context: DeloadContext): DeloadRecommendation {
  // Calculate all metrics
  const fatigueScore = calculateFatigueScore(context);
  const recoveryCapacity = determineRecoveryCapacity(fatigueScore);
  const performanceTrend = analyzePerformanceTrend(context.progressionTrends);
  const rpeTrend = analyzeRPETrend(context.recentPerformances);
  
  const recentRPEs = context.recentPerformances
    .map((p) => p.averageRPE)
    .filter((rpe): rpe is number => rpe !== null);
  const averageRPE = recentRPEs.length > 0
    ? recentRPEs.reduce((a, b) => a + b, 0) / recentRPEs.length
    : null;
  
  const metrics: DeloadMetrics = {
    weeksSinceLastDeload: context.weeksSinceLastDeload,
    performanceTrend,
    averageRPE,
    rpeTrend,
    fatigueScore,
    recoveryCapacity,
  };
  
  // Detect triggers
  const triggers = detectTriggers(context, metrics);
  
  // Determine urgency and recommendation
  let urgency: DeloadRecommendation['urgency'] = 'not_needed';
  let recommended = false;
  const reasoning: string[] = [];
  
  // High urgency: Multiple triggers or very high fatigue
  if (fatigueScore >= 80 || triggers.length >= 3) {
    urgency = 'immediate';
    recommended = true;
    reasoning.push(`High fatigue detected (score: ${fatigueScore}/100)`);
    reasoning.push(`Multiple triggers: ${triggers.join(', ')}`);
  }
  // Medium-high urgency: Performance decline + elevated RPE
  else if (triggers.includes('performance_decline') && triggers.includes('elevated_rpe')) {
    urgency = 'this_week';
    recommended = true;
    reasoning.push('Performance declining despite high effort');
  }
  // Medium urgency: Time-based or volume accumulation
  else if (triggers.includes('time_based') || triggers.includes('volume_accumulation')) {
    urgency = 'next_week';
    recommended = true;
    reasoning.push(`${context.weeksSinceLastDeload} weeks since last deload`);
    if (context.volumeAnalysis?.recoveryRisk === 'high') {
      reasoning.push('High training volume creating recovery debt');
    }
  }
  // Low urgency: Single trigger
  else if (triggers.length === 1) {
    urgency = 'next_week';
    recommended = true;
    reasoning.push(`Single trigger: ${triggers[0]}`);
  }
  // No deload needed
  else {
    urgency = 'not_needed';
    recommended = false;
    reasoning.push('No significant fatigue markers detected');
    reasoning.push(`Fatigue score: ${fatigueScore}/100 (moderate)`);
  }
  
  // Generate deload plan if recommended
  const deloadPlan = recommended
    ? generateDeloadPlan(context, metrics, triggers)
    : {
        volumeModifier: 1,
        intensityModifier: 0,
        durationWeeks: 0,
        variationStrategy: 'keep_same' as const,
        guidance: ['Continue current training plan'],
      };
  
  // Calculate confidence
  const confidence: DeloadRecommendation['confidence'] = 
    triggers.length >= 3 ? 'high' :
    triggers.length >= 2 ? 'medium' : 'low';
  
  return {
    recommended,
    urgency,
    triggers,
    confidence,
    reasoning,
    deloadPlan,
    metrics,
  };
}

// ---------------------------------------------------------------------------
// Quick Check Functions
// ---------------------------------------------------------------------------

/**
 * Quick check: Is user overdue for a deload?
 */
export function isOverdueForDeload(
  weeksSinceLastDeload: number,
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
): boolean {
  return weeksSinceLastDeload >= MAX_WEEKS_WITHOUT_DELOAD[experienceLevel];
}

/**
 * Quick check: Is RPE too high?
 */
export function isRPETooHigh(
  recentRPEs: number[],
  threshold: number = RPE_THRESHOLDS.elevated
): boolean {
  if (recentRPEs.length === 0) return false;
  const avg = recentRPEs.reduce((a, b) => a + b, 0) / recentRPEs.length;
  return avg >= threshold;
}

/**
 * Get days until recommended deload
 */
export function getDaysUntilDeload(
  context: DeloadContext
): number | null {
  const maxWeeks = MAX_WEEKS_WITHOUT_DELOAD[context.experienceLevel];
  const weeksRemaining = maxWeeks - context.weeksSinceLastDeload;
  
  if (weeksRemaining <= 0) return 0;
  return weeksRemaining * 7;
}

// ---------------------------------------------------------------------------
// Integration Helpers
// ---------------------------------------------------------------------------

/**
 * Apply deload modifiers to a workout plan
 */
export function applyDeloadToPlan<T extends { sets?: number; reps?: number; weight?: number }>(
  exercises: T[],
  deloadPlan: DeloadPlan
): T[] {
  return exercises.map((ex) => ({
    ...ex,
    sets: ex.sets ? Math.max(2, Math.round(ex.sets * deloadPlan.volumeModifier)) : ex.sets,
    weight: ex.weight ? ex.weight * 0.85 : ex.weight, // 15% weight reduction
  }));
}

/**
 * Format deload recommendation for display
 */
export function formatDeloadRecommendation(rec: DeloadRecommendation): string {
  const lines: string[] = [];
  
  if (rec.recommended) {
    lines.push(`🔄 DELOAD RECOMMENDED (${rec.urgency})`);
    lines.push(`Confidence: ${rec.confidence}`);
    lines.push('');
    lines.push('Reasoning:');
    rec.reasoning.forEach((r) => lines.push(`  • ${r}`));
    lines.push('');
    lines.push('Deload Plan:');
    lines.push(`  • Volume: ${Math.round(rec.deloadPlan.volumeModifier * 100)}% of current`);
    lines.push(`  • Intensity: RPE ${(8 + rec.deloadPlan.intensityModifier).toFixed(1)} target`);
    lines.push(`  • Duration: ${rec.deloadPlan.durationWeeks} week(s)`);
    lines.push('');
    lines.push('Guidance:');
    rec.deloadPlan.guidance.forEach((g) => lines.push(`  • ${g}`));
  } else {
    lines.push('✅ No deload needed at this time');
    lines.push(`Fatigue score: ${rec.metrics.fatigueScore}/100`);
  }
  
  return lines.join('\n');
}
