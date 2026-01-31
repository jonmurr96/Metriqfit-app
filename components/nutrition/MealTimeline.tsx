import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';

interface FoodItem {
  name: string;
  portion: string;
  calories: number;
}

interface Meal {
  name: string;
  time: string;
  calories: number;
  goalCalories: number;
  color: string;
  items: FoodItem[];
  isGoalMet?: boolean;
}

interface MealTimelineProps {
  meals?: Meal[];
  onAddFood?: (mealName: string) => void;
}

const defaultMeals: Meal[] = [];

export function MealTimeline({
  meals = [],
  onAddFood,
}: MealTimelineProps) {
  const { c, s, ty, r } = useTokens();
  const [expandedMeal, setExpandedMeal] = useState<string>('Breakfast');

  const toggleMeal = (mealName: string) => {
    setExpandedMeal(expandedMeal === mealName ? '' : mealName);
  };

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 400, delay: 200 }}
      style={styles.container}
    >
      {/* Timeline line */}
      <View style={[styles.timelineLine, { backgroundColor: c.border, marginLeft: s.md }]} />

      <View style={styles.mealsContainer}>
        {meals.map((meal, index) => {
          const isExpanded = expandedMeal === meal.name;
          const mealColor = meal.color;

          return (
            <View key={meal.name} style={styles.mealWrapper}>
              {/* Timeline dot */}
              <View
                style={[
                  styles.timelineDot,
                  {
                    backgroundColor: mealColor,
                    borderWidth: 4,
                    borderColor: c.bg,
                    marginLeft: s.md,
                  },
                ]}
              />

              {/* Meal card */}
              <View
                style={[
                  styles.mealCard,
                  {
                    backgroundColor: c.surface,
                    borderRadius: r.lg,
                    borderWidth: 1,
                    borderColor: c.border,
                    marginLeft: s.lg,
                  },
                ]}
              >
                {/* Header */}
                <Pressable
                  style={[
                    styles.mealHeader,
                    isExpanded && { borderBottomWidth: 1, borderBottomColor: c.border },
                  ]}
                  onPress={() => toggleMeal(meal.name)}
                >
                  <View style={styles.mealInfo}>
                    <View style={styles.mealTitleRow}>
                      <Text
                        style={[
                          styles.mealName,
                          {
                            color: c.text,
                            fontFamily: ty.heading.familySemibold,
                            fontSize: ty.sizes.lg,
                          },
                        ]}
                      >
                        {meal.name}
                      </Text>
                      <View
                        style={[
                          styles.timeBadge,
                          {
                            backgroundColor: 'transparent',
                            borderWidth: 1,
                            borderColor: mealColor,
                            borderRadius: r.pill,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.timeText,
                            {
                              color: mealColor,
                              fontFamily: ty.body.familySemibold,
                              fontSize: 10,
                            },
                          ]}
                        >
                          {meal.time}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.mealCalories,
                        {
                          color: c.textMuted,
                          fontFamily: ty.body.family,
                          fontSize: ty.sizes.xs,
                          marginTop: 2,
                        },
                      ]}
                    >
                      {meal.calories} {meal.isGoalMet ? 'kcal' : `/ ${meal.goalCalories} kcal`}
                      {meal.isGoalMet && (
                        <Text style={{ color: c.success }}> • Goal Met</Text>
                      )}
                    </Text>
                  </View>
                  <TabBarIcon
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    color={c.textMuted}
                    size={20}
                  />
                </Pressable>

                {/* Expanded content */}
                {isExpanded && (
                  <View style={[styles.expandedContent, { backgroundColor: c.bg }]}>
                    {meal.items.map((item, itemIndex) => (
                      <View
                        key={item.name}
                        style={[
                          styles.foodItem,
                          itemIndex < meal.items.length - 1 && {
                            borderBottomWidth: 1,
                            borderBottomColor: `${c.border}50`,
                          },
                        ]}
                      >
                        <View style={styles.foodInfo}>
                          <Text
                            style={[
                              styles.foodName,
                              {
                                color: c.text,
                                fontFamily: ty.body.familyMedium,
                                fontSize: ty.sizes.sm,
                              },
                            ]}
                          >
                            {item.name}
                          </Text>
                          <Text
                            style={[
                              styles.foodPortion,
                              {
                                color: c.textSubtle,
                                fontFamily: ty.body.family,
                                fontSize: ty.sizes.xs,
                              },
                            ]}
                          >
                            {item.portion}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.foodCalories,
                            {
                              color: c.text,
                              fontFamily: ty.body.familySemibold,
                              fontSize: ty.sizes.sm,
                            },
                          ]}
                        >
                          {item.calories}
                        </Text>
                      </View>
                    ))}

                    {/* Ring add food button */}
                    <Pressable
                      style={({ pressed }) => [
                        styles.addFoodButton,
                        {
                          borderWidth: 2,
                          borderColor: pressed ? c.primary : `${c.primary}40`,
                          borderRadius: r.pill,
                          backgroundColor: pressed ? `${c.primary}15` : 'transparent',
                        },
                      ]}
                      onPress={() => onAddFood?.(meal.name)}
                    >
                      <Text
                        style={[
                          styles.addFoodIcon,
                          { color: c.primary, fontSize: 16 },
                        ]}
                      >
                        +
                      </Text>
                      <Text
                        style={[
                          styles.addFoodText,
                          {
                            color: c.primary,
                            fontFamily: ty.body.familySemibold,
                            fontSize: ty.sizes.xs,
                            letterSpacing: 1,
                          },
                        ]}
                      >
                        ADD FOOD
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 0,
    top: 24,
    bottom: 24,
    width: 2,
  },
  mealsContainer: {
    gap: 24,
  },
  mealWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    position: 'absolute',
    left: 0,
    top: 20,
    zIndex: 1,
  },
  mealCard: {
    flex: 1,
    overflow: 'hidden',
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
  },
  mealInfo: {
    flex: 1,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealName: {},
  timeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  timeText: {},
  mealCalories: {},
  expandedContent: {},
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  foodInfo: {},
  foodName: {},
  foodPortion: {
    marginTop: 2,
  },
  foodCalories: {},
  addFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  addFoodIcon: {},
  addFoodText: {},
});
