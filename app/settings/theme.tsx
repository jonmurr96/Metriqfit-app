import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTokens } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';

type ThemePrefs = {
  reduceMotion: boolean;
  highContrast: boolean;
};

const DEFAULT_PREFS: ThemePrefs = {
  reduceMotion: false,
  highContrast: false,
};

export default function ThemeSettingsScreen() {
  const { c, s, ty } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [prefs, setPrefs] = useState<ThemePrefs>(DEFAULT_PREFS);
  const storageKey = useMemo(() => `settings:theme:${user?.id ?? 'guest'}`, [user?.id]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (!mounted || !raw) return;
        const parsed = JSON.parse(raw) as Partial<ThemePrefs>;
        setPrefs({ ...DEFAULT_PREFS, ...parsed });
      } catch {
        // Keep defaults when no stored prefs exist.
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [storageKey]);

  const updatePref = async (key: keyof ThemePrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await AsyncStorage.setItem(storageKey, JSON.stringify(next));
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top + s.md }]}> 
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <TabBarIcon name="chevron-back" color={c.text} size={22} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 18 }}>Theme</Text>
        <View style={styles.backButton} />
      </View>

      <View style={{ paddingHorizontal: s.lg, marginTop: s.xl, gap: s.md }}>
        <View style={[styles.card, { borderColor: c.border, backgroundColor: c.surface }]}> 
          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: 15 }}>Current theme</Text>
          <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, marginTop: 6 }}>Neon Void</Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 6, lineHeight: 20 }}>
            Additional theme packs are planned. This screen controls readability preferences today.
          </Text>
        </View>

        <View style={[styles.switchRow, { borderColor: c.border, backgroundColor: c.surface }]}> 
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>Reduce motion</Text>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 4 }}>Use calmer transitions where available</Text>
          </View>
          <Switch
            value={prefs.reduceMotion}
            onValueChange={(next) => updatePref('reduceMotion', next)}
            trackColor={{ false: c.surface2, true: `${c.primary}70` }}
            thumbColor={prefs.reduceMotion ? c.primary : '#9ca3af'}
          />
        </View>

        <View style={[styles.switchRow, { borderColor: c.border, backgroundColor: c.surface }]}> 
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>High contrast accents</Text>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 4 }}>Increase visual emphasis for key controls</Text>
          </View>
          <Switch
            value={prefs.highContrast}
            onValueChange={(next) => updatePref('highContrast', next)}
            trackColor={{ false: c.surface2, true: `${c.primary}70` }}
            thumbColor={prefs.highContrast ? c.primary : '#9ca3af'}
          />
        </View>
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
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  switchRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
});
