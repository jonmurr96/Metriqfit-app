import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import {
  DailySnapshotCard,
  PlanRow,
  StickyBottomBar,
  WorkoutWeekPreview,
  NutritionMealPreview,
} from '../../components/onboarding/review';
import {
  useGenerationHistory,
  useActiveWorkoutPlan,
  useWorkoutPlanByGenerationRun,
  useEditableNutritionPlanContext,
  useNutritionPlanDay,
  useWorkoutScheduleByPlanId,
  useWorkoutPlanPreview,
} from '../../hooks/usePlan';
import { useOnboardingAnswers, useProfile, useUserTargets } from '../../hooks/useUser';
import { useOnboardingReviewState, useSetReviewSectionAccepted } from '../../hooks/useOnboardingReview';
import { trackEvent } from '../../lib/analytics';
import {
  formatMealFrequencyLabel,
  getMealFrequencyAdvisory,
  recommendMealFrequency,
} from '../../lib/nutrition/meal-frequency';

function safeParseWarnings(rawWarnings: unknown): string[] {
  if (!rawWarnings) return [];
  if (Array.isArray(rawWarnings)) {
    return rawWarnings.map(String).filter(Boolean);
  }
  if (typeof rawWarnings === 'string') {
    try {
      const parsed = JSON.parse(rawWarnings);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toIsoDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function getWeekRange(baseDate?: string | null) {
  const base = baseDate ? new Date(`${baseDate}T00:00:00`) : new Date();
  const safe = Number.isNaN(base.getTime()) ? new Date() : base;
  const start = new Date(safe);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
  };
}

function humanGoal(value: string | undefined | null) {
  const map: Record<string, string> = {
    lose_weight: 'fat loss',
    gain_weight: 'lean mass gain',
    build_muscle: 'lean mass gain',
    maintain_weight: 'weight maintenance',
    recomp: 'body recomposition',
    increase_endurance: 'endurance',
    general_fitness: 'general fitness',
    get_fitter: 'general fitness',
  };
  return map[String(value || '')] || 'general fitness';
}

function humanExperience(value: string | undefined | null) {
  const map: Record<string, string> = {
    beginner: 'beginner',
    intermediate: 'intermediate',
    advanced: 'advanced',
  };
  return map[String(value || '')] || 'current';
}

function humanEquipment(value: string | undefined | null) {
  const map: Record<string, string> = {
    full_gym: 'full gym',
    dumbbells_only: 'dumbbells only',
    dumbbells_plus_bench: 'dumbbells + bench',
    bodyweight_only: 'bodyweight only',
  };
  return map[String(value || '')] || 'available equipment';
}

export default function PlanReviewScreen() {
  const { c, s, ty, r, shadow } = useTokens();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ runId?: string; warnings?: string }>();
  const { data: profile } = useProfile();
  const { data: generationHistory } = useGenerationHistory();
  const { data: onboardingAnswers } = useOnboardingAnswers();
  const { data: targetData, isLoading: targetsLoading } = useUserTargets();
  const routeRunId = typeof params.runId === 'string' ? params.runId : null;
  const latestRunId = generationHistory?.[0]?.id || null;
  const resolvedRunId = routeRunId || latestRunId;
  const activeWorkoutQuery = useActiveWorkoutPlan();
  const generatedWorkoutQuery = useWorkoutPlanByGenerationRun(resolvedRunId, { enabled: Boolean(resolvedRunId) });
  const previewWorkoutQuery = useWorkoutPlanPreview(null, { enabled: !generatedWorkoutQuery.data && !activeWorkoutQuery.data });
  const workoutPlan = generatedWorkoutQuery.data || activeWorkoutQuery.data || previewWorkoutQuery.data || null;
  const workoutLoading = activeWorkoutQuery.isLoading || generatedWorkoutQuery.isLoading || previewWorkoutQuery.isLoading;
  const nutritionContextQuery = useEditableNutritionPlanContext();
  const nutritionPlan = nutritionContextQuery.data?.editablePlan || null;
  const nutritionPlanSource = nutritionContextQuery.data?.source || 'none';
  const nutritionLoading = nutritionContextQuery.isLoading;
  const answerPayload = (onboardingAnswers?.answers || {}) as Record<string, any>;
  const targets = useMemo(
    () => ({
      calories: Number(targetData?.calories || 2000),
      protein_g: Number(targetData?.protein_g || 150),
      carbs_g: Number(targetData?.carbs_g || 200),
      fat_g: Number(targetData?.fat_g || 65),
      water_ml: Number(targetData?.water_ml || 2500),
    }),
    [targetData?.calories, targetData?.carbs_g, targetData?.fat_g, targetData?.protein_g, targetData?.water_ml],
  );
  const mealFrequencyRecommendation = useMemo(
    () => recommendMealFrequency({
      goalType: answerPayload.goal_type,
      calories: targets.calories,
      proteinGrams: targets.protein_g,
    }),
    [answerPayload.goal_type, targets.calories, targets.protein_g],
  );

  const warnings = safeParseWarnings(params.warnings);

  const reviewStateQuery = useOnboardingReviewState(resolvedRunId);
  const setSectionAccepted = useSetReviewSectionAccepted();
  const [infoSheet, setInfoSheet] = useState<{ title: string; body: string } | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<'workout' | 'nutrition' | null>(null);

  const weekRange = useMemo(() => getWeekRange(workoutPlan?.start_date), [workoutPlan?.start_date]);
  const { data: weekSchedule, isLoading: weekScheduleLoading } = useWorkoutScheduleByPlanId(
    workoutPlan?.id || null,
    weekRange.startDate,
    weekRange.endDate,
    { enabled: Boolean(workoutPlan?.id) },
  );

  const todayDay = new Date().getDay();
  const { data: nutritionToday, isLoading: nutritionDayLoading } = useNutritionPlanDay(todayDay, {
    enabled: Boolean(nutritionPlan),
    planId: nutritionPlan?.id,
  });

  const exercisesByPlanDayId = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const day of workoutPlan?.days || []) {
      map.set(day.id, day.exercises || []);
    }
    return map;
  }, [workoutPlan?.days]);

  const reviewState = reviewStateQuery.data;

  const acceptedCount = useMemo(() => {
    if (!reviewState) return 0;
    return [
      reviewState.macros_accepted,
      reviewState.daily_targets_accepted,
      reviewState.workout_plan_accepted,
      reviewState.nutrition_plan_accepted,
    ].filter(Boolean).length;
  }, [reviewState]);

  const allAccepted = acceptedCount === 4;
  const hasRequiredPlans = Boolean(workoutPlan && nutritionPlan);
  const canContinue = allAccepted && hasRequiredPlans;

  useEffect(() => {
    if (resolvedRunId) {
      trackEvent('plan_review_viewed', {
        generation_run_id: resolvedRunId,
      });
    }
  }, [resolvedRunId]);

  const handleAcceptToggle = async (
    section: 'macros' | 'daily_targets' | 'workout_plan' | 'nutrition_plan',
    nextValue: boolean,
  ) => {
    if (!resolvedRunId) return;

    try {
      await setSectionAccepted.mutateAsync({
        runId: resolvedRunId,
        section,
        accepted: nextValue,
      });
      trackEvent('plan_review_section_accepted', {
        generation_run_id: resolvedRunId,
        section,
        accepted: nextValue,
      });
    } catch (error: any) {
      Alert.alert('Unable to update section', error?.message || 'Please try again.');
    }
  };

  const goToEdit = (screen: 'edit-macros' | 'edit-daily-targets' | 'edit-workout-plan' | 'edit-nutrition-plan') => {
    if (!resolvedRunId) return;
    trackEvent('plan_review_section_edited', {
      generation_run_id: resolvedRunId,
      section: screen,
    });
    router.push({
      pathname: `/(onboarding)/${screen}` as any,
      params: { runId: resolvedRunId },
    });
  };

  const handleContinue = () => {
    if (!resolvedRunId) return;
    if (!canContinue) return;

    trackEvent('plan_review_continue_clicked', {
      generation_run_id: resolvedRunId,
      accepted_count: acceptedCount,
      has_required_plans: hasRequiredPlans,
    });

    router.push({
      pathname: '/(onboarding)/paywall',
      params: { runId: resolvedRunId },
    });
  };

  const handleClose = () => {
    router.replace('/(onboarding)/nutrition');
  };

  const handleRedoOnboarding = () => {
    router.replace('/(onboarding)/identity');
  };

  const showWorkoutPlanInfo = () => {
    const injuries = Array.isArray(answerPayload.injuries)
      ? answerPayload.injuries.filter((value: string) => value && value !== 'none')
      : [];
    const daysOff = Array.isArray(answerPayload.preferred_days_off)
      ? answerPayload.preferred_days_off.join(', ')
      : 'none selected';

    setInfoSheet({
      title: 'Why this workout plan',
      body: [
        `Goal alignment: Built for ${humanGoal(answerPayload.goal_type)} with ${humanExperience(answerPayload.experience_level)} progression.`,
        `Schedule match: ${workoutPlan?.days_per_week || answerPayload.training_days_per_week || '-'} training day(s)/week with days off: ${daysOff}.`,
        `Equipment fit: Exercises were selected for ${humanEquipment(answerPayload.equipment_access)}.`,
        `Constraints: ${injuries.length ? `Adjusted around: ${injuries.join(', ')}.` : 'No injury constraints provided.'}`,
      ].join('\n\n'),
    });
  };

  const showNutritionPlanInfo = () => {
    const allergies = Array.isArray(answerPayload.allergies_exclusions)
      ? answerPayload.allergies_exclusions.filter(Boolean)
      : [];
    const refused = Array.isArray(answerPayload.refused_foods)
      ? answerPayload.refused_foods.filter(Boolean)
      : [];

    setInfoSheet({
      title: 'Why this nutrition plan',
      body: [
        `Macro target fit: Planned around ${Math.round(targets.calories)} kcal with P ${Math.round(targets.protein_g)}g / C ${Math.round(targets.carbs_g)}g / F ${Math.round(targets.fat_g)}g.`,
        `Meal structure: ${formatMealFrequencyLabel(answerPayload.meals_per_day, mealFrequencyRecommendation)}.`,
        getMealFrequencyAdvisory(answerPayload.meals_per_day, mealFrequencyRecommendation),
        `Dietary profile: ${String(answerPayload.dietary_preference || 'anything').replace('_', ' ')} with exclusions applied.`,
        allergies.length ? `Allergy exclusions: ${allergies.join(', ')}.` : 'No allergy exclusions provided.',
        refused.length ? `Foods avoided: ${refused.join(', ')}.` : 'No additional food refusals provided.',
      ].join('\n\n'),
    });
  };

  const togglePlanExpand = (plan: 'workout' | 'nutrition') => {
    setExpandedPlan((prev) => (prev === plan ? null : plan));
  };

  const isLoading =
    targetsLoading
    || workoutLoading
    || nutritionLoading
    || weekScheduleLoading
    || nutritionDayLoading
    || (resolvedRunId ? reviewStateQuery.isLoading : false);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: c.bg }}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!resolvedRunId) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: c.bg, padding: s.lg }}>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg, textAlign: 'center' }}>
          We could not find your generated plan.
        </Text>
        <Pressable
          className="h-[52px] items-center justify-center"
          style={{ backgroundColor: c.primary, borderRadius: r.md, marginTop: s.lg }}
          onPress={() => router.replace('/(onboarding)/plan-generation')}
        >
          <Text style={{ color: c.bg, fontFamily: ty.heading.familySemibold }}>Generate again</Text>
        </Pressable>
      </View>
    );
  }

  const displayName = `${profile?.first_name || answerPayload.first_name || 'MetriqFit'} ${
    profile?.last_name || answerPayload.last_name || ''
  }`.trim();

  const stepsValue = typeof answerPayload.avg_steps === 'number' ? answerPayload.avg_steps.toLocaleString() : 'Not set';
  const tdeeValue = typeof answerPayload.maintenance_tdee === 'number' ? answerPayload.maintenance_tdee.toLocaleString() : null;

  return (
    <View className="flex-1" style={{ backgroundColor: c.bg }}>
      <LinearGradient colors={[c.bg, c.surface]} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + s.md,
          paddingHorizontal: s.lg,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-[14px]">
          <View>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }}>
              {displayName}
            </Text>
            <Text
              style={{
                color: c.primary,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.xs,
                letterSpacing: 1.2,
              }}
            >
              PLAN REVIEW
            </Text>
          </View>
          <Pressable
            className="w-[42px] h-[42px] border items-center justify-center"
            style={{ backgroundColor: c.surface2, borderColor: c.border, borderRadius: r.md }}
            onPress={handleClose}
          >
            <TabBarIcon name="close" color={c.text} size={20} />
          </Pressable>
        </View>

        {/* Daily Snapshot — merged Macros + Daily Targets */}
        <DailySnapshotCard
          protein={targets.protein_g}
          carbs={targets.carbs_g}
          fat={targets.fat_g}
          calories={targets.calories}
          waterLiters={`${(targets.water_ml / 1000).toFixed(1)}L`}
          steps={stepsValue}
          accepted={Boolean(reviewState?.macros_accepted && reviewState?.daily_targets_accepted)}
          onAccept={() => {
            handleAcceptToggle('macros', !reviewState?.macros_accepted);
            handleAcceptToggle('daily_targets', !reviewState?.daily_targets_accepted);
          }}
          onEdit={() => {
            Alert.alert('Edit', 'What would you like to edit?', [
              { text: 'Macros', onPress: () => goToEdit('edit-macros') },
              { text: 'Daily Targets', onPress: () => goToEdit('edit-daily-targets') },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }}
        />

        {/* Plans Section */}
        <Text
          className="text-xs uppercase mt-5 mb-[10px]"
          style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, letterSpacing: 1 }}
        >
          YOUR PLANS
        </Text>

        <View className="gap-[10px]">
          {/* Workout Plan Row */}
          <PlanRow
            icon="barbell-outline"
            iconColor={c.primary}
            title="Workout Plan"
            metadata={`${workoutPlan?.days_per_week || answerPayload.training_days_per_week || '-'} days/week`}
            subtitle={workoutPlan?.name || 'Generated workout plan'}
            accepted={Boolean(reviewState?.workout_plan_accepted)}
            onAccept={() => handleAcceptToggle('workout_plan', !reviewState?.workout_plan_accepted)}
            onEdit={() => goToEdit('edit-workout-plan')}
            expanded={expandedPlan === 'workout'}
            onToggleExpand={() => togglePlanExpand('workout')}
          >
            <WorkoutWeekPreview
              schedule={weekSchedule || []}
              exercisesByPlanDayId={exercisesByPlanDayId}
            />
          </PlanRow>

          {/* Nutrition Plan Row */}
          <PlanRow
            icon="nutrition-outline"
            iconColor={c.macros.carbs}
            title="Nutrition Plan"
            metadata={formatMealFrequencyLabel(answerPayload.meals_per_day, mealFrequencyRecommendation)}
            subtitle={
              nutritionPlan
                ? `${Math.round(targets.calories)} kcal · ${nutritionPlanSource === 'preview' ? 'Preview' : 'Live'}`
                : 'Generated nutrition plan'
            }
            accepted={Boolean(reviewState?.nutrition_plan_accepted)}
            onAccept={() => handleAcceptToggle('nutrition_plan', !reviewState?.nutrition_plan_accepted)}
            onEdit={() => goToEdit('edit-nutrition-plan')}
            expanded={expandedPlan === 'nutrition'}
            onToggleExpand={() => togglePlanExpand('nutrition')}
          >
            <NutritionMealPreview dayDetails={nutritionToday || null} />
          </PlanRow>
        </View>

        {/* Redo onboarding — subtle text link */}
        <Pressable className="items-center mt-5 mb-2" onPress={handleRedoOnboarding}>
          <Text style={{ color: c.textSubtle, fontFamily: ty.body.family, fontSize: 12 }}>
            Want to start over? Redo onboarding
          </Text>
        </Pressable>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <StickyBottomBar
        canContinue={canContinue}
        onContinue={handleContinue}
        acceptedCount={acceptedCount}
        total={4}
      />

      {/* Info Sheet Overlay */}
      {infoSheet ? (
        <View
          className="absolute inset-0 justify-end p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setInfoSheet(null)} />
          <View
            className="border p-[14px] gap-2"
            style={{ backgroundColor: c.surface, borderColor: c.border, borderRadius: r.lg }}
          >
            <View className="flex-row items-center justify-between gap-[10px]">
              <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
                {infoSheet.title}
              </Text>
              <Pressable
                className="border w-7 h-7 items-center justify-center"
                style={{ borderColor: c.border, borderRadius: r.md }}
                onPress={() => setInfoSheet(null)}
              >
                <TabBarIcon name="close" color={c.textMuted} size={16} />
              </Pressable>
            </View>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, lineHeight: 20 }}>
              {infoSheet.body}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
