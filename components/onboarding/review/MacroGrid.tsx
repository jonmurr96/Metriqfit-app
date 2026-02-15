import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTokens } from '../../../lib/theme';

interface MacroGridProps {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export function MacroGrid({ protein, carbs, fat, calories }: MacroGridProps) {
  const { c, ty, r } = useTokens();

  const cards = [
    { label: 'Protein', value: `${protein} g`, color: c.macros.protein },
    { label: 'Carbs', value: `${carbs} g`, color: c.macros.carbs },
    { label: 'Fats', value: `${fat} g`, color: c.macros.fat },
    { label: 'Calories', value: `${calories} kcal`, color: c.success },
  ];

  return (
    <View style={styles.grid}>
      {cards.map((item) => (
        <View key={item.label} style={[styles.cell, { backgroundColor: c.bg, borderColor: c.border, borderRadius: r.md }]}>
          <View style={styles.labelRow}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text style={[styles.label, { color: c.textMuted, fontFamily: ty.body.familySemibold }]}>{item.label}</Text>
          </View>
          <Text style={[styles.value, { color: c.text, fontFamily: ty.heading.familySemibold }]}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cell: {
    width: '48%',
    borderWidth: 1,
    padding: 12,
    minHeight: 76,
    justifyContent: 'space-between',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  value: {
    fontSize: 22,
  },
});
