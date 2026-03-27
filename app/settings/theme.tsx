import React from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { useProfile, useUpdateProfile } from '../../hooks/useUser';
import { getPreferredAppearanceLabel } from '../../lib/preferences';

export default function AccessibilityDisplayScreen() {
  const { c, s, ty } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();
  const updateProfileMutation = useUpdateProfile();

  const prefs = profile?.display_preferences;

  const updatePreference = async (key: 'reduceMotion' | 'highContrast', value: boolean) => {
    if (!prefs) return;

    try {
      await updateProfileMutation.mutateAsync({
        display_preferences: {
          ...prefs,
          [key]: value,
          preferredAppearanceLabel: getPreferredAppearanceLabel({
            ...prefs,
            [key]: value,
          }),
        },
      });
    } catch (error: any) {
      Alert.alert('Save failed', error?.message || 'Could not update display preferences.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top + s.md }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <TabBarIcon name="chevron-back" color={c.text} size={22} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 18 }}>
          Accessibility & Display
        </Text>
        <View style={styles.backButton} />
      </View>

      <View style={{ paddingHorizontal: s.lg, marginTop: s.xl, gap: s.md }}>
        <View style={[styles.card, { borderColor: c.border, backgroundColor: c.surface }]}>
          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: 15 }}>
            Current mode
          </Text>
          <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, marginTop: 6 }}>
            {prefs?.preferredAppearanceLabel || 'Standard'}
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 6, lineHeight: 20 }}>
            These controls affect app motion and contrast globally. Cosmetic theme packs are not exposed in production.
          </Text>
        </View>

        <View style={[styles.switchRow, { borderColor: c.border, backgroundColor: c.surface }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>Reduce motion</Text>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 4 }}>
              Turns off screen transition animations and uses calmer movement.
            </Text>
          </View>
          <Switch
            value={Boolean(prefs?.reduceMotion)}
            onValueChange={(next) => updatePreference('reduceMotion', next)}
            trackColor={{ false: c.surface2, true: `${c.primary}70` }}
            thumbColor={prefs?.reduceMotion ? c.primary : '#9ca3af'}
            disabled={updateProfileMutation.isPending}
          />
        </View>

        <View style={[styles.switchRow, { borderColor: c.border, backgroundColor: c.surface }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>High contrast</Text>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 4 }}>
              Increases border and text contrast for key surfaces and controls.
            </Text>
          </View>
          <Switch
            value={Boolean(prefs?.highContrast)}
            onValueChange={(next) => updatePreference('highContrast', next)}
            trackColor={{ false: c.surface2, true: `${c.primary}70` }}
            thumbColor={prefs?.highContrast ? c.primary : '#9ca3af'}
            disabled={updateProfileMutation.isPending}
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
