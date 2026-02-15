/**
 * React Query hooks for User Profile, Targets, and Measurements
 * Handles user data management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth/AuthProvider';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase/types';

// Types
export interface Profile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  sex: 'male' | 'female' | 'other' | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  unit_system: 'metric' | 'imperial';
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserTargets {
  id: string;
  user_id: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
  fiber_g: number | null;
  created_at: string;
  updated_at: string;
}

export interface Measurement {
  id: string;
  user_id: string;
  weight_kg: number;
  body_fat_percentage: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arms_cm: number | null;
  thighs_cm: number | null;
  hips_cm: number | null;
  logged_at: string;
  notes: string | null;
  created_at: string;
}

export interface OnboardingAnswersRecord {
  id: string;
  user_id: string;
  answers: Database['public']['Tables']['onboarding_answers']['Row']['answers'];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Query Keys
export const userKeys = {
  all: ['user'] as const,
  profile: (userId: string) => [...userKeys.all, 'profile', userId] as const,
  targets: (userId: string) => [...userKeys.all, 'targets', userId] as const,
  measurements: (userId: string) => [...userKeys.all, 'measurements', userId] as const,
  measurementsHistory: (userId: string, limit: number) =>
    [...userKeys.measurements(userId), 'history', limit] as const,
  onboarding: (userId: string) => [...userKeys.all, 'onboarding', userId] as const,
};

/**
 * Get user profile
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Get user targets
 */
export async function getUserTargets(userId: string): Promise<UserTargets | null> {
  const { data, error } = await supabase
    .from('user_targets')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Get weight measurements history
 */
export async function getMeasurements(userId: string, limit = 30): Promise<Measurement[]> {
  const { data, error } = await supabase
    .from('user_measurements')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get onboarding answers payload.
 */
export async function getOnboardingAnswers(userId: string): Promise<OnboardingAnswersRecord | null> {
  const { data, error } = await supabase
    .from('onboarding_answers')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Log a measurement
 */
export async function logMeasurement(
  userId: string,
  weightKg: number,
  bodyFatPct?: number,
  measurements?: {
    waist?: number;
    chest?: number;
    arms?: number;
    thighs?: number;
    hips?: number;
  },
  notes?: string
): Promise<Measurement> {
  const { data, error } = await supabase
    .from('user_measurements')
    .insert({
      user_id: userId,
      weight_kg: weightKg,
      body_fat_percentage: bodyFatPct,
      waist_cm: measurements?.waist,
      chest_cm: measurements?.chest,
      arms_cm: measurements?.arms,
      thighs_cm: measurements?.thighs,
      hips_cm: measurements?.hips,
      logged_at: new Date().toISOString(),
      notes,
    } satisfies Database['public']['Tables']['user_measurements']['Insert'])
    .select()
    .single();

  if (error) throw error;

  // Also update current weight in profile
  await supabase
    .from('profiles')
    .update({
      current_weight_kg: weightKg,
      updated_at: new Date().toISOString()
    } satisfies Database['public']['Tables']['profiles']['Update'])
    .eq('id', userId);

  return data!;
}

/**
 * Update profile
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    } satisfies Database['public']['Tables']['profiles']['Update'])
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data!;
}

/**
 * Delete a measurement
 */
export async function deleteMeasurement(measurementId: string): Promise<void> {
  const { error } = await supabase.from('user_measurements').delete().eq('id', measurementId);

  if (error) throw error;
}

// ... (I will implement getUserStreak here)

/**
 * Get user streak based on consecutive days of activity
 */
export async function getUserStreak(userId: string): Promise<number> {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch workouts and meals in last 30 days
  const [workouts, meals] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select('started_at')
      .eq('user_id', userId)
      .gte('started_at', thirtyDaysAgo.toISOString()),
    supabase
      .from('meal_logs')
      .select('logged_at')
      .eq('user_id', userId)
      .gte('logged_at', thirtyDaysAgo.toISOString())
  ]);

  if (workouts.error) throw workouts.error;
  if (meals.error) throw meals.error;

  const activityDates = new Set<string>();

  workouts.data?.forEach(w => {
    if (w.started_at) {
      activityDates.add(new Date(w.started_at).toDateString());
    }
  });

  meals.data?.forEach(m => {
    if (m.logged_at) {
      activityDates.add(new Date(m.logged_at).toDateString());
    }
  });

  let streak = 0;
  const checkDate = new Date();

  // Check today
  if (activityDates.has(checkDate.toDateString())) {
    streak++;
  } else {
    // If no activity today, check if we had activity yesterday (streak still alive but not incremented for today yet? 
    // Usually streak counts consecutive days up to yesterday + today if done.
    // If I haven't done anything today, is my streak 0? checking logic from typical apps:
    // If I worked out verify yesterday, streak is X. If I work out today, streak becomes X+1.
    // However, for simplicity let's count backwards from today. If today is missing, check yesterday. 
    // If yesterday is missing, streak is 0. 
    // Actually typically current streak includes today if done, or ends yesterday.
  }

  // Let's count backwards from today (or yesterday if today is empty)
  // But strictly, let's count backwards from yesterday, and add 1 if today is present?
  // Or just iterate backwards from today.

  // Simple iteration backwards
  let current = new Date();
  let streakCount = 0;

  // If today has activity
  if (activityDates.has(current.toDateString())) {
    streakCount++;
    current.setDate(current.getDate() - 1);
  } else {
    // If today has NO activity, check if yesterday has activity. 
    // If yesterday has activity, we are still on a streak, just haven't extended it today.
    // If yesterday has NO activity, streak is 0.
    // Wait, if today is missing, we shouldn't count today. We start checking from yesterday.
    current.setDate(current.getDate() - 1);
  }

  while (activityDates.has(current.toDateString())) {
    streakCount++;
    current.setDate(current.getDate() - 1);
  }

  return streakCount;
}

// --- React Query Hooks ---

/**
 * Get current user profile
 */
export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: userKeys.profile(user?.id || ''),
    queryFn: () => getProfile(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get user targets (macros, water)
 */
export function useUserTargets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: userKeys.targets(user?.id || ''),
    queryFn: () => getUserTargets(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get onboarding answers JSON payload.
 */
export function useOnboardingAnswers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: userKeys.onboarding(user?.id || ''),
    queryFn: () => getOnboardingAnswers(user!.id),
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Get weight measurement history
 */
export function useMeasurements(limit = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: userKeys.measurementsHistory(user?.id || '', limit),
    queryFn: () => getMeasurements(user!.id, limit),
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Update profile mutation
 */
export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) =>
      updateProfile(user!.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: userKeys.profile(user!.id),
      });
    },
  });
}

/**
 * Log weight measurement mutation
 */
export function useLogMeasurement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      weightKg,
      bodyFatPct,
      measurements,
      notes,
    }: {
      weightKg: number;
      bodyFatPct?: number;
      measurements?: {
        waist?: number;
        chest?: number;
        arms?: number;
        thighs?: number;
        hips?: number;
      };
      notes?: string;
    }) => logMeasurement(user!.id, weightKg, bodyFatPct, measurements, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: userKeys.measurements(user!.id),
      });
      queryClient.invalidateQueries({
        queryKey: userKeys.profile(user!.id),
      });
    },
  });
}

/**
 * Delete measurement mutation
 */
export function useDeleteMeasurement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (measurementId: string) => deleteMeasurement(measurementId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: userKeys.measurements(user!.id),
      });
    },
  });
}

/**
 * Combined hook for dashboard data
 */
export function useUserDashboard() {
  const profileQuery = useProfile();
  const targetsQuery = useUserTargets();

  return {
    // Data
    profile: profileQuery.data,
    targets: targetsQuery.data,

    // Loading
    isLoading: profileQuery.isLoading || targetsQuery.isLoading,

    // Computed helpers
    displayName: profileQuery.data?.first_name || profileQuery.data?.email || 'User',
    currentWeight: profileQuery.data?.current_weight_kg,
    unitSystem: profileQuery.data?.unit_system || 'metric',

    // Target values (with defaults)
    calorieTarget: targetsQuery.data?.calories || 2000,
    proteinTarget: targetsQuery.data?.protein_g || 150,
    carbsTarget: targetsQuery.data?.carbs_g || 200,
    fatTarget: targetsQuery.data?.fat_g || 65,
    waterTarget: targetsQuery.data?.water_ml || 2500,
  };
}

/**
 * Get user streak
 */
export function useStreak() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user', 'streak', user?.id],
    queryFn: () => getUserStreak(user!.id),
    enabled: !!user,
    staleTime: 60 * 60 * 1000 // 1 hour
  });
}

/**
 * Count workout sessions completed this week (Monday through today)
 */
async function getWorkoutsThisWeek(userId: string): Promise<number> {
  const now = new Date();
  // Get start of week (Monday)
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon...
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('workout_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('started_at', monday.toISOString());

  if (error) throw error;
  return count || 0;
}

export function useWorkoutsThisWeek() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user', 'workoutsThisWeek', user?.id],
    queryFn: () => getWorkoutsThisWeek(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
