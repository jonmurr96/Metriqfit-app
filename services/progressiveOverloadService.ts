/**
 * Progressive Overload Service
 *
 * Analyzes workout performance trends to detect progression opportunities
 * and generate smart suggestions for weight/rep increases.
 *
 * Key Features:
 * - RPE trend analysis (declining RPE = adaptation)
 * - Rep range progression detection (hit top of range = ready for weight)
 * - Volume tracking and deload detection
 * - Confidence scoring based on data quality
 */

import { supabase } from '../lib/supabase';
import { getExerciseHistory } from './workoutService';

// ============================================================================
// Type Definitions
// ============================================================================

export interface WorkoutSetData {
  set_number: number;
  reps: number;
  weight_lb: number | null;
  rpe: number | null;
  is_warmup: boolean;
  is_pr: boolean;
}

export interface ExerciseSessionData {
  sessionId: string;
  date: string;
  sessionName: string;
  sets: WorkoutSetData[];
}

export interface ExerciseProgressionAnalysis {
  exerciseId: string;
  exerciseName: string;
  lastSession: {
    date: string;
    sets: WorkoutSetData[];
    avgRPE: number | null;
    avgWeight: number;
    avgReps: number;
    totalVolumeLb: number;
    topSetWeight: number;
    topSetReps: number;
  };
  trendLast5Sessions: {
    sessions: number; // actual sessions analyzed
    avgWeightLb: number;
    avgReps: number;
    avgRPE: number | null;
    volumeChangePercent: number;
    rpeChangePercent: number | null;
    weightProgression: 'increasing' | 'stable' | 'decreasing';
  };
  readinessScore: number; // 0-100
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export type ProgressionType = 'increase_weight' | 'increase_reps' | 'maintain' | 'deload';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ProgressionRecommendation {
  type: ProgressionType;
  rationale: string;
  suggestedWeight?: number;
  suggestedReps?: number;
  confidence: ConfidenceLevel;
  analysis: ExerciseProgressionAnalysis;
}

export interface ProgressionSuggestion {
  id: string;
  user_id: string;
  exercise_id: string;
  exercise_name?: string;
  suggestion_type: ProgressionType;
  previous_weight_lb: number | null;
  previous_reps: number | null;
  previous_rpe: number | null;
  suggested_weight_lb: number | null;
  suggested_reps: number | null;
  rationale: string;
  confidence: ConfidenceLevel;
  readiness_score: number;
  status: 'pending' | 'applied' | 'dismissed' | 'expired';
  created_at: string;
  expires_at: string;
}

// ============================================================================
// Core Analysis Functions
// ============================================================================

/**
 * Calculate average RPE from a set of workout sets (excluding warmups)
 */
function calculateAverageRPE(sets: WorkoutSetData[]): number | null {
  const workingSets = sets.filter(s => !s.is_warmup && s.rpe !== null);
  if (workingSets.length === 0) return null;

  const sum = workingSets.reduce((acc, s) => acc + (s.rpe || 0), 0);
  return Math.round((sum / workingSets.length) * 10) / 10;
}

/**
 * Calculate total volume (weight × reps) for working sets
 */
function calculateTotalVolume(sets: WorkoutSetData[]): number {
  return sets
    .filter(s => !s.is_warmup && s.weight_lb !== null)
    .reduce((acc, s) => acc + (s.weight_lb || 0) * s.reps, 0);
}

/**
 * Calculate average weight for working sets
 */
function calculateAverageWeight(sets: WorkoutSetData[]): number {
  const workingSets = sets.filter(s => !s.is_warmup && s.weight_lb !== null);
  if (workingSets.length === 0) return 0;

  const sum = workingSets.reduce((acc, s) => acc + (s.weight_lb || 0), 0);
  return Math.round((sum / workingSets.length) * 10) / 10;
}

/**
 * Calculate average reps for working sets
 */
function calculateAverageReps(sets: WorkoutSetData[]): number {
  const workingSets = sets.filter(s => !s.is_warmup);
  if (workingSets.length === 0) return 0;

  const sum = workingSets.reduce((acc, s) => acc + s.reps, 0);
  return Math.round((sum / workingSets.length) * 10) / 10;
}

/**
 * Get the top set (highest weight × reps) from a session
 */
function getTopSet(sets: WorkoutSetData[]): { topSetWeight: number; topSetReps: number } {
  const workingSets = sets.filter(s => !s.is_warmup && s.weight_lb !== null);
  if (workingSets.length === 0) return { topSetWeight: 0, topSetReps: 0 };

  let topSet = workingSets[0];
  let topVolume = (topSet.weight_lb || 0) * topSet.reps;

  for (const set of workingSets) {
    const volume = (set.weight_lb || 0) * set.reps;
    if (volume > topVolume) {
      topSet = set;
      topVolume = volume;
    }
  }

  return { topSetWeight: topSet.weight_lb || 0, topSetReps: topSet.reps };
}

/**
 * Analyze RPE trend over multiple sessions
 * Returns null if insufficient RPE data
 */
function analyzeRPETrend(sessions: ExerciseSessionData[]): {
  avgRPE: number | null;
  changePercent: number | null;
  trend: 'declining' | 'stable' | 'increasing' | 'unknown';
} {
  const rpeValues: number[] = [];

  for (const session of sessions) {
    const avgRPE = calculateAverageRPE(session.sets);
    if (avgRPE !== null) {
      rpeValues.push(avgRPE);
    }
  }

  if (rpeValues.length < 2) {
    return { avgRPE: rpeValues[0] || null, changePercent: null, trend: 'unknown' };
  }

  const avgRPE = rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length;
  const firstRPE = rpeValues[rpeValues.length - 1]; // oldest
  const lastRPE = rpeValues[0]; // most recent
  const changePercent = ((lastRPE - firstRPE) / firstRPE) * 100;

  let trend: 'declining' | 'stable' | 'increasing' = 'stable';
  if (changePercent < -5) trend = 'declining'; // RPE dropping = good
  if (changePercent > 5) trend = 'increasing'; // RPE rising = fatigue

  return {
    avgRPE: Math.round(avgRPE * 10) / 10,
    changePercent: Math.round(changePercent * 10) / 10,
    trend
  };
}

/**
 * Analyze weight progression trend
 */
function analyzeWeightTrend(sessions: ExerciseSessionData[]): 'increasing' | 'stable' | 'decreasing' {
  if (sessions.length < 2) return 'stable';

  const weights = sessions.map(s => calculateAverageWeight(s.sets));
  const firstWeight = weights[weights.length - 1];
  const lastWeight = weights[0];

  if (lastWeight > firstWeight * 1.02) return 'increasing'; // >2% increase
  if (lastWeight < firstWeight * 0.98) return 'decreasing'; // >2% decrease
  return 'stable';
}

/**
 * Calculate volume change percentage over sessions
 */
function calculateVolumeChange(sessions: ExerciseSessionData[]): number {
  if (sessions.length < 2) return 0;

  const volumes = sessions.map(s => calculateTotalVolume(s.sets));
  const firstVolume = volumes[volumes.length - 1];
  const lastVolume = volumes[0];

  if (firstVolume === 0) return 0;
  return Math.round(((lastVolume - firstVolume) / firstVolume) * 100 * 10) / 10;
}

/**
 * Assess data quality based on session count and RPE availability
 */
function assessDataQuality(sessions: ExerciseSessionData[]): 'excellent' | 'good' | 'fair' | 'poor' {
  const sessionCount = sessions.length;
  const rpeCount = sessions.filter(s => calculateAverageRPE(s.sets) !== null).length;

  if (sessionCount >= 5 && rpeCount >= 4) return 'excellent';
  if (sessionCount >= 3 && rpeCount >= 2) return 'good';
  if (sessionCount >= 2) return 'fair';
  return 'poor';
}

/**
 * Calculate readiness score (0-100) based on multiple factors
 */
function calculateReadinessScore(
  analysis: ExerciseProgressionAnalysis
): number {
  let score = 50; // baseline

  // Factor 1: RPE trend (30 points max)
  if (analysis.trendLast5Sessions.rpeChangePercent !== null) {
    const rpeChange = analysis.trendLast5Sessions.rpeChangePercent;
    if (rpeChange < -10) score += 30; // Significant RPE drop
    else if (rpeChange < -5) score += 20;
    else if (rpeChange < 0) score += 10;
    else if (rpeChange > 10) score -= 30; // RPE rising = fatigue
    else if (rpeChange > 5) score -= 15;
  }

  // Factor 2: Volume trend (20 points max)
  const volumeChange = analysis.trendLast5Sessions.volumeChangePercent;
  if (volumeChange > 10) score += 20; // Consistent volume increase
  else if (volumeChange > 5) score += 10;
  else if (volumeChange < -20) score -= 30; // Volume dropping = deload needed

  // Factor 3: Weight progression (20 points max)
  if (analysis.trendLast5Sessions.weightProgression === 'increasing') score += 20;
  else if (analysis.trendLast5Sessions.weightProgression === 'decreasing') score -= 15;

  // Factor 4: Last session RPE (20 points max)
  if (analysis.lastSession.avgRPE !== null) {
    if (analysis.lastSession.avgRPE <= 6) score += 20; // Easy session
    else if (analysis.lastSession.avgRPE <= 7) score += 10;
    else if (analysis.lastSession.avgRPE >= 9) score -= 20; // Too hard
    else if (analysis.lastSession.avgRPE >= 8.5) score -= 10;
  }

  // Factor 5: Data quality (10 points max)
  if (analysis.dataQuality === 'excellent') score += 10;
  else if (analysis.dataQuality === 'good') score += 5;
  else if (analysis.dataQuality === 'poor') score -= 10;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ============================================================================
// Main Analysis Function
// ============================================================================

/**
 * Analyze exercise progression over last N sessions
 */
export async function analyzeExerciseProgression(
  userId: string,
  exerciseId: string,
  exerciseName?: string,
  limit: number = 5
): Promise<ExerciseProgressionAnalysis | null> {
  // Get exercise history
  const history = await getExerciseHistory(userId, exerciseId, limit);

  if (history.length === 0) {
    return null;
  }

  const lastSession = history[0];
  const lastSessionSets = lastSession.sets || [];

  // Calculate last session metrics
  const lastSessionMetrics = {
    date: lastSession.date,
    sets: lastSessionSets,
    avgRPE: calculateAverageRPE(lastSessionSets),
    avgWeight: calculateAverageWeight(lastSessionSets),
    avgReps: calculateAverageReps(lastSessionSets),
    totalVolumeLb: calculateTotalVolume(lastSessionSets),
    ...getTopSet(lastSessionSets),
  };

  // Calculate trend metrics
  const rpeTrend = analyzeRPETrend(history);
  const weightTrend = analyzeWeightTrend(history);
  const volumeChange = calculateVolumeChange(history);

  const trendMetrics = {
    sessions: history.length,
    avgWeightLb: Math.round(
      history.reduce((sum, s) => sum + calculateAverageWeight(s.sets), 0) / history.length * 10
    ) / 10,
    avgReps: Math.round(
      history.reduce((sum, s) => sum + calculateAverageReps(s.sets), 0) / history.length * 10
    ) / 10,
    avgRPE: rpeTrend.avgRPE,
    volumeChangePercent: volumeChange,
    rpeChangePercent: rpeTrend.changePercent,
    weightProgression: weightTrend,
  };

  const dataQuality = assessDataQuality(history);

  const analysis: ExerciseProgressionAnalysis = {
    exerciseId,
    exerciseName: exerciseName || 'Unknown Exercise',
    lastSession: lastSessionMetrics,
    trendLast5Sessions: trendMetrics,
    readinessScore: 0, // calculated next
    dataQuality,
  };

  // Calculate readiness score
  analysis.readinessScore = calculateReadinessScore(analysis);

  return analysis;
}

// ============================================================================
// Progression Recommendation Logic
// ============================================================================

/**
 * Determine if user should progress and how
 */
export function detectProgressionOpportunity(
  analysis: ExerciseProgressionAnalysis
): ProgressionRecommendation | null {
  const { lastSession, trendLast5Sessions, readinessScore, dataQuality } = analysis;

  // Need at least "fair" data quality
  if (dataQuality === 'poor') {
    return {
      type: 'maintain',
      rationale: 'Need more workout data to make recommendations. Complete 2-3 more sessions.',
      confidence: 'low',
      analysis,
    };
  }

  // DELOAD DETECTION
  // 1. RPE consistently high (>= 9) OR
  // 2. Volume dropped significantly (>20%)
  if (lastSession.avgRPE !== null && lastSession.avgRPE >= 9) {
    return {
      type: 'deload',
      rationale: `Your RPE is very high (${lastSession.avgRPE}), indicating you may be accumulating fatigue. Consider a deload week with reduced weight or volume.`,
      suggestedWeight: Math.round(lastSession.avgWeight * 0.7), // 70% of current
      confidence: 'high',
      analysis,
    };
  }

  if (trendLast5Sessions.volumeChangePercent < -20) {
    return {
      type: 'deload',
      rationale: `Your training volume has dropped ${Math.abs(trendLast5Sessions.volumeChangePercent)}% over recent sessions. This suggests you may need recovery.`,
      confidence: 'medium',
      analysis,
    };
  }

  // WEIGHT PROGRESSION
  // Criteria:
  // 1. Readiness score >= 70 (strong signal)
  // 2. Last session RPE <= 7.5 (not too hard)
  // 3. Top set reps >= 8 (hit reasonable rep range)
  const shouldIncreaseWeight =
    readinessScore >= 70 &&
    (lastSession.avgRPE === null || lastSession.avgRPE <= 7.5) &&
    lastSession.topSetReps >= 8;

  if (shouldIncreaseWeight) {
    // Suggest 2.5% - 5% increase based on confidence
    const increasePercent = dataQuality === 'excellent' ? 0.05 : 0.025;
    const suggestedWeight = Math.round(lastSession.topSetWeight * (1 + increasePercent) / 2.5) * 2.5; // round to 2.5lb

    let rationale = `You completed ${lastSession.topSetReps} reps at ${lastSession.topSetWeight} lbs`;
    if (lastSession.avgRPE !== null) {
      rationale += ` with RPE ${lastSession.avgRPE}`;
    }
    if (trendLast5Sessions.rpeChangePercent !== null && trendLast5Sessions.rpeChangePercent < -5) {
      rationale += `. Your RPE has dropped ${Math.abs(trendLast5Sessions.rpeChangePercent)}% over recent sessions, indicating you're adapting well.`;
    }
    rationale += ` Try ${suggestedWeight} lbs next time.`;

    return {
      type: 'increase_weight',
      rationale,
      suggestedWeight,
      confidence: dataQuality === 'excellent' ? 'high' : 'medium',
      analysis,
    };
  }

  // REP PROGRESSION
  // Criteria:
  // 1. Readiness score >= 60 (moderate signal)
  // 2. Last session reps < 12 (room to grow in hypertrophy range)
  // 3. Last session RPE <= 8
  const shouldIncreaseReps =
    readinessScore >= 60 &&
    lastSession.topSetReps < 12 &&
    (lastSession.avgRPE === null || lastSession.avgRPE <= 8);

  if (shouldIncreaseReps) {
    const suggestedReps = lastSession.topSetReps + 1;

    return {
      type: 'increase_reps',
      rationale: `You're performing well at ${lastSession.topSetReps} reps. Try pushing for ${suggestedReps} reps next session before increasing weight.`,
      suggestedReps,
      confidence: 'medium',
      analysis,
    };
  }

  // MAINTAIN
  return {
    type: 'maintain',
    rationale: 'Keep training at your current intensity. Your performance is consistent.',
    confidence: readinessScore >= 50 ? 'medium' : 'low',
    analysis,
  };
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Save a progression suggestion to the database
 */
export async function saveProgressionSuggestion(
  userId: string,
  recommendation: ProgressionRecommendation
): Promise<ProgressionSuggestion> {
  const { data, error } = await supabase
    .from('user_progression_suggestions')
    .insert({
      user_id: userId,
      exercise_id: recommendation.analysis.exerciseId,
      suggestion_type: recommendation.type,
      previous_weight_lb: recommendation.analysis.lastSession.avgWeight,
      previous_reps: Math.round(recommendation.analysis.lastSession.avgReps),
      previous_rpe: recommendation.analysis.lastSession.avgRPE,
      suggested_weight_lb: recommendation.suggestedWeight || null,
      suggested_reps: recommendation.suggestedReps || null,
      rationale: recommendation.rationale,
      confidence: recommendation.confidence,
      readiness_score: recommendation.analysis.readinessScore,
      analysis_window_sessions: recommendation.analysis.trendLast5Sessions.sessions,
      last_session_date: recommendation.analysis.lastSession.date,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get pending suggestions for a user
 */
export async function getPendingSuggestions(
  userId: string
): Promise<ProgressionSuggestion[]> {
  const { data, error } = await supabase
    .from('user_progression_suggestions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get suggestions for specific exercises (for pre-workout display)
 */
export async function getSuggestionsForExercises(
  userId: string,
  exerciseIds: string[]
): Promise<ProgressionSuggestion[]> {
  const { data, error } = await supabase
    .from('user_progression_suggestions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .in('exercise_id', exerciseIds)
    .gt('expires_at', new Date().toISOString())
    .order('readiness_score', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Apply a suggestion (mark as applied)
 */
export async function applySuggestion(suggestionId: string): Promise<void> {
  const { error } = await supabase
    .from('user_progression_suggestions')
    .update({
      status: 'applied',
      applied_at: new Date().toISOString(),
    })
    .eq('id', suggestionId);

  if (error) throw error;
}

/**
 * Dismiss a suggestion
 */
export async function dismissSuggestion(suggestionId: string): Promise<void> {
  const { error } = await supabase
    .from('user_progression_suggestions')
    .update({
      status: 'dismissed',
      dismissed_at: new Date().toISOString(),
    })
    .eq('id', suggestionId);

  if (error) throw error;
}

/**
 * Generate suggestions for today's workout plan day
 *
 * @param userId - User ID
 * @param exerciseIds - Exercise IDs in today's workout
 * @returns Array of progression recommendations
 */
export async function generateSuggestionsForWorkout(
  userId: string,
  exercises: Array<{ id: string; name: string }>
): Promise<ProgressionRecommendation[]> {
  const recommendations: ProgressionRecommendation[] = [];

  // Analyze each exercise
  for (const exercise of exercises) {
    try {
      const analysis = await analyzeExerciseProgression(userId, exercise.id, exercise.name);

      if (!analysis) continue; // No history yet

      const recommendation = detectProgressionOpportunity(analysis);

      // Only include actionable suggestions (increase weight/reps or deload)
      if (
        recommendation &&
        (recommendation.type === 'increase_weight' ||
          recommendation.type === 'increase_reps' ||
          recommendation.type === 'deload')
      ) {
        recommendations.push(recommendation);

        // Save to database for tracking
        await saveProgressionSuggestion(userId, recommendation);
      }
    } catch (error) {
      console.error(`[progressiveOverload] Error analyzing exercise ${exercise.id}:`, error);
      // Continue with other exercises
    }
  }

  // Sort by readiness score (highest first)
  return recommendations.sort((a, b) => b.analysis.readinessScore - a.analysis.readinessScore);
}
