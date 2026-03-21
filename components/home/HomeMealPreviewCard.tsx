import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import type { HomeMealPreviewItem } from '../../lib/nutrition/home-meal-preview';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../navigation/TabBarIcon';
import { MacroRow } from '../nutrition/MacroRow';

interface HomeMealPreviewCardProps {
  meals: HomeMealPreviewItem[];
  activeIndex: number;
  completedCount: number;
  isDayComplete: boolean;
  loading?: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onOpenMealDetail: () => void;
  onOpenPlan: () => void;
  delay?: number;
}

function getLoggedSummary(itemCount: number) {
  return itemCount === 1 ? '1 item logged' : `${itemCount} items logged`;
}

export function HomeMealPreviewCard({
  meals,
  activeIndex,
  completedCount,
  isDayComplete,
  loading = false,
  onNext,
  onPrevious,
  onOpenMealDetail,
  onOpenPlan,
  delay = 0,
}: HomeMealPreviewCardProps) {
  const { c, s, ty, r } = useTokens();

  const activeMeal = meals[activeIndex] ?? null;
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < meals.length - 1;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 18 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 450, delay }}
      style={[
        styles.container,
        {
          backgroundColor: c.surface,
          borderRadius: r.lg,
          borderWidth: 1,
          borderColor: c.border,
          padding: s.md,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.familySemibold,
              fontSize: 11,
              letterSpacing: 1.3,
            }}
          >
            NEXT MEAL
          </Text>
          <Text
            style={{
              color: c.text,
              fontFamily: ty.heading.familySemibold,
              fontSize: ty.sizes.lg,
              marginTop: 4,
            }}
          >
            {isDayComplete ? 'Day complete' : activeMeal?.label ?? 'Meals'}
          </Text>
        </View>

        <Pressable
          onPress={onOpenPlan}
          style={({ pressed }) => [
            styles.planButton,
            {
              borderRadius: r.pill,
              borderWidth: 1,
              borderColor: `${c.textMuted}40`,
              backgroundColor: pressed ? `${c.textMuted}12` : 'transparent',
            },
          ]}
        >
          <TabBarIcon name="calendar-outline" color={c.textMuted} size={14} />
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.familySemibold,
              fontSize: 12,
              marginLeft: 4,
            }}
          >
            Plan
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.body.family,
            fontSize: ty.sizes.sm,
            marginTop: s.md,
          }}
        >
          Loading meal plan...
        </Text>
      ) : !meals.length ? (
        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.body.family,
            fontSize: ty.sizes.sm,
            marginTop: s.md,
          }}
        >
          No meal plan found for today.
        </Text>
      ) : isDayComplete ? (
        <View
          style={[
            styles.stateCard,
            {
              backgroundColor: `${c.success}10`,
              borderColor: `${c.success}35`,
              borderRadius: r.md,
              marginTop: s.md,
              padding: s.md,
            },
          ]}
        >
          <View style={styles.stateHeader}>
            <TabBarIcon name="checkmark-circle" color={c.success} size={18} />
            <Text
              style={{
                color: c.success,
                fontFamily: ty.body.familySemibold,
                fontSize: 12,
                marginLeft: 6,
              }}
            >
              All planned meals logged
            </Text>
          </View>

          <Text
            style={{
              color: c.text,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.sm,
              marginTop: 10,
            }}
          >
            {completedCount} of {meals.length} meals completed
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: 12,
              marginTop: 6,
            }}
          >
            Today&apos;s meal plan is fully checked off.
          </Text>
        </View>
      ) : activeMeal ? (
        <Pressable
          onPress={onOpenMealDetail}
          style={({ pressed }) => [
            styles.stateCard,
            {
              backgroundColor: pressed ? `${c.primary}08` : c.bg,
              borderColor: c.border,
              borderRadius: r.md,
              marginTop: s.md,
              padding: s.md,
            },
          ]}
        >
          <View style={styles.mealHeader}>
            <View style={styles.mealTitleWrap}>
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.heading.familySemibold,
                  fontSize: ty.sizes.md,
                }}
              >
                {activeMeal.plannedName}
              </Text>
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                {Math.round(activeMeal.targetCalories)} kcal target
              </Text>
            </View>

            <View
              style={[
                styles.statusPill,
                {
                  borderRadius: r.pill,
                  borderWidth: 1,
                  borderColor: activeMeal.isLogged ? `${c.success}35` : `${c.primary}35`,
                  backgroundColor: activeMeal.isLogged ? `${c.success}10` : `${c.primary}10`,
                },
              ]}
            >
              <TabBarIcon
                name={activeMeal.isLogged ? 'checkmark-circle' : 'time-outline'}
                color={activeMeal.isLogged ? c.success : c.primary}
                size={14}
              />
              <Text
                style={{
                  color: activeMeal.isLogged ? c.success : c.primary,
                  fontFamily: ty.body.familySemibold,
                  fontSize: 11,
                  marginLeft: 4,
                }}
              >
                {activeMeal.isLogged ? 'Logged' : 'Pending'}
              </Text>
            </View>
          </View>

          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: 12,
              marginTop: 12,
            }}
          >
            {activeMeal.isLogged
              ? `${activeMeal.loggedCalories} kcal • ${getLoggedSummary(activeMeal.loggedItemCount)}`
              : 'Open this meal to add food quickly.'}
          </Text>

          <MacroRow
            style={{ marginTop: 12 }}
            size="sm"
            emphasis="outlined"
            items={[
              { macro: 'protein', value: Math.round(activeMeal.targetProtein), unit: 'g' },
              { macro: 'carbs', value: Math.round(activeMeal.targetCarbs), unit: 'g' },
              { macro: 'fat', value: Math.round(activeMeal.targetFat), unit: 'g' },
            ]}
          />
        </Pressable>
      ) : null}

      {!!meals.length ? (
        <>
          <View style={[styles.footerRow, { marginTop: s.md }]}>
            <Pressable
              onPress={onPrevious}
              disabled={!hasPrev || isDayComplete}
              style={({ pressed }) => [
                styles.navButton,
                {
                  borderRadius: r.pill,
                  borderWidth: 1,
                  borderColor: hasPrev && !isDayComplete ? `${c.primary}45` : c.border,
                  opacity: hasPrev && !isDayComplete ? 1 : 0.45,
                  backgroundColor: pressed && hasPrev && !isDayComplete ? `${c.primary}10` : 'transparent',
                },
              ]}
            >
              <TabBarIcon name="chevron-back" color={hasPrev && !isDayComplete ? c.primary : c.textMuted} size={18} />
            </Pressable>

            <Pressable
              onPress={onOpenMealDetail}
              disabled={isDayComplete}
              style={({ pressed }) => [
                styles.primaryAction,
                {
                  borderRadius: r.pill,
                  borderWidth: 2,
                  borderColor: isDayComplete ? c.border : c.primary,
                  backgroundColor: isDayComplete ? 'transparent' : pressed ? `${c.primary}14` : `${c.primary}10`,
                  opacity: isDayComplete ? 0.45 : 1,
                },
              ]}
            >
              <TabBarIcon name="add" color={isDayComplete ? c.textMuted : c.primary} size={24} />
            </Pressable>

            <Pressable
              onPress={onNext}
              disabled={!hasNext || isDayComplete}
              style={({ pressed }) => [
                styles.navButton,
                {
                  borderRadius: r.pill,
                  borderWidth: 1,
                  borderColor: hasNext && !isDayComplete ? `${c.primary}45` : c.border,
                  opacity: hasNext && !isDayComplete ? 1 : 0.45,
                  backgroundColor: pressed && hasNext && !isDayComplete ? `${c.primary}10` : 'transparent',
                },
              ]}
            >
              <TabBarIcon name="chevron-forward" color={hasNext && !isDayComplete ? c.primary : c.textMuted} size={18} />
            </Pressable>
          </View>

          <View style={[styles.progressRow, { marginTop: s.md }]}>
            {meals.map((meal, index) => {
              const isActive = index === activeIndex;
              return (
                <View
                  key={`${meal.slot}-${meal.planMealId}`}
                  style={{
                    flex: isActive ? 1.6 : 1,
                    height: 6,
                    borderRadius: 999,
                    backgroundColor: meal.isLogged
                      ? c.success
                      : isActive
                        ? c.primary
                        : `${c.textMuted}30`,
                    marginHorizontal: 3,
                  }}
                />
              );
            })}
          </View>
        </>
      ) : null}
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  stateCard: {
    borderWidth: 1,
  },
  stateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  mealTitleWrap: {
    flex: 1,
    marginRight: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    width: 42,
  },
  primaryAction: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 58,
    width: 58,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
