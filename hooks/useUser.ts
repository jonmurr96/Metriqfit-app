/**
 * React Query hooks for User Profile, Targets, and Measurements
 * Handles user data management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth/AuthProvider';
import { supabase } from '../lib/supabase';
import type { Database, Json } from '../lib/supabase/types';
import {
  DEFAULT_DISPLAY_PREFERENCES,
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizeDisplayPreferences,
  normalizeNotificationPreferences,
  type DisplayPreferences,
  type NotificationPreferences,
} from '../lib/preferences';
import { DEFAULT_MEAL_TIMES, type MealTimes } from '../services/mealTimesService';
import { calculateTargets, type GoalType, type TargetInput } from '../lib/targets/calculateTargets';
import { nutritionDashboardKeys } from './useNutritionDashboard';
import { progressBodyKeys } from './useProgressBody';
import { progressMetricKeys } from './useProgressMetrics';
import { addSentryBreadcrumb, captureSentryIssue, withSentrySpan } from '../lib/sentry';

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
  meal_times: MealTimes | null;
  notification_preferences: NotificationPreferences | null;
  display_preferences: DisplayPreferences | null;
  push_token: string | null;
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
  computation_method?: string;
  day_type_targets_json?: Json | null;
  target_diagnostics_json?: Json | null;
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

function normalizeMealTimes(value: unknown): MealTimes {
  const raw = value && typeof value === 'object' ? (value as Partial<MealTimes>) : {};
  return {
    breakfast: typeof raw.breakfast === 'string' ? raw.breakfast : DEFAULT_MEAL_TIMES.breakfast,
    lunch: typeof raw.lunch === 'string' ? raw.lunch : DEFAULT_MEAL_TIMES.lunch,
    dinner: typeof raw.dinner === 'string' ? raw.dinner : DEFAULT_MEAL_TIMES.dinner,
    snack: typeof raw.snack === 'string' ? raw.snack : DEFAULT_MEAL_TIMES.snack,
  };
}

function toProfile(row: Database['public']['Tables']['profiles']['Row']): Profile {
  return {
    ...row,
    meal_times: normalizeMealTimes(row.meal_times),
    notification_preferences: normalizeNotificationPreferences(
      row.notification_preferences ?? DEFAULT_NOTIFICATION_PREFERENCES,
    ),
    display_preferences: normalizeDisplayPreferences(
      row.display_preferences ?? DEFAULT_DISPLAY_PREFERENCES,
    ),
  };
}

const GOAL_TYPES = new Set<GoalType>([
  'lose_weight',
  'build_muscle',
  'get_fitter',
  'gain_weight',
  'maintain_weight',
  'recomp',
  'increase_endurance',
  'general_fitness',
]);

function numberFromAnswer(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function stringFromAnswer<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? value as T : null;
}

function inferGoalType(previousGoal: unknown, currentWeightLb: number, targetWeightLb: number): GoalType {
  const previous = typeof previousGoal === 'string' && GOAL_TYPES.has(previousGoal as GoalType)
    ? previousGoal as GoalType
    : null;
  const direction = targetWeightLb > currentWeightLb ? 'gain' : 'lose';

  if (direction === 'gain') {
    return previous === 'build_muscle' || previous === 'gain_weight' ? previous : 'gain_weight';
  }

  return previous === 'recomp' || previous === 'lose_weight' ? previous : 'lose_weight';
}

function buildTargetInputFromAnswers(answers: Record<string, unknown>): TargetInput | null {
  const sex = stringFromAnswer(answers.sex, ['male', 'female'] as const);
  const dob = typeof answers.dob === 'string' ? answers.dob : null;
  const heightFt = numberFromAnswer(answers.height_ft);
  const heightIn = numberFromAnswer(answers.height_in);
  const currentWeightLb = numberFromAnswer(answers.current_weight_lb);
  const goalType = stringFromAnswer(answers.goal_type, Array.from(GOAL_TYPES) as GoalType[]);
  const activityLevel = stringFromAnswer(answers.activity_level, ['sedentary', 'lightly_active', 'moderately_active', 'very_active'] as const);
  const trainingDays = numberFromAnswer(answers.training_days_per_week);
  const minutesPerWorkout = typeof answers.minutes_per_workout === 'string' || typeof answers.minutes_per_workout === 'number'
    ? String(answers.minutes_per_workout)
    : null;
  const experienceLevel = stringFromAnswer(answers.experience_level, ['beginner', 'intermediate', 'advanced'] as const);

  if (!sex || !dob || heightFt == null || heightIn == null || currentWeightLb == null || !goalType || !activityLevel || trainingDays == null || !minutesPerWorkout || !experienceLevel) {
    return null;
  }

  return {
    sex,
    dob,
    height_ft: heightFt,
    height_in: heightIn,
    current_weight_lb: currentWeightLb,
    goal_type: goalType,
    activity_level: activityLevel,
    training_days_per_week: trainingDays,
    minutes_per_workout: minutesPerWorkout,
    experience_level: experienceLevel,
    avg_steps: numberFromAnswer(answers.avg_steps),
    target_weight_lb: numberFromAnswer(answers.target_weight_lb),
    target_date: typeof answers.target_date === 'string' ? answers.target_date : null,
    dietary_preference: typeof answers.dietary_preference === 'string' ? answers.dietary_preference as TargetInput['dietary_preference'] : null,
    carb_tolerance: typeof answers.carb_tolerance === 'string' ? answers.carb_tolerance as TargetInput['carb_tolerance'] : null,
  };
}

async function upsertTargetsFromAnswers(userId: string, answers: Record<string, unknown>): Promise<void> {
  const targetInput = buildTargetInputFromAnswers(answers);
  if (!targetInput) {
    console.warn('[updateWeightGoal] Skipping target recalculation because onboarding answers are incomplete.');
    return;
  }

  const targets = calculateTargets(targetInput);
  const { error } = await supabase
    .from('user_targets')
    .upsert({
      user_id: userId,
      calories: targets.calories,
      protein_g: targets.protein_g,
      carbs_g: targets.carbs_g,
      fat_g: targets.fat_g,
      fiber_g: targets.fiber_g,
      water_ml: targets.water_ml,
      computation_method: targets.computation_method,
      updated_at: new Date().toISOString(),
    } satisfies Database['public']['Tables']['user_targets']['Insert'], { onConflict: 'user_id' });

  if (error) throw error;
}

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
  return data ? toProfile(data) : null;
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
 * Set a new weight goal and reset the goal baseline to the user's current weight.
 */
export async function updateWeightGoal(
  userId: string,
  currentWeightLb: number,
  targetWeightLb: number,
): Promise<OnboardingAnswersRecord> {
  return withSentrySpan('Update weight goal', 'user.weight_goal.update', async () => {
    addSentryBreadcrumb('Weight goal update started', 'user.weight_goal', {
      userId,
      currentWeightLb,
      targetWeightLb,
    });

    const existing = await getOnboardingAnswers(userId);
    const previousAnswers = existing?.answers && typeof existing.answers === 'object'
      ? existing.answers as Record<string, unknown>
      : {};
    const nextAnswers = {
      ...previousAnswers,
      current_weight_lb: currentWeightLb,
      goal_type: inferGoalType(previousAnswers.goal_type, currentWeightLb, targetWeightLb),
      target_weight_enabled: true,
      target_weight_lb: targetWeightLb,
      target_date: null,
    };

    await upsertTargetsFromAnswers(userId, nextAnswers);

    const { data, error } = await supabase
      .from('onboarding_answers')
      .upsert({
        user_id: userId,
        answers: nextAnswers as Database['public']['Tables']['onboarding_answers']['Insert']['answers'],
        completed_at: existing?.completed_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies Database['public']['Tables']['onboarding_answers']['Insert'], { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error) {
      captureSentryIssue(error, {
        category: 'backend_failure',
        severity: 'error',
        operation: 'user.weight_goal.onboarding_upsert',
        userId,
      });
      throw error;
    }
    addSentryBreadcrumb('Weight goal update completed', 'user.weight_goal', {
      userId,
      currentWeightLb,
      targetWeightLb,
    });
    return data as OnboardingAnswersRecord;
  });
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
  return withSentrySpan('Log weight measurement', 'user.measurement.log', async () => {
    addSentryBreadcrumb('Weight measurement logging started', 'user.measurement', {
      userId,
      weightKg,
    });

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

    if (error) {
      captureSentryIssue(error, {
        category: 'backend_failure',
        severity: 'error',
        operation: 'user.measurement.insert',
        userId,
      });
      throw error;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        current_weight_kg: weightKg,
        updated_at: new Date().toISOString()
      } satisfies Database['public']['Tables']['profiles']['Update'])
      .eq('id', userId);

    if (profileError) {
      captureSentryIssue(profileError, {
        category: 'backend_failure',
        severity: 'error',
        operation: 'user.measurement.profile_update',
        userId,
      });
      throw profileError;
    }
    addSentryBreadcrumb('Weight measurement logged', 'user.measurement', {
      userId,
      weightKg,
    });
    return data!;
  });
}

/**
 * Update profile
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Profile> {
  const profileUpdates: Database['public']['Tables']['profiles']['Update'] = {
    updated_at: new Date().toISOString(),
  };

  if (updates.email !== undefined) profileUpdates.email = updates.email;
  if (updates.first_name !== undefined) profileUpdates.first_name = updates.first_name;
  if (updates.last_name !== undefined) profileUpdates.last_name = updates.last_name;
  if (updates.date_of_birth !== undefined) profileUpdates.date_of_birth = updates.date_of_birth;
  if (updates.sex !== undefined) profileUpdates.sex = updates.sex;
  if (updates.height_cm !== undefined) profileUpdates.height_cm = updates.height_cm;
  if (updates.current_weight_kg !== undefined) {
    profileUpdates.current_weight_kg = updates.current_weight_kg;
  }
  if (updates.unit_system !== undefined) profileUpdates.unit_system = updates.unit_system;
  if (updates.avatar_url !== undefined) profileUpdates.avatar_url = updates.avatar_url;
  if (updates.push_token !== undefined) profileUpdates.push_token = updates.push_token;
  if (updates.meal_times !== undefined) profileUpdates.meal_times = updates.meal_times as unknown as Json;
  if (updates.notification_preferences !== undefined) {
    profileUpdates.notification_preferences = updates.notification_preferences as unknown as Json;
  }
  if (updates.display_preferences !== undefined) {
    profileUpdates.display_preferences = updates.display_preferences as unknown as Json;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(profileUpdates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return toProfile(data!);
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
 * Update weight goal mutation
 */
export function useUpdateWeightGoal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      currentWeightLb,
      targetWeightLb,
    }: {
      currentWeightLb: number;
      targetWeightLb: number;
    }) => updateWeightGoal(user!.id, currentWeightLb, targetWeightLb),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: userKeys.onboarding(user!.id),
        }),
        queryClient.invalidateQueries({
          queryKey: userKeys.profile(user!.id),
        }),
        queryClient.invalidateQueries({
        queryKey: userKeys.targets(user!.id),
        }),
        queryClient.invalidateQueries({
          queryKey: nutritionDashboardKeys.all,
        }),
        queryClient.invalidateQueries({
          queryKey: ['plans'],
        }),
        queryClient.invalidateQueries({
          queryKey: progressMetricKeys.all,
        }),
        queryClient.invalidateQueries({
          queryKey: progressBodyKeys.all,
        }),
      ]);
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
    onSuccess: async (_measurement, variables) => {
      queryClient.setQueryData<Profile | null>(userKeys.profile(user!.id), (current) => (
        current
          ? {
              ...current,
              current_weight_kg: variables.weightKg,
              updated_at: new Date().toISOString(),
            }
          : current
      ));

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: userKeys.measurements(user!.id),
        }),
        queryClient.invalidateQueries({
          queryKey: userKeys.profile(user!.id),
        }),
        queryClient.invalidateQueries({
          queryKey: progressMetricKeys.all,
        }),
        queryClient.invalidateQueries({
          queryKey: progressBodyKeys.all,
        }),
      ]);
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
