import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { supabase } from '../lib/supabase';
import type { NotificationPreferences } from '../lib/preferences';
import type { MealTimes } from './mealTimesService';

export type NotificationCategory = keyof NotificationPreferences;

export interface NotificationPermissionState {
  permissionStatus: Notifications.PermissionStatus;
  canAskAgain: boolean;
}

const WATER_REMINDER_SLOTS = [
  { hour: 10, minute: 0, title: 'Hydration check', body: 'Log a quick water update and stay on pace today.' },
  { hour: 14, minute: 0, title: 'Water reminder', body: 'A mid-day glass of water keeps your streak moving.' },
  { hour: 18, minute: 0, title: 'Finish strong', body: 'Close out the day with one more water check-in.' },
] as const;

const WORKOUT_REMINDER_SLOT = {
  hour: 18,
  minute: 0,
  title: 'Workout reminder',
  body: 'Your next session is ready when you are.',
} as const;

const WEEKLY_SUMMARY_SLOT = {
  weekday: 1,
  hour: 19,
  minute: 0,
  title: 'Weekly summary ready',
  body: 'Open MetriqFit to review your weekly progress snapshot.',
} as const;

const SCHEDULED_NOTIFICATION_IDS_KEY_PREFIX = 'notifications:scheduled:';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getScheduledIdsKey(userId: string): string {
  return `${SCHEDULED_NOTIFICATION_IDS_KEY_PREFIX}${userId}`;
}

async function readScheduledNotificationIds(userId: string): Promise<Partial<Record<NotificationCategory, string[]>>> {
  try {
    const raw = await AsyncStorage.getItem(getScheduledIdsKey(userId));
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Record<NotificationCategory, string[]>>;
  } catch (error) {
    console.warn('Failed to read scheduled notification ids:', error);
    return {};
  }
}

async function writeScheduledNotificationIds(
  userId: string,
  idsByCategory: Partial<Record<NotificationCategory, string[]>>,
): Promise<void> {
  try {
    await AsyncStorage.setItem(getScheduledIdsKey(userId), JSON.stringify(idsByCategory));
  } catch (error) {
    console.warn('Failed to persist scheduled notification ids:', error);
  }
}

async function updateStoredCategoryIds(
  userId: string,
  category: NotificationCategory,
  ids: string[],
): Promise<void> {
  const current = await readScheduledNotificationIds(userId);
  current[category] = ids;
  await writeScheduledNotificationIds(userId, current);
}

function parseTimeString(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value || '');
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute };
}

async function scheduleDailyNotification(title: string, body: string, hour: number, minute: number): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

async function scheduleWeeklySummaryNotification(): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: WEEKLY_SUMMARY_SLOT.title,
      body: WEEKLY_SUMMARY_SLOT.body,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: WEEKLY_SUMMARY_SLOT.weekday,
      hour: WEEKLY_SUMMARY_SLOT.hour,
      minute: WEEKLY_SUMMARY_SLOT.minute,
    },
  });
}

async function scheduleCategoryNotifications(category: NotificationCategory, mealTimes: MealTimes): Promise<string[]> {
  switch (category) {
    case 'workoutReminders':
      return [
        await scheduleDailyNotification(
          WORKOUT_REMINDER_SLOT.title,
          WORKOUT_REMINDER_SLOT.body,
          WORKOUT_REMINDER_SLOT.hour,
          WORKOUT_REMINDER_SLOT.minute,
        ),
      ];
    case 'mealReminders': {
      const mealSchedules = [
        { label: 'Breakfast', body: 'Breakfast is coming up on your schedule.', time: parseTimeString(mealTimes.breakfast) },
        { label: 'Lunch', body: 'Lunch reminder. Log it while it is fresh.', time: parseTimeString(mealTimes.lunch) },
        { label: 'Dinner', body: 'Dinner reminder. Keep your nutrition timeline complete.', time: parseTimeString(mealTimes.dinner) },
        { label: 'Snack', body: 'Snack reminder. Add a quick check-in if you need one.', time: mealTimes.snack === 'anytime' ? null : parseTimeString(mealTimes.snack) },
      ];

      const ids: string[] = [];
      for (const item of mealSchedules) {
        if (!item.time) continue;
        ids.push(await scheduleDailyNotification(item.label, item.body, item.time.hour, item.time.minute));
      }
      return ids;
    }
    case 'waterReminders': {
      const ids: string[] = [];
      for (const reminder of WATER_REMINDER_SLOTS) {
        ids.push(await scheduleDailyNotification(reminder.title, reminder.body, reminder.hour, reminder.minute));
      }
      return ids;
    }
    case 'weeklySummary':
      return [await scheduleWeeklySummaryNotification()];
    default:
      return [];
  }
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  const permissions = await Notifications.getPermissionsAsync();
  return {
    permissionStatus: permissions.status,
    canAskAgain: permissions.canAskAgain,
  };
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  const current = await getNotificationPermissionState();
  if (current.permissionStatus === 'granted' || !current.canAskAgain) {
    return current;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return {
    permissionStatus: requested.status,
    canAskAgain: requested.canAskAgain,
  };
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#22D3EE',
  });
}

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  await ensureAndroidChannel();

  const permissions = await getNotificationPermissionState();
  if (permissions.permissionStatus !== 'granted') {
    return undefined;
  }

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device.');
    return undefined;
  }

  try {
    return (await Notifications.getExpoPushTokenAsync()).data;
  } catch (error) {
    console.error('Failed to get Expo push token', error);
    return undefined;
  }
}

export async function savePushTokenToProfile(userId: string, pushToken: string | null): Promise<void> {
  try {
    const { error } = await supabase.from('profiles').update({ push_token: pushToken }).eq('id', userId);
    if (error) {
      console.error('Error saving push token to profile:', error);
    }
  } catch (error) {
    console.error('Failed to save push token:', error);
  }
}

export async function clearPushTokenFromProfile(userId: string): Promise<void> {
  await savePushTokenToProfile(userId, null);
}

export async function openSystemSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch (error) {
    console.warn('Unable to open system settings:', error);
  }
}

export async function enableNotificationCategory(
  userId: string,
  category: NotificationCategory,
  mealTimes: MealTimes,
): Promise<NotificationPermissionState & { expoPushToken?: string }> {
  const permissionState = await requestNotificationPermission();
  if (permissionState.permissionStatus !== 'granted') {
    return permissionState;
  }

  const token = await registerForPushNotificationsAsync();
  if (token) {
    await savePushTokenToProfile(userId, token);
  }

  await disableNotificationCategory(userId, category);
  const ids = await scheduleCategoryNotifications(category, mealTimes);
  await updateStoredCategoryIds(userId, category, ids);

  return {
    ...permissionState,
    expoPushToken: token,
  };
}

export async function disableNotificationCategory(userId: string, category: NotificationCategory): Promise<void> {
  const current = await readScheduledNotificationIds(userId);
  const ids = current[category] || [];

  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (error) {
      console.warn(`Failed to cancel notification ${id}:`, error);
    }
  }

  current[category] = [];
  await writeScheduledNotificationIds(userId, current);
}

export async function rescheduleEnabledNotifications(
  userId: string,
  preferences: NotificationPreferences,
  mealTimes: MealTimes,
): Promise<void> {
  const categories = Object.entries(preferences) as [NotificationCategory, boolean][];
  for (const [category, enabled] of categories) {
    await disableNotificationCategory(userId, category);
    if (enabled) {
      const ids = await scheduleCategoryNotifications(category, mealTimes);
      await updateStoredCategoryIds(userId, category, ids);
    }
  }
}

export async function syncNotificationDeliveryState(
  userId: string,
  preferences: NotificationPreferences,
): Promise<void> {
  const hasEnabledCategory = Object.values(preferences).some(Boolean);
  if (!hasEnabledCategory) {
    await clearPushTokenFromProfile(userId);
  }
}

export async function clearNotificationState(userId: string): Promise<void> {
  const current = await readScheduledNotificationIds(userId);
  const categories = Object.keys(current) as NotificationCategory[];
  for (const category of categories) {
    await disableNotificationCategory(userId, category);
  }

  await clearPushTokenFromProfile(userId);
}
