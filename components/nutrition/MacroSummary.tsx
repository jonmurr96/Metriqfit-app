/**
 * MacroSummary Component
 * 
 * Displays macro totals in a compact format:
 * "520 cal · 46P · 65C · 8F"
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MacroSummaryProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  compact?: boolean;
}

export function MacroSummary({ 
  calories, 
  protein, 
  carbs, 
  fat, 
  compact = false 
}: MacroSummaryProps) {
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactText}>
          {Math.round(calories)} cal
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.caloriesText}>{Math.round(calories)} cal</Text>
      <Text style={styles.separator}>·</Text>
      <Text style={styles.macroText}>
        <Text style={styles.proteinText}>{Math.round(protein)}</Text>P
      </Text>
      <Text style={styles.separator}>·</Text>
      <Text style={styles.macroText}>
        <Text style={styles.carbsText}>{Math.round(carbs)}</Text>C
      </Text>
      <Text style={styles.separator}>·</Text>
      <Text style={styles.macroText}>
        <Text style={styles.fatText}>{Math.round(fat)}</Text>F
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
  },
  caloriesText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  separator: {
    fontSize: 13,
    color: '#C7C7CC',
  },
  macroText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
  },
  proteinText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  carbsText: {
    color: '#FF9500',
    fontWeight: '600',
  },
  fatText: {
    color: '#5856D6',
    fontWeight: '600',
  },
});
