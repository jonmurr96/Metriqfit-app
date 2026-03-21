import React, { useEffect, useMemo, useState } from 'react';
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
  AcceptEditActions,
  DailyTargetsList,
  InfoButton,
  MacroGrid,
  NutritionMealPreview,
  PlanSummaryCard,
  ReviewProgressBar,
  ReviewSectionCard,
  WorkoutWeekPreview,
} from '../../components/onboarding/review';
import {
  useGenerationHistory,
  useActiveWorkoutPlan,
  useEditableNutritionPlanContext,
  useNutritionPlanDay,
  useWorkoutSchedule,
} from '../../hooks/usePlan';
import { useOnboardingAnswers, useProfile, useUserTargets } from '../../hooks/useUser';
import { useOnboardingReviewState, useSetReviewSectionAccepted } from '../../hooks/useOnboardingReview';
import { trackEvent } from '../../lib/analytics';

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
    maintain_weight: 'weight maintenance',
    recomp: 'body recomposition',
    increase_endurance: 'endurance',
    general_fitness: 'general fitness',
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
    bands_only: 'bands only',
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
  const { data: workoutPlan, isLoading: workoutLoading } = useActiveWorkoutPlan();
  const nutritionContextQuery = useEditableNutritionPlanContext();
  const nutritionPlan = nutritionContextQuery.data?.editablePlan || null;
  const nutritionPlanSource = nutritionContextQuery.data?.source || 'none';
  const nutritionLoading = nutritionContextQuery.isLoading;
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

  const routeRunId = typeof params.runId === 'string' ? params.runId : null;
  const latestRunId = generationHistory?.[0]?.id || null;
  const resolvedRunId = routeRunId || latestRunId;
  const warnings = safeParseWarnings(params.warnings);

  const reviewStateQuery = useOnboardingReviewState(resolvedRunId);
  const setSectionAccepted = useSetReviewSectionAccepted();
  const [infoSheet, setInfoSheet] = useState<{ title: string; body: string } | null>(null);
  const [workoutDetailsExpanded, setWorkoutDetailsExpanded] = useState(false);
  const [nutritionDetailsExpanded, setNutritionDetailsExpanded] = useState(false);

  const answerPayload = (onboardingAnswers?.answers || {}) as Record<string, any>;

  const weekRange = useMemo(() => getWeekRange(workoutPlan?.start_date), [workoutPlan?.start_date]);
  const { data: weekSchedule, isLoading: weekScheduleLoading } = useWorkoutSchedule(
    weekRange.startDate,
    weekRange.endDate,
    { enabled: Boolean(workoutPlan) },
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

  const acceptedCount = useMemo(() => {
    const state = reviewStateQuery.data;
    if (!state) return 0;
    return [
      state.macros_accepted,
      state.daily_targets_accepted,
      state.workout_plan_accepted,
      state.nutrition_plan_accepted,
    ].filter(Boolean).length;
  }, [reviewStateQuery.data]);

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
    router.replace('/(onboarding)/nutrition-prefs');
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
        `Meal structure: ${String(answerPayload.meals_per_day || '3').replace('_', ' ')} meals/day based on your onboarding preference.`,
        `Dietary profile: ${String(answerPayload.dietary_preference || 'anything').replace('_', ' ')} with exclusions applied.`,
        allergies.length ? `Allergy exclusions: ${allergies.join(', ')}.` : 'No allergy exclusions provided.',
        refused.length ? `Foods avoided: ${refused.join(', ')}.` : 'No additional food refusals provided.',
      ].join('\n\n'),
    });
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
      <View style={[styles.loadingScreen, { backgroundColor: c.bg }]}> 
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!resolvedRunId) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: c.bg, padding: s.lg }]}> 
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg, textAlign: 'center' }}>
          We could not find your generated plan.
        </Text>
        <Pressable style={[styles.primaryButton, { backgroundColor: c.primary, borderRadius: r.md, marginTop: s.lg }]} onPress={() => router.replace('/(onboarding)/plan-generation')}>
          <Text style={{ color: c.bg, fontFamily: ty.heading.familySemibold }}>Generate again</Text>
        </Pressable>
      </View>
    );
  }

  const reviewState = reviewStateQuery.data;

  const displayName = `${profile?.first_name || answerPayload.first_name || 'MetriqFit'} ${
    profile?.last_name || answerPayload.last_name || ''
  }`.trim();

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}> 
      <LinearGradient colors={[c.bg, c.surface]} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + s.md,
          paddingHorizontal: s.lg,
          paddingBottom: insets.bottom + s.xxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }}>{displayName}</Text>
            <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, letterSpacing: 1.2 }}>
              PLAN REVIEW
            </Text>
          </View>
          <Pressable style={[styles.closeButton, { backgroundColor: c.surface2, borderColor: c.border, borderRadius: r.md }]} onPress={handleClose}>
            <TabBarIcon name="close" color={c.text} size={20} />
          </Pressable>
        </View>

        <ReviewProgressBar acceptedCount={acceptedCount} total={4} />

        {warnings.length > 0 ? (
          <View style={[styles.warningCard, { backgroundColor: c.surface, borderColor: c.warning, borderRadius: r.md }]}> 
            <Text style={{ color: c.warning, fontFamily: ty.body.familySemibold, marginBottom: 6 }}>Generation notes</Text>
            {warnings.slice(0, 3).map((warning, idx) => (
              <Text key={`${warning}-${idx}`} style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 13, lineHeight: 18 }}>
                • {warning}
              </Text>
            ))}
          </View>
        ) : null}

        <ReviewSectionCard title="Macros">
          <MacroGrid
            protein={targets.protein_g}
            carbs={targets.carbs_g}
            fat={targets.fat_g}
            calories={targets.calories}
          />
          <AcceptEditActions
            accepted={Boolean(reviewState?.macros_accepted)}
            onAccept={() => handleAcceptToggle('macros', !reviewState?.macros_accepted)}
            onEdit={() => goToEdit('edit-macros')}
          />
        </ReviewSectionCard>

        <ReviewSectionCard title="Daily Targets">
          <DailyTargetsList
            water_ml={targets.water_ml}
            steps={typeof answerPayload.avg_steps === 'number' ? answerPayload.avg_steps : null}
            tdee={typeof answerPayload.maintenance_tdee === 'number' ? answerPayload.maintenance_tdee : null}
          />
          <AcceptEditActions
            accepted={Boolean(reviewState?.daily_targets_accepted)}
            onAccept={() => handleAcceptToggle('daily_targets', !reviewState?.daily_targets_accepted)}
            onEdit={() => goToEdit('edit-daily-targets')}
          />
        </ReviewSectionCard>

        <ReviewSectionCard
          title="Workout Plan"
          headerAccessory={<InfoButton onPress={showWorkoutPlanInfo} />}
          subtitle="Overview first. Expand to view day-by-day exercises and rest days."
        >
          <PlanSummaryCard
            name={workoutPlan?.name || 'Generated workout plan'}
            description={workoutPlan?.description}
            metadata={`${workoutPlan?.days_per_week || answerPayload.training_days_per_week || '-'} days/week`}
          />
          <Pressable
            style={[styles.expandRow, { borderColor: c.border, backgroundColor: c.surface2, borderRadius: r.md }]}
            onPress={() => setWorkoutDetailsExpanded((prev) => !prev)}
          >
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>
              {workoutDetailsExpanded ? 'Hide full workout details' : 'Show full workout details'}
            </Text>
            <TabBarIcon
              name={workoutDetailsExpanded ? 'chevron-up' : 'chevron-down'}
              color={c.textMuted}
              size={16}
            />
          </Pressable>
          {workoutDetailsExpanded ? (
            <WorkoutWeekPreview
              schedule={weekSchedule || []}
              exercisesByPlanDayId={exercisesByPlanDayId}
            />
          ) : null}
          <AcceptEditActions
            accepted={Boolean(reviewState?.workout_plan_accepted)}
            onAccept={() => handleAcceptToggle('workout_plan', !reviewState?.workout_plan_accepted)}
            onEdit={() => goToEdit('edit-workout-plan')}
          />
        </ReviewSectionCard>

        <ReviewSectionCard
          title="Nutrition Plan"
          headerAccessory={<InfoButton onPress={showNutritionPlanInfo} />}
          subtitle="Overview first. Expand to inspect meal ingredients and calories."
        >
          <PlanSummaryCard
            name={nutritionPlan?.name || 'Generated nutrition plan'}
            description={nutritionPlan?.description}
            metadata={[
              `${String(answerPayload.meals_per_day || '3').replace('_', ' ')} meals/day`,
              nutritionPlanSource === 'preview' ? 'Preview context' : 'Live context',
            ].join(' • ')}
          />
          <Pressable
            style={[styles.expandRow, { borderColor: c.border, backgroundColor: c.surface2, borderRadius: r.md }]}
            onPress={() => setNutritionDetailsExpanded((prev) => !prev)}
          >
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>
              {nutritionDetailsExpanded ? 'Hide full nutrition details' : 'Show full nutrition details'}
            </Text>
            <TabBarIcon
              name={nutritionDetailsExpanded ? 'chevron-up' : 'chevron-down'}
              color={c.textMuted}
              size={16}
            />
          </Pressable>
          {nutritionDetailsExpanded ? <NutritionMealPreview dayDetails={nutritionToday || null} /> : null}
          <AcceptEditActions
            accepted={Boolean(reviewState?.nutrition_plan_accepted)}
            onAccept={() => handleAcceptToggle('nutrition_plan', !reviewState?.nutrition_plan_accepted)}
            onEdit={() => goToEdit('edit-nutrition-plan')}
          />
        </ReviewSectionCard>

        <Pressable
          style={[
            styles.primaryButton,
            {
              backgroundColor: canContinue ? c.primary : c.surface2,
              borderRadius: r.md,
              ...shadow.glow,
            },
          ]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Text style={{ color: canContinue ? c.bg : c.textMuted, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
            Continue
          </Text>
        </Pressable>

        {!hasRequiredPlans ? (
          <Text style={{ color: c.warning, fontFamily: ty.body.family, marginTop: 8, textAlign: 'center' }}>
            Plans must finish generating before you can continue.
          </Text>
        ) : null}

        <Pressable style={[styles.secondaryButton, { borderColor: c.border, borderRadius: r.md }]} onPress={handleRedoOnboarding}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold }}>Redo onboarding</Text>
        </Pressable>
      </ScrollView>

      {infoSheet ? (
        <View style={styles.infoOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setInfoSheet(null)} />
          <View style={[styles.infoCard, { backgroundColor: c.surface, borderColor: c.border, borderRadius: r.lg }]}> 
            <View style={styles.infoHeader}>
              <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
                {infoSheet.title}
              </Text>
              <Pressable onPress={() => setInfoSheet(null)} style={[styles.infoClose, { borderColor: c.border, borderRadius: r.md }]}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningCard: {
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  expandRow: {
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 8,
    minHeight: 42,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  primaryButton: {
    height: 52,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    marginTop: 10,
    height: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 16,
  },
  infoCard: {
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  infoClose: {
    borderWidth: 1,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
