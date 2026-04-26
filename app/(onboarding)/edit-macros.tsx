import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { useUserTargets } from '../../hooks/useUser';
import { useSetReviewSectionAccepted, useUpdateReviewMacros } from '../../hooks/useOnboardingReview';
import { trackEvent } from '../../lib/analytics';

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function EditMacrosScreen() {
  const { c, s, ty, r } = useTokens();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ runId?: string }>();
  const runId = typeof params.runId === 'string' ? params.runId : null;

  const { data: targetData, isLoading: targetsLoading } = useUserTargets();
  const targets = useMemo(
    () => ({
      calories: Number(targetData?.calories || 2000),
      protein_g: Number(targetData?.protein_g || 150),
      carbs_g: Number(targetData?.carbs_g || 200),
      fat_g: Number(targetData?.fat_g || 65),
    }),
    [targetData?.calories, targetData?.carbs_g, targetData?.fat_g, targetData?.protein_g],
  );
  const updateMacros = useUpdateReviewMacros();
  const setSectionAccepted = useSetReviewSectionAccepted();

  const [calories, setCalories] = useState(String(targets.calories));
  const [protein, setProtein] = useState(String(targets.protein_g));
  const [carbs, setCarbs] = useState(String(targets.carbs_g));
  const [fat, setFat] = useState(String(targets.fat_g));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (targetsLoading || hydrated) return;
    setCalories(String(targets.calories));
    setProtein(String(targets.protein_g));
    setCarbs(String(targets.carbs_g));
    setFat(String(targets.fat_g));
    setHydrated(true);
  }, [targets, targetsLoading, hydrated]);

  const estimatedCalories = useMemo(() => {
    const p = toNumber(protein, targets.protein_g);
    const cals = toNumber(carbs, targets.carbs_g);
    const f = toNumber(fat, targets.fat_g);
    return Math.round(p * 4 + cals * 4 + f * 9);
  }, [protein, carbs, fat, targets]);

  const save = async () => {
    const payload = {
      calories: Math.round(toNumber(calories, targets.calories)),
      protein_g: Math.round(toNumber(protein, targets.protein_g)),
      carbs_g: Math.round(toNumber(carbs, targets.carbs_g)),
      fat_g: Math.round(toNumber(fat, targets.fat_g)),
    };

    if (payload.calories < 1000 || payload.calories > 6000) {
      Alert.alert('Invalid calories', 'Please enter a value between 1000 and 6000.');
      return;
    }

    if (payload.protein_g < 40 || payload.carbs_g < 20 || payload.fat_g < 20) {
      Alert.alert('Invalid macros', 'Protein, carbs, and fats must be above minimum safe values.');
      return;
    }

    const macroCalories = payload.protein_g * 4 + payload.carbs_g * 4 + payload.fat_g * 9;
    const diffPercent = Math.abs((macroCalories - payload.calories) / Math.max(payload.calories, 1)) * 100;

    if (diffPercent > 15) {
      Alert.alert('Macro mismatch', 'Macro totals are too far from calories. Keep within 15%.');
      return;
    }

    try {
      await updateMacros.mutateAsync(payload);
      if (runId) {
        await setSectionAccepted.mutateAsync({ runId, section: 'macros', accepted: false });
      }
      trackEvent('plan_review_section_edited', { section: 'macros', generation_run_id: runId });
      router.replace({ pathname: '/(onboarding)/plan-review', params: runId ? { runId } : undefined });
    } catch (error: any) {
      Alert.alert('Save failed', error?.message || 'Unable to update macros right now.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top + s.md }]}> 
      <View style={[styles.header, { paddingHorizontal: s.lg }]}> 
        <Pressable style={[styles.iconButton, { backgroundColor: c.surface, borderColor: c.border, borderRadius: r.md }]} onPress={() => router.back()}>
          <TabBarIcon name="chevron-back" color={c.text} size={22} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>Edit Macros</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: s.lg, paddingBottom: insets.bottom + s.xl }}>
        <Text style={[styles.subtitle, { color: c.textMuted, fontFamily: ty.body.family }]}>Adjust your daily macro targets.</Text>

        {[
          { label: 'Calories (kcal)', value: calories, setter: setCalories },
          { label: 'Protein (g)', value: protein, setter: setProtein },
          { label: 'Carbs (g)', value: carbs, setter: setCarbs },
          { label: 'Fats (g)', value: fat, setter: setFat },
        ].map((field) => (
          <View key={field.label} style={styles.fieldWrap}>
            <Text style={[styles.label, { color: c.text, fontFamily: ty.body.familySemibold }]}>{field.label}</Text>
            <TextInput
              keyboardType="numeric"
              value={field.value}
              onChangeText={field.setter}
              style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface, borderRadius: r.md, fontFamily: ty.body.family }]}
              placeholderTextColor={c.textSubtle}
            />
          </View>
        ))}

        <View style={[styles.calorieHint, { borderColor: c.border, backgroundColor: c.surface2, borderRadius: r.md }]}> 
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>Calories from macros: {estimatedCalories} kcal</Text>
        </View>

        <Pressable style={[styles.saveButton, { backgroundColor: c.primary, borderRadius: r.md }]} onPress={save} disabled={updateMacros.isPending}>
          <Text style={{ color: c.bg, fontFamily: ty.heading.familySemibold }}>Save Changes</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 14,
  },
  fieldWrap: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  calorieHint: {
    borderWidth: 1,
    padding: 12,
    marginTop: 4,
  },
  saveButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
});
