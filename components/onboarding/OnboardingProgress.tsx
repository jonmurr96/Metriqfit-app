import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { metriqfitTheme } from '../../lib/theme';

const { colors: c, spacing: s, type: ty } = metriqfitTheme;

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <View style={styles.container}>
      <View style={[styles.progressBar, { backgroundColor: c.surface }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: c.primary, width: `${progress}%` },
          ]}
        />
      </View>
      <Text style={[styles.stepText, { color: c.textMuted, fontFamily: ty.body.family }]}>
        Step {currentStep} of {totalSteps}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: s.lg,
  },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: s.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepText: {
    fontSize: 12,
  },
});
