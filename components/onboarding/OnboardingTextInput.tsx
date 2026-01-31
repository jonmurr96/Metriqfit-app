import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { metriqfitTheme } from '../../lib/theme';

const { colors: c, radius: r, spacing: s } = metriqfitTheme;

interface OnboardingTextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'email-address';
  maxLength?: number;
}

export function OnboardingTextInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  maxLength,
}: OnboardingTextInputProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.border }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        keyboardType={keyboardType}
        maxLength={maxLength}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: s.md,
  },
  label: {
    fontSize: 14,
    marginBottom: s.xs,
    fontWeight: '500',
  },
  input: {
    height: 52,
    borderRadius: r.md,
    borderWidth: 1,
    paddingHorizontal: s.md,
    fontSize: 16,
  },
});
