import * as ExpoLinking from 'expo-linking';
import { Platform, Share } from 'react-native';

import { supabase } from '../lib/supabase';
import { invokeFunction } from '../lib/supabase/invokeFunction';
import { getSubscription } from './subscriptionService';
import { getMealTimes } from './mealTimesService';
import {
  normalizeDisplayPreferences,
  normalizeNotificationPreferences,
} from '../lib/preferences';

const db = supabase as any;

type ExportTableTarget = {
  key: string;
  table: string;
  column?: string;
  limit?: number;
};

type DeleteAccountResult = {
  success?: boolean;
  error?: string;
};

const EXPORT_TABLE_TARGETS: ExportTableTarget[] = [
  { key: 'onboarding_answers', table: 'onboarding_answers' },
  { key: 'user_targets', table: 'user_targets' },
  { key: 'user_measurements', table: 'user_measurements', limit: 1000 },
  { key: 'water_logs', table: 'water_logs', limit: 1000 },
  { key: 'step_logs', table: 'step_logs', limit: 1000 },
  { key: 'meal_logs', table: 'meal_logs', limit: 1000 },
  { key: 'meal_log_items', table: 'meal_log_items', limit: 3000 },
  { key: 'food_favorites', table: 'food_favorites', limit: 1000 },
  { key: 'recipes', table: 'recipes', limit: 1000 },
  { key: 'recipe_import_events', table: 'recipe_import_events', limit: 1000 },
  { key: 'pantry_items', table: 'pantry_items', limit: 1000 },
  { key: 'pantry_transactions', table: 'pantry_transactions', limit: 1000 },
  { key: 'grocery_lists', table: 'grocery_lists', limit: 500 },
  { key: 'user_workout_plans', table: 'user_workout_plans', limit: 500 },
  { key: 'workout_sessions', table: 'workout_sessions', limit: 1000 },
  { key: 'session_exercises', table: 'session_exercises', limit: 3000 },
  { key: 'workout_sets', table: 'workout_sets', limit: 5000 },
  { key: 'user_prs', table: 'user_prs', limit: 1000 },
  { key: 'progress_photos', table: 'progress_photos', limit: 1000 },
  { key: 'ai_coach_messages', table: 'ai_coach_messages', limit: 1000 },
  { key: 'ai_coach_threads', table: 'ai_coach_threads', limit: 1000 },
  { key: 'ai_coach_memory_items', table: 'ai_coach_memory_items', limit: 1000 },
  { key: 'ai_coach_action_proposals', table: 'ai_coach_action_proposals', limit: 1000 },
  { key: 'ai_coach_tool_receipts', table: 'ai_coach_tool_receipts', limit: 1000 },
  { key: 'ai_usage_daily', table: 'ai_usage_daily', limit: 1000 },
  { key: 'user_xp_levels', table: 'user_xp_levels' },
  { key: 'user_xp_events', table: 'user_xp_events', limit: 1000 },
  { key: 'user_streaks', table: 'user_streaks', limit: 1000 },
  { key: 'user_streak_freezes', table: 'user_streak_freezes', limit: 1000 },
  { key: 'user_achievements', table: 'user_achievements', limit: 1000 },
  { key: 'analytics_events', table: 'analytics_events', limit: 1000 },
  { key: 'subscriptions', table: 'subscriptions' },
  { key: 'subscription_events', table: 'subscription_events', limit: 1000 },
  { key: 'onboarding_plan_review_states', table: 'onboarding_plan_review_states', limit: 500 },
];

function getAuthRedirectUrl(path: string): string | undefined {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? `${window.location.origin}${path}` : undefined;
  }

  return ExpoLinking.createURL(path);
}

export async function requestEmailChange(newEmail: string) {
  const email = newEmail.trim().toLowerCase();
  if (!email) {
    throw new Error('Enter a valid email address.');
  }

  const { data, error } = await supabase.auth.updateUser({ email });
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email is required to reset your password.');
  }

  const redirectTo = getAuthRedirectUrl('/sign-in');
  const { data, error } = await supabase.auth.resetPasswordForEmail(
    normalizedEmail,
    redirectTo ? { redirectTo } : undefined,
  );

  if (error) throw error;
  return data;
}

async function fetchExportTable(target: ExportTableTarget, userId: string) {
  const column = target.column || 'user_id';
  let query = db.from(target.table).select('*').eq(column, userId);
  if (target.limit) query = query.limit(target.limit);

  const { data, error } = await query;
  if (error) {
    return {
      key: target.key,
      rows: [],
      warning: error.message || `Could not export ${target.table}.`,
    };
  }

  return {
    key: target.key,
    rows: data || [],
    warning: null,
  };
}

export async function exportMyData(userId: string) {
  const [{ data: profile, error: profileError }, subscription, mealTimes, tableExports] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    getSubscription(userId),
    getMealTimes(userId),
    Promise.all(EXPORT_TABLE_TARGETS.map((target) => fetchExportTable(target, userId))),
  ]);

  if (profileError) throw profileError;

  const data: Record<string, unknown[]> = {};
  const exportWarnings: Record<string, string> = {};
  for (const result of tableExports) {
    data[result.key] = result.rows;
    if (result.warning) exportWarnings[result.key] = result.warning;
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    userId,
    profile: profile
      ? {
          ...profile,
          notification_preferences: normalizeNotificationPreferences(
            profile.notification_preferences,
          ),
          display_preferences: normalizeDisplayPreferences(
            profile.display_preferences,
          ),
        }
      : null,
    subscription,
    meal_times: mealTimes,
    data,
    warnings: exportWarnings,
  };

  const message = JSON.stringify(payload, null, 2);

  await Share.share({
    title: 'MetriqFit Data Export',
    message,
  });

  return payload;
}

export async function deleteMyAccount() {
  const { data, parsedError, rawError } = await invokeFunction<DeleteAccountResult>(() =>
    supabase.functions.invoke('delete-account', {
      body: { confirm: true },
    })
  );

  if (rawError) throw new Error(parsedError?.error || parsedError?.message || rawError?.message || 'Account deletion failed.');
  if (!data?.success) {
    throw new Error(data?.error || 'Account deletion failed.');
  }

  return data;
}
