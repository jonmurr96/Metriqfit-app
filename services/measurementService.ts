/**
 * Measurement Service - Production Implementation
 *
 * Handles:
 * - Weight tracking
 * - Body fat percentage tracking
 * - Measurement history and trends
 * - Progress calculations
 */

import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase/types';

// ============================================================================
// Types
// ============================================================================

export type UserMeasurement = Database['public']['Tables']['user_measurements']['Row'];

export interface MeasurementTrend {
  date: string;
  weightKg: number;
  bodyFatPercentage: number | null;
  changeFromPrevious: number | null; // in kg
  changeFromStart: number | null; // in kg
}

export interface MeasurementStats {
  currentWeightKg: number;
  startWeightKg: number;
  lowestWeightKg: number;
  highestWeightKg: number;
  totalChangeKg: number;
  avgWeeklyChangeKg: number;
  measurementCount: number;
  daysSinceFirstMeasurement: number;
}

// ============================================================================
// Measurement Logging
// ============================================================================

/**
 * Log a weight measurement
 * @param userId - User ID
 * @param weightKg - Weight in kilograms
 * @param bodyFatPercentage - Optional body fat percentage
 * @param notes - Optional notes
 * @param loggedAt - Optional timestamp (defaults to now)
 */
export async function logMeasurement(
  userId: string,
  weightKg: number,
  bodyFatPercentage?: number | null,
  notes?: string | null,
  loggedAt?: string
): Promise<UserMeasurement> {
  const { data, error } = await supabase
    .from('user_measurements')
    .insert({
      user_id: userId,
      weight_kg: weightKg,
      body_fat_percentage: bodyFatPercentage || null,
      notes: notes || null,
      logged_at: loggedAt || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to log measurement');
  return data;
}

/**
 * Update an existing measurement
 */
export async function updateMeasurement(
  measurementId: string,
  updates: {
    weightKg?: number;
    bodyFatPercentage?: number | null;
    notes?: string | null;
  }
): Promise<UserMeasurement> {
  const { data, error } = await supabase
    .from('user_measurements')
    .update({
      weight_kg: updates.weightKg,
      body_fat_percentage: updates.bodyFatPercentage,
      notes: updates.notes,
    })
    .eq('id', measurementId)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to update measurement');
  return data;
}

/**
 * Delete a measurement
 */
export async function deleteMeasurement(measurementId: string): Promise<void> {
  const { error } = await supabase.from('user_measurements').delete().eq('id', measurementId);

  if (error) throw error;
}

// ============================================================================
// Measurement History
// ============================================================================

/**
 * Get latest measurement for a user
 */
export async function getLatestMeasurement(userId: string): Promise<UserMeasurement | null> {
  const { data, error } = await supabase
    .from('user_measurements')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get all measurements for a user
 */
export async function getAllMeasurements(
  userId: string,
  limit?: number
): Promise<UserMeasurement[]> {
  let query = supabase
    .from('user_measurements')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get measurements for a date range
 */
export async function getMeasurementHistory(
  userId: string,
  startDate: string,
  endDate: string
): Promise<UserMeasurement[]> {
  const { data, error } = await supabase
    .from('user_measurements')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_at', startDate)
    .lte('logged_at', endDate)
    .order('logged_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// Trends & Analysis
// ============================================================================

/**
 * Get measurement trend with change calculations
 */
export async function getMeasurementTrend(
  userId: string,
  startDate: string,
  endDate: string
): Promise<MeasurementTrend[]> {
  const measurements = await getMeasurementHistory(userId, startDate, endDate);

  if (measurements.length === 0) return [];

  const trend: MeasurementTrend[] = measurements.map((measurement, index) => {
    const date = measurement.logged_at.split('T')[0];
    const weightKg = measurement.weight_kg;
    const bodyFatPercentage = measurement.body_fat_percentage;

    // Change from previous measurement
    const changeFromPrevious =
      index > 0 ? Math.round((weightKg - measurements[index - 1].weight_kg) * 10) / 10 : null;

    // Change from first measurement
    const changeFromStart =
      index > 0 ? Math.round((weightKg - measurements[0].weight_kg) * 10) / 10 : null;

    return {
      date,
      weightKg,
      bodyFatPercentage,
      changeFromPrevious,
      changeFromStart,
    };
  });

  return trend;
}

/**
 * Get measurement statistics
 */
export async function getMeasurementStats(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<MeasurementStats | null> {
  // Get all measurements (or filtered by date range)
  let measurements: UserMeasurement[];

  if (startDate && endDate) {
    measurements = await getMeasurementHistory(userId, startDate, endDate);
  } else {
    measurements = await getAllMeasurements(userId);
  }

  if (measurements.length === 0) return null;

  // Sort by date ascending
  const sortedMeasurements = measurements.sort((a, b) =>
    a.logged_at.localeCompare(b.logged_at)
  );

  const currentWeightKg = sortedMeasurements[sortedMeasurements.length - 1].weight_kg;
  const startWeightKg = sortedMeasurements[0].weight_kg;

  // Find lowest and highest
  const weights = sortedMeasurements.map((m) => m.weight_kg);
  const lowestWeightKg = Math.min(...weights);
  const highestWeightKg = Math.max(...weights);

  // Total change
  const totalChangeKg = Math.round((currentWeightKg - startWeightKg) * 10) / 10;

  // Calculate days between first and last
  const firstDate = new Date(sortedMeasurements[0].logged_at);
  const lastDate = new Date(sortedMeasurements[sortedMeasurements.length - 1].logged_at);
  const daysSinceFirstMeasurement = Math.floor(
    (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Average weekly change
  const weeks = daysSinceFirstMeasurement / 7;
  const avgWeeklyChangeKg = weeks > 0 ? Math.round((totalChangeKg / weeks) * 10) / 10 : 0;

  return {
    currentWeightKg,
    startWeightKg,
    lowestWeightKg,
    highestWeightKg,
    totalChangeKg,
    avgWeeklyChangeKg,
    measurementCount: sortedMeasurements.length,
    daysSinceFirstMeasurement,
  };
}

/**
 * Get 7-day moving average
 * Useful for smoothing out daily fluctuations
 */
export async function getMovingAverage(
  userId: string,
  days: number = 7
): Promise<{ date: string; avgWeightKg: number }[]> {
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000).toISOString(); // Get 2x days for calculation

  const measurements = await getMeasurementHistory(userId, startDate, endDate);

  if (measurements.length < days) return [];

  const movingAvg: { date: string; avgWeightKg: number }[] = [];

  for (let i = days - 1; i < measurements.length; i++) {
    const window = measurements.slice(i - days + 1, i + 1);
    const avgWeight = window.reduce((sum, m) => sum + m.weight_kg, 0) / window.length;

    movingAvg.push({
      date: measurements[i].logged_at.split('T')[0],
      avgWeightKg: Math.round(avgWeight * 10) / 10,
    });
  }

  return movingAvg;
}
