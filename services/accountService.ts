import * as ExpoLinking from 'expo-linking';
import { Platform, Share } from 'react-native';

import { supabase } from '../lib/supabase';
import { getSubscription } from './subscriptionService';
import { getMealTimes } from './mealTimesService';
import {
  normalizeDisplayPreferences,
  normalizeNotificationPreferences,
} from '../lib/preferences';

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

export async function exportMyData(userId: string) {
  const [{ data: profile, error: profileError }, subscription, mealTimes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    getSubscription(userId),
    getMealTimes(userId),
  ]);

  if (profileError) throw profileError;

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
  };

  const message = JSON.stringify(payload, null, 2);

  await Share.share({
    title: 'MetriqFit Data Export',
    message,
  });

  return payload;
}

export async function deleteMyAccount() {
  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: { confirm: true },
  });

  if (error) throw error;
  if (!data?.success) {
    throw new Error(data?.error || 'Account deletion failed.');
  }

  return data;
}
