import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView } from 'react-native';
import { metriqfitTheme } from '../../lib/theme';
import { Ionicons } from '@expo/vector-icons';

const { colors: c, radius: r, spacing: s, type: ty } = metriqfitTheme;

interface Option {
  value: string;
  label: string;
}

interface OnboardingMultiSelectProps {
  label: string;
  options: Option[];
  selected: string[];
  onSelect: (values: string[]) => void;
  noneOption?: string;
  otherOption?: string;
  otherText?: string | null;
  onOtherTextChange?: (text: string) => void;
}

export function OnboardingMultiSelect({
  label,
  options,
  selected,
  onSelect,
  noneOption,
  otherOption,
  otherText,
  onOtherTextChange,
}: OnboardingMultiSelectProps) {
  const handlePress = (value: string) => {
    if (value === noneOption) {
      onSelect([noneOption]);
      return;
    }

    let newSelected = selected.filter(s => s !== noneOption);

    if (newSelected.includes(value)) {
      newSelected = newSelected.filter(s => s !== value);
    } else {
      newSelected = [...newSelected, value];
    }

    onSelect(newSelected);
  };

  const showOtherInput = otherOption && selected.includes(otherOption);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text>
      <View style={styles.optionsGrid}>
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <Pressable
              key={option.value}
              style={[
                styles.option,
                {
                  backgroundColor: isSelected ? c.primary : c.surface,
                  borderColor: isSelected ? c.primary : c.border,
                },
              ]}
              onPress={() => handlePress(option.value)}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={16} color={c.bg} style={styles.checkIcon} />
              )}
              <Text
                style={[
                  styles.optionText,
                  { color: isSelected ? c.bg : c.text },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {showOtherInput && onOtherTextChange && (
        <TextInput
          style={[styles.otherInput, { backgroundColor: c.surface, color: c.text, borderColor: c.border }]}
          placeholder="Please specify..."
          placeholderTextColor={c.textMuted}
          value={otherText || ''}
          onChangeText={onOtherTextChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: s.lg,
  },
  label: {
    fontSize: 14,
    marginBottom: s.sm,
    fontWeight: '500',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: s.sm,
    paddingHorizontal: s.md,
    borderRadius: r.pill,
    borderWidth: 1,
  },
  checkIcon: {
    marginRight: s.xs,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  otherInput: {
    marginTop: s.sm,
    height: 48,
    borderRadius: r.md,
    borderWidth: 1,
    paddingHorizontal: s.md,
    fontSize: 14,
  },
});
