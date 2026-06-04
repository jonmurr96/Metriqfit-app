import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
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
    <View className="flex-1" style={{ backgroundColor: c.bg, paddingTop: insets.top + s.md }}>
      <View className="flex-row items-center justify-between mb-4" style={{ paddingHorizontal: s.lg }}>
        <Pressable
          className="w-[42px] h-[42px] border items-center justify-center"
          style={{ backgroundColor: c.surface, borderColor: c.border, borderRadius: r.md }}
          onPress={() => router.back()}
        >
          <TabBarIcon name="chevron-back" color={c.text} size={22} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>Edit Macros</Text>
        <View className="w-[42px]" />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: s.lg, paddingBottom: insets.bottom + s.xl }}>
        <Text className="text-sm mb-[14px]" style={{ color: c.textMuted, fontFamily: ty.body.family }}>Adjust your daily macro targets.</Text>

        {[
          { label: 'Calories (kcal)', value: calories, setter: setCalories },
          { label: 'Protein (g)', value: protein, setter: setProtein },
          { label: 'Carbs (g)', value: carbs, setter: setCarbs },
          { label: 'Fats (g)', value: fat, setter: setFat },
        ].map((field) => (
          <View key={field.label} className="mb-3">
            <Text className="text-[13px] mb-[6px]" style={{ color: c.text, fontFamily: ty.body.familySemibold }}>{field.label}</Text>
            <TextInput
              keyboardType="numeric"
              value={field.value}
              onChangeText={field.setter}
              className="border h-12 px-3 text-base"
              style={{ color: c.text, borderColor: c.border, backgroundColor: c.surface, borderRadius: r.md, fontFamily: ty.body.family }}
              placeholderTextColor={c.textSubtle}
            />
          </View>
        ))}

        <View className="border p-3 mt-1" style={{ borderColor: c.border, backgroundColor: c.surface2, borderRadius: r.md }}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>Calories from macros: {estimatedCalories} kcal</Text>
        </View>

        <Pressable
          className="h-[52px] items-center justify-center mt-[18px]"
          style={{ backgroundColor: c.primary, borderRadius: r.md }}
          onPress={save}
          disabled={updateMacros.isPending}
        >
          <Text style={{ color: c.bg, fontFamily: ty.heading.familySemibold }}>Save Changes</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
