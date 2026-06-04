import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { useOnboardingAnswers, useUserTargets } from '../../hooks/useUser';
import { useSetReviewSectionAccepted, useUpdateReviewDailyTargets } from '../../hooks/useOnboardingReview';
import { trackEvent } from '../../lib/analytics';

function parseNum(text: string, fallback: number) {
  const n = Number(text);
  return Number.isFinite(n) ? n : fallback;
}

function getStepValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 8000;
}

function estimateTDEE(goalType: string | null | undefined, calories: number) {
  switch (goalType) {
    case 'lose_weight':
      return calories + 450;
    case 'recomp':
      return calories + 250;
    case 'gain_weight':
    case 'build_muscle':
      return calories - 300;
    case 'increase_endurance':
      return calories - 150;
    case 'get_fitter':
    default:
      return calories;
  }
}

export default function EditDailyTargetsScreen() {
  const { c, s, ty, r } = useTokens();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ runId?: string }>();
  const runId = typeof params.runId === 'string' ? params.runId : null;

  const { data: targetData, isLoading: targetsLoading } = useUserTargets();
  const { data: onboardingAnswers, isLoading: onboardingLoading } = useOnboardingAnswers();
  const updateDaily = useUpdateReviewDailyTargets();
  const setSectionAccepted = useSetReviewSectionAccepted();
  const targets = useMemo(
    () => ({
      calories: Number(targetData?.calories || 2000),
      water_ml: Number(targetData?.water_ml || 2500),
    }),
    [targetData?.calories, targetData?.water_ml],
  );

  const answers = (onboardingAnswers?.answers || {}) as Record<string, any>;

  const [waterMl, setWaterMl] = useState(String(targets.water_ml));
  const [steps, setSteps] = useState(String(getStepValue(answers.avg_steps)));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (targetsLoading || onboardingLoading || hydrated) return;
    setWaterMl(String(targets.water_ml));
    setSteps(String(getStepValue(answers.avg_steps)));
    setHydrated(true);
  }, [answers.avg_steps, hydrated, onboardingLoading, targets.water_ml, targetsLoading]);

  const estimated = useMemo(() => {
    const calories = targets.calories;
    return estimateTDEE(String(answers.goal_type || ''), calories);
  }, [answers.goal_type, targets.calories]);

  const save = async () => {
    const payload = {
      water_ml: Math.round(parseNum(waterMl, targets.water_ml)),
      avg_steps: Math.round(parseNum(steps, 8000)),
    };

    if (payload.water_ml < 1000 || payload.water_ml > 7000) {
      Alert.alert('Invalid water target', 'Set water intake between 1000 and 7000 ml.');
      return;
    }

    if (payload.avg_steps < 1000 || payload.avg_steps > 30000) {
      Alert.alert('Invalid step target', 'Set steps between 1,000 and 30,000.');
      return;
    }

    try {
      await updateDaily.mutateAsync(payload);
      if (runId) {
        await setSectionAccepted.mutateAsync({ runId, section: 'daily_targets', accepted: false });
      }
      trackEvent('plan_review_section_edited', { section: 'daily_targets', generation_run_id: runId });
      router.replace({ pathname: '/(onboarding)/plan-review', params: runId ? { runId } : undefined });
    } catch (error: any) {
      Alert.alert('Save failed', error?.message || 'Unable to save daily targets.');
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
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>Edit Daily Targets</Text>
        <View className="w-[42px]" />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: s.lg, paddingBottom: insets.bottom + s.xl }}>
        <View className="mb-3">
          <Text className="text-[13px] mb-[6px]" style={{ color: c.text, fontFamily: ty.body.familySemibold }}>Daily Water Intake (ml)</Text>
          <TextInput
            value={waterMl}
            onChangeText={setWaterMl}
            keyboardType="numeric"
            className="border h-12 px-3 text-base"
            style={{ color: c.text, borderColor: c.border, backgroundColor: c.surface, borderRadius: r.md, fontFamily: ty.body.family }}
          />
        </View>

        <View className="mb-3">
          <Text className="text-[13px] mb-[6px]" style={{ color: c.text, fontFamily: ty.body.familySemibold }}>Daily Steps</Text>
          <TextInput
            value={steps}
            onChangeText={setSteps}
            keyboardType="numeric"
            className="border h-12 px-3 text-base"
            style={{ color: c.text, borderColor: c.border, backgroundColor: c.surface, borderRadius: r.md, fontFamily: ty.body.family }}
          />
        </View>

        <View className="mt-2 border p-[14px]" style={{ backgroundColor: c.surface2, borderColor: c.border, borderRadius: r.md }}>
          <Text className="text-[13px] mb-[6px]" style={{ color: c.text, fontFamily: ty.body.familySemibold }}>Maintenance TDEE (read-only)</Text>
          <Text style={{ color: c.primary, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }}>{estimated.toLocaleString()} kcal</Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 6, lineHeight: 18 }}>
            This estimate is derived from your current goal and macro baseline. It updates when you regenerate targets.
          </Text>
        </View>

        <Pressable
          className="h-[52px] items-center justify-center mt-[18px]"
          style={{ backgroundColor: c.primary, borderRadius: r.md }}
          onPress={save}
          disabled={updateDaily.isPending}
        >
          <Text style={{ color: c.bg, fontFamily: ty.heading.familySemibold }}>Save Changes</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
