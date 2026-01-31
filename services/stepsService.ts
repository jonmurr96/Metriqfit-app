/**
 * Steps Service - Production Implementation
 *
 * Handles:
 * - Step logging (manual, HealthKit, Google Fit)
 * - Daily step totals
 * - Step history and trends
 * - Goal tracking
 */

import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase/types';

// ============================================================================
// Types
// ============================================================================

export type StepLog = Database['public']['Tables']['step_logs']['Row'];
export type StepSource = 'manual' | 'healthkit' | 'google_fit';

export interface DailyStepSummary {
  date: string;
  totalSteps: number;
  source: StepSource;
  logs: StepLog[];
}

export interface StepStats {
  avgDailySteps: number;
  totalSteps: number;
  daysWithData: number;
  highestDay: number;
  lowestDay: number;
}

// ============================================================================
// Step Logging
// ============================================================================

/**
 * Log daily steps
 * Note: Only one entry per day per user (upsert behavior)
 * @param userId - User ID
 * @param steps - Number of steps
 * @param source - Data source (manual, healthkit, google_fit)
 * @param loggedDate - Date in YYYY-MM-DD format (defaults to today)
 */
export async function logSteps(
  userId: string,
  steps: number,
  source: StepSource = 'manual',
  loggedDate?: string
): Promise<StepLog> {
  const targetDate = loggedDate || new Date().toISOString().split('T')[0];

  // Check if entry exists for this date
  const { data: existing } = await supabase
    .from('step_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('logged_date', targetDate)
    .maybeSingle();

  if (existing) {
    // Update existing entry
    const { data, error } = await supabase
      .from('step_logs')
      .update({
        steps,
        source,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update steps');
    return data;
  } else {
    // Create new entry
    const { data, error } = await supabase
      .from('step_logs')
      .insert({
        user_id: userId,
        steps,
        source,
        logged_date: targetDate,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to log steps');
    return data;
  }
}

/**
 * Delete a step log entry
 */
export async function deleteStepLog(logId: string): Promise<void> {
  const { error } = await supabase.from('step_logs').delete().eq('id', logId);

  if (error) throw error;
}

// ============================================================================
// Daily Tracking
// ============================================================================

/**
 * Get steps for a specific date
 * @param userId - User ID
 * @param date - Date in YYYY-MM-DD format
 */
export async function getStepsForDate(userId: string, date: string): Promise<StepLog | null> {
  const { data, error } = await supabase
    .from('step_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('logged_date', date)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get daily step summary
 */
export async function getDailyStepSummary(
  userId: string,
  date: string
): Promise<DailyStepSummary> {
  const log = await getStepsForDate(userId, date);

  if (!log) {
    return {
      date,
      totalSteps: 0,
      source: 'manual',
      logs: [],
    };
  }

  return {
    date,
    totalSteps: log.steps,
    source: log.source,
    logs: [log],
  };
}

// ============================================================================
// History & Trends
// ============================================================================

/**
 * Get step history for a date range
 * @param userId - User ID
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 */
export async function getStepHistory(
  userId: string,
  startDate: string,
  endDate: string
): Promise<StepLog[]> {
  const { data, error } = await supabase
    .from('step_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_date', startDate)
    .lte('logged_date', endDate)
    .order('logged_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get step statistics for a period
 */
export async function getStepStats(
  userId: string,
  startDate: string,
  endDate: string
): Promise<StepStats> {
  const history = await getStepHistory(userId, startDate, endDate);

  if (history.length === 0) {
    return {
      avgDailySteps: 0,
      totalSteps: 0,
      daysWithData: 0,
      highestDay: 0,
      lowestDay: 0,
    };
  }

  const totalSteps = history.reduce((sum, log) => sum + log.steps, 0);
  const avgDailySteps = Math.round(totalSteps / history.length);
  const stepCounts = history.map((log) => log.steps);
  const highestDay = Math.max(...stepCounts);
  const lowestDay = Math.min(...stepCounts);

  return {
    avgDailySteps,
    totalSteps,
    daysWithData: history.length,
    highestDay,
    lowestDay,
  };
}

/**
 * Get 7-day moving average
 */
export async function getStepMovingAverage(
  userId: string,
  days: number = 7
): Promise<{ date: string; avgSteps: number }[]> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const logs = await getStepHistory(userId, startDate, endDate);

  if (logs.length < days) return [];

  const movingAvg: { date: string; avgSteps: number }[] = [];

  for (let i = days - 1; i < logs.length; i++) {
    const window = logs.slice(i - days + 1, i + 1);
    const avgSteps = Math.round(window.reduce((sum, log) => sum + log.steps, 0) / window.length);

    movingAvg.push({
      date: logs[i].logged_date,
      avgSteps,
    });
  }

  return movingAvg;
}

/**
 * Check if step goal was met for a date
 * @param userId - User ID
 * @param date - Date in YYYY-MM-DD format
 * @param goal - Step goal (default: 10000)
 */
export async function checkStepGoal(
  userId: string,
  date: string,
  goal: number = 10000
): Promise<{
  goalMet: boolean;
  steps: number;
  goal: number;
  percentageComplete: number;
}> {
  const log = await getStepsForDate(userId, date);
  const steps = log?.steps || 0;
  const percentageComplete = Math.min(Math.round((steps / goal) * 100), 100);

  return {
    goalMet: steps >= goal,
    steps,
    goal,
    percentageComplete,
  };
}
