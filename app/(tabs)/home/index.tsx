import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { useTokens } from '../../../lib/theme';
import { useAuth } from '../../../lib/auth';
import { MacroDashboard } from '../../../components/dashboard/MacroDashboard';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { GlassCard } from '../../../components/premium/GlassCard';
import { PremiumBackground } from '../../../components/premium/PremiumBackground';
import { NextWorkoutCard } from '../../../components/workout/NextWorkoutCard';
import { RestDayCard } from '../../../components/workout/RestDayCard';
import { WorkoutWeekStrip } from '../../../components/workout/home/WorkoutWeekStrip';
import { HomeMealPreviewCard } from '../../../components/home/HomeMealPreviewCard';
import { HomeFocusStrip } from '../../../components/home/HomeFocusStrip';
import { HomeCoachPulseCard } from '../../../components/home/HomeCoachPulseCard';
import { HomeWeeklyMomentumCard } from '../../../components/home/HomeWeeklyMomentumCard';
import { HomeTomorrowPreviewCard } from '../../../components/home/HomeTomorrowPreviewCard';
import { HomeHabitDock } from '../../../components/home/HomeHabitDock';
import { useNutritionPlanDay, useTodayWorkoutScheduleEntry, useTodaysWorkout, useWorkoutSchedule } from '../../../hooks/usePlan';
import { useOnboardingAnswers, useStreak, useProfile } from '../../../hooks/useUser';
import { useDailyMeals, useDailyTotals } from '../../../hooks/useNutrition';
import { useDailyWaterSummary, useQuickAddWater } from '../../../hooks/useWater';
import { usePrepCoachState } from '../../../hooks/usePrepCoach';
import { useFormattedMealTimes } from '../../../hooks/useMealTimes';
import { useHomeSnapshot, useWeeklyActivity } from '../../../hooks/useProgressMetrics';
import { trackHomeCardRendered, trackHomeCtaTapped, trackHomeViewed } from '../../../lib/analytics';
import { buildHomeDashboardState, toLocalDateKey, type HomeActionKey } from '../../../lib/home/dashboard-state';

const ALIGNMENT_BANNER_STORAGE_KEY = 'home_alignment_banner_v1';
const ALIGNMENT_BANNER_RECENT_DAYS = 21;
const SLOT_LABEL_MAP: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};
const SLOT_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export default function HomeScreen() {
  const { c, s, ty, r } = useTokens();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const todayDate = toLocalDateKey(now);
  const dayOfWeek = now.getDay();
  const tomorrowDate = useMemo(() => {
    const nextDay = new Date(now);
    nextDay.setDate(nextDay.getDate() + 1);
    return toLocalDateKey(nextDay);
  }, [now]);
  const { data: todaysWorkout } = useTodaysWorkout();
  const { data: todaySchedule } = useTodayWorkoutScheduleEntry();
  const { data: tomorrowSchedule } = useWorkoutSchedule(tomorrowDate, tomorrowDate);
  const { data: streak } = useStreak();
  const { data: profile } = useProfile();
  const { data: onboardingAnswers } = useOnboardingAnswers();
  const { data: dailyTotals } = useDailyTotals();
  const { data: waterSummary } = useDailyWaterSummary(todayDate);
  const { data: prepCoachState } = usePrepCoachState();
  const { data: homeSnapshot } = useHomeSnapshot();
  const { data: weeklyActivity } = useWeeklyActivity();
  const mealTimesDisplay = useFormattedMealTimes();
  const quickAddWater = useQuickAddWater();
  const hasTrackedHomeViewRef = useRef(false);
  const renderedHomeCardsRef = useRef<Record<string, boolean>>({});
  const [showAlignmentBanner, setShowAlignmentBanner] = useState(false);
  const [mealCardIndex, setMealCardIndex] = useState(0);
  const { data: dayPlan, isLoading: isDayPlanLoading } = useNutritionPlanDay(dayOfWeek, { enabled: true });
  const { data: dailyMeals } = useDailyMeals(todayDate);

  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
    }, []),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadBannerState = async () => {
      const completedAt = onboardingAnswers?.completed_at;
      if (!user?.id || !completedAt) {
        if (isMounted) setShowAlignmentBanner(false);
        return;
      }

      const completedDate = new Date(completedAt);
      const ageMs = Date.now() - completedDate.getTime();
      const withinWindow = ageMs >= 0 && ageMs <= ALIGNMENT_BANNER_RECENT_DAYS * 24 * 60 * 60 * 1000;

      if (!withinWindow) {
        if (isMounted) setShowAlignmentBanner(false);
        return;
      }

      const key = `${ALIGNMENT_BANNER_STORAGE_KEY}:${user.id}`;
      const dismissed = await AsyncStorage.getItem(key);
      if (isMounted) setShowAlignmentBanner(dismissed !== '1');
    };

    loadBannerState();

    return () => {
      isMounted = false;
    };
  }, [onboardingAnswers?.completed_at, user?.id]);

  useEffect(() => {
    if (!hasTrackedHomeViewRef.current) {
      trackHomeViewed({ source: 'home_tab' });
      hasTrackedHomeViewRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!homeSnapshot) return;
    ['focus_strip', 'week_strip', 'tomorrow_preview', 'coach_pulse', 'habit_dock'].forEach((cardId) => {
      if (renderedHomeCardsRef.current[cardId]) return;
      trackHomeCardRendered({ card_id: cardId });
      renderedHomeCardsRef.current[cardId] = true;
    });
  }, [homeSnapshot]);

  const dismissAlignmentBanner = async () => {
    if (!user?.id) return;
    const key = `${ALIGNMENT_BANNER_STORAGE_KEY}:${user.id}`;
    await AsyncStorage.setItem(key, '1');
    setShowAlignmentBanner(false);
  };

  const slotTimeLabelMap = useMemo(() => ({
    breakfast: mealTimesDisplay.breakfast,
    lunch: mealTimesDisplay.lunch,
    dinner: mealTimesDisplay.dinner,
    snack: mealTimesDisplay.snack,
  } as const), [
    mealTimesDisplay.breakfast,
    mealTimesDisplay.dinner,
    mealTimesDisplay.lunch,
    mealTimesDisplay.snack,
  ]);

  const plannedMeals = useMemo(() => {
    const mealsBySlot = new Map(
      (dailyMeals || []).map((mealLog: any) => [
        String(mealLog.mealSlot || '').toLowerCase(),
        mealLog,
      ]),
    );

    return [...(dayPlan?.meals || [])]
      .sort((a: any, b: any) => {
        const aIndex = SLOT_ORDER.indexOf((a.meal_slot || 'snack') as any);
        const bIndex = SLOT_ORDER.indexOf((b.meal_slot || 'snack') as any);
        return aIndex - bIndex;
      })
      .map((meal: any) => {
        const slot = String(meal.meal_slot || 'snack').toLowerCase() as typeof SLOT_ORDER[number];
        const matchingLog = mealsBySlot.get(slot);
        const items = matchingLog?.items || [];
        const loggedCalories = items.reduce((sum: number, item: any) => sum + Number(item.calories || 0), 0);

        return {
          slot,
          label: SLOT_LABEL_MAP[slot] || slot,
          plannedName: meal.selected_variant?.name || meal.name || 'Planned Meal',
          targetCalories: Number(meal.target_calories || meal.selected_variant?.target_calories || 0),
          targetProtein: Number(meal.target_protein || meal.selected_variant?.target_protein || 0),
          targetCarbs: Number(meal.target_carbs || meal.selected_variant?.target_carbs || 0),
          targetFat: Number(meal.target_fat || meal.selected_variant?.target_fat || 0),
          loggedCalories,
          loggedItemCount: items.length,
          isLogged: items.length > 0,
          planMealId: meal.id,
          scheduledTimeLabel: slotTimeLabelMap[slot],
        };
      });
  }, [dailyMeals, dayPlan?.meals, slotTimeLabelMap]);

  const plannedCaloriesTotal = plannedMeals.reduce((sum, meal) => sum + meal.targetCalories, 0);
  const plannedProteinTotal = plannedMeals.reduce((sum, meal) => sum + (meal.targetProtein || 0), 0);
  const caloriesRemaining = Math.max(0, Math.round(plannedCaloriesTotal - Number(dailyTotals?.calories || 0)));
  const proteinRemaining = Math.max(0, Math.round(plannedProteinTotal - Number(dailyTotals?.protein || 0)));
  const waterPercent = waterSummary?.percentageComplete ?? homeSnapshot?.todayStatus.hydrationReadiness ?? 0;
  const waterRemainingMl = Math.max(0, Number(waterSummary?.targetMl || 0) - Number(waterSummary?.totalMl || 0));
  const tomorrowEntry = useMemo(() => (
    tomorrowSchedule?.[0]
      ? {
          sessionType: tomorrowSchedule[0].session_type,
          planName: tomorrowSchedule[0].plan_day?.name || null,
          focus: tomorrowSchedule[0].plan_day?.focus || null,
        }
      : null
  ), [tomorrowSchedule]);

  const dashboardState = useMemo(() => buildHomeDashboardState({
    now,
    meals: plannedMeals,
    mealTimes: mealTimesDisplay.raw as any,
    workoutStatus: homeSnapshot?.todayStatus.workoutStatus || 'none',
    proteinRemaining,
    caloriesRemaining,
    waterPercent,
    waterRemainingMl,
    consistencyScore: homeSnapshot?.kpiStrip.consistencyScore || 0,
    sessionsThisWeek: homeSnapshot?.kpiStrip.sessionsThisWeek || 0,
    prepEnabled: prepCoachState?.enabled,
    prepNextCheckInDate: prepCoachState?.nextCheckInDate,
    tomorrow: tomorrowEntry,
  }), [
    caloriesRemaining,
    homeSnapshot?.kpiStrip.consistencyScore,
    homeSnapshot?.kpiStrip.sessionsThisWeek,
    homeSnapshot?.todayStatus.workoutStatus,
    mealTimesDisplay.raw,
    now,
    plannedMeals,
    prepCoachState?.enabled,
    prepCoachState?.nextCheckInDate,
    proteinRemaining,
    tomorrowEntry,
    waterPercent,
    waterRemainingMl,
  ]);

  const defaultMealIndex = useMemo(() => {
    if (!dashboardState.meals.length) return 0;
    if (!dashboardState.activeMeal) return 0;
    const activeIndex = dashboardState.meals.findIndex((meal) => meal.slot === dashboardState.activeMeal?.slot && !meal.isLogged);
    return activeIndex === -1 ? 0 : activeIndex;
  }, [dashboardState.activeMeal, dashboardState.meals]);

  useEffect(() => {
    setMealCardIndex((current) => {
      if (!dashboardState.meals.length) return 0;
      if (current >= dashboardState.meals.length) return defaultMealIndex;
      if (!dashboardState.isMealDayComplete && dashboardState.meals[current]?.isLogged) return defaultMealIndex;
      return current;
    });
  }, [dashboardState.isMealDayComplete, dashboardState.meals, defaultMealIndex, todayDate]);

  const safeMealIndex = dashboardState.meals.length ? Math.min(mealCardIndex, dashboardState.meals.length - 1) : 0;
  const activeMeal = dashboardState.meals[safeMealIndex] || null;

  const restTitle =
    todaySchedule?.session_type === 'active_recovery'
      ? 'Active Recovery'
      : todaySchedule?.session_type === 'conditioning'
        ? 'Conditioning Day'
        : 'Rest Day';
  const restSubtitle =
    todaySchedule?.session_type === 'active_recovery'
      ? 'Keep it light today: mobility, walking, and recovery work.'
      : todaySchedule?.session_type === 'conditioning'
      ? 'Cardio and conditioning focus scheduled for today.'
      : 'Recovery, mobility, and hydration.';

  const weekStripDays = useMemo(() => {
    return (weeklyActivity || []).map((day) => {
      const date = new Date(day.date);
      const isToday = day.isToday;
      const plannedWorkoutToday = isToday && homeSnapshot?.todayStatus.workoutStatus === 'planned';
      const sessionType: 'workout' | 'rest' = day.workoutCompleted || plannedWorkoutToday ? 'workout' : 'rest';
      const status: 'planned' | 'completed' | null = day.workoutCompleted ? 'completed' : plannedWorkoutToday ? 'planned' : null;
      return {
        dateText: day.date,
        label: day.dayLabel,
        dayNumber: date.getDate(),
        isToday,
        isSelected: isToday,
        sessionType,
        status,
        onPress: () => router.push('/(tabs)/workout'),
      };
    });
  }, [homeSnapshot?.todayStatus.workoutStatus, router, weeklyActivity]);

  const handleOpenMealSlot = useCallback((slot?: string | null, source = 'home-dashboard') => {
    if (!slot) {
      router.push('/(tabs)/nutrition/my-plan');
      return;
    }

    trackHomeCtaTapped({ cta_id: `${source}_${slot}` });
    router.push({
      pathname: '/(tabs)/nutrition/food-search',
      params: {
        mealSlot: slot,
        date: todayDate,
        source,
      },
    } as any);
  }, [router, todayDate]);

  const handleOpenActiveMeal = useCallback(() => {
    handleOpenMealSlot(activeMeal?.slot, 'home-slider');
  }, [activeMeal?.slot, handleOpenMealSlot]);

  const handleRunHomeAction = useCallback((action: HomeActionKey) => {
    trackHomeCtaTapped({ cta_id: `home_${action}` });

    switch (action) {
      case 'meal':
        handleOpenMealSlot(dashboardState.activeMeal?.slot, 'home-focus');
        return;
      case 'meal_plan':
        router.push('/(tabs)/nutrition/my-plan');
        return;
      case 'workout':
      case 'tomorrow':
        router.push('/(tabs)/workout');
        return;
      case 'water':
        router.push('/log-water-sheet');
        return;
      case 'checkin':
        router.push('/check-in');
        return;
      case 'coach':
        router.push('/(tabs)/ai-coach');
        return;
      case 'barcode':
        router.push('/(tabs)/nutrition/barcode-scanner');
        return;
      case 'progress':
        router.push('/(tabs)/progress');
        return;
      default:
        return;
    }
  }, [dashboardState.activeMeal?.slot, handleOpenMealSlot, router]);

  const handleQuickAddWater = useCallback(() => {
    trackHomeCtaTapped({ cta_id: 'home_habit_water' });
    quickAddWater.addGlass();
  }, [quickAddWater]);

  const isCheckInDueSoon = Boolean(
    prepCoachState?.enabled
      && prepCoachState.nextCheckInDate
      && (new Date(prepCoachState.nextCheckInDate).getTime() - now.getTime()) <= 2 * 24 * 60 * 60 * 1000,
  );

  const momentumItems = [
    {
      label: 'Workouts',
      value: `${homeSnapshot?.kpiStrip.sessionsThisWeek || 0}`,
      detail: 'sessions this week',
      icon: 'barbell-outline',
      tone: 'primary' as const,
    },
    {
      label: 'Meals',
      value: dashboardState.meals.length ? `${dashboardState.completedMealCount}/${dashboardState.meals.length}` : '0/0',
      detail: 'planned meals logged',
      icon: 'restaurant-outline',
      tone: dashboardState.isMealDayComplete ? 'success' as const : 'accent' as const,
    },
    {
      label: 'Score',
      value: `${homeSnapshot?.kpiStrip.consistencyScore || 0}%`,
      detail: '7 day consistency',
      icon: 'analytics-outline',
      tone: 'accent' as const,
    },
  ];

  const getMomentumSummary = () => {
    if (dashboardState.isDayWrapped) {
      return `${dashboardState.tomorrowPreview.title}. Keep tonight light and make tomorrow obvious.`;
    }
    if (homeSnapshot?.todayStatus.workoutStatus === 'planned') {
      return 'The week is still gaining shape. Close the workout and keep meals simple.';
    }
    return 'Momentum is built through clean repeats. Stay steady on meals, water, and the next training block.';
  };

  const habitDockActions = [
    {
      label: 'Water',
      icon: 'water-outline',
      onPress: handleQuickAddWater,
      active: waterPercent < 80,
    },
    {
      label: 'Check-In',
      icon: 'analytics-outline',
      onPress: () => handleRunHomeAction('checkin'),
      active: isCheckInDueSoon,
    },
    {
      label: 'Coach',
      icon: 'sparkles-outline',
      onPress: () => handleRunHomeAction('coach'),
      active: dashboardState.isDayWrapped,
    },
    {
      label: 'Scan',
      icon: 'barcode-outline',
      onPress: () => handleRunHomeAction('barcode'),
      active: Boolean(dashboardState.activeMeal && !dashboardState.isMealDayComplete),
    },
  ];

  const showMealFirst = !dashboardState.isDayWrapped && dashboardState.showMealFirst;

  const renderWorkoutCard = (delay: number) =>
    homeSnapshot?.todayStatus.workoutStatus === 'completed' ? (
      <RestDayCard
        delay={delay}
        title="Workout Complete"
        subtitle="Training is closed. Keep recovery, water, and meal quality steady through the rest of the day."
        onPress={() => router.push('/(tabs)/workout')}
      />
    ) : todaySchedule?.session_type === 'workout' ? (
      <NextWorkoutCard
        delay={delay}
        workoutName={todaysWorkout?.name || todaySchedule?.plan_day?.name || 'Workout'}
        workoutType="Scheduled for today"
        duration={todaysWorkout?.exercises?.length ? todaysWorkout.exercises.length * 7 : 45}
        calories={todaysWorkout?.exercises?.length ? Math.round(todaysWorkout.exercises.length * 7 * 6.5) : 0}
        onPress={() => {
          if (!todaysWorkout?.id) {
            router.push('/(tabs)/workout');
            return;
          }
          router.push({
            pathname: '/(tabs)/workout/day-preview',
            params: { dayId: todaysWorkout.id }
          });
        }}
      />
    ) : (
      <RestDayCard
        delay={delay}
        title={restTitle}
        subtitle={restSubtitle}
        onPress={() => router.push('/(tabs)/workout')}
      />
    );

  return (
    <PremiumBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + s.lg, paddingBottom: 120 }]}
      >
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500 }}
          style={[styles.header, { paddingHorizontal: s.xl }]}
        >
          <View>
            <Text
              style={[
                styles.greeting,
                {
                  color: c.textMuted,
                  fontFamily: ty.body.familyMedium,
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                },
              ]}
            >
              {now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening'}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[
                styles.title,
                {
                  color: c.text,
                  fontFamily: ty.heading.family,
                  fontSize: ty.sizes.h2,
                  maxWidth: 240,
                },
              ]}
            >
              {profile?.first_name || 'Athlete'}
            </Text>
          </View>
          <View style={styles.headerButtons}>
            {/* Streak Counter */}
            <View style={[styles.headerButton, { flexDirection: 'row', gap: 4, width: 'auto', paddingHorizontal: 12, borderRadius: r.pill, borderWidth: 1, borderColor: `${c.primary}20` }]}>
              <TabBarIcon name="flame" color={c.primary} size={18} />
              <Text style={{ color: c.primary, fontFamily: ty.mono.family, fontSize: 14 }}>
                {streak || 0}
              </Text>
            </View>

            <Pressable
              style={[
                styles.headerButton,
                {
                  backgroundColor: 'transparent',
                  borderRadius: r.pill,
                  borderWidth: 2,
                  borderColor: `${c.primary}40`,
                },
              ]}
              onPress={() => {
                trackHomeCtaTapped({ cta_id: 'header_profile_settings' });
                router.push('/settings');
              }}
            >
              <TabBarIcon name="person-circle-outline" color={c.primary} size={22} />
            </Pressable>
          </View>
        </MotiView>

        {/* Macro Dashboard */}
        {showAlignmentBanner ? (
          <View style={[styles.section, { marginTop: s.lg, paddingHorizontal: s.lg }]}>
            <GlassCard intensity="light" animated delay={480}>
              <View style={styles.bannerRow}>
                <View style={styles.bannerCopy}>
                  <Text style={[styles.bannerLabel, { color: c.primary, fontFamily: ty.body.familySemibold }]}>
                    NEW PERSONALIZATION
                  </Text>
                  <Text style={[styles.bannerText, { color: c.text, fontFamily: ty.body.family }]}>
                    Plans are now strictly aligned to your onboarding settings.
                  </Text>
                </View>
                <Pressable
                  onPress={dismissAlignmentBanner}
                  style={[styles.bannerDismiss, { borderColor: c.border, borderRadius: r.pill }]}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss personalization banner"
                >
                  <TabBarIcon name="close" color={c.textMuted} size={16} />
                </Pressable>
              </View>
            </GlassCard>
          </View>
        ) : null}

        {/* Macro Dashboard */}
        <View style={[styles.dashboardContainer, { marginTop: s.xl }]}>
          <MacroDashboard />
        </View>

        <View style={[styles.section, { marginTop: s.xl, paddingHorizontal: s.lg }]}>
          <HomeFocusStrip
            title={dashboardState.focus.title}
            subtitle={dashboardState.focus.subtitle}
            icon={dashboardState.focus.icon}
            ctaLabel={dashboardState.focus.ctaLabel}
            onPress={() => handleRunHomeAction(dashboardState.focus.action)}
            secondaryLabel={dashboardState.focus.secondaryLabel}
            onSecondaryPress={
              dashboardState.focus.secondaryAction
                ? () => handleRunHomeAction(dashboardState.focus.secondaryAction!)
                : undefined
            }
            metrics={dashboardState.focus.metrics}
            tone={dashboardState.focus.tone}
            delay={560}
          />
        </View>

        <View style={[styles.section, { marginTop: s.xl }]}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: c.textMuted,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.sm,
                letterSpacing: 1.5,
                marginBottom: s.lg,
                paddingHorizontal: s.lg,
              },
            ]}
          >
            THIS WEEK
          </Text>
          <WorkoutWeekStrip days={weekStripDays} />
        </View>

        <View style={[styles.section, { marginTop: s.lg, paddingHorizontal: s.lg }]}>
          <HomeTomorrowPreviewCard
            title={dashboardState.tomorrowPreview.title}
            subtitle={dashboardState.tomorrowPreview.subtitle}
            icon={dashboardState.tomorrowPreview.icon}
            onPress={() => handleRunHomeAction('tomorrow')}
            delay={620}
          />
        </View>

        {dashboardState.isDayWrapped ? (
          <View style={[styles.section, { marginTop: s.xl, paddingHorizontal: s.lg }]}>
            <HomeMealPreviewCard
              meals={dashboardState.meals as any}
              activeIndex={safeMealIndex}
              completedCount={dashboardState.completedMealCount}
              isDayComplete={dashboardState.isMealDayComplete}
              loading={isDayPlanLoading}
              onPrevious={() => setMealCardIndex((current) => Math.max(0, current - 1))}
              onNext={() => setMealCardIndex((current) => Math.min(dashboardState.meals.length - 1, current + 1))}
              onOpenMealDetail={handleOpenActiveMeal}
              onOpenPlan={() => handleRunHomeAction('meal_plan')}
              delay={700}
            />
          </View>
        ) : showMealFirst ? (
          <>
            <View style={[styles.section, { marginTop: s.xl, paddingHorizontal: s.lg }]}>
              <HomeMealPreviewCard
                meals={dashboardState.meals as any}
                activeIndex={safeMealIndex}
                completedCount={dashboardState.completedMealCount}
                isDayComplete={dashboardState.isMealDayComplete}
                loading={isDayPlanLoading}
                onPrevious={() => setMealCardIndex((current) => Math.max(0, current - 1))}
                onNext={() => setMealCardIndex((current) => Math.min(dashboardState.meals.length - 1, current + 1))}
                onOpenMealDetail={handleOpenActiveMeal}
                onOpenPlan={() => handleRunHomeAction('meal_plan')}
                delay={700}
              />
            </View>

            <View style={[styles.section, { marginTop: s.lg, paddingHorizontal: s.lg }]}>
              {renderWorkoutCard(760)}
            </View>
          </>
        ) : (
          <>
            <View style={[styles.section, { marginTop: s.xl, paddingHorizontal: s.lg }]}>
              {renderWorkoutCard(700)}
            </View>

            <View style={[styles.section, { marginTop: s.lg, paddingHorizontal: s.lg }]}>
              <HomeMealPreviewCard
                meals={dashboardState.meals as any}
                activeIndex={safeMealIndex}
                completedCount={dashboardState.completedMealCount}
                isDayComplete={dashboardState.isMealDayComplete}
                loading={isDayPlanLoading}
                onPrevious={() => setMealCardIndex((current) => Math.max(0, current - 1))}
                onNext={() => setMealCardIndex((current) => Math.min(dashboardState.meals.length - 1, current + 1))}
                onOpenMealDetail={handleOpenActiveMeal}
                onOpenPlan={() => handleRunHomeAction('meal_plan')}
                delay={760}
              />
            </View>
          </>
        )}

        <View style={[styles.section, { marginTop: s.lg, paddingHorizontal: s.lg }]}>
          <HomeCoachPulseCard
            title={dashboardState.coachPulse.title}
            message={dashboardState.coachPulse.message}
            icon={dashboardState.coachPulse.icon}
            ctaLabel={dashboardState.coachPulse.ctaLabel}
            onPress={() => handleRunHomeAction(dashboardState.coachPulse.action)}
            delay={820}
          />
        </View>

        <View style={[styles.section, { marginTop: s.xl, paddingHorizontal: s.lg }]}>
          <HomeHabitDock
            title={dashboardState.habitDockLabel}
            actions={habitDockActions}
            delay={860}
          />
        </View>

        <View style={[styles.section, { marginTop: s.xl, paddingHorizontal: s.lg }]}>
          <HomeWeeklyMomentumCard
            summary={getMomentumSummary()}
            items={momentumItems}
            delay={980}
          />
        </View>
      </ScrollView>
    </PremiumBackground>
  );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    marginBottom: 2,
  },
  title: {
    letterSpacing: -0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
  },
  dashboardContainer: {
    alignItems: 'center',
  },
  section: {},
  sectionTitle: {},
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerCopy: {
    flex: 1,
  },
  bannerLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  bannerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  bannerDismiss: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  ringIconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
});
