import React from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';

import { useTokens } from '../../lib/theme';

interface AuthTextFieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string;
}

export function AuthTextField({ label, hint, error, ...inputProps }: AuthTextFieldProps) {
  const { c, ty, s, r, theme } = useTokens();

  return (
    <View className="gap-[7px]">
      <Text className="text-[13px]" style={{ color: c.text, fontFamily: ty.body.familySemibold }}>
        {label}
      </Text>
      <TextInput
        {...inputProps}
        className="h-[52px] border text-[15px]"
        style={[
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
        <Text className="text-xs leading-[18px]" style={{ color: c.danger, fontFamily: ty.body.family }}>
          {error}
        </Text>
      ) : hint ? (
        <Text className="text-xs leading-[18px]" style={{ color: c.textMuted, fontFamily: ty.body.family }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
