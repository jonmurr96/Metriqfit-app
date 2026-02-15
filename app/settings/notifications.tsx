import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTokens } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';

type NotificationPrefs = {
  workoutReminders: boolean;
  mealReminders: boolean;
  waterReminders: boolean;
  weeklySummary: boolean;
};

const DEFAULT_PREFS: NotificationPrefs = {
  workoutReminders: false,
  mealReminders: false,
  waterReminders: false,
  weeklySummary: true,
};

export default function NotificationsSettingsScreen() {
  const { c, s, ty } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const storageKey = useMemo(() => `settings:notifications:${user?.id ?? 'guest'}`, [user?.id]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (!mounted || !raw) return;
        const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
        setPrefs({ ...DEFAULT_PREFS, ...parsed });
      } catch {
        // Keep defaults if parsing/loading fails.
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [storageKey]);

  const updatePref = async (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);

    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      Alert.alert('Save failed', 'Could not save notification preference.');
    }
  };

  const Row = ({
    title,
    subtitle,
    value,
    onValueChange,
  }: {
    title: string;
    subtitle: string;
    value: boolean;
    onValueChange: (next: boolean) => void;
  }) => (
    <View style={[styles.row, { borderColor: c.border, backgroundColor: c.surface }]}> 
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: 15 }}>{title}</Text>
        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 4 }}>{subtitle}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: c.surface2, true: `${c.primary}70` }} thumbColor={value ? c.primary : '#9ca3af'} />
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
        <Row
          title="Workout reminders"
          subtitle="Remind me at my scheduled training time"
          value={prefs.workoutReminders}
          onValueChange={(next) => updatePref('workoutReminders', next)}
        />
        <Row
          title="Meal reminders"
          subtitle="Remind me around my preferred meal schedule"
          value={prefs.mealReminders}
          onValueChange={(next) => updatePref('mealReminders', next)}
        />
        <Row
          title="Water reminders"
          subtitle="Light nudges throughout the day"
          value={prefs.waterReminders}
          onValueChange={(next) => updatePref('waterReminders', next)}
        />
        <Row
          title="Weekly summary"
          subtitle="Receive a weekly recap every Sunday"
          value={prefs.weeklySummary}
          onValueChange={(next) => updatePref('weeklySummary', next)}
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
  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
