import React from 'react';
import { ActivityIndicator, type DimensionValue, Pressable, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import type { HomeMealPreviewCardMeal } from '../../lib/nutrition/home-meal-preview';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../navigation/TabBarIcon';
import { GlassCard } from '../premium/GlassCard';
import { MacroRow } from '../nutrition/MacroRow';

interface HomeMealPreviewCardProps {
  meals: readonly HomeMealPreviewCardMeal[];
  activeIndex: number;
  completedCount: number;
  isDayComplete: boolean;
  loading?: boolean;
  pendingPlanMealId?: string | null;
  recentlyLoggedPlanMealId?: string | null;
  onNext: () => void;
  onPrevious: () => void;
  onOpenMealDetail: () => void;
  onOpenPlan: () => void;
  onQuickLog: (planMealId: string) => void;
  delay?: number;
}

function getLoggedSummary(itemCount: number) {
  return itemCount === 1 ? '1 item logged' : `${itemCount} items logged`;
}

function SkeletonBar({
  width,
  delay = 0,
  height = 12,
}: {
  width: DimensionValue;
  delay?: number;
  height?: number;
}) {
  return (
    <MotiView
      from={{ opacity: 0.28 }}
      animate={{ opacity: 0.85 }}
      transition={{
        type: 'timing',
        duration: 900,
        delay,
        loop: true,
        repeatReverse: true,
      }}
      style={[styles.skeletonBar, { width, height }]}
    />
  );
}

export function HomeMealPreviewCard({
  meals,
  activeIndex,
  completedCount,
  isDayComplete,
  loading = false,
  pendingPlanMealId = null,
  recentlyLoggedPlanMealId = null,
  onNext,
  onPrevious,
  onOpenMealDetail,
  onOpenPlan,
  onQuickLog,
  delay = 0,
}: HomeMealPreviewCardProps) {
  const { c, s, ty, r } = useTokens();

  const activeMeal = meals[activeIndex] ?? null;
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < meals.length - 1;

  const renderStatusChip = () => {
    if (!activeMeal && !isDayComplete) return null;

    const tone = isDayComplete
      ? {
          label: 'Done',
          icon: 'checkmark-circle' as const,
          color: c.success,
          borderColor: `${c.success}38`,
          backgroundColor: `${c.success}12`,
        }
      : activeMeal?.isLogged
        ? {
            label: 'Logged',
            icon: 'checkmark-circle' as const,
            color: c.success,
            borderColor: `${c.success}38`,
            backgroundColor: `${c.success}12`,
          }
        : {
            label: 'Pending',
            icon: 'time-outline' as const,
            color: c.primary,
            borderColor: `${c.primary}40`,
            backgroundColor: `${c.primary}12`,
          };

    return (
      <View
        style={[
          styles.statusChip,
          {
            borderRadius: r.pill,
            borderColor: tone.borderColor,
            backgroundColor: tone.backgroundColor,
          },
        ]}
      >
        <TabBarIcon name={tone.icon} color={tone.color} size={13} />
        <Text
          style={{
            color: tone.color,
            fontFamily: ty.body.familySemibold,
            fontSize: 11,
            marginLeft: 5,
          }}
        >
          {tone.label}
        </Text>
      </View>
    );
  };

  const renderLoadingState = () => (
    <View
      style={[
        styles.contentShell,
        {
          borderRadius: r.md,
          borderColor: `${c.borderStrong}`,
          backgroundColor: `${c.bg}CC`,
          marginTop: s.md,
          padding: s.md,
        },
      ]}
    >
      <View style={styles.loadingRow}>
        <View style={styles.loadingCopy}>
          <SkeletonBar width="58%" />
          <SkeletonBar width="34%" delay={120} />
        </View>
        <View
          style={[
            styles.loadingAction,
            {
              borderRadius: 28,
              borderColor: `${c.primary}30`,
              backgroundColor: `${c.primary}08`,
            },
          ]}
        >
          <SkeletonBar width={26} height={26} delay={180} />
        </View>
      </View>

      <View style={{ marginTop: s.md }}>
        <SkeletonBar width="92%" delay={160} />
        <SkeletonBar width="68%" delay={240} />
        <View style={[styles.macroSkeletonRow, { marginTop: s.md }]}>
          <SkeletonBar width={72} height={30} delay={320} />
          <SkeletonBar width={72} height={30} delay={420} />
          <SkeletonBar width={72} height={30} delay={520} />
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View
      style={[
        styles.contentShell,
        {
          borderRadius: r.md,
          borderColor: `${c.borderStrong}`,
          backgroundColor: `${c.bg}CC`,
          marginTop: s.md,
          padding: s.md,
        },
      ]}
    >
      <View
        style={[
          styles.emptyIcon,
          {
            borderRadius: 20,
            backgroundColor: `${c.primary}12`,
            borderColor: `${c.primary}24`,
          },
        ]}
      >
        <TabBarIcon name="restaurant-outline" color={c.primary} size={18} />
      </View>

      <Text
        style={{
          color: c.text,
          fontFamily: ty.body.familySemibold,
          fontSize: ty.sizes.md,
          marginTop: s.md,
        }}
      >
        No meal plan found for today.
      </Text>

      <Text
        style={{
          color: c.textMuted,
          fontFamily: ty.body.family,
          fontSize: 12,
          marginTop: 6,
          lineHeight: 18,
        }}
      >
        Open your plan to set today&apos;s meals and bring the next move back into view.
      </Text>
    </View>
  );

  const renderCompleteState = () => (
    <View
      style={[
        styles.contentShell,
        {
          borderRadius: r.md,
          borderColor: `${c.success}32`,
          backgroundColor: `${c.success}12`,
          marginTop: s.md,
          padding: s.md,
        },
      ]}
    >
      <View style={styles.completeRow}>
        <View style={styles.completeCopy}>
          <Text
            style={{
              color: c.text,
              fontFamily: ty.heading.familySemibold,
              fontSize: ty.sizes.lg,
            }}
          >
            All planned meals logged
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: 12,
              marginTop: 8,
              lineHeight: 18,
            }}
          >
            Today&apos;s nutrition plan is checked off. Review the plan or move on to recovery.
          </Text>
        </View>

        <View
          style={[
            styles.completeBadge,
            {
              borderRadius: 28,
              borderColor: `${c.success}34`,
              backgroundColor: `${c.success}15`,
            },
          ]}
        >
          <TabBarIcon name="checkmark-done" color={c.success} size={24} />
        </View>
      </View>

      <View
        style={[
          styles.completeMetrics,
          {
            borderRadius: r.md,
            borderColor: `${c.success}24`,
            backgroundColor: `${c.bg}88`,
            marginTop: s.md,
            padding: s.sm,
          },
        ]}
      >
        <Text
          style={{
            color: c.success,
            fontFamily: ty.body.familySemibold,
            fontSize: 12,
          }}
        >
          {completedCount} of {meals.length} meals complete
        </Text>
      </View>
    </View>
  );

  const renderMealState = () => {
    if (!activeMeal) return null;

    const isPendingAction = !!activeMeal.planMealId && pendingPlanMealId === activeMeal.planMealId;
    const isSuccessAction =
      !!activeMeal.planMealId && recentlyLoggedPlanMealId === activeMeal.planMealId;
    const isQuickLogAvailable =
      !activeMeal.isLogged && !!activeMeal.planMealId && !!activeMeal.canDirectLog;
    const isActionDisabled = isDayComplete || isPendingAction || isSuccessAction;

    const actionTone = isSuccessAction || activeMeal.isLogged
      ? {
          borderColor: `${c.success}42`,
          backgroundColor: `${c.success}12`,
          color: c.success,
          label: isSuccessAction ? 'LOGGED' : 'REVIEW',
        }
      : isQuickLogAvailable
        ? {
            borderColor: c.primary,
            backgroundColor: `${c.primary}12`,
            color: c.primary,
            label: 'LOG',
          }
        : {
            borderColor: `${c.textMuted}50`,
            backgroundColor: `${c.textMuted}10`,
            color: c.textMuted,
            label: 'OPEN',
          };

    const supportingCopy = activeMeal.isLogged
      ? `${activeMeal.loggedCalories} kcal • ${getLoggedSummary(activeMeal.loggedItemCount)}`
      : activeMeal.mealSummary?.trim() || 'Meal items ready to log.';

    return (
      <Pressable
        onPress={onOpenMealDetail}
        style={({ pressed }) => [
          styles.contentShell,
          {
            borderRadius: r.md,
            borderColor: activeMeal.isLogged ? `${c.success}28` : `${c.primary}38`,
            backgroundColor: pressed ? `${c.primary}12` : `${c.bg}D9`,
            marginTop: s.md,
            padding: s.md,
          },
        ]}
      >
        <View style={styles.mealRow}>
          <View style={styles.mealCopy}>
            <Text
              style={{
                color: c.text,
                fontFamily: ty.heading.familySemibold,
                fontSize: ty.sizes.lg,
              }}
              numberOfLines={2}
            >
              {activeMeal.plannedName}
            </Text>

            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.familyMedium,
                fontSize: 12,
                marginTop: 6,
              }}
            >
              {Math.round(activeMeal.targetCalories)} kcal target
            </Text>

            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: 12,
                marginTop: 12,
                lineHeight: 18,
              }}
            >
              {supportingCopy}
            </Text>
          </View>

          <View style={styles.heroActionWrap}>
            <Pressable
              hitSlop={8}
              onPress={(event) => {
                event.stopPropagation();
                if (isActionDisabled) return;

                if (isQuickLogAvailable && activeMeal.planMealId) {
                  onQuickLog(activeMeal.planMealId);
                  return;
                }

                onOpenMealDetail();
              }}
              style={({ pressed }) => [
                styles.heroActionButton,
                {
                  borderColor: actionTone.borderColor,
                  backgroundColor: pressed && !isActionDisabled
                    ? `${actionTone.color}20`
                    : actionTone.backgroundColor,
                  opacity: isActionDisabled && !isPendingAction && !isSuccessAction ? 0.72 : 1,
                },
              ]}
            >
              {isPendingAction ? (
                <ActivityIndicator size="small" color={actionTone.color} />
              ) : isSuccessAction ? (
                <MotiView
                  from={{ opacity: 0, scale: 0.82 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    type: 'spring',
                    damping: 12,
                    stiffness: 240,
                  }}
                >
                  <TabBarIcon name="checkmark" color={actionTone.color} size={24} />
                </MotiView>
              ) : (
                <TabBarIcon
                  name={activeMeal.isLogged ? 'create-outline' : isQuickLogAvailable ? 'add' : 'arrow-forward'}
                  color={actionTone.color}
                  size={24}
                />
              )}
            </Pressable>
            <Text
              style={{
                color: actionTone.color,
                fontFamily: ty.body.familySemibold,
                fontSize: 10,
                letterSpacing: 1.1,
                marginTop: 8,
                textAlign: 'center',
                width: '100%',
              }}
            >
              {isPendingAction ? 'LOG' : actionTone.label}
            </Text>
          </View>
        </View>

        <MacroRow
          style={{ marginTop: s.md }}
          size="sm"
          emphasis="outlined"
          items={[
            { macro: 'protein', value: Math.round(Number(activeMeal.targetProtein ?? 0)), unit: 'g' },
            { macro: 'carbs', value: Math.round(Number(activeMeal.targetCarbs ?? 0)), unit: 'g' },
            { macro: 'fat', value: Math.round(Number(activeMeal.targetFat ?? 0)), unit: 'g' },
          ]}
        />
      </Pressable>
    );
  };

  const renderFooter = () => {
    if (!meals.length) return null;

    return (
      <View
        style={[
          styles.footerRail,
          {
            borderRadius: r.md,
            borderColor: `${c.borderStrong}`,
            backgroundColor: `${c.bg}B8`,
            marginTop: s.md,
            paddingHorizontal: s.sm,
            paddingTop: s.sm,
            paddingBottom: s.sm,
          },
        ]}
      >
        <View style={styles.footerTopRow}>
          <Pressable
            onPress={onPrevious}
            disabled={!hasPrev || isDayComplete}
            style={({ pressed }) => [
              styles.navButton,
              {
                borderRadius: r.pill,
                borderColor: hasPrev && !isDayComplete ? `${c.primary}45` : `${c.borderStrong}`,
                backgroundColor:
                  pressed && hasPrev && !isDayComplete ? `${c.primary}12` : 'transparent',
                opacity: hasPrev && !isDayComplete ? 1 : 0.42,
              },
            ]}
          >
            <TabBarIcon
              name="chevron-back"
              color={hasPrev && !isDayComplete ? c.primary : c.textMuted}
              size={18}
            />
          </Pressable>

          <View style={styles.footerCenter}>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.familyMedium,
                fontSize: 11,
                letterSpacing: 0.6,
              }}
            >
              {isDayComplete
                ? 'DAY COMPLETE'
                : `${Math.min(activeIndex + 1, meals.length)} OF ${meals.length}`}
            </Text>
          </View>

          <Pressable
            onPress={onNext}
            disabled={!hasNext || isDayComplete}
            style={({ pressed }) => [
              styles.navButton,
              {
                borderRadius: r.pill,
                borderColor: hasNext && !isDayComplete ? `${c.primary}45` : `${c.borderStrong}`,
                backgroundColor:
                  pressed && hasNext && !isDayComplete ? `${c.primary}12` : 'transparent',
                opacity: hasNext && !isDayComplete ? 1 : 0.42,
              },
            ]}
          >
            <TabBarIcon
              name="chevron-forward"
              color={hasNext && !isDayComplete ? c.primary : c.textMuted}
              size={18}
            />
          </Pressable>
        </View>

        <View style={[styles.progressRow, { marginTop: s.sm }]}>
          {meals.map((meal, index) => {
            const isActive = index === activeIndex && !isDayComplete;
            return (
              <View
                key={`${meal.slot}-${meal.planMealId}-${index}`}
                style={{
                  flex: isActive ? 1.7 : 1,
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: meal.isLogged
                    ? c.success
                    : isActive
                      ? c.primary
                      : `${c.textMuted}28`,
                }}
              />
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <GlassCard
      intensity="light"
      glowEffect={!isDayComplete && !!activeMeal && !activeMeal.isLogged}
      animated
      delay={delay}
      style={styles.container}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
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

          <View style={[styles.headerTitleRow, { marginTop: 6 }]}>
            <Text
              style={{
                color: c.text,
                fontFamily: ty.heading.familySemibold,
                fontSize: ty.sizes.md,
              }}
            >
              {isDayComplete ? 'Day complete' : activeMeal?.label ?? 'Meals'}
            </Text>
            {renderStatusChip()}
          </View>
        </View>

        <Pressable
          onPress={onOpenPlan}
          style={({ pressed }) => [
            styles.planButton,
            {
              borderRadius: r.pill,
              borderColor: `${c.textMuted}44`,
              backgroundColor: pressed ? `${c.textMuted}14` : 'transparent',
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

      {loading
        ? renderLoadingState()
        : !meals.length
          ? renderEmptyState()
          : isDayComplete
            ? renderCompleteState()
            : renderMealState()}

      {renderFooter()}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    marginRight: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  contentShell: {
    borderWidth: 1,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mealCopy: {
    flex: 1,
    marginRight: 12,
  },
  heroActionWrap: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: 68,
  },
  heroActionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  footerRail: {
    borderWidth: 1,
  },
  footerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingCopy: {
    flex: 1,
    gap: 10,
    marginRight: 12,
  },
  loadingAction: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  macroSkeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  skeletonBar: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  emptyIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  completeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  completeCopy: {
    flex: 1,
    marginRight: 12,
  },
  completeBadge: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  completeMetrics: {
    borderWidth: 1,
  },
});
