/**
 * Water Service - Production Implementation
 *
 * Handles:
 * - Water logging (manual entry)
 * - Daily water totals
 * - Water history/trends
 * - Integration with user targets
 */

import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase/types';

// ============================================================================
// Types
// ============================================================================

export type WaterLog = Database['public']['Tables']['water_logs']['Row'];

export interface DailyWaterSummary {
  totalMl: number;
  targetMl: number;
  percentageComplete: number;
  logCount: number;
  logs: WaterLog[];
}

export interface WaterHistoryDay {
  date: string;
  totalMl: number;
  targetMl: number;
  percentageComplete: number;
}

// ============================================================================
// Water Logging
// ============================================================================

/**
 * Log water intake
 * @param userId - User ID
 * @param amountMl - Amount in milliliters
 * @param loggedAt - Optional timestamp (defaults to now)
 */
export async function logWater(
  userId: string,
  amountMl: number,
  loggedAt?: string
): Promise<WaterLog> {
  const { data, error } = await supabase
    .from('water_logs')
    .insert({
      user_id: userId,
      amount_ml: amountMl,
      logged_at: loggedAt || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to log water');
  return data;
}

/**
 * Delete a water log entry
 */
export async function deleteWaterLog(logId: string): Promise<void> {
  const { error } = await supabase.from('water_logs').delete().eq('id', logId);

  if (error) throw error;
}

// ============================================================================
// Daily Tracking
// ============================================================================

/**
 * Get all water logs for a specific date
 * @param userId - User ID
 * @param date - Date in YYYY-MM-DD format
 */
export async function getDailyWaterLogs(userId: string, date: string): Promise<WaterLog[]> {
  // Get start and end of day in ISO format
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from('water_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_at', startOfDay)
    .lte('logged_at', endOfDay)
    .order('logged_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get daily water summary with target comparison
 * @param userId - User ID
 * @param date - Date in YYYY-MM-DD format
 */
export async function getDailyWaterSummary(
  userId: string,
  date: string
): Promise<DailyWaterSummary> {
  // Get user's water target
  const { data: targetData, error: targetError } = await supabase
    .from('user_targets')
    .select('water_ml')
    .eq('user_id', userId)
    .single();

  if (targetError) throw targetError;

  const targetMl = targetData?.water_ml || 3000; // Default 3L if no target

  // Get daily logs
  const logs = await getDailyWaterLogs(userId, date);

  // Sum total
  const totalMl = logs.reduce((sum, log) => sum + log.amount_ml, 0);

  // Calculate percentage
  const percentageComplete = Math.min(Math.round((totalMl / targetMl) * 100), 100);

  return {
    totalMl,
    targetMl,
    percentageComplete,
    logCount: logs.length,
    logs,
  };
}

// ============================================================================
// History & Trends
// ============================================================================

/**
 * Get water history for a date range
 * @param userId - User ID
 * @param startDate - Start date ISO string
 * @param endDate - End date ISO string
 */
export async function getWaterHistory(
  userId: string,
  startDate: string,
  endDate: string
): Promise<WaterHistoryDay[]> {
  // Get user's water target
  const { data: targetData } = await supabase
    .from('user_targets')
    .select('water_ml')
    .eq('user_id', userId)
    .single();

  const targetMl = targetData?.water_ml || 3000;

  // Get all water logs in range
  const { data: logs, error } = await supabase
    .from('water_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_at', startDate)
    .lte('logged_at', endDate)
    .order('logged_at', { ascending: true });

  if (error) throw error;

  // Group by date
  const dailyTotals: Record<string, number> = {};

  logs?.forEach((log: any) => {
    const date = log.logged_at.split('T')[0]; // Get YYYY-MM-DD
    if (!dailyTotals[date]) {
      dailyTotals[date] = 0;
    }
    dailyTotals[date] += log.amount_ml;
  });

  // Convert to array of history days
  const history: WaterHistoryDay[] = Object.entries(dailyTotals).map(([date, totalMl]) => ({
    date,
    totalMl,
    targetMl,
    percentageComplete: Math.min(Math.round((totalMl / targetMl) * 100), 100),
  }));

  return history.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get water stats for a period
 */
export async function getWaterStats(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{
  avgDailyMl: number;
  totalMl: number;
  daysHitTarget: number;
  totalDays: number;
  adherencePercentage: number;
}> {
  const history = await getWaterHistory(userId, startDate, endDate);

  if (history.length === 0) {
    return {
      avgDailyMl: 0,
      totalMl: 0,
      daysHitTarget: 0,
      totalDays: 0,
      adherencePercentage: 0,
    };
  }

  const totalMl = history.reduce((sum, day) => sum + day.totalMl, 0);
  const avgDailyMl = Math.round(totalMl / history.length);
  const daysHitTarget = history.filter((day) => day.percentageComplete >= 100).length;
  const adherencePercentage = Math.round((daysHitTarget / history.length) * 100);

  return {
    avgDailyMl,
    totalMl,
    daysHitTarget,
    totalDays: history.length,
    adherencePercentage,
  };
}
