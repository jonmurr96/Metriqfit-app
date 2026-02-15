import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { useTokens } from '../../../lib/theme';
import { useAuth } from '../../../lib/auth';
import { MacroDashboard } from '../../../components/dashboard/MacroDashboard';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { GlassCard } from '../../../components/premium/GlassCard';
import { PremiumBackground } from '../../../components/premium/PremiumBackground';
import { RingIconButton } from '../../../components/common/RingIconButton';
import { NextWorkoutCard } from '../../../components/workout/NextWorkoutCard';
import { RestDayCard } from '../../../components/workout/RestDayCard';
import { HomeMealPreviewCard } from '../../../components/home/HomeMealPreviewCard';
import { useNutritionPlanDay, useTodayWorkoutScheduleEntry, useTodaysWorkout } from '../../../hooks/usePlan';
import { useOnboardingAnswers, useStreak } from '../../../hooks/useUser';
import { useDailyMeals, useDailyTotals } from '../../../hooks/useNutrition';

const ALIGNMENT_BANNER_STORAGE_KEY = 'home_alignment_banner_v1';
const ALIGNMENT_BANNER_RECENT_DAYS = 21;

export default function HomeScreen() {
  const { c, s, ty, r } = useTokens();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data: todaysWorkout } = useTodaysWorkout();
  const { data: todaySchedule } = useTodayWorkoutScheduleEntry();
  const { data: streak } = useStreak();
  const { data: onboardingAnswers } = useOnboardingAnswers();
  const { data: dailyTotals } = useDailyTotals();
  const [showAlignmentBanner, setShowAlignmentBanner] = useState(false);
  const todayDate = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().getDay();
  const { data: dayPlan, isLoading: isDayPlanLoading } = useNutritionPlanDay(dayOfWeek, { enabled: true });
  const { data: dailyMeals } = useDailyMeals(todayDate);

  const hasLoggedToday = !!dailyTotals && (
    dailyTotals.calories > 0 ||
    dailyTotals.protein > 0 ||
    dailyTotals.carbs > 0 ||
    dailyTotals.fat > 0
  );

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

  const dismissAlignmentBanner = async () => {
    if (!user?.id) return;
    const key = `${ALIGNMENT_BANNER_STORAGE_KEY}:${user.id}`;
    await AsyncStorage.setItem(key, '1');
    setShowAlignmentBanner(false);
  };

  // Quick Actions for Home
  const quickActions = [
    { label: 'Food', icon: 'fast-food-outline', onPress: () => router.push('/(tabs)/nutrition/food-search') },
    { label: 'Workout', icon: 'barbell-outline', onPress: () => router.push('/(tabs)/workout') },
    { label: 'Summary', icon: 'analytics-outline', onPress: () => router.push('/(tabs)/home/daily-summary') },
    { label: 'Settings', icon: 'settings-outline', onPress: () => router.push('/settings') },
  ];

  const slotLabelMap: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack',
  };

  const plannedMeals = (dayPlan?.meals || [])
    .slice(0, 4)
    .map((meal) => {
      const matchingLog = dailyMeals?.find((log: any) => {
        const logSlot = String((log as any).mealSlot || '').toLowerCase();
        const slot = String(meal.meal_slot || '').toLowerCase();
        return logSlot === slot;
      });
      return {
        slot: meal.meal_slot,
        label: slotLabelMap[meal.meal_slot] || meal.meal_slot,
        plannedName: meal.selected_variant?.name || meal.name || 'Planned Meal',
        targetCalories: Number(meal.target_calories || meal.selected_variant?.target_calories || 0),
        logged: !!matchingLog && Number((matchingLog as any).totalCalories || 0) > 0,
      };
    });

  const isWorkoutToday = todaySchedule?.session_type === 'workout' && !!todaysWorkout;
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

  return (
    <PremiumBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + s.lg, paddingBottom: 100 }]}
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
              {"Today's Goals"}
            </Text>
            <Text
              style={[
                styles.title,
                {
                  color: c.text,
                  fontFamily: ty.heading.family,
                  fontSize: ty.sizes.h2,
                },
              ]}
            >
              MetriqFit
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
              onPress={() => router.push('/settings')}
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

        {/* Quick Actions - Ring Icons */}
        <View style={[styles.section, { marginTop: s.xxl, paddingHorizontal: s.lg }]}>
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 400, delay: 600 }}
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: c.textMuted,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.sm,
                  letterSpacing: 1.5,
                  marginBottom: s.lg,
                },
              ]}
            >
              QUICK LOG
            </Text>
          </MotiView>

          {/* Ring Icon Buttons Row */}
          <View style={styles.ringIconsRow}>
            {quickActions.map((action, index) => (
              <RingIconButton
                key={action.label}
                icon={action.icon as any}
                label={action.label}
                onPress={action.onPress}
                size={64}
                delay={700 + index * 80}
              />
            ))}
          </View>
        </View>

        {/* Next Workout Card */}
        <View style={[styles.section, { marginTop: s.xl, paddingHorizontal: s.lg }]}>
          {isWorkoutToday ? (
            <NextWorkoutCard
              delay={1000}
              workoutName={todaysWorkout?.name || 'Workout'}
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
              delay={1000}
              title={restTitle}
              subtitle={restSubtitle}
              onPress={() => router.push('/(tabs)/workout')}
            />
          )}
        </View>

        {/* Home Nutrition Meal Plan Preview */}
        <View style={[styles.section, { marginTop: s.lg, paddingHorizontal: s.lg }]}>
          <HomeMealPreviewCard
            meals={plannedMeals as any}
            loading={isDayPlanLoading}
            onLogFood={() => router.push('/(tabs)/nutrition/food-search')}
            onOpenPlan={() => router.push('/(tabs)/nutrition/my-plan')}
            delay={1060}
          />
        </View>

        {/* Insight Banner */}
        <View style={[styles.section, { marginTop: s.lg, paddingHorizontal: s.lg }]}>
          <GlassCard intensity="light" animated delay={1100}>
            <View style={styles.insightContent}>
              <TabBarIcon name="analytics" color={c.accent} size={20} />
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.sm,
                  marginLeft: s.sm,
                  flex: 1,
                }}
              >
                {hasLoggedToday ? (
                  <>
                    You&apos;ve logged <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold }}>today</Text>. Keep consistent!
                  </>
                ) : (
                  <>
                    No entries logged <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold }}>yet today</Text>. Start with Quick Log.
                  </>
                )}
              </Text>
            </View>
          </GlassCard>
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
  insightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
