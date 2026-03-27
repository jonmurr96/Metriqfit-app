import React from 'react';
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

import { GlassCard } from '../../../components/premium/GlassCard';
import { MacroRow } from '../../../components/nutrition/MacroRow';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { useLogFood, useLogPlannedMeal, useDailyMeals } from '../../../hooks/useNutrition';
import { useActiveNutritionPlan, useNutritionPlanDay } from '../../../hooks/usePlan';
import { useFormattedMealTimes } from '../../../hooks/useMealTimes';
import {
  getDayOfWeekFromDateKey,
  getLocalDateKey,
  getMealSlotLabel,
  MEAL_SLOT_ORDER,
  normalizeDateKey,
  normalizeMealSlot,
} from '../../../lib/nutrition/meal-slots';
import { buildPlannedMealDerivedState } from '../../../lib/nutrition/planned-meal-state';
import { useTokens } from '../../../lib/theme';
import type { MealSlot } from '../../../services/nutritionService';

export default function TodayPlanScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date?: string | string[]; focusSlot?: string | string[] }>();
  const dateKey = normalizeDateKey(params.date);
  const focusSlot = normalizeMealSlot(params.focusSlot);
  const dayOfWeek = getDayOfWeekFromDateKey(dateKey);
  const isToday = dateKey === getLocalDateKey();
  const mealTimes = useFormattedMealTimes();
  const scrollRef = React.useRef<ScrollView | null>(null);
  const sectionOffsets = React.useRef<Record<MealSlot, number>>({
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snack: 0,
  });
  const [highlightedSlot, setHighlightedSlot] = React.useState<MealSlot | null>(focusSlot);

  const { data: nutritionPlan } = useActiveNutritionPlan();
  const { data: dayPlan, isLoading: isPlanLoading } = useNutritionPlanDay(dayOfWeek, {
    enabled: !!nutritionPlan,
    planId: nutritionPlan?.id,
  });
  const { data: dailyMeals, isLoading: isDailyMealsLoading } = useDailyMeals(dateKey);
  const logFoodMutation = useLogFood();
  const logPlannedMealMutation = useLogPlannedMeal();

  const sections = React.useMemo(() => {
    const dayMeals = dayPlan?.meals || [];
    const mealsBySlot = new Map(dayMeals.map((meal) => [normalizeMealSlot(meal.meal_slot)!, meal]));
    const loggedBySlot = new Map((dailyMeals || []).map((meal) => [normalizeMealSlot(meal.mealSlot)!, meal]));

    return MEAL_SLOT_ORDER.map((slot) => {
      const plannedMeal = mealsBySlot.get(slot);
      const loggedMeal = loggedBySlot.get(slot);
      const derived = buildPlannedMealDerivedState(plannedMeal?.selected_variant?.items || [], loggedMeal?.items || []);
      const rawTime = mealTimes.raw[slot];
      const timeLabel = rawTime === 'anytime' ? 'Anytime' : mealTimes[slot];
      const plannedName = plannedMeal?.selected_variant?.name || plannedMeal?.name || `No planned ${getMealSlotLabel(slot).toLowerCase()}`;
      const totals = {
        calories: Math.round(Number(plannedMeal?.selected_variant?.target_calories ?? plannedMeal?.target_calories ?? 0)),
        protein: Math.round(Number(plannedMeal?.selected_variant?.target_protein ?? plannedMeal?.target_protein ?? 0)),
        carbs: Math.round(Number(plannedMeal?.selected_variant?.target_carbs ?? plannedMeal?.target_carbs ?? 0)),
        fat: Math.round(Number(plannedMeal?.selected_variant?.target_fat ?? plannedMeal?.target_fat ?? 0)),
      };

      let statusLabel = 'Open';
      if (!plannedMeal) {
        statusLabel = 'Open';
      } else if (derived.status === 'logged') {
        statusLabel = 'Logged';
      } else if (derived.status === 'partially_logged') {
        statusLabel = 'Partially logged';
      } else if (derived.status === 'needs_manual_add') {
        statusLabel = 'Needs manual add';
      } else {
        statusLabel = 'Planned';
      }

      return {
        slot,
        label: getMealSlotLabel(slot),
        timeLabel,
        plannedMealId: plannedMeal?.id || null,
        plannedMealName: plannedName,
        plannedMealDescription: plannedMeal?.description || null,
        statusLabel,
        totals,
        items: derived.items,
        canLogWholeMeal: !!plannedMeal?.id && derived.canLogWholeMeal,
        hasAnyLoggedItems: derived.hasAnyLoggedItems,
        hasAllLoggedItems: derived.hasAllLoggedItems,
        remainingQuickAddCount: derived.remainingQuickAddCount,
        loggedItems: loggedMeal?.items || [],
      };
    });
  }, [dailyMeals, dayPlan?.meals, mealTimes, mealTimes.raw]);

  const plannedTotals = React.useMemo(
    () =>
      sections.reduce(
        (acc, section) => ({
          calories: acc.calories + section.totals.calories,
          protein: acc.protein + section.totals.protein,
          carbs: acc.carbs + section.totals.carbs,
          fat: acc.fat + section.totals.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [sections],
  );

  React.useEffect(() => {
    if (!focusSlot || !sectionOffsets.current[focusSlot]) return;

    const timeout = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(sectionOffsets.current[focusSlot] - 12, 0),
        animated: true,
      });
      setHighlightedSlot(focusSlot);
    }, 120);

    const clearTimeoutId = setTimeout(() => setHighlightedSlot(null), 1800);
    return () => {
      clearTimeout(timeout);
      clearTimeout(clearTimeoutId);
    };
  }, [focusSlot, sections]);

  const openMealDetail = React.useCallback(
    (slot: MealSlot, plannedMealId?: string | null) => {
      router.push({
        pathname: '/(tabs)/nutrition/meal-detail',
        params: {
          mealSlot: slot,
          date: dateKey,
          mode: isToday ? 'today' : 'plan',
          ...(plannedMealId ? { mealId: plannedMealId } : {}),
        },
      });
    },
    [dateKey, isToday, router],
  );

  const openFoodSearch = React.useCallback(
    (slot: MealSlot) => {
      router.push({
        pathname: '/(tabs)/nutrition/food-search',
        params: {
          mealSlot: slot,
          date: dateKey,
          source: 'today_plan',
        },
      });
    },
    [dateKey, router],
  );

  const handleQuickAddItem = React.useCallback(
    async (slot: MealSlot, item: (typeof sections)[number]['items'][number]) => {
      if (!item.foodItemId || !item.grams) return;

      try {
        await logFoodMutation.mutateAsync({
          foodItemId: item.foodItemId,
          mealSlot: slot,
          grams: item.grams,
          date: dateKey,
        });
      } catch (error: any) {
        Alert.alert('Quick add failed', error?.message || 'Could not log this food right now.');
      }
    },
    [dateKey, logFoodMutation],
  );

  const handleLogMeal = React.useCallback(
    async (planMealId: string) => {
      try {
        await logPlannedMealMutation.mutateAsync({ planMealId, date: dateKey });
      } catch (error: any) {
        Alert.alert('Unable to log meal', error?.message || 'Try adding foods one at a time.');
      }
    },
    [dateKey, logPlannedMealMutation],
  );

  const loading = isPlanLoading || isDailyMealsLoading;

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: s.lg }]}>
        <Pressable
          onPress={() => router.push('/(tabs)/nutrition')}
          style={[styles.headerButton, { backgroundColor: c.surface, borderRadius: r.pill }]}
        >
          <TabBarIcon name="chevron-back" color={c.text} size={22} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }}>
            Today&apos;s plan
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: 2 }}>
            {dateKey}
          </Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={{ color: c.textMuted, marginTop: s.md, fontFamily: ty.body.family }}>
            Loading today&apos;s meal plan...
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + 140, gap: s.md }}
        >
          <GlassCard intensity="medium" glowEffect>
            <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, letterSpacing: 1 }}>
              DAY SUMMARY
            </Text>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.h3, marginTop: s.sm }}>
              Planned meals for the day
            </Text>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
              Breakfast, lunch, dinner, and snack all in one view.
            </Text>
            <MacroRow
              style={{ marginTop: s.md }}
              size="md"
              emphasis="soft"
              items={[
                { macro: 'calories', value: plannedTotals.calories, unit: 'kcal' },
                { macro: 'protein', value: plannedTotals.protein, unit: 'g' },
                { macro: 'carbs', value: plannedTotals.carbs, unit: 'g' },
                { macro: 'fat', value: plannedTotals.fat, unit: 'g' },
              ]}
            />
          </GlassCard>

          {sections.map((section) => {
            const isFocused = highlightedSlot === section.slot;
            const sectionActionLabel = !section.plannedMealId
              ? 'Add food'
              : section.hasAllLoggedItems
                ? 'View log'
                : section.hasAnyLoggedItems
                  ? 'Continue adding'
                  : section.canLogWholeMeal
                    ? 'Log meal'
                    : 'Add manually';

            const sectionActionDisabled = !!section.plannedMealId && !section.canLogWholeMeal && !section.hasAnyLoggedItems;
            const sectionActionPending = logPlannedMealMutation.isPending && logPlannedMealMutation.variables?.planMealId === section.plannedMealId;

            return (
              <GlassCard
                key={section.slot}
                intensity={isFocused ? 'strong' : 'light'}
                glowEffect={isFocused}
                style={{
                  borderWidth: 1,
                  borderColor: isFocused ? `${c.primary}70` : c.border,
                }}
              >
                <View
                  onLayout={(event) => {
                    sectionOffsets.current[section.slot] = event.nativeEvent.layout.y;
                  }}
                >
                  <View style={styles.sectionHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.sectionTitleRow}>
                        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
                          {section.label}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              borderRadius: r.pill,
                              borderColor: isFocused ? `${c.primary}45` : c.border,
                              backgroundColor: isFocused ? `${c.primary}14` : c.surface2,
                            },
                          ]}
                        >
                          <Text style={{ color: isFocused ? c.primary : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: 11 }}>
                            {section.statusLabel}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: 4 }}>
                        {section.timeLabel}
                      </Text>
                      <Text style={{ color: c.text, fontFamily: ty.body.familyMedium, fontSize: ty.sizes.md, marginTop: 8 }}>
                        {section.plannedMealName}
                      </Text>
                      {section.plannedMealDescription ? (
                        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>
                          {section.plannedMealDescription}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <MacroRow
                    style={{ marginTop: s.md }}
                    size="sm"
                    emphasis="soft"
                    items={[
                      { macro: 'calories', value: section.totals.calories, unit: 'kcal' },
                      { macro: 'protein', value: section.totals.protein, unit: 'g' },
                      { macro: 'carbs', value: section.totals.carbs, unit: 'g' },
                      { macro: 'fat', value: section.totals.fat, unit: 'g' },
                    ]}
                  />

                  <View style={[styles.sectionActions, { marginTop: s.md }]}>
                    <Pressable
                      onPress={() => {
                        if (!section.plannedMealId) {
                          openFoodSearch(section.slot);
                          return;
                        }

                        if (section.hasAllLoggedItems || section.hasAnyLoggedItems) {
                          openMealDetail(section.slot, section.plannedMealId);
                          return;
                        }

                        if (section.canLogWholeMeal) {
                          handleLogMeal(section.plannedMealId);
                        }
                      }}
                      disabled={sectionActionDisabled || sectionActionPending}
                      style={[
                        styles.primaryAction,
                        {
                          borderRadius: r.pill,
                          backgroundColor: sectionActionDisabled ? c.surface2 : c.primary,
                          opacity: sectionActionPending ? 0.7 : 1,
                        },
                      ]}
                    >
                      {sectionActionPending ? (
                        <ActivityIndicator size="small" color={c.bg} />
                      ) : (
                        <Text style={{ color: sectionActionDisabled ? c.textMuted : c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                          {sectionActionLabel}
                        </Text>
                      )}
                    </Pressable>

                    <Pressable
                      onPress={() => openMealDetail(section.slot, section.plannedMealId)}
                      style={[
                        styles.secondaryAction,
                        {
                          borderColor: c.border,
                          borderRadius: r.pill,
                        },
                      ]}
                    >
                      <TabBarIcon name="eye-outline" color={c.textMuted} size={16} />
                      <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginLeft: s.xs }}>
                        View detail
                      </Text>
                    </Pressable>
                  </View>

                  {!!section.items.length ? (
                    <View style={{ marginTop: s.md, gap: s.sm }}>
                      {section.items.map((item) => {
                        const itemPending =
                          logFoodMutation.isPending &&
                          logFoodMutation.variables?.foodItemId === item.foodItemId &&
                          logFoodMutation.variables?.mealSlot === section.slot;

                        return (
                          <View
                            key={item.id}
                            style={[
                              styles.itemRow,
                              {
                                borderColor: c.border,
                                borderRadius: r.md,
                                backgroundColor: c.bg,
                              },
                            ]}
                          >
                            <View style={styles.itemHeader}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                                  {item.name}
                                </Text>
                                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>
                                  {item.quantityLabel}
                                </Text>
                              </View>

                              <Pressable
                                onPress={() => handleQuickAddItem(section.slot, item)}
                                disabled={!item.isQuickAddable || item.isAdded || itemPending}
                                style={[
                                  styles.itemAction,
                                  {
                                    borderRadius: r.pill,
                                    backgroundColor: item.isAdded
                                      ? `${c.success}16`
                                      : item.isQuickAddable
                                        ? c.surface2
                                        : `${c.textMuted}12`,
                                    borderColor: item.isAdded ? `${c.success}45` : item.isQuickAddable ? `${c.primary}35` : c.border,
                                  },
                                ]}
                              >
                                {itemPending ? (
                                  <ActivityIndicator size="small" color={c.primary} />
                                ) : (
                                  <Text
                                    style={{
                                      color: item.isAdded ? c.success : item.isQuickAddable ? c.primary : c.textMuted,
                                      fontFamily: ty.body.familySemibold,
                                      fontSize: ty.sizes.xs,
                                    }}
                                  >
                                    {item.isAdded ? 'Added' : item.isQuickAddable ? 'Quick add' : 'Manual add'}
                                  </Text>
                                )}
                              </Pressable>
                            </View>

                            <MacroRow
                              style={{ marginTop: s.sm }}
                              size="sm"
                              emphasis="outlined"
                              items={[
                                { macro: 'calories', value: item.calories, unit: 'kcal' },
                                { macro: 'protein', value: item.protein, unit: 'g' },
                                { macro: 'carbs', value: item.carbs, unit: 'g' },
                                { macro: 'fat', value: item.fat, unit: 'g' },
                              ]}
                            />
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.emptyState,
                        {
                          marginTop: s.md,
                          borderRadius: r.md,
                          borderColor: c.border,
                          backgroundColor: c.bg,
                        },
                      ]}
                    >
                      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                        No generated foods for this slot yet.
                      </Text>
                    </View>
                  )}
                </View>
              </GlassCard>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryAction: {
    minHeight: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryAction: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemRow: {
    borderWidth: 1,
    padding: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemAction: {
    minHeight: 40,
    minWidth: 92,
    paddingHorizontal: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
});
