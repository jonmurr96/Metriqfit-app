import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MacroStatCard } from '../../nutrition/MacroStatCard';

interface MacroGridProps {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export function MacroGrid({ protein, carbs, fat, calories }: MacroGridProps) {
  return (
    <View style={styles.grid}>
      <View style={styles.cell}>
        <MacroStatCard macro="protein" label="Protein" primaryValue={`${protein}g`} compact />
      </View>
      <View style={styles.cell}>
        <MacroStatCard macro="carbs" label="Carbs" primaryValue={`${carbs}g`} compact />
      </View>
      <View style={styles.cell}>
        <MacroStatCard macro="fat" label="Fat" primaryValue={`${fat}g`} compact />
      </View>
      <View style={styles.cell}>
        <MacroStatCard macro="calories" label="Calories" primaryValue={`${calories} kcal`} compact />
      </View>
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
  },
});
