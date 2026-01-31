import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { metriqfitTheme } from '../../../lib/theme';

const { colors: c, spacing: s, radius: r, glass } = metriqfitTheme;

interface PremiumTextInputProps extends TextInputProps {
  label?: string;
  rightElement?: React.ReactNode;
}

export function PremiumTextInput({
  label,
  rightElement,
  style,
  ...props
}: PremiumTextInputProps) {
  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {rightElement}
        </View>
      )}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={c.textSubtle}
        selectionColor={c.primary}
        cursorColor={c.primary}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: s.lg,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: s.sm,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: c.text,
  },
  input: {
    backgroundColor: glass.background,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: r.sm,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Sora_400Regular',
    color: c.text,
  },
});
