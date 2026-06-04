import React, { forwardRef, useState } from 'react';
import { Pressable, Text, TextInput, type TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTokens } from '../../lib/theme';

interface AuthPasswordFieldProps extends Omit<TextInputProps, 'secureTextEntry'> {
  label: string;
  hint?: string;
  error?: string;
}

export const AuthPasswordField = forwardRef<TextInput, AuthPasswordFieldProps>(function AuthPasswordField(
  { label, hint, error, ...inputProps },
  ref
) {
  const { c, ty, s, r, theme } = useTokens();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className="gap-[7px]">
      <Text className="text-[13px]" style={{ color: c.text, fontFamily: ty.body.familySemibold }}>
        {label}
      </Text>
      <View
        className="h-[52px] border flex-row items-center gap-[10px]"
        style={{
          backgroundColor: `${c.surface2}C0`,
          borderColor: error ? c.danger : `${c.primary}${theme.auth.inputBorderOpacity}`,
          borderRadius: r.md,
          paddingHorizontal: s.md,
        }}
      >
        <TextInput
          {...inputProps}
          ref={ref}
          secureTextEntry={!showPassword}
          textContentType="oneTimeCode"
          editable={inputProps.editable !== false}
          className="flex-1 text-[15px] py-3"
          style={[{ color: c.text, fontFamily: ty.body.family }, inputProps.style]}
          placeholderTextColor={c.textSubtle}
        />
        <Pressable
          onPress={() => setShowPassword((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          accessibilityHint="Toggles password visibility"
          hitSlop={8}
        >
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={c.textMuted} />
        </Pressable>
      </View>
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
});
