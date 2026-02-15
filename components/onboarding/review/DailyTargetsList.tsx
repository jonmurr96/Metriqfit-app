import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';

interface DailyTargetsListProps {
  water_ml: number;
  steps: number | null;
  tdee: number | null;
}

export function DailyTargetsList({ water_ml, steps, tdee }: DailyTargetsListProps) {
  const { c, ty } = useTokens();

  const rows = [
    { icon: 'water-outline', label: 'Daily Water Intake', value: `${(water_ml / 1000).toFixed(1)}L`, color: c.primary },
    { icon: 'walk-outline', label: 'Daily Steps', value: steps ? steps.toLocaleString() : 'Not set', color: c.warning },
    { icon: 'flash-outline', label: 'Maintenance TDEE', value: tdee ? tdee.toLocaleString() : 'Calculated in plan', color: c.accent },
  ];

  return (
    <View style={styles.list}>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <View style={styles.left}>
            <TabBarIcon name={row.icon as any} color={row.color} size={20} />
            <Text style={[styles.label, { color: c.text, fontFamily: ty.body.familyMedium }]}>{row.label}</Text>
          </View>
          <Text style={[styles.value, { color: c.text, fontFamily: ty.heading.familySemibold }]}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  label: {
    fontSize: 16,
  },
  value: {
    fontSize: 18,
  },
});
