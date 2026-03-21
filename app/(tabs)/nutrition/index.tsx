import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useQuery } from '@tanstack/react-query';
import { useTokens } from '../../../lib/theme';
import { useAuth } from '../../../lib/auth';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { NutritionSummaryCard } from '../../../components/nutrition/NutritionSummaryCard';
import { HydrationCard } from '../../../components/nutrition/HydrationCard';
import { TodayMealPlanList } from '../../../components/nutrition/TodayMealPlanList';
import { RingIconButton } from '../../../components/common/RingIconButton';
import { useDailyWaterSummary } from '../../../hooks/useWater';
import { useCopyMeals, useDailyMeals, useDailyTotals, useLogPlannedMeal } from '../../../hooks/useNutrition';
import { getUserTargets, useStreak } from '../../../hooks/useUser';
import { useActiveNutritionPlan, useNutritionPlanDay } from '../../../hooks/usePlan';
import { useFormattedMealTimes } from '../../../hooks/useMealTimes';
import { usePrepCoachState } from '../../../hooks/usePrepCoach';
import { buildHomeMealPreviewItems } from '../../../lib/nutrition/home-meal-preview';
import { getMealSlotLabel, MEAL_SLOT_ORDER } from '../../../lib/nutrition/meal-slots';
import type { MealSlot } from '../../../services/nutritionService';

import { VoiceInput } from '../../../components/ai/VoiceInput';

export default function NutritionHomeScreen() {
  const { c, s, ty, r, animation } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: streak } = useStreak();
  const { data: prepState } = usePrepCoachState();

  const { mutate: copyMeals } = useCopyMeals();
  const logPlannedMealMutation = useLogPlannedMeal();

  const today = new Date().toISOString().split('T')[0];
  const todayDayOfWeek = new Date().getDay();
  const { data: waterSummary } = useDailyWaterSummary(today);
  
  // Fetch user's preferred meal times
  const mealTimes = useFormattedMealTimes();

  // Fetch user targets (same as MacroDashboard)
  const { data: targets } = useQuery({
    queryKey: ['user-targets', user?.id],
    queryFn: () => getUserTargets(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch today's consumed totals
  const { data: consumed } = useDailyTotals(today);

  // Fetch active plan
  const { data: nutritionPlan } = useActiveNutritionPlan();
  const { data: dayPlan } = useNutritionPlanDay(todayDayOfWeek, {
    enabled: !!nutritionPlan,
    planId: nutritionPlan?.id,
  });

  // Fetch actual logs for today
  const { data: dailyMeals } = useDailyMeals(today);

  const mealPreviewItems = React.useMemo(
    () => buildHomeMealPreviewItems(dayPlan?.meals, dailyMeals),
    [dayPlan?.meals, dailyMeals],
  );

  const handleTranscription = (text: string) => {
    router.push({
      pathname: '/(tabs)/nutrition/food-search',
      params: { query: text, autoAdd: 'true' }
    });
  };

  const handleCopyYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    Alert.alert(
      "Copy Meals",
      "Copy all meals from yesterday to today?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Copy",
          onPress: () => copyMeals({ fromDate: yesterdayStr, toDate: today })
        }
      ]
    );
  };

  const handleAddWater = () => {
    router.push('/log-water-sheet');
  };

  const handleAddFood = (slot: MealSlot) => {
    router.push({
      pathname: '/(tabs)/nutrition/food-search',
      params: { mealSlot: slot, date: today, source: 'today_meals' }
    });
  };

  // Quick Actions with ring icons
  const quickActions = [
    { label: 'Search', icon: 'search', onPress: () => router.push('/(tabs)/nutrition/food-search') },
    { label: 'Photo', icon: 'camera', onPress: () => router.push('/(tabs)/nutrition/food-camera') },
    { label: 'Barcode', icon: 'barcode', onPress: () => router.push('/(tabs)/nutrition/barcode-scanner') },
    { label: 'My Plan', icon: 'calendar', onPress: () => router.push('/(tabs)/nutrition/my-plan') },
  ];

  const aiTools = [
    { label: 'Yesterday', icon: 'copy-outline', onPress: handleCopyYesterday },
    { label: 'Import', icon: 'link-outline', onPress: () => router.push('/(tabs)/nutrition/recipe-import') },
    { label: 'Menu AI', icon: 'restaurant-outline', onPress: () => router.push('/(tabs)/nutrition/menu-scan') },
    { label: 'Grocery', icon: 'basket-outline', onPress: () => router.push('/(tabs)/nutrition/grocery-planner') },
    { label: 'Pantry', icon: 'archive-outline', onPress: () => router.push('/(tabs)/nutrition/pantry') },
  ];

  const slotTimeMap = React.useMemo(
    () => ({
      breakfast: mealTimes.raw.breakfast,
      lunch: mealTimes.raw.lunch,
      dinner: mealTimes.raw.dinner,
      snack: mealTimes.raw.snack,
    }),
    [mealTimes.raw.breakfast, mealTimes.raw.lunch, mealTimes.raw.dinner, mealTimes.raw.snack],
  );

  const todayMeals = React.useMemo(() => {
    const previewBySlot = new Map(mealPreviewItems.map((item) => [item.slot, item]));

    return MEAL_SLOT_ORDER.map((slot) => {
      const preview = previewBySlot.get(slot);
      const rawTime = slotTimeMap[slot];
      const timeLabel = rawTime === 'anytime'
        ? 'Anytime'
        : mealTimes[slot];

      return {
        slot,
        label: getMealSlotLabel(slot),
        plannedName: preview?.plannedName || `No planned ${getMealSlotLabel(slot).toLowerCase()}`,
        timeLabel,
        targetCalories: preview?.targetCalories || 0,
        targetProtein: preview?.targetProtein || 0,
        targetCarbs: preview?.targetCarbs || 0,
        targetFat: preview?.targetFat || 0,
        loggedCalories: preview?.loggedCalories || 0,
        loggedItemCount: preview?.loggedItemCount || 0,
        isLogged: preview?.isLogged || false,
        planMealId: preview?.planMealId,
        hasPlannedMeal: !!preview?.planMealId,
      };
    });
  }, [mealPreviewItems, mealTimes, slotTimeMap]);

  const handleOpenMeal = (slot: MealSlot, planMealId?: string) => {
    router.push({
      pathname: '/nutrition/today-plan' as any,
      params: {
        date: today,
        focusSlot: slot,
        ...(planMealId ? { planMealId } : {}),
      },
    });
  };

  const handleLogMeal = (planMealId?: string) => {
    if (!planMealId) return;

    logPlannedMealMutation.mutate(
      { planMealId, date: today },
      {
        onSuccess: (result) => {
          Alert.alert(
            'Meal logged',
            `${result.plannedMealName} was added to ${getMealSlotLabel(result.mealSlot).toLowerCase()}.`,
          );
        },
        onError: (error) => {
          Alert.alert('Unable to log meal', error.message || 'Try adding food manually.');
        },
      },
    );
  };

  const prepNextCheckIn = React.useMemo(() => {
    if (!prepState?.nextCheckInDate) return 'After next check-in';
    const parsed = new Date(prepState.nextCheckInDate);
    if (Number.isNaN(parsed.getTime())) return 'After next check-in';
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [prepState?.nextCheckInDate]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingTop: insets.top + s.sm, paddingBottom: insets.bottom + 180 }}
    >
      {/* Header with ring-style Search button */}
      <MotiView
        from={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: animation.duration.normal }}
        style={[styles.header, { paddingHorizontal: s.xl }]}
      >
        <View>
          <Text
            style={[
              styles.headerLabel,
              {
                color: c.textMuted,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.xs,
                letterSpacing: 1.5,
                marginBottom: s.xs,
              },
            ]}
          >
            DAILY INTAKE
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
            Nutrition
          </Text>

          <View
            style={{
              marginTop: 6,
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start',
              borderWidth: 1,
              borderColor: `${c.primary}45`,
              borderRadius: r.pill,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <TabBarIcon name="flame" color={c.primary} size={12} />
            <Text
              style={{
                marginLeft: 4,
                color: c.primary,
                fontFamily: ty.body.familySemibold,
                fontSize: 11,
              }}
            >
              {streak || 0}-day streak
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <VoiceInput onTranscription={handleTranscription} />

          {/* Ring-style Search button */}
          <Pressable
            style={({ pressed }) => [
              styles.logButton,
              {
                backgroundColor: pressed ? `${c.primary}20` : 'transparent',
                borderRadius: r.pill,
                borderWidth: 2,
                borderColor: c.primary,
              },
              Platform.OS !== 'web' && {
                shadowColor: c.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
              },
              Platform.OS === 'web' && {
                boxShadow: `0 0 16px ${c.primary}40`,
              } as any,
            ]}
            onPress={() => router.push('/(tabs)/nutrition/food-search')}
          >
            <TabBarIcon name="search" color={c.primary} size={18} />
            <Text
              style={{
                color: c.primary,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.sm,
                marginLeft: 4,
              }}
            >
              Search
            </Text>
          </Pressable>
        </View>
      </MotiView>

      {/* Quick Actions - Ring Icons */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: animation.duration.normal, delay: 200 }}
        style={[styles.section, { marginTop: s.xl, paddingHorizontal: s.lg }]}
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
        <View style={styles.quickActions}>
          {quickActions.map((action, index) => (
            <RingIconButton
              key={action.label}
              icon={action.icon}
              label={action.label}
              onPress={action.onPress}
              size={56}
              delay={300 + index * 60}
            />
          ))}
        </View>
      </MotiView>

      <View style={{ paddingHorizontal: s.lg, marginTop: s.lg }}>
        <NutritionSummaryCard
          calories={consumed?.calories || 0}
          calorieGoal={targets?.calories || 2400}
          protein={Math.round(consumed?.protein || 0)}
          proteinGoal={targets?.protein_g || 180}
          carbs={Math.round(consumed?.carbs || 0)}
          carbsGoal={targets?.carbs_g || 250}
          fat={Math.round(consumed?.fat || 0)}
          fatGoal={targets?.fat_g || 70}
        />
      </View>

      <View style={{ paddingHorizontal: s.lg, marginTop: s.lg }}>
        <TodayMealPlanList
          meals={todayMeals}
          pendingPlanMealId={logPlannedMealMutation.isPending ? logPlannedMealMutation.variables?.planMealId || null : null}
          onOpenMeal={(item) => {
            if (!item.hasPlannedMeal && !item.isLogged) {
              handleAddFood(item.slot);
              return;
            }
            handleOpenMeal(item.slot, item.planMealId);
          }}
          onLogMeal={(item) => handleLogMeal(item.planMealId)}
          onAddFood={(item) => handleAddFood(item.slot)}
        />
      </View>

      <View style={{ paddingHorizontal: s.lg, marginTop: s.lg }}>
        <HydrationCard
          onAdd={handleAddWater}
          current={waterSummary?.totalMl || 0}
          goal={waterSummary?.targetMl || 2500}
        />
      </View>

      {prepState?.enabled && (
        <View style={{ paddingHorizontal: s.lg, marginTop: s.lg }}>
          <View
            style={{
              backgroundColor: c.surface,
              borderRadius: r.lg,
              padding: s.lg,
              borderWidth: 1,
              borderColor: c.border,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                Prep Coach
              </Text>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                {prepState.discipline || 'prep'} • {prepState.phase || 'phase'}
              </Text>
            </View>
            <Text style={{ color: c.text, fontFamily: ty.body.familyMedium }}>
              Next check-in: {prepNextCheckIn}
            </Text>
            {prepState.lastAdjustment?.coach_summary ? (
              <>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, letterSpacing: 1 }}>
                  WHY CHANGED
                </Text>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, lineHeight: 18 }}>
                  {prepState.lastAdjustment.coach_summary}
                </Text>
              </>
            ) : (
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>
                No prep adjustments applied yet. Your next weekly check-in will generate one.
              </Text>
            )}
            <Pressable
              style={{
                alignSelf: 'flex-start',
                borderWidth: 1,
                borderColor: `${c.primary}50`,
                borderRadius: r.pill,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
              onPress={() => router.push('/check-in')}
            >
              <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                Run Check-In
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* AI Tools */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: animation.duration.normal, delay: 260 }}
        style={[styles.section, { marginTop: s.lg, paddingHorizontal: s.lg }]}
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
          AI TOOLS
        </Text>
        <View style={styles.aiToolsGrid}>
          {aiTools.map((action, index) => (
            <RingIconButton
              key={action.label}
              icon={action.icon}
              label={action.label}
              onPress={action.onPress}
              size={56}
              delay={340 + index * 60}
            />
          ))}
        </View>
      </MotiView>

    </ScrollView>
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
    marginBottom: 8,
  },
  headerLabel: {},
  title: {
    letterSpacing: -0.5,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  section: {},
  sectionTitle: {},
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  aiToolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: 18,
    columnGap: 10,
  },
});
