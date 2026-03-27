import React from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { useProfile, useUpdateProfile } from '../../hooks/useUser';
import { useMealTimes } from '../../hooks/useMealTimes';
import { useNotifications } from '../../hooks/useNotifications';
import { syncNotificationDeliveryState } from '../../services/notificationService';
import type { NotificationPreferences } from '../../lib/preferences';

export default function NotificationsSettingsScreen() {
  const { c, s, ty } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();
  const { mealTimes } = useMealTimes();
  const updateProfileMutation = useUpdateProfile();
  const {
    permissionStatus,
    canAskAgain,
    enableNotifications,
    disableNotifications,
    openSystemSettings,
  } = useNotifications();

  const prefs = profile?.notification_preferences;

  const permissionSummary =
    permissionStatus === 'granted'
      ? 'Authorized'
      : permissionStatus === 'denied'
        ? 'Denied'
        : permissionStatus === 'undetermined'
          ? 'Not enabled'
          : permissionStatus;

  const persistPreferences = async (nextPrefs: NotificationPreferences) => {
    await updateProfileMutation.mutateAsync({
      notification_preferences: nextPrefs,
    });

    if (profile?.id) {
      await syncNotificationDeliveryState(profile.id, nextPrefs);
    }
  };

  const updatePref = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!prefs) return;

    const nextPrefs = { ...prefs, [key]: value };

    try {
      if (value) {
        const permission = await enableNotifications(key, { mealTimes });
        if (permission.permissionStatus !== 'granted') {
          Alert.alert(
            'Notifications unavailable',
            permission.canAskAgain
              ? 'Allow notifications to enable reminders.'
              : 'Notifications are disabled at the system level. Open Settings to re-enable them.',
            permission.canAskAgain
              ? [{ text: 'OK' }]
              : [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open Settings', onPress: () => openSystemSettings() },
                ],
          );
          return;
        }
      } else {
        await disableNotifications(key);
      }

      await persistPreferences(nextPrefs);
    } catch (error: any) {
      Alert.alert('Save failed', error?.message || 'Could not update notification preference.');
    }
  };

  const Row = ({
    title,
    subtitle,
    prefKey,
  }: {
    title: string;
    subtitle: string;
    prefKey: keyof NotificationPreferences;
  }) => (
    <View style={[styles.row, { borderColor: c.border, backgroundColor: c.surface }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: 15 }}>{title}</Text>
        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 4 }}>{subtitle}</Text>
      </View>
      <Switch
        value={Boolean(prefs?.[prefKey])}
        onValueChange={(next) => updatePref(prefKey, next)}
        trackColor={{ false: c.surface2, true: `${c.primary}70` }}
        thumbColor={prefs?.[prefKey] ? c.primary : '#9ca3af'}
        disabled={updateProfileMutation.isPending}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top + s.md }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <TabBarIcon name="chevron-back" color={c.text} size={22} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 18 }}>Notifications</Text>
        <View style={styles.backButton} />
      </View>

      <View style={{ paddingHorizontal: s.lg, marginTop: s.xl, gap: s.md }}>
        <View style={[styles.permissionCard, { borderColor: c.border, backgroundColor: c.surface }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: 15 }}>
                System permission
              </Text>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 4 }}>
                Current status: {permissionSummary}
              </Text>
            </View>
            {permissionStatus === 'denied' && !canAskAgain ? (
              <Pressable onPress={() => openSystemSettings()} style={[styles.settingsButton, { borderColor: c.primary }]}>
                <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold }}>Open Settings</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Row
          title="Workout reminders"
          subtitle="Daily reminder for your training window."
          prefKey="workoutReminders"
        />
        <Row
          title="Meal reminders"
          subtitle="Schedules reminders from your saved meal times."
          prefKey="mealReminders"
        />
        <Row
          title="Water reminders"
          subtitle="Three light hydration nudges during the day."
          prefKey="waterReminders"
        />
        <Row
          title="Weekly summary"
          subtitle="Keeps you eligible for summary delivery and schedules a Sunday recap."
          prefKey="weeklySummary"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  settingsButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
