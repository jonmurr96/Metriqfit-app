import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { MealSlot } from '../../services/nutritionService';
import { TabBarIcon } from '../navigation/TabBarIcon';
import { useTokens } from '../../lib/theme';
import { MacroRow } from './MacroRow';
import { useProfile } from '../../hooks/useUser';
import { formatMacroDisplay, getDefaultFoodMeasurement } from '../../lib/nutrition/displayUnits';
import type { PlannedFoodItem } from '../../lib/nutrition/home-meal-preview';

export interface TodayMealPlanListItem {
  slot: MealSlot;
  label: string;
  plannedName: string;
  timeLabel: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  loggedCalories: number;
  loggedItemCount: number;
  isLogged: boolean;
  planMealId?: string;
  hasPlannedMeal: boolean;
  foods: PlannedFoodItem[];
}

interface TodayMealPlanListProps {
  meals: TodayMealPlanListItem[];
  pendingPlanMealId?: string | null;
  onOpenMeal: (item: TodayMealPlanListItem) => void;
  onLogMeal: (item: TodayMealPlanListItem) => void;
  onAddFood: (item: TodayMealPlanListItem) => void;
}

function getMealIcon(slot: MealSlot): string {
  switch (slot) {
    case 'breakfast':
      return 'sunny-outline';
    case 'lunch':
      return 'sunny';
    case 'dinner':
      return 'moon-outline';
    case 'snack':
      return 'cafe-outline';
    default:
      return 'restaurant-outline';
  }
}

function FoodItemLine({ food, index }: { food: PlannedFoodItem; index: number }) {
  const { c, ty } = useTokens();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View
        style={{
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: c.textMuted,
          opacity: 0.5,
        }}
      />
      <Text
        style={{
          color: c.text,
          fontFamily: ty.body.familyMedium,
          fontSize: ty.sizes.sm,
          flex: 1,
        }}
        numberOfLines={1}
      >
        {food.name}
      </Text>
      <Text
        style={{
          color: c.textMuted,
          fontFamily: ty.body.family,
          fontSize: ty.sizes.xs,
        }}
      >
        {food.amount}
        {food.unit}
      </Text>
    </View>
  );
}

export function TodayMealPlanList({
  meals,
  pendingPlanMealId,
  onOpenMeal,
  onLogMeal,
  onAddFood,
}: TodayMealPlanListProps) {
  const { c, s, ty, r } = useTokens();
  const { data: profile } = useProfile();
  const foodMeasurement = getDefaultFoodMeasurement(profile?.unit_system);
  const displayFoodMeasurement = (profile?.display_preferences?.food_measurement as any) ?? foodMeasurement;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: c.surface,
          borderRadius: r.lg,
          borderWidth: 1,
          borderColor: c.border,
          padding: s.md,
          gap: s.sm,
          overflow: 'hidden',
          width: '100%',
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1, maxWidth: '75%', marginRight: 8 }}>
          <Text
            style={{
              color: c.text,
              fontFamily: ty.heading.familySemibold,
              fontSize: ty.sizes.md,
            }}
          >
            Today&apos;s meals
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.xs,
              marginTop: 2,
            }}
          >
            Tap Log meal to follow your plan. Use Add Food only when you want to change it.
          </Text>
        </View>
        <View
          style={[
            styles.headerBadge,
            {
              backgroundColor: c.surface2,
              borderColor: c.border,
              borderRadius: r.pill,
              flexShrink: 0,
            },
          ]}
        >
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.familySemibold,
              fontSize: 11,
            }}
          >
            {meals.filter((meal) => meal.isLogged).length}/{meals.length}
          </Text>
        </View>
      </View>

      {meals.map((meal) => {
        const isPending = !!pendingPlanMealId && pendingPlanMealId === meal.planMealId;
        const statusLabel = meal.isLogged ? 'Logged' : meal.hasPlannedMeal ? 'Planned' : 'Open';
        const primaryLabel = meal.hasPlannedMeal
          ? meal.isLogged
            ? 'View log'
            : 'Log meal'
          : 'Add food';
        const mealIcon = getMealIcon(meal.slot);
        const hasFoods = meal.foods.length > 0;

        return (
          <Pressable
            key={meal.slot}
            onPress={() => onOpenMeal(meal)}
            style={({ pressed }) => [
              styles.mealRow,
              {
                backgroundColor: pressed ? c.surface2 : c.bg,
                borderColor: c.border,
                borderRadius: r.md,
                padding: s.md,
                flexDirection: 'column',
              },
            ]}
          >
            {/* Top row: main content + actions side by side */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={styles.mealMain}>
                {/* Title row: icon + label */}
                <View style={styles.mealTitleRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={mealIcon as any} size={16} color={c.primary} style={{ marginRight: 6 }} />
                    <Text
                      style={{
                        color: c.text,
                        fontFamily: ty.body.familySemibold,
                        fontSize: ty.sizes.md,
                      }}
                    >
                      {meal.label}
                    </Text>
                  </View>
                </View>

                {/* Food items or fallback to planned name */}
                <View style={{ marginTop: 6, gap: 3 }}>
                  {hasFoods ? (
                    <>
                      {meal.foods.slice(0, 3).map((food, index) => (
                        <FoodItemLine key={`${food.name}-${index}`} food={food} index={index} />
                      ))}
                      {meal.foods.length > 3 && (
                        <Text
                          style={{
                            color: c.textMuted,
                            fontFamily: ty.body.family,
                            fontSize: ty.sizes.xs,
                            marginLeft: 10,
                            marginTop: 2,
                          }}
                        >
                          +{meal.foods.length - 3} more
                        </Text>
                      )}
                    </>
                  ) : (
                    <Text
                      numberOfLines={1}
                      style={{
                        color: c.text,
                        fontFamily: ty.body.familyMedium,
                        fontSize: ty.sizes.sm,
                      }}
                    >
                      {meal.plannedName}
                    </Text>
                  )}
                </View>

                {/* Time label */}
                <Text
                  style={{
                    color: c.textMuted,
                    fontFamily: ty.body.family,
                    fontSize: ty.sizes.xs,
                    marginTop: 4,
                  }}
                >
                  {meal.timeLabel}
                </Text>
              </View>

              <View style={styles.actionsColumn}>
                <View
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor: meal.isLogged ? `${c.success}14` : c.surface2,
                      borderColor: meal.isLogged ? `${c.success}40` : c.border,
                      borderRadius: r.pill,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: meal.isLogged ? c.success : c.textMuted,
                      fontFamily: ty.body.familySemibold,
                      fontSize: 11,
                    }}
                  >
                    {statusLabel}
                  </Text>
                </View>
                <View style={{ alignItems: 'center', marginBottom: 2 }}>
                  <TabBarIcon name={mealIcon as any} color={c.primary} size={18} />
                </View>
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    if (meal.hasPlannedMeal && !meal.isLogged) {
                      onLogMeal(meal);
                      return;
                    }
                    if (meal.isLogged) {
                      onOpenMeal(meal);
                      return;
                    }
                    onAddFood(meal);
                  }}
                  disabled={isPending}
                  style={[
                    styles.primaryAction,
                    {
                      backgroundColor: meal.hasPlannedMeal && !meal.isLogged ? c.primary : c.surface2,
                      borderRadius: r.pill,
                      opacity: isPending ? 0.7 : 1,
                    },
                  ]}
                >
                  {isPending ? (
                    <ActivityIndicator size="small" color={meal.hasPlannedMeal && !meal.isLogged ? c.bg : c.text} />
                  ) : (
                    <Text
                      style={{
                        color: meal.hasPlannedMeal && !meal.isLogged ? c.bg : c.text,
                        fontFamily: ty.body.familySemibold,
                        fontSize: ty.sizes.xs,
                      }}
                    >
                      {primaryLabel}
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    if (meal.isLogged || !meal.hasPlannedMeal) {
                      onAddFood(meal);
                      return;
                    }
                    onOpenMeal(meal);
                  }}
                  style={[
                    styles.secondaryAction,
                    {
                      borderColor: c.border,
                      borderRadius: r.pill,
                    },
                  ]}
                >
                  <TabBarIcon name={meal.isLogged || !meal.hasPlannedMeal ? 'add' : 'eye-outline'} color={c.textMuted} size={14} />
                  <Text
                    style={{
                      color: c.textMuted,
                      fontFamily: ty.body.familySemibold,
                      fontSize: ty.sizes.xs,
                      marginLeft: 4,
                    }}
                  >
                    {meal.isLogged || !meal.hasPlannedMeal ? 'Add food' : 'View'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Macro row spanning full width below */}
            <MacroRow
              style={{ marginTop: 10, flexWrap: 'nowrap' }}
              size="sm"
              emphasis="outlined"
              showLabel={false}
              items={[
                { macro: 'calories', value: meal.targetCalories, unit: 'kcal' },
                { macro: 'protein', value: parseFloat(formatMacroDisplay(meal.targetProtein, 'protein', displayFoodMeasurement).value), unit: formatMacroDisplay(meal.targetProtein, 'protein', displayFoodMeasurement).unit },
                { macro: 'carbs', value: parseFloat(formatMacroDisplay(meal.targetCarbs, 'carbs', displayFoodMeasurement).value), unit: formatMacroDisplay(meal.targetCarbs, 'carbs', displayFoodMeasurement).unit },
                { macro: 'fat', value: parseFloat(formatMacroDisplay(meal.targetFat, 'fat', displayFoodMeasurement).value), unit: formatMacroDisplay(meal.targetFat, 'fat', displayFoodMeasurement).unit },
              ]}
            />

            {meal.loggedItemCount > 0 && (
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.xs,
                  marginTop: 4,
                }}
              >
                Logged: {meal.loggedCalories} kcal • {meal.loggedItemCount} item
                {meal.loggedItemCount === 1 ? '' : 's'}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerBadge: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealRow: {
    gap: 0,
    borderWidth: 1,
  },
  mealMain: {
    flex: 1,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusChip: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionsColumn: {
    alignItems: 'center',
    gap: 8,
  },
  primaryAction: {
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
