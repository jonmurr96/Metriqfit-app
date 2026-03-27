import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { MealSlot } from '../../services/nutritionService';
import { TabBarIcon } from '../navigation/TabBarIcon';
import { useTokens } from '../../lib/theme';
import { MacroRow } from './MacroRow';

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
}

interface TodayMealPlanListProps {
  meals: TodayMealPlanListItem[];
  pendingPlanMealId?: string | null;
  onOpenMeal: (item: TodayMealPlanListItem) => void;
  onLogMeal: (item: TodayMealPlanListItem) => void;
  onAddFood: (item: TodayMealPlanListItem) => void;
}

export function TodayMealPlanList({
  meals,
  pendingPlanMealId,
  onOpenMeal,
  onLogMeal,
  onAddFood,
}: TodayMealPlanListProps) {
  const { c, s, ty, r } = useTokens();

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
              },
            ]}
          >
            <View style={styles.mealMain}>
              <View style={styles.mealTitleRow}>
                <Text
                  style={{
                    color: c.text,
                    fontFamily: ty.body.familySemibold,
                    fontSize: ty.sizes.md,
                  }}
                >
                  {meal.label}
                </Text>
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
              </View>

              <Text
                numberOfLines={1}
                style={{
                  color: c.text,
                  fontFamily: ty.body.familyMedium,
                  fontSize: ty.sizes.sm,
                  marginTop: 6,
                }}
              >
                {meal.plannedName}
              </Text>

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

              <MacroRow
                style={{ marginTop: 8 }}
                size="sm"
                emphasis="outlined"
                items={[
                  { macro: 'calories', value: meal.targetCalories, unit: 'kcal' },
                  { macro: 'protein', value: Math.round(meal.targetProtein), unit: 'g' },
                  { macro: 'carbs', value: Math.round(meal.targetCarbs), unit: 'g' },
                  { macro: 'fat', value: Math.round(meal.targetFat), unit: 'g' },
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
            </View>

            <View style={styles.actionsColumn}>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    alignItems: 'flex-end',
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
