import React, { useMemo } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDailyMeals, useDeleteMealLogItem, useLogFood, useLogPlannedMeal } from '../../../hooks/useNutrition';
import { useNutritionPlanDay, useNutritionPlanMeal } from '../../../hooks/usePlan';
import {
  getDayOfWeekFromDateKey,
  getMealSlotLabel,
  getLocalDateKey,
  normalizeDateKey,
  normalizeMealSlot,
} from '../../../lib/nutrition/meal-slots';
import { buildPlannedMealDerivedState } from '../../../lib/nutrition/planned-meal-state';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { GlassCard } from '../../../components/premium/GlassCard';
import { MacroRow } from '../../../components/nutrition/MacroRow';
import { useProfile } from '../../../hooks/useUser';
import { formatFoodQuantity, formatMacroDisplay, detectFoodCategory, getDefaultFoodMeasurement } from '../../../lib/nutrition/displayUnits';

function PortionBadge({
  grams,
  fallbackLabel,
  itemName,
}: {
  grams?: number | null;
  fallbackLabel?: string;
  itemName?: string;
}) {
  const { c, ty, r } = useTokens();
  const { data: profile } = useProfile();
  const foodMeasurement = getDefaultFoodMeasurement(profile?.unit_system);
  const displayFoodMeasurement = (profile?.display_preferences?.food_measurement as any) ?? foodMeasurement;

  if (!grams && !fallbackLabel) return null;

  if (grams && grams > 0) {
    const category = detectFoodCategory(itemName || '');
    const fmt = formatFoodQuantity(grams, category, displayFoodMeasurement);
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          backgroundColor: c.surface2,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 6,
          alignSelf: 'flex-start',
          marginTop: 6,
          borderWidth: 1,
          borderColor: `${c.textMuted}20`,
        }}
      >
        <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
          {fmt.value}
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>{fmt.unit}</Text>
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.surface2,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginTop: 6,
        borderWidth: 1,
        borderColor: `${c.textMuted}20`,
      }}
    >
      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
        {fallbackLabel}
      </Text>
    </View>
  );
}

export default function MealDetailScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();
  const foodMeasurement = getDefaultFoodMeasurement(profile?.unit_system);
  const displayFoodMeasurement = (profile?.display_preferences?.food_measurement as any) ?? foodMeasurement;
  const params = useLocalSearchParams<{
    mealId?: string | string[];
    planMealId?: string | string[];
    mealSlot?: string | string[];
    date?: string | string[];
    mode?: string | string[];
  }>();

  const explicitMealId = Array.isArray(params.mealId)
    ? params.mealId[0]
    : params.mealId || (Array.isArray(params.planMealId) ? params.planMealId[0] : params.planMealId);
  const requestedMealSlot = normalizeMealSlot(params.mealSlot);
  const dateKey = normalizeDateKey(params.date);
  const mode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const dayOfWeek = getDayOfWeekFromDateKey(dateKey);
  const isToday = dateKey === getLocalDateKey();
  const canDirectLog = mode === 'today' && isToday;
  const showLoggedState = mode !== 'plan';

  const { data: dailyMeals, isLoading: isDailyMealsLoading } = useDailyMeals(dateKey);
  const { data: dayPlan, isLoading: isDayPlanLoading } = useNutritionPlanDay(dayOfWeek, {
    enabled: !explicitMealId,
  });
  const { data: directMeal, isLoading: isDirectMealLoading } = useNutritionPlanMeal(explicitMealId || '', {
    enabled: !!explicitMealId,
  });
  const deleteMutation = useDeleteMealLogItem();
  const logPlannedMealMutation = useLogPlannedMeal();
  const logFoodMutation = useLogFood();

  const plannedMeal = useMemo(
    () => directMeal || dayPlan?.meals?.find((meal) => normalizeMealSlot(meal.meal_slot) === requestedMealSlot) || null,
    [dayPlan?.meals, directMeal, requestedMealSlot],
  );
  const mealSlot = requestedMealSlot || normalizeMealSlot(plannedMeal?.meal_slot) || 'lunch';
  const slotLabel = getMealSlotLabel(mealSlot);

  const loggedMeal = useMemo(
    () => (showLoggedState ? dailyMeals?.find((meal) => normalizeMealSlot(meal.mealSlot) === mealSlot) || null : null),
    [dailyMeals, mealSlot, showLoggedState],
  );

  const loggedItems = loggedMeal?.items || [];
  const plannedState = useMemo(
    () => buildPlannedMealDerivedState(plannedMeal?.selected_variant?.items || [], loggedItems),
    [loggedItems, plannedMeal?.selected_variant?.items],
  );
  const loggedCalories = Math.round(
    loggedItems.reduce((total, item) => total + Number(item.calories || 0), 0),
  );
  const plannedName =
    plannedMeal?.selected_variant?.name ||
    plannedMeal?.name ||
    `${slotLabel} Meal`;
  const targetCalories = Math.round(
    Number(plannedMeal?.selected_variant?.target_calories ?? plannedMeal?.target_calories ?? 0),
  );
  const targetProtein = Number(
    plannedMeal?.selected_variant?.target_protein ?? plannedMeal?.target_protein ?? 0,
  );
  const targetCarbs = Number(
    plannedMeal?.selected_variant?.target_carbs ?? plannedMeal?.target_carbs ?? 0,
  );
  const targetFat = Number(
    plannedMeal?.selected_variant?.target_fat ?? plannedMeal?.target_fat ?? 0,
  );

  const handleDeleteItem = (itemId: string, name: string) => {
    Alert.alert(
      'Remove Item',
      `Remove ${name} from ${slotLabel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(itemId),
        },
      ],
    );
  };

  const handleAddFood = () => {
    router.push({
      pathname: '/(tabs)/nutrition/food-search',
      params: {
        mealSlot,
        date: dateKey,
        source: canDirectLog ? 'today_meal_detail' : 'meal_detail',
      },
    });
  };

  const handleLogPlannedMeal = () => {
    if (!plannedMeal?.id) return;

    logPlannedMealMutation.mutate(
      { planMealId: plannedMeal.id, date: dateKey },
      {
        onSuccess: (result) => {
          Alert.alert(
            'Meal logged',
            `${result.plannedMealName} was added to ${slotLabel.toLowerCase()}.`,
          );
        },
        onError: (error) => {
          Alert.alert('Unable to log meal', error.message || 'Try adding food manually.');
        },
      },
    );
  };

  const handleQuickAddPlannedItem = async (item: (typeof plannedState.items)[number]) => {
    if (!item.foodItemId || !item.grams) return;

    try {
      await logFoodMutation.mutateAsync({
        foodItemId: item.foodItemId,
        mealSlot,
        grams: item.grams,
        date: dateKey,
      });
    } catch (error: any) {
      Alert.alert('Quick add failed', error?.message || 'Could not log this food right now.');
    }
  };

  const isLoading = isDailyMealsLoading || isDayPlanLoading || isDirectMealLoading;
  const showDirectLogCta = canDirectLog && !!plannedMeal?.id && plannedState.canLogWholeMeal;
  const showAddFoodCta = canDirectLog;

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: s.lg }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: c.surface }]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <TabBarIcon name="chevron-back" color={c.text} size={24} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text
            style={[
              styles.title,
              {
                color: c.text,
                fontFamily: ty.heading.familySemibold,
                fontSize: ty.sizes.xl,
              },
            ]}
          >
            {slotLabel}
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.sm,
              marginTop: 2,
            }}
          >
            {dateKey}
          </Text>
        </View>
        <Pressable
          onPress={handleAddFood}
          style={[styles.backButton, { backgroundColor: c.surface }]}
          accessibilityLabel={`Add food to ${slotLabel}`}
          accessibilityRole="button"
          disabled={!showAddFoodCta}
        >
          <TabBarIcon name="add" color={showAddFoodCta ? c.primary : c.textSubtle} size={24} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + 120, gap: s.md }}
        contentInsetAdjustmentBehavior="automatic"
      >
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={c.primary} />
            <Text style={{ color: c.textMuted, marginTop: s.md, fontFamily: ty.body.family }}>
              Loading meal details...
            </Text>
          </View>
        ) : (
          <>
            <GlassCard intensity="medium" glowEffect>
              <Text
                style={{
                  color: c.primary,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.xs,
                  letterSpacing: 1.2,
                }}
              >
                PLANNED MEAL
              </Text>
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.heading.familySemibold,
                  fontSize: ty.sizes.h3,
                  marginTop: s.sm,
                }}
              >
                {plannedName}
              </Text>
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.sm,
                  marginTop: s.xs,
                  lineHeight: 20,
                }}
              >
                {plannedMeal?.description || `Your ${slotLabel.toLowerCase()} target for the day.`}
              </Text>

              <MacroRow
                style={{ marginTop: s.md }}
                size="sm"
                emphasis="soft"
                items={[
                  { macro: 'calories', value: targetCalories, unit: 'kcal' },
                  { macro: 'protein', value: parseFloat(formatMacroDisplay(targetProtein, 'protein', displayFoodMeasurement).value), unit: formatMacroDisplay(targetProtein, 'protein', displayFoodMeasurement).unit },
                  { macro: 'carbs', value: parseFloat(formatMacroDisplay(targetCarbs, 'carbs', displayFoodMeasurement).value), unit: formatMacroDisplay(targetCarbs, 'carbs', displayFoodMeasurement).unit },
                  { macro: 'fat', value: parseFloat(formatMacroDisplay(targetFat, 'fat', displayFoodMeasurement).value), unit: formatMacroDisplay(targetFat, 'fat', displayFoodMeasurement).unit },
                ]}
              />

              {!!plannedState.items.length && (
                <View style={{ marginTop: s.md, gap: s.sm }}>
                  {plannedState.items.map((item) => {
                    const itemPending =
                      logFoodMutation.isPending &&
                      logFoodMutation.variables?.foodItemId === item.foodItemId &&
                      logFoodMutation.variables?.mealSlot === mealSlot;

                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.plannedItemRow,
                          {
                            borderColor: c.border,
                            borderRadius: r.md,
                            backgroundColor: c.bg,
                          },
                        ]}
                      >
                        <View style={styles.plannedItemHeader}>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                color: c.text,
                                fontFamily: ty.body.familySemibold,
                                fontSize: ty.sizes.sm,
                              }}
                            >
                              {item.name}
                            </Text>
                            <PortionBadge grams={item.grams} fallbackLabel={item.quantityLabel} itemName={item.name} />
                          </View>

                          <Pressable
                            onPress={() => handleQuickAddPlannedItem(item)}
                            disabled={!item.isQuickAddable || item.isAdded || itemPending}
                            style={[
                              styles.quickAddButton,
                              {
                                borderRadius: r.pill,
                                borderColor: item.isAdded ? `${c.success}45` : item.isQuickAddable ? `${c.primary}40` : c.border,
                                backgroundColor: item.isAdded ? `${c.success}16` : item.isQuickAddable ? c.surface2 : `${c.textMuted}12`,
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
                            { macro: 'protein', value: parseFloat(formatMacroDisplay(item.protein, 'protein', displayFoodMeasurement).value), unit: formatMacroDisplay(item.protein, 'protein', displayFoodMeasurement).unit },
                            { macro: 'carbs', value: parseFloat(formatMacroDisplay(item.carbs, 'carbs', displayFoodMeasurement).value), unit: formatMacroDisplay(item.carbs, 'carbs', displayFoodMeasurement).unit },
                            { macro: 'fat', value: parseFloat(formatMacroDisplay(item.fat, 'fat', displayFoodMeasurement).value), unit: formatMacroDisplay(item.fat, 'fat', displayFoodMeasurement).unit },
                          ]}
                        />
                      </View>
                    );
                  })}
                </View>
              )}
            </GlassCard>

            {showLoggedState && (
              <GlassCard intensity="light">
                <View style={styles.summaryHeader}>
                  <View>
                    <Text
                      style={{
                        color: c.text,
                        fontFamily: ty.heading.familySemibold,
                        fontSize: ty.sizes.md,
                      }}
                    >
                      Logged so far
                    </Text>
                    <Text
                      style={{
                        color: c.textMuted,
                        fontFamily: ty.body.family,
                        fontSize: ty.sizes.sm,
                        marginTop: 2,
                      }}
                    >
                      {loggedItems.length > 0
                        ? `${loggedCalories} KCAL • ${loggedItems.length} item${loggedItems.length === 1 ? '' : 's'}`
                        : `Nothing logged for ${slotLabel.toLowerCase()} yet.`}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.summaryBadge,
                      {
                        borderRadius: r.pill,
                        borderColor: loggedItems.length > 0 ? `${c.success}55` : c.border,
                        backgroundColor: loggedItems.length > 0 ? `${c.success}12` : c.surface2,
                      },
                    ]}
                  >
                    <TabBarIcon
                      name={loggedItems.length > 0 ? 'checkmark-circle' : 'time-outline'}
                      color={loggedItems.length > 0 ? c.success : c.textMuted}
                      size={14}
                    />
                    <Text
                      style={{
                        color: loggedItems.length > 0 ? c.success : c.textMuted,
                        fontFamily: ty.body.familySemibold,
                        fontSize: 11,
                        marginLeft: 4,
                      }}
                    >
                      {loggedItems.length > 0 ? 'In progress' : 'Pending'}
                    </Text>
                  </View>
                </View>

                {loggedItems.length > 0 ? (
                  <View style={{ marginTop: s.md, gap: s.sm }}>
                    {loggedItems.map((item) => (
                      <View
                        key={item.id}
                        style={[
                          styles.itemRow,
                          {
                            borderColor: c.border,
                            borderRadius: r.md,
                            backgroundColor: c.surface2,
                          },
                        ]}
                      >
                        <View style={styles.itemCopy}>
                          <Text
                            style={{
                              color: c.text,
                              fontFamily: ty.body.familySemibold,
                              fontSize: ty.sizes.md,
                            }}
                          >
                            {item.food.name}
                          </Text>
                          <PortionBadge grams={Number(item.grams || 0)} />
                          <MacroRow
                            style={{ marginTop: 12 }}
                            size="sm"
                            emphasis="outlined"
                            items={[
                              { macro: 'calories', value: item.calories, unit: 'kcal' },
                              { macro: 'protein', value: parseFloat(formatMacroDisplay(item.protein, 'protein', displayFoodMeasurement).value), unit: formatMacroDisplay(item.protein, 'protein', displayFoodMeasurement).unit },
                              { macro: 'carbs', value: parseFloat(formatMacroDisplay(item.carbs, 'carbs', displayFoodMeasurement).value), unit: formatMacroDisplay(item.carbs, 'carbs', displayFoodMeasurement).unit },
                              { macro: 'fat', value: parseFloat(formatMacroDisplay(item.fat, 'fat', displayFoodMeasurement).value), unit: formatMacroDisplay(item.fat, 'fat', displayFoodMeasurement).unit },
                            ]}
                          />
                        </View>

                        <Pressable
                          onPress={() => handleDeleteItem(item.id, item.food.name)}
                          disabled={deleteMutation.isPending}
                          style={styles.itemAction}
                        >
                          <TabBarIcon name="trash-outline" color={c.danger} size={18} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View
                    style={[
                      styles.emptyState,
                      {
                        marginTop: s.md,
                        borderColor: c.border,
                        borderRadius: r.md,
                        backgroundColor: c.surface2,
                      },
                    ]}
                  >
                    <TabBarIcon name="nutrition-outline" color={c.textSubtle} size={28} />
                    <Text
                      style={{
                        color: c.text,
                        fontFamily: ty.body.familyMedium,
                        fontSize: ty.sizes.sm,
                        marginTop: s.sm,
                      }}
                    >
                      Add the first food for {slotLabel.toLowerCase()}.
                    </Text>
                    <Text
                      style={{
                        color: c.textMuted,
                        fontFamily: ty.body.family,
                        fontSize: ty.sizes.xs,
                        marginTop: 4,
                        textAlign: 'center',
                      }}
                    >
                      Add food manually if you’re deviating from the plan.
                    </Text>
                  </View>
                )}
              </GlassCard>
            )}

            {!canDirectLog && (
              <GlassCard intensity="light">
                <Text
                  style={{
                    color: c.text,
                    fontFamily: ty.body.familySemibold,
                    fontSize: ty.sizes.sm,
                  }}
                >
                  Plan view only
                </Text>
                <Text
                  style={{
                    color: c.textMuted,
                    fontFamily: ty.body.family,
                    fontSize: ty.sizes.xs,
                    marginTop: 4,
                    lineHeight: 18,
                  }}
                >
                  Logging is available from today&apos;s Nutrition screen. This view is for reviewing the planned meal.
                </Text>
              </GlassCard>
            )}

            {canDirectLog && plannedState.hasAnyLoggedItems && !plannedState.canLogWholeMeal ? (
              <GlassCard intensity="light">
                <Text
                  style={{
                    color: c.text,
                    fontFamily: ty.body.familySemibold,
                    fontSize: ty.sizes.sm,
                  }}
                >
                  Whole-meal log disabled
                </Text>
                <Text
                  style={{
                    color: c.textMuted,
                    fontFamily: ty.body.family,
                    fontSize: ty.sizes.xs,
                    marginTop: 4,
                    lineHeight: 18,
                  }}
                >
                  Some foods from this meal were already added individually, so the meal-level log is hidden to prevent duplicate macros.
                </Text>
              </GlassCard>
            ) : null}
          </>
        )}
      </ScrollView>

      {(showDirectLogCta || showAddFoodCta) && (
        <View
          style={[
            styles.footer,
            {
              paddingHorizontal: s.lg,
              paddingBottom: insets.bottom + s.lg,
              paddingTop: s.md,
              gap: s.sm,
            },
          ]}
        >
          {showDirectLogCta && (
            <Pressable
              onPress={handleLogPlannedMeal}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: c.primary,
                  borderRadius: r.md,
                  opacity: logPlannedMealMutation.isPending ? 0.7 : 1,
                },
              ]}
              disabled={logPlannedMealMutation.isPending}
            >
              {logPlannedMealMutation.isPending ? (
                <ActivityIndicator size="small" color={c.bg} />
              ) : (
                <>
                  <TabBarIcon name="checkmark-circle-outline" color={c.bg} size={20} />
                  <Text
                    style={{
                      color: c.bg,
                      fontFamily: ty.heading.familySemibold,
                      fontSize: ty.sizes.lg,
                      marginLeft: s.sm,
                    }}
                  >
                    Log This Meal
                  </Text>
                </>
              )}
            </Pressable>
          )}

          {showAddFoodCta && (
            <Pressable
              onPress={handleAddFood}
              style={[
                styles.secondaryButton,
                {
                  borderColor: c.border,
                  borderRadius: r.md,
                  backgroundColor: c.surface,
                },
              ]}
              disabled={isLoading}
            >
              <TabBarIcon name="add-circle-outline" color={c.text} size={18} />
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.md,
                  marginLeft: s.sm,
                }}
              >
                Add Food
              </Text>
            </Pressable>
          )}
        </View>
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
  headerCopy: {
    flex: 1,
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    letterSpacing: -0.3,
  },
  scrollView: {
    flex: 1,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 64,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metricText: {
    fontSize: 12,
    marginLeft: 4,
  },
  plannedItemRow: {
    borderWidth: 1,
    padding: 12,
  },
  plannedItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  quickAddButton: {
    minHeight: 40,
    minWidth: 92,
    paddingHorizontal: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 14,
  },
  itemCopy: {
    flex: 1,
  },
  itemAction: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    borderWidth: 1,
    padding: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 14,
  },
});
