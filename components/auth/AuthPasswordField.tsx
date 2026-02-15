import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
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
    <View style={{ gap: 7 }}>
      <Text style={[styles.label, { color: c.text, fontFamily: ty.body.familySemibold }]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: `${c.surface2}C0`,
            borderColor: error ? c.danger : `${c.primary}${theme.auth.inputBorderOpacity}`,
            borderRadius: r.md,
            paddingHorizontal: s.md,
          },
        ]}
      >
        <TextInput
          {...inputProps}
          ref={ref}
          secureTextEntry={!showPassword}
          style={[
            styles.input,
            {
              color: c.text,
              fontFamily: ty.body.family,
            },
            inputProps.style,
          ]}
          placeholderTextColor={c.textSubtle}
        />
        <Pressable
          onPress={() => setShowPassword((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          accessibilityHint="Toggles password visibility"
          hitSlop={8}
        >
          <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={c.textMuted} />
        </Pressable>
      </View>
      {error ? (
        <Text style={[styles.helper, { color: c.danger, fontFamily: ty.body.family }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.helper, { color: c.textMuted, fontFamily: ty.body.family }]}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
  },
  inputWrap: {
    height: 52,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  helper: {
    fontSize: 12,
    lineHeight: 18,
  },
});
