import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../navigation/TabBarIcon';

export interface NextMealWidgetData {
  slotLabel: string;
  mealName: string;
  timeLabel: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

interface NextMealWidgetProps {
  nextMeal: NextMealWidgetData | null;
  loading?: boolean;
  onLog: () => void;
  onSwap: () => void;
  onOpenPlan: () => void;
}

export function NextMealWidget({
  nextMeal,
  loading = false,
  onLog,
  onSwap,
  onOpenPlan,
}: NextMealWidgetProps) {
  const { c, s, ty, r } = useTokens();

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 360, delay: 140 }}
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
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
          Next Meal
        </Text>
        <View style={[styles.timeBadge, { borderColor: `${c.primary}60`, borderRadius: r.pill }]}> 
          <TabBarIcon name="time-outline" color={c.primary} size={13} />
          <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: 11, marginLeft: 4 }}>
            {nextMeal?.timeLabel || 'Pending'}
          </Text>
        </View>
      </View>

      {loading ? (
        <Text style={{ color: c.textMuted, marginTop: s.sm, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
          Loading next meal...
        </Text>
      ) : !nextMeal ? (
        <Text style={{ color: c.textMuted, marginTop: s.sm, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
          No upcoming planned meal for today.
        </Text>
      ) : (
        <>
          <Text style={{ color: c.text, marginTop: s.sm, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
            {nextMeal.slotLabel}: {nextMeal.mealName}
          </Text>

          <Text style={{ color: c.textMuted, marginTop: 4, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
            {Math.round(nextMeal.targetCalories)} kcal • P {Math.round(nextMeal.targetProtein)}g • C {Math.round(nextMeal.targetCarbs)}g • F {Math.round(nextMeal.targetFat)}g
          </Text>
        </>
      )}

      <View style={[styles.actions, { marginTop: s.md, gap: s.sm }]}> 
        <Pressable onPress={onLog} style={[styles.action, { borderColor: `${c.primary}60`, borderRadius: r.pill }]}> 
          <TabBarIcon name="add-circle-outline" color={c.primary} size={14} />
          <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: 12, marginLeft: 4 }}>
            Log
          </Text>
        </Pressable>
        <Pressable onPress={onSwap} style={[styles.action, { borderColor: `${c.accent}60`, borderRadius: r.pill }]}> 
          <TabBarIcon name="swap-horizontal-outline" color={c.accent} size={14} />
          <Text style={{ color: c.accent, fontFamily: ty.body.familySemibold, fontSize: 12, marginLeft: 4 }}>
            Swap
          </Text>
        </Pressable>
        <Pressable onPress={onOpenPlan} style={[styles.action, { borderColor: `${c.textMuted}50`, borderRadius: r.pill }]}> 
          <TabBarIcon name="calendar-outline" color={c.textMuted} size={14} />
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: 12, marginLeft: 4 }}>
            Plan
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actions: {
    flexDirection: 'row',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
});
