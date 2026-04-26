import React from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { useTokens } from '../../lib/theme';

interface AuthTextFieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string;
}

export function AuthTextField({ label, hint, error, ...inputProps }: AuthTextFieldProps) {
  const { c, ty, s, r, theme } = useTokens();

  return (
    <View style={{ gap: 7 }}>
      <Text style={[styles.label, { color: c.text, fontFamily: ty.body.familySemibold }]}>{label}</Text>
      <TextInput
        {...inputProps}
        style={[
          styles.input,
          {
            backgroundColor: `${c.surface2}C0`,
            borderColor: error ? c.danger : `${c.primary}${theme.auth.inputBorderOpacity}`,
            color: c.text,
            borderRadius: r.md,
            fontFamily: ty.body.family,
            paddingHorizontal: s.md,
          },
          inputProps.style,
        ]}
        placeholderTextColor={c.textSubtle}
      />
      {error ? (
        <Text style={[styles.helper, { color: c.danger, fontFamily: ty.body.family }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.helper, { color: c.textMuted, fontFamily: ty.body.family }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
  },
  input: {
    height: 52,
    borderWidth: 1,
    fontSize: 15,
  },
  helper: {
    fontSize: 12,
    lineHeight: 18,
  },
});
