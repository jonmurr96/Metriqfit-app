import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../navigation/TabBarIcon';

export interface HomeMealPreviewItem {
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  label: string;
  plannedName: string;
  targetCalories: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  loggedCalories: number;
  loggedItemCount: number;
  isLogged: boolean;
  planMealId?: string;
  scheduledTimeLabel?: string;
  timingLabel?: string;
  timingStatus?: 'logged' | 'flexible' | 'due_now' | 'up_next' | 'later_today' | 'missed';
  recoveryHint?: string | null;
}

interface HomeMealPreviewCardProps {
  meals: HomeMealPreviewItem[];
  activeIndex: number;
  completedCount: number;
  isDayComplete: boolean;
  loading?: boolean;
  emptyLabel?: string;
  onPrevious: () => void;
  onNext: () => void;
  onOpenMealDetail: () => void;
  onOpenPlan: () => void;
  delay?: number;
}

export function HomeMealPreviewCard({
  meals,
  activeIndex,
  completedCount,
  isDayComplete,
  loading = false,
  emptyLabel = 'No meal plan found for today.',
  onPrevious,
  onNext,
  onOpenMealDetail,
  onOpenPlan,
  delay = 0,
}: HomeMealPreviewCardProps) {
  const { c, s, ty, r } = useTokens();
  const safeIndex = meals.length ? Math.max(0, Math.min(activeIndex, meals.length - 1)) : 0;
  const activeMeal = meals[safeIndex];

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
        <Text
          style={{
            color: c.text,
            fontFamily: ty.heading.familySemibold,
            fontSize: ty.sizes.md,
          }}
        >
          Today&apos;s Meal Plan
        </Text>
        <View style={[styles.badge, { borderColor: `${c.primary}50`, borderRadius: r.pill }]}> 
          <TabBarIcon name="restaurant-outline" color={c.primary} size={13} />
          <Text
            style={{
              color: c.primary,
              fontFamily: ty.body.familySemibold,
              fontSize: 11,
              marginLeft: 4,
            }}
          >
            Preview
          </Text>
        </View>
      </View>

      {loading ? (
        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.body.family,
            fontSize: ty.sizes.sm,
            marginTop: s.sm,
          }}
        >
          Loading meal plan...
        </Text>
      ) : meals.length === 0 ? (
        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.body.family,
            fontSize: ty.sizes.sm,
            marginTop: s.sm,
          }}
        >
          {emptyLabel}
        </Text>
      ) : isDayComplete ? (
        <View
          style={[
            styles.featureCard,
            {
              marginTop: s.md,
              backgroundColor: c.bg,
              borderRadius: r.lg,
              borderWidth: 1,
              borderColor: `${c.success}35`,
              padding: s.md,
            },
          ]}
        >
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusIcon,
                {
                  borderRadius: r.pill,
                  backgroundColor: `${c.success}18`,
                },
              ]}
            >
              <TabBarIcon name="checkmark-circle" color={c.success} size={18} />
            </View>
            <Text
              style={{
                color: c.success,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.xs,
                letterSpacing: 1.1,
              }}
            >
              DONE FOR TODAY
            </Text>
          </View>
          <Text
            style={{
              color: c.text,
              fontFamily: ty.heading.familySemibold,
              fontSize: ty.sizes.lg,
              marginTop: s.md,
            }}
          >
            Every planned meal is logged.
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.sm,
              marginTop: s.sm,
              lineHeight: 20,
            }}
          >
            {completedCount}/{Math.max(completedCount, meals.length)} meals logged today.
          </Text>

          <Pressable
            onPress={onOpenPlan}
            style={[
              styles.planButton,
              {
                marginTop: s.lg,
                borderRadius: r.pill,
                borderColor: `${c.success}30`,
                backgroundColor: `${c.success}10`,
              },
            ]}
          >
            <Text
              style={{
                color: c.success,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.sm,
              }}
            >
              View Plan
            </Text>
            <TabBarIcon name="arrow-forward" color={c.success} size={15} />
          </Pressable>
        </View>
      ) : (
        <>
          <MotiView
            key={`${activeMeal.slot}-${safeIndex}-${activeMeal.isLogged ? 'logged' : 'pending'}`}
            from={{ opacity: 0, translateX: 18 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'timing', duration: 260 }}
            style={[
              styles.featureCard,
              {
                marginTop: s.md,
                backgroundColor: c.bg,
                borderRadius: r.lg,
                borderWidth: 1,
                borderColor: activeMeal.isLogged ? `${c.success}35` : c.border,
                padding: s.md,
              },
            ]}
          >
            <View style={styles.mealMetaRow}>
              <View
                style={[
                  styles.slotPill,
                  {
                    borderRadius: r.pill,
                    borderColor: activeMeal.isLogged ? `${c.success}35` : `${c.primary}35`,
                    backgroundColor: activeMeal.isLogged ? `${c.success}10` : `${c.primary}10`,
                  },
                ]}
              >
                <Text
                  style={{
                    color: activeMeal.isLogged ? c.success : c.primary,
                    fontFamily: ty.body.familySemibold,
                    fontSize: 11,
                    letterSpacing: 0.9,
                  }}
                >
                  {activeMeal.label.toUpperCase()}
                </Text>
              </View>

              <Text
                style={{
                  color: activeMeal.isLogged ? c.success : c.textMuted,
                  fontFamily: ty.body.familySemibold,
                  fontSize: 11,
                }}
              >
                {activeMeal.timingLabel || (activeMeal.isLogged ? 'Logged' : 'Not logged yet')}
              </Text>
            </View>

            <Text
              style={{
                color: c.text,
                fontFamily: ty.heading.familySemibold,
                fontSize: ty.sizes.lg,
                marginTop: s.md,
              }}
            >
              {activeMeal.plannedName}
            </Text>

            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.sm,
                marginTop: s.sm,
              }}
            >
              Target {Math.round(activeMeal.targetCalories)} kcal
              {activeMeal.targetProtein ? ` · ${Math.round(activeMeal.targetProtein)}g protein` : ''}
              {activeMeal.scheduledTimeLabel && activeMeal.timingStatus !== 'flexible'
                ? ` · ${activeMeal.scheduledTimeLabel}`
                : ''}
            </Text>

            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.sm,
                marginTop: s.sm,
                lineHeight: 20,
              }}
            >
              {activeMeal.isLogged
                ? `${Math.round(activeMeal.loggedCalories)} kcal across ${activeMeal.loggedItemCount} item${activeMeal.loggedItemCount === 1 ? '' : 's'}`
                : activeMeal.recoveryHint || 'Not logged yet'}
            </Text>
          </MotiView>

          <View style={[styles.progressRow, { marginTop: s.md }]}>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.familySemibold,
                fontSize: 11,
                letterSpacing: 0.8,
              }}
            >
              {safeIndex + 1} of {meals.length}
            </Text>
            <View style={styles.dotsRow}>
              {meals.map((meal, index) => (
                <View
                  key={`${meal.slot}-${index}`}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        index === safeIndex ? c.primary : meal.isLogged ? `${c.success}90` : `${c.border}`,
                    },
                  ]}
                />
              ))}
            </View>
          </View>

          <View style={[styles.actionsRow, { marginTop: s.md, gap: s.sm }]}>
            <Pressable
              onPress={onPrevious}
              disabled={safeIndex === 0}
              style={[
                styles.navButton,
                {
                  borderRadius: r.pill,
                  borderColor: c.border,
                  opacity: safeIndex === 0 ? 0.35 : 1,
                },
              ]}
            >
              <TabBarIcon name="chevron-back" color={c.text} size={18} />
            </Pressable>

            <Pressable
              onPress={onOpenMealDetail}
              style={[
                styles.centerAction,
                {
                  borderRadius: r.pill,
                  backgroundColor: c.primary,
                },
              ]}
            >
              <TabBarIcon name="add" color={c.bg} size={18} />
            </Pressable>

            <Pressable
              onPress={onNext}
              disabled={safeIndex >= meals.length - 1}
              style={[
                styles.navButton,
                {
                  borderRadius: r.pill,
                  borderColor: c.border,
                  opacity: safeIndex >= meals.length - 1 ? 0.35 : 1,
                },
              ]}
            >
              <TabBarIcon name="chevron-forward" color={c.text} size={18} />
            </Pressable>
          </View>
        </>
      )}
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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  featureCard: {
    minHeight: 164,
  },
  mealMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotPill: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  centerAction: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
