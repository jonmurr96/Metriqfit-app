import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, View, Text, ScrollView, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { useAuth } from '../../../lib/auth';
import { useTokens } from '../../../lib/theme';
import { MacroDashboard } from '../../../components/dashboard/MacroDashboard';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { GlassCard } from '../../../components/premium/GlassCard';
import { PremiumBackground } from '../../../components/premium/PremiumBackground';
import { NextWorkoutCard } from '../../../components/workout/NextWorkoutCard';
import { RestDayCard } from '../../../components/workout/RestDayCard';
import { WorkoutWeekStrip } from '../../../components/workout/home/WorkoutWeekStrip';
import { HomeMealPreviewCard } from '../../../components/home/HomeMealPreviewCard';

import { HomeCoachPulseCard } from '../../../components/home/HomeCoachPulseCard';
import { HomeTomorrowPreviewCard } from '../../../components/home/HomeTomorrowPreviewCard';
import { HomeHabitDock } from '../../../components/home/HomeHabitDock';
import { StreakCounter } from '../../../components/gamification/StreakCounter';
import { LevelProgressCard } from '../../../components/gamification/LevelProgressCard';
import { useActiveWorkoutPlan, useNutritionPlanDay, useTodayWorkoutScheduleEntry, useTodaysWorkout, useWorkoutSchedule } from '../../../hooks/usePlan';
import { useOnboardingAnswers, useStreak, useProfile } from '../../../hooks/useUser';
import { useDailyMeals, useDailyTotals, useLogPlannedMeal } from '../../../hooks/useNutrition';
import { useDailyWaterSummary, useQuickAddWater } from '../../../hooks/useWater';
import { usePrepCoachState } from '../../../hooks/usePrepCoach';
import { useFormattedMealTimes } from '../../../hooks/useMealTimes';
import { useHomeSnapshot } from '../../../hooks/useProgressMetrics';
import { trackHomeCardRendered, trackHomeCtaTapped, trackHomeViewed } from '../../../lib/analytics';
import { buildHomeDashboardState, toLocalDateKey, type HomeActionKey } from '../../../lib/home/dashboard-state';
import {
  buildWorkoutCalendarDayState,
  buildWorkoutCalendarFallbackContext,
} from '../../../lib/workout/calendar-status';

import { buildHomeMealPreviewItems } from '../../../lib/nutrition/home-meal-preview';
import { normalizeMealSlot } from '../../../lib/nutrition/meal-slots';

const SLOT_LABEL_MAP: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};
const SLOT_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

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
  const { data: activeWorkoutPlan } = useActiveWorkoutPlan();
  const { data: tomorrowSchedule } = useWorkoutSchedule(tomorrowDate, tomorrowDate);
  const { data: streak } = useStreak();
  const { data: profile } = useProfile();
  const { data: onboardingAnswers } = useOnboardingAnswers();
  const { data: dailyTotals } = useDailyTotals(todayDate);
  const { data: waterSummary } = useDailyWaterSummary(todayDate);
  const { data: prepCoachState } = usePrepCoachState();
  const { data: homeSnapshot } = useHomeSnapshot();
  const mealTimesDisplay = useFormattedMealTimes();
  const quickAddWater = useQuickAddWater();
  const logPlannedMealMutation = useLogPlannedMeal();
  const hasTrackedHomeViewRef = useRef(false);
  const renderedHomeCardsRef = useRef<Record<string, boolean>>({});
  const mealLogSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mealCardIndex, setMealCardIndex] = useState(0);
  const [recentlyLoggedPlanMealId, setRecentlyLoggedPlanMealId] = useState<string | null>(null);
  const { data: dayPlan, isLoading: isDayPlanLoading } = useNutritionPlanDay(dayOfWeek, { enabled: true });
  const { data: dailyMeals } = useDailyMeals(todayDate);

  const weekStart = useMemo(() => startOfWeek(new Date(`${todayDate}T12:00:00`)), [todayDate]);
  const weekEnd = useMemo(() => {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + 6);
    return next;
  }, [weekStart]);
  const { data: weekSchedule = [] } = useWorkoutSchedule(toLocalDateKey(weekStart), toLocalDateKey(weekEnd), {
    enabled: !!activeWorkoutPlan,
  });
  const calendarFallbackContext = useMemo(
    () => buildWorkoutCalendarFallbackContext(activeWorkoutPlan),
    [activeWorkoutPlan, todayDate],
  );

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
    if (!hasTrackedHomeViewRef.current) {
      trackHomeViewed({ source: 'home_tab' });
      hasTrackedHomeViewRef.current = true;
    }
  }, []);


  useEffect(() => {
    if (!homeSnapshot) return;
    [
      { card_id: 'focus_strip', position_index: 1 },
      { card_id: 'workout_primary', position_index: 2 },
      { card_id: 'meal_preview', position_index: 3 },
      { card_id: 'quick_actions', position_index: 4 },
      { card_id: 'week_strip', position_index: 5 },
      { card_id: 'coach_pulse', position_index: 6 },
      { card_id: 'tomorrow_preview', position_index: 7 },
    ].forEach(({ card_id, position_index }) => {
      const trackingKey = `${card_id}:${position_index}`;
      if (renderedHomeCardsRef.current[trackingKey]) return;
      trackHomeCardRendered({ card_id, position_index });
      renderedHomeCardsRef.current[trackingKey] = true;
    });
  }, [homeSnapshot]);

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
    const previewItems = buildHomeMealPreviewItems(dayPlan?.meals, dailyMeals);
    return previewItems.map(item => ({
      ...item,
      scheduledTimeLabel: slotTimeLabelMap[item.slot as keyof typeof slotTimeLabelMap]
    }));
  }, [dailyMeals, dayPlan?.meals, slotTimeLabelMap]);

  const plannedCaloriesTotal = plannedMeals.reduce((sum: number, meal: any) => sum + meal.targetCalories, 0);
  const plannedProteinTotal = plannedMeals.reduce((sum: number, meal: any) => sum + (meal.targetProtein || 0), 0);
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

  const workoutStatus = useMemo(() => {
    if (todaySchedule?.session_type === 'workout') {
      return todaySchedule.status === 'completed' ? 'completed' : 'planned';
    }
    if (todaySchedule?.session_type) {
      return 'rest';
    }
    return homeSnapshot?.todayStatus.workoutStatus || 'none';
  }, [todaySchedule, homeSnapshot?.todayStatus.workoutStatus]);

  const dashboardState = useMemo(() => buildHomeDashboardState({
    now,
    meals: plannedMeals,
    mealTimes: mealTimesDisplay.raw as any,
    workoutStatus,
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
    workoutStatus,
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

  const clearMealLogSuccessTimeout = useCallback(() => {
    if (mealLogSuccessTimeoutRef.current) {
      clearTimeout(mealLogSuccessTimeoutRef.current);
      mealLogSuccessTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearMealLogSuccessTimeout();
    };
  }, [clearMealLogSuccessTimeout]);

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
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      const dateText = toLocalDateKey(date);
      const schedule = weekSchedule.find((entry) => entry.scheduled_date === dateText) || null;
      const calendarState = buildWorkoutCalendarDayState({
        dateKey: dateText,
        todayKey: todayDate,
        scheduleEntry: schedule,
        fallback: calendarFallbackContext,
      });

      return {
        dateText,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        isToday: dateText === todayDate,
        isSelected: dateText === todayDate,
        sessionType: calendarState.sessionType,
        scheduleStatus: calendarState.scheduleStatus,
        calendarStatus: calendarState.calendarStatus,
        isWorkoutExpected: calendarState.isWorkoutExpected,
        onPress: () => {
          if (calendarState.isWorkoutExpected && calendarState.planDayId) {
            router.navigate({
              pathname: '/(tabs)/workout/day-preview',
              params: { dayId: calendarState.planDayId },
            });
            return;
          }
          router.navigate('/(tabs)/workout/my-plan');
        },
      };
    });
  }, [calendarFallbackContext, router, todayDate, weekSchedule, weekStart]);

  const handleOpenMealSlot = useCallback((slot?: string | null, source = 'home-dashboard') => {
    if (!slot) {
      router.navigate('/(tabs)/nutrition/my-plan');
      return;
    }

    trackHomeCtaTapped({ cta_id: `${source}_${slot}` });
    router.navigate({
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

  const handleQuickLogMeal = useCallback((planMealId: string) => {
    if (!planMealId) return;
    if (
      logPlannedMealMutation.isPending
      && logPlannedMealMutation.variables?.planMealId === planMealId
    ) {
      return;
    }

    clearMealLogSuccessTimeout();
    setRecentlyLoggedPlanMealId(null);

    logPlannedMealMutation.mutate(
      { planMealId, date: todayDate },
      {
        onSuccess: (result) => {
          setRecentlyLoggedPlanMealId(result.planMealId);

          const nextUnloggedIndex = dashboardState.meals.findIndex((meal, index) => (
            index > safeMealIndex
            && meal.planMealId !== result.planMealId
            && !meal.isLogged
          ));

          mealLogSuccessTimeoutRef.current = setTimeout(() => {
            if (nextUnloggedIndex >= 0) {
              setMealCardIndex(nextUnloggedIndex);
            }
            setRecentlyLoggedPlanMealId(null);
            mealLogSuccessTimeoutRef.current = null;
          }, 800);
        },
        onError: (error) => {
          clearMealLogSuccessTimeout();
          setRecentlyLoggedPlanMealId(null);
          Alert.alert('Unable to log meal', error.message || 'Try adding food manually.');
        },
      },
    );
  }, [
    clearMealLogSuccessTimeout,
    dashboardState.meals,
    logPlannedMealMutation,
    safeMealIndex,
    todayDate,
  ]);

  const handleRunHomeAction = useCallback((action: HomeActionKey) => {
    trackHomeCtaTapped({ cta_id: `home_${action}` });

    switch (action) {
      case 'meal':
        handleOpenMealSlot(dashboardState.activeMeal?.slot, 'home-focus');
        return;
      case 'meal_plan':
        router.navigate('/(tabs)/nutrition/my-plan');
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
        router.navigate('/(tabs)/nutrition/barcode-scanner');
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
      <>
        <RestDayCard
          delay={delay}
          title={restTitle}
          subtitle={restSubtitle}
          onPress={() => router.push('/(tabs)/workout')}
        />
      </>
    );

  return (
    <PremiumBackground>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + s.lg, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >

        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500 }}
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: s.xl }}
        >
          <View>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.familyMedium,
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginBottom: 2,
              }}
            >
              {now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening'}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                color: c.text,
                fontFamily: ty.heading.family,
                fontSize: ty.sizes.h2,
                maxWidth: 240,
                letterSpacing: -0.5,
              }}
            >
              {profile?.first_name || 'Athlete'}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <StreakCounter />

            <Pressable
              className="w-11 h-11 items-center justify-center"
              style={{
                backgroundColor: 'transparent',
                borderRadius: r.pill,
                borderWidth: 2,
                borderColor: `${c.primary}40`,
              }}
              onPress={() => {
                trackHomeCtaTapped({ cta_id: 'header_profile_settings' });
                router.push('/settings');
              }}
              accessibilityLabel="Settings"
              accessibilityRole="button"
            >
              <TabBarIcon name="person-circle-outline" color={c.primary} size={22} />
            </Pressable>
          </View>
        </MotiView>

        {/* Level Progress Card */}
        <View style={{ marginTop: s.lg, paddingHorizontal: s.lg }}>
          <LevelProgressCard delay={480} />
        </View>

        {/* Macro Dashboard */}
        <View className="items-center" style={{ marginTop: s.xl }}>
          <MacroDashboard consumed={dailyTotals} />
        </View>

        <View style={{ marginTop: s.xl, paddingHorizontal: s.lg }}>
          {renderWorkoutCard(700)}
        </View>

        <View style={{ marginTop: s.lg, paddingHorizontal: s.lg }}>
          <HomeMealPreviewCard
            meals={dashboardState.meals}
            activeIndex={safeMealIndex}
            completedCount={dashboardState.completedMealCount}
            isDayComplete={dashboardState.isMealDayComplete}
            loading={isDayPlanLoading}
            pendingPlanMealId={
              logPlannedMealMutation.isPending
                ? logPlannedMealMutation.variables?.planMealId ?? null
                : null
            }
            recentlyLoggedPlanMealId={recentlyLoggedPlanMealId}
            onPrevious={() => setMealCardIndex((current) => Math.max(0, current - 1))}
            onNext={() => setMealCardIndex((current) => Math.min(dashboardState.meals.length - 1, current + 1))}
            onOpenMealDetail={handleOpenActiveMeal}
            onOpenPlan={() => handleRunHomeAction('meal_plan')}
            onQuickLog={handleQuickLogMeal}
            delay={760}
          />
        </View>

        <View style={{ marginTop: s.xl, paddingHorizontal: s.lg }}>
          <HomeHabitDock
            title={dashboardState.habitDockLabel}
            actions={habitDockActions}
            delay={860}
          />
        </View>
      </ScrollView>
    </PremiumBackground>
  );

}
