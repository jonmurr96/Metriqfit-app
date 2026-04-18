import React from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { useProfile, useUpdateProfile } from '../../hooks/useUser';
import { FoodMeasurement } from '../../lib/nutrition/displayUnits';
import { DisplayPreferences } from '../../lib/preferences';

export default function UnitsSettingsScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const currentUnit = profile?.unit_system ?? 'imperial';
  const currentFoodMeasurement: FoodMeasurement =
    profile?.display_preferences?.food_measurement ??
    (currentUnit === 'imperial' ? 'imperial_mixed' : 'metric');

  const handleSelectUnit = async (unit: 'imperial' | 'metric') => {
    if (unit === currentUnit || updateProfile.isPending) {
      return;
    }
    try {
      await updateProfile.mutateAsync({ unit_system: unit });
      Alert.alert('Units updated', `Now using ${unit === 'imperial' ? 'Imperial (lbs)' : 'Metric (kg)'} units.`);
    } catch (error: any) {
      Alert.alert('Update failed', error?.message || 'Could not save unit preference.');
    }
  };

  const handleSelectFoodMeasurement = async (measurement: FoodMeasurement) => {
    if (measurement === currentFoodMeasurement || updateProfile.isPending) {
      return;
    }
    try {
      await updateProfile.mutateAsync({
        display_preferences: {
          ...(profile?.display_preferences ?? {}),
          food_measurement: measurement,
        } as DisplayPreferences,
      });
    } catch (error: any) {
      Alert.alert('Update failed', error?.message || 'Could not save food measurement preference.');
    }
  };

  const UnitCard = ({
    title,
    subtitle,
    selected,
    onPress,
  }: {
    title: string;
    subtitle: string;
    selected: boolean;
    onPress: () => void;
  }) => {
    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.option,
          {
            borderColor: selected ? c.primary : c.border,
            backgroundColor: selected ? `${c.primary}14` : c.surface,
            borderRadius: r.md,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: 16 }}>{title}</Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 4 }}>{subtitle}</Text>
        </View>
        {selected ? (
          <TabBarIcon name="checkmark-circle" color={c.primary} size={22} />
        ) : (
          <TabBarIcon name="ellipse-outline" color={c.textSubtle} size={22} />
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top + s.md }]}> 
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <TabBarIcon name="chevron-back" color={c.text} size={22} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 18 }}>Units</Text>
        <View style={styles.backButton} />
      </View>

      <View style={{ paddingHorizontal: s.lg, marginTop: s.xl, gap: s.xl }}>
        <View style={{ gap: s.md }}>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 16 }}>Body units</Text>
          <UnitCard
            title="Imperial"
            subtitle="Weight in lbs, height in ft/in"
            selected={currentUnit === 'imperial'}
            onPress={() => handleSelectUnit('imperial')}
          />
          <UnitCard
            title="Metric"
            subtitle="Weight in kg, height in cm"
            selected={currentUnit === 'metric'}
            onPress={() => handleSelectUnit('metric')}
          />
        </View>

        <View style={{ gap: s.md }}>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 16 }}>Food quantities</Text>
          <UnitCard
            title="Metric"
            subtitle="Grams for everything"
            selected={currentFoodMeasurement === 'metric'}
            onPress={() => handleSelectFoodMeasurement('metric')}
          />
          <UnitCard
            title="Imperial"
            subtitle="Ounces for protein, grams for carbs & fats"
            selected={currentFoodMeasurement === 'imperial_mixed'}
            onPress={() => handleSelectFoodMeasurement('imperial_mixed')}
          />
        </View>

        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, lineHeight: 20 }}>
          We store canonical values in grams and convert display units automatically.
        </Text>

        {updateProfile.isPending && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: s.sm }}>
            <ActivityIndicator size="small" color={c.primary} />
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>Saving preference...</Text>
          </View>
        )}
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
  option: {
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
