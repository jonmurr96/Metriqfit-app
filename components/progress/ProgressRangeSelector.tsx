import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { useTokens } from '../../lib/theme';
import type { ProgressRangeOption } from '../../services/progressMetricsService';

export interface ProgressRangeSelectorProps {
  options: ProgressRangeOption[];
  selected: ProgressRangeOption;
  onChange: (next: ProgressRangeOption) => void;
}

export function ProgressRangeSelector({
  options,
  selected,
  onChange,
}: ProgressRangeSelectorProps) {
  const { c, s, ty, r } = useTokens();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, { gap: s.sm }]}
    >
      {options.map((option) => {
        const isSelected = option === selected;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Progress range ${option}`}
            accessibilityHint={`Show progress data for the ${option} window`}
            accessibilityState={{ selected: isSelected }}
            testID={`progress-range-${option.toLowerCase()}`}
            style={[
              styles.pill,
              {
                borderRadius: r.pill,
                borderColor: isSelected ? c.primary : c.border,
                backgroundColor: isSelected ? `${c.primary}14` : c.surface,
              },
            ]}
          >
            <Text
              style={{
                color: isSelected ? c.primary : c.textMuted,
                fontFamily: isSelected ? ty.body.familySemibold : ty.body.family,
                fontSize: ty.sizes.xs,
              }}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 2,
  },
  pill: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
