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
import { MealTimeline } from '../../../components/nutrition/MealTimeline';
import { RingIconButton } from '../../../components/common/RingIconButton';
import { useDailyWaterSummary } from '../../../hooks/useWater';
import { useDailyMeals } from '../../../hooks/useNutrition';
import { getUserTargets } from '../../../hooks/useUser';
import { getDailyTotals } from '../../../services/nutritionService';
import { useActiveNutritionPlan } from '../../../hooks/usePlan';
import { useCopyMeals } from '../../../hooks/useNutrition';

import { VoiceInput } from '../../../components/ai/VoiceInput';

export default function NutritionHomeScreen() {
  const { c, s, ty, r, animation, glass } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { mutate: copyMeals } = useCopyMeals();

  const today = new Date().toISOString().split('T')[0];
  const { data: waterSummary } = useDailyWaterSummary(today);

  // Fetch user targets (same as MacroDashboard)
  const { data: targets } = useQuery({
    queryKey: ['user-targets', user?.id],
    queryFn: () => getUserTargets(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch today's consumed totals
  const { data: consumed } = useQuery({
    queryKey: ['nutrition-daily-total', user?.id, today],
    queryFn: () => getDailyTotals(user!.id, today),
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Fetch active plan
  const { data: nutritionPlan } = useActiveNutritionPlan();

  // Fetch actual logs for today
  const { data: dailyMeals } = useDailyMeals(today);

  // Transform plan data for the timeline, overlaying actual logs
  const planMeals = React.useMemo(() => {
    // We need at least a basic structure. If no plan, define default slots.
    const structure = nutritionPlan?.meal_structure || {
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: []
    };

    const meals = [];

    // Helper to get logged items for a slot
    const getLoggedItems = (slot: string) => {
      if (!dailyMeals) return [];
      // The service returns data with joined tables, so we need to rely on the shape we know exists
      // even if TS isn't perfectly inferred without a deep recursive type.
      // Also handling DB column names vs camelCase transformations if relevant.
      // Based on useDailyMeals -> getDailyMeals -> supabase.from('meal_logs')...
      // DB columns are snake_case.

      // Service returns camelCase mapped objects
      const mealLog = dailyMeals.find((m: any) => m.mealSlot.toLowerCase() === slot.toLowerCase());
      if (!mealLog || !mealLog.items) return [];

      return mealLog.items.map((item: any) => ({
        name: item.food?.name || 'Unknown Food',
        portion: `${item.grams}g`,
        calories: item.calories
      }));
    };

    // Helper to calculate total calories for a slot from logs
    const getLoggedCalories = (slot: string) => {
      const items = getLoggedItems(slot);
      return items.reduce((sum, item) => sum + item.calories, 0);
    };

    if (structure.breakfast !== undefined) {
      const loggedItems = getLoggedItems('breakfast');
      const currentCalories = getLoggedCalories('breakfast');
      const goalCalories = Math.round(targets?.calories ? targets.calories * 0.25 : 500);

      meals.push({
        name: 'Breakfast',
        time: '8:30 AM',
        calories: currentCalories,
        goalCalories: goalCalories,
        color: '#F97316',
        // Show logged items if any, otherwise empty (don't show plan items as "eaten")
        items: loggedItems,
        isGoalMet: currentCalories >= goalCalories * 0.9 && currentCalories <= goalCalories * 1.1 // +/- 10%
      });
    }

    if (structure.lunch !== undefined) {
      const loggedItems = getLoggedItems('lunch');
      const currentCalories = getLoggedCalories('lunch');
      const goalCalories = Math.round(targets?.calories ? targets.calories * 0.35 : 700);

      meals.push({
        name: 'Lunch',
        time: '1:00 PM',
        calories: currentCalories,
        goalCalories: goalCalories,
        color: '#88E6EA',
        items: loggedItems,
        isGoalMet: currentCalories >= goalCalories * 0.9 && currentCalories <= goalCalories * 1.1
      });
    }

    if (structure.dinner !== undefined) {
      const loggedItems = getLoggedItems('dinner');
      const currentCalories = getLoggedCalories('dinner');
      const goalCalories = Math.round(targets?.calories ? targets.calories * 0.30 : 600);

      meals.push({
        name: 'Dinner',
        time: '7:30 PM',
        calories: currentCalories,
        goalCalories: goalCalories,
        color: '#A855F7',
        items: loggedItems,
        isGoalMet: currentCalories >= goalCalories * 0.9 && currentCalories <= goalCalories * 1.1
      });
    }

    if (structure.snacks !== undefined) {
      const loggedItems = getLoggedItems('snack'); // Note: 'snack' singular in DB enum usually
      const currentCalories = getLoggedCalories('snack');
      const goalCalories = Math.round(targets?.calories ? targets.calories * 0.10 : 200);

      meals.push({
        name: 'Snacks',
        time: 'Anytime',
        calories: currentCalories,
        goalCalories: goalCalories,
        color: '#6B7280',
        items: loggedItems,
        isGoalMet: currentCalories <= goalCalories // For snacks, staying under is often the goal, or just tracking
      });
    }

    return meals;
  }, [nutritionPlan, targets, dailyMeals]);

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

  const handleAddFood = (mealName: string) => {
    // Map display name to lower case slot name (e.g. "Snacks" -> "snack")
    const slot = mealName.toLowerCase() === 'snacks' ? 'snack' : mealName.toLowerCase();
    router.push({
      pathname: '/(tabs)/nutrition/food-search',
      params: { mealSlot: slot }
    });
  };

  // Quick Actions with ring icons
  const quickActions = [
    { label: 'Photo', icon: 'camera', onPress: () => router.push('/(tabs)/nutrition/food-camera') },
    { label: 'Barcode', icon: 'barcode', onPress: () => router.push('/(tabs)/nutrition/barcode-scanner') },
    { label: 'Yesterday', icon: 'copy-outline', onPress: handleCopyYesterday },
    { label: 'My Plan', icon: 'calendar', onPress: () => router.push('/(tabs)/nutrition/my-plan') },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingTop: insets.top + s.sm, paddingBottom: 100 }}
    >
      {/* Header with ring-style Log button */}
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
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <VoiceInput onTranscription={handleTranscription} />

          {/* Ring-style Log button */}
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
            <TabBarIcon name="add" color={c.primary} size={18} />
            <Text
              style={{
                color: c.primary,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.sm,
                marginLeft: 4,
              }}
            >
              Log
            </Text>
          </Pressable>
        </View>
      </MotiView>

      {/* Nutrition Summary Card - Pass real data */}
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

      {/* Hydration Card */}
      <View style={{ paddingHorizontal: s.lg, marginTop: s.xl }}>
        <HydrationCard
          onAdd={handleAddWater}
          current={waterSummary?.totalMl || 0}
          goal={waterSummary?.targetMl || 2500}
        />
      </View>

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

      {/* Meal Timeline */}
      <View style={{ paddingHorizontal: s.lg, marginTop: s.xl }}>
        <MealTimeline
          onAddFood={handleAddFood}
          meals={planMeals}
        />
      </View>
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
});
