import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { metriqfitTheme } from '../../../lib/theme';

const { colors: c, spacing: s, radius: r } = metriqfitTheme;

interface Option {
  value: string;
  label: string;
}

interface PremiumChipSelectProps {
  label: string;
  options: Option[];
  selected: string[];
  onSelect: (values: string[]) => void;
  multiple?: boolean;
  noneOption?: string;
  columns?: number;
}

export function PremiumChipSelect({
  label,
  options,
  selected,
  onSelect,
  multiple = true,
  noneOption,
  columns = 4,
}: PremiumChipSelectProps) {
  const handlePress = (value: string) => {
    if (!multiple) {
      onSelect([value]);
      return;
    }

    if (noneOption && value === noneOption) {
      onSelect([noneOption]);
      return;
    }

    let newSelected: string[];
    if (selected.includes(value)) {
      newSelected = selected.filter((v) => v !== value);
    } else {
      newSelected = selected.filter((v) => v !== noneOption);
      newSelected.push(value);
    }
    onSelect(newSelected);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.chipsContainer, { flexWrap: 'wrap' }]}>
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <Pressable
              key={option.value}
              onPress={() => handlePress(option.value)}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
              ]}
            >
              {isSelected && (
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={c.bg}
                  style={styles.checkIcon}
                />
              )}
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: s.xl,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Sora_500Medium',
    color: c.textMuted,
    marginBottom: s.md,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: s.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: r.sm,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: s.sm,
  },
  chipSelected: {
    backgroundColor: c.primary,
    borderColor: c.primary,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  } as any,
  checkIcon: {
    marginRight: 4,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Sora_500Medium',
    color: c.text,
  },
  chipTextSelected: {
    color: c.bg,
  },
});
