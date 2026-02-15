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
  logged: boolean;
}

interface HomeMealPreviewCardProps {
  meals: HomeMealPreviewItem[];
  loading?: boolean;
  emptyLabel?: string;
  onLogFood: () => void;
  onOpenPlan: () => void;
  delay?: number;
}

export function HomeMealPreviewCard({
  meals,
  loading = false,
  emptyLabel = 'No meal plan found for today.',
  onLogFood,
  onOpenPlan,
  delay = 0,
}: HomeMealPreviewCardProps) {
  const { c, s, ty, r } = useTokens();

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
      ) : (
        <View style={{ gap: s.sm, marginTop: s.sm }}>
          {meals.map((meal) => (
            <View
              key={`${meal.slot}-${meal.plannedName}`}
              style={[
                styles.mealRow,
                {
                  backgroundColor: c.bg,
                  borderRadius: r.md,
                  borderWidth: 1,
                  borderColor: c.border,
                  paddingHorizontal: s.sm,
                  paddingVertical: s.sm,
                },
              ]}
            >
              <View style={styles.leftSection}>
                <Text
                  style={{
                    color: c.text,
                    fontFamily: ty.body.familySemibold,
                    fontSize: ty.sizes.sm,
                  }}
                >
                  {meal.label}
                </Text>
                <Text
                  style={{
                    color: c.textMuted,
                    fontFamily: ty.body.family,
                    fontSize: ty.sizes.xs,
                  }}
                  numberOfLines={1}
                >
                  {meal.plannedName}
                </Text>
              </View>

              <View style={styles.rightSection}>
                <Text
                  style={{
                    color: c.text,
                    fontFamily: ty.mono.family,
                    fontSize: ty.sizes.xs,
                  }}
                >
                  {Math.round(meal.targetCalories)} kcal
                </Text>
                <Text
                  style={{
                    color: meal.logged ? c.success : c.textMuted,
                    fontFamily: ty.body.familySemibold,
                    fontSize: 11,
                  }}
                >
                  {meal.logged ? 'Logged' : 'Pending'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={[styles.actionsRow, { marginTop: s.md, gap: s.sm }]}> 
        <Pressable
          onPress={onLogFood}
          style={[styles.actionBtn, { borderColor: `${c.primary}60`, borderRadius: r.pill }]}
        >
          <TabBarIcon name="add" color={c.primary} size={14} />
          <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: 12, marginLeft: 4 }}>
            Log Food
          </Text>
        </Pressable>

        <Pressable
          onPress={onOpenPlan}
          style={[styles.actionBtn, { borderColor: `${c.textMuted}50`, borderRadius: r.pill }]}
        >
          <TabBarIcon name="calendar-outline" color={c.textMuted} size={14} />
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: 12, marginLeft: 4 }}>
            My Plan
          </Text>
        </Pressable>
      </View>
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
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flex: 1,
    marginRight: 12,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
});
