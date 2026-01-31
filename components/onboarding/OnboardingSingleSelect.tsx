import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { metriqfitTheme } from '../../lib/theme';
import { Ionicons } from '@expo/vector-icons';

const { colors: c, radius: r, spacing: s } = metriqfitTheme;

interface Option {
  value: string | number | boolean;
  label: string;
  subtitle?: string;
}

interface OnboardingSingleSelectProps {
  label: string;
  options: Option[];
  selected: string | number | boolean | null;
  onSelect: (value: any) => void;
  columns?: 1 | 2 | 3;
  otherOption?: string | number | boolean;
  otherText?: string | null;
  onOtherTextChange?: (text: string) => void;
}

export function OnboardingSingleSelect({
  label,
  options,
  selected,
  onSelect,
  columns = 1,
  otherOption,
  otherText,
  onOtherTextChange,
}: OnboardingSingleSelectProps) {
  const showOtherInput = otherOption !== undefined && selected === otherOption;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text>
      <View style={[styles.optionsContainer, columns > 1 && styles.optionsGrid]}>
        {options.map((option) => {
          const isSelected = selected === option.value;
          return (
            <Pressable
              key={String(option.value)}
              style={[
                columns === 1 ? styles.optionRow : styles.optionPill,
                {
                  backgroundColor: isSelected ? c.primary : c.surface,
                  borderColor: isSelected ? c.primary : c.border,
                },
                columns > 1 && { flex: 1 / columns - 0.01, minWidth: columns === 3 ? '30%' : '45%' },
              ]}
              onPress={() => onSelect(option.value)}
            >
              {columns === 1 && (
                <View style={[styles.radio, { borderColor: isSelected ? c.bg : c.border }]}>
                  {isSelected && <View style={[styles.radioInner, { backgroundColor: c.bg }]} />}
                </View>
              )}
              <View style={columns === 1 ? styles.optionContent : undefined}>
                <Text
                  style={[
                    styles.optionText,
                    { color: isSelected ? c.bg : c.text },
                    columns > 1 && styles.optionTextCenter,
                  ]}
                >
                  {option.label}
                </Text>
                {option.subtitle && (
                  <Text style={[styles.optionSubtitle, { color: isSelected ? c.bg : c.textMuted }]}>
                    {option.subtitle}
                  </Text>
                )}
              </View>
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
  optionsContainer: {
    gap: s.sm,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: s.md,
    borderRadius: r.md,
    borderWidth: 1,
  },
  optionPill: {
    paddingVertical: s.sm,
    paddingHorizontal: s.md,
    borderRadius: r.pill,
    borderWidth: 1,
    marginRight: s.xs,
    marginBottom: s.xs,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: s.md,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  optionContent: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionTextCenter: {
    textAlign: 'center',
    fontSize: 14,
  },
  optionSubtitle: {
    fontSize: 13,
    marginTop: 2,
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
